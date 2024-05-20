import express from 'express';
import passport from 'passport';
import session from 'express-session';
import axios from 'axios';
const OutlookStrategy = require('passport-outlook').Strategy;
import { Client } from '@elastic/elasticsearch';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(express.json()); // Add this line to parse JSON bodies

// Elasticsearch client setup
const esClient = new Client({
  node: 'http://localhost:9200',
  headers: { 'Content-Type': 'application/x-ndjson' } // Set correct Content-Type for bulk operations
});

// Replace these values with your Azure AD app details
const OUTLOOK_CLIENT_ID = '1713f17c-8983-4d24-9133-db5abdf4c617';
const OUTLOOK_CLIENT_SECRET = 'Qw08Q~6hb5rcDLkfjdjo67R~lZLrNREVy6UsqcFw';
const OUTLOOK_CALLBACK_URL = 'http://localhost:3000/auth/outlook/callback';
const TENANT_ID = 'f8cdef31-a31e-4b4a-93e4-5f571e91255a';

// Define a custom User interface extending Express.User
interface User extends Express.User {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

// Define an interface for the email documents
interface EmailDocument {
  id: string;
  subject: string;
  bodyPreview: string;
  isRead: boolean;
}

// Define the structure of the Elasticsearch response
interface ElasticsearchResponse<T> {
  hits: {
    total: {
      value: number;
    };
    hits: Array<{
      _source: T;
    }>;
  };
}

// Passport session setup
passport.serializeUser((obj: any, done) => {
  done(null, obj as User);
});

passport.deserializeUser((obj: any, done) => {
  done(null, obj as User);
});

// Use the Outlook strategy within Passport
passport.use(new OutlookStrategy({
  clientID: OUTLOOK_CLIENT_ID,
  clientSecret: OUTLOOK_CLIENT_SECRET,
  callbackURL: OUTLOOK_CALLBACK_URL,
  passReqToCallback: true
}, (req: any, accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
  const user: User = {
    id: profile.id,
    email: profile.emails[0].value,
    accessToken,
    refreshToken,
  };
  return done(null, user);
}));

app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/auth/outlook', passport.authenticate('windowslive', {
  scope: [
    'openid',
    'profile',
    'offline_access',
    'https://outlook.office.com/Mail.Read'
  ]
}));

app.get('/auth/outlook/callback',
  passport.authenticate('windowslive', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('http://localhost:3001/mails');
  }
);

app.get('/user/:email', async (req, res) => {
  const email = req.params.email;

  try {
    // Check if the user exists in the Elasticsearch index using curl
    const checkUserCommand = `
      curl -X GET "http://localhost:9200/users/_search" -H 'Content-Type: application/json' -d'
      {
        "query": {
          "match": {
            "email": "${email}"
          }
        }
      }'
    `;

    exec(checkUserCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('Error checking user:', stderr);
        return res.status(500).json({ message: 'Error checking user', details: stderr });
      }

      const result = JSON.parse(stdout);
      if (result.hits.total.value > 0) {
        // User exists, return user email
        checkUserAccounts(email, res);
      } else {
        // User does not exist, create a new user
        const newUser = {
          email,
          createdAt: new Date().toISOString()
        };

        const createUserCommand = `
          curl -X POST "http://localhost:9200/users/_doc" -H 'Content-Type: application/json' -d'
          ${JSON.stringify(newUser)}'
        `;

        exec(createUserCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('Error creating user:', stderr);
            return res.status(500).json({ message: 'Error creating user', details: stderr });
          }

          // User created, return user email
          checkUserAccounts(email, res);
        });
      }
    });
  } catch (error) {
    console.error('Error checking or creating user:', error);
    res.status(500).send('Internal server error');
  }
});

function checkUserAccounts(email: any, res: any) {
  const checkAccountsCommand = `
    curl -X GET "http://localhost:9200/user_accounts/_search" -H 'Content-Type: application/json' -d'
    {
      "query": {
        "match": {
          "user_id": "${email}"
        }
      }
    }'
  `;

  exec(checkAccountsCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('Error checking user accounts:', stderr);
      return res.status(500).json({ message: 'Error checking user accounts', details: stderr });
    }

    const result: ElasticsearchResponse<User> = JSON.parse(stdout);
    if (result.hits.total.value > 0) {
      const accounts = result.hits.hits.map(hit => hit._source);
      res.json({ message: 'User exists', email: email, accounts: accounts });
    } else {
      res.json({ message: 'User exists but no accounts found', email: email, accounts: [] });
    }
  });
}

app.get('/emails', ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    let allEmails: any[] = [];
    let nextLink: string | null = `https://outlook.office.com/api/v2.0/me/messages`;

    while (nextLink) {
      const response: any = await axios.get(nextLink, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });

      allEmails.push(...response.data.value);

      nextLink = response.data['@odata.nextLink'] || null;
    }

    // Prepare data for bulk indexing
    const bulkData = allEmails.map((email: any, index: number) => {
      // Transform ParentFolderId based on condition

      const parsedEmail: any = {
        account: user.email,
        subject: email.Subject,
        body: email.BodyPreview,
        isRead: email.IsRead,
        datetime: email.CreatedDateTime,
      };

      // Check if the email is not a draft
      if (!email.IsDraft) {
        // Extract "from" email address if the email is not a draft
        parsedEmail.from = email.From.EmailAddress;

        // Check if ToRecipients exists and is not empty
        if (email.ToRecipients && email.ToRecipients.length > 0) {
          // Extract the "to" recipients
          const toRecipients = email.ToRecipients.map((recipient: any) => recipient.EmailAddress);

          // Include "to" recipients in parsedEmail
          parsedEmail.to = toRecipients;
        }

        else {
          // If ToRecipients does not exist or is empty, set "to" as an empty array
          parsedEmail.to = [];
        }
      }

      return [
        JSON.stringify({ index: { _index: 'account_mails', _id: `${user.id}-${index}` } }),
        JSON.stringify(parsedEmail)
      ].join('\n');
    }).join('\n') + '\n';

    // Write bulk data to a temporary file
    const tempFilePath = path.join(__dirname, 'bulk_data.ndjson');
    fs.writeFileSync(tempFilePath, bulkData);

    // Define curl command
    const curlCommand = `
      curl -X POST "http://localhost:9200/_bulk" -H "Content-Type: application/x-ndjson" --data-binary @${tempFilePath}
    `;

    // Execute curl command
    exec(curlCommand, (error, stdout, stderr) => {
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);

      if (error) {
        console.error('Error indexing emails:', stderr);
        return res.status(500).json({ message: 'Error indexing emails', details: stderr });
      }

      console.log('Bulk indexing succeeded:', stdout);

      // Directly query the emails after indexing
      const query = `
      curl -X GET "http://localhost:9200/account_mails/_search" -H 'Content-Type: application/json' -d'
      {
        "query": {
          "match": {
            "account": "${user.email}"
          }
        },
        "size": 10000 // Adjust the size to handle more results
      }'
    `;

      exec(query, (error, stdout, stderr) => {
        if (error) {
          console.error('Error querying emails:', stderr);
          return res.status(500).json({ message: 'Error querying emails', details: stderr });
        }

        const result = JSON.parse(stdout);
        if (!result.hits || !result.hits.hits || !Array.isArray(result.hits.hits)) {
          console.error('Invalid data format received:', result);
          return res.status(500).json({ message: 'Invalid data format received', details: result });
        }

        const emails = result.hits.hits.map((hit: any) => hit._source);
        res.json(emails);
      });
    });

  } catch (error: any) {
    // Debugging: Log the error details
    console.error('Error fetching or indexing emails:', error);
    res.status(500).send({ message: 'Error fetching or indexing emails', details: error.message });
  }
});


app.get('/emails/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const query = `
      curl -X GET "http://localhost:9200/account_mails/_search" -H 'Content-Type: application/json' -d'
      {
        "query": {
          "match": {
            "account": "${email}"
          }
        }
      }'
    `;

    exec(query, (error, stdout, stderr) => {
      if (error) {
        console.error('Error querying emails:', stderr);
        return res.status(500).json({ message: 'Error querying emails', details: stderr });
      }

      const result = JSON.parse(stdout);
      if (!result.hits || !result.hits.hits || !Array.isArray(result.hits.hits)) {
        console.error('Invalid data format received:', result);
        return res.status(500).json({ message: 'Invalid data format received', details: result });
      }

      const emails = result.hits.hits.map((hit: any) => hit._source);
      res.json(emails);
    });
  } catch (error: any) {
    console.error('Error querying emails:', error);
    res.status(500).json({ message: 'Error querying emails', details: error.message });
  }
});

function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// New route to handle account creation
app.post('/createaccount', async (req, res) => {
  const id = req.header('id');
  const userId = req.header('user_id');

  if (!id || !userId) {
    return res.status(400).json({ message: 'id and user_id headers are required' });
  }

  const newAccount = {
    id,
    user_id: userId,
    createdAt: new Date().toISOString()
  };

  const createAccountCommand = `
    curl -X POST "http://localhost:9200/user_accounts/_doc/${id}" -H 'Content-Type: application/json' -d'
    ${JSON.stringify(newAccount)}'
  `;

  exec(createAccountCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('Error creating account:', stderr);
      return res.status(500).json({ message: 'Error creating account', details: stderr });
    }

    res.status(201).json({ message: 'Account created successfully', account: newAccount });
  });
});

export default app;
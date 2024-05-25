import express, { Request, Response, NextFunction } from "express";
import passport, { use } from "passport";
import session from "express-session";
import axios from "axios";
import { Client as ElasticsearchClient } from "@elastic/elasticsearch";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";
import "isomorphic-fetch";
import { ConfidentialClientApplication } from "@azure/msal-node";
const OutlookStrategy = require("passport-outlook").Strategy;
import { v4 as uuidv4 } from "uuid";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3001",
    credentials: true,
  })
);

app.use(express.json());

// Elasticsearch client setup
const esClient = new ElasticsearchClient({
  node: "http://localhost:9200",
  headers: { "Content-Type": "application/x-ndjson" }, // Set correct Content-Type for bulk operations
});

// Replace these values with your Azure & Ngrok URL details
const OUTLOOK_CLIENT_ID = "23822ee1-015f-4d93-974d-1ece64a08067";
const OUTLOOK_CLIENT_SECRET = "6BU8Q~sv9hYVE5T7r5qBvCuMZ15zO.JiAFeXCa3p";
const OUTLOOK_CALLBACK_URL = "http://localhost:3000/delegated/callback";
const NOTIFICATION_URL = "https://d86a-205-164-154-230.ngrok-free.app";

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

// Define an interface for the Elasticsearch hit object
interface ElasticsearchHit<T> {
  _source: T;
}

// Define the structure of the Elasticsearch response
interface ElasticsearchResponse<T> {
  hits: {
    total: {
      value: number;
    };
    hits: Array<ElasticsearchHit<T>>;
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
passport.use(
  new OutlookStrategy(
    {
      clientID: OUTLOOK_CLIENT_ID,
      clientSecret: OUTLOOK_CLIENT_SECRET,
      callbackURL: OUTLOOK_CALLBACK_URL,
      passReqToCallback: true,
    },
    (
      req: any,
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: any) => void
    ) => {
      const user: User = {
        id: profile.id,
        email: profile.emails[0].value,
        accessToken,
        refreshToken,
      };
      return done(null, user);
    }
  )
);

app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get("/isAuthenticated", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json({ isAuthenticated: true });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// Routes
app.get(
  "/auth/outlook",
  passport.authenticate("windowslive", {
    scope: ["openid", "profile", "offline_access", "https://outlook.office.com/Mail.Read"],
  })
);

app.get(
  "/delegated/callback",
  passport.authenticate("windowslive", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/initialFetch");
  }
);

app.post("/createuser", (req, res) => {
  const id = req.header("id");
  const email = req.header("email");
  const name = req.header("name");
  const number = req.header("number");

  if (!id || !email || !name || !number) {
    return res.status(400).json({ message: "Missing required headers" });
  }

  const newUser = {
    email,
    name,
    number,
    createdAt: new Date().toISOString(),
  };

  const createUserCommand = `
    curl -X POST "http://localhost:9200/users/_doc/${id}" -H 'Content-Type: application/json' -d'
    ${JSON.stringify(newUser)}'
  `;

  exec(createUserCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("Error creating user:", stderr);
      return res.status(500).json({ message: "Error creating user", details: stderr });
    }

    console.log("User created:", stdout);
    return res.status(201).json({ message: "User created successfully", user: newUser });
  });
});

function checkUserAccounts(email: any, res: Response) {
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
      console.error("Error checking user accounts:", stderr);
      return res.status(500).json({ message: "Error checking user accounts", details: stderr });
    }

    const result: ElasticsearchResponse<User> = JSON.parse(stdout);
    if (result.hits.total.value > 0) {
      const accounts = result.hits.hits.map((hit: ElasticsearchHit<User>) => hit._source);
      res.json({ message: "User exists", email: email, accounts: accounts });
    } else {
      res.json({ message: "User exists but no accounts found", email: email, accounts: [] });
    }
  });
}

app.get("/initialFetch", ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    let allEmails: any[] = [];
    let nextLink: string | null = `https://outlook.office.com/api/v2.0/me/messages`;

    while (nextLink) {
      const response: any = await axios.get(nextLink, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      allEmails.push(...response.data.value);

      nextLink = response.data["@odata.nextLink"] || null;
    }

    const bulkData =
      allEmails
        .map((email: any) => {
          const parsedEmail: any = {
            account_id: user.id,
            subject: email.Subject,
            body: email.BodyPreview,
            isRead: email.IsRead,
            datetime: email.CreatedDateTime,
            from: email.IsDraft ? null : email.From?.EmailAddress,
            to:
              email.IsDraft || !email.ToRecipients
                ? []
                : email.ToRecipients.map((recipient: any) => recipient?.EmailAddress),
          };

          return [
            JSON.stringify({ index: { _index: "account_mails", _id: email.Id } }),
            JSON.stringify(parsedEmail),
          ].join("\n");
        })
        .join("\n") + "\n";

    const tempFilePath = path.join(__dirname, "bulk_data.ndjson");
    fs.writeFileSync(tempFilePath, bulkData);

    const curlCommand = `
      curl -X POST "http://localhost:9200/_bulk" -H "Content-Type: application/x-ndjson" --data-binary @${tempFilePath}
    `;

    exec(curlCommand, (error, stdout, stderr) => {
      fs.unlinkSync(tempFilePath);

      if (error) {
        console.error("Error indexing emails:", stderr);
        return res.status(500).json({ message: "Error indexing emails", details: stderr });
      }

      console.log("Bulk indexing succeeded:", stdout);
      res.redirect("http://localhost:3001/mainPage");
    });
  } catch (error: any) {
    console.error("Error fetching or indexing emails:", error);
    res.status(500).send({ message: "Error fetching or indexing emails", details: error.message });
  }
});

app.get("/emails", async (req: Request, res: Response) => {
  const email = req.params.email;
  const user = req.user as User;
  try {
    const query = `
      curl -X GET "http://localhost:9200/account_mails/_search" -H 'Content-Type: application/json' -d'
      {
        "query": {
          "match": {
            "account_id": "${user.id}"
          }
        },
        "size": 1000
      }'
    `;

    exec(query, (error, stdout, stderr) => {
      if (error) {
        console.error("Error querying emails:", stderr);
        return res.status(500).json({ message: "Error querying emails", details: stderr });
      }

      const result = JSON.parse(stdout);
      if (!result.hits || !result.hits.hits || !Array.isArray(result.hits.hits)) {
        console.error("Invalid data format received:", result);
        return res.status(500).json({ message: "Invalid data format received", details: result });
      }

      const emails = result.hits.hits.map((hit: ElasticsearchHit<EmailDocument>) => hit._source);
      res.json(emails);
    });
  } catch (error: any) {
    console.error("Error querying emails:", error);
    res.status(500).json({ message: "Error querying emails", details: error.message });
  }
});

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/outlook");
}

app.get("/createaccount", ensureAuthenticated, async (req: Request, res: Response) => {
  const user = req.user as User;
  const userId = req.header("user_id"); // Generate a random user ID for now

  if (!user) {
    return res.status(400).json({ message: "User not authenticated" });
  }
  const newAccount = {
    account_email: user.email,
    user_id: userId, // Use the generated user ID
    accessToken: user.accessToken,
    createdAt: new Date().toISOString(),
  };

  const createAccountCommand = `
    curl -X POST "http://localhost:9200/user_accounts/_doc/${
      user.id
    }" -H 'Content-Type: application/json' -d'
    ${JSON.stringify(newAccount)}'
  `;

  exec(createAccountCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("Error creating account:", stderr);
      return res.status(500).json({ message: "Error creating account", details: stderr });
    }

    // After creating the account, call the /subscribe endpoint
    axios
      .get("http://localhost:3000/subscribe", {
        headers: {
          Cookie: req.headers.cookie || "", // Pass cookies to maintain the session
        },
      })
      .then((response) => {
        res.status(201).json({
          message: "Account created and subscription added successfully",
          account: newAccount,
        });
      })
      .catch((error) => {
        console.error("Error calling /subscribe:", error);
        res
          .status(500)
          .json({ message: "Account created but error subscribing", details: error.message });
      });
  });
});

import { RefreshTokenRequest } from "@azure/msal-node";

const configs: any = {
  auth: {
    clientId: OUTLOOK_CLIENT_ID,
    authority: `https://login.microsoftonline.com/common`,
    clientSecret: OUTLOOK_CLIENT_SECRET,
  },
};

const cca1 = new ConfidentialClientApplication(configs);

async function getNewAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const refreshTokenRequest: RefreshTokenRequest = {
    refreshToken,
    scopes: ["https://graph.microsoft.com/.default"],
  };

  try {
    const authResult: any = await cca1.acquireTokenByRefreshToken(refreshTokenRequest);
    if (!authResult || !authResult.accessToken) {
      throw new Error("Failed to acquire new access token");
    }
    return { accessToken: authResult.accessToken, refreshToken: authResult.refreshToken };
  } catch (error) {
    console.error("Error acquiring new access token:", error);
    throw error;
  }
}

app.get("/subscribe", ensureAuthenticated, async (req: Request, res: Response) => {
  const user = req.user as User;

  if (!user.refreshToken) {
    return res.status(400).json({ message: "No refresh token found" });
  }

  try {
    // Get a new access token using the refresh token
    const { accessToken, refreshToken } = await getNewAccessToken(user.refreshToken);

    // Update user access token
    user.accessToken = accessToken;

    // Update the refresh token if a new one is returned
    if (refreshToken) {
      user.refreshToken = refreshToken;
    }

    const currentDate = new Date();
    const expirationDate = new Date(currentDate);
    expirationDate.setMinutes(currentDate.getMinutes() + 1000);

    const subscriptionPayload = {
      changeType: "created,updated,deleted",
      notificationUrl: `${NOTIFICATION_URL}/api/notifications`,
      resource: "/me/messages",
      expirationDateTime: expirationDate.toISOString(),
      clientState: "SecretClientState",
    };

    const response = await axios.post(
      "https://graph.microsoft.com/v1.0/subscriptions",
      subscriptionPayload,
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // Increase the timeout to 30 seconds
      }
    );

    // Retrieve the user account document
    const queryUserAccountCommand = `
      curl -X GET "http://localhost:9200/user_accounts/_search" -H 'Content-Type: application/json' -d'
      {
        "query": {
          "match": {
            "account_email": "${user.email}"
          }
        }
      }'
    `;

    exec(queryUserAccountCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Error retrieving user account:", stderr);
        return res.status(500).json({ message: "Error retrieving user account", details: stderr });
      }

      const result = JSON.parse(stdout);
      if (result.hits.total.value === 0) {
        return res.status(404).json({ message: "User account not found" });
      }

      const userAccountId = result.hits.hits[0]._id;
      const userAccount = result.hits.hits[0]._source;

      // Update the user account with the subscription details
      if (!userAccount.subscriptionId) {
        userAccount.subscriptionId = response.data.id;
        userAccount.accessToken = user.accessToken;
        userAccount.refreshToken = user.refreshToken;
        userAccount.expirationDateTime = response.data.expirationDateTime;

        const updateUserAccountCommand = `
        curl -X POST "http://localhost:9200/user_accounts/_doc/${userAccountId}" -H 'Content-Type: application/json' -d'
        ${JSON.stringify(userAccount)}'
      `;

        exec(updateUserAccountCommand, (error, stdout, stderr) => {
          if (error) {
            console.error("Error updating user account:", stderr);
            return res
              .status(500)
              .json({ message: "Error updating user account", details: stderr });
          }

          res.status(200).json({ message: "Subscription added successfully" });
        });
      }
    });
  } catch (error: any) {
    console.error("Error creating subscription:", error);

    // Log additional details if available
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }

    res.status(500).json({ message: "Error creating subscription", details: error.message });
  }
});

const logFilePath = path.join(__dirname, "email_notifications.log");

const appendToFile = (data: string) => {
  fs.appendFileSync(logFilePath, data + "\n");
};

// Assuming you have these utility functions

app.post("/api/notifications", async (req: Request, res: Response) => {
  const validationToken = req.query.validationToken as string;

  if (validationToken) {
    console.log("Validation token received:", validationToken);
    return res.status(200).send(validationToken);
  }

  console.log("Notification received:", req.body);
  const notifications = req.body.value;

  try {
    const notificationPromises = notifications.map(async (notification: any) => {
      const { subscriptionId, changeType, resource } = notification;

      console.log("Processing notification for subscriptionId:", subscriptionId);

      const getUserDataCommand = `curl -X GET "http://localhost:9200/user_accounts/_search" -H "Content-Type: application/json" -d '{
        "query": {
          "match": {
            "subscriptionId": "${subscriptionId}"
          }
        }
      }'`;

      const userData = await new Promise<any>((resolve, reject) => {
        exec(getUserDataCommand, (error, stdout, stderr) => {
          if (error) {
            console.error("Error retrieving user data:", stderr);
            return reject(new Error("Error retrieving user data"));
          }

          try {
            const response = JSON.parse(stdout);
            console.log("Elasticsearch response:", response);

            if (!response.hits || !response.hits.total || response.hits.total.value === 0) {
              console.error("User data not found for subscription:", subscriptionId);
              return reject(new Error("User data not found for subscription"));
            }

            const user = response.hits.hits[0];
            console.log("User data found:", user._source);
            resolve({ _id: user._id, ...user._source });
          } catch (parseError) {
            console.error("Error parsing Elasticsearch response:", stdout);
            return reject(new Error("Error parsing Elasticsearch response"));
          }
        });
      });

      const { accessToken, refreshToken } = await getNewAccessToken(userData.refreshToken);

      // Update user access token
      userData.accessToken = accessToken;

      // Update the refresh token if a new one is returned
      if (refreshToken) {
        userData.refreshToken = refreshToken;
      }

      // Process the notifications
      if (changeType === "created" || changeType === "updated") {
        // Fetch the updated message using the resource URL
        const messageResponse = await axios.get(`https://graph.microsoft.com/v1.0/${resource}`, {
          headers: {
            Authorization: `Bearer ${userData.accessToken}`,
          },
        });

        const message = messageResponse.data;

        // Prepare the email document
        const emailDocument: any = {
          account_id: userData._id,
          subject: message.subject,
          body: message.bodyPreview,
          isRead: message.isRead,
          datetime: message.createdDateTime,
        };

        // Index or update the message in Elasticsearch using curl
        const indexEmailCommand = `curl -X POST "http://localhost:9200/account_mails/_doc/${
          message.id
        }" -H "Content-Type: application/json" -d '${JSON.stringify(emailDocument)}'`;

        await new Promise<void>((resolve, reject) => {
          exec(indexEmailCommand, (error, stdout, stderr) => {
            if (error) {
              console.error("Error indexing message:", stderr);
              return reject(new Error("Error indexing message"));
            }

            console.log("Indexed/Updated message:", stdout);
            resolve();
          });
        });
      } else if (changeType === "deleted") {
        // Delete the message from Elasticsearch
        const deleteEmailCommand = `curl -X DELETE "http://localhost:9200/account_mails/_doc/${resource
          .split("/")
          .pop()}"`;

        await new Promise<void>((resolve, reject) => {
          exec(deleteEmailCommand, (error, stdout, stderr) => {
            if (error) {
              console.error("Error deleting message:", stderr);
              return reject(new Error("Error deleting message"));
            }

            console.log("Deleted message:", stdout);
            resolve();
          });
        });
      }
    });

    await Promise.all(notificationPromises);

    res.status(200).send("Notifications processed successfully");
  } catch (error) {
    console.error("Error processing notifications:", error);
    res.status(500).send("Error processing notifications");
  }
});

app.post("/api/lifecycle", (req: Request, res: Response) => {
  console.log("Received notification:", req.body.value[0].resourceData);
  res.status(202).send(); // Accepted
});

export default app;

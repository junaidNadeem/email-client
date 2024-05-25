import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import User from '../types/user';


export const fetchEmailsAndIndex = async (user: User) => {
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

  const bulkData = allEmails.map((email: any) => {
    const parsedEmail: any = {
      account_id: user.id,
      subject: email.Subject,
      body: email.BodyPreview,
      isRead: email.IsRead,
      datetime: email.CreatedDateTime,
      from: email.IsDraft ? null : email.From.EmailAddress,
      to: email.IsDraft || !email.ToRecipients ? [] : email.ToRecipients.map((recipient: any) => recipient.EmailAddress),
    };

    return [
      JSON.stringify({ index: { _index: 'account_mails', _id: email.Id } }),
      JSON.stringify(parsedEmail)
    ].join('\n');
  }).join('\n') + '\n';

  const tempFilePath = path.join(__dirname, 'bulk_data.ndjson');
  fs.writeFileSync(tempFilePath, bulkData);

  const curlCommand = `
    curl -X POST "http://localhost:9200/_bulk" -H "Content-Type: application/x-ndjson" --data-binary @${tempFilePath}
  `;

  return new Promise<void>((resolve, reject) => {
    exec(curlCommand, (error, stdout, stderr) => {
      fs.unlinkSync(tempFilePath);

      if (error) {
        console.error('Error indexing emails:', stderr);
        reject(new Error(stderr));
      } else {
        console.log('Bulk indexing succeeded:', stdout);
        resolve();
      }
    });
  });
};

export const queryEmails = async (userId: string) => {
  const query = `
    curl -X GET "http://localhost:9200/account_mails/_search" -H 'Content-Type: application/json' -d'
    {
      "query": {
        "match": {
          "account_id": "${userId}"
        }
      },
      "size": 1000
    }'
  `;

  return new Promise<any[]>((resolve, reject) => {
    exec(query, (error, stdout, stderr) => {
      if (error) {
        console.error('Error querying emails:', stderr);
        reject(new Error(stderr));
      }

      const result = JSON.parse(stdout);
      if (!result.hits || !result.hits.hits || !Array.isArray(result.hits.hits)) {
        console.error('Invalid data format received:', result);
        reject(new Error('Invalid data format received'));
      }

      const emails = result.hits.hits.map((hit: any) => hit._source);
      resolve(emails);
    });
  });
};

import axios from 'axios';
import { exec } from 'child_process';
import { getNewAccessToken } from './tokenService';

export async function processNotification(notification: any) {
  const { subscriptionId, changeType, resource } = notification;

  console.log('Processing notification for subscriptionId:', subscriptionId);

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
        console.error('Error retrieving user data:', stderr);
        return reject(new Error('Error retrieving user data'));
      }

      try {
        const response = JSON.parse(stdout);
        console.log('Elasticsearch response:', response);

        if (!response.hits || !response.hits.total || response.hits.total.value === 0) {
          console.error('User data not found for subscription:', subscriptionId);
          return reject(new Error('User data not found for subscription'));
        }

        const user = response.hits.hits[0];
        console.log('User data found:', user._source);
        resolve({ _id: user._id, ...user._source });
      } catch (parseError) {
        console.error('Error parsing Elasticsearch response:', stdout);
        return reject(new Error('Error parsing Elasticsearch response'));
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
  if (changeType === 'created' || changeType === 'updated') {
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
    const indexEmailCommand = `curl -X POST "http://localhost:9200/account_mails/_doc/${message.id}" -H "Content-Type: application/json" -d '${JSON.stringify(emailDocument)}'`;

    await new Promise<void>((resolve, reject) => {
      exec(indexEmailCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('Error indexing message:', stderr);
          return reject(new Error('Error indexing message'));
        }

        console.log('Indexed/Updated message:', stdout);
        resolve();
      });
    });

  } else if (changeType === 'deleted') {
    // Delete the message from Elasticsearch
    const deleteEmailCommand = `curl -X DELETE "http://localhost:9200/account_mails/_doc/${resource.split('/').pop()}"`;

    await new Promise<void>((resolve, reject) => {
      exec(deleteEmailCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('Error deleting message:', stderr);
          return reject(new Error('Error deleting message'));
        }

        console.log('Deleted message:', stdout);
        resolve();
      });
    });
  }
}

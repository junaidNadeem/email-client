import axios from 'axios';
import { exec } from 'child_process';
import { getNewAccessToken } from './tokenService';
import {NOTIFICATION_URL} from '../config/azureConfig'
import User from '../types/user';


export async function createSubscription(user: User) {
  if (!user.refreshToken) {
    throw new Error('No refresh token found');
  }

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
    clientState: "SecretClientState"
  };

  const response = await axios.post('https://graph.microsoft.com/v1.0/subscriptions', subscriptionPayload, {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000 // Increase the timeout to 30 seconds
  });

  return { user, subscriptionData: response.data };
}

export async function updateUserAccount(user: User, subscriptionData: any) {
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

  return new Promise<void>((resolve, reject) => {
    exec(queryUserAccountCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('Error retrieving user account:', stderr);
        reject(new Error(stderr));
        return;
      }

      const result = JSON.parse(stdout);
      if (result.hits.total.value === 0) {
        reject(new Error('User account not found'));
        return;
      }

      const userAccountId = result.hits.hits[0]._id;
      const userAccount = result.hits.hits[0]._source;

      if (!userAccount.subscriptionId) {
        userAccount.subscriptionId = subscriptionData.id;
        userAccount.accessToken = user.accessToken;
        userAccount.refreshToken = user.refreshToken;
        userAccount.expirationDateTime = subscriptionData.expirationDateTime;

        const updateUserAccountCommand = `
          curl -X POST "http://localhost:9200/user_accounts/_doc/${userAccountId}" -H 'Content-Type: application/json' -d'
          ${JSON.stringify(userAccount)}'
        `;

        exec(updateUserAccountCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('Error updating user account:', stderr);
            reject(new Error(stderr));
            return;
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

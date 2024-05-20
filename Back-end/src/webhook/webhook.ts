import express from 'express';
import axios from 'axios';

const webhookApp = express();

webhookApp.post('/notifications', async (req: any, res) => {
  try {
    const validationToken = req.headers['validationtoken'];
    const challenge = req.query.validationtoken;

    if (validationToken === challenge) {
      res.status(200).send(validationToken);
    } else {
      res.status(401).send('Unauthorized');
    }

    // Process the notification payload here
    const notification = req.body;
    console.log('New mail received:', notification);

    // Fetch data from the Microsoft Graph API
    const response = await axios.get('https://graph.microsoft.com/v1.0/me/messages', {
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`
      }
    });

    // Display the new mail data
    console.log('New mail data:', response.data);

  } catch (error) {
    console.error('Error processing notification:', error);
    res.status(500).send(error);
  }
});

export default webhookApp;
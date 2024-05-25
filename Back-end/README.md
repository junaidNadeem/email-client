# Pre-requisites

## 1. Register Your App (You can skip this step as the keys are already set in the project)

To get started with Email-Client, you must register your app in [Microsoft Azure](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).

1. Click on 'New Registration'.
2. Give a suitable name.
3. Choose 'Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g., Skype, Xbox)'.
4. Under Redirect URL, select web and enter `http://localhost:3000/delegated/callback` and click register.
5. Copy Client ID.
6. Click on 'Add a certificate or secret'.
7. Click on 'New client secret'.
8. Give a description and click 'Add'.
9. Copy Secret ID, it will not be visible in the future.

**Copy and paste the value of Client ID and Client Secret in OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET respectively under app.ts**

## 2. Node

Install the latest version of [Node.js](https://nodejs.org/en/download/package-manager) on your machine.

## 3. NGROK Setup

1. Install ngrok from here: https://ngrok.com/download

2. Run the following command to add your authtoken to the default ngrok.yml configuration file:

   ```sh
   ngrok config add-authtoken 2gxzBvzXziLQjJlDK7sXU9dEjfS_7H5fN3BeMpAecMfa5DPbb
   ```

3. Put your app online after step #5:

   ```sh
   ngrok http http://localhost:3000
   ```

   or

   ```sh
   ngrok http 3000
   ```

**Copy and paste the generated link in `NOTIFICATION_URL` under app.ts**

## 4. Docker Setup

Email-Engine uses [Docker](https://www.docker.com/) to containerize and run Elasticsearch.

Install [Docker Desktop](https://docs.docker.com/install/) using up-to-date installation instructions from their website.

In terminal, run `docker compose up -d` to start Docker, and `docker compose down` to shut down Docker.

## 5. Installing Dependencies

cd into `Back-end` and run `npm i` in the terminal. This will install all dependencies.

# Start Project

Run `npm start`, this will launch the app on `localhost:3000`.

# Project Structure

## End-points

### GET /isAuthenticated

**Purpose:** Check if the user is authenticated.

**Response:**

- `200 OK`: `{ isAuthenticated: true }` if authenticated, `{ isAuthenticated: false }` otherwise.

### GET /auth/outlook

**Purpose:** Initiate Outlook authentication using Passport.js.

**Redirects:** To the Outlook login page for user authentication.

### GET /delegated/callback

**Purpose:** Handle the OAuth2 callback from Outlook.

**Redirects:** To `/initialFetch` upon successful authentication.

### POST /createuser

**Purpose:** Create a new user in Elasticsearch.

**Headers:**

- `id`: User ID
- `email`: User email
- `name`: User name
- `number`: User phone number

**Response:**

- `201 Created`: `{ message: 'User created successfully', user: newUser }`
- `400 Bad Request`: `{ message: 'Missing required headers' }`
- `500 Internal Server Error`: `{ message: 'Error creating user', details: stderr }`

### GET /initialFetch

**Purpose:** Fetch all emails from the authenticated user's Outlook account and index them in Elasticsearch.

**Response:**

- `302 Found`: Redirects to the main page if successful.
- `500 Internal Server Error`: `{ message: 'Error fetching or indexing emails', details: error.message }`

### GET /emails

**Purpose:** Retrieve all emails for the authenticated user from Elasticsearch.

**Response:**

- `200 OK`: List of emails.
- `500 Internal Server Error`: `{ message: 'Error querying emails', details: stderr }`

### GET /createaccount

**Purpose:** Create a new account entry in Elasticsearch for the authenticated user and subscribe to email notifications.

**Headers:**

- `user_id`: User ID

**Response:**

- `201 Created`: `{ message: 'Account created and subscription added successfully', account: newAccount }`
- `500 Internal Server Error`: `{ message: 'Account created but error subscribing', details: error.message }`

### GET /subscribe

**Purpose:** Subscribe to Outlook email notifications using Microsoft Graph API.

**Response:**

- `200 OK`: `{ message: 'Subscription added successfully' }`
- `500 Internal Server Error`: `{ message: 'Error creating subscription', details: error.message }`

### POST /api/notifications

**Purpose:** Handle incoming email notifications from Microsoft Graph API.

**Response:**

- `200 OK`: `'Notifications processed successfully'`
- `500 Internal Server Error`: `'Error processing notifications'`

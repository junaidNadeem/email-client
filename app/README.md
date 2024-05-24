# Frontend React Application

This is the frontend of our application, built using React and Material-UI. The application interacts with a backend service to handle authentication, user accounts, and fetching emails. Before running this frontend application, ensure that the **backend service is up and running.**

## Table of Contents

1. [Installation](#installation)
2. [Running the Application](#running-the-application)
3. [Project Structure](#project-structure)
4. [Available Scripts](#available-scripts)

## Installation

### Prerequisites

Make sure you have Node.js and npm installed on your machine. You can download and install them from [Node.js](https://nodejs.org/).

### Steps

1. Get into app repository:

```bash
cd app/
```

2. Install dependencies:

```bash
npm install
```

## Running the Application

Before starting the frontend application, ensure that the backend service is running. The backend service is expected to run on `http://localhost:3000`.

To start the frontend application:

```bash
npm start
```

This will run the application in development mode. Open [http://localhost:3001](http://localhost:3001) to view it in your browser.

## Project Structure

Here's an overview of the project's file structure:

- `src/`
  - `Pages/`
    - `Accounts.js`: Handles user authentication and account linking.
    - `Login.js`: Manages the login process using Auth0.
    - `Mails.js`: Displays and manages the user's emails.
    - `MainPage.js`: Main page component with navigation to different sections.
  - `index.js`: Entry point for the React application.

### `Accounts.js`

Handles checking user authentication status and provides a button to log in using Outlook. 

### `Login.js`

Uses Auth0 for authentication and navigates to the main page upon successful login.

### `Mails.js`

Fetches and displays emails. Handles user and account creation if not already done.

### `MainPage.js`

Main navigation component allowing users to switch between viewing mails and linking accounts.

## Notes

- Ensure the backend service is running on `http://localhost:3000` before starting the frontend application.
- The frontend application runs on `http://localhost:3001` by default.

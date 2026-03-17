# OAuth2 PKCE Debugger

A simple Node.js application designed to debug the OAuth2 Authorization Code flow with PKCE (Proof Key for Code Exchange). It provides detailed console logs for each step of the process, helping you diagnose issues with an OAuth2 server implementation.

## Features

-   Implements the full **Authorization Code Grant** with **PKCE**.
-   **Configurable:** All client and server details are set in a `.env` file.
-   **Detailed Logging:** Every step, from code challenge generation to token exchange, is logged to the console.
-   **Self-Signed Certificate Support:** Can be configured to trust self-signed SSL certificates for local development.
-   **CSRF Protection:** Uses the `state` parameter to prevent Cross-Site Request Forgery attacks.
-   **Isolated Test Environment:** Opens the authorization flow in a new browser window to help isolate sessions.

## Setup

### Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or higher recommended)
-   An OAuth2 server to test against.

### 1. Create a Configuration File

Copy the example environment file to a new `.env` file.

```sh
cp .env.example .env
```

### 2. Configure Your Client

Open the `.env` file and fill in the details for your OAuth2 server and client application.

```ini
# OAuth2 Server Configuration
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_AUTHORIZE_URL=http://your-auth-server.com/authorize
OAUTH_TOKEN_URL=http://your-auth-server.com/token
OAUTH_SCOPES=openid profile email

# Application Configuration (this app)
# Make sure this redirect URI is registered with your OAuth2 provider
REDIRECT_URI=http://localhost:3000/callback
PORT=3000

# Development Configuration
# Set to 'true' to allow connections to an OAuth2 server using a self-signed SSL certificate.
# USE FOR LOCAL DEVELOPMENT ONLY.
ALLOW_SELF_SIGNED_CERT=false
```

**Important:** The `REDIRECT_URI` (`http://localhost:3000/callback`) must be added to your OAuth2 application's list of allowed redirect URIs on your authorization server.

### 3. Install Dependencies

Install the required Node.js packages.

```sh
npm install
```

## Usage

Start the application.

```sh
npm start
```

Once running, open your web browser and navigate to `http://localhost:3000`.

Click the **"Start Authorization"** button to begin the flow in a new popup window. All requests, responses, and errors will be logged to the terminal where you ran the `npm start` command.

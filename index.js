const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
const https = require('https');
const url = require('url');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// In-memory store for PKCE data.
// For a real app, use a session store.
let pkceStore = null;

/**
 * Generates a random base64url-encoded string.
 */
function base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Generates a SHA256 hash of the input string.
 */
function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>OAuth2 PKCE Debugger</title>
                <style>
                    body { font-family: sans-serif; text-align: center; padding-top: 50px; }
                    button { font-size: 1.2em; padding: 10px 20px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h1>OAuth2 PKCE Debugger</h1>
                <p>Click the button to start the authorization flow in a new window.</p>
                <button onclick="startAuth()">Start Authorization</button>
                <script>
                    function startAuth() {
                        const width = 800, height = 600;
                        const left = (screen.width / 2) - (width / 2);
                        const top = (screen.height / 2) - (height / 2);
                        window.open(
                            '/login',
                            'oauth-window',
                            'width=' + width + ', height=' + height + ', top=' + top + ', left=' + left
                        );
                    }
                </script>
            </body>
        </html>
    `);
});

app.get('/login', (req, res) => {
    console.log('--- Step 1: Initiating Authorization ---');

    // Generate and store the code verifier and state
    pkceStore = {
        codeVerifier: base64URLEncode(crypto.randomBytes(32)),
        state: base64URLEncode(crypto.randomBytes(32))
    };
    console.log('Generated Code Verifier:', pkceStore.codeVerifier);
    console.log('Generated State:', pkceStore.state);

    const codeChallenge = base64URLEncode(sha256(pkceStore.codeVerifier));
    console.log('Generated Code Challenge:', codeChallenge);

    const authUrl = new url.URL(process.env.OAUTH_AUTHORIZE_URL);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', process.env.OAUTH_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
    authUrl.searchParams.append('scope', process.env.OAUTH_SCOPES);
    authUrl.searchParams.append('state', pkceStore.state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    console.log('Redirecting to Authorization URL:', authUrl.href);
    console.log('--------------------------------------\n');
    res.redirect(authUrl.href);
});

app.get('/callback', async (req, res) => {
    console.log('--- Step 2: Handling Redirect from Auth Server ---');
    const { code, state } = req.query;

    if (!pkceStore || !pkceStore.state) {
        console.error('Error: No state found in storage. Please initiate login again.');
        return res.status(400).send('Error: State missing. Please <a href="/login">try the login process again</a>.');
    }

    if (state !== pkceStore.state) {
        console.error('Error: State mismatch.');
        console.error('Expected:', pkceStore.state);
        console.error('Received:', state);
        return res.status(400).send('Error: State mismatch. CSRF attack suspected.');
    }
    console.log('State verification successful.');


    if (!code) {
        console.error('Error: No authorization code received in callback.');
        res.status(400).send('Error: No authorization code received.');
        return;
    }

    console.log('Received Authorization Code:', code);
    console.log('-----------------------------------------------\n');
    console.log('--- Step 3: Exchanging Code for Access Token ---');

    if (!pkceStore.codeVerifier) {
        console.error('Error: code_verifier not found. Please initiate login again.');
        res.status(400).send('Error: No code_verifier found. Please <a href="/login">try the login process again</a>.');
        return;
    }
    console.log('Using stored Code Verifier:', pkceStore.codeVerifier);

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.REDIRECT_URI);
    params.append('client_id', process.env.OAUTH_CLIENT_ID);
    params.append('client_secret', process.env.OAUTH_CLIENT_SECRET);
    params.append('code_verifier', pkceStore.codeVerifier);

    console.log('\nMaking POST request to Token URL:', process.env.OAUTH_TOKEN_URL);
    console.log('Request Body:', params.toString());


    try {
        const axiosConfig = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        if (process.env.ALLOW_SELF_SIGNED_CERT === 'true') {
            const agent = new https.Agent({
                rejectUnauthorized: false
            });
            axiosConfig.httpsAgent = agent;
            console.log('\nAllowing self-signed certificate for this request.');
        }

        const tokenResponse = await axios.post(process.env.OAUTH_TOKEN_URL, params, axiosConfig);

        console.log('\n--- Step 4: Token Exchange Successful ---');
        console.log('Token Response Status:', tokenResponse.status);
        console.log('Token Response Body:');
        console.log(tokenResponse.data);
        console.log('----------------------------------------\n');

        res.send(`
            <h1>Token Exchange Successful</h1>
            <p>Check the console for detailed logs.</p>
            <h2>Received Token Data:</h2>
            <pre>${JSON.stringify(tokenResponse.data, null, 2)}</pre>
            <a href="/">Start Over</a>
        `);
    } catch (error) {
        console.error('\n--- Step 4: Token Exchange Failed ---');
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Headers:', JSON.stringify(error.response.headers, null, 2));
            console.error('Error Body:', JSON.stringify(error.response.data, null, 2));
            res.status(500).send(`
                <h1>Token Exchange Failed</h1>
                <p>Check the console for detailed logs.</p>
                <h2>Error Details:</h2>
                <pre>Status: ${error.response.status}</pre>
                <pre>${JSON.stringify(error.response.data, null, 2)}</pre>
                <a href="/">Start Over</a>
            `);
        } else {
            console.error('Error exchanging code for token:', error.message);
            res.status(500).send(`An error occurred: ${error.message}`);
        }
        console.error('------------------------------------\n');
    } finally {
        // Clear the PKCE store
        pkceStore = null;
    }
});

app.listen(port, () => {
    console.log(`OAuth2 PKCE Debugger app listening at http://localhost:${port}`);
});

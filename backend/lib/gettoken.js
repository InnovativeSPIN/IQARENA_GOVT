import fs from 'fs';
import readline from 'readline';
import { google } from 'googleapis';

const credentials = JSON.parse(fs.readFileSync('lib/credentials.json', 'utf8'));

if (!credentials.web) {
  throw new Error('Invalid credentials.json: missing "web" object');
}

const { client_id, client_secret, redirect_uris } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);


const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/gmail.send']
});

console.log('\nAuthorize this app by visiting this URL:\n');
console.log(authUrl);
console.log('\nAfter approval, copy ONLY the `code` from the redirect URL.\n');


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Paste the authorization code here: ', async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code);

    fs.writeFileSync('token.json', JSON.stringify(tokens, null, 2));

    console.log('\ntoken.json created successfully');
    console.log('Scope:', tokens.scope);
  } catch (err) {
    console.error('\n Failed to generate token:', err.message);
  } finally {
    rl.close();
  }
});

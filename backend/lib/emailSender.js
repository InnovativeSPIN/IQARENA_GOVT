import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

/* ---------------- Path Setup (ABSOLUTE) ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH =
  process.env.GMAIL_CREDENTIALS_PATH || path.join(__dirname, 'credentials.json');

const TOKEN_PATH =
  process.env.GMAIL_TOKEN_PATH || path.join(__dirname, 'token.json');

/* ---------------- Defaults ---------------- */
const DEFAULT_FROM = 'IQARENA <nscetiqarena@gmail.com>';

/* ---------------- Gmail Init ---------------- */
let gmail;
let oAuth2Client;
let gmailToken;
let gmailClientId;
let gmailClientSecret;
let gmailConfigured = false;

try {
  if (fs.existsSync(CREDENTIALS_PATH) && fs.existsSync(TOKEN_PATH)) {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));

    if (credentials?.web && token) {
      const { client_id, client_secret, redirect_uris } = credentials.web;

      gmailClientId = client_id;
      gmailClientSecret = client_secret;
      gmailToken = token;

      oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      oAuth2Client.setCredentials(token);

      gmail = google.gmail({
        version: 'v1',
        auth: oAuth2Client
      });

      gmailConfigured = true;
    }
  }
} catch {
  gmailConfigured = false;
}

/* ---------------- Helpers ---------------- */
function validateMailInput({ to, subject }) {
  if (!to) throw new Error('"to" email is required');
  if (!subject) throw new Error('"subject" is required');
}

function buildRawEmail({ from, to, subject, text, html }) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    html
      ? 'Content-Type: text/html; charset=utf-8'
      : 'Content-Type: text/plain; charset=utf-8'
  ];

  const body = html || text || '';

  return Buffer.from(`${headers.join('\n')}\n\n${body}`)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/* ---------------- Public API ---------------- */
export async function sendMail({
  to,
  subject,
  text,
  html,
  from = DEFAULT_FROM,
  attachments = []
}) {
  validateMailInput({ to, subject });

  if (!gmailConfigured) {
    throw new Error(
      'GMAIL_NOT_CONFIGURED: credentials.json or token.json missing/invalid'
    );
  }

  return sendViaGmail({ from, to, subject, text, html, attachments });
}

/* ---------------- Gmail Verification ---------------- */
export async function verifyGmail() {
  if (!gmailConfigured) {
    throw new Error('GMAIL_NOT_CONFIGURED');
  }

  try {
    await gmail.users.getProfile({ userId: 'me' });
    return true;
  } catch (err) {
    const msg = String(err && err.message || '').toLowerCase();
    if (msg.includes('insufficient') && msg.includes('scope')) {
      const e = new Error('GMAIL_INSUFFICIENT_SCOPES: OAuth token is missing required Gmail scopes (e.g. gmail.send). Re-run the OAuth helper to grant the required scopes.');
      e.code = 'GMAIL_INSUFFICIENT_SCOPES';
      throw e;
    }
    if (msg.includes('invalid_grant') || msg.includes('invalid_token') || msg.includes('invalid_credentials') || msg.includes('login_required') || msg.includes('unauthorized')) {
      const e = new Error('GMAIL_AUTH_ERROR: Gmail authorization failed. Ensure `credentials.json` and `token.json` are valid and that the token has not been revoked/expired. Provider: ' + (err.message || err));
      e.code = 'GMAIL_AUTH_ERROR';
      throw e;
    }
    throw err;
  }
}

/* ---------------- Gmail Sender ---------------- */
async function sendViaGmail({ from, to, subject, text, html, attachments }) {
  // ✅ With attachments → Nodemailer + OAuth2
  if (attachments.length > 0) {
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const gmailAddress = profile.data.emailAddress;

      const accessTokenObj = await oAuth2Client.getAccessToken();
      const accessToken = accessTokenObj.token || accessTokenObj;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: gmailAddress,
          clientId: gmailClientId,
          clientSecret: gmailClientSecret,
          refreshToken: gmailToken.refresh_token,
          accessToken
        }
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
        attachments
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      const msg = String(err && err.message || '').toLowerCase();
      if (msg.includes('insufficient') && msg.includes('scope')) {
        const e = new Error('GMAIL_INSUFFICIENT_SCOPES: The OAuth token does not have the required Gmail scopes (e.g. gmail.send). Re-run the OAuth helper to grant the scopes.');
        e.code = 'GMAIL_INSUFFICIENT_SCOPES';
        throw e;
      }
      if (msg.includes('invalid_grant') || msg.includes('invalid_token') || msg.includes('invalid_credentials') || msg.includes('login_required') || msg.includes('unauthorized')) {
        const e = new Error('GMAIL_AUTH_ERROR: Gmail authorization failed. Ensure `credentials.json` and `token.json` are valid and that the token has not been revoked/expired. Provider: ' + (err.message || err));
        e.code = 'GMAIL_AUTH_ERROR';
        throw e;
      }
      throw err;
    }
  }

  // ✅ No attachments → Gmail REST API (fastest)
  const raw = buildRawEmail({ from, to, subject, text, html });

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });
    return { success: true, messageId: res.data.id };
  } catch (err) {
    const msg = String(err && err.message || '').toLowerCase();
    if (msg.includes('insufficient') && msg.includes('scope')) {
      const e = new Error('GMAIL_INSUFFICIENT_SCOPES: The OAuth token does not have the required Gmail scopes (e.g. gmail.send). Re-run the OAuth helper to grant the scopes.');
      e.code = 'GMAIL_INSUFFICIENT_SCOPES';
      throw e;
    }
    if (msg.includes('invalid_grant') || msg.includes('invalid_token') || msg.includes('invalid_credentials') || msg.includes('login_required') || msg.includes('unauthorized')) {
      const e = new Error('GMAIL_AUTH_ERROR: Gmail authorization failed. Ensure `credentials.json` and `token.json` are valid and that the token has not been revoked/expired. Provider: ' + (err.message || err));
      e.code = 'GMAIL_AUTH_ERROR';
      throw e;
    }
    throw new Error(`Gmail API send failed: ${err.message}`);
  }
}

export default { sendMail };

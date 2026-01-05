import { google } from 'googleapis';

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

function getOAuth2Client() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://www.iamsahlien.com/api/gmail/callback'
    : `https://${process.env.REPLIT_DEV_DOMAIN}/api/gmail/callback`;
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGmailAuthUrl(): string | null {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly'
    ]
  });
}

export async function exchangeCodeForTokens(code: string): Promise<{ refresh_token: string; access_token: string }> {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Gmail OAuth not configured');
  }
  
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token || !tokens.access_token) {
    throw new Error('Failed to get tokens from Google');
  }
  
  return {
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token
  };
}

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  
  if (refreshToken) {
    if (cachedAccessToken && tokenExpiresAt > Date.now()) {
      return cachedAccessToken;
    }
    
    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      throw new Error('Gmail OAuth credentials not configured');
    }
    
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      cachedAccessToken = credentials.access_token || null;
      tokenExpiresAt = credentials.expiry_date || Date.now() + 3500000;
      
      if (!cachedAccessToken) {
        throw new Error('Failed to refresh access token');
      }
      
      return cachedAccessToken;
    } catch (error) {
      console.error('Error refreshing Gmail token:', error);
      throw new Error('Gmail token expired - please re-authorize in admin settings');
    }
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!hostname || !xReplitToken) {
    throw new Error('Gmail not configured - add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to secrets');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];
  
  if (!connectionSettings || !connectionSettings.settings) {
    throw new Error('Gmail not connected - configure project secrets or reconnect integration');
  }

  const accessToken = connectionSettings.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export function isGmailConfigured(): boolean {
  return !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
}

export async function getGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function sendEmail(to: string, subject: string, htmlBody: string, from: string = 'Team Aeon <iamsahlien@gmail.com>') {
  const gmail = await getGmailClient();
  
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody
  ].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });
}

export async function sendEmailWithAttachment(
  to: string, 
  subject: string, 
  htmlBody: string, 
  attachmentUrl: string,
  attachmentName: string = 'agreement.pdf',
  from: string = 'Team Aeon <iamsahlien@gmail.com>'
) {
  const gmail = await getGmailClient();
  
  const pdfResponse = await fetch(attachmentUrl);
  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  const pdfBase64 = pdfBuffer.toString('base64');
  
  const boundary = `boundary_${Date.now()}`;
  
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${attachmentName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    '',
    pdfBase64,
    '',
    `--${boundary}--`
  ].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });
}

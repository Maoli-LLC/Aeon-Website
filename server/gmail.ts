import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_SMTP_USER || 'iamsahlien@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

function getTransporter() {
  if (!GMAIL_APP_PASSWORD) {
    throw new Error('Gmail not configured - add GMAIL_APP_PASSWORD to secrets');
  }
  
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });
}

export function isGmailConfigured(): boolean {
  return !!GMAIL_APP_PASSWORD;
}

export async function sendEmail(
  to: string, 
  subject: string, 
  htmlBody: string, 
  from: string = 'Team Aeon <iamsahlien@gmail.com>'
) {
  const transporter = getTransporter();
  
  await transporter.sendMail({
    from,
    to,
    subject,
    html: htmlBody
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
  const transporter = getTransporter();
  
  const pdfResponse = await fetch(attachmentUrl);
  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  
  await transporter.sendMail({
    from,
    to,
    subject,
    html: htmlBody,
    attachments: [
      {
        filename: attachmentName,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });
}

export function getGmailAuthUrl(): string | null {
  return null;
}

export async function exchangeCodeForTokens(code: string): Promise<{ refresh_token: string; access_token: string }> {
  throw new Error('OAuth not used - using SMTP instead');
}

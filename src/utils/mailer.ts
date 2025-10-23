import { SendMailOptions, createTransport } from "nodemailer";
import { MAILER_EMAIL, MAILER_PASSWORD, MAILER_TRANSPORT_HOST, MAILER_TRANSPORT_PORT, MAILER_TRANSPORT_SECURE } from "../config";
import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }): Promise<string> {
  const transporter = createTransport({
    host: MAILER_TRANSPORT_HOST,
    port: MAILER_TRANSPORT_PORT,
    secure: MAILER_TRANSPORT_SECURE,
    auth: {
      user: MAILER_EMAIL,
      pass: MAILER_PASSWORD,
    },
  });

  console.log(MAILER_EMAIL, MAILER_PASSWORD, MAILER_TRANSPORT_HOST, MAILER_TRANSPORT_PORT);

  const mailOptions: SendMailOptions = {
    from: `Seven 365 <${MAILER_EMAIL}>`,
    to,
    subject,
  };

  if (text) {
    mailOptions.text = text;
  }

  if (html) {
    mailOptions.html = html;
  }

  try {
    await transporter.sendMail(mailOptions);
    return Promise.resolve("Email sent successfully");
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Send Password Reset OTP Email
 * Uses MJML template with OTP code
 */
export async function sendPasswordResetOTP(email: string, otpCode: string): Promise<string> {
  try {
    // Read MJML template from src folder
    const templatePath = path.join(__dirname, '../forgot-password.mjml');
    const mjmlTemplate = fs.readFileSync(templatePath, 'utf-8');

    // Replace {{OTP_CODE}} with actual code
    const mjmlWithCode = mjmlTemplate.replace('{{OTP_CODE}}', otpCode);

    // Convert MJML to HTML
    const { html } = mjml2html(mjmlWithCode);

    // Send email using existing sendEmail function
    return await sendEmail({
      to: email,
      subject: 'Password Reset Code',
      html: html
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}
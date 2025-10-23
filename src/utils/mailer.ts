import { SendMailOptions, createTransport } from "nodemailer";
import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';

// Create Ethereal test account on first use
let etherealTransporter: any = null;

async function getEtherealTransporter() {
  if (etherealTransporter) {
    return etherealTransporter;
  }

  // Generate test SMTP credentials from ethereal.email
  const testAccount = await require('nodemailer').createTestAccount();

  console.log('   Ethereal Email Account Created:');
  console.log('   Email:', testAccount.user);
  console.log('   Password:', testAccount.pass);
  console.log('   SMTP Host:', testAccount.smtp.host);
  console.log('   SMTP Port:', testAccount.smtp.port);

  // Create transporter with Ethereal credentials
  etherealTransporter = createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return etherealTransporter;
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }): Promise<string> {
  const transporter = await getEtherealTransporter();

  const mailOptions: SendMailOptions = {
    from: `Chumme App <noreply@chumme.app>`,
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
    const info = await transporter.sendMail(mailOptions);
    // Get preview URL
    const previewUrl = require('nodemailer').getTestMessageUrl(info);

    console.log('Email sent successfully!');
    console.log('Preview URL:', previewUrl);
    console.log('   (Copy this URL to view the email in your browser)');

    return Promise.resolve(`Email sent! Preview at: ${previewUrl}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    return Promise.reject(error);
  }
}

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

export async function sendVerificationOTP(email: string, otpCode: string): Promise<string> {
  try {
    const templatePath = path.join(__dirname, '../verification-email.mjml');
    const mjmlTemplate = fs.readFileSync(templatePath, 'utf-8');
    const mjmlWithCode = mjmlTemplate.replace('{{OTP_CODE}}', otpCode);
    const { html } = mjml2html(mjmlWithCode);

    return await sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html: html
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}
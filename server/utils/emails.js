// server/utils/emails.js
import nodemailer from 'nodemailer';

/**
 * Sends an email using a highly resilient auto-fallback multi-transport setup.
 * Attempts STARTTLS on port 587 first (most compatible with cloud firewalls like Render/Vercel),
 * then falls back to SSL on port 465, and finally falls back to the high-level 'gmail' service helper.
 * 
 * @param {Object} options - Email parameters
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body content
 * @param {string} [options.text] - Plain text fallback content
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials (EMAIL_USER and/or EMAIL_PASS) are not configured in the server environment (.env).');
  }

  let transporter;
  let lastError;

  // List of transport configurations to try in sequence for maximum compatibility
  const transportConfigs = [
    // Configuration 1: SMTP Port 587 (TLS/STARTTLS) - High compatibility with Cloud firewalls
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Must be false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Prevents local/hosting SSL certificate issues
      },
      connectionTimeout: 8000 // 8-second timeout per attempt
    },
    // Configuration 2: SMTP Port 465 (Secure SSL)
    {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Must be true for 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 8000
    },
    // Configuration 3: Gmail Service Resolver (Nodemailer's default service module)
    {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 8000
    }
  ];

  for (let i = 0; i < transportConfigs.length; i++) {
    try {
      console.log(`✉️ Attempting email delivery using transport configuration option ${i + 1}/3...`);
      transporter = nodemailer.createTransport(transportConfigs[i]);
      
      // Verify connection with timeout
      await transporter.verify();

      // Send the mail
      const info = await transporter.sendMail({
        from: `"Shortlisted AI" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text: text || '',
        html,
      });

      console.log(`✅ Email sent successfully to ${to} using transport option ${i + 1}! Message ID: ${info.messageId}`);
      return info;
    } catch (err) {
      console.warn(`⚠️ Transport configuration option ${i + 1} failed:`, err.message);
      lastError = err;
    }
  }

  // If all configs failed, throw a detailed error
  console.error('❌ All email transport options failed.');
  throw new Error(`Failed to send email. All SMTP transport attempts failed. Last error: ${lastError?.message}`);
};
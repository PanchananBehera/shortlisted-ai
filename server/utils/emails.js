// server/utils/emails.js
import nodemailer from 'nodemailer';

/**
 * Enforces a strict timeout on nodemailer verification to prevent indefinite hanging
 * when SMTP ports are blocked by a firewall or network issue.
 */
const verifyWithTimeout = (transporter, timeoutMs = 3000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Connection verification timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    transporter.verify()
      .then(() => {
        clearTimeout(timer);
        resolve(true);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

/**
 * Sends an email using a highly resilient auto-fallback multi-transport setup.
 * Attempts the high-level 'gmail' service helper first (extremely reliable for Gmail users),
 * then falls back to SMTP STARTTLS on port 587, and finally SSL on port 465.
 * Enforces a 3-second timeout on each attempt to prevent indefinite buffering.
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
    // Configuration 1: Gmail Service Resolver (Nodemailer's default service module)
    // Extremely reliable and fast when EMAIL_USER is a Gmail address
    {
      name: "Gmail Service module",
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 5000
    },
    // Configuration 2: SMTP Port 587 (TLS/STARTTLS)
    {
      name: "SMTP Port 587 (STARTTLS)",
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
      connectionTimeout: 5000
    },
    // Configuration 3: SMTP Port 465 (Secure SSL)
    {
      name: "SMTP Port 465 (Secure SSL)",
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
      connectionTimeout: 5000
    }
  ];

  for (let i = 0; i < transportConfigs.length; i++) {
    const config = transportConfigs[i];
    try {
      console.log(`✉️ Attempting email delivery using transport configuration: ${config.name} (${i + 1}/${transportConfigs.length})...`);
      
      // Clean config object for transporter creation (delete custom name property)
      const cleanConfig = { ...config };
      delete cleanConfig.name;
      
      transporter = nodemailer.createTransport(cleanConfig);
      
      // Verify connection with a strict 3-second timeout
      await verifyWithTimeout(transporter, 3000);

      // Send the mail
      const info = await transporter.sendMail({
        from: `"Shortlisted AI" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text: text || '',
        html,
      });

      console.log(`✅ Email sent successfully to ${to} using ${config.name}! Message ID: ${info.messageId}`);
      return info;
    } catch (err) {
      console.warn(`⚠️ Transport option ${config.name} failed:`, err.message);
      lastError = err;
    }
  }

  // If all configs failed, throw a detailed error
  console.error('❌ All email transport options failed.');
  throw new Error(`Failed to send email. All SMTP transport attempts failed. Last error: ${lastError?.message}`);
};
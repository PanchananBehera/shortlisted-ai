// src/utils/alerts.js
// ✅ Send alerts to Slack, email, or other channels for critical errors
import axios from 'axios';

// 🎯 Configuration (load from env vars in production)
const SLACK_WEBHOOK_URL = process.env.SLACK_ERROR_WEBHOOK;
const ALERT_EMAIL = process.env.ALERT_EMAIL;

/**
 * Send alert to configured channels
 * @param {Object} params - Alert details
 */
export const sendAlert = async ({ channel, title, message, details = {} }) => {
  const alerts = [];
  
  // 📱 Slack alert
  if (SLACK_WEBHOOK_URL) {
    alerts.push(sendSlackAlert({ channel, title, message, details }));
  }
  
  // 📧 Email alert (for critical only)
  if (details.severity === 'critical' && ALERT_EMAIL) {
    alerts.push(sendEmailAlert({ title, message, details }));
  }
  
  // Wait for all alerts (with timeout to avoid blocking)
  return Promise.allSettled(alerts.map(p => 
    Promise.race([
      p,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Alert timeout')), 5000)
      )
    ])
  ));
};

/**
 * Send formatted message to Slack
 */
const sendSlackAlert = async ({ channel, title, message, details }) => {
  if (!SLACK_WEBHOOK_URL) return;
  
  const color = {
    critical: '#ff0000',
    high: '#ff8800', 
    medium: '#ffaa00',
    low: '#00aa00'
  }[details.severity] || '#888888';
  
  const payload = {
    channel: channel || '#engineering-alerts',
    username: 'ErrorBot',
    icon_emoji: ':warning:',
    attachments: [{
      color,
      title,
      text: message,
      fields: Object.entries(details).map(([key, value]) => ({
        title: key,
        value: String(value),
        short: true
      })),
      footer: 'Shortlisted AI Error Reporter',
      ts: Math.floor(Date.now() / 1000)
    }]
  };
  
  await axios.post(SLACK_WEBHOOK_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 3000
  });
  
  console.log(`📤 Slack alert sent: ${title}`);
};

/**
 * Send email alert (using your email service)
 */
const sendEmailAlert = async ({ title, message, details }) => {
  // 🔄 Replace with your email service (SendGrid, Resend, etc.)
  console.log(`📧 Email alert would be sent to ${ALERT_EMAIL}:`, {
    subject: `🚨 ${title}`,
    body: `${message}\n\nDetails:\n${JSON.stringify(details, null, 2)}`
  });
  
  // Example with nodemailer:
  // const transporter = nodemailer.createTransport({ /* your config */ });
  // await transporter.sendMail({
  //   from: 'alerts@shortlisted.ai',
  //   to: ALERT_EMAIL,
  //   subject: `🚨 ${title}`,
  //   text: `${message}\n\nDetails:\n${JSON.stringify(details, null, 2)}`,
  //   html: `<h3>${title}</h3><p>${message}</p><pre>${JSON.stringify(details, null, 2)}</pre>`
  // });

};
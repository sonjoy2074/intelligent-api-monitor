const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const sendAlertEmail = async (anomaly) => {
  const { EMAIL_USER, EMAIL_PASS, ALERT_RECIPIENT_EMAIL } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS || !ALERT_RECIPIENT_EMAIL) {
    logger.info('Email notification skipped: SMTP credentials not fully configured in .env');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"API Health Monitor" <${EMAIL_USER}>`,
      to: ALERT_RECIPIENT_EMAIL,
      subject: `🚨 [${anomaly.severity}] API Anomaly Alert: ${anomaly.api_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #d9534f;">API Anomaly Detected</h2>
          <p><strong>API:</strong> ${anomaly.api_name}</p>
          <p><strong>Severity:</strong> <span style="color: red; font-weight: bold;">${anomaly.severity}</span></p>
          <p><strong>Status Code:</strong> ${anomaly.status_code}</p>
          <p><strong>Response Time:</strong> ${anomaly.response_time_ms} ms</p>
          <p><strong>Records Returned:</strong> ${anomaly.records_returned}</p>
          <hr/>
          <h3>AI Alert Summary:</h3>
          <blockquote style="background: #f8f9fa; border-left: 4px solid #d9534f; padding: 10px 15px;">
            ${anomaly.ai_alert}
          </blockquote>
          <p style="font-size: 12px; color: #888;">Detected at: ${new Date(anomaly.createdAt || Date.now()).toLocaleString()}</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Alert email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send alert email: ${error.message}`);
    return false;
  }
};

module.exports = {
  sendAlertEmail
};

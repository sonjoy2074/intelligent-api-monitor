const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Helper to build configured nodemailer transporter
 */
const createTransporter = () => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const rawPass = (process.env.EMAIL_PASS || '').trim();
  // Strip spaces if user copied Google App Password with spaces (e.g. "abcd efgh ijkl mnop")
  const emailPass = rawPass.replace(/\s+/g, '');

  if (!emailUser || !emailPass) {
    return null;
  }

  const service = (process.env.EMAIL_SERVICE || 'gmail').trim().toLowerCase();

  return nodemailer.createTransport({
    service,
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
};

/**
 * Returns color tokens for email HTML based on anomaly severity
 */
const getSeverityColors = (severity = 'MEDIUM') => {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' };
    case 'HIGH':
      return { bg: '#ffedd5', text: '#9a3412', border: '#ea580c' };
    case 'MEDIUM':
      return { bg: '#fef3c7', text: '#92400e', border: '#d97706' };
    default:
      return { bg: '#e0f2fe', text: '#075985', border: '#0284c7' };
  }
};

/**
 * Send an alert email for an individual detected anomaly
 * @param {Object} anomaly - Anomaly object
 * @returns {Promise<boolean>}
 */
const sendAlertEmail = async (anomaly) => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const recipient = (process.env.ALERT_RECIPIENT_EMAIL || '').trim();
  const transporter = createTransporter();

  if (!transporter || !recipient) {
    logger.info('Email notification skipped: EMAIL_USER, EMAIL_PASS, or ALERT_RECIPIENT_EMAIL not configured');
    return false;
  }

  const colors = getSeverityColors(anomaly.severity);
  const issuesList = (anomaly.anomaly_types || [])
    .map((issue) => `<li style="margin-bottom: 4px;">${issue}</li>`)
    .join('');

  const mailOptions = {
    from: `"Intelligent API Monitor" <${emailUser}>`,
    to: recipient,
    subject: `🚨 [${anomaly.severity}] API Anomaly Alert: ${anomaly.api_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; }
          .header { background: #0f172a; padding: 24px 28px; color: #ffffff; border-bottom: 3px solid ${colors.border}; }
          .header-title { margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; }
          .header-sub { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
          .badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 6px; background: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border}; margin-top: 10px; }
          .content { padding: 24px 28px; }
          .ai-box { background: #f8fafc; border-left: 4px solid #6366f1; border-radius: 6px; padding: 14px 18px; margin: 20px 0; }
          .ai-box h4 { margin: 0 0 8px; color: #4338ca; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
          .ai-box p { margin: 0; font-size: 14px; line-height: 1.5; color: #334155; font-style: italic; }
          .table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          .table th { text-align: left; padding: 8px 12px; background: #f1f5f9; color: #475569; font-weight: 600; border-bottom: 1px solid #cbd5e1; }
          .table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
          .issues-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 12px 18px; margin-top: 16px; }
          .issues-box h5 { margin: 0 0 6px; color: #9f1239; font-size: 13px; font-weight: 700; }
          .issues-box ul { margin: 0; padding-left: 18px; font-size: 13px; color: #881337; }
          .footer { background: #f8fafc; padding: 16px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 class="header-title">🚨 API Anomaly Detected</h2>
            <div class="header-sub">Intelligent API Monitoring & Alert System</div>
            <span class="badge">${anomaly.severity} SEVERITY</span>
          </div>

          <div class="content">
            <div class="ai-box">
              <h4>🤖 AI Incident Analysis</h4>
              <p>${anomaly.ai_alert || 'Automated anomaly detected by monitoring heuristics.'}</p>
            </div>

            <table class="table">
              <tr>
                <th>API Endpoint</th>
                <td><strong>${anomaly.api_name}</strong></td>
              </tr>
              <tr>
                <th>HTTP Status</th>
                <td><code>${anomaly.status_code}</code></td>
              </tr>
              <tr>
                <th>Response Time</th>
                <td><strong>${anomaly.response_time_ms} ms</strong></td>
              </tr>
              <tr>
                <th>Records Returned</th>
                <td>${anomaly.records_returned ?? 0}</td>
              </tr>
              <tr>
                <th>Detected At</th>
                <td>${new Date(anomaly.createdAt || Date.now()).toUTCString()}</td>
              </tr>
            </table>

            ${
              issuesList
                ? `<div class="issues-box">
                    <h5>Triggered Anomaly Rules:</h5>
                    <ul>${issuesList}</ul>
                  </div>`
                : ''
            }
          </div>

          <div class="footer">
            PulseAI Monitoring System &bull; Autonomous Health SRE Engine &bull; Automated notification
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Alert email sent successfully to ${recipient}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send alert email: ${error.message}`);
    return false;
  }
};

/**
 * Send a consolidated batch anomaly report
 * @param {Array} anomalies - Array of anomaly objects
 * @param {Object} batchStats - Summary metrics of processed batch
 * @returns {Promise<boolean>}
 */
const sendBatchReportEmail = async (anomalies, batchStats = {}) => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const recipient = (process.env.ALERT_RECIPIENT_EMAIL || '').trim();
  const transporter = createTransporter();

  if (!transporter || !recipient || !anomalies || anomalies.length === 0) {
    return false;
  }

  const rows = anomalies
    .map((a) => {
      const colors = getSeverityColors(a.severity);
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${a.api_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><span style="background:${colors.bg};color:${colors.text};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;">${a.severity}</span></td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><code>${a.status_code}</code></td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${a.response_time_ms} ms</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${a.records_returned}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #475569;">${a.ai_alert || (a.anomaly_types || []).join(', ')}</td>
        </tr>
      `;
    })
    .join('');

  const mailOptions = {
    from: `"Intelligent API Monitor" <${emailUser}>`,
    to: recipient,
    subject: `📊 API Anomaly Batch Report: ${anomalies.length} Incident(s) Detected`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; margin: 0; padding: 24px; }
          .container { max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
          .header { background: #0f172a; padding: 24px 28px; color: #ffffff; border-bottom: 3px solid #6366f1; }
          .content { padding: 24px 28px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
          th { text-align: left; padding: 10px; background: #f8fafc; color: #475569; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0;font-size:20px;">📊 Telemetry Batch Ingestion Report</h2>
            <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Total Processed: ${batchStats.total_processed || anomalies.length} &bull; Anomalies Detected: ${anomalies.length}</p>
          </div>
          <div class="content">
            <p style="font-size:14px;color:#334155;">The following APIs exhibited anomalous performance during the latest telemetry ingestion cycle:</p>
            <table>
              <thead>
                <tr>
                  <th>API</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Records</th>
                  <th>AI Incident Summary</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
          <div class="footer">
            PulseAI Monitoring System &bull; Technical Interview Evaluation
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Batch anomaly report email sent to ${recipient}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send batch report email: ${error.message}`);
    return false;
  }
};

/**
 * Send a verification test email
 */
const sendTestEmail = async () => {
  const recipient = (process.env.ALERT_RECIPIENT_EMAIL || '').trim();
  const mockAnomaly = {
    api_name: 'TestVerificationAPI',
    response_time_ms: 4500,
    status_code: 500,
    records_returned: 0,
    severity: 'CRITICAL',
    anomaly_types: ['Server Error (500)', 'Severe Latency Spike (4500ms)', 'Zero records returned'],
    ai_alert: 'TEST ALERT: The TestVerificationAPI experienced a simulated outage (HTTP 500) and excessive latency (4500ms). SMTP email alert delivery has been successfully verified.',
    createdAt: new Date()
  };

  return await sendAlertEmail(mockAnomaly);
};

module.exports = {
  sendAlertEmail,
  sendBatchReportEmail,
  sendTestEmail
};

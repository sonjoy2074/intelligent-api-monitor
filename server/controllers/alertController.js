const alertStore = require('../services/alertStore');
const { sendTestEmail } = require('../services/emailService');

/**
 * Fetch all active anomalies / alerts
 * GET /alerts
 */
const getActiveAlerts = async (req, res, next) => {
  try {
    const { severity, api_name, limit = 50 } = req.query;

    const alerts = await alertStore.getAlerts({ severity, api_name, limit });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Acknowledge or resolve an alert
 * PATCH /alerts/:id/resolve
 */
const resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await alertStore.resolveAlertById(id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a verification test email
 * POST /alerts/test-email
 */
const sendTestAlert = async (req, res, next) => {
  try {
    const recipient = (process.env.ALERT_RECIPIENT_EMAIL || '').trim();
    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'ALERT_RECIPIENT_EMAIL is not configured in .env'
      });
    }

    const sent = await sendTestEmail();
    if (sent) {
      return res.status(200).json({
        success: true,
        message: `Test anomaly report successfully sent to ${recipient}`
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email. Please check SMTP credentials in .env.'
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveAlerts,
  resolveAlert,
  sendTestAlert
};

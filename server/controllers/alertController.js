const alertStore = require('../services/alertStore');

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

module.exports = {
  getActiveAlerts,
  resolveAlert
};

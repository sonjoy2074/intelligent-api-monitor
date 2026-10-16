const Anomaly = require('../models/Anomaly');

/**
 * Fetch all active anomalies / alerts
 * GET /alerts
 */
const getActiveAlerts = async (req, res, next) => {
  try {
    const { severity, api_name, limit = 50 } = req.query;

    const query = { is_active: true };
    if (severity) query.severity = severity.toUpperCase();
    if (api_name) query.api_name = new RegExp(api_name, 'i');

    const alerts = await Anomaly.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

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
    const alert = await Anomaly.findByIdAndUpdate(
      id,
      { is_active: false },
      { new: true }
    );

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

const mongoose = require('mongoose');
const Anomaly = require('../models/Anomaly');
const logger = require('../utils/logger');

// In-memory fallback storage when MongoDB is not active
const memoryAlerts = [];
let memoryIdCounter = 1;

const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * Save anomaly to MongoDB or in-memory fallback
 */
const saveAnomaly = async (anomalyData) => {
  if (isMongoConnected()) {
    try {
      return await Anomaly.create(anomalyData);
    } catch (err) {
      logger.error(`MongoDB write error, falling back to memory: ${err.message}`);
    }
  }

  // In-memory fallback record
  const record = {
    _id: `mem_${Date.now()}_${memoryIdCounter++}`,
    api_name: anomalyData.api_name,
    response_time_ms: anomalyData.response_time_ms,
    status_code: anomalyData.status_code,
    records_returned: anomalyData.records_returned ?? 0,
    anomaly_types: anomalyData.anomaly_types || [],
    severity: anomalyData.severity || 'MEDIUM',
    ai_alert: anomalyData.ai_alert,
    is_active: anomalyData.is_active !== undefined ? anomalyData.is_active : true,
    metadata: anomalyData.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
    is_in_memory: true
  };

  memoryAlerts.unshift(record);
  return record;
};

/**
 * Retrieve active alerts
 */
const getAlerts = async ({ severity, api_name, limit = 50 } = {}) => {
  if (isMongoConnected()) {
    try {
      const query = { is_active: true };
      if (severity) query.severity = severity.toUpperCase();
      if (api_name) query.api_name = new RegExp(api_name, 'i');

      return await Anomaly.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit));
    } catch (err) {
      logger.error(`MongoDB query error, falling back to memory: ${err.message}`);
    }
  }

  // Fallback in-memory query
  let filtered = memoryAlerts.filter((a) => a.is_active);
  if (severity) {
    filtered = filtered.filter((a) => a.severity.toUpperCase() === severity.toUpperCase());
  }
  if (api_name) {
    const regex = new RegExp(api_name, 'i');
    filtered = filtered.filter((a) => regex.test(a.api_name));
  }
  return filtered.slice(0, Number(limit));
};

/**
 * Resolve an alert by ID
 */
const resolveAlertById = async (id) => {
  if (isMongoConnected() && !String(id).startsWith('mem_')) {
    try {
      const updated = await Anomaly.findByIdAndUpdate(
        id,
        { is_active: false },
        { new: true }
      );
      if (updated) return updated;
    } catch (err) {
      logger.error(`MongoDB resolve error: ${err.message}`);
    }
  }

  // Fallback in-memory resolution
  const alert = memoryAlerts.find((a) => String(a._id) === String(id));
  if (alert) {
    alert.is_active = false;
    alert.updatedAt = new Date();
    return alert;
  }
  return null;
};

module.exports = {
  saveAnomaly,
  getAlerts,
  resolveAlertById,
  isMongoConnected
};

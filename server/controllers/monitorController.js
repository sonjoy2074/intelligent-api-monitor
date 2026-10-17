const alertStore = require('../services/alertStore');
const { detectAnomalies } = require('../services/anomalyDetector');
const { generateAlertWithAI } = require('../services/llmService');
const { sendAlertEmail, sendBatchReportEmail } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Process single or batch of API health telemetry data
 * POST /monitor
 */
const processApiData = async (req, res, next) => {
  try {
    let payload = req.body;

    if (!payload) {
      return res.status(400).json({ success: false, message: 'Request body cannot be empty' });
    }

    // Support both single object and array of objects
    const items = Array.isArray(payload) ? payload : [payload];

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Empty items list provided' });
    }

    const processedResults = [];
    const detectedAnomalies = [];

    for (const item of items) {
      // Basic validation
      if (!item.api_name || item.response_time_ms === undefined || item.status_code === undefined) {
        processedResults.push({
          api_name: item.api_name || 'UNKNOWN',
          status: 'skipped',
          reason: 'Missing required fields (api_name, response_time_ms, status_code)'
        });
        continue;
      }

      // Check anomalies
      const detectionResult = detectAnomalies(item);

      if (detectionResult.isAnomaly) {
        // Generate AI alert summary
        const aiAlert = await generateAlertWithAI(detectionResult);

        // Save anomaly via alertStore (persists to MongoDB, or in-memory fallback)
        let savedAnomaly = null;
        try {
          savedAnomaly = await alertStore.saveAnomaly({
            api_name: item.api_name,
            response_time_ms: item.response_time_ms,
            status_code: item.status_code,
            records_returned: item.records_returned ?? 0,
            anomaly_types: detectionResult.anomaly_types,
            severity: detectionResult.severity,
            ai_alert: aiAlert,
            is_active: true
          });
        } catch (saveErr) {
          logger.error(`Alert save error: ${saveErr.message}`);
          savedAnomaly = {
            ...item,
            anomaly_types: detectionResult.anomaly_types,
            severity: detectionResult.severity,
            ai_alert: aiAlert
          };
        }

        detectedAnomalies.push(savedAnomaly);
        processedResults.push({
          api_name: item.api_name,
          status: 'anomaly_detected',
          severity: detectionResult.severity,
          issues: detectionResult.anomaly_types,
          alert: aiAlert
        });
      } else {
        processedResults.push({
          api_name: item.api_name,
          status: 'healthy'
        });
      }
    }

    logger.info(`Processed ${items.length} items. Detected ${detectedAnomalies.length} anomalies.`);

    // 7.4 Send anomaly reports via email
    if (detectedAnomalies.length > 0) {
      if (detectedAnomalies.length === 1) {
        sendAlertEmail(detectedAnomalies[0]).catch((err) =>
          logger.error(`Async email alert failed: ${err.message}`)
        );
      } else {
        sendBatchReportEmail(detectedAnomalies, { total_processed: items.length }).catch((err) =>
          logger.error(`Async batch email report failed: ${err.message}`)
        );
      }
    }

    return res.status(200).json({
      success: true,
      total_processed: items.length,
      anomalies_count: detectedAnomalies.length,
      email_dispatched: detectedAnomalies.length > 0,
      results: processedResults
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processApiData
};

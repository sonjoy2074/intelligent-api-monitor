/**
 * Anomaly Detection Service
 * Evaluates API response metrics:
 * - High response time (threshold check)
 * - Failed status codes (4xx, 5xx)
 * - Missing or zero records when expected
 */

const THRESHOLDS = {
  RESPONSE_TIME_MS: 3000, // Response times > 3000ms considered high
  CRITICAL_RESPONSE_TIME_MS: 5000
};

const detectAnomalies = (apiData) => {
  const anomalies = [];
  let severity = 'LOW';

  const { response_time_ms, status_code, records_returned, api_name } = apiData;

  // 1. Status Code Check
  if (status_code >= 500) {
    anomalies.push(`Server Error (${status_code})`);
    severity = 'CRITICAL';
  } else if (status_code >= 400) {
    anomalies.push(`Client/Authentication Error (${status_code})`);
    if (severity !== 'CRITICAL') severity = 'HIGH';
  }

  // 2. Response Time Check
  if (response_time_ms >= THRESHOLDS.CRITICAL_RESPONSE_TIME_MS) {
    anomalies.push(`Severe Latency Spike (${response_time_ms}ms)`);
    if (severity !== 'CRITICAL') severity = 'HIGH';
  } else if (response_time_ms >= THRESHOLDS.RESPONSE_TIME_MS) {
    anomalies.push(`High Latency (${response_time_ms}ms)`);
    if (severity === 'LOW') severity = 'MEDIUM';
  }

  // 3. Data Integrity & Record Count Check
  if (records_returned === 0 && status_code === 200) {
    anomalies.push('Zero records returned on successful 200 response');
    if (severity === 'LOW') severity = 'MEDIUM';
  } else if (records_returned === null || records_returned === undefined) {
    anomalies.push('Missing records count in payload');
    if (severity === 'LOW') severity = 'MEDIUM';
  }

  const isAnomaly = anomalies.length > 0;

  return {
    isAnomaly,
    severity,
    anomaly_types: anomalies,
    data: apiData
  };
};

module.exports = {
  detectAnomalies,
  THRESHOLDS
};

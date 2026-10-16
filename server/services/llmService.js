const { openai, modelName } = require('../config/ai');
const logger = require('../utils/logger');

/**
 * Generate human-readable alert message using LLM
 * @param {Object} anomalyInfo - Contains detected anomalies, severity, and apiData
 * @returns {Promise<string>} - Human-readable alert summary and root-cause suggestion
 */
const generateAlertWithAI = async (anomalyInfo) => {
  const { data, anomaly_types, severity } = anomalyInfo;

  // Fallback template alert in case LLM is unavailable or key is unconfigured
  const fallbackAlert = `${data.api_name} encountered issues: ${anomaly_types.join(', ')}. Status: ${data.status_code}, Response time: ${data.response_time_ms}ms, Records: ${data.records_returned}. Severity: ${severity}. Possible outage or data pipeline failure.`;

  if (!process.env.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not set. Using template alert generator.');
    return fallbackAlert;
  }

  try {
    const prompt = `You are an AI Site Reliability Engineer (SRE) and API Monitoring Assistant.
Analyze this API anomaly and generate a concise, human-readable alert for on-call engineers.

API Data:
- API Name: ${data.api_name}
- Response Time: ${data.response_time_ms} ms
- Status Code: ${data.status_code}
- Records Returned: ${data.records_returned}
- Detected Issues: ${anomaly_types.join(', ')}
- Calculated Severity: ${severity}

Requirements:
1. Explain what failed or is abnormal clearly in 1-2 sentences.
2. State the potential root cause (e.g., downstream outage, timeout, empty database table, network latency).
3. Do not include markdown headers or bullet points; output a clean, natural alert string.`;

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are an expert system monitoring and incident alert assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    const aiMessage = response.choices[0]?.message?.content?.trim();
    return aiMessage || fallbackAlert;
  } catch (error) {
    logger.error(`Error generating AI alert: ${error.message}`);
    return fallbackAlert;
  }
};

module.exports = {
  generateAlertWithAI
};

/**
 * PulseAI Dashboard Client Logic
 */

const API_BASE = '';

const elements = {
  telemetryInput: document.getElementById('telemetry-input'),
  btnLoadSample: document.getElementById('btn-load-sample'),
  btnSimulateOutage: document.getElementById('btn-simulate-outage'),
  btnSendTelemetry: document.getElementById('btn-send-telemetry'),
  btnRefreshAlerts: document.getElementById('refresh-alerts-btn'),
  ingestStatus: document.getElementById('ingest-status'),
  alertsList: document.getElementById('alerts-list'),
  alertsCountBadge: document.getElementById('alerts-count-badge'),
  severityFilter: document.getElementById('severity-filter'),
  statActiveCount: document.getElementById('stat-active-count'),
  statCriticalCount: document.getElementById('stat-critical-count'),
  statAvgLatency: document.getElementById('stat-avg-latency')
};

// Benchmark sample data from task specification
const BENCHMARK_SAMPLE = [
  {
    "api_name": "PatientDataAPI",
    "response_time_ms": 1200,
    "status_code": 200,
    "records_returned": 50
  },
  {
    "api_name": "AppointmentAPI",
    "response_time_ms": 5500,
    "status_code": 500,
    "records_returned": 0
  },
  {
    "api_name": "BillingAPI",
    "response_time_ms": 3800,
    "status_code": 200,
    "records_returned": 0
  },
  {
    "api_name": "PrescriptionAPI",
    "response_time_ms": 450,
    "status_code": 200,
    "records_returned": 120
  }
];

const OUTAGE_SIMULATION = [
  {
    "api_name": "EmergencyPatientCareAPI",
    "response_time_ms": 7800,
    "status_code": 503,
    "records_returned": 0
  }
];

// Fetch and render alerts from /alerts
async function fetchAlerts() {
  try {
    const severity = elements.severityFilter.value;
    const url = severity ? `${API_BASE}/alerts?severity=${severity}` : `${API_BASE}/alerts`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      renderAlerts(data.data || []);
      updateMetrics(data.data || []);
    }
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
  }
}

// Render alert cards
function renderAlerts(alerts) {
  elements.alertsCountBadge.textContent = alerts.length;

  if (alerts.length === 0) {
    elements.alertsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛡️</div>
        <h3>No Active Anomalies</h3>
        <p>All monitored APIs are performing within healthy baselines.</p>
      </div>
    `;
    return;
  }

  elements.alertsList.innerHTML = alerts
    .map((alert) => {
      const dateStr = alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : 'Just now';
      const id = alert._id || alert.id || '';

      return `
      <article class="alert-item severity-${alert.severity}">
        <div class="alert-header-row">
          <div class="alert-api-title">
            <span>🌐</span>
            <span>${escapeHtml(alert.api_name)}</span>
          </div>
          <span class="severity-pill">${alert.severity}</span>
        </div>

        <div class="alert-metrics-chips">
          <div class="metric-chip">Status: <strong>${alert.status_code}</strong></div>
          <div class="metric-chip">Latency: <strong>${alert.response_time_ms} ms</strong></div>
          <div class="metric-chip">Records: <strong>${alert.records_returned}</strong></div>
          ${alert.anomaly_types && alert.anomaly_types.length > 0 ? `
            <div class="metric-chip" style="color: #fca5a5;">Issues: ${escapeHtml(alert.anomaly_types.join(', '))}</div>
          ` : ''}
        </div>

        <div class="ai-alert-box">
          <div class="ai-alert-tag">✨ AI Insight</div>
          <div>${escapeHtml(alert.ai_alert)}</div>
        </div>

        <div class="alert-footer-row">
          <span>Detected: ${dateStr}</span>
          ${id ? `<button class="btn-resolve" onclick="resolveAlert('${id}')">Resolve</button>` : ''}
        </div>
      </article>
    `;
    })
    .join('');
}

// Calculate and display metrics
function updateMetrics(alerts) {
  elements.statActiveCount.textContent = alerts.length;

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  elements.statCriticalCount.textContent = criticalCount;

  if (alerts.length > 0) {
    const totalLatency = alerts.reduce((acc, a) => acc + (a.response_time_ms || 0), 0);
    const avgLatency = Math.round(totalLatency / alerts.length);
    elements.statAvgLatency.textContent = `${avgLatency} ms`;
  } else {
    elements.statAvgLatency.textContent = `0 ms`;
  }
}

// Send telemetry to /monitor
async function sendTelemetry() {
  const content = elements.telemetryInput.value.trim();
  if (!content) {
    showStatus('Please provide JSON data', 'danger');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    showStatus('Invalid JSON format', 'danger');
    return;
  }

  showStatus('Ingesting & analyzing...', 'info');

  try {
    const res = await fetch(`${API_BASE}/monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    });

    const result = await res.json();
    if (result.success) {
      showStatus(`Processed ${result.total_processed} APIs (${result.anomalies_count} anomalies detected)`, 'success');
      fetchAlerts();
    } else {
      showStatus(result.message || 'Error occurred', 'danger');
    }
  } catch (error) {
    showStatus('Failed to send request: ' + error.message, 'danger');
  }
}

// Resolve an alert
window.resolveAlert = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
      method: 'PATCH'
    });
    const data = await res.json();
    if (data.success) {
      fetchAlerts();
    }
  } catch (err) {
    console.error('Failed to resolve alert', err);
  }
};

function showStatus(text, type = 'info') {
  elements.ingestStatus.textContent = text;
  elements.ingestStatus.style.color = type === 'danger' ? '#ef4444' : type === 'success' ? '#10b981' : '#94a3b8';
  setTimeout(() => {
    if (elements.ingestStatus.textContent === text) {
      elements.ingestStatus.textContent = '';
    }
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// Event Listeners
elements.btnLoadSample.addEventListener('click', () => {
  elements.telemetryInput.value = JSON.stringify(BENCHMARK_SAMPLE, null, 2);
});

elements.btnSimulateOutage.addEventListener('click', () => {
  elements.telemetryInput.value = JSON.stringify(OUTAGE_SIMULATION, null, 2);
});

elements.btnSendTelemetry.addEventListener('click', sendTelemetry);
elements.btnRefreshAlerts.addEventListener('click', fetchAlerts);
elements.severityFilter.addEventListener('change', fetchAlerts);

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  elements.telemetryInput.value = JSON.stringify(BENCHMARK_SAMPLE, null, 2);
  fetchAlerts();
});

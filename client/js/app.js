/**
 * PulseAI Dashboard Client Logic
 * Handles telemetry ingestion, alert rendering, metrics, and UI state management.
 */

const API_BASE = '';

// ─── DOM Element References ───
const elements = {};

function cacheElements() {
  elements.telemetryInput = document.getElementById('telemetry-input');
  elements.btnLoadSample = document.getElementById('btn-load-sample');
  elements.btnSimulateOutage = document.getElementById('btn-simulate-outage');
  elements.btnSendTelemetry = document.getElementById('btn-send-telemetry');
  elements.btnSendText = document.getElementById('btn-send-text');
  elements.btnSendSpinner = document.getElementById('btn-send-spinner');
  elements.btnRefreshAlerts = document.getElementById('refresh-alerts-btn');
  elements.ingestStatus = document.getElementById('ingest-status');
  elements.ingestResults = document.getElementById('ingest-results');
  elements.alertsList = document.getElementById('alerts-list');
  elements.alertsCountBadge = document.getElementById('alerts-count-badge');
  elements.severityFilter = document.getElementById('severity-filter');
  elements.statActiveCount = document.getElementById('stat-active-count');
  elements.statCriticalCount = document.getElementById('stat-critical-count');
  elements.statAvgLatency = document.getElementById('stat-avg-latency');
  elements.statHealthyCount = document.getElementById('stat-healthy-count');
  elements.connectionStatus = document.getElementById('connection-status');
}

// ─── Benchmark & Simulation Data ───
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
  },
  {
    "api_name": "LabResultsAPI",
    "response_time_ms": 6200,
    "status_code": 504,
    "records_returned": 0
  }
];

// ─── State ───
let lastIngestResults = null;

// ─── Fetch and render alerts from /alerts ───
async function fetchAlerts() {
  try {
    const severity = elements.severityFilter.value;
    const url = severity ? `${API_BASE}/alerts?severity=${severity}` : `${API_BASE}/alerts`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      renderAlerts(data.data || []);
      updateMetrics(data.data || []);
      setConnectionStatus(true);
    }
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    setConnectionStatus(false);
  }
}

// ─── Connection Status Indicator ───
function setConnectionStatus(isOnline) {
  if (!elements.connectionStatus) return;
  if (isOnline) {
    elements.connectionStatus.classList.remove('offline');
    elements.connectionStatus.classList.add('online');
    elements.connectionStatus.innerHTML = '<span class="dot"></span><span>Engine Active</span>';
  } else {
    elements.connectionStatus.classList.remove('online');
    elements.connectionStatus.classList.add('offline');
    elements.connectionStatus.innerHTML = '<span class="dot"></span><span>Disconnected</span>';
  }
}

// ─── Render alert cards ───
function renderAlerts(alerts) {
  elements.alertsCountBadge.textContent = alerts.length;

  // Animate badge when alerts exist
  if (alerts.length > 0) {
    elements.alertsCountBadge.classList.add('has-alerts');
  } else {
    elements.alertsCountBadge.classList.remove('has-alerts');
  }

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
      const dateStr = alert.createdAt
        ? new Date(alert.createdAt).toLocaleString()
        : 'Just now';
      const id = alert._id || alert.id || '';

      return `
      <article class="alert-item severity-${escapeHtml(alert.severity)}">
        <div class="alert-header-row">
          <div class="alert-api-title">
            <span>🌐</span>
            <span>${escapeHtml(alert.api_name)}</span>
          </div>
          <span class="severity-pill">${escapeHtml(alert.severity)}</span>
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
          ${id ? `<button class="btn-resolve" onclick="resolveAlert('${id}')">✓ Resolve</button>` : ''}
        </div>
      </article>
    `;
    })
    .join('');
}

// ─── Calculate and display metrics ───
function updateMetrics(alerts) {
  elements.statActiveCount.textContent = alerts.length;

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  elements.statCriticalCount.textContent = criticalCount;

  if (alerts.length > 0) {
    const totalLatency = alerts.reduce((acc, a) => acc + (a.response_time_ms || 0), 0);
    const avgLatency = Math.round(totalLatency / alerts.length);
    elements.statAvgLatency.textContent = `${avgLatency} ms`;
  } else {
    elements.statAvgLatency.textContent = '0 ms';
  }

  // Update healthy count from last ingestion
  if (lastIngestResults) {
    const healthyCount = lastIngestResults.filter(r => r.status === 'healthy').length;
    elements.statHealthyCount.textContent = healthyCount;
  }
}

// ─── Loading state for send button ───
function setLoading(isLoading) {
  elements.btnSendTelemetry.disabled = isLoading;
  if (isLoading) {
    elements.btnSendText.classList.add('hidden');
    elements.btnSendSpinner.classList.remove('hidden');
  } else {
    elements.btnSendText.classList.remove('hidden');
    elements.btnSendSpinner.classList.add('hidden');
  }
}

// ─── Send telemetry to /monitor ───
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
    showStatus('Invalid JSON format — please check syntax', 'danger');
    return;
  }

  setLoading(true);
  showStatus('Ingesting & analyzing with AI...', 'info');

  try {
    const res = await fetch(`${API_BASE}/monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }

    const result = await res.json();
    if (result.success) {
      lastIngestResults = result.results || [];
      showStatus(
        `✅ Processed ${result.total_processed} APIs — ${result.anomalies_count} anomalies detected`,
        'success'
      );
      renderIngestResults(result.results || []);
      fetchAlerts();
    } else {
      showStatus(result.message || 'Error occurred', 'danger');
    }
  } catch (error) {
    showStatus('Failed to send: ' + error.message, 'danger');
    setConnectionStatus(false);
  } finally {
    setLoading(false);
  }
}

// ─── Render ingestion results breakdown ───
function renderIngestResults(results) {
  if (!results || results.length === 0) {
    elements.ingestResults.classList.add('hidden');
    return;
  }

  elements.ingestResults.classList.remove('hidden');
  elements.ingestResults.innerHTML = results.map(r => {
    let icon, cls;
    if (r.status === 'healthy') {
      icon = '✅'; cls = 'healthy';
    } else if (r.status === 'anomaly_detected') {
      icon = '⚠️'; cls = 'anomaly';
    } else {
      icon = '⏭️'; cls = 'skipped';
    }

    let detail = r.status === 'anomaly_detected'
      ? ` — ${escapeHtml(r.severity)} (${escapeHtml((r.issues || []).join(', '))})`
      : r.status === 'skipped'
        ? ` — ${escapeHtml(r.reason || 'Skipped')}`
        : ' — All checks passed';

    return `<div class="result-line ${cls}">${icon} <strong>${escapeHtml(r.api_name)}</strong>${detail}</div>`;
  }).join('');
}

// ─── Resolve an alert ───
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

// ─── Utilities ───
function showStatus(text, type = 'info') {
  elements.ingestStatus.textContent = text;
  const colors = {
    danger: '#ef4444',
    success: '#10b981',
    info: '#94a3b8'
  };
  elements.ingestStatus.style.color = colors[type] || colors.info;

  // Auto-clear after 6 seconds
  setTimeout(() => {
    if (elements.ingestStatus.textContent === text) {
      elements.ingestStatus.textContent = '';
    }
  }, 6000);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ─── Event Listeners & Init ───
document.addEventListener('DOMContentLoaded', () => {
  cacheElements();

  // Pre-populate with benchmark data
  elements.telemetryInput.value = JSON.stringify(BENCHMARK_SAMPLE, null, 2);

  // Button handlers
  elements.btnLoadSample.addEventListener('click', () => {
    elements.telemetryInput.value = JSON.stringify(BENCHMARK_SAMPLE, null, 2);
    elements.ingestResults.classList.add('hidden');
  });

  elements.btnSimulateOutage.addEventListener('click', () => {
    elements.telemetryInput.value = JSON.stringify(OUTAGE_SIMULATION, null, 2);
    elements.ingestResults.classList.add('hidden');
  });

  elements.btnSendTelemetry.addEventListener('click', sendTelemetry);
  elements.btnRefreshAlerts.addEventListener('click', fetchAlerts);
  elements.severityFilter.addEventListener('change', fetchAlerts);

  // Initial data load
  fetchAlerts();

  // Auto-refresh alerts every 30 seconds
  setInterval(fetchAlerts, 30000);
});

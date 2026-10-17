# Intelligent API Monitoring & Alert System

An intelligent, AI-powered API monitoring and incident alerting system built with **Node.js, Express, MongoDB, and OpenAI LLM**. Proactively detects API degradation, service crashes, abnormal latency, and data integrity issues across distributed microservices.

---

## 🌟 Key Features

- **Automated Health Monitoring**: Ingests API telemetry either via batch JSON files or via REST endpoint (`POST /monitor`).
- **Multi-Factor Anomaly Detection**:
  - High Latency & Slowdowns (configurable thresholds)
  - HTTP Server Failures (5xx errors) & Client Errors (4xx)
  - Data Integrity & Empty Records anomalies on successful requests (Status 200 with 0 records)
- **AI-Powered Incident Alerts**: Uses OpenAI LLM to interpret telemetry metrics and generate human-readable incident summaries with probable root cause analysis.
- **RESTful Alert Management**: `GET /alerts` endpoint with filtering by severity and API name, plus alert resolution workflows.
- **Interactive Web Dashboard**: Premium, real-time frontend interface to monitor metrics, trigger ingestion simulations, and review active anomalies.
- **Email Notifications (Optional)**: Automatically dispatches alert emails for HIGH and CRITICAL severity incidents.

---

## 📁 Project Structure

```text
intelligent-api-monitor/
├── .env                       # Environment variables (OpenAI key, Mongo URI, etc.)
├── .env.example               # Template for environment variables
├── .gitignore                 # Git ignore file
├── package.json               # Node.js project configuration and dependencies
├── README.md                  # Comprehensive setup and project documentation
├── AI_Prompts.md              # Documentation of AI prompts and LLM design
├── data/
│   └── sample_api_input.json  # Benchmark test inputs (PatientDataAPI, AppointmentAPI, etc.)
├── server/
│   ├── config/
│   │   ├── db.js              # MongoDB database connection
│   │   └── ai.js              # OpenAI SDK configuration
│   ├── controllers/
│   │   ├── monitorController.js # Telemetry ingestion and detection workflow
│   │   └── alertController.js   # Fetch active alerts and resolution
│   ├── middleware/
│   │   └── errorHandler.js    # Centralized error handling
│   ├── models/
│   │   └── Anomaly.js         # Mongoose schema for stored anomalies
│   ├── routes/
│   │   ├── monitorRoutes.js   # /monitor router
│   │   └── alertRoutes.js     # /alerts router
│   ├── services/
│   │   ├── anomalyDetector.js # Core rule & threshold engine
│   │   ├── llmService.js      # OpenAI prompt execution & fallback
│   │   └── emailService.js    # SMTP email alert dispatcher
│   ├── utils/
│   │   └── logger.js          # Structured logging utility
│   └── server.js              # Application entry point
└── client/
    ├── index.html             # Responsive dashboard layout
    ├── css/
    │   └── styles.css         # Glassmorphic dark-theme styles
    └── js/
        └── app.js             # Real-time dashboard controller
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or later recommended)
- **MongoDB** (Local instance or MongoDB Atlas URI)
- **OpenAI API Key**

### 2. Installation
Install project dependencies:
```bash
npm install
```

### 3. Environment Configuration
Verify your `.env` configuration (a `.env.example` is provided for reference):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/intelligent-api-monitor
OPENAI_API_KEY=your_openai_api_key_here
AI_MODEL=gpt-4o-mini

# 7.4 Feature: Email Anomaly Alerts & Reports (SMTP)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
ALERT_RECIPIENT_EMAIL=recipient@example.com

```

### 4. Running the Application

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The server and dashboard will be available at:
👉 **`http://localhost:5000`**

---

## 📡 API Endpoints

### 1. Ingest Telemetry
- **Method:** `POST /monitor`
- **Body:** Single object or Array of telemetry objects:
```json
[
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
  }
]
```

### 2. Fetch Active Alerts
- **Method:** `GET /alerts`
- **Query Parameters (optional):**
  - `severity`: Filter by `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`
  - `api_name`: Filter by API name substring
- **Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "67123...",
      "api_name": "AppointmentAPI",
      "response_time_ms": 5500,
      "status_code": 500,
      "records_returned": 0,
      "anomaly_types": ["Server Error (500)", "Severe Latency Spike (5500ms)"],
      "severity": "CRITICAL",
      "ai_alert": "AppointmentAPI failed with status 500 and returned 0 records after 5500ms delay. Possible outage or downstream database failure.",
      "is_active": true,
      "createdAt": "2026-10-16T05:40:00.000Z"
    }
  ]
}
```

### 3. Resolve Alert
- **Method:** `PATCH /alerts/:id/resolve`
- **Response:** Marks the alert as resolved (`is_active: false`).

### 4. Test Email Anomaly Report (Section 7.4)
- **Method:** `POST /alerts/test-email`
- **Response:** Sends an immediate simulated anomaly alert verification email to `ALERT_RECIPIENT_EMAIL`.
```json
{
  "success": true,
  "message": "Test anomaly report successfully sent to sdey202074@bscse.uiu.ac.bd"
}
```

---

## 📧 Email Anomaly Reporting (Section 7.4)

The system includes automated SMTP email reporting via Nodemailer:
- **Dedicated Incident Alerts:** Automatically sent when severe or critical API anomalies are flagged, containing AI root-cause analysis, HTTP response details, and detection rules.
- **Consolidated Batch Reports:** When batch telemetry with multiple anomalies is ingested, an aggregated summary digest email is dispatched to the SRE on-call team.
- **One-Click Testing:** Verified via the **"📧 Test Email Alert"** button on the web dashboard or via `POST /alerts/test-email`.


---

## 🛡️ Anomaly Detection Criteria

| Condition | Threshold | Assigned Severity |
| :--- | :--- | :--- |
| **HTTP 5xx Server Error** | Status $\ge$ 500 | `CRITICAL` |
| **HTTP 4xx Client Error** | Status 400 - 499 | `HIGH` |
| **Critical Latency Spike** | $\ge$ 5,000 ms | `HIGH` / `CRITICAL` |
| **Elevated Latency** | $\ge$ 3,000 ms | `MEDIUM` |
| **Zero Records on Success** | Status 200 & Records = 0 | `MEDIUM` |

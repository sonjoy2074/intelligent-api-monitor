# AI Prompts & LLM Architecture Documentation

This document records the AI prompts, system instructions, and LLM designs used for the **Intelligent API Monitoring & Alert System**.

---

## 1. System Prompt for LLM Alert Generator

**Role:** Site Reliability Engineer & API Incident Intelligence Specialist  
**Model:** `gpt-4o-mini` (or equivalent LLM)  
**Temperature:** `0.3` (deterministic, concise, analytical)

### Prompt Template:
```text
You are an AI Site Reliability Engineer (SRE) and API Monitoring Assistant.
Analyze this API anomaly and generate a concise, human-readable alert for on-call engineers.

API Data:
- API Name: {api_name}
- Response Time: {response_time_ms} ms
- Status Code: {status_code}
- Records Returned: {records_returned}
- Detected Issues: {anomaly_types}
- Calculated Severity: {severity}

Requirements:
1. Explain what failed or is abnormal clearly in 1-2 sentences.
2. State the potential root cause (e.g., downstream outage, timeout, empty database table, network latency).
3. Do not include markdown headers or bullet points; output a clean, natural alert string.
```

---

## 2. Example Output Generations

### Scenario A: HTTP 500 Outage with Zero Records
- **Input:**
  ```json
  {
    "api_name": "AppointmentAPI",
    "response_time_ms": 5500,
    "status_code": 500,
    "records_returned": 0
  }
  ```
- **Generated Alert:**
  > *"AppointmentAPI failed with HTTP 500 error and returned 0 records after a 5,500ms delay. Likely caused by an internal server crash, database connection timeout, or downstream microservice outage."*

### Scenario B: Latency Anomaly & Zero Records on Status 200
- **Input:**
  ```json
  {
    "api_name": "BillingAPI",
    "response_time_ms": 3800,
    "status_code": 200,
    "records_returned": 0
  }
  ```
- **Generated Alert:**
  > *"BillingAPI returned an unexpected 0 records despite a 200 OK status, accompanied by high latency (3,800ms). Indicates potential cache miss or misconfigured query filters."*

---

## 3. Fallback Mechanism
If the LLM API is unavailable, network timeouts occur, or the API key is not configured, the system uses an analytical heuristic fallback template:
```text
`${data.api_name} encountered issues: ${anomaly_types.join(', ')}. Status: ${data.status_code}, Response time: ${data.response_time_ms}ms, Records: ${data.records_returned}. Severity: ${severity}. Possible outage or data pipeline failure.`
```

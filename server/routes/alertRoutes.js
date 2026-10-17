const express = require('express');
const router = express.Router();
const { getActiveAlerts, resolveAlert, sendTestAlert } = require('../controllers/alertController');

// GET /alerts - Retrieve active anomalies
router.get('/', getActiveAlerts);

// POST /alerts/test-email - Trigger a test email alert report
router.post('/test-email', sendTestAlert);

// PATCH /alerts/:id/resolve - Mark an alert as resolved
router.patch('/:id/resolve', resolveAlert);

module.exports = router;

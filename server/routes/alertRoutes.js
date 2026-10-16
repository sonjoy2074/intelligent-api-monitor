const express = require('express');
const router = express.Router();
const { getActiveAlerts, resolveAlert } = require('../controllers/alertController');

// GET /alerts - Retrieve active anomalies
router.get('/', getActiveAlerts);

// PATCH /alerts/:id/resolve - Mark an alert as resolved
router.patch('/:id/resolve', resolveAlert);

module.exports = router;

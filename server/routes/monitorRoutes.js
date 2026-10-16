const express = require('express');
const router = express.Router();
const { processApiData } = require('../controllers/monitorController');

// POST /monitor - Ingest API health data
router.post('/', processApiData);

module.exports = router;

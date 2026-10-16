const mongoose = require('mongoose');

const AnomalySchema = new mongoose.Schema(
  {
    api_name: {
      type: String,
      required: true,
      index: true
    },
    response_time_ms: {
      type: Number,
      required: true
    },
    status_code: {
      type: Number,
      required: true
    },
    records_returned: {
      type: Number,
      required: true
    },
    anomaly_types: {
      type: [String],
      default: []
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    ai_alert: {
      type: String,
      required: true
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Anomaly', AnomalySchema);

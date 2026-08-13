const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    farm_id: { type: String, required: true, index: true },
    farm_name: { type: String, required: true },
    crop: { type: String, required: true },
    alert_type: {
      type: String,
      enum: ['weather', 'soil', 'disease', 'crop_gdd', 'yield', 'inventory', 'market'],
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['Info', 'Warning', 'High', 'Critical'],
      required: true,
      index: true
    },
    title: { type: String, required: true },
    reason: { type: String, required: true },
    recommended_action: { type: String, required: true },
    status: { type: String, enum: ['unread', 'read'], default: 'unread', index: true },
    dedup_key: { type: String, required: true, index: true },
    target_module: { type: String, default: 'dashboard' }
  },
  { timestamps: true }
);

const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);

module.exports = { Alert };

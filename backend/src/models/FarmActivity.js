const mongoose = require('mongoose');

const farmActivitySchema = new mongoose.Schema({
  activity_id: {
    type: String,
    required: true,
    unique: true,
    default: () => 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
  },
  farm_id: {
    type: String,
    default: 'default_farm'
  },
  field_name: {
    type: String,
    default: 'Green Valley Rice Farm'
  },
  crop: {
    type: String,
    required: true,
    trim: true
  },
  activity_type: {
    type: String,
    required: true,
    enum: [
      'Sowing',
      'Irrigation',
      'Fertilization',
      'Pesticide Application',
      'Weeding',
      'Disease Inspection',
      'Harvesting'
    ]
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  quantity_details: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const FarmActivity = mongoose.models.FarmActivity || mongoose.model('FarmActivity', farmActivitySchema);

module.exports = { FarmActivity };

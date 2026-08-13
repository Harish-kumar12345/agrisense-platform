const mongoose = require('mongoose');

const applicationLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  crop: {
    type: String,
    required: true
  },
  field: {
    type: String,
    default: 'Main Farm Plot'
  },
  product_id: {
    type: String
  },
  product_name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Fertilizer', 'Pesticide'],
    required: true
  },
  quantity_used: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  target_nutrient_or_pest: {
    type: String,
    default: 'General Maintenance'
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

module.exports = mongoose.model('ApplicationLog', applicationLogSchema);

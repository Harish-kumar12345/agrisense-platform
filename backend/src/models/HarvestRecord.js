const mongoose = require('mongoose');

const harvestRecordSchema = new mongoose.Schema({
  harvest_id: {
    type: String,
    required: true,
    unique: true,
    default: () => 'harv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
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
  area_hectares: {
    type: Number,
    required: true,
    default: 2.5
  },
  predicted_yield_tha: {
    type: Number,
    required: true
  },
  expected_production_tons: {
    type: Number,
    required: true
  },
  current_gdd: {
    type: Number,
    default: 0
  },
  growth_stage: {
    type: String,
    default: 'Vegetative'
  },
  sowing_date: {
    type: Date,
    default: null
  },
  expected_harvest_date: {
    type: Date,
    required: true
  },
  harvest_window: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Not Ready', 'Approaching', 'Harvest Ready'],
    default: 'Not Ready'
  },
  notes: {
    type: String,
    default: ''
  },
  manual_harvest_date: {
    type: Date,
    default: null
  },
  required_labour: {
    type: Number,
    default: 12
  },
  storage_requirement_sqft: {
    type: Number,
    default: 180
  },
  storage_bags_count: {
    type: Number,
    default: 240
  },
  storage_moisture_target_pct: {
    type: Number,
    default: 13.5
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

const HarvestRecord = mongoose.models.HarvestRecord || mongoose.model('HarvestRecord', harvestRecordSchema);

module.exports = { HarvestRecord };

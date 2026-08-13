const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  farm_id: {
    type: String,
    required: true,
    unique: true,
    default: () => 'farm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
  },
  farm_name: {
    type: String,
    required: true,
    trim: true
  },
  farmer_id: {
    type: String,
    default: 'default_farmer'
  },
  crop: {
    type: String,
    required: true
  },
  season: {
    type: String,
    default: 'Kharif'
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  area_hectares: {
    type: Number,
    required: true
  },
  area_acres: {
    type: Number,
    required: true
  },
  area_sqm: {
    type: Number,
    default: 0
  },
  area_bigha: {
    type: Number,
    default: 0
  },
  boundary_geojson: {
    type: Object,
    default: null
  },
  location_name: {
    type: String,
    default: 'Unknown Location'
  },
  soil_type: {
    type: String,
    default: 'Loamy'
  },
  irrigation_type: {
    type: String,
    default: 'Canal'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Farm = mongoose.models.Farm || mongoose.model('Farm', farmSchema);

module.exports = { Farm };

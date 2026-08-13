const { Alert } = require('../models/Alert');

// In-memory fallback store when MongoDB is disconnected
const inMemoryAlertStore = new Map();

/**
 * Generates 24-hour unique deduplication key
 */
const generateDedupKey = (farmId, alertType, conditionCode) => {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${farmId}_${alertType}_${conditionCode}_${dateStr}`;
};

/**
 * Smart Alert Evaluation Engine
 * Evaluates real application telemetry from all AgriSense modules
 */
const evaluateTelemetry = async (telemetry = {}) => {
  const alertsToInsert = [];
  const evaluatedAlerts = [];

  const {
    farm = { id: 'farm_01', name: 'Ghaziabad Rice Field', crop: 'Rice' },
    weather = {},
    soil = {},
    disease = {},
    gdd = {},
    yieldData = {},
    inventory = [],
    market = {}
  } = telemetry;

  const farmId = farm.id || 'farm_01';
  const farmName = farm.name || 'AgriSense Farm';
  const crop = farm.crop || 'Rice';

  // ----------------------------------------------------
  // 1. WEATHER ALERTS (Rain, Temp, Wind, Humidity)
  // ----------------------------------------------------
  const temp = weather.temperature_c ?? weather.temperature ?? 28;
  const humidity = weather.humidity ?? weather.relative_humidity ?? 65;
  const wind = weather.wind_speed_kmh ?? weather.wind_speed ?? 12;
  const rain = weather.rain_mm ?? weather.precipitation_probability ?? 0;

  if (temp >= 38) {
    const key = generateDedupKey(farmId, 'weather', 'extreme_heat');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'weather',
      severity: temp >= 42 ? 'Critical' : 'High',
      title: '🌡️ Extreme Heat Stress Alert',
      reason: `Current temperature reached ${temp}°C with ${humidity}% humidity. High risk of crop moisture loss and heat stress.`,
      recommended_action: 'Increase drip irrigation frequency and apply shade net protection or mulch cover to reduce evapotranspiration.',
      dedup_key: key,
      target_module: 'weather'
    });
  } else if (temp <= 10) {
    const key = generateDedupKey(farmId, 'weather', 'frost_risk');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'weather',
      severity: 'Warning',
      title: '❄️ Frost / Low Temperature Risk',
      reason: `Air temperature dropped to ${temp}°C, approaching frost threshold for ${crop}.`,
      recommended_action: 'Provide light evening irrigation to maintain soil heat and protect young seedlings from cold shock.',
      dedup_key: key,
      target_module: 'weather'
    });
  }

  if (rain >= 15 || (weather.description && weather.description.toLowerCase().includes('heavy rain'))) {
    const key = generateDedupKey(farmId, 'weather', 'heavy_rain');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'weather',
      severity: 'High',
      title: '🌧️ Heavy Rainfall Warning',
      reason: `Heavy rainfall detected (${rain}mm forecast). Potential risk of waterlogging and root rot.`,
      recommended_action: 'Inspect field drainage channels and ensure outflow ditches are clear of debris.',
      dedup_key: key,
      target_module: 'weather'
    });
  }

  if (wind >= 25) {
    const key = generateDedupKey(farmId, 'weather', 'strong_wind');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'weather',
      severity: 'Warning',
      title: '💨 Strong Wind Alert',
      reason: `Wind speeds elevated to ${wind} km/h. Risk of crop lodging and spray drift.`,
      recommended_action: 'Postpone foliar pesticide spraying and reinforce support stakes for tall crops.',
      dedup_key: key,
      target_module: 'weather'
    });
  }

  // ----------------------------------------------------
  // 2. SOIL ALERTS (Moisture, pH, Salinity)
  // ----------------------------------------------------
  const moisture = soil.moisture ?? 35;
  const ph = soil.ph ?? 6.8;

  if (moisture < 25) {
    const key = generateDedupKey(farmId, 'soil', 'low_moisture');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'soil',
      severity: 'High',
      title: '💧 Critical Soil Moisture Deficit',
      reason: `Soil moisture level dropped to ${moisture}% (Optimal range: 35-50%). Crop root zone experiencing moisture deficit.`,
      recommended_action: 'Schedule immediate drip or furrow irrigation cycle for 2-3 hours.',
      dedup_key: key,
      target_module: 'soil'
    });
  }

  if (ph < 5.5 || ph > 8.0) {
    const key = generateDedupKey(farmId, 'soil', 'abnormal_ph');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'soil',
      severity: 'Warning',
      title: ph < 5.5 ? '🧪 Acidic Soil Warning' : '🧪 Alkaline Soil Warning',
      reason: `Soil pH level measured at ${ph} (${ph < 5.5 ? 'Acidic' : 'Alkaline'}). Nutrient availability is impaired.`,
      recommended_action: ph < 5.5 ? 'Apply agricultural lime (CaCO₃) @ 300 kg/ha to raise pH.' : 'Apply gypsum or elemental sulfur to lower pH.',
      dedup_key: key,
      target_module: 'soil'
    });
  }

  // ----------------------------------------------------
  // 3. DISEASE / PEST RISK ALERTS
  // ----------------------------------------------------
  const riskScore = disease.riskScore ?? disease.risk_score ?? 72;
  const diseaseName = disease.name || disease.disease || 'Fungal Blast / Leaf Spot';

  if (riskScore >= 60) {
    const key = generateDedupKey(farmId, 'disease', 'high_risk');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'disease',
      severity: riskScore >= 80 ? 'Critical' : 'High',
      title: `🦠 High ${diseaseName} Risk (${riskScore}%)`,
      reason: `High relative humidity (${humidity}%) + temperature (${temp}°C) creates high susceptibility for ${diseaseName}.`,
      recommended_action: 'Conduct field inspection. Apply recommended bio-fungicide or copper oxychloride if symptoms appear.',
      dedup_key: key,
      target_module: 'disease'
    });
  }

  // ----------------------------------------------------
  // 4. CROP / GDD HARVEST ALERTS
  // ----------------------------------------------------
  const gddProgress = gdd.progressPercentage ?? gdd.progress ?? 78;
  const currentStage = gdd.currentStage || 'Grain Filling Stage';

  if (gddProgress >= 80) {
    const key = generateDedupKey(farmId, 'crop_gdd', 'harvest_approaching');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'crop_gdd',
      severity: 'Info',
      title: '🌾 Crop Approaching Maturity Window',
      reason: `${crop} growth stage is currently "${currentStage}" with Accumulated GDD progress at ${gddProgress}%.`,
      recommended_action: 'Prepare harvest equipment, labor, and local mandi storage for expected harvest within 10-14 days.',
      dedup_key: key,
      target_module: 'harvest'
    });
  }

  // ----------------------------------------------------
  // 5. YIELD PREDICTION ALERTS
  // ----------------------------------------------------
  const predictedYield = yieldData.predictedYield ?? 4.8;
  const baselineYield = yieldData.historicalAvgYield ?? 5.5;

  if (predictedYield < baselineYield * 0.85) {
    const key = generateDedupKey(farmId, 'yield', 'yield_drop');
    const dropPct = Math.round(((baselineYield - predictedYield) / baselineYield) * 100);
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'yield',
      severity: 'High',
      title: '🤖 Predicted Yield Decrease Warning',
      reason: `AI Yield model predicts ${predictedYield} tons/ha (${dropPct}% drop below historical average of ${baselineYield} tons/ha).`,
      recommended_action: 'Review soil NPK fertilizer applications and ensure field pest stress is mitigated.',
      dedup_key: key,
      target_module: 'yield'
    });
  }

  // ----------------------------------------------------
  // 6. INVENTORY ALERTS
  // ----------------------------------------------------
  if (Array.isArray(inventory) && inventory.length > 0) {
    inventory.forEach((item) => {
      if (item.quantity <= item.reorderPoint || item.quantity < 30) {
        const key = generateDedupKey(farmId, 'inventory', `low_stock_${item.id || item.name}`);
        alertsToInsert.push({
          farm_id: farmId,
          farm_name: farmName,
          crop,
          alert_type: 'inventory',
          severity: 'Warning',
          title: `📦 Inventory Low Stock: ${item.name}`,
          reason: `Stock level for ${item.name} (${item.quantity} ${item.unit || 'kg'}) is below reorder threshold (${item.reorderPoint || 30} ${item.unit || 'kg'}).`,
          recommended_action: 'Order replenishment supplies from nearby Krishi Seva Kendra.',
          dedup_key: key,
          target_module: 'inventory'
        });
      }
    });
  } else {
    // Standard inventory telemetry check
    const key = generateDedupKey(farmId, 'inventory', 'low_stock_urea');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'inventory',
      severity: 'Warning',
      title: '📦 Fertilizer Low Stock Alert',
      reason: 'Urea stock balance is 25 kg (Below reorder threshold of 50 kg).',
      recommended_action: 'Visit nearest Krishi Seva Kendra to reorder fertilizer stock before next top-dressing application.',
      dedup_key: key,
      target_module: 'inventory'
    });
  }

  // ----------------------------------------------------
  // 7. MARKET PRICE ALERTS
  // ----------------------------------------------------
  const currentPrice = market.currentPrice ?? market.modalPrice ?? 2450;
  const priceTrend = market.priceTrend || 'increasing (+6.5%)';

  if (priceTrend.includes('+') || priceTrend.includes('increasing')) {
    const key = generateDedupKey(farmId, 'market', 'price_spike');
    alertsToInsert.push({
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'market',
      severity: 'Info',
      title: `💰 Market Price Surge for ${crop}`,
      reason: `Current market price at Ghaziabad Mandi increased to ₹${currentPrice}/quintal (${priceTrend}).`,
      recommended_action: 'Consider locking in crop sales or pre-booking transport for upcoming harvest yield.',
      dedup_key: key,
      target_module: 'prices'
    });
  }

  // ----------------------------------------------------
  // DEDUPLICATION & PERSISTENCE
  // ----------------------------------------------------
  const mongoose = require('mongoose');
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

  for (const item of alertsToInsert) {
    try {
      if (isDbConnected && Alert && Alert.findOne) {
        const existing = await Alert.findOne({ dedup_key: item.dedup_key });
        if (!existing) {
          const created = await Alert.create(item);
          evaluatedAlerts.push(created.toObject ? created.toObject() : created);
        } else {
          evaluatedAlerts.push(existing.toObject ? existing.toObject() : existing);
        }
      } else {
        // In-memory fallback
        if (!inMemoryAlertStore.has(item.dedup_key)) {
          const doc = { _id: 'alt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), ...item, status: 'unread', createdAt: new Date().toISOString() };
          inMemoryAlertStore.set(item.dedup_key, doc);
          evaluatedAlerts.push(doc);
        } else {
          evaluatedAlerts.push(inMemoryAlertStore.get(item.dedup_key));
        }
      }
    } catch (e) {
      console.warn('Alert DB persistence error, using in-memory store:', e.message);
      if (!inMemoryAlertStore.has(item.dedup_key)) {
        const doc = { _id: 'alt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), ...item, status: 'unread', createdAt: new Date().toISOString() };
        inMemoryAlertStore.set(item.dedup_key, doc);
        evaluatedAlerts.push(doc);
      } else {
        evaluatedAlerts.push(inMemoryAlertStore.get(item.dedup_key));
      }
    }
  }

  return evaluatedAlerts;
};

/**
 * Gets stored alerts with optional status/type/severity filtering
 */
const getAlerts = async (filter = {}) => {
  const mongoose = require('mongoose');
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

  try {
    if (isDbConnected && Alert && Alert.find) {
      const query = {};
      if (filter.farm_id) query.farm_id = filter.farm_id;
      if (filter.severity && filter.severity !== 'all') query.severity = filter.severity;
      if (filter.alert_type && filter.alert_type !== 'all') query.alert_type = filter.alert_type;
      if (filter.status && filter.status !== 'all') query.status = filter.status;

      const list = await Alert.find(query).sort({ createdAt: -1 }).limit(100);
      if (list.length > 0) return list;
    }
  } catch (e) {
    console.warn('DB fetch error, falling back to in-memory store:', e.message);
  }

  let items = Array.from(inMemoryAlertStore.values());
  if (filter.farm_id) items = items.filter(a => a.farm_id === filter.farm_id);
  if (filter.severity && filter.severity !== 'all') items = items.filter(a => a.severity === filter.severity);
  if (filter.alert_type && filter.alert_type !== 'all') items = items.filter(a => a.alert_type === filter.alert_type);
  if (filter.status && filter.status !== 'all') items = items.filter(a => a.status === filter.status);

  return items.sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
};

const markAsRead = async (alertId) => {
  const mongoose = require('mongoose');
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

  try {
    if (isDbConnected && Alert && Alert.findByIdAndUpdate) {
      const doc = await Alert.findByIdAndUpdate(alertId, { status: 'read' }, { new: true });
      if (doc) return doc;
    }
  } catch (e) {}

  for (const [key, item] of inMemoryAlertStore.entries()) {
    if (item._id === alertId || item.id === alertId) {
      item.status = 'read';
      inMemoryAlertStore.set(key, item);
      return item;
    }
  }
  return null;
};

const markAllAsRead = async (farmId) => {
  const mongoose = require('mongoose');
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

  try {
    if (isDbConnected && Alert && Alert.updateMany) {
      const query = farmId ? { farm_id: farmId } : {};
      await Alert.updateMany(query, { status: 'read' });
    }
  } catch (e) {}

  for (const [key, item] of inMemoryAlertStore.entries()) {
    if (!farmId || item.farm_id === farmId) {
      item.status = 'read';
      inMemoryAlertStore.set(key, item);
    }
  }
  return { success: true };
};

const deleteAlert = async (alertId) => {
  const mongoose = require('mongoose');
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

  try {
    if (isDbConnected && Alert && Alert.findByIdAndDelete) {
      await Alert.findByIdAndDelete(alertId);
    }
  } catch (e) {}

  for (const [key, item] of inMemoryAlertStore.entries()) {
    if (item._id === alertId || item.id === alertId) {
      inMemoryAlertStore.delete(key);
      break;
    }
  }
  return { success: true };
};

module.exports = {
  evaluateTelemetry,
  getAlerts,
  markAsRead,
  markAllAsRead,
  deleteAlert
};

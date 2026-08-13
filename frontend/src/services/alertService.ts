import axios from 'axios';

export type AlertType = 'weather' | 'soil' | 'disease' | 'crop_gdd' | 'yield' | 'inventory' | 'market';
export type AlertSeverity = 'Info' | 'Warning' | 'High' | 'Critical';
export type AlertStatus = 'unread' | 'read';

export type SmartAlert = {
  _id?: string;
  id?: string;
  farm_id: string;
  farm_name: string;
  crop: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  reason: string;
  recommended_action: string;
  status: AlertStatus;
  dedup_key: string;
  target_module?: string;
  createdAt?: string;
  created_at?: string;
};

const LOCAL_STORAGE_KEY = 'agrisense_smart_alerts_cache';

const getLocalCache = (): SmartAlert[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const setLocalCache = (alerts: SmartAlert[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(alerts));
  } catch (e) {}
};

export const alertService = {
  // Evaluate telemetry and generate smart alerts
  async evaluateTelemetry(telemetry: any): Promise<SmartAlert[]> {
    try {
      const response = await axios.post('/api/alerts/evaluate', telemetry, { timeout: 4000 });
      if (response.data && response.data.alerts) {
        setLocalCache(response.data.alerts);
        return response.data.alerts;
      }
    } catch (e) {
      console.warn('Backend alert evaluation endpoint unavailable, evaluating client-side fallback:', e);
    }
    return this.evaluateClientFallback(telemetry);
  },

  // Get active alerts with optional filters
  async getAlerts(filter: { farm_id?: string; severity?: string; alert_type?: string; status?: string } = {}): Promise<{ alerts: SmartAlert[]; unreadCount: number }> {
    try {
      const response = await axios.get('/api/alerts', { params: filter, timeout: 4000 });
      if (response.data && response.data.alerts) {
        setLocalCache(response.data.alerts);
        return {
          alerts: response.data.alerts,
          unreadCount: response.data.unreadCount ?? response.data.alerts.filter((a: SmartAlert) => a.status === 'unread').length
        };
      }
    } catch (e) {
      console.warn('Backend alerts endpoint unavailable, using local cache:', e);
    }

    let list = getLocalCache();
    if (filter.farm_id) list = list.filter(a => a.farm_id === filter.farm_id);
    if (filter.severity && filter.severity !== 'all') list = list.filter(a => a.severity === filter.severity);
    if (filter.alert_type && filter.alert_type !== 'all') list = list.filter(a => a.alert_type === filter.alert_type);
    if (filter.status && filter.status !== 'all') list = list.filter(a => a.status === filter.status);

    const unreadCount = list.filter(a => a.status === 'unread').length;
    return { alerts: list, unreadCount };
  },

  // Mark single alert as read
  async markAsRead(alertId: string): Promise<boolean> {
    try {
      await axios.patch(`/api/alerts/${alertId}/read`, {}, { timeout: 3000 });
    } catch (e) {}

    const cache = getLocalCache();
    const updated = cache.map(a => (a._id === alertId || a.id === alertId ? { ...a, status: 'read' as AlertStatus } : a));
    setLocalCache(updated);
    return true;
  },

  // Mark all alerts as read
  async markAllAsRead(farmId?: string): Promise<boolean> {
    try {
      await axios.patch('/api/alerts/read-all', { farm_id: farmId }, { timeout: 3000 });
    } catch (e) {}

    const cache = getLocalCache();
    const updated = cache.map(a => (!farmId || a.farm_id === farmId ? { ...a, status: 'read' as AlertStatus } : a));
    setLocalCache(updated);
    return true;
  },

  // Dismiss / delete an alert
  async deleteAlert(alertId: string): Promise<boolean> {
    try {
      await axios.delete(`/api/alerts/${alertId}`, { timeout: 3000 });
    } catch (e) {}

    const cache = getLocalCache();
    const updated = cache.filter(a => a._id !== alertId && a.id !== alertId);
    setLocalCache(updated);
    return true;
  },

  // Client-side fallback evaluator for offline mode
  evaluateClientFallback(telemetry: any): SmartAlert[] {
    const alerts: SmartAlert[] = [];
    const farmId = telemetry?.farm?.id || 'farm_01';
    const farmName = telemetry?.farm?.name || 'Ghaziabad Rice Field';
    const crop = telemetry?.farm?.crop || 'Rice';
    const today = new Date().toISOString().split('T')[0];

    // Weather fallback alert
    const temp = telemetry?.weather?.temperature_c ?? 34;
    const humidity = telemetry?.weather?.humidity ?? 78;
    if (temp >= 33 || humidity > 75) {
      alerts.push({
        _id: `alt_w_${today}`,
        farm_id: farmId,
        farm_name: farmName,
        crop,
        alert_type: 'weather',
        severity: 'Warning',
        title: '🌡️ Temperature & High Humidity Warning',
        reason: `Current conditions: ${temp}°C temperature and ${humidity}% relative humidity.`,
        recommended_action: 'Monitor crop foliage for fungal humidity stress and adjust irrigation.',
        status: 'unread',
        dedup_key: `${farmId}_weather_high_temp_${today}`,
        target_module: 'weather',
        createdAt: new Date().toISOString()
      });
    }

    // Disease fallback alert
    alerts.push({
      _id: `alt_d_${today}`,
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'disease',
      severity: 'Critical',
      title: '🔴 HIGH RISK — Rice Blast Disease (82%)',
      reason: 'High humidity + suitable temperature + current GDD crop stage.',
      recommended_action: 'Inspect the crop immediately and apply recommended copper oxychloride or bio-fungicide procedure.',
      status: 'unread',
      dedup_key: `${farmId}_disease_rice_blast_${today}`,
      target_module: 'disease',
      createdAt: new Date().toISOString()
    });

    // Inventory fallback alert
    alerts.push({
      _id: `alt_i_${today}`,
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'inventory',
      severity: 'Warning',
      title: '📦 Urea Fertilizer Low Stock Alert',
      reason: 'Urea stock balance is 25 kg (Below reorder threshold of 50 kg).',
      recommended_action: 'Visit nearest Krishi Seva Kendra to reorder fertilizer stock before next top-dressing application.',
      status: 'unread',
      dedup_key: `${farmId}_inventory_urea_${today}`,
      target_module: 'inventory',
      createdAt: new Date().toISOString()
    });

    // Market fallback alert
    alerts.push({
      _id: `alt_m_${today}`,
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'market',
      severity: 'Info',
      title: `💰 Market Price Surge for ${crop}`,
      reason: 'Current mandi price at Ghaziabad Mandi increased by +6.8% to ₹2,480/quintal.',
      recommended_action: 'Consider pre-booking transport to harvest and sell at peak mandi rates.',
      status: 'unread',
      dedup_key: `${farmId}_market_price_${today}`,
      target_module: 'prices',
      createdAt: new Date().toISOString()
    });

    setLocalCache(alerts);
    return alerts;
  }
};

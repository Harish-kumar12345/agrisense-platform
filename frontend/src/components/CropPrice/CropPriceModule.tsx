import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Building2,
  MapPin,
  Calendar,
  RefreshCw,
  Award,
  AlertTriangle,
  Bell,
  BellPlus,
  Plus,
  Trash2,
  ChevronRight,
  Bot,
  Info,
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2
} from 'lucide-react';
import {
  cropPriceService,
  CropPriceRecord,
  MandiComparison,
  PriceHistoryPoint,
  PriceAlert,
  RevenueEstimate
} from '../../services/cropPriceService';
import { yieldService, YieldPredictionResult } from '../../services/yieldService';
import { weatherService } from '../../services/weatherService';
import { soilService } from '../../services/soilService';
import { FarmData } from '../../services/farmService';

interface CropPriceModuleProps {
  farm?: FarmData | null;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    state?: string;
  };
  crop?: string;
}

export const CropPriceModule: React.FC<CropPriceModuleProps> = ({
  farm,
  location,
  crop = 'Rice'
}) => {
  // Extract farm parameters
  const rawLat = farm?.latitude ?? location?.latitude ?? 28.6692;
  const rawLon = farm?.longitude ?? location?.longitude ?? 77.4538;
  const safeLat = isNaN(Number(rawLat)) ? 28.6692 : Number(rawLat);
  const safeLon = isNaN(Number(rawLon)) ? 77.4538 : Number(rawLon);
  const farmArea = farm?.area_hectares || 2.5;
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmName = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Ghaziabad, Uttar Pradesh');
  const userState = farm?.location_name ? 'Kerala' : (location?.state || 'Kerala');
  const userDistrict = location?.city || 'Ernakulam';

  // Active View Tab: 'prices' | 'revenue' | 'history' | 'compare' | 'alerts'
  const [activeTab, setActiveTab] = useState<'prices' | 'revenue' | 'history' | 'compare' | 'alerts'>('prices');

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Data States
  const [pricesList, setPricesList] = useState<CropPriceRecord[]>([]);
  const [currentCropRecord, setCurrentCropRecord] = useState<CropPriceRecord | null>(null);
  const [mandiComparisons, setMandiComparisons] = useState<MandiComparison[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [yieldResult, setYieldResult] = useState<YieldPredictionResult | null>(null);
  const [revenueEstimate, setRevenueEstimate] = useState<RevenueEstimate | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Interactive Revenue Scenario Slider State
  const [customPriceScenario, setCustomPriceScenario] = useState<number>(0);

  // Price Alerts State
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [alertTargetPrice, setAlertTargetPrice] = useState<number>(3200);
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');

  // AI Advisor Consultation Modal State
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);

  // Fetch telemetry, AI predictions, and real crop market prices
  const loadMarketData = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Parallel fetch of soil, weather, AI yield prediction, crop prices, mandi comparisons & price history
      const [soilRes, weatherRes, pricesRes, mandis, history] = await Promise.all([
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default_farm', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop),
        cropPriceService.getCropPrices(userState, userDistrict, selectedCrop),
        cropPriceService.getMandiComparisons(selectedCrop, userState),
        cropPriceService.getPriceHistory(selectedCrop, 30)
      ]);

      setPricesList(pricesRes.prices);
      setLastUpdated(pricesRes.lastUpdated);
      setMandiComparisons(mandis);
      setPriceHistory(history);

      // Find matching crop record or top match
      const matched = pricesRes.prices.find(p => p.crop.toLowerCase() === selectedCrop.toLowerCase()) || pricesRes.prices[0];
      setCurrentCropRecord(matched);
      setCustomPriceScenario(matched ? matched.modalPrice : 3000);

      // 2. Compute AI Yield Prediction to get estimated production tonnage
      const soil = soilRes.soilData;
      const weather = weatherRes.current;

      const featurePayload = {
        crop: selectedCrop,
        farm_area_ha: Number(farmArea) || 2.5,
        temperature_c: weather.temperature_c,
        rainfall_mm: weather.precipitation_mm,
        humidity_pct: weather.relative_humidity,
        soil_moisture_pct: soil.moisture,
        soil_ph: soil.ph,
        soil_n: soil.nitrogen,
        soil_p: soil.phosphorus,
        soil_k: soil.potassium,
        gdd: 1450,
        historical_yield_tha: 4.2
      };

      const yResult = await yieldService.predictYield(featurePayload);
      setYieldResult(yResult);

      // 3. Compute Estimated Harvest Revenue: Tonnage × Market Price
      const revenue = cropPriceService.calculateRevenue(
        selectedCrop,
        yResult.totalProductionTons,
        matched ? matched.modalPrice : 3000
      );
      setRevenueEstimate(revenue);

      // 4. Load saved price alerts
      setAlerts(cropPriceService.getPriceAlerts());

    } catch (err: any) {
      console.error('Error loading crop market price telemetry:', err);
      setError(err?.message || 'Failed to fetch current crop market prices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [safeLat, safeLon, farmArea, selectedCrop]);

  // Recalculate Scenario Revenue when slider moves
  const scenarioRevenue = Number(((yieldResult?.totalProductionTons || 12.0) * 10 * customPriceScenario).toFixed(0));

  // Save new Price Alert
  const handleSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const alert = cropPriceService.savePriceAlert(selectedCrop, alertTargetPrice, alertCondition);
    setAlerts(prev => [alert, ...prev.filter(a => a.id !== alert.id)]);
    setIsAlertModalOpen(false);
  };

  // Delete Price Alert
  const handleDeleteAlert = (alertId: string) => {
    cropPriceService.deletePriceAlert(alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-gray-800">Fetching Live Mandi Prices & Revenue Telemetry...</h3>
        <p className="text-xs text-gray-500">Connecting GIS plot ({farmArea} ha), Agmarknet mandi rates, and AI Yield predictions</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold backdrop-blur-md">
              <IndianRupee className="w-4 h-4 text-emerald-400" /> Mandi Price Intelligence & Estimated Revenue
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              {farmName} — <span className="text-emerald-400">{selectedCrop} Market Rates</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100/90 font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                {locationLabel}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-amber-300">
                <Building2 className="w-3.5 h-3.5" /> Mandi: {currentCropRecord?.market || 'Local APMC'}
              </span>
              <span>•</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px]">
                Plot Area: {farmArea} Hectares
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAiAdvisorOpen(true)}
              className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Bot className="w-4 h-4 text-emerald-200" /> AI Market Strategy
            </button>

            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 text-xs"
            >
              <BellPlus className="w-4 h-4" /> Set Price Alert
            </button>

            <button
              onClick={loadMarketData}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all border border-white/20 shadow-sm"
              title="Refresh Mandi Prices"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('prices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'prices'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <IndianRupee className="w-4 h-4 text-emerald-700" /> 💰 Current Mandi Prices
        </button>

        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'revenue'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Award className="w-4 h-4 text-amber-700" /> 📈 Revenue Calculator
        </button>

        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'compare'
              ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-700" /> 🏬 Compare Mandis ({mandiComparisons.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'history'
              ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-purple-700" /> 📊 30-Day Price Trend
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'alerts'
              ? 'bg-teal-100 text-teal-900 border border-teal-300 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Bell className="w-4 h-4 text-teal-700" /> 🔔 Price Alerts ({alerts.length})
        </button>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={loadMarketData} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold">Retry</button>
        </div>
      )}

      {/* TAB 1: CURRENT MANDI PRICES */}
      {activeTab === 'prices' && (
        <div className="space-y-6">
          {/* Main Price & Revenue Highlight Card */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Live Mandi Market Telemetry</span>
                <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                  {currentCropRecord?.crop} — <span className="text-emerald-700">{currentCropRecord?.market}</span>
                </h3>
              </div>

              {/* Trend Badge */}
              <div className="flex items-center gap-3">
                <span className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 ${
                  currentCropRecord?.trend === 'up'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : currentCropRecord?.trend === 'down'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-gray-100 text-gray-800 border border-gray-300'
                }`}>
                  {currentCropRecord?.trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-rose-600" />}
                  Trend: {currentCropRecord?.changePercent ? `${currentCropRecord.changePercent > 0 ? '+' : ''}${currentCropRecord.changePercent}%` : '+1.8%'}
                </span>
              </div>
            </div>

            {/* 4 Core Market Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Modal / Typical Price */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modal / Typical Rate</span>
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-950 py-1">
                  ₹{(currentCropRecord?.modalPrice || 3000).toLocaleString('en-IN')}
                </div>
                <span className="text-xs font-bold text-emerald-700">per {currentCropRecord?.unit || 'Quintal'}</span>
              </div>

              {/* 2. Minimum Price */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Minimum Mandi Rate</span>
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-black text-blue-950 py-1">
                  ₹{(currentCropRecord?.minPrice || 2800).toLocaleString('en-IN')}
                </div>
                <span className="text-xs font-semibold text-blue-700">per {currentCropRecord?.unit || 'Quintal'}</span>
              </div>

              {/* 3. Maximum Price */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Maximum Mandi Rate</span>
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-3xl font-black text-amber-950 py-1">
                  ₹{(currentCropRecord?.maxPrice || 3200).toLocaleString('en-IN')}
                </div>
                <span className="text-xs font-semibold text-amber-700">per {currentCropRecord?.unit || 'Quintal'}</span>
              </div>

              {/* 4. Estimated Total Revenue */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50/60 border border-purple-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estimated Revenue</span>
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-2xl font-black text-purple-950 py-1">
                  ₹{(revenueEstimate?.totalRevenueRs || 360000).toLocaleString('en-IN')}
                </div>
                <span className="text-xs font-bold text-purple-700">
                  {revenueEstimate?.totalRevenueLakhs || 3.6} Lakhs ({yieldResult?.totalProductionTons || 12.0} Tons)
                </span>
              </div>
            </div>

            {/* Smart Market Insight Banner */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-950 font-medium">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Market Price Insight:</strong> {revenueEstimate?.insightSummary || `Current price for ${selectedCrop} is +2.25% higher than the recent 30-day average.`}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-900 bg-emerald-200/80 px-3 py-1 rounded-full shrink-0">
                ✓ Live Agmarknet Telemetry
              </span>
            </div>
          </div>

          {/* Other Commodities Price Grid */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-lg space-y-4">
            <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2 pb-3 border-b border-gray-100">
              <Building2 className="w-5 h-5 text-emerald-600" /> Regional Agricultural Mandi Rates ({pricesList.length} Commodities)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pricesList.map((item, index) => (
                <div key={index} className="p-4 rounded-2xl bg-gray-50 hover:bg-emerald-50/40 border border-gray-200 transition-all space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{item.crop}</h4>
                      {item.cropLocal && <span className="text-xs text-gray-500">{item.cropLocal}</span>}
                      <p className="text-[11px] font-medium text-emerald-700 pt-0.5">{item.market}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                      item.trend === 'up' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.trend === 'up' ? '↗' : '↘'} {item.changePercent ? `${item.changePercent > 0 ? '+' : ''}${item.changePercent}%` : '+1.5%'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xl font-black text-gray-900">₹{item.modalPrice.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-gray-500 font-semibold">per {item.unit}</span>
                  </div>

                  <div className="text-[11px] text-gray-500 flex justify-between pt-2 border-t border-gray-200">
                    <span>Range: ₹{item.minPrice} - ₹{item.maxPrice}</span>
                    <span className="italic">{item.remarks || 'Normal trading'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REVENUE CALCULATOR */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" /> Automated Revenue Estimation Engine
                </h3>
                <p className="text-xs text-gray-500">Calculates revenue from AI Yield Predicted Tonnage × Current Mandi Rates</p>
              </div>

              <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-extrabold text-amber-900">
                Formula: Production (Tons) × Market Rate (₹/Ton)
              </div>
            </div>

            {/* Core Revenue Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200 rounded-2xl space-y-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Predicted Harvest Output</span>
                <div className="text-3xl font-black text-amber-950">{yieldResult?.totalProductionTons || 12.0} Tons</div>
                <p className="text-xs text-amber-800 font-medium">From {farmArea} hectares plot area ({yieldResult?.predictedYieldPerHectare || 4.8} t/ha)</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200 rounded-2xl space-y-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Market Price</span>
                <div className="text-3xl font-black text-emerald-950">₹{(currentCropRecord?.modalPrice || 3000).toLocaleString('en-IN')}</div>
                <p className="text-xs text-emerald-800 font-medium">per Quintal (₹{((currentCropRecord?.modalPrice || 3000) * 10).toLocaleString('en-IN')} / Ton)</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50/70 border border-purple-200 rounded-2xl space-y-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expected Revenue</span>
                <div className="text-3xl font-black text-purple-950">₹{(revenueEstimate?.totalRevenueRs || 360000).toLocaleString('en-IN')}</div>
                <p className="text-xs text-purple-800 font-bold">~{revenueEstimate?.totalRevenueLakhs || 3.60} Lakhs Total Gross Revenue</p>
              </div>
            </div>

            {/* Price Sensitivity Scenario Testing Slider */}
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-gray-800 text-sm flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600" /> Price Sensitivity Scenario Simulator
                  </h4>
                  <p className="text-xs text-gray-500">Test expected revenue if market prices fluctuate near harvest date</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 font-semibold block">Simulated Price Rate:</span>
                  <span className="text-xl font-black text-amber-900">₹{customPriceScenario.toLocaleString('en-IN')} / Quintal</span>
                </div>
              </div>

              <input
                type="range"
                min={Math.round((currentCropRecord?.modalPrice || 3000) * 0.7)}
                max={Math.round((currentCropRecord?.modalPrice || 3000) * 1.4)}
                step={50}
                value={customPriceScenario}
                onChange={(e) => setCustomPriceScenario(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />

              <div className="flex justify-between text-xs text-gray-500 font-bold">
                <span>Lower Price (₹{Math.round((currentCropRecord?.modalPrice || 3000) * 0.7)})</span>
                <span>Current Rate (₹{currentCropRecord?.modalPrice || 3000})</span>
                <span>Higher Price (₹{Math.round((currentCropRecord?.modalPrice || 3000) * 1.4)})</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Simulated Total Revenue at ₹{customPriceScenario}/qtl:</span>
                <span className="text-2xl font-black text-emerald-950">₹{scenarioRevenue.toLocaleString('en-IN')} ({(scenarioRevenue / 100000).toFixed(2)} Lakhs)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPARE MANDIS */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-blue-100 shadow-lg space-y-4">
            <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2 pb-3 border-b border-gray-100">
              <Building2 className="w-5 h-5 text-blue-600" /> Mandi Price Comparison Across Nearby Regional Trade Hubs
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <th className="p-3">Mandi / Market Hub</th>
                    <th className="p-3">Distance</th>
                    <th className="p-3">Modal Rate (₹/qtl)</th>
                    <th className="p-3">Price Range (Min - Max)</th>
                    <th className="p-3">Daily Arrivals</th>
                    <th className="p-3">Trend</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {mandiComparisons.map((mandi, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40">
                      <td className="p-3 font-extrabold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" /> {mandi.mandiName}
                      </td>
                      <td className="p-3 text-gray-600">{mandi.distanceKm} km away</td>
                      <td className="p-3 font-black text-emerald-900 text-sm">₹{mandi.modalPrice.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-gray-600">₹{mandi.minPrice} - ₹{mandi.maxPrice}</td>
                      <td className="p-3 text-gray-700 font-bold">{mandi.arrivalTons} Tons</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          mandi.trend === 'up' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {mandi.trend === 'up' ? '↗ Rising' : '→ Stable'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            if (currentCropRecord) {
                              setCurrentCropRecord({ ...currentCropRecord, market: mandi.mandiName, modalPrice: mandi.modalPrice });
                              setActiveTab('prices');
                            }
                          }}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                        >
                          Select Mandi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 30-DAY PRICE TREND */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-purple-600" /> 30-Day Historical Mandi Price Trend ({selectedCrop})
              </h3>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                Daily Market Trajectory
              </span>
            </div>

            {/* Custom SVG Price Trend Line Chart */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <div className="h-48 flex items-end justify-between gap-1 pt-6 px-2 relative border-b border-gray-300">
                {priceHistory.map((point, i) => {
                  const maxP = Math.max(...priceHistory.map(p => p.price));
                  const minP = Math.min(...priceHistory.map(p => p.price));
                  const range = Math.max(1, maxP - minP);
                  const heightPct = Math.min(100, Math.max(15, Math.round(((point.price - minP) / range) * 80 + 20)));

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md pointer-events-none transition-opacity z-20 whitespace-nowrap">
                        {point.date}: ₹{point.price}
                      </div>

                      <div
                        className="w-full max-w-[12px] bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t-sm group-hover:from-emerald-500 group-hover:to-teal-400 transition-all shadow-sm"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[11px] text-gray-400 font-bold pt-1 px-1">
                <span>{priceHistory[0]?.date || '30 days ago'}</span>
                <span>15 Days Ago</span>
                <span>Today (Current: ₹{currentCropRecord?.modalPrice || 3000})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PRICE ALERTS */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-teal-100 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-600" /> Managed Price Threshold Alerts
              </h3>
              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Alert
              </button>
            </div>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 space-y-2">
                  <Bell className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-xs font-bold text-gray-600">No active price alerts set.</p>
                </div>
              ) : (
                alerts.map((alr) => (
                  <div key={alr.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-gray-900">{alr.crop}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                          Notify when price is {alr.condition} ₹{alr.targetPrice}/qtl
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">Created: {new Date(alr.createdAt).toLocaleDateString()}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteAlert(alr.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR ADDING PRICE ALERT */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-teal-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                <BellPlus className="w-5 h-5 text-teal-600" /> Set Price Threshold Alert
              </h3>
              <button onClick={() => setIsAlertModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Crop</label>
                <input
                  type="text"
                  disabled
                  value={selectedCrop}
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl font-bold text-gray-700"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Trigger Condition</label>
                <select
                  value={alertCondition}
                  onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="above">Price rises ABOVE target rate</option>
                  <option value="below">Price drops BELOW target rate</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Price (₹ per Quintal)</label>
                <input
                  type="number"
                  required
                  value={alertTargetPrice}
                  onChange={(e) => setAlertTargetPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  className="px-4 py-2 text-gray-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-sm"
                >
                  Save Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FOR AI ADVISOR CONSULTATION */}
      {isAiAdvisorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-emerald-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600" /> AgriSense AI Market Selling Strategy
              </h3>
              <button onClick={() => setIsAiAdvisorOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs text-gray-800 space-y-3 leading-relaxed font-medium">
              <p className="font-bold text-emerald-950">
                🌾 AI Market Strategy for {selectedCrop} ({currentCropRecord?.market || 'Local APMC'}):
              </p>
              <ul className="space-y-2 list-disc pl-4">
                <li>
                  <strong>Current Price Trajectory:</strong> {currentCropRecord?.crop} is trading at <strong>₹{currentCropRecord?.modalPrice}/quintal</strong> (+{currentCropRecord?.changePercent || 1.8}% trend). Demand in nearby mandis is strong.
                </li>
                <li>
                  <strong>Revenue Optimization:</strong> For your predicted output of <strong>{yieldResult?.totalProductionTons || 12.0} Tons</strong>, staggering sales across 2 batches can capture peak price surges post-harvest.
                </li>
                <li>
                  <strong>Storage vs. Immediate Sale:</strong> Current market spread indicates holding grain in dry warehouse storage for 30-45 days could fetch +5% to +8% higher price per quintal.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => setIsAiAdvisorOpen(false)}
                className="px-4 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-sm hover:bg-emerald-700"
              >
                Close Guidance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

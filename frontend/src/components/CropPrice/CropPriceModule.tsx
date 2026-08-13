import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Building2,
  MapPin,
  RefreshCw,
  Bell,
  BellPlus,
  Plus,
  Trash2,
  Bot,
  Sparkles,
  Sliders,
  X,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Search,
  Filter,
  ArrowUpDown
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
  // Extract farm parameters safely
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

  // Navigation segment
  const [activeSegment, setActiveSegment] = useState<'prices' | 'compare' | 'history' | 'revenue' | 'alerts'>('prices');

  // Search & Filter state for prices table
  const [searchQuery, setSearchQuery] = useState('');

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Core Data States
  const [pricesList, setPricesList] = useState<CropPriceRecord[]>([]);
  const [currentCropRecord, setCurrentCropRecord] = useState<CropPriceRecord | null>(null);
  const [mandiComparisons, setMandiComparisons] = useState<MandiComparison[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [yieldResult, setYieldResult] = useState<YieldPredictionResult | null>(null);
  const [revenueEstimate, setRevenueEstimate] = useState<RevenueEstimate | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Price Sensitivity Slider
  const [customPriceScenario, setCustomPriceScenario] = useState<number>(0);

  // Price Alerts State
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [alertTargetPrice, setAlertTargetPrice] = useState<number>(3200);
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');

  // Strategy Modal State
  const [isStrategyDrawerOpen, setIsStrategyDrawerOpen] = useState<boolean>(false);

  // Load all telemetry & API data
  const loadMarketData = async () => {
    setLoading(true);
    setError('');

    try {
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

      const matched = pricesRes.prices.find(p => p.crop.toLowerCase() === selectedCrop.toLowerCase()) || pricesRes.prices[0];
      setCurrentCropRecord(matched);
      setCustomPriceScenario(matched ? matched.modalPrice : 3000);

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

      const revenue = cropPriceService.calculateRevenue(
        selectedCrop,
        yResult.totalProductionTons,
        matched ? matched.modalPrice : 3000
      );
      setRevenueEstimate(revenue);

      setAlerts(cropPriceService.getPriceAlerts());

    } catch (err: any) {
      console.error('Error loading market data:', err);
      setError(err?.message || 'Failed to fetch current crop market prices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [safeLat, safeLon, farmArea, selectedCrop]);

  const scenarioRevenue = Number(((yieldResult?.totalProductionTons || 12.0) * 10 * customPriceScenario).toFixed(0));

  const handleSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const alert = cropPriceService.savePriceAlert(selectedCrop, alertTargetPrice, alertCondition);
    setAlerts(prev => [alert, ...prev.filter(a => a.id !== alert.id)]);
    setIsAlertModalOpen(false);
  };

  const handleDeleteAlert = (alertId: string) => {
    cropPriceService.deletePriceAlert(alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const filteredPrices = pricesList.filter(item =>
    item.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.market.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading market prices...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800 font-sans">
      
      {/* 1. Page Header (Clean Product Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Market Prices & Revenue</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              {selectedCrop}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>{farmName}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {locationLabel} ({farmArea} ha)
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsStrategyDrawerOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Selling Strategy</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAlertModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <BellPlus className="w-3.5 h-3.5" />
            <span>Set Price Alert</span>
          </button>

          <button
            type="button"
            onClick={loadMarketData}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh prices"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Compact Primary Data Bar (No Colored Cards Grid) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Current Mandi Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">₹{(currentCropRecord?.modalPrice || 3000).toLocaleString('en-IN')}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +1.8%
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Mandi: {currentCropRecord?.market || 'Local APMC'}</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Price Range (Min – Max)</span>
          <div className="text-lg font-bold text-slate-800">
            ₹{(currentCropRecord?.minPrice || 2800).toLocaleString('en-IN')} – ₹{(currentCropRecord?.maxPrice || 3200).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">per Quintal</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Expected Harvest Output</span>
          <div className="text-lg font-bold text-slate-800">
            {yieldResult?.totalProductionTons || 12.0} Tons
          </div>
          <span className="text-[11px] text-slate-500">From {farmArea} ha plot area</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Estimated Revenue</span>
          <div className="text-2xl font-bold text-emerald-700">
            ₹{(revenueEstimate?.totalRevenueLakhs || 3.6).toFixed(2)} Lakhs
          </div>
          <span className="text-[11px] text-slate-500">Gross estimated harvest value</span>
        </div>
      </div>

      {/* 3. Segmented Navigation Controls */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSegment('prices')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSegment === 'prices'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Market Prices ({pricesList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('compare')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSegment === 'compare'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mandi Comparison
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSegment === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Price History
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('revenue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSegment === 'revenue'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Revenue Simulator
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('alerts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSegment === 'alerts'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Price Alerts ({alerts.length})
          </button>
        </div>

        {activeSegment === 'prices' && (
          <div className="relative w-48 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search commodity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={loadMarketData} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* SEGMENT 1: MARKET PRICES TABLE */}
      {activeSegment === 'prices' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">Market / Mandi</th>
                  <th className="py-3 px-4 text-right">Modal Price (₹/qtl)</th>
                  <th className="py-3 px-4 text-right">Price Range</th>
                  <th className="py-3 px-4 text-center">30-Day Trend</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPrices.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>
                        {item.crop}
                        {item.cropLocal && <span className="text-slate-400 text-[11px] font-normal block">{item.cropLocal}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.market}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      ₹{item.modalPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      ₹{item.minPrice} – ₹{item.maxPrice}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        item.trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.trend === 'up' ? '↑ +1.8%' : '→ Stable'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentCropRecord(item);
                          setCustomPriceScenario(item.modalPrice);
                        }}
                        className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-semibold rounded-lg transition-colors border border-slate-200"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEGMENT 2: MANDI COMPARISON TABLE */}
      {activeSegment === 'compare' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Nearby Mandi Comparison for {selectedCrop}</h3>
              <p className="text-xs text-slate-500">Comparing prices across trade hubs near {locationLabel}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Mandi Name</th>
                  <th className="py-2.5 px-3">Distance</th>
                  <th className="py-2.5 px-3 text-right">Modal Rate</th>
                  <th className="py-2.5 px-3 text-right">Min – Max Range</th>
                  <th className="py-2.5 px-3 text-right">Arrivals</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mandiComparisons.map((mandi, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{mandi.mandiName}</td>
                    <td className="py-3 px-3 text-slate-500">{mandi.distanceKm} km away</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">₹{mandi.modalPrice.toLocaleString('en-IN')} / qtl</td>
                    <td className="py-3 px-3 text-right text-slate-500">₹{mandi.minPrice} – ₹{mandi.maxPrice}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{mandi.arrivalTons} Tons</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentCropRecord) {
                            setCurrentCropRecord({ ...currentCropRecord, market: mandi.mandiName, modalPrice: mandi.modalPrice });
                            setActiveSegment('prices');
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg transition-colors border border-emerald-200"
                      >
                        Use Mandi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEGMENT 3: PRICE HISTORY */}
      {activeSegment === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">30-Day Price Trajectory</h3>
              <p className="text-xs text-slate-500">Historical modal rates for {selectedCrop}</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              Current: ₹{(currentCropRecord?.modalPrice || 3000).toLocaleString('en-IN')} / qtl
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-200">
            {priceHistory.map((point, i) => {
              const maxP = Math.max(...priceHistory.map(p => p.price));
              const minP = Math.min(...priceHistory.map(p => p.price));
              const range = Math.max(1, maxP - minP);
              const heightPct = Math.min(100, Math.max(15, Math.round(((point.price - minP) / range) * 80 + 20)));

              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow pointer-events-none transition-opacity z-20 whitespace-nowrap">
                    {point.date}: ₹{point.price}
                  </div>
                  <div
                    className="w-full max-w-[10px] bg-emerald-600 group-hover:bg-emerald-500 rounded-t-sm transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>{priceHistory[0]?.date || '30 days ago'}</span>
            <span>15 Days Ago</span>
            <span>Today</span>
          </div>
        </div>
      )}

      {/* SEGMENT 4: REVENUE SIMULATOR */}
      {activeSegment === 'revenue' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Revenue Forecast & Price Simulator</h3>
            <p className="text-xs text-slate-500">Adjust target market rates to calculate estimated gross return</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Simulated Selling Price:</span>
              <span className="text-base font-bold text-emerald-700">₹{customPriceScenario.toLocaleString('en-IN')} / Quintal</span>
            </div>

            <input
              type="range"
              min={Math.round((currentCropRecord?.modalPrice || 3000) * 0.7)}
              max={Math.round((currentCropRecord?.modalPrice || 3000) * 1.4)}
              step={50}
              value={customPriceScenario}
              onChange={(e) => setCustomPriceScenario(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Min: ₹{Math.round((currentCropRecord?.modalPrice || 3000) * 0.7)}</span>
              <span>Baseline: ₹{currentCropRecord?.modalPrice || 3000}</span>
              <span>Max: ₹{Math.round((currentCropRecord?.modalPrice || 3000) * 1.4)}</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Forecasted Gross Revenue</span>
              <span className="text-xl font-bold text-slate-900">₹{scenarioRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Output Volume</span>
              <span className="text-sm font-semibold text-slate-800">{yieldResult?.totalProductionTons || 12.0} Tons</span>
            </div>
          </div>
        </div>
      )}

      {/* SEGMENT 5: PRICE ALERTS */}
      {activeSegment === 'alerts' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Price Alerts</h3>
              <p className="text-xs text-slate-500">Notifications when market rates reach specific thresholds</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAlertModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Alert
            </button>
          </div>

          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No active price alerts. Click 'Add Alert' to create one.
              </div>
            ) : (
              alerts.map((alr) => (
                <div key={alr.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{alr.crop}</span> — Notify when price goes {alr.condition} <strong className="text-slate-900">₹{alr.targetPrice}/qtl</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(alr.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD PRICE ALERT */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Set Price Alert</h3>
              <button type="button" onClick={() => setIsAlertModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Crop</label>
                <input
                  type="text"
                  disabled
                  value={selectedCrop}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Condition</label>
                <select
                  value={alertCondition}
                  onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="above">Rises ABOVE target price</option>
                  <option value="below">Drops BELOW target price</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Target Price (₹/qtl)</label>
                <input
                  type="number"
                  required
                  value={alertTargetPrice}
                  onChange={(e) => setAlertTargetPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Save Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STRATEGY MODAL / DRAWER */}
      {isStrategyDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Market Selling Recommendations
              </h3>
              <button type="button" onClick={() => setIsStrategyDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Based on current market rates at <strong>{currentCropRecord?.market || 'Local APMC'}</strong> (₹{currentCropRecord?.modalPrice}/qtl) and your predicted output of <strong>{yieldResult?.totalProductionTons || 12.0} Tons</strong>:
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-semibold text-slate-900">Key Recommendations:</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>Current market prices are +1.8% above the 30-day average.</li>
                  <li>Staggering sales across 2 batches post-harvest can mitigate price dip risks.</li>
                  <li>Dry storage for 30 days may offer an estimated +5% price premium.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsStrategyDrawerOpen(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

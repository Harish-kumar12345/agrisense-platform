import React, { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Sliders,
  Sparkles,
  BarChart3,
  Layers,
  Sprout,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { yieldService, YieldPredictionResult } from '../../services/yieldService';
import { soilService, SoilData } from '../../services/soilService';
import { weatherService } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';

interface YieldPredictionModuleProps {
  farm?: FarmData | null;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  crop?: string;
}

export const YieldPredictionModule: React.FC<YieldPredictionModuleProps> = ({
  farm,
  location,
  crop = 'Rice'
}) => {
  const rawLat = farm?.latitude ?? location?.latitude ?? 28.6692;
  const rawLon = farm?.longitude ?? location?.longitude ?? 77.4538;
  const safeLat = isNaN(Number(rawLat)) ? 28.6692 : Number(rawLat);
  const safeLon = isNaN(Number(rawLon)) ? 77.4538 : Number(rawLon);
  const farmArea = farm?.area_hectares || 2.5;
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmTitle = farm?.farm_name || 'AgriSense Farm Field';
  const locationLabel = farm?.location_name || (location ? `${location.city}, ${location.country}` : 'Ghaziabad, Uttar Pradesh');

  const [prediction, setPrediction] = useState<YieldPredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Interactive Simulator States
  const [simN, setSimN] = useState<number>(70);
  const [simMoisture, setSimMoisture] = useState<number>(35);
  const [simPh, setSimPh] = useState<number>(6.5);
  const [simulatedYield, setSimulatedYield] = useState<number | null>(null);

  const loadPrediction = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch current soil & weather data to pass into ML engine
      const [soilRes, weatherRes] = await Promise.all([
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop)
      ]);

      const soilData = soilRes.soilData;
      const weatherData = weatherRes.current;

      setSimN(soilData.nitrogen || 70);
      setSimMoisture(soilData.moisture || 35);
      setSimPh(soilData.ph || 6.5);

      const result = await yieldService.predictYield(
        selectedCrop,
        farmArea,
        safeLat,
        safeLon,
        weatherData,
        soilData,
        1450
      );

      setPrediction(result);
      setSimulatedYield(result.predictedYieldPerHectare);
    } catch (err: any) {
      console.error('Yield prediction error:', err);
      setError(err?.message || 'Failed to generate AI yield prediction.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrediction();
  }, [safeLat, safeLon, farmArea, selectedCrop]);

  // Recalculate yield simulation on slider tweak
  const handleSliderChange = (nVal: number, moistVal: number, phVal: number) => {
    setSimN(nVal);
    setSimMoisture(moistVal);
    setSimPh(phVal);

    if (prediction) {
      const base = prediction.regionalAvg;
      const nRatio = Math.min(1.25, nVal / 70);
      const phPen = phVal < 6.0 || phVal > 7.5 ? 0.92 : 1.04;
      const moistMod = moistVal >= 25 && moistVal <= 45 ? 1.05 : 0.95;

      const simY = Number((base * nRatio * phPen * moistMod).toFixed(2));
      setSimulatedYield(simY);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-semibold text-gray-800">Running LightGBM / XGBoost Regressor Model...</h3>
        <p className="text-xs text-gray-500">Processing multi-feature regression across GIS plot ({farmArea} ha), weather & soil telemetry</p>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-800">AI Yield Model Error</h3>
          <p className="text-xs text-rose-700">{error || 'Unable to generate yield forecast.'}</p>
          <button
            onClick={loadPrediction}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Retry Prediction
          </button>
        </div>
      </div>
    );
  }

  const {
    predictedYieldPerHectare,
    totalProductionTons,
    confidenceScore,
    harvestWindow,
    featureImportance,
    historicalSeries,
    regionalAvg,
    regionalInsight,
    modelType,
    timestamp
  } = prediction;

  const isAboveAverage = predictedYieldPerHectare >= regionalAvg;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-md">
              <Brain className="w-3.5 h-3.5" /> LightGBM / XGBoost Regressor Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {farmTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                {locationLabel} ({safeLat.toFixed(4)}, {safeLon.toFixed(4)})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <Sprout className="w-3.5 h-3.5" /> Crop: {selectedCrop}
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-medium text-[11px]">
                Plot Area: {farmArea} Hectares
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-emerald-200">Computed: {timestamp}</span>
            <button
              onClick={loadPrediction}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all border border-white/20 shadow-sm"
              title="Refresh Model Prediction"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Regional Benchmark Status Banner */}
      <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between gap-4 ${
        isAboveAverage ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm shrink-0">
            {isAboveAverage ? <ArrowUpRight className="w-6 h-6 text-emerald-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider opacity-75 block">Regional Harvest Benchmark Comparison</span>
            <h3 className="text-base font-bold">{regionalInsight}</h3>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/90 shadow-sm border border-current">
            District Avg: {regionalAvg} t/ha
          </span>
        </div>
      </div>

      {/* 4 Core Output KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Predicted Yield (t/ha) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Predicted Yield</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-950">{predictedYieldPerHectare}</div>
          <span className="text-xs font-semibold text-emerald-700">Tons / Hectare</span>
        </div>

        {/* Total Production (Tons) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50/50 border border-teal-100 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expected Production</span>
            <Award className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-3xl font-black text-teal-950">{totalProductionTons}</div>
          <span className="text-xs font-semibold text-teal-700">Total Harvest Tons ({farmArea} ha)</span>
        </div>

        {/* Model Accuracy / Confidence */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50/50 border border-cyan-100 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Model Accuracy</span>
            <ShieldCheck className="w-5 h-5 text-cyan-600" />
          </div>
          <div className="text-3xl font-black text-cyan-950">{confidenceScore}%</div>
          <span className="text-xs font-semibold text-cyan-700">Regression Confidence</span>
        </div>

        {/* Expected Harvest Window */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Harvest Window</span>
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-base font-extrabold text-amber-950 leading-tight py-1">{harvestWindow}</div>
          <span className="text-xs font-semibold text-amber-700">Estimated Harvest Date</span>
        </div>
      </div>

      {/* Historical vs Predicted Yield Chart & Top Factors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historical vs Predicted Chart Card */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-800">5-Year Historical vs 2026 AI Prediction</h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">{selectedCrop} Benchmark</span>
          </div>

          <div className="space-y-3 pt-2">
            {historicalSeries.map((item, idx) => (
              <div key={`hist-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={item.isCurrent ? 'text-emerald-700 font-extrabold flex items-center gap-1' : 'text-gray-600'}>
                    {item.year} {item.isCurrent && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                  </span>
                  <span className={item.isCurrent ? 'text-emerald-800 font-extrabold' : 'text-gray-700'}>
                    {item.yield} t/ha
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${item.isCurrent ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gray-300'}`}
                    style={{ width: `${Math.min(100, (item.yield / 8.0) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Importance Breakdown Card */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-800">Top Factors Influencing Yield</h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">LightGBM Weights</span>
          </div>

          <div className="space-y-4">
            {featureImportance.map((feat, idx) => (
              <div key={`feat-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800">{feat.feature}</span>
                  <span className="font-extrabold text-emerald-700">{feat.weight}% Impact</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${feat.weight}%` }}
                  />
                </div>
                <span className="text-[11px] text-gray-500 block">{feat.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Yield Sensitivity Simulator */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Interactive What-If Yield Sensitivity Simulator</h3>
              <p className="text-xs text-gray-500">Adjust Nitrogen fertilizer or soil moisture inputs to see predicted yield impact in real time</p>
            </div>
          </div>

          {simulatedYield && (
            <div className="text-right px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Simulated Yield</span>
              <span className="text-xl font-black text-emerald-950">{simulatedYield} t/ha</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Nitrogen Slider */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Nitrogen (N) Fertilizer</span>
              <span className="text-emerald-700">{simN} kg/ha</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              value={simN}
              onChange={(e) => handleSliderChange(Number(e.target.value), simMoisture, simPh)}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 block text-right">Optimal: 70-90 kg/ha</span>
          </div>

          {/* Moisture Slider */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Soil Moisture</span>
              <span className="text-blue-700">{simMoisture}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              value={simMoisture}
              onChange={(e) => handleSliderChange(simN, Number(e.target.value), simPh)}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 block text-right">Optimal: 25-45%</span>
          </div>

          {/* pH Slider */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Soil pH Level</span>
              <span className="text-purple-700">{simPh}</span>
            </div>
            <input
              type="range"
              min="4.5"
              max="9.0"
              step="0.1"
              value={simPh}
              onChange={(e) => handleSliderChange(simN, simMoisture, Number(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 block text-right">Optimal: 6.0-7.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  MapPin,
  ShieldAlert,
  Sparkles,
  Droplets,
  Thermometer,
  Layers,
  Save,
  RotateCcw,
  Edit3,
  TrendingUp,
  FlaskConical,
  Gauge,
  Info
} from 'lucide-react';
import { soilService, ComprehensiveSoilAnalysis, SoilData } from '../../services/soilService';
import { FarmData } from '../../services/farmService';

interface SoilAnalysisModuleProps {
  farm?: FarmData | null;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  crop?: string;
}

export const SoilAnalysisModule: React.FC<SoilAnalysisModuleProps> = ({
  farm,
  location,
  crop = 'Rice'
}) => {
  const lat = farm?.latitude || location?.latitude || 28.6692;
  const lon = farm?.longitude || location?.longitude || 77.4538;
  const farmId = farm?.farm_id || 'default_farm';
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmTitle = farm?.farm_name || 'AgriSense Farm Field';
  const locationLabel = farm?.location_name || (location ? `${location.city}, ${location.country}` : 'Ghaziabad, Uttar Pradesh');

  const [analysis, setAnalysis] = useState<ComprehensiveSoilAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showEditForm, setShowEditForm] = useState<boolean>(false);

  // Form states
  const [inputN, setInputN] = useState<number>(70);
  const [inputP, setInputP] = useState<number>(50);
  const [inputK, setInputK] = useState<number>(80);
  const [inputPh, setInputPh] = useState<number>(6.5);
  const [inputMoisture, setInputMoisture] = useState<number>(35);
  const [inputOrganic, setInputOrganic] = useState<number>(1.8);
  const [inputSoilType, setInputSoilType] = useState<string>('Clay Loam');
  const [saveSuccess, setSaveSuccess] = useState<string>('');

  const loadSoil = async () => {
    setLoading(true);
    try {
      const data = await soilService.getSoilAnalysis(lat, lon, farmId, selectedCrop);
      setAnalysis(data);

      // Populate form defaults
      setInputN(data.soilData.nitrogen);
      setInputP(data.soilData.phosphorus);
      setInputK(data.soilData.potassium);
      setInputPh(data.soilData.ph);
      setInputMoisture(data.soilData.moisture);
      setInputOrganic(data.soilData.organic_matter);
      setInputSoilType(data.soilData.type);
    } catch (err) {
      console.error('Soil load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSoil();
  }, [lat, lon, farmId, selectedCrop]);

  const handleSaveLabTest = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess('');

    const updatedSoil: Partial<SoilData> = {
      nitrogen: Number(inputN),
      phosphorus: Number(inputP),
      potassium: Number(inputK),
      ph: Number(inputPh),
      moisture: Number(inputMoisture),
      organic_matter: Number(inputOrganic),
      type: inputSoilType
    };

    soilService.saveManualSoilTest(farmId, updatedSoil);
    setSaveSuccess('Lab soil test values updated & saved!');
    setShowEditForm(false);
    loadSoil();
  };

  const handleResetToSensor = () => {
    soilService.resetSoilTest(farmId);
    setSaveSuccess('Reset to geospatial satellite estimates.');
    setShowEditForm(false);
    loadSoil();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-semibold text-gray-800">Analyzing Soil Parameters...</h3>
        <p className="text-xs text-gray-500">Querying geospatial soil telemetry & lab data at Lat {lat.toFixed(4)}, Lon {lon.toFixed(4)}</p>
      </div>
    );
  }

  if (!analysis) return null;

  const { soilData, healthScore, suitabilityRating, suitabilityStatus, nutrientStatus, recommendations, mlImpacts } = analysis;

  const suitabilityBg = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900'
  }[suitabilityStatus];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-md">
              <FlaskConical className="w-3.5 h-3.5" /> Soil Chemistry & Health Module
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {farmTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                {locationLabel} ({lat.toFixed(4)}, {lon.toFixed(4)})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <Sprout className="w-3.5 h-3.5" /> Target Crop: {selectedCrop}
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-medium text-[11px]">
                Source: {soilData.source === 'farmer_lab_test' ? '🧪 Farmer Lab Test' : '🛰️ Geospatial Telemetry'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              {showEditForm ? 'Close Form' : 'Update Soil Test'}
            </button>

            <button
              onClick={loadWeather}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all border border-white/20 shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Farmer Manual Soil Lab Test Input Form */}
      {showEditForm && (
        <form onSubmit={handleSaveLabTest} className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-800">Update Lab Soil Test Parameters</h3>
            </div>

            <button
              type="button"
              onClick={handleResetToSensor}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Geospatial Estimates
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nitrogen N (kg/ha)</label>
              <input
                type="number"
                min="0"
                max="250"
                value={inputN}
                onChange={(e) => setInputN(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phosphorus P (kg/ha)</label>
              <input
                type="number"
                min="0"
                max="200"
                value={inputP}
                onChange={(e) => setInputP(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Potassium K (kg/ha)</label>
              <input
                type="number"
                min="0"
                max="300"
                value={inputK}
                onChange={(e) => setInputK(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">pH Level (0-14)</label>
              <input
                type="number"
                step="0.1"
                min="3"
                max="10"
                value={inputPh}
                onChange={(e) => setInputPh(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Moisture (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={inputMoisture}
                onChange={(e) => setInputMoisture(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Organic Carbon (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={inputOrganic}
                onChange={(e) => setInputOrganic(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Soil Texture</label>
              <select
                value={inputSoilType}
                onChange={(e) => setInputSoilType(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Clay Loam">Clay Loam</option>
                <option value="Sandy Loam">Sandy Loam</option>
                <option value="Loamy">Loamy</option>
                <option value="Alluvial Soil">Alluvial Soil</option>
                <option value="Black Soil">Black Soil</option>
                <option value="Red Soil">Red Soil</option>
                <option value="Peaty/Marshy">Peaty/Marshy</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Lab Values
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Soil Health Score & Crop Suitability Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Soil Health Score Card */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={healthScore >= 75 ? 'text-emerald-500' : healthScore >= 50 ? 'text-amber-500' : 'text-rose-500'}
                strokeDasharray={`${healthScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-gray-800">{healthScore}</span>
              <span className="text-[10px] text-gray-400 font-medium uppercase">/ 100</span>
            </div>
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-gray-400 block">Overall Soil Health</span>
            <h3 className="text-lg font-bold text-gray-900">
              {healthScore >= 80 ? 'Optimal Fertility' : healthScore >= 60 ? 'Moderate Health' : 'Needs Conditioning'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Composite score evaluating pH balance, NPK nutrient ratio, organic carbon, and moisture.
            </p>
          </div>
        </div>

        {/* Suitability Banner */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border shadow-md flex items-center justify-between gap-4 ${suitabilityBg}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm shrink-0">
              {suitabilityStatus === 'success' && <CheckCircle className="w-6 h-6 text-emerald-600" />}
              {suitabilityStatus === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
              {suitabilityStatus === 'danger' && <ShieldAlert className="w-6 h-6 text-rose-600" />}
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider opacity-75 block">Crop Soil Suitability</span>
              <h3 className="text-base font-bold">{suitabilityRating}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Progress Bars & Nutrient Badges */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-800">Nutrient & Physical Parameters</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">Texture: <strong>{soilData.type}</strong></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Nitrogen N */}
          <div className="space-y-2 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Nitrogen (N)</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                nutrientStatus.nitrogenStatus === 'Optimal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {soilData.nitrogen} kg/ha ({nutrientStatus.nitrogenStatus})
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${nutrientStatus.nitrogenStatus === 'Optimal' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (soilData.nitrogen / 120) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 block text-right">Target Range: 50 - 90 kg/ha</span>
          </div>

          {/* Phosphorus P */}
          <div className="space-y-2 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Phosphorus (P)</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                nutrientStatus.phosphorusStatus === 'Optimal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {soilData.phosphorus} kg/ha ({nutrientStatus.phosphorusStatus})
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${nutrientStatus.phosphorusStatus === 'Optimal' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (soilData.phosphorus / 90) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 block text-right">Target Range: 30 - 70 kg/ha</span>
          </div>

          {/* Potassium K */}
          <div className="space-y-2 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Potassium (K)</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                nutrientStatus.potassiumStatus === 'Optimal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {soilData.potassium} kg/ha ({nutrientStatus.potassiumStatus})
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${nutrientStatus.potassiumStatus === 'Optimal' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (soilData.potassium / 140) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 block text-right">Target Range: 50 - 110 kg/ha</span>
          </div>

          {/* pH Level */}
          <div className="space-y-2 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">pH Balance</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                nutrientStatus.phStatus === 'Optimal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {soilData.ph} ({nutrientStatus.phStatus})
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${nutrientStatus.phStatus === 'Optimal' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (soilData.ph / 10) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 block text-right">Optimal: 6.0 - 7.5</span>
          </div>

          {/* Soil Moisture */}
          <div className="space-y-2 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Moisture Content</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                nutrientStatus.moistureStatus === 'Optimal' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {soilData.moisture}% ({nutrientStatus.moistureStatus})
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all rounded-full"
                style={{ width: `${Math.min(100, soilData.moisture)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 block text-right">Optimal Range: 25 - 45%</span>
          </div>

          {/* Organic Carbon */}
          <div className="space-y-2 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Organic Carbon</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                nutrientStatus.organicCarbonStatus === 'High' || nutrientStatus.organicCarbonStatus === 'Medium' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {soilData.organic_matter}% ({nutrientStatus.organicCarbonStatus})
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all rounded-full"
                style={{ width: `${Math.min(100, (soilData.organic_matter / 3) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 block text-right">Target: &gt; 0.75%</span>
          </div>
        </div>
      </div>

      {/* Agronomic Recommendations */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Sprout className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-800">Agronomic Recommendations for {selectedCrop}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
            <h4 className="font-bold text-xs text-emerald-900 uppercase">Fertilizer & Nutrient Application Plan</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">{recommendations.fertilizerPlan}</p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1">
            <h4 className="font-bold text-xs text-blue-900 uppercase">pH Correction & Soil Conditioning</h4>
            <p className="text-xs text-blue-800 leading-relaxed">{recommendations.phCorrection}</p>
          </div>

          <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-100 space-y-1">
            <h4 className="font-bold text-xs text-cyan-900 uppercase">Irrigation & Soil Moisture Management</h4>
            <p className="text-xs text-cyan-800 leading-relaxed">{recommendations.irrigationStrategy}</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100 space-y-1">
            <h4 className="font-bold text-xs text-amber-900 uppercase">Organic Carbon Enrichment</h4>
            <p className="text-xs text-amber-800 leading-relaxed">{recommendations.soilConditioning}</p>
          </div>
        </div>
      </div>

      {/* ML & Module Connection Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ML Yield Prediction Connection */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-sm text-gray-800">ML Yield Prediction Connection</h4>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              mlImpacts.yieldImpactPercentage >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {mlImpacts.yieldImpactPercentage >= 0 ? `+${mlImpacts.yieldImpactPercentage}% Yield Impact` : `${mlImpacts.yieldImpactPercentage}% Yield Impact`}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{mlImpacts.yieldImpactDescription}</p>
        </div>

        {/* Disease Risk Trigger Connection */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h4 className="font-bold text-sm text-gray-800">Disease Risk Trigger Connection</h4>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              mlImpacts.diseaseRiskTrigger.riskLevel.includes('High') ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {mlImpacts.diseaseRiskTrigger.riskLevel}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{mlImpacts.diseaseRiskTrigger.description}</p>
        </div>
      </div>
    </div>
  );
};

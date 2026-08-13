import React, { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  Award,
  Calendar,
  RefreshCw,
  MapPin,
  Sliders,
  Sparkles,
  BarChart3,
  Layers,
  Sprout,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Database,
  X
} from 'lucide-react';
import { yieldService, YieldPredictionResult, PipelineFeatureValidation } from '../../services/yieldService';
import { soilService } from '../../services/soilService';
import { weatherService } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';

interface YieldPredictionModuleProps {
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
  const farmTitle = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Ghaziabad, Uttar Pradesh');

  const [prediction, setPrediction] = useState<YieldPredictionResult | null>(null);
  const [pipelineValidation, setPipelineValidation] = useState<PipelineFeatureValidation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [simN, setSimN] = useState<number>(70);
  const [simMoisture, setSimMoisture] = useState<number>(35);
  const [simPh, setSimPh] = useState<number>(6.5);
  const [simulatedYield, setSimulatedYield] = useState<number | null>(null);

  const runAutomatedPipeline = async () => {
    setLoading(true);
    setError('');

    try {
      const [soilRes, weatherRes] = await Promise.all([
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default_farm', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop)
      ]);

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

      const validation = yieldService.validatePipelineFeatures(featurePayload);
      setPipelineValidation(validation);

      setSimN(soil.nitrogen || 70);
      setSimMoisture(soil.moisture || 35);
      setSimPh(soil.ph || 6.5);

      const result = await yieldService.predictYield(featurePayload);
      setPrediction(result);
      setSimulatedYield(result.predictedYieldPerHectare);
    } catch (err: any) {
      console.error('Yield prediction error:', err);
      setError(err?.message || 'Failed to run yield prediction model.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAutomatedPipeline();
  }, [safeLat, safeLon, farmArea, selectedCrop]);

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
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Calculating agronomic yield prediction model...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800 font-sans">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Yield Prediction</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              {selectedCrop}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>{farmTitle}</span>
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
            onClick={() => setIsDetailModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Sensitivity Simulator</span>
          </button>

          <button
            type="button"
            onClick={runAutomatedPipeline}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh Prediction"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={runAutomatedPipeline} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* 2. Core Yield Decision Card */}
      {prediction && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            
            {/* Predicted Output */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Predicted Yield Output</span>
              <div className="text-4xl font-extrabold text-slate-900">
                {prediction.predictedYieldPerHectare} <span className="text-lg font-semibold text-slate-500">t/ha</span>
              </div>
              <div className="text-xs font-semibold text-emerald-700">
                Expected Production: <strong>{prediction.totalProductionTons} Tons</strong> ({farmArea} ha)
              </div>
            </div>

            {/* Confidence & Window */}
            <div className="space-y-2 pt-4 md:pt-0 md:pl-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Model Confidence & Target Date</span>
              <div className="text-xl font-bold text-slate-800">
                {prediction.confidenceScore}% Confidence Rate
              </div>
              <div className="text-xs text-slate-500">
                Harvest Window: <strong>{prediction.harvestWindow}</strong>
              </div>
            </div>

            {/* District Benchmark */}
            <div className="space-y-2 pt-4 md:pt-0 md:pl-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">District Benchmark Comparison</span>
              <div className="text-base font-bold text-slate-800">
                {prediction.regionalInsight}
              </div>
              <div className="text-xs text-slate-500">
                District Average: {prediction.regionalAvg} t/ha
              </div>
            </div>

          </div>

          {/* Factor Contribution Breakdown */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Agronomic Contribution Factors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {prediction.featureImportance.map((feat, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{feat.feature}</span>
                    <span className="text-emerald-700">+{feat.weight}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Historical Comparison */}
      {prediction && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Historical Yield Comparison ({selectedCrop})</h3>
          <div className="space-y-2 text-xs">
            {prediction.historicalSeries.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1">
                <span className={item.isCurrent ? 'font-bold text-emerald-700' : 'text-slate-600'}>{item.year}</span>
                <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.isCurrent ? 'bg-emerald-600' : 'bg-slate-300'}`} style={{ width: `${(item.yield / 8) * 100}%` }} />
                </div>
                <span className="font-semibold text-slate-800">{item.yield} t/ha</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIMULATOR MODAL */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Agronomic Sensitivity Simulator</h3>
              <button type="button" onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Soil Nitrogen (N): {simN} kg/ha</label>
                <input type="range" min="30" max="120" value={simN} onChange={(e) => handleSliderChange(Number(e.target.value), simMoisture, simPh)} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Soil Moisture: {simMoisture}%</label>
                <input type="range" min="15" max="60" value={simMoisture} onChange={(e) => handleSliderChange(simN, Number(e.target.value), simPh)} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Soil pH Level: {simPh}</label>
                <input type="range" min="5.0" max="8.5" step="0.1" value={simPh} onChange={(e) => handleSliderChange(simN, simMoisture, Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600" />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="font-semibold text-slate-700">Simulated Output Yield:</span>
                <span className="text-base font-bold text-emerald-800">{simulatedYield} t/ha</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setIsDetailModalOpen(false)} className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

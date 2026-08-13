import React, { useState, useEffect } from 'react';
import {
  Bug,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Droplets,
  Thermometer,
  Activity,
  RefreshCw,
  MapPin,
  Sprout,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Database
} from 'lucide-react';
import { diseaseRiskService, DiseaseRiskResult } from '../../services/diseaseRiskService';
import { soilService } from '../../services/soilService';
import { weatherService } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';

interface DiseaseRiskModuleProps {
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

export const DiseaseRiskModule: React.FC<DiseaseRiskModuleProps> = ({
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
  const farmTitle = farm?.farm_name || 'AgriSense Registered Plot';

  const rawCity = location?.city && location.city !== 'Unknown Location' ? location.city : null;
  const locationLabel = farm?.location_name || (rawCity ? `${rawCity}${location?.state ? `, ${location.state}` : ''}` : 'Ghaziabad, Uttar Pradesh');

  const [riskData, setRiskData] = useState<DiseaseRiskResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const runAutomatedDiseasePipeline = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Gather Telemetry from Weather & Soil Modules
      const [soilRes, weatherRes] = await Promise.all([
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default_farm', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop)
      ]);

      const soil = soilRes.soilData;
      const weather = weatherRes.current;

      // 2. Build 9-Feature Automated Telemetry Payload
      const payload = {
        crop: selectedCrop,
        latitude: safeLat,
        longitude: safeLon,
        weatherData: {
          temperature_c: weather.temperature_c,
          relative_humidity: weather.relative_humidity,
          precipitation_mm: weather.precipitation_mm
        },
        soilData: {
          moisture: soil.moisture,
          ph: soil.ph,
          nitrogen: soil.nitrogen,
          phosphorus: soil.phosphorus,
          potassium: soil.potassium
        },
        gdd: 1450
      };

      // 3. Predict Disease & Pest Risk via Random Forest Classifier Engine
      const result = await diseaseRiskService.predictDiseaseRisk(payload);
      setRiskData(result);
    } catch (err: any) {
      console.error('Disease Risk Pipeline Error:', err);
      setError(err?.message || 'Failed to compute Random Forest disease risk prediction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAutomatedDiseasePipeline();
  }, [safeLat, safeLon, selectedCrop]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-semibold text-gray-800">Evaluating Micro-climate Disease & Pest Risks...</h3>
        <p className="text-xs text-gray-500">Querying Random Forest Classifier with weather & soil telemetry at {locationLabel}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-red-900 to-amber-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-rose-200 text-xs font-semibold backdrop-blur-md">
              <Bug className="w-3.5 h-3.5" /> Random Forest Pathogen Classifier Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {farmTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-rose-100">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-rose-300" />
                {locationLabel} ({safeLat.toFixed(4)}, {safeLon.toFixed(4)})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <Sprout className="w-3.5 h-3.5" /> Crop: {selectedCrop}
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold text-[11px]">
                Plot Area: {farmArea} Hectares
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={runAutomatedDiseasePipeline}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all border border-white/20 shadow-sm flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh Pathogen Classification"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Risk Pipeline
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-xs text-rose-800 font-semibold">{error}</p>
        </div>
      )}

      {riskData && (
        <>
          {/* Main Risk Overview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Risk Score Meter Card */}
            <div className="p-6 bg-white rounded-3xl border border-rose-100 shadow-md space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Pathogen Pressure</span>
                <Activity className="w-5 h-5 text-rose-600" />
              </div>

              <div className="text-center py-2 space-y-1">
                <div className="text-5xl font-black tracking-tight text-gray-900">
                  {riskData.overallRiskScore}<span className="text-2xl text-rose-600">%</span>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${
                  riskData.riskLevel === 'Critical' ? 'bg-rose-600 text-white' :
                  riskData.riskLevel === 'High' ? 'bg-rose-100 text-rose-800' :
                  riskData.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {riskData.riskLevel} Risk Level
                </span>
              </div>

              {/* Progress gauge bar */}
              <div className="space-y-1">
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      riskData.overallRiskScore >= 75 ? 'bg-rose-600' :
                      riskData.overallRiskScore >= 55 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${riskData.overallRiskScore}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-medium block text-right">Random Forest Regressor Rating</span>
              </div>
            </div>

            {/* Actionable Agronomic Recommendation Card */}
            <div className="md:col-span-2 p-6 rounded-3xl border shadow-md flex flex-col justify-between space-y-4 bg-white border-rose-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                  {riskData.actionType === 'treatment' ? <ShieldAlert className="w-6 h-6 text-rose-600" /> : <ShieldCheck className="w-6 h-6 text-emerald-600" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Agronomic Action Plan</span>
                  <h3 className="text-base font-bold text-gray-800">
                    {riskData.actionType === 'treatment' ? 'Targeted Field Action Recommended' : 'Routine Monitoring Active'}
                  </h3>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {riskData.recommendation}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>Pesticide Policy: <strong className="text-gray-700">Apply only when risk &gt; 60%</strong></span>
                <span className="font-semibold text-emerald-700">✓ Organic Bio-control First</span>
              </div>
            </div>
          </div>

          {/* Individual Disease & Pest Risks Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Bug className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-800">Individual Pathogen & Insect Pest Breakdown</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">{selectedCrop} Pathogens</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {riskData.individualRisks.map((pathogen, idx) => (
                <div key={`pathogen-${idx}`} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white border text-gray-700 shadow-xs">
                      {pathogen.type}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      pathogen.severity === 'Critical' ? 'bg-rose-600 text-white' :
                      pathogen.severity === 'High' ? 'bg-rose-100 text-rose-800' :
                      pathogen.severity === 'Medium' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {pathogen.severity}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-800">{pathogen.disease}</h4>
                    <div className="text-2xl font-black text-gray-900 mt-1">
                      {pathogen.riskScorePct}<span className="text-xs text-gray-500 font-medium"> % Risk</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pathogen.riskScorePct >= 75 ? 'bg-rose-600' :
                        pathogen.riskScorePct >= 55 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pathogen.riskScorePct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Micro-climate Contributing Factors & 7-Day Trend Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Contributing Factors Card */}
            <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-800">Main Micro-Climate Contributing Factors</h3>
                </div>
                <span className="text-xs text-gray-400 font-medium">Environmental Drivers</span>
              </div>

              <div className="space-y-3">
                {riskData.contributingFactors.map((factor, idx) => (
                  <div key={`factor-${idx}`} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800">{factor.factor}</span>
                      <span className="font-bold text-rose-700 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100">
                        {factor.impact}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{factor.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Historical 7-Day Disease Risk Trend Visualizer */}
            <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-800">Historical 7-Day Pathogen Risk Trajectory</h3>
                </div>
                <span className="text-xs text-gray-400 font-medium">7-Day Curve</span>
              </div>

              <div className="space-y-3 pt-2">
                {riskData.historicalTrend.map((pt, idx) => (
                  <div key={`trend-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={idx === 6 ? 'text-rose-700 font-extrabold flex items-center gap-1' : 'text-gray-600'}>
                        {pt.day} ({pt.date}) {idx === 6 && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                      </span>
                      <span className={idx === 6 ? 'text-rose-800 font-extrabold' : 'text-gray-700'}>
                        {pt.riskScorePct}% Risk
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          idx === 6 ? 'bg-gradient-to-r from-rose-500 to-amber-600' : 'bg-gray-300'
                        }`}
                        style={{ width: `${pt.riskScorePct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

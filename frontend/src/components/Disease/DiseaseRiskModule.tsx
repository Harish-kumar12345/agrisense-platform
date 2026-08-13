import React, { useState, useEffect } from 'react';
import {
  Bug,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Sprout,
  X,
  Search,
  ChevronRight
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
  const farmTitle = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Ghaziabad, Uttar Pradesh');

  const [riskData, setRiskData] = useState<DiseaseRiskResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  const runAutomatedDiseasePipeline = async () => {
    setLoading(true);
    setError('');

    try {
      const [soilRes, weatherRes] = await Promise.all([
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default_farm', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop)
      ]);

      const soil = soilRes.soilData;
      const weather = weatherRes.current;

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

      const result = await diseaseRiskService.predictDiseaseRisk(payload);
      setRiskData(result);
    } catch (err: any) {
      console.error('Disease Risk Error:', err);
      setError(err?.message || 'Failed to compute disease risk model.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAutomatedDiseasePipeline();
  }, [safeLat, safeLon, selectedCrop]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Evaluating field pathogen & disease risk levels...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800 font-sans">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Disease & Pest Incidents</h1>
            {riskData && (
              <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${
                riskData.riskLevel === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                riskData.riskLevel === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                riskData.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {riskData.riskLevel} Risk Level ({riskData.overallRiskScore}%)
              </span>
            )}
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
            onClick={runAutomatedDiseasePipeline}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh Risk Model"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={runAutomatedDiseasePipeline} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* 2. Actionable Risk Overview Banner */}
      {riskData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Primary Action Plan</span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{riskData.recommendation}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIncident(riskData.individualRisks[0])}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm self-start sm:self-auto"
            >
              Inspect Field Now
            </button>
          </div>

          {/* Individual Disease Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tracked Pathogen Risk Levels</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Disease / Pathogen</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Risk Score</th>
                    <th className="py-2.5 px-3 text-center">Severity</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riskData.individualRisks.map((pathogen, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{pathogen.disease}</td>
                      <td className="py-3 px-3 text-slate-500">{pathogen.type}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">{pathogen.riskScorePct}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          pathogen.severity === 'Critical' || pathogen.severity === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          pathogen.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {pathogen.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedIncident(pathogen)}
                          className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                        >
                          Details
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

      {/* 3. Micro-climate Contributing Factors */}
      {riskData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Environmental Risk Factors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {riskData.contributingFactors.map((factor, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>{factor.factor}</span>
                  <span className="text-rose-700 font-bold">{factor.impact}</span>
                </div>
                <p className="text-[11px] text-slate-500">{factor.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INCIDENT INSPECTION MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Field Inspection Protocol: {selectedIncident.disease}</h3>
              <button type="button" onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-slate-600">
              <div className="flex justify-between items-center py-1">
                <span>Pathogen Category:</span>
                <strong className="text-slate-900">{selectedIncident.type}</strong>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span>Calculated Risk Probability:</span>
                <strong className="text-rose-700">{selectedIncident.riskScorePct}% ({selectedIncident.severity})</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-900 block">Agronomic Checklist:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-500">
                  <li>Inspect lower leaf canopy for fungal lesions/spots.</li>
                  <li>Check leaf wetness duration post-irrigation.</li>
                  <li>Consider copper fungicide / bio-control spray if lesions exceed 5% foliage.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedIncident(null)} className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

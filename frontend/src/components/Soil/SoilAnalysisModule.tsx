import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  MapPin,
  FlaskConical,
  Edit3,
  RotateCcw,
  Save
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
  const rawLat = farm?.latitude ?? location?.latitude ?? 28.6692;
  const rawLon = farm?.longitude ?? location?.longitude ?? 77.4538;
  const safeLat = isNaN(Number(rawLat)) ? 28.6692 : Number(rawLat);
  const safeLon = isNaN(Number(rawLon)) ? 77.4538 : Number(rawLon);
  const farmId = farm?.farm_id || 'default_farm';
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmTitle = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location ? `${location.city}, ${location.country}` : 'Ghaziabad, Uttar Pradesh');

  const [analysis, setAnalysis] = useState<ComprehensiveSoilAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showEditForm, setShowEditForm] = useState<boolean>(false);

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
    setError('');
    try {
      const data = await soilService.getSoilAnalysis(safeLat, safeLon, farmId, selectedCrop);
      setAnalysis(data);

      if (data && data.soilData) {
        setInputN(data.soilData.nitrogen || 70);
        setInputP(data.soilData.phosphorus || 50);
        setInputK(data.soilData.potassium || 80);
        setInputPh(data.soilData.ph || 6.5);
        setInputMoisture(data.soilData.moisture || 35);
        setInputOrganic(data.soilData.organic_matter || 1.8);
        setInputSoilType(data.soilData.type || 'Clay Loam');
      }
    } catch (err: any) {
      console.error('Soil load error:', err);
      setError(err?.message || 'Failed to load soil analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSoil();
  }, [safeLat, safeLon, farmId, selectedCrop]);

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
    setSaveSuccess('Lab soil test values updated!');
    setShowEditForm(false);
    loadSoil();
  };

  const handleResetToSensor = () => {
    soilService.resetSoilTest(farmId);
    setSaveSuccess('Reset to geospatial estimates.');
    setShowEditForm(false);
    loadSoil();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Analyzing soil NPK and chemistry parameters...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error || 'Unable to load soil analysis.'}</span>
          <button type="button" onClick={loadSoil} className="font-bold underline">Retry</button>
        </div>
      </div>
    );
  }

  const { soilData, healthScore, suitabilityRating, nutrientStatus, recommendations } = analysis;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800 font-sans">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Soil Health & NPK Analysis</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              Score: {healthScore}/100
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>{farmTitle}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {locationLabel}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEditForm(!showEditForm)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>{showEditForm ? 'Close Form' : 'Update Soil Test'}</span>
          </button>

          <button
            type="button"
            onClick={loadSoil}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Edit Form */}
      {showEditForm && (
        <form onSubmit={handleSaveLabTest} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <h3 className="font-bold text-slate-900">Lab Soil Test Results Input</h3>
            <button type="button" onClick={handleResetToSensor} className="text-rose-600 font-semibold hover:underline">
              Reset to Satellite Estimates
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">Nitrogen (N kg/ha)</label>
              <input type="number" value={inputN} onChange={(e) => setInputN(Number(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold" />
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-medium">Phosphorus (P kg/ha)</label>
              <input type="number" value={inputP} onChange={(e) => setInputP(Number(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold" />
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-medium">Potassium (K kg/ha)</label>
              <input type="number" value={inputK} onChange={(e) => setInputK(Number(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold" />
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-medium">pH Level</label>
              <input type="number" step="0.1" value={inputPh} onChange={(e) => setInputPh(Number(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowEditForm(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-600 text-white font-semibold rounded-lg">Save Values</button>
          </div>
        </form>
      )}

      {/* 2. Compact Primary Soil Parameters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Nitrogen (N)</span>
          <div className="text-xl font-bold text-slate-900">{soilData.nitrogen} kg/ha</div>
          <span className="text-[11px] text-slate-500">{nutrientStatus.nitrogenStatus}</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Phosphorus (P)</span>
          <div className="text-xl font-bold text-slate-900">{soilData.phosphorus} kg/ha</div>
          <span className="text-[11px] text-slate-500">{nutrientStatus.phosphorusStatus}</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Potassium (K)</span>
          <div className="text-xl font-bold text-slate-900">{soilData.potassium} kg/ha</div>
          <span className="text-[11px] text-slate-500">{nutrientStatus.potassiumStatus}</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">pH & Moisture</span>
          <div className="text-lg font-bold text-slate-900">{soilData.ph} pH • {soilData.moisture}%</div>
          <span className="text-[11px] text-slate-500">{soilData.type}</span>
        </div>
      </div>

      {/* 3. Agronomic Soil Management Plan */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Soil Management & Fertilizer Plan for {selectedCrop}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-semibold text-slate-900 block">Fertilizer Recommendation:</span>
            <p className="text-slate-600 leading-relaxed">{recommendations.fertilizerPlan}</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-semibold text-slate-900 block">pH & Soil Conditioning:</span>
            <p className="text-slate-600 leading-relaxed">{recommendations.phCorrection}</p>
          </div>
        </div>
      </div>

    </div>
  );
};

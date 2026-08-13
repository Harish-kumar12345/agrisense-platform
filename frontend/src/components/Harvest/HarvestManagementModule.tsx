import React, { useState, useEffect } from 'react';
import {
  Tractor,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  Filter,
  RefreshCw,
  MapPin,
  Sprout,
  Sparkles,
  Droplets,
  FlaskConical,
  Bug,
  ShieldAlert,
  Info,
  X,
  FileText,
  Users,
  Warehouse,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  farmActivityService,
  FarmActivity,
  ActivityType,
  HarvestStatus,
  HarvestAlert
} from '../../services/farmActivityService';
import { yieldService, YieldPredictionResult } from '../../services/yieldService';
import { soilService } from '../../services/soilService';
import { weatherService } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';

interface HarvestManagementModuleProps {
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

export const HarvestManagementModule: React.FC<HarvestManagementModuleProps> = ({
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
  const farmName = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Ghaziabad, Uttar Pradesh');

  const [activeSegment, setActiveSegment] = useState<'harvest' | 'planning' | 'timeline' | 'alerts'>('harvest');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [weatherTelemetry, setWeatherTelemetry] = useState({ temperature_c: 28, precipitation_mm: 12, humidity_pct: 75 });
  const [yieldResult, setYieldResult] = useState<YieldPredictionResult | null>(null);
  const [activities, setActivities] = useState<FarmActivity[]>([]);
  const [alerts, setAlerts] = useState<HarvestAlert[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  const [manualHarvestDate, setManualHarvestDate] = useState<string>('');
  const [isAdjustDateModalOpen, setIsAdjustDateModalOpen] = useState<boolean>(false);
  const [tempManualDate, setTempManualDate] = useState<string>('');

  const [labourWorkers, setLabourWorkers] = useState<number>(12);
  const [harvestNotes, setHarvestNotes] = useState<string>('Combine harvester requested for peak moisture window.');
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: 'c1', text: 'Book combine harvester / threshing machinery', done: true },
    { id: 'c2', text: 'Calibrate digital grain moisture meter', done: true },
    { id: 'c3', text: 'Sanitize & dry warehouse storage floor', done: false },
    { id: 'c4', text: 'Procure 50kg HDPE/gunny bags', done: false },
    { id: 'c5', text: 'Arrange local mandi transport vehicle', done: false }
  ]);

  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<FarmActivity | null>(null);

  const [formData, setFormData] = useState({
    field_name: farmName,
    crop: selectedCrop,
    activity_type: 'Sowing' as ActivityType,
    date: new Date().toISOString().split('T')[0],
    quantity_details: '',
    notes: ''
  });

  const [computedStatus, setComputedStatus] = useState<{
    growthStage: string;
    expectedHarvestDate: string;
    manualHarvestDate: string | null;
    harvestWindow: string;
    status: HarvestStatus;
    daysToHarvest: number;
    gddAccumulated: number;
    gddThreshold: number;
    gddPercentage: number;
    requiredLabour: number;
    storageRequirementSqft: number;
    storageBagsCount: number;
    storageMoistureTargetPct: number;
    totalProductionTons: number;
  }>({
    growthStage: 'Ripening & Grain Filling',
    expectedHarvestDate: 'Nov 5, 2026',
    manualHarvestDate: null,
    harvestWindow: 'Oct 28 - Nov 10, 2026',
    status: 'Approaching',
    daysToHarvest: 18,
    gddAccumulated: 1450,
    gddThreshold: 1600,
    gddPercentage: 85,
    requiredLabour: 12,
    storageRequirementSqft: 180,
    storageBagsCount: 240,
    storageMoistureTargetPct: 13.5,
    totalProductionTons: 12.0
  });

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [acts, alrts, soilRes, weatherRes, existingHarvestRecords] = await Promise.all([
        farmActivityService.getActivities(farm?.farm_id || 'farm_demo_1', selectedCrop),
        farmActivityService.getAlerts(),
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default_farm', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop),
        farmActivityService.getHarvestRecords(farm?.farm_id || 'farm_demo_1', selectedCrop)
      ]);

      setActivities(acts);
      setAlerts(alrts);

      const soil = soilRes.soilData;
      const weather = weatherRes.current;
      setWeatherTelemetry({ temperature_c: weather.temperature_c, precipitation_mm: weather.precipitation_mm, humidity_pct: weather.relative_humidity });

      const savedRecord = existingHarvestRecords.find(r => r.crop.toLowerCase() === selectedCrop.toLowerCase());
      if (savedRecord?.manual_harvest_date) {
        setManualHarvestDate(new Date(savedRecord.manual_harvest_date).toISOString().split('T')[0]);
      }

      const sowingAct = acts.find(a => a.activity_type === 'Sowing');
      const sowingDate = sowingAct ? sowingAct.date : new Date(Date.now() - 65 * 86400000).toISOString();

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

      const statusInfo = farmActivityService.calculateHarvestStatus(
        selectedCrop,
        sowingDate,
        0,
        yResult.predictedYieldPerHectare,
        farmArea,
        weather.temperature_c,
        savedRecord?.manual_harvest_date || manualHarvestDate
      );

      setComputedStatus(statusInfo);
      setLabourWorkers(savedRecord?.required_labour || statusInfo.requiredLabour);
      if (savedRecord?.notes) setHarvestNotes(savedRecord.notes);

    } catch (err: any) {
      console.error('Error loading Harvest Management data:', err);
      setError(err?.message || 'Failed to load harvest telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [safeLat, safeLon, farmArea, selectedCrop]);

  const handleSaveManualDate = async () => {
    setManualHarvestDate(tempManualDate);
    setIsAdjustDateModalOpen(false);

    try {
      const statusInfo = farmActivityService.calculateHarvestStatus(
        selectedCrop,
        activities.find(a => a.activity_type === 'Sowing')?.date,
        computedStatus.gddAccumulated,
        yieldResult?.predictedYieldPerHectare || 4.8,
        farmArea,
        weatherTelemetry.temperature_c,
        tempManualDate
      );
      setComputedStatus(statusInfo);
    } catch (e) {}
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const handleOpenAddModal = () => {
    setEditingActivity(null);
    setFormData({
      field_name: farmName,
      crop: selectedCrop,
      activity_type: 'Sowing',
      date: new Date().toISOString().split('T')[0],
      quantity_details: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.crop || !formData.activity_type) return;

    try {
      if (editingActivity) {
        const updated = await farmActivityService.updateActivity(editingActivity.activity_id, {
          field_name: formData.field_name,
          crop: formData.crop,
          activity_type: formData.activity_type,
          date: new Date(formData.date).toISOString(),
          quantity_details: formData.quantity_details,
          notes: formData.notes
        });
        setActivities(prev => prev.map(a => a.activity_id === updated.activity_id ? updated : a));
      } else {
        const added = await farmActivityService.addActivity({
          farm_id: farm?.farm_id || 'farm_demo_1',
          field_name: formData.field_name,
          crop: formData.crop,
          activity_type: formData.activity_type,
          date: new Date(formData.date).toISOString(),
          quantity_details: formData.quantity_details,
          notes: formData.notes
        });
        setActivities(prev => [added, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Failed to save activity');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await farmActivityService.deleteActivity(activityId);
      setActivities(prev => prev.filter(a => a.activity_id !== activityId));
    } catch (err) {}
  };

  const filteredActivities = filterType === 'ALL'
    ? activities
    : activities.filter(a => a.activity_type === filterType);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading harvest schedule...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800 font-sans">
      
      {/* 1. Page Header (Clean Product Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Harvest Planning</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
              {computedStatus.status}
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
            onClick={() => {
              setTempManualDate(manualHarvestDate || new Date().toISOString().split('T')[0]);
              setIsAdjustDateModalOpen(true);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Adjust Date</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Activity</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Operational Summary Bar (No Multi-Colored Box Grids) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Expected Harvest Date</span>
          <div className="text-xl font-bold text-slate-900">
            {computedStatus.manualHarvestDate ? computedStatus.manualHarvestDate : computedStatus.expectedHarvestDate}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">{computedStatus.daysToHarvest} days remaining</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Optimal Window</span>
          <div className="text-sm font-bold text-slate-800">{computedStatus.harvestWindow}</div>
          <span className="text-[11px] text-slate-500">Target Moisture: {computedStatus.storageMoistureTargetPct}%</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Growth Maturity</span>
          <div className="text-lg font-bold text-slate-800">{computedStatus.gddPercentage}% ({computedStatus.gddAccumulated} GDD)</div>
          <span className="text-[11px] text-slate-500">{computedStatus.growthStage}</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Predicted Output</span>
          <div className="text-xl font-bold text-slate-900">{yieldResult ? yieldResult.totalProductionTons : 12.0} Tons</div>
          <span className="text-[11px] text-slate-500">({yieldResult?.predictedYieldPerHectare || 4.8} tons/ha)</span>
        </div>
      </div>

      {/* 3. Segment Controls */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSegment('harvest')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSegment === 'harvest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Harvest Schedule
        </button>

        <button
          type="button"
          onClick={() => setActiveSegment('planning')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSegment === 'planning' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Labour & Storage
        </button>

        <button
          type="button"
          onClick={() => setActiveSegment('timeline')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSegment === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Activity Log ({activities.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSegment('alerts')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSegment === 'alerts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Alerts ({alerts.length})
        </button>
      </div>

      {/* SEGMENT 1: HARVEST SCHEDULE */}
      {activeSegment === 'harvest' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Growth Stage Timeline</h3>
              <p className="text-xs text-slate-500">Current progress towards harvest maturity</p>
            </div>
            <span className="text-xs font-medium text-slate-600">GDD Progress: {computedStatus.gddPercentage}%</span>
          </div>

          {/* Simple Progress Bar */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${computedStatus.gddPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-5 text-center text-[11px] font-medium text-slate-500 pt-1">
              <span className={computedStatus.gddPercentage >= 10 ? 'text-slate-900 font-semibold' : ''}>Sowing</span>
              <span className={computedStatus.gddPercentage >= 30 ? 'text-slate-900 font-semibold' : ''}>Tillering</span>
              <span className={computedStatus.gddPercentage >= 55 ? 'text-slate-900 font-semibold' : ''}>Flowering</span>
              <span className={computedStatus.gddPercentage >= 75 ? 'text-slate-900 font-semibold' : ''}>Grain Filling</span>
              <span className={computedStatus.gddPercentage >= 90 ? 'text-emerald-700 font-bold' : ''}>Harvest Ready</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Target Moisture: <strong>{computedStatus.storageMoistureTargetPct}%</strong></span>
            <button
              type="button"
              onClick={() => setIsStrategyModalOpen(true)}
              className="text-emerald-700 hover:underline font-semibold"
            >
              View Harvest Strategy →
            </button>
          </div>
        </div>
      )}

      {/* SEGMENT 2: LABOUR & STORAGE */}
      {activeSegment === 'planning' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Labour Planning */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Labour & Machinery Requirements</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Estimated Field Workforce:</span>
                <span className="font-bold text-slate-900">{labourWorkers} Workers</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-600">Plot Workload Density:</span>
                <span className="font-semibold text-slate-800">~{(labourWorkers / farmArea).toFixed(1)} workers / hectare</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-600">Recommended Machinery:</span>
                <span className="font-semibold text-slate-800">Combine Harvester (Dry soil)</span>
              </div>
            </div>
          </div>

          {/* Storage Planning */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Storage & Post-Harvest Logistics</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Warehouse Space Needed:</span>
                <span className="font-bold text-slate-900">{computedStatus.storageRequirementSqft} sq ft</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-600">Bag Capacity (50kg):</span>
                <span className="font-semibold text-slate-800">{computedStatus.storageBagsCount} Bags</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-600">Target Moisture Threshold:</span>
                <span className="font-semibold text-emerald-700">{computedStatus.storageMoistureTargetPct}%</span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Pre-Harvest Readiness Checklist</h3>
            <div className="space-y-2">
              {checklist.map(item => (
                <div key={item.id} onClick={() => handleToggleChecklist(item.id)} className="flex items-center gap-2 cursor-pointer text-xs py-1">
                  {item.done ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                  <span className={item.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEGMENT 3: ACTIVITY LOG TABLE */}
      {activeSegment === 'timeline' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-0">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Recorded Field Activities</span>
            <button type="button" onClick={handleOpenAddModal} className="text-xs text-emerald-700 font-bold hover:underline">
              + Log New Activity
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Activity Type</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-4">Notes</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((act) => (
                  <tr key={act.activity_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {new Date(act.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{act.activity_type}</td>
                    <td className="py-3 px-4 text-slate-600">{act.quantity_details || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{act.notes || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act.activity_id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEGMENT 4: ALERTS */}
      {activeSegment === 'alerts' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Harvest Reminders</h3>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">No active harvest alerts.</div>
            ) : (
              alerts.map((alr) => (
                <div key={alr.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{alr.title}</span>
                    <p className="text-slate-500 mt-0.5">{alr.description}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-semibold rounded">{alr.severity}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADJUST HARVEST DATE */}
      {isAdjustDateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Adjust Planned Harvest Date</h3>
              <button type="button" onClick={() => setIsAdjustDateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Planned Date</label>
                <input
                  type="date"
                  value={tempManualDate}
                  onChange={(e) => setTempManualDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg text-slate-500 text-[11px]">
                AI Estimated Date: <strong>{computedStatus.expectedHarvestDate}</strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAdjustDateModalOpen(false)} className="px-3 py-1.5 text-slate-600">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveManualDate} className="px-4 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg">
                  Save Planned Date
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD ACTIVITY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Log Farm Activity</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Activity Type</label>
                <select
                  value={formData.activity_type}
                  onChange={(e) => setFormData({ ...formData, activity_type: e.target.value as ActivityType })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="Sowing">Sowing</option>
                  <option value="Irrigation">Irrigation</option>
                  <option value="Fertilization">Fertilization</option>
                  <option value="Pesticide Application">Pesticide Application</option>
                  <option value="Weeding">Weeding</option>
                  <option value="Harvesting">Harvesting</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Details / Quantity</label>
                <input
                  type="text"
                  placeholder="e.g. 50 kg Urea applied"
                  value={formData.quantity_details}
                  onChange={(e) => setFormData({ ...formData, quantity_details: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg">
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STRATEGY MODAL */}
      {isStrategyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Harvest Strategy Recommendations</h3>
              <button type="button" onClick={() => setIsStrategyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-slate-600 leading-relaxed">
              <p>Current GDD progress is <strong>{computedStatus.gddPercentage}%</strong>. Field moisture is optimal for maturity.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Stop flooding irrigation 10-14 days prior to harvest.</li>
                <li>Calibrate grain moisture meters for target {computedStatus.storageMoistureTargetPct}%.</li>
                <li>Ensure warehouse floor drying before storage.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setIsStrategyModalOpen(false)} className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

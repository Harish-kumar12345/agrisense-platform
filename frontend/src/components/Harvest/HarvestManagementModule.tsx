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
  ChevronRight,
  Info,
  X,
  FileText,
  Users,
  Warehouse,
  Package,
  Sliders,
  Bot,
  ArrowRight,
  CheckSquare,
  Square,
  Thermometer,
  CloudRain
} from 'lucide-react';
import {
  farmActivityService,
  FarmActivity,
  ActivityType,
  HarvestRecord,
  HarvestStatus,
  HarvestAlert,
  CROP_HARVEST_SPECS
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
  // Extract farm parameters
  const rawLat = farm?.latitude ?? location?.latitude ?? 28.6692;
  const rawLon = farm?.longitude ?? location?.longitude ?? 77.4538;
  const safeLat = isNaN(Number(rawLat)) ? 28.6692 : Number(rawLat);
  const safeLon = isNaN(Number(rawLon)) ? 77.4538 : Number(rawLon);
  const farmArea = farm?.area_hectares || 2.5;
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmName = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Ghaziabad, Uttar Pradesh');

  // Active View Tab: 'harvest' | 'planning' | 'timeline' | 'alerts'
  const [activeTab, setActiveTab] = useState<'harvest' | 'planning' | 'timeline' | 'alerts'>('harvest');

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Telemetry & Weather State
  const [weatherTelemetry, setWeatherTelemetry] = useState<{
    temperature_c: number;
    precipitation_mm: number;
    humidity_pct: number;
  }>({
    temperature_c: 28,
    precipitation_mm: 12,
    humidity_pct: 75
  });

  // ML Yield & Telemetry State
  const [yieldResult, setYieldResult] = useState<YieldPredictionResult | null>(null);

  // Activities & Harvest State
  const [activities, setActivities] = useState<FarmActivity[]>([]);
  const [alerts, setAlerts] = useState<HarvestAlert[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Farmer Manual Date Override State
  const [manualHarvestDate, setManualHarvestDate] = useState<string>('');
  const [isAdjustDateModalOpen, setIsAdjustDateModalOpen] = useState<boolean>(false);
  const [tempManualDate, setTempManualDate] = useState<string>('');

  // Planning Info State
  const [labourWorkers, setLabourWorkers] = useState<number>(12);
  const [harvestNotes, setHarvestNotes] = useState<string>('Combine harvester requested for peak moisture window.');
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: 'c1', text: 'Book combine harvester / threshing machinery', done: true },
    { id: 'c2', text: 'Calibrate digital grain moisture meter', done: true },
    { id: 'c3', text: 'Sanitize & dry warehouse storage floor', done: false },
    { id: 'c4', text: 'Procure 50kg HDPE/gunny bags', done: false },
    { id: 'c5', text: 'Arrange local mandi transport vehicle', done: false }
  ]);

  // AI Advisor Consultation Modal State
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);
  const [aiAdviceContent, setAiAdviceContent] = useState<string>('');

  // Form Drawer / Modal State for Add / Edit Activity
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<FarmActivity | null>(null);

  // Activity Form Fields
  const [formData, setFormData] = useState({
    field_name: farmName,
    crop: selectedCrop,
    activity_type: 'Sowing' as ActivityType,
    date: new Date().toISOString().split('T')[0],
    quantity_details: '',
    notes: ''
  });

  // Harvest Status Computed Values
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

  // Load telemetry, run AI yield prediction engine & fetch activity timeline
  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Fetch activities, alerts, soil analysis, and live weather telemetry
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
      setWeatherTelemetry({
        temperature_c: weather.temperature_c,
        precipitation_mm: weather.precipitation_mm,
        humidity_pct: weather.relative_humidity
      });

      // Existing saved harvest record if available
      const savedRecord = existingHarvestRecords.find(r => r.crop.toLowerCase() === selectedCrop.toLowerCase());
      if (savedRecord?.manual_harvest_date) {
        const mDate = new Date(savedRecord.manual_harvest_date).toISOString().split('T')[0];
        setManualHarvestDate(mDate);
      }

      // 2. Find latest Sowing activity date if recorded
      const sowingAct = acts.find(a => a.activity_type === 'Sowing');
      const sowingDate = sowingAct ? sowingAct.date : new Date(Date.now() - 65 * 86400000).toISOString();

      // 3. Build AI Yield Prediction Payload using existing ML pipeline
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

      // 4. Calculate Dynamic Harvest Status with Weather Telemetry GDD
      const statusInfo = farmActivityService.calculateHarvestStatus(
        selectedCrop,
        sowingDate,
        0, // Let calculateHarvestStatus compute real GDD from temperature telemetry
        yResult.predictedYieldPerHectare,
        farmArea,
        weather.temperature_c,
        savedRecord?.manual_harvest_date || manualHarvestDate
      );

      setComputedStatus(statusInfo);
      setLabourWorkers(savedRecord?.required_labour || statusInfo.requiredLabour);
      if (savedRecord?.notes) setHarvestNotes(savedRecord.notes);

      // 5. Save/Sync harvest record backend
      await farmActivityService.saveHarvestRecord({
        farm_id: farm?.farm_id || 'farm_demo_1',
        field_name: farmName,
        crop: selectedCrop,
        area_hectares: farmArea,
        predicted_yield_tha: yResult.predictedYieldPerHectare,
        expected_production_tons: yResult.totalProductionTons,
        current_gdd: statusInfo.gddAccumulated,
        growth_stage: statusInfo.growthStage,
        sowing_date: sowingDate,
        expected_harvest_date: statusInfo.expectedHarvestDate,
        manual_harvest_date: savedRecord?.manual_harvest_date || manualHarvestDate || null,
        harvest_window: statusInfo.harvestWindow,
        status: statusInfo.status,
        required_labour: savedRecord?.required_labour || statusInfo.requiredLabour,
        storage_requirement_sqft: statusInfo.storageRequirementSqft,
        storage_bags_count: statusInfo.storageBagsCount,
        storage_moisture_target_pct: statusInfo.storageMoistureTargetPct,
        notes: harvestNotes
      });

    } catch (err: any) {
      console.error('Error loading Harvest Management telemetry:', err);
      setError(err?.message || 'Failed to load harvest telemetry and farm activities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [safeLat, safeLon, farmArea, selectedCrop]);

  // Handle Save Manual Planned Harvest Date
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

      await farmActivityService.saveHarvestRecord({
        farm_id: farm?.farm_id || 'farm_demo_1',
        field_name: farmName,
        crop: selectedCrop,
        area_hectares: farmArea,
        predicted_yield_tha: yieldResult?.predictedYieldPerHectare || 4.8,
        expected_production_tons: yieldResult?.totalProductionTons || 12.0,
        current_gdd: statusInfo.gddAccumulated,
        growth_stage: statusInfo.growthStage,
        expected_harvest_date: statusInfo.expectedHarvestDate,
        manual_harvest_date: tempManualDate ? new Date(tempManualDate).toISOString() : null,
        harvest_window: statusInfo.harvestWindow,
        status: statusInfo.status,
        required_labour: labourWorkers,
        notes: harvestNotes
      });
    } catch (e) {
      console.error('Error saving manual date:', e);
    }
  };

  // Reset Manual Harvest Date back to AI Estimate
  const handleResetToAiDate = async () => {
    setManualHarvestDate('');
    setTempManualDate('');
    setIsAdjustDateModalOpen(false);

    try {
      const statusInfo = farmActivityService.calculateHarvestStatus(
        selectedCrop,
        activities.find(a => a.activity_type === 'Sowing')?.date,
        computedStatus.gddAccumulated,
        yieldResult?.predictedYieldPerHectare || 4.8,
        farmArea,
        weatherTelemetry.temperature_c,
        null
      );
      setComputedStatus(statusInfo);

      await farmActivityService.saveHarvestRecord({
        farm_id: farm?.farm_id || 'farm_demo_1',
        field_name: farmName,
        crop: selectedCrop,
        area_hectares: farmArea,
        predicted_yield_tha: yieldResult?.predictedYieldPerHectare || 4.8,
        expected_production_tons: yieldResult?.totalProductionTons || 12.0,
        current_gdd: statusInfo.gddAccumulated,
        growth_stage: statusInfo.growthStage,
        expected_harvest_date: statusInfo.expectedHarvestDate,
        manual_harvest_date: null,
        harvest_window: statusInfo.harvestWindow,
        status: statusInfo.status,
        required_labour: labourWorkers,
        notes: harvestNotes
      });
    } catch (e) {
      console.error('Error resetting date:', e);
    }
  };

  // Toggle Checklist item
  const handleToggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  // Generate AI Advisor Advice for Harvest Strategy
  const handleConsultAiAdvisor = () => {
    const advice = `🌾 **AI Harvest Strategy Recommendation for ${selectedCrop} (${farmName})**

1. **Optimal Harvest Timing**:
   - Current GDD accumulation is **${computedStatus.gddAccumulated} / ${computedStatus.gddThreshold} GDD** (${computedStatus.gddPercentage}% maturity).
   - Expected moisture window opens around **${computedStatus.harvestWindow}**.
   - Target grain moisture for harvesting: **${computedStatus.storageMoistureTargetPct}%** to minimize grain shattering and post-harvest milling losses.

2. **Weather & Irrigation Advisory**:
   - Current temperature is **${weatherTelemetry.temperature_c}°C** with **${weatherTelemetry.precipitation_mm}mm** precipitation forecast.
   - Stop field flooding / irrigation **10-14 days before harvest** to allow soil drying for combine harvester heavy equipment movement.

3. **Post-Harvest Logistics & Storage**:
   - Projected Total Yield: **${yieldResult?.totalProductionTons || 12.0} Tons** (~${computedStatus.storageBagsCount} bags of 50kg).
   - Dedicated storage warehouse required: **~${computedStatus.storageRequirementSqft} sq ft** with adequate aeration and moisture control under ${computedStatus.storageMoistureTargetPct}%.`;

    setAiAdviceContent(advice);
    setIsAiAdvisorOpen(true);
  };

  // Open modal for Adding Farm Activity
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

  // Open modal for Editing Activity
  const handleOpenEditModal = (act: FarmActivity) => {
    setEditingActivity(act);
    setFormData({
      field_name: act.field_name,
      crop: act.crop,
      activity_type: act.activity_type,
      date: act.date.split('T')[0],
      quantity_details: act.quantity_details,
      notes: act.notes
    });
    setIsModalOpen(true);
  };

  // Save Activity
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
      if (formData.activity_type === 'Sowing') {
        loadData();
      }
    } catch (err: any) {
      alert('Failed to save activity: ' + (err.message || 'Unknown error'));
    }
  };

  // Delete Activity
  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('Are you sure you want to delete this farm activity record?')) return;

    try {
      await farmActivityService.deleteActivity(activityId);
      setActivities(prev => prev.filter(a => a.activity_id !== activityId));
    } catch (err: any) {
      alert('Failed to delete activity: ' + (err.message || 'Unknown error'));
    }
  };

  // Filtered activity list
  const filteredActivities = filterType === 'ALL'
    ? activities
    : activities.filter(a => a.activity_type === filterType);

  // Activity Icon Helper
  const getActivityBadge = (type: ActivityType) => {
    switch (type) {
      case 'Sowing':
        return { icon: <Sprout className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'Irrigation':
        return { icon: <Droplets className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'Fertilization':
        return { icon: <FlaskConical className="w-4 h-4 text-purple-600" />, bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'Pesticide Application':
        return { icon: <Bug className="w-4 h-4 text-rose-600" />, bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'Weeding':
        return { icon: <Sparkles className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'Disease Inspection':
        return { icon: <ShieldAlert className="w-4 h-4 text-teal-600" />, bg: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'Harvesting':
        return { icon: <Tractor className="w-4 h-4 text-amber-700" />, bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      default:
        return { icon: <FileText className="w-4 h-4 text-gray-600" />, bg: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  // Harvest Status Badge Styling
  const getStatusBadgeStyle = (status: HarvestStatus) => {
    switch (status) {
      case 'Harvest Ready':
        return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200 border-emerald-400 animate-pulse';
      case 'Approaching':
        return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200 border-amber-400';
      case 'Not Ready':
      default:
        return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md border-blue-400';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-gray-800">Synchronizing Automated Harvest Telemetry & GIS Engine...</h3>
        <p className="text-xs text-gray-500">Integrating GIS plot ({farmArea} ha), weather GDD, AI yield predictions & farm activity logs</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Dynamic Top Banner Header */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-emerald-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-bold backdrop-blur-md">
              <Tractor className="w-4 h-4 text-amber-400" /> 📅 Dynamic Harvest Planning & Yield Intelligence
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              {farmName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-amber-100/90 font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-300" />
                {locationLabel}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-emerald-300">
                <Sprout className="w-3.5 h-3.5" /> Crop: {selectedCrop}
              </span>
              <span>•</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px]">
                Plot Area: {farmArea} Hectares
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleConsultAiAdvisor}
              className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Bot className="w-4 h-4 text-emerald-200" /> AI Advisor Advice
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-4 h-4" /> Log Farm Activity
            </button>
            <button
              onClick={loadData}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all border border-white/20 shadow-sm"
              title="Refresh Telemetry Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('harvest')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'harvest'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Tractor className="w-4 h-4 text-amber-700" /> 🚜 Expected Harvest
        </button>

        <button
          onClick={() => setActiveTab('planning')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'planning'
              ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-700" /> 📦 Labour & Storage Planning
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'timeline'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-700" /> 📅 Farm Activity Timeline ({activities.length})
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'alerts'
              ? 'bg-teal-100 text-teal-900 border border-teal-300 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-teal-700" /> 🔔 Alerts & Reminders ({alerts.length})
        </button>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={loadData} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold">Retry</button>
        </div>
      )}

      {/* TAB 1: EXPECTED HARVEST DASHBOARD */}
      {activeTab === 'harvest' && (
        <div className="space-y-6">
          {/* Main Harvest Readiness & Growth Stage Container */}
          <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Harvest Readiness Telemetry</span>
                <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                  {farmName} — <span className="text-amber-700">{selectedCrop}</span>
                </h3>
              </div>

              {/* Readiness Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 ${getStatusBadgeStyle(computedStatus.status)}`}>
                  {computedStatus.status === 'Harvest Ready' && <CheckCircle2 className="w-4 h-4" />}
                  {computedStatus.status === 'Approaching' && <Clock className="w-4 h-4" />}
                  {computedStatus.status === 'Not Ready' && <Info className="w-4 h-4" />}
                  Status: {computedStatus.status}
                </span>
              </div>
            </div>

            {/* Interactive Harvest Lifecycle Timeline */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-emerald-600" /> Current Stage: <strong className="text-emerald-800">{computedStatus.growthStage}</strong>
                </span>
                <span className="text-amber-700 font-extrabold">
                  GDD Accumulation: {computedStatus.gddPercentage}% ({computedStatus.gddAccumulated} / {computedStatus.gddThreshold} GDD)
                </span>
              </div>

              {/* Visual Multi-step Growth Bar */}
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200 relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 transition-all duration-1000 shadow-inner"
                  style={{ width: `${computedStatus.gddPercentage}%` }}
                />
              </div>

              {/* Growth Timeline Nodes */}
              <div className="grid grid-cols-5 text-center text-[11px] font-bold text-gray-500 pt-1">
                <div className={computedStatus.gddPercentage >= 10 ? 'text-emerald-700 font-extrabold' : ''}>🌱 Sowing</div>
                <div className={computedStatus.gddPercentage >= 30 ? 'text-emerald-700 font-extrabold' : ''}>🌿 Tillering</div>
                <div className={computedStatus.gddPercentage >= 55 ? 'text-emerald-700 font-extrabold' : ''}>🌸 Flowering</div>
                <div className={computedStatus.gddPercentage >= 75 ? 'text-amber-700 font-extrabold' : ''}>🌽 Grain Filling</div>
                <div className={computedStatus.gddPercentage >= 90 ? 'text-orange-700 font-extrabold' : ''}>🚜 Harvest Ready</div>
              </div>
            </div>

            {/* Core Output KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* 1. Predicted Yield */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Predicted Yield</span>
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-950">
                  {yieldResult ? yieldResult.predictedYieldPerHectare : 4.80}
                </div>
                <span className="text-xs font-semibold text-emerald-700">Tons / Hectare (AI Model)</span>
              </div>

              {/* 2. Expected Total Production */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expected Harvest</span>
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-3xl font-black text-amber-950">
                  {yieldResult ? yieldResult.totalProductionTons : computedStatus.totalProductionTons}
                </div>
                <span className="text-xs font-semibold text-amber-700">Total Production ({farmArea} ha)</span>
              </div>

              {/* 3. Expected Harvest Date & Manual Override */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 shadow-sm relative group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expected Harvest</span>
                  <button
                    onClick={() => {
                      setTempManualDate(manualHarvestDate || new Date().toISOString().split('T')[0]);
                      setIsAdjustDateModalOpen(true);
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                    title="Adjust Planned Date"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-lg font-black text-blue-950 py-0.5">
                  {computedStatus.manualHarvestDate ? (
                    <div>
                      <span className="text-xs text-blue-600 block font-bold">👨‍🌾 Planned Date:</span>
                      {computedStatus.manualHarvestDate}
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs text-blue-600 block font-bold">🤖 AI Estimated:</span>
                      {computedStatus.expectedHarvestDate}
                    </div>
                  )}
                </div>

                {computedStatus.manualHarvestDate && (
                  <div className="text-[11px] text-gray-500 italic pt-0.5">
                    (AI Estimate: {computedStatus.expectedHarvestDate})
                  </div>
                )}

                <span className="text-xs font-bold text-blue-700 mt-1 block">
                  ~{computedStatus.daysToHarvest} days remaining
                </span>
              </div>

              {/* 4. Harvest Window */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50/50 border border-purple-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Optimal Harvest Window</span>
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-sm font-extrabold text-purple-950 py-1 leading-tight">
                  {computedStatus.harvestWindow}
                </div>
                <span className="text-xs font-semibold text-purple-700">Target Moisture: {computedStatus.storageMoistureTargetPct}%</span>
              </div>
            </div>

            {/* Telemetry Integration Footer Banner */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-700 font-medium">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Automated Telemetry Sync:</strong> Automatically links GIS Plot Area, live weather temp ({weatherTelemetry.temperature_c}°C) & rain ({weatherTelemetry.precipitation_mm}mm), GDD accumulation, and ML Yield engine.
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full shrink-0">
                ✓ Auto-Synced
              </span>
            </div>
          </div>

          {/* Quick Summary of Labour & Storage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-md space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" /> Required Labour Estimation
                </h4>
                <button onClick={() => setActiveTab('planning')} className="text-xs text-indigo-600 font-bold hover:underline">
                  Full Details →
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-indigo-950">{labourWorkers} Workers</div>
                  <p className="text-xs text-gray-500">Based on {farmArea} ha plot area & harvest workload</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-700 font-bold text-xs">
                  ~{Math.ceil(labourWorkers / farmArea)} workers/ha
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-md space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-purple-600" /> Storage & Warehousing Space
                </h4>
                <button onClick={() => setActiveTab('planning')} className="text-xs text-purple-600 font-bold hover:underline">
                  Full Details →
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-purple-950">{computedStatus.storageRequirementSqft} sq ft</div>
                  <p className="text-xs text-gray-500">Capacity for {computedStatus.storageBagsCount} bags (50kg each)</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-2xl text-purple-700 font-bold text-xs">
                  Max Moisture: {computedStatus.storageMoistureTargetPct}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LABOUR & STORAGE PLANNING */}
      {activeTab === 'planning' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Labour Requirement Card */}
            <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" /> Required Labour
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                  {farmArea} Hectares
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1">
                  <span className="text-xs text-indigo-700 font-bold uppercase tracking-wider">Harvest Workforce Needed</span>
                  <div className="text-3xl font-black text-indigo-950">{labourWorkers} Workers</div>
                  <p className="text-xs text-gray-600">Calculated for manual cutting, bunding, and threshing operations.</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="font-semibold text-gray-700">🌾 Harvesters & Sickle Cutters:</span>
                    <span className="font-bold text-indigo-900">{Math.ceil(labourWorkers * 0.6)} workers</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="font-semibold text-gray-700">🚜 Machine Operators / Threshers:</span>
                    <span className="font-bold text-indigo-900">{Math.ceil(labourWorkers * 0.2)} workers</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="font-semibold text-gray-700">📦 Bagging & Loading Labour:</span>
                    <span className="font-bold text-indigo-900">{Math.ceil(labourWorkers * 0.2)} workers</span>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Adjust Labour Worker Count:</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={labourWorkers}
                    onChange={(e) => setLabourWorkers(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Storage & Warehouse Card */}
            <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-purple-600" /> Storage Requirement
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full">
                  Post-Harvest
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-1">
                  <span className="text-xs text-purple-700 font-bold uppercase tracking-wider">Required Warehousing Space</span>
                  <div className="text-3xl font-black text-purple-950">{computedStatus.storageRequirementSqft} sq ft</div>
                  <p className="text-xs text-gray-600">Minimum dry storage area needed for total harvest output.</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="font-semibold text-gray-700">📦 Total 50kg Bags:</span>
                    <span className="font-bold text-purple-900">{computedStatus.storageBagsCount} Bags</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="font-semibold text-gray-700">⚖️ Total Yield Production:</span>
                    <span className="font-bold text-purple-900">{yieldResult?.totalProductionTons || 12.0} Tons</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="font-semibold text-gray-700">💧 Target Grain Moisture:</span>
                    <span className="font-bold text-purple-900">Below {computedStatus.storageMoistureTargetPct}%</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <strong>💡 Storage Recommendation:</strong> Ensure aeration fans are operational and floor is raised 10cm above ground to prevent moisture seep.
                </div>
              </div>
            </div>

            {/* Pre-Harvest Logistics Checklist Card */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600" /> Logistics Checklist
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                  {checklist.filter(c => c.done).length} / {checklist.length} Completed
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all ${
                      item.done
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <span className={item.done ? 'line-through text-gray-500' : ''}>{item.text}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Harvest Logistics Notes:</label>
                <textarea
                  rows={3}
                  value={harvestNotes}
                  onChange={(e) => setHarvestNotes(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Record machine booking contact, driver name, storage details..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FARM ACTIVITY TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Controls Bar: Filter & Add */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <Filter className="w-4 h-4 text-emerald-600" /> Filter Activity Type:
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="ALL">All Activities ({activities.length})</option>
                <option value="Sowing">🌱 Sowing</option>
                <option value="Irrigation">💧 Irrigation</option>
                <option value="Fertilization">🧪 Fertilization</option>
                <option value="Pesticide Application">💊 Pesticide Application</option>
                <option value="Weeding">🌿 Weeding</option>
                <option value="Disease Inspection">🔍 Disease Inspection</option>
                <option value="Harvesting">🚜 Harvesting</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Activity
            </button>
          </div>

          {/* Timeline List */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-lg space-y-6">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Sprout className="w-12 h-12 text-gray-300 mx-auto" />
                <h4 className="text-base font-bold text-gray-600">No Farm Activities Found</h4>
                <p className="text-xs text-gray-400">Click "Add Activity" to record sowing, fertilization, or irrigation log.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-emerald-200 ml-4 space-y-6 pl-6">
                {filteredActivities.map((act) => {
                  const badge = getActivityBadge(act.activity_type);
                  return (
                    <div key={act.activity_id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1.5 p-1.5 bg-white border-2 border-emerald-500 rounded-full shadow-sm">
                        {badge.icon}
                      </div>

                      <div className="p-4 bg-gray-50 hover:bg-emerald-50/40 rounded-2xl border border-gray-200 transition-all space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold flex items-center gap-1.5 ${badge.bg}`}>
                              {badge.icon} {act.activity_type}
                            </span>
                            <span className="text-xs font-extrabold text-gray-700">{act.field_name}</span>
                            <span className="text-xs font-semibold text-emerald-700">({act.crop})</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" /> {new Date(act.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <button
                              onClick={() => handleOpenEditModal(act)}
                              className="p-1.5 text-gray-400 hover:text-emerald-700 rounded-lg transition-colors"
                              title="Edit Activity"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(act.activity_id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                              title="Delete Activity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs space-y-1">
                          <p className="font-bold text-gray-800">
                            Quantity / Details: <span className="font-medium text-gray-700">{act.quantity_details || 'N/A'}</span>
                          </p>
                          {act.notes && (
                            <p className="text-gray-600 italic bg-white p-2.5 rounded-xl border border-gray-100">
                              "{act.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ALERTS & REMINDERS */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-lg space-y-4">
            <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2 pb-3 border-b border-gray-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Dynamic Harvest Alerts & Scheduled Reminders
            </h3>

            <div className="space-y-4">
              {alerts.map((alr) => (
                <div
                  key={alr.id}
                  className={`p-4 rounded-2xl border shadow-sm space-y-2 ${
                    alr.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : alr.type === 'info'
                      ? 'bg-blue-50 border-blue-200 text-blue-950'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-75">{alr.category}</span>
                    <span className="text-[11px] opacity-60">{new Date(alr.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <h4 className="text-sm font-extrabold">{alr.title}</h4>
                  <p className="text-xs opacity-90">{alr.description}</p>
                  <div className="pt-1 flex items-center gap-2 text-xs font-bold">
                    <span>Required Action:</span>
                    <span className="px-2.5 py-0.5 bg-white/80 rounded-lg border border-current">{alr.actionRequired}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR ADJUSTING PLANNED HARVEST DATE */}
      {isAdjustDateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 border border-amber-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-600" /> Adjust Planned Harvest Date
              </h3>
              <button onClick={() => setIsAdjustDateModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900">
                <strong>🤖 AI Estimated Harvest Date:</strong> {computedStatus.expectedHarvestDate}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Farmer Custom Planned Harvest Date:</label>
                <input
                  type="date"
                  value={tempManualDate}
                  onChange={(e) => setTempManualDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
              <button
                type="button"
                onClick={handleResetToAiDate}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold"
              >
                Reset to AI Estimate
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustDateModalOpen(false)}
                  className="px-3 py-2 text-gray-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualDate}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold rounded-xl shadow-sm"
                >
                  Save Date
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR AI ADVISOR CONSULTATION */}
      {isAiAdvisorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-emerald-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600" /> AgriSense AI Advisor Harvest Guidance
              </h3>
              <button onClick={() => setIsAiAdvisorOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-gray-800 whitespace-pre-line leading-relaxed font-medium">
              {aiAdviceContent}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => setIsAiAdvisorOpen(false)}
                className="px-4 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-sm hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR ADDING / EDITING ACTIVITY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-emerald-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                <Tractor className="w-5 h-5 text-emerald-600" />
                {editingActivity ? 'Edit Farm Activity' : 'Log New Farm Activity'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Field / Plot Name</label>
                <input
                  type="text"
                  required
                  value={formData.field_name}
                  onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Green Valley Rice Farm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Crop</label>
                  <select
                    value={formData.crop}
                    onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Rice">Rice</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Maize">Maize</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Sugarcane">Sugarcane</option>
                    <option value="Pulses">Pulses</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Activity Type</label>
                  <select
                    value={formData.activity_type}
                    onChange={(e) => setFormData({ ...formData, activity_type: e.target.value as ActivityType })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Sowing">🌱 Sowing</option>
                    <option value="Irrigation">💧 Irrigation</option>
                    <option value="Fertilization">🧪 Fertilization</option>
                    <option value="Pesticide Application">💊 Pesticide Application</option>
                    <option value="Weeding">🌿 Weeding</option>
                    <option value="Disease Inspection">🔍 Disease Inspection</option>
                    <option value="Harvesting">🚜 Harvesting</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Activity Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Quantity / Dosage / Details</label>
                <input
                  type="text"
                  value={formData.quantity_details}
                  onChange={(e) => setFormData({ ...formData, quantity_details: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. 50 kg/ha Urea, 5cm submergence, 2.5L Neem oil"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notes / Field Remarks</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Add optional notes, soil observations or equipment details..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

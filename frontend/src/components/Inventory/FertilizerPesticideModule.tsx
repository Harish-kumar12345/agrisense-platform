import React, { useState, useEffect } from 'react';
import {
  Pill,
  Sprout,
  Shield,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardList,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  FlaskConical,
  RefreshCw,
  MapPin,
  FileText,
  DollarSign
} from 'lucide-react';
import { inventoryService, InventoryItem, ApplicationLog } from '../../services/inventoryService';
import { soilService } from '../../services/soilService';
import { diseaseRiskService } from '../../services/diseaseRiskService';
import { weatherService } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';

interface FertilizerPesticideModuleProps {
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

export const FertilizerPesticideModule: React.FC<FertilizerPesticideModuleProps> = ({
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

  // Active Tab: 'fertilizer' | 'pesticide' | 'logs' | 'alerts'
  const [activeTab, setActiveTab] = useState<'fertilizer' | 'pesticide' | 'logs' | 'alerts'>('fertilizer');

  // Inventory & Logs state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<ApplicationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Telemetry Connections
  const [soilRecommendation, setSoilRecommendation] = useState<any>(null);
  const [diseaseRisk, setDiseaseRisk] = useState<any>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedProductForApply, setSelectedProductForApply] = useState<InventoryItem | null>(null);

  // Form Fields for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    category: 'Fertilizer' as 'Fertilizer' | 'Pesticide',
    type: 'Nitrogenous',
    quantity: 10,
    unit: 'kg',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    cost: 0,
    notes: ''
  });

  // Apply Form Fields
  const [applyData, setApplyData] = useState({
    quantity_used: 1,
    target_nutrient_or_pest: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, logsRes, soilRes, weatherRes] = await Promise.all([
        inventoryService.getInventory(),
        inventoryService.getApplicationLogs(),
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default_farm', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop)
      ]);

      setItems(inventoryRes);
      setLogs(logsRes);
      setSoilRecommendation(soilRes.recommendation);

      // Fetch Disease Risk calculation
      const dRisk = await diseaseRiskService.predictDiseaseRisk({
        crop: selectedCrop,
        latitude: safeLat,
        longitude: safeLon,
        weatherData: weatherRes.current,
        soilData: soilRes.soilData
      });
      setDiseaseRisk(dRisk);

    } catch (err) {
      console.error('Failed to load inventory module telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [safeLat, safeLon, selectedCrop]);

  // Filter items based on tab, search, and status
  const filteredItems = items.filter(item => {
    const matchesCategory = activeTab === 'fertilizer' ? item.category === 'Fertilizer' : activeTab === 'pesticide' ? item.category === 'Pesticide' : true;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesCategory && matchesSearch && matchesStatus;
  });

  const alerts = items.filter(i => i.status === 'Low Stock' || i.status === 'Expired' || i.status === 'Out of Stock');

  const handleOpenAddModal = (cat: 'Fertilizer' | 'Pesticide') => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: cat,
      type: cat === 'Fertilizer' ? 'Nitrogenous' : 'Fungicide',
      quantity: 10,
      unit: cat === 'Fertilizer' ? 'kg' : 'liters',
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      cost: 0,
      notes: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      type: item.type,
      quantity: item.quantity,
      unit: item.unit,
      purchase_date: item.purchase_date ? String(item.purchase_date).split('T')[0] : '',
      expiry_date: item.expiry_date ? String(item.expiry_date).split('T')[0] : '',
      cost: item.cost || 0,
      notes: item.notes || ''
    });
    setShowAddModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingItem) {
      const updated = await inventoryService.updateItem(editingItem._id, formData);
      setItems(prev => prev.map(i => i._id === editingItem._id ? updated : i));
    } else {
      const created = await inventoryService.addItem(formData);
      setItems(prev => [created, ...prev]);
    }
    setShowAddModal(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      await inventoryService.deleteItem(id);
      setItems(prev => prev.filter(i => i._id !== id));
    }
  };

  const handleOpenApplyModal = (product: InventoryItem) => {
    setSelectedProductForApply(product);
    setApplyData({
      quantity_used: 1,
      target_nutrient_or_pest: product.category === 'Fertilizer' ? 'Nitrogen & Canopy Booster' : 'Fungal Spore Management',
      notes: ''
    });
    setShowApplyModal(true);
  };

  const handleRecordApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForApply) return;

    try {
      const { updatedItem, log } = await inventoryService.recordApplication({
        product_id: selectedProductForApply._id,
        crop: selectedCrop,
        field: farmTitle,
        quantity_used: applyData.quantity_used,
        target_nutrient_or_pest: applyData.target_nutrient_or_pest,
        notes: applyData.notes
      });

      setItems(prev => prev.map(i => i._id === updatedItem._id ? updatedItem : i));
      setLogs(prev => [log, ...prev]);
      setShowApplyModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to record application');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-semibold text-gray-800">Loading Inventory & Application Logs...</h3>
        <p className="text-xs text-gray-500">Connecting inventory database with Soil & Disease modules at {locationLabel}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-emerald-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-semibold backdrop-blur-md">
              <Pill className="w-3.5 h-3.5" /> Farm Input & Application Tracking System
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Fertilizer & Pesticide Management
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-purple-100">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-purple-300" />
                {locationLabel}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <Sprout className="w-3.5 h-3.5" /> Crop: {selectedCrop} ({farmArea} ha)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenAddModal(activeTab === 'pesticide' ? 'Pesticide' : 'Fertilizer')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Inventory Item
            </button>
          </div>
        </div>
      </div>

      {/* 4 Main Module Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('fertilizer')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'fertilizer' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          <Sprout className="w-4 h-4" /> Fertilizer Inventory
        </button>
        <button
          onClick={() => setActiveTab('pesticide')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'pesticide' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          <Shield className="w-4 h-4" /> Pesticide Inventory
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Application History Log ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'alerts' ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Inventory Alerts ({alerts.length})
        </button>
      </div>

      {/* TAB 1 & TAB 2: INVENTORY TABLES & RECOMMENDATION CARDS */}
      {(activeTab === 'fertilizer' || activeTab === 'pesticide') && (
        <div className="space-y-6">
          {/* Soil / Disease Module Integration Connection Cards */}
          {activeTab === 'fertilizer' && soilRecommendation && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white text-emerald-600 shadow-xs shrink-0">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Soil Analysis Integration Recommendation</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">Live Soil Sync</span>
                </div>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  <strong>Fertilizer Plan:</strong> {soilRecommendation.fertilizerPlan}
                </p>
                <p className="text-[11px] text-emerald-800">
                  <strong>pH Advisory:</strong> {soilRecommendation.phCorrection}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'pesticide' && diseaseRisk && (
            <div className={`p-5 rounded-2xl border shadow-sm flex items-start gap-4 ${
              diseaseRisk.riskLevel === 'Low' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="p-3 rounded-xl bg-white shadow-xs shrink-0">
                {diseaseRisk.riskLevel === 'Low' ? <ShieldCheck className="w-6 h-6 text-emerald-600" /> : <ShieldAlert className="w-6 h-6 text-amber-600" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Disease / Pest Risk Integration</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    diseaseRisk.riskLevel === 'Low' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    Risk Level: {diseaseRisk.riskLevel} ({diseaseRisk.overallRiskScore}%)
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed">
                  {diseaseRisk.recommendation}
                </p>
                {diseaseRisk.riskLevel === 'Low' && (
                  <p className="text-[11px] text-emerald-700 font-bold">
                    ✓ Policy Active: Chemical pesticide application is NOT recommended for Low-risk conditions. Continue visual inspections.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={`Search ${activeTab} inventory by product name or type...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Expired">Expired</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>

              <button
                onClick={() => handleOpenAddModal(activeTab === 'pesticide' ? 'Pesticide' : 'Fertilizer')}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add {activeTab === 'pesticide' ? 'Pesticide' : 'Fertilizer'}
              </button>
            </div>
          </div>

          {/* Inventory Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div key={item._id} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {item.type}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      item.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'Low Stock' ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 mt-2">{item.name}</h3>
                  <div className="text-2xl font-black text-gray-900 mt-1">
                    {item.quantity} <span className="text-xs text-gray-500 font-medium">{item.unit} remaining</span>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.notes}</p>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Purchase Cost:</span>
                    <strong className="text-gray-800">₹{item.cost || 0}</strong>
                  </div>
                  {item.expiry_date && (
                    <div className="flex justify-between">
                      <span>Expiry Date:</span>
                      <strong className={new Date(item.expiry_date) < new Date() ? 'text-rose-600 font-bold' : 'text-gray-800'}>
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </strong>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleOpenApplyModal(item)}
                      disabled={item.quantity <= 0}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-xs"
                    >
                      <ClipboardList className="w-3.5 h-3.5" /> Record Application
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item._id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-500 space-y-2">
                <Pill className="w-8 h-8 mx-auto text-gray-400" />
                <p className="text-sm font-semibold">No {activeTab} inventory items found matching filters.</p>
                <button
                  onClick={() => handleOpenAddModal(activeTab === 'pesticide' ? 'Pesticide' : 'Fertilizer')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 mt-2"
                >
                  <Plus className="w-4 h-4" /> Add First {activeTab === 'pesticide' ? 'Pesticide' : 'Fertilizer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: APPLICATION HISTORY LOG */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-800">Field Input Application Records</h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">{logs.length} Total Logs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-bold bg-gray-50">
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Quantity Used</th>
                  <th className="p-3">Crop / Field</th>
                  <th className="p-3">Target Purpose</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log._id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-800">
                      {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        log.category === 'Fertilizer' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-900">{log.product_name}</td>
                    <td className="p-3 font-black text-emerald-800">{log.quantity_used} {log.unit}</td>
                    <td className="p-3 text-gray-700">{log.crop} ({log.field})</td>
                    <td className="p-3 text-gray-600">{log.target_nutrient_or_pest}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <p className="text-center py-8 text-xs text-gray-400 font-medium">No application records logged yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY ALERTS CENTER */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-amber-200 shadow-md space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-gray-800">Stock & Expiry Notification Center</h3>
            </div>

            <div className="space-y-3">
              {alerts.map(item => (
                <div key={`alert-${item._id}`} className="p-4 rounded-2xl border flex items-center justify-between bg-amber-50 border-amber-200">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{item.name}</h4>
                      <p className="text-xs text-gray-600">
                        {item.status === 'Low Stock' ? `Low inventory level (${item.quantity} ${item.unit} remaining)` : `Product status: ${item.status}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                  >
                    Restock / Edit
                  </button>
                </div>
              ))}

              {alerts.length === 0 && (
                <div className="text-center py-8 text-emerald-800 space-y-1">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                  <p className="text-sm font-bold">All inventory stock levels are healthy!</p>
                  <p className="text-xs text-gray-500">No low stock or expired product warnings.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT INVENTORY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">
                {editingItem ? 'Edit Inventory Item' : `Add New ${formData.category}`}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Urea 46% N, Neem Oil"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none"
                  >
                    <option value="Fertilizer">Fertilizer</option>
                    <option value="Pesticide">Pesticide</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nitrogenous, Fungicide"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="liters">liters</option>
                    <option value="grams">grams</option>
                    <option value="ml">ml</option>
                    <option value="bags">bags</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Target nutrient or storage notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD APPLICATION MODAL */}
      {showApplyModal && selectedProductForApply && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">
                Record Field Application: {selectedProductForApply.name}
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleRecordApplication} className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <span className="text-gray-500 font-medium">Available Stock:</span>
                <div className="text-base font-extrabold text-emerald-800">
                  {selectedProductForApply.quantity} {selectedProductForApply.unit}
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Quantity to Apply ({selectedProductForApply.unit})</label>
                <input
                  type="number"
                  required
                  min="0.1"
                  max={selectedProductForApply.quantity}
                  step="0.1"
                  value={applyData.quantity_used}
                  onChange={(e) => setApplyData({ ...applyData, quantity_used: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Target Purpose / Nutrient / Disease</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nitrogen Booster, Blast Fungicide"
                  value={applyData.target_nutrient_or_pest}
                  onChange={(e) => setApplyData({ ...applyData, target_nutrient_or_pest: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Application Notes</label>
                <textarea
                  rows={2}
                  placeholder="Method of application or field weather observations..."
                  value={applyData.notes}
                  onChange={(e) => setApplyData({ ...applyData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  Record & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

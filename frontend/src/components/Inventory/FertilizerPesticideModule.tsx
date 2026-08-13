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
  ClipboardList,
  MapPin,
  X
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
  const farmTitle = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Ghaziabad, Uttar Pradesh');

  const [activeTab, setActiveTab] = useState<'inventory' | 'logs' | 'alerts'>('inventory');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Fertilizer' | 'Pesticide'>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<ApplicationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedProductForApply, setSelectedProductForApply] = useState<InventoryItem | null>(null);

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

  const [applyData, setApplyData] = useState({
    quantity_used: 1,
    target_nutrient_or_pest: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, logsRes] = await Promise.all([
        inventoryService.getInventory(),
        inventoryService.getApplicationLogs()
      ]);
      setItems(inventoryRes);
      setLogs(logsRes);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [safeLat, safeLon, selectedCrop]);

  const filteredItems = items.filter(item => {
    const matchesCategory = categoryFilter === 'All' ? true : item.category === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesCategory && matchesSearch && matchesStatus;
  });

  const alerts = items.filter(i => i.status === 'Low Stock' || i.status === 'Expired' || i.status === 'Out of Stock');

  const handleOpenAddModal = (cat: 'Fertilizer' | 'Pesticide' = 'Fertilizer') => {
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
    if (window.confirm('Delete item from inventory?')) {
      await inventoryService.deleteItem(id);
      setItems(prev => prev.filter(i => i._id !== id));
    }
  };

  const handleOpenApplyModal = (product: InventoryItem) => {
    setSelectedProductForApply(product);
    setApplyData({
      quantity_used: 1,
      target_nutrient_or_pest: product.category === 'Fertilizer' ? 'Nitrogen Booster' : 'Fungal Control',
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
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading farm inventory ledger...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800 font-sans">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agricultural Inventory</h1>
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
            onClick={() => handleOpenAddModal('Fertilizer')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Input Item</span>
          </button>
        </div>
      </div>

      {/* 2. Controls & Segment Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Table ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'logs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Application Logs ({logs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'alerts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Alerts ({alerts.length})
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Categories</option>
              <option value="Fertilizer">Fertilizers</option>
              <option value="Pesticide">Pesticides</option>
            </select>

            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: INVENTORY DATA TABLE */}
      {activeTab === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-center">Expiry</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-3 px-4 text-slate-600">{item.category}</td>
                    <td className="py-3 px-4 text-slate-500">{item.type}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{item.quantity} {item.unit}</td>
                    <td className="py-3 px-4 text-center text-slate-500">
                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenApplyModal(item)}
                        disabled={item.quantity <= 0}
                        className="px-2.5 py-1 text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg border border-emerald-200 disabled:opacity-40"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item._id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATION LOGS TABLE */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Applied Quantity</th>
                  <th className="py-2.5 px-4">Purpose / Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log, idx) => (
                  <tr key={log._id || idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-600">{new Date(log.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{log.product_name}</td>
                    <td className="py-3 px-4 text-slate-600">{log.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{log.quantity_used} {log.unit}</td>
                    <td className="py-3 px-4 text-slate-500">{log.target_nutrient_or_pest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ALERTS */}
      {activeTab === 'alerts' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Stock & Expiry Alerts</h3>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">All stock levels healthy.</div>
            ) : (
              alerts.map(item => (
                <div key={item._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{item.name}</span> — {item.status} ({item.quantity} {item.unit} remaining)
                  </div>
                  <button type="button" onClick={() => handleOpenEditModal(item)} className="text-emerald-700 font-semibold hover:underline">
                    Restock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ITEM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">{editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="Fertilizer">Fertilizer</option>
                    <option value="Pesticide">Pesticide</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Type</label>
                  <input
                    type="text"
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="kg">kg</option>
                    <option value="liters">liters</option>
                    <option value="bags">bags</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPLY ITEM */}
      {showApplyModal && selectedProductForApply && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Record Application: {selectedProductForApply.name}</h3>
              <button type="button" onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordApplication} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Quantity Used ({selectedProductForApply.unit})</label>
                <input
                  type="number"
                  required
                  min="0.1"
                  max={selectedProductForApply.quantity}
                  step="0.1"
                  value={applyData.quantity_used}
                  onChange={(e) => setApplyData({ ...applyData, quantity_used: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Target Purpose</label>
                <input
                  type="text"
                  required
                  value={applyData.target_nutrient_or_pest}
                  onChange={(e) => setApplyData({ ...applyData, target_nutrient_or_pest: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowApplyModal(false)} className="px-3 py-1.5 text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg">
                  Record Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

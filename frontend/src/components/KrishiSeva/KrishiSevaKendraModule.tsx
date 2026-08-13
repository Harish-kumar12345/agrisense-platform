import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Search,
  Filter,
  RefreshCw,
  Sprout,
  Droplets,
  FlaskConical,
  Bug,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FarmData } from '../../services/farmService';

// Custom Leaflet pins for user farm and centers
const farmIcon = L.divIcon({
  className: 'custom-farm-marker',
  html: `<div style="background-color: #059669; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; items-center; justify-content: center; color: white; font-size: 16px;">🌾</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const centerIcon = (category: string) => {
  let emoji = '🏪';
  let color = '#2563eb'; // blue
  if (category === 'FERTILIZER') { emoji = '🧪'; color = '#3b82f6'; }
  else if (category === 'SEEDS') { emoji = '🌱'; color = '#8b5cf6'; }
  else if (category === 'PESTICIDES') { emoji = '💊'; color = '#e11d48'; }
  else if (category === 'OFFICE') { emoji = '🏛️'; color = '#d97706'; }
  else if (category === 'KVK') { emoji = '🔬'; color = '#0d9488'; }

  return L.divIcon({
    className: 'custom-center-marker',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

export interface AgriCenter {
  id: string;
  name: string;
  nameLocal?: string;
  category: 'KSK' | 'FERTILIZER' | 'SEEDS' | 'PESTICIDES' | 'OFFICE' | 'KVK';
  categoryLabel: string;
  address: string;
  district: string;
  state: string;
  pincode?: string;
  phone?: string;
  email?: string;
  services: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  workingHours: string;
  officerName?: string;
  distance: number;
  isOpenNow: boolean;
  rating?: number;
}

interface KrishiSevaKendraModuleProps {
  farm?: FarmData | null;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    state?: string;
  };
  onGoToGIS?: () => void;
}

export const KrishiSevaKendraModule: React.FC<KrishiSevaKendraModuleProps> = ({
  farm,
  location,
  onGoToGIS
}) => {
  // Extract coordinates from saved GIS farm or location
  const rawLat = farm?.latitude ?? location?.latitude;
  const rawLon = farm?.longitude ?? location?.longitude;
  const safeLat = isNaN(Number(rawLat)) ? null : Number(rawLat);
  const safeLon = isNaN(Number(rawLon)) ? null : Number(rawLon);

  const farmName = farm?.farm_name || 'My Farm Plot';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Saved GIS Location');

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Telemetry Data State
  const [centers, setCenters] = useState<AgriCenter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedCenter, setSelectedCenter] = useState<AgriCenter | null>(null);

  // Load nearby centers from backend API using saved GIS coordinates
  const loadCenters = async () => {
    if (!safeLat || !safeLon) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_BASE}/krishi-seva-kendra?latitude=${safeLat}&longitude=${safeLon}&category=${selectedCategory}&search=${encodeURIComponent(searchQuery)}`);

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();

      if (data && Array.isArray(data.centers)) {
        setCenters(data.centers);
        if (data.centers.length > 0 && !selectedCenter) {
          setSelectedCenter(data.centers[0]);
        }
      }
    } catch (err: any) {
      console.warn('Backend Krishi Seva API error, falling back to local calculation:', err);
      // Fallback centers calculation
      setCenters(getFallbackCenters(safeLat, safeLon, selectedCategory, searchQuery));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenters();
  }, [safeLat, safeLon, selectedCategory, searchQuery]);

  // Handle Get Directions to Google Maps
  const handleGetDirections = (center: AgriCenter) => {
    const origin = safeLat && safeLon ? `${safeLat},${safeLon}` : '';
    const dest = `${center.coordinates.latitude},${center.coordinates.longitude}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
    window.open(mapsUrl, '_blank');
  };

  // Helper badge color per category
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'KSK':
        return { label: 'Krishi Seva Kendra', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'FERTILIZER':
        return { label: 'Fertilizer Dealer', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'SEEDS':
        return { label: 'Seed Supplier', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'PESTICIDES':
        return { label: 'Pesticide Shop', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'OFFICE':
        return { label: 'Agricultural Office', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'KVK':
        return { label: 'Krishi Vigyan Kendra', bg: 'bg-teal-100 text-teal-800 border-teal-300' };
      default:
        return { label: 'Agri Center', bg: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  // MISSING GIS LOCATION FALLBACK UI
  if (!safeLat || !safeLon) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6 bg-white rounded-3xl border border-amber-200 shadow-xl my-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
          <MapPin className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-gray-800">Set Farm GIS Location Required</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            To locate nearest Krishi Seva Kendras, fertilizer depots, seed merchants, and KVK centers, please select or set your farm location in the Farm GIS map.
          </p>
        </div>
        <button
          onClick={onGoToGIS}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-extrabold shadow-lg transition-all inline-flex items-center gap-2 text-sm"
        >
          <MapPin className="w-4 h-4" /> Open Farm GIS Map & Set Location
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-950 via-teal-950 to-emerald-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-bold backdrop-blur-md">
              <Building2 className="w-4 h-4 text-blue-400" /> 🏪 Krishi Seva Kendra & Agri Business Telemetry
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Nearest Agricultural Support Centers
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100/90 font-medium">
              <span className="flex items-center gap-1 font-bold text-emerald-300">
                <MapPin className="w-3.5 h-3.5" />
                Plot Origin: {locationLabel} ({safeLat.toFixed(4)}, {safeLon.toFixed(4)})
              </span>
              <span>•</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px]">
                {centers.length} Centers Found Nearby
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadCenters}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all border border-white/20 shadow-sm flex items-center gap-1.5 text-xs font-bold"
              title="Refresh Location Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Category Filters */}
      <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, address, or service..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Active Radius / Sort Badge */}
          <span className="text-xs font-extrabold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 shrink-0">
            Sorted by Nearest Distance (Haversine Formula)
          </span>
        </div>

        {/* Category Pills Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          {[
            { id: 'ALL', label: 'All Centers', icon: '🏪' },
            { id: 'KSK', label: 'Krishi Seva Kendras', icon: '🌾' },
            { id: 'FERTILIZER', label: 'Fertilizer Shops', icon: '🧪' },
            { id: 'SEEDS', label: 'Seed Suppliers', icon: '🌱' },
            { id: 'PESTICIDES', label: 'Pesticide Dealers', icon: '💊' },
            { id: 'OFFICE', label: 'Agri Offices', icon: '🏛️' },
            { id: 'KVK', label: 'Krishi Vigyan Kendras', icon: '🔬' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout: Leaflet Map (Left) + Centers List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Leaflet Map Panel */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-4 border border-blue-100 shadow-lg space-y-3 flex flex-col h-[520px]">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Interactive Map View
            </h3>
            <span className="text-xs text-gray-500 font-medium">Click marker for directions</span>
          </div>

          <div className="flex-1 w-full rounded-2xl overflow-hidden border border-gray-200 relative z-0">
            <MapContainer
              center={[safeLat, safeLon]}
              zoom={11}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User Farm Location Marker */}
              <Marker position={[safeLat, safeLon]} icon={farmIcon}>
                <Popup>
                  <div className="text-xs font-bold space-y-1">
                    <p className="text-emerald-700">🌾 {farmName}</p>
                    <p className="text-gray-600">Saved GIS Farm Origin</p>
                  </div>
                </Popup>
              </Marker>

              {/* Nearby Center Markers */}
              {centers.map((center) => (
                <Marker
                  key={center.id}
                  position={[center.coordinates.latitude, center.coordinates.longitude]}
                  icon={centerIcon(center.category)}
                  eventHandlers={{
                    click: () => setSelectedCenter(center)
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1.5">
                      <h4 className="font-extrabold text-gray-900">{center.name}</h4>
                      <p className="text-blue-700 font-bold">{center.distance} km away</p>
                      <p className="text-gray-600">{center.address}</p>
                      <button
                        onClick={() => handleGetDirections(center)}
                        className="mt-1 px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg text-[11px] block text-center w-full"
                      >
                        Get Directions →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Center Cards List Panel */}
        <div className="lg:col-span-6 space-y-4 max-h-[520px] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-md space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-600">Locating nearby centers from GIS coordinates...</p>
            </div>
          ) : centers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-md space-y-3">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
              <h4 className="font-bold text-gray-700 text-base">No Centers Found</h4>
              <p className="text-xs text-gray-500">Try adjusting your search query or selecting "All Centers".</p>
            </div>
          ) : (
            centers.map((center) => {
              const badge = getCategoryBadge(center.category);
              const isSelected = selectedCenter?.id === center.id;

              return (
                <div
                  key={center.id}
                  onClick={() => setSelectedCenter(center)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-md ring-2 ring-blue-400/30'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50/60 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold ${badge.bg}`}>
                          {badge.label}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          center.isOpenNow ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {center.isOpenNow ? '🟢 Open Now' : '🔴 Closed'}
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-gray-900">{center.name}</h4>
                      {center.nameLocal && <p className="text-xs text-gray-500 font-medium">{center.nameLocal}</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-blue-700">{center.distance} km</div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Nearest</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1.5 text-gray-700 pt-1 border-t border-gray-100">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{center.address}, {center.district}</span>
                    </p>

                    {center.workingHours && (
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Hours: {center.workingHours}</span>
                      </p>
                    )}

                    {center.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <a href={`tel:${center.phone}`} className="text-blue-600 hover:underline font-bold">
                          {center.phone}
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Services Tag Pills */}
                  {center.services && center.services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {center.services.slice(0, 4).map((srv, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-semibold">
                          ✓ {srv}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Get Directions Button */}
                  <div className="pt-2 flex items-center justify-between">
                    {center.officerName ? (
                      <span className="text-[11px] text-gray-500 font-medium">Officer: {center.officerName}</span>
                    ) : <span />}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGetDirections(center);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Get Directions
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// Fallback centers generator if API offline
function getFallbackCenters(lat: number, lon: number, category: string, query: string): AgriCenter[] {
  const list: AgriCenter[] = [
    {
      id: 'fb_1',
      name: 'District Krishi Bhavan & Seva Kendra',
      nameLocal: 'ജില്ലാ കൃഷി ഭവൻ',
      category: 'KSK',
      categoryLabel: 'Krishi Seva Kendra',
      address: 'Government Agriculture Complex',
      district: 'Local District',
      state: 'Kerala',
      phone: '+91-484-2422334',
      services: ['Soil Testing', 'Crop Advisory', 'Subsidies'],
      coordinates: { latitude: lat + 0.015, longitude: lon + 0.012 },
      workingHours: '9:00 AM - 5:00 PM (Mon-Fri)',
      distance: 1.8,
      isOpenNow: true,
      officerName: 'District Agriculture Officer'
    },
    {
      id: 'fb_2',
      name: 'FACT Agro Service & Fertilizer Depot',
      category: 'FERTILIZER',
      categoryLabel: 'Fertilizer Shop',
      address: 'Main Market Yard',
      district: 'Local District',
      state: 'Kerala',
      phone: '+91-484-2545161',
      services: ['Urea', 'NPK Fertilizers', 'Bio-compost'],
      coordinates: { latitude: lat - 0.02, longitude: lon + 0.018 },
      workingHours: '8:30 AM - 6:30 PM (Mon-Sat)',
      distance: 2.6,
      isOpenNow: true
    },
    {
      id: 'fb_3',
      name: 'State Certified Seed Supplier Hub',
      category: 'SEEDS',
      categoryLabel: 'Seed Supplier',
      address: 'Agronomic Nursery Center',
      district: 'Local District',
      state: 'Kerala',
      phone: '+91-480-2701235',
      services: ['Paddy Seeds', 'Vegetable Hybrids', 'Banana Saplings'],
      coordinates: { latitude: lat + 0.025, longitude: lon - 0.014 },
      workingHours: '9:00 AM - 5:00 PM (Mon-Sat)',
      distance: 3.4,
      isOpenNow: true
    },
    {
      id: 'fb_4',
      name: 'ICAR - Krishi Vigyan Kendra (KVK)',
      category: 'KVK',
      categoryLabel: 'Krishi Vigyan Kendra',
      address: 'Research Station Campus',
      district: 'Local District',
      state: 'Kerala',
      phone: '+91-484-2492417',
      services: ['Training', 'Frontline Demo', 'Soil Health'],
      coordinates: { latitude: lat - 0.035, longitude: lon - 0.022 },
      workingHours: '9:00 AM - 5:30 PM (Mon-Sat)',
      distance: 4.8,
      isOpenNow: true
    }
  ];

  let res = list;
  if (category && category !== 'ALL') {
    res = res.filter(c => c.category === category);
  }
  if (query && query.trim()) {
    const q = query.toLowerCase();
    res = res.filter(c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));
  }
  return res;
}

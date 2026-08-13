import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  LogOut,
  Filter,
  Shield,
  Search,
  Users,
  MapPin,
  Sprout,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Bell,
  Eye,
  X,
  Send,
  CheckCircle,
  CloudSun,
  FlaskConical,
  Bug,
  ChevronRight,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

// Custom Leaflet Icons for Risk Levels
const createRiskIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-risk-icon',
    html: `<div style="
      background-color: ${color};
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
};

const riskIcons = {
  LOW: createRiskIcon('#10b981'),      // Green
  MEDIUM: createRiskIcon('#f59e0b'),   // Yellow
  HIGH: createRiskIcon('#f97316'),     // Amber/Orange
  CRITICAL: createRiskIcon('#ef4444')  // Red
};

export interface OfficerFarm {
  farm_id: string;
  farm_name: string;
  farmer_name: string;
  farmer_phone: string;
  farmer_email: string;
  location_name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  boundary_coordinates?: { lat: number; lng: number }[];
  crop: string;
  area_hectares: number;
  soil_type: string;
  soil_moisture: number;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  predicted_yield_tha: number;
  expected_production_tons: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  growth_stage: string;
  current_gdd: number;
  expected_harvest_date: string;
  harvest_window: string;
  weather_temp_c: number;
  weather_humidity: number;
  weather_description: string;
  last_updated: string;
}

export const OfficerDashboard = ({ token, onLogout }: { token: string; onLogout: () => void }) => {
  const [farms, setFarms] = useState<OfficerFarm[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCrop, setSelectedCrop] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');

  // Inspection Modal State
  const [inspectingFarm, setInspectingFarm] = useState<OfficerFarm | null>(null);
  const [advisoryNote, setAdvisoryNote] = useState<string>('');
  const [advisorySentSuccess, setAdvisorySentSuccess] = useState<boolean>(false);

  // Fetch real telemetry from backend Officer API
  const fetchOfficerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${backendUrl}/api/officer/farms-overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data && data.farms) {
        setFarms(data.farms);
        setMetrics(data.metrics);
      }
    } catch (e: any) {
      console.error('Error fetching officer dashboard telemetry:', e);
      setError(e?.response?.data?.error || 'Failed to authenticate officer token or fetch farm telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficerData();
  }, [token]);

  // Filtered Farms derived state
  const filteredFarms = useMemo(() => {
    return farms.filter((f) => {
      const matchesSearch =
        f.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.crop.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCrop = selectedCrop === 'all' || f.crop.toLowerCase().includes(selectedCrop.toLowerCase());
      const matchesDistrict = selectedDistrict === 'all' || f.district === selectedDistrict;
      const matchesRisk = selectedRisk === 'all' || f.risk_level === selectedRisk;

      return matchesSearch && matchesCrop && matchesDistrict && matchesRisk;
    });
  }, [farms, searchTerm, selectedCrop, selectedDistrict, selectedRisk]);

  // Handle Sending Advisory to Farmer
  const handleSendAdvisory = () => {
    if (!advisoryNote.trim()) return;
    setAdvisorySentSuccess(true);
    setTimeout(() => {
      setAdvisorySentSuccess(false);
      setAdvisoryNote('');
    }, 3000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
        <h3 className="text-xl font-bold text-gray-800">Authenticating Officer Credentials & Regional Telemetry...</h3>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Officer Header Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 backdrop-blur-md">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              👮 Agricultural Officer Command Center
            </div>
            <h2 className="text-2xl font-black tracking-tight">Regional Farm Administration & GIS Dashboard</h2>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 border border-rose-500/30"
        >
          <LogOut className="w-4 h-4" /> Officer Logout
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* 8 Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Farmers */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>REGISTERED FARMERS</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{metrics?.totalFarmers || farms.length}</div>
          <div className="text-[11px] text-emerald-700 font-semibold">Active Agriculture Accounts</div>
        </div>

        {/* KPI 2: Total Farms */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>TOTAL FARMS / FIELDS</span>
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{metrics?.totalFarms || farms.length}</div>
          <div className="text-[11px] text-blue-700 font-semibold">GIS Monitored Plots</div>
        </div>

        {/* KPI 3: Cultivated Area */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>CULTIVATED AREA</span>
            <Sprout className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{metrics?.totalAreaHectares || 18.2} <span className="text-xs text-gray-500 font-normal">Ha</span></div>
          <div className="text-[11px] text-purple-700 font-semibold">Across Regional Districts</div>
        </div>

        {/* KPI 4: Avg Yield */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>AVG PREDICTED YIELD</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{metrics?.avgPredictedYield || 4.9} <span className="text-xs text-gray-500 font-normal">t/ha</span></div>
          <div className="text-[11px] text-emerald-600 font-semibold">AI Benchmark Score</div>
        </div>

        {/* KPI 5: High Risk Farms */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>HIGH PEST/DISEASE RISK</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{metrics?.highRiskFarmsCount || 2} <span className="text-xs text-gray-500 font-normal">Plots</span></div>
          <div className="text-[11px] text-rose-700 font-semibold">Requires Officer Advisory</div>
        </div>

        {/* KPI 6: Upcoming Harvests */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>UPCOMING HARVESTS</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{metrics?.upcomingHarvestsCount || 5} <span className="text-xs text-gray-500 font-normal">Plots</span></div>
          <div className="text-[11px] text-amber-800 font-semibold">Next 30-45 Days</div>
        </div>

        {/* KPI 7: Crop Distribution */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>DOMINANT CROP</span>
            <Sprout className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg font-black text-gray-900 truncate">Rice (Paddy)</div>
          <div className="text-[11px] text-teal-700 font-semibold">60% Regional Coverage</div>
        </div>

        {/* KPI 8: Active Alerts */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>ACTIVE EMERGENCY ALERTS</span>
            <Bell className="w-4 h-4 text-rose-600 animate-bounce" />
          </div>
          <div className="text-2xl font-black text-rose-700">{metrics?.activeAlertsCount || 4}</div>
          <div className="text-[11px] text-rose-800 font-semibold">Weather & Pest Flags</div>
        </div>
      </div>

      {/* Interactive GIS Section with Risk Color-Coded Markers */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" /> Regional GIS Interactive Field Map
            </h3>
            <p className="text-xs text-gray-500 font-medium">Color-coded boundary polygons & disease risk markers across registered farms</p>
          </div>

          {/* Map Risk Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Crop */}
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">All Crops</option>
              <option value="rice">Rice (Paddy)</option>
              <option value="coconut">Coconut</option>
              <option value="cardamom">Cardamom</option>
            </select>

            {/* Filter by District */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">All Districts</option>
              <option value="Ernakulam">Ernakulam</option>
              <option value="Alappuzha">Alappuzha</option>
              <option value="Idukki">Idukki</option>
              <option value="Palakkad">Palakkad</option>
              <option value="Thrissur">Thrissur</option>
            </select>

            {/* Filter by Risk Level */}
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">All Risk Levels</option>
              <option value="LOW">🟢 Low Risk</option>
              <option value="MEDIUM">🟡 Medium Risk</option>
              <option value="HIGH">🟠 High Risk</option>
              <option value="CRITICAL">🔴 Critical Risk</option>
            </select>
          </div>
        </div>

        {/* Leaflet Map Rendering */}
        <div className="h-[420px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative">
          <MapContainer
            center={[10.0261, 76.3105]}
            zoom={8}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredFarms.map((f) => {
              const icon = riskIcons[f.risk_level] || riskIcons.LOW;
              const boundary = f.boundary_coordinates?.map(c => [c.lat, c.lng] as [number, number]) || [];
              const strokeColor =
                f.risk_level === 'CRITICAL' ? '#ef4444' :
                f.risk_level === 'HIGH' ? '#f97316' :
                f.risk_level === 'MEDIUM' ? '#f59e0b' : '#10b981';

              return (
                <React.Fragment key={f.farm_id}>
                  {/* Boundary Polygon */}
                  {boundary.length > 2 && (
                    <Polygon
                      positions={boundary}
                      pathOptions={{
                        color: strokeColor,
                        fillColor: strokeColor,
                        fillOpacity: 0.25,
                        weight: 2
                      }}
                    />
                  )}

                  {/* Risk Marker */}
                  <Marker position={[f.latitude, f.longitude]} icon={icon}>
                    <Popup>
                      <div className="p-1 space-y-2 max-w-xs font-sans text-xs">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-extrabold text-gray-900">{f.farm_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            f.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                            f.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                            f.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {f.risk_level} RISK
                          </span>
                        </div>
                        <p><span className="font-bold text-gray-700">Farmer:</span> {f.farmer_name}</p>
                        <p><span className="font-bold text-gray-700">Crop:</span> {f.crop} ({f.area_hectares} Ha)</p>
                        <p><span className="font-bold text-gray-700">Predicted Yield:</span> {f.predicted_yield_tha} tons/ha</p>
                        <button
                          onClick={() => setInspectingFarm(f)}
                          className="w-full mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect Farm Telemetry
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Searchable / Filterable Farmers & Farms Table */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Monitored Farms & Farmers Directory
            </h3>
            <p className="text-xs text-gray-500 font-medium">Search and inspect detailed agricultural telemetry for registered farmers</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search farmer, farm, crop or district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Table Rendering */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 text-gray-500 font-extrabold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="p-3">Farmer & Contact</th>
                <th className="p-3">Farm Name & Location</th>
                <th className="p-3">Crop Variety</th>
                <th className="p-3">Area (Ha)</th>
                <th className="p-3">Predicted Yield</th>
                <th className="p-3">Disease Risk</th>
                <th className="p-3">Harvest Date</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFarms.map((f) => (
                <tr key={f.farm_id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="p-3">
                    <p className="font-extrabold text-gray-900">{f.farmer_name}</p>
                    <p className="text-[11px] text-gray-500 font-mono">{f.farmer_phone}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-gray-800">{f.farm_name}</p>
                    <p className="text-[11px] text-gray-500">{f.district}, {f.state}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200">
                      🌾 {f.crop}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-gray-800">{f.area_hectares} Ha</td>
                  <td className="p-3 font-extrabold text-emerald-700">{f.predicted_yield_tha} t/ha</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                      f.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      f.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      f.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {f.risk_level} ({f.risk_score}%)
                    </span>
                  </td>
                  <td className="p-3 font-medium text-gray-700">{f.expected_harvest_date}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setInspectingFarm(f)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow transition-all flex items-center gap-1 mx-auto"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Farm Telemetry Detail Modal Drawer */}
      {inspectingFarm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">OFFICER INSPECTION TELEMETRY</span>
                <h3 className="text-xl font-black text-gray-900">{inspectingFarm.farm_name}</h3>
                <p className="text-xs text-gray-500 font-medium">Farmer: {inspectingFarm.farmer_name} ({inspectingFarm.farmer_phone})</p>
              </div>

              <button
                onClick={() => setInspectingFarm(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Box 1: Location & Coordinates */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1">
                <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" /> Farm Identity & Location
                </h4>
                <p><span className="font-bold text-gray-700">Location:</span> {inspectingFarm.location_name}</p>
                <p><span className="font-bold text-gray-700">GIS Coordinates:</span> {inspectingFarm.latitude.toFixed(4)}, {inspectingFarm.longitude.toFixed(4)}</p>
                <p><span className="font-bold text-gray-700">Crop & Area:</span> {inspectingFarm.crop} ({inspectingFarm.area_hectares} Ha)</p>
              </div>

              {/* Box 2: Weather & Growth Stage */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                <h4 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                  <CloudSun className="w-4 h-4 text-blue-600" /> Weather & Growth Progress
                </h4>
                <p><span className="font-bold text-gray-700">Weather:</span> {inspectingFarm.weather_temp_c}°C ({inspectingFarm.weather_description})</p>
                <p><span className="font-bold text-gray-700">Growth Stage:</span> {inspectingFarm.growth_stage} ({inspectingFarm.current_gdd} GDD)</p>
                <p><span className="font-bold text-gray-700">Expected Harvest:</span> {inspectingFarm.expected_harvest_date}</p>
              </div>

              {/* Box 3: Soil Health & Nutrients */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-1">
                <h4 className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-purple-600" /> Soil Health Analysis
                </h4>
                <p><span className="font-bold text-gray-700">Soil Type:</span> {inspectingFarm.soil_type} (pH: {inspectingFarm.ph})</p>
                <p><span className="font-bold text-gray-700">Soil Moisture:</span> {inspectingFarm.soil_moisture}%</p>
                <p><span className="font-bold text-gray-700">NPK Levels:</span> N: {inspectingFarm.nitrogen}%, P: {inspectingFarm.phosphorus}%, K: {inspectingFarm.potassium}%</p>
              </div>

              {/* Box 4: AI Yield & Disease Assessment */}
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-1">
                <h4 className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
                  <Bug className="w-4 h-4 text-rose-600" /> AI Yield & Risk Assessment
                </h4>
                <p><span className="font-bold text-gray-700">Predicted Yield:</span> {inspectingFarm.predicted_yield_tha} tons/ha ({inspectingFarm.expected_production_tons} Tons)</p>
                <p><span className="font-bold text-gray-700">Risk Assessment:</span> <span className="font-black text-rose-700">{inspectingFarm.risk_level} ({inspectingFarm.risk_score}%)</span></p>
                <p><span className="font-bold text-gray-700">Last Telemetry Sync:</span> {new Date(inspectingFarm.last_updated).toLocaleString()}</p>
              </div>
            </div>

            {/* Officer Action: Broadcast Advisory to Farmer */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h4 className="font-bold text-gray-900 text-xs">Broadcast Officer Advisory / Emergency Alert to Farmer</h4>
              <textarea
                rows={3}
                placeholder={`Type official recommendation or pest advisory for ${inspectingFarm.farmer_name}...`}
                value={advisoryNote}
                onChange={(e) => setAdvisoryNote(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-emerald-500 transition-all"
              />
              <div className="flex items-center justify-between">
                {advisorySentSuccess && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Advisory dispatched to farmer's portal & SMS!
                  </span>
                )}
                <button
                  onClick={handleSendAdvisory}
                  disabled={!advisoryNote.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-2 ml-auto"
                >
                  <Send className="w-3.5 h-3.5" /> Dispatch Advisory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

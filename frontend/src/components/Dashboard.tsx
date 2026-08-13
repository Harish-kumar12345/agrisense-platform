import React, { useEffect, useState } from 'react';
import { 
  CloudSun, 
  Droplets, 
  Sprout, 
  Wind,
  Activity,
  AlertTriangle,
  ArrowLeft,
  MapPin,
  IndianRupee,
  Building2,
  Tractor,
  BarChart3,
  Mountain,
  Bot
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { HarvestManagementModule } from './Harvest/HarvestManagementModule';
import { CropPriceModule } from './CropPrice/CropPriceModule';
import { KrishiSevaKendraModule } from './KrishiSeva/KrishiSevaKendraModule';
import { FarmAnalyticsDashboard } from './Analytics/FarmAnalyticsDashboard';
import { weatherService } from '../services/weatherService';
import { soilService } from '../services/soilService';
import { FarmData } from '../services/farmService';

type LocationData = {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  state?: string;
  district?: string;
};

type WeatherData = {
  location: LocationData;
  current: {
    temperature_c: number;
    relative_humidity: number;
    precipitation_probability: number;
    wind_speed_kmh: number;
    wind_direction: string;
    visibility_km: number;
    uv_index: number;
    feels_like_c: number;
    pressure_mb: number;
    cloud_cover: number;
    description: string;
  };
  hourly: Array<{
    time: string;
    temperature_c: number;
    humidity: number;
    precip_probability: number;
    wind_speed_kmh: number;
    description: string;
  }>;
  daily: Array<{
    date: string;
    temp_max_c: number;
    temp_min_c: number;
    precip_probability_max: number;
    wind_speed_kmh: number;
    humidity: number;
    description: string;
  }>;
};

type SoilData = {
  ph: number;
  moisture: number;
  temperature: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organic_matter: number;
  salinity: number;
  type: string;
  drainage: string;
};

type LandData = {
  elevation: number;
  slope: number;
  aspect: string;
  landUse: string;
  irrigationAccess: boolean;
  nearestWaterSource: number;
  soilErosionRisk: string;
  floodRisk: string;
  droughtRisk: string;
};

interface DashboardProps {
  location: LocationData;
  crop: string;
  farmDetails?: FarmData;
  onBack: () => void;
}

const fetchWeatherData = async (
  lat: number,
  lon: number,
  locationProp?: LocationData,
  cropName: string = 'Rice'
): Promise<WeatherData> => {
  try {
    let city = locationProp?.city && locationProp.city !== 'Unknown Location' ? locationProp.city : '';
    let country = locationProp?.country && locationProp.country !== 'Unknown' ? locationProp.country : 'India';

    if (!city) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.address) {
            city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || 'Farm Location';
            country = geoData.address.country || country;
          }
        }
      } catch (e) {}
    }

    if (!city || city === 'Unknown Location') {
      city = 'Ghaziabad';
    }

    const liveWeather = await weatherService.getLiveWeatherData(lat, lon, cropName);
    const curr = liveWeather.current;

    return {
      location: {
        latitude: lat,
        longitude: lon,
        city: city || 'Ghaziabad',
        country: country || 'India',
        state: locationProp?.state || 'Uttar Pradesh'
      },
      current: {
        temperature_c: curr.temperature_c,
        relative_humidity: curr.relative_humidity,
        precipitation_probability: curr.precipitation_probability,
        wind_speed_kmh: curr.wind_speed_kmh,
        wind_direction: curr.wind_direction,
        visibility_km: curr.visibility_km,
        uv_index: curr.uv_index,
        feels_like_c: curr.feels_like_c,
        pressure_mb: curr.pressure_mb,
        cloud_cover: curr.cloud_cover,
        description: curr.description
      },
      hourly: liveWeather.hourly.map((h: any) => ({
        time: h.time,
        temperature_c: h.temperature_c,
        humidity: h.humidity,
        precip_probability: h.precip_probability,
        wind_speed_kmh: h.wind_speed_kmh,
        description: h.description
      })),
      daily: liveWeather.daily.map((d: any) => ({
        date: d.date,
        temp_max_c: d.temp_max_c,
        temp_min_c: d.temp_min_c,
        precip_probability_max: d.precip_probability_max,
        wind_speed_kmh: d.wind_speed_kmh,
        humidity: d.humidity,
        description: d.description
      }))
    };
  } catch (err) {
    return {
      location: { latitude: lat, longitude: lon, city: 'Ghaziabad', country: 'India' },
      current: {
        temperature_c: 28,
        relative_humidity: 75,
        precipitation_probability: 10,
        wind_speed_kmh: 12,
        wind_direction: 'NE',
        visibility_km: 10,
        uv_index: 5,
        feels_like_c: 30,
        pressure_mb: 1012,
        cloud_cover: 25,
        description: 'Partly Cloudy'
      },
      hourly: [],
      daily: []
    };
  }
};

const fetchSoilData = async (lat: number, lon: number): Promise<SoilData> => {
  try {
    const liveSoil = await soilService.fetchGeospatialSoilData(lat, lon);
    return {
      ph: liveSoil.ph,
      moisture: liveSoil.moisture,
      temperature: liveSoil.temperature,
      nitrogen: liveSoil.nitrogen,
      phosphorus: liveSoil.phosphorus,
      potassium: liveSoil.potassium,
      organic_matter: liveSoil.organic_matter,
      salinity: liveSoil.salinity,
      type: liveSoil.type,
      drainage: liveSoil.drainage
    };
  } catch (e) {
    return {
      ph: 6.8,
      moisture: 39,
      temperature: 24,
      nitrogen: 78,
      phosphorus: 54,
      potassium: 82,
      organic_matter: 2.2,
      salinity: 0.4,
      type: 'Clay Loam',
      drainage: 'Well-drained'
    };
  }
};

const fetchLandData = async (lat: number, lon: number): Promise<LandData> => {
  return {
    elevation: 215,
    slope: 1.2,
    aspect: 'East',
    landUse: 'Agricultural Cropland',
    irrigationAccess: true,
    nearestWaterSource: 0.8,
    soilErosionRisk: 'Low',
    floodRisk: 'Low',
    droughtRisk: 'Low'
  };
};

export default function Dashboard({ location, crop, farmDetails, onBack }: DashboardProps) {
  const { t } = useLanguage();
  
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [landData, setLandData] = useState<LandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [weather, soil, land] = await Promise.all([
          fetchWeatherData(location.latitude, location.longitude, location, crop),
          fetchSoilData(location.latitude, location.longitude),
          fetchLandData(location.latitude, location.longitude)
        ]);
        
        setWeatherData(weather);
        setSoilData(soil);
        setLandData(land);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [location, crop]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading farm workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl border border-slate-200 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {farmDetails?.farm_name || 'Farm Workspace'}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {location.city || 'Ghaziabad'}, {location.country || 'India'} • Crop: <strong>{crop}</strong> {farmDetails?.area_hectares ? `(${farmDetails.area_hectares} ha)` : ''}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Segment Controls */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl w-full overflow-x-auto">
          {[
            { id: 'overview', label: 'Farm Overview', icon: Activity },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'harvest', label: 'Harvest Planning', icon: Tractor },
            { id: 'weather', label: 'Weather & Soil', icon: CloudSun },
            { id: 'crop-prices', label: 'Market Rates', icon: IndianRupee },
            { id: 'krishi-seva-kendra', label: 'Krishi Seva Kendra', icon: Building2 }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && weatherData && soilData && (
          <div className="space-y-6">
            
            {/* Primary Environmental Metric Strip */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Air Temperature</span>
                <div className="text-2xl font-bold text-slate-900">{weatherData.current.temperature_c}°C</div>
                <span className="text-[11px] text-slate-500">Feels like {weatherData.current.feels_like_c}°C</span>
              </div>

              <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Relative Humidity</span>
                <div className="text-2xl font-bold text-slate-900">{weatherData.current.relative_humidity}%</div>
                <span className="text-[11px] text-slate-500">Wind: {weatherData.current.wind_speed_kmh} km/h</span>
              </div>

              <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Soil Moisture</span>
                <div className="text-2xl font-bold text-slate-900">{soilData.moisture}%</div>
                <span className="text-[11px] text-slate-500">Target range: 30-45%</span>
              </div>

              <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Soil pH & Type</span>
                <div className="text-lg font-bold text-slate-900">{soilData.ph} pH</div>
                <span className="text-[11px] text-slate-500">{soilData.type} ({soilData.drainage})</span>
              </div>
            </div>

            {/* Operational Status Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Operational Farm Status</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Field / Section</th>
                      <th className="py-2.5 px-3">Crop</th>
                      <th className="py-2.5 px-3 text-center">Soil Moisture</th>
                      <th className="py-2.5 px-3 text-center">Disease Risk</th>
                      <th className="py-2.5 px-3 text-right">Yield Estimate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">Main Plot ({farmDetails?.area_hectares || 2.5} ha)</td>
                      <td className="py-3 px-3 text-slate-600">{crop}</td>
                      <td className="py-3 px-3 text-center font-medium text-slate-800">{soilData.moisture}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Low Risk
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">4.8 t/ha</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* MODULE DELEGATION TABS */}
        {activeTab === 'analytics' && (
          <FarmAnalyticsDashboard farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'harvest' && (
          <HarvestManagementModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'weather' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Environmental Monitoring</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Temperature</span>
                <strong className="text-slate-900 text-base">{weatherData?.current.temperature_c}°C</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Humidity</span>
                <strong className="text-slate-900 text-base">{weatherData?.current.relative_humidity}%</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Wind Speed</span>
                <strong className="text-slate-900 text-base">{weatherData?.current.wind_speed_kmh} km/h</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Atmospheric Pressure</span>
                <strong className="text-slate-900 text-base">{weatherData?.current.pressure_mb} mb</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'crop-prices' && (
          <CropPriceModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'krishi-seva-kendra' && (
          <KrishiSevaKendraModule location={location} />
        )}

      </div>
    </div>
  );
}
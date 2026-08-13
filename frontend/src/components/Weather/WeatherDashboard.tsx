import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Droplets,
  ThermometerSun,
  Wind,
  Eye,
  Compass,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCw,
  MapPin,
  ShieldAlert,
  Sprout,
  SunMedium,
  CloudRain,
  Gauge,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { weatherService, ComprehensiveWeatherData } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';

interface WeatherDashboardProps {
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

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({
  farm,
  location,
  crop = 'Rice'
}) => {
  // Determine coordinates & details from saved farm GIS or fallback location
  const lat = farm?.latitude || location?.latitude || 28.6692;
  const lon = farm?.longitude || location?.longitude || 77.4538;
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmTitle = farm?.farm_name || 'AgriSense Farm Field';
  const locationLabel = farm?.location_name || (location ? `${location.city}, ${location.country}` : 'Ghaziabad, Uttar Pradesh');

  const [weatherData, setWeatherData] = useState<ComprehensiveWeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadWeather = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await weatherService.getLiveWeatherData(lat, lon, selectedCrop, farmTitle);
      setWeatherData(data);
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setError(err.message || 'Failed to load real-time weather data. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, [lat, lon, selectedCrop]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-semibold text-gray-800">Fetching Live Weather & Micro-Climate Data...</h3>
        <p className="text-xs text-gray-500">Connecting to real-time satellite meteorology at Lat {lat.toFixed(4)}, Lon {lon.toFixed(4)}</p>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-800">Weather Service Error</h3>
          <p className="text-xs text-rose-700">{error || 'Unable to load weather details.'}</p>
          <button
            onClick={loadWeather}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  const { current, hourly, daily, microClimate, fetchedAt } = weatherData;

  const statusTypeBg = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900'
  }[microClimate.statusType];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-md">
              <CloudSun className="w-3.5 h-3.5" /> Real-time Satellite Micro-Climate Dashboard
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {farmTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                {locationLabel} ({lat.toFixed(4)}, {lon.toFixed(4)})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <Sprout className="w-3.5 h-3.5" /> Crop: {selectedCrop}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-emerald-200">Refreshed: {fetchedAt}</span>
            <button
              onClick={loadWeather}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all border border-white/20 shadow-sm"
              title="Refresh Weather Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Micro-Climate Actionable Status Banner */}
      <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between gap-4 ${statusTypeBg}`}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm shrink-0">
            {microClimate.statusType === 'success' && <CheckCircle className="w-6 h-6 text-emerald-600" />}
            {microClimate.statusType === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
            {microClimate.statusType === 'danger' && <ShieldAlert className="w-6 h-6 text-rose-600" />}
            {microClimate.statusType === 'info' && <Info className="w-6 h-6 text-blue-600" />}
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-bold opacity-75 block">Crop Weather Status Rating</span>
            <h3 className="text-lg font-bold">{microClimate.statusMessage}</h3>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/90 shadow-sm border border-current">
            Target Crop: {selectedCrop}
          </span>
        </div>
      </div>

      {/* Current Real-time Weather Metrics Grid */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <SunMedium className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-800">Current Weather Conditions</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 capitalize">
            {current.description}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          {/* Temperature */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Temperature</span>
              <ThermometerSun className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{current.temperature_c}°C</div>
            <span className="text-[11px] text-gray-500">Feels like {current.feels_like_c}°C</span>
          </div>

          {/* Relative Humidity */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50/50 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Humidity</span>
              <Droplets className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{current.relative_humidity}%</div>
            <span className="text-[11px] text-gray-500">
              {current.relative_humidity > 75 ? 'High (Disease Risk)' : 'Optimal range'}
            </span>
          </div>

          {/* Rainfall / Precip */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50/50 border border-cyan-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Rainfall</span>
              <CloudRain className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{current.precipitation_mm} mm</div>
            <span className="text-[11px] text-gray-500">Prob: {current.precipitation_probability}%</span>
          </div>

          {/* Wind Speed */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Wind Speed</span>
              <Wind className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{current.wind_speed_kmh} <span className="text-xs font-normal">km/h</span></div>
            <span className="text-[11px] text-gray-500">Dir: {current.wind_direction}</span>
          </div>

          {/* Pressure */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium">Pressure</span>
              <Gauge className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-gray-800">{current.pressure_mb} mb</div>
          </div>

          {/* Visibility */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium">Visibility</span>
              <Eye className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-lg font-bold text-gray-800">{current.visibility_km} km</div>
          </div>

          {/* Cloud Cover */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium">Cloud Cover</span>
              <CloudSun className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-lg font-bold text-gray-800">{current.cloud_cover}%</div>
          </div>

          {/* Weather Code */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium">Micro-Climate</span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-sm font-bold text-emerald-700 capitalize truncate">{current.description}</div>
          </div>
        </div>
      </div>

      {/* Agriculture Micro-Climate Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Irrigation Need */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Irrigation Need</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              microClimate.irrigationNeed.level === 'High' ? 'bg-rose-100 text-rose-800' :
              microClimate.irrigationNeed.level === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {microClimate.irrigationNeed.level}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{microClimate.irrigationNeed.description}</p>
        </div>

        {/* Heat Stress */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Heat Stress Index</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              microClimate.heatStress.level === 'Severe' || microClimate.heatStress.level === 'High Risk' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              THI {microClimate.heatStress.indexValue}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{microClimate.heatStress.description}</p>
        </div>

        {/* Fungal / Disease Risk */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fungal Disease Risk</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              microClimate.diseaseRisk.level.includes('High') ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {microClimate.diseaseRisk.level}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{microClimate.diseaseRisk.description}</p>
        </div>

        {/* Field Operations */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Field Operations</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              microClimate.fieldOperations.level === 'Favorable' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {microClimate.fieldOperations.level}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{microClimate.fieldOperations.description}</p>
        </div>
      </div>

      {/* 24-Hour Trend Visualizer */}
      {hourly.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-800">Hourly Weather Trends (Next 24 Hours)</h3>
            </div>
            <span className="text-xs text-gray-400">8-Period Forecast</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {hourly.map((h, i) => (
              <div key={`h-${i}`} className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-center space-y-1">
                <span className="text-xs font-bold text-gray-700 block">{h.time}</span>
                <span className="text-lg font-bold text-emerald-700 block">{h.temperature_c}°C</span>
                <div className="text-[11px] text-gray-500 space-y-0.5">
                  <div className="flex items-center justify-center gap-1">
                    <Droplets className="w-3 h-3 text-blue-500" /> {h.humidity}%
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-blue-600 font-semibold">
                    Rain {h.precip_probability}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Weather Forecast Grid */}
      {daily.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-800">7-Day Agricultural Weather Forecast</h3>
            </div>
            <span className="text-xs text-gray-500 font-medium">Synced with Lat {lat.toFixed(2)}, Lon {lon.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {daily.map((d, index) => (
              <div
                key={`day-${index}`}
                className="p-4 rounded-xl border border-emerald-100/70 bg-gradient-to-b from-white to-emerald-50/20 text-center space-y-2 hover:shadow-md transition-all"
              >
                <div className="font-bold text-sm text-gray-800">{d.day_name}</div>
                <div className="text-[11px] text-gray-400">{d.date}</div>

                <div className="py-2">
                  <span className="text-lg font-extrabold text-amber-600">{d.temp_max_c}°</span>
                  <span className="text-sm font-semibold text-gray-400 ml-1">/ {d.temp_min_c}°C</span>
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center justify-center gap-1 text-blue-600 font-semibold">
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>{d.precip_probability_max}% Rain</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-gray-500 text-[11px]">
                    <Wind className="w-3 h-3 text-emerald-600" />
                    <span>{d.wind_speed_kmh} km/h</span>
                  </div>
                </div>

                <div className="text-[10px] text-emerald-800 font-medium capitalize truncate pt-1 border-t border-gray-100">
                  {d.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

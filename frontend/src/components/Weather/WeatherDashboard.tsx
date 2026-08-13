import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Droplets,
  Wind,
  RefreshCw,
  MapPin,
  Clock,
  Calendar
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
  const lat = farm?.latitude || location?.latitude || 28.6692;
  const lon = farm?.longitude || location?.longitude || 77.4538;
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmTitle = farm?.farm_name || 'Green Valley Rice Farm';
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
      console.error('Weather error:', err);
      setError(err.message || 'Failed to load weather data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, [lat, lon, selectedCrop]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading live weather telemetry...</p>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error || 'Unable to load weather data.'}</span>
          <button type="button" onClick={loadWeather} className="font-bold underline">Retry</button>
        </div>
      </div>
    );
  }

  const { current, hourly, daily, microClimate } = weatherData;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800 font-sans">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Weather & Soil Monitoring</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md capitalize">
              {current.description}
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
            onClick={loadWeather}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Compact Primary Weather Metrics Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Temperature</span>
          <div className="text-2xl font-bold text-slate-900">{current.temperature_c}°C</div>
          <span className="text-[11px] text-slate-500">Feels like {current.feels_like_c}°C</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Relative Humidity</span>
          <div className="text-2xl font-bold text-slate-900">{current.relative_humidity}%</div>
          <span className="text-[11px] text-slate-500">{current.relative_humidity > 75 ? 'High humidity' : 'Optimal range'}</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Rainfall</span>
          <div className="text-2xl font-bold text-slate-900">{current.precipitation_mm} mm</div>
          <span className="text-[11px] text-slate-500">Precip Prob: {current.precipitation_probability}%</span>
        </div>

        <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Wind & Pressure</span>
          <div className="text-lg font-bold text-slate-900">{current.wind_speed_kmh} km/h {current.wind_direction}</div>
          <span className="text-[11px] text-slate-500">Barometric: {current.pressure_mb} mb</span>
        </div>
      </div>

      {/* 3. Agronomic Weather Insights Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Agricultural Weather Assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-semibold text-slate-900 block">Irrigation Status: {microClimate.irrigationNeed.level}</span>
            <p className="text-slate-500 text-[11px]">{microClimate.irrigationNeed.description}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-semibold text-slate-900 block">Field Work Conditions: {microClimate.fieldOperations.level}</span>
            <p className="text-slate-500 text-[11px]">{microClimate.fieldOperations.description}</p>
          </div>
        </div>
      </div>

      {/* 4. Hourly Forecast Strip */}
      {hourly.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">24-Hour Forecast</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
            {hourly.map((h, i) => (
              <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 block">{h.time}</span>
                <span className="text-base font-bold text-slate-900 block">{h.temperature_c}°C</span>
                <span className="text-[10px] text-slate-500 block">{h.humidity}% RH</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. 7-Day Forecast Table */}
      {daily.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-700">7-Day Agricultural Forecast</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Day</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-center">Temp Range</th>
                  <th className="py-2.5 px-4 text-center">Rain Prob</th>
                  <th className="py-2.5 px-4 text-right">Wind</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daily.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{d.day_name}</td>
                    <td className="py-3 px-4 text-slate-500">{d.date}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {d.temp_max_c}°C <span className="text-slate-400 font-normal">/ {d.temp_min_c}°C</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 font-medium">{d.precip_probability_max}%</td>
                    <td className="py-3 px-4 text-right text-slate-500">{d.wind_speed_kmh} km/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

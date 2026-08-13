import React from 'react';
import { Layers, MapPin, Eye, Trash2, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { FarmData } from '../../services/farmService';

interface SavedFieldsProps {
  farms: FarmData[];
  activeFarmId?: string;
  onSelectFarm: (farm: FarmData) => void;
  onViewOnMap: (farm: FarmData) => void;
  onDeleteFarm: (farmId: string) => void;
}

export const SavedFields: React.FC<SavedFieldsProps> = ({
  farms,
  activeFarmId,
  onSelectFarm,
  onViewOnMap,
  onDeleteFarm
}) => {
  if (!farms || farms.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-md text-center">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="font-semibold text-gray-800 text-sm">No Saved Farm Fields Yet</h4>
        <p className="text-xs text-gray-500 mt-1">Draw your farm boundary above and click "Save Farm" to start managing multiple fields.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-gray-800">My Farm Fields ({farms.length})</h3>
        </div>
        <span className="text-xs text-gray-500 font-medium">Select a field to run AgriSense analysis</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {farms.map((farm) => {
          const isActive = farm.farm_id === activeFarmId;

          return (
            <div
              key={farm.farm_id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{farm.farm_name}</h4>
                    <p className="text-xs text-emerald-700 font-medium">{farm.crop} • {farm.season}</p>
                  </div>
                  {isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>

                <div className="space-y-1 my-3 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Area:</span>
                    <span className="font-semibold text-gray-800">{farm.area_hectares} ha ({farm.area_acres} ac)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Location:</span>
                    <span className="font-medium text-gray-700 truncate max-w-[150px]">{farm.location_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Coordinates:</span>
                    <span className="font-mono text-[11px] text-gray-500">{farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Boundary:</span>
                    <span className="text-emerald-700 font-semibold">{farm.boundary_geojson ? 'Saved ✓' : 'Point'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => onSelectFarm(farm)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  }`}
                >
                  <span>Select</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onViewOnMap(farm)}
                  title="View on Map"
                  className="p-1.5 bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 rounded-lg text-xs transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteFarm(farm.farm_id)}
                  title="Delete Field"
                  className="p-1.5 bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-lg text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

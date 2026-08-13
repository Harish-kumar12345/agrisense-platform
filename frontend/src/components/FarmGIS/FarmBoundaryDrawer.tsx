import React from 'react';
import { PenTool, CheckCircle2, RotateCcw, Trash2, Edit3 } from 'lucide-react';

interface FarmBoundaryDrawerProps {
  isDrawing: boolean;
  pointCount: number;
  isClosed: boolean;
  onStartDrawing: () => void;
  onFinishPolygon: () => void;
  onClearPoints: () => void;
  onRedraw: () => void;
}

export const FarmBoundaryDrawer: React.FC<FarmBoundaryDrawerProps> = ({
  isDrawing,
  pointCount,
  isClosed,
  onStartDrawing,
  onFinishPolygon,
  onClearPoints,
  onRedraw
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-emerald-100 shadow-lg flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Boundary Tools</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
          {pointCount} Points Added
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!isClosed && !isDrawing && (
          <button
            type="button"
            onClick={onStartDrawing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
          >
            <PenTool className="w-3.5 h-3.5" />
            Draw Boundary
          </button>
        )}

        {isDrawing && !isClosed && (
          <>
            <button
              type="button"
              disabled={pointCount < 3}
              onClick={onFinishPolygon}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                pointCount >= 3
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Finish Polygon ({pointCount >= 3 ? 'Ready' : 'Min 3 points'})
            </button>
          </>
        )}

        {isClosed && (
          <button
            type="button"
            onClick={onRedraw}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Redraw Boundary
          </button>
        )}

        {pointCount > 0 && (
          <button
            type="button"
            onClick={onClearPoints}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-medium transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

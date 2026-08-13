import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  X,
  AlertTriangle,
  Info,
  ShieldAlert,
  Zap,
  CloudRain,
  Droplets,
  Sprout,
  Package,
  TrendingUp,
  BarChart2,
  Filter,
  RefreshCw
} from 'lucide-react';
import { alertService, SmartAlert, AlertSeverity, AlertType } from '../../services/alertService';

interface SmartAlertsCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateModule?: (moduleKey: string) => void;
  activeFarmId?: string;
  isOfficer?: boolean;
}

export const SmartAlertsCenter: React.FC<SmartAlertsCenterProps> = ({
  isOpen,
  onClose,
  onNavigateModule,
  activeFarmId = 'farm_01',
  isOfficer = false
}) => {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const filterObj = {
        farm_id: isOfficer ? undefined : activeFarmId,
        severity: severityFilter,
        alert_type: typeFilter
      };
      const res = await alertService.getAlerts(filterObj);
      setAlerts(res.alerts);
      setUnreadCount(res.unreadCount);
    } catch (e) {
      console.warn('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, severityFilter, typeFilter, activeFarmId]);

  if (!isOpen) return null;

  const handleMarkRead = async (alertId?: string) => {
    if (!alertId) return;
    await alertService.markAsRead(alertId);
    setAlerts(prev => prev.map(a => ((a._id === alertId || a.id === alertId) ? { ...a, status: 'read' } : a)));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await alertService.markAllAsRead(isOfficer ? undefined : activeFarmId);
    setAlerts(prev => prev.map(a => ({ ...a, status: 'read' })));
    setUnreadCount(0);
  };

  const handleDelete = async (alertId?: string) => {
    if (!alertId) return;
    await alertService.deleteAlert(alertId);
    setAlerts(prev => prev.filter(a => a._id !== alertId && a.id !== alertId));
  };

  const handleNavigate = (targetModule?: string) => {
    if (onNavigateModule && targetModule) {
      onNavigateModule(targetModule);
      onClose();
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> CRITICAL
          </span>
        );
      case 'High':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> HIGH RISK
          </span>
        );
      case 'Warning':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> WARNING
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> INFO
          </span>
        );
    }
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case 'weather':
        return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'soil':
        return <Droplets className="w-4 h-4 text-emerald-400" />;
      case 'disease':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'crop_gdd':
        return <Sprout className="w-4 h-4 text-green-400" />;
      case 'yield':
        return <BarChart2 className="w-4 h-4 text-purple-400" />;
      case 'inventory':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'market':
        return <TrendingUp className="w-4 h-4 text-teal-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Smart Alert Engine</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                    {unreadCount} UNREAD
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isOfficer ? 'Regional Command Monitor • All Farms' : 'Live AgriSense Farm Telemetry Alerts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              Mark All Read
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
          {/* Severity Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1 pr-1">
              <Filter className="w-3 h-3" /> Severity:
            </span>
            {['all', 'Critical', 'High', 'Warning', 'Info'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-all capitalize whitespace-nowrap ${
                  severityFilter === sev
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {sev === 'all' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Alert Type Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium pr-1">Category:</span>
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'weather', label: '🌧️ Weather' },
              { id: 'soil', label: '💧 Soil' },
              { id: 'disease', label: '🦠 Disease' },
              { id: 'crop_gdd', label: '🌾 Crop/GDD' },
              { id: 'yield', label: '🤖 Yield' },
              { id: 'inventory', label: '📦 Inventory' },
              { id: 'market', label: '💰 Market' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1 rounded-lg border font-medium transition-all whitespace-nowrap ${
                  typeFilter === t.id
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts Content Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
              <p className="text-sm font-medium">Evaluating live AgriSense telemetry...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-3 border-2 border-dashed border-slate-800 rounded-2xl">
              <CheckCheck className="w-12 h-12 text-emerald-500/50 mx-auto" />
              <h3 className="text-lg font-bold text-slate-300">All Clear! No Active Alerts</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No active smart alerts match your current filter selection. Farm parameters are within optimal ranges.
              </p>
            </div>
          ) : (
            alerts.map(alert => {
              const id = alert._id || alert.id;
              const isUnread = alert.status === 'unread';

              return (
                <div
                  key={id || alert.dedup_key}
                  className={`p-4 rounded-xl border transition-all ${
                    isUnread
                      ? 'bg-slate-800/90 border-slate-700 shadow-lg ring-1 ring-emerald-500/20'
                      : 'bg-slate-900/60 border-slate-800/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Top Bar: Icon, Severity, Title, Status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                        {getTypeIcon(alert.alert_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(alert.severity)}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                            {alert.farm_name} • {alert.crop}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1">{alert.title}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isUnread && (
                        <button
                          onClick={() => handleMarkRead(id)}
                          title="Mark as Read"
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(id)}
                        title="Dismiss Alert"
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reason Box */}
                  <div className="mt-3 p-3 bg-slate-950/80 rounded-lg border border-slate-800/90 text-xs text-slate-300 space-y-1">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                      Reason & Telemetry Cause:
                    </span>
                    <p className="leading-relaxed">{alert.reason}</p>
                  </div>

                  {/* Recommended Action Box */}
                  <div className="mt-2.5 p-3 bg-emerald-950/30 rounded-lg border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                    <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Recommended Action:
                    </span>
                    <p className="leading-relaxed">{alert.recommended_action}</p>
                  </div>

                  {/* Footer & Go to Module Shortcut */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <span>
                      {alert.createdAt || alert.created_at
                        ? new Date(alert.createdAt || alert.created_at || Date.now()).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: 'short'
                          })
                        : 'Just Now'}
                    </span>

                    {onNavigateModule && (
                      <button
                        onClick={() => handleNavigate(alert.target_module)}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-md font-medium flex items-center gap-1 transition-all"
                      >
                        Open {alert.target_module ? alert.target_module.toUpperCase() : 'MODULE'} <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
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

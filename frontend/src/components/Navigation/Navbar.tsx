import React, { useState, useRef, useEffect } from 'react';
import {
  Sprout,
  MapPin,
  BarChart3,
  Brain,
  Tractor,
  IndianRupee,
  Bug,
  Pill,
  FlaskConical,
  CloudSun,
  MessageSquare,
  Shield,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Layers,
  Wrench,
  Activity,
  ClipboardList
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface NavbarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  unreadAlertCount: number;
  onOpenAlerts: () => void;
  user: any;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  unreadAlertCount,
  onOpenAlerts,
  user,
  onLogout
}) => {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);
  const [monitorDropdownOpen, setMonitorDropdownOpen] = useState(false);
  const [opsDropdownOpen, setOpsDropdownOpen] = useState(false);
  const [intelDropdownOpen, setIntelDropdownOpen] = useState(false);

  const farmRef = useRef<HTMLDivElement>(null);
  const monitorRef = useRef<HTMLDivElement>(null);
  const opsRef = useRef<HTMLDivElement>(null);
  const intelRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (farmRef.current && !farmRef.current.contains(event.target as Node)) setFarmDropdownOpen(false);
      if (monitorRef.current && !monitorRef.current.contains(event.target as Node)) setMonitorDropdownOpen(false);
      if (opsRef.current && !opsRef.current.contains(event.target as Node)) setOpsDropdownOpen(false);
      if (intelRef.current && !intelRef.current.contains(event.target as Node)) setIntelDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isFarmActive = ['home', 'dashboard', 'gis', 'analytics'].includes(currentView);
  const isMonitorActive = ['weather', 'soil', 'disease'].includes(currentView);
  const isOpsActive = ['inventory', 'harvest'].includes(currentView);
  const isIntelActive = ['yield', 'prices', 'chat'].includes(currentView);

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-lg backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectView('home')}>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
              <Sprout className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-white">AgriSense</span>
                <span className="px-1.5 py-0.2 text-[10px] font-semibold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                  Agronomic Platform
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Workflow Dropdowns */}
          <nav className="hidden lg:flex items-center gap-1">
            
            {/* 1. FARM WORKSPACE */}
            <div className="relative" ref={farmRef}>
              <button
                type="button"
                onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isFarmActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sprout className="w-4 h-4 text-emerald-400" />
                <span>Farm Workspace</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${farmDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {farmDropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50">
                  <button
                    type="button"
                    onClick={() => { onSelectView('home'); setFarmDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'home' || currentView === 'dashboard' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Farm Overview</div>
                      <div className="text-[10px] text-slate-400">Operations & attention required</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('gis'); setFarmDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'gis' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Fields & GIS Map</div>
                      <div className="text-[10px] text-slate-400">Interactive boundary layers</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('analytics'); setFarmDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'analytics' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-semibold">Farm Analytics</div>
                      <div className="text-[10px] text-slate-400">Seasonal trends & PDF report</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 2. MONITOR WORKSPACE */}
            <div className="relative" ref={monitorRef}>
              <button
                type="button"
                onClick={() => setMonitorDropdownOpen(!monitorDropdownOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isMonitorActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CloudSun className="w-4 h-4 text-teal-400" />
                <span>Crop Monitoring</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${monitorDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {monitorDropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50">
                  <button
                    type="button"
                    onClick={() => { onSelectView('weather'); setMonitorDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'weather' ? 'bg-teal-500/20 text-teal-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <CloudSun className="w-4 h-4 text-teal-400" />
                    <div>
                      <div className="font-semibold">Weather & Soil Monitoring</div>
                      <div className="text-[10px] text-slate-400">Real-time environmental trends</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('soil'); setMonitorDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'soil' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <FlaskConical className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Soil Health & NPK</div>
                      <div className="text-[10px] text-slate-400">Nutrients & pH testing</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('disease'); setMonitorDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'disease' ? 'bg-rose-500/20 text-rose-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Bug className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="font-semibold">Disease & Pest Incidents</div>
                      <div className="text-[10px] text-slate-400">Risk tracking & incident management</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3. OPERATIONS WORKSPACE */}
            <div className="relative" ref={opsRef}>
              <button
                type="button"
                onClick={() => setOpsDropdownOpen(!opsDropdownOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isOpsActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Farm Operations</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${opsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {opsDropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50">
                  <button
                    type="button"
                    onClick={() => { onSelectView('inventory'); setOpsDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'inventory' ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Pill className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="font-semibold">Inventory Tracker</div>
                      <div className="text-[10px] text-slate-400">Fertilizers & pesticides stock</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('harvest'); setOpsDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'harvest' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Tractor className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-semibold">Harvest Planning</div>
                      <div className="text-[10px] text-slate-400">Schedules, labour & storage</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 4. AGRONOMIC INTELLIGENCE WORKSPACE */}
            <div className="relative" ref={intelRef}>
              <button
                type="button"
                onClick={() => setIntelDropdownOpen(!intelDropdownOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isIntelActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Brain className="w-4 h-4 text-emerald-400" />
                <span>Agronomic Intelligence</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${intelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {intelDropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50">
                  <button
                    type="button"
                    onClick={() => { onSelectView('yield'); setIntelDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'yield' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Brain className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Yield Prediction</div>
                      <div className="text-[10px] text-slate-400">ML prediction decision workspace</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('prices'); setIntelDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'prices' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Crop Market Prices</div>
                      <div className="text-[10px] text-slate-400">Mandis rates & revenue calculator</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('chat'); setIntelDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'chat' ? 'bg-blue-500/20 text-blue-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-semibold">Agronomic Advisor</div>
                      <div className="text-[10px] text-slate-400">Consult advisor assistant</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 5. OFFICER PORTAL */}
            <button
              type="button"
              onClick={() => onSelectView('officer')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentView === 'officer'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-amber-300 border border-amber-500/30 hover:bg-amber-500/10'
              }`}
            >
              <Shield className="w-4 h-4" />
              Officer Portal
            </button>
          </nav>

          {/* Right Actions: Smart Alerts & User Session */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenAlerts}
              className="relative px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Smart Alerts"
            >
              <Bell className="w-4 h-4 text-red-400" />
              <span>Alerts</span>
              {unreadAlertCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 font-medium">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="max-w-[100px] truncate">{user.name || user.email || 'Farmer'}</span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={onOpenAlerts}
              className="relative p-2 bg-red-500/10 text-red-300 rounded-xl border border-red-500/30"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <button type="button" onClick={() => { onSelectView('home'); setMobileMenuOpen(false); }} className="p-2.5 bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-400" /> Farm Overview
            </button>
            <button type="button" onClick={() => { onSelectView('gis'); setMobileMenuOpen(false); }} className="p-2.5 bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Fields & Map
            </button>
            <button type="button" onClick={() => { onSelectView('weather'); setMobileMenuOpen(false); }} className="p-2.5 bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-teal-400" /> Weather & Soil
            </button>
            <button type="button" onClick={() => { onSelectView('disease'); setMobileMenuOpen(false); }} className="p-2.5 bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <Bug className="w-4 h-4 text-rose-400" /> Disease Incidents
            </button>
            <button type="button" onClick={() => { onSelectView('inventory'); setMobileMenuOpen(false); }} className="p-2.5 bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <Pill className="w-4 h-4 text-purple-400" /> Inventory
            </button>
            <button type="button" onClick={() => { onSelectView('harvest'); setMobileMenuOpen(false); }} className="p-2.5 bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <Tractor className="w-4 h-4 text-amber-400" /> Harvest Planning
            </button>
            <button type="button" onClick={() => { onSelectView('yield'); setMobileMenuOpen(false); }} className="p-2.5 bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" /> Yield Prediction
            </button>
            <button type="button" onClick={() => { onSelectView('prices'); setMobileMenuOpen(false); }} className="p-2.5 bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-400" /> Crop Prices
            </button>
            <button type="button" onClick={() => { onSelectView('chat'); setMobileMenuOpen(false); }} className="p-2.5 bg-slate-800 rounded-xl text-left flex items-center gap-2 col-span-2">
              <MessageSquare className="w-4 h-4 text-blue-400" /> Agronomic Advisor
            </button>
            <button type="button" onClick={() => { onSelectView('officer'); setMobileMenuOpen(false); }} className="p-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-center col-span-2">
              Shield Officer Portal
            </button>
          </div>

          {user && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">{user.name || user.email}</span>
              <button type="button" onClick={onLogout} className="text-rose-400 hover:underline">Log out</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

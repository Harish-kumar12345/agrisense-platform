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
  Sparkles,
  Layers,
  Wrench
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
  const [intelDropdownOpen, setIntelDropdownOpen] = useState(false);
  const [opsDropdownOpen, setOpsDropdownOpen] = useState(false);

  const intelRef = useRef<HTMLDivElement>(null);
  const opsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (intelRef.current && !intelRef.current.contains(event.target as Node)) {
        setIntelDropdownOpen(false);
      }
      if (opsRef.current && !opsRef.current.contains(event.target as Node)) {
        setOpsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isIntelActive = ['yield', 'harvest', 'prices', 'disease', 'soil'].includes(currentView);
  const isOpsActive = ['inventory', 'weather', 'chat'].includes(currentView);

  const getIntelActiveLabel = () => {
    switch (currentView) {
      case 'yield': return 'AI Yield';
      case 'harvest': return 'Harvest';
      case 'prices': return 'Crop Prices';
      case 'disease': return 'Disease Risk';
      case 'soil': return 'Soil Analysis';
      default: return 'Crop Intelligence';
    }
  };

  const getOpsActiveLabel = () => {
    switch (currentView) {
      case 'inventory': return 'Inventory';
      case 'weather': return 'Weather';
      case 'chat': return 'AI Advisor';
      default: return 'Farm Operations';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 text-white backdrop-blur-xl shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectView('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Sprout className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                  AgriSense
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md tracking-wider">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Smart Agricultural Assistant</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            
            {/* 1. Home */}
            <button
              type="button"
              onClick={() => onSelectView('home')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                currentView === 'home' || currentView === 'dashboard'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sprout className="w-4 h-4 text-emerald-400" />
              {t('nav.home')}
            </button>

            {/* 2. Farm GIS */}
            <button
              type="button"
              onClick={() => onSelectView('gis')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                currentView === 'gis'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              Farm GIS
            </button>

            {/* 3. Analytics */}
            <button
              type="button"
              onClick={() => onSelectView('analytics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                currentView === 'analytics'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Analytics
            </button>

            {/* 4. Crop Intelligence Dropdown */}
            <div className="relative" ref={intelRef}>
              <button
                type="button"
                onClick={() => setIntelDropdownOpen(!intelDropdownOpen)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isIntelActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{getIntelActiveLabel()}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${intelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {intelDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => { onSelectView('yield'); setIntelDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'yield' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    <Brain className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">AI Yield Prediction</div>
                      <div className="text-[10px] text-slate-400">Harvest forecast model</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('harvest'); setIntelDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'harvest' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    <Tractor className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-semibold">Harvest Planning</div>
                      <div className="text-[10px] text-slate-400">Maturity & schedule</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('prices'); setIntelDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'prices' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Crop Prices (Mandi)</div>
                      <div className="text-[10px] text-slate-400">Live market rates</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('disease'); setIntelDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'disease' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    <Bug className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="font-semibold">Disease & Pest Risk</div>
                      <div className="text-[10px] text-slate-400">Early warning system</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('soil'); setIntelDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'soil' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    <FlaskConical className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Soil Health & NPK</div>
                      <div className="text-[10px] text-slate-400">Nutrients & pH analysis</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 5. Operations Dropdown */}
            <div className="relative" ref={opsRef}>
              <button
                type="button"
                onClick={() => setOpsDropdownOpen(!opsDropdownOpen)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isOpsActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>{getOpsActiveLabel()}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${opsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {opsDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => { onSelectView('inventory'); setOpsDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'inventory' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    <Pill className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="font-semibold">Inventory Management</div>
                      <div className="text-[10px] text-slate-400">Fertilizers & Pesticides</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('weather'); setOpsDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'weather' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    <CloudSun className="w-4 h-4 text-teal-400" />
                    <div>
                      <div className="font-semibold">Weather Radar</div>
                      <div className="text-[10px] text-slate-400">Live 7-day forecast</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSelectView('chat'); setOpsDropdownOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-colors ${
                      currentView === 'chat' ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-semibold">AI Agricultural Advisor</div>
                      <div className="text-[10px] text-slate-400">Gemini-powered chatbot</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 6. Officer Portal */}
            <button
              type="button"
              onClick={() => onSelectView('officer')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currentView === 'officer'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 text-amber-300 border border-amber-500/30 hover:bg-amber-500/10'
              }`}
            >
              <Shield className="w-4 h-4" />
              Officer Dashboard
            </button>
          </nav>

          {/* Right Action Bar: Alerts & User Controls */}
          <div className="hidden lg:flex items-center gap-3">
            
            {/* Smart Alerts Trigger */}
            <button
              type="button"
              onClick={onOpenAlerts}
              className="relative px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              title="Smart Alerts Center"
            >
              <Bell className="w-4 h-4 text-red-400" />
              <span>Alerts</span>
              {unreadAlertCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-red-500 text-white rounded-full animate-pulse">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            {/* User Session Profile Pill */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-slate-200 font-semibold max-w-[120px] truncate">
                    {user.name || user.email || 'Farmer'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
                  title="Log out"
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
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { onSelectView('home'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <Sprout className="w-4 h-4 text-emerald-400" /> Home
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('gis'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-emerald-400" /> Farm GIS
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('analytics'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4 text-blue-400" /> Analytics
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('yield'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <Brain className="w-4 h-4 text-emerald-400" /> AI Yield
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('harvest'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <Tractor className="w-4 h-4 text-amber-400" /> Harvest
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('prices'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <IndianRupee className="w-4 h-4 text-emerald-400" /> Crop Prices
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('disease'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <Bug className="w-4 h-4 text-rose-400" /> Disease Risk
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('soil'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <FlaskConical className="w-4 h-4 text-emerald-400" /> Soil Analysis
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('inventory'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <Pill className="w-4 h-4 text-purple-400" /> Inventory
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('weather'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <CloudSun className="w-4 h-4 text-teal-400" /> Weather
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('chat'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 col-span-2"
            >
              <MessageSquare className="w-4 h-4 text-blue-400" /> AI Advisor Chat
            </button>
            <button
              type="button"
              onClick={() => { onSelectView('officer'); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 col-span-2 shadow-lg"
            >
              <Shield className="w-4 h-4" /> Officer Dashboard
            </button>
          </div>

          {user && (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300 font-medium">{user.name || user.email}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

import React, { useState } from 'react';
import { Chat } from './components/Chat';
import { Home } from './components/Home';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import { FarmGISPage } from './components/FarmGIS/FarmGISPage';
import { WeatherDashboard } from './components/Weather/WeatherDashboard';
import { SoilAnalysisModule } from './components/Soil/SoilAnalysisModule';
import { YieldPredictionModule } from './components/Yield/YieldPredictionModule';
import { DiseaseRiskModule } from './components/Disease/DiseaseRiskModule';
import { FertilizerPesticideModule } from './components/Inventory/FertilizerPesticideModule';
import { HarvestManagementModule } from './components/Harvest/HarvestManagementModule';
import { CropPriceModule } from './components/CropPrice/CropPriceModule';
import { FarmAnalyticsDashboard } from './components/Analytics/FarmAnalyticsDashboard';
import { FarmData } from './services/farmService';
import { OfficerLogin } from './components/OfficerLogin';
import { OfficerDashboard } from './components/OfficerDashboard';
import { AuthWrapper } from './components/AuthWrapper';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { SmartAlertsCenter } from './components/Alerts/SmartAlertsCenter';
import { alertService } from './services/alertService';
import { Sprout, MessageSquare, Shield, LogOut, User, MapPin, CloudSun, FlaskConical, Brain, Bug, Pill, Tractor, IndianRupee, BarChart3, Bell } from 'lucide-react';

type LocationData = {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  state?: string;
  district?: string;
};

function AppContent() {
  const [token, setToken] = useState(null);
  const [view, setView] = useState('home');
  const [activeFarm, setActiveFarm] = useState<FarmData | null>(null);
  const [dashboardData, setDashboardData] = useState<{
    location: LocationData;
    crop: string;
    farmDetails?: FarmData;
  } | null>(null);
  const { user, logout } = useAuth();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  React.useEffect(() => {
    const loadAlerts = async () => {
      try {
        const telemetry = {
          farm: { id: activeFarm?.id || 'farm_01', name: activeFarm?.name || 'Ghaziabad Rice Field', crop: dashboardData?.crop || activeFarm?.crop || 'Rice' },
          weather: { temperature_c: 34, humidity: 76, wind_speed_kmh: 18, rain_mm: 12 },
          soil: { moisture: 24, ph: 5.4 },
          disease: { riskScore: 82, name: 'Rice Blast & Sheath Rot' },
          gdd: { progressPercentage: 82, currentStage: 'Grain Filling Stage' },
          yieldData: { predictedYield: 4.5, historicalAvgYield: 5.5 }
        };
        const alerts = await alertService.evaluateTelemetry(telemetry);
        setUnreadAlertCount(alerts.filter(a => a.status === 'unread').length);
      } catch (e) {}
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [activeFarm, dashboardData]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDashboardSubmit = (location: LocationData, crop: string) => {
    setDashboardData({ location, crop, farmDetails: activeFarm || undefined });
    setView('dashboard');
  };

  const handleSelectFarmFromGIS = (farm: FarmData) => {
    setActiveFarm(farm);
    setDashboardData({
      location: {
        latitude: farm.latitude,
        longitude: farm.longitude,
        city: farm.location_name,
        country: 'India'
      },
      crop: farm.crop,
      farmDetails: farm
    });
  };

  const handleBackToLanding = () => {
    setDashboardData(null);
    setView('home');
  };

  return (
    <div className="min-h-screen bg-neutral-light flex flex-col">
      {/* Dynamic Main App Navbar */}
      <header className="navbar border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-light text-brand-green"><Sprout className="w-5 h-5" /></div>
            <h1 className="text-lg font-semibold">AgriSense Assistant</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2">
              <button className={`btn !py-2 !px-3 relative bg-red-50 text-red-700 border border-red-200 font-bold`} onClick={() => setIsAlertsOpen(true)}>
                <Bell className="w-4 h-4 text-red-600" />
                Alerts
                {unreadAlertCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-bounce shadow">
                    {unreadAlertCount}
                  </span>
                )}
              </button>
              <button className={`btn !py-2 !px-3 ${(view==='home' || view==='dashboard')?'opacity-100':'opacity-85'}`} onClick={() => setView('home')}><Sprout className="w-4 h-4"/> {t('nav.home')}</button>
              <button className={`btn !py-2 !px-3 ${view==='gis'?'opacity-100':'opacity-85'} bg-emerald-50 text-emerald-700 border border-emerald-200`} onClick={() => setView('gis')}><MapPin className="w-4 h-4"/> Farm GIS</button>
              <button className={`btn !py-2 !px-3 ${view==='analytics'?'opacity-100':'opacity-85'} bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold`} onClick={() => setView('analytics')}><BarChart3 className="w-4 h-4"/> Analytics</button>
              <button className={`btn !py-2 !px-3 ${view==='yield'?'opacity-100':'opacity-85'} bg-emerald-50 text-emerald-700 border border-emerald-200`} onClick={() => setView('yield')}><Brain className="w-4 h-4"/> AI Yield</button>
              <button className={`btn !py-2 !px-3 ${view==='harvest'?'opacity-100':'opacity-85'} bg-amber-50 text-amber-900 border border-amber-300 font-bold`} onClick={() => setView('harvest')}><Tractor className="w-4 h-4"/> Harvest</button>
              <button className={`btn !py-2 !px-3 ${view==='prices'?'opacity-100':'opacity-85'} bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold`} onClick={() => setView('prices')}><IndianRupee className="w-4 h-4"/> Crop Prices</button>
              <button className={`btn !py-2 !px-3 ${view==='disease'?'opacity-100':'opacity-85'} bg-rose-50 text-rose-700 border border-rose-200`} onClick={() => setView('disease')}><Bug className="w-4 h-4"/> Disease Risk</button>
              <button className={`btn !py-2 !px-3 ${view==='inventory'?'opacity-100':'opacity-85'} bg-purple-50 text-purple-700 border border-purple-200`} onClick={() => setView('inventory')}><Pill className="w-4 h-4"/> Inventory</button>
              <button className={`btn !py-2 !px-3 ${view==='soil'?'opacity-100':'opacity-85'} bg-emerald-50 text-emerald-700 border border-emerald-200`} onClick={() => setView('soil')}><FlaskConical className="w-4 h-4"/> Soil Analysis</button>
              <button className={`btn !py-2 !px-3 ${view==='weather'?'opacity-100':'opacity-85'} bg-teal-50 text-teal-700 border border-teal-200`} onClick={() => setView('weather')}><CloudSun className="w-4 h-4"/> Weather</button>
              <button className={`btn !py-2 !px-3 ${view==='chat'?'opacity-100':'opacity-85'}`} onClick={() => setView('chat')}><MessageSquare className="w-4 h-4"/> {t('nav.chat')}</button>
              <button className={`btn !py-2 !px-3 bg-white text-brand-green border border-brand-green hover:bg-brand-light ${view==='officer'?'opacity-100':'opacity-85'}`} onClick={() => setView('officer')}><Shield className="w-4 h-4"/> {t('nav.officer')}</button>
            </nav>
            {user && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-lg">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">{user.name || user.email || t('nav.welcome')}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('nav.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        {view === 'home' && (
          <LandingPage onSubmit={handleDashboardSubmit} />
        )}
        {view === 'gis' && (
          <FarmGISPage
            onSelectFarmForDashboard={handleSelectFarmFromGIS}
            onGoToDashboard={() => setView('dashboard')}
          />
        )}
        {view === 'analytics' && (
          <FarmAnalyticsDashboard
            farm={activeFarm}
            location={dashboardData?.location}
            crop={dashboardData?.crop}
          />
        )}
        {view === 'yield' && (
          <YieldPredictionModule
            farm={activeFarm}
            location={dashboardData?.location}
            crop={dashboardData?.crop}
          />
        )}
        {view === 'harvest' && (
          <HarvestManagementModule
            farm={activeFarm}
            location={dashboardData?.location}
            crop={dashboardData?.crop}
          />
        )}
        {view === 'prices' && (
          <CropPriceModule
            farm={activeFarm}
            location={dashboardData?.location}
            crop={dashboardData?.crop}
          />
        )}
        {view === 'disease' && (
          <DiseaseRiskModule
            farm={activeFarm}
            location={dashboardData?.location}
            crop={dashboardData?.crop}
          />
        )}
        {view === 'inventory' && (
          <FertilizerPesticideModule
            farm={activeFarm}
            location={dashboardData?.location}
            crop={dashboardData?.crop}
          />
        )}
        {view === 'soil' && (
          <SoilAnalysisModule
            farm={activeFarm}
            location={dashboardData?.location}
            crop={dashboardData?.crop}
          />
        )}
        {view === 'weather' && (
          <WeatherDashboard
            farm={activeFarm}
            location={dashboardData?.location}
            crop={dashboardData?.crop}
          />
        )}
        {view === 'dashboard' && dashboardData && (
          <Dashboard 
            location={dashboardData.location}
            crop={dashboardData.crop}
            farmDetails={dashboardData.farmDetails}
            onBack={handleBackToLanding}
          />
        )}
        {view === 'chat' && (
          <div className="px-4 py-8">
            <div className="max-w-6xl mx-auto">
              <Chat />
            </div>
          </div>
        )}
        {view === 'officer' && (
          <div className="px-4 py-8">
            <div className="max-w-6xl mx-auto">
              {token ? (
                <OfficerDashboard token={token} onLogout={() => setToken(null)} />
              ) : (
                <div className="max-w-md mx-auto card p-6">
                  <OfficerLogin onToken={(t) => setToken(t)} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <SmartAlertsCenter
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onNavigateModule={(modKey) => setView(modKey)}
        activeFarmId={activeFarm?.id || 'farm_01'}
        isOfficer={user?.role === 'officer' || user?.role === 'admin'}
      />
      <footer className="border-t border-gray-100 bg-white/70">
        <div className="max-w-6xl mx-auto px-4 py-5 text-sm text-gray-600 flex items-center justify-between">
          <span>© {new Date().getFullYear()} AgriSense Assistant</span>
          <span>Built with care for farmers</span>
        </div>
      </footer>
    </div>
  );
}

export const App = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AuthWrapper>
          <AppContent />
        </AuthWrapper>
      </AuthProvider>
    </LanguageProvider>
  );
};



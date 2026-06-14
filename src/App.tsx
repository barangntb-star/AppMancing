import React, { useState, useEffect, useRef } from 'react';
import { Fish, SonarSettings, CatchLog, PondStructure, DeviceStatus } from './types';
import { generateInitialFishes, updateFishPositions } from './utils/simulation';
import DevicePanel from './components/DevicePanel';
import SonarDisplay from './components/SonarDisplay';
import PondMap from './components/PondMap';
import LogbookPanel from './components/LogbookPanel';
import SmartAdvisor from './components/SmartAdvisor';
import { playFishAlert, playSonarPing } from './utils/sound';
import { 
  Wifi, 
  Settings, 
  Map, 
  BookOpen, 
  Compass, 
  Tv, 
  Sparkles, 
  Info, 
  HelpCircle, 
  HelpCircleIcon, 
  HelpCircle as QuestionIcon,
  Anchor,
  Moon,
  Sun,
  Clock
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'sonar_catch_logs_v1';

const MOCK_INITIAL_LOGS: CatchLog[] = [
  {
    id: 'catch_1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    species: 'Ikan Mas',
    weight: 2.15,
    length: 45,
    bait: 'Pelet Wangi Pandan',
    depth: 2.4,
    notes: 'Tarikan sangat kuat! Ikan berkumpul di dekat struktur kayu dasar kolam sebelah timur pancing.'
  },
  {
    id: 'catch_2',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    species: 'Ikan Nila',
    weight: 0.65,
    length: 22,
    bait: 'Cacing Tanah Merah',
    depth: 1.2,
    notes: 'Dipancing gerombolan Nila melayang di kedalaman tanggung dekat permukaan.'
  }
];

export default function App() {
  // Global Navigation State
  const [activeTab, setActiveTab] = useState<'sonar' | 'map' | 'journal' | 'advisor'>('sonar');
  
  // App Core States
  const [device, setDevice] = useState<DeviceStatus>({
    connected: true,
    connecting: false,
    battery: 95,
    signalStrength: 5,
    waterTemp: 26.2,
    airTemp: 30.5,
    waterClarity: 'sedang',
    phLevel: 7.2,
    error: null
  });

  const [settings, setSettings] = useState<SonarSettings>({
    frequency: 'CHIRP',
    beamAngle: 20,
    sensitivity: 80,
    depthRange: 'auto',
    noiseFilter: 'low',
    fishSymbols: true,
    fishDepthLabels: true,
    colorPalette: 'marine',
    alarmSmall: true,
    alarmMedium: true,
    alarmLarge: true,
    soundEnabled: true
  });

  const [fishes, setFishes] = useState<Fish[]>([]);
  const [structures, setStructures] = useState<PondStructure[]>([]);
  const [logs, setLogs] = useState<CatchLog[]>([]);
  
  // Guide helper modal toggle
  const [showIntro, setShowIntro] = useState(true);

  // Load history catch logs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setLogs(JSON.parse(stored));
      } else {
        setLogs(MOCK_INITIAL_LOGS);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(MOCK_INITIAL_LOGS));
      }
    } catch (e) {
      console.error('Error reading localStorage logs', e);
      setLogs(MOCK_INITIAL_LOGS);
    }

    // Populate initial fishes (12 simulated fishes)
    setFishes(generateInitialFishes(12, 5));
  }, []);

  // Update localStorage logs
  const saveLogs = (updatedLogs: CatchLog[]) => {
    setLogs(updatedLogs);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch (e) {
      console.error('Failed to write local logs', e);
    }
  };

  const handleAddLog = (newLog: Omit<CatchLog, 'id' | 'timestamp'>) => {
    const fullLog: CatchLog = {
      ...newLog,
      id: `catch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    saveLogs([fullLog, ...logs]);
  };

  const handleRemoveLog = (id: string) => {
    const updated = logs.filter((log) => log.id !== id);
    saveLogs(updated);
  };

  // Device connection simulators
  const handleConnectToggle = () => {
    if (device.connected) {
      setDevice(prev => ({
        ...prev,
        connected: false,
        signalStrength: 0
      }));
    } else {
      setDevice(prev => ({ ...prev, connecting: true }));
      
      // Re-connect fake timeout
      setTimeout(() => {
        setDevice(prev => ({
          ...prev,
          connected: true,
          connecting: false,
          battery: Math.min(100, Math.max(10, prev.battery - Math.floor(Math.random() * 5))),
          signalStrength: 4 + Math.floor(Math.random() * 2),
        }));
        if (settings.soundEnabled) {
          playFishAlert('medium'); // Beep indicators
        }
      }, 1500);
    }
  };

  const handleUpdateDevice = (updates: Partial<DeviceStatus>) => {
    setDevice(prev => ({ ...prev, ...updates }));
  };

  const handleUpdateSettings = (updates: Partial<SonarSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Structures management
  const handleAddStructure = (newStruct: Omit<PondStructure, 'id' | 'createdAt'>) => {
    const id = `struct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setStructures(prev => [
      ...prev,
      {
        ...newStruct,
        id,
        createdAt: Date.now()
      }
    ]);
  };

  const handleRemoveStructure = (id: string) => {
    setStructures(prev => prev.filter(s => s.id !== id));
  };

  const handleClearStructures = () => {
    setStructures([]);
  };

  // 1. Core Physics Simulation Tick Loop (60FPS clock)
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const deltaTime = Math.min(0.05, (now - lastTime) / 1000); // capped delta
      lastTime = now;

      // Only update positions if sonar is turned on and connected
      if (device.connected) {
        // 1. Update fish swimming coordinates
        setFishes((prevFishes) => updateFishPositions(prevFishes, structures, 5, deltaTime));

        // 2. Slow feeding pellets depletion
        setStructures((prevStructures) => {
          return prevStructures
            .map((s) => {
              if (s.type === 'food' && s.amount !== undefined) {
                // Check if any fish is nearby and eating
                const fishesEating = fishes.filter(f => {
                  const dx = f.x - s.x;
                  const dy = f.y - s.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  return dist < 8; // near pellet
                });

                if (fishesEating.length > 0) {
                  // Deplete food faster depending on fishes count
                  const rate = 1.0 + (fishesEating.length * 0.8);
                  const nextAmt = s.amount - rate * deltaTime * 5;
                  return { ...s, amount: Math.max(0, parseFloat(nextAmt.toFixed(1))) };
                }
              }
              return s;
            })
            // Filter out empty food pellets
            .filter((s) => s.type !== 'food' || (s.amount !== undefined && s.amount > 0));
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [structures, device.connected, fishes]);

  // Current primary sonar depth based on average bottom profile values or fixed value
  const currentDepth = 3.8;

  // Best Feeding Time predictor context (Indonesian)
  const isNight = new Date().getHours() < 6 || new Date().getHours() > 18;

  return (
    <div id="app-root" className="min-h-screen bg-geo-bg text-[#E0E6ED] flex flex-col font-sans transition-all selection:bg-geo-cyan selection:text-black">
      
      {/* Modern High-End Top Navigation Header */}
      <header className="relative z-10 border-b border-geo-border bg-geo-panel px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Side Logo Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center p-2 rounded-none bg-[#00D1FF] text-black font-bold uppercase shadow-[0_0_15px_rgba(0,209,255,0.4)]">
            <Anchor className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-md sm:text-lg font-black font-space tracking-tight text-white uppercase">
                SonarHook <span className="text-geo-cyan">Pro</span>
              </h1>
              <span className="text-[9px] bg-[#1E293B] text-geo-cyan border border-geo-cyan/30 font-bold uppercase py-0.5 px-1.5 rounded-none font-mono">
                POND MASTER
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              SISTEM DETEKSI KEDALAMAN DAN KAWANAN IKAN REALT-TIME
            </p>
          </div>
        </div>

        {/* Dynamic Fisherman Moon/Sun context telemetry */}
        <div className="hidden md:flex items-center gap-6 bg-[#050B10] p-2.5 rounded-none border border-geo-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-geo-cyan" />
            <div className="text-left font-mono">
              <span className="text-[8px] text-[#64748B] block pb-0">PILIHAN WAKTU</span>
              <span className="text-xs text-slate-300 font-bold">
                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-geo-border pl-4">
            {isNight ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-geo-cyan" />
            )}
            <div className="text-left font-mono">
              <span className="text-[8px] text-[#64748B] block pb-0">AKTIVITAS MAKAN</span>
              <span className="text-xs text-geo-green font-bold">TINGGI (92%)</span>
            </div>
          </div>
        </div>

        {/* Right Side Help / Trigger guidelines button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 ">
            <div className="w-2 h-2 rounded-full bg-geo-green shadow-[0_0_8px_#10B981]"></div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">SONAR XT PRO</span>
          </div>

          <button
            onClick={() => setShowIntro(prev => !prev)}
            className="p-2 bg-geo-bg hover:bg-slate-900 rounded-none border border-geo-border text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Info Bantuan"
          >
            <QuestionIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Guided Intro Banner Modal (Closable) */}
      {showIntro && (
        <div className="relative z-10 m-6 mx-auto max-w-5xl w-[calc(100%-3rem)] bg-geo-panel border border-[#00D1FF]/30 p-6 rounded-none shadow-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-12 h-12 bg-geo-cyan/10 border border-geo-cyan/30 flex items-center justify-center text-geo-cyan shrink-0 rounded-none">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-sm font-bold text-geo-cyan uppercase tracking-wider font-space">
              TAMPILAN GEOMETRIC BALANCE AKTIF • READY TO SCAN
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Selamat datang Angler! Sensor Sonar XT Anda telah terhubung dan dikalibrasi pada frekuensi kerja <strong>CHIRP / 200kHz</strong>. 
              Gunakan tab <strong className="text-white">Pantau Sonar</strong> untuk monitoring kedalaman waktu-nyata, navigasikan tab <strong className="text-white">Peta Kontur & Bait</strong> untuk menjatuhkan umpan pelet jitu pada koordinat yang tepat, atau pantau statistik di <strong className="text-white">Jurnal Pancing</strong>.
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="bg-[#050B10] hover:bg-[#1E293B]/60 border border-geo-border text-[10px] font-mono font-bold text-geo-cyan py-1.5 px-3.5 rounded-none cursor-pointer transition-colors shrink-0"
          >
            TUTUP PANEL
          </button>
        </div>
      )}

      {/* Main Grid Workdesk */}
      <main className="relative z-10 flex-1 px-6 pb-12 max-w-7xl w-full mx-auto flex flex-col gap-6 mt-6">
        
        {/* Navigation Tabs Bar with Sharp Geometric Styling */}
        <div className="flex justify-start bg-geo-panel p-1 border border-geo-border rounded-none max-w-fit select-none">
          {/* Sonar View */}
          <button
            onClick={() => setActiveTab('sonar')}
            className={`px-6 py-2.5 rounded-none text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'sonar'
                ? 'bg-geo-bg text-geo-cyan border-geo-cyan font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Tv className="w-4 h-4" />
            PANTAU SONAR
          </button>

          {/* Map View */}
          <button
            onClick={() => setActiveTab('map')}
            className={`px-6 py-2.5 rounded-none text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'map'
                ? 'bg-geo-bg text-geo-cyan border-geo-cyan font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Map className="w-4 h-4" />
            PETA KONTUR & BAIT
          </button>

          {/* Logbook View */}
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-6 py-2.5 rounded-none text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'journal'
                ? 'bg-geo-bg text-geo-cyan border-geo-cyan font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            JURNAL PANCING
          </button>

          {/* Advisor View */}
          <button
            onClick={() => setActiveTab('advisor')}
            className={`px-6 py-2.5 rounded-none text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'advisor'
                ? 'bg-geo-bg text-geo-cyan border-geo-cyan font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Compass className="w-4 h-4" />
            PANDUAN AI
          </button>
        </div>

        {/* Primary View Routing Panels */}
        <div className="flex-1">
          {activeTab === 'sonar' && (
            <div className="flex flex-col gap-6">
              {/* Sonar Screens and device status */}
              <DevicePanel 
                device={device} 
                onUpdateDevice={handleUpdateDevice} 
                onConnectToggle={handleConnectToggle} 
              />
              
              <SonarDisplay 
                device={device} 
                fishes={fishes} 
                settings={settings} 
                onUpdateSettings={handleUpdateSettings} 
                maxDepth={currentDepth} 
              />

              <SmartAdvisor 
                device={device}
                fishes={fishes}
                structures={structures}
              />
            </div>
          )}

          {activeTab === 'map' && (
            <div className="flex flex-col gap-6">
              <PondMap 
                fishes={fishes}
                structures={structures}
                onAddStructure={handleAddStructure}
                onRemoveStructure={handleRemoveStructure}
                onClearStructures={handleClearStructures}
              />
              <SmartAdvisor 
                device={device}
                fishes={fishes}
                structures={structures}
              />
            </div>
          )}

          {activeTab === 'journal' && (
            <LogbookPanel 
              logs={logs}
              onAddLog={handleAddLog}
              onRemoveLog={handleRemoveLog}
              currentDepth={currentDepth}
            />
          )}

          {activeTab === 'advisor' && (
            <SmartAdvisor 
              device={device}
              fishes={fishes}
              structures={structures}
            />
          )}
        </div>
      </main>

      {/* Futuristic footer credit limits */}
      <footer className="mt-auto border-t border-geo-border bg-geo-bg p-6 text-center text-[#475569] text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
          <p>© {new Date().getFullYear()} SONARHOOK PRO. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-geo-cyan" />
              LAG TIME: 0.02ms (REAL-TIME)
            </span>
            <span className="text-[#1E293B]">|</span>
            <span className="text-geo-cyan">POND_SCAN_HD MODE</span>
          </div>
        </div>
      </footer>
    </div>
  );;
}

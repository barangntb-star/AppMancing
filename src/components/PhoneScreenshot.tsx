import React, { useState, useEffect, useRef } from 'react';
import { Camera, Phone, RotateCcw, Trash2, MapPin, CheckCircle, Download, MonitorSmartphone, Wifi, AlertCircle, Share2, Shield, Eye, HelpCircle, HardDriveDownload } from 'lucide-react';
import { Fish, SonarSettings, DeviceStatus } from '../types';

interface PhoneScreenshotProps {
  device: DeviceStatus;
  fishes: Fish[];
  settings: SonarSettings;
  gpsData: {
    latitude: number;
    longitude: number;
    pondName: string;
  };
  maxDepth: number;
}

interface SavedScreenshot {
  id: string;
  timestamp: string;
  pondName: string;
  latitude: number;
  longitude: number;
  maxDepth: number;
  waterTemp: number;
  fishesCaptured: {
    species: string;
    depth: number;
    size: 'small' | 'medium' | 'large';
    weight: number;
  }[];
  batteryLevel: number;
  frequency: string;
}

export default function PhoneScreenshot({
  device,
  fishes,
  settings,
  gpsData,
  maxDepth
}: PhoneScreenshotProps) {
  const [savedScreenshots, setSavedScreenshots] = useState<SavedScreenshot[]>([]);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedScreenshot, setExpandedScreenshot] = useState<SavedScreenshot | null>(null);

  // Load saved screenshots from window local storage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sonar_hp_screenshots');
      if (saved) {
        setSavedScreenshots(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load screenshots from localStorage", e);
    }
  }, []);

  // Save to local storage
  const saveToStorage = (list: SavedScreenshot[]) => {
    try {
      localStorage.setItem('sonar_hp_screenshots', JSON.stringify(list));
    } catch (e) {
      console.error("Failed to save screenshots to localStorage", e);
    }
  };

  const handleCapture = () => {
    // 1. Play flash animation
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 250);

    // 2. Play camera sound if audio is enabled
    if (settings.soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Camera Shutter white-noise burst style
        const bufferSize = audioCtx.sampleRate * 0.15; // 150ms
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        // Simple bandpass filter for metallic click
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        
        noise.connect(filter);
        filter.connect(audioCtx.destination);
        noise.start();
      } catch (err) {
        console.warn("Unable to play capture audio sound effect", err);
      }
    }

    // 3. Construct screenshot metadata representing current snap
    // Capture only active fishes within view
    const visibleFishes = fishes
      .filter((f) => f.active && f.y < 85) // keep fish above bottom sediment level
      .map((f) => ({
        species: f.species,
        depth: f.depth,
        size: f.size,
        weight: f.weight
      }));

    const newSnap: SavedScreenshot = {
      id: `hp_snap_${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      }),
      pondName: gpsData.pondName || 'Kolam Pancing Aktif',
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      maxDepth: maxDepth,
      waterTemp: device.connected ? device.waterTemp : 26.5,
      fishesCaptured: visibleFishes,
      batteryLevel: device.connected ? device.battery : 88,
      frequency: settings.frequency
    };

    const updatedList = [newSnap, ...savedScreenshots];
    setSavedScreenshots(updatedList);
    saveToStorage(updatedList);

    // 4. Show mobile toast feedback
    setToastMessage("Tangkapan layar disimpan ke memo pancing!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const deleteScreenshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedScreenshots.filter((s) => s.id !== id);
    setSavedScreenshots(updated);
    saveToStorage(updated);
    if (expandedScreenshot?.id === id) {
      setExpandedScreenshot(null);
    }
  };

  const clearAllScreenshots = () => {
    if (window.confirm("Apakah Anda ingin menghapus semua daftar tangkapan layar?")) {
      setSavedScreenshots([]);
      saveToStorage([]);
      setExpandedScreenshot(null);
    }
  };

  // Convert depth to visual Y position inside phone display
  const getFishStyleY = (depthPercent: number) => {
    // Normalise depth level visually so they stack beautifully
    return `calc(${depthPercent}% - 12px)`;
  };

  return (
    <div id="hp-screenshot-station" className="bg-[#0b141d] border border-geo-border rounded-none p-5 text-[#E0E6ED] flex flex-col gap-5">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-geo-border pb-4 gap-4">
        <div>
          <span className="text-[10px] text-geo-cyan font-mono tracking-widest uppercase block">DISPLAY PREVIEW PORTABLE</span>
          <h2 className="text-lg font-bold font-space flex items-center gap-2 mt-0.5 uppercase">
            TANGKAPAN LAYAR HP & POSISI IKAN
            <span className="text-[9px] bg-geo-cyan/10 text-geo-cyan px-2 py-0.5 rounded-none border border-geo-cyan/30">
              SMARTPHONE HUD
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {savedScreenshots.length > 0 && (
            <button
              onClick={clearAllScreenshots}
              className="bg-black hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 font-mono text-[10px] uppercase py-1.5 px-3 border border-rose-500/20 hover:border-rose-500/40 rounded-none transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Galeri
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Rugged Smartphone Display Simulator Mockup */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4">
          
          <span className="text-[10px] text-slate-400 font-mono tracking-wider text-center block">
            REDUCE SIZE / SIMULATOR HANDPHONE OUTDOOR RUGGED
          </span>

          {/* Sizing box for the Phone framework */}
          <div className="relative w-full max-w-[290px] aspect-[9/18] bg-black rounded-[36px] p-3.5 border-[6px] border-slate-700 shadow-[0_12px_40px_rgba(0,0,0,0.8)] ring-1 ring-slate-800 flex flex-col overflow-hidden">
            
            {/* Top speaker grill and camera punch hole */}
            <div className="absolute top-0 left-12 right-12 h-6 bg-slate-900 rounded-b-2xl z-40 flex items-center justify-center gap-1.5 border-b border-slate-800">
              <div className="w-12 h-1 bg-slate-700 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-slate-800 rounded-full border border-slate-600"></div>
            </div>

            {/* Inner AMOLED Display screen container */}
            <div className="relative flex-1 bg-[#03070b] rounded-[24px] overflow-hidden border border-slate-950 flex flex-col z-10 selection:bg-transparent">
              
              {/* Android top bar indicator */}
              <div className="h-6 px-4 pt-1 flex items-center justify-between text-[8.5px] font-mono text-slate-400 bg-black/60 z-30 select-none">
                <span>08:49</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#00d1ff] tracking-tighter">CHIRP 200kHz</span>
                  <Wifi className="w-2.5 h-2.5 text-geo-cyan" />
                  <span>{device.connected ? `${device.battery}%` : '85%'}🔋</span>
                </div>
              </div>

              {/* Screen capture camera flash overlay layer */}
              {shutterFlash && (
                <div className="absolute inset-0 bg-white z-50 animate-pulse pointer-events-none"></div>
              )}

              {/* Outer App Screen mockup area */}
              <div className="flex-1 flex flex-col relative">
                
                {/* Sonar water flow visual mockup */}
                <div className="absolute inset-0 bg-[#050B10] flex flex-col overflow-hidden">
                  
                  {/* Grid overlay lines */}
                  <div className="absolute inset-0 bg-scanlines opacity-10"></div>
                  <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                    <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                    <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                    <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                    <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                    <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                  </div>

                  {/* Ocean top blue gradient bloom */}
                  <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-geo-cyan/25 to-transparent"></div>

                  {/* Simulated sandy rocky bottom of the pond */}
                  <div className="absolute bottom-0 left-0 right-0 h-[22%] bg-gradient-to-t from-black via-red-950/40 to-yellow-900/30 border-t-2 border-dashed border-[#F59E0B]/50 flex items-center justify-center">
                    <span className="text-[7.5px] font-mono text-[#F59E0B]/40 uppercase select-none font-bold tracking-widest">
                      POND FLOOR
                    </span>
                  </div>

                  {/* DYNAMIC FISH PLACEMENT inside phone capture viewport! */}
                  <div className="absolute inset-0 top-6 bottom-[22%]">
                    {device.connected ? (
                      fishes
                        .filter((f) => f.active && f.y < 85) // keep above silt
                        .map((fish) => {
                          const sizeColor = fish.size === 'large' ? 'bg-red-500' : fish.size === 'medium' ? 'bg-amber-400' : 'bg-geo-cyan';
                          const scaleStyle = fish.size === 'large' ? 'scale-110' : fish.size === 'medium' ? 'scale-90' : 'scale-75';

                          return (
                            <div
                              key={fish.id}
                              style={{
                                left: `${Math.max(10, Math.min(85, fish.x))}%`,
                                top: getFishStyleY(fish.y)
                              }}
                              className="absolute transition-all duration-1000 ease-out flex flex-col items-center text-center z-20 pointer-events-none"
                            >
                              {/* Swimmer dot / fish silhouette symbol */}
                              <div className={`relative px-1 bg-black/90 border border-slate-700 p-1 flex items-center gap-1 shadow-md max-w-max rounded-sm ${scaleStyle}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${sizeColor} animate-pulse`}></div>
                                <span className="text-[8px] font-mono font-bold text-white uppercase">{fish.species}</span>
                              </div>
                              
                              {/* Depth bubble label */}
                              <div className="bg-slate-900 border border-slate-700/80 text-white rounded-none px-1 text-[7px] font-mono font-bold mt-0.5 shadow-sm">
                                {fish.depth}m
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-500">
                        <AlertCircle className="w-8 h-8 text-geo-cyan/40 animate-pulse mb-1" />
                        <span className="text-[9px] font-mono leading-relaxed mt-0.5 uppercase tracking-widest">
                          TUNTUNAN SONAR OFFLINE INTIL
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom bar of App with current GPS overlay HUD */}
                  <div className="absolute bottom-[22%] left-2 right-2 bg-black/85 border border-[#00D1FF]/20 p-2 text-[7px] font-mono flex flex-col gap-0.5 z-30 leading-snug rounded-sm shadow-md">
                    <div className="flex justify-between text-geo-cyan border-b border-geo-border pb-0.5 mb-0.5 uppercase font-bold">
                      <span className="truncate max-w-[120px]">📍 {gpsData.pondName}</span>
                      <span className="text-white">SONAR ONLINE</span>
                    </div>
                    <div className="text-slate-400">
                      LAT: <span className="text-slate-200 font-bold">{gpsData.latitude.toFixed(5)}</span>
                    </div>
                    <div className="text-slate-400">
                      LNG: <span className="text-slate-200 font-bold">{gpsData.longitude.toFixed(5)}</span>
                    </div>
                    {device.connected && (
                      <div className="text-geo-orange font-bold text-right pt-[1px] border-t border-[#00D1FF]/10">
                        AIR: {device.waterTemp}°C | RANGE: {maxDepth}M
                      </div>
                    )}
                  </div>

                </div>

                {/* Simulated branded logo head on the App */}
                <div className="absolute top-2 left-3 bg-black/45 border border-slate-800 px-1.5 py-0.5 rounded-none font-mono text-[7px] text-slate-300 pointer-events-none tracking-widest">
                  DEEPER SONAR XT
                </div>
              </div>

              {/* Phone navigation gestures line indicator at very bottom */}
              <div className="h-4 w-full bg-slate-950 flex justify-center items-center select-none">
                <div className="w-16 h-1 bg-slate-600 rounded-full"></div>
              </div>

            </div>
          </div>

          {/* Hardware shutter controller */}
          <button
            onClick={handleCapture}
            className="w-full max-w-[290px] mt-2 bg-geo-cyan hover:bg-[#00b5dd] text-black font-mono font-black text-xs py-3 px-4 rounded-none transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md select-none group"
          >
            <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
            AMBIL TANGKAPAN HP (SNAP)
          </button>

          {/* Toast Notification message */}
          {toastMessage && (
            <div className="bg-emerald-950/45 border border-emerald-500/40 px-3 py-1.5 rounded-none text-emerald-300 font-mono text-[9.5px] uppercase animate-bounce flex items-center gap-1.5 max-w-[290px]">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 text-center inline shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

        </div>

        {/* Right Column: Active Captured Dashboard Memo logs */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          <div className="bg-[#050B10] p-4 border border-geo-border rounded-none flex items-center justify-between">
            <div>
              <span className="text-[8px] text-[#64748B] font-mono uppercase tracking-wider block">MEMO GALLERIES STATUS</span>
              <span className="text-xs font-bold text-slate-200 block mt-0.5">
                Galeri Tangkapan Layar Handphone ({savedScreenshots.length} Tersimpan)
              </span>
            </div>

            <MonitorSmartphone className="w-5 h-5 text-geo-cyan" />
          </div>

          {savedScreenshots.length === 0 ? (
            <div className="border border-dashed border-geo-border p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Camera className="w-9 h-9 text-slate-600 animate-pulse mt-2" />
              <p className="text-xs font-mono uppercase tracking-wider font-semibold">Belum Ada Tangkapan Layar Tersimpan</p>
              <p className="text-[10px] text-slate-500 max-w-xs mt-0.5 leading-relaxed">
                Ketuk tombol <strong className="text-geo-cyan font-mono">"AMBIL TANGKAPAN HP"</strong> di sebelah kiri untuk merekam letak ikan dan koordinat Anda di kolam saat ini ke dalam memori pancing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedScreenshots.map((snap) => {
                const totalFishCount = snap.fishesCaptured.length;

                return (
                  <div
                    key={snap.id}
                    onClick={() => setExpandedScreenshot(snap)}
                    className="bg-[#0d141e] border border-geo-border/80 hover:border-geo-cyan hover:bg-[#0f1b2b] p-3 rounded-none transition-all cursor-pointer flex flex-col gap-3 relative group"
                  >
                    {/* Screen metadata banner */}
                    <div className="flex items-start justify-between border-b border-geo-border/60 pb-2">
                      <div className="max-w-[75%]">
                        <span className="text-[7.5px] text-geo-cyan font-mono tracking-widest block uppercase">TANGKAPAN LAYAR TERVERIFIKASI</span>
                        <h4 className="text-[10.5px] font-bold font-space truncate uppercase text-white mt-0.5">
                          {snap.pondName}
                        </h4>
                      </div>

                      <button
                        onClick={(e) => deleteScreenshot(snap.id, e)}
                        className="text-slate-500 hover:text-red-400 p-1 flex items-center justify-center hover:bg-slate-900 rounded-none cursor-pointer transition-colors"
                        title="Hapus Tangkapan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick values layout */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[8.5px] font-mono text-slate-400">
                      <div>
                        <span>WAKTU REKAM:</span>
                        <p className="text-slate-200 mt-0.5 font-bold">{snap.timestamp.split(' ').slice(1).join(' ')}</p>
                      </div>
                      <div>
                        <span>JUMLAH IKAN:</span>
                        <p className="text-emerald-400 mt-0.5 font-bold">{totalFishCount} Ekor</p>
                      </div>
                      <div>
                        <span>KOORDINAT SPOT:</span>
                        <p className="text-slate-300 mt-0.5 tracking-tight truncate hover:underline">
                          {snap.latitude.toFixed(5)}, {snap.longitude.toFixed(5)}
                        </p>
                      </div>
                      <div>
                        <span>SUHU DATA AIR:</span>
                        <p className="text-geo-orange mt-0.5 font-bold">{snap.waterTemp}°C</p>
                      </div>
                    </div>

                    {/* Collapsed fish tags bullet previews */}
                    <div className="flex flex-wrap gap-1 border-t border-geo-border/40 pt-2">
                      {totalFishCount > 0 ? (
                        snap.fishesCaptured.slice(0, 3).map((f, i) => (
                          <span
                            key={i}
                            className="bg-black/40 text-[#A0AEC0] border border-geo-border px-1.5 py-0.5 rounded-none text-[7.5px] font-mono"
                          >
                            {f.species} ({f.depth}m)
                          </span>
                        ))
                      ) : (
                        <span className="text-[7.5px] font-mono text-[#64748B] italic uppercase">
                          No active target fish detected during snap
                        </span>
                      )}
                      {totalFishCount > 3 && (
                        <span className="text-[7.5px] font-mono text-geo-cyan font-bold block pt-0.5">
                          +{totalFishCount - 3} lainnya
                        </span>
                      )}
                    </div>

                    <div className="text-[7.5px] font-mono text-slate-500 text-right mt-1 hover:text-geo-cyan flex items-center justify-end gap-1 select-none">
                      <Share2 className="w-2.5 h-2.5" /> DETAIL REPORT
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Expanded Snapshot Overlay (Interactive Modal Report) */}
      {expandedScreenshot && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 selection:bg-transparent">
          <div className="bg-[#0b141d] border-2 border-geo-cyan max-w-md w-full p-5 rounded-none flex flex-col gap-4 shadow-2xl relative">
            
            <div className="flex items-center justify-between border-b border-geo-border pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-geo-cyan" />
                <div>
                  <span className="text-[8px] text-[#5F6B7E] font-mono uppercase tracking-widest block font-bold">DIGITAL RECORD FISH SCAN</span>
                  <h3 className="text-xs font-bold font-space uppercase text-white mt-0.5">
                    BUKTI TANGKAPAN LAYAR TELEMETRI
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setExpandedScreenshot(null)}
                className="bg-black hover:bg-slate-900 border border-geo-border text-xs py-1.5 px-3 font-mono font-bold hover:text-white transition-all cursor-pointer rounded-none uppercase text-slate-400"
              >
                Tutup
              </button>
            </div>

            <div className="bg-[#050B10] border border-geo-border p-4 flex flex-col gap-3 font-mono text-xs">
              
              <div className="border-b border-slate-800 pb-2">
                <span className="text-[8px] text-[#64748B] uppercase tracking-wider block">NAMA LOKASI MEMO:</span>
                <p className="text-slate-100 font-black font-space uppercase tracking-wider text-sm mt-0.5">{expandedScreenshot.pondName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b border-slate-800/60 pb-2">
                <div>
                  <span className="text-[8.5px] text-[#64748B] uppercase block">LATITUDE</span>
                  <p className="text-white font-bold text-xs">{expandedScreenshot.latitude}</p>
                </div>
                <div>
                  <span className="text-[8.5px] text-[#64748B] uppercase block">LONGITUDE</span>
                  <p className="text-white font-bold text-xs">{expandedScreenshot.longitude}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-slate-800/60 pb-2">
                <div>
                  <span className="text-[8.5px] text-[#64748B] uppercase block">SUHU DATA</span>
                  <p className="text-geo-orange font-bold text-xs">{expandedScreenshot.waterTemp}°C</p>
                </div>
                <div>
                  <span className="text-[8.5px] text-[#64748B] uppercase block">PULSE</span>
                  <p className="text-geo-cyan font-bold text-xs uppercase">{expandedScreenshot.frequency}</p>
                </div>
                <div>
                  <span className="text-[8.5px] text-[#64748B] uppercase block">TEMP RANGE</span>
                  <p className="text-[#10B981] font-bold text-xs">{expandedScreenshot.maxDepth}M</p>
                </div>
              </div>

              {/* Detailed list of simulated target fishes captured */}
              <div>
                <span className="text-[8.5px] text-[#64748B] uppercase block mb-1.5 font-bold">ANALISIS IKAN DALAM JANGKAUAN HP:</span>
                
                {expandedScreenshot.fishesCaptured.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic uppercase">
                    Tidak ada pergerakan ikan aktif pada tangkapan layar ini.
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pr-1">
                    {expandedScreenshot.fishesCaptured.map((f, idx) => (
                      <div
                        key={idx}
                        className="bg-black/55 border border-slate-800 p-2 flex items-center justify-between text-[11px] rounded-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${f.size === 'large' ? 'bg-red-500' : f.size === 'medium' ? 'bg-amber-400' : 'bg-geo-cyan'}`} />
                          <span className="text-white font-bold uppercase">{f.species} ({f.size})</span>
                        </div>
                        <div className="text-slate-400 text-right">
                          <span>KEDALAMAN: <strong className="text-white font-mono">{f.depth}m</strong></span>
                          {f.weight > 0 && (
                            <span className="text-[10px] text-[#10B981] block font-semibold font-mono">{f.weight.toFixed(2)} KG</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Print/Export buttons */}
            <div className="flex gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${expandedScreenshot.latitude},${expandedScreenshot.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-black hover:bg-slate-900 text-center text-slate-100 font-mono font-bold text-[10px] py-2 px-3 border border-geo-border hover:border-slate-500 rounded-none uppercase transition-all flex items-center justify-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-geo-orange" />
                BUKA KOORDINAT UTAMA
              </a>
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-geo-cyan hover:bg-[#00b5dd] text-black font-mono font-bold text-[10px] py-2 px-4 rounded-none transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
              >
                <HardDriveDownload className="w-3.5 h-3.5" />
                Cetak Bukti
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { MapPin, Locate, Compass, ExternalLink, Globe, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface GpsCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  pondName: string;
}

interface GpsTrackerProps {
  gpsData: GpsCoords;
  onGpsUpdate: (data: GpsCoords) => void;
}

export default function GpsTracker({ gpsData, onGpsUpdate }: GpsTrackerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headingDegrees, setHeadingDegrees] = useState(0);

  // Auto-simulation of compass bearing to make the app look dynamic and organic
  useEffect(() => {
    const interval = setInterval(() => {
      setHeadingDegrees((prev) => (prev + (Math.random() * 6 - 3) + 360) % 360);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getBrowserLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Sistem GPS tidak didukung browser ini. Silakan input koordinat manual.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onGpsUpdate({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: position.coords.accuracy ? Number(position.coords.accuracy.toFixed(1)) : null,
          altitude: position.coords.altitude ? Number(position.coords.altitude.toFixed(1)) : null,
          heading: position.coords.heading,
          speed: position.coords.speed,
          pondName: gpsData.pondName || 'Kolam Aktif saat ini'
        });
        setLoading(false);
      },
      (err) => {
        console.error(err);
        let msg = 'Izin lokasi ditolak atau sinyal lemah.';
        if (err.code === 1) {
          msg = 'Izin lokasi (Geolocation) ditolak oleh browser/sistem.';
        } else if (err.code === 2) {
          msg = 'Posisi tidak tersedia (periksa hardware/sinyal GPS Anda).';
        } else if (err.code === 3) {
          msg = 'Batasan waktu pencarian habis (Timeout).';
        }
        setError(`${msg} Menggunakan koordinat default / silakan isi manual.`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Preset location quick adjustments
  const presets = [
    { name: 'Kolam Galatama Jabodetabek', lat: -6.2088, lng: 106.8456 },
    { name: 'Danau Toba (Samosir)', lat: 2.6283, lng: 98.8158 },
    { name: 'Waduk Jatiluhur', lat: -6.5234, lng: 107.3115 },
    { name: 'Kolam Danau Setu Babakan', lat: -6.3421, lng: 106.8188 }
  ];

  const applyPreset = (p: typeof presets[0]) => {
    onGpsUpdate({
      ...gpsData,
      latitude: p.lat,
      longitude: p.lng,
      pondName: p.name,
      accuracy: 5
    });
  };

  return (
    <div id="gps-tracker-panel" className="bg-geo-panel border border-geo-border rounded-none p-6 shadow-none text-[#E0E6ED] flex flex-col gap-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-geo-border pb-4">
        <div>
          <span className="text-[10px] text-geo-cyan font-mono tracking-widest uppercase block">TELEMETRI LOKASI & KOORDINAT</span>
          <h2 className="text-lg font-bold font-space flex items-center gap-2 mt-1 uppercase">
            GEOGRAPHIC GPS POSITION
            <span className="text-[10px] bg-geo-cyan/10 text-geo-cyan px-2 py-0.5 rounded-none border border-geo-cyan/30 font-mono tracking-wider">
              WGS84 SYSTEM
            </span>
          </h2>
        </div>

        <button
          onClick={getBrowserLocation}
          disabled={loading}
          className="bg-geo-cyan hover:bg-[#00b5dd] text-black font-mono font-bold text-xs py-2 px-4 rounded-none transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Locate className="w-4 h-4" />
          )}
          {loading ? 'MENGECEK GPS...' : 'SCAN LOKASI AKTIF'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Coordinates Output & Maps Interface */}
        <div className="md:col-span-8 flex flex-col gap-4">
          
          {/* Coordinates Cards Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Latitude Display & Modifier */}
            <div className="bg-[#050B10] p-4 border border-geo-border flex flex-col gap-1">
              <span className="text-[9px] text-[#64748B] font-mono uppercase tracking-wider">LATITUDE (GARIS LINTANG)</span>
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-geo-cyan shrink-0" />
                <input
                  type="number"
                  step="0.000001"
                  value={gpsData.latitude}
                  onChange={(e) => onGpsUpdate({ ...gpsData, latitude: parseFloat(e.target.value) || 0 })}
                  className="bg-transparent text-sm font-bold font-mono text-white focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Longitude Display & Modifier */}
            <div className="bg-[#050B10] p-4 border border-geo-border flex flex-col gap-1">
              <span className="text-[9px] text-[#64748B] font-mono uppercase tracking-wider">LONGITUDE (GARIS BUJUR)</span>
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-geo-orange shrink-0" />
                <input
                  type="number"
                  step="0.000001"
                  value={gpsData.longitude}
                  onChange={(e) => onGpsUpdate({ ...gpsData, longitude: parseFloat(e.target.value) || 0 })}
                  className="bg-transparent text-sm font-bold font-mono text-white focus:outline-none w-full"
                />
              </div>
            </div>

          </div>

          {/* Pond Description Input */}
          <div className="flex flex-col gap-2 bg-[#050B10] p-4 border border-geo-border">
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              NAMA KOLAM / DESKRIPSI SPOT :
            </label>
            <input
              type="text"
              placeholder="Contoh: Kolam Galatama Pak Joko, Pemancingan Harian..."
              value={gpsData.pondName}
              onChange={(e) => onGpsUpdate({ ...gpsData, pondName: e.target.value })}
              className="bg-[#0c151d] text-slate-200 border border-geo-border py-2 px-3 text-xs focus:outline-none focus:border-geo-cyan font-mono rounded-none"
            />
          </div>

          {/* Error notifications and instructions */}
          {error && (
            <div className="bg-red-950/20 border border-red-500/30 p-3 flex gap-2.5 items-start text-xs text-red-300 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Map action link and coordinates metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span>AKURASI: <strong className="text-geo-cyan">{gpsData.accuracy ? `±${gpsData.accuracy}m` : 'N/A (MANUAL)'}</strong></span>
              {gpsData.altitude !== null && (
                <span>ELEVASI: <strong className="text-emerald-400">{gpsData.altitude} mdpl</strong></span>
              )}
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${gpsData.latitude},${gpsData.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-geo-panel hover:bg-slate-900 border border-geo-border p-2 text-[10px] text-geo-cyan hover:text-white uppercase font-bold tracking-wider transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              BUKA DI GOOGLE MAPS
            </a>
          </div>

        </div>

        {/* Right Column: Direction Compass HUD & Presets */}
        <div className="md:col-span-4 flex flex-col gap-4 bg-[#050B10] p-5 border border-geo-border justify-between">
          
          {/* Bearings & Analog Compass Simulation */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-[9px] text-[#64748B] font-mono uppercase tracking-wider block text-center w-full">ARAHPANDU KOMPAS</span>
            
            <div className="relative w-28 h-28 border border-dashed border-geo-cyan/30 rounded-full flex items-center justify-center bg-[#071424]/40">
              {/* Compass Rings */}
              <div className="absolute inset-2 border border-geo-border rounded-full pointer-events-none"></div>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-mono text-[#475569]">
                <span className="absolute -top-1 font-bold text-red-400">N</span>
                <span className="absolute -bottom-1">S</span>
                <span className="absolute -left-1">W</span>
                <span className="absolute -right-1">E</span>
              </div>

              {/* Rotating Compass Pointer */}
              <div 
                style={{ transform: `rotate(${headingDegrees}deg)` }} 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-1000 ease-out pointer-events-none"
              >
                {/* Pointer Arrow */}
                <div className="w-1.5 h-14 bg-gradient-to-b from-red-500 via-slate-400 to-transparent -mt-14 relative rounded-full">
                  <div className="absolute w-2 h-2 rounded-full bg-red-400 -top-1 -left-[1px]"></div>
                </div>
              </div>
              
              <div className="w-3 h-3 rounded-full bg-black border border-geo-cyan relative z-10"></div>
            </div>
            
            <div className="text-center font-mono">
              <span className="text-[11px] font-bold text-slate-100">{headingDegrees.toFixed(0)}° {headingDegrees < 45 || headingDegrees > 315 ? 'UTARA (N)' : headingDegrees < 135 ? 'TIMUR (E)' : headingDegrees < 225 ? 'SELATAN (S)' : 'BARAT (W)'}</span>
            </div>
          </div>

          {/* Quick presets list for testing / pond location template */}
          <div className="border-t border-geo-border pt-3.5 flex flex-col gap-2">
            <span className="text-[8px] text-[#64748B] font-mono uppercase tracking-widest block">PRESET SPOT POPULER INDONESIA:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="text-[9px] font-mono text-left truncate p-1.5 border border-geo-border hover:border-geo-cyan hover:text-white transition-all text-slate-400 rounded-none cursor-pointer bg-geo-panel"
                  title={p.name}
                >
                  {p.name.substring(0, 15)}...
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

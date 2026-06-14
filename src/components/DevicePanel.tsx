import React, { useState } from 'react';
import { DeviceStatus } from '../types';
import { Wifi, WifiOff, Battery, Thermometer, Droplet, Gauge, Activity, Radio, RefreshCw } from 'lucide-react';

interface DevicePanelProps {
  device: DeviceStatus;
  onUpdateDevice: (updates: Partial<DeviceStatus>) => void;
  onConnectToggle: () => void;
}

export default function DevicePanel({ device, onUpdateDevice, onConnectToggle }: DevicePanelProps) {
  const [isCalibrating, setIsCalibrating] = useState(false);

  const handleCalibrate = () => {
    setIsCalibrating(true);
    setTimeout(() => {
      setIsCalibrating(false);
      // Randomize water temperature slightly or reset pH
      onUpdateDevice({
        phLevel: Number((7.0 + Math.random() * 0.8).toFixed(1)),
        waterTemp: Number((25.5 + Math.random() * 1.5).toFixed(1))
      });
    }, 1500);
  };

  return (
    <div id="device-panel" className="bg-geo-panel border border-geo-border rounded-none p-6 shadow-none text-[#E0E6ED] flex flex-col gap-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between border-b border-geo-border pb-4">
        <div>
          <span className="text-[10px] text-geo-cyan font-mono tracking-widest uppercase block">STATUS TRANSMITER</span>
          <h2 className="text-lg font-bold font-space flex items-center gap-2 mt-1">
            Smart Sonar XT
            <span className="text-[10px] bg-geo-cyan/10 text-geo-cyan px-2 py-0.5 rounded-none border border-geo-cyan/30 font-mono">
              V2.4 PRO
            </span>
          </h2>
        </div>

        <button
          onClick={onConnectToggle}
          disabled={device.connecting}
          className={`px-4 py-2 rounded-none text-xs font-mono uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
            device.connected
              ? 'bg-red-950/40 text-red-400 hover:bg-red-900/60 border border-red-500/40'
              : device.connecting
              ? 'bg-amber-950/40 text-amber-500 border border-amber-500/40 animate-pulse'
              : 'bg-geo-cyan/10 text-geo-cyan hover:bg-geo-cyan/20 border border-geo-cyan/40'
          }`}
        >
          {device.connected ? (
            <>
              <WifiOff className="w-4 h-4" />
              Putus Koneksi
            </>
          ) : device.connecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              MENGHUBUNGKAN...
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              HUBUNGKAN SONAR
            </>
          )}
        </button>
      </div>

      {device.connected ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Signal Indicator */}
          <div className="bg-[#050B10] p-4 rounded-none border border-geo-border flex items-center gap-3">
            <Radio className="w-5 h-5 text-geo-cyan" />
            <div>
              <span className="text-[9px] text-slate-500 block font-mono uppercase tracking-wider">KONEKSI</span>
              <span className="text-xs font-bold font-mono text-[#00D1FF]">
                {device.signalStrength > 0 ? `${device.signalStrength} / 5 BAR` : 'LEMAH'}
              </span>
            </div>
          </div>

          {/* Battery Indicator */}
          <div className="bg-[#050B10] p-4 rounded-none border border-geo-border flex items-center gap-3">
            <Battery className={`w-5 h-5 ${device.battery < 25 ? 'animate-pulse text-red-550' : 'text-geo-green'}`} />
            <div>
              <span className="text-[9px] text-slate-500 block font-mono uppercase tracking-wider">DAYA TELEMETRI</span>
              <span className="text-xs font-bold font-mono text-geo-green">
                {device.battery}%
              </span>
            </div>
          </div>

          {/* Water Temp */}
          <div className="bg-[#050B10] p-4 rounded-none border border-geo-border flex items-center gap-3">
            <Thermometer className="w-5 h-5 text-geo-orange" />
            <div>
              <span className="text-[9px] text-slate-500 block font-mono uppercase tracking-wider">TEMPERATUR AIR</span>
              <span className="text-xs font-bold font-mono text-geo-orange">
                {device.waterTemp}°C
              </span>
            </div>
          </div>

          {/* Air Temp */}
          <div className="bg-[#050B10] p-4 rounded-none border border-geo-border flex items-center gap-3">
            <Thermometer className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-[9px] text-slate-500 block font-mono uppercase tracking-wider">TEMPERATUR UDARA</span>
              <span className="text-xs font-bold font-mono text-amber-400">
                {device.airTemp}°C
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#050B10] p-8 rounded-none border border-dashed border-geo-border text-center py-12 flex flex-col items-center justify-center">
          <div className="relative mb-3">
            <WifiOff className="w-12 h-12 text-slate-700" />
            {device.connecting && (
              <div className="absolute inset-0 rounded-none bg-geo-cyan/10 blur animate-ping"></div>
            )}
          </div>
          {device.connecting ? (
            <>
              <h3 className="text-sm font-bold tracking-wider font-space text-amber-400 uppercase">Mencari Frekuensi Bluetooth Sonar...</h3>
              <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                Nyalakan alat transmiter Sonar dan celupkan ke dalam air kolam sekitar 10-30cm untuk meluncurkan sinyal WiFi/Bluetooth otomatis Anda.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold tracking-wider font-space text-slate-400 uppercase">TRANSMITER SONAR TERPUTUS</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Hubungkan ponsel dengan sensor sonar bawah air untuk mengidentifikasi letak ikan, kedalaman lubang kolam, dan parameter habitat lainnya.
              </p>
            </>
          )}
        </div>
      )}

      {/* Interactive Controls & Calibration */}
      {device.connected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-geo-border pt-5">
          {/* Slider for Water Temp */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 flex justify-between items-center font-mono tracking-wider">
              <span>TEMPERATUR AIR AKTUIL (°C)</span>
              <span className="text-geo-orange font-bold font-mono">{device.waterTemp}°C</span>
            </label>
            <input
              type="range"
              min="15"
              max="35"
              step="0.5"
              value={device.waterTemp}
              onChange={(e) => onUpdateDevice({ waterTemp: parseFloat(e.target.value) })}
              className="accent-geo-cyan h-1 bg-[#050B10] rounded-none appearance-none cursor-pointer border border-[#1E293B]"
            />
            <span className="text-[10px] text-slate-500">
              *Tingkat keaktifan ikan makan bervariasi bergantung suhu air kolam.
            </span>
          </div>

          {/* Slider for Ph Level */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 flex justify-between items-center font-mono tracking-wider">
              <span>DERAJAT KEASAMAN (pH AIR)</span>
              <span className="text-geo-green font-bold font-mono">{device.phLevel} pH</span>
            </label>
            <input
              type="range"
              min="5.5"
              max="9"
              step="0.1"
              value={device.phLevel}
              onChange={(e) => onUpdateDevice({ phLevel: parseFloat(e.target.value) })}
              className="accent-geo-cyan h-1 bg-[#050B10] rounded-none appearance-none cursor-pointer border border-[#1E293B]"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5.5 ASAM</span>
              <span>7.2 IDEAL</span>
              <span>9.0 BASA</span>
            </div>
          </div>

          {/* Water Clarity & Manual Calibration button */}
          <div className="flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">KEJERNIHAN TRANSMISI</span>
              <div className="grid grid-cols-3 gap-1 bg-[#050B10] p-1 border border-geo-border">
                {(['jernih', 'sedang', 'keruh'] as const).map((clarity) => (
                  <button
                    key={clarity}
                    onClick={() => onUpdateDevice({ waterClarity: clarity })}
                    className={`text-[9px] font-bold font-mono uppercase py-1 cursor-pointer transition-all ${
                      device.waterClarity === clarity
                        ? 'bg-geo-cyan text-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {clarity}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCalibrate}
              disabled={isCalibrating}
              className="w-full bg-[#050B10] hover:bg-[#1E293B] text-slate-200 border border-geo-border py-2 px-3 text-xs font-mono tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Gauge className="w-3.5 h-3.5 text-geo-cyan" />
              {isCalibrating ? 'MENGKALIBRASI SENSOR...' : 'KALIBRASI SENSOR SONAR'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

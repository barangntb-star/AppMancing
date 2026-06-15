import React, { useEffect, useRef, useState } from 'react';
import { Fish, SonarSettings, DeviceStatus, PondStructure } from '../types';
import { playSonarPing, playFishAlert } from '../utils/sound';
import { Volume2, VolumeX, Eye, HelpCircle, EyeOff, Sliders, Settings2, Info, Smartphone, Tv, Wifi, Maximize2, Minimize2, Video, VideoOff, ShieldAlert, Sparkles, Navigation, Target, Activity as Heartbeat } from 'lucide-react';

interface SonarDisplayProps {
  device: DeviceStatus;
  fishes: Fish[];
  settings: SonarSettings;
  onUpdateSettings: (updates: Partial<SonarSettings>) => void;
  maxDepth: number;
  isFilterActive?: boolean;
  isMotionDetected?: boolean;
  motionScore?: number;
}

export default function SonarDisplay({
  device,
  fishes,
  settings,
  onUpdateSettings,
  maxDepth,
  isFilterActive = false,
  isMotionDetected = false,
  motionScore = 0
}: SonarDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollOffsetRef = useRef(0);
  const bottomProfileRef = useRef<number[]>([]);
  const lastPingTimeRef = useRef(0);
  const spottedFishesRef = useRef<Set<string>>(new Set());

  // Local display view mode state (Switch to handphone for real time mobile visuals!)
  const [displayMode, setDisplayMode] = useState<'console' | 'handphone'>('handphone');
  const [phoneRipple, setPhoneRipple] = useState<{ x: number, y: number, id: number } | null>(null);

  // Fullscreen and AR Camera States for the Smartphone Viewfinder
  const [isPhoneFullscreen, setIsPhoneFullscreen] = useState(false);
  const [isArCameraActive, setIsArCameraActive] = useState(false);
  const [arCameraError, setArCameraError] = useState<string | null>(null);
  const [activeArHudLayer, setActiveArHudLayer] = useState<'normal' | 'infrared'>('normal');

  const phoneVideoRef = useRef<HTMLVideoElement | null>(null);
  const [phoneStream, setPhoneStream] = useState<MediaStream | null>(null);

  const startPhoneCamera = async () => {
    setArCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      setPhoneStream(stream);
      setIsArCameraActive(true);
    } catch (err: any) {
      console.warn("Unable to access phone camera for Sonar AR HUD:", err);
      setArCameraError("Akses kamera dibatasi browser/sistem. Menjalankan visualisasi radar simulasi air kolam.");
      setIsArCameraActive(true); // Fallback to animation simulator
    }
  };

  const stopPhoneCamera = () => {
    if (phoneStream) {
      phoneStream.getTracks().forEach(track => track.stop());
      setPhoneStream(null);
    }
    setIsArCameraActive(false);
  };

  useEffect(() => {
    if (isArCameraActive && phoneStream && phoneVideoRef.current) {
      phoneVideoRef.current.srcObject = phoneStream;
      phoneVideoRef.current.play().catch(() => {});
    }
  }, [isArCameraActive, phoneStream]);

  useEffect(() => {
    return () => {
      if (phoneStream) {
        phoneStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [phoneStream]);

  // Initialize scrolling bottom profile
  useEffect(() => {
    if (bottomProfileRef.current.length === 0) {
      // 300 points for canvas width
      const initial: number[] = [];
      let lastVal = 70 + Math.random() * 10; // default bottom percent (70%)
      for (let i = 0; i < 300; i++) {
        // Smooth random walk
        const sinPart = Math.sin(i / 30) * 8;
        const cosPart = Math.cos(i / 75) * 5;
        let val = lastVal + (Math.random() * 1.6 - 0.8) + sinPart * 0.05 + cosPart * 0.03;
        val = Math.max(55, Math.min(85, val));
        initial.push(val);
      }
      bottomProfileRef.current = initial;
    }
  }, []);

  // Frame animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear background & draw water grid
      ctx.fillStyle = '#050B10'; // default dark slate-blue
      if (settings.colorPalette === 'daylight') {
        ctx.fillStyle = '#f0f7ff';
      } else if (settings.colorPalette === 'grayscale') {
        ctx.fillStyle = '#0d0d0d';
      }
      ctx.fillRect(0, 0, width, height);

      // Draw grid lines
      ctx.strokeStyle = settings.colorPalette === 'daylight' ? 'rgba(0,0,0,0.06)' : 'rgba(0, 209, 255, 0.05)';
      ctx.lineWidth = 1;
      
      // Horizontal depth grid line
      const gridCount = 5;
      for (let i = 1; i < gridCount; i++) {
        const y = (i / gridCount) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // Label on the grid
        ctx.fillStyle = settings.colorPalette === 'daylight' ? '#4b5563' : '#64748b';
        ctx.font = '9px "JetBrains Mono", monospace';
        const gridDepth = (i / gridCount) * maxDepth;
        ctx.fillText(`${gridDepth.toFixed(1)}m`, 8, y - 4);
      }

      // Vertical time grid lines
      for (let x = 50; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // 2. Shift bottom contour to simulate motion (only if connected)
      if (device.connected) {
        scrollOffsetRef.current += 1;
        
        // Generate new bottom point
        const profile = bottomProfileRef.current;
        const lastVal = profile[profile.length - 1];
        
        const changeFactor = (settings.frequency === 'CHIRP' ? 1.0 : 0.6);
        const wave = Math.sin(Date.now() / 4000) * 1.5;
        let newVal = lastVal + (Math.random() * 0.8 - 0.4) + wave * 0.1 * changeFactor;
        newVal = Math.max(55, Math.min(85, newVal)); // bottom is between 55% and 85% depth
        
        profile.shift();
        profile.push(newVal);

        // Periodically play ping sounds based on frequency settings
        const pingInterval = settings.frequency === 'CHIRP' ? 1200 : settings.frequency === '200kHz' ? 1800 : 2500;
        if (Date.now() - lastPingTimeRef.current > pingInterval && settings.soundEnabled) {
          playSonarPing(settings.frequency === 'CHIRP' ? 1200 : settings.frequency === '200kHz' ? 2000 : 800, 0.05);
          lastPingTimeRef.current = Date.now();
        }
      }

      const p = bottomProfileRef.current;

      // 3. Draw Water Column (Dynamic color depending on frequency / clutter / noise)
      // We will draw a gradient representing standard sonar thermal clines or suspended solids
      const waterGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (settings.colorPalette === 'daylight') {
        waterGrad.addColorStop(0, 'rgba(191, 219, 254, 0.2)');
        waterGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.08)');
        waterGrad.addColorStop(1, 'rgba(29, 78, 216, 0.03)');
      } else {
        // Marine or Grayscale dark look
        const colorMain = settings.colorPalette === 'grayscale' ? 'rgba(75,85,99,0.1)' : 'rgba(0, 209, 255, 0.04)';
        const colorBottom = settings.colorPalette === 'grayscale' ? 'rgba(31,41,55,0.02)' : 'rgba(10, 17, 24, 0.01)';
        waterGrad.addColorStop(0, 'rgba(0, 209, 255, 0.12)');
        waterGrad.addColorStop(0.4, colorMain);
        waterGrad.addColorStop(1, colorBottom);
      }
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, width, height);

      // Simulate surface noise (clutter at top of screen)
      if (settings.noiseFilter !== 'high') {
        const clutterDensity = settings.noiseFilter === 'off' ? 12 : settings.noiseFilter === 'low' ? 7 : 3;
        ctx.fillStyle = settings.colorPalette === 'daylight' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 209, 255, 0.2)';
        for (let i = 0; i < clutterDensity; i++) {
          const rx = Math.random() * width;
          const ry = Math.random() * (height * 0.08); // concentrated only at top 8%
          ctx.fillRect(rx, ry, Math.random() * 2 + 1, Math.random() * 2 + 1);
        }
      }

      // 4. Draw Vegetation / Weeds on top of bottom floor before making polygon
      // We'll iterate through floor points and occasionally draw small vertical lines
      ctx.strokeStyle = settings.colorPalette === 'daylight' ? '#10b981' : '#00D1FF';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < width; i += 12) {
        const floorPercent = p[Math.floor((i / width) * p.length)] || 75;
        const floorY = (floorPercent / 100) * height;
        
        // Use pseudo random based on X position to make weeds static
        const randSeed = Math.sin(i * 1.5);
        if (randSeed > 0.4) {
          const weedHeight = (randSeed * 18) + 4;
          ctx.beginPath();
          ctx.moveTo(i, floorY);
          // Curved weed stalk
          ctx.quadraticCurveTo(i + (randSeed * 4), floorY - weedHeight/2, i + (randSeed * 2), floorY - weedHeight);
          ctx.stroke();
        }
      }

      // 5. Draw the actual bottom floor contour as a filled solid curve
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < p.length; i++) {
        const px = (i / (p.length - 1)) * width;
        const py = (p[i] / 100) * height;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      // Bottom material filling based on mode and color
      const bottomGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
      if (settings.colorPalette === 'daylight') {
        bottomGrad.addColorStop(0, '#d97706'); // Orange-yellow sand look
        bottomGrad.addColorStop(0.3, '#b45309');
        bottomGrad.addColorStop(1, '#78350f');
      } else if (settings.colorPalette === 'grayscale') {
        bottomGrad.addColorStop(0, '#f3f4f6'); // white-grey hard sonar line
        bottomGrad.addColorStop(0.1, '#9ca3af');
        bottomGrad.addColorStop(0.4, '#4b5563');
        bottomGrad.addColorStop(1, '#111827');
      } else {
        // Marine style
        bottomGrad.addColorStop(0, '#F59E0B'); // Strong return in orange/red
        bottomGrad.addColorStop(0.08, '#ef4444');
        bottomGrad.addColorStop(0.22, '#ca8a04'); // Yellow transition
        bottomGrad.addColorStop(0.4, 'rgba(0, 209, 255, 0.4)');
        bottomGrad.addColorStop(1, '#050B10');
      }
      ctx.fillStyle = bottomGrad;
      ctx.fill();

      // Draw thick sonar return line (echo depth boundary)
      ctx.beginPath();
      for (let i = 0; i < p.length; i++) {
        const px = (i / (p.length - 1)) * width;
        const py = (p[i] / 100) * height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = settings.colorPalette === 'daylight' ? '#b45309' : '#F59E0B';
      ctx.lineWidth = settings.sensitivity > 65 ? 4 : settings.sensitivity < 35 ? 2.0 : 3.0;
      ctx.stroke();

      // 6. Draw Simulated Fish Shadows / Arches / Symbols
      if (device.connected) {
        fishes.forEach((fish) => {
          if (!fish.active) return;

          // Convert fish percentage coordinates to local canvas dimensions
          const fx = (fish.x / 100) * width;
          const fy = (fish.y / 100) * height;

          // Check if fish is currently inside the transducer sonar beam angle
          // The wide beam originates from top center (50%) expanding outwards.
          // Wide 47° sweeps ~40% width. Medium 20° sweeps ~20%. Narrow ~10%.
          const transducerX = width / 2;
          const angleRad = (settings.beamAngle * Math.PI) / 180;
          const halfBeamWidth = Math.tan(angleRad / 2) * fy;
          
          const inBeam = Math.abs(fx - transducerX) < halfBeamWidth + 20;

          // Trigger sound alert when fish first enters the sonar cone
          if (inBeam && !spottedFishesRef.current.has(fish.id)) {
            spottedFishesRef.current.add(fish.id);
            
            // Check alarms setup
            const soundTrig = 
              (fish.size === 'large' && settings.alarmLarge) ||
              (fish.size === 'medium' && settings.alarmMedium) ||
              (fish.size === 'small' && settings.alarmSmall);
            
            if (soundTrig && settings.soundEnabled) {
              playFishAlert(fish.size);
            }
          } else if (!inBeam && spottedFishesRef.current.has(fish.id)) {
            // Remove from alert queue when leaving the beam
            spottedFishesRef.current.delete(fish.id);
          }

          // If fish is too deep (past the current bottom profile), don't draw it!
          const floorIndex = Math.floor((fish.x / 100) * p.length);
          const floorHeightCap = p[Math.max(0, Math.min(p.length - 1, floorIndex))] || 100;
          if (fish.y > floorHeightCap - 2) {
            return; // Behind floor sediment
          }

          // Draw the fish (Icons vs Raw arches)
          if (settings.fishSymbols) {
            // Draw stylized Fish shape
            ctx.save();
            ctx.translate(fx, fy);
            
            // Flip horizontal if swimming left
            if (fish.direction === -1) {
              ctx.scale(-1, 1);
            }

            // High contrast colors based on size
            const sizeColor = fish.size === 'large' 
              ? '#ef4444'  // large = rose/red
              : fish.size === 'medium' 
              ? '#F59E0B'  // medium = amber
              : '#00D1FF'; // small = teal/emerald

            ctx.fillStyle = sizeColor;

            // Fish body
            ctx.beginPath();
            ctx.ellipse(0, 0, fish.size === 'large' ? 10 : fish.size === 'medium' ? 7 : 5, fish.size === 'large' ? 5 : fish.size === 'medium' ? 3.5 : 2.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tail Fin
            ctx.beginPath();
            const tailSize = fish.size === 'large' ? 6 : fish.size === 'medium' ? 4.5 : 3;
            ctx.moveTo(-tailSize * 1.5, 0);
            ctx.lineTo(-tailSize * 2.2, -tailSize);
            ctx.lineTo(-tailSize * 2.2, tailSize);
            ctx.closePath();
            ctx.fillStyle = sizeColor;
            ctx.fill();

            // Eye dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(fish.size === 'large' ? 4 : fish.size === 'medium' ? 2.5 : 1.5, -1, 1, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // Fish labels
            if (settings.fishDepthLabels) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 8px font-mono, monospace';
              ctx.shadowColor = '#000000';
              ctx.shadowBlur = 2;
              const depthText = `${fish.depth}m`;
              ctx.fillText(depthText, fx - 10, fy - (fish.size === 'large' ? 8 : 6));
              ctx.shadowBlur = 0; // reset
            }
          } else {
            // Show RAW SONAR ARCHES (The classic crescent curves of fishing electronics)
            // A realistic sonar arch is generated because the beam reads distance as a curve
            ctx.strokeStyle = fish.size === 'large' ? '#fb7185' : fish.size === 'medium' ? '#fcd34d' : '#818cf8';
            ctx.lineWidth = fish.size === 'large' ? 2.5 : fish.size === 'medium' ? 1.5 : 1;
            
            ctx.beginPath();
            // Arc mimicking transducer range
            ctx.arc(fx, fy + 8, 12, -Math.PI * 0.7, -Math.PI * 0.3);
            ctx.stroke();

            if (settings.fishDepthLabels) {
              ctx.fillStyle = '#64748b';
              ctx.font = '7px monospace';
              ctx.fillText(`${fish.depth}m`, fx - 8, fy - 6);
            }
          }
        });
      }

      // 7. Render Sonar Beam Cones (transducer visual)
      if (device.connected) {
        ctx.save();
        const center = width / 2;
        const angleRad = (settings.beamAngle * Math.PI) / 180;
        const bottomEdgeX1 = center - Math.tan(angleRad / 2) * (height * 0.85);
        const bottomEdgeX2 = center + Math.tan(angleRad / 2) * (height * 0.85);

        const beamGrad = ctx.createLinearGradient(center, 0, center, height * 0.85);
        beamGrad.addColorStop(0, 'rgba(0, 209, 255, 0.15)');
        beamGrad.addColorStop(1, 'rgba(0, 209, 255, 0.00)');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(center, 0);
        ctx.lineTo(bottomEdgeX1, height * 0.85);
        ctx.lineTo(bottomEdgeX2, height * 0.85);
        ctx.closePath();
        ctx.fill();

        // Beam boundaries
        ctx.strokeStyle = 'rgba(0, 209, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(center, 0);
        ctx.lineTo(bottomEdgeX1, height * 0.85);
        ctx.moveTo(center, 0);
        ctx.lineTo(bottomEdgeX2, height * 0.85);
        ctx.stroke();
        ctx.restore();
      }

      // 8. Draw Transducer icon on top center
      ctx.fillStyle = '#475569';
      ctx.fillRect(width / 2 - 8, 0, 16, 4);
      ctx.fillStyle = '#00D1FF';
      ctx.fillRect(width / 2 - 4, 3, 8, 2);

      // Trigger next frame
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [fishes, settings, device, maxDepth]);

  // Readouts for Dashboard HUD
  const primaryDepth = fishes.length > 0 
    ? Number(Math.min(...fishes.map(f => f.depth)).toFixed(1)) 
    : 3.2;

  return (
    <div id="sonar-display" className="bg-geo-panel border border-geo-border rounded-none p-6 shadow-none flex flex-col lg:flex-row gap-6 text-[#E0E6ED]">
      
      {/* HUD Telemetry and Screen columns */}
      <div className="flex-1 flex flex-col gap-4">
        
        {/* VIEW MODE TOGGLER BAR */}
        <div className="grid grid-cols-2 border border-geo-border p-1 bg-[#050B10]">
          <button
            onClick={() => setDisplayMode('console')}
            className={`font-mono font-bold text-[10px] py-2 px-3 transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase ${
              displayMode === 'console'
                ? 'bg-geo-cyan text-black font-extrabold'
                : 'bg-black text-[#5F6B7E] hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            🖥️ KONSOL REKAMAN UTAMA (CONSOLE)
          </button>
          <button
            onClick={() => setDisplayMode('handphone')}
            className={`font-mono font-bold text-[10px] py-2 px-3 transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase ${
              displayMode === 'handphone'
                ? 'bg-geo-cyan text-black font-extrabold'
                : 'bg-black text-[#5F6B7E] hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 animate-pulse" />
            📱 TAMPILAN HP REAL-TIME OUTDOOR (HP HUD)
          </button>
        </div>

        {displayMode === 'console' ? (
          <>
            {/* Sonar HUD Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#050B10] p-4 rounded-none border border-geo-border">
              <div>
                <span className="text-[10px] text-geo-cyan font-mono tracking-widest block font-bold uppercase">KEDALAMAN UTAMA</span>
                <span className="text-3xl font-black font-space text-[#00D1FF]">
                  {device.connected ? `${(maxDepth * 0.8).toFixed(1)}` : '0.0'}
                  <span className="text-[10.5px] font-mono tracking-widest ml-1 font-normal text-slate-500 uppercase"> METER</span>
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 border-l border-geo-border pl-6">
                <div>
                  <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">FREKUENSI</span>
                  <span className="text-xs font-bold text-slate-200 font-mono">{settings.frequency}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">KONUS BALOK</span>
                  <span className="text-xs font-bold text-slate-200 font-mono">{settings.beamAngle}°</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">SENSITIVITAS</span>
                  <span className="text-xs font-bold text-geo-cyan font-mono">{settings.sensitivity}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">FILTERING</span>
                  <span className="text-xs font-bold text-red-400 font-mono uppercase">{settings.noiseFilter}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">TEMPERATUR</span>
                  <span className="text-xs font-bold text-geo-orange font-mono">{device.connected ? `${device.waterTemp}°C` : '--'}</span>
                </div>
                <div className="hidden md:block">
                  <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">STATUS AUDIO</span>
                  <span className="text-xs font-bold text-geo-green font-mono uppercase">{settings.soundEnabled ? 'Aktif' : 'Senyap'}</span>
                </div>
              </div>
            </div>

            {/* Sonar Canvas Container */}
            <div className="relative border border-geo-border rounded-none overflow-hidden bg-[#050B10] flex-1 min-h-[280px]">
              <canvas
                ref={canvasRef}
                width={600}
                height={320}
                className="w-full h-full block bg-scanlines cursor-crosshair"
              />

              {!device.connected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050B10]/95 text-center px-4">
                  <Info className="w-10 h-10 text-geo-cyan animate-bounce mb-2" />
                  <p className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">SINYAL SONAR MATI</p>
                  <p className="text-[11px] text-[#64748B] max-w-xs mt-1">
                    Aktifkan telemetry dengan mengetuk label <span className="text-geo-cyan font-mono">"Hubungkan Sonar"</span> pada dasbor perangkat.
                  </p>
                </div>
              )}

              {device.connected && (
                <div className="absolute top-2 right-2 bg-geo-panel/95 border border-geo-cyan/30 font-mono text-[9px] px-2 py-1 rounded-none text-geo-cyan pointer-events-none tracking-widest">
                  AUTO RANGE: {maxDepth}M
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 bg-[#050B10] border border-geo-border relative w-full">
            {/* Glowing scanline background */}
            <div className="absolute inset-0 bg-scanlines opacity-5 pointer-events-none"></div>

            <div className="text-center max-w-md px-4 mt-1">
              <span className="text-[9.5px] text-geo-cyan font-mono tracking-widest uppercase block animate-pulse">SMARTPHONE PORTABLE VIEW LINKED</span>
              <p className="text-xs text-slate-400 mt-1 font-space">
                Layar berikut mensimulasikan pergerakan ikan kolam secara real-time pada gawai Anda. Aktifkan modul kamera AR dan sentuh layar HP untuk memicu riak air.
              </p>
            </div>

            {/* Quick AR Camera Toggle bar on mobile row */}
            <div className="flex gap-2 w-full max-w-[305px] justify-between">
              <button
                onClick={() => {
                  if (isArCameraActive) stopPhoneCamera();
                  else startPhoneCamera();
                }}
                className={`flex-1 text-[9px] font-mono font-bold py-1 px-2.5 transition-all flex items-center justify-center gap-1 cursor-pointer uppercase ${
                  isArCameraActive
                    ? 'bg-geo-orange text-black border border-geo-orange'
                    : 'bg-black text-[#64748B] border border-slate-800 hover:text-slate-200'
                }`}
              >
                {isArCameraActive ? <Video className="w-3 h-3 animate-pulse" /> : <VideoOff className="w-3 h-3" />}
                {isArCameraActive ? 'AR KAMERA AKTIF' : 'AR KAMERA MATI'}
              </button>
              <button
                onClick={() => setIsPhoneFullscreen(true)}
                className="bg-geo-cyan/15 hover:bg-geo-cyan/40 border border-geo-cyan/30 text-geo-cyan font-mono font-bold text-[9px] py-1 px-3 flex items-center gap-1 cursor-pointer uppercase"
              >
                <Maximize2 className="w-3 h-3" />
                LAYAR PENUH
              </button>
            </div>

            {/* Simulated Smartphone casing */}
            <div className="relative w-full max-w-[305px] aspect-[9/18] bg-black rounded-[42px] p-4 border-[8px] border-slate-700 shadow-2xl ring-2 ring-slate-800 flex flex-col overflow-hidden">
              {/* Speaker top punch */}
              <div className="absolute top-0 left-16 right-16 h-7 bg-slate-900 rounded-b-2xl z-40 flex items-center justify-center gap-2 border-b border-slate-800">
                <div className="w-14 h-1 bg-slate-600 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-slate-800 rounded-full border border-slate-700"></div>
              </div>

              {/* Fullscreen Expand trigger button on top right of screen glass */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPhoneFullscreen(true);
                }}
                className="absolute top-9 right-6 bg-black/70 hover:bg-black p-1.5 border border-geo-cyan/40 text-geo-cyan hover:text-white rounded-md z-30 transition-colors cursor-pointer flex items-center justify-center"
                title="Buka Mode Layar Penuh HP"
              >
                <Maximize2 className="w-3 h-3" />
              </button>

              {/* Inner screen glass cover overlay */}
              <div 
                onClick={(e) => {
                  const bounds = e.currentTarget.getBoundingClientRect();
                  const xDist = e.clientX - bounds.left;
                  const yDist = e.clientY - bounds.top;
                  setPhoneRipple({ x: xDist, y: yDist, id: Date.now() });
                  
                  // Play splash sound!
                  if (settings.soundEnabled) {
                    try {
                      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const osc = audioCtx.createOscillator();
                      const gain = audioCtx.createGain();
                      osc.type = 'triangle';
                      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                      osc.frequency.exponentialRampToValueAtTime(450, audioCtx.currentTime + 0.15);
                      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                      
                      osc.connect(gain);
                      gain.connect(audioCtx.destination);
                      osc.start();
                      osc.stop(audioCtx.currentTime + 0.25);
                    } catch (err) {}
                  }

                  // Clear splash after animation completes
                  setTimeout(() => setPhoneRipple(null), 1000);
                }}
                className="relative flex-1 bg-[#03080e] rounded-[30px] overflow-hidden border border-slate-950 flex flex-col z-10 select-none cursor-pointer"
              >
                
                {/* Phone Android battery/cellular status bar */}
                <div className="h-6 px-4 pt-1 flex items-center justify-between text-[8px] font-mono text-slate-400 bg-black/60 z-30 select-none">
                  <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-geo-cyan">HP_GPS_ON</span>
                    <Wifi className="w-2.5 h-2.5 text-geo-cyan" />
                    <span>{device.connected ? `${device.battery}%` : '85%'}🔋</span>
                  </div>
                </div>

                {/* Main Dynamic Ocean / Water Column Renders */}
                <div className="flex-1 relative flex flex-col overflow-hidden">
                  
                  {/* CAMERA AR VIDEO ELEMENT BACKGROUND */}
                  {isArCameraActive ? (
                    <div className="absolute inset-0 w-full h-full bg-black z-0">
                      <video
                        ref={phoneVideoRef}
                        className="absolute inset-0 w-full h-full object-cover opacity-70"
                        playsInline
                        muted
                      />
                      {/* Live feedback watermark scanner */}
                      <div className="absolute inset-x-0 bottom-1 flex justify-center pointer-events-none">
                        <span className="text-[6.5px] font-mono text-[#00D1FF]/40 bg-black/50 px-2 rounded uppercase animate-pulse">
                          LIVE_VIEW_CAMERA_FEED
                        </span>
                      </div>

                      {/* If the stream is still loading or unavailable, show high-fidelity camera view shader */}
                      {!phoneStream && (
                        <div className="absolute inset-0 bg-gradient-to-b from-[#092237] via-[#051624] to-[#01060b] flex items-center justify-center pointer-events-none">
                          <div className="absolute inset-0 bg-scanlines opacity-10"></div>
                          <div className="text-center p-3 animate-pulse">
                            <span className="text-[7.5px] text-geo-cyan font-mono block tracking-widest uppercase">AR CAMERA FEED ACTIVE</span>
                            <span className="text-[6.5px] text-slate-500 font-mono block mt-0.5">POINT CAMERA AT WATER</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Default traditional marine sonar background */
                    <div className="absolute inset-0 bg-gradient-to-b from-[#091b2c] via-[#05111d] to-[#02070d] z-0">
                      <div className="absolute inset-0 bg-scanlines opacity-10"></div>
                      <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                        <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                        <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                        <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                        <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                        <div className="border-b border-[#00D1FF]/5 w-full h-[1px]"></div>
                      </div>

                      {/* Surface reflection ripple wave line animated */}
                      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-geo-cyan/15 to-transparent flex items-center justify-center">
                        <span className="text-[6.5px] font-mono text-geo-cyan/40 tracking-widest uppercase animate-pulse">SURFACE READINGS</span>
                      </div>
                    </div>
                  )}

                  {/* Sandy pond floor */}
                  <div className="absolute bottom-0 left-0 right-0 h-[22%] bg-gradient-to-t from-black via-red-950/40 to-yellow-900/25 border-t border-dashed border-[#F59E0B]/50 flex flex-col justify-center items-center z-10">
                    <span className="text-[7.5px] font-mono text-[#F59E0B]/55 uppercase tracking-wider font-extrabold">POND BOTTOM contour</span>
                    <p className="text-[12px] font-bold font-mono text-white mt-1">
                      {device.connected ? `${maxDepth.toFixed(1)}M` : '0.0M'}
                    </p>
                  </div>

                  {/* MOBILE CAMERA AR CALIBRATOR WARNING overlay */}
                  {arCameraError && (
                    <div className="absolute top-10 left-2 right-2 bg-black/90 p-1.5 rounded-none border border-amber-600/50 text-amber-500 font-mono text-[6.5px] leading-tight z-30">
                      ⚠ {arCameraError}
                    </div>
                  )}

                  {/* CAMERA FILTER BLINK BAR */}
                  {isFilterActive && (
                    <div className="absolute top-2.5 left-2 right-2 p-1.5 bg-black/85 border border-[#00D1FF]/25 font-mono text-[7px] flex items-center justify-between z-30 shadow-md">
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${isMotionDetected ? 'bg-geo-green animate-ping' : 'bg-red-500'}`}></span>
                        <span className="text-slate-300 font-bold">SENSOR GERAK:</span>
                      </div>
                      <span className={isMotionDetected ? 'text-[#10B981] font-black' : 'text-slate-500 font-black'}>
                        {isMotionDetected ? `TERDETEKSI (${motionScore.toFixed(0)}%)` : 'SUNYI / NO FISH'}
                      </span>
                    </div>
                  )}

                  {/* Realtime swimming fish inside mobile window */}
                  <div className="absolute inset-0 top-7 bottom-[22%] z-20">
                    {device.connected ? (
                      fishes.length > 0 ? (
                        fishes.map((fish) => {
                          const sizeColor = fish.size === 'large' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : fish.size === 'medium' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-geo-cyan shadow-[0_0_8px_rgba(0,209,255,0.8)]';
                          const scaleStyle = fish.size === 'large' ? 'scale-110' : fish.size === 'medium' ? 'scale-90' : 'scale-75';

                          return (
                            <div
                              key={fish.id}
                              style={{
                                left: `${Math.max(8, Math.min(88, fish.x))}%`,
                                top: `calc(${fish.y}% - 14px)`
                              }}
                              className="absolute transition-all duration-1000 ease-out flex flex-col items-center pointer-events-none"
                            >
                              <div className="relative">
                                {/* Thin targeting reticle box wrapper if AR Cam is active */}
                                {isArCameraActive && (
                                  <div className="absolute -inset-2 border border-dotted border-geo-cyan/40 rounded animate-pulse"></div>
                                )}

                                {/* Tail tail indicator fin depending on direction */}
                                <div className={`absolute w-1 h-3 rounded-md top-1 ${fish.size === 'large' ? 'h-4' : ''} ${fish.direction === 1 ? '-left-2 bg-slate-400' : 'right-[-8px] bg-slate-400'}`}></div>
                                
                                <div className={`flex items-center gap-1.5 bg-black/85 border border-slate-700/80 rounded shadow-md p-1 ${scaleStyle}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${sizeColor} animate-pulse`}></div>
                                  <span className="text-[7.5px] font-mono font-bold text-white uppercase">{fish.species}</span>
                                </div>
                                <div className="bg-slate-900/90 border border-slate-800 text-[6.5px] font-mono font-bold text-geo-cyan rounded-none px-1 py-[1px] mx-auto text-center max-w-max mt-0.5">
                                  {fish.depth}m
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-[8px] font-mono text-slate-500 tracking-wider leading-relaxed block uppercase font-bold animate-pulse">
                            {isFilterActive 
                              ? '✗ LAPAR MONITOR\nKOCOK ATAU CIPRATKAN AIR BIAR GERAKAN IKAN TERLIHAT' 
                              : 'MENUNGGU DATA IKAN...'}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-[8px] font-mono text-yellow-500 tracking-widest uppercase block animate-pulse">
                          SENSOR HP OFFLINE
                        </span>
                      </div>
                    )}

                    {/* Active interactive click touch ripple splash */}
                    {phoneRipple && (
                      <div 
                        style={{ left: phoneRipple.x, top: phoneRipple.y }}
                        className="absolute w-12 h-12 border-2 border-geo-cyan rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping pointer-events-none z-30"
                      ></div>
                    )}
                  </div>

                </div>

                {/* Bottom Android layout navigation line */}
                <div className="h-4 w-full bg-slate-950 flex justify-center items-center select-none z-40">
                  <div className="w-12 h-0.5 bg-slate-600 rounded-full"></div>
                </div>

              </div>
            </div>

            <div className="text-[10px] font-mono text-[#64748B] flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
              LIVE PORTABLE HUD MAPPED | CLICK GLASS OVERLAY TO FEED
            </div>
          </div>
        )}
      </div>

      {/* Settings / Controls Column */}
      <div className="w-full lg:w-64 flex flex-col gap-4 shrink-0 bg-[#050B10] p-4 rounded-none border border-geo-border">
        <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 border-b border-geo-border pb-2 uppercase font-sans tracking-wide">
          <Settings2 className="w-4 h-4 text-geo-cyan" />
          Pengaturan Sonar
        </h3>

        {/* Beam angle & Beam choice */}
        <div className="flex flex-col gap-1.55">
          <label className="text-[10px] font-bold text-slate-400 flex justify-between font-mono tracking-wider">
            <span>KONUS BALOK (SWEEP)</span>
            <span className="text-[#00D1FF] font-bold">{settings.beamAngle}°</span>
          </label>
          <div className="grid grid-cols-3 gap-1 bg-geo-panel p-1 border border-geo-border">
            {([7, 20, 47] as const).map((angle) => (
              <button
                key={angle}
                onClick={() => onUpdateSettings({ beamAngle: angle })}
                className={`text-[9px] font-bold font-mono py-1.5 cursor-pointer transition-colors ${
                  settings.beamAngle === angle
                    ? 'bg-geo-cyan text-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {angle === 7 ? '7°' : angle === 20 ? '20°' : '47°'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            *Transduser multi-cone: Sudut sempit memfokuskan energi sonar pada kedalaman kolam.
          </p>
        </div>

        {/* Sensitivity slider */}
        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex justify-between items-center text-[10px] font-bold font-mono tracking-wider">
            <span className="text-[#64748B]">SENSITIVITAS GAIN</span>
            <span className="text-geo-cyan font-bold">{settings.sensitivity}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={settings.sensitivity}
            onChange={(e) => onUpdateSettings({ sensitivity: parseInt(e.target.value) })}
            className="accent-geo-cyan h-1 bg-[#050B10] border border-[#1E293B] rounded-none appearance-none cursor-pointer"
          />
        </div>

        {/* Toggle options */}
        <div className="flex flex-col gap-2 mt-2 border-t border-geo-border pt-3">
          {/* Fish symbols toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-300 font-medium">Visual Simbol</span>
              <span className="text-[9px] text-[#64748B] font-mono">Saring lengkung asli</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ fishSymbols: !settings.fishSymbols })}
              className={`px-3 py-1 rounded-none text-[9px] font-bold font-mono cursor-pointer transition-all uppercase ${
                settings.fishSymbols
                  ? 'bg-geo-cyan/10 text-geo-cyan border border-geo-cyan/30'
                  : 'bg-[#050B10] text-[#64748B] border border-geo-border'
              }`}
            >
              {settings.fishSymbols ? 'SIMBOL' : 'LOG GAYA'}
            </button>
          </div>

          {/* Fish labels toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-300 font-medium">Tag Kedalaman</span>
              <span className="text-[9px] text-[#64748B] font-mono">Label meter</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ fishDepthLabels: !settings.fishDepthLabels })}
              className={`px-3 py-1 rounded-none text-[9px] font-bold font-mono cursor-pointer transition-all uppercase ${
                settings.fishDepthLabels
                  ? 'bg-geo-cyan/10 text-geo-cyan border border-geo-cyan/30'
                  : 'bg-[#050B10] text-[#64748B] border border-geo-border'
              }`}
            >
              {settings.fishDepthLabels ? 'AKTIF' : 'MATI'}
            </button>
          </div>

          {/* Audio Sound toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-300 font-medium font-sans">Alarm & Suara</span>
              <span className="text-[9px] text-[#64748B] font-mono">Beeper transmisi</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`px-2.5 py-1 rounded-none flex items-center gap-1 text-[9px] font-bold font-mono cursor-pointer transition-all ${
                settings.soundEnabled
                  ? 'bg-geo-green/10 text-geo-green border border-geo-green/30'
                  : 'bg-[#050B10] text-[#64748B] border border-geo-border'
              }`}
            >
              {settings.soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              {settings.soundEnabled ? 'ON' : 'MUTE'}
            </button>
          </div>
        </div>

        {/* Alarm triggers setup */}
        {settings.soundEnabled && (
          <div className="flex flex-col gap-1.5 border-t border-geo-border pt-3">
            <span className="text-[9px] text-[#64748B] font-mono block uppercase tracking-wider">FILTERING LEVEL ALARM:</span>
            <div className="grid grid-cols-3 gap-1 bg-[#050B10] p-1 border border-geo-border">
              <button
                onClick={() => onUpdateSettings({ alarmSmall: !settings.alarmSmall })}
                className={`text-[9.5px] font-mono font-bold py-1 cursor-pointer transition-all ${
                  settings.alarmSmall ? 'bg-geo-green/20 text-geo-green' : 'text-slate-600'
                }`}
              >
                Kecil
              </button>
              <button
                onClick={() => onUpdateSettings({ alarmMedium: !settings.alarmMedium })}
                className={`text-[9.5px] font-mono font-bold py-1 cursor-pointer transition-all ${
                  settings.alarmMedium ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'text-slate-600'
                }`}
              >
                Sedang
              </button>
              <button
                onClick={() => onUpdateSettings({ alarmLarge: !settings.alarmLarge })}
                className={`text-[9.5px] font-mono font-bold py-1 cursor-pointer transition-all ${
                  settings.alarmLarge ? 'bg-red-500/20 text-red-400' : 'text-slate-600'
                }`}
              >
                Besar
              </button>
            </div>
          </div>
        )}

        {/* Frequency presets */}
        <div className="flex flex-col gap-1.5 mt-2 border-t border-geo-border pt-3">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">FREKUENSI GOLONGAN</span>
          <div className="grid grid-cols-3 gap-1 bg-geo-panel p-1 border border-geo-border">
            {(['CHIRP', '200kHz', '50kHz'] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => onUpdateSettings({ frequency: freq })}
                className={`text-[9.5px] font-mono font-bold py-1 cursor-pointer transition-all ${
                  settings.frequency === freq
                    ? 'bg-geo-cyan text-black'
                    : 'text-[#64748B] hover:text-slate-200'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FULLSCREEN PHONE CAMERA AR overlay */}
      {isPhoneFullscreen && (
        <div id="phone-ar-fullscreen-workspace" className="fixed inset-0 bg-[#03080e] z-[100] flex flex-col text-[#E0E6ED] select-none font-sans overflow-hidden">
          {/* Fullscreen HUD glowing border overlay */}
          <div className="absolute inset-0 border border-geo-cyan/25 pointer-events-none z-50"></div>
          <div className="absolute inset-0 bg-scanlines opacity-[0.04] pointer-events-none z-40"></div>

          {/* Top Futuristic status bar header */}
          <div className="h-14 bg-black/90 border-b border-geo-border px-6 flex items-center justify-between z-30 shrink-0">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-geo-cyan animate-pulse" />
              <div>
                <span className="text-[9px] text-[#00D1FF] font-mono tracking-widest block uppercase font-bold">AR POND DIGITAL SCANNER</span>
                <h4 className="text-xs font-bold font-sans uppercase text-white tracking-wide">MONITOR HP LAYAR PENUH (TELEMETRI LUAR RUANGAN)</h4>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 text-xs font-mono">
              <div className="hidden md:flex items-center gap-4 border-r border-[#1E293B] pr-4">
                <div>
                  <span className="text-[8px] text-[#64748B] block">GPS KOORDINAT</span>
                  <span className="text-geo-cyan font-bold">7°21&apos;44.2&quot;S, 110°22&apos;11.5&quot;E</span>
                </div>
                <div>
                  <span className="text-[8px] text-[#64748B] block">RENTANG KEDALAMAN</span>
                  <span className="text-[#F59E0B] font-bold">MAX {maxDepth}M</span>
                </div>
                <div>
                  <span className="text-[8px] text-[#64748B] block">FREKUENSI BEAM</span>
                  <span className="text-slate-200 font-bold">{settings.frequency}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isArCameraActive) stopPhoneCamera();
                    else startPhoneCamera();
                  }}
                  className={`px-3 py-1.5 text-[9px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isArCameraActive ? 'bg-geo-orange text-black font-black' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {isArCameraActive ? <Video className="w-3.5 h-3.5 animate-bounce" /> : <VideoOff className="w-3.5 h-3.5" />}
                  {isArCameraActive ? 'AR KAMERA AKTIF' : 'AKTIFKAN KAMERA AR'}
                </button>

                <button
                  onClick={() => {
                    stopPhoneCamera();
                    setIsPhoneFullscreen(false);
                  }}
                  className="bg-red-500 hover:bg-red-600 font-black text-white px-3 py-1.5 text-[9px] font-mono transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  TUTUP LAYAR
                </button>
              </div>
            </div>
          </div>

          {/* Big Fullscreen viewport and layout columns */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            
            {/* Visual Workspace Feed Column */}
            <div className="flex-1 relative bg-black flex flex-col justify-center items-center overflow-hidden">
              
              {/* Interactive container inside fullscreen */}
              <div className="w-full h-full relative flex flex-col">
                
                {/* CAMERA AR BACKGROUND */}
                {isArCameraActive ? (
                  <div className="absolute inset-0 w-full h-full bg-black z-0">
                    <video 
                      ref={phoneVideoRef} 
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                      playsInline
                      muted
                    />
                    {/* Fallback pattern if camera device is blocked */}
                    {!phoneStream && (
                      <div className="absolute inset-0 bg-gradient-to-b from-[#061c30] via-[#03101c] to-[#01050a] flex flex-col justify-center items-center">
                        <div className="absolute inset-0 bg-scanlines opacity-10"></div>
                        <div className="absolute w-[240px] h-[240px] rounded-full border border-[#00D1FF]/10 animate-ping"></div>
                        <div className="absolute w-[380px] h-[380px] rounded-full border border-[#00D1FF]/5 animate-pulse"></div>
                        
                        <span className="text-[10px] text-geo-cyan/20 font-mono animate-spin duration-10000 mb-4">
                          SWEEPING_TARGETS_AREA_ACTIVE_SCANNING
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Traditional Sonar gradient as screen background */
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0c243a] via-[#051421] to-[#02070d] z-0">
                    <div className="absolute inset-0 bg-scanlines opacity-10"></div>
                    <div className="absolute inset-0 flex flex-col justify-between p-12 pointer-events-none">
                      <div className="border-b border-geo-cyan/5 w-full"></div>
                      <div className="border-b border-geo-cyan/5 w-full"></div>
                      <div className="border-b border-geo-cyan/5 w-full"></div>
                      <div className="border-b border-geo-cyan/5 w-full"></div>
                    </div>
                  </div>
                )}

                {/* AR overlay HUD grid reticle lines */}
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  <div className="border border-geo-cyan/10 w-full h-0.5 absolute"></div>
                  <div className="border border-geo-cyan/10 h-full w-0.5 absolute"></div>
                  
                  {/* Round target crosshair center */}
                  <div className="w-48 h-48 rounded-full border border-dashed border-[#00D1FF]/30 flex items-center justify-center animate-spin duration-10000">
                    <div className="w-36 h-36 rounded-full border-2 border-dashed border-[#00D1FF]/30"></div>
                  </div>
                  <div className="absolute text-[8.5px] font-mono text-geo-cyan/40 top-[35%] tracking-widest uppercase font-bold">
                    SEKTOR AR PANORAMA LOCK
                  </div>
                </div>

                {/* SENSOR STATUS ALERTS COCKPIT IN FULLSCREEN */}
                <div className="absolute top-4 left-4 right-4 z-20 flex gap-4 pointer-events-none justify-between items-start">
                  <div className="bg-black/85 border border-[#00D1FF]/30 p-3 max-w-xs flex flex-col gap-1 rounded-none">
                    <div className="flex items-center gap-1.5 font-mono text-[9px]">
                      <span className={`w-2 h-2 rounded-full ${isMotionDetected ? 'bg-geo-green animate-ping' : 'bg-red-500'}`}></span>
                      <span className="text-white font-black uppercase">SISTEM DETEKSI GERAK</span>
                    </div>
                    <p className="text-[9px] font-mono text-slate-400">
                      Status: {isMotionDetected ? `BEBERAPA IKAN TER DETEKSI (${motionScore.toFixed(1)}%)` : 'AIR TENANG OLEH SENSOR'}
                    </p>
                    {isFilterActive && (
                      <span className="text-[7.5px] font-mono bg-geo-cyan/10 text-geo-cyan px-1.5 py-0.5 self-start mt-1 font-bold border border-geo-cyan/20">
                        FILTRATION GERAK AKTIF
                      </span>
                    )}
                  </div>

                  <div className="bg-black/85 border border-[#00D1FF]/30 p-3 font-mono text-[9px] flex flex-col gap-1 max-w-xs text-right rounded-none">
                    <div className="text-[#00D1FF] font-black uppercase tracking-wider">STATUS TELEMETRI</div>
                    <span className="text-slate-300">SUHU AIR COGNITIVE: <strong className="text-geo-orange">{device.connected ? `${device.waterTemp}°C` : '--'}</strong></span>
                    <span className="text-slate-300 font-bold uppercase text-[8px]">
                      {device.connected ? `Sensor terhubung (Bat: ${device.battery}%)` : 'Sensor terputus'}
                    </span>
                  </div>
                </div>

                {/* Interactive touch sensor screen ripple */}
                <div 
                  id="fullscreen-screen-tap-area"
                  onClick={(e) => {
                    const bounds = e.currentTarget.getBoundingClientRect();
                    const xClick = e.clientX - bounds.left;
                    const yClick = e.clientY - bounds.top;
                    setPhoneRipple({ x: xClick, y: yClick, id: Date.now() });

                    // play chirp trigger sound
                    if (settings.soundEnabled) {
                      try {
                        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
                        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 0.4);
                      } catch (e) {}
                    }
                    setTimeout(() => setPhoneRipple(null), 1000);
                  }}
                  className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center bg-transparent"
                >
                  {/* Show tap ripple */}
                  {phoneRipple && (
                    <div 
                      style={{ left: phoneRipple.x, top: phoneRipple.y }}
                      className="absolute w-20 h-20 border-4 border-geo-cyan rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping pointer-events-none"
                    ></div>
                  )}

                  {/* Simulated Live swimming fishes in Fullscreen Mobile */}
                  <div className="absolute inset-0">
                    {device.connected ? (
                      fishes.length > 0 ? (
                        fishes.map((fish) => {
                          const sizeColor = fish.size === 'large' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.95)]' : fish.size === 'medium' ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)]' : 'bg-geo-cyan shadow-[0_0_10px_rgba(0,209,255,0.9)]';
                          const scaleStyle = fish.size === 'large' ? 'scale-125' : fish.size === 'medium' ? 'scale-105' : 'scale-90';

                          return (
                            <div
                              key={`fs-${fish.id}`}
                              style={{
                                left: `${Math.max(5, Math.min(92, fish.x))}%`,
                                top: `${Math.max(12, Math.min(84, fish.y))}%`
                              }}
                              className="absolute transition-all duration-1000 ease-out flex flex-col items-center z-20 pointer-events-none"
                            >
                              <div className="relative">
                                {/* Pulsing targeting bracket around fish for augmented reality effect */}
                                <div className="absolute -inset-4 border border-dashed border-[#00D1FF]/40 rounded-full animate-pulse"></div>
                                
                                {/* Fish graphic and data label */}
                                <div className={`flex flex-col items-center bg-black/90 border border-slate-700 rounded p-2.5 shadow-2xl ${scaleStyle}`}>
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${sizeColor} animate-ping`}></span>
                                    <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">{fish.species}</span>
                                  </div>
                                  
                                  <hr className="w-full border-slate-805/40 my-1"/>
                                  
                                  <div className="grid grid-cols-2 gap-x-2 text-[8px] font-mono text-slate-350 text-left">
                                    <span className="text-slate-400">Kedalaman:</span>
                                    <strong className="text-geo-cyan text-right">{fish.depth}m</strong>
                                    <span className="text-slate-400">Est. Berat:</span>
                                    <strong className="text-geo-orange text-right">
                                      {fish.size === 'large' ? '1.8 - 2.5 KG' : fish.size === 'medium' ? '0.7 - 1.2 KG' : '0.2 - 0.5 KG'}
                                    </strong>
                                    <span className="text-slate-400">Status:</span>
                                    <strong className="text-[#10B981] text-right font-bold uppercase">LOCK TRACK</strong>
                                  </div>
                                </div>

                                {/* Line and marker */}
                                <div className="w-0.5 h-6 bg-gradient-to-b from-slate-500 to-transparent mx-auto"></div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6">
                          <Heartbeat className="w-10 h-10 text-[#64748B] animate-pulse mb-3" />
                          <span className="text-[10px] font-mono text-[#64748B] tracking-widest uppercase block leading-relaxed max-w-sm font-semibold">
                            {isFilterActive 
                              ? '✗ RADAR TENANG (LAYAR BERSIH)\nTUNGGU GERAKAN IKAN ATAU SENTUH HP UNTUK CIPRATAN AIR' 
                              : 'MENCOCOKKAN KOORDINAT AIR...'}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
                        <ShieldAlert className="w-12 h-12 text-yellow-500 animate-bounce mb-3" />
                        <span className="text-xs font-mono text-yellow-500 font-extrabold tracking-widest uppercase">
                          PEMETAAN KAMERA OFFLINE
                        </span>
                        <p className="text-[10px] text-slate-450 mt-1 max-w-xs font-space">
                          Hubungkan transduser pada dasbor beranda kolam luar terlebih dahulu.
                        </p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Splash instructions hint at the bottom center */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/85 border border-[#00D1FF]/20 px-6 py-2 text-center font-mono text-[9px] text-slate-350 z-20 pointer-events-none tracking-widest uppercase">
                  💡 KETUK PADA WILAYAH LAYAR MEWAKILI KOLAM UNTUK MEMICU MAKANAN/CIPRATAN AIR
                </div>

              </div>

            </div>

            {/* Info Sidebar Column inside Fullscreen Mode */}
            <div className="h-full w-full lg:w-80 bg-slate-950 border-t lg:border-t-0 lg:border-l border-geo-border p-5 flex flex-col justify-between overflow-y-auto shrink-0">
              
              {/* Fishes information list */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-geo-border pb-3">
                  <Target className="w-4 h-4 text-geo-cyan animate-pulse" />
                  <h5 className="text-[11px] font-mono tracking-wider font-extrabold text-white uppercase">INFORMASI IKAN TERDETEKSI</h5>
                </div>

                <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {device.connected && fishes.length > 0 ? (
                    fishes.map((fish) => {
                      const fishColorClass = fish.size === 'large' ? 'border-red-500 bg-red-950/10' : fish.size === 'medium' ? 'border-amber-400 bg-amber-950/10' : 'border-[#00D1FF] bg-[#00D1FF]/10';
                      return (
                        <div key={`fs-list-${fish.id}`} className={`border-l-4 p-2.5 bg-black/40 ${fishColorClass} flex flex-col gap-1`}>
                          <div className="flex items-center justify-between font-mono text-[9.5px]">
                            <span className="text-white font-extrabold uppercase">{fish.species}</span>
                            <span className="text-slate-400">ID #{fish.id.slice(0, 5)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-slate-300">
                            <span>Kedalaman:</span>
                            <strong className="text-geo-cyan text-right">{fish.depth} Meter</strong>
                            <span>Arah Berenang:</span>
                            <span className="text-right text-slate-400">{fish.direction === 1 ? '➡ Kanan' : '⬅ Kiri'}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 bg-black/30 text-center text-[9.5px] font-mono text-[#64748B] uppercase">
                      {!device.connected ? 'Perangkat Offline' : 'Belum ada ikan yang terdeteksi.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Tactical Parameters Quick Console adjustments */}
              <div className="flex flex-col gap-4 border-t border-geo-border pt-4 mt-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-geo-cyan" />
                  <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider text-left">PILIHAN ALAT HUD</span>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Cone beam selector */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-slate-400 uppercase text-left">KONUS BALOK SONAR</span>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-black rounded border border-slate-800">
                      {([7, 20, 47] as const).map((angle) => (
                        <button
                          key={`fs-beam-${angle}`}
                          onClick={() => onUpdateSettings({ beamAngle: angle })}
                          className={`text-[9.5px] font-mono font-bold py-1.5 cursor-pointer ${
                            settings.beamAngle === angle ? 'bg-geo-cyan text-black' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {angle}°
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Beeper alarm control */}
                  <button
                    onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                    className={`w-full py-1.5 text-[9px] font-mono font-bold border rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      settings.soundEnabled ? 'bg-geo-green/10 text-geo-green border-geo-green/30' : 'bg-black text-[#5F6B7E] border-slate-800'
                    }`}
                  >
                    <Heartbeat className="w-3.5 h-3.5" />
                    SUARA ALARM: {settings.soundEnabled ? 'NYALA' : 'MATI'}
                  </button>
                  
                  {/* Diagnostic system log line */}
                  <div className="bg-black/55 border border-slate-900 p-2 text-[8px] font-mono text-slate-500 leading-normal text-left whitespace-pre-line">
                    *MOBILE LIVE AR VIEW // SIG_QUALITY: EXCELLENT // CALIB: AUTO_LOCK_ON
                  </div>
                </div>
              </div>

              {/* Exit banner */}
              <button
                onClick={() => {
                  stopPhoneCamera();
                  setIsPhoneFullscreen(false);
                }}
                className="mt-6 w-full py-2 bg-gradient-to-r from-red-950 to-rose-950 hover:from-rose-900 hover:to-red-900 border border-red-500/30 text-rose-300 font-mono text-[9px] font-black uppercase tracking-widest text-center cursor-pointer transition-all"
              >
                X TUTUP INTEGRASI HP
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

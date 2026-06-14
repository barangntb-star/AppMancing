import React, { useEffect, useRef, useState } from 'react';
import { Fish, SonarSettings, DeviceStatus, PondStructure } from '../types';
import { playSonarPing, playFishAlert } from '../utils/sound';
import { Volume2, VolumeX, Eye, HelpCircle, EyeOff, Sliders, Settings2, Info } from 'lucide-react';

interface SonarDisplayProps {
  device: DeviceStatus;
  fishes: Fish[];
  settings: SonarSettings;
  onUpdateSettings: (updates: Partial<SonarSettings>) => void;
  maxDepth: number;
}

export default function SonarDisplay({
  device,
  fishes,
  settings,
  onUpdateSettings,
  maxDepth
}: SonarDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollOffsetRef = useRef(0);
  const bottomProfileRef = useRef<number[]>([]);
  const lastPingTimeRef = useRef(0);
  const spottedFishesRef = useRef<Set<string>>(new Set());

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
    </div>
  );
}

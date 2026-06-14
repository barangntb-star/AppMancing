import React, { useState } from 'react';
import { Fish, PondStructure } from '../types';
import { Anchor, Snowflake, Cherry, Layers, PlusCircle, Trash, Trash2, ShieldAlert } from 'lucide-react';

interface PondMapProps {
  fishes: Fish[];
  structures: PondStructure[];
  onAddStructure: (structure: Omit<PondStructure, 'id' | 'createdAt'>) => void;
  onRemoveStructure: (id: string) => void;
  onClearStructures: () => void;
}

export default function PondMap({
  fishes,
  structures,
  onAddStructure,
  onRemoveStructure,
  onClearStructures
}: PondMapProps) {
  const [toolMode, setToolMode] = useState<'feed' | 'rock' | 'log'>('feed');
  const [hoveredFish, setHoveredFish] = useState<Fish | null>(null);

  // Handle clicking inside the map canvas area
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if within bounds
    if (clickXPercent < 0 || clickXPercent > 100 || clickYPercent < 0 || clickYPercent > 100) return;

    if (toolMode === 'feed') {
      onAddStructure({
        type: 'food',
        x: clickXPercent,
        y: clickYPercent,
        radius: 20,
        amount: 100 // full food pellets
      });
    } else if (toolMode === 'rock') {
      onAddStructure({
        type: 'rock',
        x: clickXPercent,
        y: clickYPercent,
        radius: 12
      });
    } else if (toolMode === 'log') {
      onAddStructure({
        type: 'log',
        x: clickXPercent,
        y: clickYPercent,
        radius: 16
      });
    }
  };

  // Generate density grid circles (contours)
  const contours = [10, 25, 40, 55, 70, 85];

  return (
    <div id="pond-map-panel" className="bg-geo-panel border border-geo-border rounded-none p-6 shadow-none flex flex-col xl:flex-row gap-6">
      
      {/* Interactive Map Visualizer */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Helper Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050B10] p-4 rounded-none border border-geo-border">
          <div>
            <h3 className="text-sm font-bold font-space text-slate-100 uppercase tracking-wide">
              PETA KONTUR & DENSITAS KOLAM (TOP-DOWN)
            </h3>
            <span className="text-[10px] text-slate-500 block mt-0.5 leading-normal font-mono">
              TAP / KLIK AREA KOLAM UNTUK MENEBARKAN PELET ATAU STRUKTUR HABITAT IKAN.
            </span>
          </div>

          <div className="flex gap-1.5 bg-geo-panel border border-geo-border p-1 rounded-none">
            <button
              onClick={() => setToolMode('feed')}
              className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                toolMode === 'feed'
                  ? 'bg-geo-orange text-black font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cherry className="w-3.5 h-3.5" />
              PELET UMUMPAN
            </button>
            <button
              onClick={() => setToolMode('rock')}
              className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                toolMode === 'rock'
                  ? 'bg-slate-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5" />
              BATUAN
            </button>
            <button
              onClick={() => setToolMode('log')}
              className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                toolMode === 'log'
                  ? 'bg-amber-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Anchor className="w-3.5 h-3.5" />
              KAYU
            </button>
          </div>
        </div>

        {/* Map Canvas Box */}
        <div 
          onClick={handleMapClick}
          className="relative w-full aspect-[16/10] bg-[#050B10] border border-geo-border rounded-none overflow-hidden cursor-crosshair shadow-none select-none"
        >
          {/* Radial Topographic Contour Background Lines */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            {contours.map((c, idx) => (
              <div
                key={idx}
                style={{ width: `${c}%`, height: `${c}%` }}
                className="absolute border border-dashed border-geo-cyan/25 rounded-full flex items-center justify-center"
              >
                <span className="text-[8px] text-geo-cyan/80 font-mono -mt-10">
                  -{(0.5 + idx * 0.7).toFixed(1)}m
                </span>
              </div>
            ))}
          </div>

          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,209,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,209,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

          {/* Render Structures (Weeds/Bait/Log/Rock) */}
          {structures.map((s) => {
            const isFood = s.type === 'food';
            const iconBg = isFood 
              ? 'bg-geo-orange text-black border-geo-orange shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
              : s.type === 'rock' 
              ? 'bg-[#1E293B] text-slate-100 border-geo-border' 
              : 'bg-amber-850 text-amber-100 border-amber-700';

            return (
              <div
                key={s.id}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-none border flex items-center justify-center group pointer-events-none z-10"
              >
                {/* Visual glow influence zone circle */}
                <div
                  style={{
                    width: `${s.radius * 7}px`,
                    height: `${s.radius * 7}px`,
                  }}
                  className={`absolute rounded-full -translate-x-0 -translate-y-0 opacity-10 border pointer-events-none ${
                    isFood 
                      ? 'bg-geo-orange/20 border-geo-orange/50 animate-pulse' 
                      : s.type === 'rock' 
                      ? 'bg-slate-500/10 border-slate-400' 
                      : 'bg-orange-850/10 border-orange-700'
                  }`}
                />

                <div className={`w-6 h-6 rounded-none flex items-center justify-center border text-xs font-bold ${iconBg} relative`}>
                  {isFood ? (
                    <Cherry className="w-3.5 h-3.5" />
                  ) : s.type === 'rock' ? (
                    <Snowflake className="w-3.5 h-3.5" />
                  ) : (
                    <Anchor className="w-3.5 h-3.5" />
                  )}

                  {/* Quantity tooltip badge for food */}
                  {isFood && s.amount !== undefined && (
                    <span className="absolute -top-2 -right-2 bg-black text-geo-orange text-[8px] font-mono border border-geo-border px-1 py-0.5 rounded-none scale-90">
                      {s.amount}%
                    </span>
                  )}
                </div>

                {/* Remove float button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveStructure(s.id);
                  }}
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-red-650 font-bold hover:bg-red-700 text-white rounded-none p-0.5 pointer-events-auto shadow opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Hapus struktur"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Render Active Fishes as dynamic swimming dots with range ripples */}
          {fishes.map((fish) => {
            if (!fish.active) return null;

            const sizeScalar = fish.size === 'large' ? 1.0 : fish.size === 'medium' ? 0.75 : 0.55;
            
            // Speed indicator / direction vectors
            const angleRad = (fish.y * 3.14) / 100 + (fish.x / 50);
            const dx = Math.cos(angleRad) * 6 * sizeScalar;
            const dy = Math.sin(angleRad) * 3 * sizeScalar * (fish.direction);

            // Color code
            const colorCode = fish.size === 'large' 
              ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' 
              : fish.size === 'medium' 
              ? 'bg-geo-orange shadow-[0_0_8px_#F59E0B]' 
              : 'bg-geo-cyan shadow-[0_0_6px_#00D1FF]';

            return (
              <div
                key={fish.id}
                style={{ left: `${fish.x}%`, top: `${fish.y}%` }}
                onMouseEnter={() => setHoveredFish(fish)}
                onMouseLeave={() => setHoveredFish(null)}
                className="absolute -translate-x-1/2 -translate-y-1/2 p-2 cursor-pointer z-20 group"
              >
                {/* Swim vector animation */}
                <span className={`absolute inset-0 rounded-full border border-geo-cyan/20 scale-150 animate-ping duration-1000 opacity-25 leading-none`}></span>

                <div className={`relative rounded-none transition-transform duration-300 group-hover:scale-125 ${colorCode}`}
                  style={{
                    width: `${fish.size === 'large' ? 11 : fish.size === 'medium' ? 8 : 6}px`,
                    height: `${fish.size === 'large' ? 11 : fish.size === 'medium' ? 8 : 6}px`,
                  }}
                >
                  {/* Small direction arrow index */}
                  <div 
                    style={{ transform: `rotate(${angleRad}rad)` }} 
                    className="absolute w-2 h-1 bg-white/40 rounded-none left-1/2 -top-1 origin-center"
                  />
                </div>

                {/* Micro tooltip on dot hover */}
                <div className="absolute left-1/2 -bottom-9 -translate-x-1/2 bg-geo-panel border border-geo-border text-[10px] uppercase font-mono py-1 px-2 rounded-none text-white shadow-xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-30">
                  <span className="font-bold text-geo-cyan">{fish.species}</span> ({fish.depth}m)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Status and Manual controller */}
      <div className="w-full xl:w-80 flex flex-col gap-4 bg-[#050B10] p-4 rounded-none border border-geo-border shrink-0">
        <h4 className="text-xs font-bold text-geo-cyan font-mono tracking-widest flex items-center justify-between border-b border-geo-border pb-2">
          DANAU / DETAIL STRUKTUR
          {structures.length > 0 && (
            <button
              onClick={onClearStructures}
              className="text-[10px] text-red-400 hover:text-red-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              <Trash className="w-3 h-3" /> Bersihkan
            </button>
          )}
        </h4>

        {/* Dynamic description cards */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[250px] xl:max-h-none">
          {structures.length === 0 ? (
            <div className="text-center py-6 text-slate-550 text-xs my-auto">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-700 opacity-40" />
              Belum ada struktur tambahan terpasang.
              <p className="text-[10px] mt-1 text-slate-600 font-mono">
                Pilih pelet umpan / batuan di panel atas, kemudian klik area air kolam untuk menjatuhkan umpan.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {structures.map((s) => {
                const isFood = s.type === 'food';
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-geo-panel border border-geo-border p-2.5 rounded-none text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-none flex items-center justify-center border text-xs ${
                        isFood 
                          ? 'bg-amber-400/15 border-amber-500/40 text-geo-orange' 
                          : s.type === 'rock' 
                          ? 'bg-slate-500/15 border-slate-400/40 text-slate-300' 
                          : 'bg-amber-850/15 border border-amber-700/40 text-amber-500'
                      }`}>
                        {isFood ? (
                          <Cherry className="w-3.5 h-3.5" />
                        ) : s.type === 'rock' ? (
                          <Snowflake className="w-3.5 h-3.5" />
                        ) : (
                          <Anchor className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200 uppercase tracking-tight text-[11px] font-space">
                          {isFood ? 'Umpan Pelet Bom' : s.type === 'rock' ? 'Tumpukan Batu' : 'Batang Kayu Terapung'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Posisi: X={Math.round(s.x)}% Y={Math.round(s.y)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFood && (
                        <span className="text-[10px] bg-amber-950 font-mono text-geo-orange px-1.5 py-0.5 rounded-none border border-amber-900/40">
                          {s.amount}% Sisa
                        </span>
                      )}
                      <button
                        onClick={() => onRemoveStructure(s.id)}
                        className="text-red-400 hover:text-white p-1 hover:bg-red-950/45 rounded-none transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hovered Fish profile HUD */}
        <div className="bg-[#050B10] rounded-none p-4 border border-geo-border">
          <span className="text-[9px] text-[#64748B] font-mono block mb-1.5 uppercase tracking-wider">PROFIL TARGET TERDEKAT</span>
          {hoveredFish ? (
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-200">{hoveredFish.species}</span>
                <span className="text-geo-cyan font-mono font-bold">{hoveredFish.weight} kg</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Kedalaman:</span>
                <span className="text-geo-cyan font-bold">{hoveredFish.depth} m</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Ukuran Kelas:</span>
                <span className={`capitalize font-bold ${
                  hoveredFish.size === 'large' ? 'text-red-400' : hoveredFish.size === 'medium' ? 'text-geo-orange' : 'text-geo-cyan'
                }`}>
                  {hoveredFish.size}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[10.5px] font-mono text-[#64748B] italic text-center py-2 uppercase">
              Arahkan kursor pada ikon bulatan ikan untuk melihat detail taksiran kelas & berat spesimen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

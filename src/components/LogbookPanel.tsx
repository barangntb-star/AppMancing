import React, { useState } from 'react';
import { CatchLog } from '../types';
import { Calendar, Tag, Weight, Ruler, MessageSquare, Plus, PlusCircle, Trash2, Award, FishIcon, Trophy } from 'lucide-react';

interface LogbookPanelProps {
  logs: CatchLog[];
  onAddLog: (log: Omit<CatchLog, 'id' | 'timestamp'>) => void;
  onRemoveLog: (id: string) => void;
  currentDepth: number;
  gpsData?: {
    latitude: number;
    longitude: number;
    pondName: string;
  };
}

export default function LogbookPanel({ logs, onAddLog, onRemoveLog, currentDepth, gpsData }: LogbookPanelProps) {
  // Form States
  const [species, setSpecies] = useState('Ikan Nila');
  const [weight, setWeight] = useState(0.8);
  const [length, setLength] = useState(25);
  const [bait, setBait] = useState('Pelet Apung');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddLog({
      species,
      weight,
      length,
      bait,
      depth: parseFloat(currentDepth.toFixed(1)),
      notes: notes || 'Tangkapan tercatat di kolam pancing.',
      coordinates: gpsData ? {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude
      } : undefined
    });
    // Reset fields
    setNotes('');
  };

  // Perform analytical values
  const totalWeight = logs.reduce((sum, item) => sum + item.weight, 0);
  const avgLength = logs.length > 0 ? Number((logs.reduce((sum, item) => sum + item.length, 0) / logs.length).toFixed(1)) : 0;
  const heaviestFish = logs.reduce((heaviest, current) => {
    return (!heaviest || current.weight > heaviest.weight) ? current : heaviest;
  }, null as CatchLog | null);

  // Common Pond Angling Species list
  const pondSpecies = ['Ikan Mas', 'Ikan Nila', 'Ikan Patin', 'Ikan Gurame', 'Ikan Lele', 'Ikan Bawal'];

  return (
    <div id="logbook-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Statistics Summary Header Card */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total catch count */}
        <div className="bg-geo-panel border border-geo-border p-4 rounded-none flex items-center gap-4 shadow-none">
          <div className="w-12 h-12 rounded-none bg-geo-cyan/10 border border-geo-cyan/30 flex items-center justify-center text-geo-cyan shrink-0">
            <FishIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono block uppercase">TOTAL TANGKAPAN</span>
            <span className="text-2xl font-bold font-mono text-slate-100">{logs.length} EKOR</span>
          </div>
        </div>

        {/* Total weight */}
        <div className="bg-geo-panel border border-geo-border p-4 rounded-none flex items-center gap-4 shadow-none">
          <div className="w-12 h-12 rounded-none bg-geo-orange/10 border border-geo-orange/30 flex items-center justify-center text-geo-orange shrink-0">
            <Weight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono block uppercase">TOTAL TONASE CATCH</span>
            <span className="text-2xl font-bold font-mono text-geo-orange">{totalWeight.toFixed(2)} KG</span>
          </div>
        </div>

        {/* Average size */}
        <div className="bg-geo-panel border border-geo-border p-4 rounded-none flex items-center gap-4 shadow-none">
          <div className="w-12 h-12 rounded-none bg-emerald-500/10 border border-emerald-550/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Ruler className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono block uppercase">RATA-RATA PANJANG</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">{avgLength} CM</span>
          </div>
        </div>

        {/* Big Catch Trophy */}
        <div className="bg-geo-panel border border-geo-border p-4 rounded-none flex items-center gap-4 shadow-none">
          <div className="w-12 h-12 rounded-none bg-amber-500/10 border border-amber-550/30 flex items-center justify-center text-yellow-500 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono block uppercase">TANGKAPAN TERBESAR</span>
            <span className="text-sm font-bold font-space text-slate-100 truncate max-w-[150px] uppercase">
              {heaviestFish ? `${heaviestFish.species} (${heaviestFish.weight}KG)` : 'BELUM ADA'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. New Catch Submission Form */}
      <div className="bg-geo-panel border border-geo-border rounded-none p-5 shadow-none flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-geo-border pb-3 uppercase font-space tracking-wider">
          <PlusCircle className="w-4 h-4 text-geo-cyan" />
          Catat Tangkapan Baru
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Species */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">SPESIES IKAN</label>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="bg-[#050B10] text-slate-200 border border-geo-border rounded-none py-2 px-3 text-xs focus:outline-none focus:border-geo-cyan cursor-pointer font-mono"
            >
              {pondSpecies.map((sp) => (
                <option key={sp} value={sp}>{sp.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Weight */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider">BERAT IKAN (KG)</span>
              <span className="text-geo-orange font-bold">{weight} kg</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.05"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              className="accent-geo-cyan h-1.5 bg-[#050B10] border border-geo-border rounded-none appearance-none cursor-pointer"
            />
          </div>

          {/* Length */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider">PANJANG (CM)</span>
              <span className="text-emerald-400 font-bold">{length} cm</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="accent-geo-cyan h-1.5 bg-[#050B10] border border-geo-border rounded-none appearance-none cursor-pointer"
            />
          </div>

          {/* Bait */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">UMPAN JITU YANG DIGUNAKAN</label>
            <input
              type="text"
              value={bait}
              onChange={(e) => setBait(e.target.value)}
              placeholder="Contoh: Pelet Apung / Cacing merah"
              className="bg-[#050B10] text-slate-200 border border-geo-border rounded-none py-2 px-3 text-xs focus:outline-none focus:border-geo-cyan font-mono"
              required
            />
          </div>

          {/* Depth info auto-grabbed */}
          <div className="flex justify-between items-center bg-[#050B10] p-3 rounded-none border border-geo-border text-xs">
            <span className="text-slate-400 font-mono text-[10px] uppercase">KEDALAMAN DETEKSI SONAR:</span>
            <span className="font-bold text-geo-cyan font-mono">{currentDepth.toFixed(1)} METER</span>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">CATATAN & TIPS SPOT</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tuliskan detail catatan, misalnya: ditarik saat cuaca mendung."
              className="bg-[#050B10] text-slate-200 border border-geo-border rounded-none py-2 px-3 text-xs focus:outline-none focus:border-geo-cyan min-h-[60px] resize-none font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-geo-cyan hover:bg-[#00b5dd] text-black font-mono font-bold rounded-none py-2.5 text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Award className="w-4 h-4" />
            SIMPAN JURNAL PANCING
          </button>
        </form>
      </div>

      {/* 3. History Feed Table of Past Catches */}
      <div className="lg:col-span-2 bg-geo-panel border border-geo-border rounded-none p-5 shadow-none flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-geo-border pb-3 uppercase font-space tracking-wider">
          <Calendar className="w-4 h-4 text-emerald-400" />
          Riwayat Tangkapan Kolam Anda
        </h3>

        <div className="flex-1 overflow-y-auto max-h-[460px] pr-2">
          {logs.length === 0 ? (
            <div className="text-center py-20 text-slate-500 flex flex-col items-center justify-center">
              <Award className="w-12 h-12 text-slate-700 mb-3 opacity-50" />
              <p className="text-sm font-semibold uppercase font-mono text-slate-400">Jurnal Pancing Masih Kosong</p>
              <p className="text-xs text-slate-600 mt-1.5 max-w-sm leading-relaxed font-mono">
                Gunakan alat Sonar, ketahui kedalaman target air, tangkap ikannya, kemudian catat riwayat tangkapan Anda di panel sebelah kiri.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#050B10] p-4 rounded-none border border-geo-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-geo-cyan/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Species icon indicator shape */}
                    <div className="w-10 h-10 rounded-none bg-geo-cyan/10 border border-geo-cyan/30 flex items-center justify-center text-geo-cyan shrink-0">
                      <FishIcon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm font-space uppercase">{log.species}</span>
                        <span className="text-[10px] bg-geo-panel border border-geo-border text-slate-400 px-2 py-0.5 rounded-none font-mono">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          <Weight className="w-3.5 h-3.5 text-geo-orange" />
                          {log.weight} kg
                        </span>
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                          {log.length} cm
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <Tag className="w-3.5 h-3.5 text-yellow-500" />
                          {log.bait}
                        </span>
                        <span>
                          DEPTH: <strong className="text-geo-cyan font-bold">{log.depth}M</strong>
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-2 leading-normal bg-geo-panel p-2 rounded-none border border-geo-border font-mono">
                        <MessageSquare className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                        "{log.notes.toUpperCase()}"
                      </p>

                      {log.coordinates && (
                        <div className="mt-2 text-[9px] font-mono text-geo-cyan flex items-center gap-1.5 bg-geo-panel/65 px-2 py-1 border border-geo-border max-w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-geo-cyan animate-pulse"></span>
                          <span>GPS: {log.coordinates.latitude.toFixed(6)}, {log.coordinates.longitude.toFixed(6)}</span>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${log.coordinates.latitude},${log.coordinates.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#64748B] hover:text-white hover:underline flex items-center ml-1.5"
                          >
                            MAPS
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveLog(log.id)}
                    className="self-end md:self-center text-red-400 hover:text-white hover:bg-red-950/40 p-2 rounded-none cursor-pointer transition-colors border border-transparent hover:border-red-500"
                    title="Hapus Log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

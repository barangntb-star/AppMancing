import React from 'react';
import { DeviceStatus, Fish, PondStructure } from '../types';
import { Sparkles, HelpingHand, Lightbulb, TrendingUp, AlertTriangle, CloudSun } from 'lucide-react';

interface SmartAdvisorProps {
  device: DeviceStatus;
  fishes: Fish[];
  structures: PondStructure[];
}

export default function SmartAdvisor({ device, fishes, structures }: SmartAdvisorProps) {
  // Generate expert Indonesian tips and advice cards dynamically based on aquatic rules
  const getAquaticAnalysis = () => {
    const tips: { title: string; desc: string; type: 'success' | 'warn' | 'info' }[] = [];

    // 1. Temperature rules
    if (device.waterTemp > 29) {
      tips.push({
        title: 'Suhu Air Panas (>29°C): Ikan Menyelam ke Dasar',
        desc: 'Suhu air kolam cukup tinggi. Ikan cenderung bersembunyi di dasar berlumpur atau di dekat naungan (daun/batang kayu). Sebaiknya mancing di spot yang teduh atau gunakan teknik dasar (dasaran/glosor).',
        type: 'warn'
      });
    } else if (device.waterTemp < 22) {
      tips.push({
        title: 'Suhu Air Dingin (<22°C): Metabolisme Lambat',
        desc: 'Ikan menjadi pasif dan lambat merespon umpan karena laju pencernaan menurun. Gunakan umpan pelet yang berbau tajam (amis kuat) untuk memicu nafsu makannya yang menurun.',
        type: 'warn'
      });
    } else {
      tips.push({
        title: 'Suhu Optimal (24°C - 28°C): Ikan Sangat Aktif',
        desc: 'Kondisi air kolam sangat ideal untuk pembakaran energi ikan. Ikan Mas, Nila, dan Patin biasanya aktif berenang mencari makan di kedalaman menengah (1m - 2.5m). Waktu terbaik untuk menaburkan umpan pelet bom!',
        type: 'success'
      });
    }

    // 2. pH Level rules
    if (device.phLevel < 6.5) {
      tips.push({
        title: 'Kadar pH Rendah (Asam): Ikan Stress',
        desc: 'Kondisi kolam terlalu asam akibat zat asam hujan atau sisa pakan busuk. Ikan akan cenderung mengapung di permukaan untuk mencari oksigen ekstra. Umpan alami seperti cacing seringkali kurang efektif pada fase ini.',
        type: 'warn'
      });
    } else if (device.phLevel > 8.2) {
      tips.push({
        title: 'Kadar pH Tinggi (Basa): Lindungi Umpan',
        desc: 'Kondisi air agak alkali. Ikan memiliki lendir kulit yang lebih tebal. Gunakan umpan racikan beraroma wangi (seperti esens nangka/pandan) untuk menarik perhatian ikan Mas dan Gurame.',
        type: 'info'
      });
    } else {
      tips.push({
        title: 'pH Air Stabil (6.8 - 7.8): Kondisi Ideal',
        desc: 'Keseimbangan asam-basa air kolam luar biasa sehat. Ikan tidak stress dan akan menyantap segala jenis umpan yang Anda tawarkan dengan agresif.',
        type: 'success'
      });
    }

    // 3. Water Clarity rules
    if (device.waterClarity === 'keruh') {
      tips.push({
        title: 'Air Kolam Keruh: Turunkan Jarak Pandang',
        desc: 'Ikan tidak dapat melihat umpan dari jauh secara visual. Disarankan menggunakan umpan hidup yang terus bergerak (cacing tanah/ulat) atau tambahkan cairan esens amis (menyengat) di pelet Anda.',
        type: 'info'
      });
    } else if (device.waterClarity === 'jernih') {
      tips.push({
        title: 'Air Kolam Jernih: Ikan Lebih Waspada',
        desc: 'Ikan bisa melihat bayangan Anda atau senar pancing tipis Anda di permukaan. Gunakan senar fluorocarbon/senar transparan yang tipis dan hindari membuat suara bising di tepi kolam.',
        type: 'info'
      });
    }

    // 4. Fish distribution details
    const bottomFishes = fishes.filter(f => f.depth > 2.5 && f.active);
    const midFishes = fishes.filter(f => f.depth <= 2.5 && f.active);

    if (bottomFishes.length > midFishes.length) {
      tips.push({
        title: 'Konsentrasi Target Berada Di Dasar Kolam',
        desc: 'Data sonar menunjukkan kawanan ikan terbanyak berkumpul di kedalaman >2.5 meter. Atur kedalaman pelampung pancing Anda agak panjang atau langsung gunakan teknik dasar timbel (tanpa pelampung).',
        type: 'info'
      });
    } else if (midFishes.length > 0) {
      tips.push({
        title: 'Ikan Bermain Di Tengah Kolam',
        desc: 'Kawanan ikan aktif melayang dekat permukaan hingga kedalaman sedang. Setel umpan gantung dengan pelampung kecil berjarak 1 - 1.5 meter dari permukaan untuk menyergap ikan Nila atau Gurame.',
        type: 'success'
      });
    }

    // 5. Structure tips
    const hasFood = structures.some(s => s.type === 'food');
    if (!hasFood && device.connected) {
      tips.push({
        title: 'Rekomendasi: Tebar Pelet Bom Terlebih Dahulu',
        desc: 'Ikan pancingan tersebar secara acak di kolam pancing. Pindah ke tab "Peta Kontur", pilih "Sebar Pelet Umpan", lalu klik pada layar untuk membuat kluster kumpul agar sonar Anda menangkap titik koordinatnya!',
        type: 'info'
      });
    }

    return tips;
  };

  const currentTips = device.connected ? getAquaticAnalysis() : [
    {
      title: 'Menunggu Koneksi Sonar Bawah Air...',
      desc: 'Nyalakan transmiter Sonar dan sambungkan ke ponsel untuk mengaktifkan analisis biologi kolam dan algoritma penentuan jenis umpan jitu.',
      type: 'info' as const
    }
  ];

  return (
    <div id="smart-advisor-panel" className="bg-geo-panel border border-geo-border rounded-none p-5 shadow-none flex flex-col gap-4">
      {/* Advisor Header with icon gradient */}
      <div className="flex items-center justify-between border-b border-geo-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-none bg-geo-cyan flex items-center justify-center text-black">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-space uppercase tracking-wider">
              Asisten Pemancing Pintar (AI Advisor)
            </h3>
            <span className="text-[10px] text-geo-cyan block font-mono">DYNAMIC AQUATIC INSIGHT ENGINE</span>
          </div>
        </div>

        {device.connected && (
          <div className="flex items-center gap-1.5 bg-[#050B10] border border-geo-border px-2.5 py-1 rounded-none text-xs text-slate-350 font-mono">
            <CloudSun className="w-3.5 h-3.5 text-lime-400" />
            INDEKS AKTIVITAS: <strong className="text-lime-400">88% (TINGGI)</strong>
          </div>
        )}
      </div>

      {/* Grid listing the advice cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentTips.map((tip, idx) => {
          const borderStyle = 
            tip.type === 'success' 
              ? 'border-emerald-500/25 bg-emerald-950/15 text-emerald-400' 
              : tip.type === 'warn' 
              ? 'border-red-500/25 bg-red-950/15 text-red-300' 
              : 'border-geo-border bg-[#050B10] text-[#00D1FF]';

          const iconElement = 
            tip.type === 'success' ? (
              <TrendingUp className="w-4 h-4 text-emerald-450" />
            ) : tip.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <Lightbulb className="w-4 h-4 text-geo-cyan" />
            );

          return (
            <div
              key={idx}
              className={`border rounded-none p-4 flex flex-col gap-2.5 transition-all hover:border-slate-500 ${borderStyle}`}
            >
              <div className="flex items-center gap-2 font-bold text-xs font-space">
                {iconElement}
                <span className="uppercase tracking-tight leading-normal font-mono">{tip.title}</span>
              </div>
              
              <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                {tip.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

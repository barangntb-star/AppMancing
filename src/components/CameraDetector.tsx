import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Video, Activity, Sparkles, Sliders, Play, Pause, AlertTriangle, Eye, RefreshCw, Layers } from 'lucide-react';

interface CameraDetectorProps {
  onMotionUpdate: (motionScore: number, isMotionDetected: boolean) => void;
  isFilterActive: boolean;
  onFilterToggle: (active: boolean) => void;
}

export default function CameraDetector({
  onMotionUpdate,
  isFilterActive,
  onFilterToggle
}: CameraDetectorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [cameraActive, setCameraActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [hudMode, setHudMode] = useState<'original' | 'diff'>('diff');
  const [sensitivity, setSensitivity] = useState(15); // pixel threshold (diff value)
  const [motionThreshold, setMotionThreshold] = useState(1.5); // % of screen changed to count as motion
  const [motionScore, setMotionScore] = useState(0);
  const [isMotionDetected, setIsMotionDetected] = useState(false);
  const [fps, setFps] = useState(0);
  
  // Interactive Simulation Fallback States (for desk testing/iframe fallback)
  const [isSimulatingModel, setIsSimulatingModel] = useState(true);
  const [simFreq, setSimFreq] = useState(1.2); // ripple freq
  const [ripplePoint, setRipplePoint] = useState<{ x: number; y: number } | null>(null);

  // Local helper ref to avoid closures in animation frame
  const stateRef = useRef({
    cameraActive,
    sensitivity,
    motionThreshold,
    hudMode,
    isSimulatingModel,
    simFreq,
    ripplePoint
  });

  useEffect(() => {
    stateRef.current = {
      cameraActive,
      sensitivity,
      motionThreshold,
      hudMode,
      isSimulatingModel,
      simFreq,
      ripplePoint
    };
  }, [cameraActive, sensitivity, motionThreshold, hudMode, isSimulatingModel, simFreq, ripplePoint]);

  // Handle manual splash / click ripple in simulation
  const handlePondClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSimulatingModel) return;
    const canvas = sourceCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setRipplePoint({ x, y });
    setMotionScore(15 + Math.random() * 20); // trigger splash motion spike
    setTimeout(() => {
      setRipplePoint(null);
    }, 1200);
  };

  // Turn on actual camera stream
  const startCamera = async () => {
    setStreamError(null);
    setIsSimulatingModel(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // prefer back phone camera for pond
          width: { ideal: 320 },
          height: { ideal: 240 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => {
          console.error("Video play failed:", e);
        });
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errMsg = "Tidak dapat mengakses modul kamera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = "Izin kamera ditolak oleh browser/sistem. Klik 'Mulai Kamera Simulasi' di bawah.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = "Perangkat kamera tidak ditemukan pada ponsel/komputer Anda.";
      }
      setStreamError(errMsg);
      setIsSimulatingModel(true); // fallback to high quality simulation HUD
    }
  };

  // Turn off camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setMotionScore(0);
    setIsMotionDetected(false);
    onMotionUpdate(0, false);
  };

  // Clean hook on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Frame processing and simulation render clock
  useEffect(() => {
    let animId: number;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fpsInterval = setInterval(() => {
      setFps(frameCount);
      frameCount = 0;
    }, 1000);

    // Track previous frame data for pixel changes
    let prevImageData: ImageData | null = null;

    const processFrame = () => {
      const video = videoRef.current;
      const srcCanvas = sourceCanvasRef.current;
      const diffCanvas = diffCanvasRef.current;
      
      const { 
        cameraActive: isActive, 
        sensitivity: sensVal, 
        motionThreshold: thresVal, 
        hudMode: renderMode,
        isSimulatingModel: isSim,
        simFreq: freq,
        ripplePoint: rip
      } = stateRef.current;

      frameCount++;

      if (isSim) {
        // --- RENDER HIGH-END VIRTUAL WATER SURFACE SCANNER ---
        if (srcCanvas && diffCanvas) {
          const sCtx = srcCanvas.getContext('2d');
          const dCtx = diffCanvas.getContext('2d');
          if (sCtx && dCtx) {
            const w = srcCanvas.width;
            const h = srcCanvas.height;

            // 1. Draw animated mock pond water surface
            const time = Date.now() / 1000;
            sCtx.fillStyle = '#061320';
            sCtx.fillRect(0, 0, w, h);

            // Draw wave contours
            sCtx.strokeStyle = 'rgba(0, 209, 255, 0.15)';
            sCtx.lineWidth = 1;
            for (let i = 0; i < h; i += 15) {
              sCtx.beginPath();
              for (let j = 0; j < w; j += 10) {
                // generate swaying ripples
                const wave = Math.sin(j / 30 + time * freq) * 4 * Math.cos(i / 40 + time * 0.8);
                if (j === 0) sCtx.moveTo(j, i + wave);
                else sCtx.lineTo(j, i + wave);
              }
              sCtx.stroke();
            }

            // Draw shadow shadow-fishes shapes passing below
            const fishX = ((time * 20) % (w + 100)) - 50;
            const fishY = h * 0.45 + Math.sin(time) * 15;
            sCtx.fillStyle = 'rgba(16, 185, 129, 0.08)';
            sCtx.beginPath();
            sCtx.ellipse(fishX, fishY, 15, 6, 0, 0, Math.PI * 2);
            sCtx.fill();
            // tail
            sCtx.beginPath();
            sCtx.moveTo(fishX - 15, fishY);
            sCtx.lineTo(fishX - 22, fishY - 5);
            sCtx.lineTo(fishX - 22, fishY + 5);
            sCtx.closePath();
            sCtx.fill();

            // Click manual ripple effect
            let simActiveMotion = false;
            let simScore = Math.abs(Math.sin(time * 0.4) * 0.8); // low baseline ambient leaves/wind

            if (rip) {
              sCtx.strokeStyle = 'rgba(0, 209, 255, 0.8)';
              sCtx.lineWidth = 2;
              const age = ((Date.now() % 1200) / 1200);
              sCtx.beginPath();
              sCtx.arc(rip.x, rip.y, age * 60, 0, Math.PI * 2);
              sCtx.stroke();
              // second outer ring
              if (age > 0.3) {
                sCtx.strokeStyle = 'rgba(0, 209, 255, 0.4)';
                sCtx.beginPath();
                sCtx.arc(rip.x, rip.y, (age - 0.3) * 60, 0, Math.PI * 2);
                sCtx.stroke();
              }
              simScore += (1 - age) * 12; // high motion spike
            }

            // Periodic automatic ripples representing active surfacing fish (fish feeding splashes!)
            const fishSplashCycle = (time * 0.5) % Math.PI;
            const splashActive = fishSplashCycle < 0.4;
            const splashX = w * 0.4 + Math.sin(time * 2.3) * 40;
            const splashY = h * 0.55 + Math.cos(time * 1.5) * 30;

            if (splashActive) {
              sCtx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
              sCtx.lineWidth = 1.5;
              sCtx.beginPath();
              sCtx.arc(splashX, splashY, fishSplashCycle * 45, 0, Math.PI * 2);
              sCtx.stroke();
              simScore += (0.4 - fishSplashCycle) * 8;
            }

            // Sync simulation calculations back to the motion stats
            setMotionScore(Number(simScore.toFixed(2)));
            const detected = simScore > thresVal;
            setIsMotionDetected(detected);
            onMotionUpdate(simScore, detected);

            // Copy srcCanvas contents to the HUD view or do binary overlay
            if (renderMode === 'diff') {
              // Draw tactical sonar scan overlay
              dCtx.fillStyle = '#010508';
              dCtx.fillRect(0, 0, w, h);

              // Grid matrices lines
              dCtx.strokeStyle = 'rgba(0, 209, 255, 0.08)';
              dCtx.lineWidth = 1;
              for (let x = 0; x < w; x += 20) {
                dCtx.beginPath(); dCtx.moveTo(x, 0); dCtx.lineTo(x, h); dCtx.stroke();
              }
              for (let y = 0; y < h; y += 20) {
                dCtx.beginPath(); dCtx.moveTo(0, y); dCtx.lineTo(w, y); dCtx.stroke();
              }

              // Highlight action areas
              if (rip) {
                dCtx.fillStyle = 'rgba(0, 209, 255, 0.15)';
                dCtx.beginPath();
                dCtx.arc(rip.x, rip.y, 40, 0, Math.PI * 2);
                dCtx.fill();
                dCtx.strokeStyle = '#00D1FF';
                dCtx.strokeRect(rip.x - 10, rip.y - 10, 20, 20);

                dCtx.fillStyle = '#00D1FF';
                dCtx.font = '7px monospace';
                dCtx.fillText('USER_STRIKE_EVENT', rip.x + 12, rip.y + 4);
              }

              if (splashActive) {
                dCtx.fillStyle = 'rgba(245, 158, 11, 0.12)';
                dCtx.beginPath();
                dCtx.arc(splashX, splashY, 25, 0, Math.PI * 2);
                dCtx.fill();
                dCtx.strokeStyle = '#F59E0B';
                dCtx.strokeRect(splashX - 8, splashY - 8, 16, 16);

                dCtx.fillStyle = '#F59E0B';
                dCtx.font = '7px monospace';
                dCtx.fillText('FISH_RISE_DETECTED', splashX + 11, splashY + 3);
              }

              // Swaying lines highlighted
              dCtx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
              dCtx.beginPath();
              dCtx.moveTo(fishX - 25, fishY);
              dCtx.lineTo(fishX + 25, fishY);
              dCtx.stroke();
              dCtx.fillStyle = '#10B981';
              dCtx.fillText('SUB_SURFACE_TEMP_TARGET', fishX + 8, fishY - 8);
            } else {
              // Copy original simulation
              dCtx.drawImage(srcCanvas, 0, 0);
            }
          }
        }
      } else if (isActive && video && srcCanvas && diffCanvas) {
        // --- REAL TIME PHYSIC COMPUTER VISION ON MOBILE CAMERA STREAM ---
        const sCtx = srcCanvas.getContext('2d');
        const dCtx = diffCanvas.getContext('2d');
        
        if (sCtx && dCtx && video.readyState === video.HAVE_ENOUGH_DATA) {
          const w = srcCanvas.width;
          const h = srcCanvas.height;

          // Compute canvas pixels
          sCtx.drawImage(video, 0, 0, w, h);
          const currentImgData = sCtx.getImageData(0, 0, w, h);
          const currentPixels = currentImgData.data;

          // Prepare HUD canvas
          if (renderMode === 'diff') {
            dCtx.fillStyle = '#000000';
            dCtx.fillRect(0, 0, w, h);
          } else {
            dCtx.drawImage(video, 0, 0, w, h);
          }

          if (prevImageData) {
            const prevPixels = prevImageData.data;
            let differentPixelsCount = 0;
            const totalPixels = w * h;

            // Output visual difference data
            const diffImgData = dCtx.createImageData(w, h);
            const diffPixels = diffImgData.data;

            // Grid analysis mapping to identify high motion areas
            let maxDiffX = 0;
            let maxDiffY = 0;
            let maxDiffVal = 0;
            const gridSize = 16;
            const gridValues = new Uint32Array((w / gridSize) * (h / gridSize));

            for (let i = 0; i < currentPixels.length; i += 4) {
              const r1 = currentPixels[i];
              const g1 = currentPixels[i + 1];
              const b1 = currentPixels[i + 2];

              const r2 = prevPixels[i];
              const g2 = prevPixels[i + 1];
              const b2 = prevPixels[i + 2];

              // Euclidean distance in color space
              const colorDiff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

              if (colorDiff > sensVal * 3) {
                differentPixelsCount++;

                const pixelIndex = i / 4;
                const px = pixelIndex % w;
                const py = Math.floor(pixelIndex / w);

                const gx = Math.floor(px / gridSize);
                const gy = Math.floor(py / gridSize);
                const gIndex = gy * Math.floor(w / gridSize) + gx;
                if (gIndex < gridValues.length) {
                  gridValues[gIndex]++;
                  if (gridValues[gIndex] > maxDiffVal) {
                    maxDiffVal = gridValues[gIndex];
                    maxDiffX = gx * gridSize + gridSize/2;
                    maxDiffY = gy * gridSize + gridSize/2;
                  }
                }

                if (renderMode === 'diff') {
                  // highlight motion in cyan/green gradient overlay
                  diffPixels[i] = 0;           // R
                  diffPixels[i + 1] = 209;     // G
                  diffPixels[i + 2] = 255;     // B
                  diffPixels[i + 3] = 255;     // Alpha
                }
              } else if (renderMode === 'diff') {
                // dark binary scanlines
                diffPixels[i] = 10;
                diffPixels[i + 1] = 15;
                diffPixels[i + 2] = 22;
                diffPixels[i + 3] = 255;
              }
            }

            // Draw motion overlay when in diffing HUD mode
            if (renderMode === 'diff') {
              dCtx.putImageData(diffImgData, 0, 0);
            }

            // Calculate percentage changed
            const calculatedScore = (differentPixelsCount / totalPixels) * 100;
            const dampedScore = motionScore * 0.4 + calculatedScore * 0.6; // smooth jitter
            
            setMotionScore(Number(dampedScore.toFixed(2)));
            
            // Apply threshold filter
            const detected = dampedScore > thresVal;
            setIsMotionDetected(detected);
            onMotionUpdate(dampedScore, detected);

            // Draw targeting reticle box on highest motion cluster
            if (detected && maxDiffVal > 15) {
              dCtx.strokeStyle = '#F59E0B'; // Gold target color
              dCtx.lineWidth = 1.5;
              dCtx.strokeRect(maxDiffX - 16, maxDiffY - 16, 32, 32);
              
              // Draw lock lines
              dCtx.beginPath();
              dCtx.moveTo(maxDiffX - 25, maxDiffY); dCtx.lineTo(maxDiffX - 16, maxDiffY);
              dCtx.moveTo(maxDiffX + 16, maxDiffY); dCtx.lineTo(maxDiffX + 25, maxDiffY);
              dCtx.moveTo(maxDiffX, maxDiffY - 25); dCtx.lineTo(maxDiffX, maxDiffY - 16);
              dCtx.moveTo(maxDiffX, maxDiffY + 16); dCtx.lineTo(maxDiffX, maxDiffY + 25);
              dCtx.stroke();

              dCtx.fillStyle = '#F59E0B';
              dCtx.font = 'bold 7px monospace';
              dCtx.fillText(`MOTION_LOCK: ${(dampedScore * 4).toFixed(0)}KG_EST`, maxDiffX + 12, maxDiffY - 12);
            }
          }

          // Save current frame for the next interval comparison
          prevImageData = currentImgData;
        }
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => {
      cancelAnimationFrame(animId);
      clearInterval(fpsInterval);
    };
  }, []);

  return (
    <div id="camera-movement-detector-station" className="bg-[#0b141d] border border-geo-border rounded-none p-5 text-[#E0E6ED] flex flex-col gap-4">
      
      {/* Module Title Section */}
      <div className="flex flex-wrap items-center justify-between border-b border-geo-border pb-3.5 gap-2">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 border ${cameraActive ? 'border-geo-green bg-geo-green/10 text-geo-green' : 'border-geo-orange bg-geo-orange/10 text-geo-orange animate-pulse'}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-geo-cyan font-mono tracking-widest uppercase block">BIO-MOTION SENSOR INTERACTION</span>
            <h3 className="text-sm font-bold font-space uppercase text-white flex items-center gap-2 mt-0.5">
              MODUL KAMERA PENDETEKSI GERAKAN KOLAM
              {isSimulatingModel && (
                <span className="text-[8px] bg-indigo-950/40 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 font-mono">
                  SIMULATION ACTIVE
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Dynamic Link Active Toggle */}
        <button
          onClick={() => onFilterToggle(!isFilterActive)}
          className={`font-mono text-[10px] font-bold py-1.5 px-3 border transition-all cursor-pointer ${
            isFilterActive 
              ? 'bg-geo-cyan text-black border-geo-cyan hover:bg-[#00b5dd]' 
              : 'bg-black hover:bg-[#1E293B] text-[#64748B] border-slate-700'
          }`}
        >
          {isFilterActive ? '✓ FILTER SONAR AKTIF' : '✗ LINK SONAR MATI'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* CV HUD Screens Feed */}
        <div className="lg:col-span-6 flex flex-col gap-2">
          <div className="relative aspect-video w-full bg-[#050B10] border border-geo-border overflow-hidden cursor-crosshair">
            
            {/* Hidden Video Source element */}
            <video
              ref={videoRef}
              style={{ display: 'none' }}
              playsInline
              muted
              width="320"
              height="240"
            />

            {/* Hidden calculation canvasses */}
            <canvas
              ref={sourceCanvasRef}
              width="320"
              height="240"
              style={{ display: 'none' }}
            />

            {/* Visible HUD Scan canvas */}
            <canvas
              ref={diffCanvasRef}
              onClick={handlePondClick}
              width="320"
              height="240"
              className="w-full h-full object-cover block"
            />

            {/* Simulated overlay guides */}
            <div className="absolute top-2.5 left-2.5 bg-black/70 border border-geo-border px-2 py-1 font-mono text-[8px] text-geo-cyan pointer-events-none flex flex-col gap-0.5">
              <span>STREAM: {isSimulatingModel ? 'SIMULATOR_CORE_V1' : 'LIVE_CAMERA_FACING_BACK'}</span>
              <span>RESOLUTION: 320 x 240 RAW_CVP</span>
              <span>RATE: {fps} FPS</span>
            </div>

            {/* Live blinking status mark */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/70 border border-geo-border px-2 py-1 pointer-events-none">
              <span className={`w-1.5 h-1.5 rounded-full ${isMotionDetected ? 'bg-geo-green animate-ping' : 'bg-[#EF4444]'}`}></span>
              <span className="font-mono text-[8px] text-white uppercase tracking-wider">
                {isMotionDetected ? 'GERAKAN TERDENGAR_OK' : 'TENANG (STILL_WATER)'}
              </span>
            </div>

            {/* Tap cue for simulation */}
            {isSimulatingModel && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 border border-[#00D1FF]/20 p-1.5 text-center text-[7px] font-mono text-slate-300 pointer-events-none tracking-wider">
                💡 KLIK PADA AREA FEED DI ATAS UNTUK MEMBUAT CIPRATAN / GERAKAN AIR KOLAM
              </div>
            )}
          </div>

          {/* Screen options toggle toolbar */}
          <div className="flex items-center justify-between bg-[#050B10] p-2 border border-geo-border">
            <span className="text-[10px] font-mono text-slate-400">MODE VISUALISAI SCANNER:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setHudMode('original')}
                className={`px-3 py-1 text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                  hudMode === 'original' 
                    ? 'bg-geo-border text-white border-geo-cyan/50' 
                    : 'bg-black text-[#5F6B7E] border-transparent hover:text-slate-200'
                }`}
              >
                KAMERA ASLI
              </button>
              <button
                onClick={() => setHudMode('diff')}
                className={`px-3 py-1 text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                  hudMode === 'diff' 
                    ? 'bg-geo-border text-geo-cyan border-geo-cyan/60' 
                    : 'bg-black text-[#5F6B7E] border-transparent hover:text-slate-200'
                }`}
              >
                INFRARED-CV HUD
              </button>
            </div>
          </div>
        </div>

        {/* Controls & Telemetries */}
        <div className="lg:col-span-6 flex flex-col justify-between gap-4">
          
          {/* Main Status Blocks */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-[#050B10] p-3 border border-geo-border">
              <span className="text-[8px] text-[#64748B] font-mono uppercase block tracking-wider">SKOR GERAKAN BERJALAN</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-xl font-bold font-mono ${isMotionDetected ? 'text-[#10B981]' : 'text-slate-400'}`}>
                  {motionScore.toFixed(2)}
                </span>
                <span className="text-[10px] font-mono text-slate-500">%DIFF</span>
              </div>
              
              {/* Score bar */}
              <div className="w-full h-1 bg-slate-900 mt-2 relative">
                <div 
                  style={{ width: `${Math.min(100, (motionScore / 8) * 100)}%` }}
                  className={`h-full transition-all duration-300 ${isMotionDetected ? 'bg-[#10B981]' : 'bg-slate-500'}`}
                />
                
                {/* Threshold line mark */}
                <div 
                  style={{ left: `${Math.min(95, (motionThreshold / 8) * 100)}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-geo-orange"
                  title="Ambang Gerak"
                />
              </div>
            </div>

            <div className="bg-[#050B10] p-3 border border-geo-border flex flex-col justify-between">
              <div>
                <span className="text-[8px] text-[#64748B] font-mono uppercase block tracking-wider">SENSING FILTER LINK</span>
                <div className={`text-xs font-bold font-mono mt-1 ${isFilterActive ? 'text-geo-cyan' : 'text-[#64748B]'}`}>
                  {isFilterActive ? 'AKTIF (MENYARING)' : 'DISABLE (SEMUA IKAN LIHAT)'}
                </div>
              </div>
              <p className="text-[7.5px] font-mono text-[#5F6B7E] leading-relaxed mt-1">
                Apabila aktif, ikan hanya tampil di layar sonar saat terdeteksi gerakan air kolam.
              </p>
            </div>
          </div>

          {/* Interactive Parameters Adjusters */}
          <div className="bg-[#050B10] p-4 border border-geo-border flex flex-col gap-3">
            
            {/* Slider 1: Detection threshold filter */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-[#64748B] uppercase font-bold text-[8.5px]">AMBANG SINYAL GERAKAN (THRESHOLD):</span>
                <span className="text-geo-orange font-bold font-mono">{motionThreshold.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="5.0"
                step="0.1"
                value={motionThreshold}
                onChange={(e) => setMotionThreshold(parseFloat(e.target.value))}
                className="w-full accent-geo-orange cursor-pointer"
              />
            </div>

            {/* Slider 2: CV Pixel sensitivity */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-[#64748B] uppercase font-bold text-[8.5px]">SENSITIVITAS PIXEL CV:</span>
                <span className="text-geo-cyan font-bold font-mono">{sensitivity}</span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseInt(e.target.value))}
                className="w-full accent-geo-cyan cursor-pointer"
              />
            </div>
          </div>

          {/* Device Activation Switches */}
          <div className="flex flex-wrap items-center gap-2">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="flex-1 min-w-[140px] bg-geo-orange hover:bg-amber-600 text-black font-mono font-bold text-[10px] uppercase py-2 px-4 rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                NYALAKAN KAMERA FISIK TELEPON
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex-1 min-w-[140px] bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-mono font-bold text-[10px] uppercase py-2 px-4 rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CameraOff className="w-3.5 h-3.5" />
                MATIKAN KAMERA FISIK
              </button>
            )}

            {!isSimulatingModel ? (
              <button
                onClick={() => {
                  stopCamera();
                  setIsSimulatingModel(true);
                }}
                className="flex-1 min-w-[140px] bg-[#0c151d] hover:bg-slate-900 border border-slate-700 text-slate-300 font-mono font-bold text-[10px] uppercase py-2 px-4 rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                MULAI KAMERA SIMULASI
              </button>
            ) : (
              <div className="flex-1 min-w-[140px] flex items-center gap-2 border border-dashed border-indigo-500/20 px-2 py-1 bg-indigo-950/10">
                <div className="flex flex-col gap-0.5 w-full">
                  <span className="text-[7px] text-indigo-400 font-mono tracking-widest uppercase text-center block">KECEPATAN GELOMBANG AIR</span>
                  <div className="flex items-center gap-1.5 justify-center">
                    <button
                      onClick={() => setSimFreq(prev => Math.max(0.4, prev - 0.4))}
                      className="text-[10px] px-1 font-mono hover:text-white"
                    >
                      -
                    </button>
                    <span className="text-[9px] font-mono font-bold text-white uppercase">{simFreq.toFixed(1)}Hz</span>
                    <button
                      onClick={() => setSimFreq(prev => Math.min(3.0, prev + 0.4))}
                      className="text-[10px] px-1 font-mono hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

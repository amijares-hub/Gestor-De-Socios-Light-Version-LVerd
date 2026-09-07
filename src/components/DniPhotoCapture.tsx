import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, Upload, CheckCircle2, Trash2, IdCard, SwitchCamera, RefreshCw } from 'lucide-react';

interface DniPhotoCaptureProps {
  frontImage: string | null;
  backImage: string | null;
  onChangeFront: (base64: string | null) => void;
  onChangeBack: (base64: string | null) => void;
}

export default function DniPhotoCapture({
  frontImage,
  backImage,
  onChangeFront,
  onChangeBack
}: DniPhotoCaptureProps) {
  const [activeTarget, setActiveTarget] = useState<'front' | 'back'>('front');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) { /* ignore */ }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStarting(false);
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.muted = true;
      videoRef.current.play().catch(err => console.error("Error reproduciendo vídeo WebRTC:", err));
    }
  }, [isCameraActive]);

  const startCamera = async (preferredFacing: 'user' | 'environment' = facingMode) => {
    stopStream();
    setIsStarting(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Tu navegador o entorno local no admite acceso WebRTC a la cámara.");
      setIsStarting(false);
      return;
    }

    const constraintOptions: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: preferredFacing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: preferredFacing }, audio: false },
      { video: true, audio: false }
    ];

    let acquiredStream: MediaStream | null = null;

    for (const constraints of constraintOptions) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (acquiredStream) break;
      } catch (e) {
        // probar siguiente restricción
      }
    }

    if (!acquiredStream) {
      alert("No se pudo iniciar la cámara. Revisa los permisos del navegador o selecciona un archivo.");
      setIsStarting(false);
      return;
    }

    streamRef.current = acquiredStream;
    setFacingMode(preferredFacing);
    setIsStarting(false);
    setIsCameraActive(true);
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.65);

    if (activeTarget === 'front') {
      onChangeFront(base64);
      setActiveTarget('back');
    } else {
      onChangeBack(base64);
      stopStream();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'front' | 'back') => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 800, 500);
          const compressed = canvas.toDataURL('image/jpeg', 0.65);
          if (target === 'front') onChangeFront(compressed);
          else onChangeBack(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between border-b border-border-dark pb-3">
        <div className="flex items-center gap-2">
          <IdCard className="text-brand-red" size={18} />
          <h4 className="text-xs font-display font-bold text-white uppercase tracking-wider">
            Fotografías del Documento (DNI/Pasaporte)
          </h4>
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          Requerido para exportación PDF
        </span>
      </div>

      {isCameraActive ? (
        <div className="relative aspect-[16/10] bg-black rounded-xl overflow-hidden border border-brand-red/60 shadow-inner">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          <div className="absolute top-2 left-2 bg-black/80 px-3 py-1.5 rounded-lg text-[10px] font-mono text-white font-bold uppercase border border-border-dark flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
            Capturando: {activeTarget === 'front' ? 'PARTE DELANTERA (ANVERSO)' : 'PARTE TRASERA (REVERSO)'}
          </div>

          <button
            type="button"
            onClick={toggleCameraFacing}
            className="absolute top-2 right-2 p-2 bg-black/80 hover:bg-gray-800 text-gray-200 rounded-lg border border-border-dark text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all"
            title="Cambiar Cámara"
          >
            <SwitchCamera size={14} />
            <span className="hidden sm:inline">Cambiar Cámara</span>
          </button>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4 z-10">
            <button
              type="button"
              onClick={takePhoto}
              className="px-5 py-2.5 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-xl border border-brand-red/40"
            >
              <Camera size={16} /> Tomar Foto {activeTarget === 'front' ? 'Delantera' : 'Trasera'}
            </button>
            <button
              type="button"
              onClick={stopStream}
              className="p-2.5 bg-gray-900/90 hover:bg-gray-800 text-gray-300 rounded-xl border border-border-dark hover:text-white"
              title="Cerrar Cámara"
            >
              <CameraOff size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isStarting}
          onClick={() => startCamera('environment')}
          className="w-full py-3.5 bg-brand-dark hover:bg-border-dark border border-border-dark hover:border-brand-red text-gray-200 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-md"
        >
          {isStarting ? (
            <>
              <RefreshCw size={16} className="animate-spin text-brand-red" />
              <span>Iniciando Cámara...</span>
            </>
          ) : (
            <>
              <Camera size={16} className="text-brand-red" />
              <span>Activar Cámara para tomar fotos DNI</span>
            </>
          )}
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* PARTE DELANTERA */}
        <div className="bg-brand-dark p-3 rounded-xl border border-border-dark space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-gray-400 uppercase">
            <span>Parte Delantera (Anverso)</span>
            {frontImage && <CheckCircle2 size={13} className="text-emerald-400" />}
          </div>

          {frontImage ? (
            <div className="space-y-2">
              <div className="relative aspect-[1.58/1] rounded-lg overflow-hidden border border-border-dark">
                <img src={frontImage} alt="DNI Delantera" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setActiveTarget('front'); startCamera(); }}
                  className="flex-1 py-1 px-2 bg-panel-dark border border-border-dark hover:border-gray-600 rounded-lg text-[10px] font-bold text-gray-300 flex items-center justify-center gap-1"
                >
                  <Camera size={11} /> Repetir
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFront(null)}
                  className="py-1 px-2.5 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold flex items-center gap-1"
                  title="Borrar Foto Delantera"
                >
                  <Trash2 size={11} /> Borrar
                </button>
              </div>
            </div>
          ) : (
            <label className="aspect-[1.58/1] border-2 border-dashed border-border-dark hover:border-brand-red/50 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer bg-panel-dark/40 hover:bg-panel-dark transition-all">
              <Upload size={16} className="text-gray-500" />
              <span className="text-[9px] font-mono text-gray-400 uppercase">Subir Imagen</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'front')}
              />
            </label>
          )}
        </div>

        {/* PARTE TRASERA */}
        <div className="bg-brand-dark p-3 rounded-xl border border-border-dark space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-gray-400 uppercase">
            <span>Parte Trasera (Reverso)</span>
            {backImage && <CheckCircle2 size={13} className="text-emerald-400" />}
          </div>

          {backImage ? (
            <div className="space-y-2">
              <div className="relative aspect-[1.58/1] rounded-lg overflow-hidden border border-border-dark">
                <img src={backImage} alt="DNI Trasera" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setActiveTarget('back'); startCamera(); }}
                  className="flex-1 py-1 px-2 bg-panel-dark border border-border-dark hover:border-gray-600 rounded-lg text-[10px] font-bold text-gray-300 flex items-center justify-center gap-1"
                >
                  <Camera size={11} /> Repetir
                </button>
                <button
                  type="button"
                  onClick={() => onChangeBack(null)}
                  className="py-1 px-2.5 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold flex items-center gap-1"
                  title="Borrar Foto Trasera"
                >
                  <Trash2 size={11} /> Borrar
                </button>
              </div>
            </div>
          ) : (
            <label className="aspect-[1.58/1] border-2 border-dashed border-border-dark hover:border-brand-red/50 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer bg-panel-dark/40 hover:bg-panel-dark transition-all">
              <Upload size={16} className="text-gray-500" />
              <span className="text-[9px] font-mono text-gray-400 uppercase">Subir Imagen</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'back')}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
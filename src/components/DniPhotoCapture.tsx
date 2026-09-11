import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, Upload, CheckCircle2, Trash2, User, SwitchCamera, RefreshCw } from 'lucide-react';

interface DniPhotoCaptureProps {
  frontImage: string | null;
  backImage?: string | null;
  onChangeFront: (base64: string | null) => void;
  onChangeBack?: (base64: string | null) => void;
}

export default function DniPhotoCapture({
  frontImage,
  onChangeFront
}: DniPhotoCaptureProps) {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

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
      videoRef.current.play().catch(err => console.error("Error reproduciendo vídeo:", err));
    }
  }, [isCameraActive]);

  const startCamera = async (preferredFacing: 'user' | 'environment' = facingMode) => {
    stopStream();
    setIsStarting(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Tu dispositivo o navegador no admite acceso WebRTC a la cámara.");
      setIsStarting(false);
      return;
    }

    const constraintOptions: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: preferredFacing }, width: { ideal: 720 }, height: { ideal: 720 }, aspectRatio: { ideal: 1 } }, audio: false },
      { video: { facingMode: preferredFacing }, audio: false },
      { video: true, audio: false }
    ];

    let acquiredStream: MediaStream | null = null;

    for (const constraints of constraintOptions) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (acquiredStream) break;
      } catch (e) {
        // Probando alternativa de restricción
      }
    }

    if (!acquiredStream) {
      alert("No se pudo iniciar la cámara. Revisa los permisos del navegador.");
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

    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - minDim) / 2;
    const sy = (video.videoHeight - minDim) / 2;

    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    onChangeFront(base64);
    stopStream();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 600, 600);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          onChangeFront(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-panel-dark border border-border-dark rounded-2xl p-3 sm:p-4 space-y-3">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between border-b border-border-dark pb-2">
        <div className="flex items-center gap-2">
          <User className="text-brand-red shrink-0" size={16} />
          <h4 className="text-[11px] sm:text-xs font-display font-bold text-white uppercase tracking-wider">
            Fotografía Oficial del Socio / Rostro
          </h4>
        </div>
        {frontImage && <CheckCircle2 size={14} className="text-emerald-400" />}
      </div>

      {isCameraActive ? (
        <div className="relative aspect-square max-w-xs mx-auto bg-black rounded-2xl overflow-hidden border-2 border-brand-red/60 shadow-xl">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            autoPlay
            playsInline
            muted
          />

          <button
            type="button"
            onClick={toggleCameraFacing}
            className="absolute top-2 right-2 p-2 bg-black/80 text-white rounded-xl border border-border-dark"
            title="Cambiar Cámara"
          >
            <SwitchCamera size={16} />
          </button>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-3 z-10">
            <button
              type="button"
              onClick={takePhoto}
              className="px-4 py-2 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg"
            >
              <Camera size={16} /> Capturar Foto
            </button>
            <button
              type="button"
              onClick={stopStream}
              className="p-2 bg-gray-900/90 text-gray-300 rounded-xl border border-border-dark"
            >
              <CameraOff size={16} />
            </button>
          </div>
        </div>
      ) : frontImage ? (
        <div className="space-y-3 text-center">
          <div className="w-32 h-32 sm:w-36 sm:h-36 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-lg relative">
            <img src={frontImage} alt="Rostro del Socio" className="w-full h-full object-cover" />
          </div>
          <div className="flex justify-center gap-2 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => startCamera('user')}
              className="flex-1 py-1.5 bg-panel-dark border border-border-dark hover:border-gray-600 rounded-xl text-xs font-bold text-gray-200 flex items-center justify-center gap-1.5"
            >
              <Camera size={13} /> Repetir
            </button>
            <button
              type="button"
              onClick={() => onChangeFront(null)}
              className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Trash2 size={13} /> Borrar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            disabled={isStarting}
            onClick={() => startCamera('user')}
            className="w-full py-3 bg-brand-dark hover:bg-border-dark border border-border-dark hover:border-brand-red text-gray-200 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
          >
            {isStarting ? (
              <>
                <RefreshCw size={15} className="animate-spin text-brand-red" />
                <span>Iniciando Cámara...</span>
              </>
            ) : (
              <>
                <Camera size={15} className="text-brand-red" />
                <span>Tomar Foto del Socio con Cámara</span>
              </>
            )}
          </button>

          <label className="w-full py-2 bg-panel-dark/60 hover:bg-panel-dark border border-dashed border-border-dark rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all">
            <Upload size={14} className="text-gray-400" />
            <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">Subir Imagen desde Galería</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      )}
    </div>
  );
}
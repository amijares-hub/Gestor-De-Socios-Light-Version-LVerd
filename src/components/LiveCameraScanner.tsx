import React, { useState, useRef, useEffect, useCallback } from 'react';
import { scanDocumentWithGemini } from '../services/ocrService';
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Scan, 
  SwitchCamera, 
  ShieldCheck,
  Sparkles,
  Upload
} from 'lucide-react';

export interface ExtractedDocumentData {
  documentType: 'DNI' | 'PASSPORT';
  dniPassport: string;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate: string;
  expiryDate: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface LiveCameraScannerProps {
  onCaptureData: (data: ExtractedDocumentData) => void;
  workerSession?: any;
  onClose?: () => void;
  mode?: 'embedded' | 'modal';
}

export default function LiveCameraScanner({
  onCaptureData,
  workerSession,
  onClose,
  mode = 'embedded'
}: LiveCameraScannerProps) {
  // Permission & Stream States
  const [permissionState, setPermissionState] = useState<'prompt' | 'requesting' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  
  // Torch/Flash capability
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Scanning & Processing
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisDuration, setAnalysisDuration] = useState<number | null>(null);
  const [successResult, setSuccessResult] = useState<ExtractedDocumentData | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop active stream tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Enumerate video devices
  const refreshDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
    } catch (e) {
      console.warn("Could not enumerate camera devices:", e);
    }
  };

  // Start Camera with explicit user request
  const startCamera = async (deviceId?: string, preferredFacing: 'environment' | 'user' = facingMode) => {
    stopStream();
    setPermissionState('requesting');
    setErrorMessage(null);
    setSuccessResult(null);

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('unsupported');
      setErrorMessage("Tu navegador o entorno no soporta acceso directo a cámara WebRTC.");
      return;
    }

    try {
      // Build constraints
      let constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: preferredFacing },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
        audio: false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        console.warn("Retrying with relaxed video constraints:", firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      setPermissionState('granted');
      await refreshDevices();

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as any) : null;
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }

    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage("Permiso denegado por el usuario o bloqueado en el navegador.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionState('unsupported');
        setErrorMessage("No se ha encontrado ninguna cámara disponible conectada a este dispositivo.");
      } else {
        setPermissionState('denied');
        setErrorMessage(err.message || "Error al conectar con la cámara.");
      }
    }
  };

  // Toggle Torch/Flash
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const newStatus = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newStatus }]
      });
      setTorchOn(newStatus);
    } catch (e) {
      console.warn("Torch failed to toggle:", e);
    }
  };

  // Switch front/rear camera
  const switchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(undefined, nextFacing);
  };

  // Switch specific device
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedDeviceId(deviceId);
    startCamera(deviceId);
  };

  // Ultra-Fast Capture & OCR Analysis
  const captureAndAnalyze = async () => {
    if (!videoRef.current || isAnalyzing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const base64 = canvas.toDataURL('image/jpeg', 0.88);

    setIsAnalyzing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const data = await scanDocumentWithGemini(base64);

      const elapsedMs = Math.round(performance.now() - startTime);
      setAnalysisDuration(elapsedMs);
      setSuccessResult(data);

      onCaptureData(data);

    } catch (err: any) {
      console.error("Error en escáner OCR:", err);
      setErrorMessage(err.message || "Error al analizar el documento con el escáner.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`relative bg-panel-dark border border-border-dark rounded-2xl overflow-hidden flex flex-col ${mode === 'modal' ? 'w-full max-w-2xl mx-auto shadow-2xl z-50' : 'w-full h-full'}`}>
      
      <canvas ref={canvasRef} className="hidden" />

      {/* Header bar */}
      <div className="px-4 py-3 bg-brand-dark/90 border-b border-border-dark flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red">
            <Scan size={15} />
          </div>
          <div>
            <h4 className="text-xs font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Escáner Óptico de Cámara
              {permissionState === 'granted' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </h4>
            <p className="text-[10px] text-gray-400 font-mono">
              Captura y análisis en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {permissionState === 'granted' && (
            <>
              {availableDevices.length > 1 && (
                <button
                  type="button"
                  onClick={switchCamera}
                  title="Alternar Cámara Trasera / Frontal"
                  className="p-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-border-dark transition-all text-[11px] flex items-center gap-1"
                >
                  <SwitchCamera size={14} />
                  <span className="hidden sm:inline font-mono text-[10px]">Cambiar</span>
                </button>
              )}

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  title="Encender Linterna"
                  className={`p-1.5 rounded-lg border text-[11px] transition-all flex items-center gap-1 ${
                    torchOn 
                      ? 'bg-amber-500 text-black border-amber-400 font-bold' 
                      : 'bg-gray-800/80 text-gray-300 border-border-dark hover:text-white'
                  }`}
                >
                  <Zap size={14} className={torchOn ? 'fill-black' : ''} />
                  <span className="hidden sm:inline font-mono text-[10px]">Flash</span>
                </button>
              )}
            </>
          )}

          {onClose && (
            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 min-h-[260px] md:min-h-[340px] bg-black flex items-center justify-center overflow-hidden">
        
        {permissionState === 'prompt' && (
          <div className="p-6 text-center max-w-md mx-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red mb-4 shadow-lg shadow-brand-red/10">
              <Camera size={32} />
            </div>
            <h5 className="text-base font-display font-bold text-white uppercase tracking-wider mb-2">
              Solicitud de Acceso a la Cámara
            </h5>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              Para escanear <span className="text-white font-bold">DNI, NIE o Pasaporte</span> a máxima velocidad, la aplicación se conectará a la cámara de este dispositivo.
            </p>
            <div className="p-3 bg-brand-dark/90 border border-border-dark rounded-xl text-[11px] text-gray-400 text-left mb-5 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <p>
                Tus imágenes se procesan exclusivamente para la verificación documental.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startCamera()}
              className="w-full py-3 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-lg shadow-brand-red/20 flex items-center justify-center gap-2"
            >
              <Camera size={16} />
              Permitir y Activar Cámara
            </button>
          </div>
        )}

        {permissionState === 'requesting' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <RefreshCw size={36} className="text-brand-red animate-spin" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">
              Esperando confirmación de permiso...
            </p>
          </div>
        )}

        {permissionState === 'denied' && (
          <div className="p-6 text-center max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
              <CameraOff size={28} />
            </div>
            <h5 className="text-sm font-display font-bold text-white uppercase tracking-wider mb-1">
              Acceso a Cámara Denegado
            </h5>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              {errorMessage || "No se ha concedido permiso para utilizar la cámara."}
            </p>
            <button
              type="button"
              onClick={() => startCamera()}
              className="py-2.5 px-4 bg-brand-red text-white rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} /> Reintentar Conexión
            </button>
          </div>
        )}

        {permissionState === 'unsupported' && (
          <div className="p-6 text-center max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <AlertCircle size={28} />
            </div>
            <h5 className="text-sm font-display font-bold text-white uppercase tracking-wider mb-1">
              Cámara No Detectada
            </h5>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => startCamera()}
              className="py-2.5 px-4 bg-gray-800 text-gray-200 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} /> Volver a comprobar
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${permissionState === 'granted' ? 'block' : 'hidden'}`}
          autoPlay
          playsInline
          muted
        />

        {permissionState === 'granted' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
            <div className="relative w-full max-w-[420px] aspect-[1.58/1] rounded-2xl border-2 border-brand-red/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-red rounded-tl-lg"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-red rounded-tr-lg"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-red rounded-bl-lg"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-red rounded-br-lg"></div>

              <div className="absolute left-0 right-0 h-0.5 bg-brand-red shadow-[0_0_12px_#ff2a44] animate-[bounce_2s_infinite]"></div>

              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span className="bg-black/70 backdrop-blur-sm border border-border-dark px-3 py-1 rounded-full text-[10px] font-mono font-bold text-gray-200 tracking-wider uppercase">
                  Enfoca el DNI o Pasaporte aquí
                </span>
              </div>
            </div>

            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 pointer-events-auto">
                <div className="w-14 h-14 rounded-full border-4 border-brand-red/30 border-t-brand-red animate-spin flex items-center justify-center">
                  <Sparkles size={20} className="text-brand-red animate-pulse" />
                </div>
                <p className="text-sm font-mono font-black text-white uppercase tracking-widest animate-pulse">
                  ANALIZANDO DOCUMENTO...
                </p>
                <p className="text-[11px] text-gray-400 font-mono">
                  Extrayendo caracteres DNI/Pasaporte
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {permissionState === 'granted' && (
        <div className="p-4 bg-brand-dark/95 border-t border-border-dark flex flex-col sm:flex-row items-center justify-between gap-3">
          {availableDevices.length > 1 ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider shrink-0">Cámara:</span>
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-panel-dark border border-border-dark rounded-xl px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-brand-red w-full sm:w-44"
              >
                {availableDevices.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Cámara ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <CheckCircle2 size={13} />
              <span>Cámara HD Conectada</span>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={captureAndAnalyze}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-brand-red hover:bg-brand-red-hover disabled:bg-gray-800 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-lg shadow-brand-red/20 flex items-center justify-center gap-2 active:scale-95"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Camera size={15} />
                  <span>Capturar y Analizar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={stopStream}
              title="Apagar Cámara"
              className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl border border-border-dark transition-colors"
            >
              <CameraOff size={16} />
            </button>
          </div>
        </div>
      )}

      {successResult && (
        <div className="p-3 bg-emerald-500/10 border-t border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>
              <strong>¡Documento escaneado!</strong> {successResult.documentType} {successResult.dniPassport} — {successResult.firstName} {successResult.lastName}
            </span>
          </div>
          {analysisDuration !== null && (
            <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
              ⚡ {analysisDuration}ms
            </span>
          )}
        </div>
      )}

      {errorMessage && permissionState === 'granted' && (
        <div className="p-3 bg-rose-500/10 border-t border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

    </div>
  );
}
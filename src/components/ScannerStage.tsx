import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Cpu, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  FileSpreadsheet,
  Camera,
  Layers
} from 'lucide-react';
import LiveCameraScanner from './LiveCameraScanner';
import { scanDocumentWithGemini } from '../services/ocrService';

interface ScannerResult {
  documentType: 'DNI' | 'PASSPORT';
  dniPassport: string;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate: string;
  expiryDate: string;
  email: string;
  phone: string;
  address: string;
}

interface ScannerStageProps {
  onScanCompleted: (result: ScannerResult) => void;
  workerSession: any;
}

export default function ScannerStage({ onScanCompleted, workerSession }: ScannerStageProps) {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'presets'>('camera');
  const [scanning, setScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [scanStatusLogs, setScanStatusLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<'none' | 'dni_espanol' | 'passport_europe'>('none');
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escaneo directo usando el servicio Gemini del cliente
  const triggerScanFlowWithImage = async (base64: string) => {
    setScanning(true);
    setProgress(30);
    setError(null);
    setScanStatusLogs([
      "🔋 Inicializando lector óptico...",
      "⚡ Ejecutando análisis directo con Gemini AI..."
    ]);

    try {
      const parsedData = await scanDocumentWithGemini(base64);
      
      setProgress(100);
      setScanStatusLogs(prev => [
        ...prev,
        `✅ Documento detectado: ${parsedData.documentType} ${parsedData.dniPassport}`
      ]);

      const result: ScannerResult = {
        ...parsedData,
        email: parsedData.email || `${parsedData.firstName.toLowerCase()}.${parsedData.lastName.split(' ')[0].toLowerCase()}@lagunaverde.es`,
        phone: parsedData.phone || '+34 600 000 000',
        address: parsedData.address || 'Residencia Oficial'
      };

      onScanCompleted(result);

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al procesar la imagen del documento.");
    } finally {
      setScanning(false);
      setProgress(0);
    }
  };

  // Muestras predeterminadas de prueba
  const handlePresetScan = async (preset: 'dni_espanol' | 'passport_europe') => {
    if (scanning) return;
    setActivePreset(preset);
    setFileName(preset === 'dni_espanol' ? "DNI_ES_Carlos_Sanchez.jpg" : "PASSPORT_EU_Marie_Dubois.jpg");
    
    // Carga rápida simulada
    setScanning(true);
    setTimeout(() => {
      if (preset === 'dni_espanol') {
        onScanCompleted({
          documentType: 'DNI',
          dniPassport: '45892134K',
          firstName: 'CARLOS',
          lastName: 'SANCHEZ GOMEZ',
          nationality: 'ESPAÑOLA',
          birthDate: '1990-08-15',
          expiryDate: '2030-11-24',
          email: 'carlos.sanchez@email.com',
          phone: '+34 612 345 678',
          address: 'Calle de Alcalá 45, Madrid'
        });
      } else {
        onScanCompleted({
          documentType: 'PASSPORT',
          dniPassport: 'EM9876543',
          firstName: 'MARIE',
          lastName: 'DUBOIS',
          nationality: 'FRANCE',
          birthDate: '1995-04-12',
          expiryDate: '2032-09-30',
          email: 'marie.dubois@email.com',
          phone: '+33 6 1234 5678',
          address: 'Rue de Rivoli 75, París'
        });
      }
      setScanning(false);
    }, 400);
  };

  const processFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Por favor, sube únicamente archivos de imagen (PNG, JPG, JPEG)");
      return;
    }

    setFileName(file.name);
    setActivePreset('none');

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      triggerScanFlowWithImage(base64);
    };
    reader.onerror = () => {
      setError("Error al cargar el archivo de imagen.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="ai-scanner-panel" className="bg-panel-dark border border-border-dark rounded-3xl p-6 relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-2xl rounded-full pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red shrink-0">
            <Cpu size={20} className={scanning ? 'animate-spin' : ''} />
          </div>
          <div>
            <h4 className="text-sm font-display font-bold text-gray-200 uppercase tracking-wider">
              Lector de Identidad OCR — Laguna Verde
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Escaneo de DNI, NIE y Pasaportes con cámara HD o archivo
            </p>
          </div>
        </div>

        <div className="flex items-center bg-brand-dark p-1 rounded-xl border border-border-dark text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMode('camera')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeMode === 'camera' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera size={13} className={activeMode === 'camera' ? 'text-brand-red' : ''} />
            Cámara en Vivo
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeMode === 'upload' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload size={13} className={activeMode === 'upload' ? 'text-brand-red' : ''} />
            Subir Archivo
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('presets')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeMode === 'presets' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers size={13} className={activeMode === 'presets' ? 'text-brand-red' : ''} />
            Muestras Demo
          </button>
        </div>
      </div>

      {activeMode === 'camera' && (
        <div className="flex-1 min-h-[360px]">
          <LiveCameraScanner
            workerSession={workerSession}
            onCaptureData={(extracted) => {
              onScanCompleted({
                ...extracted,
                email: extracted.email || `${extracted.firstName.toLowerCase()}.${extracted.lastName.split(' ')[0].toLowerCase()}@lagunaverde.es`,
                phone: extracted.phone || '+34 600 000 000',
                address: extracted.address || 'Residencia Oficial'
              });
            }}
          />
        </div>
      )}

      {activeMode === 'upload' && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={scanning ? undefined : () => fileInputRef.current?.click()}
          className={`flex-1 min-h-[260px] rounded-2xl border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center relative overflow-hidden ${
            dragActive ? 'border-brand-red bg-brand-red/5' : 
            scanning ? 'border-amber-500/30 bg-amber-500/5 cursor-wait' : 'border-border-dark hover:border-gray-700 bg-brand-dark/40 hover:bg-brand-dark/80'
          }`}
        >
          <input 
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={scanning}
          />

          {scanning ? (
            <div className="flex flex-col items-center z-20 w-full">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center mb-4">
                <span className="text-xs font-mono font-bold text-amber-400">{progress}%</span>
              </div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-widest animate-pulse">
                ANALIZANDO DOCUMENTO...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center z-20">
              <div className="w-16 h-16 rounded-full bg-gray-900 border border-border-dark flex items-center justify-center text-gray-400 mb-4 hover:border-brand-red hover:text-brand-red transition-all shadow-md">
                <Upload size={24} />
              </div>
              
              {fileName ? (
                <div className="mb-2">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-center">
                    <CheckCircle size={14} /> Documento cargado
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-mono truncate max-w-xs">{fileName}</p>
                </div>
              ) : (
                <p className="text-xs font-semibold text-gray-200">
                  Arrastra una imagen de DNI/Pasaporte o haz clic para examinar
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {activeMode === 'presets' && (
        <div className="flex-1 flex flex-col justify-center p-4">
          <div className="max-w-md mx-auto w-full space-y-4">
            <button 
              type="button"
              disabled={scanning}
              onClick={() => handlePresetScan('dni_espanol')}
              className="w-full p-4 border rounded-2xl flex items-center justify-between border-border-dark bg-brand-dark/40 text-gray-300 hover:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={18} className="text-brand-red" />
                <div className="text-left">
                  <h5 className="text-sm font-bold text-white">DNI Español (Carlos Sánchez)</h5>
                </div>
              </div>
            </button>

            <button 
              type="button"
              disabled={scanning}
              onClick={() => handlePresetScan('passport_europe')}
              className="w-full p-4 border rounded-2xl flex items-center justify-between border-border-dark bg-brand-dark/40 text-gray-300 hover:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-amber-400" />
                <div className="text-left">
                  <h5 className="text-sm font-bold text-white">Pasaporte Europeo (Marie Dubois)</h5>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
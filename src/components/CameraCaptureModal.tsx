import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Upload, AlertCircle, Zap, ZapOff, SwitchCamera } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  title?: string;
  defaultFacingMode?: 'user' | 'environment';
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capturar Foto',
  defaultFacingMode = 'environment', // Câmera traseira por padrão
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraLabel, setCameraLabel] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Detect available video devices
  useEffect(() => {
    if (isOpen && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        if (videoInputs.length > 1) {
          setHasMultipleCameras(true);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  // When modal opens, initialize with rear camera (environment)
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCameraError(null);
      setIsTorchOn(false);
      setFacingMode(defaultFacingMode);
      startCamera(defaultFacingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, defaultFacingMode]);

  const startCamera = async (targetFacingMode: 'user' | 'environment') => {
    setCameraError(null);
    setIsLoadingCamera(true);

    // Stop existing stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Acesso à câmera não é suportado pelo seu navegador neste dispositivo.');
      }

      let mediaStream: MediaStream | null = null;

      // 1. Try high quality with ideal target facingMode (environment for rear camera)
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('Attempt 1 (high quality) failed, trying fallback constraints:', err1);
        try {
          // 2. Fallback to simpler constraints with facingMode
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacingMode },
            },
            audio: false,
          });
        } catch (err2) {
          console.warn('Attempt 2 (facingMode ideal) failed, trying basic video:', err2);
          // 3. Fallback to any video device
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!mediaStream) {
        throw new Error('Não foi possível obter o fluxo de vídeo da câmera.');
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Inspect active track
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings ? videoTrack.getSettings() : {};
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;

        if (settings.facingMode) {
          setFacingMode(settings.facingMode as 'user' | 'environment');
        }

        if (capabilities.torch) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }

        setCameraLabel(videoTrack.label || (targetFacingMode === 'environment' ? 'Câmera Traseira' : 'Câmera Frontal'));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      let errorMsg = 'Não foi possível acessar a câmera.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Permissão de câmera bloqueada pelo navegador.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'Nenhuma câmera foi encontrada conectada ao dispositivo.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = 'A câmera já está sendo usada por outro aplicativo ou programa.';
        } else {
          errorMsg = err.message;
        }
      }
      setCameraError(errorMsg);
    } finally {
      setIsLoadingCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsTorchOn(false);
    setTorchSupported(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const toggleTorch = async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const nextState = !isTorchOn;
        await (videoTrack.applyConstraints as any)({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Error toggling flashlight:', err);
      }
    }
  };

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setCapturedImage(event.target.result);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block w-2 h-2 rounded-full ${facingMode === 'environment' ? 'bg-emerald-400' : 'bg-sky-400'} animate-pulse`} />
                <span className="text-[11px] text-slate-400">
                  {facingMode === 'environment' ? 'Câmera Traseira (Ativa)' : 'Câmera Frontal (Ativa)'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Flash/Torch Button (if supported) */}
            {torchSupported && !capturedImage && !cameraError && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isTorchOn
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
                title={isTorchOn ? 'Desligar Lanterna' : 'Ligar Lanterna'}
              >
                {isTorchOn ? <Zap className="w-4 h-4 fill-amber-300" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Invert camera button */}
            {!capturedImage && !cameraError && (
              <button
                type="button"
                onClick={toggleFacingMode}
                disabled={isLoadingCamera}
                className="text-[11px] font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                title={facingMode === 'environment' ? 'Alternar para Câmera Frontal' : 'Alternar para Câmera Traseira'}
              >
                <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                <span>{facingMode === 'environment' ? 'Câm. Frontal' : 'Câm. Traseira'}</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="p-4 flex flex-col items-center justify-center bg-slate-950 min-h-[320px]">
          {capturedImage ? (
            <div className="relative w-full max-h-80 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full h-auto max-h-80 object-contain"
              />
              <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-2 py-1 rounded text-[10px] text-emerald-300 font-medium flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                Foto Capturada
              </div>
            </div>
          ) : cameraError ? (
            <div className="text-center p-5 space-y-3 max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-rose-300">{cameraError}</p>
                <div className="text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-left space-y-1">
                  <strong className="text-amber-300 block">Como liberar o acesso à câmera:</strong>
                  <p>1. Clique no ícone de <strong>cadeado ou câmera</strong> na barra de endereços do navegador (ao lado de https://);</p>
                  <p>2. Altere a opção <strong>"Câmera"</strong> para <strong>"Permitir"</strong>;</p>
                  <p>3. Clique no botão "Tentar Novamente" abaixo.</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Carregar Arquivo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-72 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 shadow-inner">
              {isLoadingCamera && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-10 gap-2">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span className="text-xs text-slate-300">Iniciando câmera traseira...</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Package / Document Alignment Guide Overlay */}
              <div className="absolute inset-4 pointer-events-none border-2 border-dashed border-emerald-500/40 rounded-xl flex items-center justify-center">
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                <span className="text-[10px] text-emerald-300/80 bg-slate-950/60 px-2 py-0.5 rounded backdrop-blur-sm border border-emerald-500/20">
                  Enquadre a encomenda ou etiqueta aqui
                </span>
              </div>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <span>Tirar Outra</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Foto</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Carregar arquivo</span>
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  disabled={isLoadingCamera}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors shadow-lg shadow-emerald-900/40 cursor-pointer active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Fotografar</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

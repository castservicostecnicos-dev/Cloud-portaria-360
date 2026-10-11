import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Grid,
  Maximize2,
  Camera,
  RefreshCw,
  ExternalLink,
  Plus,
  Play,
  Pause,
  AlertCircle,
  Sliders,
  Check,
  Disc,
  HelpCircle,
  Server,
  Network,
  Shield,
  Trash2,
  Edit3,
  Copy,
  CheckCircle2,
  ArrowRight,
  Info,
  Tv,
  Wifi,
  Lock,
  Eye,
  EyeOff,
  Activity,
  Sparkles,
} from 'lucide-react';
import { storage } from '../services/storage';
import { CCTVCamera, CCTVZone } from '../types';
import { ASSET_IMAGES, getZoneDefaultImage } from '../assets/images';

interface CCTVViewProps {
  onAttachSnapshotToOccurrence?: (snapshotUrl: string, cameraName: string) => void;
}

interface CameraFeedRendererProps {
  cam: CCTVCamera;
  liveTick: number;
  webcamStream: MediaStream | null;
  onActivateWebcam: () => void;
  resolveUrl: (cam: CCTVCamera, tick: number) => string;
  getDefaultSnapshot: (zone?: string) => string;
  className?: string;
}

const CameraFeedRenderer: React.FC<CameraFeedRendererProps> = ({
  cam,
  liveTick,
  webcamStream,
  onActivateWebcam,
  resolveUrl,
  getDefaultSnapshot,
  className = 'w-full h-full object-cover',
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if ((cam.feedType === 'webcam' || cam.isWebcam) && localVideoRef.current && webcamStream) {
      localVideoRef.current.srcObject = webcamStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [cam, webcamStream]);

  if (cam.feedType === 'webcam' || cam.isWebcam) {
    if (!webcamStream) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4 text-center space-y-2">
          <Camera className="w-8 h-8 text-emerald-400 animate-pulse" />
          <p className="text-xs font-semibold text-white">Webcam Local da Guarita</p>
          <p className="text-[10px] text-slate-400 max-w-[200px]">Câmera conectada a este computador</p>
          <button
            type="button"
            onClick={onActivateWebcam}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow transition-colors cursor-pointer flex items-center gap-1"
          >
            <Play className="w-3 h-3" />
            <span>Ativar Vídeo</span>
          </button>
        </div>
      );
    }
    return (
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={className}
      />
    );
  }

  if (cam.streamUrl) {
    return (
      <video
        src={cam.streamUrl}
        autoPlay
        loop
        muted
        playsInline
        className={className}
      />
    );
  }

  return (
    <img
      src={resolveUrl(cam, liveTick)}
      alt={cam.name}
      className={className}
      referrerPolicy="no-referrer"
      onError={(e) => {
        (e.target as HTMLImageElement).src = getDefaultSnapshot(cam.zone);
      }}
    />
  );
};

export const CCTVView: React.FC<CCTVViewProps> = ({ onAttachSnapshotToOccurrence }) => {
  const [cameras, setCameras] = useState<CCTVCamera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [gridLayout, setGridLayout] = useState<'1x1' | '2x2' | '3x3'>('2x2');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState('');
  const [isRecording, setIsRecording] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CCTVCamera | null>(null);
  const [cameraToDelete, setCameraToDelete] = useState<CCTVCamera | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<{ url: string; cam: CCTVCamera } | null>(null);

  // Local Webcam stream from device
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);

  // Form State for Add / Edit Camera
  const [formMode, setFormMode] = useState<'wizard_intelbras' | 'custom_url' | 'webcam'>('wizard_intelbras');
  const [camName, setCamName] = useState('');
  const [camZone, setCamZone] = useState<CCTVZone>('portao_veicular');
  const [camLocation, setCamLocation] = useState('');
  const [camBrand, setCamBrand] = useState('Intelbras Multi-HD');

  // DVR Wizard specific fields
  const [dvrHost, setDvrHost] = useState(''); // e.g. meucondominio.ddns-intelbras.com.br or 192.168.1.108
  const [dvrHttpPort, setDvrHttpPort] = useState('8080');
  const [dvrRtspPort, setDvrRtspPort] = useState('554');
  const [dvrChannel, setDvrChannel] = useState(1);
  const [dvrUser, setDvrUser] = useState('admin');
  const [dvrPass, setDvrPass] = useState('');
  const [showDvrPassword, setShowDvrPassword] = useState(false);
  const [dvrStreamMode, setDvrStreamMode] = useState<'snapshot_refresh' | 'stream_video' | 'external_web'>('snapshot_refresh');
  const [subStream, setSubStream] = useState(true);

  // Custom Stream fields
  const [customStreamUrl, setCustomStreamUrl] = useState('');
  const [customRtspUrl, setCustomRtspUrl] = useState('');
  const [customExternalUrl, setCustomExternalUrl] = useState('');
  const [previewSampleImage, setPreviewSampleImage] = useState<string>('');

  // Diagnostic Test state (can be run anytime)
  const [diagHost, setDiagHost] = useState('meucondominio.ddns-intelbras.com.br');
  const [diagPort, setDiagPort] = useState('8080');
  const [diagChannel, setDiagChannel] = useState(1);
  const [diagUser, setDiagUser] = useState('admin');
  const [diagPass, setDiagPass] = useState('');
  const [diagBrand, setDiagBrand] = useState('Intelbras Multi-HD');

  // Toast Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Live Auto-Refresh Tick (updates DDNS camera feeds smoothly)
  const [liveTick, setLiveTick] = useState(Date.now());
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message?: string;
    error?: string;
    latencyMs?: number;
    troubleshooting?: string[];
  } | null>(null);

  const getDefaultSnapshot = (zone?: string): string => {
    return getZoneDefaultImage(zone);
  };

  // Resolve camera stream URL through HTTPS proxy to bypass mixed content & CORS
  const resolveCameraStreamUrl = (cam: CCTVCamera, tick: number): string => {
    if (!cam) return ASSET_IMAGES.entranceGate;

    // 1. If camera is a local webcam handled by video element
    if (cam.feedType === 'webcam' || cam.isWebcam) {
      return '';
    }

    // 2. If native video stream (.mp4 or .m3u8), return streamUrl
    if (cam.streamUrl && (cam.streamUrl.endsWith('.m3u8') || cam.streamUrl.endsWith('.mp4'))) {
      return cam.streamUrl;
    }

    // 3. If camera feedType is simulated_live, always return its authentic zone snapshot
    if (cam.feedType === 'simulated_live') {
      return cam.snapshotUrl || getDefaultSnapshot(cam.zone);
    }

    // 4. If camera is bound to a real DVR Host / DDNS (e.g. meucondo.ddns-intelbras.com.br or public IP)
    const host = cam.dvrHost || cam.ipAddress;
    const isPrivateIp = host && /^((192\.168\.)|(10\.)|(172\.(1[6-9]|2[0-9]|3[0-1])\.)|127\.|localhost)/i.test(host);

    // If host is a real public DDNS or external host (and not a private LAN IP)
    if (host && !isPrivateIp && (host.includes('.') || host.includes('ddns') || host.includes('intelbras') || host.includes(':'))) {
      const channel = cam.dvrChannel || 1;
      const port = cam.dvrHttpPort || '8080';
      const user = cam.dvrUser || 'admin';
      const pass = cam.dvrPass ? encodeURIComponent(cam.dvrPass) : '';
      const brand = encodeURIComponent(cam.brand || 'Intelbras');
      return `/api/cctv/snapshot?host=${encodeURIComponent(host)}&channel=${channel}&port=${encodeURIComponent(port)}&user=${encodeURIComponent(user)}&pass=${pass}&brand=${brand}&t=${tick}`;
    }

    // 5. If snapshotUrl is HTTP (would trigger browser mixed-content block on HTTPS)
    if (cam.snapshotUrl?.startsWith('http://') && !cam.snapshotUrl.includes('192.168.') && !cam.snapshotUrl.includes('10.')) {
      return `/api/cctv/snapshot?url=${encodeURIComponent(cam.snapshotUrl)}&t=${tick}`;
    }

    if (cam.snapshotUrl && !cam.snapshotUrl.startsWith('/src/assets/images')) {
      return cam.snapshotUrl;
    }
    return getDefaultSnapshot(cam.zone);
  };

  const handleTestConnection = async (customParams?: {
    host: string;
    port: string;
    channel: number;
    user: string;
    pass: string;
    brand?: string;
  }) => {
    const targetHost = customParams ? customParams.host : dvrHost;
    const targetPort = customParams ? customParams.port : dvrHttpPort;
    const targetChannel = customParams ? customParams.channel : dvrChannel;
    const targetUser = customParams ? customParams.user : dvrUser;
    const targetPass = customParams ? customParams.pass : dvrPass;
    const targetBrand = customParams ? customParams.brand : camBrand;

    if (!targetHost.trim()) {
      triggerFeedback('Informe o endereço DDNS ou IP do DVR para testar.', 'info');
      return;
    }
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/cctv/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: targetHost.trim(),
          port: targetPort.trim() || '8080',
          channel: targetChannel || 1,
          user: targetUser.trim() || 'admin',
          pass: targetPass.trim(),
          brand: targetBrand,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.ok) {
        triggerFeedback('Conexão com o DVR estabelecida com sucesso!');
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        error: 'Erro de comunicação com o servidor de proxy: ' + err.message,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const refreshCameras = () => {
    const list = storage.getCCTVCameras();
    setCameras(list);
    if (!selectedCameraId && list.length > 0) {
      setSelectedCameraId(list[0].id);
    }
  };

  useEffect(() => {
    refreshCameras();
    const unsub = storage.subscribe(refreshCameras);

    const timer = setInterval(() => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setCurrentTime(
        `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      );
    }, 1000);

    // Refresh live camera frames periodically
    const feedTimer = setInterval(() => {
      setLiveTick(Date.now());
    }, 3500);

    return () => {
      unsub();
      clearInterval(timer);
      clearInterval(feedTimer);
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const triggerFeedback = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleStartWebcam = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        triggerFeedback('Navegador não suporta acesso a webcam direta.', 'info');
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setWebcamStream(mediaStream);
      triggerFeedback('Webcam conectada com sucesso ao monitoramento da portaria!');
      return mediaStream;
    } catch (err: any) {
      console.warn('Erro ao ligar webcam:', err);
      triggerFeedback('Permissão de câmera bloqueada pelo navegador. Permita nas configurações de site.', 'info');
      return null;
    }
  };

  const handleAddWebcamChannel = async () => {
    await handleStartWebcam();
    const newCam: CCTVCamera = {
      id: `cam-webcam-${Date.now()}`,
      name: 'Webcam Local - Guarita / Portão',
      zone: 'portao_social',
      location: 'Mesa da Portaria (Posto de Atendimento)',
      status: 'online',
      brand: 'Webcam USB / Integrada',
      feedType: 'webcam',
      isWebcam: true,
      resolution: '720p HD (60 FPS)',
      recordingRefPrefix: 'WEBCAM_GUARIA',
    };
    storage.saveCCTVCamera(newCam);
    triggerFeedback('Canal de Webcam Local da Guarita adicionado com sucesso!');
  };

  const handleAddTestStreamChannel = () => {
    const newCam: CCTVCamera = {
      id: `cam-test-${Date.now()}`,
      name: 'Canal de Teste Streaming Ao Vivo (HLS)',
      zone: 'portao_veicular',
      location: 'Fluxo Contínuo de Teste',
      status: 'online',
      brand: 'Streaming HLS / Web',
      feedType: 'hls_stream',
      streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      resolution: '1080p Full HD (30 FPS)',
      recordingRefPrefix: 'TEST_STREAM',
    };
    storage.saveCCTVCamera(newCam);
    triggerFeedback('Canal de streaming real adicionado ao mosaico de CFTV!');
  };

  const filteredCameras = cameras.filter((cam) => {
    if (filterZone === 'all') return true;
    return cam.zone === filterZone;
  });

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) || cameras[0];

  const handleCaptureSnapshot = (cam: CCTVCamera) => {
    const snapshotUrl =
      cam.snapshotUrl ||
      cam.streamUrl ||
      ASSET_IMAGES.entranceGate;
    setCapturedSnapshot({ url: snapshotUrl, cam });
    storage.addAuditLog(
      'Snapshot CFTV Capturado',
      'Segurança',
      `Captura de evidência da câmera "${cam.name}" realizada na portaria.`
    );
  };

  const handleOpenAddModal = () => {
    setEditingCamera(null);
    setCamName(`CAM-${String(cameras.length + 1).padStart(2, '0')}: `);
    setCamZone('portao_veicular');
    setCamLocation('');
    setCamBrand('Intelbras Multi-HD');
    setDvrHost('meucondominio.ddns-intelbras.com.br');
    setDvrHttpPort('8080');
    setDvrRtspPort('554');
    setDvrChannel(cameras.length + 1);
    setDvrUser('admin');
    setDvrPass('');
    setShowDvrPassword(false);
    setDvrStreamMode('snapshot_refresh');
    setSubStream(true);
    setCustomStreamUrl('');
    setCustomRtspUrl('');
    setCustomExternalUrl('');
    setFormMode('wizard_intelbras');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (cam: CCTVCamera) => {
    setEditingCamera(cam);
    setCamName(cam.name);
    setCamZone(cam.zone);
    setCamLocation(cam.location);
    setCamBrand(cam.brand);
    setCustomStreamUrl(cam.streamUrl || '');
    setCustomRtspUrl(cam.rtspUrl || '');
    setCustomExternalUrl(cam.externalViewerUrl || '');
    setDvrHost(cam.dvrHost || cam.ipAddress || '');
    setDvrHttpPort(cam.dvrHttpPort || '8080');
    setDvrRtspPort(cam.dvrRtspPort || '554');
    setDvrUser(cam.dvrUser || 'admin');
    setDvrPass(cam.dvrPass || '');
    setShowDvrPassword(false);
    setDvrChannel(cam.dvrChannel || 1);
    setFormMode(cam.isWebcam || cam.feedType === 'webcam' ? 'webcam' : (cam.dvrHost ? 'wizard_intelbras' : 'custom_url'));
    setShowAddModal(true);
  };

  const handleSaveCamera = (e: React.FormEvent) => {
    e.preventDefault();

    if (!camName.trim() || !camLocation.trim()) {
      triggerFeedback('Preencha o nome e a localização da câmera.', 'info');
      return;
    }

    let finalSnapshotUrl = '';
    let finalStreamUrl = '';
    let finalRtspUrl = '';
    let finalExternalUrl = '';
    let finalFeedType: CCTVCamera['feedType'] = 'simulated_live';

    if (formMode === 'webcam') {
      finalFeedType = 'webcam';
      if (!webcamStream) {
        handleStartWebcam();
      }
    } else if (formMode === 'wizard_intelbras') {
      const cleanHost = dvrHost.trim().replace(/^https?:\/\//, '');
      const auth = dvrPass ? `${dvrUser}:${dvrPass}@` : `${dvrUser}@`;
      const streamSubtype = subStream ? 1 : 0;

      // Intelbras RTSP Pattern:
      finalRtspUrl = `rtsp://${auth}${cleanHost}:${dvrRtspPort}/cam/realmonitor?channel=${dvrChannel}&subtype=${streamSubtype}`;
      
      // Intelbras HTTP Snapshot CGI Pattern:
      finalSnapshotUrl = `http://${auth}${cleanHost}:${dvrHttpPort}/cgi-bin/snapshot.cgi?channel=${dvrChannel}`;
      
      // Direct DVR Web Interface:
      finalExternalUrl = `http://${cleanHost}:${dvrHttpPort}`;

      if (dvrStreamMode === 'snapshot_refresh') {
        finalFeedType = 'mjpeg_stream';
      } else if (dvrStreamMode === 'stream_video') {
        finalFeedType = 'hls_stream';
        finalStreamUrl = customStreamUrl || `http://${cleanHost}:1984/api/stream.m3u8?src=ch${dvrChannel}`;
      } else {
        finalFeedType = 'external_dvr';
      }
    } else {
      finalStreamUrl = customStreamUrl.trim();
      finalRtspUrl = customRtspUrl.trim();
      finalExternalUrl = customExternalUrl.trim();
      finalSnapshotUrl = customStreamUrl.trim() || ASSET_IMAGES.entranceGate;
      finalFeedType = customStreamUrl.includes('.m3u8') || customStreamUrl.includes('.mp4') ? 'hls_stream' : 'simulated_live';
    }

    // Default sample image if nothing provided so the user gets immediate visual confirmation
    if (!finalSnapshotUrl && !finalStreamUrl && finalFeedType !== 'webcam') {
      finalSnapshotUrl = ASSET_IMAGES.entranceGate;
    }

    const cameraData: CCTVCamera = {
      id: editingCamera ? editingCamera.id : `cam-${Date.now()}`,
      name: camName.trim(),
      zone: camZone,
      location: camLocation.trim(),
      status: 'online',
      brand: camBrand.trim() || 'Intelbras Multi-HD',
      ipAddress: dvrHost.trim() || '192.168.1.108',
      resolution: '1080p Full HD (30 FPS)',
      recordingRefPrefix: `DVR_CH${String(dvrChannel).padStart(2, '0')}`,
      feedType: finalFeedType,
      snapshotUrl: finalSnapshotUrl,
      streamUrl: finalStreamUrl || undefined,
      rtspUrl: finalRtspUrl || undefined,
      externalViewerUrl: finalExternalUrl || undefined,
      dvrChannel: Number(dvrChannel) || 1,
      dvrHost: dvrHost.trim() || undefined,
      dvrHttpPort: dvrHttpPort.trim() || '8080',
      dvrRtspPort: dvrRtspPort.trim() || '554',
      dvrUser: dvrUser.trim() || 'admin',
      dvrPass: dvrPass.trim() || undefined,
      isWebcam: formMode === 'webcam',
      subStream,
    };

    storage.saveCCTVCamera(cameraData);
    setShowAddModal(false);
    triggerFeedback(
      editingCamera
        ? `Câmera "${cameraData.name}" atualizada com sucesso!`
        : `Câmera "${cameraData.name}" vinculada com sucesso!`
    );
  };

  const handleDeleteCamera = () => {
    if (!cameraToDelete) return;
    storage.deleteCCTVCamera(cameraToDelete.id);
    if (selectedCameraId === cameraToDelete.id) {
      setSelectedCameraId(null);
    }
    setCameraToDelete(null);
    triggerFeedback('Câmera removida do sistema.');
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerFeedback(`${label} copiado para a área de transferência!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Layout Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Video className="w-5 h-5 text-sky-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Central de CFTV & Monitoramento</h2>
            <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-mono font-semibold shrink-0">
              DVR CONECTADO
            </span>
          </div>
        </div>

        {/* Action Buttons & Helpers */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Zone filter */}
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none flex-1 sm:flex-initial min-w-[130px]"
          >
            <option value="all">Todas as Áreas ({cameras.length})</option>
            <option value="portao_veicular">Portão Veicular</option>
            <option value="portao_social">Portão Social / Eclusa</option>
            <option value="garagem_subsolo">Garagem Subsolo</option>
            <option value="hall_torre_a">Hall Torre A</option>
            <option value="hall_torre_b">Hall Torre B</option>
            <option value="perimetro">Perímetro / Muros</option>
            <option value="area_lazer">Área de Lazer</option>
          </select>

          {/* Grid buttons */}
          <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-xl gap-0.5 shrink-0">
            <button
              onClick={() => setGridLayout('1x1')}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                gridLayout === '1x1' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              1
            </button>
            <button
              onClick={() => setGridLayout('2x2')}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                gridLayout === '2x2' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              4
            </button>
            <button
              onClick={() => setGridLayout('3x3')}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                gridLayout === '3x3' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({cameras.length})
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Canal</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1x1 FOCUS VIEW                                               */}
      {/* ============================================================ */}
      {gridLayout === '1x1' && selectedCamera ? (
        <div className="space-y-4">
          <div className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 aspect-video shadow-2xl flex items-center justify-center group">
            {/* Live Camera Feed Renderer (Webcam, HLS, or Proxy Snapshot) */}
            <CameraFeedRenderer
              cam={selectedCamera}
              liveTick={liveTick}
              webcamStream={webcamStream}
              onActivateWebcam={handleStartWebcam}
              resolveUrl={resolveCameraStreamUrl}
              getDefaultSnapshot={getDefaultSnapshot}
              className="w-full h-full object-cover"
            />

            {/* Live Security HUD Overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400 border border-emerald-950">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold">LIVE REC</span>
              <span>·</span>
              <span className="text-white font-semibold">{selectedCamera.name}</span>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-3 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 border border-slate-800">
              <span>{currentTime}</span>
              <span className="text-sky-400 font-semibold">{selectedCamera.resolution}</span>
            </div>

            {/* Desktop in-video Bottom HUD */}
            <div className="hidden sm:flex absolute bottom-4 left-4 bg-black/85 backdrop-blur px-3 py-2 rounded-xl text-xs text-slate-300 border border-slate-800/80 flex-wrap items-center gap-2 max-w-[60%]">
              <span>Local: <strong className="text-white">{selectedCamera.location}</strong></span>
              <span className="text-slate-600">|</span>
              <span>Host/IP: <span className="font-mono text-amber-300">{selectedCamera.dvrHost || selectedCamera.ipAddress || (selectedCamera.isWebcam ? 'Webcam Local' : 'Local')}</span></span>
              <span className="text-slate-600">|</span>
              <span>Canal: <span className="font-mono text-sky-300 font-bold">CH {selectedCamera.dvrChannel || 1}</span></span>
              {selectedCamera.subStream && (
                <span className="px-1.5 py-0.5 bg-emerald-950 border border-emerald-800 text-[10px] text-emerald-400 rounded">
                  Sub-Stream
                </span>
              )}
            </div>

            {/* Desktop Floating Action Buttons */}
            <div className="hidden sm:flex absolute bottom-4 right-4 items-center gap-2">
              <button
                onClick={() => handleCaptureSnapshot(selectedCamera)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl border border-slate-700 shadow-xl transition-colors cursor-pointer"
                title="Capturar Foto / Evidência"
              >
                <Camera className="w-4 h-4 text-sky-300" />
                <span>Capturar Imagem</span>
              </button>

              <button
                onClick={() => handleOpenEditModal(selectedCamera)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 shadow transition-colors cursor-pointer"
                title="Configurar Parâmetros de DVR"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-300" />
                <span>Editar Canal</span>
              </button>

              {selectedCamera.externalViewerUrl && (
                <a
                  href={selectedCamera.externalViewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl border border-indigo-400/50 shadow transition-colors cursor-pointer"
                  title="Abrir no WebViewer do DVR Intelbras"
                >
                  <ExternalLink className="w-4 h-4 text-amber-300" />
                  <span>Abrir Web DVR</span>
                </a>
              )}
            </div>
          </div>

          {/* Mobile Under-Video Dedicated Control Bar */}
          <div className="sm:hidden bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="truncate mr-2">
                <span className="font-semibold text-white block truncate">{selectedCamera.name}</span>
                <span className="text-[11px] text-slate-400 block truncate">
                  {selectedCamera.location} · Canal {selectedCamera.dvrChannel || 1}
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded shrink-0">
                AO VIVO
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCaptureSnapshot(selectedCamera)}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-sky-200" />
                <span>Capturar Foto</span>
              </button>

              <button
                onClick={() => handleOpenEditModal(selectedCamera)}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-slate-300" />
                <span>Editar DVR</span>
              </button>

              {selectedCamera.externalViewerUrl && (
                <a
                  href={selectedCamera.externalViewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-amber-300" />
                  <span>Abrir Web DVR Intelbras</span>
                </a>
              )}
            </div>
          </div>

          {/* Camera Selector Strip Below */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {cameras.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCameraId(c.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedCameraId === c.id
                    ? 'border-sky-500 bg-sky-950/50 text-white shadow-lg'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-sky-400 font-bold">CH {c.dvrChannel || 1}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <p className="text-xs font-semibold truncate mt-0.5 text-white">{c.name.split(':')[0]}</p>
                <p className="text-[10px] text-slate-400 truncate">{c.location}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* MOSAIC GRID LAYOUT (4 ou 9 CÂMERAS)                          */
        /* ============================================================ */
        <div
          className={`grid gap-4 ${
            gridLayout === '2x2' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {filteredCameras.map((cam) => (
            <div
              key={cam.id}
              className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex flex-col justify-between hover:border-sky-500/70 transition-all shadow-lg"
            >
              <CameraFeedRenderer
                cam={cam}
                liveTick={liveTick}
                webcamStream={webcamStream}
                onActivateWebcam={handleStartWebcam}
                resolveUrl={resolveCameraStreamUrl}
                getDefaultSnapshot={getDefaultSnapshot}
                className="w-full h-full object-cover opacity-90"
              />

              {/* Header HUD */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold">{cam.name.split(':')[0]}</span>
                <span className="text-slate-400">| CH {cam.dvrChannel || 1}</span>
              </div>

              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className="bg-black/80 backdrop-blur text-[10px] font-mono text-slate-300 px-2 py-0.5 rounded-lg">
                  {currentTime.slice(11)}
                </span>
                <button
                  onClick={() => {
                    setSelectedCameraId(cam.id);
                    setGridLayout('1x1');
                  }}
                  className="bg-black/80 hover:bg-sky-600 text-slate-300 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Ampliar em tela única"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom footer & actions */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 flex items-end justify-between">
                <div className="truncate mr-2">
                  <p className="text-xs font-semibold text-white truncate">{cam.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {cam.location} · {cam.brand}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCaptureSnapshot(cam)}
                    className="p-1.5 bg-slate-900/90 hover:bg-sky-600 text-sky-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    title="Capturar Foto"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(cam)}
                    className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    title="Configurar Câmera"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {cam.externalViewerUrl && (
                    <a
                      href={cam.externalViewerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-slate-900/90 hover:bg-indigo-600 text-amber-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                      title="Abrir no DVR do Condomínio"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: GUIA COMPLETO - O QUE FAZER PARA O ACESSO FUNCIONAR  */}
      {/* ============================================================ */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    O que eu preciso fazer para o acesso às câmeras funcionar?
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Instruções completas para conectar seu DVR, webcam ou rede local ao sistema
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Fechar
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-300">
              {/* Introduction callout */}
              <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-xl text-sky-200 space-y-1">
                <strong className="text-white block font-semibold">Como o sistema exibe as câmeras:</strong>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Este aplicativo roda com certificado seguro HTTPS na nuvem. Ele possui um <strong>servidor de proxy interno</strong> que busca as imagens do seu DVR sem misturar protocolos (evitando bloqueios de segurança do navegador) e aceita tanto DVRs com DDNS quanto webcams do posto e transmissões em vídeo contínuo.
                </p>
              </div>

              {/* Step 1: DVR Físico */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-950 border border-amber-700 flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>Se você tem um DVR Físico na Portaria (Intelbras, Hikvision, Dahua)</span>
                </div>
                <p className="leading-relaxed">
                  Para que o aplicativo na nuvem consiga se comunicar com o DVR instalado fisicamente na guarita, são necessários 3 passos simples na rede da portaria:
                </p>
                <div className="space-y-2 pt-1 font-mono text-[11px]">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-amber-300 font-bold block mb-0.5">A. Ativar DDNS no DVR:</span>
                    <span className="text-slate-300 block font-sans">
                      Acesse no DVR: <strong>Menu Principal &gt; Rede &gt; DDNS</strong>. Habilite o <strong>"Intelbras DDNS"</strong> gratuito e crie um domínio (ex: <code className="text-sky-300">meucondominio.ddns-intelbras.com.br</code>).
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-sky-300 font-bold block mb-0.5">B. Redirecionamento de Portas no Modem/Roteador (Port Forwarding):</span>
                    <span className="text-slate-300 block font-sans">
                      No modem da guarita (ex: Claro, Vivo, Oi), acesse as configurações e crie a regra de NAT direcionando:
                      <br />• <strong>Porta HTTP (8080 ou 80)</strong> para o IP local do DVR (ex: 192.168.1.108);
                      <br />• <strong>Porta RTSP (554)</strong> para o IP local do DVR.
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-emerald-300 font-bold block mb-0.5">C. Usuário e Senha do DVR:</span>
                    <span className="text-slate-300 block font-sans">
                      Crie um usuário no DVR (ex: <code>portaria</code>) com permissão de visualização e preencha nos dados da câmera no sistema.
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Computador na mesma rede */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-sky-950 border border-sky-700 flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Se você está usando o Computador da Portaria (Mesma Rede do DVR)</span>
                </div>
                <p className="leading-relaxed">
                  Se o computador onde o porteiro opera o sistema está conectado no mesmo switch ou roteador do DVR (na mesma rede local cabeada ou Wi-Fi da guarita):
                </p>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="font-semibold text-white block">Botão "Abrir Web DVR da Portaria":</span>
                  <p className="text-[11px] text-slate-300">
                    Basta clicar no botão azul <strong>"Abrir Web DVR"</strong> na tela de monitoramento. O navegador da portaria abrirá a tela oficial do DVR (Intelbras WebViewer) direto pelo IP local (ex: <code className="text-amber-300">http://192.168.1.108:8080</code>), funcionando imediatamente sem precisar abrir portas na internet!
                  </p>
                </div>
              </div>

              {/* Step 3: Webcam USB */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Solução Imediata: Conectar Webcam USB do Posto</span>
                </div>
                <p className="leading-relaxed">
                  Não quer esperar a liberação de portas no roteador? Conecte qualquer webcam USB (ou a câmera embutida do notebook/computador da portaria) apontada para o balcão ou portão:
                </p>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="font-semibold text-white block">Ativação em 1 Clique:</span>
                  <p className="text-[11px] text-slate-300">
                    Clique em <strong>"Conectar Webcam do Posto"</strong> no topo da página. O navegador solicitará permissão de câmera e a transmissão ao vivo aparecerá na grade de CFTV em alta definição (60 FPS) imediatamente!
                  </p>
                </div>
              </div>

              {/* Step 4: CGNAT */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-purple-950 border border-purple-700 flex items-center justify-center text-xs">
                    4
                  </span>
                  <span>E se a internet da portaria não tiver IP público (CGNAT)?</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Algumas operadoras utilizam CGNAT (IP compartilhado). Nesse caso, conexões diretas via DDNS são bloqueadas pela própria operadora. As soluções recomendadas são:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-1">
                  <li>Utilizar o <strong>WebViewer local</strong> da guarita pelo IP 192.168.x;</li>
                  <li>Solicitar à operadora de internet da portaria a contratação de <strong>IP Fixo</strong> ou saída do CGNAT;</li>
                  <li>Instalar no computador da portaria o software gratuito <strong>go2rtc</strong> ou <strong>Cloudflare Tunnel</strong>, que cria um túnel seguro para fora sem precisar de IP público.</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => {
                  setShowGuideModal(false);
                  setShowDiagnosticModal(true);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Testar Conexão com Meu DVR</span>
              </button>

              <button
                onClick={() => {
                  setShowGuideModal(false);
                  handleOpenAddModal();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <span>Configurar Câmera Agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DIAGNÓSTICO EM TEMPO REAL DE CONEXÃO COM DVR         */}
      {/* ============================================================ */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Diagnóstico de Conexão com DVR Intelbras / CFTV
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Teste se o endereço DDNS, portas e credenciais estão respondendo na internet
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Fechar
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">
                    Endereço DDNS ou IP Público do DVR *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: meucondominio.ddns-intelbras.com.br ou 187.54.12.89"
                    value={diagHost}
                    onChange={(e) => setDiagHost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Porta HTTP (CGI / Web)</label>
                  <input
                    type="text"
                    value={diagPort}
                    onChange={(e) => setDiagPort(e.target.value)}
                    placeholder="8080 ou 80"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Canal do DVR (1 a 32)</label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={diagChannel}
                    onChange={(e) => setDiagChannel(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Usuário do DVR</label>
                  <input
                    type="text"
                    value={diagUser}
                    onChange={(e) => setDiagUser(e.target.value)}
                    placeholder="admin"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Senha do DVR</label>
                  <input
                    type="password"
                    value={diagPass}
                    onChange={(e) => setDiagPass(e.target.value)}
                    placeholder="Senha do DVR"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Fabricante do DVR</label>
                  <select
                    value={diagBrand}
                    onChange={(e) => setDiagBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Intelbras Multi-HD">Intelbras Multi-HD / MHDX (Padrão)</option>
                    <option value="Hikvision">Hikvision / Hilook (ISAPI)</option>
                    <option value="Dahua">Dahua Technology</option>
                    <option value="Genérica">Genérica / Outro Fabricante</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() =>
                    handleTestConnection({
                      host: diagHost,
                      port: diagPort,
                      channel: diagChannel,
                      user: diagUser,
                      pass: diagPass,
                      brand: diagBrand,
                    })
                  }
                  disabled={isTestingConnection}
                  className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-950/60"
                >
                  <RefreshCw className={`w-4 h-4 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  <span>{isTestingConnection ? 'Consultando DVR na rede...' : 'Executar Teste de Conexão'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 animate-fadeIn ${
                    testResult.ok
                      ? 'bg-emerald-950/90 border-emerald-600 text-emerald-100'
                      : 'bg-rose-950/90 border-rose-700 text-rose-100'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <span>{testResult.ok ? 'Sucesso! DVR conectado e respondendo.' : 'Falha na Conexão'}</span>
                    {testResult.latencyMs && (
                      <span className="text-[10px] font-mono bg-emerald-900 border border-emerald-700 px-2 py-0.5 rounded text-emerald-300 ml-auto">
                        {testResult.latencyMs} ms
                      </span>
                    )}
                  </div>

                  <p className="leading-relaxed text-[11px]">
                    {testResult.ok ? testResult.message : testResult.error}
                  </p>

                  {testResult.troubleshooting && (
                    <div className="pt-2 border-t border-rose-900/60 space-y-1.5">
                      <span className="font-bold text-rose-300 block text-[11px]">Como resolver:</span>
                      <ul className="list-disc list-inside text-[11px] text-slate-200 space-y-1">
                        {testResult.troubleshooting.map((tip, idx) => (
                          <li key={idx} className="leading-relaxed">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Fechar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADICIONAR / EDITAR CÂMERA DE DVR                     */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCamera}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-scaleUp"
          >
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingCamera ? `Editar ${editingCamera.name}` : 'Adicionar Canal de Câmera do DVR'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Vincule o canal do DVR Intelbras, configure o DDNS e o modo de exibição
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Fechar
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Mode Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormMode('wizard_intelbras')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    formMode === 'wizard_intelbras'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>DVR Intelbras / Hikvision</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormMode('webcam');
                    setCamName(camName || 'Webcam Local - Guarita');
                    setCamBrand('Webcam USB / HD');
                    handleStartWebcam();
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    formMode === 'webcam'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Webcam do Posto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormMode('custom_url')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    formMode === 'custom_url'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>URL / RTSP / HLS</span>
                </button>
              </div>

              {/* General Camera Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">
                    Nome da Câmera * <span className="text-slate-500 font-normal">(Ex: CAM 01 - Portão de Entrada)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CAM-01: Portão Veicular & Cancelas"
                    value={camName}
                    onChange={(e) => setCamName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Área / Zona *</label>
                  <select
                    value={camZone}
                    onChange={(e) => setCamZone(e.target.value as CCTVZone)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="portao_veicular">Portão Veicular</option>
                    <option value="portao_social">Portão Social / Eclusa</option>
                    <option value="garagem_subsolo">Garagem Subsolo</option>
                    <option value="hall_torre_a">Hall Torre A</option>
                    <option value="hall_torre_b">Hall Torre B</option>
                    <option value="perimetro">Perímetro / Muro</option>
                    <option value="area_lazer">Área de Lazer / Salão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Localização Física *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Entrada principal da alameda"
                    value={camLocation}
                    onChange={(e) => setCamLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* SECTION: WEBCAM MODE */}
              {formMode === 'webcam' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/60 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Camera className="w-4 h-4" />
                    <span>Câmera USB / Webcam da Portaria</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Esta câmera usará a webcam do computador da portaria para transmitir o vídeo diretamente na central de CFTV. Não requer abertura de portas ou DDNS no roteador.
                  </p>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block">Status da Câmera do Posto:</span>
                      <span className="text-[11px] text-slate-400">
                        {webcamStream ? '✓ Webcam ativa e conectada' : 'Aguardando inicialização da câmera'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartWebcam}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{webcamStream ? 'Webcam Conectada' : 'Ativar e Testar'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION: WIZARD INTELBRAS */}
              {formMode === 'wizard_intelbras' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Tv className="w-4 h-4" />
                      <span>Configurações do DVR Intelbras / Hikvision</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Compatível Multi-HD, MHDX e Hikvision</span>
                  </div>

                  {/* Quick DVR Presets Strip */}
                  <div className="space-y-1.5 pb-1">
                    <span className="text-[11px] font-semibold text-slate-300 block">Preenchimento com 1 Clique:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setDvrHost('meucondominio.ddns-intelbras.com.br');
                          setDvrHttpPort('8080');
                          setDvrRtspPort('554');
                          setDvrUser('admin');
                          setCamBrand('Intelbras Multi-HD');
                          setDvrStreamMode('snapshot_refresh');
                          triggerFeedback('Preenchido com padrão DDNS Intelbras!');
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-amber-300 transition-colors cursor-pointer"
                      >
                        Intelbras DDNS (Padrão)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDvrHost('192.168.1.108');
                          setDvrHttpPort('80');
                          setDvrRtspPort('554');
                          setDvrUser('admin');
                          setCamBrand('Intelbras MHDX');
                          setDvrStreamMode('snapshot_refresh');
                          triggerFeedback('Preenchido com IP de Rede Local!');
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-sky-300 transition-colors cursor-pointer"
                      >
                        Rede Local (IP 192.168.x)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDvrHost('condo-cameras.ddns.net');
                          setDvrHttpPort('8000');
                          setDvrRtspPort('554');
                          setDvrUser('admin');
                          setCamBrand('Hikvision');
                          setDvrStreamMode('snapshot_refresh');
                          triggerFeedback('Preenchido com padrão Hikvision/Dahua!');
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-purple-300 transition-colors cursor-pointer"
                      >
                        Hikvision / Dahua
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-medium mb-1">
                        Endereço do DVR (DDNS Intelbras ou IP Local) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: meucondominio.ddns-intelbras.com.br ou 192.168.1.108"
                        value={dvrHost}
                        onChange={(e) => setDvrHost(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Canal do DVR (1 a 32) *</label>
                      <input
                        type="number"
                        min={1}
                        max={32}
                        required
                        value={dvrChannel}
                        onChange={(e) => setDvrChannel(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Porta HTTP (CGI / Web)</label>
                      <input
                        type="text"
                        value={dvrHttpPort}
                        onChange={(e) => setDvrHttpPort(e.target.value)}
                        placeholder="8080 ou 80"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Usuário do DVR</label>
                      <input
                        type="text"
                        value={dvrUser}
                        onChange={(e) => setDvrUser(e.target.value)}
                        placeholder="admin"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Senha do DVR</label>
                      <div className="relative">
                        <input
                          type={showDvrPassword ? 'text' : 'password'}
                          value={dvrPass}
                          onChange={(e) => setDvrPass(e.target.value)}
                          placeholder="Senha do DVR"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-9 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDvrPassword(!showDvrPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showDvrPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-2 pt-2 border-t border-slate-900">
                      <label className="block text-slate-300 font-medium mb-1">Modo de Exibição no App:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDvrStreamMode('snapshot_refresh')}
                          className={`p-2.5 rounded-lg border text-left transition-colors ${
                            dvrStreamMode === 'snapshot_refresh'
                              ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          <span className="font-bold block text-xs">📸 Auto-Refresh Snapshot (CGI)</span>
                          <span className="text-[10px] text-slate-400">Funciona direto no navegador sem instalar nada</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDvrStreamMode('stream_video')}
                          className={`p-2.5 rounded-lg border text-left transition-colors ${
                            dvrStreamMode === 'stream_video'
                              ? 'border-sky-500 bg-sky-950/40 text-sky-200'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          <span className="font-bold block text-xs">🎥 Stream de Vídeo HLS / WebRTC</span>
                          <span className="text-[10px] text-slate-400">Vídeo a 30 FPS contínuo via conversor</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* URL Generated Preview */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block">URL RTSP Gerada para o Canal {dvrChannel}:</span>
                    <span className="text-[11px] font-mono text-amber-300 break-all select-all">
                      rtsp://{dvrUser}:{dvrPass ? '••••••' : '[senha]'}@{dvrHost || '[host]'}:{dvrRtspPort}/cam/realmonitor?channel={dvrChannel}&subtype={subStream ? 1 : 0}
                    </span>
                  </div>

                  {/* Interactive Realtime DDNS Connection Tester */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-sky-900/60 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-white block">Diagnóstico de Conexão com o DVR</span>
                        <span className="text-[10px] text-slate-400">Testa a resposta real do DDNS Intelbras e da porta HTTP</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTestConnection()}
                        disabled={isTestingConnection}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow self-start sm:self-auto shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                        <span>{isTestingConnection ? 'Testando Conexão...' : 'Testar DDNS Intelbras'}</span>
                      </button>
                    </div>

                    {testResult && (
                      <div className={`p-3 rounded-lg border text-xs space-y-1.5 animate-fadeIn ${
                        testResult.ok
                          ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                          : 'bg-rose-950/80 border-rose-700 text-rose-200'
                      }`}>
                        <div className="flex items-center gap-2 font-bold">
                          {testResult.ok ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span>{testResult.ok ? 'Sucesso! Câmera conectada e respondendo.' : 'Aviso na Conexão com o DVR'}</span>
                          {testResult.latencyMs && (
                            <span className="text-[10px] font-mono bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-300 ml-auto">
                              {testResult.latencyMs}ms
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] leading-relaxed">
                          {testResult.ok ? testResult.message : testResult.error}
                        </p>

                        {testResult.troubleshooting && (
                          <div className="pt-1.5 border-t border-rose-900/60 space-y-1">
                            <span className="text-[10px] font-bold text-rose-300 block">Dicas para fazer funcionar:</span>
                            <ul className="list-disc list-inside text-[10px] text-slate-300 space-y-0.5">
                              {testResult.troubleshooting.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: MANUAL URLS */}
              {formMode === 'custom_url' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      URL de Transmissão de Vídeo (HLS .m3u8, WebRTC ou MP4)
                    </label>
                    <input
                      type="url"
                      placeholder="http://192.168.1.100:1984/api/stream.m3u8?src=cam1"
                      value={customStreamUrl}
                      onChange={(e) => setCustomStreamUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">URL RTSP da Câmera (Opcional)</label>
                    <input
                      type="text"
                      placeholder="rtsp://admin:senha@192.168.1.108:554/cam/realmonitor?channel=1&subtype=1"
                      value={customRtspUrl}
                      onChange={(e) => setCustomRtspUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Link do DVR Web / Intelbras Cloud</label>
                    <input
                      type="url"
                      placeholder="http://meudominio.ddns-intelbras.com.br:8080"
                      value={customExternalUrl}
                      onChange={(e) => setCustomExternalUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              {editingCamera && (
                <button
                  type="button"
                  onClick={() => {
                    setCameraToDelete(editingCamera);
                    setShowAddModal(false);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Câmera</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  {editingCamera ? 'Salvar Alterações' : 'Conectar e Salvar Canal'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Snapshot Preview Modal */}
      {capturedSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Evidência Fotográfica Capturada</h3>
              </div>
              <button
                onClick={() => setCapturedSnapshot(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center">
                <img src={capturedSnapshot.url} alt="Evidência" className="w-full h-full object-cover" />
              </div>
              <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p><strong>Câmera:</strong> {capturedSnapshot.cam.name}</p>
                <p><strong>Local:</strong> {capturedSnapshot.cam.location}</p>
                <p><strong>Carimbo de Data/Hora:</strong> {currentTime}</p>
                <p className="text-[11px] text-slate-500 font-mono">Hash Evidência: #{Date.now()}-CFTV</p>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-[11px] text-emerald-400">✓ Gravado no registro de auditoria</span>
              <button
                onClick={() => {
                  if (onAttachSnapshotToOccurrence) {
                    onAttachSnapshotToOccurrence(capturedSnapshot.url, capturedSnapshot.cam.name);
                  }
                  setCapturedSnapshot(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition-colors cursor-pointer"
              >
                Vincular ao Livro de Ocorrências
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {cameraToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Ponto de Câmera?</h3>
                <p className="text-xs text-rose-300">Confirmação de exclusão</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Deseja remover a câmera <strong className="text-white">"{cameraToDelete.name}"</strong> (Canal {cameraToDelete.dvrChannel || 1}) da central de monitoramento?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCameraToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCamera}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                Excluir Câmera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

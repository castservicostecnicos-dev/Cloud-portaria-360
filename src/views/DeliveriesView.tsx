import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Send,
  CheckCircle2,
  Clock,
  Camera,
  QrCode,
  FileText,
  Pill,
  Box,
  Truck,
  ExternalLink,
  PenTool,
  Users,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import { DeliveryItem, DeliveryType, DeliveryStatus, Block, Apartment, Resident } from '../types';
import { WhatsAppPayload } from '../services/whatsapp';
import { SignaturePad } from '../components/SignaturePad';
import { CameraCaptureModal } from '../components/CameraCaptureModal';

interface DeliveriesViewProps {
  onTriggerWhatsApp: (payload: WhatsAppPayload) => void;
  selectedDeliveryForPickup?: DeliveryItem | null;
  onClearSelectedDelivery?: () => void;
  initialOpenCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({
  onTriggerWhatsApp,
  selectedDeliveryForPickup,
  onClearSelectedDelivery,
  initialOpenCreateModal,
  onCloseCreateModal,
}) => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const [showNewDeliveryModal, setShowNewDeliveryModal] = useState(false);
  const [pickupTarget, setPickupTarget] = useState<DeliveryItem | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // New Delivery form state
  const [selectedBlockId, setSelectedBlockId] = useState('bloco-a');
  const [selectedAptId, setSelectedAptId] = useState('apt-101a');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('encomenda');
  const [description, setDescription] = useState('');
  const [sender, setSender] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [storageLocation, setStorageLocation] = useState('Armário A - Prateleira 1');
  const [autoNotifyWhatsApp, setAutoNotifyWhatsApp] = useState(true);

  // Pickup form state
  const [pickedUpBy, setPickedUpBy] = useState('');
  const [pickedUpDocument, setPickedUpDocument] = useState('');
  const [pickedUpSignature, setPickedUpSignature] = useState<string | null>(null);

  const refreshData = () => {
    setDeliveries(storage.getDeliveries());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
    setResidents(storage.getResidents());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedDeliveryForPickup) {
      handleOpenPickup(selectedDeliveryForPickup);
      if (onClearSelectedDelivery) onClearSelectedDelivery();
    }
  }, [selectedDeliveryForPickup]);

  useEffect(() => {
    if (initialOpenCreateModal) {
      setShowNewDeliveryModal(true);
      if (onCloseCreateModal) onCloseCreateModal();
    }
  }, [initialOpenCreateModal]);

  // Method to automatically apply apartment and resident data
  const applyApartmentAndResident = (aptId: string, blockId?: string) => {
    setSelectedAptId(aptId);
    if (blockId) {
      setSelectedBlockId(blockId);
    }

    const allResidents = storage.getResidents();
    const currentResidents = allResidents.filter((r) => r.apartmentId === aptId && r.active);
    if (currentResidents.length > 0) {
      const primaryRes =
        currentResidents.find((r) => r.isNotificationContact) ||
        currentResidents.find((r) => r.isMainResident) ||
        currentResidents[0];

      setSelectedResidentId(primaryRes.id);
      setRecipientName(primaryRes.name);
      setRecipientPhone(primaryRes.whatsapp || primaryRes.phone || '');
    } else {
      setSelectedResidentId('');
      setRecipientName('');
      setRecipientPhone('');
    }
  };

  // When modal opens or apartments load, initialize the automatic prefill
  useEffect(() => {
    if (showNewDeliveryModal) {
      const allApts = storage.getApartments();
      const allBlocks = storage.getBlocks();
      setApartments(allApts);
      setBlocks(allBlocks);
      setResidents(storage.getResidents());

      const targetApt = allApts.find((a) => a.id === selectedAptId) || allApts[0];
      if (targetApt) {
        applyApartmentAndResident(targetApt.id, targetApt.blockId);
      }
    }
  }, [showNewDeliveryModal]);

  const handleBlockChange = (newBlockId: string) => {
    setSelectedBlockId(newBlockId);
    const allApts = storage.getApartments();
    const blockApts = allApts.filter((a) => a.blockId === newBlockId);
    if (blockApts.length > 0) {
      applyApartmentAndResident(blockApts[0].id, newBlockId);
    }
  };

  const handleAptChange = (newAptId: string) => {
    const allApts = storage.getApartments();
    const apt = allApts.find((a) => a.id === newAptId);
    applyApartmentAndResident(newAptId, apt?.blockId || selectedBlockId);
  };

  const handleSelectSpecificResident = (res: Resident) => {
    setSelectedResidentId(res.id);
    setRecipientName(res.name);
    setRecipientPhone(res.whatsapp || res.phone || '');
  };

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.trackingCode && d.trackingCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.apartmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchesType = filterType === 'all' || d.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !description) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const receivedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const user = storage.getCurrentUser();
    const codeNumber = deliveries.length + 480;

    const newDel: DeliveryItem = {
      id: `del-${Date.now()}`,
      code: `ENC-2026-0${codeNumber}`,
      apartmentId: selectedAptId,
      blockId: selectedBlockId,
      recipientName: recipientName.trim(),
      type: deliveryType,
      description,
      sender: sender || undefined,
      carrier: carrier || undefined,
      trackingCode: trackingCode || undefined,
      photoUrl: capturedPhoto || undefined,
      receivedAt,
      operatorName: user.name,
      storageLocation: storageLocation || 'Armário de Encomendas',
      status: 'aguardando_retirada',
    };

    storage.saveDelivery(newDel);
    setShowNewDeliveryModal(false);

    // Prompt to notify resident via WhatsApp right away with auto-filled phone and data
    const aptNumber = selectedAptId.replace('apt-', '').toUpperCase();
    const block = blocks.find((b) => b.id === selectedBlockId);
    const targetResident =
      residents.find((r) => r.id === selectedResidentId) ||
      residents.find((r) => r.apartmentId === selectedAptId && r.isNotificationContact) ||
      residents.find((r) => r.apartmentId === selectedAptId);

    const phoneToSend = recipientPhone || targetResident?.phone || '';

    onTriggerWhatsApp({
      phone: phoneToSend,
      residentName: recipientName.trim(),
      apartmentNumber: aptNumber,
      blockName: block?.name,
      itemType: deliveryType,
      code: newDel.code,
      description,
      templateKey: deliveryType === 'remedio' ? 'remedio_urgente' : 'encomenda_recebida',
    });

    resetForm();
  };

  const resetForm = () => {
    setRecipientName('');
    setRecipientPhone('');
    setSelectedResidentId('');
    setDescription('');
    setSender('');
    setCarrier('');
    setTrackingCode('');
    setCapturedPhoto(null);
  };

  const handleOpenPickup = (del: DeliveryItem) => {
    setPickupTarget(del);
    setPickedUpBy(del.recipientName);
    setPickedUpDocument('');
    setPickedUpSignature(null);
  };

  const handleConfirmPickup = () => {
    if (!pickupTarget) return;
    if (!pickedUpBy) {
      alert('Informe o nome de quem está retirando.');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const pickedUpAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const user = storage.getCurrentUser();

    const updated: DeliveryItem = {
      ...pickupTarget,
      status: 'retirado',
      pickedUpAt,
      pickedUpBy: `${pickedUpBy} (${user.name})`,
      pickedUpDocument: pickedUpDocument || undefined,
      pickedUpSignature: pickedUpSignature || undefined,
    };

    storage.saveDelivery(updated);
    storage.addAuditLog(
      'Retirada de Encomenda',
      'Recebimentos',
      `Encomenda ${pickupTarget.code} retirada por ${pickedUpBy}. Assinatura digital coletada.`
    );

    setPickupTarget(null);
  };

  const handleNotifyWhatsApp = (del: DeliveryItem) => {
    const aptNumber = del.apartmentId.replace('apt-', '').toUpperCase();
    const resident = residents.find((r) => r.apartmentId === del.apartmentId && r.isNotificationContact);

    onTriggerWhatsApp({
      phone: resident ? resident.phone : '',
      residentName: del.recipientName,
      apartmentNumber: aptNumber,
      itemType: del.type,
      code: del.code,
      description: del.description,
      templateKey: del.type === 'remedio' ? 'remedio_urgente' : 'encomenda_recebida',
    });

    // Mark as morador_avisado
    if (del.status === 'recebido' || del.status === 'aguardando_retirada') {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const notifiedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      storage.saveDelivery({
        ...del,
        status: 'morador_avisado',
        notifiedAt,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Encomendas
            </h2>
          </div>
        </div>

        {isObserver ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 rounded-lg text-xs font-semibold shrink-0">
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Modo Observador</span>
          </div>
        ) : (
          <button
            onClick={() => setShowNewDeliveryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Encomenda</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por código, morador ou apartamento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="aguardando_retirada">Aguardando Retirada</option>
            <option value="morador_avisado">Morador Avisado</option>
            <option value="retirado">Retirados</option>
            <option value="recebido">Recebido na Portaria</option>
            <option value="devolvido">Devolvido ao Remetente</option>
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">Todos os Tipos</option>
            <option value="encomenda">Encomendas</option>
            <option value="remedio">Remédios (Urgentes)</option>
            <option value="documento">Documentos / Sedex</option>
            <option value="correspondencia">Correspondências</option>
            <option value="delivery">Delivery / Compras</option>
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Código / Tipo</th>
                <th className="py-3 px-4">Destinatário & Apartamento</th>
                <th className="py-3 px-4">Descrição & Armazenamento</th>
                <th className="py-3 px-4">Remetente / Transportadora</th>
                <th className="py-3 px-4">Data Recebimento</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Nenhuma encomenda ou correspondência encontrada.
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((del) => {
                  const aptNum = del.apartmentId.replace('apt-', '').toUpperCase();
                  const isPending = del.status !== 'retirado' && del.status !== 'devolvido';

                  return (
                    <tr key={del.id} className="hover:bg-slate-850/50 transition-colors">
                      {/* Code and Type icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                              del.type === 'remedio'
                                ? 'bg-rose-950/50 text-rose-400 border-rose-800'
                                : del.type === 'documento'
                                ? 'bg-amber-950/50 text-amber-400 border-amber-800'
                                : 'bg-indigo-950/50 text-indigo-400 border-indigo-800'
                            }`}
                          >
                            {del.type === 'remedio' ? (
                              <Pill className="w-3.5 h-3.5" />
                            ) : del.type === 'documento' ? (
                              <FileText className="w-3.5 h-3.5" />
                            ) : (
                              <Box className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-mono font-bold text-white block">{del.code}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{del.type}</span>
                          </div>
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{del.recipientName}</span>
                        <span className="text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-1 rounded font-mono inline-block mt-0.5">
                          Apt {aptNum} · {del.blockId === 'bloco-a' ? 'Torre A' : 'Torre B'}
                        </span>
                      </td>

                      {/* Description & Storage */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <span className="text-slate-200 block truncate">{del.description}</span>
                        <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
                          📍 {del.storageLocation}
                        </span>
                      </td>

                      {/* Carrier & Tracking */}
                      <td className="py-3 px-4 text-[11px]">
                        <span className="text-slate-200 block">{del.carrier || del.sender || 'Entrega direta'}</span>
                        {del.trackingCode && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Rast: {del.trackingCode}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-mono-tabular">
                        <span className="text-slate-200 block">{del.receivedAt.slice(0, 10)}</span>
                        <span className="text-[10px] text-slate-500 block">{del.receivedAt.slice(11)} por {del.operatorName.split(' ')[0]}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {del.status === 'retirado' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                              Retirado
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {del.pickedUpAt ? del.pickedUpAt.slice(11) : ''}
                            </span>
                          </div>
                        ) : del.status === 'morador_avisado' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300 font-medium text-xs bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Avisado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-300 font-medium text-xs bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Aguardando
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              {/* Avisar WhatsApp */}
                              <button
                                onClick={() => handleNotifyWhatsApp(del)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/60 rounded-lg transition-colors"
                                title="Avisar Morador pelo WhatsApp"
                              >
                                <Send className="w-3 h-3" />
                                <span>Avisar</span>
                              </button>

                              {/* Registrar Retirada (apenas operador da portaria) */}
                              {!isObserver && (
                                <button
                                  onClick={() => handleOpenPickup(del)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-lg transition-colors"
                                  title="Registrar Retirada com Assinatura"
                                >
                                  <PenTool className="w-3 h-3" />
                                  <span>Retirar</span>
                                </button>
                              )}
                            </>
                          )}

                          {del.pickedUpSignature && (
                            <button
                              onClick={() => handleOpenPickup(del)}
                              className="text-[10px] text-slate-400 hover:text-white underline"
                            >
                              Ver Recibo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Delivery Modal */}
      {showNewDeliveryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateDelivery}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Receber Nova Encomenda / Objeto</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDeliveryModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Type and Apartment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Item *</label>
                  <select
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="encomenda">Encomenda / Pacote</option>
                    <option value="remedio">Remédio (Urgente)</option>
                    <option value="documento">Documento / Carta Registrada</option>
                    <option value="sedex">Sedex / Correios</option>
                    <option value="compra">Compra / E-commerce</option>
                    <option value="delivery">Delivery / Alimentação</option>
                    <option value="material">Material / Ferramenta</option>
                    <option value="correspondencia">Correspondência Comum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Local de Armazenamento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Armário A - Prateleira 2"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Destination Apartment and Block */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bloco / Torre</label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => handleBlockChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.identification})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Apartamento Destino *</label>
                  <select
                    value={selectedAptId}
                    onChange={(e) => handleAptChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono-tabular"
                  >
                    {apartments
                      .filter((a) => !selectedBlockId || a.blockId === selectedBlockId)
                      .map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          Apt {apt.number} ({apt.floor}º Andar)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Automatic Resident Pre-fill Card & Multi-Resident Selector */}
              {(() => {
                const currentAptResidents = residents.filter(
                  (r) => r.apartmentId === selectedAptId && r.active
                );
                return (
                  <div className="bg-slate-950/80 border border-emerald-800/40 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Morador(a) Vinculado(a) Automaticamente:</span>
                      </span>
                      {currentAptResidents.length > 1 && (
                        <span className="text-[10px] text-slate-400">
                          {currentAptResidents.length} moradores cadastrados
                        </span>
                      )}
                    </div>

                    {currentAptResidents.length === 0 ? (
                      <div className="text-[11px] text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded p-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Nenhum morador cadastrado nesta unidade. Preencha os campos abaixo manualmente.</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {currentAptResidents.map((r) => {
                            const isSelected = selectedResidentId === r.id || recipientName === r.name;
                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => handleSelectSpecificResident(r)}
                                className={`px-2.5 py-1.5 text-xs rounded-lg border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-950 border-emerald-500 text-white font-semibold shadow-sm'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                                <span>{r.name}</span>
                                <span className="text-[10px] text-slate-400 capitalize">
                                  ({r.isMainResident ? 'Titular' : r.type})
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {recipientPhone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 pt-1 font-mono-tabular">
                            <span className="font-semibold">WhatsApp para aviso automático:</span>
                            <span className="text-white font-bold">{recipientPhone}</span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1 rounded border border-emerald-800">
                              Pronto para envio
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nome do Destinatário *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do morador destinatário"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    WhatsApp para Notificação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98765-4321"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Descrição do Pacote / Item *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Caixa média lacrada Mercado Livre, envelope timbrado..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Transportadora / Entregador</label>
                  <input
                    type="text"
                    placeholder="Loggi, Correios, Total Express..."
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Código de Rastreamento (se houver)</label>
                  <input
                    type="text"
                    placeholder="BR123456789AA"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono-tabular"
                  />
                </div>
              </div>

              {/* Photo capture */}
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  <div>
                    <span className="font-semibold text-white block">Foto do Pacote / Etiqueta</span>
                    <span className="text-[11px] text-slate-400">
                      {capturedPhoto ? 'Foto anexada com sucesso' : 'Opcional para registro de avarias ou etiqueta'}
                    </span>
                  </div>
                </div>

                {capturedPhoto ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={capturedPhoto}
                      alt="Foto pacote"
                      className="w-8 h-8 rounded object-cover border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setCapturedPhoto(null)}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Tirar Foto
                  </button>
                )}
              </div>
              {/* WhatsApp Auto-Notification Toggle & Preview Card */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto-notify-wa"
                      checked={autoNotifyWhatsApp}
                      onChange={(e) => setAutoNotifyWhatsApp(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                    <label htmlFor="auto-notify-wa" className="text-xs text-emerald-200 font-semibold cursor-pointer flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Notificar Morador via WhatsApp Automaticamente</span>
                    </label>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                    {recipientPhone ? `Envia para: ${recipientPhone}` : 'Telefone pendente'}
                  </span>
                </div>

                {autoNotifyWhatsApp && (
                  <p className="text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded border border-emerald-900/60 font-mono leading-relaxed">
                    📲 Mensagem gerada: "Prezado(a) morador(a) *{recipientName || '[Nome]'}*, informamos que há uma encomenda ({deliveryType}) para sua unidade no condomínio..."
                  </p>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewDeliveryModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{autoNotifyWhatsApp ? 'Registrar & Avisar no WhatsApp' : 'Registrar Encomenda'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Package Pickup Modal with Canvas Signature Pad */}
      {pickupTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Registrar Retirada de Encomenda · {pickupTarget.code}
                </h3>
              </div>
              <button
                onClick={() => setPickupTarget(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                <p><strong>Destinatário Original:</strong> {pickupTarget.recipientName}</p>
                <p><strong>Apartamento:</strong> {pickupTarget.apartmentId.replace('apt-', '').toUpperCase()}</p>
                <p><strong>Item:</strong> {pickupTarget.description}</p>
                <p><strong>Localização:</strong> {pickupTarget.storageLocation}</p>
              </div>

              {pickupTarget.status === 'retirado' ? (
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-lg text-emerald-300 space-y-2">
                  <p className="font-semibold text-white">Item já retirado anteriormente</p>
                  <p>Retirado por: {pickupTarget.pickedUpBy}</p>
                  <p>Data/Hora: {pickupTarget.pickedUpAt}</p>
                  {pickupTarget.pickedUpSignature && (
                    <div className="mt-2 bg-white p-2 rounded border border-slate-700 inline-block">
                      <img
                        src={pickupTarget.pickedUpSignature}
                        alt="Assinatura"
                        className="h-16 object-contain"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Quem Está Retirando? *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nome da pessoa que retirou"
                        value={pickedUpBy}
                        onChange={(e) => setPickedUpBy(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Documento (RG / CPF)</label>
                      <input
                        type="text"
                        placeholder="RG ou CPF de quem retirou"
                        value={pickedUpDocument}
                        onChange={(e) => setPickedUpDocument(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono-tabular"
                      />
                    </div>
                  </div>

                  {/* Digital Signature Pad */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">
                      Assinatura Digital de Confirmação
                    </label>
                    <SignaturePad
                      onSave={(dataUrl) => {
                        setPickedUpSignature(dataUrl);
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPickupTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Fechar
              </button>
              {pickupTarget.status !== 'retirado' && (
                <button
                  type="button"
                  onClick={handleConfirmPickup}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
                >
                  Confirmar Retirada & Dar Baixa
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(img) => setCapturedPhoto(img)}
        title="Capturar Foto da Encomenda"
      />
    </div>
  );
};

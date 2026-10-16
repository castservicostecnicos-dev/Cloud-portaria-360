import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Send,
  Calendar,
  AlertTriangle,
  Wrench,
  PartyPopper,
  Info,
  Clock,
  CheckCircle2,
  Trash2,
  Users,
  Building,
  Share2,
  Eye,
  MessageSquare,
  Bookmark,
  Reply,
  Check,
  Search,
  Filter,
  Shield,
  FileText,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Edit3,
  Copy,
  Sparkles,
  ArrowRight,
  User,
  Inbox,
  CheckSquare,
  Package,
  Truck,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { storage } from '../services/storage';
import {
  CommunicationNotice,
  NoticeCategory,
  NoticePriority,
  NoticeTemplate,
  ResidentMessage,
  ResidentMessageCategory,
  ResidentMessageStatus,
  Block,
  Apartment,
  Resident,
  DeliveryItem,
} from '../types';
import { openWhatsAppLink, sanitizePhoneNumber, WhatsAppPayload } from '../services/whatsapp';

interface NoticesViewProps {
  onTriggerWhatsApp?: (payload: WhatsAppPayload) => void;
}

type ActiveSubTab = 'mural' | 'novo_aviso' | 'inbox_portaria' | 'portal_morador' | 'templates' | 'encomendas';

const CATEGORY_CONFIG: Record<
  NoticeCategory,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  geral: {
    label: 'Aviso Geral',
    icon: Info,
    color: 'text-slate-300',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
  },
  manutencao: {
    label: 'Manutenção Predial',
    icon: Wrench,
    color: 'text-sky-400',
    bg: 'bg-sky-950/60',
    border: 'border-sky-800',
  },
  seguranca: {
    label: 'Alerta de Segurança',
    icon: AlertTriangle,
    color: 'text-rose-400',
    bg: 'bg-rose-950/60',
    border: 'border-rose-800',
  },
  evento: {
    label: 'Evento / Assembleia',
    icon: PartyPopper,
    color: 'text-purple-400',
    bg: 'bg-purple-950/60',
    border: 'border-purple-800',
  },
  urgencia: {
    label: 'Urgência / Emergência',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-950/60',
    border: 'border-amber-800',
  },
};

const RESIDENT_MSG_CATEGORY_LABELS: Record<ResidentMessageCategory, string> = {
  duvida: 'Dúvida Geral',
  solicitacao: 'Solicitação à Portaria',
  aviso_encomenda: 'Aviso de Encomenda / Carga',
  aviso_visitante: 'Aviso de Chegada de Visitante',
  reclamacao: 'Reclamação / Ocorrência',
  emergencia: 'Alerta / Emergência',
  outro: 'Outro Assunto',
};

const RESIDENT_MSG_STATUS_CONFIG: Record<
  ResidentMessageStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pendente: {
    label: 'Pendente (Novo)',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
  },
  em_atendimento: {
    label: 'Em Atendimento',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
  },
  respondida: {
    label: 'Respondida',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
  },
  finalizada: {
    label: 'Finalizada',
    color: 'text-slate-400',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
  },
};

export const NoticesView: React.FC<NoticesViewProps> = ({ onTriggerWhatsApp }) => {
  const currentUser = storage.getCurrentUser();
  const condo = storage.getCondo();
  const isAdminOrDev =
    currentUser.role === 'admin' ||
    currentUser.role === 'dev' ||
    currentUser.role === 'supervisor';

  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('mural');
  const [notices, setNotices] = useState<CommunicationNotice[]>([]);
  const [templates, setTemplates] = useState<NoticeTemplate[]>([]);
  const [residentMessages, setResidentMessages] = useState<ResidentMessage[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);

  // Filtering & Search for Mural
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchMural, setSearchMural] = useState('');
  const [batchWhatsAppNotice, setBatchWhatsAppNotice] = useState<CommunicationNotice | null>(null);

  // New Notice Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('geral');
  const [priority, setPriority] = useState<NoticePriority>('media');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<'todos' | 'bloco' | 'apartamento_especifico'>('todos');
  const [targetBlockId, setTargetBlockId] = useState('');
  const [selectedAptIds, setSelectedAptIds] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState('');
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Template Manager State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoticeTemplate | null>(null);
  const [tmplName, setTmplName] = useState('');
  const [tmplCategory, setTmplCategory] = useState<NoticeCategory>('geral');
  const [tmplPriority, setTmplPriority] = useState<NoticePriority>('media');
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplContent, setTmplContent] = useState('');
  const [tmplDescription, setTmplDescription] = useState('');
  const [tmplTarget, setTmplTarget] = useState<'todos' | 'bloco' | 'apartamento_especifico'>('todos');

  // Inbox & Replies State
  const [selectedMessageForReply, setSelectedMessageForReply] = useState<ResidentMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [inboxStatusFilter, setInboxStatusFilter] = useState<string>('all');
  const [inboxCategoryFilter, setInboxCategoryFilter] = useState<string>('all');

  // Deliveries state for resident unit
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [quickDeliveryNotifySuccess, setQuickDeliveryNotifySuccess] = useState<string | null>(null);

  // Resident Portal Simulation State
  const [selectedResidentAptId, setSelectedResidentAptId] = useState<string>(
    currentUser.role === 'morador' && currentUser.apartmentId ? currentUser.apartmentId : 'apt-101a'
  );
  const [residentMsgCategory, setResidentMsgCategory] = useState<ResidentMessageCategory>('duvida');
  const [residentMsgSubject, setResidentMsgSubject] = useState('');
  const [residentMsgContent, setResidentMsgContent] = useState('');
  const [residentPortalSuccess, setResidentPortalSuccess] = useState<string | null>(null);

  const refreshData = () => {
    setNotices(storage.getNotices());
    setTemplates(storage.getNoticeTemplates());
    setResidentMessages(storage.getResidentMessages());
    setDeliveries(storage.getDeliveries());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
    setResidents(storage.getResidents());

    const user = storage.getCurrentUser();
    if (user.role === 'morador' && user.apartmentId) {
      setSelectedResidentAptId(user.apartmentId);
    }
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  // Quick Stats
  const pendingMessagesCount = useMemo(() => {
    return residentMessages.filter((m) => m.status === 'pendente').length;
  }, [residentMessages]);

  // Morador Deliveries pertinent to this resident's apartment
  const myDeliveries = useMemo(() => {
    const targetAptId = currentUser.role === 'morador' ? currentUser.apartmentId : selectedResidentAptId;
    const targetApt = apartments.find((a) => a.id === targetAptId);
    const targetUnit = targetApt?.number || currentUser.unitNumber;

    return deliveries.filter((d) => {
      if (targetAptId && d.apartmentId === targetAptId) return true;
      if (targetUnit && (d.recipientName?.includes(targetUnit) || (d as any).unitNumber === targetUnit)) return true;
      return false;
    });
  }, [deliveries, currentUser, selectedResidentAptId, apartments]);

  const myPendingDeliveries = useMemo(() => {
    return myDeliveries.filter((d) => d.status !== 'retirado' && d.status !== 'devolvido');
  }, [myDeliveries]);

  const displayedDeliveries = useMemo(() => {
    if (deliveryStatusFilter === 'pending') {
      return myDeliveries.filter((d) => d.status !== 'retirado' && d.status !== 'devolvido');
    }
    if (deliveryStatusFilter === 'delivered') {
      return myDeliveries.filter((d) => d.status === 'retirado' || d.status === 'devolvido');
    }
    return myDeliveries;
  }, [myDeliveries, deliveryStatusFilter]);

  // Filtered Notices
  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      if (filterCategory !== 'all' && n.category !== filterCategory) return false;
      if (searchMural.trim()) {
        const q = searchMural.toLowerCase();
        const match =
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.authorName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [notices, filterCategory, searchMural]);

  // Filtered Inbox Messages
  const filteredMessages = useMemo(() => {
    return residentMessages.filter((m) => {
      if (inboxStatusFilter !== 'all' && m.status !== inboxStatusFilter) return false;
      if (inboxCategoryFilter !== 'all' && m.category !== inboxCategoryFilter) return false;
      return true;
    });
  }, [residentMessages, inboxStatusFilter, inboxCategoryFilter]);

  // Resident Portal: Notices visible to the selected resident unit
  const residentVisibleNotices = useMemo(() => {
    const apt = apartments.find((a) => a.id === selectedResidentAptId);
    if (!apt) return notices;

    return notices.filter((n) => {
      if (n.targetType === 'todos') return true;
      if (n.targetType === 'bloco' && n.targetBlockId === apt.blockId) return true;
      if (n.targetType === 'apartamento_especifico' && n.targetApartmentIds?.includes(apt.id)) return true;
      return false;
    });
  }, [notices, apartments, selectedResidentAptId]);

  // Resident Portal: Messages sent by this unit
  const residentMyMessages = useMemo(() => {
    return residentMessages.filter((m) => m.apartmentId === selectedResidentAptId);
  }, [residentMessages, selectedResidentAptId]);

  // Apply a template to the notice form
  const handleApplyTemplate = (tmpl: NoticeTemplate) => {
    setTitle(tmpl.title);
    setCategory(tmpl.category);
    setPriority(tmpl.priority);
    setContent(tmpl.content);
    if (tmpl.suggestedTarget) {
      setTargetType(tmpl.suggestedTarget);
    }
    setSelectedTemplateId(tmpl.id);
    setActiveSubTab('novo_aviso');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Notice
  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Preencha título e conteúdo do comunicado.');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const user = storage.getCurrentUser();

    const isScheduled = !!scheduledFor && new Date(scheduledFor) > now;

    const newNotice: CommunicationNotice = {
      id: `not-${Date.now()}`,
      title: title.trim(),
      category,
      priority,
      content: content.trim(),
      targetType,
      targetBlockId: targetType === 'bloco' ? targetBlockId : undefined,
      targetApartmentIds: targetType === 'apartamento_especifico' ? selectedAptIds : undefined,
      scheduledFor: isScheduled ? scheduledFor : undefined,
      sentAt: isScheduled ? undefined : nowStr,
      status: isScheduled ? 'agendado' : 'enviado',
      authorName: user ? `${user.name} (${user.role})` : 'Portaria Central',
      sendViaWhatsApp,
      readCount: isScheduled ? 0 : 1,
      acknowledgedByResidentIds: [],
    };

    storage.saveNotice(newNotice);
    setFormSuccessMessage(`Comunicado "${newNotice.title}" publicado com sucesso!`);

    // Reset Form
    setTitle('');
    setContent('');
    setCategory('geral');
    setPriority('media');
    setTargetType('todos');
    setSelectedAptIds([]);
    setScheduledFor('');
    setSelectedTemplateId('');

    if (sendViaWhatsApp && !isScheduled) {
      setBatchWhatsAppNotice(newNotice);
    }
  };

  const handleDeleteNotice = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este comunicado?')) {
      storage.deleteNotice(id);
    }
  };

  // Reply to Resident Message
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessageForReply || !replyText.trim()) return;

    storage.replyResidentMessage(
      selectedMessageForReply.id,
      replyText.trim(),
      currentUser.name,
      currentUser.role
    );

    // Refresh selected message
    const updated = storage.getResidentMessages().find((m) => m.id === selectedMessageForReply.id);
    if (updated) setSelectedMessageForReply(updated);
    setReplyText('');
  };

  // Mark message status
  const handleUpdateMessageStatus = (msgId: string, status: ResidentMessageStatus) => {
    storage.updateResidentMessageStatus(msgId, status);
    if (selectedMessageForReply && selectedMessageForReply.id === msgId) {
      const updated = storage.getResidentMessages().find((m) => m.id === msgId);
      if (updated) setSelectedMessageForReply(updated);
    }
  };

  // Resident submits message to portaria
  const handleResidentSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentMsgSubject.trim() || !residentMsgContent.trim()) {
      alert('Preencha assunto e mensagem.');
      return;
    }

    const isMorador = currentUser.role === 'morador';
    const effectiveAptId = isMorador && currentUser.apartmentId ? currentUser.apartmentId : selectedResidentAptId;
    const apt = apartments.find((a) => a.id === effectiveAptId);
    const block = blocks.find((b) => b.id === apt?.blockId) || {
      id: currentUser.blockId || '',
      name: currentUser.blockName || 'Torre Principal',
      identification: '',
      aptsCount: 0,
      active: true,
    };
    const resident = isMorador
      ? {
          id: currentUser.residentId || currentUser.id,
          name: currentUser.name,
          phone: currentUser.phone || '(11) 99999-0000',
        }
      : residents.find((r) => r.apartmentId === effectiveAptId) || {
          id: `res-gen-${Date.now()}`,
          name: `Morador Apt ${apt?.number || ''}`,
          phone: '(11) 99999-0000',
        };

    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const protocol = `FAP-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newMsg: ResidentMessage = {
      id: `msg-${Date.now()}`,
      protocolNumber: protocol,
      condoId: condo.id,
      apartmentId: effectiveAptId,
      apartmentNumber: apt?.number || currentUser.unitNumber || '---',
      blockId: block?.id || '',
      blockName: block?.name || block?.identification || 'Torre Principal',
      residentId: resident.id,
      residentName: resident.name,
      residentPhone: resident.phone,
      category: residentMsgCategory,
      subject: residentMsgSubject.trim(),
      content: residentMsgContent.trim(),
      status: 'pendente',
      createdAt: nowStr,
      replies: [],
    };

    storage.saveResidentMessage(newMsg);
    setResidentPortalSuccess(`Mensagem enviada com sucesso! Protocolo gerado: ${protocol}`);
    setResidentMsgSubject('');
    setResidentMsgContent('');
  };

  // Quick delivery pickup notification
  const handleNotifyPickup = (del: DeliveryItem) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const protocol = `ENC-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const apt = apartments.find((a) => a.id === del.apartmentId);
    const block = blocks.find((b) => b.id === del.blockId);

    const newMsg: ResidentMessage = {
      id: `msg-${Date.now()}`,
      protocolNumber: protocol,
      condoId: condo.id,
      apartmentId: del.apartmentId,
      apartmentNumber: apt?.number || currentUser.unitNumber || '---',
      blockId: del.blockId,
      blockName: block?.name || currentUser.blockName || 'Torre Principal',
      residentId: currentUser.residentId || currentUser.id,
      residentName: currentUser.name,
      residentPhone: currentUser.phone || '(11) 99999-0000',
      category: 'aviso_encomenda',
      subject: `Aviso de Retirada: ${del.description || 'Encomenda'} (${del.code})`,
      content: `Olá portaria! Sou ${currentUser.name} do Apt ${currentUser.unitNumber || apt?.number}. Estou a caminho da portaria para efetuar a retirada da encomenda ${del.code}.`,
      status: 'pendente',
      createdAt: nowStr,
      replies: [],
    };

    storage.saveResidentMessage(newMsg);
    setQuickDeliveryNotifySuccess(`Aviso enviado para a portaria! Os operadores foram notificados.`);
    setTimeout(() => setQuickDeliveryNotifySuccess(null), 5000);
  };

  // Resident confirms notice reading
  const handleAcknowledgeNotice = (noticeId: string) => {
    const isMorador = currentUser.role === 'morador';
    const effectiveAptId = isMorador && currentUser.apartmentId ? currentUser.apartmentId : selectedResidentAptId;
    const resident = residents.find((r) => r.apartmentId === effectiveAptId);
    const resId = isMorador ? (currentUser.residentId || currentUser.id) : (resident ? resident.id : effectiveAptId);
    storage.acknowledgeNotice(noticeId, resId);
  };

  // Save or Edit Template
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim() || !tmplTitle.trim() || !tmplContent.trim()) return;

    const newTmpl: NoticeTemplate = {
      id: editingTemplate?.id || `tmpl-${Date.now()}`,
      name: tmplName.trim(),
      category: tmplCategory,
      priority: tmplPriority,
      title: tmplTitle.trim(),
      content: tmplContent.trim(),
      description: tmplDescription.trim(),
      suggestedTarget: tmplTarget,
    };

    storage.saveNoticeTemplate(newTmpl);
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  const getTargetLabel = (n: CommunicationNotice) => {
    if (n.targetType === 'todos') return 'Todos os Moradores (Condomínio Geral)';
    if (n.targetType === 'bloco') {
      const b = blocks.find((blk) => blk.id === n.targetBlockId);
      return b ? `Moradores da ${b.name} (${b.identification})` : 'Bloco Específico';
    }
    if (n.targetType === 'apartamento_especifico' && n.targetApartmentIds) {
      const aptNums = n.targetApartmentIds
        .map((aid) => aid.replace('apt-', '').toUpperCase())
        .join(', ');
      return `Apartamento(s): ${aptNums}`;
    }
    return 'Geral';
  };

  const getTargetedResidents = (notice: CommunicationNotice) => {
    return residents.filter((r) => {
      if (notice.targetType === 'todos') return true;
      if (notice.targetType === 'bloco' && r.blockId === notice.targetBlockId) return true;
      if (
        notice.targetType === 'apartamento_especifico' &&
        notice.targetApartmentIds?.includes(r.apartmentId)
      ) {
        return true;
      }
      return false;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {currentUser.role === 'morador' ? 'Avisos & Encomendas do Apartamento' : 'Mural de Comunicação & Mensagens'}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentUser.role === 'morador' ? `Apt ${currentUser.unitNumber || '101'}` : 'Portaria & Moradores'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentUser.role === 'morador'
                ? `Comunicados do condomínio, notificações de encomendas e canal direto com a portaria para o Apt ${currentUser.unitNumber || '101'} (${currentUser.blockName || 'Torre Principal'})`
                : 'Envio de avisos gerais ou segmentados, modelos prontos e canal bidirecional com os apartamentos'}
            </p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2">
          {currentUser.role === 'morador' ? (
            <>
              <button
                onClick={() => setActiveSubTab('encomendas')}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Minhas Encomendas</span>
                {myPendingDeliveries.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950 animate-pulse">
                    {myPendingDeliveries.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveSubTab('portal_morador')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Fale com a Portaria</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveSubTab('novo_aviso')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Comunicado</span>
              </button>

              <button
                onClick={() => setActiveSubTab('portal_morador')}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-colors"
                title="Ver como os moradores enxergam os avisos e enviam mensagens"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Visão do Morador</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{currentUser.role === 'morador' ? 'Avisos para Você' : 'Comunicados Publicados'}</span>
            <Megaphone className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {currentUser.role === 'morador' ? residentVisibleNotices.length : notices.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {currentUser.role === 'morador' ? 'Mural & comunicados' : 'No mural do condomínio'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{currentUser.role === 'morador' ? 'Encomendas Pendentes' : 'Mensagens de Moradores'}</span>
            {currentUser.role === 'morador' ? (
              <Package className="w-4 h-4 text-amber-400" />
            ) : (
              <MessageSquare className="w-4 h-4 text-sky-400" />
            )}
          </div>
          <div className={`text-xl font-bold ${currentUser.role === 'morador' ? 'text-amber-400' : 'text-sky-400'}`}>
            {currentUser.role === 'morador' ? myPendingDeliveries.length : residentMessages.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {currentUser.role === 'morador' ? 'Aguardando na portaria' : 'Enviadas à portaria'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{currentUser.role === 'morador' ? 'Mensagens com a Portaria' : 'Mensagens Pendentes'}</span>
            <Inbox className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-400">
            {currentUser.role === 'morador' ? residentMyMessages.length : pendingMessagesCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {currentUser.role === 'morador' ? 'Enviadas e respondidas' : 'Aguardando atendimento'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{currentUser.role === 'morador' ? 'Sua Unidade' : 'Modelos Prontos'}</span>
            {currentUser.role === 'morador' ? (
              <Building className="w-4 h-4 text-purple-400" />
            ) : (
              <Bookmark className="w-4 h-4 text-purple-400" />
            )}
          </div>
          <div className="text-sm font-bold text-white truncate">
            {currentUser.role === 'morador'
              ? `Apt ${currentUser.unitNumber || '101'}`
              : templates.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {currentUser.role === 'morador'
              ? currentUser.blockName || 'Torre Principal'
              : 'Manutenções, reuniões, regras'}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('mural')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'mural'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>
            {currentUser.role === 'morador'
              ? `Mural & Assuntos Internos (${residentVisibleNotices.length})`
              : `Mural de Avisos (${notices.length})`}
          </span>
        </button>

        {currentUser.role === 'morador' ? (
          <>
            <button
              onClick={() => setActiveSubTab('encomendas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative cursor-pointer ${
                activeSubTab === 'encomendas'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Avisos de Encomendas</span>
              {myPendingDeliveries.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950 animate-pulse">
                  {myPendingDeliveries.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('portal_morador')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative cursor-pointer ${
                activeSubTab === 'portal_morador'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Fale com a Portaria</span>
              {residentMyMessages.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {residentMyMessages.length}
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveSubTab('novo_aviso')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'novo_aviso'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Novo Comunicado</span>
            </button>

            <button
              onClick={() => setActiveSubTab('inbox_portaria')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative cursor-pointer ${
                activeSubTab === 'inbox_portaria'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Fale com a Portaria (Inbox)</span>
              {pendingMessagesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950">
                  {pendingMessagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('templates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'templates'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Modelos de Mensagens ({templates.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('portal_morador')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'portal_morador'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Portal do Morador</span>
            </button>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: MURAL DE AVISOS & COMUNICADOS                  */}
      {/* ========================================================= */}
      {activeSubTab === 'mural' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar comunicado por título ou palavra-chave..."
                value={searchMural}
                onChange={(e) => setSearchMural(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="all">Todas as Categorias ({notices.length})</option>
                <option value="geral">Avisos Gerais</option>
                <option value="manutencao">Manutenções Prediais</option>
                <option value="seguranca">Alertas de Segurança</option>
                <option value="evento">Eventos & Assembleias</option>
                <option value="urgencia">Urgências</option>
              </select>

              <button
                onClick={() => setActiveSubTab('templates')}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors whitespace-nowrap"
              >
                <Bookmark className="w-3.5 h-3.5 text-purple-400" />
                <span>Usar Modelo</span>
              </button>
            </div>
          </div>

          {/* Grid of Notices */}
          {filteredNotices.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <Megaphone className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">Nenhum comunicado encontrado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Não há avisos publicados nesta categoria ou para a busca realizada.
              </p>
              <button
                onClick={() => setActiveSubTab('novo_aviso')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl"
              >
                Criar Primeiro Comunicado
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotices.map((n) => {
                const catCfg = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.geral;
                const CatIcon = catCfg.icon;
                const targeted = getTargetedResidents(n);

                return (
                  <div
                    key={n.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div>
                      {/* Top Bar: Category & Priority */}
                      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}
                          >
                            <CatIcon className="w-3 h-3" />
                            {catCfg.label}
                          </span>

                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                              n.priority === 'urgente'
                                ? 'bg-rose-600 text-white'
                                : n.priority === 'alta'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'text-slate-400 bg-slate-800'
                            }`}
                          >
                            Prioridade {n.priority}
                          </span>
                        </div>

                        {isAdminOrDev && (
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                            title="Excluir comunicado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white mb-2 leading-snug">
                        {n.title}
                      </h3>

                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-3">
                        {n.content}
                      </p>

                      {/* Recipient Segment Metadata */}
                      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 space-y-1.5">
                        <p className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            Destinatários:{' '}
                            <strong className="text-slate-200">{getTargetLabel(n)}</strong> ({targeted.length} cadastrados)
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>
                            {n.status === 'agendado' ? (
                              <span className="text-amber-300 font-semibold">
                                Agendado para envio em: {n.scheduledFor}
                              </span>
                            ) : (
                              <span>Publicado em: {n.sentAt} por {n.authorName}</span>
                            )}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Visualizado por {n.readCount || 0} moradores</span>
                      </span>

                      <button
                        onClick={() => setBatchWhatsAppNotice(n)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/60 rounded-xl transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Disparar WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: NOVO COMUNICADO (COM MODELOS PRONTOS)         */}
      {/* ========================================================= */}
      {activeSubTab === 'novo_aviso' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Criar Novo Comunicado / Mensagem</h2>
                <p className="text-xs text-slate-400">
                  Transmita avisos para todo o condomínio, por bloco ou para apartamentos específicos
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveSubTab('templates')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 text-purple-400" />
              <span>Ver Modelos Prontos</span>
            </button>
          </div>

          {formSuccessMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{formSuccessMessage}</span>
              </div>
              <button
                onClick={() => setActiveSubTab('mural')}
                className="underline font-semibold hover:text-white"
              >
                Ver no Mural
              </button>
            </div>
          )}

          {/* Quick Template Picker Bar */}
          <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Modelos Rápidos Pré-configurados (Clique para Preencher):
              </label>
              <span className="text-[10px] text-slate-400">Economize tempo em avisos recorrentes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.slice(0, 6).map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedTemplateId === tmpl.id
                      ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateNotice} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Título do Comunicado *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Interrupção temporária de água para manutenção"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Categoria do Aviso *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NoticeCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="geral">Aviso Geral</option>
                  <option value="manutencao">Manutenção Predial</option>
                  <option value="seguranca">Alerta de Segurança</option>
                  <option value="evento">Evento / Convocação</option>
                  <option value="urgencia">Urgência / Emergência</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nível de Prioridade *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as NoticePriority)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média (Padrão)</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            {/* Target Audience Segmentation */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Destinatários da Mensagem *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                <button
                  type="button"
                  onClick={() => setTargetType('todos')}
                  className={`py-2 px-3 rounded-xl border text-center transition-colors text-xs font-semibold ${
                    targetType === 'todos'
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Todos os Moradores (Geral)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('bloco')}
                  className={`py-2 px-3 rounded-xl border text-center transition-colors text-xs font-semibold ${
                    targetType === 'bloco'
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Por Bloco / Torre
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('apartamento_especifico')}
                  className={`py-2 px-3 rounded-xl border text-center transition-colors text-xs font-semibold ${
                    targetType === 'apartamento_especifico'
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Apartamento(s) Específico(s)
                </button>
              </div>

              {targetType === 'bloco' && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Selecione o Bloco / Torre Destinatário:
                  </label>
                  <select
                    value={targetBlockId}
                    onChange={(e) => setTargetBlockId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="">Selecione o Bloco...</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.identification})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'apartamento_especifico' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-400">
                      Clique nos apartamentos que devem receber este comunicado:
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      {selectedAptIds.length} selecionado(s)
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 max-h-44 overflow-y-auto grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {apartments.map((apt) => {
                      const isSel = selectedAptIds.includes(apt.id);
                      return (
                        <button
                          key={apt.id}
                          type="button"
                          onClick={() => {
                            if (isSel) setSelectedAptIds(selectedAptIds.filter((x) => x !== apt.id));
                            else setSelectedAptIds([...selectedAptIds, apt.id]);
                          }}
                          className={`p-2 text-center text-xs rounded-lg border transition-colors ${
                            isSel
                              ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          Apt {apt.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Message Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Conteúdo da Mensagem *
                </label>
                <span className="text-[10px] text-slate-500">
                  Você pode usar tags como [DATA], [HORARIO], [APARTAMENTO]
                </span>
              </div>
              <textarea
                rows={5}
                required
                placeholder="Descreva as orientações, horários e recomendações aos condôminos..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Future Scheduling & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Agendar Envio Futuro (Opcional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">Deixe em branco para publicar imediatamente.</p>
              </div>

              <div className="flex items-center gap-3 pt-4 sm:pt-6">
                <input
                  type="checkbox"
                  id="chk-wa-form"
                  checked={sendViaWhatsApp}
                  onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <label htmlFor="chk-wa-form" className="text-xs text-slate-300 cursor-pointer select-none">
                  Habilitar botão de disparo automático via WhatsApp
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('mural')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
              >
                Voltar ao Mural
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publicar Comunicado</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: FALE COM A PORTARIA / CAIXA DE ENTRADA (INBOX) */}
      {/* ========================================================= */}
      {activeSubTab === 'inbox_portaria' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-emerald-400" />
                Caixa de Entrada: Mensagens Recebidas dos Moradores
              </h2>
              <p className="text-xs text-slate-400">
                Responda dúvidas, solicitações de carga e avisos de visitas enviados pelas unidades
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={inboxStatusFilter}
                onChange={(e) => setInboxStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="all">Todos os Status ({residentMessages.length})</option>
                <option value="pendente">Pendentes</option>
                <option value="em_atendimento">Em Atendimento</option>
                <option value="respondida">Respondidas</option>
                <option value="finalizada">Finalizadas</option>
              </select>

              <select
                value={inboxCategoryFilter}
                onChange={(e) => setInboxCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="all">Todas as Categorias</option>
                {Object.entries(RESIDENT_MSG_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Messages List (5 cols on desktop) */}
            <div className="lg:col-span-5 space-y-2.5">
              {filteredMessages.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                  Nenhuma mensagem encontrada para os filtros selecionados.
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isSelected = selectedMessageForReply?.id === msg.id;
                  const statusCfg = RESIDENT_MSG_STATUS_CONFIG[msg.status] || RESIDENT_MSG_STATUS_CONFIG.pendente;

                  return (
                    <div
                      key={msg.id}
                      onClick={() => {
                        setSelectedMessageForReply(msg);
                        setReplyText('');
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-850 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[10px] font-bold text-amber-400">
                          {msg.protocolNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mb-0.5 line-clamp-1">
                        {msg.subject}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                        {msg.content}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
                        <span className="font-semibold text-slate-300">
                          Apt {msg.apartmentNumber} ({msg.residentName})
                        </span>
                        <span>{msg.createdAt}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Conversation Thread & Quick Response Panel (7 cols on desktop) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[460px]">
              {selectedMessageForReply ? (
                <div className="flex flex-col h-full justify-between space-y-4">
                  <div>
                    {/* Header with status changer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            {selectedMessageForReply.protocolNumber}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {RESIDENT_MSG_CATEGORY_LABELS[selectedMessageForReply.category]}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-0.5">
                          {selectedMessageForReply.subject}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Morador: <strong className="text-slate-200">{selectedMessageForReply.residentName}</strong> (Apt {selectedMessageForReply.apartmentNumber} - {selectedMessageForReply.blockName}) · Tel: {selectedMessageForReply.residentPhone || 'Sem telefone'}
                        </p>
                      </div>

                      {/* Status select */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-slate-400">Status:</span>
                        <select
                          value={selectedMessageForReply.status}
                          onChange={(e) =>
                            handleUpdateMessageStatus(
                              selectedMessageForReply.id,
                              e.target.value as ResidentMessageStatus
                            )
                          }
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_atendimento">Em Atendimento</option>
                          <option value="respondida">Respondida</option>
                          <option value="finalizada">Finalizada</option>
                        </select>
                      </div>
                    </div>

                    {/* Chat Bubble Thread */}
                    <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {/* Resident Initial Message */}
                      <div className="flex flex-col items-start">
                        <div className="max-w-[85%] bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-sm p-3.5 text-xs text-slate-200">
                          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 mb-1 pb-1 border-b border-slate-800/80">
                            <span className="font-bold text-emerald-400">
                              {selectedMessageForReply.residentName} (Apt {selectedMessageForReply.apartmentNumber})
                            </span>
                            <span>{selectedMessageForReply.createdAt}</span>
                          </div>
                          <p className="whitespace-pre-line leading-relaxed">
                            {selectedMessageForReply.content}
                          </p>
                        </div>
                      </div>

                      {/* Replies */}
                      {selectedMessageForReply.replies.map((rep) => {
                        const isPortaria = rep.senderRole === 'porteiro' || rep.senderRole === 'admin';
                        return (
                          <div
                            key={rep.id}
                            className={`flex flex-col ${isPortaria ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[85%] p-3.5 rounded-2xl text-xs ${
                                isPortaria
                                  ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-100 rounded-tr-sm'
                                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-1 pb-1 border-b border-white/10">
                                <span className="font-bold">
                                  {rep.senderName} ({rep.senderRole.toUpperCase()})
                                </span>
                                <span>{rep.createdAt}</span>
                              </div>
                              <p className="whitespace-pre-line leading-relaxed">{rep.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reply Input Form */}
                  <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      Enviar Resposta da Portaria:
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Digite a orientação ou resposta oficial para o morador..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                        required
                      />
                      <button
                        type="submit"
                        className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Responder</span>
                      </button>
                    </div>

                    {/* Quick WhatsApp Share of the Thread */}
                    {selectedMessageForReply.residentPhone && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          Notificar também no WhatsApp cadastrado ({selectedMessageForReply.residentPhone})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const condo = storage.getCondo();
                            const lastReply = selectedMessageForReply.replies[selectedMessageForReply.replies.length - 1];
                            const repContent = lastReply ? lastReply.content : replyText;
                            const msg = `🏢 *PORTARIA - ${condo.name}*\n\nOlá *${selectedMessageForReply.residentName}* (Apt ${selectedMessageForReply.apartmentNumber}),\n\nReferente ao chamado *${selectedMessageForReply.protocolNumber}* ("${selectedMessageForReply.subject}"):\n\n${repContent}\n\n_Qualquer dúvida, responda por este canal ou contate a portaria._`;
                            openWhatsAppLink(selectedMessageForReply.residentPhone || '', msg);
                          }}
                          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Enviar Resposta no WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400 text-xs">
                  <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="font-semibold text-white">Nenhuma mensagem selecionada</p>
                  <p className="max-w-xs text-slate-400 mt-1">
                    Selecione um comunicado na lista ao lado para ler a solicitação completa e responder ao morador.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: MODELOS DE MENSAGENS (TEMPLATES CATALOG)       */}
      {/* ========================================================= */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-purple-400" />
                Modelos de Comunicados Frequentes
              </h2>
              <p className="text-xs text-slate-400">
                Textos padrão para manutenções, assembleias, vagas de garagem e regras condominiais
              </p>
            </div>

            <button
              onClick={() => {
                setEditingTemplate(null);
                setTmplName('');
                setTmplTitle('');
                setTmplContent('');
                setTmplDescription('');
                setTmplCategory('geral');
                setTmplPriority('media');
                setIsTemplateModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Modelo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => {
              const catCfg = CATEGORY_CONFIG[tmpl.category] || CATEGORY_CONFIG.geral;
              const CatIcon = catCfg.icon;

              return (
                <div
                  key={tmpl.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}
                      >
                        <CatIcon className="w-3 h-3" />
                        {catCfg.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {tmpl.priority}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1">{tmpl.name}</h3>
                    <p className="text-xs text-slate-400 mb-3">{tmpl.description}</p>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 font-mono line-clamp-4 leading-relaxed mb-4">
                      {tmpl.content}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setEditingTemplate(tmpl);
                        setTmplName(tmpl.name);
                        setTmplTitle(tmpl.title);
                        setTmplContent(tmpl.content);
                        setTmplDescription(tmpl.description);
                        setTmplCategory(tmpl.category);
                        setTmplPriority(tmpl.priority);
                        setIsTemplateModalOpen(true);
                      }}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow flex items-center gap-1.5"
                    >
                      <span>Usar este Modelo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 5: PORTAL DO MORADOR (VISÃO & ENVIO DO CONDÔMINO) */}
      {/* ========================================================= */}
      {activeSubTab === 'portal_morador' && (
        <div className="space-y-6">
          {/* Unit Selector Bar for Simulation (ou Banner de Identificação para Morador) */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {currentUser.role === 'morador' ? 'Fale com a Portaria & Suas Mensagens' : 'Ambiente do Condômino (App do Morador)'}
                </h3>
                <p className="text-xs text-slate-400">
                  {currentUser.role === 'morador'
                    ? `Envie recados, esclarecimento de dúvidas e solicitações para a guarita da sua unidade`
                    : 'Simule a experiência do morador lendo avisos e enviando mensagens de volta para a portaria'}
                </p>
              </div>
            </div>

            {currentUser.role === 'morador' ? (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-semibold shadow-inner">
                <Building className="w-4 h-4 text-emerald-400" />
                <span>Apt {currentUser.unitNumber || '101'} · {currentUser.blockName || 'Torre Principal'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">Unidade Selecionada:</span>
                <select
                  value={selectedResidentAptId}
                  onChange={(e) => setSelectedResidentAptId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  {apartments.map((apt) => {
                    const res = residents.find((r) => r.apartmentId === apt.id);
                    return (
                      <option key={apt.id} value={apt.id}>
                        Apt {apt.number} - {res ? res.name : 'Morador'}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Notices Directed to this Apartment (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-400" />
                Avisos do Condomínio para Sua Unidade ({residentVisibleNotices.length})
              </h3>

              {residentVisibleNotices.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                  Nenhum aviso direcionado para sua unidade no momento.
                </div>
              ) : (
                residentVisibleNotices.map((n) => {
                  const catCfg = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.geral;
                  const resident = residents.find((r) => r.apartmentId === selectedResidentAptId);
                  const isAck = (n.acknowledgedByResidentIds || []).includes(resident?.id || selectedResidentAptId);

                  return (
                    <div
                      key={n.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}
                        >
                          {catCfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{n.sentAt}</span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{n.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                        {n.content}
                      </p>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          Origem: {n.authorName}
                        </span>

                        {isAck ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Leitura Confirmada</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcknowledgeNotice(n.id)}
                            className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirmar Leitura</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Send Message Back to Portaria + Message History (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  Fale com a Portaria / Enviar Mensagem
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Envie recados, avisos de encomendas esperadas ou solicitações diretamente para os porteiros
                </p>

                {residentPortalSuccess && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{residentPortalSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleResidentSubmitMessage} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Tipo de Assunto *
                    </label>
                    <select
                      value={residentMsgCategory}
                      onChange={(e) =>
                        setResidentMsgCategory(e.target.value as ResidentMessageCategory)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {Object.entries(RESIDENT_MSG_CATEGORY_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Assunto Breve *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Entrega de remédios às 15h / Vaga de garagem"
                      value={residentMsgSubject}
                      onChange={(e) => setResidentMsgSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Mensagem para a Portaria *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Descreva com detalhes para o porteiro de plantão..."
                      value={residentMsgContent}
                      onChange={(e) => setResidentMsgContent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar para a Portaria</span>
                  </button>
                </form>
              </div>

              {/* History of messages sent by this unit */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Suas Mensagens Enviadas ({residentMyMessages.length})
                </h4>

                {residentMyMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    Nenhuma mensagem enviada por esta unidade ainda.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {residentMyMessages.map((m) => {
                      const st = RESIDENT_MSG_STATUS_CONFIG[m.status];
                      return (
                        <div key={m.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] text-amber-400 font-bold">
                              {m.protocolNumber}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${st.bg} ${st.color} ${st.border}`}
                            >
                              {st.label}
                            </span>
                          </div>
                          <p className="font-semibold text-white">{m.subject}</p>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{m.content}</p>

                          {m.replies.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-800/80 bg-slate-900/60 p-2 rounded-lg">
                              <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">
                                Resposta da Portaria ({m.replies[m.replies.length - 1].senderName}):
                              </span>
                              <p className="text-[11px] text-slate-300 italic">
                                "{m.replies[m.replies.length - 1].content}"
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 6: AVISOS DE ENCOMENDAS PERTINENTES AO APARTAMENTO */}
      {/* ========================================================= */}
      {activeSubTab === 'encomendas' && (
        <div className="space-y-5">
          {/* Status banner */}
          {myPendingDeliveries.length > 0 ? (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Package className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Você tem {myPendingDeliveries.length} encomenda(s) aguardando retirada na portaria!</span>
                    <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                      Pendente
                    </span>
                  </h3>
                  <p className="text-xs text-amber-300/80 mt-0.5">
                    Apresente seu documento ou informe sua unidade na guarita para retirar seu pacote.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (myPendingDeliveries[0]) handleNotifyPickup(myPendingDeliveries[0]);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Avisar que vou retirar</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 text-slate-300">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Sem encomendas pendentes</h4>
                <p className="text-xs text-slate-400">
                  Todas as correspondências e pacotes entregues na portaria para o Apt <strong>{currentUser.unitNumber || '101'}</strong> já foram retirados.
                </p>
              </div>
            </div>
          )}

          {quickDeliveryNotifySuccess && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{quickDeliveryNotifySuccess}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs shadow-md">
            <span className="font-semibold text-slate-300 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <span>Entregas registradas para sua unidade ({myDeliveries.length})</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeliveryStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  deliveryStatusFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
              >
                Todas ({myDeliveries.length})
              </button>
              <button
                onClick={() => setDeliveryStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  deliveryStatusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
              >
                Aguardando ({myPendingDeliveries.length})
              </button>
              <button
                onClick={() => setDeliveryStatusFilter('delivered')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  deliveryStatusFilter === 'delivered'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
              >
                Retiradas ({myDeliveries.length - myPendingDeliveries.length})
              </button>
            </div>
          </div>

          {/* Deliveries Grid */}
          {displayedDeliveries.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-white">Nenhuma encomenda encontrada</p>
              <p className="text-slate-400 mt-1">Não há registros de entregas para o filtro selecionado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedDeliveries.map((del) => {
                const isPending = del.status !== 'retirado' && del.status !== 'devolvido';

                return (
                  <div
                    key={del.id}
                    className={`bg-slate-900 border rounded-2xl p-4 shadow-md transition-all flex flex-col justify-between ${
                      isPending
                        ? 'border-amber-500/50 bg-gradient-to-br from-slate-900 to-amber-950/20 shadow-amber-950/30'
                        : 'border-slate-800 opacity-85'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPending
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {isPending ? 'Aguardando Retirada' : 'Entregue / Retirada'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 truncate">
                            {del.code}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400 shrink-0">
                          {del.receivedAt}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        {del.photoUrl ? (
                          <div
                            onClick={() => setSelectedPhotoPreview(del.photoUrl || null)}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0 cursor-pointer relative group"
                            title="Clique para ampliar a foto tirada na portaria"
                          >
                            <img
                              src={del.photoUrl}
                              alt="Foto da encomenda"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-600 shrink-0">
                            <Package className="w-6 h-6 text-slate-600" />
                            <span className="text-[8px] text-slate-500 mt-0.5">Sem foto</span>
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="text-sm font-bold text-white line-clamp-1">
                            {del.description}
                          </h4>
                          <p className="text-xs text-slate-300 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-semibold text-emerald-400">{del.carrier || 'Correios / Entrega'}</span>
                            {del.trackingCode && (
                              <span className="text-slate-400 text-[10px] font-mono">
                                ({del.trackingCode})
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Destinatário: <strong className="text-slate-200">{del.recipientName}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-0.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span>Local na Portaria:</span>
                          <strong className="text-slate-200 font-medium">{del.storageLocation || 'Armário de Encomendas'}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Recebido por:</span>
                          <span className="text-slate-300">{del.operatorName}</span>
                        </div>
                        {!isPending && del.pickedUpAt && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-emerald-400 font-medium">
                            <span>Retirado em:</span>
                            <span>{del.pickedUpAt} {del.pickedUpBy ? `por ${del.pickedUpBy}` : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleNotifyPickup(del)}
                          className="flex-1 py-1.5 px-3 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-slate-950 font-bold text-xs rounded-xl border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Avisar que vou retirar</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Ampliar Foto da Encomenda */}
      {selectedPhotoPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                Foto da Encomenda Registrada na Portaria
              </span>
              <button
                onClick={() => setSelectedPhotoPreview(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={selectedPhotoPreview}
                alt="Foto ampliada da encomenda"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedPhotoPreview(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BATCH WHATSAPP DISPATCHER                          */}
      {/* ========================================================= */}
      {batchWhatsAppNotice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Disparar Comunicado via WhatsApp</h3>
              </div>
              <button
                onClick={() => setBatchWhatsAppNotice(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3.5 text-emerald-300 leading-relaxed">
                <strong className="block text-white mb-1 font-bold">{batchWhatsAppNotice.title}</strong>
                <p className="whitespace-pre-line text-xs">{batchWhatsAppNotice.content}</p>
              </div>

              <div>
                <p className="text-slate-300 font-bold mb-2">
                  Moradores Destinatários ({getTargetedResidents(batchWhatsAppNotice).length})
                </p>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
                  {getTargetedResidents(batchWhatsAppNotice).map((r) => {
                    const aptNum = r.apartmentId.replace('apt-', '').toUpperCase();
                    return (
                      <div
                        key={r.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-900 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-white">{r.name}</p>
                          <p className="text-[11px] text-slate-400">Apt {aptNum} · Tel: {r.phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `📢 *COMUNICADO DA PORTARIA - ${condo.name}*\n\n*${batchWhatsAppNotice.title}*\n\n${batchWhatsAppNotice.content}\n\n_Para dúvidas ou orientações, contate a portaria ou administração._`;
                            if (onTriggerWhatsApp) {
                              onTriggerWhatsApp({
                                phone: r.phone,
                                residentName: r.name,
                                apartmentNumber: aptNum,
                                customMessage: msg,
                              });
                            } else {
                              openWhatsAppLink(r.phone, msg);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 text-right">
              <button
                type="button"
                onClick={() => setBatchWhatsAppNotice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT NOTICE TEMPLATE (ADMIN)              */}
      {/* ========================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTemplate}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-purple-400" />
                {editingTemplate ? 'Editar Modelo de Mensagem' : 'Cadastrar Novo Modelo de Mensagem'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome Identificador do Modelo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Manutenção de Portão Automático"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria *</label>
                  <select
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value as NoticeCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="geral">Aviso Geral</option>
                    <option value="manutencao">Manutenção Predial</option>
                    <option value="seguranca">Alerta de Segurança</option>
                    <option value="evento">Evento / Convocação</option>
                    <option value="urgencia">Urgência</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prioridade *</label>
                  <select
                    value={tmplPriority}
                    onChange={(e) => setTmplPriority(e.target.value as NoticePriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Título Sugerido do Comunicado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Interrupção Temporária de Portão de Garagem"
                  value={tmplTitle}
                  onChange={(e) => setTmplTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Texto Padrão do Modelo *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Prezados condôminos, informamos que no dia [DATA]..."
                  value={tmplContent}
                  onChange={(e) => setTmplContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Breve Descrição para o Operador
                </label>
                <input
                  type="text"
                  placeholder="Ex: Utilizar sempre que o motor do portão precisar de revisão técnica"
                  value={tmplDescription}
                  onChange={(e) => setTmplDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow"
              >
                Salvar Modelo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

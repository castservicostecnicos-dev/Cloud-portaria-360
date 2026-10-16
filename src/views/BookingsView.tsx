import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  Printer,
  Share2,
  Settings,
  Building2,
  User,
  Users,
  DollarSign,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Flame,
  Coffee,
  Sparkles,
  Trophy,
  Tv,
  CheckSquare,
  Square,
  Send,
  Download,
  Eye,
  Trash2,
  Edit3,
  QrCode,
  Shield,
  Layers,
  Check,
} from 'lucide-react';
import { storage } from '../services/storage';
import {
  CommonArea,
  AreaBooking,
  BookingStatus,
  CommonAreaType,
  BookingTimeSlot,
  CommonAreaRule,
  Resident,
  Apartment,
  Block,
} from '../types';
import { WhatsAppPayload } from '../services/whatsapp';

interface BookingsViewProps {
  onTriggerWhatsApp?: (payload: WhatsAppPayload) => void;
}

type SubTab = 'explore' | 'new_booking' | 'manage' | 'rules';

const AREA_TYPE_ICONS: Record<CommonAreaType, any> = {
  salao_festas: Sparkles,
  churrasqueira: Flame,
  espaco_gourmet: Coffee,
  quadra: Trophy,
  piscina: Flame,
  salao_jogos: Tv,
  academia: Trophy,
  coworking: Building2,
  cinema: Tv,
  outro: Layers,
};

const AREA_TYPE_LABELS: Record<CommonAreaType, string> = {
  salao_festas: 'Salão de Festas',
  churrasqueira: 'Churrasqueira & Gourmet',
  espaco_gourmet: 'Espaço Gourmet',
  quadra: 'Quadra Poliesportiva',
  piscina: 'Complexo Aquático',
  salao_jogos: 'Salão de Jogos',
  academia: 'Academia & Fitness',
  coworking: 'Coworking / Home Office',
  cinema: 'Espaço Cinema',
  outro: 'Outro Espaço',
};

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; border: string; bg: string; icon: any }
> = {
  confirmada: {
    label: 'Confirmada',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    icon: CheckCircle2,
  },
  pendente_aprovacao: {
    label: 'Pendente de Aprovação',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    icon: Clock,
  },
  realizada: {
    label: 'Realizada (Finalizada)',
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
    icon: CheckSquare,
  },
  cancelada: {
    label: 'Cancelada',
    color: 'text-slate-400',
    border: 'border-slate-700',
    bg: 'bg-slate-800/40',
    icon: XCircle,
  },
  rejeitada: {
    label: 'Rejeitada',
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    icon: AlertTriangle,
  },
};

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

export const BookingsView: React.FC<BookingsViewProps> = ({ onTriggerWhatsApp }) => {
  const currentUser = storage.getCurrentUser();
  const condo = storage.getCondo();
  const isAdminOrDev =
    currentUser.role === 'admin' ||
    currentUser.role === 'dev' ||
    currentUser.role === 'supervisor';

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('explore');
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [bookings, setBookings] = useState<AreaBooking[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  // Calendar state for 'explore' tab
  const [selectedCalendarAreaId, setSelectedCalendarAreaId] = useState<string>('');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedDayString, setSelectedDayString] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  // Modals state
  const [viewingVoucherBooking, setViewingVoucherBooking] = useState<AreaBooking | null>(null);
  const [approvalModalBooking, setApprovalModalBooking] = useState<AreaBooking | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionModalBooking, setRejectionModalBooking] = useState<AreaBooking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [inspectionModalBooking, setInspectionModalBooking] = useState<AreaBooking | null>(null);
  const [inspectionPassed, setInspectionPassed] = useState(true);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [createOccurrenceFromInspection, setCreateOccurrenceFromInspection] = useState(false);
  const [cancellationModalBooking, setCancellationModalBooking] = useState<AreaBooking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Area Configuration Modal (Admin)
  const [editingArea, setEditingArea] = useState<CommonArea | null>(null);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);

  // New Booking Form State
  const [formAreaId, setFormAreaId] = useState('');
  const [formDate, setFormDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  });
  const [formSlotId, setFormSlotId] = useState('');
  const [formAptId, setFormAptId] = useState('');
  const [formResidentId, setFormResidentId] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formGuestsCount, setFormGuestsCount] = useState<number>(10);
  const [formGuestListNotes, setFormGuestListNotes] = useState('');
  const [formTermsAccepted, setFormTermsAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Load Data
  const loadData = () => {
    const areas = storage.getCommonAreas();
    const bks = storage.getBookings();
    setCommonAreas(areas);
    setBookings(bks);
    setApartments(storage.getApartments());
    setResidents(storage.getResidents());
    setBlocks(storage.getBlocks());

    if (!selectedCalendarAreaId && areas.length > 0) {
      setSelectedCalendarAreaId(areas[0].id);
    }
    if (!formAreaId && areas.length > 0) {
      setFormAreaId(areas[0].id);
    }
    if (currentUser.role === 'morador' && currentUser.apartmentId) {
      setFormAptId(currentUser.apartmentId);
      if (currentUser.residentId) {
        setFormResidentId(currentUser.residentId);
      }
    }
  };

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return () => unsub();
  }, []);

  // When form area changes, pre-select first slot
  useEffect(() => {
    if (formAreaId) {
      const area = commonAreas.find((a) => a.id === formAreaId);
      if (area && area.rules?.availableSlots?.length > 0) {
        setFormSlotId(area.rules.availableSlots[0].id);
      }
    }
  }, [formAreaId, commonAreas]);

  // When form apartment changes, pre-select resident
  useEffect(() => {
    if (formAptId) {
      const aptResidents = residents.filter((r) => r.apartmentId === formAptId);
      if (aptResidents.length > 0) {
        setFormResidentId(aptResidents[0].id);
      } else {
        setFormResidentId('');
      }
    }
  }, [formAptId, residents]);

  // Quick Stats
  const stats = useMemo(() => {
    const totalAreas = commonAreas.filter((a) => a.status !== 'inativo').length;
    const relevantBookings =
      currentUser.role === 'morador' && currentUser.apartmentId
        ? bookings.filter((b) => b.apartmentId === currentUser.apartmentId)
        : bookings;

    const confirmedCount = relevantBookings.filter((b) => b.status === 'confirmada').length;
    const pendingCount = relevantBookings.filter((b) => b.status === 'pendente_aprovacao').length;
    const completedCount = relevantBookings.filter((b) => b.status === 'realizada').length;
    return { totalAreas, confirmedCount, pendingCount, completedCount };
  }, [commonAreas, bookings, currentUser]);

  // Selected area in calendar
  const currentSelectedArea = useMemo(() => {
    return commonAreas.find((a) => a.id === selectedCalendarAreaId) || commonAreas[0];
  }, [commonAreas, selectedCalendarAreaId]);

  // Calendar days generation
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: {
      day: number;
      dateString: string;
      isCurrentMonth: boolean;
      status: 'free' | 'partial' | 'busy' | 'maintenance' | 'closed';
      bookingsCount: number;
    }[] = [];

    // Prefix empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push({
        day: 0,
        dateString: '',
        isCurrentMonth: false,
        status: 'closed',
        bookingsCount: 0,
      });
    }

    const pad = (n: number) => String(n).padStart(2, '0');

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${pad(month + 1)}-${pad(d)}`;
      const dayOfWeek = new Date(dateString + 'T12:00:00').getDay();

      let status: 'free' | 'partial' | 'busy' | 'maintenance' | 'closed' = 'free';

      if (currentSelectedArea) {
        if (currentSelectedArea.status === 'manutencao') {
          status = 'maintenance';
        } else if (
          currentSelectedArea.rules?.allowedDays &&
          !currentSelectedArea.rules.allowedDays.includes(dayOfWeek)
        ) {
          status = 'closed';
        } else {
          const areaBookingsForDay = bookings.filter(
            (b) =>
              b.areaId === currentSelectedArea.id &&
              b.bookingDate === dateString &&
              b.status !== 'cancelada' &&
              b.status !== 'rejeitada'
          );

          const totalSlots = currentSelectedArea.rules?.availableSlots?.length || 1;
          const hasFullDay = areaBookingsForDay.some((b) => b.slotId?.includes('dia'));

          if (hasFullDay || areaBookingsForDay.length >= totalSlots) {
            status = 'busy';
          } else if (areaBookingsForDay.length > 0) {
            status = 'partial';
          } else {
            status = 'free';
          }
        }
      }

      const count = bookings.filter(
        (b) =>
          b.areaId === selectedCalendarAreaId &&
          b.bookingDate === dateString &&
          b.status !== 'cancelada' &&
          b.status !== 'rejeitada'
      ).length;

      days.push({
        day: d,
        dateString,
        isCurrentMonth: true,
        status,
        bookingsCount: count,
      });
    }

    return days;
  }, [currentCalendarDate, currentSelectedArea, bookings, selectedCalendarAreaId]);

  // Slots for the selected day in calendar view
  const daySlotAvailabilities = useMemo(() => {
    if (!currentSelectedArea || !selectedDayString) return [];
    return storage.getAvailableSlotsForDate(currentSelectedArea.id, selectedDayString);
  }, [currentSelectedArea, selectedDayString, bookings]);

  // Filtered bookings list for Manage tab
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Morador strictly views reservations of their own apartment
      if (currentUser.role === 'morador' && currentUser.apartmentId) {
        if (b.apartmentId !== currentUser.apartmentId) return false;
      }
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (areaFilter !== 'all' && b.areaId !== areaFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          b.protocolNumber.toLowerCase().includes(q) ||
          b.residentName.toLowerCase().includes(q) ||
          b.apartmentNumber.toLowerCase().includes(q) ||
          b.areaName.toLowerCase().includes(q) ||
          b.purpose.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [bookings, statusFilter, areaFilter, searchQuery, currentUser]);

  // Handle month change
  const handlePrevMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Submit New Booking
  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccessMessage(null);

    if (!formAreaId) {
      setFormError('Selecione uma área comum.');
      return;
    }
    if (!formDate) {
      setFormError('Selecione a data da reserva.');
      return;
    }
    if (!formSlotId) {
      setFormError('Selecione o turno/horário desejado.');
      return;
    }
    if (!formAptId) {
      setFormError('Selecione o apartamento solicitante.');
      return;
    }
    if (!formPurpose.trim()) {
      setFormError('Informe a finalidade do evento.');
      return;
    }
    if (!formTermsAccepted) {
      setFormError('É obrigatório ler e aceitar o regulamento interno e termo de responsabilidade.');
      return;
    }

    const area = commonAreas.find((a) => a.id === formAreaId);
    if (!area) {
      setFormError('Área comum não encontrada.');
      return;
    }

    // Capacity check
    if (formGuestsCount > area.rules.maxCapacity) {
      setFormError(
        `A quantidade de convidados (${formGuestsCount}) excede a capacidade máxima permitida para este espaço (${area.rules.maxCapacity} pessoas).`
      );
      return;
    }

    // Availability clash check
    const availCheck = storage.checkAreaAvailability(formAreaId, formDate, formSlotId);
    if (!availCheck.available) {
      setFormError(availCheck.conflictReason || 'Horário indisponível para esta data.');
      return;
    }

    // Apartment and resident data
    const effectiveAptId = currentUser.role === 'morador' ? (currentUser.apartmentId || formAptId) : formAptId;
    const apt = apartments.find((a) => a.id === effectiveAptId);
    const block = blocks.find((b) => b.id === apt?.blockId) || {
      id: currentUser.blockId || '',
      name: currentUser.blockName || 'Torre Principal',
      identification: '',
      aptsCount: 0,
      active: true,
    };
    const resident =
      currentUser.role === 'morador'
        ? {
            id: currentUser.residentId || currentUser.id,
            name: currentUser.name,
            phone: currentUser.phone || '(11) 99999-0000',
          }
        : residents.find((r) => r.id === formResidentId) || {
            id: `res-gen-${Date.now()}`,
            name: `Morador Apt ${apt?.number || ''}`,
            phone: '(11) 99999-0000',
          };

    const slot = area.rules.availableSlots.find((s) => s.id === formSlotId) || {
      id: formSlotId,
      label: 'Turno Selecionado',
      startTime: '08:00',
      endTime: '22:00',
    };

    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const protocol = `RES-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const cleaningFee = area.rules.cleaningFee || 0;
    const rentalFee = area.rules.rentalFee || 0;
    const totalFee = cleaningFee + rentalFee;

    const initialStatus: BookingStatus = area.rules.requiresAdminApproval
      ? 'pendente_aprovacao'
      : 'confirmada';

    const newBooking: AreaBooking = {
      id: `book-${Date.now()}`,
      protocolNumber: protocol,
      condoId: condo.id,
      areaId: area.id,
      areaName: area.name,
      apartmentId: apt?.id || effectiveAptId,
      apartmentNumber: apt?.number || currentUser.unitNumber || '---',
      blockId: block?.id || '',
      blockName: block?.name || block?.identification || 'Torre Principal',
      residentId: resident.id,
      residentName: resident.name,
      residentPhone: resident.phone,
      bookingDate: formDate,
      slotId: slot.id,
      slotLabel: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime,
      purpose: formPurpose.trim(),
      expectedGuestsCount: Number(formGuestsCount) || 10,
      guestListNotes: formGuestListNotes.trim(),
      status: initialStatus,
      cleaningFee,
      rentalFee,
      totalFee,
      feePaid: totalFee === 0,
      termsAccepted: true,
      createdAt: nowStr,
      approvedAt: initialStatus === 'confirmada' ? nowStr : undefined,
      approvedBy: initialStatus === 'confirmada' ? 'Aprovação Automática do Sistema' : undefined,
    };

    storage.saveBooking(newBooking);

    setViewingVoucherBooking(newBooking);
    setFormSuccessMessage(
      initialStatus === 'confirmada'
        ? `Reserva ${protocol} realizada com sucesso!`
        : `Solicitação ${protocol} enviada para análise da administração.`
    );

    // Reset form purpose & notes
    setFormPurpose('');
    setFormGuestListNotes('');
    setFormTermsAccepted(false);
  };

  // WhatsApp Trigger for Voucher
  const handleShareWhatsAppVoucher = (booking: AreaBooking) => {
    const statusText =
      booking.status === 'confirmada'
        ? 'CONFIRMADA'
        : booking.status === 'pendente_aprovacao'
        ? 'EM ANÁLISE PELA ADMINISTRAÇÃO'
        : booking.status.toUpperCase();

    const formattedDate = new Date(booking.bookingDate + 'T12:00:00').toLocaleDateString(
      'pt-BR',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    );

    const message = `*COMPROVANTE DE RESERVA - ${condo.name || 'CONDOMÍNIO'}*
----------------------------------------
*Protocolo:* ${booking.protocolNumber}
*Espaço:* ${booking.areaName}
*Status:* ${statusText}
*Data:* ${formattedDate}
*Horário:* ${booking.slotLabel} (${booking.startTime} às ${booking.endTime})
*Unidade:* Apt ${booking.apartmentNumber} - ${booking.blockName}
*Morador:* ${booking.residentName}
*Finalidade:* ${booking.purpose}
*Convidados Previstos:* ${booking.expectedGuestsCount} pessoas
*Taxa Total:* ${booking.totalFee > 0 ? `R$ ${booking.totalFee.toFixed(2)}` : 'Isento'}

*Regras Importantes:*
- Som alto exclusivamente até as 22h00.
- Vistoria de entrada e saída com a zeladoria/portaria.
- O morador é responsável pela conservação de todo o mobiliário.`;

    if (onTriggerWhatsApp) {
      onTriggerWhatsApp({
        phone: booking.residentPhone || '',
        residentName: booking.residentName,
        apartmentNumber: booking.apartmentNumber,
        blockName: booking.blockName,
        customMessage: message,
      });
    } else {
      const cleanPhone = (booking.residentPhone || '').replace(/\D/g, '');
      const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  // Admin Approval Action
  const handleConfirmApproval = () => {
    if (!approvalModalBooking) return;
    storage.updateBookingStatus(
      approvalModalBooking.id,
      'confirmada',
      approvalNotes.trim() || 'Reserva aprovada pela administração predial.',
      currentUser.name
    );
    setApprovalModalBooking(null);
    setApprovalNotes('');
  };

  // Admin Rejection Action
  const handleConfirmRejection = () => {
    if (!rejectionModalBooking) return;
    if (!rejectionReason.trim()) return;
    storage.updateBookingStatus(
      rejectionModalBooking.id,
      'rejeitada',
      `Rejeitada: ${rejectionReason.trim()}`,
      currentUser.name
    );
    setRejectionModalBooking(null);
    setRejectionReason('');
  };

  // Resident / Admin Cancellation Action
  const handleConfirmCancellation = () => {
    if (!cancellationModalBooking) return;
    storage.updateBookingStatus(
      cancellationModalBooking.id,
      'cancelada',
      cancellationReason.trim() || 'Cancelada a pedido do morador.',
      currentUser.name
    );
    setCancellationModalBooking(null);
    setCancellationReason('');
  };

  // Inspection & Checkout Action
  const handleConfirmInspection = () => {
    if (!inspectionModalBooking) return;
    const booking = { ...inspectionModalBooking };
    booking.inspectionPassed = inspectionPassed;
    booking.inspectionNotes = inspectionNotes.trim() || 'Vistoria de encerramento realizada.';
    booking.status = 'realizada';
    storage.saveBooking(booking);

    // If inspection failed and user wants to record occurrence
    if (!inspectionPassed && createOccurrenceFromInspection) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      storage.saveOccurrence({
        id: `oco-${Date.now()}`,
        date: dateStr,
        time: timeStr,
        type: 'dano',
        location: booking.areaName,
        involvedParties: `Apt ${booking.apartmentNumber} (${booking.residentName})`,
        apartmentId: booking.apartmentId,
        blockId: booking.blockId,
        description: `Vistoria reprovada após uso da área ${booking.areaName} pelo Apt ${booking.apartmentNumber} (${booking.residentName}). Detalhes das avarias: ${inspectionNotes.trim()}`,
        operatorName: currentUser.name,
        status: 'aberta',
      });
    }

    setInspectionModalBooking(null);
    setInspectionNotes('');
    setCreateOccurrenceFromInspection(false);
  };

  // Save Common Area Config (Admin)
  const handleSaveAreaConfig = (area: CommonArea) => {
    storage.saveCommonArea(area);
    setIsAreaModalOpen(false);
    setEditingArea(null);
  };

  const handleDeleteArea = (areaId: string) => {
    if (window.confirm('Tem certeza que deseja remover esta área comum?')) {
      storage.deleteCommonArea(areaId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Áreas Comuns & Reservas
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Lazer & Eventos
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Disponibilidade em tempo real, reservas para moradores e gestão com vistoria predial
            </p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('new_booking')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Reserva</span>
          </button>

          {isAdminOrDev && (
            <button
              onClick={() => {
                setEditingArea(null);
                setIsAreaModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl border border-slate-700 transition-colors"
              title="Adicionar ou Configurar Áreas Comuns"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Nova Área</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Espaços Ativos</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">{stats.totalAreas}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Salões, churrasqueiras, quadras</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Reservas Confirmadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{stats.confirmedCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Agendadas no calendário</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pendentes Aprovação</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">{stats.pendingCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Aguardando parecer do síndico/ADM</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Realizadas (Concluídas)</span>
            <CheckSquare className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-400">{stats.completedCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Histórico com vistorias</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('explore')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeSubTab === 'explore'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Disponibilidade & Espaços</span>
        </button>

        <button
          onClick={() => setActiveSubTab('new_booking')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeSubTab === 'new_booking'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Fazer Reserva</span>
        </button>

        <button
          onClick={() => setActiveSubTab('manage')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative ${
            activeSubTab === 'manage'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Gestão & Comprovantes</span>
          {stats.pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950">
              {stats.pendingCount}
            </span>
          )}
        </button>

        {isAdminOrDev && (
          <button
            onClick={() => setActiveSubTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'rules'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Regras & Espaços (ADM)</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: EXPLORE & INTERACTIVE CALENDAR OF AVAILABILITY */}
      {/* ========================================================= */}
      {activeSubTab === 'explore' && (
        <div className="space-y-6">
          {/* Areas Showcase Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commonAreas.map((area) => {
              const IconComponent = AREA_TYPE_ICONS[area.type] || Layers;
              const isSelected = area.id === selectedCalendarAreaId;
              const isMaintenance = area.status === 'manutencao';

              return (
                <div
                  key={area.id}
                  onClick={() => setSelectedCalendarAreaId(area.id)}
                  className={`bg-slate-900 border rounded-2xl p-4.5 cursor-pointer transition-all relative group flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div>
                    {/* Header with Type & Status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-amber-400'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-sm line-clamp-1">
                            {area.name}
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            {area.location}
                          </span>
                        </div>
                      </div>

                      {isMaintenance ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                          Manutenção
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                          Disponível
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                      {area.description}
                    </p>

                    {/* Highlights: Capacity & Fees */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Até <b>{area.rules.maxCapacity}</b> pessoas</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          Limpeza:{' '}
                          <b>
                            {area.rules.cleaningFee > 0
                              ? `R$ ${area.rules.cleaningFee}`
                              : 'Isento'}
                          </b>
                        </span>
                      </div>
                    </div>

                    {/* Amenities chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {area.amenities.slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] rounded-md bg-slate-800 text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                      {area.amenities.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-slate-800 text-slate-400">
                          +{area.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Silêncio: {area.rules.soundCurfewHour}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormAreaId(area.id);
                        setActiveSubTab('new_booking');
                      }}
                      className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-semibold text-xs rounded-lg transition-colors border border-amber-500/30"
                    >
                      Reservar Espaço
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Month Calendar & Selected Day Slot Inspector */}
          {currentSelectedArea && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Calendário de Ocupação: {currentSelectedArea.name}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Selecione um dia para inspecionar os turnos ou fazer a reserva instantânea
                    </p>
                  </div>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-white px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 min-w-[140px] text-center capitalize">
                    {currentCalendarDate.toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid: Calendar on Left, Selected Day Details on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
                {/* Left: Monthly Grid (8 cols) */}
                <div className="lg:col-span-8">
                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-slate-400">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                      <div key={idx} className="py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Day Cells */}
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((cDay, idx) => {
                      if (!cDay.isCurrentMonth) {
                        return (
                          <div
                            key={idx}
                            className="aspect-square rounded-xl bg-slate-950/40 border border-slate-900/60"
                          />
                        );
                      }

                      const isSelectedDay = cDay.dateString === selectedDayString;

                      let cellBg = 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700';
                      let statusBadge = null;

                      if (cDay.status === 'free') {
                        cellBg =
                          'bg-emerald-950/20 border-emerald-900/40 hover:border-emerald-700 text-emerald-300';
                        statusBadge = (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        );
                      } else if (cDay.status === 'partial') {
                        cellBg =
                          'bg-amber-950/25 border-amber-900/40 hover:border-amber-700 text-amber-300';
                        statusBadge = (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        );
                      } else if (cDay.status === 'busy') {
                        cellBg =
                          'bg-rose-950/20 border-rose-900/40 hover:border-rose-700 text-rose-300';
                        statusBadge = (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        );
                      } else if (cDay.status === 'maintenance') {
                        cellBg = 'bg-slate-900 border-slate-800 text-slate-400 opacity-60';
                      } else if (cDay.status === 'closed') {
                        cellBg = 'bg-slate-950 border-slate-900 text-slate-400 opacity-40';
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDayString(cDay.dateString)}
                          className={`aspect-square p-2 rounded-xl border flex flex-col justify-between transition-all text-left relative ${cellBg} ${
                            isSelectedDay
                              ? 'ring-2 ring-amber-400 border-amber-400 shadow-md scale-[1.02]'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold">{cDay.day}</span>
                            {statusBadge}
                          </div>

                          <div className="text-[10px] font-medium leading-tight truncate">
                            {cDay.status === 'free' && 'Livre'}
                            {cDay.status === 'partial' && `${cDay.bookingsCount} reserv.`}
                            {cDay.status === 'busy' && 'Ocupado'}
                            {cDay.status === 'closed' && 'Fechado'}
                            {cDay.status === 'maintenance' && 'Manut.'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Legend */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-[11px] text-slate-400 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>Totalmente Livre</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>Parcialmente Reservado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span>Totalmente Ocupado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                      <span>Fechado / Manutenção</span>
                    </div>
                  </div>
                </div>

                {/* Right: Selected Day Turn/Slot Inspection & Quick Booking (4 cols) */}
                <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Data Selecionada
                        </span>
                        <h4 className="text-sm font-bold text-white capitalize">
                          {new Date(selectedDayString + 'T12:00:00').toLocaleDateString(
                            'pt-BR',
                            { weekday: 'long', day: '2-digit', month: 'long' }
                          )}
                        </h4>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                        {selectedDayString}
                      </span>
                    </div>

                    {/* Slots list */}
                    <div className="mt-4 space-y-2.5">
                      <span className="text-xs font-semibold text-slate-300 block mb-1">
                        Turnos Configurados para este Espaço:
                      </span>

                      {daySlotAvailabilities.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">
                          Nenhum turno configurado para este espaço.
                        </p>
                      ) : (
                        daySlotAvailabilities.map(({ slot, isAvailable, bookedBy, booking }) => (
                          <div
                            key={slot.id}
                            className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                              isAvailable
                                ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50'
                                : 'bg-slate-900/50 border-rose-900/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">
                                {slot.label}
                              </span>
                              {isAvailable ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  Disponível
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                  Ocupado
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center justify-between">
                              <span>
                                Horário: {slot.startTime} às {slot.endTime}
                              </span>
                              {!isAvailable && (
                                <span className="text-slate-300 truncate max-w-[140px]" title={bookedBy}>
                                  {bookedBy}
                                </span>
                              )}
                            </div>

                            {/* Action Button */}
                            {isAvailable ? (
                              <button
                                onClick={() => {
                                  setFormAreaId(currentSelectedArea.id);
                                  setFormDate(selectedDayString);
                                  setFormSlotId(slot.id);
                                  setActiveSubTab('new_booking');
                                }}
                                className="w-full mt-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Reservar Este Turno</span>
                              </button>
                            ) : (
                              booking && (
                                <button
                                  onClick={() => setViewingVoucherBooking(booking)}
                                  className="w-full mt-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Ver Detalhes da Reserva</span>
                                </button>
                              )
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Curfew / Rules reminder */}
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Regra de Convivência:</span>
                      Horário limite de som alto até as{' '}
                      <b>{currentSelectedArea.rules.soundCurfewHour}</b>. Vistoria obrigatória antes e após o uso.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: MAKE A NEW RESERVATION (RESIDENT / ADMIN)      */}
      {/* ========================================================= */}
      {activeSubTab === 'new_booking' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Formulário de Solicitação de Reserva
              </h2>
              <p className="text-xs text-slate-400">
                Preencha os dados da unidade, selecione o turno e aceite o regulamento interno
              </p>
            </div>
          </div>

          {formError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccessMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{formSuccessMessage}</span>
              </div>
              <button
                onClick={() => setActiveSubTab('manage')}
                className="underline font-semibold hover:text-white"
              >
                Ver na Gestão
              </button>
            </div>
          )}

          <form onSubmit={handleCreateBooking} className="space-y-6">
            {/* Step 1: Area Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                1. Escolha o Espaço Comum *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {commonAreas
                  .filter((a) => a.status !== 'inativo')
                  .map((area) => {
                    const isSelected = area.id === formAreaId;
                    const IconComp = AREA_TYPE_ICONS[area.type] || Layers;
                    const isMaint = area.status === 'manutencao';

                    return (
                      <button
                        type="button"
                        key={area.id}
                        disabled={isMaint}
                        onClick={() => setFormAreaId(area.id)}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        } ${isMaint ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-amber-400'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{area.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Cap: {area.rules.maxCapacity} pess. | Limpeza: R$ {area.rules.cleaningFee}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Step 2: Date & Slot Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  2. Data do Evento *
                </label>
                <input
                  type="date"
                  value={formDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  3. Turno / Horário Desejado *
                </label>
                <select
                  value={formSlotId}
                  onChange={(e) => setFormSlotId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                >
                  {(() => {
                    const area = commonAreas.find((a) => a.id === formAreaId);
                    if (!area || !area.rules?.availableSlots) return null;
                    return area.rules.availableSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.label} ({slot.startTime} às {slot.endTime})
                      </option>
                    ));
                  })()}
                </select>
              </div>
            </div>

            {/* Step 3: Apartment & Resident Selection */}
            {currentUser.role === 'morador' ? (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  4 & 5. Unidade Vinculada ao seu Login de Morador
                </span>
                <p className="text-sm font-bold text-white">
                  Apt {currentUser.unitNumber || '101'} · {currentUser.blockName || 'Torre A'}
                </p>
                <p className="text-xs text-slate-300">
                  Morador Responsável: <strong className="text-white">{currentUser.name}</strong> ({currentUser.phone || 'Telefone cadastrado'})
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    4. Apartamento Solicitante *
                  </label>
                  <select
                    value={formAptId}
                    onChange={(e) => setFormAptId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  >
                    <option value="">Selecione a Unidade...</option>
                    {apartments.map((apt) => {
                      const block = blocks.find((b) => b.id === apt.blockId);
                      return (
                        <option key={apt.id} value={apt.id}>
                          Apt {apt.number} - {block?.name || block?.identification || 'Torre Principal'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    5. Morador Titular da Reserva *
                  </label>
                  <select
                    value={formResidentId}
                    onChange={(e) => setFormResidentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  >
                    <option value="">Selecione o Morador...</option>
                    {residents
                      .filter((r) => !formAptId || r.apartmentId === formAptId)
                      .map((res) => (
                        <option key={res.id} value={res.id}>
                          {res.name} ({res.phone || 'Sem telefone'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 4: Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  6. Finalidade do Evento *
                </label>
                <input
                  type="text"
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  placeholder="Ex: Aniversário de 10 anos, Confraternização em família..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  7. Quantidade Estimada de Convidados *
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={formGuestsCount}
                  onChange={(e) => setFormGuestsCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                8. Observações & Fornecedores Externos (Opcional)
              </label>
              <textarea
                rows={2}
                value={formGuestListNotes}
                onChange={(e) => setFormGuestListNotes(e.target.value)}
                placeholder="Ex: Entrega de buffet às 10h, decoração externa, lista de 20 convidados será entregue na portaria..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
            </div>

            {/* Financial Summary Card */}
            {(() => {
              const area = commonAreas.find((a) => a.id === formAreaId);
              if (!area) return null;
              const cleanFee = area.rules.cleaningFee || 0;
              const rentFee = area.rules.rentalFee || 0;
              const total = cleanFee + rentFee;

              return (
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Resumo Financeiro da Reserva
                      </h4>
                      <p className="text-xs text-slate-400">
                        Taxa de Limpeza: R$ {cleanFee.toFixed(2)} | Locação: R$ {rentFee.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Total a Cobrar no Boleto
                    </span>
                    <span className="text-lg font-bold text-emerald-400">
                      {total > 0 ? `R$ ${total.toFixed(2)}` : 'Gratuito (Isento)'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Terms and Internal Rules Scrollable Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                Regulamento Interno & Termo de Vistoria
              </h4>
              <div className="max-h-28 overflow-y-auto text-[11px] text-slate-400 pr-2 space-y-1.5 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                {(() => {
                  const area = commonAreas.find((a) => a.id === formAreaId);
                  if (!area) return null;
                  return (
                    <>
                      <p className="font-semibold text-amber-300">
                        Regras Específicas do Espaço: {area.name}
                      </p>
                      <p className="whitespace-pre-line">{area.rules.termsAndConditions}</p>
                      <p className="pt-2 text-slate-400 border-t border-slate-800">
                        • Lei do Silêncio rigorosa a partir das <b>{area.rules.soundCurfewHour}</b>.
                        <br />
                        • O morador solicitante responderá civil e financeiramente por quaisquer danos causados às instalações, móveis ou aparelhos elétricos.
                        <br />
                        • Cancelamento sem ônus permitido até <b>{area.rules.cancelDeadlineHours}h</b> antes do início do horário reservado.
                      </p>
                    </>
                  );
                })()}
              </div>

              <label className="flex items-center gap-2.5 mt-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formTermsAccepted}
                  onChange={(e) => setFormTermsAccepted(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs text-slate-300">
                  Li e concordo com o Regulamento Interno, horários de silêncio e termo de vistoria predial.
                </span>
              </label>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('explore')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
              >
                Voltar aos Espaços
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar & Gerar Reserva</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: MANAGE RESERVATIONS (ADMIN & DOORMEN)          */}
      {/* ========================================================= */}
      {activeSubTab === 'manage' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por morador, apto, protocolo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Area Filter & Status Filter */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="all">Todos os Espaços</option>
                {commonAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="all">Todos os Status</option>
                <option value="pendente_aprovacao">Pendentes de Aprovação</option>
                <option value="confirmada">Confirmadas</option>
                <option value="realizada">Realizadas</option>
                <option value="cancelada">Canceladas</option>
                <option value="rejeitada">Rejeitadas</option>
              </select>
            </div>
          </div>

          {/* Bookings Table / Cards */}
          {filteredBookings.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <CalendarCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">Nenhuma reserva encontrada</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Não há agendamentos cadastrados para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Protocolo & Espaço</th>
                      <th className="px-4 py-3">Data & Turno</th>
                      <th className="px-4 py-3">Morador & Unidade</th>
                      <th className="px-4 py-3">Finalidade / Pessoas</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredBookings.map((bk) => {
                      const cfg = STATUS_CONFIG[bk.status] || STATUS_CONFIG.confirmada;
                      const StatusIcon = cfg.icon;

                      return (
                        <tr key={bk.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-[11px] font-bold text-amber-400 block">
                              {bk.protocolNumber}
                            </span>
                            <span className="font-semibold text-white block">
                              {bk.areaName}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-bold text-white block">
                              {new Date(bk.bookingDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {bk.slotLabel} ({bk.startTime} - {bk.endTime})
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-white block">
                              Apt {bk.apartmentNumber} ({bk.blockName})
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {bk.residentName}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-slate-300 block font-medium line-clamp-1">
                              {bk.purpose}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {bk.expectedGuestsCount} pessoas
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Voucher Button */}
                              <button
                                onClick={() => setViewingVoucherBooking(bk)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                                title="Ver Comprovante Oficial"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* WhatsApp Share Button */}
                              <button
                                onClick={() => handleShareWhatsAppVoucher(bk)}
                                className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 rounded-lg transition-colors border border-emerald-500/30"
                                title="Enviar Notificação WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>

                              {/* Admin Approval Actions */}
                              {isAdminOrDev && bk.status === 'pendente_aprovacao' && (
                                <>
                                  <button
                                    onClick={() => setApprovalModalBooking(bk)}
                                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] rounded-lg transition-colors"
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    onClick={() => setRejectionModalBooking(bk)}
                                    className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-[10px] rounded-lg transition-colors border border-rose-500/30"
                                  >
                                    Rejeitar
                                  </button>
                                </>
                              )}

                              {/* Check-in / Inspection Action */}
                              {bk.status === 'confirmada' && (
                                <button
                                  onClick={() => {
                                    setInspectionModalBooking(bk);
                                    setInspectionPassed(true);
                                    setInspectionNotes('');
                                    setCreateOccurrenceFromInspection(false);
                                  }}
                                  className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 font-bold text-[10px] rounded-lg transition-colors border border-sky-500/30 flex items-center gap-1"
                                  title="Realizar Vistoria e Checkout"
                                >
                                  <CheckSquare className="w-3 h-3" />
                                  <span>Vistoria</span>
                                </button>
                              )}

                              {/* Cancel action */}
                              {(bk.status === 'confirmada' || bk.status === 'pendente_aprovacao') && (
                                <button
                                  onClick={() => setCancellationModalBooking(bk)}
                                  className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg transition-colors"
                                  title="Cancelar Reserva"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: RULES & COMMON AREAS MANAGEMENT (ADMIN ONLY)   */}
      {/* ========================================================= */}
      {isAdminOrDev && activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-sm font-bold text-white">
                Espaços Comuns & Regulamentos Condominiais
              </h2>
              <p className="text-xs text-slate-400">
                Configure capacidade máxima, taxas de limpeza, horários permitidos e termos de vistoria
              </p>
            </div>
            <button
              onClick={() => {
                setEditingArea(null);
                setIsAreaModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Espaço</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {commonAreas.map((area) => {
              const IconComp = AREA_TYPE_ICONS[area.type] || Layers;

              return (
                <div
                  key={area.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0 border border-slate-700">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{area.name}</h3>
                          <span className="text-[11px] text-slate-400">
                            {AREA_TYPE_LABELS[area.type]} • {area.location}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingArea(area);
                            setIsAreaModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                          title="Editar Regras do Espaço"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteArea(area.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg transition-colors border border-slate-700"
                          title="Excluir Espaço"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                      {area.description}
                    </p>

                    {/* Rules Overview */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] mb-4">
                      <div>
                        <span className="text-slate-400 block">Capacidade:</span>
                        <span className="font-bold text-white">{area.rules.maxCapacity} pessoas</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Taxa Limpeza:</span>
                        <span className="font-bold text-emerald-400">
                          {area.rules.cleaningFee > 0 ? `R$ ${area.rules.cleaningFee}` : 'Isento'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Aprovação Prévia:</span>
                        <span className="font-bold text-white">
                          {area.rules.requiresAdminApproval ? 'Sim (Obrigatória)' : 'Automática'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Silêncio às:</span>
                        <span className="font-bold text-amber-400">{area.rules.soundCurfewHour}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cancelamento:</span>
                        <span className="font-bold text-white">Até {area.rules.cancelDeadlineHours}h antes</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Turnos:</span>
                        <span className="font-bold text-white">
                          {area.rules.availableSlots.length} configurados
                        </span>
                      </div>
                    </div>

                    {/* Turnos disponíveis */}
                    <div className="space-y-1 mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Turnos de Agendamento:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {area.rules.availableSlots.map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono"
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      Status:{' '}
                      <b
                        className={
                          area.status === 'disponivel'
                            ? 'text-emerald-400'
                            : area.status === 'manutencao'
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }
                      >
                        {area.status === 'disponivel'
                          ? 'Ativo'
                          : area.status === 'manutencao'
                          ? 'Em Manutenção'
                          : 'Inativo'}
                      </b>
                    </span>
                    <button
                      onClick={() => {
                        setEditingArea(area);
                        setIsAreaModalOpen(true);
                      }}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      Ajustar Regras
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: OFFICIAL VOUCHER / COMPROVANTE DE RESERVA         */}
      {/* ========================================================= */}
      {viewingVoucherBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Voucher Header with Watermark styling */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 p-5 text-slate-950 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-6 h-6" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    Comprovante Oficial de Reserva
                  </span>
                </div>
                <button
                  onClick={() => setViewingVoucherBooking(null)}
                  className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-slate-950 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">
                  {condo.name || 'Condomínio Residencial'}
                </span>
                <h3 className="text-xl font-black tracking-tight leading-none mt-0.5">
                  {viewingVoucherBooking.areaName}
                </h3>
              </div>
            </div>

            {/* Voucher Content */}
            <div className="p-6 space-y-5 bg-slate-900">
              {/* Protocol Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Protocolo de Segurança
                  </span>
                  <span className="font-mono text-sm font-extrabold text-amber-400">
                    {viewingVoucherBooking.protocolNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <QrCode className="w-8 h-8 text-slate-400" />
                </div>
              </div>

              {/* Grid with Details */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Data do Evento</span>
                  <span className="font-bold text-white block">
                    {new Date(viewingVoucherBooking.bookingDate + 'T12:00:00').toLocaleDateString(
                      'pt-BR',
                      { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Turno / Horário</span>
                  <span className="font-bold text-white block">
                    {viewingVoucherBooking.slotLabel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {viewingVoucherBooking.startTime} às {viewingVoucherBooking.endTime}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Unidade / Bloco</span>
                  <span className="font-bold text-white block">
                    Apt {viewingVoucherBooking.apartmentNumber}
                  </span>
                  <span className="text-[10px] text-slate-400">{viewingVoucherBooking.blockName}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Morador Titular</span>
                  <span className="font-bold text-white block truncate">
                    {viewingVoucherBooking.residentName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {viewingVoucherBooking.residentPhone || 'Sem telefone'}
                  </span>
                </div>
              </div>

              {/* Purpose & Guests */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400">Finalidade Declarada</span>
                  <span className="text-[10px] text-slate-400">
                    Capacidade: {viewingVoucherBooking.expectedGuestsCount} convidados
                  </span>
                </div>
                <p className="font-semibold text-white">{viewingVoucherBooking.purpose}</p>
                {viewingVoucherBooking.guestListNotes && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    Obs: {viewingVoucherBooking.guestListNotes}
                  </p>
                )}
              </div>

              {/* Status and Fee bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Status da Reserva</span>
                  <span
                    className={`font-bold ${
                      STATUS_CONFIG[viewingVoucherBooking.status]?.color || 'text-white'
                    }`}
                  >
                    {STATUS_CONFIG[viewingVoucherBooking.status]?.label}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Taxa Total</span>
                  <span className="font-bold text-emerald-400">
                    {viewingVoucherBooking.totalFee > 0
                      ? `R$ ${viewingVoucherBooking.totalFee.toFixed(2)}`
                      : 'Isento'}
                  </span>
                </div>
              </div>

              {/* Important Rules reminder */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Instruções para o Dia do Evento:
                </span>
                <p>• Apresentar este comprovante na portaria para liberação de convidados e fornecedores.</p>
                <p>• Vistoria obrigatória com o zelador/porteiro ao receber e entregar as chaves.</p>
                <p>• Som ambiente exclusivamente até as 22h00.</p>
              </div>

              {/* Actions: Print and WhatsApp Share */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>

                <button
                  onClick={() => handleShareWhatsAppVoucher(viewingVoucherBooking)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADMIN APPROVAL MODAL                             */}
      {/* ========================================================= */}
      {approvalModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Aprovar Reserva de Espaço</h3>
            </div>

            <p className="text-xs text-slate-300">
              Você está aprovando a reserva do <b>{approvalModalBooking.areaName}</b> para o{' '}
              <b>Apt {approvalModalBooking.apartmentNumber}</b> ({approvalModalBooking.residentName}) no dia{' '}
              <b>{approvalModalBooking.bookingDate}</b> ({approvalModalBooking.slotLabel}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Parecer / Observação da Administração (Opcional):
              </label>
              <textarea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Ex: Aprovado. Taxa de limpeza debitada no condomínio de novembro."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setApprovalModalBooking(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                Confirmar Aprovação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADMIN REJECTION MODAL                            */}
      {/* ========================================================= */}
      {rejectionModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Rejeitar Reserva de Espaço</h3>
            </div>

            <p className="text-xs text-slate-300">
              Informe a justificativa formal para a recusa da reserva do{' '}
              <b>{rejectionModalBooking.areaName}</b> pelo Apt {rejectionModalBooking.apartmentNumber}.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Motivo da Recusa (Obrigatório):
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Limite de reservas simultâneas atingido / Manutenção de emergência na data solicitada..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setRejectionModalBooking(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                disabled={!rejectionReason.trim()}
                onClick={handleConfirmRejection}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl disabled:opacity-50"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: INSPECTION & CHECKOUT CHECKLIST MODAL            */}
      {/* ========================================================= */}
      {inspectionModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-sky-400">
              <CheckSquare className="w-6 h-6" />
              <div>
                <h3 className="text-base font-bold text-white">Vistoria de Saída & Checkout</h3>
                <span className="text-xs text-slate-400">
                  {inspectionModalBooking.areaName} • Apt {inspectionModalBooking.apartmentNumber}
                </span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
              <span className="font-bold text-slate-300 block mb-1">
                Itens de Inspeção com Zelador/Porteiro:
              </span>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-700 text-sky-500" />
                <span>Mobiliário e eletrodomésticos conferidos sem quebras ou avarias</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-700 text-sky-500" />
                <span>Churrasqueira e bancadas desocupadas e lixo recolhido</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-700 text-sky-500" />
                <span>Ar-condicionado, luzes e som desligados</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-700 text-sky-500" />
                <span>Chaves e controles devolvidos na portaria</span>
              </label>
            </div>

            {/* Vistoria Status: Approved or Reproved */}
            <div className="flex items-center gap-3">
              <label className="flex-1 p-3 rounded-xl border cursor-pointer text-center transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                <input
                  type="radio"
                  name="inspectionResult"
                  checked={inspectionPassed}
                  onChange={() => setInspectionPassed(true)}
                  className="hidden"
                />
                <span className="text-xs font-bold block">Vistoria Aprovada</span>
                <span className="text-[10px] text-emerald-400/80">Espaço em perfeita ordem</span>
              </label>

              <label className="flex-1 p-3 rounded-xl border cursor-pointer text-center transition-all bg-rose-500/10 border-rose-500/30 text-rose-300">
                <input
                  type="radio"
                  name="inspectionResult"
                  checked={!inspectionPassed}
                  onChange={() => setInspectionPassed(false)}
                  className="hidden"
                />
                <span className="text-xs font-bold block">Vistoria com Avarias</span>
                <span className="text-[10px] text-rose-400/80">Danos ou descarte inadequado</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Relatório da Vistoria:
              </label>
              <textarea
                rows={2}
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Ex: Tudo entregue em ordem, chaves recolhidas às 22h05..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors resize-none"
              />
            </div>

            {!inspectionPassed && (
              <label className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createOccurrenceFromInspection}
                  onChange={(e) => setCreateOccurrenceFromInspection(e.target.checked)}
                  className="rounded border-slate-700 text-rose-500"
                />
                <span>Gerar Ocorrência Formal de Multa / Reparo contra o apartamento</span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setInspectionModalBooking(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmInspection}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                Finalizar Vistoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: CANCEL RESERVATION MODAL                         */}
      {/* ========================================================= */}
      {cancellationModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <XCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Cancelar Reserva de Espaço</h3>
            </div>

            <p className="text-xs text-slate-300">
              Confirma o cancelamento da reserva {cancellationModalBooking.protocolNumber} do{' '}
              <b>{cancellationModalBooking.areaName}</b> pelo Apt {cancellationModalBooking.apartmentNumber}?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Motivo do Cancelamento:
              </label>
              <textarea
                rows={2}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ex: Imprevisto familiar do morador / Chuva..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setCancellationModalBooking(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancellation}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: CREATE / EDIT COMMON AREA & RULES (ADMIN)        */}
      {/* ========================================================= */}
      {isAreaModalOpen && (
        <AreaConfigModal
          area={editingArea}
          onClose={() => {
            setIsAreaModalOpen(false);
            setEditingArea(null);
          }}
          onSave={handleSaveAreaConfig}
        />
      )}
    </div>
  );
};

// =========================================================================
// SUBCOMPONENT: AREA CONFIGURATION MODAL (ADMIN AREA & RULES EDITOR)
// =========================================================================

interface AreaConfigModalProps {
  area: CommonArea | null;
  onClose: () => void;
  onSave: (area: CommonArea) => void;
}

const AreaConfigModal: React.FC<AreaConfigModalProps> = ({ area, onClose, onSave }) => {
  const [name, setName] = useState(area?.name || '');
  const [type, setType] = useState<CommonAreaType>(area?.type || 'salao_festas');
  const [description, setDescription] = useState(area?.description || '');
  const [location, setLocation] = useState(area?.location || 'Térreo');
  const [status, setStatus] = useState<'disponivel' | 'manutencao' | 'inativo'>(
    area?.status || 'disponivel'
  );
  const [maintenanceReason, setMaintenanceReason] = useState(area?.maintenanceReason || '');

  // Rules
  const [maxCapacity, setMaxCapacity] = useState<number>(area?.rules?.maxCapacity || 50);
  const [cleaningFee, setCleaningFee] = useState<number>(area?.rules?.cleaningFee || 100);
  const [rentalFee, setRentalFee] = useState<number>(area?.rules?.rentalFee || 0);
  const [soundCurfewHour, setSoundCurfewHour] = useState(area?.rules?.soundCurfewHour || '22:00');
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState<number>(
    area?.rules?.cancelDeadlineHours || 24
  );
  const [requiresAdminApproval, setRequiresAdminApproval] = useState(
    area?.rules?.requiresAdminApproval ?? true
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    area?.rules?.termsAndConditions ||
      '1. Som alto exclusivamente até as 22h00.\n2. Vistoria obrigatória antes e após o uso.\n3. O morador é responsável pela conservação dos móveis e eletrodomésticos.'
  );

  // Slots
  const [slots, setSlots] = useState<BookingTimeSlot[]>(
    area?.rules?.availableSlots || [
      { id: 'slot-1', label: 'Turno Diurno (10h às 16h)', startTime: '10:00', endTime: '16:00' },
      { id: 'slot-2', label: 'Turno Noturno (17h às 22h)', startTime: '17:00', endTime: '22:00' },
    ]
  );
  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [newSlotStart, setNewSlotStart] = useState('10:00');
  const [newSlotEnd, setNewSlotEnd] = useState('16:00');

  // Amenities
  const [amenities, setAmenities] = useState<string[]>(
    area?.amenities || ['Ar-condicionado', 'Freezer', 'Smart TV', 'Wi-Fi']
  );
  const [newAmenity, setNewAmenity] = useState('');

  const handleAddSlot = () => {
    if (!newSlotLabel.trim()) return;
    setSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}`,
        label: newSlotLabel.trim(),
        startTime: newSlotStart,
        endTime: newSlotEnd,
      },
    ]);
    setNewSlotLabel('');
  };

  const handleRemoveSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddAmenity = () => {
    if (!newAmenity.trim()) return;
    if (!amenities.includes(newAmenity.trim())) {
      setAmenities((prev) => [...prev, newAmenity.trim()]);
    }
    setNewAmenity('');
  };

  const handleRemoveAmenity = (item: string) => {
    setAmenities((prev) => prev.filter((a) => a !== item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const condo = storage.getCondo();
    const updatedArea: CommonArea = {
      id: area?.id || `area-${Date.now()}`,
      condoId: condo.id,
      name: name.trim(),
      type,
      description: description.trim(),
      location: location.trim(),
      status,
      maintenanceReason: status === 'manutencao' ? maintenanceReason.trim() : undefined,
      amenities,
      rules: {
        maxCapacity: Number(maxCapacity) || 50,
        cleaningFee: Number(cleaningFee) || 0,
        rentalFee: Number(rentalFee) || 0,
        minAdvanceDays: 1,
        maxAdvanceDays: 90,
        cancelDeadlineHours: Number(cancelDeadlineHours) || 24,
        maxActiveBookingsPerApartment: 2,
        requiresAdminApproval,
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
        soundCurfewHour,
        termsAndConditions: termsAndConditions.trim(),
        availableSlots: slots,
      },
    };

    onSave(updatedArea);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              {area ? `Editar Espaço: ${area.name}` : 'Cadastrar Novo Espaço Comum'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome do Espaço *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Salão de Festas Nobre"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Área *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CommonAreaType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {Object.entries(AREA_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Localização</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Bloco A - Térreo"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status do Espaço</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'disponivel' | 'manutencao' | 'inativo')
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="disponivel">Disponível para Reservas</option>
                <option value="manutencao">Em Manutenção / Interditado</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          {status === 'manutencao' && (
            <div>
              <label className="block text-xs font-semibold text-rose-300 mb-1">
                Motivo da Interdição / Manutenção:
              </label>
              <input
                type="text"
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                placeholder="Ex: Troca de piso cerâmico e pintura até dia 20"
                className="w-full bg-slate-950 border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-rose-200"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as características e os diferenciais deste espaço..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none"
            />
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Capacidade Máxima</label>
              <input
                type="number"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Taxa Limpeza (R$)</label>
              <input
                type="number"
                value={cleaningFee}
                onChange={(e) => setCleaningFee(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Silêncio (Curfew)</label>
              <input
                type="text"
                value={soundCurfewHour}
                onChange={(e) => setSoundCurfewHour(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Cancelamento (h)</label>
              <input
                type="number"
                value={cancelDeadlineHours}
                onChange={(e) => setCancelDeadlineHours(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="adminApprove"
              checked={requiresAdminApproval}
              onChange={(e) => setRequiresAdminApproval(e.target.checked)}
              className="rounded border-slate-700 text-amber-500"
            />
            <label htmlFor="adminApprove" className="text-xs text-slate-300 cursor-pointer">
              Exigir aprovação prévia da administração/síndico para confirmar reservas
            </label>
          </div>

          {/* Turnos / Slots Manager */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <label className="block text-xs font-bold text-slate-300">
              Turnos de Reserva Configurados:
            </label>
            <div className="space-y-1.5">
              {slots.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                >
                  <span className="font-semibold text-white">
                    {s.label} ({s.startTime} às {s.endTime})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(s.id)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <input
                type="text"
                placeholder="Nome do Turno"
                value={newSlotLabel}
                onChange={(e) => setNewSlotLabel(e.target.value)}
                className="sm:col-span-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="time"
                value={newSlotStart}
                onChange={(e) => setNewSlotStart(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={newSlotEnd}
                  onChange={(e) => setNewSlotEnd(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Amenities Chips */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Comodidades & Itens Inclusos:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemoveAmenity(item)}
                    className="text-slate-400 hover:text-rose-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Ex: Forno de Pizza, Grelhas Inox, Mesa de Sinuca..."
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddAmenity}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Terms text */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Termos e Condições Específicos do Espaço
            </label>
            <textarea
              rows={3}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
            >
              Salvar Espaço Comum
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

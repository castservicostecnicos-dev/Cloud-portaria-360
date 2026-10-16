export type UserRole = 'admin' | 'porteiro' | 'supervisor' | 'dev' | 'morador';

export interface UserPermissions {
  canManageUsers: boolean;
  canConfigCondo: boolean;
  canDeleteRecords: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

export type CondoWorkScale = '12x36' | '8h_3turnos';

export interface ShiftDefinition {
  id: string;
  name: string;
  timeRange: string;
  label: string;
  startHour?: string;
  endHour?: string;
}

export function formatShiftHour(hour: number, minute: number = 0): string {
  const normH = ((hour % 24) + 24) % 24;
  return `${String(normH).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function calculateShiftsForScale(
  scale: CondoWorkScale = '8h_3turnos',
  startHourStr: string = '06:00'
): ShiftDefinition[] {
  let startH = 6;
  let startM = 0;
  if (startHourStr) {
    const parts = startHourStr.split(':');
    const parsedH = parseInt(parts[0], 10);
    if (!isNaN(parsedH)) {
      startH = parsedH;
    }
    if (parts.length > 1) {
      const parsedM = parseInt(parts[1], 10);
      if (!isNaN(parsedM)) {
        startM = parsedM;
      }
    }
  }

  if (scale === '12x36') {
    const diurnoIn = formatShiftHour(startH, startM);
    const diurnoOut = formatShiftHour(startH + 12, startM);
    const noturnoIn = diurnoOut;
    const noturnoOut = diurnoIn;

    return [
      {
        id: '12x36_diurno',
        name: 'Diurno',
        timeRange: `${diurnoIn} - ${diurnoOut}`,
        label: `Diurno (${diurnoIn} às ${diurnoOut})`,
        startHour: diurnoIn,
        endHour: diurnoOut,
      },
      {
        id: '12x36_noturno',
        name: 'Noturno',
        timeRange: `${noturnoIn} - ${noturnoOut}`,
        label: `Noturno (${noturnoIn} às ${noturnoOut})`,
        startHour: noturnoIn,
        endHour: noturnoOut,
      },
      {
        id: '12x36_folguista',
        name: 'Folguista',
        timeRange: 'Revezamento',
        label: `Folguista / Cobertura 12x36 (${diurnoIn} ou ${noturnoIn})`,
        startHour: diurnoIn,
        endHour: diurnoOut,
      },
    ];
  }

  // 8h_3turnos (3 turnos de 8 horas)
  const t1In = formatShiftHour(startH, startM);
  const t1Out = formatShiftHour(startH + 8, startM);
  const t2In = t1Out;
  const t2Out = formatShiftHour(startH + 16, startM);
  const t3In = t2Out;
  const t3Out = formatShiftHour(startH + 24, startM);

  return [
    {
      id: '8h_turno_1',
      name: '1º Turno (Manhã)',
      timeRange: `${t1In} - ${t1Out}`,
      label: `1º Turno: Manhã (${t1In} às ${t1Out})`,
      startHour: t1In,
      endHour: t1Out,
    },
    {
      id: '8h_turno_2',
      name: '2º Turno (Tarde)',
      timeRange: `${t2In} - ${t2Out}`,
      label: `2º Turno: Tarde (${t2In} às ${t2Out})`,
      startHour: t2In,
      endHour: t2Out,
    },
    {
      id: '8h_turno_3',
      name: '3º Turno (Noite)',
      timeRange: `${t3In} - ${t3Out}`,
      label: `3º Turno: Noite (${t3In} às ${t3Out})`,
      startHour: t3In,
      endHour: t3Out,
    },
    {
      id: '8h_folguista',
      name: 'Folguista',
      timeRange: 'Revezamento',
      label: 'Folguista / Cobertura de Turnos (8h)',
      startHour: t1In,
      endHour: t1Out,
    },
  ];
}

export function getWorkScaleSummary(
  scale: CondoWorkScale = '8h_3turnos',
  startHourStr: string = '06:00'
): string {
  const shifts = calculateShiftsForScale(scale, startHourStr);
  if (scale === '12x36') {
    return `Escala 12h x 36h: Diurno das ${shifts[0].startHour} às ${shifts[0].endHour} | Noturno das ${shifts[1].startHour} às ${shifts[1].endHour}`;
  }
  return `Escala 8h (3 Turnos): 1º Turno (${shifts[0].startHour} às ${shifts[0].endHour}) | 2º Turno (${shifts[1].startHour} às ${shifts[1].endHour}) | 3º Turno (${shifts[2].startHour} às ${shifts[2].endHour})`;
}

export function getCondoShifts(
  scale: CondoWorkScale = '8h_3turnos',
  startHourStr: string = '06:00'
): ShiftDefinition[] {
  return calculateShiftsForScale(scale, startHourStr);
}

export const WORK_SCALE_CONFIG: Record<
  CondoWorkScale,
  {
    name: string;
    badge: string;
    description: string;
    shifts: ShiftDefinition[];
  }
> = {
  '12x36': {
    name: 'Escala 12h x 36h',
    badge: '12h x 36h',
    description: 'Plantão de 12 horas de trabalho por 36 horas de descanso contínuo.',
    shifts: calculateShiftsForScale('12x36', '06:00'),
  },
  '8h_3turnos': {
    name: 'Escala de 8h (3 Turnos)',
    badge: '8h (3 Turnos)',
    description: 'Cobertura contínua de 24h dividida em 3 turnos de 8 horas.',
    shifts: calculateShiftsForScale('8h_3turnos', '06:00'),
  },
};

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone: string;
  active: boolean;
  permissions: UserPermissions;
  lastLogin?: string;
  condoId?: string;
  condoName?: string;
  managedCondoIds?: string[]; // IDs dos condomínios sob responsabilidade deste ADM
  cargo?: string;
  shiftTurn?: string; // Turno de trabalho do porteiro
  residentId?: string; // ID do cadastro de morador vinculado
  apartmentId?: string; // Ex: 'apt-101a'
  blockId?: string; // Ex: 'bloco-a'
  unitNumber?: string; // Ex: '101'
  blockName?: string; // Ex: 'Bloco A'
  cpf?: string;
}

export interface ResidentInvite {
  id: string;
  code: string; // Ex: 'CONV-101A-9821'
  condoId: string;
  condoName: string;
  residentName: string;
  email?: string;
  phone: string;
  apartmentId: string;
  blockId: string;
  unitNumber: string;
  blockName: string;
  residentId?: string;
  createdAt: string;
  expiresAt: string;
  status: 'pendente' | 'aceito' | 'expirado' | 'cancelado';
  invitedByUserId: string;
  invitedByName: string;
  acceptedAt?: string;
  acceptedUserId?: string;
}

export interface DemoPersona {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  condoName: string;
  shiftTurn?: string;
  description: string;
}

export interface ClientCondo {
  id: string;
  name: string;
  cnpj?: string;
  address: string;
  cep?: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  active: boolean;
  status: 'ativo' | 'inativo' | 'degustacao';
  createdAt: string;
  blocksCount: number;
  aptsCount: number;
  camerasCount?: number;
  workScale?: CondoWorkScale;
  workScaleStartHour?: string; // Horário de entrada do 1º turno / manhã (ex: '06:00', '07:00')
  workScaleNotes?: string;
  admPredial: {
    id: string;
    name: string;
    email: string;
    password: string;
    phone: string;
    cargo: string;
  };
  notes?: string;
}

export interface CondoConfig {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  cep: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  logoUrl?: string;
  facadeUrl?: string;
  blocksCount: number;
  aptsCount: number;
  workScale?: CondoWorkScale;
  workScaleStartHour?: string; // Horário de entrada do 1º turno / manhã (ex: '06:00', '07:00')
  workScaleNotes?: string;
  rules: {
    deliveryHours: string;
    quietHours: string;
    movingHours: string;
    visitorPolicy: string;
  };
}

export interface Block {
  id: string;
  name: string;
  identification: string;
  aptsCount: number;
  active: boolean;
  notes?: string;
}

export interface Apartment {
  id: string;
  number: string;
  blockId: string;
  floor: number;
  status: 'ocupado' | 'vago' | 'reforma' | 'alugado';
  notes?: string;
}

export interface Resident {
  id: string;
  name: string;
  cpf: string;
  rg?: string;
  birthDate?: string;
  phone: string;
  whatsapp: string;
  email: string;
  photoUrl?: string;
  apartmentId: string;
  blockId: string;
  type: 'proprietario' | 'inquilino' | 'familiar' | 'dependente' | 'outro';
  active: boolean;
  isMainResident: boolean;
  isNotificationContact: boolean;
  canReceivePackages: boolean;
  canAuthorizeVisitors: boolean;
  canAuthorizeContractors: boolean;
  notes?: string;
}

export interface Visitor {
  id: string;
  name: string;
  document: string;
  phone: string;
  photoUrl?: string;
  apartmentId: string;
  blockId: string;
  authorizedByMoradorId?: string;
  authorizedByName?: string;
  scheduledDate: string;
  scheduledTime?: string;
  notes?: string;
  isPreAuthorized: boolean;
}

export type ContractorType =
  | 'eletricista'
  | 'encanador'
  | 'tecnico_internet'
  | 'tv_cabo'
  | 'manutencao'
  | 'obras'
  | 'limpeza'
  | 'jardinagem'
  | 'entregador_servico'
  | 'empresa_terceirizada'
  | 'outro';

export interface Contractor {
  id: string;
  name: string;
  document: string;
  company: string;
  phone: string;
  photoUrl?: string;
  serviceType: ContractorType;
  apartmentId: string;
  blockId: string;
  responsibleResidentId?: string;
  responsibleResidentName?: string;
  authorizationType: 'pontual' | 'recorrente';
  validFrom: string;
  validUntil: string;
  scheduledTime?: string;
  notes?: string;
}

export type PublicAgencyType =
  | 'policia_militar'
  | 'policia_civil'
  | 'bombeiros'
  | 'samu'
  | 'guarda_municipal'
  | 'defesa_civil'
  | 'fiscalizacao'
  | 'correios'
  | 'concessionaria'
  | 'outro';

export interface PublicAgent {
  id: string;
  name: string;
  agency: PublicAgencyType;
  badgeNumber: string;
  document: string;
  vehiclePlate?: string;
  visitPurpose: string;
  apartmentId?: string;
  areaVisited: string;
  entryTime: string;
  exitTime?: string;
  operatorId: string;
  operatorName: string;
  notes?: string;
  status: 'dentro' | 'saiu';
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  type: 'carro' | 'moto' | 'van' | 'caminhao' | 'bicicleta';
  photoUrl?: string;
  ownerName: string;
  residentId?: string;
  apartmentId: string;
  blockId: string;
  parkingSpace: string;
  status: 'ativo' | 'visitante' | 'prestador' | 'irregular';
  notes?: string;
}

export type AccessStatus =
  | 'dentro'
  | 'saiu'
  | 'autorizado'
  | 'cancelado';

export type PersonType =
  | 'morador'
  | 'visitante'
  | 'prestador'
  | 'agente_publico'
  | 'veiculo'
  | 'entregador'
  | 'outro';

export interface AccessLog {
  id: string;
  personName: string;
  personType: PersonType;
  document?: string;
  apartmentId?: string;
  blockId?: string;
  purpose: string;
  entryTime: string;
  exitTime?: string;
  status: AccessStatus;
  authorizationMethod?: 'interfone' | 'whatsapp' | 'presencial' | 'previa' | 'portaria';
  authorizedByName?: string;
  vehiclePlate?: string;
  operatorName: string;
  notes?: string;
  photoUrl?: string;
}

export type DeliveryType =
  | 'encomenda'
  | 'correspondencia'
  | 'documento'
  | 'remedio'
  | 'material'
  | 'compra'
  | 'delivery'
  | 'carta'
  | 'sedex'
  | 'transportadora'
  | 'outros';

export type DeliveryStatus =
  | 'recebido'
  | 'aguardando_retirada'
  | 'morador_avisado'
  | 'retirado'
  | 'devolvido'
  | 'entregue_ao_destinatario';

export interface DeliveryItem {
  id: string;
  code: string;
  apartmentId: string;
  blockId: string;
  recipientName: string;
  type: DeliveryType;
  description: string;
  sender?: string;
  carrier?: string;
  trackingCode?: string;
  photoUrl?: string;
  receivedAt: string;
  operatorName: string;
  storageLocation: string;
  status: DeliveryStatus;
  notifiedAt?: string;
  pickedUpAt?: string;
  pickedUpBy?: string;
  pickedUpDocument?: string;
  pickedUpSignature?: string;
  pickedUpPhoto?: string;
}

export type OccurrenceType =
  | 'discussao'
  | 'barulho'
  | 'dano'
  | 'problema_acesso'
  | 'problema_visitante'
  | 'problema_prestador'
  | 'objeto_encontrado'
  | 'seguranca'
  | 'vazamento'
  | 'falta_energia'
  | 'elevador'
  | 'incendio'
  | 'emergencia'
  | 'outros';

export interface Occurrence {
  id: string;
  date: string;
  time: string;
  type: OccurrenceType;
  location: string;
  involvedParties: string;
  apartmentId?: string;
  blockId?: string;
  description: string;
  photos?: string[];
  operatorName: string;
  status: 'aberta' | 'em_analise' | 'resolvida' | 'arquivada';
  actionTaken?: string;
}

export interface LostFoundItem {
  id: string;
  item: string;
  photoUrl?: string;
  foundLocation: string;
  foundAt: string;
  foundBy: string;
  storedLocation: string;
  status: 'guardado' | 'retirado' | 'doado';
  retrievedBy?: string;
  retrievedAt?: string;
}

export interface KeyControl {
  id: string;
  type: 'chave' | 'controle_portao' | 'tag_acesso' | 'dispositivo';
  identification: string;
  number: string;
  handedTo: string;
  apartmentId?: string;
  takenAt: string;
  returnedAt?: string;
  status: 'retirado' | 'devolvido';
}

export interface Authorization {
  id: string;
  apartmentId: string;
  blockId: string;
  residentId: string;
  residentName: string;
  authorizedName: string;
  document: string;
  type: 'visitante' | 'prestador' | 'entrega' | 'veiculo' | 'familiar' | 'mudanca' | 'obra' | 'outros';
  startDate: string;
  endDate: string;
  allowedTimeStart?: string;
  allowedTimeEnd?: string;
  allowedWeekdays?: string[];
  notes?: string;
  status: 'ativa' | 'expirada' | 'cancelada';
}

export interface SpecialService {
  id: string;
  type: 'mudanca_entrada' | 'mudanca_saida' | 'obra' | 'entrega_moveis' | 'instalacao_equipamentos' | 'grande_entrega';
  apartmentId: string;
  blockId: string;
  responsibleName: string;
  company?: string;
  scheduledDate: string;
  scheduledTime: string;
  vehicles?: string;
  authorizedBy: string;
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
  notes?: string;
  entryTime?: string;
  exitTime?: string;
}

export interface ShiftPendingItem {
  id: string;
  label: string;
  category: 'encomenda' | 'visitante' | 'prestador' | 'chave' | 'ocorrencia' | 'manutencao' | 'aviso';
  resolved: boolean;
}

export interface ShiftEntry {
  id: string;
  shiftDate: string;
  shiftTurn: string; // Ex: '1º Turno: Manhã (06h - 14h)' ou 'Diurno (06h - 18h)'
  operatorName: string;
  startedAt: string;
  endedAt?: string;
  generalNotes?: string;
  handoverTo?: string;
  handoverCompleted: boolean;
  pendencies: ShiftPendingItem[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  details: string;
}

export interface WhatsAppTemplate {
  id: string;
  key: string;
  title: string;
  templateText: string;
  category: 'encomenda' | 'visitante' | 'prestador' | 'remedio' | 'documento' | 'aviso';
}

export type CCTVZone =
  | 'portao_veicular'
  | 'portao_social'
  | 'garagem_subsolo'
  | 'hall_torre_a'
  | 'hall_torre_b'
  | 'perimetro'
  | 'area_lazer';

export interface CCTVCamera {
  id: string;
  name: string;
  zone: CCTVZone;
  location: string;
  status: 'online' | 'offline' | 'manutencao';
  streamUrl?: string;
  externalViewerUrl?: string;
  rtspUrl?: string;
  snapshotUrl?: string;
  feedType: 'hls_stream' | 'rtsp_proxy' | 'external_dvr' | 'simulated_live' | 'mjpeg_stream' | 'video_file' | 'webcam';
  brand: string;
  ipAddress?: string;
  resolution: string;
  recordingRefPrefix?: string;
  dvrChannel?: number;
  dvrHost?: string;
  dvrHttpPort?: string;
  dvrRtspPort?: string;
  dvrUser?: string;
  dvrPass?: string;
  isWebcam?: boolean;
  subStream?: boolean;
}

export type NoticeCategory = 'geral' | 'manutencao' | 'evento' | 'seguranca' | 'urgencia';
export type NoticePriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface CommunicationNotice {
  id: string;
  title: string;
  category: NoticeCategory;
  priority: NoticePriority;
  content: string;
  targetType: 'todos' | 'bloco' | 'apartamento_especifico';
  targetBlockId?: string;
  targetApartmentIds?: string[];
  scheduledFor?: string;
  sentAt?: string;
  status: 'enviado' | 'agendado' | 'rascunho';
  authorName: string;
  sendViaWhatsApp: boolean;
  readCount: number;
  attachments?: string[];
  acknowledgedByResidentIds?: string[];
}

export interface NoticeTemplate {
  id: string;
  name: string;
  category: NoticeCategory;
  priority: NoticePriority;
  title: string;
  content: string;
  description: string;
  suggestedTarget?: 'todos' | 'bloco' | 'apartamento_especifico';
}

export type ResidentMessageCategory =
  | 'duvida'
  | 'solicitacao'
  | 'aviso_encomenda'
  | 'aviso_visitante'
  | 'reclamacao'
  | 'emergencia'
  | 'outro';

export type ResidentMessageStatus =
  | 'pendente'
  | 'em_atendimento'
  | 'respondida'
  | 'finalizada';

export interface ResidentMessageReply {
  id: string;
  senderName: string;
  senderRole: string; // 'porteiro' | 'admin' | 'morador'
  content: string;
  createdAt: string;
}

export interface ResidentMessage {
  id: string;
  protocolNumber: string;
  condoId: string;
  apartmentId: string;
  apartmentNumber: string;
  blockId: string;
  blockName: string;
  residentId: string;
  residentName: string;
  residentPhone?: string;
  category: ResidentMessageCategory;
  subject: string;
  content: string;
  status: ResidentMessageStatus;
  createdAt: string;
  updatedAt?: string;
  replies: ResidentMessageReply[];
  operatorAssigned?: string;
  resolvedAt?: string;
}

export type BackupTrigger = 'shift_handover' | 'daily_auto' | 'manual' | 'scheduled';

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  date: string;
  trigger: BackupTrigger;
  operatorName: string;
  operatorRole?: string;
  condoId: string;
  condoName: string;
  shiftTurn?: string;
  notes?: string;
  counts: {
    occurrences: number;
    accessLogs: number;
    visitors: number;
    deliveries: number;
    shifts: number;
  };
  data: {
    occurrences: Occurrence[];
    accessLogs: AccessLog[];
    visitors?: Visitor[];
    deliveries?: DeliveryItem[];
    shifts?: ShiftEntry[];
    fullBackup?: Record<string, unknown>;
  };
  downloaded: boolean;
  fileSizeKb?: number;
}

export interface BackupConfig {
  autoSnapshotOnShiftClose: boolean;
  forceDownloadOnShiftClose: boolean;
  autoDailySnapshotOnLogin: boolean;
  maxLocalSnapshots: number;
  lastDailyBackupDate?: string;
}

// ==========================================
// COMMON AREAS & BOOKINGS (ÁREAS COMUNS & RESERVAS)
// ==========================================

export type CommonAreaType =
  | 'salao_festas'
  | 'churrasqueira'
  | 'espaco_gourmet'
  | 'quadra'
  | 'piscina'
  | 'salao_jogos'
  | 'academia'
  | 'coworking'
  | 'cinema'
  | 'outro';

export interface BookingTimeSlot {
  id: string;
  label: string;
  startTime: string; // "10:00"
  endTime: string; // "16:00"
}

export interface CommonAreaRule {
  maxCapacity: number;
  cleaningFee: number;
  rentalFee: number;
  minAdvanceDays: number;
  maxAdvanceDays: number;
  cancelDeadlineHours: number;
  maxActiveBookingsPerApartment: number;
  requiresAdminApproval: boolean;
  allowedDays: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  availableSlots: BookingTimeSlot[];
  soundCurfewHour: string;
  termsAndConditions: string;
}

export interface CommonArea {
  id: string;
  condoId: string;
  name: string;
  type: CommonAreaType;
  description: string;
  location: string;
  imageUrl?: string;
  status: 'disponivel' | 'manutencao' | 'inativo';
  maintenanceReason?: string;
  rules: CommonAreaRule;
  amenities: string[];
}

export type BookingStatus =
  | 'confirmada'
  | 'pendente_aprovacao'
  | 'realizada'
  | 'cancelada'
  | 'rejeitada';

export interface AreaBooking {
  id: string;
  protocolNumber: string;
  condoId: string;
  areaId: string;
  areaName: string;
  apartmentId: string;
  apartmentNumber: string;
  blockId: string;
  blockName: string;
  residentId: string;
  residentName: string;
  residentPhone?: string;
  residentEmail?: string;
  bookingDate: string; // "YYYY-MM-DD"
  slotId?: string;
  slotLabel: string;
  startTime: string;
  endTime: string;
  purpose: string;
  expectedGuestsCount: number;
  guestListNotes?: string;
  status: BookingStatus;
  cleaningFee: number;
  rentalFee: number;
  totalFee: number;
  feePaid: boolean;
  termsAccepted: boolean;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  inspectionNotes?: string;
  inspectionPassed?: boolean;
}

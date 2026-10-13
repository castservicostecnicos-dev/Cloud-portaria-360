import {
  CondoConfig,
  Block,
  Apartment,
  Resident,
  Visitor,
  Contractor,
  PublicAgent,
  Vehicle,
  AccessLog,
  DeliveryItem,
  Occurrence,
  LostFoundItem,
  KeyControl,
  Authorization,
  SpecialService,
  ShiftEntry,
  AuditLog,
  User,
  WhatsAppTemplate,
  CCTVCamera,
  CommunicationNotice,
  ClientCondo,
  CondoWorkScale,
  DemoPersona,
  getWorkScaleSummary,
  BackupSnapshot,
  BackupConfig,
  BackupTrigger,
} from '../types';

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'demo-porteiro-manha',
    name: 'Carlos Oliveira (Porteiro Fictício)',
    role: 'porteiro',
    email: 'carlos.demo@portaria-teste.local',
    phone: '(11) 99001-0001',
    condoName: 'Residencial Demonstração (Fictício)',
    shiftTurn: '1º Turno: Manhã (06h às 14h)',
    description: 'Simulação do porteiro matutino: controle de acessos, recebimento de encomendas e ocorrências.',
  },
  {
    id: 'demo-porteiro-tarde',
    name: 'Marcio Silva (Porteiro Fictício)',
    role: 'porteiro',
    email: 'marcio.demo@portaria-teste.local',
    phone: '(11) 99001-0002',
    condoName: 'Residencial Demonstração (Fictício)',
    shiftTurn: '2º Turno: Tarde (14h às 22h)',
    description: 'Simulação do porteiro da tarde: passagens de plantão e entregas prioritárias.',
  },
  {
    id: 'demo-sindico',
    name: 'Dra. Patricia Mendes (Síndica / ADM Fictícia)',
    role: 'admin',
    email: 'patricia.demo@condominio-teste.local',
    phone: '(11) 99002-0001',
    condoName: 'Residencial Demonstração (Fictício)',
    description: 'Simulação de administradora predial: gestão do condomínio, cadastro de porteiros e relatórios.',
  },
  {
    id: 'demo-supervisor',
    name: 'Rodrigo Antunes (Supervisor de Segurança)',
    role: 'supervisor',
    email: 'rodrigo.demo@seguranca-teste.local',
    phone: '(11) 99003-0001',
    condoName: 'Residencial Demonstração (Fictício)',
    description: 'Simulação de supervisor de segurança: auditoria de postos e rondas.',
  },
];

import {
  SEED_CONDO,
  SEED_CLIENT_CONDOS,
  SEED_USERS,
  SEED_BLOCKS,
  SEED_APARTMENTS,
  SEED_RESIDENTS,
  SEED_VEHICLES,
  SEED_VISITORS,
  SEED_CONTRACTORS,
  SEED_PUBLIC_AGENTS,
  SEED_ACCESS_LOGS,
  SEED_DELIVERIES,
  SEED_OCCURRENCES,
  SEED_LOST_FOUND,
  SEED_KEYS,
  SEED_AUTHORIZATIONS,
  SEED_SPECIAL_SERVICES,
  SEED_SHIFT_ENTRIES,
  SEED_AUDIT_LOGS,
  SEED_WHATSAPP_TEMPLATES,
  SEED_CCTV_CAMERAS,
  SEED_COMMUNICATION_NOTICES,
} from '../data/seedData';
import { firestoreSync } from './firestoreSync';

const STORAGE_KEYS = {
  CONDO: 'portaria360_condo',
  CLIENT_CONDOS: 'portaria360_client_condos',
  USERS: 'portaria360_users',
  CURRENT_USER: 'portaria360_current_user',
  ACTIVE_CONDO_ID: 'portaria360_active_condo_id',
  BLOCKS: 'portaria360_blocks',
  APARTMENTS: 'portaria360_apartments',
  RESIDENTS: 'portaria360_residents',
  VEHICLES: 'portaria360_vehicles',
  VISITORS: 'portaria360_visitors',
  CONTRACTORS: 'portaria360_contractors',
  PUBLIC_AGENTS: 'portaria360_public_agents',
  ACCESS_LOGS: 'portaria360_access_logs',
  DELIVERIES: 'portaria360_deliveries',
  OCCURRENCES: 'portaria360_occurrences',
  LOST_FOUND: 'portaria360_lost_found',
  KEYS: 'portaria360_keys',
  AUTHORIZATIONS: 'portaria360_authorizations',
  SPECIAL_SERVICES: 'portaria360_special_services',
  SHIFT_ENTRIES: 'portaria360_shift_entries',
  AUDIT_LOGS: 'portaria360_audit_logs',
  WHATSAPP_TEMPLATES: 'portaria360_whatsapp_templates',
  CCTV_CAMERAS: 'portaria360_cctv_cameras',
  COMMUNICATION_NOTICES: 'portaria360_communication_notices',
  BACKUP_SNAPSHOTS: 'portaria360_backup_snapshots',
  BACKUP_CONFIG: 'portaria360_backup_config',
};

class StorageService {
  private listeners: Set<() => void> = new Set();
  private isDemoMode: boolean = false;
  private currentDemoPersona: DemoPersona | null = null;
  private savedRealDevUser: User | null = null;

  constructor() {
    this.initIfEmpty();
  }

  private initIfEmpty() {
    const inDemo = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('portaria360_demo_mode') === 'true';
    if (inDemo) {
      this.isDemoMode = true;
      firestoreSync.setDemoMode(true);
      const personaId = sessionStorage.getItem('portaria360_demo_persona_id');
      this.currentDemoPersona = DEMO_PERSONAS.find((p) => p.id === personaId) || DEMO_PERSONAS[0];
    }

    if (!localStorage.getItem(STORAGE_KEYS.CONDO)) {
      this.resetToInitialSeed();
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLIENT_CONDOS)) {
      localStorage.setItem(STORAGE_KEYS.CLIENT_CONDOS, JSON.stringify(SEED_CLIENT_CONDOS));
    }
    // Ensure starter structure for seeded client condos
    this.initCondoStarterStructure(SEED_CLIENT_CONDOS[1]); // São Sebastião

    // Initialize cloud synchronization, hydrate from Firestore, and verify daily backup
    setTimeout(() => {
      this.setupRealtimeSync();
      this.hydrateFromFirestore();
      this.checkAndRunDailyAutoBackup();
    }, 200);
  }

  // Demo Mode management
  public isDemoModeActive(): boolean {
    return this.isDemoMode;
  }

  public getCurrentDemoPersona(): DemoPersona | null {
    return this.currentDemoPersona;
  }

  public getDemoPersonas(): DemoPersona[] {
    return DEMO_PERSONAS;
  }

  public enterDemoPersona(personaId: string): { success: boolean; user: User } {
    const persona = DEMO_PERSONAS.find((p) => p.id === personaId) || DEMO_PERSONAS[0];
    if (!this.isDemoMode) {
      this.savedRealDevUser = this.getCurrentUser();
    }

    this.isDemoMode = true;
    this.currentDemoPersona = persona;
    firestoreSync.setDemoMode(true);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('portaria360_demo_mode', 'true');
      sessionStorage.setItem('portaria360_demo_persona_id', persona.id);
    }

    const simulatedUser: User = {
      id: persona.id,
      name: persona.name,
      email: persona.email,
      role: persona.role,
      phone: persona.phone,
      active: true,
      condoId: 'condo-solar-palmeiras',
      condoName: persona.condoName,
      shiftTurn: persona.shiftTurn,
      permissions: {
        canManageUsers: persona.role === 'admin' || persona.role === 'dev',
        canConfigCondo: persona.role === 'admin' || persona.role === 'dev',
        canDeleteRecords: persona.role === 'admin' || persona.role === 'dev',
        canViewReports: true,
        canManageSettings: persona.role === 'admin' || persona.role === 'dev',
      },
    };

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(simulatedUser));
    this.notify();
    return { success: true, user: simulatedUser };
  }

  public exitDemoMode(): { success: boolean } {
    this.isDemoMode = false;
    this.currentDemoPersona = null;
    firestoreSync.setDemoMode(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('portaria360_demo_mode');
      sessionStorage.removeItem('portaria360_demo_persona_id');

      // Clean up all demo keys in sessionStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('demo_')) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    }

    // Restore Dev Master user
    const devUser = this.savedRealDevUser || this.getAllUsers().find((u) => u.role === 'dev') || SEED_USERS[0];
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(devUser));
    this.savedRealDevUser = null;
    this.notify();
    return { success: true };
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Error in storage listener', e);
      }
    });
  }

  public resetToInitialSeed() {
    localStorage.setItem(STORAGE_KEYS.CONDO, JSON.stringify(SEED_CONDO));
    localStorage.setItem(STORAGE_KEYS.CLIENT_CONDOS, JSON.stringify(SEED_CLIENT_CONDOS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); // Do not auto-login: user must authenticate
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CONDO_ID, 'condo-solar-palmeiras');
    localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(SEED_BLOCKS));
    localStorage.setItem(STORAGE_KEYS.APARTMENTS, JSON.stringify(SEED_APARTMENTS));
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(SEED_RESIDENTS));
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(SEED_VEHICLES));
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(SEED_VISITORS));
    localStorage.setItem(STORAGE_KEYS.CONTRACTORS, JSON.stringify(SEED_CONTRACTORS));
    localStorage.setItem(STORAGE_KEYS.PUBLIC_AGENTS, JSON.stringify(SEED_PUBLIC_AGENTS));
    localStorage.setItem(STORAGE_KEYS.ACCESS_LOGS, JSON.stringify(SEED_ACCESS_LOGS));
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(SEED_DELIVERIES));
    localStorage.setItem(STORAGE_KEYS.OCCURRENCES, JSON.stringify(SEED_OCCURRENCES));
    localStorage.setItem(STORAGE_KEYS.LOST_FOUND, JSON.stringify(SEED_LOST_FOUND));
    localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(SEED_KEYS));
    localStorage.setItem(STORAGE_KEYS.AUTHORIZATIONS, JSON.stringify(SEED_AUTHORIZATIONS));
    localStorage.setItem(STORAGE_KEYS.SPECIAL_SERVICES, JSON.stringify(SEED_SPECIAL_SERVICES));
    localStorage.setItem(STORAGE_KEYS.SHIFT_ENTRIES, JSON.stringify(SEED_SHIFT_ENTRIES));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.WHATSAPP_TEMPLATES, JSON.stringify(SEED_WHATSAPP_TEMPLATES));
    localStorage.setItem(STORAGE_KEYS.CCTV_CAMERAS, JSON.stringify(SEED_CCTV_CAMERAS));
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION_NOTICES, JSON.stringify(SEED_COMMUNICATION_NOTICES));
    this.notify();
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      if (this.isDemoMode && key !== STORAGE_KEYS.CURRENT_USER && typeof sessionStorage !== 'undefined') {
        const demoData = sessionStorage.getItem(`demo_${key}`);
        if (demoData) return JSON.parse(demoData);
      }
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T) {
    if (this.isDemoMode && key !== STORAGE_KEYS.CURRENT_USER && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`demo_${key}`, JSON.stringify(value));
      this.notify();
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
    this.notify();
  }

  // Active Condominium determination
  public getActiveCondoId(): string {
    const currentUser = this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && currentUser.id !== 'guest') {
      if (currentUser.role === 'porteiro' || currentUser.role === 'supervisor') {
        // Porteiros and supervisors are strictly locked to their assigned condo
        return currentUser.condoId || 'condo-solar-palmeiras';
      }
      if (currentUser.role === 'admin') {
        // An ADM Predial can manage multiple condominiums
        const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONDO_ID);
        const managed = currentUser.managedCondoIds || (currentUser.condoId ? [currentUser.condoId] : []);
        if (stored && (managed.length === 0 || managed.includes(stored))) {
          return stored;
        }
        if (currentUser.condoId && (managed.length === 0 || managed.includes(currentUser.condoId))) {
          return currentUser.condoId;
        }
        if (managed.length > 0) {
          return managed[0];
        }
      }
    }
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONDO_ID);
    return stored || 'condo-solar-palmeiras';
  }

  public setActiveCondoId(condoId: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CONDO_ID, condoId);
    this.setupRealtimeSync();
    this.hydrateFromFirestore();
    this.notify();
  }

  // Realtime synchronization with Firebase Firestore
  public setupRealtimeSync() {
    if (this.isDemoMode) return;
    const activeCondoId = this.getActiveCondoId();
    firestoreSync.attachRealtimeListeners(activeCondoId, {
      onAccessLogs: (cloudLogs) => {
        const local = this.getAccessLogs();
        const map = new Map<string, AccessLog>();
        local.forEach((l) => map.set(l.id, l));
        cloudLogs.forEach((l) => map.set(l.id, l));
        const merged = Array.from(map.values()).sort((a, b) => (b.entryTime || '').localeCompare(a.entryTime || ''));
        this.setItem(this.getScopedKey(STORAGE_KEYS.ACCESS_LOGS), merged);
      },
      onDeliveries: (cloudDels) => {
        const local = this.getDeliveries();
        const map = new Map<string, DeliveryItem>();
        local.forEach((d) => map.set(d.id, d));
        cloudDels.forEach((d) => map.set(d.id, d));
        this.setItem(this.getScopedKey(STORAGE_KEYS.DELIVERIES), Array.from(map.values()));
      },
      onVehicles: (cloudVehs) => {
        const local = this.getVehicles();
        const map = new Map<string, Vehicle>();
        local.forEach((v) => map.set(v.id, v));
        cloudVehs.forEach((v) => map.set(v.id, v));
        this.setItem(this.getScopedKey(STORAGE_KEYS.VEHICLES), Array.from(map.values()));
      },
    });
  }

  // Hydrate data from Firestore (2-year retention database)
  public async hydrateFromFirestore(): Promise<void> {
    if (this.isDemoMode) return;
    try {
      const activeCondoId = this.getActiveCondoId();

      // 1. Client Condos
      const cloudClientCondos = await firestoreSync.fetchCollectionData<ClientCondo>('client_condos');
      if (cloudClientCondos.length > 0) {
        const local = this.getClientCondos();
        const map = new Map<string, ClientCondo>();
        local.forEach((c) => map.set(c.id, c));
        cloudClientCondos.forEach((c) => map.set(c.id, c));
        this.setItem(STORAGE_KEYS.CLIENT_CONDOS, Array.from(map.values()));
      }

      // 2. Users
      const cloudUsers = await firestoreSync.fetchCollectionData<User>('users');
      if (cloudUsers.length > 0) {
        const local = this.getAllUsers();
        const map = new Map<string, User>();
        local.forEach((u) => map.set(u.id, u));
        cloudUsers.forEach((u) => map.set(u.id, u));
        this.setItem(STORAGE_KEYS.USERS, Array.from(map.values()));
      }

      // 3. Access Logs (Permanent 2+ years cloud storage)
      const cloudLogs = await firestoreSync.fetchCollectionData<AccessLog>('access_logs', activeCondoId);
      if (cloudLogs.length > 0) {
        const local = this.getAccessLogs();
        const map = new Map<string, AccessLog>();
        local.forEach((l) => map.set(l.id, l));
        cloudLogs.forEach((l) => map.set(l.id, l));
        const merged = Array.from(map.values()).sort((a, b) => (b.entryTime || '').localeCompare(a.entryTime || ''));
        this.setItem(this.getScopedKey(STORAGE_KEYS.ACCESS_LOGS), merged);
      }

      // 4. Deliveries
      const cloudDeliveries = await firestoreSync.fetchCollectionData<DeliveryItem>('deliveries', activeCondoId);
      if (cloudDeliveries.length > 0) {
        const local = this.getDeliveries();
        const map = new Map<string, DeliveryItem>();
        local.forEach((d) => map.set(d.id, d));
        cloudDeliveries.forEach((d) => map.set(d.id, d));
        this.setItem(this.getScopedKey(STORAGE_KEYS.DELIVERIES), Array.from(map.values()));
      }

      // 5. Vehicles
      const cloudVehicles = await firestoreSync.fetchCollectionData<Vehicle>('vehicles', activeCondoId);
      if (cloudVehicles.length > 0) {
        const local = this.getVehicles();
        const map = new Map<string, Vehicle>();
        local.forEach((v) => map.set(v.id, v));
        cloudVehicles.forEach((v) => map.set(v.id, v));
        this.setItem(this.getScopedKey(STORAGE_KEYS.VEHICLES), Array.from(map.values()));
      }

      // 6. Occurrences
      const cloudOccurrences = await firestoreSync.fetchCollectionData<Occurrence>('occurrences', activeCondoId);
      if (cloudOccurrences.length > 0) {
        const local = this.getOccurrences();
        const map = new Map<string, Occurrence>();
        local.forEach((o) => map.set(o.id, o));
        cloudOccurrences.forEach((o) => map.set(o.id, o));
        this.setItem(this.getScopedKey(STORAGE_KEYS.OCCURRENCES), Array.from(map.values()));
      }

      // 7. Residents
      const cloudResidents = await firestoreSync.fetchCollectionData<Resident>('residents', activeCondoId);
      if (cloudResidents.length > 0) {
        const local = this.getResidents();
        const map = new Map<string, Resident>();
        local.forEach((r) => map.set(r.id, r));
        cloudResidents.forEach((r) => map.set(r.id, r));
        this.setItem(this.getScopedKey(STORAGE_KEYS.RESIDENTS), Array.from(map.values()));
      }

      // 8. Shift entries
      const cloudShifts = await firestoreSync.fetchCollectionData<ShiftEntry>('shift_entries', activeCondoId);
      if (cloudShifts.length > 0) {
        const local = this.getShiftEntries();
        const map = new Map<string, ShiftEntry>();
        local.forEach((s) => map.set(s.id, s));
        cloudShifts.forEach((s) => map.set(s.id, s));
        this.setItem(this.getScopedKey(STORAGE_KEYS.SHIFT_ENTRIES), Array.from(map.values()));
      }

      this.notify();
    } catch (e) {
      console.warn('[Storage] Hydration from Firestore note:', e);
    }
  }

  // Push all currently stored records to Firestore
  public async pushAllLocalDataToFirestore(): Promise<{ success: boolean; count: number }> {
    if (this.isDemoMode) return { success: false, count: 0 };
    let count = 0;
    const activeCondoId = this.getActiveCondoId();

    try {
      // 1. Condo
      const condo = this.getCondo();
      await firestoreSync.syncCondo(condo);
      count++;

      // 2. Client condos
      const clientCondos = this.getClientCondos();
      for (const c of clientCondos) {
        await firestoreSync.syncClientCondo(c);
        count++;
      }

      // 3. Users
      const users = this.getAllUsers();
      for (const u of users) {
        await firestoreSync.syncUser(u);
        count++;
      }

      // 4. Access logs
      const logs = this.getAccessLogs();
      for (const l of logs) {
        await firestoreSync.syncAccessLog(l, activeCondoId);
        count++;
      }

      // 5. Vehicles
      const vehicles = this.getVehicles();
      for (const v of vehicles) {
        await firestoreSync.syncVehicle(v, activeCondoId);
        count++;
      }

      // 6. Deliveries
      const dels = this.getDeliveries();
      for (const d of dels) {
        await firestoreSync.syncDelivery(d, activeCondoId);
        count++;
      }

      // 7. Occurrences
      const occs = this.getOccurrences();
      for (const o of occs) {
        await firestoreSync.syncOccurrence(o, activeCondoId);
        count++;
      }

      // 8. Residents
      const residents = this.getResidents();
      for (const r of residents) {
        await firestoreSync.syncResident(r, activeCondoId);
        count++;
      }

      // 9. Visitors
      const visitors = this.getVisitors();
      for (const vis of visitors) {
        await firestoreSync.syncVisitor(vis, activeCondoId);
        count++;
      }

      // 10. Contractors
      const contractors = this.getContractors();
      for (const c of contractors) {
        await firestoreSync.syncContractor(c, activeCondoId);
        count++;
      }

      // 11. Shift entries
      const shifts = this.getShiftEntries();
      for (const s of shifts) {
        await firestoreSync.syncShiftEntry(s, activeCondoId);
        count++;
      }

      this.addAuditLog('Sincronização em Nuvem', 'Firestore', `${count} registros sincronizados com sucesso no banco de dados Firebase`);
      return { success: true, count };
    } catch (e) {
      console.error('[Storage] Error pushing data to Firestore:', e);
      return { success: false, count };
    }
  }

  public getScopedKey(baseKey: string, specificCondoId?: string): string {
    const activeCondoId = specificCondoId || this.getActiveCondoId();
    if (activeCondoId === 'condo-solar-palmeiras' || activeCondoId === 'condo-1') {
      return baseKey;
    }
    return `${baseKey}_${activeCondoId}`;
  }

  // Starter structure for new client condos
  public initCondoStarterStructure(condo: ClientCondo) {
    const blocksKey = `${STORAGE_KEYS.BLOCKS}_${condo.id}`;
    const aptsKey = `${STORAGE_KEYS.APARTMENTS}_${condo.id}`;
    const residentsKey = `${STORAGE_KEYS.RESIDENTS}_${condo.id}`;

    if (!localStorage.getItem(blocksKey)) {
      const blocksCount = condo.blocksCount || 1;
      const initialBlocks: Block[] = [];
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let i = 0; i < blocksCount; i++) {
        const letter = alphabet[i] || `${i + 1}`;
        initialBlocks.push({
          id: `block-${condo.id}-${letter.toLowerCase()}`,
          name: blocksCount === 1 ? 'Torre Única' : `Torre ${letter}`,
          identification: blocksCount === 1 ? 'Torre Principal' : `Bloco ${letter}`,
          aptsCount: Math.ceil(condo.aptsCount / blocksCount),
          active: true,
          notes: `Estrutura inicial do condomínio ${condo.name}`,
        });
      }
      localStorage.setItem(blocksKey, JSON.stringify(initialBlocks));

      // Generate initial apartments
      const aptsCount = condo.aptsCount || 12;
      const initialApts: Apartment[] = [];
      const aptsPerBlock = Math.ceil(aptsCount / blocksCount);

      let currentAptIndex = 0;
      initialBlocks.forEach((block) => {
        for (let a = 1; a <= aptsPerBlock && currentAptIndex < aptsCount; a++) {
          const floor = Math.ceil(a / 4);
          const unit = a % 4 === 0 ? 4 : a % 4;
          const aptNum = `${floor}0${unit}`;
          initialApts.push({
            id: `apt-${condo.id}-${block.id}-${aptNum}`,
            number: aptNum,
            blockId: block.id,
            floor,
            status: a === 1 ? 'ocupado' : 'vago',
            notes: 'Unidade cadastrada na implantação',
          });
          currentAptIndex++;
        }
      });
      localStorage.setItem(aptsKey, JSON.stringify(initialApts));

      // Add one initial resident for demo if São Sebastião
      if (condo.id === 'condo-sao-sebastiao' && !localStorage.getItem(residentsKey) && initialApts.length > 0) {
        const sampleResidents: Resident[] = [
          {
            id: 'res-sebastiao-1',
            name: 'Ana Paula Ferreira',
            cpf: '234.567.890-11',
            rg: '28.987.654-3',
            birthDate: '1988-04-12',
            phone: '(11) 98765-4321',
            whatsapp: '5511987654321',
            email: 'ana.ferreira@saosebastiao.com.br',
            apartmentId: initialApts[0].id,
            blockId: initialBlocks[0].id,
            type: 'proprietario',
            active: true,
            isMainResident: true,
            isNotificationContact: true,
            canReceivePackages: true,
            canAuthorizeVisitors: true,
            canAuthorizeContractors: true,
            notes: 'Moradora pontual. Notificações prioritárias via WhatsApp.',
          },
        ];
        localStorage.setItem(residentsKey, JSON.stringify(sampleResidents));
      }
    }
  }

  // Current User
  public getCurrentUser(): User {
    const user = this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!user) {
      return {
        id: 'guest',
        name: 'Nenhum Operador Conectado',
        email: '',
        role: 'porteiro',
        phone: '',
        active: false,
        permissions: {
          canManageUsers: false,
          canConfigCondo: false,
          canDeleteRecords: false,
          canViewReports: false,
          canManageSettings: false,
        },
      };
    }

    // DEV Master é independente: nunca é ligado a nenhum condomínio de cliente
    if (user.role === 'dev') {
      if (user.condoId || user.condoName) {
        delete user.condoId;
        delete user.condoName;
      }
      return user;
    }

    // STRICT: O porteiro é ligado ao condomínio. Não pode ter porteiro sem condomínio.
    // Se o condomínio for excluído, o porteiro é excluído e perde o acesso imediatamente.
    if (user.role === 'porteiro') {
      const clientCondos = this.getClientCondos();
      const condoExists = Boolean(user.condoId && clientCondos.some((c) => c.id === user.condoId));
      if (!condoExists) {
        this.deleteUser(user.id);
        this.logout();
        return {
          id: 'guest',
          name: 'Nenhum Operador Conectado',
          email: '',
          role: 'porteiro',
          phone: '',
          active: false,
          permissions: {
            canManageUsers: false,
            canConfigCondo: false,
            canDeleteRecords: false,
            canViewReports: false,
            canManageSettings: false,
          },
        };
      }
    }

    return user;
  }

  public isAuthenticated(): boolean {
    const user = this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    return user !== null && user.id !== 'guest';
  }

  public logout(): void {
    if (this.isDemoMode) {
      this.exitDemoMode();
    }
    const user = this.getCurrentUser();
    if (user.id !== 'guest') {
      this.addAuditLog(
        'Desconexão / Logout',
        'Sessão',
        `Operador ${user.name} (${user.role}) desconectou-se do sistema.`
      );
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    this.notify();
  }

  public setCurrentUser(user: User) {
    if (user.role === 'dev') {
      delete user.condoId;
      delete user.condoName;
    }
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
    if (user.role !== 'dev' && user.condoId) {
      this.setActiveCondoId(user.condoId);
    }
    this.addAuditLog('Troca de Operador Ativo', 'Sessão', `Operador alterado para ${user.name} (${user.role})`);
  }

  // Master Users list
  public getAllUsers(): User[] {
    let list = this.getItem<User[]>(STORAGE_KEYS.USERS, SEED_USERS);

    // Ensure the developer account ale11062@gmail.com is always present, up-to-date, and NOT tied to any client condo
    const devIndex = list.findIndex((u) => u.email.toLowerCase() === 'ale11062@gmail.com');
    if (devIndex === -1) {
      list.unshift(SEED_USERS[0]);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
    } else {
      if (list[devIndex].password !== 'cast@2468' || list[devIndex].role !== 'dev') {
        list[devIndex].password = 'cast@2468';
        list[devIndex].role = 'dev';
        list[devIndex].permissions = {
          canManageUsers: true,
          canConfigCondo: true,
          canDeleteRecords: true,
          canViewReports: true,
          canManageSettings: true,
        };
      }
      delete list[devIndex].condoId;
      delete list[devIndex].condoName;
    }

    // STRICT REQUIREMENT:
    // "Porteiros, são ligados aos condomínios. Quando um condomínio deixa de existir, o porteiro deve ser excluído tbm."
    const clientCondos = this.getClientCondos();
    const validCondoMap = new Map(clientCondos.map((c) => [c.id, c.name]));

    let needsSave = false;

    // Automatically remove/prune any porteiro without a valid existing condo
    const orphanedPorteiros = list.filter((u) => u.role === 'porteiro' && (!u.condoId || !validCondoMap.has(u.condoId)));
    if (orphanedPorteiros.length > 0) {
      orphanedPorteiros.forEach((p) => {
        firestoreSync.deleteUser(p.id);
      });
      list = list.filter((u) => !(u.role === 'porteiro' && (!u.condoId || !validCondoMap.has(u.condoId))));
      needsSave = true;
    }

    // Ensure users have clean condo association
    list.forEach((u) => {
      if (u.role === 'dev') {
        delete u.condoId;
        delete u.condoName;
      } else if (u.condoId && validCondoMap.has(u.condoId)) {
        const correctName = validCondoMap.get(u.condoId);
        if (correctName && u.condoName !== correctName) {
          u.condoName = correctName;
          needsSave = true;
        }
      }
    });

    // Ensure Pedro Silveira (porteiro of São Sebastião) is in the users list if São Sebastião exists
    if (validCondoMap.has('condo-sao-sebastiao') && !list.some((u) => u.email.toLowerCase() === 'pedro.portaria@saosebastiao.com.br')) {
      const pedro = SEED_USERS.find((s) => s.email.toLowerCase() === 'pedro.portaria@saosebastiao.com.br');
      if (pedro) {
        list.push(pedro);
        needsSave = true;
      }
    }

    // Ensure João Silva (ADM of São Sebastião) has condoId 'condo-sao-sebastiao' if São Sebastião exists
    if (validCondoMap.has('condo-sao-sebastiao')) {
      const joaoIdx = list.findIndex((u) => u.email.toLowerCase() === 'joao.adm@saosebastiao.com.br');
      if (joaoIdx >= 0 && list[joaoIdx].condoId !== 'condo-sao-sebastiao') {
        list[joaoIdx].condoId = 'condo-sao-sebastiao';
        list[joaoIdx].condoName = 'Condomínio Edifício São Sebastião';
        needsSave = true;
      }
    }

    if (needsSave) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
    }

    return list;
  }

  // Users getter with strict separation
  // An ADM Predial or Porteiro or Supervisor CAN ONLY see users of the currently active condo!
  public getUsers(targetCondoId?: string): User[] {
    const allUsers = this.getAllUsers();
    const currentUser = this.getCurrentUser();

    // Explicit condo requested (e.g. by Dev Master filtering)
    if (targetCondoId) {
      return allUsers.filter((u) => u.condoId === targetCondoId);
    }

    // If logged in as Master Developer (Dev):
    if (currentUser.role === 'dev') {
      return allUsers;
    }

    // STRICT REQUIREMENT: ADM Predial or Porteiro or Supervisor
    // CAN ONLY SEE USERS BELONGING TO THEIR CURRENT ACTIVE CONDOMINIUM!
    const activeCondoId = this.getActiveCondoId();
    return allUsers.filter((u) => u.condoId === activeCondoId);
  }

  public authenticate(email: string, password: string): { success: boolean; user?: User; message: string } {
    const users = this.getAllUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'Usuário não encontrado com este e-mail.' };
    }

    if (!user.active) {
      return { success: false, message: 'Este usuário está desativado no sistema. Contate a administração.' };
    }

    if (user.password && user.password !== password) {
      return { success: false, message: 'Senha incorreta. Verifique suas credenciais.' };
    }

    // DEV Master é independente: sem vínculo com condomínio de cliente
    if (user.role === 'dev') {
      delete user.condoId;
      delete user.condoName;
      delete user.shiftTurn;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      user.lastLogin = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      this.saveUser(user);
      this.setCurrentUser(user);
      this.addAuditLog('Login de Usuário', 'Autenticação', `Dev Master (${user.email}) autenticado com sucesso`);
      return { success: true, user, message: 'Login realizado com sucesso!' };
    }

    // STRICT: O porteiro é ligado ao condomínio. Não pode ter porteiro sem condomínio.
    if (user.role === 'porteiro') {
      if (!user.condoId) {
        this.deleteUser(user.id);
        return { success: false, message: 'Acesso negado: Porteiro sem condomínio vinculado. O cadastro foi removido.' };
      }
      const clientCondos = this.getClientCondos();
      const targetCondo = clientCondos.find((c) => c.id === user.condoId);
      if (!targetCondo) {
        this.deleteUser(user.id);
        return { success: false, message: 'Acesso negado: O condomínio deste porteiro foi excluído do sistema. O cadastro do porteiro foi removido.' };
      }
      if (!targetCondo.active) {
        return { success: false, message: 'Acesso temporariamente bloqueado: O condomínio deste porteiro está desativado.' };
      }
      user.condoName = targetCondo.name;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    user.lastLogin = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Automatically switch active condo to the user's condo
    if (user.condoId) {
      this.setActiveCondoId(user.condoId);
    }

    this.saveUser(user);
    this.setCurrentUser(user);
    this.addAuditLog('Login de Usuário', 'Autenticação', `Usuário ${user.name} (${user.email}) autenticado com sucesso`);

    return { success: true, user, message: 'Login realizado com sucesso!' };
  }

  public recoverPassword(email: string): { success: boolean; message: string } {
    const users = this.getAllUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'Nenhuma conta encontrada com o e-mail informado.' };
    }

    this.addAuditLog('Solicitação de Senha', 'Autenticação', `Solicitação de redefinição registrada para ${user.email}`);

    return {
      success: true,
      message: 'Solicitação registrada. A recuperação de credenciais é realizada exclusivamente pelo Administrador Dev Master.',
    };
  }

  public saveUser(user: User) {
    if (user.role === 'dev') {
      delete user.condoId;
      delete user.condoName;
      delete user.shiftTurn;
    } else if (user.role === 'porteiro') {
      // STRICT: Não pode ter porteiro sem condomínio
      if (!user.condoId) {
        throw new Error('Não é permitido cadastrar ou manter porteiro sem condomínio vinculado.');
      }
      const targetCondo = this.getClientCondos().find((c) => c.id === user.condoId);
      if (!targetCondo) {
        throw new Error('O condomínio selecionado para o porteiro não existe ou foi excluído.');
      }
      user.condoName = targetCondo.name;
    } else {
      const activeCondoId = this.getActiveCondoId();
      const condo = this.getCondo();
      if (!user.condoId) {
        user.condoId = activeCondoId;
        user.condoName = condo.name;
      }
    }

    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
      this.addAuditLog(
        'Atualização de Usuário',
        'Usuários',
        `Usuário ${user.name} atualizado${user.condoName ? ` no condomínio ${user.condoName}` : ' (Dev Master Independente)'}`
      );
    } else {
      users.push(user);
      this.addAuditLog(
        'Cadastro de Usuário',
        'Usuários',
        `Novo usuário ${user.name} (${user.role}) cadastrado${user.condoName ? ` no condomínio ${user.condoName}` : ' (Dev Master Independente)'}`
      );
    }
    this.setItem(STORAGE_KEYS.USERS, users);
    firestoreSync.syncUser(user);
  }

  public deleteUser(userId: string) {
    let users = this.getAllUsers();
    const target = users.find((u) => u.id === userId);
    users = users.filter((u) => u.id !== userId);
    this.setItem(STORAGE_KEYS.USERS, users);
    if (target) {
      this.addAuditLog('Exclusão de Usuário', 'Usuários', `Usuário ${target.name} removido`);
    }
  }

  // Client Condos (Multi-condo Dev Management)
  public getClientCondos(): ClientCondo[] {
    return this.getItem<ClientCondo[]>(STORAGE_KEYS.CLIENT_CONDOS, SEED_CLIENT_CONDOS);
  }

  public saveClientCondo(condo: ClientCondo) {
    const list = this.getClientCondos();
    const idx = list.findIndex((c) => c.id === condo.id);
    const isNew = idx === -1;
    if (idx >= 0) {
      list[idx] = condo;
      this.addAuditLog('Atualização de Condomínio', 'Dev Master', `Condomínio ${condo.name} atualizado pelo desenvolvedor`);
    } else {
      list.unshift(condo);
      this.addAuditLog('Cadastro de Condomínio', 'Dev Master', `Novo condomínio ${condo.name} e ADM Predial ${condo.admPredial.name} cadastrados`);
    }
    this.setItem(STORAGE_KEYS.CLIENT_CONDOS, list);
    firestoreSync.syncClientCondo(condo);

    // Sync ADM Predial into Users table with STRICT condoId
    if (condo.admPredial && condo.admPredial.email) {
      const users = this.getAllUsers();
      const existingUserIdx = users.findIndex(
        (u) => u.id === condo.admPredial.id || u.email.toLowerCase() === condo.admPredial.email.toLowerCase()
      );
      const admUser: User = {
        id: condo.admPredial.id || `user-adm-${condo.id}`,
        name: `${condo.admPredial.name}`,
        email: condo.admPredial.email,
        password: condo.admPredial.password || 'senha123',
        phone: condo.admPredial.phone || '',
        role: 'admin',
        active: condo.active,
        condoId: condo.id,
        condoName: condo.name,
        permissions: {
          canManageUsers: true,
          canConfigCondo: true,
          canDeleteRecords: true,
          canViewReports: true,
          canManageSettings: true,
        },
      };

      if (existingUserIdx >= 0) {
        users[existingUserIdx] = {
          ...users[existingUserIdx],
          ...admUser,
          id: users[existingUserIdx].id,
        };
      } else {
        users.push(admUser);
      }
      this.setItem(STORAGE_KEYS.USERS, users);
      firestoreSync.syncUser(admUser);
    }

    // Sync condo config key
    const condoConfigKey = (condo.id === 'condo-solar-palmeiras' || condo.id === 'condo-1')
      ? STORAGE_KEYS.CONDO
      : `${STORAGE_KEYS.CONDO}_${condo.id}`;
    const existingConfig = this.getItem<Partial<CondoConfig>>(condoConfigKey, {});
    this.setItem(condoConfigKey, {
      ...existingConfig,
      id: condo.id,
      name: condo.name,
      cnpj: condo.cnpj || '',
      address: condo.address,
      city: condo.city,
      state: condo.state,
      phone: condo.phone,
      email: condo.email,
      blocksCount: condo.blocksCount,
      aptsCount: condo.aptsCount,
      workScale: condo.workScale || '8h_3turnos',
      workScaleStartHour: condo.workScaleStartHour || '06:00',
      workScaleNotes: condo.workScaleNotes || getWorkScaleSummary(condo.workScale || '8h_3turnos', condo.workScaleStartHour || '06:00'),
    });

    // Initialize starter structure if new condo
    if (isNew) {
      this.initCondoStarterStructure(condo);
    }
  }

  public deleteClientCondo(condoId: string) {
    const list = this.getClientCondos();
    const target = list.find((c) => c.id === condoId);
    const updated = list.filter((c) => c.id !== condoId);
    this.setItem(STORAGE_KEYS.CLIENT_CONDOS, updated);
    firestoreSync.deleteClientCondo(condoId);

    // CRITICAL REQUIREMENT:
    // "Porteiros, são ligados aos condomínios. Quando um condomínio deixa de existir, o porteiro deve ser excluído tbm."
    const users = this.getAllUsers();
    const porteirosToDelete = users.filter((u) => u.role === 'porteiro' && (u.condoId === condoId || (target && u.condoName === target.name)));
    const remainingUsers = users.filter((u) => !(u.role === 'porteiro' && (u.condoId === condoId || (target && u.condoName === target.name))));
    this.setItem(STORAGE_KEYS.USERS, remainingUsers);

    // Sync deletion for each removed porteiro to firestore
    porteirosToDelete.forEach((p) => {
      firestoreSync.deleteUser(p.id);
    });

    // Check if the currently logged-in user is a porteiro of this condo:
    // They lose access immediately!
    const currentUser = this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && currentUser.role === 'porteiro' && (currentUser.condoId === condoId || (target && currentUser.condoName === target.name))) {
      this.deleteUser(currentUser.id);
      this.logout();
    }

    // If active condo was the deleted one, reset to first remaining condo or clean up
    const activeStored = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONDO_ID);
    if (activeStored === condoId) {
      if (updated.length > 0) {
        this.setActiveCondoId(updated[0].id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONDO_ID);
      }
    }

    if (target) {
      this.addAuditLog(
        'Exclusão de Condomínio',
        'Dev Master',
        `Condomínio ${target.name} removido da plataforma. ${porteirosToDelete.length} porteiro(s) vinculado(s) excluído(s) e acesso revogado imediatamente.`
      );
    }

    this.notify();
  }

  public toggleClientCondoStatus(condoId: string): { success: boolean; active: boolean; status: 'ativo' | 'inativo' } {
    const list = this.getClientCondos();
    const idx = list.findIndex((c) => c.id === condoId);
    if (idx === -1) return { success: false, active: false, status: 'inativo' };

    const newActive = !list[idx].active;
    list[idx].active = newActive;
    list[idx].status = newActive ? 'ativo' : 'inativo';
    this.setItem(STORAGE_KEYS.CLIENT_CONDOS, list);

    // Also toggle the active status of the ADM Predial user and all porteiros of this condo
    const users = this.getAllUsers();
    const admEmail = list[idx].admPredial?.email?.toLowerCase();
    users.forEach((u) => {
      if ((admEmail && u.email.toLowerCase() === admEmail) || (u.role === 'porteiro' && u.condoId === condoId)) {
        u.active = newActive;
      }
    });
    this.setItem(STORAGE_KEYS.USERS, users);

    // If deactivated and currently logged in user is a porteiro of this condo, revoke access immediately
    const currentUser = this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && currentUser.role === 'porteiro' && currentUser.condoId === condoId && !newActive) {
      this.logout();
    }

    this.addAuditLog(
      'Status de Condomínio Alterado',
      'Dev Master',
      `Condomínio ${list[idx].name} agora está ${newActive ? 'ATIVO' : 'DESATIVADO'}. Porteiros vinculados ${newActive ? 'reativados' : 'bloqueados'}.`
    );

    return { success: true, active: newActive, status: list[idx].status };
  }

  public resetAdmPredialPassword(condoId: string, customNewPassword?: string): { success: boolean; password: string; message: string } {
    const list = this.getClientCondos();
    const idx = list.findIndex((c) => c.id === condoId);
    if (idx === -1) {
      return { success: false, password: '', message: 'Condomínio não encontrado.' };
    }

    const newPass = customNewPassword || `portaria@${Math.random().toString(36).slice(-6)}`;
    list[idx].admPredial.password = newPass;
    this.setItem(STORAGE_KEYS.CLIENT_CONDOS, list);

    // Also sync to Users
    const users = this.getAllUsers();
    const admEmail = list[idx].admPredial.email.toLowerCase();
    const userIdx = users.findIndex((u) => u.email.toLowerCase() === admEmail);
    if (userIdx >= 0) {
      users[userIdx].password = newPass;
      this.setItem(STORAGE_KEYS.USERS, users);
    }

    this.addAuditLog(
      'Reset de Senha ADM Predial',
      'Dev Master',
      `Senha do ADM ${list[idx].admPredial.name} (${list[idx].name}) resetada`
    );

    return {
      success: true,
      password: newPass,
      message: `Senha do ADM ${list[idx].admPredial.name} redefinida com sucesso para "${newPass}"`,
    };
  }

  // Return all ADM Predial users enriched with their managed condominiums
  public getAdmUsers(): User[] {
    const allUsers = this.getAllUsers();
    const condos = this.getClientCondos();

    const adms = allUsers.filter((u) => u.role === 'admin');

    // Enrich each ADM with all condos where they are listed as admPredial or in managedCondoIds
    adms.forEach((adm) => {
      const managed = new Set<string>(adm.managedCondoIds || []);
      if (adm.condoId) managed.add(adm.condoId);

      condos.forEach((c) => {
        if (c.admPredial && c.admPredial.email.toLowerCase() === adm.email.toLowerCase()) {
          managed.add(c.id);
        }
      });

      adm.managedCondoIds = Array.from(managed);
      if (!adm.condoId && adm.managedCondoIds.length > 0) {
        adm.condoId = adm.managedCondoIds[0];
        const match = condos.find((c) => c.id === adm.condoId);
        if (match) adm.condoName = match.name;
      }
    });

    return adms;
  }

  // Create or Update ADM Predial with 1 or multiple condominiums
  public saveAdmPredial(data: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    phone: string;
    cargo?: string;
    active: boolean;
    condoIds: string[];
  }): User {
    const users = this.getAllUsers();
    const condos = this.getClientCondos();
    const cleanEmail = data.email.trim().toLowerCase();
    const isNew = !data.id;
    const admId = data.id || `user-adm-${Date.now()}`;

    const primaryCondoId = data.condoIds[0] || 'condo-solar-palmeiras';
    const primaryCondo = condos.find((c) => c.id === primaryCondoId);

    const updatedUser: User = {
      id: admId,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password || 'senha123',
      role: 'admin',
      phone: data.phone.trim(),
      cargo: data.cargo?.trim() || 'ADM Predial',
      active: data.active,
      condoId: primaryCondoId,
      condoName: primaryCondo?.name || 'Condomínio Vinculado',
      managedCondoIds: data.condoIds,
      permissions: {
        canManageUsers: true,
        canConfigCondo: true,
        canDeleteRecords: true,
        canViewReports: true,
        canManageSettings: true,
      },
    };

    const existingIdx = users.findIndex((u) => u.id === admId || u.email.toLowerCase() === cleanEmail);
    if (existingIdx >= 0) {
      users[existingIdx] = {
        ...users[existingIdx],
        ...updatedUser,
        id: users[existingIdx].id,
      };
    } else {
      users.push(updatedUser);
    }
    this.setItem(STORAGE_KEYS.USERS, users);

    // Sync each associated condo in ClientCondos
    let condosChanged = false;
    condos.forEach((c) => {
      if (data.condoIds.includes(c.id)) {
        c.admPredial = {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          password: updatedUser.password || 'senha123',
          phone: updatedUser.phone,
          cargo: updatedUser.cargo || 'ADM Predial',
        };
        condosChanged = true;
      }
    });
    if (condosChanged) {
      this.setItem(STORAGE_KEYS.CLIENT_CONDOS, condos);
    }

    this.addAuditLog(
      isNew ? 'Cadastro de ADM Predial' : 'Atualização de ADM Predial',
      'Dev Master',
      `ADM Predial ${updatedUser.name} (${cleanEmail}) ${isNew ? 'cadastrado' : 'atualizado'} com ${data.condoIds.length} condomínio(s) sob sua gestão`
    );

    return updatedUser;
  }

  // Toggle ADM Active / Inactive
  public toggleAdmActive(userId: string): { success: boolean; active: boolean } {
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { success: false, active: false };

    const newActive = !users[idx].active;
    users[idx].active = newActive;
    this.setItem(STORAGE_KEYS.USERS, users);

    this.addAuditLog(
      'Status ADM Alterado',
      'Dev Master',
      `ADM Predial ${users[idx].name} foi ${newActive ? 'ATIVADO' : 'DESATIVADO'}`
    );

    return { success: true, active: newActive };
  }

  // Reset or Recover Password for an ADM Predial
  public resetAdmPassword(userId: string, newPassword?: string): { success: boolean; password: string; message: string } {
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      return { success: false, password: '', message: 'Usuário ADM não encontrado.' };
    }

    const pass = newPassword || `adm@${Math.floor(100000 + Math.random() * 900000)}`;
    users[idx].password = pass;
    this.setItem(STORAGE_KEYS.USERS, users);

    // Also sync to all managed condos
    const condos = this.getClientCondos();
    let condoChanged = false;
    condos.forEach((c) => {
      if (
        c.admPredial &&
        (c.admPredial.id === userId || c.admPredial.email.toLowerCase() === users[idx].email.toLowerCase())
      ) {
        c.admPredial.password = pass;
        condoChanged = true;
      }
    });
    if (condoChanged) {
      this.setItem(STORAGE_KEYS.CLIENT_CONDOS, condos);
    }

    this.addAuditLog(
      'Redefinição de Senha ADM',
      'Dev Master',
      `Senha do ADM ${users[idx].name} (${users[idx].email}) foi redefinida com sucesso`
    );

    return {
      success: true,
      password: pass,
      message: `Senha de ${users[idx].name} redefinida com sucesso para "${pass}"`,
    };
  }


  // Reset or Recover Password for ANY User (Dev Master privilege)
  public resetUserPassword(userId: string, newPassword: string): { success: boolean; message: string } {
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    const cleanPass = newPassword.trim();
    if (!cleanPass) {
      return { success: false, message: 'Informe a nova senha.' };
    }

    users[idx].password = cleanPass;
    this.setItem(STORAGE_KEYS.USERS, users);

    // Also sync if ADM Predial
    const condos = this.getClientCondos();
    let condoChanged = false;
    condos.forEach((c) => {
      if (
        c.admPredial &&
        (c.admPredial.id === userId || c.admPredial.email.toLowerCase() === users[idx].email.toLowerCase())
      ) {
        c.admPredial.password = cleanPass;
        condoChanged = true;
      }
    });
    if (condoChanged) {
      this.setItem(STORAGE_KEYS.CLIENT_CONDOS, condos);
    }

    this.addAuditLog(
      'Redefinição de Senha de Usuário',
      'Dev Master',
      `Senha do usuário ${users[idx].name} (${users[idx].role}) redefinida pelo Dev Master`
    );

    return {
      success: true,
      message: `Senha de ${users[idx].name} alterada com sucesso!`,
    };
  }

  // Delete ADM Predial
  public deleteAdmPredial(userId: string): { success: boolean } {
    let users = this.getAllUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false };

    users = users.filter((u) => u.id !== userId);
    this.setItem(STORAGE_KEYS.USERS, users);

    this.addAuditLog(
      'Exclusão de ADM Predial',
      'Dev Master',
      `ADM Predial ${target.name} (${target.email}) removido do sistema`
    );

    return { success: true };
  }

  // Quick create a new condominium directly
  public quickCreateCondo(data: {
    name: string;
    cnpj?: string;
    address: string;
    city?: string;
    state?: string;
    blocksCount?: number;
    aptsCount?: number;
    phone?: string;
    email?: string;
    workScale?: CondoWorkScale;
    workScaleStartHour?: string;
    workScaleNotes?: string;
  }): ClientCondo {
    const condos = this.getClientCondos();
    const newId = `condo-${Date.now()}`;
    const chosenScale = data.workScale || '8h_3turnos';
    const chosenStartHour = data.workScaleStartHour || '06:00';
    const newCondo: ClientCondo = {
      id: newId,
      name: data.name.trim(),
      cnpj: data.cnpj?.trim() || undefined,
      address: data.address.trim() || 'Endereço Principal',
      city: data.city?.trim() || 'São Paulo',
      state: data.state?.trim() || 'SP',
      phone: data.phone?.trim() || '(11) 3000-0000',
      email: data.email?.trim() || `contato@${newId}.com.br`,
      active: true,
      status: 'ativo',
      createdAt: new Date().toISOString().split('T')[0],
      blocksCount: Number(data.blocksCount) || 1,
      aptsCount: Number(data.aptsCount) || 20,
      camerasCount: 4,
      workScale: chosenScale,
      workScaleStartHour: chosenStartHour,
      workScaleNotes: data.workScaleNotes || getWorkScaleSummary(chosenScale, chosenStartHour),
      admPredial: {
        id: '',
        name: 'Aguardando Atribuição',
        email: '',
        password: '',
        phone: '',
        cargo: 'ADM Predial',
      },
      notes: 'Condomínio cadastrado pelo Dev Master',
    };

    condos.unshift(newCondo);
    this.setItem(STORAGE_KEYS.CLIENT_CONDOS, condos);
    this.initCondoStarterStructure(newCondo);

    // Also persist condo config item for this condo
    this.setItem(`${STORAGE_KEYS.CONDO}_${newId}`, {
      id: newCondo.id,
      name: newCondo.name,
      cnpj: newCondo.cnpj || '',
      address: newCondo.address,
      city: newCondo.city,
      state: newCondo.state,
      phone: newCondo.phone,
      email: newCondo.email,
      blocksCount: newCondo.blocksCount,
      aptsCount: newCondo.aptsCount,
      workScale: chosenScale,
      workScaleStartHour: chosenStartHour,
      workScaleNotes: newCondo.workScaleNotes,
    });

    this.addAuditLog(
      'Novo Condomínio Criado',
      'Dev Master',
      `Condomínio ${newCondo.name} criado com escala ${chosenScale === '12x36' ? '12hx36h' : '8h em 3 turnos'} (Início: ${chosenStartHour})`
    );
    firestoreSync.syncClientCondo(newCondo);
    return newCondo;
  }

  public switchActiveCondo(condoId: string): { success: boolean; condo?: ClientCondo } {
    const list = this.getClientCondos();
    const target = list.find((c) => c.id === condoId);
    if (!target) return { success: false };

    this.setActiveCondoId(target.id);
    this.addAuditLog('Troca de Contexto Condomínio', 'Dev Master', `Visualização do condomínio ${target.name} iniciada`);
    return { success: true, condo: target };
  }

  public updateCondoWorkScale(
    condoId: string,
    workScale: CondoWorkScale,
    notes?: string,
    startHour: string = '06:00'
  ): { success: boolean } {
    const clientCondos = this.getClientCondos();
    const idx = clientCondos.findIndex((c) => c.id === condoId);
    if (idx >= 0) {
      clientCondos[idx].workScale = workScale;
      clientCondos[idx].workScaleStartHour = startHour;
      if (notes !== undefined) clientCondos[idx].workScaleNotes = notes;
      this.setItem(STORAGE_KEYS.CLIENT_CONDOS, clientCondos);
      firestoreSync.syncClientCondo(clientCondos[idx]);
    }

    if (condoId === 'condo-solar-palmeiras' || condoId === 'condo-1') {
      const config = this.getCondo(condoId);
      config.workScale = workScale;
      config.workScaleStartHour = startHour;
      if (notes !== undefined) config.workScaleNotes = notes;
      this.setItem(STORAGE_KEYS.CONDO, config);
    } else {
      const customConfig = this.getItem<Partial<CondoConfig>>(`${STORAGE_KEYS.CONDO}_${condoId}`, {});
      customConfig.workScale = workScale;
      customConfig.workScaleStartHour = startHour;
      if (notes !== undefined) customConfig.workScaleNotes = notes;
      this.setItem(`${STORAGE_KEYS.CONDO}_${condoId}`, customConfig);
    }

    this.addAuditLog('Alteração de Escala da Portaria', 'Gestão', `Escala do condomínio atualizada para ${workScale === '12x36' ? '12hx36h' : '8h em 3 turnos'} (Entrada inicial: ${startHour})`);
    return { success: true };
  }

  // Condo Config
  public getCondo(specificCondoId?: string): CondoConfig {
    const activeId = specificCondoId || this.getActiveCondoId();
    if (activeId === 'condo-solar-palmeiras' || activeId === 'condo-1') {
      const config = this.getItem<CondoConfig>(STORAGE_KEYS.CONDO, SEED_CONDO);
      if (!config.logoUrl || config.logoUrl.includes('condo_logo_crest')) {
        config.logoUrl = '/app-icon.png';
        localStorage.setItem(STORAGE_KEYS.CONDO, JSON.stringify(config));
      }
      return {
        ...config,
        workScale: config.workScale || '8h_3turnos',
        workScaleStartHour: config.workScaleStartHour || '06:00',
        workScaleNotes: config.workScaleNotes || getWorkScaleSummary(config.workScale || '8h_3turnos', config.workScaleStartHour || '06:00'),
      };
    }

    const clientCondos = this.getClientCondos();
    const client = clientCondos.find((c) => c.id === activeId);
    const customConfig = this.getItem<Partial<CondoConfig>>(`${STORAGE_KEYS.CONDO}_${activeId}`, {});

    if (client) {
      const scale = customConfig.workScale || client.workScale || '8h_3turnos';
      const startHour = customConfig.workScaleStartHour || client.workScaleStartHour || '06:00';
      return {
        id: client.id,
        name: client.name,
        cnpj: client.cnpj || '',
        address: client.address,
        cep: client.cep || '',
        city: client.city,
        state: client.state,
        phone: client.phone,
        email: client.email,
        logoUrl: customConfig.logoUrl || '/app-icon.png',
        facadeUrl: customConfig.facadeUrl || '',
        blocksCount: client.blocksCount,
        aptsCount: client.aptsCount,
        workScale: scale,
        workScaleStartHour: startHour,
        workScaleNotes: customConfig.workScaleNotes || client.workScaleNotes || getWorkScaleSummary(scale, startHour),
        rules: customConfig.rules || {
          deliveryHours: '08:00 às 22:00 todos os dias',
          quietHours: '22:00 às 08:00 (Lei do Silêncio)',
          movingHours: 'Segunda a Sexta das 08h às 17h, Sábado das 08h às 12h (proibido domingos e feriados)',
          visitorPolicy: 'Acesso liberado apenas com confirmação prévia do morador via interfone ou WhatsApp. Identificação com documento com foto obrigatória.',
        },
      };
    }

    return this.getItem<CondoConfig>(STORAGE_KEYS.CONDO, SEED_CONDO);
  }

  public saveCondo(config: CondoConfig) {
    const activeId = config.id || this.getActiveCondoId();
    if (activeId === 'condo-solar-palmeiras' || activeId === 'condo-1') {
      this.setItem(STORAGE_KEYS.CONDO, config);
    } else {
      this.setItem(`${STORAGE_KEYS.CONDO}_${activeId}`, config);
      // Also sync back to ClientCondos list
      const clientCondos = this.getClientCondos();
      const idx = clientCondos.findIndex((c) => c.id === activeId);
      if (idx >= 0) {
        clientCondos[idx] = {
          ...clientCondos[idx],
          name: config.name,
          cnpj: config.cnpj || clientCondos[idx].cnpj,
          address: config.address,
          city: config.city,
          state: config.state,
          phone: config.phone,
          email: config.email,
          blocksCount: config.blocksCount,
          aptsCount: config.aptsCount,
          workScale: config.workScale || clientCondos[idx].workScale || '8h_3turnos',
          workScaleStartHour: config.workScaleStartHour || clientCondos[idx].workScaleStartHour || '06:00',
          workScaleNotes: config.workScaleNotes || clientCondos[idx].workScaleNotes,
        };
        this.setItem(STORAGE_KEYS.CLIENT_CONDOS, clientCondos);
        firestoreSync.syncClientCondo(clientCondos[idx]);
      }
    }
    this.addAuditLog('Configuração do Condomínio', 'Condomínio', `Dados do condomínio ${config.name} atualizados`);
    firestoreSync.syncCondo(config);
  }

  // Blocks
  public getBlocks(): Block[] {
    const key = this.getScopedKey(STORAGE_KEYS.BLOCKS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_BLOCKS : [];
    return this.getItem<Block[]>(key, defaultValue);
  }

  public saveBlock(block: Block) {
    const key = this.getScopedKey(STORAGE_KEYS.BLOCKS);
    const blocks = this.getBlocks();
    const idx = blocks.findIndex((b) => b.id === block.id);
    if (idx >= 0) blocks[idx] = block;
    else blocks.push(block);
    this.setItem(key, blocks);
    firestoreSync.syncBlock(block, this.getActiveCondoId());
    this.addAuditLog('Bloco/Torre', 'Estrutura', `Bloco ${block.name} salvo`);
  }

  public deleteBlock(blockId: string) {
    const key = this.getScopedKey(STORAGE_KEYS.BLOCKS);
    const blocks = this.getBlocks().filter((b) => b.id !== blockId);
    this.setItem(key, blocks);
    firestoreSync.deleteBlock(blockId);
    this.addAuditLog('Bloco/Torre', 'Estrutura', `Bloco ${blockId} removido`);
  }

  // Apartments
  public getApartments(): Apartment[] {
    const key = this.getScopedKey(STORAGE_KEYS.APARTMENTS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_APARTMENTS : [];
    return this.getItem<Apartment[]>(key, defaultValue);
  }

  public saveApartment(apt: Apartment) {
    const key = this.getScopedKey(STORAGE_KEYS.APARTMENTS);
    const apts = this.getApartments();
    const idx = apts.findIndex((a) => a.id === apt.id);
    if (idx >= 0) apts[idx] = apt;
    else apts.push(apt);
    this.setItem(key, apts);
    firestoreSync.syncApartment(apt, this.getActiveCondoId());
    this.addAuditLog('Apartamento', 'Unidade', `Apartamento ${apt.number} salvo`);
  }

  public deleteApartment(aptId: string) {
    const key = this.getScopedKey(STORAGE_KEYS.APARTMENTS);
    const apts = this.getApartments().filter((a) => a.id !== aptId);
    this.setItem(key, apts);
    firestoreSync.deleteApartment(aptId);
    this.addAuditLog('Apartamento', 'Unidade', `Apartamento ${aptId} removido`);
  }

  // Residents
  public getResidents(): Resident[] {
    const key = this.getScopedKey(STORAGE_KEYS.RESIDENTS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_RESIDENTS : [];
    return this.getItem<Resident[]>(key, defaultValue);
  }

  public saveResident(resident: Resident) {
    const key = this.getScopedKey(STORAGE_KEYS.RESIDENTS);
    const list = this.getResidents();
    const idx = list.findIndex((r) => r.id === resident.id);
    if (idx >= 0) list[idx] = resident;
    else list.push(resident);
    this.setItem(key, list);
    firestoreSync.syncResident(resident, this.getActiveCondoId());
    this.addAuditLog('Morador', 'Cadastro', `Morador(a) ${resident.name} salvo(a)`);
  }

  public deleteResident(id: string) {
    const key = this.getScopedKey(STORAGE_KEYS.RESIDENTS);
    const list = this.getResidents();
    const target = list.find((r) => r.id === id);
    this.setItem(key, list.filter((r) => r.id !== id));
    firestoreSync.deleteResident(id);
    if (target) {
      this.addAuditLog('Exclusão Morador', 'Cadastro', `Morador ${target.name} excluído`);
    }
  }

  // Visitors
  public getVisitors(): Visitor[] {
    const key = this.getScopedKey(STORAGE_KEYS.VISITORS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_VISITORS : [];
    return this.getItem<Visitor[]>(key, defaultValue);
  }

  public saveVisitor(visitor: Visitor) {
    const key = this.getScopedKey(STORAGE_KEYS.VISITORS);
    const list = this.getVisitors();
    const idx = list.findIndex((v) => v.id === visitor.id);
    if (idx >= 0) list[idx] = visitor;
    else list.push(visitor);
    this.setItem(key, list);
    firestoreSync.syncVisitor(visitor, this.getActiveCondoId());
    this.addAuditLog('Visitante', 'Visitantes', `Visitante ${visitor.name} salvo(a)`);
  }

  public deleteVisitor(id: string) {
    const key = this.getScopedKey(STORAGE_KEYS.VISITORS);
    const list = this.getVisitors().filter((v) => v.id !== id);
    this.setItem(key, list);
    firestoreSync.deleteVisitor(id);
    this.addAuditLog('Visitante', 'Visitantes', `Visitante ${id} removido`);
  }

  // Contractors
  public getContractors(): Contractor[] {
    const key = this.getScopedKey(STORAGE_KEYS.CONTRACTORS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_CONTRACTORS : [];
    return this.getItem<Contractor[]>(key, defaultValue);
  }

  public saveContractor(contractor: Contractor) {
    const key = this.getScopedKey(STORAGE_KEYS.CONTRACTORS);
    const list = this.getContractors();
    const idx = list.findIndex((c) => c.id === contractor.id);
    if (idx >= 0) list[idx] = contractor;
    else list.push(contractor);
    this.setItem(key, list);
    firestoreSync.syncContractor(contractor, this.getActiveCondoId());
    this.addAuditLog('Prestador de Serviço', 'Prestadores', `Prestador ${contractor.name} (${contractor.company}) salvo`);
  }

  public deleteContractor(id: string) {
    const key = this.getScopedKey(STORAGE_KEYS.CONTRACTORS);
    const list = this.getContractors().filter((c) => c.id !== id);
    this.setItem(key, list);
    firestoreSync.deleteContractor(id);
    this.addAuditLog('Prestador de Serviço', 'Prestadores', `Prestador ${id} removido`);
  }

  // Public Agents
  public getPublicAgents(): PublicAgent[] {
    const key = this.getScopedKey(STORAGE_KEYS.PUBLIC_AGENTS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_PUBLIC_AGENTS : [];
    return this.getItem<PublicAgent[]>(key, defaultValue);
  }

  public savePublicAgent(agent: PublicAgent) {
    const key = this.getScopedKey(STORAGE_KEYS.PUBLIC_AGENTS);
    const list = this.getPublicAgents();
    const idx = list.findIndex((a) => a.id === agent.id);
    if (idx >= 0) list[idx] = agent;
    else list.push(agent);
    this.setItem(key, list);
    this.addAuditLog('Agente Público', 'Órgãos Públicos', `${agent.agency}: ${agent.name} registrado`);
  }

  public deletePublicAgent(id: string) {
    const key = this.getScopedKey(STORAGE_KEYS.PUBLIC_AGENTS);
    const list = this.getPublicAgents().filter((a) => a.id !== id);
    this.setItem(key, list);
    this.addAuditLog('Agente Público', 'Órgãos Públicos', `Agente ${id} removido`);
  }

  // Vehicles
  public getVehicles(): Vehicle[] {
    const key = this.getScopedKey(STORAGE_KEYS.VEHICLES);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_VEHICLES : [];
    return this.getItem<Vehicle[]>(key, defaultValue);
  }

  public saveVehicle(veh: Vehicle) {
    const key = this.getScopedKey(STORAGE_KEYS.VEHICLES);
    const list = this.getVehicles();
    const idx = list.findIndex((v) => v.id === veh.id);
    if (idx >= 0) list[idx] = veh;
    else list.push(veh);
    this.setItem(key, list);
    firestoreSync.syncVehicle(veh, this.getActiveCondoId());
    this.addAuditLog('Veículo', 'Garagem', `Veículo placa ${veh.plate} (${veh.model}) salvo na nuvem Firestore`);
  }

  public deleteVehicle(id: string) {
    const key = this.getScopedKey(STORAGE_KEYS.VEHICLES);
    const list = this.getVehicles().filter((v) => v.id !== id);
    this.setItem(key, list);
    firestoreSync.deleteVehicle(id);
    this.addAuditLog('Veículo', 'Garagem', `Veículo ${id} removido`);
  }

  // Access Logs
  public getAccessLogs(): AccessLog[] {
    const key = this.getScopedKey(STORAGE_KEYS.ACCESS_LOGS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_ACCESS_LOGS : [];
    return this.getItem<AccessLog[]>(key, defaultValue);
  }

  public saveAccessLog(log: AccessLog) {
    const key = this.getScopedKey(STORAGE_KEYS.ACCESS_LOGS);
    const list = this.getAccessLogs();
    const idx = list.findIndex((l) => l.id === log.id);
    if (idx >= 0) list[idx] = log;
    else list.unshift(log); // Newer on top
    this.setItem(key, list);
    firestoreSync.syncAccessLog(log, this.getActiveCondoId());
    this.addAuditLog('Controle de Acesso', 'Acesso', `${log.personType.toUpperCase()}: ${log.personName} - Status: ${log.status} (Persistido Firestore)`);
  }

  // Deliveries
  public getDeliveries(): DeliveryItem[] {
    const key = this.getScopedKey(STORAGE_KEYS.DELIVERIES);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_DELIVERIES : [];
    return this.getItem<DeliveryItem[]>(key, defaultValue);
  }

  public saveDelivery(del: DeliveryItem) {
    const key = this.getScopedKey(STORAGE_KEYS.DELIVERIES);
    const list = this.getDeliveries();
    const idx = list.findIndex((d) => d.id === del.id);
    if (idx >= 0) list[idx] = del;
    else list.unshift(del);
    this.setItem(key, list);
    firestoreSync.syncDelivery(del, this.getActiveCondoId());
    this.addAuditLog('Encomendas / Recebimentos', 'Recebimento', `${del.type.toUpperCase()} ${del.code} para ${del.recipientName} - Status: ${del.status} (Salvo Firestore)`);
  }

  public deleteDelivery(id: string) {
    const key = this.getScopedKey(STORAGE_KEYS.DELIVERIES);
    const list = this.getDeliveries().filter((d) => d.id !== id);
    this.setItem(key, list);
    firestoreSync.deleteDelivery(id);
    this.addAuditLog('Encomenda', 'Recebimento', `Encomenda ${id} excluída`);
  }

  // Occurrences
  public getOccurrences(): Occurrence[] {
    const key = this.getScopedKey(STORAGE_KEYS.OCCURRENCES);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_OCCURRENCES : [];
    return this.getItem<Occurrence[]>(key, defaultValue);
  }

  public saveOccurrence(occ: Occurrence) {
    const key = this.getScopedKey(STORAGE_KEYS.OCCURRENCES);
    const list = this.getOccurrences();
    const idx = list.findIndex((o) => o.id === occ.id);
    if (idx >= 0) list[idx] = occ;
    else list.unshift(occ);
    this.setItem(key, list);
    firestoreSync.syncOccurrence(occ, this.getActiveCondoId());
    this.addAuditLog('Livro de Ocorrências', 'Ocorrência', `Ocorrência ${occ.type} em ${occ.location} - Status: ${occ.status} (Salvo Firestore)`);
  }

  public deleteOccurrence(id: string) {
    const key = this.getScopedKey(STORAGE_KEYS.OCCURRENCES);
    const list = this.getOccurrences().filter((o) => o.id !== id);
    this.setItem(key, list);
    firestoreSync.deleteOccurrence(id);
    this.addAuditLog('Livro de Ocorrências', 'Ocorrência', `Ocorrência ${id} removida`);
  }

  // Lost and Found
  public getLostFound(): LostFoundItem[] {
    const key = this.getScopedKey(STORAGE_KEYS.LOST_FOUND);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_LOST_FOUND : [];
    return this.getItem<LostFoundItem[]>(key, defaultValue);
  }

  public saveLostFound(item: LostFoundItem) {
    const key = this.getScopedKey(STORAGE_KEYS.LOST_FOUND);
    const list = this.getLostFound();
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    this.setItem(key, list);
    this.addAuditLog('Achados e Perdidos', 'Item', `${item.item} - Status: ${item.status}`);
  }

  // Keys & Remote tags
  public getKeys(): KeyControl[] {
    const key = this.getScopedKey(STORAGE_KEYS.KEYS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_KEYS : [];
    return this.getItem<KeyControl[]>(key, defaultValue);
  }

  public saveKey(key: KeyControl) {
    const scopedKey = this.getScopedKey(STORAGE_KEYS.KEYS);
    const list = this.getKeys();
    const idx = list.findIndex((k) => k.id === key.id);
    if (idx >= 0) list[idx] = key;
    else list.unshift(key);
    this.setItem(scopedKey, list);
    this.addAuditLog('Chaves e Controles', 'Controle', `${key.type.toUpperCase()} ${key.number} (${key.identification}) - ${key.status}`);
  }

  // Authorizations
  public getAuthorizations(): Authorization[] {
    const key = this.getScopedKey(STORAGE_KEYS.AUTHORIZATIONS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_AUTHORIZATIONS : [];
    return this.getItem<Authorization[]>(key, defaultValue);
  }

  public saveAuthorization(auth: Authorization) {
    const key = this.getScopedKey(STORAGE_KEYS.AUTHORIZATIONS);
    const list = this.getAuthorizations();
    const idx = list.findIndex((a) => a.id === auth.id);
    if (idx >= 0) list[idx] = auth;
    else list.unshift(auth);
    this.setItem(key, list);
    this.addAuditLog('Autorização', 'Acesso', `Autorização para ${auth.authorizedName} (${auth.type}) salva`);
  }

  // Special services / Removals / Works
  public getSpecialServices(): SpecialService[] {
    const key = this.getScopedKey(STORAGE_KEYS.SPECIAL_SERVICES);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_SPECIAL_SERVICES : [];
    return this.getItem<SpecialService[]>(key, defaultValue);
  }

  public saveSpecialService(spec: SpecialService) {
    const key = this.getScopedKey(STORAGE_KEYS.SPECIAL_SERVICES);
    const list = this.getSpecialServices();
    const idx = list.findIndex((s) => s.id === spec.id);
    if (idx >= 0) list[idx] = spec;
    else list.unshift(spec);
    this.setItem(key, list);
    this.addAuditLog('Serviço Especial / Mudança', 'Operações', `${spec.type.toUpperCase()}: ${spec.responsibleName}`);
  }

  // Shift entries
  public getShiftEntries(): ShiftEntry[] {
    const key = this.getScopedKey(STORAGE_KEYS.SHIFT_ENTRIES);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_SHIFT_ENTRIES : [];
    return this.getItem<ShiftEntry[]>(key, defaultValue);
  }

  public saveShiftEntry(entry: ShiftEntry) {
    const key = this.getScopedKey(STORAGE_KEYS.SHIFT_ENTRIES);
    const list = this.getShiftEntries();
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    this.setItem(key, list);
    firestoreSync.syncShiftEntry(entry, this.getActiveCondoId());
    this.addAuditLog('Turno da Portaria', 'Passagem de Turno', `Turno ${entry.shiftTurn} atualizado (Salvo Firestore)`);
  }

  // WhatsApp Templates
  public getWhatsAppTemplates(): WhatsAppTemplate[] {
    const key = this.getScopedKey(STORAGE_KEYS.WHATSAPP_TEMPLATES);
    return this.getItem<WhatsAppTemplate[]>(key, SEED_WHATSAPP_TEMPLATES);
  }

  public saveWhatsAppTemplate(template: WhatsAppTemplate) {
    const key = this.getScopedKey(STORAGE_KEYS.WHATSAPP_TEMPLATES);
    const list = this.getWhatsAppTemplates();
    const idx = list.findIndex((t) => t.id === template.id);
    if (idx >= 0) list[idx] = template;
    else list.push(template);
    this.setItem(key, list);
    this.addAuditLog('Template WhatsApp', 'Comunicação', `Modelo "${template.title}" salvo`);
  }

  // CCTV Cameras
  public getCCTVCameras(): CCTVCamera[] {
    const key = this.getScopedKey(STORAGE_KEYS.CCTV_CAMERAS);
    const activeId = this.getActiveCondoId();
    let defaultCameras = SEED_CCTV_CAMERAS;
    if (activeId !== 'condo-solar-palmeiras') {
      defaultCameras = [
        {
          id: `cam-${activeId}-1`,
          name: 'Portão Social / Pedestres',
          zone: 'portao_social',
          location: 'Acesso Principal',
          status: 'online',
          feedType: 'simulated_live',
          snapshotUrl: '/src/assets/images/cctv_entrance_gate_1790763519317.jpg',
          brand: 'Intelbras Multi-HD',
          dvrHost: '192.168.1.100',
          dvrChannel: 1,
          resolution: '1080p FHD',
        },
        {
          id: `cam-${activeId}-2`,
          name: 'Hall e Recepção',
          zone: 'hall_torre_a',
          location: 'Térreo',
          status: 'online',
          feedType: 'simulated_live',
          snapshotUrl: '/src/assets/images/cctv_lobby_view_1790763531511.jpg',
          brand: 'Intelbras Multi-HD',
          dvrHost: '192.168.1.100',
          dvrChannel: 2,
          resolution: '1080p FHD',
        },
        {
          id: `cam-${activeId}-3`,
          name: 'Garagem e Estacionamento',
          zone: 'garagem_subsolo',
          location: 'Subsolo / Vagas',
          status: 'online',
          feedType: 'simulated_live',
          snapshotUrl: '/src/assets/images/cctv_garage_view_1791111418063.jpg',
          brand: 'Intelbras Multi-HD',
          dvrHost: '192.168.1.100',
          dvrChannel: 3,
          resolution: '1080p FHD',
        },
        {
          id: `cam-${activeId}-4`,
          name: 'Perímetro e Muros Externos',
          zone: 'perimetro',
          location: 'Muro Perimetral',
          status: 'online',
          feedType: 'simulated_live',
          snapshotUrl: '/src/assets/images/cctv_perimeter_wall_1791111446334.jpg',
          brand: 'Intelbras Multi-HD',
          dvrHost: '192.168.1.100',
          dvrChannel: 4,
          resolution: '1080p FHD',
        },
      ];
    }
    return this.getItem<CCTVCamera[]>(key, defaultCameras);
  }

  public saveCCTVCamera(camera: CCTVCamera) {
    const key = this.getScopedKey(STORAGE_KEYS.CCTV_CAMERAS);
    const list = this.getCCTVCameras();
    const idx = list.findIndex((c) => c.id === camera.id);
    if (idx >= 0) list[idx] = camera;
    else list.push(camera);
    this.setItem(key, list);
    firestoreSync.syncCCTVCamera(camera);
    this.addAuditLog('Câmera CFTV', 'Segurança', `Câmera ${camera.name} (${camera.location}) configurada`);
  }

  public deleteCCTVCamera(id: string) {
    const key = this.getScopedKey(STORAGE_KEYS.CCTV_CAMERAS);
    const list = this.getCCTVCameras();
    const target = list.find((c) => c.id === id);
    this.setItem(key, list.filter((c) => c.id !== id));
    firestoreSync.deleteCCTVCamera(id);
    if (target) {
      this.addAuditLog('Câmera CFTV Removida', 'Segurança', `Câmera ${target.name} removida`);
    }
  }

  // Communication Notices (Mural de Avisos)
  public getNotices(): CommunicationNotice[] {
    const key = this.getScopedKey(STORAGE_KEYS.COMMUNICATION_NOTICES);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_COMMUNICATION_NOTICES : [];
    return this.getItem<CommunicationNotice[]>(key, defaultValue);
  }

  public saveNotice(notice: CommunicationNotice) {
    const key = this.getScopedKey(STORAGE_KEYS.COMMUNICATION_NOTICES);
    const list = this.getNotices();
    const idx = list.findIndex((n) => n.id === notice.id);
    if (idx >= 0) list[idx] = notice;
    else list.unshift(notice);
    this.setItem(key, list);
    this.addAuditLog('Comunicado Geral', 'Comunicação', `Comunicado "${notice.title}" (${notice.category}) publicado`);
  }

  public deleteNotice(id: string) {
    const key = this.getScopedKey(STORAGE_KEYS.COMMUNICATION_NOTICES);
    const list = this.getNotices();
    const target = list.find((n) => n.id === id);
    this.setItem(key, list.filter((n) => n.id !== id));
    if (target) {
      this.addAuditLog('Exclusão de Comunicado', 'Comunicação', `Comunicado "${target.title}" removido`);
    }
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    const key = this.getScopedKey(STORAGE_KEYS.AUDIT_LOGS);
    const defaultValue = this.getActiveCondoId() === 'condo-solar-palmeiras' ? SEED_AUDIT_LOGS : [];
    return this.getItem<AuditLog[]>(key, defaultValue);
  }

  public addAuditLog(action: string, entity: string, details: string) {
    const user = this.getCurrentUser();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      userName: user ? user.name : 'Operador Portaria',
      userRole: user ? user.role : 'porteiro',
      action,
      entity,
      details,
    };

    const key = this.getScopedKey(STORAGE_KEYS.AUDIT_LOGS);
    const logs = this.getAuditLogs();
    logs.unshift(newLog);
    if (logs.length > 500) logs.pop();
    this.setItem(key, logs);
  }

  // ==========================================
  // BACKUP & AUTOMATIC SNAPSHOTS SYSTEM
  // ==========================================

  public triggerBrowserDownload(filename: string, content: string, mimeType = 'application/json'): boolean {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') return false;
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (e) {
      console.error('[Storage] Error triggering browser download:', e);
      return false;
    }
  }

  public getBackupConfig(): BackupConfig {
    const defaultConfig: BackupConfig = {
      autoSnapshotOnShiftClose: true,
      forceDownloadOnShiftClose: true,
      autoDailySnapshotOnLogin: true,
      maxLocalSnapshots: 30,
      lastDailyBackupDate: undefined,
    };
    return this.getItem<BackupConfig>(STORAGE_KEYS.BACKUP_CONFIG, defaultConfig);
  }

  public saveBackupConfig(config: Partial<BackupConfig>) {
    const current = this.getBackupConfig();
    const updated: BackupConfig = { ...current, ...config };
    this.setItem(STORAGE_KEYS.BACKUP_CONFIG, updated);
    this.addAuditLog('Configuração de Backup', 'Segurança', 'Parâmetros de backup diário e fechamento de turno atualizados.');
  }

  public getBackupSnapshots(): BackupSnapshot[] {
    const list = this.getItem<BackupSnapshot[]>(STORAGE_KEYS.BACKUP_SNAPSHOTS, []);
    return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  public saveBackupSnapshot(snapshot: BackupSnapshot) {
    const list = this.getBackupSnapshots();
    const config = this.getBackupConfig();
    const existingIdx = list.findIndex((s) => s.id === snapshot.id);
    if (existingIdx >= 0) {
      list[existingIdx] = snapshot;
    } else {
      list.unshift(snapshot);
    }
    // Limit to max retention to preserve local browser storage
    const max = config.maxLocalSnapshots || 30;
    while (list.length > max) {
      list.pop();
    }
    this.setItem(STORAGE_KEYS.BACKUP_SNAPSHOTS, list);
  }

  public deleteBackupSnapshot(id: string) {
    const list = this.getBackupSnapshots().filter((s) => s.id !== id);
    this.setItem(STORAGE_KEYS.BACKUP_SNAPSHOTS, list);
    this.addAuditLog('Exclusão de Snapshot', 'Segurança', `Snapshot de backup ${id} removido do armazenamento local.`);
  }

  /**
   * Creates an automatic or manual backup snapshot of occurrences and access logs (and all database state).
   * Saves it to browser localStorage, and optionally triggers a forced file download.
   */
  public createBackupSnapshot(
    trigger: BackupTrigger = 'manual',
    operatorName?: string,
    forceDownload?: boolean,
    notes?: string
  ): BackupSnapshot {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const timestamp = `${dateStr} ${timeStr}`;
    const fileTimestamp = `${dateStr}_${pad(now.getHours())}h${pad(now.getMinutes())}`;

    const condo = this.getCondo();
    const currentUser = this.getCurrentUser();
    const effectiveOperator = operatorName || currentUser?.name || 'Portaria';

    const occurrences = this.getOccurrences();
    const accessLogs = this.getAccessLogs();
    const visitors = this.getVisitors();
    const deliveries = this.getDeliveries();
    const shifts = this.getShiftEntries();

    // Export full state for disaster recovery
    const fullState: Record<string, unknown> = {};
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      if (key !== STORAGE_KEYS.BACKUP_SNAPSHOTS) {
        fullState[name] = this.getItem(key, null);
      }
    }

    const id = `snap-${Date.now()}`;
    const snapshot: BackupSnapshot = {
      id,
      timestamp,
      date: dateStr,
      trigger,
      operatorName: effectiveOperator,
      operatorRole: currentUser?.role || 'porteiro',
      condoId: condo.id,
      condoName: condo.name,
      shiftTurn: currentUser?.shiftTurn,
      notes:
        notes ||
        `Backup gerado via ${
          trigger === 'shift_handover'
            ? 'Fechamento de Turno'
            : trigger === 'daily_auto'
            ? 'Rotina Diária Automática'
            : 'Solicitação Manual'
        }.`,
      counts: {
        occurrences: occurrences.length,
        accessLogs: accessLogs.length,
        visitors: visitors.length,
        deliveries: deliveries.length,
        shifts: shifts.length,
      },
      data: {
        occurrences,
        accessLogs,
        visitors,
        deliveries,
        shifts,
        fullBackup: fullState,
      },
      downloaded: false,
    };

    const cleanCondo = condo.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
    const filename = `backup_portaria_${cleanCondo}_${trigger}_${fileTimestamp}.json`;
    const jsonString = JSON.stringify(snapshot, null, 2);
    snapshot.fileSizeKb = Math.round((jsonString.length / 1024) * 10) / 10;

    // Check config if forceDownload is requested or defaults to true for shift close
    const config = this.getBackupConfig();
    const shouldDownload =
      forceDownload !== undefined
        ? forceDownload
        : trigger === 'shift_handover'
        ? config.forceDownloadOnShiftClose
        : false;

    if (shouldDownload) {
      const downloadedOk = this.triggerBrowserDownload(filename, jsonString);
      snapshot.downloaded = downloadedOk;
    }

    // Save snapshot in browser localStorage
    this.saveBackupSnapshot(snapshot);

    // Update config lastDailyBackupDate
    if (trigger === 'daily_auto' || trigger === 'shift_handover') {
      const currentConf = this.getBackupConfig();
      currentConf.lastDailyBackupDate = dateStr;
      this.setItem(STORAGE_KEYS.BACKUP_CONFIG, currentConf);
    }

    this.addAuditLog(
      'Backup Automático',
      'Segurança',
      `Snapshot (${trigger}) salvo: ${occurrences.length} ocorrências e ${accessLogs.length} acessos gravados localmente.${
        shouldDownload ? ' Download forçado do arquivo executado.' : ''
      }`
    );

    return snapshot;
  }

  public downloadSnapshotFile(snapshotOrId: BackupSnapshot | string): boolean {
    let snapshot: BackupSnapshot | undefined;
    if (typeof snapshotOrId === 'string') {
      snapshot = this.getBackupSnapshots().find((s) => s.id === snapshotOrId);
    } else {
      snapshot = snapshotOrId;
    }

    if (!snapshot) return false;

    const safeDate = snapshot.date.replace(/-/g, '');
    const cleanCondo = (snapshot.condoName || 'portaria').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
    const filename = `snapshot_${cleanCondo}_${snapshot.trigger}_${safeDate}_${snapshot.id.slice(-6)}.json`;
    const jsonString = JSON.stringify(snapshot, null, 2);

    const ok = this.triggerBrowserDownload(filename, jsonString);
    if (ok) {
      snapshot.downloaded = true;
      this.saveBackupSnapshot(snapshot);
      this.addAuditLog('Download de Snapshot', 'Segurança', `Arquivo ${filename} baixado.`);
    }
    return ok;
  }

  public restoreBackupSnapshot(
    snapshotOrId: BackupSnapshot | string,
    mode: 'full' | 'occurrences_access' = 'full'
  ): boolean {
    try {
      let snapshot: BackupSnapshot | undefined;
      if (typeof snapshotOrId === 'string') {
        snapshot = this.getBackupSnapshots().find((s) => s.id === snapshotOrId);
      } else {
        snapshot = snapshotOrId;
      }
      if (!snapshot) return false;

      if (mode === 'occurrences_access') {
        if (snapshot.data.occurrences) {
          this.setItem(this.getScopedKey(STORAGE_KEYS.OCCURRENCES), snapshot.data.occurrences);
        }
        if (snapshot.data.accessLogs) {
          this.setItem(this.getScopedKey(STORAGE_KEYS.ACCESS_LOGS), snapshot.data.accessLogs);
        }
      } else {
        // Full restore
        if (snapshot.data.fullBackup) {
          for (const [name, key] of Object.entries(STORAGE_KEYS)) {
            if (snapshot.data.fullBackup[name] !== undefined) {
              localStorage.setItem(key, JSON.stringify(snapshot.data.fullBackup[name]));
            }
          }
        } else {
          if (snapshot.data.occurrences) this.setItem(this.getScopedKey(STORAGE_KEYS.OCCURRENCES), snapshot.data.occurrences);
          if (snapshot.data.accessLogs) this.setItem(this.getScopedKey(STORAGE_KEYS.ACCESS_LOGS), snapshot.data.accessLogs);
          if (snapshot.data.visitors) this.setItem(this.getScopedKey(STORAGE_KEYS.VISITORS), snapshot.data.visitors);
          if (snapshot.data.deliveries) this.setItem(this.getScopedKey(STORAGE_KEYS.DELIVERIES), snapshot.data.deliveries);
          if (snapshot.data.shifts) this.setItem(this.getScopedKey(STORAGE_KEYS.SHIFT_ENTRIES), snapshot.data.shifts);
        }
      }

      this.addAuditLog('Restauração de Snapshot', 'Segurança', `Snapshot ${snapshot.id} restaurado (Modo: ${mode}).`);
      this.notify();
      return true;
    } catch (e) {
      console.error('[Storage] Error restoring snapshot:', e);
      return false;
    }
  }

  public checkAndRunDailyAutoBackup(): void {
    try {
      const config = this.getBackupConfig();
      if (!config.autoDailySnapshotOnLogin) return;

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      if (config.lastDailyBackupDate !== todayStr) {
        this.createBackupSnapshot(
          'daily_auto',
          'Sistema Automático',
          false,
          'Snapshot diário de segurança gravado no armazenamento local do navegador.'
        );
      }
    } catch (e) {
      console.warn('[Storage] Failed daily auto backup check', e);
    }
  }

  // Backup & Restore
  public exportBackupJSON(): string {
    const fullState: Record<string, unknown> = {};
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      fullState[name] = this.getItem(key, null);
    }
    return JSON.stringify(fullState, null, 2);
  }

  public importBackupJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      // Support either raw fullState or a snapshot object
      const dataObj = parsed.data?.fullBackup || parsed;
      for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        if (dataObj[name] !== undefined) {
          localStorage.setItem(key, JSON.stringify(dataObj[name]));
        }
      }
      this.addAuditLog('Restauração de Backup', 'Sistema', 'Backup do sistema restaurado com sucesso.');
      this.notify();
      return true;
    } catch (e) {
      console.error('Failed to import backup', e);
      return false;
    }
  }
}

export const storage = new StorageService();

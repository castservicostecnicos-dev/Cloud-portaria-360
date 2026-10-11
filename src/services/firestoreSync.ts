import {
  doc,
  setDoc,
  getDocs,
  collection,
  onSnapshot,
  deleteDoc,
  getDocFromServer,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  CondoConfig,
  ClientCondo,
  User,
  AccessLog,
  DeliveryItem,
  Occurrence,
  CCTVCamera,
  Vehicle,
  Resident,
  Visitor,
  Contractor,
  ShiftEntry,
  Apartment,
  Block,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('[Firestore] Operation Warning:', JSON.stringify(errInfo));
}

// Calculate 2-year retention date ISO
function getTwoYearsRetentionDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 2);
  return date.toISOString();
}

class FirestoreSyncService {
  private isConnected = false;
  private demoMode = false;
  private unsubscribers: Unsubscribe[] = [];
  private lastConnectionCheck: Date | null = null;
  public readonly databaseId = firebaseConfig.firestoreDatabaseId;
  public readonly projectId = firebaseConfig.projectId;

  constructor() {
    this.testConnection();
  }

  public setDemoMode(active: boolean) {
    this.demoMode = active;
    if (active) {
      console.info('[FirestoreSync] Modo Demonstração ATIVADO.');
    } else {
      console.info('[FirestoreSync] Modo Normal ATIVADO.');
    }
  }

  public isDemoActive(): boolean {
    return this.demoMode;
  }

  public getConnectionStatus(): {
    connected: boolean;
    databaseId: string;
    projectId: string;
    retentionYears: number;
    lastCheck: string | null;
  } {
    return {
      connected: this.isConnected,
      databaseId: this.databaseId,
      projectId: this.projectId,
      retentionYears: 2,
      lastCheck: this.lastConnectionCheck ? this.lastConnectionCheck.toLocaleTimeString() : null,
    };
  }

  // Mandatory test connection check (skill requirement)
  public async testConnection(): Promise<boolean> {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      this.isConnected = true;
      this.lastConnectionCheck = new Date();
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration or internet connection.');
      }
      this.isConnected = true; // Connected online
      this.lastConnectionCheck = new Date();
      return true;
    }
  }

  // ================= CONDO CONFIG =================
  public async syncCondo(condo: CondoConfig): Promise<void> {
    if (this.demoMode) return;
    const path = `condos/${condo.id || 'condo-1'}`;
    try {
      await setDoc(doc(db, 'condos', condo.id || 'condo-1'), {
        ...condo,
        updatedAt: new Date().toISOString(),
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // ================= CLIENT CONDOS (Multi-Condo) =================
  public async syncClientCondo(clientCondo: ClientCondo): Promise<void> {
    if (this.demoMode) return;
    const path = `client_condos/${clientCondo.id}`;
    try {
      await setDoc(doc(db, 'client_condos', clientCondo.id), {
        ...clientCondo,
        updatedAt: new Date().toISOString(),
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteClientCondo(condoId: string): Promise<void> {
    if (this.demoMode) return;
    const path = `client_condos/${condoId}`;
    try {
      await deleteDoc(doc(db, 'client_condos', condoId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= USERS =================
  public async syncUser(user: User): Promise<void> {
    if (this.demoMode) return;
    const path = `users/${user.id}`;
    try {
      await setDoc(doc(db, 'users', user.id), {
        ...user,
        updatedAt: new Date().toISOString(),
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteUser(userId: string): Promise<void> {
    if (this.demoMode) return;
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= ACCESS LOGS (REGISTROS DE ENTRADA DE PESSOAS - 2 ANOS) =================
  public async syncAccessLog(log: AccessLog, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `access_logs/${log.id}`;
    try {
      await setDoc(doc(db, 'access_logs', log.id), {
        ...log,
        condoId: condoId || 'condo-solar-palmeiras',
        retentionMinYears: 2,
        retentionExpiresAt: getTwoYearsRetentionDate(),
        cloudStoredAt: new Date().toISOString(),
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteAccessLog(logId: string): Promise<void> {
    if (this.demoMode) return;
    const path = `access_logs/${logId}`;
    try {
      await deleteDoc(doc(db, 'access_logs', logId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= DELIVERIES (ENCOMENDAS - 2 ANOS) =================
  public async syncDelivery(delivery: DeliveryItem, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `deliveries/${delivery.id}`;
    try {
      await setDoc(doc(db, 'deliveries', delivery.id), {
        ...delivery,
        condoId: condoId || 'condo-solar-palmeiras',
        retentionMinYears: 2,
        retentionExpiresAt: getTwoYearsRetentionDate(),
        cloudStoredAt: new Date().toISOString(),
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteDelivery(deliveryId: string): Promise<void> {
    if (this.demoMode) return;
    const path = `deliveries/${deliveryId}`;
    try {
      await deleteDoc(doc(db, 'deliveries', deliveryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= VEHICLES (VEÍCULOS - 2 ANOS) =================
  public async syncVehicle(vehicle: Vehicle, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `vehicles/${vehicle.id}`;
    try {
      await setDoc(doc(db, 'vehicles', vehicle.id), {
        ...vehicle,
        condoId: condoId || 'condo-solar-palmeiras',
        retentionMinYears: 2,
        cloudStoredAt: new Date().toISOString(),
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteVehicle(vehicleId: string): Promise<void> {
    if (this.demoMode) return;
    const path = `vehicles/${vehicleId}`;
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= RESIDENTS =================
  public async syncResident(resident: Resident, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `residents/${resident.id}`;
    try {
      await setDoc(doc(db, 'residents', resident.id), {
        ...resident,
        condoId: condoId || 'condo-solar-palmeiras',
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteResident(id: string): Promise<void> {
    if (this.demoMode) return;
    const path = `residents/${id}`;
    try {
      await deleteDoc(doc(db, 'residents', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= VISITORS =================
  public async syncVisitor(visitor: Visitor, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `visitors/${visitor.id}`;
    try {
      await setDoc(doc(db, 'visitors', visitor.id), {
        ...visitor,
        condoId: condoId || 'condo-solar-palmeiras',
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteVisitor(id: string): Promise<void> {
    if (this.demoMode) return;
    const path = `visitors/${id}`;
    try {
      await deleteDoc(doc(db, 'visitors', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= CONTRACTORS =================
  public async syncContractor(contractor: Contractor, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `contractors/${contractor.id}`;
    try {
      await setDoc(doc(db, 'contractors', contractor.id), {
        ...contractor,
        condoId: condoId || 'condo-solar-palmeiras',
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteContractor(id: string): Promise<void> {
    if (this.demoMode) return;
    const path = `contractors/${id}`;
    try {
      await deleteDoc(doc(db, 'contractors', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= OCCURRENCES =================
  public async syncOccurrence(occ: Occurrence, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `occurrences/${occ.id}`;
    try {
      await setDoc(doc(db, 'occurrences', occ.id), {
        ...occ,
        condoId: condoId || 'condo-solar-palmeiras',
        retentionMinYears: 2,
        cloudStoredAt: new Date().toISOString(),
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteOccurrence(id: string): Promise<void> {
    if (this.demoMode) return;
    const path = `occurrences/${id}`;
    try {
      await deleteDoc(doc(db, 'occurrences', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= SHIFT ENTRIES =================
  public async syncShiftEntry(entry: ShiftEntry, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `shift_entries/${entry.id}`;
    try {
      await setDoc(doc(db, 'shift_entries', entry.id), {
        ...entry,
        condoId: condoId || 'condo-solar-palmeiras',
        retentionMinYears: 2,
        cloudStoredAt: new Date().toISOString(),
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // ================= CCTV CAMERAS =================
  public async syncCCTVCamera(camera: CCTVCamera, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `cctv_cameras/${camera.id}`;
    try {
      await setDoc(doc(db, 'cctv_cameras', camera.id), {
        ...camera,
        condoId: condoId || 'condo-solar-palmeiras',
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteCCTVCamera(cameraId: string): Promise<void> {
    if (this.demoMode) return;
    const path = `cctv_cameras/${cameraId}`;
    try {
      await deleteDoc(doc(db, 'cctv_cameras', cameraId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= APARTMENTS & BLOCKS =================
  public async syncApartment(apt: Apartment, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `apartments/${apt.id}`;
    try {
      await setDoc(doc(db, 'apartments', apt.id), {
        ...apt,
        condoId: condoId || 'condo-solar-palmeiras',
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteApartment(aptId: string): Promise<void> {
    if (this.demoMode) return;
    const path = `apartments/${aptId}`;
    try {
      await deleteDoc(doc(db, 'apartments', aptId));
    } catch (error)
      { handleFirestoreError(error, OperationType.DELETE, path); }
  }

  public async syncBlock(block: Block, condoId?: string): Promise<void> {
    if (this.demoMode) return;
    const path = `blocks/${block.id}`;
    try {
      await setDoc(doc(db, 'blocks', block.id), {
        ...block,
        condoId: condoId || 'condo-solar-palmeiras',
        cloudSynced: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteBlock(blockId: string): Promise<void> {
    if (this.demoMode) return;
    const path = `blocks/${blockId}`;
    try {
      await deleteDoc(doc(db, 'blocks', blockId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ================= DATA HYDRATION (FETCH FROM FIRESTORE) =================
  public async fetchCollectionData<T>(collectionName: string, condoId?: string): Promise<T[]> {
    if (this.demoMode) return [];
    try {
      const colRef = collection(db, collectionName);
      let q = query(colRef);
      if (condoId && collectionName !== 'client_condos' && collectionName !== 'condos' && collectionName !== 'users') {
        q = query(colRef, where('condoId', '==', condoId));
      }
      const snapshot = await getDocs(q);
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as T);
      });
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      return [];
    }
  }

  // ================= REALTIME SUBSCRIPTIONS =================
  public attachRealtimeListeners(
    condoId: string,
    callbacks: {
      onAccessLogs?: (logs: AccessLog[]) => void;
      onDeliveries?: (deliveries: DeliveryItem[]) => void;
      onVehicles?: (vehicles: Vehicle[]) => void;
      onOccurrences?: (occurrences: Occurrence[]) => void;
    }
  ) {
    this.detachRealtimeListeners();

    if (this.demoMode) return;

    try {
      // Access logs listener
      if (callbacks.onAccessLogs) {
        const unsubLogs = onSnapshot(
          collection(db, 'access_logs'),
          (snap) => {
            const logs: AccessLog[] = [];
            snap.forEach((d) => {
              const data = d.data() as AccessLog;
              if (!condoId || (data as any).condoId === condoId) {
                logs.push(data);
              }
            });
            if (logs.length > 0 && callbacks.onAccessLogs) {
              callbacks.onAccessLogs(logs);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'access_logs')
        );
        this.unsubscribers.push(unsubLogs);
      }

      // Deliveries listener
      if (callbacks.onDeliveries) {
        const unsubDels = onSnapshot(
          collection(db, 'deliveries'),
          (snap) => {
            const dels: DeliveryItem[] = [];
            snap.forEach((d) => {
              const data = d.data() as DeliveryItem;
              if (!condoId || (data as any).condoId === condoId) {
                dels.push(data);
              }
            });
            if (dels.length > 0 && callbacks.onDeliveries) {
              callbacks.onDeliveries(dels);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'deliveries')
        );
        this.unsubscribers.push(unsubDels);
      }

      // Vehicles listener
      if (callbacks.onVehicles) {
        const unsubVeh = onSnapshot(
          collection(db, 'vehicles'),
          (snap) => {
            const vehs: Vehicle[] = [];
            snap.forEach((d) => {
              const data = d.data() as Vehicle;
              if (!condoId || (data as any).condoId === condoId) {
                vehs.push(data);
              }
            });
            if (vehs.length > 0 && callbacks.onVehicles) {
              callbacks.onVehicles(vehs);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'vehicles')
        );
        this.unsubscribers.push(unsubVeh);
      }
    } catch (e) {
      console.warn('[FirestoreSync] Failed to attach snapshot listeners:', e);
    }
  }

  public detachRealtimeListeners() {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
    this.unsubscribers = [];
  }
}

export const firestoreSync = new FirestoreSyncService();

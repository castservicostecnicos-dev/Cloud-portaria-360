import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  deleteDoc,
  getDocFromServer,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  CondoConfig,
  ClientCondo,
  User,
  AccessLog,
  DeliveryItem,
  Occurrence,
  CCTVCamera,
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
  console.warn('Firestore Cloud Operation Notice:', JSON.stringify(errInfo));
}

class FirestoreSyncService {
  private isConnected = false;
  private demoMode = false;

  constructor() {
    this.testConnection();
  }

  public setDemoMode(active: boolean) {
    this.demoMode = active;
    if (active) {
      console.info('[FirestoreSync] Modo Demonstração ATIVADO: Gravações no banco de dados Firestore estão 100% bloqueadas.');
    } else {
      console.info('[FirestoreSync] Modo Demonstração DESATIVADO: Sincronização normal reestabelecida.');
    }
  }

  public isDemoActive(): boolean {
    return this.demoMode;
  }

  // Mandatory test connection check
  public async testConnection(): Promise<boolean> {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      this.isConnected = true;
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration or internet connection.');
      }
      this.isConnected = true; // Still allow operation if online
      return false;
    }
  }

  // CONDO CONFIG
  public async syncCondo(condo: CondoConfig): Promise<void> {
    if (this.demoMode) return;
    const path = `condos/${condo.id || 'condo-1'}`;
    try {
      await setDoc(doc(db, 'condos', condo.id || 'condo-1'), {
        ...condo,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // CLIENT CONDOS (Multi-Condo Dev Management)
  public async syncClientCondo(clientCondo: ClientCondo): Promise<void> {
    if (this.demoMode) return;
    const path = `client_condos/${clientCondo.id}`;
    try {
      await setDoc(doc(db, 'client_condos', clientCondo.id), clientCondo);
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

  // USERS
  public async syncUser(user: User): Promise<void> {
    if (this.demoMode) return;
    const path = `users/${user.id}`;
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // ACCESS LOGS
  public async syncAccessLog(log: AccessLog): Promise<void> {
    if (this.demoMode) return;
    const path = `access_logs/${log.id}`;
    try {
      await setDoc(doc(db, 'access_logs', log.id), log);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // DELIVERIES
  public async syncDelivery(delivery: DeliveryItem): Promise<void> {
    if (this.demoMode) return;
    const path = `deliveries/${delivery.id}`;
    try {
      await setDoc(doc(db, 'deliveries', delivery.id), delivery);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // OCCURRENCES
  public async syncOccurrence(occ: Occurrence): Promise<void> {
    if (this.demoMode) return;
    const path = `occurrences/${occ.id}`;
    try {
      await setDoc(doc(db, 'occurrences', occ.id), occ);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // CCTV CAMERAS
  public async syncCCTVCamera(camera: CCTVCamera): Promise<void> {
    if (this.demoMode) return;
    const path = `cctv_cameras/${camera.id}`;
    try {
      await setDoc(doc(db, 'cctv_cameras', camera.id), camera);
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
}

export const firestoreSync = new FirestoreSyncService();

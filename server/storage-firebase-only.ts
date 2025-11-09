/**
 * 🔥 STORAGE UNIFICADO FIREBASE-ONLY
 * Sistema completamente migrado que usa únicamente Firebase
 * Elimina completamente la dependencia de PostgreSQL
 * IMPORTANTE: Usa Firebase Admin SDK para bypasear reglas de Firestore
 */

import { adminApp } from './firebase-admin';
import { 
  FirebaseClient, 
  InsertFirebaseClient, 
  FirebaseUser, 
  InsertFirebaseUser,
  FIREBASE_COLLECTIONS 
} from '../shared/firebase-schema';
import FirebaseOnlyStorage from './FirebaseOnlyStorage';

// Interfaz unificada para operaciones Firebase-only
export interface IFirebaseOnlyManager {
  // Client operations
  getClients(firebaseUid: string): Promise<FirebaseClient[]>;
  getClient(firebaseUid: string, clientId: string): Promise<FirebaseClient | null>;
  createClient(firebaseUid: string, client: InsertFirebaseClient): Promise<FirebaseClient>;
  updateClient(firebaseUid: string, clientId: string, updates: Partial<FirebaseClient>): Promise<FirebaseClient>;
  deleteClient(firebaseUid: string, clientId: string): Promise<void>;
  
  // User operations
  getUser(firebaseUid: string): Promise<FirebaseUser | null>;
  createUser(firebaseUid: string, userData: InsertFirebaseUser): Promise<FirebaseUser>;
  
  // Health check
  healthCheck(): Promise<boolean>;
}

// Manager principal que gestiona toda la arquitectura Firebase
class FirebaseOnlyManager implements IFirebaseOnlyManager {
  private firebaseApp: any;
  private storage: FirebaseOnlyStorage;
  private initialized: boolean = false;

  constructor() {
    console.log('🔥 [FIREBASE-MANAGER] Inicializando arquitectura Firebase-only con Admin SDK...');
    
    try {
      // Usar la instancia de Admin SDK que ya está inicializada
      // El Admin SDK bypasea las reglas de Firestore
      if (!adminApp) {
        throw new Error('❌ Firebase Admin SDK no inicializado en server/firebase-admin.ts');
      }
      
      this.firebaseApp = adminApp;
      console.log('✅ [FIREBASE-MANAGER] Usando Firebase Admin SDK (bypasea reglas de Firestore)');
      
      // Inicializar storage con Admin SDK
      this.storage = new FirebaseOnlyStorage(this.firebaseApp);
      console.log('✅ [FIREBASE-MANAGER] Firebase Storage inicializado con Admin SDK');
      
      this.initialized = true;
      console.log('🎉 [FIREBASE-MANAGER] Sistema unificado Firebase-only listo');
      
    } catch (error) {
      console.error('❌ [FIREBASE-MANAGER] Error en inicialización:', error);
      throw error;
    }
  }

  private validateEnvironment(): void {
    // Admin SDK usa service account, no necesita estas variables
    console.log('✅ [FIREBASE-MANAGER] Firebase Admin SDK configurado globalmente');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('❌ [FIREBASE-MANAGER] Sistema no inicializado correctamente');
    }
  }

  // ================================
  // CLIENT OPERATIONS
  // ================================

  async getClients(firebaseUid: string): Promise<FirebaseClient[]> {
    this.ensureInitialized();
    console.log(`🔄 [FIREBASE-MANAGER] Obteniendo clientes para: ${firebaseUid}`);
    
    try {
      const clients = await this.storage.getClients(firebaseUid);
      console.log(`✅ [FIREBASE-MANAGER] ${clients.length} clientes obtenidos exitosamente`);
      return clients;
    } catch (error) {
      console.error(`❌ [FIREBASE-MANAGER] Error obteniendo clientes:`, error);
      throw error;
    }
  }

  async getClient(firebaseUid: string, clientId: string): Promise<FirebaseClient | null> {
    this.ensureInitialized();
    console.log(`🔄 [FIREBASE-MANAGER] Obteniendo cliente ${clientId} para: ${firebaseUid}`);
    
    try {
      const client = await this.storage.getClient(firebaseUid, clientId);
      if (client) {
        console.log(`✅ [FIREBASE-MANAGER] Cliente ${clientId} encontrado`);
      } else {
        console.log(`⚠️ [FIREBASE-MANAGER] Cliente ${clientId} no encontrado`);
      }
      return client;
    } catch (error) {
      console.error(`❌ [FIREBASE-MANAGER] Error obteniendo cliente ${clientId}:`, error);
      throw error;
    }
  }

  async createClient(firebaseUid: string, client: InsertFirebaseClient): Promise<FirebaseClient> {
    this.ensureInitialized();
    console.log(`🔄 [FIREBASE-MANAGER] Creando cliente para: ${firebaseUid}`);
    
    try {
      const newClient = await this.storage.createClient(firebaseUid, client);
      console.log(`✅ [FIREBASE-MANAGER] Cliente ${newClient.clientId} creado exitosamente`);
      return newClient;
    } catch (error) {
      console.error(`❌ [FIREBASE-MANAGER] Error creando cliente:`, error);
      throw error;
    }
  }

  async updateClient(firebaseUid: string, clientId: string, updates: Partial<FirebaseClient>): Promise<FirebaseClient> {
    this.ensureInitialized();
    console.log(`🔄 [FIREBASE-MANAGER] Actualizando cliente ${clientId} para: ${firebaseUid}`);
    
    try {
      const updatedClient = await this.storage.updateClient(firebaseUid, clientId, updates);
      console.log(`✅ [FIREBASE-MANAGER] Cliente ${clientId} actualizado exitosamente`);
      return updatedClient;
    } catch (error) {
      console.error(`❌ [FIREBASE-MANAGER] Error actualizando cliente ${clientId}:`, error);
      throw error;
    }
  }

  async deleteClient(firebaseUid: string, clientId: string): Promise<void> {
    this.ensureInitialized();
    console.log(`🔄 [FIREBASE-MANAGER] Eliminando cliente ${clientId} para: ${firebaseUid}`);
    
    try {
      await this.storage.deleteClient(firebaseUid, clientId);
      console.log(`✅ [FIREBASE-MANAGER] Cliente ${clientId} eliminado exitosamente`);
    } catch (error) {
      console.error(`❌ [FIREBASE-MANAGER] Error eliminando cliente ${clientId}:`, error);
      throw error;
    }
  }

  // ================================
  // USER OPERATIONS
  // ================================

  async getUser(firebaseUid: string): Promise<FirebaseUser | null> {
    this.ensureInitialized();
    console.log(`🔄 [FIREBASE-MANAGER] Obteniendo usuario: ${firebaseUid}`);
    
    try {
      const user = await this.storage.getUser(firebaseUid);
      if (user) {
        console.log(`✅ [FIREBASE-MANAGER] Usuario encontrado: ${user.email}`);
      } else {
        console.log(`⚠️ [FIREBASE-MANAGER] Usuario ${firebaseUid} no encontrado`);
      }
      return user;
    } catch (error) {
      console.error(`❌ [FIREBASE-MANAGER] Error obteniendo usuario:`, error);
      throw error;
    }
  }

  async createUser(firebaseUid: string, userData: InsertFirebaseUser): Promise<FirebaseUser> {
    this.ensureInitialized();
    console.log(`🔄 [FIREBASE-MANAGER] Creando usuario: ${firebaseUid}`);
    
    try {
      const newUser = await this.storage.createUser(firebaseUid, userData);
      console.log(`✅ [FIREBASE-MANAGER] Usuario ${newUser.email} creado exitosamente`);
      return newUser;
    } catch (error) {
      console.error(`❌ [FIREBASE-MANAGER] Error creando usuario:`, error);
      throw error;
    }
  }

  // ================================
  // HEALTH CHECK
  // ================================

  async healthCheck(): Promise<boolean> {
    try {
      // Test básico: verificar conexión a Firebase
      if (!this.initialized || !this.firebaseApp) {
        return false;
      }
      
      // Intento de operación simple para verificar conectividad
      await this.storage.getUser('health-check-test');
      return true;
    } catch (error) {
      console.error('❌ [FIREBASE-MANAGER] Health check failed:', error);
      return false;
    }
  }
}

// ================================
// EXPORTACIONES
// ================================

// Singleton del manager principal
let firebaseManager: FirebaseOnlyManager | null = null;

export function getFirebaseManager(): FirebaseOnlyManager {
  if (!firebaseManager) {
    firebaseManager = new FirebaseOnlyManager();
  }
  return firebaseManager;
}

// Exportar también para compatibilidad
export { FirebaseOnlyManager };

// Instancia global para uso directo
export const storage = getFirebaseManager();

export default storage;
/**
 * 🔥 FIREBASE-ONLY STORAGE SYSTEM
 * Sistema unificado que usa únicamente Firebase Firestore
 * Elimina completamente la dependencia de PostgreSQL
 */

import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  FirebaseClient, 
  InsertFirebaseClient, 
  FirebaseUser, 
  InsertFirebaseUser,
  FIREBASE_COLLECTIONS 
} from '../shared/firebase-schema';

interface IFirebaseOnlyStorage {
  // Client operations
  getClients(firebaseUid: string): Promise<FirebaseClient[]>;
  getClient(firebaseUid: string, clientId: string): Promise<FirebaseClient | null>;
  createClient(firebaseUid: string, client: InsertFirebaseClient): Promise<FirebaseClient>;
  updateClient(firebaseUid: string, clientId: string, updates: Partial<FirebaseClient>): Promise<FirebaseClient>;
  deleteClient(firebaseUid: string, clientId: string): Promise<void>;
  
  // User operations
  getUser(firebaseUid: string): Promise<FirebaseUser | null>;
  createUser(firebaseUid: string, userData: InsertFirebaseUser): Promise<FirebaseUser>;
}

export class FirebaseOnlyStorage implements IFirebaseOnlyStorage {
  private db: any;

  constructor(firebaseApp: any) {
    this.db = getFirestore(firebaseApp);
    console.log('🔥 [FIREBASE-STORAGE] Inicializado con arquitectura unificada Firebase-only');
  }

  /**
   * 📋 OBTENER TODOS LOS CLIENTES DEL USUARIO
   */
  async getClients(firebaseUid: string): Promise<FirebaseClient[]> {
    try {
      console.log(`🔄 [FIREBASE-STORAGE] Obteniendo clientes para UID: ${firebaseUid}`);
      
      const clientsRef = collection(this.db, FIREBASE_COLLECTIONS.USERS, firebaseUid, FIREBASE_COLLECTIONS.CLIENTS);
      const clientsQuery = query(clientsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(clientsQuery);
      
      const clients: FirebaseClient[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clients.push({
          id: data.id,
          clientId: data.clientId,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });
      
      console.log(`✅ [FIREBASE-STORAGE] Obtenidos ${clients.length} clientes`);
      return clients;
      
    } catch (error) {
      console.error('❌ [FIREBASE-STORAGE] Error obteniendo clientes:', error);
      throw error;
    }
  }

  /**
   * 📄 OBTENER UN CLIENTE ESPECÍFICO
   */
  async getClient(firebaseUid: string, clientId: string): Promise<FirebaseClient | null> {
    try {
      console.log(`🔄 [FIREBASE-STORAGE] Obteniendo cliente ${clientId} para UID: ${firebaseUid}`);
      
      const clientRef = doc(this.db, FIREBASE_COLLECTIONS.USERS, firebaseUid, FIREBASE_COLLECTIONS.CLIENTS, clientId);
      const clientDoc = await getDoc(clientRef);
      
      if (!clientDoc.exists()) {
        console.log(`⚠️ [FIREBASE-STORAGE] Cliente ${clientId} no encontrado`);
        return null;
      }
      
      const data = clientDoc.data();
      const client: FirebaseClient = {
        id: data.id,
        clientId: data.clientId,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        notes: data.notes || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
      
      console.log(`✅ [FIREBASE-STORAGE] Cliente ${clientId} obtenido`);
      return client;
      
    } catch (error) {
      console.error(`❌ [FIREBASE-STORAGE] Error obteniendo cliente ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * ✨ CREAR NUEVO CLIENTE
   */
  async createClient(firebaseUid: string, client: InsertFirebaseClient): Promise<FirebaseClient> {
    try {
      console.log(`🔄 [FIREBASE-STORAGE] Creando cliente para UID: ${firebaseUid}`);
      
      // Generar ID único para el cliente
      const clientId = `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const now = new Date();
      
      const clientData = {
        id: Date.now(), // ID numérico para compatibilidad
        clientId: clientId,
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode || '',
        notes: client.notes || '',
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      const clientRef = doc(this.db, FIREBASE_COLLECTIONS.USERS, firebaseUid, FIREBASE_COLLECTIONS.CLIENTS, clientId);
      await setDoc(clientRef, clientData);
      
      const newClient: FirebaseClient = {
        ...clientData,
        createdAt: now,
        updatedAt: now
      };
      
      console.log(`✅ [FIREBASE-STORAGE] Cliente ${clientId} creado exitosamente`);
      return newClient;
      
    } catch (error) {
      console.error('❌ [FIREBASE-STORAGE] Error creando cliente:', error);
      throw error;
    }
  }

  /**
   * 🔄 ACTUALIZAR CLIENTE
   */
  async updateClient(firebaseUid: string, clientId: string, updates: Partial<FirebaseClient>): Promise<FirebaseClient> {
    try {
      console.log(`🔄 [FIREBASE-STORAGE] Actualizando cliente ${clientId} para UID: ${firebaseUid}`);
      
      const clientRef = doc(this.db, FIREBASE_COLLECTIONS.USERS, firebaseUid, FIREBASE_COLLECTIONS.CLIENTS, clientId);
      const clientDoc = await getDoc(clientRef);
      
      if (!clientDoc.exists()) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };
      
      await updateDoc(clientRef, updateData);
      
      // Obtener datos actualizados
      const updatedDoc = await getDoc(clientRef);
      const data = updatedDoc.data()!;
      
      const updatedClient: FirebaseClient = {
        id: data.id,
        clientId: data.clientId,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        notes: data.notes || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
      
      console.log(`✅ [FIREBASE-STORAGE] Cliente ${clientId} actualizado exitosamente`);
      return updatedClient;
      
    } catch (error) {
      console.error(`❌ [FIREBASE-STORAGE] Error actualizando cliente ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * 🗑️ ELIMINAR CLIENTE
   */
  async deleteClient(firebaseUid: string, clientId: string): Promise<void> {
    try {
      console.log(`🔄 [FIREBASE-STORAGE] Eliminando cliente ${clientId} para UID: ${firebaseUid}`);
      
      const clientRef = doc(this.db, FIREBASE_COLLECTIONS.USERS, firebaseUid, FIREBASE_COLLECTIONS.CLIENTS, clientId);
      const clientDoc = await getDoc(clientRef);
      
      if (!clientDoc.exists()) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }
      
      await deleteDoc(clientRef);
      
      console.log(`✅ [FIREBASE-STORAGE] Cliente ${clientId} eliminado exitosamente`);
      
    } catch (error) {
      console.error(`❌ [FIREBASE-STORAGE] Error eliminando cliente ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * 👤 OBTENER DATOS DE USUARIO
   */
  async getUser(firebaseUid: string): Promise<FirebaseUser | null> {
    try {
      console.log(`🔄 [FIREBASE-STORAGE] Obteniendo datos de usuario: ${firebaseUid}`);
      
      const userRef = doc(this.db, FIREBASE_COLLECTIONS.USERS, firebaseUid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log(`⚠️ [FIREBASE-STORAGE] Usuario ${firebaseUid} no encontrado`);
        return null;
      }
      
      const data = userDoc.data();
      const userData: FirebaseUser = {
        firebaseUid: data.firebaseUid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        company: data.company,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
      
      console.log(`✅ [FIREBASE-STORAGE] Datos de usuario obtenidos: ${userData.email}`);
      return userData;
      
    } catch (error) {
      console.error(`❌ [FIREBASE-STORAGE] Error obteniendo usuario ${firebaseUid}:`, error);
      throw error;
    }
  }

  /**
   * ✨ CREAR NUEVO USUARIO
   */
  async createUser(firebaseUid: string, userData: InsertFirebaseUser): Promise<FirebaseUser> {
    try {
      console.log(`🔄 [FIREBASE-STORAGE] Creando usuario: ${firebaseUid}`);
      
      const userRef = doc(this.db, FIREBASE_COLLECTIONS.USERS, firebaseUid);
      const now = new Date();
      
      const userDataToSave = {
        firebaseUid: firebaseUid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        company: userData.company,
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        state: userData.state,
        zipCode: userData.zipCode,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      await setDoc(userRef, userDataToSave);
      
      const newUser: FirebaseUser = {
        ...userDataToSave,
        createdAt: now,
        updatedAt: now
      };
      
      console.log(`✅ [FIREBASE-STORAGE] Usuario ${firebaseUid} creado exitosamente`);
      return newUser;
      
    } catch (error) {
      console.error(`❌ [FIREBASE-STORAGE] Error creando usuario ${firebaseUid}:`, error);
      throw error;
    }
  }
}

export default FirebaseOnlyStorage;
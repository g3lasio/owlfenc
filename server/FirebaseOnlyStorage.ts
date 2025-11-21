/**
 * 🔥 FIREBASE-ONLY STORAGE SYSTEM
 * Sistema unificado que usa únicamente Firebase Firestore
 * Elimina completamente la dependencia de PostgreSQL
 * IMPORTANTE: Usa Firebase Admin SDK para bypasear reglas de Firestore
 */

import * as admin from 'firebase-admin';
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
  private db: admin.firestore.Firestore;

  constructor(firebaseApp: admin.app.App) {
    this.db = firebaseApp.firestore();
    console.log('🔥 [FIREBASE-STORAGE] Inicializado con Firebase Admin SDK (bypasea reglas de Firestore)');
  }

  /**
   * 📋 OBTENER TODOS LOS CLIENTES DEL USUARIO
   */
  async getClients(firebaseUid: string): Promise<FirebaseClient[]> {
    try {
      console.log(`🔄 [FIREBASE-STORAGE] Obteniendo clientes para UID: ${firebaseUid}`);
      
      const clientsRef = this.db
        .collection(FIREBASE_COLLECTIONS.USERS)
        .doc(firebaseUid)
        .collection(FIREBASE_COLLECTIONS.CLIENTS);
      
      const snapshot = await clientsRef.orderBy('createdAt', 'desc').get();
      
      const clients: FirebaseClient[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clients.push({
          id: doc.id, // El ID del documento de Firestore es el identificador principal
          clientId: doc.id, // Usar el mismo ID para compatibilidad
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          mobilePhone: data.mobilePhone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          notes: data.notes || '',
          source: data.source || '',
          classification: data.classification || '',
          tags: data.tags || [],
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
      
      const clientRef = this.db
        .collection(FIREBASE_COLLECTIONS.USERS)
        .doc(firebaseUid)
        .collection(FIREBASE_COLLECTIONS.CLIENTS)
        .doc(clientId);
      
      const clientDoc = await clientRef.get();
      
      if (!clientDoc.exists) {
        console.log(`⚠️ [FIREBASE-STORAGE] Cliente ${clientId} no encontrado`);
        return null;
      }
      
      const data = clientDoc.data()!;
      const client: FirebaseClient = {
        id: clientDoc.id, // El ID del documento de Firestore es el identificador principal
        clientId: clientDoc.id, // Usar el mismo ID para compatibilidad
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        mobilePhone: data.mobilePhone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        notes: data.notes || '',
        source: data.source || '',
        classification: data.classification || '',
        tags: data.tags || [],
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
      
      // Generar ID único para el cliente (usado como ID del documento de Firestore)
      const clientId = `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const now = new Date();
      
      const clientData = {
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        mobilePhone: client.mobilePhone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode || '',
        notes: client.notes || '',
        source: client.source || '',
        classification: client.classification || '',
        tags: client.tags || [],
        createdAt: admin.firestore.Timestamp.fromDate(now),
        updatedAt: admin.firestore.Timestamp.fromDate(now)
      };
      
      const clientRef = this.db
        .collection(FIREBASE_COLLECTIONS.USERS)
        .doc(firebaseUid)
        .collection(FIREBASE_COLLECTIONS.CLIENTS)
        .doc(clientId);
      
      await clientRef.set(clientData);
      
      const newClient: FirebaseClient = {
        id: clientId, // El ID del documento de Firestore es el identificador principal
        clientId: clientId, // Mantener clientId para compatibilidad con el schema
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
      
      const clientRef = this.db
        .collection(FIREBASE_COLLECTIONS.USERS)
        .doc(firebaseUid)
        .collection(FIREBASE_COLLECTIONS.CLIENTS)
        .doc(clientId);
      
      const clientDoc = await clientRef.get();
      
      if (!clientDoc.exists) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }
      
      // Filtrar campos undefined y preparar actualización
      const updateData: Record<string, any> = {
        updatedAt: admin.firestore.Timestamp.fromDate(new Date())
      };
      
      // Solo agregar campos que no sean undefined
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          updateData[key] = value;
        }
      });
      
      await clientRef.update(updateData);
      
      // Obtener datos actualizados
      const updatedDoc = await clientRef.get();
      const data = updatedDoc.data()!;
      
      const updatedClient: FirebaseClient = {
        id: updatedDoc.id, // El ID del documento de Firestore es el identificador principal
        clientId: updatedDoc.id, // Usar el mismo ID para compatibilidad
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        mobilePhone: data.mobilePhone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        notes: data.notes || '',
        source: data.source || '',
        classification: data.classification || '',
        tags: data.tags || [],
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
      
      const clientRef = this.db
        .collection(FIREBASE_COLLECTIONS.USERS)
        .doc(firebaseUid)
        .collection(FIREBASE_COLLECTIONS.CLIENTS)
        .doc(clientId);
      
      const clientDoc = await clientRef.get();
      
      if (!clientDoc.exists) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }
      
      await clientRef.delete();
      
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
      
      const userRef = this.db.collection(FIREBASE_COLLECTIONS.USERS).doc(firebaseUid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.log(`⚠️ [FIREBASE-STORAGE] Usuario ${firebaseUid} no encontrado`);
        return null;
      }
      
      const data = userDoc.data()!;
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
      
      const userRef = this.db.collection(FIREBASE_COLLECTIONS.USERS).doc(firebaseUid);
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
        createdAt: admin.firestore.Timestamp.fromDate(now),
        updatedAt: admin.firestore.Timestamp.fromDate(now)
      };
      
      await userRef.set(userDataToSave);
      
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
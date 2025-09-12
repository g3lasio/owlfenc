import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps } from 'firebase-admin/app';

// ROBUSTO: Lazy initialization de Firestore para evitar problemas de orden
let db: FirebaseFirestore.Firestore | null = null;

function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    try {
      const apps = getApps();
      if (apps.length === 0) {
        throw new Error('Firebase Admin no inicializado. Debe inicializarse en el archivo principal.');
      }
      db = getFirestore();
      console.log('🔥 [COMPANY-PROFILE] Firestore inicializado (lazy)');
    } catch (error) {
      console.error('❌ [COMPANY-PROFILE] Error obteniendo Firestore:', error);
      throw error;
    }
  }
  return db;
}

export interface CompanyProfile {
  userId: string;
  firebaseUid: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  businessType?: string;
  projectVolume?: string;
  mainChallenge?: string;
  logo?: string;
  ownerName?: string;
  role?: string;
  mobilePhone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  license?: string;
  insurancePolicy?: string;
  ein?: string;
  yearEstablished?: string;
  website?: string;
  description?: string;
  specialties?: string[];
  socialMedia?: Record<string, string>;
  documents?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export class CompanyProfileService {
  private readonly collection = 'companyProfiles';

  async getProfileByFirebaseUid(firebaseUid: string): Promise<CompanyProfile | null> {
    try {
      console.log(`🔍 [COMPANY-PROFILE] Buscando perfil para Firebase UID: ${firebaseUid}`);
      
      // OPTIMIZACIÓN: Usar document ID directo igual al firebaseUid
      const docRef = getDb().collection(this.collection).doc(firebaseUid);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.log(`📭 [COMPANY-PROFILE] No se encontró perfil para UID: ${firebaseUid}`);
        return null;
      }

      const data = doc.data()!;
      
      const profile: CompanyProfile = {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as CompanyProfile;

      console.log(`✅ [COMPANY-PROFILE] Perfil encontrado para: ${profile.companyName || 'Sin nombre'}`);
      return profile;
    } catch (error) {
      console.error(`❌ [COMPANY-PROFILE] Error obteniendo perfil:`, error);
      throw error;
    }
  }

  async saveProfile(firebaseUid: string, profileData: Partial<CompanyProfile>): Promise<CompanyProfile> {
    try {
      console.log(`💾 [COMPANY-PROFILE] Guardando perfil para Firebase UID: ${firebaseUid}`);
      
      // OPTIMIZACIÓN: Usar document ID directo igual al firebaseUid
      const docRef = getDb().collection(this.collection).doc(firebaseUid);
      const existingDoc = await docRef.get();
      
      // SEGURIDAD: Siempre forzar valores del servidor para campos críticos
      const profileToSave = {
        ...profileData,
        firebaseUid, // FORZADO: siempre del servidor
        userId: firebaseUid, // FORZADO: siempre igual al firebaseUid
        updatedAt: FieldValue.serverTimestamp(), // MEJORADO: Usar serverTimestamp
      };

      if (existingDoc.exists) {
        // Actualizar documento existente - mantener createdAt original
        await docRef.update(profileToSave);
        console.log(`✅ [COMPANY-PROFILE] Perfil actualizado para: ${profileToSave.companyName || 'Sin nombre'}`);
      } else {
        // Crear nuevo documento
        await docRef.set({
          ...profileToSave,
          createdAt: FieldValue.serverTimestamp(), // MEJORADO: Usar serverTimestamp
        });
        console.log(`✅ [COMPANY-PROFILE] Nuevo perfil creado para UID: ${firebaseUid}`);
      }

      // Retornar el perfil con fechas convertidas
      const savedDoc = await docRef.get();
      const savedData = savedDoc.data()!;
      
      return {
        ...savedData,
        createdAt: savedData.createdAt?.toDate() || new Date(),
        updatedAt: savedData.updatedAt?.toDate() || new Date(),
      } as CompanyProfile;
    } catch (error) {
      console.error(`❌ [COMPANY-PROFILE] Error guardando perfil:`, error);
      throw error;
    }
  }

  async updateProfile(firebaseUid: string, updates: Partial<CompanyProfile>): Promise<CompanyProfile | null> {
    try {
      console.log(`🔄 [COMPANY-PROFILE] Actualizando perfil para Firebase UID: ${firebaseUid}`);
      
      // OPTIMIZACIÓN: Usar document ID directo igual al firebaseUid
      const docRef = getDb().collection(this.collection).doc(firebaseUid);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.log(`❌ [COMPANY-PROFILE] No se encontró perfil para actualizar: ${firebaseUid}`);
        return null;
      }
      
      await docRef.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(), // MEJORADO: Usar serverTimestamp
      });

      // Obtener el documento actualizado
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data()!;
      
      const updatedProfile: CompanyProfile = {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as CompanyProfile;

      console.log(`✅ [COMPANY-PROFILE] Perfil actualizado exitosamente`);
      return updatedProfile;
    } catch (error) {
      console.error(`❌ [COMPANY-PROFILE] Error actualizando perfil:`, error);
      throw error;
    }
  }

  async deleteProfile(firebaseUid: string): Promise<boolean> {
    try {
      console.log(`🗑️ [COMPANY-PROFILE] Eliminando perfil para Firebase UID: ${firebaseUid}`);
      
      // OPTIMIZACIÓN: Usar document ID directo igual al firebaseUid
      const docRef = getDb().collection(this.collection).doc(firebaseUid);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.log(`❌ [COMPANY-PROFILE] No se encontró perfil para eliminar: ${firebaseUid}`);
        return false;
      }

      await docRef.delete();
      
      console.log(`✅ [COMPANY-PROFILE] Perfil eliminado exitosamente`);
      return true;
    } catch (error) {
      console.error(`❌ [COMPANY-PROFILE] Error eliminando perfil:`, error);
      throw error;
    }
  }

  async getAllProfiles(): Promise<CompanyProfile[]> {
    try {
      console.log(`📋 [COMPANY-PROFILE] Obteniendo todos los perfiles`);
      
      const snapshot = await getDb().collection(this.collection).get();
      
      const profiles: CompanyProfile[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as CompanyProfile;
      });

      console.log(`✅ [COMPANY-PROFILE] Se obtuvieron ${profiles.length} perfiles`);
      return profiles;
    } catch (error) {
      console.error(`❌ [COMPANY-PROFILE] Error obteniendo todos los perfiles:`, error);
      throw error;
    }
  }

  // Método para migrar datos del Map en memoria a Firebase
  async migrateFromMemoryMap(memoryProfiles: Map<string, any>): Promise<number> {
    try {
      console.log(`🔄 [COMPANY-PROFILE] Iniciando migración de ${memoryProfiles.size} perfiles`);
      let migratedCount = 0;

      // Convertir Map a array para evitar problemas de iteración
      const profileEntries = Array.from(memoryProfiles.entries());
      
      for (const [firebaseUid, profileData] of profileEntries) {
        try {
          await this.saveProfile(firebaseUid, profileData);
          migratedCount++;
        } catch (error) {
          console.error(`❌ [COMPANY-PROFILE] Error migrando perfil ${firebaseUid}:`, error);
        }
      }

      console.log(`✅ [COMPANY-PROFILE] Migración completada: ${migratedCount}/${memoryProfiles.size} perfiles`);
      return migratedCount;
    } catch (error) {
      console.error(`❌ [COMPANY-PROFILE] Error en migración:`, error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const companyProfileService = new CompanyProfileService();
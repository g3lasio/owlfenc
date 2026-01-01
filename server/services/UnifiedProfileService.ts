/**
 * Unified Profile Service
 * 
 * Servicio centralizado para gestión de perfiles de usuario.
 * Fuente única de verdad: Firebase Firestore (userProfiles collection)
 * 
 * Características:
 * - Singleton pattern para instancia única
 * - Cache inteligente con TTL y invalidación automática
 * - Validación en múltiples niveles
 * - Soporte para sincronización en tiempo real
 * - Manejo robusto de errores
 * - Logging detallado para debugging
 * 
 * @author Manus AI
 * @date 2025-12-28
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps } from 'firebase-admin/app';

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

export interface CompanyProfile {
  // Identificación
  userId: string;
  firebaseUid: string;
  
  // Información básica de la compañía (REQUERIDOS)
  companyName: string;
  address: string;
  phone: string;
  email: string;
  
  // Información adicional del negocio (OPCIONALES)
  businessType?: string;
  projectVolume?: string;
  mainChallenge?: string;
  
  // Información del propietario (OPCIONALES)
  ownerName?: string;
  role?: string;
  mobilePhone?: string;
  
  // Dirección detallada (OPCIONALES)
  city?: string;
  state?: string;
  zipCode?: string;
  
  // Información legal y profesional (OPCIONALES)
  license?: string;
  insurancePolicy?: string;
  ein?: string;
  yearEstablished?: string;
  
  // Presencia online (OPCIONALES)
  website?: string;
  description?: string;
  specialties?: string[];
  socialMedia?: Record<string, string>;
  
  // Assets (OPCIONALES)
  logo?: string;
  profilePhoto?: string;
  documents?: Record<string, string>;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileValidationResult {
  valid: boolean;
  profile?: CompanyProfile;
  missingFields: string[];
  message?: string;
}

interface CacheEntry {
  profile: CompanyProfile;
  timestamp: number;
}

// ============================================================================
// UNIFIED PROFILE SERVICE (SINGLETON)
// ============================================================================

export class UnifiedProfileService {
  private static instance: UnifiedProfileService;
  // 🔥 CRITICAL FIX: Use 'userProfiles' to match Settings page and ensure data consistency
  // Previously used 'companyProfiles' which caused profile changes not to reflect in PDFs
  private readonly collection = 'userProfiles';
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 30 * 1000; // 30 segundos
  private db: FirebaseFirestore.Firestore | null = null;

  // Constructor privado para singleton
  private constructor() {
    this.initializeFirestore();
  }

  /**
   * Obtener instancia única del servicio (Singleton)
   */
  public static getInstance(): UnifiedProfileService {
    if (!UnifiedProfileService.instance) {
      UnifiedProfileService.instance = new UnifiedProfileService();
      console.log('🎯 [UNIFIED-PROFILE] Instancia singleton creada');
    }
    return UnifiedProfileService.instance;
  }

  /**
   * Inicializar Firestore (lazy initialization)
   */
  private initializeFirestore(): void {
    if (!this.db) {
      try {
        const apps = getApps();
        if (apps.length === 0) {
          throw new Error('Firebase Admin no inicializado');
        }
        this.db = getFirestore();
        console.log('🔥 [UNIFIED-PROFILE] Firestore inicializado');
      } catch (error) {
        console.error('❌ [UNIFIED-PROFILE] Error inicializando Firestore:', error);
        throw error;
      }
    }
  }

  /**
   * Obtener Firestore instance
   */
  private getDb(): FirebaseFirestore.Firestore {
    if (!this.db) {
      this.initializeFirestore();
    }
    return this.db!;
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Obtener perfil del cache si es válido
   */
  private getFromCache(firebaseUid: string): CompanyProfile | null {
    const cached = this.cache.get(firebaseUid);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      // Cache expirado
      this.cache.delete(firebaseUid);
      console.log(`⏰ [UNIFIED-PROFILE] Cache expirado para UID: ${firebaseUid}`);
      return null;
    }

    console.log(`✅ [UNIFIED-PROFILE] Cache hit para UID: ${firebaseUid} (edad: ${age}ms)`);
    return cached.profile;
  }

  /**
   * Guardar perfil en cache
   */
  private saveToCache(firebaseUid: string, profile: CompanyProfile): void {
    this.cache.set(firebaseUid, {
      profile,
      timestamp: Date.now()
    });
    console.log(`💾 [UNIFIED-PROFILE] Perfil cacheado para UID: ${firebaseUid}`);
  }

  /**
   * Invalidar cache para un usuario específico
   */
  public invalidateCache(firebaseUid: string): void {
    this.cache.delete(firebaseUid);
    console.log(`🗑️ [UNIFIED-PROFILE] Cache invalidado para UID: ${firebaseUid}`);
  }

  /**
   * Limpiar todo el cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ [UNIFIED-PROFILE] Cache completo limpiado');
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Obtener perfil por Firebase UID (con cache)
   */
  async getProfile(firebaseUid: string): Promise<CompanyProfile | null> {
    try {
      console.log(`🔍 [UNIFIED-PROFILE] Buscando perfil para UID: ${firebaseUid}`);

      // Intentar obtener del cache primero
      const cached = this.getFromCache(firebaseUid);
      if (cached) {
        return cached;
      }

      // No está en cache, obtener de Firestore
      const docRef = this.getDb().collection(this.collection).doc(firebaseUid);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`📭 [UNIFIED-PROFILE] No se encontró perfil para UID: ${firebaseUid}`);
        return null;
      }

      const data = doc.data()!;
      const profile: CompanyProfile = {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as CompanyProfile;

      // Guardar en cache
      this.saveToCache(firebaseUid, profile);

      console.log(`✅ [UNIFIED-PROFILE] Perfil encontrado: ${profile.companyName || 'Sin nombre'}`);
      return profile;
    } catch (error) {
      console.error(`❌ [UNIFIED-PROFILE] Error obteniendo perfil:`, error);
      throw error;
    }
  }

  /**
   * Guardar o actualizar perfil
   */
  async saveProfile(firebaseUid: string, profileData: Partial<CompanyProfile>): Promise<CompanyProfile> {
    try {
      console.log(`💾 [UNIFIED-PROFILE] Guardando perfil para UID: ${firebaseUid}`);

      const docRef = this.getDb().collection(this.collection).doc(firebaseUid);
      const existingDoc = await docRef.get();

      // Preparar datos con campos forzados del servidor
      const profileToSave = {
        ...profileData,
        firebaseUid, // FORZADO: siempre del servidor
        userId: firebaseUid, // FORZADO: siempre igual al firebaseUid
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (existingDoc.exists) {
        // Actualizar documento existente
        await docRef.update(profileToSave);
        console.log(`✅ [UNIFIED-PROFILE] Perfil actualizado: ${profileToSave.companyName || 'Sin nombre'}`);
      } else {
        // Crear nuevo documento
        await docRef.set({
          ...profileToSave,
          createdAt: FieldValue.serverTimestamp(),
        });
        console.log(`✅ [UNIFIED-PROFILE] Nuevo perfil creado para UID: ${firebaseUid}`);
      }

      // Invalidar cache
      this.invalidateCache(firebaseUid);

      // Obtener y retornar el perfil actualizado
      const savedDoc = await docRef.get();
      const savedData = savedDoc.data()!;

      const savedProfile: CompanyProfile = {
        ...savedData,
        createdAt: savedData.createdAt?.toDate() || new Date(),
        updatedAt: savedData.updatedAt?.toDate() || new Date(),
      } as CompanyProfile;

      // Guardar en cache
      this.saveToCache(firebaseUid, savedProfile);

      return savedProfile;
    } catch (error) {
      console.error(`❌ [UNIFIED-PROFILE] Error guardando perfil:`, error);
      throw error;
    }
  }

  /**
   * Actualizar campos específicos del perfil
   */
  async updateProfile(firebaseUid: string, updates: Partial<CompanyProfile>): Promise<CompanyProfile | null> {
    try {
      console.log(`🔄 [UNIFIED-PROFILE] Actualizando perfil para UID: ${firebaseUid}`);

      const docRef = this.getDb().collection(this.collection).doc(firebaseUid);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`❌ [UNIFIED-PROFILE] No se encontró perfil para actualizar: ${firebaseUid}`);
        return null;
      }

      await docRef.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Invalidar cache
      this.invalidateCache(firebaseUid);

      // Obtener y retornar el perfil actualizado
      const updatedDoc = await docRef.get();
      const updatedData = updatedDoc.data()!;

      const updatedProfile: CompanyProfile = {
        ...updatedData,
        createdAt: updatedData.createdAt?.toDate() || new Date(),
        updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      } as CompanyProfile;

      // Guardar en cache
      this.saveToCache(firebaseUid, updatedProfile);

      console.log(`✅ [UNIFIED-PROFILE] Perfil actualizado exitosamente`);
      return updatedProfile;
    } catch (error) {
      console.error(`❌ [UNIFIED-PROFILE] Error actualizando perfil:`, error);
      throw error;
    }
  }

  /**
   * Eliminar perfil (soft delete - marcar como inactivo)
   */
  async deleteProfile(firebaseUid: string): Promise<boolean> {
    try {
      console.log(`🗑️ [UNIFIED-PROFILE] Eliminando perfil para UID: ${firebaseUid}`);

      const docRef = this.getDb().collection(this.collection).doc(firebaseUid);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`❌ [UNIFIED-PROFILE] No se encontró perfil para eliminar: ${firebaseUid}`);
        return false;
      }

      // Soft delete: marcar como inactivo en lugar de eliminar
      await docRef.update({
        isActive: false,
        deletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Invalidar cache
      this.invalidateCache(firebaseUid);

      console.log(`✅ [UNIFIED-PROFILE] Perfil marcado como inactivo`);
      return true;
    } catch (error) {
      console.error(`❌ [UNIFIED-PROFILE] Error eliminando perfil:`, error);
      throw error;
    }
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validar que el perfil tenga todos los campos requeridos
   */
  async validateProfile(firebaseUid: string): Promise<ProfileValidationResult> {
    try {
      const profile = await this.getProfile(firebaseUid);

      if (!profile) {
        return {
          valid: false,
          missingFields: ['all'],
          message: 'Profile not found. Please complete your company profile.'
        };
      }

      const missingFields: string[] = [];

      // Validar campos requeridos
      if (!profile.companyName) missingFields.push('Company Name');
      if (!profile.address) missingFields.push('Address');
      if (!profile.phone) missingFields.push('Phone');
      if (!profile.email) missingFields.push('Email');

      if (missingFields.length > 0) {
        return {
          valid: false,
          profile,
          missingFields,
          message: `Please complete the following required fields: ${missingFields.join(', ')}`
        };
      }

      return {
        valid: true,
        profile,
        missingFields: []
      };
    } catch (error) {
      console.error(`❌ [UNIFIED-PROFILE] Error validando perfil:`, error);
      throw error;
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Formatear dirección completa
   */
  formatFullAddress(profile: CompanyProfile): string {
    const parts = [
      profile.address,
      profile.city,
      profile.state,
      profile.zipCode
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Convertir a formato legacy para compatibilidad
   */
  toLegacyFormat(profile: CompanyProfile): any {
    return {
      id: profile.userId,
      firebaseUid: profile.firebaseUid,
      company: profile.companyName,
      ownerName: profile.ownerName || '',
      address: this.formatFullAddress(profile),
      phone: profile.phone,
      email: profile.email,
      license: profile.license || '',
      logo: profile.logo || '',
      website: profile.website || '',
      // Campos adicionales
      role: profile.role || 'Owner',
      mobilePhone: profile.mobilePhone || '',
      city: profile.city || '',
      state: profile.state || '',
      zipCode: profile.zipCode || '',
      insurancePolicy: profile.insurancePolicy || '',
      ein: profile.ein || '',
      businessType: profile.businessType || '',
      yearEstablished: profile.yearEstablished || '',
      description: profile.description || '',
      specialties: profile.specialties || [],
      socialMedia: profile.socialMedia || {},
      documents: profile.documents || {},
      profilePhoto: profile.profilePhoto || ''
    };
  }

  /**
   * Convertir a formato para contractors (para PDFs)
   */
  toContractorBranding(profile: CompanyProfile): any {
    return {
      companyName: profile.companyName,
      ownerName: profile.ownerName || '',
      address: this.formatFullAddress(profile),
      phone: profile.phone,
      email: profile.email,
      license: profile.license || '',
      logo: profile.logo || '',
      website: profile.website || ''
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const unifiedProfileService = UnifiedProfileService.getInstance();

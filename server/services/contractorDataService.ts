/**
 * Contractor Data Service
 * 
 * 🔥 SINGLE SOURCE OF TRUTH: Firebase Firestore (userProfiles collection)
 * 
 * Este servicio asegura que todos los sistemas de generación de PDF
 * usen información consistente y validada del perfil del usuario.
 * 
 * CRITICAL: Uses Firebase Firestore as the single source of truth for all
 * document generation (Estimates, Invoices, Contracts, Certificates).
 * 
 * This matches the frontend Profile.tsx which saves to Firebase.
 */

import { companyProfileService } from './CompanyProfileService';

export interface ContractorData {
  companyName: string;
  ownerName?: string;
  address: string;
  phone: string;
  email: string;
  license?: string;
  logo?: string;
  website?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  mobilePhone?: string;
  role?: string;
  businessType?: string;
  yearEstablished?: string;
  description?: string;
}

export interface ProfileValidationResult {
  valid: boolean;
  missingFields: string[];
  profile?: ContractorData;
}

export class ContractorDataService {
  /**
   * 🔥 SINGLE SOURCE OF TRUTH: Firebase Firestore
   * Obtiene los datos del contratista desde Firebase (userProfiles collection)
   * Valida que existan los campos mínimos requeridos
   * 
   * @param firebaseUid - UID de Firebase del usuario autenticado
   * @returns ContractorData con información validada del perfil
   * @throws Error si el perfil no existe o está incompleto
   */
  static async getContractorData(firebaseUid: string): Promise<ContractorData> {
    console.log(`📋 [CONTRACTOR-DATA] Obteniendo datos del contratista desde Firebase para UID: ${firebaseUid}`);
    
    // 🔥 SINGLE SOURCE: Get user from Firebase using CompanyProfileService
    const profile = await companyProfileService.getProfileByFirebaseUid(firebaseUid);
    
    if (!profile) {
      console.error(`❌ [CONTRACTOR-DATA] Perfil no encontrado en Firebase para UID: ${firebaseUid}`);
      throw new Error('PROFILE_NOT_FOUND: User must complete profile setup before generating documents');
    }
    
    // Log campos críticos para debugging
    console.log(`📊 [CONTRACTOR-DATA] Perfil obtenido:`, {
      companyName: profile.companyName || 'NOT SET',
      license: profile.license || 'NOT SET',
      state: profile.state || 'NOT SET',
      address: profile.address || 'NOT SET'
    });
    
    // Validar campos requeridos
    const missingFields: string[] = [];
    if (!profile.companyName) missingFields.push('companyName');
    if (!profile.address) missingFields.push('address');
    if (!profile.phone) missingFields.push('phone');
    if (!profile.email) missingFields.push('email');
    
    if (missingFields.length > 0) {
      console.error(`❌ [CONTRACTOR-DATA] Perfil incompleto. Campos faltantes: ${missingFields.join(', ')}`);
      throw new Error(`INCOMPLETE_PROFILE: Missing required fields: ${missingFields.join(', ')}`);
    }
    
    console.log(`✅ [CONTRACTOR-DATA] Datos del contratista obtenidos exitosamente desde Firebase: ${profile.companyName}`);
    
    return {
      companyName: profile.companyName,
      ownerName: profile.ownerName,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      license: profile.license,
      logo: profile.logo,
      website: profile.website,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zipCode,
      mobilePhone: profile.mobilePhone,
      role: profile.role,
      businessType: profile.businessType,
      yearEstablished: profile.yearEstablished,
      description: profile.description,
    };
  }
  
  /**
   * Valida si el usuario tiene un perfil completo
   * Útil para validaciones previas sin lanzar excepciones
   * 
   * @param firebaseUid - UID de Firebase del usuario autenticado
   * @returns ProfileValidationResult con estado de validación
   */
  static async validateProfile(firebaseUid: string): Promise<ProfileValidationResult> {
    console.log(`🔍 [CONTRACTOR-DATA] Validando perfil para UID: ${firebaseUid}`);
    
    try {
      const contractorData = await this.getContractorData(firebaseUid);
      console.log(`✅ [CONTRACTOR-DATA] Perfil válido para: ${contractorData.companyName}`);
      
      return { 
        valid: true, 
        missingFields: [],
        profile: contractorData
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.startsWith('INCOMPLETE_PROFILE')) {
        const fieldsMatch = errorMessage.match(/fields: (.+)/);
        const fields = fieldsMatch ? fieldsMatch[1].split(', ') : [];
        
        console.warn(`⚠️ [CONTRACTOR-DATA] Perfil incompleto. Campos faltantes: ${fields.join(', ')}`);
        
        return { 
          valid: false, 
          missingFields: fields 
        };
      }
      
      if (errorMessage.startsWith('PROFILE_NOT_FOUND')) {
        console.warn(`⚠️ [CONTRACTOR-DATA] Perfil no encontrado`);
        
        return { 
          valid: false, 
          missingFields: ['all'] 
        };
      }
      
      console.error(`❌ [CONTRACTOR-DATA] Error inesperado validando perfil:`, error);
      
      return { 
        valid: false, 
        missingFields: ['unknown'] 
      };
    }
  }
  
  /**
   * Formatea la dirección completa del contratista
   * Combina address, city, state y zipCode si están disponibles
   * 
   * @param contractorData - Datos del contratista
   * @returns Dirección formateada como string
   */
  static formatFullAddress(contractorData: ContractorData): string {
    const parts: string[] = [contractorData.address];
    
    if (contractorData.city && contractorData.state && contractorData.zipCode) {
      parts.push(`${contractorData.city}, ${contractorData.state} ${contractorData.zipCode}`);
    } else if (contractorData.city && contractorData.state) {
      parts.push(`${contractorData.city}, ${contractorData.state}`);
    } else if (contractorData.city) {
      parts.push(contractorData.city);
    }
    
    return parts.filter(p => p).join(', ');
  }
  
  /**
   * Convierte ContractorData al formato esperado por los templates legacy
   * Útil para mantener compatibilidad durante la migración
   * 
   * @param contractorData - Datos del contratista
   * @returns Objeto con formato legacy
   */
  static toLegacyFormat(contractorData: ContractorData): any {
    return {
      companyName: contractorData.companyName,
      name: contractorData.ownerName || '',
      address: contractorData.address,
      phone: contractorData.phone,
      email: contractorData.email,
      license: contractorData.license || '',
      logo: contractorData.logo || '',
      website: contractorData.website || '',
    };
  }
  
  /**
   * Convierte ContractorData al formato ContractorBranding
   * usado por el sistema de contratos y templates
   * 
   * @param contractorData - Datos del contratista
   * @returns Objeto ContractorBranding
   */
  static toContractorBranding(contractorData: ContractorData): any {
    return {
      companyName: contractorData.companyName,
      address: this.formatFullAddress(contractorData),
      phone: contractorData.phone,
      email: contractorData.email,
      licenseNumber: contractorData.license,
      state: contractorData.state,
      logo: contractorData.logo,
      website: contractorData.website,
    };
  }
}

// Export singleton-style para consistencia con otros servicios
export const contractorDataService = ContractorDataService;

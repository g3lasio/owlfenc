/**
 * Contractor Data Helpers
 * 
 * 🔥 SINGLE SOURCE OF TRUTH: Firebase Firestore (userProfiles collection)
 * 
 * Funciones unificadas para autenticación y obtención de datos del contractor
 * desde Firebase Firestore.
 * 
 * Estas funciones aseguran que TODOS los endpoints que generan documentos
 * usen la misma lógica y fuente de datos (Firebase).
 */

import { Request } from 'express';
import { companyProfileService } from '../services/CompanyProfileService';

export interface ContractorData {
  name: string;
  company: string;
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
  ownerName?: string;
}

/**
 * Autentica al usuario desde el request
 * Soporta múltiples métodos de autenticación:
 * - Header x-firebase-uid (método principal)
 * - Header Authorization Bearer token (fallback)
 * 
 * @param req - Express Request object
 * @returns Firebase UID del usuario autenticado
 * @throws Error si no hay autenticación válida
 */
export async function authenticateUser(req: Request): Promise<string> {
  // Método 1: x-firebase-uid header (método principal y más confiable)
  const firebaseUidHeader = req.headers["x-firebase-uid"] as string;
  if (firebaseUidHeader) {
    console.log(`✅ [AUTH-HELPER] Authenticated via x-firebase-uid header: ${firebaseUidHeader}`);
    return firebaseUidHeader;
  }

  // Método 2: Authorization Bearer token (requiere Firebase Admin SDK)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // Intentar verificar el token con Firebase Admin
      const admin = await import('firebase-admin');
      const token = authHeader.substring(7);
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log(`✅ [AUTH-HELPER] Authenticated via Bearer token: ${decodedToken.uid}`);
      return decodedToken.uid;
    } catch (error) {
      console.warn('⚠️ [AUTH-HELPER] Bearer token verification failed:', error instanceof Error ? error.message : error);
      // No lanzar error aquí, continuar con otros métodos
    }
  }

  // No hay autenticación válida
  console.error('❌ [AUTH-HELPER] No authentication found in request');
  throw new Error('AUTHENTICATION_REQUIRED: No valid authentication method found');
}

/**
 * 🔥 SINGLE SOURCE OF TRUTH: Firebase Firestore
 * Obtiene los datos del contractor desde Firebase (userProfiles collection)
 * 
 * @param firebaseUid - Firebase UID del usuario autenticado
 * @param fallbackData - Datos de fallback del frontend (opcional)
 * @returns ContractorData con información del perfil
 */
export async function getContractorData(
  firebaseUid: string,
  fallbackData?: any
): Promise<ContractorData> {
  console.log(`📋 [CONTRACTOR-HELPER] Fetching contractor data from Firebase for UID: ${firebaseUid}`);

  try {
    // 🔥 SINGLE SOURCE: Obtener usuario de Firebase via CompanyProfileService
    const profile = await companyProfileService.getProfileByFirebaseUid(firebaseUid);

    if (profile) {
      console.log(`✅ [CONTRACTOR-HELPER] Using contractor data from Firebase: ${profile.companyName}`);
      console.log(`📊 [CONTRACTOR-HELPER] Critical fields:`, {
        license: profile.license || 'NOT SET',
        state: profile.state || 'NOT SET',
        address: profile.address || 'NOT SET'
      });

      return {
        name: profile.companyName || "",
        company: profile.companyName || "",
        address: profile.address || "",
        phone: profile.phone || "",
        email: profile.email || "",
        license: profile.license || "",
        logo: profile.logo || "",
        website: profile.website || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
        mobilePhone: profile.mobilePhone || "",
        ownerName: profile.ownerName || "",
      };
    }

    // Si no hay usuario en Firebase, usar fallback
    if (fallbackData) {
      console.warn(`⚠️ [CONTRACTOR-HELPER] No data in Firebase, using frontend fallback`);
      console.warn(`⚠️ [CONTRACTOR-HELPER] User should complete profile in Settings`);

      return normalizeContractorData(fallbackData);
    }

    // No hay datos ni en Firebase ni en fallback
    console.error(`❌ [CONTRACTOR-HELPER] No contractor data found for UID: ${firebaseUid}`);
    throw new Error('PROFILE_NOT_FOUND: User must complete profile in Settings before generating documents');

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PROFILE_NOT_FOUND')) {
      throw error;
    }

    console.error(`❌ [CONTRACTOR-HELPER] Error fetching contractor data:`, error);

    // Si hay error de base de datos pero tenemos fallback, usarlo
    if (fallbackData) {
      console.warn(`⚠️ [CONTRACTOR-HELPER] Firebase error, using frontend fallback`);
      return normalizeContractorData(fallbackData);
    }

    throw new Error('DATABASE_ERROR: Failed to fetch contractor data');
  }
}

/**
 * Normaliza datos del contractor desde diferentes formatos del frontend
 * Soporta múltiples formatos:
 * - { name, address, phone, email, ... }
 * - { company, address, phone, email, ... }
 * - { companyName, address, phone, email, ... }
 * 
 * @param data - Datos del contractor en cualquier formato
 * @returns ContractorData normalizado
 */
function normalizeContractorData(data: any): ContractorData {
  const companyName = data.companyName || data.company || data.name || "Your Company";

  return {
    name: companyName,
    company: companyName,
    address: data.address || "",
    phone: data.phone || "",
    email: data.email || "",
    license: data.license || data.licenseNumber || "",
    logo: data.logo || "",
    website: data.website || "",
    city: data.city || "",
    state: data.state || "",
    zipCode: data.zipCode || "",
    mobilePhone: data.mobilePhone || "",
    ownerName: data.ownerName || "",
  };
}

/**
 * Obtiene datos del contractor con autenticación automática
 * Combina authenticateUser() y getContractorData() en una sola función
 * 
 * @param req - Express Request object
 * @param fallbackData - Datos de fallback del frontend (opcional)
 * @returns ContractorData con información del perfil
 * @throws Error si no hay autenticación o datos
 */
export async function getAuthenticatedContractorData(
  req: Request,
  fallbackData?: any
): Promise<{ firebaseUid: string; contractorData: ContractorData }> {
  // Autenticar usuario
  const firebaseUid = await authenticateUser(req);

  // Obtener datos del contractor desde Firebase
  const contractorData = await getContractorData(firebaseUid, fallbackData);

  return { firebaseUid, contractorData };
}

/**
 * 🔥 SINGLE SOURCE OF TRUTH: Firebase Firestore
 * Intenta obtener datos del contractor sin requerir autenticación
 * Útil para endpoints que permiten autenticación opcional
 * 
 * @param req - Express Request object
 * @param fallbackData - Datos de fallback del frontend (requerido)
 * @returns ContractorData con información del perfil
 */
export async function getContractorDataOptional(
  req: Request,
  fallbackData: any
): Promise<ContractorData> {
  try {
    // Intentar autenticar
    const firebaseUid = await authenticateUser(req);

    // 🔥 SINGLE SOURCE: Intentar obtener datos de Firebase
    return await getContractorData(firebaseUid, fallbackData);
  } catch (error) {
    // Si falla autenticación o no hay datos, usar fallback
    console.warn(`⚠️ [CONTRACTOR-HELPER] Optional auth failed, using fallback data`);
    console.warn(`📊 [CONTRACTOR-HELPER] Fallback data:`, {
      company: fallbackData?.company || fallbackData?.companyName || 'NOT PROVIDED',
      license: fallbackData?.license || fallbackData?.licenseNumber || 'NOT PROVIDED',
      state: fallbackData?.state || 'NOT PROVIDED'
    });
    return normalizeContractorData(fallbackData);
  }
}

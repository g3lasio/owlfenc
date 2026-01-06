/**
 * Contractor Data Helpers
 * 
 * Funciones unificadas para autenticación y obtención de datos del contractor
 * desde PostgreSQL (SINGLE SOURCE OF TRUTH).
 * 
 * Estas funciones aseguran que TODOS los endpoints que generan documentos
 * usen la misma lógica y fuente de datos.
 */

import { Request } from 'express';
import * as admin from 'firebase-admin';
import { storage } from '../storage-firebase-only';

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
 * - Header Authorization Bearer token
 * - Header x-firebase-uid
 * 
 * @param req - Express Request object
 * @returns Firebase UID del usuario autenticado
 * @throws Error si no hay autenticación válida
 */
export async function authenticateUser(req: Request): Promise<string> {
  // Método 1: x-firebase-uid header (usado por algunos endpoints)
  const firebaseUidHeader = req.headers["x-firebase-uid"] as string;
  if (firebaseUidHeader) {
    console.log(`✅ [AUTH-HELPER] Authenticated via x-firebase-uid header: ${firebaseUidHeader}`);
    return firebaseUidHeader;
  }

  // Método 2: Authorization Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log(`✅ [AUTH-HELPER] Authenticated via Bearer token: ${decodedToken.uid}`);
      return decodedToken.uid;
    } catch (error) {
      console.error('❌ [AUTH-HELPER] Invalid Bearer token:', error);
      throw new Error('INVALID_TOKEN: Authentication token is invalid');
    }
  }

  // No hay autenticación válida
  console.error('❌ [AUTH-HELPER] No authentication found in request');
  throw new Error('AUTHENTICATION_REQUIRED: No valid authentication method found');
}

/**
 * Obtiene los datos del contractor desde PostgreSQL (SINGLE SOURCE OF TRUTH)
 * 
 * @param firebaseUid - Firebase UID del usuario autenticado
 * @param fallbackData - Datos de fallback del frontend (opcional)
 * @returns ContractorData con información del perfil
 */
export async function getContractorData(
  firebaseUid: string,
  fallbackData?: any
): Promise<ContractorData> {
  console.log(`📋 [CONTRACTOR-HELPER] Fetching contractor data from PostgreSQL for UID: ${firebaseUid}`);

  try {
    // Obtener usuario de PostgreSQL
    const user = await storage.getUserByFirebaseUid(firebaseUid);

    if (user) {
      console.log(`✅ [CONTRACTOR-HELPER] Using contractor data from PostgreSQL: ${user.company}`);
      console.log(`📊 [CONTRACTOR-HELPER] Data source: PostgreSQL (SINGLE SOURCE OF TRUTH)`);

      return {
        name: user.company,
        company: user.company,
        address: user.address || "",
        phone: user.phone || "",
        email: user.email || "",
        license: user.license || "",
        logo: user.logo || "",
        website: user.website || "",
        city: user.city || "",
        state: user.state || "",
        zipCode: user.zipCode || "",
        mobilePhone: user.mobilePhone || "",
        ownerName: user.ownerName || "",
      };
    }

    // Si no hay usuario en PostgreSQL, usar fallback
    if (fallbackData) {
      console.warn(`⚠️ [CONTRACTOR-HELPER] No data in PostgreSQL, using frontend fallback`);
      console.warn(`⚠️ [CONTRACTOR-HELPER] User should complete profile in Settings`);

      return normalizeContractorData(fallbackData);
    }

    // No hay datos ni en PostgreSQL ni en fallback
    console.error(`❌ [CONTRACTOR-HELPER] No contractor data found for UID: ${firebaseUid}`);
    throw new Error('PROFILE_NOT_FOUND: User must complete profile in Settings before generating documents');

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PROFILE_NOT_FOUND')) {
      throw error;
    }

    console.error(`❌ [CONTRACTOR-HELPER] Error fetching contractor data:`, error);

    // Si hay error de base de datos pero tenemos fallback, usarlo
    if (fallbackData) {
      console.warn(`⚠️ [CONTRACTOR-HELPER] Database error, using frontend fallback`);
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

  // Obtener datos del contractor
  const contractorData = await getContractorData(firebaseUid, fallbackData);

  return { firebaseUid, contractorData };
}

/**
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

    // Intentar obtener datos de PostgreSQL
    return await getContractorData(firebaseUid, fallbackData);
  } catch (error) {
    // Si falla autenticación o no hay datos, usar fallback
    console.warn(`⚠️ [CONTRACTOR-HELPER] Optional auth failed, using fallback data`);
    return normalizeContractorData(fallbackData);
  }
}

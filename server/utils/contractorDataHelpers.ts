/**
 * Contractor Data Helpers
 * 
 * 🔥 SINGLE SOURCE OF TRUTH: Firebase Firestore (userProfiles collection)
 * 
 * ⚠️ CRITICAL: These functions NEVER use frontend data as fallback.
 * All contractor profile data MUST come from Firebase to ensure consistency.
 * 
 * If authentication fails or profile is not found, the request MUST fail
 * with a clear error message directing the user to complete their profile.
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
 * 🔥 CRITICAL: Extracts Firebase UID from request headers
 * 
 * ONLY accepts x-firebase-uid header - this is the ONLY reliable method
 * because the frontend sends the UID directly, not a JWT token.
 * 
 * @param req - Express Request object
 * @returns Firebase UID or null if not found
 */
export function getFirebaseUidFromRequest(req: Request): string | null {
  // ONLY method: x-firebase-uid header
  const firebaseUid = req.headers["x-firebase-uid"] as string;
  
  if (firebaseUid && firebaseUid.length > 0) {
    console.log(`✅ [AUTH-HELPER] Firebase UID from header: ${firebaseUid}`);
    return firebaseUid;
  }
  
  console.warn(`⚠️ [AUTH-HELPER] No x-firebase-uid header found in request`);
  return null;
}

/**
 * 🔥 SINGLE SOURCE OF TRUTH: Firebase Firestore
 * 
 * Gets contractor data ONLY from Firebase. NEVER uses frontend data.
 * 
 * @param firebaseUid - Firebase UID of the authenticated user
 * @returns ContractorData from Firebase
 * @throws Error if profile not found
 */
export async function getContractorDataFromFirebase(
  firebaseUid: string
): Promise<ContractorData> {
  console.log(`📋 [CONTRACTOR-HELPER] Fetching contractor data from Firebase for UID: ${firebaseUid}`);

  try {
    const profile = await companyProfileService.getProfileByFirebaseUid(firebaseUid);

    if (!profile) {
      console.error(`❌ [CONTRACTOR-HELPER] No profile found in Firebase for UID: ${firebaseUid}`);
      throw new Error('PROFILE_NOT_FOUND: Please complete your profile in Settings before generating documents');
    }

    console.log(`✅ [CONTRACTOR-HELPER] Profile loaded from Firebase: ${profile.companyName}`);
    console.log(`📊 [CONTRACTOR-HELPER] Critical fields:`, {
      companyName: profile.companyName || 'NOT SET',
      license: profile.license || 'NOT SET',
      state: profile.state || 'NOT SET',
      address: profile.address || 'NOT SET',
      phone: profile.phone || 'NOT SET',
      email: profile.email || 'NOT SET'
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

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PROFILE_NOT_FOUND')) {
      throw error;
    }
    console.error(`❌ [CONTRACTOR-HELPER] Error fetching from Firebase:`, error);
    throw new Error('DATABASE_ERROR: Failed to fetch contractor profile from Firebase');
  }
}

/**
 * 🔥 MAIN FUNCTION: Get contractor data from request
 * 
 * This is the ONLY function that should be used by endpoints.
 * It extracts the Firebase UID from headers and fetches data from Firebase.
 * 
 * ⚠️ NEVER uses frontend data as fallback - this prevents data inconsistencies.
 * 
 * @param req - Express Request object
 * @returns ContractorData from Firebase
 * @throws Error if no UID in headers or profile not found
 */
export async function getContractorData(req: Request): Promise<ContractorData> {
  // Step 1: Get Firebase UID from header
  const firebaseUid = getFirebaseUidFromRequest(req);
  
  if (!firebaseUid) {
    console.error(`❌ [CONTRACTOR-HELPER] No x-firebase-uid header - cannot fetch profile`);
    throw new Error('AUTHENTICATION_REQUIRED: x-firebase-uid header is required');
  }
  
  // Step 2: Fetch data from Firebase (NEVER from frontend)
  return await getContractorDataFromFirebase(firebaseUid);
}

/**
 * @deprecated Use getContractorData() instead
 * This function is kept for backward compatibility but should not be used.
 */
export async function authenticateUser(req: Request): Promise<string> {
  const uid = getFirebaseUidFromRequest(req);
  if (!uid) {
    throw new Error('AUTHENTICATION_REQUIRED: x-firebase-uid header is required');
  }
  return uid;
}

/**
 * @deprecated Use getContractorData() instead
 * This function is kept for backward compatibility but should not be used.
 */
export async function getAuthenticatedContractorData(
  req: Request,
  _fallbackData?: any // Ignored - NEVER use frontend data
): Promise<{ firebaseUid: string; contractorData: ContractorData }> {
  const firebaseUid = getFirebaseUidFromRequest(req);
  if (!firebaseUid) {
    throw new Error('AUTHENTICATION_REQUIRED: x-firebase-uid header is required');
  }
  
  const contractorData = await getContractorDataFromFirebase(firebaseUid);
  return { firebaseUid, contractorData };
}

/**
 * @deprecated Use getContractorData() instead
 * 
 * ⚠️ CRITICAL CHANGE: This function NO LONGER uses fallback data.
 * It now requires x-firebase-uid header and fetches from Firebase only.
 */
export async function getContractorDataOptional(
  req: Request,
  _fallbackData?: any // Ignored - NEVER use frontend data
): Promise<ContractorData> {
  const firebaseUid = getFirebaseUidFromRequest(req);
  
  if (!firebaseUid) {
    console.error(`❌ [CONTRACTOR-HELPER] No x-firebase-uid header - CANNOT use fallback data`);
    console.error(`❌ [CONTRACTOR-HELPER] Frontend MUST send x-firebase-uid header`);
    throw new Error('AUTHENTICATION_REQUIRED: x-firebase-uid header is required. Frontend must include this header in all requests.');
  }
  
  return await getContractorDataFromFirebase(firebaseUid);
}

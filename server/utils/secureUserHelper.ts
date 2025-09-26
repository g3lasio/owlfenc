import { DatabaseStorage } from '../DatabaseStorage';
import { userMappingService as userMappingServiceInstance, UserMappingService } from '../services/userMappingService';

/**
 * CRITICAL: Secure User Helper
 * 
 * This utility provides secure user ID resolution.
 * It ELIMINATES all dangerous userId = 1 fallbacks.
 */

let userMappingService: UserMappingService;

export function initSecureUserHelper(storage: DatabaseStorage) {
  userMappingService = userMappingServiceInstance;
}

/**
 * SECURE: Get user ID from Firebase UID
 * NEVER returns userId = 1 as fallback
 */
export async function getSecureUserId(firebaseUid: string, email?: string): Promise<number> {
  if (!userMappingService) {
    throw new Error("SecureUserHelper not initialized. Call initSecureUserHelper() first.");
  }

  if (!firebaseUid) {
    throw new Error("Firebase UID is required for secure user identification");
  }

  try {
    const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(firebaseUid, email);
    console.log(`✅ [SECURE-USER] Mapped ${firebaseUid} → ${userId}`);
    return userId;
  } catch (error) {
    console.error(`❌ [SECURE-USER] Failed to get secure user ID for ${firebaseUid}:`, error);
    throw new Error(`Failed to resolve user ID for Firebase UID: ${firebaseUid}`);
  }
}

/**
 * SECURE: Verify user ownership of data
 */
export async function verifyUserOwnership(firebaseUid: string, dataUserId: number): Promise<boolean> {
  if (!userMappingService) {
    throw new Error("SecureUserHelper not initialized");
  }

  try {
    return await userMappingService.verifyUserOwnership(firebaseUid, dataUserId);
  } catch (error) {
    console.error(`❌ [SECURE-USER] Ownership verification failed:`, error);
    return false;
  }
}

/**
 * MIGRATION: Replace dangerous userId = 1 patterns
 * Use this to fix existing code that uses unsafe fallbacks
 */
export function createSecureUserIdGetter(storage: DatabaseStorage) {
  const mappingService = userMappingServiceInstance;
  
  return async (firebaseUid?: string, email?: string): Promise<number> => {
    if (!firebaseUid) {
      throw new Error("SECURITY: Cannot provide user ID without Firebase UID. Dangerous userId = 1 fallback eliminated.");
    }
    
    return await mappingService.getOrCreateUserIdForFirebaseUid(firebaseUid, email);
  };
}
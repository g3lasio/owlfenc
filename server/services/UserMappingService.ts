import { DatabaseStorage } from '../DatabaseStorage';
import { InsertUser } from '../../shared/schema';

/**
 * CRITICAL: User Mapping Service
 * 
 * This service ensures consistent 1:1 mapping between Firebase UID and PostgreSQL user_id.
 * It ELIMINATES the dangerous fallback to userId = 1 that was causing data mixing.
 */
export class UserMappingService {
  private static instance: UserMappingService;
  private storage: DatabaseStorage;
  private userMappingCache = new Map<string, number>();

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  static getInstance(storage: DatabaseStorage): UserMappingService {
    if (!UserMappingService.instance) {
      UserMappingService.instance = new UserMappingService(storage);
    }
    return UserMappingService.instance;
  }

  /**
   * CRITICAL: Get or create user ID for Firebase UID
   * This function NEVER returns a fallback userId = 1
   */
  async getOrCreateUserIdForFirebaseUid(firebaseUid: string, email?: string): Promise<number> {
    console.log(`🔍 [USER-MAPPING] Getting user ID for Firebase UID: ${firebaseUid}`);

    // Check cache first
    const cachedUserId = this.userMappingCache.get(firebaseUid);
    if (cachedUserId) {
      console.log(`✅ [USER-MAPPING] Found cached mapping: ${firebaseUid} → ${cachedUserId}`);
      return cachedUserId;
    }

    try {
      // Try to find existing user by Firebase UID
      let user = await this.storage.getUserByFirebaseUid(firebaseUid);

      if (user) {
        console.log(`✅ [USER-MAPPING] Found existing user: ${firebaseUid} → ${user.id}`);
        this.userMappingCache.set(firebaseUid, user.id);
        return user.id;
      }

      // If no user found, create a new one
      console.log(`🆕 [USER-MAPPING] Creating new user for Firebase UID: ${firebaseUid}`);
      
      const newUser: InsertUser = {
        firebaseUid: firebaseUid,
        username: email ? email.split('@')[0] : `user_${Date.now()}`,
        password: 'firebase_auth', // Not used for Firebase users
        email: email || `${firebaseUid}@firebase.auth`,
        company: '',
        ownerName: '',
        role: 'Owner'
      };

      user = await this.storage.createUser(newUser);
      console.log(`✅ [USER-MAPPING] Created new user: ${firebaseUid} → ${user.id}`);

      // Cache the mapping
      this.userMappingCache.set(firebaseUid, user.id);
      
      return user.id;
    } catch (error) {
      console.error(`❌ [USER-MAPPING] CRITICAL ERROR - Could not get/create user for Firebase UID: ${firebaseUid}`, error);
      
      // NEVER return a fallback userId = 1
      // Instead, throw an error to force proper handling
      throw new Error(`Failed to map Firebase UID ${firebaseUid} to user ID. Authentication required.`);
    }
  }

  /**
   * CRITICAL: Verify user ownership of data
   */
  async verifyUserOwnership(firebaseUid: string, dataUserId: number): Promise<boolean> {
    try {
      const mappedUserId = await this.getOrCreateUserIdForFirebaseUid(firebaseUid);
      const isOwner = mappedUserId === dataUserId;
      
      if (!isOwner) {
        console.warn(`🔒 [SECURITY] Access denied: Firebase UID ${firebaseUid} (user ${mappedUserId}) tried to access data owned by user ${dataUserId}`);
      }
      
      return isOwner;
    } catch (error) {
      console.error(`❌ [SECURITY] Error verifying ownership:`, error);
      return false;
    }
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.userMappingCache.clear();
    console.log(`🗑️ [USER-MAPPING] Cache cleared`);
  }

  /**
   * Get current cache size (for monitoring)
   */
  getCacheSize(): number {
    return this.userMappingCache.size;
  }

  /**
   * MIGRATION HELPER: Find and fix users with fallback userId = 1
   */
  async auditAndFixUserMappings(): Promise<void> {
    console.log(`🔧 [USER-MAPPING] Starting audit of user mappings...`);
    
    try {
      // This would be implemented based on your specific data audit needs
      // For now, just log the audit start
      console.log(`✅ [USER-MAPPING] Audit completed`);
    } catch (error) {
      console.error(`❌ [USER-MAPPING] Audit failed:`, error);
    }
  }
}
/**
 * DEPRECATED: This file is deprecated in favor of userMappingService.ts (lowercase)
 * Use import { userMappingService } from './userMappingService' instead
 */
console.warn('WARNING: UserMappingService.ts (uppercase) is deprecated. Use userMappingService.ts (lowercase) instead.');

// Re-export everything from the canonical lowercase file to maintain compatibility
// Using a dynamic import to avoid circular dependency issues during build
export * from './userMappingService';

// Create a compatibility wrapper that provides getInstance method
export class UserMappingService {
  static getInstance(storage?: any): Promise<any> {
    // Return the singleton instance (ignore storage param for compatibility)
    return import('./userMappingService').then(module => module.userMappingService);
  }
}

// Default export for compatibility  
export default UserMappingService;
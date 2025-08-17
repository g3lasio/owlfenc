// DEPRECATED: PostgreSQL client storage disabled in favor of Firebase
// This file is kept for reference but all client operations now use Firebase
// See /routes/clientRoutes.ts for the new Firebase-based implementation

/*
PostgreSQL client storage has been replaced with Firebase for better
consistency with the frontend implementation and easier data management.

All client operations are now handled through:
- Firebase Firestore for data storage
- Firebase Auth for user authentication and authorization
- /api/clients routes for API access

This change ensures:
✅ Single source of truth (Firebase)
✅ Better security with user-based data isolation
✅ Consistent data schema across frontend and backend
✅ Support for import/export functionality
✅ Real-time data synchronization
*/

export interface IClientStorage {
  // Interface kept for compatibility but implementation moved to Firebase
}

export class DatabaseClientStorage implements IClientStorage {
  // Implementation disabled - use Firebase routes instead
}

// Deprecated - use Firebase routes instead
export const clientStorage = null;
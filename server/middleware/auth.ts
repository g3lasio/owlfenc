import { Request, Response, NextFunction } from 'express';

// ⚠️ DEPRECATED: This middleware has been replaced with Firebase Authentication
// Use verifyFirebaseAuth from ./firebase-auth.ts for all new routes
// This file is kept only for legacy compatibility and will be removed

console.warn('🚨 SECURITY WARNING: Legacy auth middleware is deprecated. Use Firebase authentication.');

// Re-export Firebase auth middleware as the secure implementation
export { verifyFirebaseAuth as requireAuth, optionalFirebaseAuth as optionalAuth } from './firebase-auth';

// Legacy compatibility - single export to avoid duplication
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  console.warn('🚨 Using deprecated isAuthenticated - migrating to Firebase auth');
  const { verifyFirebaseAuth } = await import('./firebase-auth');
  return verifyFirebaseAuth(req, res, next);
};
/**
 * FIREBASE AUTHENTICATION MIDDLEWARE
 * Verifies Firebase ID tokens and extracts verified UID
 * PREVENTS all bypass attempts by requiring valid Firebase authentication
 */

import { Request, Response, NextFunction } from 'express';
import { admin } from '../lib/firebase-admin.js';

export interface AuthenticatedRequest extends Request {
  uid: string; // Verified Firebase UID
  user?: admin.auth.DecodedIdToken;
}

/**
 * Verify Firebase ID token and extract UID
 * NO BYPASS POSSIBLE - Token must be valid and not expired
 */
export async function verifyFirebaseAuth(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('🚫 [AUTH-MIDDLEWARE] Missing or invalid Authorization header');
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Missing or invalid Authorization header'
      });
      return;
    }
    
    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!idToken) {
      console.warn('🚫 [AUTH-MIDDLEWARE] Empty ID token');
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Empty ID token'
      });
      return;
    }
    
    console.log(`🔐 [AUTH-MIDDLEWARE] Verifying Firebase ID token...`);
    
    // CRITICAL: Verify token with Firebase Admin SDK
    // This cannot be bypassed - Firebase validates signature, expiry, etc.
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    if (!decodedToken.uid) {
      console.error('❌ [AUTH-MIDDLEWARE] Token missing UID');
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token missing UID'
      });
      return;
    }
    
    // SECURITY: Add verified UID to request (no longer trusting request body)
    (req as AuthenticatedRequest).uid = decodedToken.uid;
    (req as AuthenticatedRequest).user = decodedToken;
    
    console.log(`✅ [AUTH-MIDDLEWARE] Authenticated user: ${decodedToken.uid}`);
    next();
    
  } catch (error) {
    console.error('❌ [AUTH-MIDDLEWARE] Authentication failed:', error);
    
    let errorMessage = 'Authentication failed';
    if (error instanceof Error) {
      if (error.message.includes('Firebase ID token has expired')) {
        errorMessage = 'Token expired - please login again';
      } else if (error.message.includes('Firebase ID token has invalid signature')) {
        errorMessage = 'Invalid token signature';
      } else if (error.message.includes('Firebase ID token has no "kid" claim')) {
        errorMessage = 'Malformed token';
      }
    }
    
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: errorMessage
    });
  }
}

/**
 * Admin-only authentication middleware
 * Requires special admin role claim in token
 */
export async function verifyAdminAuth(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    // First verify regular auth
    await new Promise<void>((resolve, reject) => {
      verifyFirebaseAuth(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    // Check for admin role claim
    const isAdmin = user.admin === true || user.role === 'admin';
    
    if (!isAdmin) {
      console.warn(`🚫 [ADMIN-AUTH] User ${user.uid} attempted admin access without permissions`);
      res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'Insufficient permissions'
      });
      return;
    }
    
    console.log(`✅ [ADMIN-AUTH] Admin access granted to: ${user.uid}`);
    next();
    
  } catch (error) {
    console.error('❌ [ADMIN-AUTH] Admin authentication failed:', error);
    res.status(403).json({
      success: false,
      error: 'Admin authentication failed'
    });
  }
}
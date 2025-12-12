/**
 * Middleware de autenticación con Firebase
 * Extrae el token de Firebase y obtiene el ID del usuario real
 * 
 * IMPORTANT: Uses shared Firebase Admin instance from firebase-admin.ts
 * to ensure proper initialization with storageBucket
 */

import { Request, Response, NextFunction } from 'express';
import { admin } from '../lib/firebase-admin';

// Interfaz para extender el objeto Request con información del usuario
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: {
        uid: string;
        email?: string;
        name?: string;
      };
    }
  }
}

// Firebase Admin is initialized via the shared module (firebase-admin.ts)
// No duplicate initialization needed here

/**
 * Middleware para verificar autenticación con Firebase
 * ✅ HYBRID: Accepts Firebase token OR valid session for backward compatibility
 */
export const verifyFirebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🔍 DEBUG: Log all available cookies
    console.log('🔍 [AUTH-DEBUG] Cookies disponibles:', Object.keys(req.cookies || {}));
    console.log('🔍 [AUTH-DEBUG] __session cookie exists:', !!req.cookies?.__session);
    console.log('🔍 [AUTH-DEBUG] Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    // Strategy 1: Try Firebase token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove "Bearer "
      
      try {
        // 🔐 ENTERPRISE SECURITY: Verify Firebase JWT token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        req.firebaseUser = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name
        };

        console.log(`✅ [AUTH-TOKEN] Usuario autenticado: ${decodedToken.uid} (${decodedToken.email})`);
        return next();
      } catch (tokenError) {
        console.warn('⚠️ [AUTH-TOKEN] Invalid Firebase token, trying session fallback');
        // Fall through to session check
      }
    }

    // Strategy 2: Firebase Session Cookie (primary session mechanism)
    const sessionCookie = req.cookies?.__session;
    if (sessionCookie) {
      console.log('🔍 [AUTH-DEBUG] Session cookie found, attempting verification...');
      try {
        // Verify the Firebase session cookie
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
        
        req.firebaseUser = {
          uid: decodedClaims.uid,
          email: decodedClaims.email,
          name: decodedClaims.name
        };

        console.log(`✅ [AUTH-SESSION-COOKIE] Usuario autenticado via session cookie: ${decodedClaims.uid} (${decodedClaims.email})`);
        return next();
      } catch (cookieError) {
        console.warn('⚠️ [AUTH-SESSION-COOKIE] Invalid or expired session cookie:', (cookieError as Error).message);
        // Fall through to rejection
      }
    }

    // No valid authentication found
    console.log('❌ [AUTH] No valid token or session cookie found');
    console.log('🔍 [AUTH-DEBUG] All cookies:', JSON.stringify(req.cookies));
    return res.status(401).json({ 
      error: 'Autenticación requerida - Por favor inicia sesión',
      code: 'AUTH_REQUIRED'
    });
  } catch (error: any) {
    console.error('❌ Error en middleware de autenticación:', error);
    return res.status(500).json({ 
      error: 'Error interno de autenticación',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware opcional para rutas que pueden funcionar sin autenticación
 */
export const optionalFirebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.firebaseUser = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name
        };
      } catch (tokenError) {
        console.warn('⚠️ Token opcional inválido, continuando sin autenticación');
      }
    }
    
    next();
  } catch (error) {
    console.warn('⚠️ Error en autenticación opcional:', error);
    next();
  }
};

/**
 * Alias para verifyFirebaseAuth - usado por robust-client-routes
 */
export const auth = verifyFirebaseAuth;
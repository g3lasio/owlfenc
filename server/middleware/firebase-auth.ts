/**
 * Middleware de autenticación con Firebase
 * Extrae el token de Firebase y obtiene el ID del usuario real
 */

import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

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

// Inicializar Firebase Admin SDK si no está inicializado
if (!admin.apps.length) {
  try {
    // En producción, usar las credenciales del entorno
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'owl-fenc'
      });
    } else {
      // Para desarrollo local, usar el SDK por defecto
      admin.initializeApp({
        projectId: 'owl-fenc'
      });
    }
    console.log('✅ Firebase Admin SDK inicializado correctamente');
  } catch (error) {
    console.warn('⚠️ No se pudo inicializar Firebase Admin SDK:', (error as Error).message);
  }
}

/**
 * Middleware para verificar autenticación con Firebase
 * ✅ HYBRID: Accepts Firebase token OR valid session for backward compatibility
 */
export const verifyFirebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
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

    // Strategy 2: Fallback to session-based auth (for users without active Firebase token)
    // @ts-ignore - session is added by express-session middleware
    if (req.session && req.session.user && req.session.user.firebaseUid) {
      // @ts-ignore
      const sessionUser = req.session.user;
      
      req.firebaseUser = {
        uid: sessionUser.firebaseUid,
        email: sessionUser.email,
        name: sessionUser.displayName || sessionUser.name
      };

      console.log(`✅ [AUTH-SESSION] Usuario autenticado via sesión: ${sessionUser.firebaseUid} (${sessionUser.email})`);
      return next();
    }

    // No valid authentication found
    console.log('❌ [AUTH] No valid token or session found');
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
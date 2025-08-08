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
    console.warn('⚠️ No se pudo inicializar Firebase Admin SDK:', error.message);
  }
}

/**
 * Middleware para verificar autenticación con Firebase
 */
export const verifyFirebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // En modo desarrollo, usar usuario simulado
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.FIREBASE_ADMIN_CREDENTIALS;
    
    if (isDevelopment) {
      console.log('🔧 Modo desarrollo: usando usuario simulado');
      req.firebaseUser = {
        uid: null, // No mock user - require real authentication
        email: 'dev@example.com',
        name: 'Usuario Desarrollo'
      };
      return next();
    }

    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    try {
      // Verificar el token con Firebase Admin
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      req.firebaseUser = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name
      };

      console.log(`✅ Usuario autenticado: ${decodedToken.uid} (${decodedToken.email})`);
      next();
    } catch (tokenError) {
      console.error('❌ Error verificando token Firebase:', tokenError);
      return res.status(401).json({ 
        error: 'Token de autenticación inválido',
        code: 'AUTH_TOKEN_INVALID'
      });
    }
  } catch (error) {
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
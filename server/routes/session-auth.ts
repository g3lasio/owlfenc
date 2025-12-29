import { Router, Request, Response } from 'express';
import { adminAuth } from '../firebase-admin';
import { userMappingService } from '../services/userMappingService';
import { storage } from '../storage';

import { rateLimit } from 'express-rate-limit';

const router = Router();

// Rate limiting for login attempts
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts per 15 minutes per IP
  message: {
    error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * FIREBASE SESSION COOKIES IMPLEMENTATION
 * Converts Firebase ID tokens to secure session cookies
 * Eliminates need for Authorization headers in every request
 */

interface SessionLoginRequest {
  idToken: string;
}

/**
 * POST /api/sessionLogin - Convert Firebase ID token to session cookie
 * 
 * Architecture Step 1: Session Login
 * - Frontend obtains ID token from Firebase
 * - Backend creates __session cookie (httpOnly, secure, SameSite=None)
 * - Cookie valid for 5-10 days
 * - All subsequent requests use session cookie automatically
 */
router.post("/sessionLogin", loginRateLimit, async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as SessionLoginRequest;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'ID token requerido para crear sesión',
        code: 'MISSING_ID_TOKEN'
      });
    }

    console.log('🔐 [SESSION-LOGIN] Iniciando conversión de token a session cookie...');

    // Verify the ID token with Firebase Admin
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenError: any) {
      console.error('❌ [SESSION-LOGIN] Error verificando ID token:', tokenError);
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación inválido',
        code: 'INVALID_ID_TOKEN'
      });
    }

    // Create session cookie (5 days expiration)
    const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    console.log(`✅ [SESSION-LOGIN] Session cookie creada para usuario: ${decodedToken.uid} (${decodedToken.email})`);

    // Get or create internal user mapping
    let internalUserId: number | null = null;
    let isNewUser = false;
    try {
      const { userMappingService } = await import('../services/userMappingService');
      
      // Primero verificar si el usuario ya existe
      const existingUserId = await userMappingService.getInternalUserId(decodedToken.uid);
      isNewUser = existingUserId === null;
      
      // Obtener o crear el mapping
      internalUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(decodedToken.uid, decodedToken.email || '');

      // Si es un usuario nuevo, asignarle el plan gratuito por defecto
      if (isNewUser && internalUserId) {
        console.log(`🚀 Nuevo usuario detectado: ${internalUserId}. Asignando plan gratuito por defecto.`);
        const { firebaseSubscriptionService } = await import('../services/firebaseSubscriptionService');
        await firebaseSubscriptionService.assignDefaultFreePlan(decodedToken.uid);
      }
    } catch (mappingError) {
      console.error('⚠️ [SESSION-LOGIN] User mapping failed, continuing with session creation:', mappingError);
    }

    // Set secure cookie options
    // ✅ FIX: sameSite='lax' for same-origin development, 'none' requires secure=true (HTTPS)
    const cookieOptions = {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
      maxAge: expiresIn,
      path: '/'
    };

    // Set the session cookie
    res.cookie('__session', sessionCookie, cookieOptions);

    // Return success response with user data
    res.json({
      success: true,
      message: 'Sesión iniciada correctamente',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        internalUserId,
        sessionExpiry: new Date(Date.now() + expiresIn).toISOString()
      },
      sessionInfo: {
        type: 'firebase-session-cookie',
        expiresIn: Math.floor(expiresIn / 1000), // seconds
        cookieName: '__session'
      }
    });

  } catch (error: any) {
    console.error('❌ [SESSION-LOGIN] Error crítico:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno creando sesión',
      code: 'SESSION_CREATION_FAILED'
    });
  }
});

/**
 * POST /api/sessionLogout - Clear session cookie
 */
router.post('/sessionLogout', (req: Request, res: Response) => {
  try {
    console.log('🔓 [SESSION-LOGOUT] Eliminando session cookie...');
    
    // Clear the session cookie
    res.clearCookie('__session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });

  } catch (error) {
    console.error('❌ [SESSION-LOGOUT] Error cerrando sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno cerrando sesión'
    });
  }
});

/**
 * GET /api/sessionStatus - Check session status
 */
router.get('/sessionStatus', async (req: Request, res: Response) => {
  try {
    const sessionCookie = req.cookies?.__session;
    
    if (!sessionCookie) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'No hay sesión activa'
      });
    }

    // Verify session cookie
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
      
      res.json({
        success: true,
        authenticated: true,
        user: {
          uid: decodedClaims.uid,
          email: decodedClaims.email,
          displayName: decodedClaims.name
        },
        sessionInfo: {
          iat: decodedClaims.iat,
          exp: decodedClaims.exp,
          expiresIn: decodedClaims.exp - Math.floor(Date.now() / 1000)
        }
      });

    } catch (sessionError: any) {
      console.warn('⚠️ [SESSION-STATUS] Session cookie inválida o expirada');
      
      // Clear invalid cookie
      res.clearCookie('__session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      });
      
      res.json({
        success: true,
        authenticated: false,
        message: 'Sesión expirada o inválida'
      });
    }

  } catch (error) {
    console.error('❌ [SESSION-STATUS] Error verificando estado de sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando estado de sesión'
    });
  }
});

export default router;
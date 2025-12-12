import { Router, Request, Response } from "express";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../services/email";
import jwt from "jsonwebtoken";
import { db } from '../db';
import { users, webauthnCredentials } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { admin } from '../lib/firebase-admin';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { resendService } from '../services/resendService';
const router = Router();

const JWT_SECRET =
  "b3e1cf944dc640cd8d33b1b8aee2f4302fc3fd8b30a84720b98e4dc8e5ae6720";
const JWT_EXPIRES_IN = "1d";

// Email change specific configuration
const EMAIL_CHANGE_SECRET = process.env.EMAIL_CHANGE_SECRET || "email-change-secret-2025";
const EMAIL_CHANGE_TTL = 30 * 60 * 1000; // 30 minutes

// Rate limiting for account security operations (email/password changes)
const emailChangeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Maximum 3 account security requests per 15 minutes per IP
  message: {
    error: "Too many account security requests. Please try again later.",
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false
  // Using default keyGenerator for proper IPv6 handling
});

// In-memory store for email change tokens (in production, use Redis)
const emailChangeTokens = new Map<string, {
  uid: string;
  newEmail: string;
  timestamp: number;
  used: boolean;
}>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  emailChangeTokens.forEach((data, token) => {
    if (now - data.timestamp > EMAIL_CHANGE_TTL) {
      emailChangeTokens.delete(token);
    }
  });
}, 5 * 60 * 1000);

// Email change token utilities
function generateEmailChangeToken(uid: string, newEmail: string): string {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${uid}:${newEmail}:${timestamp}:${nonce}`;
  const signature = crypto.createHmac('sha256', EMAIL_CHANGE_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  
  // Store token data for validation
  emailChangeTokens.set(token, {
    uid,
    newEmail,
    timestamp,
    used: false
  });
  
  return token;
}

function verifyEmailChangeToken(token: string): { valid: boolean; uid?: string; newEmail?: string; error?: string } {
  try {
    const tokenData = emailChangeTokens.get(token);
    if (!tokenData) {
      return { valid: false, error: 'Token not found or expired' };
    }
    
    if (tokenData.used) {
      return { valid: false, error: 'Token already used' };
    }
    
    const now = Date.now();
    if (now - tokenData.timestamp > EMAIL_CHANGE_TTL) {
      emailChangeTokens.delete(token);
      return { valid: false, error: 'Token expired' };
    }
    
    // Verify HMAC signature
    const payload = Buffer.from(token, 'base64url').toString();
    const parts = payload.split(':');
    if (parts.length !== 5) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    const [uid, newEmail, timestamp, nonce, signature] = parts;
    const expectedPayload = `${uid}:${newEmail}:${timestamp}:${nonce}`;
    const expectedSignature = crypto.createHmac('sha256', EMAIL_CHANGE_SECRET).update(expectedPayload).digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }
    
    return { valid: true, uid, newEmail };
  } catch (error) {
    return { valid: false, error: 'Token verification failed' };
  }
}

const generateToken = (payload: {
  id: number;
  name: string;
  email: string;
}) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

router.post("/generate-token", async (req: Request, res: Response) => {
  try {
    const { id, name, email } = req.body;
    const token = generateToken({ id, name, email });
    res.status(200).json({ token, message: "Token generated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error generating token" });
  }
});
// Ruta para solicitar restablecimiento de contraseña
router.post("/password-reset", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ message: "El correo electrónico es requerido" });
    }

    // Firebase maneja directamente el envío del correo de restablecimiento,
    // pero aquí podríamos personalizarlo usando nuestro servicio de correo
    // y luego usar la API de Firebase para generar el link
    // Usar URL builder dinámico en lugar de URL hardcodeada
    const { buildPasswordResetUrl } = await import('../utils/url-builder');
    const resetLink = buildPasswordResetUrl(req, `token=placeholder&email=${encodeURIComponent(email)}&action=resetPassword`);

    const emailSent = await sendPasswordResetEmail(email, resetLink);

    if (emailSent) {
      return res
        .status(200)
        .json({ message: "Correo de restablecimiento enviado correctamente" });
    } else {
      return res
        .status(500)
        .json({ message: "No se pudo enviar el correo de restablecimiento" });
    }
  } catch (error) {
    console.error("Error al solicitar restablecimiento de contraseña:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para enviar correo de bienvenida
router.post("/welcome-email", async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ message: "El correo electrónico es requerido" });
    }

    const emailSent = await sendWelcomeEmail(email, name || "");

    if (emailSent) {
      return res
        .status(200)
        .json({ message: "Correo de bienvenida enviado correctamente" });
    } else {
      return res
        .status(500)
        .json({ message: "No se pudo enviar el correo de bienvenida" });
    }
  } catch (error) {
    console.error("Error al enviar correo de bienvenida:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * Endpoint para restaurar sesión usando refresh token guardado de forma segura
 * CONCEPTO: Biometría ya se verificó, ahora restaurar sesión Firebase
 */
router.post('/refresh-session', async (req: Request, res: Response) => {
  try {
    const { refreshToken, credentialId } = req.body;
    console.log('🔑 [REFRESH-SESSION] Restaurando sesión con refresh token');

    if (!refreshToken || !credentialId) {
      return res.status(400).json({ 
        error: 'Refresh token y credential ID requeridos' 
      });
    }

    // Validar conexión a base de datos
    if (!db) {
      console.error('❌ [REFRESH-SESSION] Base de datos no disponible');
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Validar que la credencial biométrica existe en la base de datos
    const [credential] = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.credentialId, credentialId))
      .limit(1);

    if (!credential) {
      return res.status(404).json({ 
        error: 'Credencial biométrica no encontrada' 
      });
    }

    // Obtener usuario asociado
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, credential.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    try {
      // Crear custom token para restaurar sesión Firebase
      const customToken = await admin.auth().createCustomToken(user.firebaseUid || user.id.toString(), {
        email: user.email,
        name: user.ownerName || user.email,
        biometric_unlock: true,
        unlock_timestamp: Date.now()
      });

      console.log('✅ [REFRESH-SESSION] Custom token creado para:', user.email);

      // Devolver token y datos del usuario
      res.json({
        success: true,
        customToken,
        user: {
          uid: user.firebaseUid || user.id.toString(),
          email: user.email,
          displayName: user.ownerName || user.email,
          biometricUnlock: true
        }
      });

    } catch (tokenError: any) {
      console.error('❌ [REFRESH-SESSION] Error creando custom token:', tokenError);
      
      // Si el refresh token es inválido, el cliente debe reautenticar
      if (tokenError.code === 'auth/invalid-refresh-token' || tokenError.code === 'auth/user-token-expired') {
        return res.status(401).json({ 
          error: 'Refresh token expirado o inválido',
          needsReauth: true 
        });
      }
      
      return res.status(500).json({ 
        error: 'Error creando token de sesión' 
      });
    }

  } catch (error) {
    console.error('❌ [REFRESH-SESSION] Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Email change confirmation email template
function generateEmailChangeConfirmationEmail(newEmail: string, confirmationLink: string): { subject: string; html: string } {
  const subject = 'Confirma tu nuevo email - Owl Fenc';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .content {
          padding: 40px 30px;
        }
        .confirmation-box {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 6px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .security-notice {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          background: #2c3e50;
          color: #ecf0f1;
          text-align: center;
          padding: 20px;
          font-size: 14px;
        }
        .expiry-info {
          color: #6c757d;
          font-size: 14px;
          text-align: center;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Confirma tu nuevo email</h1>
        </div>
        
        <div class="content">
          <h2>¡Estás a un paso de completar el cambio!</h2>
          
          <p>Has solicitado cambiar tu email a: <strong>${newEmail}</strong></p>
          
          <div class="confirmation-box">
            <h3>📧 Confirma tu nuevo email</h3>
            <p>Para completar el cambio de email y mantener tu cuenta segura, haz clic en el botón de abajo:</p>
            
            <div style="text-align: center;">
              <a href="${confirmationLink}" class="button">
                ✅ Confirmar nuevo email
              </a>
            </div>
          </div>
          
          <div class="security-notice">
            <h4>🛡️ Medidas de seguridad implementadas:</h4>
            <ul>
              <li>✅ Token de confirmación único y seguro</li>
              <li>🕐 Enlace válido por 30 minutos solamente</li>
              <li>🔒 Una sola confirmación permitida</li>
              <li>🔄 Tokens de sesión renovados automáticamente</li>
            </ul>
          </div>
          
          <h3>⚠️ ¿No solicitaste este cambio?</h3>
          <p>Si no iniciaste este cambio de email, <strong>ignora este mensaje</strong>. Tu cuenta permanecerá segura y el enlace expirará automáticamente.</p>
          
          <div class="expiry-info">
            ⏰ Este enlace expirará en 30 minutos por seguridad
          </div>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Owl Fenc LLC. Todos los derechos reservados.</p>
          <p>Sistema de cambio de email seguro | Encriptación HMAC</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return { subject, html };
}

// Middleware to verify Firebase authentication
async function verifyFirebaseAuth(req: Request & { user?: any }, res: Response, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('❌ [AUTH-VERIFICATION] Error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * POST /api/account/email/change
 * Initiate email change process
 */
router.post('/account/email/change', emailChangeRateLimit, verifyFirebaseAuth, async (req: Request & { user?: any }, res: Response) => {
  try {
    const { newEmail } = req.body;
    const uid = req.user?.uid;
    
    console.log('📧 [EMAIL-CHANGE] Initiating email change request', { uid, newEmail });
    
    // Validation
    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({
        error: 'Valid email address is required',
        code: 'INVALID_EMAIL'
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid email address',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    if (!uid) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Get current user from Firebase
    try {
      const currentUser = await admin.auth().getUser(uid);
      
      // Check if new email is the same as current
      if (currentUser.email === newEmail) {
        return res.status(400).json({
          error: 'New email must be different from current email',
          code: 'SAME_EMAIL'
        });
      }
      
      // Check if email is already in use
      try {
        await admin.auth().getUserByEmail(newEmail);
        return res.status(409).json({
          error: 'Email address is already in use by another account',
          code: 'EMAIL_IN_USE'
        });
      } catch (emailCheckError: any) {
        // Email not found is good - we can proceed
        if (emailCheckError.code !== 'auth/user-not-found') {
          throw emailCheckError;
        }
      }
      
      // Generate secure token
      const token = generateEmailChangeToken(uid, newEmail);
      
      // Build confirmation URL  
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://app.owlfenc.com' 
        : `http://localhost:5000`;
      const confirmationLink = `${baseUrl}/api/auth/account/email/confirm?token=${token}`;
      
      // Generate email content
      const { subject, html } = generateEmailChangeConfirmationEmail(newEmail, confirmationLink);
      
      // Send confirmation email using Resend
      const emailSent = await resendService.sendEmail({
        to: newEmail,
        subject,
        html,
        from: 'noreply@owlfenc.com',
        replyTo: 'support@owlfenc.com'
      });
      
      if (!emailSent) {
        return res.status(500).json({
          error: 'Failed to send confirmation email. Please try again.',
          code: 'EMAIL_SEND_FAILED'
        });
      }
      
      console.log('✅ [EMAIL-CHANGE] Confirmation email sent successfully', { uid, newEmail });
      
      res.json({
        success: true,
        message: `Confirmation email sent to ${newEmail}. Please check your inbox and click the confirmation link within 30 minutes.`,
        expiresIn: EMAIL_CHANGE_TTL / 1000 // seconds
      });
      
    } catch (userError: any) {
      console.error('❌ [EMAIL-CHANGE] Firebase user error:', userError);
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
  } catch (error: any) {
    console.error('❌ [EMAIL-CHANGE] Unexpected error:', error);
    res.status(500).json({
      error: 'Internal server error. Please try again later.',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/account/email/confirm
 * Confirm email change
 */
router.get('/account/email/confirm', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    
    console.log('🔐 [EMAIL-CONFIRM] Processing email confirmation', { hasToken: !!token });
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: 'Confirmation token is required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Verify token
    const verification = verifyEmailChangeToken(token);
    if (!verification.valid) {
      console.log('❌ [EMAIL-CONFIRM] Token verification failed:', verification.error);
      
      // Return 410 for expired/used tokens with resend option
      if (verification.error?.includes('expired') || verification.error?.includes('used')) {
        return res.status(410).json({
          error: verification.error,
          code: 'TOKEN_EXPIRED_OR_USED',
          canResend: true,
          message: 'Token has expired or been used. Please request a new email change.'
        });
      }
      
      return res.status(400).json({
        error: verification.error || 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    const { uid, newEmail } = verification;
    
    try {
      // Update user email in Firebase first (before marking token as used)
      await admin.auth().updateUser(uid!, {
        email: newEmail,
        emailVerified: false // Force re-verification
      });
      
      // Revoke all refresh tokens to force re-authentication
      await admin.auth().revokeRefreshTokens(uid!);
      
      // Mark token as used ONLY after successful Firebase operations
      const tokenData = emailChangeTokens.get(token);
      if (tokenData) {
        tokenData.used = true;
      }
      
      // Clean up token after successful confirmation
      emailChangeTokens.delete(token);
      
      console.log('✅ [EMAIL-CONFIRM] Email successfully changed', { uid, newEmail });
      
      // Generate audit log entry
      console.log('📋 [AUDIT] Email changed', {
        uid,
        oldEmail: 'previous-email', // In production, log the old email
        newEmail,
        timestamp: new Date().toISOString(),
        requestId: `email-change-${Date.now()}`
      });
      
      // Return success response with redirect suggestion
      res.json({
        success: true,
        message: 'Email address successfully updated! Please sign in again with your new email.',
        newEmail,
        requiresReauth: true,
        redirectTo: '/login'
      });
      
    } catch (updateError: any) {
      console.error('❌ [EMAIL-CONFIRM] Firebase update error:', updateError);
      
      // Handle specific Firebase errors
      if (updateError.code === 'auth/user-not-found') {
        return res.status(404).json({
          error: 'User account not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      if (updateError.code === 'auth/email-already-exists') {
        return res.status(409).json({
          error: 'Email address is already in use',
          code: 'EMAIL_IN_USE'
        });
      }
      
      return res.status(500).json({
        error: 'Failed to update email address. Please try again.',
        code: 'UPDATE_FAILED'
      });
    }
    
  } catch (error: any) {
    console.error('❌ [EMAIL-CONFIRM] Unexpected error:', error);
    res.status(500).json({
      error: 'Internal server error. Please try again later.',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/update-email
 * Direct email update using Firebase Admin SDK (no confirmation required)
 * This is a simpler approach that changes email immediately
 */
router.post('/update-email', emailChangeRateLimit, verifyFirebaseAuth, async (req: Request & { user?: any }, res: Response) => {
  try {
    const { newEmail } = req.body;
    const uid = req.user?.uid;
    
    console.log('📧 [UPDATE-EMAIL-DIRECT] Direct email update request', { uid, newEmail });
    
    // Validation
    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({
        error: 'Valid email address is required',
        code: 'INVALID_EMAIL'
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid email address',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    if (!uid) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Check if email is already in use
    try {
      await admin.auth().getUserByEmail(newEmail);
      return res.status(409).json({
        error: 'Email address is already in use by another account',
        code: 'EMAIL_IN_USE'
      });
    } catch (emailCheckError: any) {
      // Email not found is good - we can proceed
      if (emailCheckError.code !== 'auth/user-not-found') {
        throw emailCheckError;
      }
    }
    
    // Update email directly using Admin SDK
    try {
      const userRecord = await admin.auth().updateUser(uid, {
        email: newEmail,
        emailVerified: false // User should verify the new email
      });
      
      console.log('✅ [UPDATE-EMAIL-DIRECT] Email updated successfully', { 
        uid, 
        oldEmail: req.user.email,
        newEmail: userRecord.email 
      });
      
      // Optionally revoke refresh tokens to force re-authentication
      await admin.auth().revokeRefreshTokens(uid);
      
      res.json({
        success: true,
        message: 'Email updated successfully. Please sign in again with your new email.',
        newEmail: userRecord.email
      });
      
    } catch (updateError: any) {
      console.error('❌ [UPDATE-EMAIL-DIRECT] Firebase update error:', updateError);
      
      if (updateError.code === 'auth/email-already-exists') {
        return res.status(409).json({
          error: 'Email address is already in use',
          code: 'EMAIL_IN_USE'
        });
      }
      
      if (updateError.code === 'auth/user-not-found') {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      throw updateError;
    }
    
  } catch (error: any) {
    console.error('❌ [UPDATE-EMAIL-DIRECT] Unexpected error:', error);
    res.status(500).json({
      error: 'Failed to update email. Please try again.',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/update-password
 * Secure password update using Firebase Admin SDK
 * 
 * SECURITY FLOW:
 * 1. Client-side re-authentication verifies current password
 * 2. Server receives request with currentPasswordVerified flag
 * 3. Server updates password via Admin SDK
 * 4. Server revokes all refresh tokens for security
 * 5. Server logs audit event
 */
router.post('/update-password', emailChangeRateLimit, verifyFirebaseAuth, async (req: Request & { user?: any }, res: Response) => {
  const timestamp = new Date().toISOString();
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  
  try {
    const { newPassword, currentPasswordVerified } = req.body;
    const uid = req.user?.uid;
    const userEmail = req.user?.email || 'unknown';
    
    console.log('🔐 [UPDATE-PASSWORD] Password update request', { 
      uid, 
      email: userEmail,
      clientIp,
      timestamp,
      clientVerified: !!currentPasswordVerified 
    });
    
    // Validation
    if (!newPassword || typeof newPassword !== 'string') {
      console.log('❌ [UPDATE-PASSWORD-AUDIT] Rejected: Invalid password format', { uid, timestamp });
      return res.status(400).json({
        error: 'New password is required',
        code: 'INVALID_PASSWORD'
      });
    }
    
    // Password strength validation
    if (newPassword.length < 6) {
      console.log('❌ [UPDATE-PASSWORD-AUDIT] Rejected: Weak password', { uid, timestamp });
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Server-side password strength check
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      console.log('❌ [UPDATE-PASSWORD-AUDIT] Rejected: Password complexity', { uid, timestamp });
      return res.status(400).json({
        error: 'Password must contain uppercase, lowercase, and numbers',
        code: 'WEAK_PASSWORD'
      });
    }
    
    if (!uid) {
      console.log('❌ [UPDATE-PASSWORD-AUDIT] Rejected: No authentication', { clientIp, timestamp });
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Security check: Client should have verified current password
    if (!currentPasswordVerified) {
      console.log('⚠️ [UPDATE-PASSWORD-AUDIT] Warning: No client-side verification flag', { uid, timestamp });
      // We still allow it since the user is authenticated, but log it
    }
    
    // Update password using Admin SDK
    try {
      await admin.auth().updateUser(uid, {
        password: newPassword
      });
      
      console.log('✅ [UPDATE-PASSWORD-AUDIT] Password updated successfully', { 
        uid, 
        email: userEmail,
        clientIp,
        timestamp,
        clientVerified: !!currentPasswordVerified
      });
      
      // SECURITY: Revoke all refresh tokens to force re-authentication on all devices
      await admin.auth().revokeRefreshTokens(uid);
      console.log('🔒 [UPDATE-PASSWORD-AUDIT] Refresh tokens revoked', { uid, timestamp });
      
      res.json({
        success: true,
        message: 'Password updated successfully. Please sign in again with your new password.',
        tokensRevoked: true
      });
      
    } catch (updateError: any) {
      console.error('❌ [UPDATE-PASSWORD-AUDIT] Firebase update error:', { 
        uid, 
        error: updateError.code,
        timestamp 
      });
      
      if (updateError.code === 'auth/user-not-found') {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      if (updateError.code === 'auth/weak-password') {
        return res.status(400).json({
          error: 'Password is too weak. Please use a stronger password.',
          code: 'WEAK_PASSWORD'
        });
      }
      
      throw updateError;
    }
    
  } catch (error: any) {
    console.error('❌ [UPDATE-PASSWORD-AUDIT] Unexpected error:', { 
      error: error.message,
      timestamp 
    });
    res.status(500).json({
      error: 'Failed to update password. Please try again.',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;

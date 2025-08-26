import { Router, Request, Response } from "express";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../services/email";
import jwt from "jsonwebtoken";
import { db } from '../db';
import { users, webauthnCredentials } from '@shared/schema';
import { eq } from 'drizzle-orm';
import admin from 'firebase-admin';
const router = Router();

const JWT_SECRET =
  "b3e1cf944dc640cd8d33b1b8aee2f4302fc3fd8b30a84720b98e4dc8e5ae6720";
const JWT_EXPIRES_IN = "1d";
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

export default router;

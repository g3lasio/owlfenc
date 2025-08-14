import { Router } from 'express';
import { randomBytes, createHash } from 'crypto';
import { db } from '../db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { ResendEmailService } from '../services/resendService';
import { adminAuth } from '../firebase-admin';

const router = Router();
const resendService = new ResendEmailService();

// Generar token seguro
function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

// Hash del token para almacenamiento seguro
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// POST /api/password-reset/request - Solicitar restablecimiento
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('🔐 [PASSWORD-RESET] Solicitud de restablecimiento para:', email);

    // Verificar si el usuario existe
    const [user] = await db!.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      // SEGURIDAD: Rechazar solicitudes para emails no registrados
      console.log('🚫 [PASSWORD-RESET] Email no registrado:', email);
      return res.status(400).json({ 
        error: 'Este correo electrónico no está registrado en nuestro sistema. Si cree que esto es un error, por favor contacte a nuestro equipo de soporte en mervin@owlfenc.com',
        supportContact: 'mervin@owlfenc.com',
        code: 'EMAIL_NOT_REGISTERED'
      });
    }

    // Generar token seguro
    const resetToken = generateResetToken();
    const hashedToken = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar token en la base de datos
    await db!.insert(passwordResetTokens).values({
      id: `prt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.firebaseUid || user.email, // Use firebaseUid or email as fallback
      token: hashedToken,
      expiresAt,
      used: 'false'
    });

    // Crear enlace de restablecimiento
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

    // Crear HTML del email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .content {
            padding: 40px 30px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            background-color: #f8fafc;
            text-align: center;
            font-size: 14px;
            color: #64748b;
            padding: 30px;
          }
          .security-notice {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 16px;
            margin: 20px 0;
            font-size: 14px;
            color: #991b1b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Reset Your Password</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure password recovery</p>
          </div>
          <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              We received a request to reset your password for your account. Click the button below to reset it:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 13px;">
              ${resetLink}
            </p>
            <div class="security-notice">
              <strong>Security Notice:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This link will expire in 15 minutes</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Owl Fence Platform. All rights reserved.</p>
            <p>This is an automated security email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar email usando Resend
    console.log('📧 [PASSWORD-RESET] Enviando email via Resend...');
    const emailSent = await resendService.sendEmail({
      to: email,
      subject: 'Reset Your Password - Action Required',
      html: emailHtml,
      from: 'Owl Fence <noreply@owlfenc.com>'
    });

    if (emailSent) {
      console.log('✅ [PASSWORD-RESET] Email enviado exitosamente');
      res.json({ 
        success: true, 
        message: 'Password reset email sent successfully' 
      });
    } else {
      console.error('❌ [PASSWORD-RESET] Error al enviar email');
      res.status(500).json({ 
        error: 'Failed to send email. Please try again.' 
      });
    }

  } catch (error) {
    console.error('❌ [PASSWORD-RESET] Error en solicitud:', error);
    res.status(500).json({ 
      error: 'Internal server error. Please try again later.' 
    });
  }
});

// POST /api/password-reset/verify - Verificar token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const hashedToken = hashToken(token);

    // Buscar token válido para verificar
    const [resetToken] = await db!
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        used: passwordResetTokens.used
      })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, hashedToken),
          gt(passwordResetTokens.expiresAt, new Date()),
          eq(passwordResetTokens.used, 'false')
        )
      );

    if (!resetToken) {
      return res.status(400).json({ 
        error: 'Invalid or expired token' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Token is valid',
      userId: resetToken.userId 
    });

  } catch (error) {
    console.error('❌ [PASSWORD-RESET] Error verificando token:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// POST /api/password-reset/confirm - Confirmar nuevo password
router.post('/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        error: 'Token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    const hashedToken = hashToken(token);

    // Buscar token válido para confirmar
    const [resetToken] = await db!
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        used: passwordResetTokens.used
      })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, hashedToken),
          gt(passwordResetTokens.expiresAt, new Date()),
          eq(passwordResetTokens.used, 'false')
        )
      );

    if (!resetToken) {
      return res.status(400).json({ 
        error: 'Invalid or expired token' 
      });
    }

    try {
      // Buscar el usuario en nuestra base de datos para obtener su UID de Firebase
      const [user] = await db!.select().from(users).where(eq(users.firebaseUid, resetToken.userId));
      
      if (!user) {
        return res.status(400).json({ 
          error: 'Usuario no encontrado en el sistema' 
        });
      }

      // Verificar que el usuario tenga un UID de Firebase válido
      if (!user.firebaseUid) {
        return res.status(400).json({ 
          error: 'Usuario no tiene UID de Firebase válido' 
        });
      }

      // Actualizar la contraseña en Firebase Auth usando Firebase Admin SDK
      await adminAuth.updateUser(user.firebaseUid, {
        password: newPassword
      });

      // Marcar token como usado DESPUÉS de actualizar la contraseña exitosamente
      await db!
        .update(passwordResetTokens)
        .set({ used: 'true' })
        .where(eq(passwordResetTokens.id, resetToken.id));

      console.log('✅ [PASSWORD-RESET] Contraseña actualizada exitosamente en Firebase Auth para UID:', user.firebaseUid);

      res.json({ 
        success: true, 
        message: 'Password reset completed successfully. You can now login with your new password.' 
      });

    } catch (firebaseError) {
      console.error('❌ [PASSWORD-RESET] Error actualizando contraseña en Firebase:', firebaseError);
      
      // No marcar el token como usado si falló la actualización
      return res.status(500).json({ 
        error: 'Failed to update password. Please try again or contact support.' 
      });
    }

  } catch (error) {
    console.error('❌ [PASSWORD-RESET] Error confirmando reset:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Endpoint de prueba para verificar Firebase Admin Auth
router.post('/test-firebase-admin', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('🧪 [FIREBASE-TEST] Probando Firebase Admin Auth para UID:', userId);
    
    // Intentar obtener información del usuario
    const userRecord = await adminAuth.getUser(userId);
    console.log('✅ [FIREBASE-TEST] Usuario encontrado:', userRecord.email);
    
    // Intentar actualizar el usuario (sin cambiar contraseña aún)
    await adminAuth.updateUser(userId, {
      displayName: 'Test Update - ' + new Date().toISOString()
    });
    
    console.log('✅ [FIREBASE-TEST] Usuario actualizado exitosamente');
    
    res.json({ 
      success: true, 
      message: 'Firebase Admin Auth funcionando correctamente',
      userEmail: userRecord.email,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [FIREBASE-TEST] Error:', error);
    res.status(500).json({ 
      error: 'Firebase Admin Auth error',
      details: error.message 
    });
  }
});

export { router as passwordResetRoutes };
/**
 * 🔐 OTP EMAIL AUTHENTICATION SERVICE
 * Secure 6-digit OTP system with 15-minute expiration using Resend
 */

import { Resend } from 'resend';
import { db } from '../db';
import { otpCodes, type InsertOtpCode } from '@shared/schema';
import { eq, and, gt, lt } from 'drizzle-orm';
import { getAuth } from 'firebase-admin/auth';
import { UserMappingService } from './UserMappingService';
import { DatabaseStorage } from '../DatabaseStorage';

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable must be set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export class OTPService {
  
  /**
   * Generate a secure 6-digit OTP code
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP code via email using Resend - Para usuarios existentes y nuevos registros
   */
  async sendOTP(email: string, isNewUser: boolean = false): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔐 [OTP-SERVICE] Processing OTP request for: ${email} (New user: ${isNewUser})`);

      // 🔐 CRITICAL SECURITY: Validar usuario existente vs nuevo registro
      if (!isNewUser) {
        // Para LOGIN: verificar que el usuario EXISTE en Firebase
        try {
          await getAuth().getUserByEmail(email);
          console.log(`✅ [OTP-SERVICE] Existing user verified for LOGIN: ${email}`);
        } catch (firebaseError: any) {
          if (firebaseError.code === 'auth/user-not-found') {
            console.log(`❌ [OTP-SERVICE] User not found - LOGIN DENIED: ${email}`);
            return {
              success: false,
              message: 'Este correo no está registrado. Por favor, regístrate primero.'
            };
          }
          throw firebaseError;
        }
      } else {
        // Para REGISTRO: verificar que el usuario NO existe aún
        try {
          await getAuth().getUserByEmail(email);
          console.log(`⚠️ [OTP-SERVICE] User already exists - REGISTRATION DENIED: ${email}`);
          return {
            success: false,
            message: 'Este correo ya está registrado. Por favor, inicia sesión.'
          };
        } catch (firebaseError: any) {
          if (firebaseError.code === 'auth/user-not-found') {
            console.log(`🆕 [OTP-SERVICE] New user verified for REGISTRATION: ${email}`);
            // User doesn't exist, can proceed with registration
          } else {
            throw firebaseError;
          }
        }
      }

      console.log(`🔐 [OTP-SERVICE] Generating OTP for: ${email}`);

      if (!db) {
        throw new Error('Database connection not available');
      }

      // Invalidate any existing OTP codes for this email
      await db
        .update(otpCodes)
        .set({ verified: true }) // Mark as used
        .where(eq(otpCodes.email, email));

      // Generate new OTP code
      const code = this.generateOTP();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      // Store OTP in database
      const [newOtp] = await db
        .insert(otpCodes)
        .values({
          email,
          code,
          expiresAt,
          verified: false,
          attempts: 0,
          maxAttempts: 3,
        })
        .returning();

      console.log(`🔐 [OTP-SERVICE] OTP created with ID: ${newOtp.id}`);

      // Send email with OTP using Resend
      const emailContent = this.createOTPEmail(code);
      
      await resend.emails.send({
        from: 'noreply@owlfenc.com', // Replace with your verified sender
        to: email,
        subject: 'Tu código de acceso - Owl Fenc',
        html: emailContent.html,
        text: emailContent.text,
      });

      console.log(`✅ [OTP-SERVICE] OTP sent successfully to: ${email}`);

      const message = isNewUser 
        ? 'Código de registro enviado. Úsalo para completar tu cuenta.'
        : 'Código enviado correctamente a tu correo electrónico';

      return {
        success: true,
        message: message
      };

    } catch (error) {
      console.error('❌ [OTP-SERVICE] Error sending OTP:', error);
      return {
        success: false,
        message: 'Error al enviar el código. Intenta de nuevo.'
      };
    }
  }

  /**
   * Verify OTP code - Updated to support new user creation
   */
  async verifyOTP(email: string, code: string, createNewUser: boolean = false): Promise<{ success: boolean; message: string; userId?: string; newUser?: boolean }> {
    try {
      console.log(`🔐 [OTP-SERVICE] Verifying OTP for: ${email}`);

      if (!db) {
        throw new Error('Database connection not available');
      }

      // Find valid OTP code
      const [otpRecord] = await db
        .select()
        .from(otpCodes)
        .where(
          and(
            eq(otpCodes.email, email),
            eq(otpCodes.code, code),
            eq(otpCodes.verified, false),
            gt(otpCodes.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!otpRecord) {
        console.log(`❌ [OTP-SERVICE] Invalid or expired OTP for: ${email}`);
        return {
          success: false,
          message: 'Código inválido o expirado. Solicita un nuevo código.'
        };
      }

      // Check attempt limits
      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        console.log(`❌ [OTP-SERVICE] Max attempts exceeded for: ${email}`);
        return {
          success: false,
          message: 'Demasiados intentos. Solicita un nuevo código.'
        };
      }

      // Verify code matches
      if (otpRecord.code !== code) {
        // Increment attempt count
        if (db) {
          await db
            .update(otpCodes)
            .set({ attempts: otpRecord.attempts + 1 })
            .where(eq(otpCodes.id, otpRecord.id));
        }

        const remainingAttempts = otpRecord.maxAttempts - (otpRecord.attempts + 1);
        console.log(`❌ [OTP-SERVICE] Wrong code for: ${email}, ${remainingAttempts} attempts remaining`);
        
        return {
          success: false,
          message: `Código incorrecto. Te quedan ${remainingAttempts} intentos.`
        };
      }

      // Mark OTP as verified
      if (db) {
        await db
          .update(otpCodes)
          .set({ verified: true })
          .where(eq(otpCodes.id, otpRecord.id));
      }

      console.log(`✅ [OTP-SERVICE] OTP verified successfully for: ${email}`);

      // If this is for a new user, create them in Firebase and PostgreSQL
      if (createNewUser) {
        try {
          console.log(`🆕 [OTP-SERVICE] Creating new user in Firebase: ${email}`);
          
          // Create user in Firebase Auth
          const userRecord = await getAuth().createUser({
            email: email,
            emailVerified: true, // Since they verified via OTP
            displayName: email.split('@')[0] // Use email prefix as display name
          });

          console.log(`✅ [OTP-SERVICE] User created in Firebase with UID: ${userRecord.uid}`);

          // Create user in PostgreSQL using UserMappingService
          const storage = new DatabaseStorage();
          const userMappingService = UserMappingService.getInstance(storage);
          const postgresUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(userRecord.uid, email);

          console.log(`✅ [OTP-SERVICE] User created in PostgreSQL with ID: ${postgresUserId}`);

          return {
            success: true,
            message: 'Cuenta creada exitosamente. ¡Bienvenido!',
            userId: userRecord.uid,
            newUser: true
          };

        } catch (userCreationError: any) {
          console.error('❌ [OTP-SERVICE] Error creating new user:', userCreationError);
          
          // If user already exists in Firebase, that's actually okay
          if (userCreationError.code === 'auth/email-already-exists') {
            console.log(`⚠️ [OTP-SERVICE] User already exists in Firebase: ${email}`);
            return {
              success: true,
              message: 'Verificación exitosa. Sesión iniciada.',
              userId: email
            };
          }
          
          return {
            success: false,
            message: 'Error al crear la cuenta. Intenta de nuevo.'
          };
        }
      }

      return {
        success: true,
        message: 'Código verificado correctamente',
        userId: email // For existing users, return email as identifier
      };

    } catch (error) {
      console.error('❌ [OTP-SERVICE] Error verifying OTP:', error);
      return {
        success: false,
        message: 'Error al verificar el código. Intenta de nuevo.'
      };
    }
  }

  /**
   * Create beautiful OTP email content
   */
  private createOTPEmail(code: string): { html: string; text: string } {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu código de acceso - Owl Fenc</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #0c1419 0%, #1a2332 100%);
            margin: 0;
            padding: 40px 20px;
            color: #e2e8f0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(15, 23, 42, 0.95);
            border-radius: 16px;
            border: 1px solid rgba(34, 197, 245, 0.2);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #22c5f5 0%, #0ea5e9 100%);
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
        }
        .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #f1f5f9;
            margin-bottom: 16px;
        }
        .description {
            font-size: 16px;
            color: #94a3b8;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .otp-container {
            background: rgba(34, 197, 245, 0.1);
            border: 2px solid #22c5f5;
            border-radius: 12px;
            padding: 24px;
            margin: 30px 0;
            backdrop-filter: blur(10px);
        }
        .otp-code {
            font-size: 36px;
            font-weight: 700;
            color: #22c5f5;
            letter-spacing: 8px;
            margin: 0;
            text-shadow: 0 0 20px rgba(34, 197, 245, 0.3);
        }
        .expiry {
            font-size: 14px;
            color: #f59e0b;
            margin-top: 12px;
            font-weight: 500;
        }
        .footer {
            background: rgba(15, 23, 42, 0.8);
            padding: 20px 30px;
            border-top: 1px solid rgba(34, 197, 245, 0.2);
            text-align: center;
        }
        .footer-text {
            font-size: 14px;
            color: #64748b;
            margin: 0;
        }
        .security-note {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
        }
        .security-text {
            font-size: 14px;
            color: #fca5a5;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🦉 Owl Fenc</div>
            <p class="subtitle">Plataforma de Contratistas</p>
        </div>
        
        <div class="content">
            <h1 class="title">Tu Código de Acceso</h1>
            <p class="description">
                Hemos recibido una solicitud de acceso a tu cuenta. 
                Usa el siguiente código para completar tu autenticación:
            </p>
            
            <div class="otp-container">
                <div class="otp-code">${code}</div>
                <div class="expiry">⏰ Expira en 15 minutos</div>
            </div>
            
            <div class="security-note">
                <p class="security-text">
                    🔒 Por tu seguridad, nunca compartas este código. 
                    Si no solicitaste este acceso, ignora este correo.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                © 2025 Owl Fenc. Plataforma profesional para contratistas.
            </p>
        </div>
    </div>
</body>
</html>`;

    const text = `
OWL FENC - Tu Código de Acceso

Código: ${code}

Este código expira en 15 minutos.

Por tu seguridad, nunca compartas este código.
Si no solicitaste este acceso, ignora este correo.

© 2025 Owl Fenc
`;

    return { html, text };
  }

  /**
   * Clean up expired OTP codes
   */
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      if (!db) {
        console.warn('🧹 [OTP-SERVICE] Database not available for cleanup');
        return;
      }

      const result = await db
        .delete(otpCodes)
        .where(
          and(
            eq(otpCodes.verified, false),
            lt(otpCodes.expiresAt, new Date())
          )
        );

      console.log(`🧹 [OTP-SERVICE] Cleaned up expired OTP codes`);
    } catch (error) {
      console.error('❌ [OTP-SERVICE] Error cleaning up expired OTPs:', error);
    }
  }
}

export const otpService = new OTPService();
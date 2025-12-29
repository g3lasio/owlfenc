'''
import { db } from '../db';
import { otps } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { resendService } from './resendService';

const OTP_EXPIRATION_MINUTES = 10;

class OtpService {

  /**
   * Genera un OTP de 6 dígitos y lo guarda en la base de datos.
   * @param email - El email del usuario para asociar el OTP.
   * @returns El OTP generado.
   */
  async generateAndSaveOtp(email: string): Promise<string> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

    await db.insert(otps).values({
      email: email.toLowerCase(),
      otp,
      expiresAt,
      used: false,
    }).onConflictDoUpdate({ target: otps.email, set: { otp, expiresAt, used: false } });

    return otp;
  }

  /**
   * Envía el OTP al email del usuario.
   * @param email - El email del destinatario.
   * @param otp - El OTP a enviar.
   */
  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const subject = `Tu código de verificación para Owl Fenc App es ${otp}`;
    const html = `
      <div style="font-family: sans-serif; text-align: center;">
        <h2>Verificación de Cuenta</h2>
        <p>Usa el siguiente código para verificar tu cuenta en Owl Fenc App:</p>
        <h1 style="font-size: 48px; letter-spacing: 10px;">${otp}</h1>
        <p>Este código expirará en ${OTP_EXPIRATION_MINUTES} minutos.</p>
      </div>
    `;

    await resendService.sendEmail(email, subject, html);
  }

  /**
   * Verifica si el OTP proporcionado es válido para el email dado.
   * @param email - El email del usuario.
   * @param otp - El OTP a verificar.
   * @returns `true` si el OTP es válido, `false` en caso contrario.
   */
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const result = await db.select().from(otps).where(eq(otps.email, email.toLowerCase())).orderBy(desc(otps.createdAt)).limit(1);

    if (result.length === 0) {
      return false; // No OTP found
    }

    const storedOtp = result[0];

    if (storedOtp.used) {
      return false; // OTP already used
    }

    if (new Date() > storedOtp.expiresAt) {
      return false; // OTP expired
    }

    if (storedOtp.otp !== otp) {
      return false; // Invalid OTP
    }

    // Marcar el OTP como usado
    await db.update(otps).set({ used: true }).where(eq(otps.id, storedOtp.id));

    return true;
  }
}

export const otpService = new OtpService();
'''

import axios from 'axios';

interface WelcomeEmailParams {
  name: string;
  companyName?: string;
}

interface PasswordResetEmailParams {
  resetLink: string;
}

/**
 * Envía un correo electrónico de bienvenida al usuario
 * @param to Correo electrónico del destinatario
 * @param name Nombre del destinatario (opcional)
 * @param companyName Nombre de la empresa (opcional)
 * @returns Promise<boolean> Indica si el correo se envió correctamente
 */
export async function sendWelcomeEmail(
  to: string, 
  name: string = '',
  companyName: string = ''
): Promise<boolean> {
  try {
    const response = await axios.post('/api/email/welcome', { 
      to,
      name,
      companyName
    });
    
    return response.data.success;
  } catch (error) {
    console.error('Error al enviar correo de bienvenida:', error);
    return false;
  }
}

/**
 * Envía un correo electrónico de restablecimiento de contraseña
 * @param to Correo electrónico del destinatario
 * @param resetLink Enlace para restablecer la contraseña
 * @returns Promise<boolean> Indica si el correo se envió correctamente
 */
export async function sendPasswordResetNotification(
  to: string,
  resetLink: string
): Promise<boolean> {
  try {
    const response = await axios.post('/api/email/password-reset', {
      to,
      resetLink
    });
    
    return response.data.success;
  } catch (error) {
    console.error('Error al enviar correo de restablecimiento:', error);
    return false;
  }
}
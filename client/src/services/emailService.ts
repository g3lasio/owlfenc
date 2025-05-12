import axios from 'axios';

export async function sendWelcomeEmail(
  email: string,
  name: string = '',
  companyName: string = ''
): Promise<boolean> {
  try {
    const response = await axios.post('/api/email/welcome', {
      email,
      name,
      companyName
    });
    
    return response.data.success === true;
  } catch (error) {
    console.error('Error al enviar correo de bienvenida:', error);
    return false;
  }
}

export async function sendPasswordResetNotification(
  email: string
): Promise<boolean> {
  try {
    const response = await axios.post('/api/email/password-reset-notification', {
      email
    });
    
    return response.data.success === true;
  } catch (error) {
    console.error('Error al enviar notificación de restablecimiento de contraseña:', error);
    return false;
  }
}

export default {
  sendWelcomeEmail,
  sendPasswordResetNotification
};
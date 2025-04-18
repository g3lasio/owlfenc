import { Router, Request, Response } from 'express';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/email';

const router = Router();

// Ruta para solicitar restablecimiento de contraseña
router.post('/password-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'El correo electrónico es requerido' });
    }
    
    // Firebase maneja directamente el envío del correo de restablecimiento,
    // pero aquí podríamos personalizarlo usando nuestro servicio de correo
    // y luego usar la API de Firebase para generar el link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?email=${encodeURIComponent(email)}&action=resetPassword`;
    
    const emailSent = await sendPasswordResetEmail(email, resetLink);
    
    if (emailSent) {
      return res.status(200).json({ message: 'Correo de restablecimiento enviado correctamente' });
    } else {
      return res.status(500).json({ message: 'No se pudo enviar el correo de restablecimiento' });
    }
  } catch (error) {
    console.error('Error al solicitar restablecimiento de contraseña:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para enviar correo de bienvenida
router.post('/welcome-email', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'El correo electrónico es requerido' });
    }
    
    const emailSent = await sendWelcomeEmail(email, name || '');
    
    if (emailSent) {
      return res.status(200).json({ message: 'Correo de bienvenida enviado correctamente' });
    } else {
      return res.status(500).json({ message: 'No se pudo enviar el correo de bienvenida' });
    }
  } catch (error) {
    console.error('Error al enviar correo de bienvenida:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
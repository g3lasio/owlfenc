import { Router } from 'express';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService';

const router = Router();

// Ruta para enviar correo de bienvenida
router.post('/welcome', async (req, res) => {
  try {
    const { email, name = '', companyName = '' } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere dirección de correo electrónico' 
      });
    }
    
    const success = await sendWelcomeEmail(email, name, companyName);
    
    if (success) {
      return res.json({ 
        success: true, 
        message: 'Correo de bienvenida enviado correctamente' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'No se pudo enviar el correo de bienvenida' 
      });
    }
  } catch (error) {
    console.error('Error en ruta de correo de bienvenida:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al procesar la solicitud de correo' 
    });
  }
});

// Ruta para enviar notificación de restablecimiento de contraseña
router.post('/password-reset-notification', async (req, res) => {
  try {
    const { email, resetLink = '' } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere dirección de correo electrónico' 
      });
    }
    
    // Si no se proporciona un enlace de restablecimiento, usamos uno genérico
    const resetUrl = resetLink || `${process.env.APP_URL || 'https://owlfenc.com'}/recuperar-password`;
    
    const success = await sendPasswordResetEmail(email, resetUrl);
    
    if (success) {
      return res.json({ 
        success: true, 
        message: 'Notificación de restablecimiento enviada correctamente' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'No se pudo enviar la notificación de restablecimiento' 
      });
    }
  } catch (error) {
    console.error('Error en ruta de notificación de restablecimiento:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al procesar la solicitud de correo' 
    });
  }
});

export default router;
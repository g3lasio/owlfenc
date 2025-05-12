import { Router, Request, Response } from 'express';
import emailService from '../services/emailService';
import { z } from 'zod';

const router = Router();

// Schema para validar datos de correo de bienvenida
const welcomeEmailSchema = z.object({
  to: z.string().email('Correo electrónico inválido'),
  name: z.string().optional(),
  companyName: z.string().optional()
});

// Schema para validar datos de correo de restablecimiento de contraseña
const passwordResetEmailSchema = z.object({
  to: z.string().email('Correo electrónico inválido'),
  resetLink: z.string().url('URL de restablecimiento inválida')
});

/**
 * @route POST /api/email/welcome
 * @desc Envía un correo electrónico de bienvenida
 */
router.post('/welcome', async (req: Request, res: Response) => {
  try {
    const { to, name, companyName } = welcomeEmailSchema.parse(req.body);

    const success = await emailService.sendWelcomeEmail(to, name, companyName);
    
    if (success) {
      res.json({ success: true, message: 'Correo de bienvenida enviado con éxito' });
    } else {
      res.status(500).json({ success: false, message: 'Error al enviar correo de bienvenida' });
    }
  } catch (error) {
    console.error('Error procesando solicitud de correo de bienvenida:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        message: 'Datos inválidos',
        errors: error.errors 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }
});

/**
 * @route POST /api/email/password-reset
 * @desc Envía un correo electrónico de restablecimiento de contraseña
 */
router.post('/password-reset', async (req: Request, res: Response) => {
  try {
    const { to, resetLink } = passwordResetEmailSchema.parse(req.body);

    const success = await emailService.sendPasswordResetEmail(to, resetLink);
    
    if (success) {
      res.json({ success: true, message: 'Correo de restablecimiento enviado con éxito' });
    } else {
      res.status(500).json({ success: false, message: 'Error al enviar correo de restablecimiento' });
    }
  } catch (error) {
    console.error('Error procesando solicitud de correo de restablecimiento:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        message: 'Datos inválidos',
        errors: error.errors 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }
});

export default router;
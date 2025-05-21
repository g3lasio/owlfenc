import { Router, Request, Response } from 'express';
import { sendEmail, sendContactFormEmail } from '../services/emailService';
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

    // Crear el contenido del email de bienvenida
    const subject = `¡Bienvenido${name ? ' ' + name : ''} a Owl Funding!`;
    const text = `Hola ${name || 'estimado cliente'},\n\nGracias por unirte a ${companyName || 'Owl Funding'}. Estamos emocionados de tenerte con nosotros.\n\nSaludos cordiales,\nEl equipo de Owl Funding`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>¡Bienvenido a Owl Funding!</h2>
        <p>Hola ${name || 'estimado cliente'},</p>
        <p>Gracias por unirte a ${companyName || 'Owl Funding'}. Estamos emocionados de tenerte con nosotros.</p>
        <p>Saludos cordiales,<br>El equipo de Owl Funding</p>
      </div>
    `;
    
    const success = await sendEmail({
      to,
      from: 'no-reply@0wlfunding.com',
      subject,
      text,
      html
    });
    
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

    // Crear el contenido del email de restablecimiento de contraseña
    const subject = `Restablecimiento de contraseña - Owl Funding`;
    const text = `Hola,\n\nRecibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:\n\n${resetLink}\n\nSi no solicitaste restablecer tu contraseña, ignora este mensaje.\n\nSaludos cordiales,\nEl equipo de Owl Funding`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Restablecimiento de contraseña</h2>
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
        <p><a href="${resetLink}" style="display: inline-block; background-color: #2C3E50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Restablecer contraseña</a></p>
        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Si no solicitaste restablecer tu contraseña, ignora este mensaje.</p>
        <p>Saludos cordiales,<br>El equipo de Owl Funding</p>
      </div>
    `;
    
    const success = await sendEmail({
      to,
      from: 'no-reply@0wlfunding.com',
      subject,
      text,
      html
    });
    
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
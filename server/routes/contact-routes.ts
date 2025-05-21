import { Router, Request, Response } from 'express';
import { sendContactFormEmail } from '../services/emailService';
import { z } from 'zod';

const router = Router();

// Schema para validar datos del formulario de contacto
const contactFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  message: z.string().min(1, 'El mensaje es requerido')
});

/**
 * @route POST /api/contact
 * @desc Procesa un formulario de contacto y envía un email a info@0wlfunding.com
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('Recibiendo solicitud de contacto:', req.body);
    
    // Validar datos de entrada
    const { name, email, message } = contactFormSchema.parse(req.body);
    
    console.log(`Formulario de contacto validado de ${name} <${email}>`);
    
    // Enviar email con los datos del formulario
    const success = await sendContactFormEmail(name, email, message);
    
    if (success) {
      console.log('Email de contacto enviado correctamente');
      res.json({ 
        success: true, 
        message: 'Tu mensaje ha sido enviado correctamente' 
      });
    } else {
      console.error('Error al enviar email de contacto');
      res.status(500).json({ 
        success: false, 
        message: 'Error al enviar tu mensaje, por favor intenta más tarde' 
      });
    }
  } catch (error) {
    console.error('Error procesando formulario de contacto:', error);
    
    if (error instanceof z.ZodError) {
      // Error de validación
      res.status(400).json({ 
        success: false, 
        message: 'Datos de contacto inválidos',
        errors: error.errors 
      });
    } else {
      // Error general del servidor
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }
});

export default router;
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { MailService } from '@sendgrid/mail';
import path from 'path';

export function registerRoutes(app: Express): { app: Express; server: Server } {
  const server = createServer(app);

  // Configurar SendGrid si la clave está disponible
  const mailService = new MailService();
  if (process.env.SENDGRID_API_KEY) {
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('SendGrid configurado correctamente');
  } else {
    console.warn('ADVERTENCIA: No se encontró SENDGRID_API_KEY en variables de entorno');
  }

  // Endpoint para procesar formularios de contacto
  app.post('/api/contact', async (req: Request, res: Response) => {
    try {
      const { name, email, message } = req.body;
      
      // Validación básica
      if (!name || !email || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'Faltan campos obligatorios (nombre, email o mensaje)' 
        });
      }
      
      // Validación simple de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false, 
          message: 'El formato del email no es válido' 
        });
      }
      
      console.log(`Procesando formulario de contacto de ${name} <${email}>`);
      
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ 
          success: false, 
          message: 'Error en la configuración del servidor de email' 
        });
      }
      
      // Crear contenido del email
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2C3E50; color: #ffffff; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .footer { margin-top: 20px; font-size: 12px; color: #777; text-align: center; }
    .message { background-color: #fff; padding: 15px; border-left: 4px solid #2C3E50; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Nuevo mensaje de contacto</h2>
    </div>
    <div class="content">
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      
      <h3>Mensaje:</h3>
      <div class="message">
        ${message.replace(/\n/g, '<br>')}
      </div>
      
      <p>Este mensaje fue enviado desde el formulario de contacto del sitio web de Owl Funding.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Owl Funding. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
      `;
      
      const textContent = `
Nuevo mensaje de contacto desde el sitio web:

Nombre: ${name}
Email: ${email}

Mensaje:
${message}

Este mensaje fue enviado desde el formulario de contacto del sitio web de Owl Funding.
      `;
      
      // Configurar el mensaje de email
      const msg = {
        to: 'info@0wlfunding.com',
        from: 'no-reply@0wlfunding.com', // Debe ser un dominio verificado en SendGrid
        subject: `Nuevo contacto de ${name} - Formulario Web`,
        text: textContent,
        html: htmlContent,
        replyTo: email
      };
      
      // Enviar el email
      await mailService.send(msg);
      console.log('Email de contacto enviado correctamente');
      
      res.status(200).json({ 
        success: true, 
        message: 'Tu mensaje ha sido enviado correctamente' 
      });
      
    } catch (error) {
      console.error('Error procesando formulario de contacto:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor al enviar el mensaje' 
      });
    }
  });

  // Ruta catch-all para servir la aplicación React
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });

  return { app, server };
}
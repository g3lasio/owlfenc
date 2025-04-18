import { MailService } from '@sendgrid/mail';

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || '');

type EmailTemplate = 'password-reset' | 'verification' | 'welcome';

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('No se ha configurado la API key de SendGrid');
    }

    const defaultSender = 'info@mervin.app'; // Cambia esto por tu correo verificado en SendGrid
    
    await mailService.send({
      to: params.to,
      from: defaultSender,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    
    return true;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return false;
  }
}

// Función para generar el HTML del correo de verificación
export function generateVerificationEmail(email: string, verificationLink: string): EmailParams {
  const subject = 'Verifica tu cuenta de Mervin';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .button {
          display: inline-block;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verificación de Cuenta</h1>
        </div>
        <div class="content">
          <p>Hola,</p>
          <p>Gracias por registrarte en Mervin. Para verificar tu cuenta, haz clic en el siguiente enlace:</p>
          <p style="text-align: center;">
            <a href="${verificationLink}" class="button">Verificar mi cuenta</a>
          </p>
          <p>Si no solicitaste esta verificación, puedes ignorar este correo.</p>
          <p>Este enlace expirará en 24 horas.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Mervin. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Verificación de Cuenta

    Hola,

    Gracias por registrarte en Mervin. Para verificar tu cuenta, visita el siguiente enlace:
    
    ${verificationLink}
    
    Si no solicitaste esta verificación, puedes ignorar este correo.
    
    Este enlace expirará en 24 horas.
    
    © ${new Date().getFullYear()} Mervin. Todos los derechos reservados.
  `;
  
  return {
    to: email,
    subject,
    html,
    text
  };
}

// Función para generar el HTML del correo de restablecimiento de contraseña
export function generatePasswordResetEmail(email: string, resetLink: string): EmailParams {
  const subject = 'Restablece tu contraseña de Mervin';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .button {
          display: inline-block;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Restablecimiento de Contraseña</h1>
        </div>
        <div class="content">
          <p>Hola,</p>
          <p>Has solicitado restablecer tu contraseña en Mervin. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Restablecer mi contraseña</a>
          </p>
          <p>Si no solicitaste este restablecimiento, puedes ignorar este correo.</p>
          <p>Este enlace expirará en 1 hora por seguridad.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Mervin. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Restablecimiento de Contraseña

    Hola,

    Has solicitado restablecer tu contraseña en Mervin. Visita el siguiente enlace para crear una nueva contraseña:
    
    ${resetLink}
    
    Si no solicitaste este restablecimiento, puedes ignorar este correo.
    
    Este enlace expirará en 1 hora por seguridad.
    
    © ${new Date().getFullYear()} Mervin. Todos los derechos reservados.
  `;
  
  return {
    to: email,
    subject,
    html,
    text
  };
}

// Función para generar el HTML del correo de bienvenida
export function generateWelcomeEmail(email: string, name: string): EmailParams {
  const subject = '¡Bienvenido a Mervin!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .button {
          display: inline-block;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Bienvenido a Mervin!</h1>
        </div>
        <div class="content">
          <p>Hola ${name || ''},</p>
          <p>¡Gracias por unirte a Mervin, el asistente virtual para estimados de cercas!</p>
          <p>Con Mervin, podrás:</p>
          <ul>
            <li>Generar estimados precisos para tus proyectos de cercas</li>
            <li>Crear contratos profesionales con un solo clic</li>
            <li>Gestionar tus clientes y proyectos en un solo lugar</li>
            <li>Verificar la propiedad de terrenos antes de comenzar un proyecto</li>
          </ul>
          <p>Si necesitas ayuda o tienes alguna pregunta, no dudes en contactarnos.</p>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}" class="button">Ir a Mi Cuenta</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Mervin. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    ¡Bienvenido a Mervin!

    Hola ${name || ''},

    ¡Gracias por unirte a Mervin, el asistente virtual para estimados de cercas!

    Con Mervin, podrás:
    - Generar estimados precisos para tus proyectos de cercas
    - Crear contratos profesionales con un solo clic
    - Gestionar tus clientes y proyectos en un solo lugar
    - Verificar la propiedad de terrenos antes de comenzar un proyecto

    Si necesitas ayuda o tienes alguna pregunta, no dudes en contactarnos.

    Ir a Mi Cuenta: ${process.env.FRONTEND_URL || 'http://localhost:5000'}
    
    © ${new Date().getFullYear()} Mervin. Todos los derechos reservados.
  `;
  
  return {
    to: email,
    subject,
    html,
    text
  };
}

// Función para enviar un correo de verificación
export async function sendVerificationEmail(email: string, verificationLink: string): Promise<boolean> {
  const emailParams = generateVerificationEmail(email, verificationLink);
  return sendEmail(emailParams);
}

// Función para enviar un correo de restablecimiento de contraseña
export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
  const emailParams = generatePasswordResetEmail(email, resetLink);
  return sendEmail(emailParams);
}

// Función para enviar un correo de bienvenida
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const emailParams = generateWelcomeEmail(email, name);
  return sendEmail(emailParams);
}
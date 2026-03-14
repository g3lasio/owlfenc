import { resend } from '../lib/resendClient';

type EmailTemplate = 'password-reset' | 'verification' | 'welcome';

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const defaultSender = 'noreply@owlfenc.com';
    const { error } = await resend.emails.send({
      to: params.to,
      from: defaultSender,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    if (error) {
      console.error('❌ [EMAIL] Resend error:', error);
      return false;
    }
    console.log(`✅ [EMAIL] Sent via Resend to: ${params.to}`);
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
  const subject = '¡Bienvenido a Owl Fenc!';
  
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
          <h1>¡Bienvenido a Owl Fenc!</h1>
        </div>
        <div class="content">
          <p>Hola ${name || ''},</p>
          <p>¡Gracias por unirte a <strong>Owl Fenc</strong> — la plataforma de IA para contratistas de construcción!</p>
          <p>Con Owl Fenc, podrás:</p>
          <ul>
            <li>Generar estimados precisos con IA en segundos</li>
            <li>Crear contratos legales profesionales con un solo clic</li>
            <li>Generar invoices y cobrar a tus clientes fácilmente</li>
            <li>Consultar permisos de construcción por estado</li>
          </ul>
          <p>Si necesitas ayuda o tienes alguna pregunta, no dudes en contactarnos.</p>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}" class="button">Ir a Mi Cuenta</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Owl Fenc. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    ¡Bienvenido a Owl Fenc!

    Hola ${name || ''},

    ¡Gracias por unirte a Owl Fenc — la plataforma de IA para contratistas de construcción!

    Con Owl Fenc, podrás:
    - Generar estimados precisos con IA en segundos
    - Crear contratos legales profesionales con un solo clic
    - Generar invoices y cobrar a tus clientes fácilmente
    - Consultar permisos de construcción por estado

    Si necesitas ayuda o tienes alguna pregunta, no dudes en contactarnos.

    Ir a Mi Cuenta: ${process.env.FRONTEND_URL || 'https://owlfenc.replit.app'}
    
    © ${new Date().getFullYear()} Owl Fenc. Todos los derechos reservados.
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
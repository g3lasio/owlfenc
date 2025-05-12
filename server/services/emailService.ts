import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.error("ADVERTENCIA: SENDGRID_API_KEY no está configurada. Los correos de bienvenida no funcionarán.");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || '');

// Tipos de correos y sus plantillas
export const EMAIL_TYPES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  PROJECT_UPDATE: 'project_update',
};

interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

/**
 * Servicio para enviar correos electrónicos usando SendGrid
 */
export const sendEmail = async (params: SendEmailParams): Promise<boolean> => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("No se puede enviar correo: SENDGRID_API_KEY no está configurada");
      return false;
    }

    const fromAddress = params.from || 'owlfenc@example.com';
    
    const emailParams = {
      to: params.to,
      from: fromAddress,
      subject: params.subject,
      text: params.text,
      html: params.html,
      templateId: params.templateId,
      dynamicTemplateData: params.dynamicTemplateData,
    };
    
    await mailService.send(emailParams);
    console.log(`Correo enviado con éxito a: ${params.to}`);
    return true;
  } catch (error) {
    console.error('Error al enviar correo electrónico:', error);
    return false;
  }
};

/**
 * Genera y envía un correo de bienvenida personalizado
 */
export const sendWelcomeEmail = async (
  to: string, 
  name: string = '',
  companyName: string = '',
): Promise<boolean> => {
  const subject = 'Bienvenido a Owl Fenc - Tu asistente inteligente de cercas';
  
  // HTML más atractivo y estructurado para el correo de bienvenida
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bienvenido a Owl Fenc</title>
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
        background: linear-gradient(90deg, rgba(0,176,176,1) 0%, rgba(0,204,204,1) 100%);
        color: white;
        padding: 20px;
        text-align: center;
        border-radius: 5px 5px 0 0;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
      }
      .content {
        background-color: #fff;
        padding: 20px;
        border: 1px solid #e9e9e9;
        border-top: none;
        border-radius: 0 0 5px 5px;
      }
      .feature {
        margin-bottom: 20px;
        display: flex;
        align-items: flex-start;
      }
      .feature-icon {
        width: 30px;
        margin-right: 10px;
        color: #00b0b0;
        font-size: 24px;
        text-align: center;
      }
      .feature-text {
        flex: 1;
      }
      .cta-button {
        background-color: #00b0b0;
        color: white;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 4px;
        font-weight: bold;
        display: inline-block;
        margin: 20px 0;
      }
      .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 12px;
        color: #999;
      }
      .divider {
        border-top: 1px solid #eee;
        margin: 20px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>¡Bienvenido a Owl Fenc!</h1>
      </div>
      <div class="content">
        <p>Hola ${name || 'estimado usuario'},</p>
        
        <p>Estamos emocionados de tenerte en nuestra plataforma. Owl Fenc y su asistente Mervin AI están aquí para transformar tu experiencia en proyectos de cercas.</p>
        
        <div class="divider"></div>
        
        <h2>Funciones principales que te encantarán:</h2>
        
        <div class="feature">
          <div class="feature-icon">🔍</div>
          <div class="feature-text">
            <strong>Verificación Inteligente de Propiedades</strong>
            <p>Verifica permisos y detalles de propiedad en minutos, no en días.</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">📝</div>
          <div class="feature-text">
            <strong>Contratos Generados por IA</strong>
            <p>Crea contratos personalizados con nuestra tecnología avanzada de IA.</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🤖</div>
          <div class="feature-text">
            <strong>Mervin AI - Tu Asistente Virtual</strong>
            <p>Consulta con Mervin para obtener consejos expertos, estimaciones de materiales y más.</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">📱</div>
          <div class="feature-text">
            <strong>Estimaciones en 3D</strong>
            <p>Visualiza tus proyectos en 3D y obtén estimaciones precisas de costos.</p>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <p>¿Listo para comenzar? Explora el potencial de Mervin AI y toma el control de tus proyectos de cercas:</p>
        
        <center>
          <a href="https://owlfenc.com/tutorial" class="cta-button">COMENZAR AHORA</a>
        </center>
        
        <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en responder a este correo o contactar a nuestro equipo de soporte.</p>
        
        <p>Saludos,<br>El equipo de Owl Fenc</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Owl Fenc. Todos los derechos reservados.</p>
        <p>Este correo fue enviado a ${to} porque creaste una cuenta en nuestra plataforma.</p>
      </div>
    </div>
  </body>
  </html>
  `;
  
  // Versión de texto plano para clientes de correo que no soportan HTML
  const text = `
¡Bienvenido a Owl Fenc!

Hola ${name || 'estimado usuario'},

Estamos emocionados de tenerte en nuestra plataforma. Owl Fenc y su asistente Mervin AI están aquí para transformar tu experiencia en proyectos de cercas.

FUNCIONES PRINCIPALES:

- Verificación Inteligente de Propiedades: Verifica permisos y detalles de propiedad en minutos, no en días.
- Contratos Generados por IA: Crea contratos personalizados con nuestra tecnología avanzada de IA.
- Mervin AI - Tu Asistente Virtual: Consulta con Mervin para obtener consejos expertos, estimaciones de materiales y más.
- Estimaciones en 3D: Visualiza tus proyectos en 3D y obtén estimaciones precisas de costos.

¿Listo para comenzar? Visita: https://owlfenc.com/tutorial

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.

Saludos,
El equipo de Owl Fenc

© ${new Date().getFullYear()} Owl Fenc. Todos los derechos reservados.
Este correo fue enviado a ${to} porque creaste una cuenta en nuestra plataforma.
  `;
  
  return sendEmail({
    to,
    subject,
    html,
    text,
  });
};

/**
 * Envia un correo de restablecimiento de contraseña
 */
export const sendPasswordResetEmail = async (
  to: string,
  resetLink: string
): Promise<boolean> => {
  const subject = 'Restablecimiento de contraseña - Owl Fenc';
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Restablecimiento de contraseña</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .button { background-color: #00b0b0; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Restablecimiento de contraseña</h1>
      <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
      <p><a href="${resetLink}" class="button">Restablecer mi contraseña</a></p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña seguirá siendo la misma.</p>
      <p>Este enlace expirará en 1 hora por razones de seguridad.</p>
      <p>Saludos,<br>El equipo de Owl Fenc</p>
    </div>
  </body>
  </html>
  `;
  
  const text = `
Restablecimiento de contraseña - Owl Fenc

Has solicitado restablecer tu contraseña. Utiliza el siguiente enlace para crear una nueva contraseña:

${resetLink}

Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña seguirá siendo la misma.

Este enlace expirará en 1 hora por razones de seguridad.

Saludos,
El equipo de Owl Fenc
  `;
  
  return sendEmail({
    to,
    subject,
    html,
    text,
  });
};

/**
 * Envía un correo electrónico con una estimación
 */
export const sendEstimateByEmail = async (
  estimate: any,
  templateId: string | null,
  email: string,
  subject: string,
  message: string
): Promise<boolean> => {
  try {
    // Crear versión HTML de la estimación
    const estimateHTML = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Estimación para su proyecto de cerca</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
        <p><strong>Detalles del proyecto:</strong></p>
        <ul>
          <li>Longitud: ${estimate.linearFeet || 'N/A'} pies lineales</li>
          <li>Altura: ${estimate.height || 'N/A'} pies</li>
          <li>Tipo: ${estimate.fenceType || 'Cerca estándar'}</li>
          <li>Estado: ${estimate.state || 'N/A'}</li>
        </ul>
        
        <p><strong>Costo estimado:</strong></p>
        <ul>
          <li>Materiales: $${estimate.totalMaterialsCost || estimate.materialsSubtotal || 'N/A'}</li>
          <li>Mano de obra: $${estimate.laborCost || 'N/A'}</li>
          <li>Costo total: $${estimate.finalTotalCost || estimate.baseTotalCost || 'N/A'}</li>
          <li>Costo por pie lineal: $${estimate.costPerLinearFoot || 'N/A'}</li>
        </ul>
        
        <p><em>Esta estimación es preliminar y puede variar según las condiciones específicas del sitio y otros factores.</em></p>
      </div>
      
      <div style="margin-top: 20px;">
        <p>${message || 'Gracias por su interés en nuestros servicios. Si tiene alguna pregunta sobre esta estimación, no dude en contactarnos.'}</p>
      </div>
    </div>
    `;
    
    // Versión de texto plano
    const estimateText = `
ESTIMACIÓN PARA SU PROYECTO DE CERCA

DETALLES DEL PROYECTO:
- Longitud: ${estimate.linearFeet || 'N/A'} pies lineales
- Altura: ${estimate.height || 'N/A'} pies
- Tipo: ${estimate.fenceType || 'Cerca estándar'} 
- Estado: ${estimate.state || 'N/A'}

COSTO ESTIMADO:
- Materiales: $${estimate.totalMaterialsCost || estimate.materialsSubtotal || 'N/A'}
- Mano de obra: $${estimate.laborCost || 'N/A'}
- Costo total: $${estimate.finalTotalCost || estimate.baseTotalCost || 'N/A'}
- Costo por pie lineal: $${estimate.costPerLinearFoot || 'N/A'}

Esta estimación es preliminar y puede variar según las condiciones específicas del sitio y otros factores.

${message || 'Gracias por su interés en nuestros servicios. Si tiene alguna pregunta sobre esta estimación, no dude en contactarnos.'}
    `;
    
    // Enviar el correo
    return sendEmail({
      to: email,
      subject: subject || 'Su estimación de cerca',
      html: estimateHTML,
      text: estimateText,
      templateId: templateId || undefined
    });
  } catch (error) {
    console.error('Error al enviar estimación por correo:', error);
    return false;
  }
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEstimateByEmail
};
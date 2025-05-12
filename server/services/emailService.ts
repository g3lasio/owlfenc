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
    
    // Crear estructura requerida por SendGrid
    const emailParams: any = {
      to: params.to,
      from: fromAddress,
      subject: params.subject,
    };
    
    // Agregar contenido según lo que esté disponible
    const content: any[] = [];
    
    if (params.text) {
      content.push({
        type: 'text/plain',
        value: params.text
      });
    }
    
    if (params.html) {
      content.push({
        type: 'text/html',
        value: params.html
      });
    }
    
    // Si hay contenido, añadirlo
    if (content.length > 0) {
      emailParams.content = content;
    }
    
    // Si hay un template ID, usarlo
    if (params.templateId) {
      emailParams.templateId = params.templateId;
      
      // Si hay datos dinámicos para el template
      if (params.dynamicTemplateData) {
        emailParams.dynamicTemplateData = params.dynamicTemplateData;
      }
    }
    
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
  const subject = 'Bienvenido a Owl Fence - Tu asistente inteligente de cercas';
  
  // HTML más atractivo y estructurado para el correo de bienvenida
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bienvenido a Owl Fence</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #02b3b3 0%, #00d4d4 100%);
        color: white;
        padding: 25px 20px;
        text-align: center;
        border-radius: 8px 8px 0 0;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }
      .content {
        background-color: #fff;
        padding: 30px;
        border-radius: 0 0 8px 8px;
      }
      .highlight {
        background-color: #e6fff9;
        border-left: 4px solid #00cccc;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .features {
        margin: 25px 0;
      }
      .feature {
        margin-bottom: 20px;
        display: flex;
        align-items: flex-start;
        padding-bottom: 15px;
        border-bottom: 1px solid #f0f0f0;
      }
      .feature-icon {
        width: 30px;
        margin-right: 15px;
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
        <h1>¡Bienvenido a Owl Fence!</h1>
      </div>
      <div class="content">
        <p>Estimado <strong>${name || 'usuario'}</strong>,</p>
        
        <p>¡Estamos emocionados de darle la bienvenida a Owl Fence! Su cuenta ha sido creada con éxito y ahora tiene acceso a nuestra plataforma integral para la gestión de proyectos de cercas y verificación de propiedades.</p>
        
        <div class="highlight">
          <p>Como nuevo miembro, tiene acceso a Mervin, nuestro asistente de IA especializado que le ayudará con sus proyectos, verificación de permisos y generación de contratos.</p>
        </div>
        
        <div class="features">
          <h2>Lo que puede hacer con Owl Fence:</h2>
          
          <div class="feature">
            <div class="feature-icon">🔍</div>
            <div class="feature-text">
              <strong>Verificación de Propiedades</strong>
              <p>Acceda a historiales de propiedad, información catastral y verifique permisos existentes de forma instantánea.</p>
            </div>
          </div>
        
          <div class="feature">
            <div class="feature-icon">📝</div>
            <div class="feature-text">
              <strong>Contratos Generados por IA</strong>
              <p>Cree contratos personalizados con un solo clic, adaptados a sus necesidades específicas.</p>
            </div>
          </div>
          
          <div class="feature">
            <div class="feature-icon">💼</div>
            <div class="feature-text">
              <strong>Gestión de Proyectos</strong>
              <p>Organice todos sus proyectos, presupuestos y clientes en un solo lugar.</p>
            </div>
          </div>
          
          <div class="feature">
            <div class="feature-icon">🤖</div>
            <div class="feature-text">
              <strong>Asistente IA Mervin</strong>
              <p>Reciba asistencia en tiempo real con nuestro asistente IA especializado en la industria de cercas.</p>
            </div>
          </div>
        </div>
        
        <p>Si tiene alguna pregunta o necesita asistencia, nuestro equipo de soporte está aquí para ayudarle.</p>
          
        <p>¡Gracias por elegir Owl Fence para ${companyName ? companyName : 'su empresa'}!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://owlfence.replit.app" class="cta-button" style="padding: 15px 30px; font-size: 16px; background-color: #02b3b3; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">COMENZAR AHORA</a>
        </div>
        
        <p style="text-align: center; color: #666;">Si tiene alguna pregunta o necesita ayuda, no dude en responder a este correo o contactar a nuestro equipo de soporte.</p>
        
        <div style="margin-top: 30px; text-align: center;">
          <p>Saludos,<br><strong>El equipo de Owl Fence</strong></p>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Owl Fence. Todos los derechos reservados.</p>
        <p>Este correo fue enviado a ${to} porque creó una cuenta en nuestra plataforma.</p>
      </div>
    </div>
  </body>
  </html>
  `;
  
  // Versión de texto plano para clientes de correo que no soportan HTML
  const text = `
¡BIENVENIDO A OWL FENCE!

Estimado ${name || 'usuario'},

¡Estamos emocionados de darle la bienvenida a Owl Fence! Su cuenta ha sido creada con éxito y ahora tiene acceso a nuestra plataforma integral para la gestión de proyectos de cercas y verificación de propiedades.

Como nuevo miembro, tiene acceso a Mervin, nuestro asistente de IA especializado que le ayudará con sus proyectos, verificación de permisos y generación de contratos.

LO QUE PUEDE HACER CON OWL FENCE:

- Verificación de Propiedades: Acceda a historiales de propiedad, información catastral y verifique permisos existentes de forma instantánea.
- Contratos Generados por IA: Cree contratos personalizados con un solo clic, adaptados a sus necesidades específicas.
- Gestión de Proyectos: Organice todos sus proyectos, presupuestos y clientes en un solo lugar.
- Asistente IA Mervin: Reciba asistencia en tiempo real con nuestro asistente IA especializado en la industria de cercas.

¡Gracias por elegir Owl Fence para ${companyName ? companyName : 'su empresa'}!

COMIENCE AHORA: https://owlfence.replit.app

Si tiene alguna pregunta o necesita ayuda, no dude en responder a este correo o contactar a nuestro equipo de soporte.

Saludos,
El equipo de Owl Fence

© ${new Date().getFullYear()} Owl Fence. Todos los derechos reservados.
Este correo fue enviado a ${to} porque creó una cuenta en nuestra plataforma.
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
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

    const fromAddress = params.from || 'soporte@owlfenc.com';
    
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
  const subject = 'Bienvenido a Owl Fenc - Tu asistente inteligente para proyectos de cercas';
  
  // HTML futurista con diseño inspirado en Stark Industries/Iron Man para el correo de bienvenida
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bienvenido a Owl Fenc</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&family=Rubik:wght@300;400;500;700&display=swap');
      
      body {
        font-family: 'Rubik', 'Segoe UI', Tahoma, sans-serif;
        line-height: 1.6;
        color: #e0e0e0;
        background-color: #121212;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 620px;
        margin: 0 auto;
        padding: 0;
        background-color: #0d1117;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0, 255, 255, 0.15);
        border: 1px solid rgba(0, 255, 255, 0.15);
      }
      .header {
        background: linear-gradient(135deg, rgba(0, 24, 38, 0.9) 0%, rgba(0, 37, 58, 0.9) 100%);
        color: white;
        padding: 32px 20px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .header:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.1), transparent);
        animation: scanner 3s infinite linear;
        z-index: 1;
      }
      @keyframes scanner {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .logo {
        position: relative;
        z-index: 2;
        margin-bottom: 15px;
      }
      .logo img {
        height: 60px;
        width: auto;
      }
      .header h1 {
        margin: 0;
        font-family: 'Quantico', sans-serif;
        font-size: 28px;
        letter-spacing: 1px;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
        position: relative;
        z-index: 2;
        color: #00f0ff;
      }
      .content {
        background-color: #171a21;
        padding: 35px;
        border-radius: 0 0 8px 8px;
        position: relative;
      }
      .highlight {
        background-color: rgba(0, 255, 255, 0.05);
        border-left: 3px solid #00cccc;
        padding: 20px;
        margin: 25px 0;
        border-radius: 4px;
        box-shadow: 0 4px 15px rgba(0, 255, 255, 0.1) inset;
      }
      .highlight p {
        margin: 0;
        color: #00f0ff;
      }
      .features {
        margin: 30px 0;
      }
      .features h2 {
        color: #00f0ff;
        font-family: 'Quantico', sans-serif;
        margin-bottom: 25px;
        position: relative;
        display: inline-block;
      }
      .features h2:after {
        content: '';
        position: absolute;
        left: 0;
        bottom: -8px;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, #00f0ff, transparent);
      }
      .feature {
        margin-bottom: 25px;
        display: flex;
        align-items: flex-start;
        padding: 15px;
        border-radius: 8px;
        background-color: rgba(0, 255, 255, 0.03);
        transition: all 0.3s ease;
        border: 1px solid rgba(0, 255, 255, 0.08);
      }
      .feature:hover {
        background-color: rgba(0, 255, 255, 0.05);
        transform: translateY(-2px);
      }
      .feature-icon {
        width: 50px;
        height: 50px;
        margin-right: 20px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(0, 210, 255, 0.1), rgba(0, 240, 255, 0.3));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
      }
      .feature-text {
        flex: 1;
      }
      .feature-text strong {
        color: #00f0ff;
        font-family: 'Quantico', sans-serif;
        font-size: 18px;
        display: block;
        margin-bottom: 5px;
      }
      .cta-button {
        background: linear-gradient(135deg, #007a8a 0%, #00b0c7 100%);
        color: white;
        text-decoration: none;
        padding: 15px 30px;
        border-radius: 6px;
        font-weight: bold;
        display: inline-block;
        margin: 25px 0;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        font-family: 'Quantico', sans-serif;
        letter-spacing: 0.5px;
        border: 1px solid rgba(0, 255, 255, 0.3);
      }
      .cta-button:before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: all 0.6s ease;
      }
      .cta-button:hover:before {
        left: 100%;
      }
      .cta-button:hover {
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
        transform: translateY(-2px);
      }
      .footer {
        text-align: center;
        margin-top: 30px;
        font-size: 12px;
        color: #858585;
        padding-top: 20px;
        border-top: 1px solid rgba(0, 255, 255, 0.1);
      }
      .holographic-line {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.5), transparent);
        margin: 30px 0;
      }
      .signature {
        font-family: 'Quantico', sans-serif;
        color: #00f0ff;
      }
      .tech-background {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOHYxMmgxMlYxOEgzNnptMTIgMTJ2MTJoMTJWMzBoLTEyek0zNiA0MnYxMmgxMlY0MkgzNnptLTEyIDB2MTJoMTJWNDJIMjR6bTAtMTJ2MTJoMTJWMzBIMjR6bS0xMiAwdjEyaDEyVjMwSDEyem0wIDB2LTEyaDEyVjMwSDEyem0xMi0xMlY2aDEydjEySDI0eiIgc3Ryb2tlPSIjMDBmMGZmIiBzdHJva2Utd2lkdGg9Ii41IiBvcGFjaXR5PSIuMSIvPjwvZz48L3N2Zz4=');
        opacity: 0.03;
        z-index: 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">
          <!-- Logo o imagen de Owl Fenc -->
        </div>
        <h1>BIENVENIDO A OWL FENC</h1>
      </div>
      <div class="content">
        <div class="tech-background"></div>
        <p>Estimado <strong style="color: #00f0ff;">${name || 'usuario'}</strong>,</p>
        
        <p>¡Bienvenido al futuro de la gestión de proyectos de cercas! Su cuenta ha sido creada con éxito y ahora tiene acceso a nuestra plataforma de vanguardia para la verificación de propiedades y gestión de proyectos.</p>
        
        <div class="highlight">
          <p>Como nuevo miembro, tiene acceso completo a <strong>Mervin</strong>, nuestro asistente de IA especializado que revolucionará la forma en que gestiona sus proyectos, verifica permisos y genera contratos profesionales.</p>
        </div>
        
        <div class="features">
          <h2>CAPACIDADES DEL SISTEMA</h2>
          
          <div class="feature">
            <div class="feature-icon">🔍</div>
            <div class="feature-text">
              <strong>VERIFICACIÓN INTELIGENTE</strong>
              <p>Acceda instantáneamente a historiales de propiedad, información catastral y verificación de permisos con precisión milimétrica.</p>
            </div>
          </div>
        
          <div class="feature">
            <div class="feature-icon">📝</div>
            <div class="feature-text">
              <strong>DOCUMENTOS AUTOGENERADOS</strong>
              <p>Cree contratos legalmente sólidos y personalizados con tecnología de IA avanzada adaptada a cada proyecto.</p>
            </div>
          </div>
          
          <div class="feature">
            <div class="feature-icon">💼</div>
            <div class="feature-text">
              <strong>CONTROL DE OPERACIONES</strong>
              <p>Gestione todos sus proyectos, presupuestos y clientes desde una interfaz unificada con análisis en tiempo real.</p>
            </div>
          </div>
          
          <div class="feature">
            <div class="feature-icon">🤖</div>
            <div class="feature-text">
              <strong>ASISTENCIA IA AVANZADA</strong>
              <p>Mervin analiza su historial de proyectos para ofrecer recomendaciones personalizadas y optimizar resultados.</p>
            </div>
          </div>
        </div>
        
        <div class="holographic-line"></div>
        
        <p>Nuestro equipo técnico está disponible para asistirle durante su integración con el sistema. Todas las consultas son procesadas con prioridad para garantizar la máxima eficiencia.</p>
          
        <p>¡Gracias por incorporar la tecnología de Owl Fenc a ${companyName ? companyName : 'su operación empresarial'}!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://owlfenc.replit.app" class="cta-button">INICIAR SESIÓN</a>
        </div>
        
        <p style="text-align: center; color: #8e9fae;">Para asistencia técnica, responda a este correo o contacte a soporte@owlfenc.com</p>
        
        <div style="margin-top: 30px; text-align: center;">
          <p>Saludos,<br><strong class="signature">El equipo de Owl Fenc</strong></p>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Owl Fenc | Tecnología avanzada para profesionales de cercas</p>
        <p>Este correo fue enviado a ${to} porque se registró en nuestra plataforma.</p>
      </div>
    </div>
  </body>
  </html>
  `;
  
  // Versión de texto plano para clientes de correo que no soportan HTML
  const text = `
BIENVENIDO A OWL FENC - TECNOLOGÍA AVANZADA PARA PROFESIONALES DE CERCAS

Estimado ${name || 'usuario'},

¡Bienvenido al futuro de la gestión de proyectos de cercas! Su cuenta ha sido creada con éxito y ahora tiene acceso a nuestra plataforma de vanguardia para la verificación de propiedades y gestión de proyectos.

Como nuevo miembro, tiene acceso completo a Mervin, nuestro asistente de IA especializado que revolucionará la forma en que gestiona sus proyectos, verifica permisos y genera contratos profesionales.

CAPACIDADES DEL SISTEMA:

- VERIFICACIÓN INTELIGENTE: Acceda instantáneamente a historiales de propiedad, información catastral y verificación de permisos con precisión milimétrica.

- DOCUMENTOS AUTOGENERADOS: Cree contratos legalmente sólidos y personalizados con tecnología de IA avanzada adaptada a cada proyecto.

- CONTROL DE OPERACIONES: Gestione todos sus proyectos, presupuestos y clientes desde una interfaz unificada con análisis en tiempo real.

- ASISTENCIA IA AVANZADA: Mervin analiza su historial de proyectos para ofrecer recomendaciones personalizadas y optimizar resultados.

Nuestro equipo técnico está disponible para asistirle durante su integración con el sistema. Todas las consultas son procesadas con prioridad para garantizar la máxima eficiencia.

¡Gracias por incorporar la tecnología de Owl Fenc a ${companyName ? companyName : 'su operación empresarial'}!

INICIAR SESIÓN: https://owlfenc.replit.app

Para asistencia técnica, responda a este correo o contacte a soporte@owlfenc.com

Saludos,
El equipo de Owl Fenc

© ${new Date().getFullYear()} Owl Fenc | Tecnología avanzada para profesionales de cercas
Este correo fue enviado a ${to} porque se registró en nuestra plataforma.
  `;
  
  return sendEmail({
    to,
    subject,
    html,
    text,
  });
};

/**
 * Envia un correo de restablecimiento de contraseña con diseño futurista
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
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Restablecimiento de contraseña - Owl Fenc</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&family=Rubik:wght@300;400;500;700&display=swap');
      
      body {
        font-family: 'Rubik', 'Segoe UI', Tahoma, sans-serif;
        line-height: 1.6;
        color: #e0e0e0;
        background-color: #121212;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 0;
        background-color: #0d1117;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0, 255, 255, 0.15);
        border: 1px solid rgba(0, 255, 255, 0.15);
      }
      .header {
        background: linear-gradient(135deg, rgba(0, 24, 38, 0.9) 0%, rgba(0, 37, 58, 0.9) 100%);
        color: white;
        padding: 25px 20px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .header:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.1), transparent);
        animation: scanner 3s infinite linear;
        z-index: 1;
      }
      @keyframes scanner {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .header h1 {
        margin: 0;
        font-family: 'Quantico', sans-serif;
        font-size: 24px;
        letter-spacing: 1px;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
        position: relative;
        z-index: 2;
        color: #00f0ff;
      }
      .content {
        background-color: #171a21;
        padding: 30px;
        border-radius: 0 0 8px 8px;
        position: relative;
      }
      .security-icon {
        text-align: center;
        margin: 10px 0 25px;
        font-size: 48px;
      }
      .reset-button {
        background: linear-gradient(135deg, #007a8a 0%, #00b0c7 100%);
        color: white;
        text-decoration: none;
        padding: 15px 30px;
        border-radius: 6px;
        font-weight: bold;
        display: inline-block;
        margin: 20px 0;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        font-family: 'Quantico', sans-serif;
        letter-spacing: 0.5px;
        border: 1px solid rgba(0, 255, 255, 0.3);
      }
      .reset-button:hover {
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
        transform: translateY(-2px);
      }
      .reset-button:before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: all 0.6s ease;
      }
      .reset-button:hover:before {
        left: 100%;
      }
      .footer {
        text-align: center;
        margin-top: 25px;
        font-size: 12px;
        color: #858585;
        padding-top: 20px;
        border-top: 1px solid rgba(0, 255, 255, 0.1);
      }
      .warning {
        background-color: rgba(255, 193, 7, 0.1);
        border-left: 3px solid rgba(255, 193, 7, 0.5);
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .warning p {
        margin: 0;
        color: #ffc107;
      }
      .signature {
        font-family: 'Quantico', sans-serif;
        color: #00f0ff;
      }
      .expiry-counter {
        background-color: rgba(0, 255, 255, 0.05);
        border-radius: 4px;
        padding: 10px;
        margin: 20px 0;
        text-align: center;
        border: 1px solid rgba(0, 255, 255, 0.1);
      }
      .expiry-counter span {
        font-family: 'Quantico', sans-serif;
        color: #00f0ff;
        font-size: 18px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>RESTABLECIMIENTO DE SEGURIDAD</h1>
      </div>
      <div class="content">
        <div class="security-icon">🔐</div>
        
        <p>Se ha recibido una solicitud para restablecer la contraseña asociada a su cuenta de Owl Fenc.</p>
        
        <p>Para proceder con el restablecimiento de su contraseña, haga clic en el siguiente enlace:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" class="reset-button">VERIFICAR IDENTIDAD</a>
        </div>
        
        <div class="expiry-counter">
          <p>Este enlace expirará en <span>60 minutos</span> por motivos de seguridad.</p>
        </div>
        
        <div class="warning">
          <p>Si usted no solicitó este restablecimiento, puede ignorar este mensaje. Su contraseña actual permanecerá sin cambios.</p>
        </div>
        
        <p>Si tiene alguna pregunta o necesita asistencia, por favor contacte a nuestro soporte técnico.</p>
        
        <div style="margin-top: 25px; text-align: center;">
          <p>Atentamente,<br><strong class="signature">Equipo de Seguridad - Owl Fenc</strong></p>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Owl Fenc | Tecnología avanzada para profesionales de cercas</p>
        <p>Este correo fue enviado a ${to} en respuesta a una solicitud de restablecimiento de contraseña.</p>
      </div>
    </div>
  </body>
  </html>
  `;
  
  const text = `
RESTABLECIMIENTO DE SEGURIDAD - OWL FENC

Se ha recibido una solicitud para restablecer la contraseña asociada a su cuenta de Owl Fenc.

Para proceder con el restablecimiento de su contraseña, utilice el siguiente enlace:

${resetLink}

IMPORTANTE: Este enlace expirará en 60 minutos por motivos de seguridad.

Si usted no solicitó este restablecimiento, puede ignorar este mensaje. Su contraseña actual permanecerá sin cambios.

Si tiene alguna pregunta o necesita asistencia, por favor contacte a nuestro soporte técnico.

Atentamente,
Equipo de Seguridad - Owl Fenc

© ${new Date().getFullYear()} Owl Fenc | Tecnología avanzada para profesionales de cercas
Este correo fue enviado a ${to} en respuesta a una solicitud de restablecimiento de contraseña.
  `;
  
  return sendEmail({
    to,
    subject,
    html,
    text,
  });
};

/**
 * Envía un correo electrónico con una estimación usando el estilo futurista de Owl Fenc
 */
export const sendEstimateByEmail = async (
  estimate: any,
  templateId: string | null,
  email: string,
  subject: string,
  message: string
): Promise<boolean> => {
  try {
    // Crear versión HTML de la estimación con el nuevo estilo futurista
    const estimateHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Estimación de Proyecto - Owl Fenc</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&family=Rubik:wght@300;400;500;700&display=swap');
        
        body {
          font-family: 'Rubik', 'Segoe UI', Tahoma, sans-serif;
          line-height: 1.6;
          color: #e0e0e0;
          background-color: #121212;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 0;
          background-color: #0d1117;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 255, 255, 0.15);
          border: 1px solid rgba(0, 255, 255, 0.15);
        }
        .header {
          background: linear-gradient(135deg, rgba(0, 24, 38, 0.9) 0%, rgba(0, 37, 58, 0.9) 100%);
          color: white;
          padding: 25px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .header h1 {
          margin: 0;
          font-family: 'Quantico', sans-serif;
          font-size: 24px;
          letter-spacing: 1px;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
          position: relative;
          z-index: 2;
          color: #00f0ff;
        }
        .content {
          background-color: #171a21;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          position: relative;
        }
        .section-title {
          color: #00f0ff;
          font-family: 'Quantico', sans-serif;
          margin-bottom: 20px;
          position: relative;
          display: inline-block;
          font-size: 18px;
        }
        .section-title:after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -8px;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, #00f0ff, transparent);
        }
        .data-panel {
          background-color: rgba(0, 255, 255, 0.03);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          border: 1px solid rgba(0, 255, 255, 0.1);
        }
        .data-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0, 255, 255, 0.05);
        }
        .data-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .data-label {
          color: #939eab;
          font-size: 14px;
        }
        .data-value {
          color: #ffffff;
          font-family: 'Quantico', sans-serif;
          text-align: right;
        }
        .cost-panel {
          background-color: rgba(0, 255, 255, 0.05);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          border: 1px solid rgba(0, 255, 255, 0.1);
        }
        .total-cost {
          font-family: 'Quantico', sans-serif;
          color: #00f0ff;
          font-size: 24px;
          text-align: center;
          margin: 15px 0;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }
        .footer {
          text-align: center;
          margin-top: 25px;
          font-size: 12px;
          color: #858585;
          padding-top: 20px;
          border-top: 1px solid rgba(0, 255, 255, 0.1);
        }
        .disclaimer {
          font-size: 12px;
          color: #939eab;
          font-style: italic;
          background-color: rgba(255, 255, 255, 0.03);
          padding: 10px;
          border-radius: 4px;
          margin-top: 20px;
        }
        .contact-button {
          background: linear-gradient(135deg, #007a8a 0%, #00b0c7 100%);
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: bold;
          display: inline-block;
          margin: 20px 0;
          font-family: 'Quantico', sans-serif;
          letter-spacing: 0.5px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ESTIMACIÓN DE PROYECTO</h1>
        </div>
        <div class="content">
          <p>Hemos completado la estimación para su proyecto de cerca utilizando nuestro sistema de cálculo avanzado.</p>
          
          <h2 class="section-title">ESPECIFICACIONES TÉCNICAS</h2>
          <div class="data-panel">
            <div class="data-row">
              <div class="data-label">Longitud</div>
              <div class="data-value">${estimate.linearFeet || 'N/A'} pies lineales</div>
            </div>
            <div class="data-row">
              <div class="data-label">Altura</div>
              <div class="data-value">${estimate.height || 'N/A'} pies</div>
            </div>
            <div class="data-row">
              <div class="data-label">Tipo de cerca</div>
              <div class="data-value">${estimate.fenceType || 'Cerca estándar'}</div>
            </div>
            <div class="data-row">
              <div class="data-label">Ubicación</div>
              <div class="data-value">${estimate.state || 'N/A'}</div>
            </div>
          </div>
          
          <h2 class="section-title">ANÁLISIS DE COSTOS</h2>
          <div class="cost-panel">
            <div class="data-row">
              <div class="data-label">Materiales</div>
              <div class="data-value">$${estimate.totalMaterialsCost || estimate.materialsSubtotal || 'N/A'}</div>
            </div>
            <div class="data-row">
              <div class="data-label">Mano de obra</div>
              <div class="data-value">$${estimate.laborCost || 'N/A'}</div>
            </div>
            <div class="data-row">
              <div class="data-label">Costo por pie lineal</div>
              <div class="data-value">$${estimate.costPerLinearFoot || 'N/A'}</div>
            </div>
          </div>
          
          <div class="total-cost">
            COSTO TOTAL: $${estimate.finalTotalCost || estimate.baseTotalCost || 'N/A'}
          </div>
          
          <div class="message-panel">
            <p>${message || 'Gracias por su interés en nuestros servicios. Nuestro equipo está a disposición para responder cualquier consulta sobre esta estimación.'}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="https://owlfenc.replit.app" class="contact-button">ACCEDER A MI CUENTA</a>
          </div>
          
          <div class="disclaimer">
            Esta estimación fue generada por el sistema Owl Fenc y es preliminar. Los costos finales pueden variar según las condiciones específicas del sitio, disponibilidad de materiales y otros factores identificados durante la inspección.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Owl Fenc | Tecnología avanzada para profesionales de cercas</p>
          <p>Este correo fue enviado a ${email} en respuesta a una solicitud de estimación.</p>
        </div>
      </div>
    </body>
    </html>
    `;
    
    // Versión de texto plano con el nombre correcto
    const estimateText = `
ESTIMACIÓN DE PROYECTO - OWL FENC

Hemos completado la estimación para su proyecto de cerca utilizando nuestro sistema de cálculo avanzado.

ESPECIFICACIONES TÉCNICAS:
- Longitud: ${estimate.linearFeet || 'N/A'} pies lineales
- Altura: ${estimate.height || 'N/A'} pies
- Tipo de cerca: ${estimate.fenceType || 'Cerca estándar'} 
- Ubicación: ${estimate.state || 'N/A'}

ANÁLISIS DE COSTOS:
- Materiales: $${estimate.totalMaterialsCost || estimate.materialsSubtotal || 'N/A'}
- Mano de obra: $${estimate.laborCost || 'N/A'}
- Costo por pie lineal: $${estimate.costPerLinearFoot || 'N/A'}

COSTO TOTAL: $${estimate.finalTotalCost || estimate.baseTotalCost || 'N/A'}

${message || 'Gracias por su interés en nuestros servicios. Nuestro equipo está a disposición para responder cualquier consulta sobre esta estimación.'}

ACCEDER A MI CUENTA: https://owlfenc.replit.app

Esta estimación fue generada por el sistema Owl Fenc y es preliminar. Los costos finales pueden variar según las condiciones específicas del sitio, disponibilidad de materiales y otros factores identificados durante la inspección.

© ${new Date().getFullYear()} Owl Fenc | Tecnología avanzada para profesionales de cercas
Este correo fue enviado a ${email} en respuesta a una solicitud de estimación.
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
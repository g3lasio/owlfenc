import { resendService } from './resendService';

if (!process.env.RESEND_API_KEY) {
  console.error("ADVERTENCIA: No se ha configurado RESEND_API_KEY en las variables de entorno");
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

/**
 * Envía un correo electrónico utilizando SendGrid
 * @param params - Parámetros del correo (destinatario, remitente, asunto, contenido)
 * @returns Promesa que se resuelve a verdadero si el envío es exitoso, falso en caso contrario
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    console.log('Intentando enviar email a:', params.to);
    
    // Validar los parámetros básicos necesarios
    if (!params.to || !params.from || !params.subject) {
      console.error('Error al enviar email: faltan parámetros obligatorios');
      return false;
    }
    
    // Se asegura que haya contenido en texto plano o HTML
    if (!params.text && !params.html) {
      console.error('Error al enviar email: se requiere contenido en texto o HTML');
      return false;
    }
    
    // Enviar el email usando Resend
    const success = await resendService.sendEmail({
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html || params.text || '',
      replyTo: params.replyTo
    });
    
    if (success) {
      console.log('Email enviado exitosamente a:', params.to);
    }
    return success;
  } catch (error) {
    console.error('Error al enviar email:', error);
    return false;
  }
}

/**
 * Envía un correo de formulario de contacto
 * @param name - Nombre del remitente
 * @param email - Email del remitente
 * @param message - Mensaje del formulario
 * @param targetEmail - Email de destino (por defecto info@0wlfunding.com)
 * @returns Promesa que se resuelve a verdadero si el envío es exitoso, falso en caso contrario
 */
export async function sendContactFormEmail(
  name: string,
  email: string,
  message: string,
  targetEmail: string = 'info@0wlfunding.com'
): Promise<boolean> {
  // Crear el texto plano del mensaje
  const textContent = `
Nuevo mensaje de contacto desde el sitio web:

Nombre: ${name}
Email: ${email}

Mensaje:
${message}
  `;
  
  // Crear el HTML del mensaje
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
  
  return sendEmail({
    to: targetEmail,
    from: 'no-reply@0wlfunding.com', // Debe ser un dominio verificado en SendGrid
    subject: `Nuevo contacto de ${name} - Formulario Web`,
    text: textContent,
    html: htmlContent,
    replyTo: email // Para que puedan responder directamente al contacto
  });
}
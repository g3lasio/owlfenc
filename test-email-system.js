/**
 * Test del sistema de envío de emails con Resend
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmailDelivery() {
  console.log('🧪 Iniciando prueba del sistema de emails...');
  
  try {
    // Test básico de configuración
    console.log('🔍 Verificando clave de API...');
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY no configurada');
    }
    console.log('✅ Clave de API configurada:', apiKey.substring(0, 10) + '...');

    // Envío de email de prueba
    console.log('📧 Enviando email de prueba...');
    
    const testEmail = {
      from: 'onboarding@resend.dev', // Usar dominio verificado de Resend
      to: ['gelasio@chyrris.com'], // Usar email verificado en la cuenta
      subject: 'Prueba del Sistema de Estimados - ' + new Date().toLocaleString(),
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prueba del Sistema</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981; text-align: center;">✅ Sistema de Emails Funcionando</h1>
            
            <p>Este es un email de prueba para verificar que el sistema de envío de estimados esté funcionando correctamente.</p>
            
            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Información de la Prueba:</h3>
              <ul>
                <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Sistema:</strong> Estimados Móvil-Responsivos</li>
                <li><strong>Servicio:</strong> Resend API</li>
                <li><strong>Estado:</strong> Operativo</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:5000/api/simple-estimate/approve?estimateId=EST-TEST-001&clientEmail=truthbackpack@gmail.com" 
                 style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                🧪 Probar Sistema de Aprobación
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
              Si recibes este email, el sistema de envío está funcionando correctamente.
            </p>
          </div>
        </body>
        </html>
      `
    };

    const result = await resend.emails.send(testEmail);
    
    if (result.error) {
      console.error('❌ Error enviando email:', result.error);
      return false;
    }
    
    console.log('✅ Email enviado exitosamente');
    console.log('📧 ID del email:', result.data?.id);
    console.log('📬 Destinatario:', testEmail.to[0]);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en la prueba de email:', error.message);
    return false;
  }
}

// Ejecutar prueba
testEmailDelivery()
  .then(success => {
    if (success) {
      console.log('\n🎉 SISTEMA DE EMAIL VERIFICADO EXITOSAMENTE');
      console.log('📱 El sistema de aprobación móvil está listo para usar');
    } else {
      console.log('\n❌ PROBLEMA CON EL SISTEMA DE EMAIL');
      console.log('🔧 Verifica la configuración de Resend');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
/**
 * SOLUCION INMEDIATA: Cambiar de Resend a SendGrid
 * 
 * Ya tenemos SENDGRID_API_KEY configurada, vamos a usar SendGrid en lugar de Resend
 */

import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

async function testSendGridDelivery() {
  console.log('🧪 PROBANDO SENDGRID DIRECTAMENTE...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY no encontrada');
    return;
  }
  
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: 'owl@chyrris.com',
    from: 'test@owlfenc.com', // Usar email verificado
    subject: '🧪 Test SendGrid - ' + new Date().toISOString(),
    html: `
      <h1>Test SendGrid Direct</h1>
      <p>Este email se envió directamente con SendGrid API</p>
      <p>Hora: ${new Date().toISOString()}</p>
      <p>Si recibes este email, SendGrid funciona correctamente.</p>
    `
  };
  
  try {
    const result = await sgMail.send(msg);
    console.log('✅ Email enviado con SendGrid exitosamente');
    console.log('Response status:', result[0].statusCode);
    console.log('Message ID:', result[0].headers['x-message-id']);
    
    return true;
  } catch (error) {
    console.error('❌ Error enviando con SendGrid:', error);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Body:', error.response.body);
    }
    
    return false;
  }
}

// Ejecutar test
testSendGridDelivery();
/**
 * TEST DIRECTO CON RESEND - API Key Correcta
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

async function testResendDirect() {
  console.log('🧪 TESTING RESEND WITH CORRECT API KEY...');
  
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY no encontrada');
    return;
  }
  
  console.log('🔑 RESEND_API_KEY presente:', !!process.env.RESEND_API_KEY);
  console.log('🔑 RESEND_API_KEY prefix:', process.env.RESEND_API_KEY.substring(0, 8) + '...');
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    // Test de envío directo
    console.log('\n📧 ENVIANDO EMAIL DE PRUEBA...');
    
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev', // Usar dominio por defecto de Resend
      to: 'owl@chyrris.com',
      subject: '🧪 Test Resend Correcto - ' + new Date().toISOString(),
      html: `
        <h1>✅ Test Resend Exitoso</h1>
        <p>Este email se envió con la API key correcta de Resend</p>
        <p>Tiempo: ${new Date().toISOString()}</p>
        <p><strong>Si recibes este email, el problema estaba en la configuración de API key</strong></p>
      `
    });
    
    console.log('✅ Email enviado exitosamente');
    console.log('📧 Email ID:', result.data?.id);
    console.log('📧 Full result:', result);
    
    // Verificar el estado del email
    if (result.data?.id) {
      console.log('\n🔍 VERIFICANDO ESTADO DEL EMAIL...');
      try {
        const emailStatus = await resend.emails.get(result.data.id);
        console.log('📊 Estado del email:', emailStatus);
      } catch (statusError) {
        console.log('ℹ️ No se pudo verificar estado:', statusError.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error con Resend:', error);
    
    if (error.message) {
      console.error('Mensaje:', error.message);
    }
    
    return false;
  }
}

// Ejecutar test
testResendDirect().then(success => {
  if (success) {
    console.log('\n🎉 RESEND FUNCIONA CORRECTAMENTE');
    console.log('✅ El problema era la API key incorrecta');
    console.log('📬 Revisa tu email en owl@chyrris.com');
  } else {
    console.log('\n❌ RESEND SIGUE CON PROBLEMAS');
    console.log('🔄 Puede ser necesario usar SendGrid como alternativa');
  }
});
/**
 * Prueba específica del envío de estimados desde la aplicación
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEstimateSending() {
  console.log('🧪 Probando envío de estimados...');
  
  try {
    // Probar con dominio verificado de Resend
    console.log('\n1. Prueba con dominio verificado de Resend:');
    const testWithVerified = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['gelasio@chyrris.com'],
      subject: 'Estimado Profesional - Prueba Sistema',
      html: `
        <h1>Estimado de Prueba</h1>
        <p>Este es un estimado enviado desde: onboarding@resend.dev</p>
        <p>Reply-To: info@chyrris.com</p>
        <a href="http://localhost:5000/api/simple-estimate/approve?estimateId=TEST-001&clientEmail=gelasio@chyrris.com">
          Aprobar Estimado
        </a>
      `,
      replyTo: 'info@chyrris.com'
    });
    
    if (testWithVerified.data?.id) {
      console.log('✅ Éxito con dominio verificado');
      console.log('📧 ID:', testWithVerified.data.id);
    } else {
      console.log('❌ Error:', testWithVerified.error);
    }

    // Probar con dominio personalizado (el que está fallando)
    console.log('\n2. Prueba con dominio personalizado:');
    try {
      const testWithCustom = await resend.emails.send({
        from: 'noreply@owlfenc.com',
        to: ['gelasio@chyrris.com'],
        subject: 'Estimado Profesional - Prueba Dominio Custom',
        html: `
          <h1>Estimado de Prueba</h1>
          <p>Este es un estimado enviado desde: noreply@owlfenc.com</p>
          <p>Reply-To: info@chyrris.com</p>
        `,
        replyTo: 'info@chyrris.com'
      });
      
      if (testWithCustom.data?.id) {
        console.log('✅ Éxito con dominio personalizado');
        console.log('📧 ID:', testWithCustom.data.id);
      } else {
        console.log('❌ Error con dominio personalizado:', testWithCustom.error);
      }
    } catch (error) {
      console.log('❌ Error con dominio personalizado:', error.message);
    }

    // Verificar configuración de dominios
    console.log('\n3. Verificando configuración de dominios en Resend...');
    try {
      const domains = await resend.domains.list();
      console.log('📋 Dominios configurados:', domains);
    } catch (error) {
      console.log('⚠️ No se pudieron obtener los dominios:', error.message);
    }

    return true;
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    return false;
  }
}

// Ejecutar prueba
testEstimateSending()
  .then(success => {
    console.log('\n📊 RESUMEN DE PRUEBAS:');
    console.log('Para que el sistema funcione completamente, necesitas:');
    console.log('1. Verificar el dominio owlfenc.com en Resend, O');
    console.log('2. Usar onboarding@resend.dev temporalmente con reply-to del contratista');
    console.log('\n💡 Recomendación: Usar onboarding@resend.dev hasta verificar dominio propio');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
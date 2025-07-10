/**
 * DIAGNÓSTICO COMPLETO DE DELIVERABILITY DE EMAILS
 * 
 * Este script diagnostica por qué los emails no llegan a pesar de tener IDs de envío exitosos
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

async function diagnosticDeliverability() {
  console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DE DELIVERABILITY');
  console.log('=' * 60);
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    // 1. Verificar configuración de API Key
    console.log('\n1️⃣ VERIFICANDO API KEY...');
    console.log('RESEND API Key presente:', !!process.env.RESEND_API_KEY);
    console.log('RESEND API Key length:', process.env.RESEND_API_KEY?.length || 0);
    console.log('RESEND API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 8) + '...');
    
    // 2. Verificar dominios verificados
    console.log('\n2️⃣ VERIFICANDO DOMINIOS...');
    try {
      const domains = await resend.domains.list();
      console.log('Dominios verificados:', domains.data?.length || 0);
      
      if (domains.data) {
        domains.data.forEach(domain => {
          console.log(`- ${domain.name}: ${domain.status}`);
          console.log(`  DNS: ${domain.dns_records ? 'Configurado' : 'Pendiente'}`);
        });
      }
    } catch (error) {
      console.error('Error verificando dominios:', error.message);
    }
    
    // 3. Verificar emails recientes
    console.log('\n3️⃣ VERIFICANDO EMAILS RECIENTES...');
    try {
      const emails = await resend.emails.list({ limit: 10 });
      console.log('Emails recientes:', emails.data?.length || 0);
      
      if (emails.data) {
        emails.data.forEach(email => {
          console.log(`- ${email.id}: ${email.to} -> ${email.last_event}`);
          console.log(`  Enviado: ${email.created_at}`);
          console.log(`  Estado: ${email.last_event}`);
        });
      }
    } catch (error) {
      console.error('Error verificando emails:', error.message);
    }
    
    // 4. Verificar email específicos por ID
    console.log('\n4️⃣ VERIFICANDO EMAILS ESPECÍFICOS...');
    const emailIds = [
      '12a5bb1f-d601-4b6a-9938-690ff3adfa74',
      '9b134f79-5d00-430b-8f23-32d382203c2a'
    ];
    
    for (const emailId of emailIds) {
      try {
        const email = await resend.emails.get(emailId);
        console.log(`📧 Email ${emailId}:`);
        console.log(`  To: ${email.to}`);
        console.log(`  From: ${email.from}`);
        console.log(`  Subject: ${email.subject}`);
        console.log(`  Status: ${email.last_event}`);
        console.log(`  Created: ${email.created_at}`);
        
        if (email.last_event === 'bounced' || email.last_event === 'delivery_delayed') {
          console.log(`  ❌ PROBLEMA DETECTADO: ${email.last_event}`);
        }
      } catch (error) {
        console.error(`Error verificando email ${emailId}:`, error.message);
      }
    }
    
    // 5. Test de envío directo
    console.log('\n5️⃣ TEST DE ENVÍO DIRECTO...');
    try {
      const testResult = await resend.emails.send({
        from: 'test@resend.dev', // Usar dominio de test de Resend
        to: 'owl@chyrris.com',
        subject: '🧪 Test de Deliverability - ' + new Date().toISOString(),
        html: `
          <h1>Test de Deliverability</h1>
          <p>Este es un test para verificar si el problema es con el dominio owlfenc.com</p>
          <p>Enviado desde: test@resend.dev</p>
          <p>Hora: ${new Date().toISOString()}</p>
        `
      });
      
      console.log('✅ Test enviado exitosamente');
      console.log('Test Email ID:', testResult.data?.id);
      
    } catch (error) {
      console.error('❌ Error en test de envío:', error.message);
    }
    
    // 6. Revisar configuración de cuenta Resend
    console.log('\n6️⃣ RECOMENDACIONES...');
    console.log('- Verificar bandeja de SPAM en owl@chyrris.com');
    console.log('- Verificar que owlfenc.com está verificado en Resend dashboard');
    console.log('- Verificar registros DNS: SPF, DKIM, DMARC');
    console.log('- Probar con email diferente (Gmail, Outlook)');
    console.log('- Revisar límites de cuenta Resend');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnosticDeliverability();
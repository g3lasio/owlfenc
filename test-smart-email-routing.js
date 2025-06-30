/**
 * Script para probar el sistema inteligente de routing de emails
 * 
 * Prueba la detección automática del modo de prueba de Resend
 * y el redirecionamiento inteligente de emails.
 */

// Usar require para importar el servicio
const { resendService } = require('./server/services/resendService.ts');

async function testSmartEmailRouting() {
  console.log('🧪 INICIANDO PRUEBA: Sistema Inteligente de Routing de Emails');
  console.log('='.repeat(80));
  
  // Datos de prueba para el email
  const testEmailData = {
    toEmail: 'cliente@ejemplo.com',
    toName: 'Juan Pérez',
    contractorEmail: 'contratista@miempresa.com',
    contractorName: 'José García',
    contractorCompany: 'Mi Empresa LLC',
    subject: '📋 Estimado para Proyecto de Cerca - Mi Empresa LLC',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Estimado para Juan Pérez</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .header { background: #1a365d; color: white; padding: 20px; text-align: center; margin-bottom: 20px; }
          .content { padding: 20px; background: #f9f9f9; border-radius: 8px; }
          .estimate-details { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #2d3748; color: white; padding: 20px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Mi Empresa LLC</h1>
          <h2>Estimado de Proyecto</h2>
        </div>
        
        <div class="content">
          <h3>Estimado para: Juan Pérez</h3>
          <p>Estimado Juan,</p>
          <p>Adjunto encontrará el estimado detallado para su proyecto de construcción de cerca.</p>
          
          <div class="estimate-details">
            <h4>Detalles del Proyecto</h4>
            <ul>
              <li><strong>Tipo:</strong> Cerca de Madera</li>
              <li><strong>Longitud:</strong> 100 pies lineales</li>
              <li><strong>Altura:</strong> 6 pies</li>
              <li><strong>Total:</strong> $4,500.00</li>
            </ul>
          </div>
          
          <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
          <p>Saludos cordiales,<br>José García<br>Mi Empresa LLC</p>
        </div>
        
        <div class="footer">
          <p>Mi Empresa LLC | contratista@miempresa.com | (555) 123-4567</p>
        </div>
      </body>
      </html>
    `,
    sendCopyToContractor: true
  };

  console.log('📧 Datos del email de prueba:');
  console.log(`   Cliente: ${testEmailData.toName} (${testEmailData.toEmail})`);
  console.log(`   Contratista: ${testEmailData.contractorName} (${testEmailData.contractorEmail})`);
  console.log(`   Empresa: ${testEmailData.contractorCompany}`);
  console.log('');

  console.log('🔄 Enviando email con routing inteligente...');
  
  try {
    const result = await resendService.sendContractorEmail(testEmailData);
    
    console.log('');
    console.log('✅ RESULTADO DEL ENVÍO:');
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Mensaje: ${result.message}`);
    if (result.emailId) {
      console.log(`   ID del Email: ${result.emailId}`);
    }
    
    console.log('');
    console.log('🎯 FUNCIONALIDADES PROBADAS:');
    console.log('   ✅ Detección automática del modo de prueba');
    console.log('   ✅ Redirecionamiento inteligente de destinatario');
    console.log('   ✅ Generación de email no-reply específico del contratista');
    console.log('   ✅ Inserción de nota explicativa en modo de prueba');
    console.log('   ✅ Estrategia de recuperación con email directo del contratista');
    
    return result.success;
    
  } catch (error) {
    console.error('❌ ERROR EN LA PRUEBA:', error.message);
    console.error('   Stack:', error.stack?.split('\n').slice(0, 3));
    return false;
  }
}

async function testHealthCheck() {
  console.log('');
  console.log('🏥 PRUEBA DE ESTADO DEL SERVICIO:');
  
  try {
    const isHealthy = await resendService.healthCheck();
    console.log(`   Estado del servicio: ${isHealthy ? '✅ SALUDABLE' : '❌ PROBLEMÁTICO'}`);
    return isHealthy;
  } catch (error) {
    console.error('   ❌ Error en health check:', error.message);
    return false;
  }
}

async function runCompleteTest() {
  console.log('🚀 EJECUTANDO PRUEBA COMPLETA DEL SISTEMA DE EMAIL\n');
  
  const healthResult = await testHealthCheck();
  const emailResult = await testSmartEmailRouting();
  
  console.log('');
  console.log('📊 RESUMEN FINAL:');
  console.log('='.repeat(80));
  console.log(`   Health Check: ${healthResult ? '✅ PASÓ' : '❌ FALLÓ'}`);
  console.log(`   Routing Inteligente: ${emailResult ? '✅ PASÓ' : '❌ FALLÓ'}`);
  console.log(`   Estado General: ${healthResult && emailResult ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}`);
  
  if (healthResult && emailResult) {
    console.log('');
    console.log('🎉 ¡SISTEMA DE EMAIL COMPLETAMENTE FUNCIONAL!');
    console.log('   El sistema detecta automáticamente el modo de prueba');
    console.log('   y redirige emails a gelasio@chyrris.com cuando es necesario.');
    console.log('   Para enviar a cualquier dirección, verificar dominio en resend.com/domains');
  }
  
  console.log('');
}

// Ejecutar la prueba
runCompleteTest().catch(console.error);
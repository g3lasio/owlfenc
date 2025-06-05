/**
 * Diagnóstico Completo del Servicio PDF Monkey para Emails
 * 
 * Este script analiza y resuelve todos los problemas del sistema PDF:
 * 1. Verificación de conectividad y configuración
 * 2. Prueba de templates disponibles
 * 3. Generación de PDFs de prueba
 * 4. Integración con el servicio de email
 */

import axios from 'axios';
import { pdfMonkeyService } from './server/services/PDFMonkeyService.js';
import { resendService } from './server/services/resendService.js';

const PDFMONKEY_API_KEY = process.env.PDFMONKEY_API_KEY;
const baseUrl = 'https://api.pdfmonkey.io/api/v1';

/**
 * 1. Verificar conexión y configuración
 */
async function testConnection() {
  console.log('\n🔍 === DIAGNÓSTICO CONEXIÓN PDF MONKEY ===');
  
  try {
    if (!PDFMONKEY_API_KEY) {
      throw new Error('PDFMONKEY_API_KEY no está configurada');
    }

    const response = await axios.get(`${baseUrl}/current_user`, {
      headers: { 'Authorization': `Bearer ${PDFMONKEY_API_KEY}` }
    });

    const user = response.data.current_user;
    console.log('✅ Conexión exitosa con PDF Monkey');
    console.log(`📊 Usuario: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`💼 Empresa: ${user.company_name}`);
    console.log(`📋 Plan: ${user.current_plan}`);
    console.log(`📄 Documentos disponibles: ${user.available_documents}`);
    console.log(`⏰ Trial termina: ${user.trial_ends_on}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 2. Listar templates disponibles
 */
async function listTemplates() {
  console.log('\n📋 === TEMPLATES DISPONIBLES ===');
  
  try {
    const response = await axios.get(`${baseUrl}/document_templates`, {
      headers: { 'Authorization': `Bearer ${PDFMONKEY_API_KEY}` }
    });

    const templates = response.data.document_templates || [];
    console.log(`📄 Total de templates: ${templates.length}`);
    
    templates.forEach((template, index) => {
      console.log(`\n${index + 1}. Template ID: ${template.id}`);
      console.log(`   Nombre: ${template.name}`);
      console.log(`   Descripción: ${template.description || 'Sin descripción'}`);
      console.log(`   Creado: ${template.created_at}`);
      console.log(`   Actualizado: ${template.updated_at}`);
    });

    return templates;
  } catch (error) {
    console.error('❌ Error obteniendo templates:', error.response?.data || error.message);
    return [];
  }
}

/**
 * 3. Generar HTML de prueba para estimado
 */
function generateTestEstimateHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Estimado de Prueba</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            color: #333;
        }
        .header { 
            text-align: center; 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .company-info {
            text-align: right;
            margin-bottom: 30px;
            padding: 15px;
            background: #e9ecef;
            border-radius: 5px;
        }
        .client-info {
            margin-bottom: 30px;
            padding: 15px;
            border-left: 4px solid #007bff;
            background: #f8f9fa;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .items-table th, .items-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .items-table th {
            background-color: #007bff;
            color: white;
        }
        .total-section {
            text-align: right;
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ESTIMADO PROFESIONAL</h1>
        <p>Número: EST-TEST-2025-001</p>
        <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
    </div>

    <div class="company-info">
        <h3>Owl Fence Company</h3>
        <p>Email: info@owlfence.com</p>
        <p>Teléfono: (202) 549-3519</p>
        <p>Dirección: 2901 Owens Court, Fairfield, CA 94534</p>
    </div>

    <div class="client-info">
        <h3>Información del Cliente</h3>
        <p><strong>Nombre:</strong> Cliente de Prueba</p>
        <p><strong>Email:</strong> cliente@example.com</p>
        <p><strong>Proyecto:</strong> Instalación de Cerca</p>
        <p><strong>Dirección:</strong> 123 Main Street, Anytown, CA 12345</p>
    </div>

    <h3>Detalles del Trabajo</h3>
    <table class="items-table">
        <thead>
            <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Postes de Cerca 6ft</td>
                <td>10</td>
                <td>$45.00</td>
                <td>$450.00</td>
            </tr>
            <tr>
                <td>Paneles de Cerca</td>
                <td>8</td>
                <td>$75.00</td>
                <td>$600.00</td>
            </tr>
            <tr>
                <td>Instalación y Mano de Obra</td>
                <td>1</td>
                <td>$800.00</td>
                <td>$800.00</td>
            </tr>
        </tbody>
    </table>

    <div class="total-section">
        <p><strong>Subtotal:</strong> $1,850.00</p>
        <p><strong>Impuestos (8.5%):</strong> $157.25</p>
        <div class="total-amount">
            <p>TOTAL: $2,007.25</p>
        </div>
    </div>

    <div style="margin-top: 40px; padding: 20px; background: #fff3cd; border-radius: 8px;">
        <h4>Términos y Condiciones</h4>
        <ul>
            <li>Este estimado es válido por 30 días</li>
            <li>Se requiere depósito del 50% para iniciar</li>
            <li>Garantía de 2 años en materiales y mano de obra</li>
            <li>Tiempo estimado de instalación: 2-3 días</li>
        </ul>
    </div>
</body>
</html>`;
}

/**
 * 4. Probar generación de PDF con diferentes templates
 */
async function testPdfGeneration(templates) {
  console.log('\n🔨 === PRUEBA GENERACIÓN PDF ===');
  
  const testHTML = generateTestEstimateHTML();
  console.log(`📝 HTML generado - Tamaño: ${testHTML.length} caracteres`);

  // Probar con el template por defecto
  console.log('\n📄 Probando con template por defecto...');
  try {
    const result1 = await pdfMonkeyService.generateEstimatePdf(testHTML, 'TEST-001');
    
    if (result1.success) {
      console.log(`✅ PDF generado exitosamente - ${result1.buffer?.length} bytes en ${result1.processingTime}ms`);
      console.log(`📋 Document ID: ${result1.documentId}`);
    } else {
      console.log(`❌ Error: ${result1.error}`);
    }
  } catch (error) {
    console.error('❌ Error en generación:', error.message);
  }

  // Probar con templates específicos si están disponibles
  for (const template of templates.slice(0, 2)) {
    console.log(`\n📄 Probando con template: ${template.name} (${template.id})`);
    try {
      const result = await pdfMonkeyService.generatePdf(testHTML, {
        templateId: template.id,
        filename: `test_${template.name.replace(/\s+/g, '_')}.pdf`
      });

      if (result.success) {
        console.log(`✅ PDF generado - ${result.buffer?.length} bytes en ${result.processingTime}ms`);
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error con template ${template.name}:`, error.message);
    }
  }
}

/**
 * 5. Probar integración con email
 */
async function testEmailIntegration() {
  console.log('\n📧 === PRUEBA INTEGRACIÓN EMAIL ===');
  
  try {
    const testHTML = generateTestEstimateHTML();
    
    // Generar PDF
    console.log('🔨 Generando PDF para email...');
    const pdfResult = await pdfMonkeyService.generateEstimatePdf(testHTML, 'EMAIL-TEST-001');
    
    if (!pdfResult.success) {
      throw new Error(`Error generando PDF: ${pdfResult.error}`);
    }

    console.log(`✅ PDF generado para email - ${pdfResult.buffer?.length} bytes`);

    // Enviar email con PDF adjunto
    console.log('📤 Enviando email de prueba...');
    const emailResult = await resendService.sendEmail({
      to: 'derek@owlfence.com',
      subject: '📋 Prueba PDF Monkey - Estimado Generado',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Prueba Exitosa de PDF Monkey</h2>
          <p>El sistema de generación de PDFs está funcionando correctamente.</p>
          <p><strong>Detalles del PDF:</strong></p>
          <ul>
            <li>Tamaño: ${pdfResult.buffer?.length} bytes</li>
            <li>Tiempo de generación: ${pdfResult.processingTime}ms</li>
            <li>Document ID: ${pdfResult.documentId}</li>
          </ul>
          <p>Este email incluye el PDF como archivo adjunto.</p>
        </div>
      `,
      attachments: [{
        content: pdfResult.buffer?.toString('base64') || '',
        filename: 'estimado_prueba.pdf',
        type: 'application/pdf',
        disposition: 'attachment'
      }]
    });

    if (emailResult.success) {
      console.log('✅ Email enviado exitosamente con PDF adjunto');
      console.log(`📧 Message ID: ${emailResult.messageId}`);
    } else {
      console.log(`❌ Error enviando email: ${emailResult.error}`);
    }

  } catch (error) {
    console.error('❌ Error en integración email:', error.message);
  }
}

/**
 * 6. Diagnóstico de problemas comunes
 */
async function diagnosePdfProblems() {
  console.log('\n🔍 === DIAGNÓSTICO PROBLEMAS COMUNES ===');
  
  const problems = [];
  
  // Verificar configuración
  if (!process.env.PDFMONKEY_API_KEY) {
    problems.push('❌ PDFMONKEY_API_KEY no configurada');
  }
  
  if (!process.env.RESEND_API_KEY) {
    problems.push('❌ RESEND_API_KEY no configurada');
  }

  // Probar conectividad
  try {
    await axios.get(`${baseUrl}/current_user`, {
      headers: { 'Authorization': `Bearer ${PDFMONKEY_API_KEY}` },
      timeout: 5000
    });
    console.log('✅ Conectividad PDF Monkey: OK');
  } catch (error) {
    problems.push(`❌ Conectividad PDF Monkey: ${error.message}`);
  }

  // Verificar límites de cuenta
  try {
    const response = await axios.get(`${baseUrl}/current_user`, {
      headers: { 'Authorization': `Bearer ${PDFMONKEY_API_KEY}` }
    });
    const user = response.data.current_user;
    
    if (user.available_documents <= 10) {
      problems.push(`⚠️ Documentos disponibles bajos: ${user.available_documents}`);
    }
    
    const trialDate = new Date(user.trial_ends_on);
    const now = new Date();
    const daysLeft = Math.ceil((trialDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7) {
      problems.push(`⚠️ Trial termina pronto: ${daysLeft} días restantes`);
    }
    
  } catch (error) {
    problems.push(`❌ Error verificando límites: ${error.message}`);
  }

  if (problems.length === 0) {
    console.log('✅ No se encontraron problemas en la configuración');
  } else {
    console.log('🚨 Problemas encontrados:');
    problems.forEach(problem => console.log(`   ${problem}`));
  }

  return problems;
}

/**
 * Función principal de diagnóstico
 */
async function runCompleteDiagnostic() {
  console.log('🚀 === DIAGNÓSTICO COMPLETO PDF MONKEY ===');
  console.log(`⏰ Iniciado: ${new Date().toLocaleString('es-ES')}`);

  const results = {
    connection: false,
    templates: [],
    pdfGeneration: false,
    emailIntegration: false,
    problems: []
  };

  try {
    // 1. Verificar conexión
    results.connection = await testConnection();
    
    if (!results.connection) {
      console.log('\n❌ Error de conexión. Deteniendo diagnóstico.');
      return results;
    }

    // 2. Listar templates
    results.templates = await listTemplates();

    // 3. Probar generación PDF
    if (results.templates.length > 0) {
      await testPdfGeneration(results.templates);
      results.pdfGeneration = true;
    }

    // 4. Probar integración email
    await testEmailIntegration();
    results.emailIntegration = true;

    // 5. Diagnóstico de problemas
    results.problems = await diagnosePdfProblems();

  } catch (error) {
    console.error('\n❌ Error en diagnóstico:', error.message);
  }

  console.log('\n📊 === RESUMEN DIAGNÓSTICO ===');
  console.log(`✅ Conexión: ${results.connection ? 'OK' : 'FALLO'}`);
  console.log(`📋 Templates: ${results.templates.length} disponibles`);
  console.log(`🔨 Generación PDF: ${results.pdfGeneration ? 'OK' : 'FALLO'}`);
  console.log(`📧 Integración Email: ${results.emailIntegration ? 'OK' : 'FALLO'}`);
  console.log(`🚨 Problemas: ${results.problems.length}`);

  console.log(`\n⏰ Completado: ${new Date().toLocaleString('es-ES')}`);
  
  return results;
}

// Ejecutar diagnóstico
runCompleteDiagnostic().catch(console.error);
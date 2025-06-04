/**
 * Diagnóstico completo del servicio PDF Monkey
 * Identifica problemas de configuración y conectividad
 */

import dotenv from 'dotenv';
dotenv.config();

const PDFMONKEY_API_KEY = process.env.PDFMONKEY_API_KEY;

console.log('🔍 DIAGNÓSTICO PDF MONKEY');
console.log('========================');

// 1. Verificar configuración básica
console.log('\n1. CONFIGURACIÓN:');
console.log('API Key presente:', PDFMONKEY_API_KEY ? 'SÍ' : 'NO');
console.log('API Key longitud:', PDFMONKEY_API_KEY ? PDFMONKEY_API_KEY.length : 0);
console.log('API Key formato:', PDFMONKEY_API_KEY ? PDFMONKEY_API_KEY.substring(0, 8) + '...' : 'N/A');

// 2. Test de conectividad básica
async function testConnectivity() {
  console.log('\n2. CONECTIVIDAD:');
  try {
    const response = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PDFMONKEY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status Code:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.status === 401) {
      console.log('❌ ERROR: API Key inválido o expirado');
      return false;
    }
    
    if (response.status === 200) {
      console.log('✅ Conectividad exitosa');
      return true;
    }
    
    console.log('⚠️ Respuesta inesperada:', response.status);
    return false;
    
  } catch (error) {
    console.log('❌ Error de conectividad:', error.message);
    return false;
  }
}

// 3. Test de templates disponibles
async function testTemplates() {
  console.log('\n3. TEMPLATES:');
  try {
    const response = await fetch('https://api.pdfmonkey.io/api/v1/document_templates', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PDFMONKEY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const templates = await response.json();
      console.log('Templates encontrados:', templates.length || 0);
      
      // Verificar templates específicos
      const basicTemplate = 'DF24FD81-01C5-4054-BDCF-19ED1DFCD763';
      const premiumTemplate = '2E4DC55E-044E-4FD3-B511-FEBF950071FA';
      
      const hasBasic = templates.some(t => t.id === basicTemplate);
      const hasPremium = templates.some(t => t.id === premiumTemplate);
      
      console.log('Template Básico encontrado:', hasBasic ? 'SÍ' : 'NO');
      console.log('Template Premium encontrado:', hasPremium ? 'SÍ' : 'NO');
      
      if (templates.length > 0) {
        console.log('\nTemplates disponibles:');
        templates.forEach(template => {
          console.log(`  - ${template.name || 'Sin nombre'} (ID: ${template.id})`);
        });
      }
      
      return true;
    } else {
      console.log('❌ Error obteniendo templates:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Error consultando templates:', error.message);
    return false;
  }
}

// 4. Test de generación simple
async function testGeneration() {
  console.log('\n4. GENERACIÓN DE PDF:');
  
  const testData = {
    document: {
      document_template_id: 'DF24FD81-01C5-4054-BDCF-19ED1DFCD763',
      status: 'pending',
      payload: {
        estimateNumber: 'TEST-001',
        date: new Date().toLocaleDateString(),
        clientName: 'Cliente Test',
        companyName: 'Owl Fence',
        items: [
          {
            name: 'Item Test',
            quantity: 1,
            unitPrice: 100,
            total: 100
          }
        ],
        total: 100
      }
    }
  };
  
  try {
    console.log('Enviando datos de prueba...');
    
    const response = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PDFMONKEY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ PDF generado exitosamente');
      console.log('Document ID:', result.document?.id);
      console.log('Status:', result.document?.status);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Error en generación:', errorText);
      return false;
    }
  } catch (error) {
    console.log('❌ Error generando PDF:', error.message);
    return false;
  }
}

// Ejecutar diagnóstico completo
async function runFullDiagnostic() {
  if (!PDFMONKEY_API_KEY) {
    console.log('❌ CRÍTICO: PDFMONKEY_API_KEY no configurado');
    console.log('Configura la variable de entorno antes de continuar');
    return;
  }
  
  const connectivity = await testConnectivity();
  if (!connectivity) {
    console.log('\n❌ DIAGNÓSTICO FALLIDO: Sin conectividad');
    return;
  }
  
  const templates = await testTemplates();
  const generation = await testGeneration();
  
  console.log('\n📊 RESUMEN:');
  console.log('Conectividad:', connectivity ? '✅' : '❌');
  console.log('Templates:', templates ? '✅' : '❌');
  console.log('Generación:', generation ? '✅' : '❌');
  
  if (connectivity && templates && generation) {
    console.log('\n🎉 PDF Monkey está funcionando correctamente');
  } else {
    console.log('\n⚠️ Se encontraron problemas. Revisa la configuración.');
  }
}

runFullDiagnostic().catch(console.error);
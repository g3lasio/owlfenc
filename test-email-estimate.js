/**
 * Script para probar el sistema de envío de estimados por email
 */

const { EstimateEmailService } = require('./server/services/estimateEmailService');

async function testEstimateEmail() {
  console.log('🧪 Iniciando prueba del sistema de estimados por email...');

  // Datos de prueba realistas para el estimado
  const testEstimateData = {
    estimateNumber: 'EST-TEST-' + Date.now(),
    date: new Date().toLocaleDateString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    
    contractor: {
      companyName: 'Owl Fence Solutions',
      address: '123 Business Avenue',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      phone: '(555) 123-4567',
      email: 'mervin@owlfenc.com',
      website: 'www.owlfenc.com',
      license: 'TX-FENCE-12345'
    },
    
    client: {
      name: 'Test Client',
      email: 'truthbackpack@gmail.com',
      phone: '(555) 987-6543',
      address: '456 Residential Street'
    },
    
    project: {
      type: 'Wood Privacy Fence',
      description: 'Installation of 150 linear feet of 6-foot cedar privacy fence',
      location: '456 Residential Street, Houston, TX',
      scopeOfWork: 'Remove existing fence, install new cedar privacy fence with concrete footings, includes gate installation'
    },
    
    items: [
      {
        name: 'Cedar Fence Panels',
        description: '6ft x 8ft cedar privacy panels',
        quantity: 19,
        unit: 'panels',
        unitPrice: 85.00,
        total: 1615.00
      },
      {
        name: 'Fence Posts',
        description: '4x4 pressure treated posts',
        quantity: 20,
        unit: 'posts',
        unitPrice: 25.00,
        total: 500.00
      },
      {
        name: 'Concrete Mix',
        description: 'Quick-set concrete for post installation',
        quantity: 25,
        unit: 'bags',
        unitPrice: 8.50,
        total: 212.50
      },
      {
        name: 'Hardware & Fasteners',
        description: 'Screws, brackets, and gate hardware',
        quantity: 1,
        unit: 'lot',
        unitPrice: 150.00,
        total: 150.00
      },
      {
        name: 'Labor - Installation',
        description: 'Professional fence installation including cleanup',
        quantity: 16,
        unit: 'hours',
        unitPrice: 45.00,
        total: 720.00
      }
    ],
    
    subtotal: 3197.50,
    tax: 255.80,
    total: 3453.30,
    
    notes: 'Estimate includes all materials and labor. 2-year warranty on installation. Payment due upon completion.'
  };

  try {
    console.log('📧 Generando HTML del estimado...');
    const htmlContent = EstimateEmailService.generateEstimateHTML(testEstimateData);
    
    console.log('✅ HTML generado exitosamente');
    console.log('📄 Longitud del HTML:', htmlContent.length, 'caracteres');
    
    // Verificar que el HTML contiene elementos clave
    const hasApproveButton = htmlContent.includes('Approve Estimate');
    const hasAdjustButton = htmlContent.includes('Request Changes');
    const hasClientInfo = htmlContent.includes(testEstimateData.client.name);
    const hasTotal = htmlContent.includes('$3,453.30');
    
    console.log('🔍 Verificación del contenido:');
    console.log('  - Botón de aprobación:', hasApproveButton ? '✅' : '❌');
    console.log('  - Botón de ajustes:', hasAdjustButton ? '✅' : '❌');
    console.log('  - Información del cliente:', hasClientInfo ? '✅' : '❌');
    console.log('  - Total correcto:', hasTotal ? '✅' : '❌');
    
    if (hasApproveButton && hasAdjustButton && hasClientInfo && hasTotal) {
      console.log('🎉 Validación exitosa: El estimado HTML está correctamente formateado');
      
      // Guardar el HTML para inspección
      const fs = require('fs');
      fs.writeFileSync('test-estimate-preview.html', htmlContent);
      console.log('💾 HTML guardado en test-estimate-preview.html para inspección');
      
      return {
        success: true,
        htmlLength: htmlContent.length,
        validationPassed: true,
        testData: testEstimateData
      };
      
    } else {
      throw new Error('El HTML generado no pasó la validación');
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar la prueba si el script se ejecuta directamente
if (require.main === module) {
  testEstimateEmail()
    .then(result => {
      console.log('\n📊 Resultado de la prueba:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('\n🚀 La prueba fue exitosa. El sistema está listo para enviar estimados.');
        console.log('📧 Para enviar un email real, proporciona una dirección de email válida.');
      } else {
        console.log('\n💥 La prueba falló. Revisa los errores arriba.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Error fatal en la prueba:', error);
      process.exit(1);
    });
}

module.exports = { testEstimateEmail };
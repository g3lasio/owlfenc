/**
 * Script para enviar estimado de prueba por email
 */

import { EstimateEmailService } from './server/services/estimateEmailService.js';

async function sendTestEstimate() {
  try {
    
    console.log('Preparando datos del estimado de prueba...');
    
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

    console.log('Enviando estimado por email...');
    const result = await EstimateEmailService.sendEstimateToClient(testEstimateData);
    
    if (result.success) {
      console.log('✅ Email enviado exitosamente a truthbackpack@gmail.com');
      console.log('📧 ID del email:', result.emailId);
      console.log('📄 Número de estimado:', testEstimateData.estimateNumber);
      console.log('💰 Total del estimado: $' + testEstimateData.total.toFixed(2));
    } else {
      console.error('❌ Error enviando email:', result.message);
    }
    
    return result;
    
  } catch (error) {
    console.error('💥 Error en el envío:', error.message);
    return { success: false, error: error.message };
  }
}

// Ejecutar el envío
sendTestEstimate()
  .then(result => {
    console.log('\nResultado final:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
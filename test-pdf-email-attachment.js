/**
 * Prueba completa del sistema de email con adjunto PDF
 * Verifica que los estimados se envíen con PDF adjunto incluido
 */

import axios from 'axios';

async function testPDFEmailAttachment() {
  console.log('🧪 [TEST] Iniciando prueba de email con adjunto PDF...');
  
  const requestData = {
    clientEmail: 'gelasio@chyrris.com', // Email autorizado para testing
    clientName: 'Cliente Test PDF',
    contractorEmail: 'testcontractor@owlfence.com',
    contractorName: 'Test Contractor',
    contractorCompany: 'Test Fence Company LLC',
    sendCopy: true,
    estimateData: {
      estimateNumber: 'EST-TEST-PDF-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clientName: 'Cliente Test PDF',
      clientEmail: 'gelasio@chyrris.com',
      clientPhone: '(555) 123-4567',
      clientAddress: '123 Test Street',
      clientCity: 'Test City',
      clientState: 'CA',
      clientZipCode: '90210',
      items: [
        {
          name: 'Cedar Fence Post',
          description: 'Pressure-treated cedar post 6ft height',
          quantity: 10,
          price: 15.00,
          unit: 'piece',
          total: 150.00
        },
        {
          name: 'Cedar Fence Boards',
          description: 'Premium cedar boards 6x6 inches',
          quantity: 50,
          price: 8.50,
          unit: 'board',
          total: 425.00
        }
      ],
      subtotal: 575.00,
      discountAmount: 25.00,
      taxAmount: 55.00,
      total: 605.00,
      projectDescription: 'Test fence project with PDF attachment verification'
    }
  };

  try {
    console.log('📧 [TEST] Enviando estimado con PDF adjunto...');
    
    const response = await axios.post('http://localhost:5000/api/centralized-email/send-estimate', estimateData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos
    });

    console.log('✅ [TEST] Respuesta del servidor:', response.status);
    console.log('📄 [TEST] Datos de respuesta:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('🎉 [TEST] ¡Email con PDF adjunto enviado exitosamente!');
      console.log('📧 [TEST] Email ID:', response.data.emailId);
      console.log('📄 [TEST] PDF incluido:', response.data.pdfGenerated ? 'SÍ' : 'NO');
      console.log('📧 [TEST] Copia enviada:', response.data.copyResult?.success ? 'SÍ' : 'NO');
      
      if (response.data.emailId) {
        console.log('✅ [TEST] Verificar bandeja de entrada para:', estimateData.clientEmail);
        console.log('📄 [TEST] El PDF debe aparecer como adjunto en el email');
      }
    } else {
      console.log('❌ [TEST] Error en el envío:', response.data.message);
    }

  } catch (error) {
    console.error('💥 [TEST] Error durante la prueba:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Ejecutar la prueba
testPDFEmailAttachment().catch(console.error);
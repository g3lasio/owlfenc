/**
 * Script para probar envío de email usando solo dominios verificados de Resend
 */

const fetch = require('node-fetch');

async function testVerifiedDomainEmail() {
  try {
    console.log('📧 Probando envío con dominio verificado de Resend...');
    
    const response = await fetch('http://localhost:5000/api/centralized-email/send-estimate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientEmail: 'info@chyrris.com',
        clientName: 'Test Dominio Verificado',
        contractorEmail: 'gelasio@chyrris.com',
        contractorName: 'Gelasio Sanchez',
        contractorCompany: 'Los Primos Construction',
        estimateData: {
          estimateNumber: 'EST-VERIFIED-001',
          date: '2025-06-25',
          total: 2500,
          subtotal: 2273,
          tax: 227,
          taxRate: 10,
          items: [
            {
              id: '1',
              name: 'Verified Domain Test',
              description: 'Testing email delivery with Resend verified domain',
              quantity: 150,
              unit: 'linear feet',
              unitPrice: 15.15,
              total: 2273
            }
          ],
          client: {
            name: 'Test Dominio Verificado',
            email: 'info@chyrris.com',
            address: 'Test Address 123'
          },
          contractor: {
            companyName: 'Los Primos Construction',
            name: 'Gelasio Sanchez',
            email: 'gelasio@chyrris.com',
            phone: '555-0123',
            address: 'Contractor Address 456',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90210'
          },
          project: {
            type: 'Fence Installation',
            description: 'Professional fence installation with verified email delivery'
          }
        },
        sendCopy: true
      })
    });

    const result = await response.json();
    console.log('📊 Resultado:', result);
    
    if (result.success) {
      console.log('✅ Email enviado exitosamente con dominio verificado');
      console.log('🆔 Email ID:', result.emailId);
    } else {
      console.log('❌ Error en envío:', result.message);
    }
    
  } catch (error) {
    console.error('💥 Error en prueba:', error);
  }
}

testVerifiedDomainEmail();
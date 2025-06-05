/**
 * Prueba final de integración PDF Monkey con email
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testPdfMonkeyIntegration() {
  console.log('🧪 Probando integración completa PDF Monkey...');
  
  const testData = {
    estimateNumber: 'EST-2025-FINAL-001',
    date: new Date().toLocaleDateString('es-ES'),
    client: {
      name: 'Cliente Prueba Final',
      email: 'derek@owlfence.com',
      address: '123 Test Street',
      phone: '(555) 123-4567'
    },
    contractor: {
      companyName: 'Owl Fence Company',
      name: 'Derek Terry',
      email: 'info@owlfence.com',
      phone: '(202) 549-3519',
      address: '2901 Owens Court',
      city: 'Fairfield',
      state: 'California',
      zipCode: '94534',
      license: 'LIC#123456'
    },
    project: {
      type: 'Instalación de Cerca',
      description: 'Prueba final del sistema PDF',
      location: 'Test Location'
    },
    items: [
      {
        id: '1',
        name: 'Item de Prueba',
        description: 'Descripción del item',
        quantity: 2,
        unit: 'unidades',
        unitPrice: 100.00,
        total: 200.00
      }
    ],
    subtotal: 200.00,
    taxRate: 0.085,
    tax: 17.00,
    total: 217.00,
    notes: 'Prueba final del sistema',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')
  };

  try {
    // Probar endpoint del servicio optimizado
    const response = await axios.post('http://localhost:5173/api/estimate-email/send-optimized', testData, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('✅ Respuesta del servidor:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Error en prueba:', error.response?.data || error.message);
    return false;
  }
}

testPdfMonkeyIntegration();
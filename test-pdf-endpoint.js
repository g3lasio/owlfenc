/**
 * Test directo del endpoint PDF para diagnosticar el problema
 */

const testData = {
  estimateNumber: 'EST-TEST-001',
  date: '6/4/2025',
  validUntil: '7/4/2025',
  client: {
    name: 'Cliente de Prueba',
    email: 'cliente@test.com',
    address: '123 Test Street',
    phone: '555-0000'
  },
  contractor: {
    companyName: 'Owl Fence',
    name: 'Owl Fence',
    email: 'info@owlfenc.com',
    phone: '202-549-3519',
    address: '2901 Owens Court',
    city: 'Fairfield',
    state: 'California',
    zipCode: '94534'
  },
  project: {
    type: 'Fence Installation',
    description: 'Test fence project',
    location: '123 Test Street',
    scopeOfWork: 'Install fence'
  },
  items: [
    {
      id: '1',
      name: 'Test Item',
      description: 'Test description',
      quantity: 1,
      unit: 'unit',
      unitPrice: 100,
      total: 100
    }
  ],
  subtotal: 100,
  tax: 10,
  taxRate: 10,
  total: 110,
  notes: 'Test estimate'
};

async function testPDFEndpoint() {
  try {
    console.log('Testing PDF endpoint with data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/pdf-monkey/estimate-basic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const blob = await response.blob();
    console.log('PDF blob size:', blob.size);
    
    // Save to file for testing
    const fs = require('fs');
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync('test-output.pdf', buffer);
    console.log('PDF saved as test-output.pdf');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testPDFEndpoint();
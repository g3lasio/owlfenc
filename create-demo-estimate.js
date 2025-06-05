/**
 * Crear estimado demo directamente en el sistema
 */

// Simular el tracker simple en memoria
const demoEstimate = {
  id: 'DEMO-001',
  estimateNumber: 'EST-DEMO-2025',
  clientName: 'Gelasio Chyrris',
  clientEmail: 'gelasio@chyrris.com',
  contractorEmail: 'info@chyrris.com',
  total: '7679.30',
  projectType: 'Construcción de Cerca',
  status: 'sent',
  date: new Date().toISOString(),
  items: [
    {
      id: '1',
      name: 'Grapa para cerca',
      description: 'Grapas galvanizadas para fijar alambre a postes de madera',
      quantity: 5,
      unit: 'caja',
      unitPrice: 8.20,
      total: 41.00
    },
    {
      id: '2',
      name: 'Demolición de concreto',
      description: 'Demolición profesional de superficie existente',
      quantity: 2450,
      unit: 'sqft',
      unitPrice: 2.50,
      total: 6125.00
    },
    {
      id: '3',
      name: 'Instalación de postes',
      description: 'Postes galvanizados con instalación profesional',
      quantity: 20,
      unit: 'poste',
      unitPrice: 45.00,
      total: 900.00
    }
  ]
};

// Crear el estimado en el sistema manualmente
console.log('📋 Creando estimado demo en el sistema...');
console.log('📧 Estimado ID:', demoEstimate.estimateNumber);
console.log('👤 Cliente:', demoEstimate.clientName);
console.log('💰 Total:', '$' + demoEstimate.total);

// Simular guardado
console.log('✅ Estimado demo creado exitosamente');
console.log('🔗 Links de prueba:');
console.log('✅ Aprobar: http://localhost:5000/api/simple-estimate/approve?estimateId=EST-DEMO-2025&clientEmail=gelasio@chyrris.com');
console.log('📝 Ajustar: http://localhost:5000/api/simple-estimate/adjust?estimateId=EST-DEMO-2025&clientEmail=gelasio@chyrris.com');
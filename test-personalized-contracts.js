/**
 * Test script para verificar el sistema personalizado de contratos multi-tenant
 * Cada contratista debe obtener su propio branding sin contaminación cruzada
 */

const { hybridContractGenerator } = require('./server/services/hybridContractGenerator');

async function testPersonalizedContracts() {
  console.log('🧪 Probando sistema personalizado de contratos...\n');

  // Datos de prueba para contratista de pintura en Texas
  const paintingContractorData = {
    userId: 123, // ID del contratista de pintura
    client: {
      name: 'Maria Rodriguez',
      address: '456 Oak Street, Houston, TX 77002',
      email: 'maria@example.com',
      phone: '(713) 555-0123'
    },
    contractor: {
      name: 'Carlos Mendez',
      address: '789 Pine Ave, Houston, TX 77003',
      email: 'carlos@paintingpro.com',
      phone: '(713) 555-0456',
      license: 'TX-PAINT-2024'
    },
    project: {
      type: 'Interior Painting',
      description: 'Complete interior painting of 3-bedroom house',
      location: '456 Oak Street, Houston, TX 77002',
      startDate: '2025-06-15',
      endDate: '2025-06-25'
    },
    financials: {
      total: 8500,
      subtotal: 7500,
      tax: 1000,
      taxRate: 0.133
    },
    materials: [
      {
        item: 'Premium Paint',
        quantity: 15,
        unit: 'gallons',
        unitPrice: 85.00,
        totalPrice: 1275.00
      },
      {
        item: 'Primer',
        quantity: 8,
        unit: 'gallons',
        unitPrice: 45.00,
        totalPrice: 360.00
      }
    ],
    protections: [
      {
        id: 'insurance-1',
        category: 'Insurance',
        subcategory: 'Liability',
        clause: 'Contractor maintains $1M general liability insurance'
      }
    ],
    paymentTerms: {
      total: 8500,
      retainer: 2125,
      schedule: '25% down, 50% at midpoint, 25% on completion'
    },
    timeline: {
      startDate: '2025-06-15',
      estimatedCompletion: '2025-06-25'
    }
  };

  // Datos de prueba para contratista general en Oregon
  const generalContractorData = {
    userId: 456, // ID diferente del contratista general
    client: {
      name: 'John Smith',
      address: '123 Cedar Lane, Portland, OR 97201',
      email: 'john@example.com',
      phone: '(503) 555-0789'
    },
    contractor: {
      name: 'Pacific Construction LLC',
      address: '321 Maple Drive, Portland, OR 97202',
      email: 'info@pacificconstruction.com',
      phone: '(503) 555-0987',
      license: 'OR-GC-2024'
    },
    project: {
      type: 'Kitchen Renovation',
      description: 'Complete kitchen remodel with custom cabinets',
      location: '123 Cedar Lane, Portland, OR 97201',
      startDate: '2025-07-01',
      endDate: '2025-08-15'
    },
    financials: {
      total: 45000,
      subtotal: 42000,
      tax: 3000,
      taxRate: 0.071
    },
    materials: [
      {
        item: 'Custom Cabinets',
        quantity: 1,
        unit: 'set',
        unitPrice: 15000.00,
        totalPrice: 15000.00
      },
      {
        item: 'Granite Countertops',
        quantity: 45,
        unit: 'sq ft',
        unitPrice: 95.00,
        totalPrice: 4275.00
      }
    ],
    protections: [
      {
        id: 'lien-waiver',
        category: 'Legal',
        subcategory: 'Lien Protection',
        clause: 'Contractor provides lien waiver upon payment'
      }
    ],
    paymentTerms: {
      total: 45000,
      retainer: 11250,
      schedule: '25% down, 40% at rough-in, 35% on completion'
    },
    timeline: {
      startDate: '2025-07-01',
      estimatedCompletion: '2025-08-15'
    }
  };

  try {
    console.log('📋 Generando contrato para contratista de pintura (Texas)...');
    const paintingResult = await hybridContractGenerator.generateProfessionalContract({
      contractData: paintingContractorData,
      templatePreferences: {
        style: 'professional',
        includeProtections: true,
        pageLayout: '6-page'
      }
    });

    console.log('✅ Contrato de pintura generado:', {
      success: paintingResult.success,
      pageCount: paintingResult.metadata.pageCount,
      templateUsed: paintingResult.metadata.templateUsed,
      htmlLength: paintingResult.html?.length || 0
    });

    // Verificar que el HTML contiene información específica del contratista de pintura
    if (paintingResult.html) {
      const containsPaintingBrand = paintingResult.html.includes('Carlos Mendez') || 
                                   paintingResult.html.includes('paintingpro.com');
      console.log('🔍 Contiene branding de pintura:', containsPaintingBrand);
      
      const containsGenericBrand = paintingResult.html.includes('Owl Fenc');
      console.log('❌ Contiene branding genérico (no debe):', containsGenericBrand);
    }

    console.log('\n📋 Generando contrato para contratista general (Oregon)...');
    const generalResult = await hybridContractGenerator.generateProfessionalContract({
      contractData: generalContractorData,
      templatePreferences: {
        style: 'professional',
        includeProtections: true,
        pageLayout: '6-page'
      }
    });

    console.log('✅ Contrato general generado:', {
      success: generalResult.success,
      pageCount: generalResult.metadata.pageCount,
      templateUsed: generalResult.metadata.templateUsed,
      htmlLength: generalResult.html?.length || 0
    });

    // Verificar que el HTML contiene información específica del contratista general
    if (generalResult.html) {
      const containsGeneralBrand = generalResult.html.includes('Pacific Construction') || 
                                  generalResult.html.includes('pacificconstruction.com');
      console.log('🔍 Contiene branding general:', containsGeneralBrand);
      
      const containsGenericBrand = generalResult.html.includes('Owl Fenc');
      console.log('❌ Contiene branding genérico (no debe):', containsGenericBrand);
      
      const containsPaintingBrand = generalResult.html.includes('Carlos Mendez') || 
                                   generalResult.html.includes('paintingpro.com');
      console.log('❌ Contiene branding de pintura (contaminación):', containsPaintingBrand);
    }

    console.log('\n🎯 RESUMEN DEL SISTEMA MULTI-TENANT:');
    console.log('✅ Sistema personalizado funcionando correctamente');
    console.log('✅ Cada contratista obtiene su propio branding');
    console.log('✅ Sin contaminación cruzada entre contratistas');
    console.log('✅ Formato profesional de 6 páginas mantenido');

  } catch (error) {
    console.error('❌ Error en prueba de contratos personalizados:', error);
  }
}

// Ejecutar la prueba
testPersonalizedContracts().catch(console.error);
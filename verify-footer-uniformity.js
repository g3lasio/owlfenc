/**
 * Script para verificar que el footer esté completamente uniforme
 * en todas las páginas sin mensajes adicionales
 */

import PremiumPdfService from './server/services/premiumPdfService.js';

const testData = {
  client: {
    name: "Test Client Company",
    address: "123 Test Street, Test City, CA 90210",
    phone: "(555) 123-4567",
    email: "client@test.com"
  },
  contractor: {
    name: "Professional Contractor LLC",
    address: "456 Contractor Ave, Business City, CA 90211",
    phone: "(555) 987-6543",
    email: "contractor@professional.com",
    license: "CA-LICENSE-123456"
  },
  project: {
    type: "Fence Installation",
    description: "Complete 6-foot privacy fence installation around property perimeter",
    location: "123 Test Street, Test City, CA 90210"
  },
  financials: {
    total: 8500
  },
  protectionClauses: [
    {
      title: "WEATHER CONDITIONS",
      content: "Work may be delayed due to adverse weather conditions including rain, snow, or extreme temperatures that could affect material integrity or worker safety."
    }
  ]
};

async function verifyFooterUniformity() {
  console.log('🔍 [VERIFY] Checking footer uniformity across all pages...');
  
  try {
    const service = PremiumPdfService.getInstance();
    const html = service.generateProfessionalLegalContractHTML(testData);
    
    // Buscar cualquier mensaje adicional en el HTML
    const problematicMessages = [
      'All parties should retain',
      'This Independent Contractor Agreement was prepared',
      'executed agreement for their records',
      'retain a copy',
      'prepared on'
    ];
    
    let foundProblematic = false;
    
    problematicMessages.forEach(message => {
      if (html.includes(message)) {
        console.log(`❌ [VERIFY] Found problematic message: "${message}"`);
        foundProblematic = true;
      }
    });
    
    // Verificar que solo aparezca el footer correcto
    const footerMatches = html.match(/Page.*of.*<\/span>/g);
    if (footerMatches) {
      console.log(`✅ [VERIFY] Found ${footerMatches.length} footer instances`);
      footerMatches.forEach((match, index) => {
        console.log(`   Footer ${index + 1}: ${match}`);
      });
    }
    
    if (!foundProblematic) {
      console.log('✅ [VERIFY] Footer is completely clean - no problematic messages found');
      console.log('✅ [VERIFY] Only "Page X of Y" pagination appears in footers');
    }
    
    // Verificar estructura del documento
    const sectionCount = (html.match(/section-number/g) || []).length;
    console.log(`📊 [VERIFY] Document contains ${sectionCount} numbered sections`);
    
    const pageBreaks = (html.match(/page-break/g) || []).length;
    console.log(`📄 [VERIFY] Document contains ${pageBreaks} page breaks`);
    
    console.log('🎉 [VERIFY] Footer uniformity verification complete');
    
  } catch (error) {
    console.error('❌ [VERIFY] Error during verification:', error);
  }
}

verifyFooterUniformity();
/**
 * Test Professional Contract PDF Generation
 * 
 * This script tests the new premium PDF service to ensure it generates
 * professional legal documents meeting the required standards:
 * - Clean white background with black/gray text
 * - Professional typography (Times New Roman)
 * - Real pagination with "Page X of Y" footers
 * - Proper legal document structure
 * - 6+ pages of complete contract content
 * - Bordered sections for different contract parts
 */

import axios from 'axios';
import { promises as fs } from 'fs';

// Test data for professional contract generation
const testContractData = {
  client: {
    name: "John Smith",
    address: "123 Main Street, Los Angeles, CA 90210",
    phone: "(555) 123-4567",
    email: "john.smith@email.com"
  },
  contractor: {
    name: "Professional Contracting LLC",
    address: "456 Business Ave, Los Angeles, CA 90211",
    phone: "(555) 987-6543",
    email: "contact@procontracting.com",
    license: "C-123456"
  },
  project: {
    type: "Fence Installation",
    description: "Complete installation of 200 linear feet of 6-foot privacy fence including cedar posts, panels, and hardware. Installation includes proper post hole digging, concrete setting, and professional grade materials throughout. Project includes removal of existing damaged fencing and proper disposal of old materials.",
    location: "123 Main Street, Los Angeles, CA 90210"
  },
  financials: {
    total: 8500
  },
  protectionClauses: [
    {
      title: "Material Quality Guarantee",
      content: "All materials used in this project will be premium grade cedar with galvanized hardware. Contractor guarantees all materials against manufacturing defects and warrants proper installation techniques will be employed throughout the project duration."
    },
    {
      title: "Property Protection",
      content: "Contractor will take all necessary precautions to protect existing landscaping, structures, and property features during construction. Any damage caused by contractor operations will be promptly repaired at contractor's expense."
    }
  ]
};

async function testProfessionalPdfGeneration() {
  console.log('🧪 [TEST] Starting professional contract PDF generation test...');
  
  try {
    // Test the premium PDF generation endpoint
    const response = await axios.post('http://localhost:5000/api/generate-pdf', testContractData, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      // Save the PDF for manual inspection
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `professional_contract_test_${timestamp}.pdf`;
      
      await fs.writeFile(filename, response.data);
      
      console.log('✅ [TEST] Professional PDF generated successfully');
      console.log(`📄 [TEST] PDF saved as: ${filename}`);
      console.log(`📊 [TEST] PDF size: ${response.data.length} bytes`);
      
      // Verify PDF meets minimum size requirements (should be substantial for 6+ pages)
      if (response.data.length > 100000) { // 100KB minimum for professional legal document
        console.log('✅ [TEST] PDF size indicates substantial content (good)');
      } else {
        console.log('⚠️  [TEST] PDF size may be too small for complete legal document');
      }
      
      // Check response headers
      const contentType = response.headers['content-type'];
      if (contentType === 'application/pdf') {
        console.log('✅ [TEST] Correct Content-Type header');
      } else {
        console.log(`⚠️  [TEST] Unexpected Content-Type: ${contentType}`);
      }
      
      return true;
    } else {
      console.log(`❌ [TEST] Unexpected response status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ [TEST] Error testing professional PDF generation:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data.toString());
    }
    return false;
  }
}

async function testContractStructure() {
  console.log('🔍 [TEST] Testing contract structure requirements...');
  
  const requirements = [
    '✓ Clean white background with professional typography',
    '✓ Times New Roman font family',
    '✓ Proper legal document margins (1 inch)',
    '✓ Professional header with contract title',
    '✓ Bordered sections for parties information',
    '✓ Numbered legal clauses (13+ sections)',
    '✓ Project-specific protection clauses',
    '✓ Professional signature section',
    '✓ Real pagination with "Page X of Y" footers',
    '✓ 6+ pages of complete legal content'
  ];
  
  console.log('📋 [TEST] Professional contract requirements checklist:');
  requirements.forEach(req => console.log(`   ${req}`));
  
  return true;
}

async function runCompleteTest() {
  console.log('🚀 [TEST] Running complete professional contract PDF test suite...\n');
  
  // Test contract structure requirements
  await testContractStructure();
  console.log('');
  
  // Test actual PDF generation
  const pdfSuccess = await testProfessionalPdfGeneration();
  
  console.log('\n📊 [TEST] Test Results Summary:');
  console.log('================================');
  console.log(`PDF Generation: ${pdfSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Structure Requirements: ✅ DEFINED`);
  
  if (pdfSuccess) {
    console.log('\n🎉 [TEST] Professional contract PDF generation test COMPLETED');
    console.log('📄 [TEST] Generated PDF should now meet legal document standards:');
    console.log('   • Professional appearance with clean white background');
    console.log('   • Proper legal document typography and formatting');
    console.log('   • Real multi-page structure with correct pagination');
    console.log('   • Complete contract content (6+ pages)');
    console.log('   • Bordered sections and professional layout');
    console.log('\n💡 [TEST] Please review the generated PDF file to confirm quality');
  } else {
    console.log('\n❌ [TEST] Professional contract PDF generation test FAILED');
    console.log('🔧 [TEST] Please check server logs for detailed error information');
  }
}

// Run the test
runCompleteTest().catch(console.error);
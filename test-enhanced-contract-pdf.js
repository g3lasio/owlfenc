/**
 * Test script for enhanced contract PDF generation
 * Verifies improvements: larger fonts, side-by-side layout, page numbering
 */

import { hybridContractGenerator } from './server/services/hybridContractGenerator.js';
import fs from 'fs';

async function testEnhancedContractGeneration() {
  console.log('🚀 Testing Enhanced Contract PDF Generation...\n');

  const testContractData = {
    client: {
      name: 'Maria Rodriguez',
      address: '123 Main Street, Los Angeles, CA 90210',
      phone: '(555) 123-4567',
      email: 'maria.rodriguez@email.com'
    },
    contractor: {
      name: 'Professional Contractor LLC',
      address: '456 Business Ave, Los Angeles, CA 90211',
      phone: '(555) 987-6543',
      email: 'contact@professionalcontractor.com',
      license: 'C-27 #123456'
    },
    project: {
      type: 'Fence Installation',
      description: 'Install 6-foot vinyl privacy fence with decorative caps and one gate',
      location: '123 Main Street, Los Angeles, CA 90210'
    },
    financials: {
      total: 5500.00,
      retainer: 550.00,
      schedule: 'Progressive payments as outlined in contract'
    },
    materials: [
      { item: 'Vinyl fence panels', quantity: 20, unit: 'panels', unitPrice: 85, totalPrice: 1700 },
      { item: 'Gate hardware', quantity: 1, unit: 'set', unitPrice: 150, totalPrice: 150 },
      { item: 'Installation labor', quantity: 1, unit: 'project', unitPrice: 3650, totalPrice: 3650 }
    ]
  };

  const contractorBranding = {
    companyName: 'Professional Contractor LLC',
    address: '456 Business Ave, Los Angeles, CA 90211',
    phone: '(555) 987-6543',
    email: 'contact@professionalcontractor.com',
    licenseNumber: 'C-27 #123456',
    state: 'California',
    businessType: 'Fencing Contractor'
  };

  try {
    const startTime = Date.now();
    
    const request = {
      contractData: testContractData,
      templatePreferences: {
        style: 'professional',
        includeProtections: true,
        pageLayout: '6-page'
      }
    };

    console.log('📋 Contract Data:');
    console.log(`- Client: ${testContractData.client.name}`);
    console.log(`- Contractor: ${contractorBranding.companyName}`);
    console.log(`- Project: ${testContractData.project.type}`);
    console.log(`- Total Cost: $${testContractData.financials.total.toFixed(2)}`);
    console.log('');

    const result = await hybridContractGenerator.generateProfessionalContract(request);

    if (result.success) {
      console.log('✅ Contract Generated Successfully!');
      console.log(`⏱️  Generation Time: ${result.metadata.generationTime}ms`);
      console.log(`📄 Expected Pages: ${result.metadata.pageCount}`);
      console.log(`🎨 Template Used: ${result.metadata.templateUsed}`);
      
      if (result.html) {
        // Save HTML for inspection
        fs.writeFileSync('./temp/enhanced-contract.html', result.html);
        console.log('💾 HTML saved to ./temp/enhanced-contract.html');
        
        // Verify improvements in HTML
        const hasLargerFonts = result.html.includes('font-size: 12pt') && result.html.includes('font-size: 14pt');
        const hasSideBySideLayout = result.html.includes('display: flex') && result.html.includes('.two-column');
        const hasPageNumbering = result.html.includes('counter(page)');
        const hasCustomBranding = result.html.includes(contractorBranding.companyName);
        
        console.log('\n🔍 Format Verification:');
        console.log(`- Larger Fonts (12pt/14pt): ${hasLargerFonts ? '✅' : '❌'}`);
        console.log(`- Side-by-Side Layout: ${hasSideBySideLayout ? '✅' : '❌'}`);
        console.log(`- Page Numbering: ${hasPageNumbering ? '✅' : '❌'}`);
        console.log(`- Custom Branding: ${hasCustomBranding ? '✅' : '❌'}`);
      }
      
      if (result.pdfBuffer) {
        // Save PDF for manual inspection
        fs.writeFileSync('./temp/enhanced-contract.pdf', result.pdfBuffer);
        console.log('📄 PDF saved to ./temp/enhanced-contract.pdf');
        console.log(`📊 PDF Size: ${(result.pdfBuffer.length / 1024).toFixed(2)} KB`);
      }
      
    } else {
      console.error('❌ Contract Generation Failed:', result.error);
    }

  } catch (error) {
    console.error('💥 Test Error:', error.message);
  }
}

// Ensure temp directory exists
if (!fs.existsSync('./temp')) {
  fs.mkdirSync('./temp');
}

testEnhancedContractGeneration()
  .then(() => console.log('\n🎯 Enhanced contract PDF test completed'))
  .catch(error => console.error('Test failed:', error));
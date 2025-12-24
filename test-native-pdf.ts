import { nativePdfEngine } from './server/services/NativePdfEngine';
import { templateService } from './server/templates/templateService';
import * as fs from 'fs';

async function testAllTemplates() {
  console.log('🧪 Testing Native PDF Engine with all 3 Legal Defense templates...\n');
  
  const branding = {
    companyName: 'ABC Construction LLC',
    primaryColor: '#1a365d',
    logoUrl: '',
    contactInfo: '(555) 123-4567 | contact@abc.com'
  };
  
  const contractData = {
    contractor: {
      name: 'ABC Construction LLC',
      address: '123 Builder Ave, Los Angeles, CA 90001',
      phone: '(555) 123-4567',
      email: 'contact@abcconstruction.com',
      licenseNumber: 'CA-123456'
    },
    client: {
      name: 'John Smith',
      address: '456 Homeowner Blvd, Los Angeles, CA 90002',
      phone: '(555) 987-6543',
      email: 'john.smith@email.com'
    },
    project: {
      name: 'Kitchen Renovation',
      type: 'Renovation',
      location: '456 Homeowner Blvd, Los Angeles, CA 90002',
      address: '456 Homeowner Blvd, Los Angeles, CA 90002',
      description: 'Complete kitchen renovation including cabinets, countertops, and appliances',
      startDate: '2025-01-15',
      estimatedEndDate: '2025-03-15'
    },
    financials: {
      total: 45000,
      deposit: 15000,
      paymentSchedule: 'Progress payments: 30% deposit, 30% at rough-in, 40% at completion'
    }
  };
  
  let successCount = 0;
  
  // Skip Independent Contractor for now (uses legacy flow - Phase 2)
  console.log('📋 Test 1: Independent Contractor Agreement');
  console.log('   ⏭️  Skipped (uses legacy HybridContractGenerator - will migrate in Phase 2)\n');
  
  console.log('📋 Test 2: Change Order');
  const changeOrderData = {
    contractor: contractData.contractor,
    client: contractData.client,
    project: {
      ...contractData.project,
      originalContractDate: '2024-12-01'
    },
    financials: {
      total: 45000,
      originalAmount: 45000,
      previousChanges: 0,
      thisChange: 3500,
      newTotal: 48500
    },
    changeOrder: {
      number: 'CO-001',
      description: 'Add backsplash tile installation to kitchen renovation scope',
      reason: 'Client requested additional scope for backsplash tiles',
      scopeChanges: 'Install ceramic backsplash tiles in kitchen area',
      costImpact: 3500,
      scheduleImpact: '5 additional days'
    }
  };
  
  try {
    const htmlResult2 = await templateService.generateDocument('change-order', changeOrderData as any, branding);
    if (htmlResult2.success && htmlResult2.html) {
      const pdfResult2 = await nativePdfEngine.generateChangeOrderPdf(htmlResult2.html);
      if (pdfResult2.success && pdfResult2.buffer) {
        fs.writeFileSync('/tmp/test-change-order.pdf', pdfResult2.buffer);
        console.log(`   ✅ Success: ${pdfResult2.buffer.length} bytes, ${pdfResult2.processingTime}ms`);
        console.log(`   📄 Saved to: /tmp/test-change-order.pdf\n`);
        successCount++;
      } else {
        console.log(`   ❌ PDF generation failed: ${pdfResult2.error}\n`);
      }
    } else {
      console.log(`   ❌ HTML generation failed: ${htmlResult2.error}\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err}\n`);
  }
  
  console.log('📋 Test 3: Lien Waiver (Partial - California Statutory)');
  const lienWaiverData = {
    contractor: contractData.contractor,
    client: contractData.client,
    project: {
      ...contractData.project,
      state: 'CA'
    },
    financials: {
      total: 45000
    },
    lienWaiver: {
      waiverType: 'partial',
      paymentAmount: 15000,
      throughDate: '2025-02-15',
      exceptions: 'None'
    }
  };
  
  try {
    const htmlResult3 = await templateService.generateDocument('lien-waiver', lienWaiverData as any, branding);
    if (htmlResult3.success && htmlResult3.html) {
      const pdfResult3 = await nativePdfEngine.generateLienWaiverPdf(htmlResult3.html);
      if (pdfResult3.success && pdfResult3.buffer) {
        fs.writeFileSync('/tmp/test-lien-waiver.pdf', pdfResult3.buffer);
        console.log(`   ✅ Success: ${pdfResult3.buffer.length} bytes, ${pdfResult3.processingTime}ms`);
        console.log(`   📄 Saved to: /tmp/test-lien-waiver.pdf\n`);
        successCount++;
      } else {
        console.log(`   ❌ PDF generation failed: ${pdfResult3.error}\n`);
      }
    } else {
      console.log(`   ❌ HTML generation failed: ${htmlResult3.error}\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err}\n`);
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🎉 Tests completed: ${successCount}/2 native templates working`);
  console.log('');
  console.log('📊 Summary:');
  console.log('   - Change Order: /tmp/test-change-order.pdf');
  console.log('   - Lien Waiver: /tmp/test-lien-waiver.pdf');
  console.log('');
  console.log('📝 Note: Independent Contractor uses legacy flow (HybridContractGenerator)');
  console.log('         Migration to native PDF planned for Phase 2');
}

testAllTemplates().catch(console.error);

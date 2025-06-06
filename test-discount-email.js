/**
 * Test script to verify discount calculation in email estimates
 */

async function testDiscountEmailCalculation() {
  console.log('🧮 Testing discount calculation in email estimates...');
  
  // Test data matching the frontend calculation logic
  const testEstimate = {
    items: [
      { name: 'Material 1', quantity: 10, price: 100, total: 1000 },
      { name: 'Material 2', quantity: 5, price: 200, total: 1000 }
    ],
    subtotal: 2000,
    discountType: 'percentage',
    discountValue: 10,
    discountAmount: 200, // 10% of 2000
    taxRate: 10,
    tax: 180, // 10% of (2000 - 200) = 10% of 1800
    total: 1980 // (2000 - 200) + 180
  };

  // Prepare email data
  const emailData = {
    estimateNumber: 'EST-TEST-001',
    date: new Date().toLocaleDateString('es-ES'),
    client: {
      name: 'Test Client',
      email: 'test@example.com',
      address: 'Test Address',
      phone: '555-0000'
    },
    contractor: {
      companyName: 'Test Company',
      name: 'Test Contractor',
      email: 'contractor@example.com',
      phone: '555-0001'
    },
    project: {
      type: 'Construction',
      description: 'Test Project',
      location: 'Test Location'
    },
    items: testEstimate.items,
    subtotal: testEstimate.subtotal,
    discount: testEstimate.discountAmount,
    discountType: testEstimate.discountType,
    discountValue: testEstimate.discountValue,
    tax: testEstimate.tax,
    taxRate: testEstimate.taxRate,
    total: testEstimate.total,
    notes: 'Test estimate with discount'
  };

  try {
    const response = await fetch('http://localhost:3000/api/estimate-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        toEmail: 'test@example.com',
        fromEmail: 'noreply@owlfenc.com',
        subject: 'Test Discount Calculation',
        estimateData: emailData
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', result);

    // Verify calculation
    console.log('\n📊 Calculation Verification:');
    console.log(`Subtotal: $${testEstimate.subtotal.toFixed(2)}`);
    console.log(`Discount (${testEstimate.discountValue}%): -$${testEstimate.discountAmount.toFixed(2)}`);
    console.log(`After Discount: $${(testEstimate.subtotal - testEstimate.discountAmount).toFixed(2)}`);
    console.log(`Tax (${testEstimate.taxRate}%): $${testEstimate.tax.toFixed(2)}`);
    console.log(`Total: $${testEstimate.total.toFixed(2)}`);

    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  testDiscountEmailCalculation()
    .then(() => console.log('\n✅ Test completed successfully'))
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testDiscountEmailCalculation };
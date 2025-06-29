/**
 * Test completo de los tres botones DeepSearch
 * 
 * - ONLY MATERIALS: Solo materiales sin labor
 * - LABOR COSTS: Solo costos de labor por unidad
 * - FULL COSTS: Materiales + Labor combinados
 */

async function testOnlyMaterials() {
  console.log('\n📦 TESTING ONLY MATERIALS...');
  console.log('='.repeat(50));
  
  try {
    const response = await fetch('http://localhost:3000/api/deepsearch/materials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectDescription: 'Bathroom remodel with new tiles, bathtub replacement, and custom cabinetry',
        location: 'Los Angeles, CA',
        projectType: 'bathroom_remodel'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ ONLY MATERIALS SUCCESS');
      console.log(`Materials Count: ${result.data.materials.length}`);
      console.log(`Labor Count: ${result.data.laborCosts.length} (should be 0)`);
      console.log(`Total Materials: $${result.data.totalMaterialsCost}`);
      console.log(`Total Labor: $${result.data.totalLaborCost} (should be $0)`);
      console.log(`Grand Total: $${result.data.grandTotal}`);
      
      if (result.data.laborCosts.length === 0 && result.data.totalLaborCost === 0) {
        console.log('🎯 VALIDATION PASSED: No labor costs included');
      } else {
        console.log('❌ VALIDATION FAILED: Labor costs found when should be materials only');
      }
    } else {
      console.log('❌ ONLY MATERIALS FAILED:', result.error);
    }
  } catch (error) {
    console.log('❌ ONLY MATERIALS ERROR:', error.message);
  }
}

async function testLaborOnly() {
  console.log('\n🔧 TESTING LABOR COSTS ONLY...');
  console.log('='.repeat(50));
  
  try {
    const response = await fetch('http://localhost:3000/api/labor-deepsearch/labor-only', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectDescription: 'Bathroom remodel with new tiles, bathtub replacement, and custom cabinetry',
        location: 'Los Angeles, CA',
        projectType: 'bathroom_remodel'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ LABOR COSTS ONLY SUCCESS');
      console.log(`Materials Count: ${result.data.materials.length} (should be 0)`);
      console.log(`Labor Count: ${result.data.laborCosts.length}`);
      console.log(`Total Materials: $${result.data.totalMaterialsCost} (should be $0)`);
      console.log(`Total Labor: $${result.data.totalLaborCost}`);
      console.log(`Grand Total: $${result.data.grandTotal}`);
      
      if (result.data.materials.length === 0 && result.data.totalMaterialsCost === 0) {
        console.log('🎯 VALIDATION PASSED: No materials included');
      } else {
        console.log('❌ VALIDATION FAILED: Materials found when should be labor only');
      }
    } else {
      console.log('❌ LABOR COSTS ONLY FAILED:', result.error);
    }
  } catch (error) {
    console.log('❌ LABOR COSTS ONLY ERROR:', error.message);
  }
}

async function testFullCosts() {
  console.log('\n⚡ TESTING FULL COSTS (MATERIALS + LABOR)...');
  console.log('='.repeat(50));
  
  try {
    const response = await fetch('http://localhost:3000/api/labor-deepsearch/combined', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectDescription: 'Bathroom remodel with new tiles, bathtub replacement, and custom cabinetry',
        location: 'Los Angeles, CA',
        includeMaterials: true,
        includeLabor: true,
        projectType: 'bathroom_remodel'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ FULL COSTS SUCCESS');
      console.log(`Materials Count: ${result.data.materials.length}`);
      console.log(`Labor Count: ${result.data.laborCosts.length}`);
      console.log(`Total Materials: $${result.data.totalMaterialsCost}`);
      console.log(`Total Labor: $${result.data.totalLaborCost}`);
      console.log(`Grand Total: $${result.data.grandTotal}`);
      
      if (result.data.materials.length > 0 && result.data.laborCosts.length > 0) {
        console.log('🎯 VALIDATION PASSED: Both materials and labor included');
      } else {
        console.log('❌ VALIDATION FAILED: Missing materials or labor in full analysis');
        console.log(`- Materials found: ${result.data.materials.length > 0}`);
        console.log(`- Labor found: ${result.data.laborCosts.length > 0}`);
      }
    } else {
      console.log('❌ FULL COSTS FAILED:', result.error);
    }
  } catch (error) {
    console.log('❌ FULL COSTS ERROR:', error.message);
  }
}

async function runAllTests() {
  console.log('🧪 TESTING THREE DEEPSEARCH BUTTONS');
  console.log('='.repeat(60));
  console.log('Project: Bathroom remodel with tiles, bathtub, cabinetry');
  console.log('Location: Los Angeles, CA');
  
  await testOnlyMaterials();
  await testLaborOnly();
  await testFullCosts();
  
  console.log('\n🏁 ALL TESTS COMPLETED');
  console.log('='.repeat(60));
}

// Execute the tests
runAllTests().catch(console.error);
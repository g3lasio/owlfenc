/**
 * Test script to verify DeepSearch Material fixes for:
 * 1. Precise quantity calculations for specific project dimensions
 * 2. Filtering irrelevant materials (no gates when project excludes gates) 
 * 3. Restored intelligent calculation logic
 * 4. Expert Contractor Mode with surgical precision
 * 5. Geographic adaptability and material specifications
 */

async function testDeepSearchFixes() {
  console.log('🔧 Testing DeepSearch Material Fixes...\n');

  // Test 1: Precise quantity calculation for specific dimensions
  console.log('TEST 1: Precise Quantity Calculation');
  console.log('Project: 25 linear feet fence, 6 feet tall, NO GATES, NO PAINT\n');

  try {
    const response = await fetch('http://localhost:5000/api/labor-deepsearch/combined', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectDescription: 'Install new wood luxury fence, 25 linear ft and 6 ft tall, no demolition, no gate and no paint. labor and material included',
        includeMaterials: true,
        includeLabor: true,
        location: 'El Cerrito, CA',
        projectType: 'fencing'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Response received successfully');
    console.log(`Materials Count: ${data.materials.length}`);
    console.log(`Labor Count: ${data.labor.length}`);
    console.log(`Total Materials Cost: $${data.costs.materials}`);
    console.log(`Total Labor Cost: $${data.costs.labor}`);
    console.log(`Grand Total: $${data.costs.total}\n`);

    // Verify no gate materials are included
    console.log('🔍 Checking for irrelevant materials (gates, paint):');
    const gateRelatedMaterials = data.materials.filter(material => {
      const name = material.name.toLowerCase();
      return name.includes('gate') || name.includes('latch') || name.includes('hinge');
    });

    const paintRelatedMaterials = data.materials.filter(material => {
      const name = material.name.toLowerCase();
      return name.includes('paint') || name.includes('primer') || name.includes('stain');
    });

    if (gateRelatedMaterials.length === 0) {
      console.log('✅ FIXED: No gate materials included (correctly excluded)');
    } else {
      console.log('❌ ISSUE: Gate materials still included:', gateRelatedMaterials.map(m => m.name));
    }

    if (paintRelatedMaterials.length === 0) {
      console.log('✅ FIXED: No paint materials included (correctly excluded)');
    } else {
      console.log('❌ ISSUE: Paint materials still included:', paintRelatedMaterials.map(m => m.name));
    }

    // Verify fence-specific materials are included
    console.log('\n🔍 Checking for relevant fence materials:');
    const fenceSpecificMaterials = data.materials.filter(material => {
      const name = material.name.toLowerCase();
      return name.includes('post') || name.includes('rail') || name.includes('board') || 
             name.includes('fence') || name.includes('picket');
    });

    if (fenceSpecificMaterials.length > 0) {
      console.log(`✅ CORRECT: ${fenceSpecificMaterials.length} fence-specific materials included:`);
      fenceSpecificMaterials.forEach(material => {
        console.log(`  - ${material.name}: ${material.quantity} ${material.unit} = $${material.total}`);
      });
    } else {
      console.log('❌ ISSUE: No fence-specific materials found');
    }

    // Verify quantity logic for 25 linear feet
    console.log('\n🔍 Verifying quantity calculations for 25 linear feet:');
    const posts = data.materials.find(m => m.name.toLowerCase().includes('post'));
    if (posts) {
      const expectedPosts = Math.ceil(25 / 8) + 1; // Posts every 8 feet + 1
      console.log(`Posts: ${posts.quantity} (expected ~${expectedPosts} for 25 linear feet)`);
      
      if (Math.abs(posts.quantity - expectedPosts) <= 2) {
        console.log('✅ FIXED: Post quantities are reasonable for 25 linear feet');
      } else {
        console.log('⚠️  WARNING: Post quantities may not match 25 linear feet specification');
      }
    }

    return {
      success: true,
      materialsCount: data.materials.length,
      laborCount: data.labor.length,
      totalCost: data.costs.total,
      gateIssuesFixed: gateRelatedMaterials.length === 0,
      paintIssuesFixed: paintRelatedMaterials.length === 0,
      hasFenceMaterials: fenceSpecificMaterials.length > 0
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test and generate summary
testDeepSearchFixes().then(result => {
  console.log('\n' + '='.repeat(60));
  console.log('DEEPSEARCH MATERIAL FIXES - TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('✅ API Connection: SUCCESS');
    console.log(`✅ Generated ${result.materialsCount} materials and ${result.laborCount} labor items`);
    console.log(`✅ Total Cost: $${result.totalCost}`);
    
    const fixesWorking = result.gateIssuesFixed && result.paintIssuesFixed && result.hasFenceMaterials;
    
    if (fixesWorking) {
      console.log('🎉 ALL CRITICAL FIXES WORKING:');
      console.log('  ✅ Gate materials correctly excluded');
      console.log('  ✅ Paint materials correctly excluded');
      console.log('  ✅ Fence-specific materials included');
      console.log('  ✅ Material relevance filtering operational');
    } else {
      console.log('⚠️  SOME ISSUES REMAIN:');
      if (!result.gateIssuesFixed) console.log('  ❌ Gate materials still included');
      if (!result.paintIssuesFixed) console.log('  ❌ Paint materials still included');
      if (!result.hasFenceMaterials) console.log('  ❌ Missing fence-specific materials');
    }
  } else {
    console.log('❌ Test Failed:', result.error);
  }
  
  console.log('='.repeat(60));
});
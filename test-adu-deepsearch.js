/**
 * Test script para verificar el nuevo sistema ADU DeepSearch especializado
 */

async function testADUDeepSearch() {
  console.log('🏗️ TESTING ADU SPECIALIZED DEEPSEARCH SYSTEM');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: 'ADU 1200 sqft Construction',
      description: 'This project entails the construction of a new auxiliary dwelling unit (ADU) in Sacramento, encompassing a total area of 1,200 square feet. The structure will include a compact kitchen, a bathroom, and a small living area.',
      location: 'Sacramento, CA',
      shouldTriggerADU: true
    },
    {
      name: 'New Construction Dwelling',
      description: 'New building construction for 1000 square feet dwelling unit with modern finishes',
      location: 'Los Angeles, CA', 
      shouldTriggerADU: true
    },
    {
      name: 'Regular Fence Project',
      description: 'Install 100 linear feet of wood fence, 6 feet tall',
      location: 'San Diego, CA',
      shouldTriggerADU: false
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 TESTING: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    try {
      const response = await fetch('http://localhost:3000/api/labor-deepsearch/combined', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectDescription: testCase.description,
          includeMaterials: true,
          includeLabor: true,
          location: testCase.location,
          projectType: 'construction'
        })
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText.substring(0, 200)}...`);
        continue;
      }

      const result = await response.json();
      
      console.log(`✅ Success: ${result.success}`);
      console.log(`🎯 Specialization: ${result.specialization || 'Standard Service'}`);
      console.log(`📊 Search Type: ${result.searchType}`);
      
      if (result.data) {
        console.log(`📦 Materials Count: ${result.data.materials?.length || 0}`);
        console.log(`🔧 Labor Tasks Count: ${result.data.laborCosts?.length || 0}`);
        console.log(`💰 Total Cost: $${result.data.grandTotal?.toLocaleString() || 0}`);
        console.log(`🎯 Confidence: ${result.data.confidence || 'N/A'}`);
        
        if (result.data.recommendations?.length > 0) {
          console.log(`💡 First Recommendation: ${result.data.recommendations[0]}`);
        }
      }

      // Verify ADU detection
      const isADUDetected = result.specialization === 'ADU Construction Expert';
      if (testCase.shouldTriggerADU && !isADUDetected) {
        console.warn(`⚠️  WARNING: Expected ADU detection but got standard service`);
      } else if (!testCase.shouldTriggerADU && isADUDetected) {
        console.warn(`⚠️  WARNING: Unexpected ADU detection for non-ADU project`);
      } else {
        console.log(`✅ ADU Detection: ${isADUDetected ? 'CORRECT (ADU Specialized)' : 'CORRECT (Standard Service)'}`);
      }

    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      if (error.name === 'AbortError') {
        console.log('   This may be normal for large construction projects');
      }
    }
  }

  console.log('\n🏁 ADU DEEPSEARCH TESTING COMPLETED');
  console.log('='.repeat(60));
}

// Run the test
testADUDeepSearch().catch(console.error);
/**
 * Test comprehensivo para verificar las capacidades multi-industria del DeepSearch
 * Evalúa la precisión y cobertura en múltiples industrias de construcción
 */

async function testMultiIndustryCapabilities() {
  console.log('🏗️ Testing Multi-Industry DeepSearch Capabilities...\n');

  const testCases = [
    {
      name: 'Fencing Project (Original Specialty)',
      data: {
        projectDescription: '50 linear feet privacy fence, 6 feet tall, cedar boards, no gates',
        location: 'El Cerrito, CA',
        includeMaterials: true,
        includeLabor: true,
        projectType: 'fencing'
      },
      expectedIndustries: ['fencing'],
      minMaterials: 3
    },
    {
      name: 'Flooring Project (New Industry)',
      data: {
        projectDescription: 'Install 200 square feet laminate flooring in living room, remove old carpet',
        location: 'San Ramon, CA',
        includeMaterials: true,
        includeLabor: true,
        projectType: 'flooring'
      },
      expectedIndustries: ['flooring'],
      minMaterials: 3
    },
    {
      name: 'Roofing Project (New Industry)',
      data: {
        projectDescription: 'Replace roof shingles on 1200 square foot house, includes underlayment',
        location: 'Los Angeles, CA',
        includeMaterials: true,
        includeLabor: true,
        projectType: 'roofing'
      },
      expectedIndustries: ['roofing'],
      minMaterials: 3
    },
    {
      name: 'Painting Project (New Industry)',
      data: {
        projectDescription: 'Paint interior walls of 800 square foot apartment, 2 coats',
        location: 'San Francisco, CA',
        includeMaterials: true,
        includeLabor: true,
        projectType: 'painting'
      },
      expectedIndustries: ['painting'],
      minMaterials: 2
    },
    {
      name: 'Concrete Project (New Industry)',
      data: {
        projectDescription: 'Pour concrete patio 12 feet by 16 feet, 4 inches deep',
        location: 'Sacramento, CA',
        includeMaterials: true,
        includeLabor: true,
        projectType: 'concrete'
      },
      expectedIndustries: ['concrete'],
      minMaterials: 2
    },
    {
      name: 'Multi-Industry Project (Complex)',
      data: {
        projectDescription: 'Bathroom remodel: new tile flooring, plumbing fixtures, electrical outlets, and paint walls',
        location: 'San Jose, CA',
        includeMaterials: true,
        includeLabor: true,
        projectType: 'remodel'
      },
      expectedIndustries: ['flooring', 'plumbing', 'electrical', 'painting'],
      minMaterials: 5
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n=== ${testCase.name} ===`);
    console.log('Description:', testCase.data.projectDescription);
    console.log('Expected Industries:', testCase.expectedIndustries.join(', '));
    
    try {
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:5000/api/labor-deepsearch/combined', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.data)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ HTTP Error ${response.status}:`, errorText);
        results.push({
          name: testCase.name,
          success: false,
          error: `HTTP ${response.status}`,
          responseTime
        });
        continue;
      }

      const result = await response.json();
      
      if (result.success) {
        const materialCount = result.data.materials?.length || 0;
        const laborCount = result.data.laborCosts?.length || 0;
        const totalCost = result.data.grandTotal || 0;
        
        // Análisis de industrias detectadas
        const detectedIndustries = [];
        if (result.data.materials) {
          result.data.materials.forEach(material => {
            if (material.industry && !detectedIndustries.includes(material.industry)) {
              detectedIndustries.push(material.industry);
            }
          });
        }
        
        const industryMatch = testCase.expectedIndustries.some(expected => 
          detectedIndustries.includes(expected)
        );
        
        const materialsSufficient = materialCount >= testCase.minMaterials;
        
        console.log('✅ Success!');
        console.log(`📦 Materials: ${materialCount} items`);
        console.log(`👷 Labor: ${laborCount} tasks`);
        console.log(`💰 Total Cost: $${totalCost.toFixed(2)}`);
        console.log(`🏭 Industries Detected: ${detectedIndustries.join(', ') || 'General'}`);
        console.log(`⏱️ Response Time: ${responseTime}ms`);
        console.log(`🎯 Industry Match: ${industryMatch ? '✅' : '❌'}`);
        console.log(`📊 Material Coverage: ${materialsSufficient ? '✅' : '❌'}`);
        
        if (result.data.materials && materialCount > 0) {
          console.log('\n🔧 Sample Materials:');
          result.data.materials.slice(0, 3).forEach((material, index) => {
            console.log(`  ${index + 1}. ${material.name}`);
            console.log(`     Quantity: ${material.quantity} ${material.unit}`);
            console.log(`     Price: $${material.unitPrice} each = $${material.totalPrice.toFixed(2)}`);
            if (material.industry) console.log(`     Industry: ${material.industry}`);
          });
        }
        
        results.push({
          name: testCase.name,
          success: true,
          materialCount,
          laborCount,
          totalCost,
          detectedIndustries,
          industryMatch,
          materialsSufficient,
          responseTime,
          source: result.data.source || 'Unknown'
        });
        
      } else {
        console.log('❌ Failed:', result.error);
        results.push({
          name: testCase.name,
          success: false,
          error: result.error,
          responseTime
        });
      }
      
    } catch (error) {
      console.log('❌ Network/Parse Error:', error.message);
      results.push({
        name: testCase.name,
        success: false,
        error: error.message,
        responseTime: 0
      });
    }
  }
  
  // Generar reporte final
  console.log('\n' + '='.repeat(80));
  console.log('📊 MULTI-INDUSTRY DEEPSEARCH ANALYSIS REPORT');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n📈 OVERALL PERFORMANCE:`);
  console.log(`✅ Successful Tests: ${successful.length}/${results.length} (${(successful.length/results.length*100).toFixed(1)}%)`);
  console.log(`❌ Failed Tests: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
    const avgMaterials = successful.reduce((sum, r) => sum + (r.materialCount || 0), 0) / successful.length;
    const totalCostRange = {
      min: Math.min(...successful.map(r => r.totalCost || 0)),
      max: Math.max(...successful.map(r => r.totalCost || 0))
    };
    
    console.log(`⏱️ Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`📦 Average Materials per Project: ${avgMaterials.toFixed(1)}`);
    console.log(`💰 Cost Range: $${totalCostRange.min.toFixed(2)} - $${totalCostRange.max.toFixed(2)}`);
  }
  
  console.log(`\n🏭 INDUSTRY COVERAGE ANALYSIS:`);
  const allDetectedIndustries = [...new Set(successful.flatMap(r => r.detectedIndustries || []))];
  console.log(`Industries Successfully Handled: ${allDetectedIndustries.join(', ')}`);
  
  const industryMatchRate = successful.filter(r => r.industryMatch).length / successful.length * 100;
  console.log(`🎯 Industry Detection Accuracy: ${industryMatchRate.toFixed(1)}%`);
  
  const materialCoverageRate = successful.filter(r => r.materialsSufficient).length / successful.length * 100;
  console.log(`📊 Material Coverage Rate: ${materialCoverageRate.toFixed(1)}%`);
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    failed.forEach(result => {
      console.log(`  - ${result.name}: ${result.error}`);
    });
  }
  
  console.log('\n🔍 DETAILED RESULTS:');
  successful.forEach(result => {
    console.log(`\n${result.name}:`);
    console.log(`  Materials: ${result.materialCount}, Labor: ${result.laborCount}`);
    console.log(`  Cost: $${result.totalCost?.toFixed(2)}, Response: ${result.responseTime}ms`);
    console.log(`  Industries: ${result.detectedIndustries?.join(', ') || 'None'}`);
    console.log(`  Source: ${result.source}`);
  });
  
  return results;
}

testMultiIndustryCapabilities().catch(console.error);
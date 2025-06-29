/**
 * Test completo para verificar DeepSearch Material funcionando correctamente
 * Prueba tanto el parsing JSON mejorado como el sistema de fallback
 */

async function testDeepSearchComplete() {
  console.log('🔧 Testing Complete DeepSearch Fix...\n');

  const testCases = [
    {
      name: 'Flooring Project - JSON Parsing Test',
      data: {
        projectDescription: 'Install new laminate flooring, 100 square feet, remove existing hardwood',
        location: 'San Ramon, CA',
        includeMaterials: true,
        includeLabor: true,
        projectType: 'flooring'
      },
      expectedMaterials: 5
    },
    {
      name: 'Fencing Project - Expert Mode Test',
      data: {
        projectDescription: '25 linear feet fence, 6 feet tall, no gates, luxury cedar',
        location: 'El Cerrito, CA',
        includeMaterials: true,
        includeLabor: true,
        projectType: 'fencing'
      },
      expectedMaterials: 4
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n=== ${testCase.name} ===`);
    console.log('Project:', testCase.data.projectDescription);
    
    try {
      const response = await fetch('http://localhost:5000/api/labor-deepsearch/combined', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ HTTP Error:', response.status, errorText);
        continue;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Success!');
        console.log(`Materials: ${result.data.materials?.length || 0} items`);
        console.log(`Labor: ${result.data.laborCosts?.length || 0} items`);
        console.log(`Total Cost: $${result.data.grandTotal?.toFixed(2) || '0.00'}`);
        
        if (result.data.materials && result.data.materials.length > 0) {
          console.log('\nMaterials Found:');
          result.data.materials.slice(0, 3).forEach((material, index) => {
            console.log(`  ${index + 1}. ${material.name} - ${material.quantity} ${material.unit}`);
          });
        }
        
        if (result.data.source) {
          console.log(`Source: ${result.data.source}`);
        }
        
        if (result.data.warnings && result.data.warnings.length > 0) {
          console.log('Warnings:', result.data.warnings[0]);
        }
        
      } else {
        console.log('❌ Failed:', result.error);
      }
      
    } catch (error) {
      console.log('❌ Network/Parse Error:', error.message);
    }
  }
}

testDeepSearchComplete().catch(console.error);
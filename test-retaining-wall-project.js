/**
 * Test específico para proyecto de muro contenedor de bloques de concreto
 * Verificando capacidades del DeepSearch multi-industria
 */

async function testRetainingWallProject() {
  console.log('🧱 Testing Retaining Wall Project with DeepSearch...\n');

  const retainingWallProject = {
    projectDescription: 'Construcción de muro contenedor de 100 pies lineales y 3 pies de altura usando bloques de concreto',
    location: 'Los Angeles, CA',
    includeMaterials: true,
    includeLabor: true,
    projectType: 'retaining_wall'
  };

  console.log('📋 PROJECT DETAILS:');
  console.log(`Description: ${retainingWallProject.projectDescription}`);
  console.log(`Location: ${retainingWallProject.location}`);
  console.log(`Type: ${retainingWallProject.projectType}`);
  console.log(`Expected Materials: Concrete blocks, rebar, gravel, drainage pipe`);
  console.log(`Expected Calculations: Block count, foundation requirements, drainage`);

  try {
    const startTime = Date.now();
    
    console.log('\n🚀 Sending request to DeepSearch API...');
    
    const response = await fetch('http://localhost:5000/api/labor-deepsearch/combined', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(retainingWallProject)
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`⏱️ Response received in ${responseTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ HTTP Error ${response.status}:`, errorText);
      return;
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      console.log('\n✅ DEEPSEARCH ANALYSIS SUCCESSFUL!');
      console.log('='.repeat(60));
      
      // Información general
      const materialCount = result.data.materials?.length || 0;
      const laborCount = result.data.laborCosts?.length || 0;
      const totalCost = result.data.grandTotal || 0;
      
      console.log(`\n📊 SUMMARY STATISTICS:`);
      console.log(`Materials Generated: ${materialCount} items`);
      console.log(`Labor Tasks: ${laborCount} items`);
      console.log(`Total Project Cost: $${totalCost.toFixed(2)}`);
      console.log(`Response Time: ${responseTime}ms`);
      
      if (result.data.source) {
        console.log(`Data Source: ${result.data.source}`);
      }
      
      // Análisis de materiales
      if (result.data.materials && materialCount > 0) {
        console.log(`\n🧱 DETAILED MATERIALS ANALYSIS:`);
        console.log('-'.repeat(60));
        
        let totalMaterialsCost = 0;
        const materialsByCategory = {};
        
        result.data.materials.forEach((material, index) => {
          const category = material.category || 'general';
          if (!materialsByCategory[category]) {
            materialsByCategory[category] = [];
          }
          materialsByCategory[category].push(material);
          totalMaterialsCost += material.totalPrice || 0;
          
          console.log(`\n${index + 1}. ${material.name}`);
          console.log(`   Quantity: ${material.quantity} ${material.unit}`);
          console.log(`   Unit Price: $${material.unitPrice?.toFixed(2)}`);
          console.log(`   Total Price: $${material.totalPrice?.toFixed(2)}`);
          
          if (material.description) {
            console.log(`   Description: ${material.description}`);
          }
          
          if (material.specifications) {
            console.log(`   Specifications: ${material.specifications}`);
          }
          
          if (material.industry) {
            console.log(`   Industry: ${material.industry}`);
          }
          
          if (material.calculationMethod) {
            console.log(`   Calculation: ${material.calculationMethod}`);
          }
        });
        
        console.log(`\n💰 Materials Subtotal: $${totalMaterialsCost.toFixed(2)}`);
        
        // Análisis por categorías
        console.log(`\n📦 MATERIALS BY CATEGORY:`);
        Object.keys(materialsByCategory).forEach(category => {
          const items = materialsByCategory[category];
          const categoryTotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
          console.log(`${category}: ${items.length} items - $${categoryTotal.toFixed(2)}`);
        });
      }
      
      // Análisis de labor
      if (result.data.laborCosts && laborCount > 0) {
        console.log(`\n👷 LABOR ANALYSIS:`);
        console.log('-'.repeat(60));
        
        let totalLaborCost = 0;
        result.data.laborCosts.forEach((labor, index) => {
          totalLaborCost += labor.total || 0;
          
          console.log(`\n${index + 1}. ${labor.description || labor.category}`);
          console.log(`   Hours: ${labor.hours}`);
          console.log(`   Rate: $${labor.rate?.toFixed(2)}/hour`);
          console.log(`   Total: $${labor.total?.toFixed(2)}`);
          
          if (labor.skillLevel) {
            console.log(`   Skill Level: ${labor.skillLevel}`);
          }
        });
        
        console.log(`\n💰 Labor Subtotal: $${totalLaborCost.toFixed(2)}`);
      }
      
      // Verificaciones específicas para muro contenedor
      console.log(`\n🔍 RETAINING WALL SPECIFIC ANALYSIS:`);
      console.log('-'.repeat(60));
      
      const hasConcreteBlocks = result.data.materials?.some(m => 
        m.name.toLowerCase().includes('block') || 
        m.name.toLowerCase().includes('concrete')
      );
      
      const hasRebar = result.data.materials?.some(m => 
        m.name.toLowerCase().includes('rebar') || 
        m.name.toLowerCase().includes('reinforcement')
      );
      
      const hasFoundation = result.data.materials?.some(m => 
        m.name.toLowerCase().includes('foundation') || 
        m.name.toLowerCase().includes('footing') ||
        m.name.toLowerCase().includes('gravel')
      );
      
      const hasDrainage = result.data.materials?.some(m => 
        m.name.toLowerCase().includes('drain') || 
        m.name.toLowerCase().includes('pipe')
      );
      
      console.log(`Concrete Blocks: ${hasConcreteBlocks ? '✅ Found' : '❌ Missing'}`);
      console.log(`Reinforcement (Rebar): ${hasRebar ? '✅ Found' : '❌ Missing'}`);
      console.log(`Foundation Materials: ${hasFoundation ? '✅ Found' : '❌ Missing'}`);
      console.log(`Drainage System: ${hasDrainage ? '✅ Found' : '❌ Missing'}`);
      
      // Cálculos esperados para validación
      const expectedBlocks = Math.ceil((100 * 3) / 1.33); // Aproximadamente 225 bloques para 100 ft x 3 ft
      console.log(`\n📐 EXPECTED CALCULATIONS (for validation):`);
      console.log(`Expected concrete blocks: ~${expectedBlocks} units`);
      console.log(`Expected linear feet of rebar: ~${100 * 2} ft`);
      console.log(`Expected cubic yards of gravel: ~${(100 * 1 * 0.5) / 27} yards`);
      
      // Warnings y recommendations
      if (result.data.warnings && result.data.warnings.length > 0) {
        console.log(`\n⚠️ WARNINGS:`);
        result.data.warnings.forEach(warning => {
          console.log(`- ${warning}`);
        });
      }
      
      if (result.data.recommendations && result.data.recommendations.length > 0) {
        console.log(`\n💡 RECOMMENDATIONS:`);
        result.data.recommendations.forEach(rec => {
          console.log(`- ${rec}`);
        });
      }
      
      // Evaluación de completitud
      console.log(`\n🎯 COMPLETENESS EVALUATION:`);
      console.log('-'.repeat(60));
      
      const completeness = {
        materials: materialCount >= 4 ? 'Good' : materialCount >= 2 ? 'Fair' : 'Poor',
        cost: totalCost > 1000 ? 'Realistic' : 'Low',
        specificity: hasConcreteBlocks && hasRebar ? 'Good' : 'Needs Improvement'
      };
      
      console.log(`Material Coverage: ${completeness.materials} (${materialCount} items)`);
      console.log(`Cost Estimation: ${completeness.cost} ($${totalCost.toFixed(2)})`);
      console.log(`Project Specificity: ${completeness.specificity}`);
      
      console.log('\n✅ RETAINING WALL PROJECT ANALYSIS COMPLETED');
      
    } else {
      console.log('❌ Analysis Failed:', result.error || 'Invalid server response');
    }
    
  } catch (error) {
    console.log('❌ Network/Parse Error:', error.message);
  }
}

testRetainingWallProject().catch(console.error);
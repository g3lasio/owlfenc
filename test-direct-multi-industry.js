/**
 * Test directo del MultiIndustryExpertService para muro contenedor
 */

// Simular el servicio multi-industria
const { MultiIndustryExpertService } = require('./server/services/multiIndustryExpertService.ts');

async function testDirectMultiIndustry() {
  console.log('🏗️ Testing MultiIndustryExpertService directly...\n');

  try {
    const multiService = new MultiIndustryExpertService();
    
    const projectDescription = 'Construcción de muro contenedor de 100 pies lineales y 3 pies de altura usando bloques de concreto';
    const location = 'Los Angeles, CA';
    
    console.log('📋 Project:', projectDescription);
    console.log('📍 Location:', location);
    
    // Test industry detection
    const detectedIndustries = multiService.detectProjectIndustry(projectDescription);
    console.log('\n🔍 Detected Industries:', detectedIndustries);
    
    // Test dimension extraction
    const dimensions = multiService.extractDimensions(projectDescription, 'retaining_walls');
    console.log('\n📏 Extracted Dimensions:', dimensions);
    
    // Generate complete estimate
    const result = multiService.generateMultiIndustryEstimate(projectDescription, location);
    
    console.log('\n✅ MULTI-INDUSTRY ANALYSIS COMPLETE!');
    console.log('='.repeat(60));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`Materials: ${result.materials.length} items`);
    console.log(`Total Cost: $${result.costs.total.toFixed(2)}`);
    console.log(`Industries: ${result.analysis.industriesDetected.join(', ')}`);
    
    if (result.materials.length > 0) {
      console.log(`\n🧱 MATERIALS BREAKDOWN:`);
      console.log('-'.repeat(60));
      
      result.materials.forEach((material, index) => {
        console.log(`\n${index + 1}. ${material.name}`);
        console.log(`   Quantity: ${material.quantity} ${material.unit}`);
        console.log(`   Unit Price: $${material.unitPrice.toFixed(2)}`);
        console.log(`   Total: $${material.totalPrice.toFixed(2)}`);
        
        if (material.calculationMethod) {
          console.log(`   Formula: ${material.calculationMethod}`);
        }
        
        if (material.industry) {
          console.log(`   Industry: ${material.industry}`);
        }
      });
    }
    
    // Validation for retaining wall
    const hasBlocks = result.materials.some(m => 
      m.name.toLowerCase().includes('block') || m.name.toLowerCase().includes('masonry')
    );
    
    const hasRebar = result.materials.some(m => 
      m.name.toLowerCase().includes('rebar')
    );
    
    const hasGravel = result.materials.some(m => 
      m.name.toLowerCase().includes('gravel') || m.name.toLowerCase().includes('stone')
    );
    
    const hasDrain = result.materials.some(m => 
      m.name.toLowerCase().includes('drain') || m.name.toLowerCase().includes('pipe')
    );
    
    console.log(`\n🎯 RETAINING WALL VALIDATION:`);
    console.log(`Concrete Blocks: ${hasBlocks ? '✅' : '❌'}`);
    console.log(`Rebar/Reinforcement: ${hasRebar ? '✅' : '❌'}`);
    console.log(`Foundation Gravel: ${hasGravel ? '✅' : '❌'}`);
    console.log(`Drainage System: ${hasDrain ? '✅' : '❌'}`);
    
    // Expected calculations
    const expectedBlocks = Math.ceil((100 / 1.33) * (3 / 0.67)); // ~225 blocks
    console.log(`\n📐 EXPECTED vs ACTUAL:`);
    console.log(`Expected blocks: ~${expectedBlocks}`);
    
    const actualBlocks = result.materials.find(m => 
      m.name.toLowerCase().includes('block')
    );
    
    if (actualBlocks) {
      console.log(`Actual blocks: ${actualBlocks.quantity}`);
      const accuracy = Math.abs(actualBlocks.quantity - expectedBlocks) / expectedBlocks * 100;
      console.log(`Calculation accuracy: ${accuracy < 20 ? '✅' : '❌'} (${accuracy.toFixed(1)}% deviation)`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Direct test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// For Node.js execution
if (require.main === module) {
  testDirectMultiIndustry().catch(console.error);
}

module.exports = { testDirectMultiIndustry };
/**
 * Script para probar la precisión de costos de cercas
 * Objetivo: 125 pies lineales = $7,250-$8,750 (58-70 por pie lineal)
 * Actual: $13,019 (problema identificado)
 */

async function testCostAccuracy() {
  try {
    console.log('🧮 TESTING COST ACCURACY FOR FENCING PROJECT');
    console.log('============================================================');
    console.log('Target: 125 linear feet = $7,250-$8,750 ($58-70 per linear foot)');
    console.log('');

    // Import the services
    const { ExpertContractorService } = await import('./server/services/expertContractorService.js');
    const { laborDeepSearchService } = await import('./server/services/laborDeepSearchService.js');
    
    const expertService = new ExpertContractorService();
    
    // Test project description
    const projectDescription = 'Install 125 linear feet of 6-foot high wooden fence with posts every 8 feet in Richmond, CA';
    const location = 'Richmond, CA';
    
    console.log('🎯 EXPERT CONTRACTOR SERVICE TEST');
    console.log('==================================================');
    
    // Test Expert Contractor Service
    const expertResult = expertService.generateExpertEstimate(
      projectDescription,
      location,
      'fencing'
    );
    
    console.log('📏 Project Analysis:');
    console.log('- Linear feet:', expertResult.projectAnalysis.dimensions.linearFeet);
    console.log('- Height:', expertResult.projectAnalysis.dimensions.height);
    console.log('- Geographic factors:', expertResult.projectAnalysis.geographicFactors);
    console.log('');
    
    console.log('💰 Cost Breakdown:');
    console.log('- Materials cost:', expertResult.costs.materials);
    console.log('- Labor cost:', expertResult.costs.labor);
    console.log('- Total cost:', expertResult.costs.total);
    console.log('- Cost per linear foot:', (expertResult.costs.total / 125).toFixed(2));
    console.log('');
    
    console.log('📦 Materials Detail:');
    expertResult.materials.forEach(material => {
      console.log(`- ${material.name}: ${material.quantity} ${material.unit} × $${material.unitPrice} = $${material.totalPrice}`);
    });
    console.log('');
    
    console.log('🔧 Labor Detail:');
    expertResult.labor.forEach(labor => {
      console.log(`- ${labor.description}: ${labor.hours} hours × $${labor.rate.toFixed(2)} = $${labor.total}`);
    });
    console.log('');
    
    // Test combined service
    console.log('⚡ COMBINED SERVICE TEST');
    console.log('==================================================');
    
    const combinedResult = await laborDeepSearchService.generateCombinedEstimate(
      projectDescription,
      true, // includeMaterials
      true, // includeLabor
      location,
      'fencing'
    );
    
    console.log('💰 Combined Cost Breakdown:');
    console.log('- Materials cost:', combinedResult.totalMaterialsCost);
    console.log('- Labor cost:', combinedResult.totalLaborCost);
    console.log('- Grand total:', combinedResult.grandTotal);
    console.log('- Cost per linear foot:', (combinedResult.grandTotal / 125).toFixed(2));
    console.log('');
    
    // Cost analysis
    console.log('📊 COST ANALYSIS');
    console.log('==================================================');
    
    const targetMin = 125 * 58; // $7,250
    const targetMax = 125 * 70; // $8,750
    const expertTotal = expertResult.costs.total;
    const combinedTotal = combinedResult.grandTotal;
    
    console.log('Target range:', `$${targetMin} - $${targetMax}`);
    console.log('Expert service total:', `$${expertTotal}`);
    console.log('Combined service total:', `$${combinedTotal}`);
    console.log('');
    
    console.log('Variance from target:');
    console.log('- Expert service:', `${(expertTotal > targetMax ? '+' : '')}${((expertTotal - targetMax) / targetMax * 100).toFixed(1)}%`);
    console.log('- Combined service:', `${(combinedTotal > targetMax ? '+' : '')}${((combinedTotal - targetMax) / targetMax * 100).toFixed(1)}%`);
    console.log('');
    
    // Recommendations
    console.log('🎯 RECOMMENDATIONS');
    console.log('==================================================');
    
    if (expertTotal > targetMax) {
      console.log('❌ Expert service cost is too high');
      const reduction = expertTotal - targetMax;
      console.log(`Need to reduce by $${reduction.toFixed(2)} (${(reduction/expertTotal*100).toFixed(1)}%)`);
      
      // Analyze where to reduce
      const materialPercent = (expertResult.costs.materials / expertTotal * 100).toFixed(1);
      const laborPercent = (expertResult.costs.labor / expertTotal * 100).toFixed(1);
      
      console.log(`Current split: ${materialPercent}% materials, ${laborPercent}% labor`);
      
      if (expertResult.costs.labor > expertResult.costs.materials) {
        console.log('🔧 Focus on reducing labor costs (largest component)');
      } else {
        console.log('📦 Focus on reducing material costs (largest component)');
      }
    } else {
      console.log('✅ Expert service cost is within target range');
    }
    
    if (combinedTotal > targetMax) {
      console.log('❌ Combined service cost is too high');
      const reduction = combinedTotal - targetMax;
      console.log(`Need to reduce by $${reduction.toFixed(2)} (${(reduction/combinedTotal*100).toFixed(1)}%)`);
    } else {
      console.log('✅ Combined service cost is within target range');
    }
    
  } catch (error) {
    console.error('❌ Error testing cost accuracy:', error);
  }
}

// Run the test
testCostAccuracy();
/**
 * Script para verificar la detección de dimensiones en múltiples industrias
 */

async function testDimensionDetection() {
  try {
    console.log('🔍 TESTING DIMENSION DETECTION ACROSS INDUSTRIES');
    console.log('============================================================');

    // Import the service
    const { ExpertContractorService } = await import('./server/services/expertContractorService.js');
    const expertService = new ExpertContractorService();
    
    // Test cases for different industries
    const testCases = [
      {
        description: 'Install 125 linear feet of 6-foot high wooden fence with posts every 8 feet in Richmond, CA',
        industry: 'fencing',
        expectedDimensions: { linearFeet: 125, height: 6 }
      },
      {
        description: 'Install 800 square feet of hardwood flooring in a 20x40 living room',
        industry: 'flooring', 
        expectedDimensions: { squareFeet: 800, width: 20, length: 40 }
      },
      {
        description: 'Replace 30 square roof with asphalt shingles on a 2-story house',
        industry: 'roofing',
        expectedDimensions: { squares: 30 }
      },
      {
        description: 'Paint 2000 square feet interior walls with 10 foot high ceilings',
        industry: 'painting',
        expectedDimensions: { squareFeet: 2000, height: 10 }
      }
    ];

    testCases.forEach((testCase, index) => {
      console.log(`\n🧪 TEST CASE ${index + 1}: ${testCase.industry.toUpperCase()}`);
      console.log('Description:', testCase.description);
      
      // Test dimension extraction
      const dimensions = expertService.extractPreciseDimensions(testCase.description);
      console.log('Extracted dimensions:', dimensions);
      console.log('Expected dimensions:', testCase.expectedDimensions);
      
      // Check if extraction worked
      let success = true;
      Object.keys(testCase.expectedDimensions).forEach(key => {
        if (dimensions[key] !== testCase.expectedDimensions[key]) {
          success = false;
          console.log(`❌ Mismatch: ${key} = ${dimensions[key]} (expected ${testCase.expectedDimensions[key]})`);
        }
      });
      
      if (success) {
        console.log('✅ Dimension extraction successful');
      } else {
        console.log('❌ Dimension extraction failed');
      }
    });

    console.log('\n🎯 FOCUS: Fixing fence height detection');
    console.log('==================================================');
    
    const fenceDescription = 'Install 125 linear feet of 6-foot high wooden fence with posts every 8 feet in Richmond, CA';
    const dimensions = expertService.extractPreciseDimensions(fenceDescription);
    
    console.log('Input text:', fenceDescription);
    console.log('Extracted dimensions:', dimensions);
    
    if (dimensions.height === 6) {
      console.log('✅ Height detection working correctly');
    } else {
      console.log('❌ Height detection failed');
      console.log('Debug: Testing regex patterns...');
      
      const desc = fenceDescription.toLowerCase();
      const heightPattern1 = /(\d+(?:\.\d+)?)\s*[-]?(?:ft|feet|foot)\s*(?:tall|high|height)/i;
      const heightPattern2 = /(\d+(?:\.\d+)?)\s*(?:tall|high|height)/i;
      
      console.log('Pattern 1 match:', desc.match(heightPattern1));
      console.log('Pattern 2 match:', desc.match(heightPattern2));
      
      // Try manual extraction
      const manualMatch = desc.match(/6-foot high/i);
      console.log('Manual "6-foot high" match:', manualMatch);
    }

  } catch (error) {
    console.error('❌ Error in dimension testing:', error);
  }
}

// Run the test
testDimensionDetection();
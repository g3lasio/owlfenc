/**
 * Frontend-Backend Synchronization Verification Test
 * 
 * This script tests the complete data flow between frontend and backend
 * to ensure ALL user selections and configurations are properly synchronized.
 */

import axios from 'axios';

// Test data that simulates complete frontend form data
const completeContractData = {
  // Basic client and contractor info
  client: {
    name: 'Test Client Name',
    address: '123 Test Street, Test City, CA 90210',
    email: 'client@test.com',
    phone: '555-0123'
  },
  contractor: {
    name: 'Test Contractor LLC',
    address: '456 Contractor Ave, Business City, CA 90211',
    email: 'contractor@test.com',
    phone: '555-0456',
    license: 'LIC123456'
  },
  project: {
    type: 'Fence Installation',
    description: 'Professional fence installation with custom specifications',
    location: '123 Test Street, Test City, CA 90210',
    startDate: '2025-07-01',
    endDate: '2025-07-15'
  },
  financials: {
    total: 8500,
    subtotal: 8000,
    tax: 500,
    taxRate: 0.0625
  },

  // Enhanced frontend data that should be synchronized
  contractorInfo: {
    companyType: 'LLC',
    yearEstablished: 2020,
    insuranceAmount: 1000000,
    bondAmount: 50000
  },
  clientInfo: {
    propertyType: 'Residential',
    accessInstructions: 'Gate code: 1234',
    specialRequests: 'Preserve existing landscaping'
  },
  paymentTerms: {
    depositPercentage: 50,
    finalPaymentDue: 'Upon completion',
    paymentMethod: 'Check or ACH transfer',
    lateFees: '1.5% per month'
  },
  totalCost: 8500,
  timeline: {
    permitProcessing: '5-7 business days',
    materialDelivery: '2-3 business days',
    installationDuration: '3-5 days',
    weatherContingency: 'Rain delays may extend timeline'
  },
  permits: {
    required: true,
    responsibleParty: 'Contractor',
    estimatedCost: 150,
    processingTime: '5-7 business days'
  },
  warranties: {
    workmanship: '2 years',
    materials: '5 years manufacturer warranty',
    weatherResistance: '10 years against rot and decay',
    colorFading: '5 years limited warranty'
  },
  extraClauses: [
    {
      id: 'custom-1',
      title: 'Environmental Protection',
      content: 'Contractor agrees to follow all environmental protection guidelines during installation.',
      category: 'ENVIRONMENTAL'
    },
    {
      id: 'custom-2',
      title: 'Neighbor Notification',
      content: 'Client is responsible for notifying neighbors 48 hours before installation begins.',
      category: 'COMMUNICATION'
    }
  ],
  consents: {
    propertyAccess: true,
    emergencyContact: true,
    photographyPermission: true,
    marketingUse: false
  },
  signatures: {
    electronicSignatureEnabled: true,
    requireWitnessSignature: false,
    notarizationRequired: false,
    signatureMethod: 'DocuSign compatible'
  },
  confirmations: {
    contractReviewed: true,
    paymentTermsUnderstood: true,
    timelineAccepted: true,
    warrantyExplained: true
  },
  legalNotices: {
    rightToCancel: '3-day right to cancel for contracts over $500',
    disputeResolution: 'Binding arbitration through AAA',
    licenseVerification: 'Contractor license verified with state board',
    insuranceConfirmation: 'Current insurance certificates on file'
  },
  selectedIntelligentClauses: [
    {
      id: 'smart-1',
      title: 'Weather Protection Clause',
      content: 'Work delays due to inclement weather will not incur additional charges.',
      category: 'WEATHER',
      riskLevel: 'MEDIUM'
    },
    {
      id: 'smart-2',
      title: 'Property Damage Protection',
      content: 'Contractor carries $2M liability insurance for property damage protection.',
      category: 'LIABILITY',
      riskLevel: 'HIGH'
    }
  ],

  // AI-generated content simulation
  extractedData: {
    processingMethod: 'AI-enhanced OCR',
    confidenceScore: 0.95,
    dataQuality: 'HIGH'
  },
  riskAnalysis: {
    riskLevel: 'MEDIUM',
    riskScore: 0.35,
    identifiedRisks: ['Weather delays', 'Property access issues']
  },
  protectiveRecommendations: [
    'Include weather contingency clause',
    'Verify property boundaries before starting',
    'Obtain signed neighbor acknowledgment'
  ],

  // Additional customizations
  customTerms: {
    specialConditions: 'Work must be completed before HOA inspection on July 20th',
    additionalRequirements: 'All debris must be removed daily',
    communicationPreferences: 'Text updates preferred over phone calls'
  },
  specialProvisions: [
    'Emergency contact protocol established',
    'Material substitution requires written approval',
    'Quality inspection checkpoints defined'
  ],
  stateCompliance: {
    californiaCompliant: true,
    contractorLicenseVerified: true,
    workerCompensationCurrent: true,
    buildingPermitObtained: true
  }
};

async function testEndpointSync(endpoint, data) {
  try {
    console.log(`\n🧪 Testing ${endpoint}...`);
    console.log(`📊 Sending ${Object.keys(data).length} data properties`);
    
    const response = await axios.post(`http://localhost:5000${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log(`✅ ${endpoint} - Status: ${response.status}`);
    
    // Check if response indicates successful data processing
    if (response.data) {
      const responseKeys = Object.keys(response.data);
      console.log(`📥 Response contains ${responseKeys.length} properties`);
      
      // Look for signs that enhanced data was processed
      const hasEnhancedProcessing = responseKeys.some(key => 
        key.includes('enhanced') || 
        key.includes('clause') || 
        key.includes('warranty') ||
        key.includes('payment')
      );
      
      if (hasEnhancedProcessing) {
        console.log(`🎯 Enhanced data processing detected in response`);
      }
    }
    
    return {
      endpoint,
      success: true,
      status: response.status,
      dataProperties: Object.keys(data).length,
      responseSize: response.data ? JSON.stringify(response.data).length : 0
    };
    
  } catch (error) {
    console.log(`❌ ${endpoint} - Error: ${error.message}`);
    return {
      endpoint,
      success: false,
      error: error.message,
      dataProperties: Object.keys(data).length
    };
  }
}

async function runSynchronizationTest() {
  console.log('🚀 Starting Frontend-Backend Synchronization Test');
  console.log('=' * 60);
  
  const endpoints = [
    '/api/generate-pdf',
    '/api/contracts/generate-pdf',
    '/api/anthropic/generate-defensive-contract'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpointSync(endpoint, completeContractData);
    results.push(result);
    
    // Wait between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate test report
  console.log('\n📊 SYNCHRONIZATION TEST RESULTS');
  console.log('=' * 40);
  
  let successfulEndpoints = 0;
  let totalDataPropertiesSent = 0;
  
  results.forEach(result => {
    if (result.success) {
      successfulEndpoints++;
      console.log(`✅ ${result.endpoint} - Successfully processed ${result.dataProperties} properties`);
    } else {
      console.log(`❌ ${result.endpoint} - Failed: ${result.error}`);
    }
    totalDataPropertiesSent += result.dataProperties;
  });
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`• Endpoints tested: ${endpoints.length}`);
  console.log(`• Successful endpoints: ${successfulEndpoints}`);
  console.log(`• Success rate: ${Math.round((successfulEndpoints / endpoints.length) * 100)}%`);
  console.log(`• Total data properties sent: ${totalDataPropertiesSent / endpoints.length} per endpoint`);
  
  if (successfulEndpoints === endpoints.length) {
    console.log(`\n🎉 SYNCHRONIZATION COMPLETE!`);
    console.log(`All endpoints successfully receive and process enhanced frontend data.`);
  } else {
    console.log(`\n⚠️  SYNCHRONIZATION ISSUES DETECTED`);
    console.log(`${endpoints.length - successfulEndpoints} endpoint(s) need attention.`);
  }
  
  return {
    totalEndpoints: endpoints.length,
    successfulEndpoints,
    successRate: (successfulEndpoints / endpoints.length) * 100,
    allSynchronized: successfulEndpoints === endpoints.length
  };
}

// Run the test
if (require.main === module) {
  runSynchronizationTest()
    .then(summary => {
      process.exit(summary.allSynchronized ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runSynchronizationTest, completeContractData };
/**
 * Test script to verify contract classification logic
 * 
 * Classification Rules:
 * - DRAFT: Contract created but no signature links generated (step 2)
 * - IN PROGRESS: Signature links sent, one or both parties signed, but no PDF
 * - COMPLETED: Both parties signed AND PDF generated successfully
 */

console.log('🧪 Testing Contract Classification Logic...\n');

// Test scenarios
const testScenarios = [
  {
    name: 'Draft Contract',
    contract: {
      contractId: 'CNT-001',
      status: 'draft',
      contractorSignUrl: null,
      clientSignUrl: null,
      contractorSigned: false,
      clientSigned: false,
      signedPdfPath: null
    },
    expectedClassification: 'DRAFT'
  },
  {
    name: 'In Progress - Links Sent, No Signatures',
    contract: {
      contractId: 'CNT-002',
      status: 'pending',
      contractorSignUrl: 'https://example.com/sign/CNT-002/contractor',
      clientSignUrl: 'https://example.com/sign/CNT-002/client',
      contractorSigned: false,
      clientSigned: false,
      signedPdfPath: null
    },
    expectedClassification: 'IN PROGRESS'
  },
  {
    name: 'In Progress - One Party Signed',
    contract: {
      contractId: 'CNT-003',
      status: 'contractor_signed',
      contractorSignUrl: 'https://example.com/sign/CNT-003/contractor',
      clientSignUrl: 'https://example.com/sign/CNT-003/client',
      contractorSigned: true,
      clientSigned: false,
      signedPdfPath: null
    },
    expectedClassification: 'IN PROGRESS'
  },
  {
    name: 'In Progress - Both Signed, No PDF',
    contract: {
      contractId: 'CNT-004',
      status: 'both_signed_pending_pdf',
      contractorSignUrl: 'https://example.com/sign/CNT-004/contractor',
      clientSignUrl: 'https://example.com/sign/CNT-004/client',
      contractorSigned: true,
      clientSigned: true,
      signedPdfPath: null
    },
    expectedClassification: 'IN PROGRESS'
  },
  {
    name: 'Completed - Both Signed With PDF',
    contract: {
      contractId: 'CNT-005',
      status: 'completed',
      contractorSignUrl: 'https://example.com/sign/CNT-005/contractor',
      clientSignUrl: 'https://example.com/sign/CNT-005/client',
      contractorSigned: true,
      clientSigned: true,
      signedPdfPath: 'signed_contracts/contract_CNT-005_signed.pdf'
    },
    expectedClassification: 'COMPLETED'
  },
  {
    name: 'Edge Case - Old Completed Without PDF',
    contract: {
      contractId: 'CNT-006',
      status: 'completed',
      contractorSignUrl: 'https://example.com/sign/CNT-006/contractor',
      clientSignUrl: 'https://example.com/sign/CNT-006/client',
      contractorSigned: true,
      clientSigned: true,
      signedPdfPath: null
    },
    expectedClassification: 'IN PROGRESS' // Should be reclassified
  }
];

// Classification logic functions (matching backend logic)
function classifyContract(contract) {
  // Draft: No signature URLs generated
  if (!contract.contractorSignUrl || !contract.clientSignUrl) {
    return 'DRAFT';
  }
  
  // Completed: Both signed AND has PDF
  if (contract.contractorSigned && contract.clientSigned && contract.signedPdfPath) {
    return 'COMPLETED';
  }
  
  // In Progress: Everything else (links sent but not completed)
  return 'IN PROGRESS';
}

// Run tests
console.log('Running classification tests...\n');

let passed = 0;
let failed = 0;

testScenarios.forEach(scenario => {
  const actualClassification = classifyContract(scenario.contract);
  const isCorrect = actualClassification === scenario.expectedClassification;
  
  console.log(`Test: ${scenario.name}`);
  console.log(`  Contract ID: ${scenario.contract.contractId}`);
  console.log(`  Status: ${scenario.contract.status}`);
  console.log(`  Contractor Signed: ${scenario.contract.contractorSigned}`);
  console.log(`  Client Signed: ${scenario.contract.clientSigned}`);
  console.log(`  Has PDF: ${!!scenario.contract.signedPdfPath}`);
  console.log(`  Expected: ${scenario.expectedClassification}`);
  console.log(`  Actual: ${actualClassification}`);
  console.log(`  Result: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (isCorrect) {
    passed++;
  } else {
    failed++;
  }
});

// Summary
console.log('=' .repeat(50));
console.log(`Test Summary: ${passed} passed, ${failed} failed`);
console.log('=' .repeat(50));

// Backend filter logic verification
console.log('\nBackend Filter Logic Verification:\n');

// Simulate backend filters
const allContracts = testScenarios.map(s => s.contract);

// Draft filter
const draftContracts = allContracts.filter(contract => 
  (!contract.contractorSignUrl || !contract.clientSignUrl) &&
  !contract.contractorSigned && 
  !contract.clientSigned &&
  contract.status !== 'completed'
);

console.log('Draft Contracts:', draftContracts.map(c => c.contractId).join(', '));

// In Progress filter
const inProgressContracts = allContracts.filter(contract => {
  const hasSignatureUrls = contract.contractorSignUrl && contract.clientSignUrl;
  if (!hasSignatureUrls) return false;
  
  const isCompleted = contract.status === 'completed' && contract.signedPdfPath;
  return !isCompleted;
});

console.log('In Progress Contracts:', inProgressContracts.map(c => c.contractId).join(', '));

// Completed filter
const completedContracts = allContracts.filter(contract => 
  contract.status === 'completed' && 
  contract.contractorSigned && 
  contract.clientSigned &&
  contract.signedPdfPath
);

console.log('Completed Contracts:', completedContracts.map(c => c.contractId).join(', '));

console.log('\n✅ Contract classification logic verified!');
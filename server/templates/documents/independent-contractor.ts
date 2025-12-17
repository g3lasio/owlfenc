/**
 * Independent Contractor Agreement Template Entry
 * 
 * This is a registry entry for the LEGACY Independent Contractor Agreement.
 * The actual HTML generation is handled by the legacy hybridContractGenerator.
 * This entry exists to make the dropdown 100% registry-driven.
 * 
 * Version 1.0
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';

function generateIndependentContractorHTML(data: TemplateData, branding: ContractorBranding): string {
  throw new Error(
    '[LEGACY-FLOW] Independent Contractor Agreement uses the legacy HybridContractGenerator. ' +
    'This template entry is for registry metadata only. Use /api/legal-defense/generate-contract endpoint.'
  );
}

templateRegistry.register({
  id: 'independent-contractor',
  name: 'independent-contractor',
  displayName: 'Independent Contractor Agreement',
  description: 'Standard construction contract with comprehensive legal protection',
  category: 'contract',
  subcategory: 'primary',
  status: 'active',
  templateVersion: '1.0',
  signatureType: 'dual',
  dataSource: 'project',
  requiredFields: [
    'client.name',
    'client.address',
    'contractor.name',
    'project.type',
    'project.description',
    'project.location',
    'financials.total',
  ],
  optionalFields: [
    'project.startDate',
    'project.endDate',
    'client.phone',
    'client.email',
    'contractor.phone',
    'contractor.email',
    'contractor.license',
  ],
  priority: 1,
  icon: 'Shield',
  generateHTML: generateIndependentContractorHTML,
});

// client/src/services/intelligentContractService.ts

export interface ContractTemplate {
  id: string;
  name: string;
  projectTypes: string[];
  legalComplexity: 'basic' | 'intermediate' | 'advanced';
  requiredClauses: string[];
  optionalClauses: string[];
  stateSpecificRequirements: Record<string, string[]>;
}

export interface SmartField {
  id: string;
  field: string;
  prompt: string;
  type: 'text' | 'multiline' | 'date' | 'number' | 'choice' | 'address' | 'ai-enhanced' | 'legal-clause';
  required: boolean;
  dependsOn?: string[]; // Campos que determinan si este campo es necesario
  autoFill?: {
    source: 'profile' | 'previous-contracts' | 'ai-suggestion';
    confidence: number;
  };
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    customRule?: string;
  };
  legalImportance: 'critical' | 'important' | 'optional';
}

/**
 * Plantillas especializadas por tipo de proyecto
 */
export const contractTemplates: ContractTemplate[] = [
  {
    id: 'general-construction',
    name: 'General Construction Contract',
    projectTypes: ['general', 'concrete', 'carpentry'],
    legalComplexity: 'advanced',
    requiredClauses: [
      'liability-insurance',
      'performance-bond',
      'lien-waiver',
      'permit-responsibility',
      'change-order-process',
      'dispute-resolution'
    ],
    optionalClauses: [
      'warranty-extension',
      'liquidated-damages',
      'force-majeure-detailed'
    ],
    stateSpecificRequirements: {
      'California': ['seismic-compliance', 'prevailing-wage'],
      'Texas': ['mechanics-lien-notice', 'payment-bond'],
      'Florida': ['hurricane-clause', 'moisture-warranty']
    }
  },
  {
    id: 'specialty-trades',
    name: 'Specialty Trades Contract',
    projectTypes: ['electrical', 'plumbing', 'hvac'],
    legalComplexity: 'intermediate',
    requiredClauses: [
      'licensing-verification',
      'code-compliance',
      'permit-responsibility',
      'liability-insurance'
    ],
    optionalClauses: [
      'warranty-extension',
      'emergency-service'
    ],
    stateSpecificRequirements: {
      'California': ['title-24-compliance'],
      'Texas': ['licensing-disclosure'],
      'New York': ['union-requirements']
    }
  },
  {
    id: 'simple-services',
    name: 'Simple Service Contract',
    projectTypes: ['fencing', 'painting', 'landscaping'],
    legalComplexity: 'basic',
    requiredClauses: [
      'basic-liability',
      'payment-terms',
      'scope-definition'
    ],
    optionalClauses: [
      'seasonal-warranty',
      'maintenance-agreement'
    ],
    stateSpecificRequirements: {}
  }
];

/**
 * Determina la plantilla más apropiada basada en el tipo de proyecto
 */
export function selectOptimalTemplate(projectType: string, projectComplexity: string, state: string): ContractTemplate {
  // Buscar plantilla que coincida con el tipo de proyecto
  let matchingTemplates = contractTemplates.filter(template => 
    template.projectTypes.includes(projectType)
  );

  // Si no hay coincidencia exacta, usar la plantilla general
  if (matchingTemplates.length === 0) {
    matchingTemplates = contractTemplates.filter(template => 
      template.id === 'general-construction'
    );
  }

  // Seleccionar por complejidad
  const complexityOrder = ['basic', 'intermediate', 'advanced'];
  const targetComplexity = projectComplexity || 'intermediate';
  
  const bestMatch = matchingTemplates.find(template => 
    template.legalComplexity === targetComplexity
  ) || matchingTemplates[0];

  return bestMatch;
}

/**
 * Genera campos inteligentes basados en la plantilla seleccionada
 */
export function generateSmartFields(template: ContractTemplate, existingData: Record<string, any> = {}): SmartField[] {
  const baseFields: SmartField[] = [
    // Campos básicos siempre requeridos
    {
      id: 'client_name',
      field: 'client.name',
      prompt: "What is the client's full name?",
      type: 'text',
      required: true,
      legalImportance: 'critical',
      validation: { minLength: 2 }
    },
    {
      id: 'client_address',
      field: 'client.address',
      prompt: "What is the client's address?",
      type: 'address',
      required: true,
      legalImportance: 'critical'
    },
    {
      id: 'project_scope',
      field: 'project.scope',
      prompt: "Describe the complete scope of work including all deliverables",
      type: 'ai-enhanced',
      required: true,
      legalImportance: 'critical',
      validation: { minLength: 50 }
    },
    {
      id: 'payment_total',
      field: 'payment.totalAmount',
      prompt: "What is the total contract amount (USD)?",
      type: 'number',
      required: true,
      legalImportance: 'critical',
      validation: { pattern: '^\\$?[0-9,]+(\\.[0-9]{2})?$' }
    }
  ];

  // Agregar campos específicos según cláusulas requeridas
  const templateSpecificFields: SmartField[] = [];

  if (template.requiredClauses.includes('liability-insurance')) {
    templateSpecificFields.push({
      id: 'insurance_liability',
      field: 'insurance.liabilityAmount',
      prompt: "What is your liability insurance coverage amount?",
      type: 'text',
      required: true,
      legalImportance: 'critical',
      autoFill: { source: 'profile', confidence: 0.8 }
    });
  }

  if (template.requiredClauses.includes('performance-bond')) {
    templateSpecificFields.push({
      id: 'performance_bond',
      field: 'legal.performanceBond',
      prompt: "Will you provide a performance bond for this project?",
      type: 'choice',
      required: true,
      legalImportance: 'important',
      dependsOn: ['payment_total'] // Solo requerido para proyectos grandes
    });
  }

  if (template.requiredClauses.includes('permit-responsibility')) {
    templateSpecificFields.push({
      id: 'permit_responsibility',
      field: 'legal.permitResponsibility',
      prompt: "Who will be responsible for obtaining permits?",
      type: 'choice',
      required: true,
      legalImportance: 'critical'
    });
  }

  return [...baseFields, ...templateSpecificFields];
}

/**
 * Sistema de validación inteligente
 */
export function validateContractData(data: Record<string, any>, template: ContractTemplate): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validaciones críticas
  if (!data.client?.name || data.client.name.length < 2) {
    errors.push("Client name is required and must be at least 2 characters");
  }

  if (!data.project?.scope || data.project.scope.length < 50) {
    errors.push("Project scope must be detailed (minimum 50 characters)");
  }

  if (!data.payment?.totalAmount || parseFloat(data.payment.totalAmount.replace(/[^0-9.]/g, '')) <= 0) {
    errors.push("Valid payment amount is required");
  }

  // Validaciones específicas por plantilla
  if (template.requiredClauses.includes('liability-insurance') && !data.insurance?.liabilityAmount) {
    errors.push("Liability insurance information is required for this type of project");
  }

  // Sugerencias de mejora
  if (data.payment?.totalAmount && parseFloat(data.payment.totalAmount.replace(/[^0-9.]/g, '')) > 50000) {
    suggestions.push("Consider requiring a performance bond for projects over $50,000");
  }

  if (!data.legal?.permitResponsibility) {
    warnings.push("Permit responsibility should be clearly defined");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Autocompletado inteligente basado en contexto
 */
export function suggestFieldValues(fieldId: string, currentData: Record<string, any>, userProfile: any): string[] {
  const suggestions: string[] = [];

  switch (fieldId) {
    case 'payment_schedule':
      if (currentData.payment?.totalAmount) {
        const amount = parseFloat(currentData.payment.totalAmount.replace(/[^0-9.]/g, ''));
        if (amount > 10000) {
          suggestions.push("25% upon signing, 50% at 50% completion, 25% upon final completion");
          suggestions.push("30% upon signing, 40% at substantial completion, 30% after final inspection");
        } else {
          suggestions.push("50% upon signing, 50% upon completion");
        }
      }
      break;

    case 'permit_responsibility':
      suggestions.push("Contractor will obtain all necessary permits");
      suggestions.push("Client will obtain permits, contractor will assist");
      suggestions.push("Shared responsibility - contractor for trade permits, client for building permits");
      break;

    case 'warranty_period':
      if (currentData.project?.type) {
        switch (currentData.project.type) {
          case 'roofing':
            suggestions.push("5 years materials, 2 years workmanship");
            break;
          case 'electrical':
          case 'plumbing':
            suggestions.push("1 year parts and labor");
            break;
          default:
            suggestions.push("1 year workmanship warranty");
        }
      }
      break;
  }

  return suggestions;
}
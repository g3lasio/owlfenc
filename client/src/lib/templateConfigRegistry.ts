/**
 * Template Configuration Registry
 * 
 * Defines UI configuration schemas for dynamic template forms.
 * Used by DynamicTemplateConfigurator to render template-specific fields.
 * 
 * IMPORTANT: This is a PARALLEL system. Independent Contractor Agreement
 * uses the existing Step 2 flow. This registry is ONLY for new templates.
 */

import { z } from 'zod';

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'currency' 
  | 'date' 
  | 'select' 
  | 'checkbox'
  | 'contract-reference'
  | 'task-list'
  | 'modifications-list';

export interface FieldDescriptor {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  showIf?: {
    field: string;
    value: any;
  };
}

export interface FieldGroup {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  collapsed?: boolean;
  fields: FieldDescriptor[];
}

/**
 * Signature requirements for templates
 * - 'dual': Requires both contractor and client signatures (e.g., Independent Contractor Agreement, Change Order)
 * - 'single': Requires only one signature (e.g., Lien Waiver, Certificate of Completion)
 * - 'none': No signature required
 */
export type SignatureRequirement = 'dual' | 'single' | 'none';

export interface TemplateUIConfig {
  templateId: string;
  title: string;
  subtitle: string;
  icon: string;
  helpText: string;
  groups: FieldGroup[];
  zodSchema: z.ZodSchema<any>;
  /**
   * Defines signature requirements for this template.
   * Templates control their own legal behavior - the engine executes it.
   */
  signatureRequirement: SignatureRequirement;
}

export interface TemplateConfigEntry {
  config: TemplateUIConfig;
  transformToTemplateData: (formData: any, baseData: any) => any;
}

class TemplateConfigRegistry {
  private configs: Map<string, TemplateConfigEntry> = new Map();

  register(entry: TemplateConfigEntry): void {
    this.configs.set(entry.config.templateId, entry);
    console.log(`⚙️ [CONFIG-REGISTRY] Registered config: ${entry.config.templateId}`);
  }

  get(templateId: string): TemplateConfigEntry | undefined {
    return this.configs.get(templateId);
  }

  hasConfig(templateId: string): boolean {
    return this.configs.has(templateId);
  }

  getUIConfig(templateId: string): TemplateUIConfig | undefined {
    return this.configs.get(templateId)?.config;
  }

  isLegacyTemplate(templateId: string): boolean {
    return templateId === 'independent-contractor';
  }

  needsDynamicConfig(templateId: string): boolean {
    return !this.isLegacyTemplate(templateId) && this.hasConfig(templateId);
  }

  /**
   * Get signature requirement for a template.
   * Legacy templates (independent-contractor) default to 'dual'.
   * Returns 'none' for unregistered templates.
   */
  getSignatureRequirement(templateId: string): SignatureRequirement {
    // Legacy Independent Contractor uses dual signature
    if (this.isLegacyTemplate(templateId)) {
      return 'dual';
    }
    
    // Get from registered config
    const config = this.getUIConfig(templateId);
    if (config?.signatureRequirement) {
      return config.signatureRequirement;
    }
    
    // Default for unknown templates
    return 'none';
  }

  /**
   * Check if a template requires dual signature
   */
  requiresDualSignature(templateId: string): boolean {
    return this.getSignatureRequirement(templateId) === 'dual';
  }

  /**
   * Check if a template requires any signature
   */
  requiresSignature(templateId: string): boolean {
    const requirement = this.getSignatureRequirement(templateId);
    return requirement === 'dual' || requirement === 'single';
  }
}

export const templateConfigRegistry = new TemplateConfigRegistry();

// ===== Unified Lien Waiver Configuration =====
// Supports both Partial (Progress Payment) and Final (Full Release) waivers
const lienWaiverSchema = z.object({
  waiverType: z.enum(['partial', 'final']),
  paymentAmount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  throughDate: z.string().optional(),
  paymentMethod: z.enum(['check', 'ach', 'wire', 'other']).optional(),
  paymentReference: z.string().optional(),
  ownerName: z.string().optional(),
  payingParty: z.string().optional(),
  exceptions: z.string().optional(),
}).refine(
  (data) => data.waiverType !== 'partial' || (data.throughDate && data.throughDate.length > 0),
  { message: 'Through date is required for Partial Lien Waivers', path: ['throughDate'] }
);

templateConfigRegistry.register({
  config: {
    templateId: 'lien-waiver',
    title: 'Lien Waiver Configuration',
    subtitle: 'Release lien rights for payment received',
    icon: 'FileCheck',
    helpText: 'A Lien Waiver releases your lien rights in exchange for payment. Choose Partial for progress payments (conditional release) or Final for complete project payment (full release).',
    signatureRequirement: 'single',
    groups: [
      {
        id: 'waiver-type',
        title: 'Waiver Type',
        description: 'Select the type of lien waiver',
        icon: 'FileCheck',
        fields: [
          {
            id: 'waiverType',
            label: 'Waiver Type',
            type: 'select',
            required: true,
            defaultValue: 'partial',
            options: [
              { value: 'partial', label: 'Partial (Progress Payment) - Conditional release through date' },
              { value: 'final', label: 'Final (Full Payment) - Complete unconditional release' },
            ],
            helpText: 'Partial releases rights through a specific date. Final releases ALL rights upon final payment.',
          },
        ],
      },
      {
        id: 'payment-details',
        title: 'Payment Details',
        description: 'Payment being waived',
        icon: 'DollarSign',
        fields: [
          {
            id: 'paymentAmount',
            label: 'Payment Amount',
            type: 'currency',
            placeholder: '0.00',
            helpText: 'The payment amount for which lien rights are being waived',
            required: true,
            validation: {
              min: 0.01,
            },
          },
          {
            id: 'throughDate',
            label: 'Through Date',
            type: 'date',
            helpText: 'Lien rights are waived for work performed through this date only (required for Partial)',
            required: false,
            showIf: { field: 'waiverType', value: 'partial' },
          },
        ],
      },
      {
        id: 'payment-reference',
        title: 'Payment Reference (Optional)',
        description: 'Payment method and reference details',
        icon: 'CreditCard',
        collapsed: true,
        fields: [
          {
            id: 'paymentMethod',
            label: 'Payment Method',
            type: 'select',
            required: false,
            options: [
              { value: 'check', label: 'Check' },
              { value: 'ach', label: 'ACH Transfer' },
              { value: 'wire', label: 'Wire Transfer' },
              { value: 'other', label: 'Other' },
            ],
          },
          {
            id: 'paymentReference',
            label: 'Payment Reference Number',
            type: 'text',
            placeholder: 'Check #, ACH ref, etc.',
            helpText: 'Optional reference number for the payment',
            required: false,
          },
        ],
      },
      {
        id: 'parties',
        title: 'Party Details (Optional)',
        description: 'Override party names if different from contract',
        icon: 'Users',
        collapsed: true,
        fields: [
          {
            id: 'ownerName',
            label: 'Property Owner',
            type: 'text',
            placeholder: 'Leave blank to use client name',
            helpText: 'If different from the paying party',
            required: false,
          },
          {
            id: 'payingParty',
            label: 'Paying Party / Customer',
            type: 'text',
            placeholder: 'Leave blank to use client name',
            helpText: 'The party making the payment (if different from owner)',
            required: false,
          },
        ],
      },
      {
        id: 'exceptions',
        title: 'Exceptions (Partial Only)',
        description: 'Any exceptions to this waiver',
        icon: 'AlertTriangle',
        collapsed: true,
        showIf: { field: 'waiverType', value: 'partial' },
        fields: [
          {
            id: 'exceptions',
            label: 'Exceptions (if any)',
            type: 'textarea',
            placeholder: 'List any exceptions to this waiver, or leave blank for none...',
            helpText: 'Examples: disputed amounts, retention, pending change orders',
            required: false,
          },
        ],
      },
    ],
    zodSchema: lienWaiverSchema,
  },
  transformToTemplateData: (formData: any, baseData: any) => {
    const totalContractValue = baseData.financials?.total || 0;
    const paymentAmount = formData.paymentAmount || 0;
    const isFinal = formData.waiverType === 'final';
    const remainingBalance = isFinal ? 0 : Math.max(0, totalContractValue - paymentAmount);
    
    return {
      ...baseData,
      lienWaiver: {
        waiverType: formData.waiverType,
        paymentAmount: paymentAmount,
        paymentDate: new Date().toISOString(),
        throughDate: isFinal ? undefined : formData.throughDate,
        isFinal: isFinal,
        remainingBalance: remainingBalance,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference,
        ownerName: formData.ownerName,
        payingParty: formData.payingParty,
        exceptions: isFinal ? undefined : formData.exceptions,
      },
    };
  },
});

// ===== Change Order Configuration =====
const changeOrderSchema = z.object({
  changeDescription: z.string().min(10, 'Please describe what is being changed'),
  additionalCost: z.number(),
  costType: z.enum(['addition', 'deduction']),
  costNotes: z.string().optional(),
  adjustTimeline: z.boolean().default(false),
  newCompletionDate: z.string().optional(),
});

templateConfigRegistry.register({
  config: {
    templateId: 'change-order',
    title: 'Change Order Configuration',
    subtitle: 'Modify scope, cost, or timeline of an existing contract',
    icon: 'FileEdit',
    helpText: 'A Change Order formally documents modifications to an existing contract. It requires both parties to sign.',
    signatureRequirement: 'dual', // Both contractor and client must sign
    groups: [
      {
        id: 'financial-impact',
        title: 'Financial Impact',
        description: 'Cost adjustment for this change',
        icon: 'DollarSign',
        fields: [
          {
            id: 'costType',
            label: 'Type of Adjustment',
            type: 'select',
            required: true,
            defaultValue: 'addition',
            options: [
              { value: 'addition', label: 'Addition (+) - Extra cost' },
              { value: 'deduction', label: 'Deduction (-) - Credit/Reduction' },
            ],
          },
          {
            id: 'additionalCost',
            label: 'Amount',
            type: 'currency',
            placeholder: '0.00',
            helpText: 'Enter the cost difference (positive number)',
            required: true,
            validation: {
              min: 0,
            },
          },
          {
            id: 'costNotes',
            label: 'Cost Notes (Optional)',
            type: 'textarea',
            placeholder: 'Additional notes about the cost adjustment...',
            helpText: 'Explain reasoning for cost change if needed',
            required: false,
          },
        ],
      },
      {
        id: 'timeline-adjustment',
        title: 'Timeline Adjustment',
        description: 'Optional schedule changes',
        icon: 'Calendar',
        collapsed: true,
        fields: [
          {
            id: 'adjustTimeline',
            label: 'This change affects the project timeline',
            type: 'checkbox',
            required: false,
            defaultValue: false,
          },
          {
            id: 'newCompletionDate',
            label: 'New Completion Date',
            type: 'date',
            helpText: 'Updated project completion date',
            required: false,
            showIf: {
              field: 'adjustTimeline',
              value: true,
            },
          },
        ],
      },
      {
        id: 'change-details',
        title: 'Change Details',
        description: 'Describe what is being changed',
        icon: 'Edit',
        fields: [
          {
            id: 'changeDescription',
            label: 'Description of Changes',
            type: 'textarea',
            placeholder: 'Describe the scope changes, additional work, or modifications...',
            helpText: 'Be specific about what work is being added, removed, or modified. The AI enhancement uses the financial and timeline info above.',
            required: true,
            validation: {
              minLength: 10,
              maxLength: 2000,
            },
          },
        ],
      },
    ],
    zodSchema: changeOrderSchema,
  },
  transformToTemplateData: (formData: any, baseData: any) => {
    const costMultiplier = formData.costType === 'deduction' ? -1 : 1;
    const additionalCost = (formData.additionalCost || 0) * costMultiplier;
    const originalTotal = baseData.financials?.total || 0;
    const revisedTotal = originalTotal + additionalCost;
    
    // Robust date extraction with fallback
    const originalContractDate = baseData.signedDate 
      || baseData.createdAt 
      || new Date().toISOString();
    
    return {
      ...baseData,
      financials: {
        ...baseData.financials,
        total: revisedTotal,
      },
      changeOrder: {
        linkedContractId: baseData.linkedContractId || 'N/A',
        originalContractId: baseData.linkedContractId || 'N/A',
        originalContractDate: originalContractDate,
        changeDescription: formData.changeDescription,
        additionalCost: additionalCost,
        costNotes: formData.costNotes,
        revisedTotal: revisedTotal,
        originalTotal: originalTotal,
        newCompletionDate: formData.adjustTimeline ? formData.newCompletionDate : undefined,
      },
    };
  },
});

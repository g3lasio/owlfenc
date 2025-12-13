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

export interface TemplateUIConfig {
  templateId: string;
  title: string;
  subtitle: string;
  icon: string;
  helpText: string;
  groups: FieldGroup[];
  zodSchema: z.ZodObject<any>;
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
}

export const templateConfigRegistry = new TemplateConfigRegistry();

const changeOrderSchema = z.object({
  contractSource: z.enum(['existing', 'external']).default('existing'),
  originalContractId: z.string().optional(),
  externalContractName: z.string().optional(),
  originalContractDate: z.string().min(1, 'Original contract date is required'),
  changeDescription: z.string().min(10, 'Please describe what is being changed'),
  additionalCost: z.number(),
  costType: z.enum(['addition', 'deduction']),
  newCompletionDate: z.string().optional(),
  adjustTimeline: z.boolean().default(false),
}).refine((data) => {
  if (data.contractSource === 'existing') {
    return !!data.originalContractId;
  }
  return !!data.externalContractName;
}, {
  message: 'Please select a contract or enter external contract name',
  path: ['originalContractId'],
});

templateConfigRegistry.register({
  config: {
    templateId: 'change-order',
    title: 'Change Order Configuration',
    subtitle: 'Modify scope, cost, or timeline of an existing contract',
    icon: 'FileEdit',
    helpText: 'A Change Order formally documents modifications to an existing contract. It requires both parties to sign.',
    groups: [
      {
        id: 'original-contract',
        title: 'Original Contract Reference',
        description: 'Link this change order to the original contract',
        icon: 'Link',
        fields: [
          {
            id: 'contractSource',
            label: 'Contract Source',
            type: 'select',
            required: true,
            defaultValue: 'existing',
            options: [
              { value: 'existing', label: 'Select from my contracts' },
              { value: 'external', label: 'External contract (not in system)' },
            ],
          },
          {
            id: 'originalContractId',
            label: 'Select Contract',
            type: 'contract-reference',
            placeholder: 'Select a contract',
            helpText: 'Choose from your existing contracts',
            required: false,
            showIf: { field: 'contractSource', value: 'existing' },
          },
          {
            id: 'externalContractName',
            label: 'Contract Name',
            type: 'text',
            placeholder: 'e.g., Kitchen Remodel Contract',
            helpText: 'Name or description of the external contract',
            required: false,
            showIf: { field: 'contractSource', value: 'external' },
          },
          {
            id: 'originalContractDate',
            label: 'Original Contract Date',
            type: 'date',
            helpText: 'Date when the original contract was signed',
            required: true,
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
            helpText: 'Be specific about what work is being added, removed, or modified',
            required: true,
            validation: {
              minLength: 10,
              maxLength: 2000,
            },
          },
        ],
      },
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
    ],
    zodSchema: changeOrderSchema,
  },
  transformToTemplateData: (formData: any, baseData: any) => {
    const costMultiplier = formData.costType === 'deduction' ? -1 : 1;
    const additionalCost = (formData.additionalCost || 0) * costMultiplier;
    const originalTotal = baseData.financials?.total || 0;
    const revisedTotal = originalTotal + additionalCost;
    
    return {
      ...baseData,
      financials: {
        ...baseData.financials,
        total: revisedTotal,
      },
      changeOrder: {
        originalContractDate: formData.originalContractDate,
        originalContractId: formData.originalContractId,
        changeDescription: formData.changeDescription,
        additionalCost: additionalCost,
        revisedTotal: revisedTotal,
        originalTotal: originalTotal,
        newCompletionDate: formData.adjustTimeline ? formData.newCompletionDate : undefined,
      },
    };
  },
});

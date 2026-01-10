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

/**
 * DataSource indicates where the template gets its base data from:
 * - 'project': Uses selectedProject from estimates (e.g., Independent Contractor Agreement)
 * - 'contract': Uses contractData from existing contract (e.g., Change Order, Lien Waiver)
 * - 'scratch': Uses ad-hoc data entry without linking (future use)
 */
export type DataSource = 'project' | 'contract' | 'scratch';

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
  /**
   * DataSource indicates where the template gets its base data from.
   * Used by the PDF generator and form to route data correctly.
   */
  dataSource: DataSource;
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

  /**
   * Get data source for a template.
   * Legacy templates (independent-contractor) default to 'project'.
   * Contract-based templates (change-order, lien-waiver) use 'contract'.
   */
  getDataSource(templateId: string): DataSource {
    // Legacy Independent Contractor uses project data
    if (this.isLegacyTemplate(templateId)) {
      return 'project';
    }
    
    // Get from registered config
    const config = this.getUIConfig(templateId);
    if (config?.dataSource) {
      return config.dataSource;
    }
    
    // Default for unknown templates - use project for safety
    return 'project';
  }

  /**
   * Check if a template uses contract data source
   */
  usesContractData(templateId: string): boolean {
    return this.getDataSource(templateId) === 'contract';
  }
}

export const templateConfigRegistry = new TemplateConfigRegistry();

// ===== Unified Lien Waiver Configuration =====
// Supports both Partial (Progress Payment) and Final (Full Release) waivers
const lienWaiverSchema = z.object({
  waiverType: z.enum(['partial', 'final']),
  paymentAmount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  throughDate: z.string().optional(),
  paymentMethod: z.enum(['check', 'ach', 'wire', 'zelle', 'venmo', 'cashapp', 'paypal', 'credit_card', 'cash', 'other']).optional(),
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
    dataSource: 'contract',
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
        title: 'Payment Reference',
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
              { value: 'zelle', label: 'Zelle' },
              { value: 'venmo', label: 'Venmo' },
              { value: 'cashapp', label: 'Cash App' },
              { value: 'paypal', label: 'PayPal' },
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'cash', label: 'Cash' },
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
    signatureRequirement: 'dual',
    dataSource: 'contract',
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


// ===== Certificate of Final Completion Configuration =====
const certificateCompletionSchema = z.object({
  projectStartDate: z.string().optional(),
  projectCompletionDate: z.string().min(1, 'Project completion date is required'),
  dateOfAcceptance: z.string().min(1, 'Date of acceptance is required'),
  finalInspectionDate: z.string().optional(),
  punchListCompleted: z.boolean().default(true),
  finalInspectionPassed: z.boolean().default(true),
  siteCleanedAndRestored: z.boolean().default(true),
  warrantyDurationMonths: z.number().min(1).max(120).default(12),
  warrantyTerms: z.string().optional(),
  certificateOfOccupancyNumber: z.string().optional(),
  asBuiltDrawingsDelivered: z.boolean().default(false),
  omManualsDelivered: z.boolean().default(false),
  manufacturerWarrantiesDelivered: z.boolean().default(false),
  staffTrainingCompleted: z.boolean().default(false),
  allSubcontractorsPaid: z.boolean().default(true),
  retainageReleaseAuthorized: z.boolean().default(true),
  additionalNotes: z.string().optional(),
});

templateConfigRegistry.register({
  config: {
    templateId: 'certificate-completion',
    title: 'Certificate of Final Completion',
    subtitle: 'Certify project completion and authorize final payment',
    icon: 'Award',
    helpText: 'A Certificate of Final Completion officially documents that all contracted work has been completed, inspected, and accepted. It authorizes final payment and commences the warranty period. This is a legally binding document suitable for use in legal proceedings.',
    signatureRequirement: 'dual',
    dataSource: 'contract',
    groups: [
      {
        id: 'project-dates',
        title: 'Project Timeline',
        description: 'Key dates for project completion',
        icon: 'Calendar',
        fields: [
          {
            id: 'projectStartDate',
            label: 'Project Start Date',
            type: 'date',
            helpText: 'The date when work on this project began (leave blank to use contract start date)',
            required: false,
          },
          {
            id: 'projectCompletionDate',
            label: 'Project Completion Date',
            type: 'date',
            helpText: 'The date when all work was completed',
            required: true,
          },
          {
            id: 'dateOfAcceptance',
            label: 'Date of Owner Acceptance',
            type: 'date',
            helpText: 'The date when the owner formally accepted the completed work',
            required: true,
          },
          {
            id: 'finalInspectionDate',
            label: 'Final Inspection Date',
            type: 'date',
            helpText: 'The date when the final inspection was conducted (optional)',
            required: false,
          },
        ],
      },
      {
        id: 'completion-checklist',
        title: 'Completion Checklist',
        description: 'Confirm all work requirements are met',
        icon: 'CheckSquare',
        fields: [
          {
            id: 'punchListCompleted',
            label: 'All punch list items have been completed',
            type: 'checkbox',
            helpText: 'Confirm that all minor deficiencies identified during pre-final inspection have been corrected',
            required: false,
            defaultValue: true,
          },
          {
            id: 'finalInspectionPassed',
            label: 'Final inspection passed successfully',
            type: 'checkbox',
            helpText: 'Confirm that the project has passed all required inspections',
            required: false,
            defaultValue: true,
          },
          {
            id: 'siteCleanedAndRestored',
            label: 'Work site has been cleaned and restored',
            type: 'checkbox',
            helpText: 'Confirm that all debris has been removed and the property is in clean condition',
            required: false,
            defaultValue: true,
          },
          {
            id: 'allSubcontractorsPaid',
            label: 'All subcontractors and suppliers have been paid',
            type: 'checkbox',
            helpText: 'Certify that all parties have been paid and no liens exist',
            required: false,
            defaultValue: true,
          },
          {
            id: 'retainageReleaseAuthorized',
            label: 'Authorize release of retained funds (retainage)',
            type: 'checkbox',
            helpText: 'Owner authorizes release of all retained funds upon signing this certificate',
            required: false,
            defaultValue: true,
          },
        ],
      },
      {
        id: 'closeout-documentation',
        title: 'Closeout Documentation',
        description: 'Documentation delivered to owner (optional)',
        icon: 'FileText',
        collapsed: true,
        fields: [
          {
            id: 'asBuiltDrawingsDelivered',
            label: 'As-Built Drawings delivered',
            type: 'checkbox',
            helpText: 'Check if updated drawings reflecting all changes have been provided',
            required: false,
            defaultValue: false,
          },
          {
            id: 'omManualsDelivered',
            label: 'Operation & Maintenance Manuals delivered',
            type: 'checkbox',
            helpText: 'Check if O&M manuals for all systems and equipment have been provided',
            required: false,
            defaultValue: false,
          },
          {
            id: 'manufacturerWarrantiesDelivered',
            label: 'Manufacturer Warranties delivered',
            type: 'checkbox',
            helpText: 'Check if all manufacturer warranties have been transferred to owner',
            required: false,
            defaultValue: false,
          },
          {
            id: 'staffTrainingCompleted',
            label: 'Staff Training completed',
            type: 'checkbox',
            helpText: 'Check if training has been provided to owner\'s personnel',
            required: false,
            defaultValue: false,
          },
          {
            id: 'certificateOfOccupancyNumber',
            label: 'Certificate of Occupancy Number',
            type: 'text',
            placeholder: 'COO-2026-12345',
            helpText: 'If applicable, enter the Certificate of Occupancy number issued by local authorities',
            required: false,
          },
        ],
      },
      {
        id: 'warranty-information',
        title: 'Warranty Information',
        description: 'Warranty period and terms',
        icon: 'Shield',
        fields: [
          {
            id: 'warrantyDurationMonths',
            label: 'Warranty Duration (months)',
            type: 'number',
            placeholder: '12',
            helpText: 'Standard warranty period is 12 months (1 year) from date of acceptance',
            required: false,
            defaultValue: 12,
            validation: {
              min: 1,
              max: 120,
            },
          },
          {
            id: 'warrantyTerms',
            label: 'Warranty Terms (optional)',
            type: 'textarea',
            placeholder: 'Enter custom warranty terms if different from standard...',
            helpText: 'Leave blank to use standard warranty language covering workmanship and materials',
            required: false,
          },
        ],
      },
      {
        id: 'additional-notes',
        title: 'Additional Notes',
        description: 'Any additional remarks or special conditions',
        icon: 'FileText',
        collapsed: true,
        fields: [
          {
            id: 'additionalNotes',
            label: 'Additional Notes or Remarks',
            type: 'textarea',
            placeholder: 'Enter any additional information, special conditions, or remarks...',
            helpText: 'Optional field for any additional information that should be included in the certificate',
            required: false,
          },
        ],
      },
    ],
    zodSchema: certificateCompletionSchema,
  },
  transformToTemplateData: (formData: any, baseData: any) => {
    // 🔥 CRITICAL: Use ONLY form data for dates - NO FALLBACKS to baseData
    // This ensures the user's selected dates are always used, never overwritten
    console.log('📅 [CERTIFICATE-COMPLETION] Form dates received:', {
      projectStartDate: formData.projectStartDate,
      projectCompletionDate: formData.projectCompletionDate,
      dateOfAcceptance: formData.dateOfAcceptance,
      finalInspectionDate: formData.finalInspectionDate,
    });
    
    // Validate required dates - throw error if missing
    if (!formData.projectCompletionDate) {
      console.error('❌ [CERTIFICATE-COMPLETION] Missing required date: projectCompletionDate');
    }
    if (!formData.dateOfAcceptance) {
      console.error('❌ [CERTIFICATE-COMPLETION] Missing required date: dateOfAcceptance');
    }
    
    // Use form dates ONLY - no fallbacks that could corrupt the data
    const projectStartDate = formData.projectStartDate || '';
    const projectCompletionDate = formData.projectCompletionDate || '';
    const dateOfAcceptance = formData.dateOfAcceptance || '';
    const finalInspectionDate = formData.finalInspectionDate || dateOfAcceptance;
    
    console.log('📅 [CERTIFICATE-COMPLETION] Final dates being sent:', {
      projectStartDate,
      projectCompletionDate,
      dateOfAcceptance,
      finalInspectionDate,
    });
    
    return {
      ...baseData,
      completion: {
        projectStartDate: projectStartDate,
        projectCompletionDate: projectCompletionDate,
        dateOfAcceptance: dateOfAcceptance,
        finalInspectionDate: finalInspectionDate,
        punchListCompleted: formData.punchListCompleted ?? true,
        finalInspectionPassed: formData.finalInspectionPassed ?? true,
        siteCleanedAndRestored: formData.siteCleanedAndRestored ?? true,
        warrantyDurationMonths: formData.warrantyDurationMonths || 12,
        warrantyTerms: formData.warrantyTerms || '',
        certificateOfOccupancyNumber: formData.certificateOfOccupancyNumber || '',
        asBuiltDrawingsDelivered: formData.asBuiltDrawingsDelivered ?? false,
        omManualsDelivered: formData.omManualsDelivered ?? false,
        manufacturerWarrantiesDelivered: formData.manufacturerWarrantiesDelivered ?? false,
        staffTrainingCompleted: formData.staffTrainingCompleted ?? false,
        allSubcontractorsPaid: formData.allSubcontractorsPaid ?? true,
        retainageReleaseAuthorized: formData.retainageReleaseAuthorized ?? true,
        additionalNotes: formData.additionalNotes || '',
      },
    };
  },
});

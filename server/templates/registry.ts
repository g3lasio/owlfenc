/**
 * Template Registry - Multi-Template System
 * 
 * Phase 1: Legal Defense Document Templates
 * Versioning from Day 1 for legal compliance
 */

export type SignatureType = 'none' | 'single' | 'dual';
export type TemplateCategory = 'contract' | 'document' | 'subcontract';
export type TemplateStatus = 'active' | 'coming_soon' | 'deprecated';

export interface ContractorBranding {
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  logo?: string;
}

export interface TemplateData {
  client: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  contractor: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    license?: string;
    company?: string;
  };
  project: {
    type: string;
    description: string;
    location: string;
    startDate?: string;
    endDate?: string;
  };
  financials: {
    total: number;
    subtotal?: number;
    tax?: number;
    taxRate?: number;
  };
  changeOrder?: {
    originalContractDate: string;
    originalContractId: string;
    changeDescription: string;
    additionalCost: number;
    revisedTotal: number;
    newCompletionDate?: string;
  };
  addendum?: {
    originalContractDate: string;
    originalContractId: string;
    modifications: string[];
    effectiveDate: string;
  };
  workOrder?: {
    workOrderNumber: string;
    masterContractId?: string;
    specificTasks: string[];
    materialsProvided: string[];
    deliverables: string[];
  };
  lienWaiver?: {
    paymentAmount: number;
    paymentDate: string;
    paymentPeriod?: string;
    throughDate?: string;
    isFinal: boolean;
    remainingBalance?: number;
  };
  completion?: {
    completionDate: string;
    punchListItems?: string[];
    punchListCompleted: boolean;
    finalInspectionPassed: boolean;
    inspectionDate?: string;
  };
  warranty?: {
    warrantyPeriod: string;
    warrantyStartDate: string;
    warrantyEndDate: string;
    coveredItems: string[];
    exclusions: string[];
  };
}

export interface ContractTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: TemplateCategory;
  subcategory?: string;
  status: TemplateStatus;
  templateVersion: string;
  signatureType: SignatureType;
  /** If true, the template HTML already includes signature placeholders (.signature-line, .date-line)
   *  and the PDF service should NOT inject a fallback signature section */
  includesSignaturePlaceholders?: boolean;
  requiredFields: string[];
  optionalFields: string[];
  priority: number;
  icon?: string;
  generateHTML: (data: TemplateData, branding: ContractorBranding) => string;
}

export interface TemplateRegistryEntry {
  template: ContractTemplate;
  createdAt: Date;
  updatedAt: Date;
}

class TemplateRegistry {
  private templates: Map<string, TemplateRegistryEntry> = new Map();

  register(template: ContractTemplate): void {
    this.templates.set(template.id, {
      template,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`📋 [REGISTRY] Template registered: ${template.id} v${template.templateVersion}`);
  }

  get(templateId: string): ContractTemplate | undefined {
    return this.templates.get(templateId)?.template;
  }

  getAll(): ContractTemplate[] {
    return Array.from(this.templates.values())
      .map(entry => entry.template)
      .sort((a, b) => a.priority - b.priority);
  }

  getActive(): ContractTemplate[] {
    return this.getAll().filter(t => t.status === 'active');
  }

  getByCategory(category: TemplateCategory): ContractTemplate[] {
    return this.getActive().filter(t => t.category === category);
  }

  exists(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  getVersion(templateId: string): string | undefined {
    return this.templates.get(templateId)?.template.templateVersion;
  }

  getMetadata(): Array<{
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: TemplateCategory;
    status: TemplateStatus;
    templateVersion: string;
    signatureType: SignatureType;
    icon?: string;
  }> {
    return this.getAll().map(t => ({
      id: t.id,
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      category: t.category,
      status: t.status,
      templateVersion: t.templateVersion,
      signatureType: t.signatureType,
      icon: t.icon,
    }));
  }
}

export const templateRegistry = new TemplateRegistry();

/**
 * Feature Flags Configuration
 * 
 * Permite habilitar/deshabilitar features sin redeploy.
 * Phase 1: Legal Defense Multi-Template System
 */

export interface FeatureFlags {
  multiTemplateSystem: boolean;
  documentTypeSelector: boolean;
  independentContractorTemplate: boolean;
  changeOrderTemplate: boolean;
  contractAddendumTemplate: boolean;
  workOrderTemplate: boolean;
  lienWaiverTemplate: boolean;
  certificateCompletionTemplate: boolean;
  warrantyAgreementTemplate: boolean;
}

const defaultFlags: FeatureFlags = {
  multiTemplateSystem: true,
  documentTypeSelector: true,
  independentContractorTemplate: true,
  changeOrderTemplate: true,
  contractAddendumTemplate: true,
  workOrderTemplate: true,
  lienWaiverTemplate: true,
  certificateCompletionTemplate: true,
  warrantyAgreementTemplate: true,
};

class FeatureFlagService {
  private flags: FeatureFlags;

  constructor() {
    this.flags = this.loadFlags();
  }

  private loadFlags(): FeatureFlags {
    return {
      multiTemplateSystem: this.parseEnvFlag('FF_MULTI_TEMPLATE_SYSTEM', defaultFlags.multiTemplateSystem),
      documentTypeSelector: this.parseEnvFlag('FF_DOCUMENT_TYPE_SELECTOR', defaultFlags.documentTypeSelector),
      independentContractorTemplate: this.parseEnvFlag('FF_INDEPENDENT_CONTRACTOR_TEMPLATE', defaultFlags.independentContractorTemplate),
      changeOrderTemplate: this.parseEnvFlag('FF_CHANGE_ORDER_TEMPLATE', defaultFlags.changeOrderTemplate),
      contractAddendumTemplate: this.parseEnvFlag('FF_CONTRACT_ADDENDUM_TEMPLATE', defaultFlags.contractAddendumTemplate),
      workOrderTemplate: this.parseEnvFlag('FF_WORK_ORDER_TEMPLATE', defaultFlags.workOrderTemplate),
      lienWaiverTemplate: this.parseEnvFlag('FF_LIEN_WAIVER_TEMPLATE', defaultFlags.lienWaiverTemplate),
      certificateCompletionTemplate: this.parseEnvFlag('FF_CERTIFICATE_COMPLETION_TEMPLATE', defaultFlags.certificateCompletionTemplate),
      warrantyAgreementTemplate: this.parseEnvFlag('FF_WARRANTY_AGREEMENT_TEMPLATE', defaultFlags.warrantyAgreementTemplate),
    };
  }

  private parseEnvFlag(envKey: string, defaultValue: boolean): boolean {
    const envValue = process.env[envKey];
    if (envValue === undefined || envValue === '') {
      return defaultValue;
    }
    return envValue.toLowerCase() === 'true' || envValue === '1';
  }

  isEnabled(flagName: keyof FeatureFlags): boolean {
    return this.flags[flagName] ?? false;
  }

  isMultiTemplateSystemEnabled(): boolean {
    return this.flags.multiTemplateSystem;
  }

  isDocumentTypeSelectorEnabled(): boolean {
    return this.flags.documentTypeSelector;
  }

  isTemplateEnabled(templateId: string): boolean {
    const templateFlagMap: Record<string, keyof FeatureFlags> = {
      'independent-contractor': 'independentContractorTemplate',
      'change-order': 'changeOrderTemplate',
      'contract-addendum': 'contractAddendumTemplate',
      'work-order': 'workOrderTemplate',
      'lien-waiver': 'lienWaiverTemplate',
      'certificate-completion': 'certificateCompletionTemplate',
      'warranty-agreement': 'warrantyAgreementTemplate',
    };

    const flagName = templateFlagMap[templateId];
    
    // If no explicit flag mapping exists, default to enabled (allow new templates to appear)
    if (!flagName) {
      return this.flags.multiTemplateSystem;
    }

    return this.flags.multiTemplateSystem && this.flags[flagName];
  }

  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  reloadFlags(): void {
    this.flags = this.loadFlags();
    console.log('🏳️ [FEATURE-FLAGS] Flags reloaded:', this.flags);
  }
}

export const featureFlags = new FeatureFlagService();

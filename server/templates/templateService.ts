/**
 * Template Service - Document Generation Manager
 * 
 * Manages template retrieval, validation, and HTML generation
 * Routes requests to appropriate template based on templateId
 */

import { featureFlags } from '../config/featureFlags';
import { 
  templateRegistry, 
  ContractTemplate, 
  TemplateData, 
  ContractorBranding,
  TemplateCategory 
} from './registry';

import './documents/change-order';
import './documents/contract-addendum';
import './documents/work-order';
import './documents/lien-waiver-partial';
import './documents/lien-waiver-final';
import './documents/certificate-completion';
import './documents/warranty-agreement';

export interface TemplateGenerationResult {
  success: boolean;
  html?: string;
  error?: string;
  metadata?: {
    templateId: string;
    templateVersion: string;
    signatureType: string;
    generationTime: number;
  };
}

export interface TemplateValidationResult {
  valid: boolean;
  missingFields: string[];
  errors: string[];
}

class TemplateService {
  
  isTemplateSystemEnabled(): boolean {
    return featureFlags.isMultiTemplateSystemEnabled();
  }

  isTemplateAvailable(templateId: string): boolean {
    if (!this.isTemplateSystemEnabled()) {
      return false;
    }

    if (!featureFlags.isTemplateEnabled(templateId)) {
      return false;
    }

    const template = templateRegistry.get(templateId);
    return template?.status === 'active';
  }

  getTemplate(templateId: string): ContractTemplate | undefined {
    if (!this.isTemplateAvailable(templateId)) {
      return undefined;
    }
    return templateRegistry.get(templateId);
  }

  getAvailableTemplates(): ContractTemplate[] {
    if (!this.isTemplateSystemEnabled()) {
      return [];
    }

    return templateRegistry.getActive().filter(template => 
      featureFlags.isTemplateEnabled(template.id)
    );
  }

  getTemplatesByCategory(category: TemplateCategory): ContractTemplate[] {
    return this.getAvailableTemplates().filter(t => t.category === category);
  }

  getTemplateMetadata(): Array<{
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: TemplateCategory;
    signatureType: string;
    icon?: string;
  }> {
    return this.getAvailableTemplates().map(t => ({
      id: t.id,
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      category: t.category,
      signatureType: t.signatureType,
      icon: t.icon,
    }));
  }

  validateData(templateId: string, data: Partial<TemplateData>): TemplateValidationResult {
    const template = templateRegistry.get(templateId);
    
    if (!template) {
      return {
        valid: false,
        missingFields: [],
        errors: [`Template '${templateId}' not found`],
      };
    }

    const missingFields: string[] = [];
    const errors: string[] = [];

    for (const field of template.requiredFields) {
      const value = this.getNestedValue(data, field);
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
      errors,
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async generateDocument(
    templateId: string,
    data: TemplateData,
    branding: ContractorBranding
  ): Promise<TemplateGenerationResult> {
    const startTime = Date.now();

    try {
      console.log(`📋 [TEMPLATE-SERVICE] Generating document: ${templateId}`);

      if (!this.isTemplateAvailable(templateId)) {
        return {
          success: false,
          error: `Template '${templateId}' is not available or not enabled`,
        };
      }

      const template = templateRegistry.get(templateId)!;

      const validation = this.validateData(templateId, data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
        };
      }

      const html = template.generateHTML(data, branding);

      const generationTime = Date.now() - startTime;

      console.log(`✅ [TEMPLATE-SERVICE] Document generated: ${templateId} in ${generationTime}ms`);

      return {
        success: true,
        html,
        metadata: {
          templateId: template.id,
          templateVersion: template.templateVersion,
          signatureType: template.signatureType,
          generationTime,
        },
      };
    } catch (error) {
      console.error(`❌ [TEMPLATE-SERVICE] Error generating document:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating document',
      };
    }
  }
}

export const templateService = new TemplateService();

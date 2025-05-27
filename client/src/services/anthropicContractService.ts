// client/src/services/anthropicContractService.ts

import { analyzeLegalCompliance, generateLegalClausesHTML } from './legalComplianceService';

export interface ContractGenerationRequest {
  projectData: Record<string, any>;
  template: string;
  legalRequirements: any;
  enhancementLevel: 'basic' | 'professional' | 'premium';
}

export interface ContractGenerationResult {
  success: boolean;
  html: string;
  metadata: {
    generatedAt: string;
    enhancementLevel: string;
    complianceScore: number;
    aiEnhancements: string[];
  };
  error?: string;
}

/**
 * Genera un contrato usando Anthropic Claude con inteligencia contextual
 */
export async function generateContractWithAnthropic(
  projectData: Record<string, any>,
  baseTemplate: string,
  enhancementLevel: 'basic' | 'professional' | 'premium' = 'professional'
): Promise<ContractGenerationResult> {
  try {
    // Analizar cumplimiento legal
    const legalCompliance = analyzeLegalCompliance(
      projectData.legal?.governingState || 'California',
      projectData.project?.type || 'general',
      parseFloat(projectData.payment?.totalAmount?.replace(/[^0-9.]/g, '') || '0'),
      projectData.project?.isResidential !== false
    );

    // Preparar el prompt para Anthropic
    const prompt = buildAnthropicPrompt(projectData, legalCompliance, enhancementLevel);

    // Llamar a la API de Anthropic
    const response = await fetch('/api/anthropic/generate-contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        projectData,
        baseTemplate,
        enhancementLevel,
        legalCompliance
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();

    // Procesar y mejorar el HTML generado
    const enhancedHtml = enhanceGeneratedContract(result.html, projectData, legalCompliance);

    return {
      success: true,
      html: enhancedHtml,
      metadata: {
        generatedAt: new Date().toISOString(),
        enhancementLevel,
        complianceScore: legalCompliance.complianceScore,
        aiEnhancements: result.enhancements || []
      }
    };

  } catch (error) {
    console.error('Error generating contract with Anthropic:', error);
    
    // Fallback: generar contrato usando plantilla base
    const fallbackHtml = generateFallbackContract(projectData, baseTemplate, legalCompliance);
    
    return {
      success: false,
      html: fallbackHtml,
      metadata: {
        generatedAt: new Date().toISOString(),
        enhancementLevel: 'basic',
        complianceScore: legalCompliance.complianceScore,
        aiEnhancements: []
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Construye un prompt especializado para Anthropic Claude
 */
function buildAnthropicPrompt(
  projectData: Record<string, any>,
  legalCompliance: any,
  enhancementLevel: string
): string {
  const projectType = projectData.project?.type || 'general construction';
  const projectValue = projectData.payment?.totalAmount || 'unspecified';
  const clientLocation = projectData.client?.address || 'unspecified';
  const state = projectData.legal?.governingState || 'California';

  let prompt = `You are an expert construction contract attorney specializing in ${state} construction law. Generate a comprehensive Independent Contractor Agreement with the following specifications:

PROJECT DETAILS:
- Type: ${projectType}
- Value: ${projectValue}
- Location: ${clientLocation}
- State: ${state}
- Enhancement Level: ${enhancementLevel}

CLIENT INFORMATION:
- Name: ${projectData.client?.name || '[Client Name]'}
- Address: ${projectData.client?.address || '[Client Address]'}
- Phone: ${projectData.client?.phone || '[Client Phone]'}
- Email: ${projectData.client?.email || '[Client Email]'}

CONTRACTOR INFORMATION:
- Company: ${projectData.contractor?.companyName || '[Contractor Company]'}
- Contact: ${projectData.contractor?.contactName || '[Contractor Contact]'}
- Address: ${projectData.contractor?.address || '[Contractor Address]'}
- License: ${projectData.contractor?.license || '[License Number]'}

PROJECT SCOPE:
${projectData.project?.scope || 'Detailed project scope to be defined'}

LEGAL COMPLIANCE REQUIREMENTS:
- State: ${state}
- Required Liability Insurance: $${legalCompliance.insuranceMinimums.liability?.toLocaleString() || '1,000,000'}
- Workers Comp Required: ${legalCompliance.insuranceMinimums.workersComp ? 'Yes' : 'No'}
- Performance Bond: ${legalCompliance.insuranceMinimums.bond ? `$${legalCompliance.insuranceMinimums.bond.toLocaleString()}` : 'Not required'}

ENHANCEMENT REQUIREMENTS:`;

  if (enhancementLevel === 'basic') {
    prompt += `
- Generate standard contractor protections
- Include basic payment terms and scope definition
- Ensure minimum legal compliance`;
  } else if (enhancementLevel === 'professional') {
    prompt += `
- Include comprehensive contractor protections
- Add detailed change order procedures
- Include lien rights and dispute resolution
- Add warranty and defect remedy procedures
- Include professional liability limitations`;
  } else if (enhancementLevel === 'premium') {
    prompt += `
- Maximum contractor protections and legal safeguards
- Detailed risk allocation and liability limitations
- Sophisticated payment and performance terms
- Comprehensive warranty and defect procedures
- Advanced dispute resolution mechanisms
- Industry-specific clauses and protections`;
  }

  prompt += `

CRITICAL REQUIREMENTS:
1. MUST include all ${state}-specific legal requirements
2. MUST prioritize contractor protection while maintaining fairness
3. MUST include detailed payment protection clauses
4. MUST address scope changes and additional work authorization
5. MUST include mechanics lien rights where applicable
6. MUST specify insurance and bonding requirements
7. MUST include clear termination and remedy procedures

OUTPUT FORMAT:
Generate complete HTML contract using professional styling with these specific sections:
1. Contract header with parties information
2. Background and purpose
3. Scope of work (detailed)
4. Payment terms with contractor protections
5. Performance standards and timelines
6. Change order procedures
7. Insurance and bonding requirements
8. Warranty and defect remedy procedures
9. Termination and default provisions
10. Legal protections and liability limitations
11. ${state}-specific compliance clauses
12. Dispute resolution and attorney fees
13. Signature blocks

STYLE REQUIREMENTS:
- Use the existing CSS classes: contract-container, section-title, article, article-title, article-content
- Make contractor protections prominent and clear
- Use professional language that protects contractor interests
- Ensure all legal requirements are clearly stated
- Include warning boxes for critical payment and lien information

Generate the complete HTML now:`;

  return prompt;
}

/**
 * Mejora el contrato generado con elementos adicionales
 */
function enhanceGeneratedContract(
  generatedHtml: string,
  projectData: Record<string, any>,
  legalCompliance: any
): string {
  let enhanced = generatedHtml;

  // Agregar cláusulas legales específicas del estado
  const legalClausesHtml = generateLegalClausesHTML(legalCompliance, projectData);
  
  // Insertar antes de las firmas
  const signatureIndex = enhanced.indexOf('<div class="signatures">');
  if (signatureIndex > -1) {
    enhanced = enhanced.slice(0, signatureIndex) + 
               legalClausesHtml + 
               enhanced.slice(signatureIndex);
  }

  // Reemplazar variables que puedan haber quedado
  enhanced = replaceContractVariables(enhanced, projectData);

  // Agregar metadata y footer
  enhanced = addContractMetadata(enhanced, legalCompliance);

  return enhanced;
}

/**
 * Reemplaza variables en el HTML del contrato
 */
function replaceContractVariables(html: string, data: Record<string, any>): string {
  let processed = html;

  // Función recursiva para reemplazar variables anidadas
  function replaceVariables(obj: any, prefix: string = '') {
    if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          replaceVariables(value, fullKey);
        } else {
          const placeholder = `{{${fullKey}}}`;
          const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          processed = processed.replace(regex, String(value || ''));
        }
      });
    }
  }

  replaceVariables(data);

  // Limpiar variables no reemplazadas
  processed = processed.replace(/\{\{[^}]+\}\}/g, '[To be filled]');

  return processed;
}

/**
 * Agrega metadata y información de cumplimiento al contrato
 */
function addContractMetadata(html: string, legalCompliance: any): string {
  const metadata = `
    <div class="contract-metadata" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-size: 0.9em; color: #666;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>Legal Compliance Score:</strong> ${legalCompliance.complianceScore}/100
        </div>
        <div>
          <strong>Generated:</strong> ${new Date().toLocaleDateString()}
        </div>
      </div>
      ${legalCompliance.complianceScore < 80 ? 
        '<div style="color: #d32f2f; margin-top: 10px;"><strong>⚠️ Review Required:</strong> This contract may need additional legal review.</div>' : 
        '<div style="color: #2e7d32; margin-top: 10px;"><strong>✅ Compliance:</strong> This contract meets standard legal requirements.</div>'
      }
    </div>
  `;

  // Insertar antes del footer
  const footerIndex = html.indexOf('<div class="contract-footer">');
  if (footerIndex > -1) {
    return html.slice(0, footerIndex) + metadata + html.slice(footerIndex);
  }

  return html + metadata;
}

/**
 * Genera contrato de respaldo sin IA
 */
function generateFallbackContract(
  projectData: Record<string, any>,
  baseTemplate: string,
  legalCompliance: any
): string {
  console.log('Generating fallback contract without AI');
  
  let contract = baseTemplate;
  
  // Reemplazar variables básicas
  contract = replaceContractVariables(contract, projectData);
  
  // Agregar cláusulas legales
  const legalClausesHtml = generateLegalClausesHTML(legalCompliance, projectData);
  const signatureIndex = contract.indexOf('<div class="signatures">');
  if (signatureIndex > -1) {
    contract = contract.slice(0, signatureIndex) + 
               legalClausesHtml + 
               contract.slice(signatureIndex);
  }
  
  // Agregar metadata
  contract = addContractMetadata(contract, legalCompliance);
  
  return contract;
}

/**
 * Valida el contrato generado antes de entregar al usuario
 */
export function validateGeneratedContract(html: string, projectData: Record<string, any>): {
  isValid: boolean;
  warnings: string[];
  missingElements: string[];
} {
  const warnings: string[] = [];
  const missingElements: string[] = [];

  // Verificar elementos críticos
  if (!html.includes(projectData.client?.name || '')) {
    missingElements.push('Client name not found in contract');
  }

  if (!html.includes(projectData.contractor?.companyName || '')) {
    missingElements.push('Contractor company name not found');
  }

  if (!html.includes(projectData.payment?.totalAmount || '')) {
    missingElements.push('Payment amount not specified');
  }

  // Verificar secciones importantes
  const requiredSections = [
    'Scope of Work',
    'Payment Terms',
    'signatures',
    'Performance',
    'Insurance'
  ];

  requiredSections.forEach(section => {
    if (!html.toLowerCase().includes(section.toLowerCase())) {
      warnings.push(`${section} section may be missing or incomplete`);
    }
  });

  return {
    isValid: missingElements.length === 0,
    warnings,
    missingElements
  };
}
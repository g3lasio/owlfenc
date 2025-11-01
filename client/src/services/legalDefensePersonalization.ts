
/**
 * Servicio de Personalización de Defensa Legal
 * Integra el perfil del contratista con el motor de defensa para crear
 * contratos altamente personalizados y protectivos.
 */

export interface ContractorPersonalization {
  // Datos del contratista desde el perfil
  businessInfo: {
    structure: string;
    ein: string;
    licenses: Array<any>;
    insurance: Array<any>;
    bonding: any;
  };
  
  // Preferencias legales
  legalPreferences: {
    riskTolerance: string;
    preferredClauses: string[];
    pastExperiences: string[];
    vulnerabilities: string[];
  };
  
  // Contexto del proyecto actual
  projectContext: {
    type: string;
    value: number;
    location: string;
    client: any;
  };
}

export class LegalDefensePersonalizer {
  
  /**
   * Obtiene toda la información personalizada del contratista
   */
  async getContractorPersonalization(projectData: any): Promise<ContractorPersonalization> {
    try {
      // Obtener perfil de la empresa
      const companyProfile = await this.getCompanyProfile();
      
      // Obtener perfil de defensa legal
      const legalProfile = await this.getLegalDefenseProfile();
      
      // Combinar con contexto del proyecto
      return {
        businessInfo: {
          structure: legalProfile.businessStructure || companyProfile.businessType,
          ein: legalProfile.einNumber || companyProfile.ein,
          licenses: legalProfile.licenses || [],
          insurance: legalProfile.insurance || [],
          bonding: legalProfile.bonding
        },
        legalPreferences: {
          riskTolerance: legalProfile.riskTolerance || 'moderate',
          preferredClauses: legalProfile.preferredClauses || [],
          pastExperiences: legalProfile.pastLegalIssues || [],
          vulnerabilities: legalProfile.specialtyVulnerabilities || []
        },
        projectContext: {
          type: projectData.projectType || projectData.fenceType,
          value: projectData.totalAmount || 0,
          location: projectData.location || `${projectData.city}, ${projectData.state}`,
          client: projectData.client
        }
      };
    } catch (error) {
      console.error('Error getting contractor personalization:', error);
      return this.getDefaultPersonalization();
    }
  }

  /**
   * Genera prompt personalizado para Mervin AI Legal Defense
   */
  generatePersonalizedLegalPrompt(personalization: ContractorPersonalization, basePrompt: string): string {
    const { businessInfo, legalPreferences, projectContext } = personalization;
    
    let personalizedPrompt = `${basePrompt}\n\n=== INFORMACIÓN ESPECÍFICA DEL CONTRATISTA ===\n`;
    
    // Información del negocio
    personalizedPrompt += `ESTRUCTURA LEGAL: ${businessInfo.structure}\n`;
    if (businessInfo.ein) {
      personalizedPrompt += `EIN: ${businessInfo.ein}\n`;
    }
    
    // Licencias y seguros
    if (businessInfo.licenses.length > 0) {
      personalizedPrompt += `LICENCIAS: ${businessInfo.licenses.map(l => `${l.type} ${l.number}`).join(', ')}\n`;
    }
    
    if (businessInfo.insurance.length > 0) {
      personalizedPrompt += `SEGUROS: ${businessInfo.insurance.map(i => `${i.type} (${i.limits})`).join(', ')}\n`;
    }
    
    if (businessInfo.bonding.available) {
      personalizedPrompt += `BONDING: Disponible hasta ${businessInfo.bonding.capacity}\n`;
    }
    
    // Preferencias legales
    personalizedPrompt += `\nTOLERANCIA AL RIESGO: ${legalPreferences.riskTolerance.toUpperCase()}\n`;
    
    if (legalPreferences.preferredClauses.length > 0) {
      personalizedPrompt += `CLÁUSULAS EXITOSAS ANTERIORES:\n${legalPreferences.preferredClauses.map(c => `- ${c}`).join('\n')}\n`;
    }
    
    if (legalPreferences.pastExperiences.length > 0) {
      personalizedPrompt += `EXPERIENCIAS LEGALES PASADAS A CONSIDERAR:\n${legalPreferences.pastExperiences.map(e => `- ${e}`).join('\n')}\n`;
    }
    
    if (legalPreferences.vulnerabilities.length > 0) {
      personalizedPrompt += `VULNERABILIDADES CONOCIDAS EN ESTE TIPO DE TRABAJO:\n${legalPreferences.vulnerabilities.filter(v => 
        v.toLowerCase().includes(projectContext.type.toLowerCase())
      ).map(v => `- ${v}`).join('\n')}\n`;
    }
    
    // Contexto del proyecto
    personalizedPrompt += `\n=== CONTEXTO DEL PROYECTO ACTUAL ===\n`;
    personalizedPrompt += `TIPO: ${projectContext.type}\n`;
    personalizedPrompt += `VALOR: $${projectContext.value.toLocaleString()}\n`;
    personalizedPrompt += `UBICACIÓN: ${projectContext.location}\n`;
    
    // Instrucciones específicas basadas en personalización
    personalizedPrompt += `\n=== INSTRUCCIONES ESPECÍFICAS DE DEFENSA ===\n`;
    
    if (legalPreferences.riskTolerance === 'conservative') {
      personalizedPrompt += `- Usar máximo nivel de protección, incluso si es menos competitivo\n`;
      personalizedPrompt += `- Incluir todas las cláusulas de limitación de responsabilidad posibles\n`;
      personalizedPrompt += `- Términos de pago muy estrictos con penalidades por retraso\n`;
    } else if (legalPreferences.riskTolerance === 'aggressive') {
      personalizedPrompt += `- Balance entre protección y competitividad\n`;
      personalizedPrompt += `- Enfocarse en las protecciones más críticas para este contratista\n`;
      personalizedPrompt += `- Términos de pago flexibles pero seguros\n`;
    }
    
    if (projectContext.value > 50000) {
      personalizedPrompt += `- PROYECTO DE ALTO VALOR: Incluir protecciones adicionales por el monto significativo\n`;
    }
    
    if (businessInfo.structure === 'LLC') {
      personalizedPrompt += `- PROTECCIÓN LLC: Asegurar que no se requieren garantías personales\n`;
    }
    
    personalizedPrompt += `\nGenera un contrato que refleje específicamente las necesidades y experiencias de ESTE contratista.`;
    
    return personalizedPrompt;
  }

  /**
   * Analiza riesgos específicos basados en el perfil del contratista
   */
  analyzePersonalizedRisks(personalization: ContractorPersonalization): any {
    const risks = [];
    const protections = [];
    
    const { businessInfo, legalPreferences, projectContext } = personalization;
    
    // Análisis basado en experiencias pasadas
    if (legalPreferences.pastExperiences.some(exp => exp.toLowerCase().includes('payment'))) {
      risks.push('PAYMENT_RISK_HIGH');
      protections.push('Enhanced payment terms with strict penalties');
      protections.push('Lien rights and material retention clauses');
    }
    
    if (legalPreferences.pastExperiences.some(exp => exp.toLowerCase().includes('scope'))) {
      risks.push('SCOPE_CREEP_RISK');
      protections.push('Detailed scope definition with change order procedures');
      protections.push('Additional work authorization requirements');
    }
    
    // Análisis basado en seguros
    const hasGeneralLiability = businessInfo.insurance.some(ins => ins.type.includes('General'));
    if (!hasGeneralLiability) {
      risks.push('INSUFFICIENT_INSURANCE');
      protections.push('Client indemnification clauses');
      protections.push('Liability limitation to contract value');
    }
    
    // Análisis basado en valor del proyecto
    if (projectContext.value > 100000 && legalPreferences.riskTolerance === 'conservative') {
      protections.push('Performance bond requirement from client');
      protections.push('Extended warranty limitations');
    }
    
    // Análisis basado en licencias
    const hasExpiredLicenses = businessInfo.licenses.some(lic => {
      const expDate = new Date(lic.expirationDate);
      return expDate < new Date();
    });
    
    if (hasExpiredLicenses) {
      risks.push('LICENSE_COMPLIANCE_RISK');
      protections.push('Client acknowledgment of license status');
    }
    
    return {
      riskLevel: this.calculateOverallRisk(risks, legalPreferences.riskTolerance),
      identifiedRisks: risks,
      recommendedProtections: protections,
      personalizationScore: this.calculatePersonalizationScore(personalization)
    };
  }

  private async getCompanyProfile(): Promise<any> {
    try {
      // 🛡️ CRITICAL: Usar autenticación robusta
      const token = await robustAuth.getAuthToken();
      
      const response = await fetch('/api/user-profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        console.error('❌ [COMPANY-PROFILE] Token expirado o inválido');
        return {};
      }
      
      return response.ok ? await response.json() : {};
    } catch (error) {
      console.error('❌ [COMPANY-PROFILE] Error loading company profile:', error);
      return {};
    }
  }

  private async getLegalDefenseProfile(): Promise<any> {
    try {
      // 🛡️ CRITICAL: Usar autenticación robusta
      const token = await robustAuth.getAuthToken();
      
      const response = await fetch('/api/legal-defense-profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        console.error('❌ [LEGAL-PROFILE] Token expirado o inválido');
        return {};
      }
      
      return response.ok ? await response.json() : {};
    } catch (error) {
      console.error('❌ [LEGAL-PROFILE] Error loading legal defense profile:', error);
      return {};
    }
  }

  private getDefaultPersonalization(): ContractorPersonalization {
    return {
      businessInfo: {
        structure: 'LLC',
        ein: '',
        licenses: [],
        insurance: [],
        bonding: { available: false, capacity: '', bondingCompany: '' }
      },
      legalPreferences: {
        riskTolerance: 'moderate',
        preferredClauses: [],
        pastExperiences: [],
        vulnerabilities: []
      },
      projectContext: {
        type: 'General Construction',
        value: 0,
        location: '',
        client: null
      }
    };
  }

  private calculateOverallRisk(risks: string[], tolerance: string): string {
    let riskScore = risks.length;
    
    if (tolerance === 'conservative') riskScore += 1;
    if (tolerance === 'aggressive') riskScore -= 1;
    
    if (riskScore >= 4) return 'CRITICAL';
    if (riskScore >= 2) return 'HIGH';
    if (riskScore >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private calculatePersonalizationScore(personalization: ContractorPersonalization): number {
    let score = 0;
    
    // Puntos por información completa
    if (personalization.businessInfo.structure) score += 10;
    if (personalization.businessInfo.ein) score += 10;
    if (personalization.businessInfo.licenses.length > 0) score += 15;
    if (personalization.businessInfo.insurance.length > 0) score += 15;
    if (personalization.businessInfo.bonding.available) score += 10;
    
    // Puntos por experiencia legal documentada
    if (personalization.legalPreferences.pastExperiences.length > 0) score += 20;
    if (personalization.legalPreferences.preferredClauses.length > 0) score += 15;
    if (personalization.legalPreferences.vulnerabilities.length > 0) score += 5;
    
    return Math.min(score, 100); // Máximo 100%
  }
}

export const legalDefensePersonalizer = new LegalDefensePersonalizer();

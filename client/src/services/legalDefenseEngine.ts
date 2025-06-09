/**
 * Legal Defense Engine - Generador inteligente de cláusulas protectivas
 * 
 * Este motor analiza los datos del proyecto y genera cláusulas específicas
 * de alto valor jurídico para protección contractual profesional.
 */

export interface ProjectAnalysis {
  clientInfo?: {
    name?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  projectDetails?: {
    type?: string;
    description?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  };
  financials?: {
    total?: number;
    subtotal?: number;
    tax?: number;
    taxRate?: number;
  };
  materials?: Array<{
    item: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface LegalClause {
  id: string;
  category: 'MANDATORY' | 'RECOMMENDED';
  title: string;
  clause: string;
  justification: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  applicability: string;
}

export class LegalDefenseEngine {
  private analyzeProjectRisks(data: ProjectAnalysis): string[] {
    const risks: string[] = [];
    const location = data.projectDetails?.location || '';
    const projectType = data.projectDetails?.type || '';
    const total = data.financials?.total || 0;
    const description = data.projectDetails?.description || '';

    // Análisis de jurisdicción
    if (location.toLowerCase().includes('california') || location.toLowerCase().includes('ca')) {
      risks.push('CALIFORNIA_JURISDICTION');
    }

    // Análisis de tipo de proyecto
    if (projectType.toLowerCase().includes('fence') || description.toLowerCase().includes('fence')) {
      risks.push('FENCE_INSTALLATION');
    }

    // Análisis de valor del proyecto
    if (total > 25000) {
      risks.push('HIGH_VALUE_PROJECT');
    } else if (total > 10000) {
      risks.push('MEDIUM_VALUE_PROJECT');
    }

    // Análisis de complejidad
    if (description.toLowerCase().includes('gate') || description.toLowerCase().includes('custom')) {
      risks.push('CUSTOM_WORK');
    }

    if (description.toLowerCase().includes('removal') || description.toLowerCase().includes('demolish')) {
      risks.push('DEMOLITION_WORK');
    }

    return risks;
  }

  private generateCaliforniaMandatoryClauses(data: ProjectAnalysis): LegalClause[] {
    const clauses: LegalClause[] = [];
    const total = data.financials?.total || 0;

    // Cláusula de Lien Rights - OBLIGATORIA en California
    clauses.push({
      id: 'CA_LIEN_MANDATORY',
      category: 'MANDATORY',
      title: 'California Mechanic\'s Lien Rights (Civil Code §8000)',
      clause: `NOTICE TO PROPERTY OWNER: Under California law, those who work on your property or provide materials may file a lien on your property if they are not paid. A lien means that your property may be sold to pay for work done or materials provided. To preserve their right to file a lien, certain claimants such as subcontractors or material suppliers are each required to provide you with a document called a "Preliminary Notice." Contractors and laborers who contract directly with you generally are not required to provide this notice. A Preliminary Notice is not a lien. The purpose of the notice is to let you know that the person who sends you the notice has provided or will be providing work or materials for your project, and to inform you of your rights. GENERALLY, THE DEADLINE FOR FILING A LIEN IS 90 DAYS AFTER COMPLETION OF YOUR PROJECT.`,
      justification: 'Obligatorio bajo Civil Code §8000 para todos los proyectos de construcción en California',
      riskLevel: 'HIGH',
      applicability: 'Todos los proyectos de construcción en California'
    });

    // Cláusula de Right to Cancel - OBLIGATORIA para contratos residenciales > $25
    if (total > 25) {
      clauses.push({
        id: 'CA_CANCEL_MANDATORY',
        category: 'MANDATORY',
        title: 'Three-Day Right to Cancel (Civil Code §1689.5)',
        clause: `THREE-DAY RIGHT TO CANCEL: You, the buyer, have the right to cancel this contract within three business days. You may cancel by delivering a signed and dated copy of this cancellation notice, or any other written notice to [CONTRACTOR NAME] at [CONTRACTOR ADDRESS] no later than midnight of the third business day after you signed this contract. You may also cancel by sending a telegram to the above address no later than midnight of the third business day after you signed this contract. If you cancel this contract, the contractor must return to you anything you paid within 10 days of receiving the cancellation notice.`,
        justification: 'Obligatorio bajo Civil Code §1689.5 para contratos residenciales superiores a $25',
        riskLevel: 'HIGH',
        applicability: 'Contratos residenciales en California > $25'
      });
    }

    return clauses;
  }

  private generateProjectSpecificClauses(data: ProjectAnalysis, risks: string[]): LegalClause[] {
    const clauses: LegalClause[] = [];
    const total = data.financials?.total || 0;
    const projectType = data.projectDetails?.type || '';
    const description = data.projectDetails?.description || '';

    // Cláusulas específicas para proyectos de alta valor
    if (risks.includes('HIGH_VALUE_PROJECT')) {
      clauses.push({
        id: 'HIGH_VALUE_PAYMENT',
        category: 'RECOMMENDED',
        title: 'Structured Payment Protection for High-Value Projects',
        clause: `ENHANCED PAYMENT SECURITY: Due to the significant value of this project (${total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}), payments shall be structured as follows: (1) Initial payment of 15% upon contract execution, (2) Progress payments of 25% at 25% completion, 35% at 65% completion, and (3) Final payment of 25% upon substantial completion and client acceptance. Each progress payment is contingent upon documented completion milestones and photographic evidence. Late payments incur a penalty of 2% per month (24% annually). Contractor reserves the right to suspend work immediately upon any payment default exceeding 10 days.`,
        justification: 'Proyectos de alto valor requieren protección financiera estructurada para mitigar riesgo de impago',
        riskLevel: 'HIGH',
        applicability: 'Proyectos superiores a $25,000'
      });

      clauses.push({
        id: 'HIGH_VALUE_MATERIALS',
        category: 'RECOMMENDED',
        title: 'Material Escalation and Supply Chain Protection',
        clause: `MATERIAL COST PROTECTION: Given current market volatility and project value, material costs are subject to adjustment if increases exceed 5% from quoted prices due to market conditions, supply chain disruptions, or government regulations occurring after contract execution. Client will be notified within 48 hours of any anticipated cost increases exceeding $500. Contractor reserves the right to suspend work if materials become unavailable or if price increases exceed 15% without client approval for revised pricing.`,
        justification: 'Proyectos de alto valor enfrentan mayor exposición a fluctuaciones de materiales',
        riskLevel: 'MEDIUM',
        applicability: 'Proyectos con componentes materiales significativos'
      });
    }

    // Cláusulas específicas para trabajos de cerca
    if (risks.includes('FENCE_INSTALLATION')) {
      clauses.push({
        id: 'FENCE_BOUNDARY_PROTECTION',
        category: 'RECOMMENDED',
        title: 'Property Boundary and Easement Verification',
        clause: `BOUNDARY VERIFICATION REQUIREMENT: Prior to commencement, Client must provide current survey or property boundary documentation. Any fence installation on or near property lines requires Client's written certification of boundary accuracy. Contractor is not liable for boundary disputes, easement violations, or neighbor objections arising from fence placement. If boundary disputes arise during construction, work will be suspended until resolution, with Client responsible for any delay costs. Underground utility marking (811 service) is Client's responsibility unless specifically contracted otherwise.`,
        justification: 'Instalaciones de cerca enfrentan riesgos únicos de disputas de límites y servicios subterráneos',
        riskLevel: 'HIGH',
        applicability: 'Proyectos de instalación de cercas y límites de propiedad'
      });

      if (description.toLowerCase().includes('gate')) {
        clauses.push({
          id: 'CUSTOM_GATE_SPECIFICATION',
          category: 'RECOMMENDED',
          title: 'Custom Gate Engineering and Warranty Limitations',
          clause: `CUSTOM GATE SPECIFICATIONS: Custom gate work requires Client approval of detailed engineering specifications before fabrication begins. Changes to gate specifications after fabrication commencement will incur additional charges of actual costs plus 25% markup. Gate hardware warranty is limited to 1 year for mechanical components, excluding normal wear from weather exposure. Automated gate systems require separate electrical permit and inspection at Client's expense.`,
          justification: 'Trabajos de puertas personalizadas requieren especificaciones técnicas precisas',
          riskLevel: 'MEDIUM',
          applicability: 'Proyectos con componentes de puertas personalizadas'
        });
      }
    }

    // Cláusulas para trabajo de demolición
    if (risks.includes('DEMOLITION_WORK')) {
      clauses.push({
        id: 'DEMOLITION_HAZARD_PROTECTION',
        category: 'RECOMMENDED',
        title: 'Demolition Hazard and Unknown Conditions',
        clause: `DEMOLITION RISK ALLOCATION: Removal of existing structures may reveal unknown conditions including hazardous materials, structural damage, or concealed utilities. Discovery of asbestos, lead paint, or other hazardous materials will result in immediate work suspension pending professional remediation at Client's expense. Contractor's responsibility is limited to careful removal using standard industry practices. Client assumes all risk for unknown conditions discovered during demolition. Additional charges will apply for disposal of hazardous materials or unexpected structural complications.`,
        justification: 'Trabajo de demolición presenta riesgos únicos de materiales peligrosos y condiciones ocultas',
        riskLevel: 'HIGH',
        applicability: 'Proyectos que incluyen demolición o remoción de estructuras existentes'
      });
    }

    return clauses;
  }

  private generateAdvancedProtectionClauses(data: ProjectAnalysis): LegalClause[] {
    const clauses: LegalClause[] = [];
    const total = data.financials?.total || 0;

    // Cláusula de Force Majeure especializada
    clauses.push({
      id: 'ENHANCED_FORCE_MAJEURE',
      category: 'RECOMMENDED',
      title: 'Enhanced Force Majeure and Pandemic Protection',
      clause: `FORCE MAJEURE PROTECTION: Performance under this contract is subject to force majeure events including but not limited to: acts of God, government regulations, pandemic-related restrictions, labor strikes, material shortages exceeding 30 days, and utility service interruptions beyond Contractor's control. Upon occurrence of force majeure, Contractor will notify Client within 72 hours. Contract timeline will be extended day-for-day during force majeure periods. If force majeure continues beyond 60 days, either party may terminate with Contractor compensated for work completed plus reasonable demobilization costs.`,
      justification: 'Protección integral contra eventos extraordinarios que han aumentado en frecuencia',
      riskLevel: 'MEDIUM',
      applicability: 'Todos los proyectos de construcción'
    });

    // Cláusula de Change Order Protection
    clauses.push({
      id: 'CHANGE_ORDER_PROTECTION',
      category: 'RECOMMENDED',
      title: 'Change Order Authorization and Cost Protection',
      clause: `CHANGE ORDER PROTOCOL: All changes to original scope must be documented in writing and signed by both parties before implementation. Verbal change authorizations are not binding. Change orders will be priced at actual cost plus 20% markup for overhead and profit. Emergency changes necessary for safety or code compliance may be implemented immediately with written notification within 24 hours. Client's failure to approve or deny change orders within 5 business days will result in work suspension until resolution.`,
      justification: 'Protección contra cambios no autorizados que pueden generar disputas costosas',
      riskLevel: 'HIGH',
      applicability: 'Proyectos con potencial de modificaciones durante construcción'
    });

    // Cláusula de Weather Protection específica
    if (data.projectDetails?.location?.toLowerCase().includes('california')) {
      clauses.push({
        id: 'CALIFORNIA_WEATHER_PROTECTION',
        category: 'RECOMMENDED',
        title: 'California Weather and Wildfire Delay Protection',
        clause: `CALIFORNIA ENVIRONMENTAL DELAYS: Work may be suspended during Red Flag Warning conditions, excessive heat warnings (above 105°F), or Air Quality Index exceeding 150 due to wildfire smoke, as determined by official weather services. Timeline extensions will be granted for weather delays exceeding 2 consecutive days. During wildfire season (May-October), emergency evacuation orders will trigger immediate work suspension with timeline extension equal to delay period plus 3 days for remobilization.`,
        justification: 'California enfrenta condiciones climáticas únicas que afectan significativamente la construcción',
        riskLevel: 'MEDIUM',
        applicability: 'Proyectos en California durante temporada de incendios'
      });
    }

    return clauses;
  }

  public generateIntelligentClauses(data: ProjectAnalysis): LegalClause[] {
    console.log('🧠 Legal Defense Engine: Analyzing project for intelligent clause generation');
    
    const risks = this.analyzeProjectRisks(data);
    console.log('⚖️ Identified risks:', risks);

    const allClauses: LegalClause[] = [];

    // Generar cláusulas obligatorias por jurisdicción
    if (risks.includes('CALIFORNIA_JURISDICTION')) {
      allClauses.push(...this.generateCaliforniaMandatoryClauses(data));
    }

    // Generar cláusulas específicas del proyecto
    allClauses.push(...this.generateProjectSpecificClauses(data, risks));

    // Generar cláusulas de protección avanzada
    allClauses.push(...this.generateAdvancedProtectionClauses(data));

    console.log(`🛡️ Generated ${allClauses.length} intelligent protective clauses`);
    
    return allClauses;
  }
}

export const legalDefenseEngine = new LegalDefenseEngine();
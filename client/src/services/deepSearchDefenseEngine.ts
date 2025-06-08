/**
 * DeepSearch Defense Legal Engine
 * 
 * Sistema exhaustivo de defensa contractual con trazabilidad legal completa,
 * análisis de compliance jurisdiccional y generación de cláusulas defensivas
 * respaldadas por fuentes normativas específicas.
 */

export interface LegalSource {
  id: string;
  type: 'statute' | 'regulation' | 'case_law' | 'code' | 'professional_standard';
  jurisdiction: string;
  citation: string;
  title: string;
  section?: string;
  url?: string;
  effectiveDate: string;
  lastUpdated: string;
}

export interface DefenseClause {
  id: string;
  category: string;
  subcategory: string;
  clause: string;
  rationale: string;
  riskMitigation: string[];
  applicability: {
    projectTypes: string[];
    amountRange: { min?: number; max?: number };
    jurisdiction: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    priority: number; // 1-10, 10 being highest priority
    mandatory: boolean;
  };
  legalSources: LegalSource[];
  consequences?: {
    ifOmitted: string[];
    ifIncluded: string[];
  };
  alternativeVersions?: {
    aggressive: string;
    moderate: string;
    minimal: string;
  };
  customizationOptions: {
    variableFields: string[];
    conditionalText: { condition: string; text: string }[];
  };
  relatedClauses: string[]; // IDs of related clauses
  exclusions?: string[]; // Situations where this clause should NOT be used
}

export interface ComplianceRequirement {
  id: string;
  jurisdiction: string;
  projectType: string;
  requirement: string;
  description: string;
  mandatoryClause: string;
  penalty: string;
  source: LegalSource;
  verificationMethod: string;
  deadlines?: {
    notification: number; // days
    filing: number; // days
    completion: number; // days
  };
}

export interface RiskAssessment {
  category: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  likelihood: number; // 0-100
  impact: number; // 0-100
  mitigationClauses: string[]; // DefenseClause IDs
  costImplication: {
    min: number;
    max: number;
    description: string;
  };
}

export interface DefenseAnalysisResult {
  projectId: string;
  analysisDate: string;
  totalRiskScore: number; // 0-100
  complianceScore: number; // 0-100
  defenseStrength: number; // 0-100
  
  // Análisis por categorías
  riskAssessments: RiskAssessment[];
  mandatoryRequirements: ComplianceRequirement[];
  recommendedClauses: DefenseClause[];
  criticalGaps: string[];
  
  // Jurisdiccional
  primaryJurisdiction: string;
  applicableLaws: LegalSource[];
  
  // Personalización
  contractorProfile: {
    experienceLevel: 'NOVICE' | 'INTERMEDIATE' | 'EXPERT' | 'MASTER';
    specializations: string[];
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  };
  
  // Recomendaciones estratégicas
  strategicRecommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  
  // Warnings y alertas críticas
  criticalWarnings: {
    level: 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    message: string;
    recommendation: string;
    legalBasis: LegalSource;
  }[];
}

class DeepSearchDefenseEngine {
  private defenseClauses: Map<string, DefenseClause> = new Map();
  private complianceRequirements: Map<string, ComplianceRequirement[]> = new Map();
  private legalSources: Map<string, LegalSource> = new Map();

  constructor() {
    this.initializeDefenseClauses();
    this.initializeComplianceRequirements();
    this.initializeLegalSources();
  }

  /**
   * Análisis principal de defensa contractual
   */
  public async analyzeContract(projectData: any): Promise<DefenseAnalysisResult> {
    const analysisDate = new Date().toISOString();
    const jurisdiction = this.extractJurisdiction(projectData);
    const projectType = this.normalizeProjectType(projectData.projectDetails?.type || 'general');
    const projectAmount = this.extractProjectAmount(projectData);

    // Análisis de riesgos por categorías
    const riskAssessments = await this.assessProjectRisks(projectData, jurisdiction, projectType, projectAmount);
    
    // Requisitos de compliance obligatorios
    const mandatoryRequirements = this.getMandatoryRequirements(jurisdiction, projectType, projectAmount);
    
    // Cláusulas recomendadas basadas en riesgo y jurisdicción
    const recommendedClauses = this.selectDefensiveClauses(riskAssessments, mandatoryRequirements, jurisdiction, projectType, projectAmount);
    
    // Análisis de gaps críticos
    const criticalGaps = this.identifyCriticalGaps(projectData, recommendedClauses, mandatoryRequirements);
    
    // Cálculo de scores
    const totalRiskScore = this.calculateTotalRiskScore(riskAssessments);
    const complianceScore = this.calculateComplianceScore(mandatoryRequirements, recommendedClauses);
    const defenseStrength = this.calculateDefenseStrength(recommendedClauses, riskAssessments);
    
    // Fuentes legales aplicables
    const applicableLaws = this.getApplicableLaws(jurisdiction, projectType);
    
    // Perfil del contratista (inferido de datos del proyecto)
    const contractorProfile = this.inferContractorProfile(projectData);
    
    // Recomendaciones estratégicas
    const strategicRecommendations = this.generateStrategicRecommendations(riskAssessments, complianceScore, defenseStrength);
    
    // Warnings críticos
    const criticalWarnings = this.identifyCriticalWarnings(riskAssessments, mandatoryRequirements, projectData);

    return {
      projectId: projectData.id || 'temp_' + Date.now(),
      analysisDate,
      totalRiskScore,
      complianceScore,
      defenseStrength,
      riskAssessments,
      mandatoryRequirements,
      recommendedClauses,
      criticalGaps,
      primaryJurisdiction: jurisdiction,
      applicableLaws,
      contractorProfile,
      strategicRecommendations,
      criticalWarnings
    };
  }

  /**
   * Inicialización de cláusulas defensivas con trazabilidad legal
   */
  private initializeDefenseClauses(): void {
    // Payment Protection - Nivel CRÍTICO
    this.addDefenseClause({
      id: 'PAY_CRIT_001',
      category: 'Payment Protection',
      subcategory: 'Late Payment Penalties',
      clause: 'Late payments shall incur a penalty of 1.5% per month (18% annually) or the maximum rate permitted by law, whichever is greater. After 30 days delinquency, Contractor may suspend all work and demand immediate payment of all outstanding amounts plus accrued penalties.',
      rationale: 'Protects cash flow and incentivizes timely payment while remaining within legal usury limits',
      riskMitigation: ['Cash flow protection', 'Incentivizes prompt payment', 'Legal collection enforcement'],
      applicability: {
        projectTypes: ['all'],
        amountRange: { min: 1000 },
        jurisdiction: ['CA', 'all'],
        riskLevel: 'CRITICAL',
        priority: 10,
        mandatory: true
      },
      legalSources: [
        {
          id: 'CA_CIV_1916_2',
          type: 'statute',
          jurisdiction: 'CA',
          citation: 'California Civil Code § 1916.2',
          title: 'Usury Law - Maximum Interest Rates',
          effectiveDate: '2023-01-01',
          lastUpdated: '2024-01-01'
        }
      ],
      consequences: {
        ifOmitted: ['No legal penalty for late payment', 'Weak collection position', 'Cash flow vulnerability'],
        ifIncluded: ['Strong payment incentive', 'Legal collection rights', 'Cash flow protection']
      },
      alternativeVersions: {
        aggressive: 'Late payments incur 2% monthly penalty plus attorney fees. Work suspension after 15 days.',
        moderate: 'Late payments incur 1.5% monthly penalty. Work suspension after 30 days.',
        minimal: 'Late payments incur 1% monthly penalty. Work suspension after 45 days.'
      },
      customizationOptions: {
        variableFields: ['penalty_rate', 'suspension_days', 'collection_method'],
        conditionalText: [
          { condition: 'amount > 10000', text: 'For projects exceeding $10,000, additional collection costs apply.' }
        ]
      },
      relatedClauses: ['PAY_CRIT_002', 'LIEN_001'],
      exclusions: ['Government contracts with specific payment terms', 'Union projects with predetermined payment schedules']
    });

    // Lien Rights - Nivel CRÍTICO
    this.addDefenseClause({
      id: 'LIEN_001',
      category: 'Payment Protection',
      subcategory: 'Lien Rights',
      clause: 'Contractor expressly reserves all mechanic\'s lien rights under California Civil Code Section 8000 et seq. Client acknowledges these rights and waives any objection to preliminary notice. Lien rights may be exercised immediately upon any payment default without additional notice.',
      rationale: 'Secures payment through property interest and provides superior collection position',
      riskMitigation: ['Secured payment position', 'Property interest protection', 'Priority collection rights'],
      applicability: {
        projectTypes: ['construction', 'renovation', 'fencing', 'roofing'],
        amountRange: { min: 500 },
        jurisdiction: ['CA'],
        riskLevel: 'CRITICAL',
        priority: 10,
        mandatory: true
      },
      legalSources: [
        {
          id: 'CA_CIV_8000',
          type: 'statute',
          jurisdiction: 'CA',
          citation: 'California Civil Code § 8000-8850',
          title: 'Mechanics Lien Law',
          effectiveDate: '2024-01-01',
          lastUpdated: '2024-01-01'
        }
      ],
      consequences: {
        ifOmitted: ['Unsecured creditor status', 'Weak collection position', 'No property interest'],
        ifIncluded: ['Secured creditor status', 'Property lien rights', 'Superior collection position']
      },
      alternativeVersions: {
        aggressive: 'Immediate lien filing upon any payment delay. No additional notice required.',
        moderate: 'Standard lien rights with 10-day notice before filing.',
        minimal: 'Lien rights reserved with 30-day notice requirement.'
      },
      customizationOptions: {
        variableFields: ['notice_period', 'lien_amount', 'filing_timeline'],
        conditionalText: [
          { condition: 'project_type == construction', text: 'Includes all labor, materials, and equipment furnished.' }
        ]
      },
      relatedClauses: ['PAY_CRIT_001', 'NOTICE_001'],
      exclusions: ['Public works projects', 'Projects on leased property without lien rights']
    });

    // Change Order Protection - Nivel ALTO
    this.addDefenseClause({
      id: 'CHANGE_001',
      category: 'Scope Protection',
      subcategory: 'Change Orders',
      clause: 'No changes to the original scope shall be performed without a written, signed change order specifying the additional work, materials, time extension, and compensation. Verbal requests or approvals are void. Any additional work performed without proper authorization shall be compensated at premium rates of 150% of standard pricing.',
      rationale: 'Prevents scope creep and ensures proper compensation for additional work',
      riskMitigation: ['Scope creep prevention', 'Premium compensation for extras', 'Written documentation requirement'],
      applicability: {
        projectTypes: ['all'],
        amountRange: { min: 1000 },
        jurisdiction: ['all'],
        riskLevel: 'HIGH',
        priority: 9,
        mandatory: false
      },
      legalSources: [
        {
          id: 'CA_CIV_1624',
          type: 'statute',
          jurisdiction: 'CA',
          citation: 'California Civil Code § 1624',
          title: 'Statute of Frauds - Written Contracts',
          effectiveDate: '2023-01-01',
          lastUpdated: '2024-01-01'
        }
      ],
      consequences: {
        ifOmitted: ['Scope creep vulnerability', 'Unpaid extra work', 'Dispute potential'],
        ifIncluded: ['Scope protection', 'Premium compensation', 'Clear documentation']
      },
      alternativeVersions: {
        aggressive: 'No verbal changes accepted. Premium rate 200% for unauthorized work.',
        moderate: 'Written changes required. Premium rate 150% for unauthorized work.',
        minimal: 'Written changes preferred. Premium rate 125% for unauthorized work.'
      },
      customizationOptions: {
        variableFields: ['premium_rate', 'approval_method', 'documentation_requirement'],
        conditionalText: [
          { condition: 'amount > 5000', text: 'For significant changes, architectural approval may be required.' }
        ]
      },
      relatedClauses: ['SCOPE_001', 'TIME_001'],
      exclusions: ['Emergency safety work', 'Code compliance corrections']
    });

    // Continuar con más cláusulas...
    this.addMoreDefensiveClauses();
  }

  private addMoreDefensiveClauses(): void {
    // Liability Limitation - Nivel CRÍTICO
    this.addDefenseClause({
      id: 'LIAB_001',
      category: 'Liability Protection',
      subcategory: 'Damage Limitations',
      clause: 'Contractor\'s total liability for any and all claims shall not exceed the total contract price. Contractor shall not be liable for consequential, incidental, special, or punitive damages under any circumstances, including but not limited to lost profits, business interruption, or emotional distress.',
      rationale: 'Caps maximum exposure and eliminates unlimited liability risk',
      riskMitigation: ['Limited liability exposure', 'Consequential damage protection', 'Defined maximum risk'],
      applicability: {
        projectTypes: ['all'],
        amountRange: { min: 1000 },
        jurisdiction: ['all'],
        riskLevel: 'CRITICAL',
        priority: 10,
        mandatory: true
      },
      legalSources: [
        {
          id: 'CA_CIV_1668',
          type: 'statute',
          jurisdiction: 'CA',
          citation: 'California Civil Code § 1668',
          title: 'Contractual Liability Limitations',
          effectiveDate: '2023-01-01',
          lastUpdated: '2024-01-01'
        }
      ],
      consequences: {
        ifOmitted: ['Unlimited liability exposure', 'Consequential damage risk', 'Catastrophic loss potential'],
        ifIncluded: ['Capped liability exposure', 'Consequential damage protection', 'Predictable maximum risk']
      },
      alternativeVersions: {
        aggressive: 'Liability limited to 50% of contract price. No consequential damages.',
        moderate: 'Liability limited to 100% of contract price. No consequential damages.',
        minimal: 'Liability limited to 150% of contract price. Limited consequential damages.'
      },
      customizationOptions: {
        variableFields: ['liability_cap_percentage', 'excluded_damage_types', 'exceptions'],
        conditionalText: [
          { condition: 'high_risk_project', text: 'Additional liability insurance may be required.' }
        ]
      },
      relatedClauses: ['INSURANCE_001', 'INDEM_001'],
      exclusions: ['Gross negligence', 'Intentional misconduct', 'Statutory violations']
    });

    // Indemnification - Nivel ALTO
    this.addDefenseClause({
      id: 'INDEM_001',
      category: 'Liability Protection',
      subcategory: 'Client Indemnification',
      clause: 'Client agrees to indemnify, defend, and hold harmless Contractor from any claims, damages, or liabilities arising from: (a) Client\'s failure to obtain required permits; (b) pre-existing conditions not disclosed; (c) Client\'s interference with work; (d) Client-supplied materials or specifications; (e) third-party claims unrelated to Contractor\'s negligence.',
      rationale: 'Shifts liability for client-caused issues back to client',
      riskMitigation: ['Client-caused liability protection', 'Third-party claim defense', 'Pre-existing condition protection'],
      applicability: {
        projectTypes: ['all'],
        amountRange: { min: 2000 },
        jurisdiction: ['all'],
        riskLevel: 'HIGH',
        priority: 9,
        mandatory: false
      },
      legalSources: [
        {
          id: 'CA_CIV_2778',
          type: 'statute',
          jurisdiction: 'CA',
          citation: 'California Civil Code § 2778',
          title: 'Indemnity Contracts',
          effectiveDate: '2023-01-01',
          lastUpdated: '2024-01-01'
        }
      ],
      consequences: {
        ifOmitted: ['Client-caused liability exposure', 'Third-party claim vulnerability', 'Undisclosed condition risk'],
        ifIncluded: ['Client liability protection', 'Third-party claim defense', 'Pre-existing condition coverage']
      },
      alternativeVersions: {
        aggressive: 'Broad indemnification for all non-contractor caused issues.',
        moderate: 'Standard indemnification for specific enumerated scenarios.',
        minimal: 'Limited indemnification for client-supplied materials only.'
      },
      customizationOptions: {
        variableFields: ['indemnification_scope', 'excluded_scenarios', 'defense_obligations'],
        conditionalText: [
          { condition: 'high_value_project', text: 'Professional liability insurance may be required.' }
        ]
      },
      relatedClauses: ['LIAB_001', 'PERMIT_001'],
      exclusions: ['Contractor gross negligence', 'Intentional contractor misconduct']
    });

    // Force Majeure - Nivel MEDIO
    this.addDefenseClause({
      id: 'FORCE_001',
      category: 'Performance Protection',
      subcategory: 'Force Majeure',
      clause: 'Performance delays caused by acts of God, natural disasters, pandemics, government orders, labor disputes, material shortages, or other circumstances beyond Contractor\'s reasonable control shall automatically extend project deadlines without penalty. Additional compensation may apply for extended overhead costs.',
      rationale: 'Protects against liability for delays beyond contractor control',
      riskMitigation: ['Uncontrollable delay protection', 'Extended overhead compensation', 'Performance penalty protection'],
      applicability: {
        projectTypes: ['all'],
        amountRange: { min: 1000 },
        jurisdiction: ['all'],
        riskLevel: 'MEDIUM',
        priority: 7,
        mandatory: false
      },
      legalSources: [
        {
          id: 'CA_CIV_1511',
          type: 'statute',
          jurisdiction: 'CA',
          citation: 'California Civil Code § 1511',
          title: 'Impossibility of Performance',
          effectiveDate: '2023-01-01',
          lastUpdated: '2024-01-01'
        }
      ],
      consequences: {
        ifOmitted: ['Delay penalty exposure', 'Uncontrollable event liability', 'Extended overhead losses'],
        ifIncluded: ['Delay penalty protection', 'Uncontrollable event coverage', 'Extended overhead compensation']
      },
      alternativeVersions: {
        aggressive: 'Broad force majeure with automatic compensation for delays.',
        moderate: 'Standard force majeure with time extensions only.',
        minimal: 'Limited force majeure for natural disasters only.'
      },
      customizationOptions: {
        variableFields: ['covered_events', 'compensation_method', 'notice_requirements'],
        conditionalText: [
          { condition: 'outdoor_project', text: 'Weather delays exceeding 3 consecutive days qualify.' }
        ]
      },
      relatedClauses: ['TIME_001', 'WEATHER_001'],
      exclusions: ['Contractor-caused delays', 'Predictable seasonal weather']
    });
  }

  private addDefenseClause(clause: DefenseClause): void {
    this.defenseClauses.set(clause.id, clause);
  }

  /**
   * Inicialización de requisitos de compliance jurisdiccional
   */
  private initializeComplianceRequirements(): void {
    // California Construction Requirements
    const caConstructionReqs: ComplianceRequirement[] = [
      {
        id: 'CA_LIC_001',
        jurisdiction: 'CA',
        projectType: 'construction',
        requirement: 'Valid California Contractor License',
        description: 'All construction work in California requires a valid contractor license',
        mandatoryClause: 'Contractor warrants possession of valid California Contractor License #[LICENSE_NUMBER] in good standing with the Contractors State License Board.',
        penalty: 'Unlicensed contracting is a misdemeanor with fines up to $5,000 and potential criminal charges',
        source: {
          id: 'CA_BPC_7028',
          type: 'statute',
          jurisdiction: 'CA',
          citation: 'California Business & Professions Code § 7028',
          title: 'Contractor Licensing Requirements',
          effectiveDate: '2023-01-01',
          lastUpdated: '2024-01-01'
        },
        verificationMethod: 'CSLB license verification portal',
        deadlines: {
          notification: 0,
          filing: 0,
          completion: 0
        }
      },
      {
        id: 'CA_BOND_001',
        jurisdiction: 'CA',
        projectType: 'construction',
        requirement: 'Contractor Bond and Insurance',
        description: 'Required bonding and insurance coverage for construction projects',
        mandatoryClause: 'Contractor maintains a $15,000 contractor bond and general liability insurance of not less than $1,000,000 per occurrence as required by California law.',
        penalty: 'Operating without required bond/insurance voids license and subjects contractor to civil and criminal penalties',
        source: {
          id: 'CA_BPC_7071_6',
          type: 'statute',
          jurisdiction: 'CA',
          citation: 'California Business & Professions Code § 7071.6',
          title: 'Contractor Bond Requirements',
          effectiveDate: '2023-01-01',
          lastUpdated: '2024-01-01'
        },
        verificationMethod: 'Insurance certificate and bond verification',
        deadlines: {
          notification: 5,
          filing: 0,
          completion: 0
        }
      }
    ];

    this.complianceRequirements.set('CA_construction', caConstructionReqs);
    this.complianceRequirements.set('CA_fencing', caConstructionReqs); // Fencing uses same construction requirements
    this.complianceRequirements.set('CA_roofing', [...caConstructionReqs, this.getRoofingSpecificRequirements()]);
  }

  private getRoofingSpecificRequirements(): ComplianceRequirement {
    return {
      id: 'CA_ROOF_001',
      jurisdiction: 'CA',
      projectType: 'roofing',
      requirement: 'Roofing Contractor Specialty License',
      description: 'Specific C-39 roofing contractor license required for roofing work',
      mandatoryClause: 'Contractor holds valid California C-39 Roofing Contractor license and complies with all roofing-specific building codes and standards.',
      penalty: 'Roofing without C-39 license subjects contractor to additional penalties and licensing violations',
      source: {
        id: 'CA_BPC_7058',
        type: 'statute',
        jurisdiction: 'CA',
        citation: 'California Business & Professions Code § 7058',
        title: 'Roofing Contractor Classification',
        effectiveDate: '2023-01-01',
        lastUpdated: '2024-01-01'
      },
      verificationMethod: 'CSLB C-39 license verification',
      deadlines: {
        notification: 0,
        filing: 0,
        completion: 0
      }
    };
  }

  /**
   * Inicialización de fuentes legales
   */
  private initializeLegalSources(): void {
    const sources: LegalSource[] = [
      {
        id: 'CA_CIV_CODE',
        type: 'statute',
        jurisdiction: 'CA',
        citation: 'California Civil Code',
        title: 'California Civil Code - Contracts and Obligations',
        url: 'https://leginfo.legislature.ca.gov/faces/codes.xhtml',
        effectiveDate: '2024-01-01',
        lastUpdated: '2024-01-01'
      },
      {
        id: 'CA_BPC',
        type: 'statute',
        jurisdiction: 'CA',
        citation: 'California Business & Professions Code',
        title: 'Business and Professions Code - Contractor Licensing',
        url: 'https://leginfo.legislature.ca.gov/faces/codes.xhtml',
        effectiveDate: '2024-01-01',
        lastUpdated: '2024-01-01'
      }
    ];

    sources.forEach(source => {
      this.legalSources.set(source.id, source);
    });
  }

  // Métodos de análisis
  private extractJurisdiction(projectData: any): string {
    const location = projectData.clientInfo?.address || projectData.projectDetails?.location || '';
    if (location.includes('CA') || location.includes('California')) return 'CA';
    if (location.includes('NY') || location.includes('New York')) return 'NY';
    if (location.includes('TX') || location.includes('Texas')) return 'TX';
    if (location.includes('FL') || location.includes('Florida')) return 'FL';
    return 'CA'; // Default to California
  }

  private normalizeProjectType(projectType: string): string {
    const type = projectType.toLowerCase();
    if (type.includes('fence')) return 'fencing';
    if (type.includes('roof')) return 'roofing';
    if (type.includes('construction') || type.includes('build')) return 'construction';
    if (type.includes('renovation') || type.includes('remodel')) return 'renovation';
    if (type.includes('repair')) return 'repair';
    return 'general';
  }

  private extractProjectAmount(projectData: any): number {
    const total = projectData.financials?.total || 
                  projectData.financials?.subtotal || 
                  projectData.totalAmount || 0;
    return typeof total === 'string' ? parseFloat(total.replace(/[^0-9.]/g, '')) : total;
  }

  private async assessProjectRisks(projectData: any, jurisdiction: string, projectType: string, amount: number): Promise<RiskAssessment[]> {
    const risks: RiskAssessment[] = [];

    // Payment Risk Assessment
    risks.push({
      category: 'Payment Risk',
      riskLevel: amount > 10000 ? 'HIGH' : amount > 5000 ? 'MEDIUM' : 'LOW',
      description: 'Risk of non-payment or delayed payment based on project value and client profile',
      likelihood: this.calculatePaymentRiskLikelihood(projectData, amount),
      impact: Math.min(100, (amount / 1000) * 5), // $1000 = 5 impact points
      mitigationClauses: ['PAY_CRIT_001', 'LIEN_001'],
      costImplication: {
        min: amount * 0.1,
        max: amount * 0.3,
        description: 'Potential loss from payment issues'
      }
    });

    // Scope Creep Risk
    risks.push({
      category: 'Scope Creep Risk',
      riskLevel: projectType === 'renovation' ? 'HIGH' : 'MEDIUM',
      description: 'Risk of unauthorized additional work and scope expansion',
      likelihood: projectType === 'renovation' ? 80 : 50,
      impact: 60,
      mitigationClauses: ['CHANGE_001'],
      costImplication: {
        min: amount * 0.05,
        max: amount * 0.25,
        description: 'Potential unpaid extra work'
      }
    });

    // Liability Risk
    risks.push({
      category: 'Liability Risk',
      riskLevel: amount > 20000 ? 'CRITICAL' : amount > 10000 ? 'HIGH' : 'MEDIUM',
      description: 'Risk of property damage or personal injury claims',
      likelihood: this.calculateLiabilityRisk(projectType, amount),
      impact: 90,
      mitigationClauses: ['LIAB_001', 'INDEM_001', 'INSURANCE_001'],
      costImplication: {
        min: amount * 0.5,
        max: amount * 3.0,
        description: 'Potential unlimited liability exposure'
      }
    });

    return risks;
  }

  private calculatePaymentRiskLikelihood(projectData: any, amount: number): number {
    let likelihood = 30; // Base risk

    // Higher amounts = higher risk
    if (amount > 20000) likelihood += 30;
    else if (amount > 10000) likelihood += 20;
    else if (amount > 5000) likelihood += 10;

    // Project type factors
    const projectType = this.normalizeProjectType(projectData.projectDetails?.type || '');
    if (projectType === 'renovation') likelihood += 20;
    if (projectType === 'roofing') likelihood += 15;

    // Client information completeness
    if (!projectData.clientInfo?.email) likelihood += 10;
    if (!projectData.clientInfo?.phone) likelihood += 10;

    return Math.min(100, likelihood);
  }

  private calculateLiabilityRisk(projectType: string, amount: number): number {
    let risk = 20; // Base risk

    switch (projectType) {
      case 'roofing': risk += 40; break;
      case 'construction': risk += 30; break;
      case 'renovation': risk += 25; break;
      case 'fencing': risk += 15; break;
      default: risk += 20; break;
    }

    // Higher value projects = higher risk
    if (amount > 50000) risk += 30;
    else if (amount > 20000) risk += 20;
    else if (amount > 10000) risk += 10;

    return Math.min(100, risk);
  }

  private getMandatoryRequirements(jurisdiction: string, projectType: string, amount: number): ComplianceRequirement[] {
    const key = `${jurisdiction}_${projectType}`;
    return this.complianceRequirements.get(key) || [];
  }

  private selectDefensiveClauses(riskAssessments: RiskAssessment[], mandatoryRequirements: ComplianceRequirement[], jurisdiction: string, projectType: string, amount: number): DefenseClause[] {
    const selectedClauses: DefenseClause[] = [];
    const usedClauseIds = new Set<string>();

    // Add clauses from risk mitigation
    riskAssessments.forEach(risk => {
      risk.mitigationClauses.forEach(clauseId => {
        if (!usedClauseIds.has(clauseId)) {
          const clause = this.defenseClauses.get(clauseId);
          if (clause && this.isClauseApplicable(clause, jurisdiction, projectType, amount)) {
            selectedClauses.push(clause);
            usedClauseIds.add(clauseId);
          }
        }
      });
    });

    // Add all critical and high priority clauses
    this.defenseClauses.forEach(clause => {
      if (!usedClauseIds.has(clause.id) && 
          (clause.applicability.riskLevel === 'CRITICAL' || clause.applicability.priority >= 8) &&
          this.isClauseApplicable(clause, jurisdiction, projectType, amount)) {
        selectedClauses.push(clause);
        usedClauseIds.add(clause.id);
      }
    });

    return selectedClauses.sort((a, b) => b.applicability.priority - a.applicability.priority);
  }

  private isClauseApplicable(clause: DefenseClause, jurisdiction: string, projectType: string, amount: number): boolean {
    // Check jurisdiction
    if (!clause.applicability.jurisdiction.includes('all') && !clause.applicability.jurisdiction.includes(jurisdiction)) {
      return false;
    }

    // Check project type
    if (!clause.applicability.projectTypes.includes('all') && !clause.applicability.projectTypes.includes(projectType)) {
      return false;
    }

    // Check amount range
    if (clause.applicability.amountRange.min && amount < clause.applicability.amountRange.min) {
      return false;
    }
    if (clause.applicability.amountRange.max && amount > clause.applicability.amountRange.max) {
      return false;
    }

    return true;
  }

  private identifyCriticalGaps(projectData: any, recommendedClauses: DefenseClause[], mandatoryRequirements: ComplianceRequirement[]): string[] {
    const gaps: string[] = [];

    // Check for missing client information
    if (!projectData.clientInfo?.email) {
      gaps.push('Missing client email address - required for legal notices');
    }
    if (!projectData.clientInfo?.phone) {
      gaps.push('Missing client phone number - required for emergency communications');
    }

    // Check for missing project dates
    if (!projectData.projectDetails?.startDate) {
      gaps.push('Missing project start date - required for timeline enforcement');
    }

    // Check for missing payment terms
    if (!projectData.paymentTerms && !projectData.financials?.total) {
      gaps.push('Missing payment structure - critical for payment enforcement');
    }

    // Check mandatory requirements compliance
    mandatoryRequirements.forEach(req => {
      if (req.requirement.includes('License') && !projectData.contractorLicense) {
        gaps.push(`Missing contractor license information - required by ${req.source.citation}`);
      }
    });

    return gaps;
  }

  private calculateTotalRiskScore(riskAssessments: RiskAssessment[]): number {
    if (riskAssessments.length === 0) return 0;
    
    const weightedScore = riskAssessments.reduce((sum, risk) => {
      const weight = this.getRiskWeight(risk.riskLevel);
      return sum + (risk.likelihood * risk.impact * weight / 10000);
    }, 0);
    
    return Math.min(100, weightedScore / riskAssessments.length * 100);
  }

  private getRiskWeight(riskLevel: string): number {
    switch (riskLevel) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 2;
    }
  }

  private calculateComplianceScore(mandatoryRequirements: ComplianceRequirement[], recommendedClauses: DefenseClause[]): number {
    if (mandatoryRequirements.length === 0) return 100;
    
    const mandatoryMet = recommendedClauses.filter(clause => clause.applicability.mandatory).length;
    const totalMandatory = mandatoryRequirements.length;
    
    return Math.round((mandatoryMet / Math.max(1, totalMandatory)) * 100);
  }

  private calculateDefenseStrength(recommendedClauses: DefenseClause[], riskAssessments: RiskAssessment[]): number {
    const totalCriticalClauses = recommendedClauses.filter(c => c.applicability.riskLevel === 'CRITICAL').length;
    const totalHighClauses = recommendedClauses.filter(c => c.applicability.riskLevel === 'HIGH').length;
    const totalClauses = recommendedClauses.length;
    
    const strengthScore = (totalCriticalClauses * 4 + totalHighClauses * 3 + (totalClauses - totalCriticalClauses - totalHighClauses) * 2) / Math.max(1, totalClauses);
    
    return Math.min(100, strengthScore * 25);
  }

  private getApplicableLaws(jurisdiction: string, projectType: string): LegalSource[] {
    const applicableLaws: LegalSource[] = [];
    
    this.legalSources.forEach(source => {
      if (source.jurisdiction === jurisdiction || source.jurisdiction === 'all') {
        applicableLaws.push(source);
      }
    });
    
    return applicableLaws;
  }

  private inferContractorProfile(projectData: any): any {
    return {
      experienceLevel: 'INTERMEDIATE', // Default inference
      specializations: [this.normalizeProjectType(projectData.projectDetails?.type || 'general')],
      riskTolerance: 'MODERATE'
    };
  }

  private generateStrategicRecommendations(riskAssessments: RiskAssessment[], complianceScore: number, defenseStrength: number): any {
    const recommendations = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[]
    };

    // Immediate recommendations
    if (complianceScore < 80) {
      recommendations.immediate.push('Address mandatory compliance requirements immediately');
    }
    if (defenseStrength < 70) {
      recommendations.immediate.push('Implement critical defensive clauses before contract signing');
    }

    // Short-term recommendations
    recommendations.shortTerm.push('Review and update standard contract templates');
    recommendations.shortTerm.push('Implement systematic risk assessment for all projects');

    // Long-term recommendations
    recommendations.longTerm.push('Develop specialized contract templates by project type');
    recommendations.longTerm.push('Establish ongoing legal compliance monitoring system');

    return recommendations;
  }

  private identifyCriticalWarnings(riskAssessments: RiskAssessment[], mandatoryRequirements: ComplianceRequirement[], projectData: any): any[] {
    const warnings: any[] = [];

    // Check for critical risks
    riskAssessments.forEach(risk => {
      if (risk.riskLevel === 'CRITICAL') {
        warnings.push({
          level: 'CRITICAL',
          message: `Critical ${risk.category}: ${risk.description}`,
          recommendation: `Implement ${risk.mitigationClauses.join(', ')} immediately`,
          legalBasis: this.legalSources.get('CA_CIV_CODE') || {} as LegalSource
        });
      }
    });

    // Check for mandatory requirement violations
    mandatoryRequirements.forEach(req => {
      if (req.requirement.includes('License') && !projectData.contractorLicense) {
        warnings.push({
          level: 'EMERGENCY',
          message: `Missing required contractor license`,
          recommendation: `Obtain valid contractor license before proceeding - violation of ${req.source.citation}`,
          legalBasis: req.source
        });
      }
    });

    return warnings;
  }

  /**
   * Método público para obtener una cláusula específica
   */
  public getDefenseClause(clauseId: string): DefenseClause | undefined {
    return this.defenseClauses.get(clauseId);
  }

  /**
   * Método público para obtener todas las cláusulas por categoría
   */
  public getClausesByCategory(category: string): DefenseClause[] {
    return Array.from(this.defenseClauses.values()).filter(clause => clause.category === category);
  }

  /**
   * Método público para personalizar una cláusula
   */
  public customizeClause(clauseId: string, customizations: Record<string, any>): DefenseClause | null {
    const originalClause = this.defenseClauses.get(clauseId);
    if (!originalClause) return null;

    const customizedClause = { ...originalClause };
    
    // Apply variable field customizations
    let customizedText = originalClause.clause;
    originalClause.customizationOptions.variableFields.forEach(field => {
      if (customizations[field]) {
        const placeholder = `[${field.toUpperCase()}]`;
        customizedText = customizedText.replace(placeholder, customizations[field]);
      }
    });

    // Apply conditional text
    originalClause.customizationOptions.conditionalText.forEach(conditional => {
      if (this.evaluateCondition(conditional.condition, customizations)) {
        customizedText += ' ' + conditional.text;
      }
    });

    customizedClause.clause = customizedText;
    return customizedClause;
  }

  private evaluateCondition(condition: string, customizations: Record<string, any>): boolean {
    // Simple condition evaluation - can be expanded
    if (condition.includes('amount >')) {
      const threshold = parseInt(condition.split('amount >')[1].trim());
      return (customizations.amount || 0) > threshold;
    }
    if (condition.includes('project_type ==')) {
      const expectedType = condition.split('project_type ==')[1].trim().replace(/['"]/g, '');
      return customizations.project_type === expectedType;
    }
    return false;
  }
}

// Create and export the singleton instance
export const deepSearchDefenseEngine = new DeepSearchDefenseEngine();
export { DeepSearchDefenseEngine };
export default DeepSearchDefenseEngine;
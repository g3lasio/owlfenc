// client/src/services/legalComplianceService.ts

export interface LegalRequirement {
  id: string;
  state: string;
  projectType: string;
  requirement: string;
  description: string;
  mandatoryClause: string;
  penalty?: string;
  source: string; // Referencia legal
}

export interface ComplianceResult {
  state: string;
  projectType: string;
  requiredClauses: string[];
  recommendedClauses: string[];
  stateSpecificRequirements: LegalRequirement[];
  insuranceMinimums: {
    liability: number;
    workersComp: boolean;
    bond?: number;
  };
  validationErrors: string[];
  complianceScore: number; // 0-100
}

/**
 * Base de datos de requisitos legales por estado y tipo de proyecto
 */
export const legalRequirements: Record<string, LegalRequirement[]> = {
  'California': [
    {
      id: 'ca-license-disclosure',
      state: 'California',
      projectType: 'all',
      requirement: 'Contractor License Disclosure',
      description: 'All contractors must disclose license number and type',
      mandatoryClause: 'Contractor License Number: {{contractor.license}}. This contractor is licensed by the Contractors State License Board.',
      source: 'California Business and Professions Code Section 7030.5'
    },
    {
      id: 'ca-three-day-right',
      state: 'California',
      projectType: 'residential',
      requirement: 'Three-Day Right to Cancel',
      description: 'Home improvement contracts must include 3-day cancellation right',
      mandatoryClause: 'You, the buyer, have the right to cancel this transaction at any time prior to midnight of the third business day after the date of this transaction.',
      source: 'Civil Code Section 1689.5'
    },
    {
      id: 'ca-mechanics-lien',
      state: 'California',
      projectType: 'construction',
      requirement: 'Mechanics Lien Notice',
      description: 'Notice of right to file mechanics lien',
      mandatoryClause: 'NOTICE TO OWNER: Under the California Mechanics Lien Law, any contractor, subcontractor, laborer, supplier, or other person who helps to improve your property, but is not paid for his or her work or supplies, has a right to place a lien on your home, land, or property where the work was performed and to sue you in court to obtain payment.',
      source: 'Civil Code Section 8200'
    },
    {
      id: 'ca-prevailing-wage',
      state: 'California',
      projectType: 'public',
      requirement: 'Prevailing Wage Compliance',
      description: 'Public works projects must comply with prevailing wage laws',
      mandatoryClause: 'This project is subject to prevailing wage requirements under California Labor Code. Contractor shall pay not less than the general prevailing rate of per diem wages.',
      source: 'Labor Code Section 1771'
    }
  ],
  'Texas': [
    {
      id: 'tx-payment-bond',
      state: 'Texas',
      projectType: 'commercial',
      requirement: 'Payment Bond for Commercial Projects',
      description: 'Commercial projects over $25,000 may require payment bonds',
      mandatoryClause: 'For projects exceeding $25,000, contractor may be required to provide a payment bond to ensure payment to subcontractors and suppliers.',
      source: 'Texas Property Code Chapter 53'
    },
    {
      id: 'tx-deceptive-practices',
      state: 'Texas',
      projectType: 'all',
      requirement: 'Deceptive Trade Practices Notice',
      description: 'Consumer protection notice required',
      mandatoryClause: 'NOTICE: Texas law requires certain disclosures in consumer transactions. You may cancel this contract for any reason within three business days from the date you sign this contract.',
      source: 'Texas Business and Commerce Code Chapter 17'
    }
  ],
  'Florida': [
    {
      id: 'fl-hurricane-clause',
      state: 'Florida',
      projectType: 'roofing',
      requirement: 'Hurricane/Weather Protection Clause',
      description: 'Roofing contracts must address hurricane and weather damage',
      mandatoryClause: 'Contractor warrants that all work will be performed in accordance with Florida Building Code wind resistance requirements. In the event of hurricane or severe weather damage within one year of completion, contractor will inspect and repair defects in workmanship at no charge.',
      source: 'Florida Building Code'
    },
    {
      id: 'fl-moisture-warranty',
      state: 'Florida',
      projectType: 'construction',
      requirement: 'Moisture Protection Warranty',
      description: 'Construction contracts must address moisture intrusion',
      mandatoryClause: 'Contractor provides a two-year warranty against moisture intrusion due to defects in workmanship or materials.',
      source: 'Florida Statutes Chapter 558'
    }
  ],
  'New York': [
    {
      id: 'ny-home-improvement',
      state: 'New York',
      projectType: 'residential',
      requirement: 'Home Improvement Contract Requirements',
      description: 'Specific disclosure requirements for home improvement',
      mandatoryClause: 'This is a home improvement contract subject to Article 36-A of the General Business Law. You have the right to cancel this contract within three business days.',
      source: 'General Business Law Article 36-A'
    }
  ]
};

/**
 * Mínimos de seguro por estado y tipo de proyecto
 */
export const insuranceMinimums: Record<string, Record<string, any>> = {
  'California': {
    'general': { liability: 1000000, workersComp: true },
    'electrical': { liability: 2000000, workersComp: true },
    'roofing': { liability: 2000000, workersComp: true, bond: 50000 }
  },
  'Texas': {
    'general': { liability: 500000, workersComp: true },
    'commercial': { liability: 2000000, workersComp: true, bond: 25000 }
  },
  'Florida': {
    'general': { liability: 1000000, workersComp: true },
    'roofing': { liability: 2000000, workersComp: true }
  },
  'New York': {
    'general': { liability: 1000000, workersComp: true },
    'construction': { liability: 2000000, workersComp: true, bond: 100000 }
  }
};

/**
 * Analiza y genera requisitos de cumplimiento legal para un contrato
 */
export function analyzeLegalCompliance(
  state: string,
  projectType: string,
  contractValue: number,
  isResidential: boolean = true
): ComplianceResult {
  const stateRequirements = legalRequirements[state] || [];
  const stateInsurance = insuranceMinimums[state] || {};
  
  // Filtrar requisitos aplicables
  const applicableRequirements = stateRequirements.filter(req => 
    req.projectType === 'all' || 
    req.projectType === projectType ||
    (req.projectType === 'residential' && isResidential) ||
    (req.projectType === 'commercial' && !isResidential) ||
    (req.projectType === 'public' && contractValue > 100000)
  );

  // Determinar cláusulas obligatorias
  const requiredClauses = applicableRequirements.map(req => req.mandatoryClause);
  
  // Generar cláusulas recomendadas
  const recommendedClauses = generateRecommendedClauses(state, projectType, contractValue, isResidential);
  
  // Obtener mínimos de seguro
  const insuranceReqs = stateInsurance[projectType] || stateInsurance['general'] || {
    liability: 1000000,
    workersComp: true
  };

  // Calcular score de cumplimiento
  const complianceScore = calculateComplianceScore(applicableRequirements, contractValue, insuranceReqs);

  return {
    state,
    projectType,
    requiredClauses,
    recommendedClauses,
    stateSpecificRequirements: applicableRequirements,
    insuranceMinimums: insuranceReqs,
    validationErrors: [],
    complianceScore
  };
}

/**
 * Genera cláusulas recomendadas basadas en mejores prácticas
 */
function generateRecommendedClauses(
  state: string,
  projectType: string,
  contractValue: number,
  isResidential: boolean
): string[] {
  const clauses: string[] = [];

  // Cláusulas basadas en valor del contrato
  if (contractValue > 50000) {
    clauses.push('Progress payments shall be tied to specific completion milestones as outlined in the project schedule.');
    clauses.push('Contractor shall provide a performance bond in the amount of {{payment.totalAmount}} to guarantee completion of work.');
  }

  if (contractValue > 100000) {
    clauses.push('Client may retain 10% of each progress payment until final completion and acceptance of all work.');
    clauses.push('Contractor shall provide weekly progress reports and maintain detailed records of all work performed.');
  }

  // Cláusulas específicas por tipo de proyecto
  switch (projectType) {
    case 'roofing':
      clauses.push('All roofing materials shall comply with local building codes and manufacturer specifications.');
      clauses.push('Contractor warrants roof against leaks for a period of {{warranty.roofLeakPeriod || "2 years"}}.');
      clauses.push('All debris shall be removed daily and property protected with tarps during work.');
      break;
      
    case 'electrical':
      clauses.push('All electrical work shall be performed by licensed electricians and inspected as required by local codes.');
      clauses.push('Contractor shall provide as-built electrical drawings upon project completion.');
      clauses.push('All electrical components carry manufacturer warranties which are assigned to client.');
      break;
      
    case 'plumbing':
      clauses.push('All plumbing work shall comply with current plumbing codes and be pressure tested before concealment.');
      clauses.push('Contractor warrants against leaks in workmanship for {{warranty.plumbingPeriod || "1 year"}}.');
      break;
      
    case 'general':
      clauses.push('Contractor shall obtain all necessary permits and schedule required inspections.');
      clauses.push('Work area shall be kept clean and safe at all times with appropriate safety barriers.');
      break;
  }

  // Cláusulas para proyectos residenciales
  if (isResidential) {
    clauses.push('Contractor shall minimize disruption to family activities and maintain reasonable working hours (7 AM - 6 PM weekdays, 8 AM - 5 PM weekends).');
    clauses.push('Property shall be left in clean, broom-swept condition at the end of each work day.');
    clauses.push('Contractor shall protect existing landscaping, driveways, and adjacent structures.');
  }

  return clauses;
}

/**
 * Calcula un score de cumplimiento legal (0-100)
 */
function calculateComplianceScore(
  requirements: LegalRequirement[],
  contractValue: number,
  insuranceReqs: any
): number {
  let score = 100;
  
  // Penalizar si faltan requisitos básicos
  if (requirements.length === 0) {
    score -= 20; // Faltan requisitos específicos del estado
  }
  
  // Bonus por cobertura de seguro adecuada
  if (insuranceReqs.liability >= 1000000) {
    score += 5;
  }
  
  if (insuranceReqs.workersComp) {
    score += 5;
  }
  
  // Penalizar contratos grandes sin bond
  if (contractValue > 50000 && !insuranceReqs.bond) {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Valida que un contrato cumpla con requisitos legales
 */
export function validateContractCompliance(
  contractData: Record<string, any>,
  complianceResult: ComplianceResult
): string[] {
  const errors: string[] = [];
  
  // Validar información del contratista
  if (!contractData.contractor?.license && complianceResult.state === 'California') {
    errors.push('California requires contractor license disclosure');
  }
  
  // Validar seguros
  if (!contractData.insurance?.liabilityAmount) {
    errors.push(`Liability insurance of at least $${complianceResult.insuranceMinimums.liability.toLocaleString()} is required`);
  }
  
  if (complianceResult.insuranceMinimums.workersComp && !contractData.insurance?.workersComp) {
    errors.push('Workers compensation insurance is required');
  }
  
  // Validar bond si es requerido
  if (complianceResult.insuranceMinimums.bond && !contractData.legal?.performanceBond) {
    errors.push(`Performance bond of $${complianceResult.insuranceMinimums.bond.toLocaleString()} may be required`);
  }
  
  return errors;
}

/**
 * Genera cláusulas de protección específicas para contratistas
 */
export function generateContractorProtections(
  projectType: string,
  contractValue: number,
  state: string
): string[] {
  const protections: string[] = [
    // Protecciones financieras básicas
    'No work shall commence until initial payment is received in full.',
    'Any additional work requested by client requires written authorization and payment before proceeding.',
    'Late payments accrue interest at 1.5% per month and may result in work stoppage.',
    
    // Protecciones contra cambios de scope
    'Client changes to project scope require written change order with adjusted pricing and timeline.',
    'Contractor is not responsible for delays caused by client-requested changes or indecision.',
    'Hidden conditions or unforeseen complications may require additional time and compensation.',
    
    // Protecciones de responsabilidad
    'Contractor liability is limited to the total contract amount.',
    'Client assumes responsibility for any pre-existing conditions not disclosed.',
    'Contractor is held harmless for damages caused by client negligence or third parties.',
    
    // Protecciones de cobro
    'Contractor may place a mechanics lien for unpaid amounts as permitted by state law.',
    'Client is responsible for all collection costs and attorney fees for unpaid invoices.',
    'No warranty coverage applies until all payments are received in full.'
  ];
  
  // Agregar protecciones específicas por valor
  if (contractValue > 25000) {
    protections.push('Progress payments are due within 5 business days of invoice submission.');
    protections.push('Final payment is due within 10 days of substantial completion notice.');
  }
  
  // Protecciones específicas por tipo de proyecto
  if (projectType === 'roofing') {
    protections.push('Weather delays are beyond contractor control and do not constitute breach of contract.');
    protections.push('Contractor may suspend work for unsafe weather conditions.');
  }
  
  if (projectType === 'electrical' || projectType === 'plumbing') {
    protections.push('Code compliance is subject to local inspector approval; contractor not liable for changing code requirements.');
  }
  
  return protections;
}

/**
 * Genera el HTML de cláusulas legales para insertar en el contrato
 */
export function generateLegalClausesHTML(complianceResult: ComplianceResult, contractData: Record<string, any>): string {
  let html = '<div class="legal-compliance-section">\n';
  
  // Agregar requisitos estatales obligatorios
  if (complianceResult.requiredClauses.length > 0) {
    html += '  <div class="section-title">State-Specific Legal Requirements</div>\n';
    complianceResult.requiredClauses.forEach((clause, index) => {
      // Reemplazar variables en las cláusulas
      let processedClause = clause;
      Object.entries(contractData).forEach(([section, sectionData]) => {
        if (typeof sectionData === 'object' && sectionData !== null) {
          Object.entries(sectionData).forEach(([key, value]) => {
            const placeholder = `{{${section}.${key}}}`;
            processedClause = processedClause.replace(new RegExp(placeholder, 'g'), value as string || "");
          });
        }
      });
      
      html += `  <div class="article">\n`;
      html += `    <div class="article-title">${index + 1}. ${complianceResult.stateSpecificRequirements[index]?.requirement || 'Legal Requirement'}</div>\n`;
      html += `    <div class="article-content">${processedClause}</div>\n`;
      html += `  </div>\n`;
    });
  }
  
  // Agregar cláusulas recomendadas
  if (complianceResult.recommendedClauses.length > 0) {
    html += '  <div class="section-title">Additional Protective Clauses</div>\n';
    complianceResult.recommendedClauses.forEach((clause, index) => {
      html += `  <div class="article">\n`;
      html += `    <div class="article-title">${String.fromCharCode(65 + index)}. Enhanced Protection</div>\n`;
      html += `    <div class="article-content">${clause}</div>\n`;
      html += `  </div>\n`;
    });
  }
  
  html += '</div>\n';
  return html;
}
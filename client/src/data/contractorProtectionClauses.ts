/**
 * Base de datos de cláusulas de protección para contratistas
 * Sistema inteligente de Mervin AI Legal Defense Engine
 */

export interface ProtectionClause {
  id: string;
  category: string;
  clause: string;
  applicability: {
    projectTypes: string[];
    amountRange?: { min?: number; max?: number };
    locations?: string[];
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    priority: number; // 1-10, higher is more important
  };
}

export const contractorProtectionClauses: ProtectionClause[] = [
  // Payment Protection Clauses
  {
    id: "PAY_001",
    category: "Payment Protection",
    clause: "Payment terms must include clear milestone definitions and specific due dates. Late payments incur penalties of 5% weekly.",
    applicability: {
      projectTypes: ["all"],
      amountRange: { min: 1000 },
      riskLevel: "HIGH",
      priority: 10
    }
  },
  {
    id: "PAY_002", 
    category: "Payment Protection",
    clause: "Contractor reserves lien rights explicitly acknowledged by the client, enforceable immediately upon payment default.",
    applicability: {
      projectTypes: ["construction", "renovation", "fencing", "roofing"],
      amountRange: { min: 2500 },
      riskLevel: "HIGH",
      priority: 9
    }
  },
  {
    id: "PAY_003",
    category: "Payment Protection", 
    clause: "No arbitrary holdbacks are permitted; any withholding of payment must be substantiated in writing within five days.",
    applicability: {
      projectTypes: ["all"],
      amountRange: { min: 1500 },
      riskLevel: "HIGH",
      priority: 8
    }
  },
  {
    id: "PAY_004",
    category: "Payment Protection",
    clause: "Final payment shall not exceed 20% of total contract price, ensuring majority payment during project progress.",
    applicability: {
      projectTypes: ["all"],
      amountRange: { min: 3000 },
      riskLevel: "MEDIUM",
      priority: 7
    }
  },
  {
    id: "PAY_005",
    category: "Payment Protection",
    clause: "Automatic escalation clauses for material cost increases exceeding 10% during contract execution.",
    applicability: {
      projectTypes: ["construction", "renovation", "landscaping"],
      amountRange: { min: 5000 },
      riskLevel: "HIGH",
      priority: 8
    }
  },

  // Work Performance Clauses
  {
    id: "WORK_001",
    category: "Work Performance",
    clause: "Contractor maintains complete autonomy over methods, scheduling, and personnel decisions.",
    applicability: {
      projectTypes: ["all"],
      riskLevel: "HIGH",
      priority: 9
    }
  },
  {
    id: "WORK_002",
    category: "Work Performance", 
    clause: "All client-requested changes require formal, signed change orders before implementation.",
    applicability: {
      projectTypes: ["all"],
      amountRange: { min: 1000 },
      riskLevel: "HIGH",
      priority: 10
    }
  },
  {
    id: "WORK_003",
    category: "Work Performance",
    clause: "Automatic extension of deadlines due to weather-related delays or third-party supply interruptions.",
    applicability: {
      projectTypes: ["construction", "fencing", "roofing", "landscaping"],
      riskLevel: "MEDIUM",
      priority: 7
    }
  },
  {
    id: "WORK_004",
    category: "Work Performance",
    clause: "Pre-project documented acceptance of existing site conditions, removing liability for undisclosed defects.",
    applicability: {
      projectTypes: ["fencing", "construction", "excavation", "landscaping"],
      riskLevel: "HIGH",
      priority: 8
    }
  },

  // Liability & Indemnification Clauses
  {
    id: "LIABILITY_001",
    category: "Liability & Indemnification",
    clause: "Liability explicitly limited to total value of the signed contract, excluding consequential damages.",
    applicability: {
      projectTypes: ["all"],
      amountRange: { min: 2000 },
      riskLevel: "HIGH",
      priority: 9
    }
  },
  {
    id: "LIABILITY_002",
    category: "Liability & Indemnification",
    clause: "Client indemnifies Contractor from all claims stemming from client's failure in providing accurate information or permits.",
    applicability: {
      projectTypes: ["construction", "renovation", "fencing"],
      locations: ["california", "ca"],
      riskLevel: "HIGH",
      priority: 8
    }
  },
  {
    id: "LIABILITY_003",
    category: "Liability & Indemnification", 
    clause: "Detailed force majeure protection including natural disasters, pandemics, and civil disturbances.",
    applicability: {
      projectTypes: ["all"],
      amountRange: { min: 3000 },
      riskLevel: "MEDIUM",
      priority: 6
    }
  },
  {
    id: "LIABILITY_004",
    category: "Liability & Indemnification",
    clause: "Explicit clause absolving Contractor from liability for pre-existing conditions undisclosed by client.",
    applicability: {
      projectTypes: ["renovation", "repair", "fencing", "plumbing", "electrical"],
      riskLevel: "HIGH",
      priority: 8
    }
  },

  // Health & Safety Clauses
  {
    id: "SAFETY_001",
    category: "Health & Safety",
    clause: "Explicit client responsibility to ensure OSHA compliance before and during construction.",
    applicability: {
      projectTypes: ["construction", "roofing", "electrical"],
      amountRange: { min: 5000 },
      riskLevel: "HIGH",
      priority: 9
    }
  },
  {
    id: "SAFETY_002",
    category: "Health & Safety",
    clause: "Immediate Contractor withdrawal rights if hazardous conditions arise and are unaddressed by client.",
    applicability: {
      projectTypes: ["all"],
      riskLevel: "HIGH",
      priority: 8
    }
  },
  {
    id: "SAFETY_003", 
    category: "Health & Safety",
    clause: "Requirement for client to disclose all known site hazards before work initiation.",
    applicability: {
      projectTypes: ["excavation", "construction", "fencing", "landscaping"],
      riskLevel: "HIGH",
      priority: 7
    }
  },

  // Legal & Contract Enforcement
  {
    id: "LEGAL_001",
    category: "Legal & Contract Enforcement",
    clause: "Mandatory mediation clause before any litigation or arbitration proceedings commence.",
    applicability: {
      projectTypes: ["all"],
      amountRange: { min: 2000 },
      riskLevel: "MEDIUM",
      priority: 6
    }
  },
  {
    id: "LEGAL_002",
    category: "Legal & Contract Enforcement",
    clause: "Recovery of full legal fees and associated costs for prevailing party in dispute resolutions.",
    applicability: {
      projectTypes: ["all"],
      amountRange: { min: 3000 },
      riskLevel: "HIGH",
      priority: 8
    }
  },
  {
    id: "LEGAL_003",
    category: "Legal & Contract Enforcement",
    clause: "Binding arbitration to be held locally in Contractor's jurisdiction for all contractual disputes.",
    applicability: {
      projectTypes: ["all"],
      amountRange: { min: 5000 },
      riskLevel: "MEDIUM",
      priority: 7
    }
  },

  // Material & Supply Clauses
  {
    id: "MATERIAL_001",
    category: "Material & Supply",
    clause: "Client responsible for additional material costs resulting from market shortages or unexpected price spikes.",
    applicability: {
      projectTypes: ["construction", "renovation", "fencing"],
      amountRange: { min: 3000 },
      riskLevel: "HIGH",
      priority: 7
    }
  },
  {
    id: "MATERIAL_002",
    category: "Material & Supply",
    clause: "Contractor's right to refuse inferior or defective materials supplied by Client.",
    applicability: {
      projectTypes: ["all"],
      riskLevel: "MEDIUM",
      priority: 6
    }
  },

  // California-specific clauses
  {
    id: "CA_001",
    category: "Legal & Contract Enforcement",
    clause: "Full compliance with California Home Improvement Contract Act, including 3-day Right to Cancel for contracts exceeding $25.",
    applicability: {
      projectTypes: ["all"],
      locations: ["california", "ca"],
      riskLevel: "HIGH",
      priority: 9
    }
  },
  {
    id: "CA_002", 
    category: "Legal & Contract Enforcement",
    clause: "Mechanics Lien Rights fully reserved under California Civil Code Section 8000 et seq.",
    applicability: {
      projectTypes: ["construction", "renovation", "fencing", "roofing"],
      locations: ["california", "ca"],
      amountRange: { min: 1000 },
      riskLevel: "HIGH",
      priority: 8
    }
  }
];

/**
 * Sistema inteligente de selección de cláusulas de Mervin AI
 */
export function selectIntelligentClauses(
  projectType: string,
  projectAmount: number,
  location: string,
  maxClauses: number = 5
): ProtectionClause[] {
  const normalizedProjectType = projectType.toLowerCase();
  const normalizedLocation = location.toLowerCase();
  
  // Filtrar cláusulas aplicables
  const applicableClauses = contractorProtectionClauses.filter(clause => {
    const app = clause.applicability;
    
    // Verificar tipo de proyecto
    const typeMatch = app.projectTypes.includes("all") || 
                     app.projectTypes.some(type => normalizedProjectType.includes(type));
    
    // Verificar rango de monto
    const amountMatch = !app.amountRange || 
                       (!app.amountRange.min || projectAmount >= app.amountRange.min) &&
                       (!app.amountRange.max || projectAmount <= app.amountRange.max);
    
    // Verificar ubicación
    const locationMatch = !app.locations || 
                         app.locations.some(loc => normalizedLocation.includes(loc));
    
    return typeMatch && amountMatch && locationMatch;
  });
  
  // Ordenar por prioridad y nivel de riesgo
  const sortedClauses = applicableClauses.sort((a, b) => {
    // Primero por nivel de riesgo (HIGH > MEDIUM > LOW)
    const riskWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const riskDiff = riskWeight[b.applicability.riskLevel] - riskWeight[a.applicability.riskLevel];
    
    if (riskDiff !== 0) return riskDiff;
    
    // Luego por prioridad
    return b.applicability.priority - a.applicability.priority;
  });
  
  // Seleccionar las mejores cláusulas asegurando diversidad de categorías
  const selectedClauses: ProtectionClause[] = [];
  const usedCategories = new Set<string>();
  
  // Primera pasada: una cláusula por categoría
  for (const clause of sortedClauses) {
    if (selectedClauses.length >= maxClauses) break;
    
    if (!usedCategories.has(clause.category)) {
      selectedClauses.push(clause);
      usedCategories.add(clause.category);
    }
  }
  
  // Segunda pasada: completar con las cláusulas de mayor prioridad restantes
  for (const clause of sortedClauses) {
    if (selectedClauses.length >= maxClauses) break;
    
    if (!selectedClauses.find(c => c.id === clause.id)) {
      selectedClauses.push(clause);
    }
  }
  
  return selectedClauses.slice(0, maxClauses);
}
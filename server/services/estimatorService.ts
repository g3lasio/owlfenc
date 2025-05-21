import { storage } from "../storage";
import { promptGeneratorService } from "./promptGeneratorService";

// Tipo para los datos de entrada de un proyecto
export interface ProjectInput {
  // Contractor info
  contractorId: number;
  contractorName?: string;
  contractorCompany?: string;
  contractorAddress?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  contractorLicense?: string;
  contractorLogo?: string;
  
  // Client info
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  projectAddress: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  
  // Project details
  projectType: string;
  projectSubtype: string;
  projectDimensions: {
    length?: number;
    height?: number;
    width?: number;
    area?: number;
  };
  additionalFeatures?: Record<string, any>;
  notes?: string;
  
  // Generation options
  useAI?: boolean;
  customPrompt?: string;
}

// Constantes y configuraciones
const DEFAULT_TAX_RATE = 0.0875; // 8.75%

const FENCE_HEIGHT_FACTORS = {
  "4": 1.0,  // 4 foot fence (base factor)
  "6": 1.25, // 6 foot fence (25% more material/labor)
  "8": 1.5   // 8 foot fence (50% more material/labor)
};

const FENCE_MATERIAL_COSTS = {
  "wood": {
    "posts": 15,           // $ per post
    "rails": 8,            // $ per rail
    "pickets": 2.5,        // $ per picket
    "concrete": 5          // $ per bag
  },
  "vinyl": {
    "posts": 35,           // $ per post
    "rails": 18,           // $ per rail
    "panels": 45,          // $ per panel
    "concrete": 5          // $ per bag
  },
  "chain_link": {
    "posts": 25,           // $ per post
    "rails": 15,           // $ per rail
    "mesh": 8,             // $ per linear foot
    "concrete": 5          // $ per bag
  }
};

const LABOR_RATES = {
  "fence": {
    "hourlyRate": 40,      // $ per hour for fence installation
    "feetPerHour": 10      // Linear feet installed per hour (average)
  },
  "roof": {
    "hourlyRate": 50,      // $ per hour for roofing
    "squarePerHour": 1     // Square (100 sq ft) per hour (average)
  },
  "deck": {
    "hourlyRate": 45,      // $ per hour for deck construction
    "squareFootPerHour": 8 // Square feet per hour (average)
  },
  "patio": {
    "hourlyRate": 40,      // $ per hour for patio construction
    "squareFootPerHour": 12 // Square feet per hour (average)
  }
};

// Función para validar los datos de entrada del proyecto
export function validateProjectInput(input: Partial<ProjectInput>): Record<string, string> {
  const errors: Record<string, string> = {};
  
  // Validar campos requeridos básicos
  if (!input.clientName) {
    errors.clientName = "Se requiere nombre del cliente";
  }
  
  if (!input.projectAddress) {
    errors.projectAddress = "Se requiere dirección del proyecto";
  }
  
  if (!input.projectType) {
    errors.projectType = "Se requiere tipo de proyecto";
  }
  
  if (!input.projectSubtype) {
    errors.projectSubtype = "Se requiere subtipo de proyecto";
  }
  
  // Validar dimensiones según el tipo de proyecto
  if (!input.projectDimensions) {
    errors.projectDimensions = "Se requieren dimensiones del proyecto";
  } else {
    // Cercas: requieren longitud y altura
    if (input.projectType.toLowerCase() === "fence" || input.projectType.toLowerCase() === "cerca") {
      if (!input.projectDimensions.length || input.projectDimensions.length <= 0) {
        errors.length = "Se requiere longitud de la cerca";
      }
      
      if (!input.projectDimensions.height || input.projectDimensions.height <= 0) {
        errors.height = "Se requiere altura de la cerca";
      }
    }
    
    // Techos: requieren área
    else if (input.projectType.toLowerCase() === "roof" || input.projectType.toLowerCase() === "techo") {
      if (!input.projectDimensions.area || input.projectDimensions.area <= 0) {
        errors.area = "Se requiere área del techo";
      }
    }
    
    // Deck/Patio: requieren área o longitud/ancho
    else if (["deck", "patio"].includes(input.projectType.toLowerCase())) {
      if (!input.projectDimensions.area || input.projectDimensions.area <= 0) {
        if (!input.projectDimensions.length || !input.projectDimensions.width || 
            input.projectDimensions.length <= 0 || input.projectDimensions.width <= 0) {
          errors.dimensions = "Se requiere área o longitud y ancho";
        }
      }
    }
  }
  
  return errors;
}

// Servicio principal para estimaciones
export class EstimatorService {
  /**
   * Genera un estimado completo para un proyecto
   */
  async generateEstimate(input: ProjectInput): Promise<any> {
    try {
      // Validar datos de entrada
      const validationErrors = validateProjectInput(input);
      if (Object.keys(validationErrors).length > 0) {
        throw new Error("Datos de proyecto inválidos: " + Object.values(validationErrors).join(", "));
      }
      
      // Formatear los datos para el resultado final
      const result = {
        projectId: `PROJ_${Date.now()}`,
        createdAt: new Date().toISOString(),
        client: {
          name: input.clientName,
          email: input.clientEmail || "",
          phone: input.clientPhone || "",
          address: input.projectAddress,
          city: input.clientCity || "",
          state: input.clientState || "",
          zip: input.clientZip || ""
        },
        contractor: {
          id: input.contractorId,
          name: input.contractorName || "",
          company: input.contractorCompany || "",
          address: input.contractorAddress || "",
          phone: input.contractorPhone || "",
          email: input.contractorEmail || "",
          license: input.contractorLicense || "",
          logo: input.contractorLogo || ""
        },
        project: {
          type: input.projectType,
          subtype: input.projectSubtype,
          dimensions: input.projectDimensions,
          additionalFeatures: input.additionalFeatures || {},
          notes: input.notes || ""
        }
      };
      
      // Si se solicita IA, generar estimado con IA
      if (input.useAI) {
        return await this.generateAIEstimate(input, result);
      }
      
      // Por defecto, generar estimado basado en reglas
      return await this.generateRulesBasedEstimate(input, result);
    } catch (error) {
      console.error("Error generando estimado:", error);
      throw error;
    }
  }
  
  /**
   * Genera un estimado utilizando reglas predefinidas
   */
  private async generateRulesBasedEstimate(input: ProjectInput, baseResult: any): Promise<any> {
    const result = { ...baseResult };
    
    // Determinar el tipo de proyecto y aplicar lógica específica
    switch (input.projectType.toLowerCase()) {
      case "fence":
      case "cerca":
        result.rulesBasedEstimate = this.calculateFenceEstimate(input);
        break;
        
      case "roof":
      case "techo":
        result.rulesBasedEstimate = this.calculateRoofEstimate(input);
        break;
        
      case "deck":
        result.rulesBasedEstimate = this.calculateDeckEstimate(input);
        break;
        
      case "patio":
        result.rulesBasedEstimate = this.calculatePatioEstimate(input);
        break;
        
      default:
        // Para tipos de proyecto no soportados explícitamente, usar IA
        return await this.generateAIEstimate(input, baseResult);
    }
    
    // Añadir totales
    result.rulesBasedEstimate.totals = this.calculateTotals(result.rulesBasedEstimate);
    
    return result;
  }
  
  /**
   * Calcula un estimado para cerca basado en reglas predefinidas
   */
  private calculateFenceEstimate(input: ProjectInput): any {
    const length = input.projectDimensions.length || 0;
    const height = input.projectDimensions.height || 6; // Altura por defecto: 6 pies
    const subtype = input.projectSubtype.toLowerCase();
    
    // Determinar el tipo de material
    let materialType = "wood"; // Por defecto
    if (subtype.includes("vinyl")) materialType = "vinyl";
    if (subtype.includes("chain") || subtype.includes("eslabón") || subtype.includes("metal")) materialType = "chain_link";
    
    // Calcular postes necesarios (cada 8 pies + 1 extra)
    const postSpacing = 8; // Espaciado estándar entre postes
    const postsCount = Math.ceil(length / postSpacing) + 1;
    
    // Bolsas de concreto (2 por poste)
    const concreteBags = postsCount * 2;
    
    // Calcular rieles (2-3 por sección según altura)
    const railsPerSection = height <= 5 ? 2 : 3;
    const railsCount = (postsCount - 1) * railsPerSection;
    
    // Calcular tablas/pickets (para cerca de madera)
    // 1 tabla cada 6 pulgadas (0.5 pies)
    let picketCount = 0;
    if (materialType === "wood") {
      picketCount = Math.ceil(length / 0.5);
    }
    
    // Calcular paneles (para cerca de vinilo)
    let panelCount = 0;
    if (materialType === "vinyl") {
      panelCount = postsCount - 1;
    }
    
    // Calcular costos de materiales
    const materialCosts = {
      posts: {
        type: materialType,
        quantity: postsCount,
        costPerUnit: FENCE_MATERIAL_COSTS[materialType].posts,
        totalCost: postsCount * FENCE_MATERIAL_COSTS[materialType].posts
      },
      rails: {
        quantity: railsCount,
        costPerUnit: FENCE_MATERIAL_COSTS[materialType].rails,
        totalCost: railsCount * FENCE_MATERIAL_COSTS[materialType].rails
      },
      concrete: {
        bags: concreteBags,
        costPerBag: FENCE_MATERIAL_COSTS[materialType].concrete,
        totalCost: concreteBags * FENCE_MATERIAL_COSTS[materialType].concrete
      }
    };
    
    // Añadir tablas o malla según el tipo
    if (materialType === "wood") {
      materialCosts.pickets = {
        quantity: picketCount,
        costPerUnit: FENCE_MATERIAL_COSTS.wood.pickets,
        totalCost: picketCount * FENCE_MATERIAL_COSTS.wood.pickets
      };
    } else if (materialType === "vinyl") {
      materialCosts.panels = {
        quantity: panelCount,
        costPerUnit: FENCE_MATERIAL_COSTS.vinyl.panels,
        totalCost: panelCount * FENCE_MATERIAL_COSTS.vinyl.panels
      };
    } else if (materialType === "chain_link") {
      materialCosts.mesh = {
        feet: length,
        costPerFoot: FENCE_MATERIAL_COSTS.chain_link.mesh,
        totalCost: length * FENCE_MATERIAL_COSTS.chain_link.mesh
      };
    }
    
    // Calcular costo total de materiales
    let materialTotalCost = 0;
    Object.values(materialCosts).forEach((item: any) => {
      materialTotalCost += item.totalCost;
    });
    
    // Calcular tiempo y costo de mano de obra
    const heightFactor = FENCE_HEIGHT_FACTORS[height.toString()] || 1.25; // Factor por defecto si no está en la tabla
    const hoursNeeded = length / (LABOR_RATES.fence.feetPerHour / heightFactor);
    const laborCost = hoursNeeded * LABOR_RATES.fence.hourlyRate;
    
    // Costos adicionales
    const additionalCosts: Record<string, number> = {};
    
    // Demolición (si aplicable)
    if (input.additionalFeatures?.demolition) {
      additionalCosts.demolition = length * 5; // $5 por pie lineal
    }
    
    // Pintura/teñido (si aplicable)
    if (input.additionalFeatures?.painting && materialType === "wood") {
      additionalCosts.painting = length * height * 0.75; // $0.75 por pie cuadrado
    }
    
    // Celosía (si aplicable)
    if (input.additionalFeatures?.lattice) {
      additionalCosts.lattice = length * 3; // $3 por pie lineal
    }
    
    // Puertas (si aplicable)
    if (input.additionalFeatures?.gates && Array.isArray(input.additionalFeatures.gates)) {
      let gatesCost = 0;
      input.additionalFeatures.gates.forEach((gate: any) => {
        // Costo base $100 + $50 por cada pie de ancho
        const gateCost = (100 + (gate.width || 3) * 50) * (gate.quantity || 1);
        gatesCost += gateCost;
      });
      additionalCosts.gates = gatesCost;
    }
    
    // Calcular costos adicionales totales
    let additionalTotalCost = 0;
    Object.values(additionalCosts).forEach(cost => {
      additionalTotalCost += cost;
    });
    
    // Resultados del estimado
    return {
      materials: materialCosts,
      materialTotal: materialTotalCost,
      labor: {
        hours: Math.round(hoursNeeded * 10) / 10, // Redondear a 1 decimal
        hourlyRate: LABOR_RATES.fence.hourlyRate,
        totalCost: laborCost
      },
      additionalCosts: additionalCosts,
      additionalTotal: additionalTotalCost,
      estimatedDays: this.calculateCompletionTime(length),
      heightFactor
    };
  }
  
  /**
   * Calcula un estimado para techo basado en reglas predefinidas
   */
  private calculateRoofEstimate(input: ProjectInput): any {
    const area = input.projectDimensions.area || 0;
    const subtype = input.projectSubtype.toLowerCase();
    
    // Determinar tipo de material y costos específicos
    let materialType = "asphalt"; // Por defecto
    let materialCostPerSquareFoot = 3.0; // $ por pie cuadrado
    
    if (subtype.includes("metal")) {
      materialType = "metal";
      materialCostPerSquareFoot = 8.50;
    } else if (subtype.includes("tile") || subtype.includes("teja")) {
      materialType = "tile";
      materialCostPerSquareFoot = 10.0;
    } else if (subtype.includes("wood") || subtype.includes("shake")) {
      materialType = "wood";
      materialCostPerSquareFoot = 7.0;
    } else if (subtype.includes("slate") || subtype.includes("pizarra")) {
      materialType = "slate";
      materialCostPerSquareFoot = 15.0;
    }
    
    // Costo total de materiales
    const mainMaterialCost = area * materialCostPerSquareFoot;
    
    // Materiales complementarios
    const underlaymentCost = area * 0.5; // Fieltro/membrana: $0.50 por pie cuadrado
    const flashingCost = area * 0.3; // Tapajuntas: $0.30 por pie cuadrado
    const hardwareCost = area * 0.2; // Sujetadores: $0.20 por pie cuadrado
    
    // Calcular tiempo y costo de mano de obra
    const squares = area / 100; // Un "square" en techos = 100 pies cuadrados
    const hoursNeeded = squares / LABOR_RATES.roof.squarePerHour;
    const laborCost = hoursNeeded * LABOR_RATES.roof.hourlyRate;
    
    // Costos adicionales
    const additionalCosts: Record<string, number> = {};
    
    // Remoción de techo existente (si aplicable)
    if (input.additionalFeatures?.demolition) {
      additionalCosts.roofRemoval = area * 1.5; // $1.50 por pie cuadrado
    }
    
    // Ventilación adicional (si aplicable)
    if (input.additionalFeatures?.additionalVentilation) {
      additionalCosts.ventilation = 300; // Costo fijo de $300
    }
    
    // Canalones nuevos (si aplicable)
    if (input.additionalFeatures?.newGutters) {
      // Estimar perímetro basado en área (aproximado)
      const estimatedPerimeter = Math.sqrt(area) * 4;
      additionalCosts.gutters = estimatedPerimeter * 8; // $8 por pie lineal
    }
    
    // Calcular costos adicionales totales
    let additionalTotalCost = 0;
    Object.values(additionalCosts).forEach(cost => {
      additionalTotalCost += cost;
    });
    
    // Estructurar resultado
    return {
      materials: {
        roofing: {
          type: materialType,
          areaSqFt: area,
          costPerSqFt: materialCostPerSquareFoot,
          totalCost: mainMaterialCost
        },
        underlayment: {
          areaSqFt: area,
          costPerSqFt: 0.5,
          totalCost: underlaymentCost
        },
        flashing: {
          areaSqFt: area,
          costPerSqFt: 0.3,
          totalCost: flashingCost
        },
        hardware: {
          areaSqFt: area,
          costPerSqFt: 0.2,
          totalCost: hardwareCost
        }
      },
      materialTotal: mainMaterialCost + underlaymentCost + flashingCost + hardwareCost,
      labor: {
        hours: Math.round(hoursNeeded * 10) / 10, // Redondear a 1 decimal
        hourlyRate: LABOR_RATES.roof.hourlyRate,
        totalCost: laborCost
      },
      additionalCosts: additionalCosts,
      additionalTotal: additionalTotalCost,
      estimatedDays: this.calculateRoofCompletionTime(area)
    };
  }
  
  /**
   * Calcula un estimado para deck basado en reglas predefinidas
   */
  private calculateDeckEstimate(input: ProjectInput): any {
    // Obtener área del deck
    let area = input.projectDimensions.area || 0;
    
    // Si no se proporcionó área, calcularla de longitud x ancho
    if (area === 0 && input.projectDimensions.length && input.projectDimensions.width) {
      area = input.projectDimensions.length * input.projectDimensions.width;
    }
    
    const height = input.projectDimensions.height || 2; // Altura por defecto: 2 pies
    const subtype = input.projectSubtype.toLowerCase();
    
    // Determinar tipo de material y costos específicos
    let materialType = "pressure-treated"; // Por defecto
    let deckingCostPerSqFt = 8.0; // Madera tratada a presión
    let structureCostPerSqFt = 6.0; // Estructura (vigas, postes, etc.)
    
    if (subtype.includes("composite") || subtype.includes("compuesto")) {
      materialType = "composite";
      deckingCostPerSqFt = 15.0;
      structureCostPerSqFt = 6.0;
    } else if (subtype.includes("cedar") || subtype.includes("cedro")) {
      materialType = "cedar";
      deckingCostPerSqFt = 12.0;
      structureCostPerSqFt = 6.0;
    } else if (subtype.includes("redwood") || subtype.includes("secoya")) {
      materialType = "redwood";
      deckingCostPerSqFt = 18.0;
      structureCostPerSqFt = 6.0;
    } else if (subtype.includes("tropical") || subtype.includes("hardwood") || subtype.includes("ipe")) {
      materialType = "tropical-hardwood";
      deckingCostPerSqFt = 22.0;
      structureCostPerSqFt = 6.0;
    }
    
    // Ajustar costos de estructura basados en altura
    const heightFactor = height <= 3 ? 1.0 : (height <= 6 ? 1.5 : 2.0);
    structureCostPerSqFt *= heightFactor;
    
    // Costo total de materiales
    const deckingCost = area * deckingCostPerSqFt;
    const structureCost = area * structureCostPerSqFt;
    const hardwareCost = area * 1.5; // Herrajes: $1.50 por pie cuadrado
    
    // Calcular costos de concreto para cimientos
    const postsNeeded = Math.ceil(area / 25); // 1 poste cada 25 pies cuadrados (aproximado)
    const concreteBags = postsNeeded * 2; // 2 bolsas por poste
    const concreteCost = concreteBags * 5; // $5 por bolsa
    
    // Calcular tiempo y costo de mano de obra
    const hoursNeeded = area / LABOR_RATES.deck.squareFootPerHour;
    const laborCost = hoursNeeded * LABOR_RATES.deck.hourlyRate;
    
    // Costos adicionales
    const additionalCosts: Record<string, number> = {};
    
    // Remoción de deck existente (si aplicable)
    if (input.additionalFeatures?.demolition) {
      additionalCosts.deckRemoval = area * 3; // $3 por pie cuadrado
    }
    
    // Barandas (si aplicable)
    if (input.additionalFeatures?.railing) {
      // Estimar perímetro basado en área (aproximado)
      const estimatedPerimeter = Math.sqrt(area) * 4;
      const railingCostPerFoot = materialType === "composite" ? 35 : 25;
      additionalCosts.railing = estimatedPerimeter * railingCostPerFoot;
    }
    
    // Escalones (si aplicable)
    if (input.additionalFeatures?.steps) {
      const stepCount = input.additionalFeatures.stepCount || height * 2; // Aproximado
      const stepCost = stepCount * (materialType === "composite" ? 100 : 75);
      additionalCosts.steps = stepCost;
    }
    
    // Iluminación (si aplicable)
    if (input.additionalFeatures?.lighting) {
      additionalCosts.lighting = 250 + (area / 50) * 25; // Base $250 + $25 por cada 50 pies cuadrados
    }
    
    // Calcular costos adicionales totales
    let additionalTotalCost = 0;
    Object.values(additionalCosts).forEach(cost => {
      additionalTotalCost += cost;
    });
    
    // Estructurar resultado
    return {
      materials: {
        decking: {
          type: materialType,
          areaSqFt: area,
          costPerSqFt: deckingCostPerSqFt,
          totalCost: deckingCost
        },
        structure: {
          areaSqFt: area,
          costPerSqFt: structureCostPerSqFt,
          totalCost: structureCost
        },
        hardware: {
          areaSqFt: area,
          costPerSqFt: 1.5,
          totalCost: hardwareCost
        },
        concrete: {
          bags: concreteBags,
          costPerBag: 5,
          totalCost: concreteCost
        }
      },
      materialTotal: deckingCost + structureCost + hardwareCost + concreteCost,
      labor: {
        hours: Math.round(hoursNeeded * 10) / 10, // Redondear a 1 decimal
        hourlyRate: LABOR_RATES.deck.hourlyRate,
        totalCost: laborCost
      },
      additionalCosts: additionalCosts,
      additionalTotal: additionalTotalCost,
      estimatedDays: this.calculateDeckCompletionTime(area, !!input.additionalFeatures?.railing)
    };
  }
  
  /**
   * Calcula un estimado para patio basado en reglas predefinidas
   */
  private calculatePatioEstimate(input: ProjectInput): any {
    // Obtener área del patio
    let area = input.projectDimensions.area || 0;
    
    // Si no se proporcionó área, calcularla de longitud x ancho
    if (area === 0 && input.projectDimensions.length && input.projectDimensions.width) {
      area = input.projectDimensions.length * input.projectDimensions.width;
    }
    
    const subtype = input.projectSubtype.toLowerCase();
    
    // Determinar tipo de material y costos específicos
    let materialType = "concrete"; // Por defecto
    let surfaceCostPerSqFt = 6.0; // Concreto
    
    if (subtype.includes("paver") || subtype.includes("adoquin")) {
      materialType = "paver";
      surfaceCostPerSqFt = 10.0;
    } else if (subtype.includes("stone") || subtype.includes("piedra") || subtype.includes("flagstone")) {
      materialType = "stone";
      surfaceCostPerSqFt = 15.0;
    } else if (subtype.includes("brick") || subtype.includes("ladrillo")) {
      materialType = "brick";
      surfaceCostPerSqFt = 12.0;
    } else if (subtype.includes("tile") || subtype.includes("loseta")) {
      materialType = "tile";
      surfaceCostPerSqFt = 14.0;
    }
    
    // Costo total de materiales
    const surfaceCost = area * surfaceCostPerSqFt;
    
    // Materiales de base
    const gravelCost = area * 1.5; // Grava: $1.50 por pie cuadrado
    const sandCost = area * 1.0; // Arena: $1.00 por pie cuadrado
    
    // Calcular tiempo y costo de mano de obra
    const hoursNeeded = area / LABOR_RATES.patio.squareFootPerHour;
    const laborCost = hoursNeeded * LABOR_RATES.patio.hourlyRate;
    
    // Costos adicionales
    const additionalCosts: Record<string, number> = {};
    
    // Remoción de patio existente (si aplicable)
    if (input.additionalFeatures?.demolition) {
      additionalCosts.patioRemoval = area * 2.5; // $2.50 por pie cuadrado
    }
    
    // Muro de contención (si aplicable)
    if (input.additionalFeatures?.retainingWall) {
      // Estimar perímetro basado en área (aproximado)
      const estimatedPerimeter = Math.sqrt(area) * 4;
      const wallLength = input.additionalFeatures.wallLength || estimatedPerimeter / 2; // Por defecto, muro en un lado
      const wallHeight = input.additionalFeatures.wallHeight || 2; // Altura por defecto: 2 pies
      
      additionalCosts.retainingWall = wallLength * wallHeight * 45; // $45 por pie cuadrado de muro
    }
    
    // Desagüe (si aplicable)
    if (input.additionalFeatures?.drainage) {
      additionalCosts.drainage = 300 + area * 0.5; // Base $300 + $0.50 por pie cuadrado
    }
    
    // Iluminación (si aplicable)
    if (input.additionalFeatures?.lighting) {
      additionalCosts.lighting = 200 + (area / 100) * 50; // Base $200 + $50 por cada 100 pies cuadrados
    }
    
    // Calcular costos adicionales totales
    let additionalTotalCost = 0;
    Object.values(additionalCosts).forEach(cost => {
      additionalTotalCost += cost;
    });
    
    // Estructurar resultado
    return {
      materials: {
        surface: {
          type: materialType,
          areaSqFt: area,
          costPerSqFt: surfaceCostPerSqFt,
          totalCost: surfaceCost
        },
        gravel: {
          areaSqFt: area,
          costPerSqFt: 1.5,
          totalCost: gravelCost
        },
        sand: {
          areaSqFt: area,
          costPerSqFt: 1.0,
          totalCost: sandCost
        }
      },
      materialTotal: surfaceCost + gravelCost + sandCost,
      labor: {
        hours: Math.round(hoursNeeded * 10) / 10, // Redondear a 1 decimal
        hourlyRate: LABOR_RATES.patio.hourlyRate,
        totalCost: laborCost
      },
      additionalCosts: additionalCosts,
      additionalTotal: additionalTotalCost,
      estimatedDays: this.calculatePatioCompletionTime(area, !!input.additionalFeatures?.retainingWall)
    };
  }
  
  /**
   * Genera un estimado utilizando IA
   */
  private async generateAIEstimate(input: ProjectInput, baseResult: any): Promise<any> {
    try {
      // Generar un prompt para el proyecto
      const category = input.projectType.toLowerCase();
      
      // Si hay un prompt personalizado, usarlo
      let prompt = input.customPrompt;
      
      // Si no hay prompt personalizado, generar uno automáticamente
      if (!prompt) {
        prompt = await promptGeneratorService.generatePromptForProject(
          input.contractorId,
          {
            projectType: input.projectType,
            projectSubtype: input.projectSubtype,
            projectDimensions: input.projectDimensions,
            clientState: input.clientState,
            clientCity: input.clientCity,
            additionalFeatures: input.additionalFeatures,
            notes: input.notes
          },
          category
        );
      }
      
      // Procesar el prompt con IA
      const aiResponse = await promptGeneratorService.processPromptWithAI(prompt);
      
      // Estructurar el resultado
      const result = { ...baseResult };
      result.aiEstimate = aiResponse;
      result.prompt = prompt;
      
      // Calcular totales globales
      if (aiResponse && aiResponse.summary) {
        result.aiEstimate.totals = {
          subtotal: aiResponse.summary.subtotal,
          tax: aiResponse.summary.tax,
          total: aiResponse.summary.total
        };
      }
      
      return result;
    } catch (error) {
      console.error("Error generando estimado con IA:", error);
      throw error;
    }
  }
  
  /**
   * Calcula los totales generales de un estimado
   */
  private calculateTotals(estimate: any): any {
    // Subtotal: materiales + mano de obra + costos adicionales
    const subtotal = (estimate.materialTotal || 0) + 
                    (estimate.labor?.totalCost || 0) + 
                    (estimate.additionalTotal || 0);
    
    // Impuestos (solo sobre materiales, no sobre mano de obra)
    const taxableAmount = estimate.materialTotal || 0;
    const tax = taxableAmount * DEFAULT_TAX_RATE;
    
    // Total final
    const total = subtotal + tax;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }
  
  /**
   * Estima el tiempo de finalización para una cerca en días
   */
  private calculateCompletionTime(length: number): string {
    if (length <= 50) return "1-2 días";
    if (length <= 100) return "2-3 días";
    if (length <= 200) return "3-5 días";
    if (length <= 300) return "5-7 días";
    return "7-10 días";
  }
  
  /**
   * Estima el tiempo de finalización para un techo en días
   */
  private calculateRoofCompletionTime(areaSqFt: number): string {
    const squares = areaSqFt / 100;
    
    if (squares <= 10) return "1-2 días";
    if (squares <= 20) return "2-3 días";
    if (squares <= 30) return "3-4 días";
    if (squares <= 50) return "4-6 días";
    return "6-10 días";
  }
  
  /**
   * Estima el tiempo de finalización para un deck en días
   */
  private calculateDeckCompletionTime(areaSqFt: number, hasRailing: boolean): string {
    const baseTime = areaSqFt <= 100 ? 2 :
                    areaSqFt <= 200 ? 3 :
                    areaSqFt <= 300 ? 5 :
                    areaSqFt <= 500 ? 7 : 10;
    
    // Añadir tiempo extra si hay barandas
    const extraTime = hasRailing ? 1 : 0;
    
    const minDays = baseTime;
    const maxDays = baseTime + extraTime + 2; // +2 para dar margen
    
    return `${minDays}-${maxDays} días`;
  }
  
  /**
   * Estima el tiempo de finalización para un patio en días
   */
  private calculatePatioCompletionTime(areaSqFt: number, hasRetainingWall: boolean): string {
    const baseTime = areaSqFt <= 100 ? 1 :
                    areaSqFt <= 200 ? 2 :
                    areaSqFt <= 400 ? 3 :
                    areaSqFt <= 600 ? 5 : 7;
    
    // Añadir tiempo extra si hay muro de contención
    const extraTime = hasRetainingWall ? 2 : 0;
    
    const minDays = baseTime;
    const maxDays = baseTime + extraTime + 1; // +1 para dar margen
    
    return `${minDays}-${maxDays} días`;
  }
  
  /**
   * Recupera precios de materiales de la base de datos o ajustes del usuario
   */
  async getMaterialPrices(category: string): Promise<any> {
    try {
      // En una implementación real, cargaríamos precios de la base de datos
      // Por ahora, devolvemos los precios predefinidos según la categoría
      
      switch (category.toLowerCase()) {
        case "fence":
        case "cerca":
          return FENCE_MATERIAL_COSTS;
          
        case "labor":
          return LABOR_RATES;
          
        default:
          return {};
      }
    } catch (error) {
      console.error(`Error obteniendo precios de materiales para ${category}:`, error);
      return {};
    }
  }
  
  /**
   * Genera el HTML para un estimado
   */
  async generateEstimateHtml(estimateData: any): Promise<string> {
    try {
      // Determinar qué plantilla usar basado en el tipo de estimado
      // Por defecto, usamos la plantilla 'standard'
      let templateStyle = 'standard';
      
      // Si hay un ID de plantilla específico en los datos, determinar el estilo basado en él
      if (estimateData.templateId) {
        // Mapeo de IDs a estilos (esto debería coincidir con la lógica del frontend)
        const templateMap: Record<number, string> = {
          1: 'standard',
          2: 'professional',
          3: 'luxury'
        };
        
        templateStyle = templateMap[estimateData.templateId] || 'standard';
      }
      
      // Cargar el archivo de template HTML desde el sistema de archivos
      const templatePath = `./public/templates/${templateStyle === 'standard' ? 'basictemplateestimate.html' : 
                                             templateStyle === 'professional' ? 'Premiumtemplateestimate.html' : 
                                             'luxurytemplate.html'}`;
      
      // Leer el contenido del archivo
      const fs = require('fs');
      let templateHtml = '';
      try {
        templateHtml = fs.readFileSync(templatePath, 'utf8');
        console.log(`Template cargado: ${templatePath}`);
      } catch (fsError) {
        console.error(`Error cargando template desde ${templatePath}:`, fsError);
        throw new Error(`No se pudo cargar la plantilla HTML: ${fsError.message}`);
      }
      
      // Reemplazar placeholders en el template con los datos del estimado
      let html = templateHtml;
      
      // Reemplazar datos básicos
      const replacements: Record<string, string> = {
        '[COMPANY_NAME]': estimateData.contractor?.name || 'Nombre de la Empresa',
        '[COMPANY_ADDRESS]': estimateData.contractor?.address || 'Dirección de la Empresa',
        '[COMPANY_PHONE]': estimateData.contractor?.phone || 'Teléfono',
        '[COMPANY_EMAIL]': estimateData.contractor?.email || 'Email',
        '[COMPANY_LICENSE]': estimateData.contractor?.license || 'Licencia',
        '[ESTIMATE_DATE]': new Date().toLocaleDateString(),
        '[ESTIMATE_NUMBER]': estimateData.projectId || 'N/A',
        '[CLIENT_NAME]': estimateData.client?.name || 'Cliente',
        '[CLIENT_ADDRESS]': estimateData.client?.address || 'Dirección',
        '[CLIENT_CITY_STATE_ZIP]': `${estimateData.client?.city || ''} ${estimateData.client?.state || ''} ${estimateData.client?.zip || ''}`,
        '[CLIENT_PHONE]': estimateData.client?.phone || 'Teléfono',
        '[CLIENT_EMAIL]': estimateData.client?.email || 'Email',
        '[PROJECT_TYPE]': `${estimateData.project?.type || ''} - ${estimateData.project?.subtype || ''}`,
        '[PROJECT_ADDRESS]': estimateData.client?.address || '',
        '[PROJECT_DIMENSIONS]': this.formatDimensions(estimateData.project?.dimensions),
        '[PROJECT_NOTES]': estimateData.project?.notes || '',
        '[SUBTOTAL]': '$' + this.formatCurrency(this.getEstimateSubtotal(estimateData)),
        '[TAX_RATE]': (DEFAULT_TAX_RATE * 100) + '%',
        '[TAX_AMOUNT]': '$' + this.formatCurrency(this.getEstimateTax(estimateData)),
        '[TOTAL]': '$' + this.formatCurrency(this.getEstimateTotal(estimateData)),
        '[COMPLETION_TIME]': this.getEstimateCompletionTime(estimateData)
      };
      
      // Reemplazar cada placeholder en el template
      Object.entries(replacements).forEach(([placeholder, value]) => {
        html = html.replace(new RegExp(placeholder, 'g'), value);
      });
      
      // Para el logo de la empresa, necesitamos un enfoque diferente ya que es una imagen
      if (estimateData.contractor?.logo) {
        html = html.replace('[COMPANY_LOGO]', 
          `<img src="${estimateData.contractor.logo}" alt="Logo" style="max-width: 100%; max-height: 100px; object-fit: contain;" />`);
      } else {
        html = html.replace('[COMPANY_LOGO]', '');
      }
      
      // Generar las filas de la tabla de costos
      const tableRowsHtml = this.generateEstimateTableRows(estimateData);
      html = html.replace('[COST_TABLE_ROWS]', tableRowsHtml);
      
      return html;
    } catch (error) {
      console.error("Error generando HTML de estimado:", error);
      throw error;
    }
  }
  
  /**
   * Formatea las dimensiones del proyecto para mostrar en el HTML
   */
  private formatDimensions(dimensions: any): string {
    if (!dimensions) return "No especificadas";
    
    const parts = [];
    if (dimensions.length) parts.push(`${dimensions.length} pies de longitud`);
    if (dimensions.height) parts.push(`${dimensions.height} pies de altura`);
    if (dimensions.width) parts.push(`${dimensions.width} pies de ancho`);
    if (dimensions.area) parts.push(`${dimensions.area} pies cuadrados`);
    
    return parts.length > 0 ? parts.join(", ") : "No especificadas";
  }
  
  /**
   * Genera las filas de la tabla de costos en el HTML
   */
  private generateEstimateTableRows(estimateData: any): string {
    let html = '';
    
    // Determinar qué estimado usar (basado en reglas o AI)
    const estimate = estimateData.rulesBasedEstimate || estimateData.aiEstimate;
    
    if (!estimate) {
      return '<tr><td colspan="5">No hay datos de estimado disponibles</td></tr>';
    }
    
    // Si es un estimado AI, mostrar los materiales desde la estructura AI
    if (estimateData.aiEstimate && estimateData.aiEstimate.materials) {
      const materials = estimateData.aiEstimate.materials;
      
      materials.forEach((material: any) => {
        html += `
          <tr>
            <td>${material.item}</td>
            <td>${material.quantity}</td>
            <td>${material.unit}</td>
            <td>$${this.formatCurrency(material.unitPrice)}</td>
            <td>$${this.formatCurrency(material.totalPrice)}</td>
          </tr>
        `;
      });
      
      // Mano de obra desde AI
      const labor = estimateData.aiEstimate.labor;
      html += `
        <tr>
          <td>Mano de obra</td>
          <td>${labor.hours}</td>
          <td>hora(s)</td>
          <td>$${this.formatCurrency(labor.ratePerHour)}</td>
          <td>$${this.formatCurrency(labor.totalCost)}</td>
        </tr>
      `;
      
      // Costos adicionales desde AI
      if (estimateData.aiEstimate.additionalCosts) {
        estimateData.aiEstimate.additionalCosts.forEach((cost: any) => {
          html += `
            <tr>
              <td>${cost.description}</td>
              <td>1</td>
              <td>servicio</td>
              <td>$${this.formatCurrency(cost.cost)}</td>
              <td>$${this.formatCurrency(cost.cost)}</td>
            </tr>
          `;
        });
      }
    }
    // Si es un estimado basado en reglas, mostrar materiales y costos
    else if (estimate.materials) {
      // Procesamos diferentes estructuras de materiales según el tipo de proyecto
      // Cercas
      if (estimate.materials.posts) {
        html += `
          <tr>
            <td>Postes</td>
            <td>${estimate.materials.posts.quantity}</td>
            <td>unidad</td>
            <td>$${this.formatCurrency(estimate.materials.posts.costPerUnit)}</td>
            <td>$${this.formatCurrency(estimate.materials.posts.totalCost)}</td>
          </tr>
        `;
      }
      
      if (estimate.materials.rails) {
        html += `
          <tr>
            <td>Rieles</td>
            <td>${estimate.materials.rails.quantity}</td>
            <td>unidad</td>
            <td>$${this.formatCurrency(estimate.materials.rails.costPerUnit)}</td>
            <td>$${this.formatCurrency(estimate.materials.rails.totalCost)}</td>
          </tr>
        `;
      }
      
      if (estimate.materials.pickets) {
        html += `
          <tr>
            <td>Tablas</td>
            <td>${estimate.materials.pickets.quantity}</td>
            <td>unidad</td>
            <td>$${this.formatCurrency(estimate.materials.pickets.costPerUnit)}</td>
            <td>$${this.formatCurrency(estimate.materials.pickets.totalCost)}</td>
          </tr>
        `;
      }
      
      if (estimate.materials.concrete) {
        html += `
          <tr>
            <td>Concreto</td>
            <td>${estimate.materials.concrete.bags}</td>
            <td>bolsa</td>
            <td>$${this.formatCurrency(estimate.materials.concrete.costPerBag)}</td>
            <td>$${this.formatCurrency(estimate.materials.concrete.totalCost)}</td>
          </tr>
        `;
      }
      
      // Techos
      if (estimate.materials.roofing) {
        html += `
          <tr>
            <td>Material de techo (${estimate.materials.roofing.type})</td>
            <td>${estimate.materials.roofing.areaSqFt}</td>
            <td>pie²</td>
            <td>$${this.formatCurrency(estimate.materials.roofing.costPerSqFt)}</td>
            <td>$${this.formatCurrency(estimate.materials.roofing.totalCost)}</td>
          </tr>
        `;
      }
      
      if (estimate.materials.underlayment) {
        html += `
          <tr>
            <td>Membrana base</td>
            <td>${estimate.materials.underlayment.areaSqFt}</td>
            <td>pie²</td>
            <td>$${this.formatCurrency(estimate.materials.underlayment.costPerSqFt)}</td>
            <td>$${this.formatCurrency(estimate.materials.underlayment.totalCost)}</td>
          </tr>
        `;
      }
      
      // Decks
      if (estimate.materials.decking) {
        html += `
          <tr>
            <td>Superficie de deck (${estimate.materials.decking.type})</td>
            <td>${estimate.materials.decking.areaSqFt}</td>
            <td>pie²</td>
            <td>$${this.formatCurrency(estimate.materials.decking.costPerSqFt)}</td>
            <td>$${this.formatCurrency(estimate.materials.decking.totalCost)}</td>
          </tr>
        `;
      }
      
      if (estimate.materials.structure) {
        html += `
          <tr>
            <td>Estructura</td>
            <td>${estimate.materials.structure.areaSqFt}</td>
            <td>pie²</td>
            <td>$${this.formatCurrency(estimate.materials.structure.costPerSqFt)}</td>
            <td>$${this.formatCurrency(estimate.materials.structure.totalCost)}</td>
          </tr>
        `;
      }
      
      // Patios
      if (estimate.materials.surface) {
        html += `
          <tr>
            <td>Superficie de patio (${estimate.materials.surface.type})</td>
            <td>${estimate.materials.surface.areaSqFt}</td>
            <td>pie²</td>
            <td>$${this.formatCurrency(estimate.materials.surface.costPerSqFt)}</td>
            <td>$${this.formatCurrency(estimate.materials.surface.totalCost)}</td>
          </tr>
        `;
      }
      
      if (estimate.materials.gravel) {
        html += `
          <tr>
            <td>Grava base</td>
            <td>${estimate.materials.gravel.areaSqFt}</td>
            <td>pie²</td>
            <td>$${this.formatCurrency(estimate.materials.gravel.costPerSqFt)}</td>
            <td>$${this.formatCurrency(estimate.materials.gravel.totalCost)}</td>
          </tr>
        `;
      }
      
      if (estimate.materials.sand) {
        html += `
          <tr>
            <td>Arena</td>
            <td>${estimate.materials.sand.areaSqFt}</td>
            <td>pie²</td>
            <td>$${this.formatCurrency(estimate.materials.sand.costPerSqFt)}</td>
            <td>$${this.formatCurrency(estimate.materials.sand.totalCost)}</td>
          </tr>
        `;
      }
      
      // Otros materiales comunes
      if (estimate.materials.hardware) {
        html += `
          <tr>
            <td>Herrajes y sujetadores</td>
            <td>${estimate.materials.hardware.areaSqFt || 1}</td>
            <td>${estimate.materials.hardware.areaSqFt ? 'pie²' : 'conjunto'}</td>
            <td>$${this.formatCurrency(estimate.materials.hardware.costPerSqFt || estimate.materials.hardware.totalCost)}</td>
            <td>$${this.formatCurrency(estimate.materials.hardware.totalCost)}</td>
          </tr>
        `;
      }
      
      // Mano de obra
      if (estimate.labor) {
        html += `
          <tr>
            <td>Mano de obra</td>
            <td>${estimate.labor.hours}</td>
            <td>hora(s)</td>
            <td>$${this.formatCurrency(estimate.labor.hourlyRate)}</td>
            <td>$${this.formatCurrency(estimate.labor.totalCost)}</td>
          </tr>
        `;
      }
      
      // Costos adicionales
      if (estimate.additionalCosts) {
        Object.entries(estimate.additionalCosts).forEach(([key, value]) => {
          let description = key;
          
          // Mejorar las descripciones
          if (key === 'demolition') description = 'Demolición de estructura existente';
          if (key === 'roofRemoval') description = 'Remoción de techo existente';
          if (key === 'deckRemoval') description = 'Remoción de deck existente';
          if (key === 'patioRemoval') description = 'Remoción de patio existente';
          if (key === 'painting') description = 'Pintura/teñido';
          if (key === 'lattice') description = 'Celosía decorativa';
          if (key === 'gates') description = 'Puertas e instalación';
          if (key === 'ventilation') description = 'Ventilación adicional';
          if (key === 'gutters') description = 'Canalones nuevos';
          if (key === 'railing') description = 'Barandas';
          if (key === 'steps') description = 'Escaleras';
          if (key === 'lighting') description = 'Iluminación';
          if (key === 'retainingWall') description = 'Muro de contención';
          if (key === 'drainage') description = 'Sistema de desagüe';
          
          html += `
            <tr>
              <td>${description}</td>
              <td>1</td>
              <td>servicio</td>
              <td>$${this.formatCurrency(value as number)}</td>
              <td>$${this.formatCurrency(value as number)}</td>
            </tr>
          `;
        });
      }
    }
    
    // Si no hay filas, mostrar mensaje
    if (html === '') {
      html = '<tr><td colspan="5">No hay datos detallados disponibles</td></tr>';
    }
    
    return html;
  }
  
  /**
   * Obtiene el subtotal del estimado
   */
  private getEstimateSubtotal(estimateData: any): number {
    if (estimateData.rulesBasedEstimate?.totals?.subtotal) {
      return estimateData.rulesBasedEstimate.totals.subtotal;
    }
    
    if (estimateData.aiEstimate?.summary?.subtotal) {
      return estimateData.aiEstimate.summary.subtotal;
    }
    
    return 0;
  }
  
  /**
   * Obtiene el impuesto del estimado
   */
  private getEstimateTax(estimateData: any): number {
    if (estimateData.rulesBasedEstimate?.totals?.tax) {
      return estimateData.rulesBasedEstimate.totals.tax;
    }
    
    if (estimateData.aiEstimate?.summary?.tax) {
      return estimateData.aiEstimate.summary.tax;
    }
    
    return 0;
  }
  
  /**
   * Obtiene el total del estimado
   */
  private getEstimateTotal(estimateData: any): number {
    if (estimateData.rulesBasedEstimate?.totals?.total) {
      return estimateData.rulesBasedEstimate.totals.total;
    }
    
    if (estimateData.aiEstimate?.summary?.total) {
      return estimateData.aiEstimate.summary.total;
    }
    
    return 0;
  }
  
  /**
   * Obtiene el tiempo estimado de finalización
   */
  private getEstimateCompletionTime(estimateData: any): string {
    if (estimateData.rulesBasedEstimate?.estimatedDays) {
      return estimateData.rulesBasedEstimate.estimatedDays;
    }
    
    if (estimateData.aiEstimate?.summary?.timeEstimate) {
      return estimateData.aiEstimate.summary.timeEstimate;
    }
    
    return "No especificado";
  }
  
  /**
   * Formatea un valor monetario
   */
  private formatCurrency(value: number): string {
    return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}

// Exportar una instancia del servicio
export const estimatorService = new EstimatorService();
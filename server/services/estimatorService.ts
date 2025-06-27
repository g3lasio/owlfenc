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
   * Genera el HTML para un estimado usando la plantilla universal única
   */
  async generateEstimateHtml(estimateData: any): Promise<string> {
    try {
      const path = require('path');
      const fs = require('fs');

      console.log('Generando HTML del estimado usando plantilla universal...');

      // Load the universal template HTML
      let templateHtml = '';
      let templateFound = false;

      const projectRoot = process.cwd();
      const universalTemplatePath = path.join(projectRoot, 'client', 'src', 'templates', 'universal-estimate-template.html');

      try {
        if (fs.existsSync(universalTemplatePath)) {
          templateHtml = fs.readFileSync(universalTemplatePath, 'utf8');
          console.log('✅ Universal template loaded successfully');
          templateFound = true;
        } else {
          console.log(`❌ Universal template not found at: ${universalTemplatePath}`);
        }
      } catch (fsError) {
        console.log(`❌ Error accessing universal template: ${fsError.message}`);
      }

      if (!templateFound) {
        throw new Error('Universal estimate template not found. Please ensure the template file exists.');
      }

      // Create comprehensive replacement map for all placeholders
      const replacements: Record<string, string> = {
        // Company information
        '\\[Company Name\\]': estimateData.contractor?.companyName || estimateData.contractor?.name || 'Your Company',
        '\\[Company Address, City, State, ZIP\\]': this.formatFullAddress(estimateData.contractor?.address) || 'Company Address',
        '\\[COMPANY_EMAIL\\]': estimateData.contractor?.email || 'company@email.com',
        '\\[COMPANY_PHONE\\]': estimateData.contractor?.phone || '(555) 123-4567',
        '\\[COMPANY_LOGO_URL\\]': estimateData.contractor?.logo || '/owl-logo.png',

        // Client information
        '\\[Client Name\\]': estimateData.client?.name || 'Client Name',
        '\\[Client Email\\]': estimateData.client?.email || 'client@email.com',
        '\\[Client Phone\\]': estimateData.client?.phone || '(555) 987-6543',
        '\\[Client Address\\]': this.formatFullAddress(estimateData.client?.address) || 'Client Address',

        // Estimate metadata
        '\\[Estimate Date\\]': this.formatDate(estimateData.estimateDate) || new Date().toLocaleDateString(),
        '\\[Estimate Number\\]': estimateData.estimateNumber || estimateData.projectId || `EST-${Date.now()}`,
        '\\[Estimate Valid Until\\]': this.formatDate(estimateData.validUntil) || this.calculateValidUntil(),

        // Project details
        '\\[Scope of Work\\]': estimateData.scope || estimateData.project?.notes || 'Project scope to be defined',
        '\\[Estimated Completion Timeframe\\]': estimateData.timeline || this.getCompletionTime(estimateData) || 'Timeline to be determined',
        '\\[Work Process/Steps\\]': estimateData.process || 'Installation process to be defined',
        '\\[Included Services or Materials\\]': estimateData.includes || 'All materials and labor as specified',
        '\\[Excluded Services or Materials\\]': estimateData.excludes || 'Permits, site preparation (if not specified)',

        // Financial totals
        '\\[Grand Total\\]': this.formatCurrency(this.getEstimateTotal(estimateData)),

        // Footer information
        '\\[YEAR\\]': new Date().getFullYear().toString(),
        '\\[Your Company Name\\]': estimateData.contractor?.companyName || estimateData.contractor?.name || 'Your Company',
      };

      // Apply all replacements to the template
      let processedHtml = templateHtml;
      Object.entries(replacements).forEach(([placeholder, value]) => {
        processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
      });

      // Generate the estimate items table rows
      const tableRowsHtml = this.generateEstimateTableRows(estimateData);
      processedHtml = processedHtml.replace('\\[ESTIMATE_ITEMS_ROWS\\]', tableRowsHtml);

      return processedHtml;
    } catch (error) {
      console.error('Error generating estimate HTML:', error);
      // Return fallback HTML template when main template fails
      return this.generateFallbackEstimateHtml(estimateData);
    }
  }

  /**
   * Genera HTML de respaldo cuando falla la plantilla principal
   */
  private generateFallbackEstimateHtml(estimateData: any): string {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estimado Profesional</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #0079F2; padding-bottom: 20px; margin-bottom: 30px; }
        .company-info { margin-bottom: 20px; }
        .estimate-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .client-info, .estimate-meta { flex: 1; }
        .estimate-meta { text-align: right; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .items-table th { background-color: #f8f9fa; }
        .totals { text-align: right; margin-bottom: 30px; }
        .total-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .total-final { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; }
        .terms { margin-top: 30px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ESTIMADO PROFESIONAL</h1>
        <div class="company-info">
            <h2>${estimateData.contractor?.companyName || estimateData.contractor?.name || 'Su Empresa'}</h2>
            <p>${this.formatFullAddress(estimateData.contractor?.address) || 'Dirección de la empresa'}</p>
            <p>Teléfono: ${estimateData.contractor?.phone || '(555) 123-4567'} | Email: ${estimateData.contractor?.email || 'contacto@empresa.com'}</p>
        </div>
    </div>

    <div class="estimate-details">
        <div class="client-info">
            <h3>Cliente:</h3>
            <p><strong>${estimateData.client?.name || 'Nombre del Cliente'}</strong></p>
            <p>${estimateData.client?.email || 'email@cliente.com'}</p>
            <p>${estimateData.client?.phone || '(555) 987-6543'}</p>
            <p>${this.formatFullAddress(estimateData.client?.address) || 'Dirección del cliente'}</p>
        </div>
        <div class="estimate-meta">
            <p><strong>Número de Estimado:</strong> ${estimateData.estimateNumber || `EST-${Date.now()}`}</p>
            <p><strong>Fecha:</strong> ${this.formatDate(estimateData.estimateDate) || new Date().toLocaleDateString()}</p>
            <p><strong>Válido hasta:</strong> ${this.formatDate(estimateData.validUntil) || this.calculateValidUntil()}</p>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${this.generateEstimateTableRows(estimateData)}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(this.getSubtotal(estimateData))}</span>
        </div>
        <div class="total-line">
            <span>Impuestos:</span>
            <span>${this.formatCurrency(this.getTaxAmount(estimateData))}</span>
        </div>
        <div class="total-line total-final">
            <span>TOTAL:</span>
            <span>${this.formatCurrency(this.getEstimateTotal(estimateData))}</span>
        </div>
    </div>

    <div class="terms">
        <h4>Términos y Condiciones:</h4>
        <p>• Este estimado es válido por 30 días desde la fecha de emisión.</p>
        <p>• Los precios están sujetos a cambios sin previo aviso.</p>
        <p>• Se requiere un depósito del 50% para iniciar el trabajo.</p>
        <p>• El trabajo será completado según las especificaciones acordadas.</p>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Formatea una dirección completa
   */
  private formatFullAddress(address: any): string {
    if (typeof address === 'string') {
      return address;
    }
    if (typeof address === 'object' && address !== null) {
      const parts = [
        address.street || address.address,
        address.city,
        address.state,
        address.zipCode || address.zip
      ].filter(Boolean);
      return parts.join(', ');
    }
    return '';
  }

  /**
   * Formatea una fecha
   */
  private formatDate(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return '';
  }

  /**
   * Calcula fecha de validez del estimado (30 días)
   */
  private calculateValidUntil(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString();
  }

  /**
   * Formatea cantidad como moneda
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  /**
   * Genera las filas de la tabla de items
   */
  private generateEstimateTableRows(estimateData: any): string {
    const items = estimateData.items || [];
    if (items.length === 0) {
      return '<tr><td colspan="4">No hay items especificados</td></tr>';
    }

    return items.map((item: any) => `
      <tr>
        <td>${item.name || item.description || 'Item'}</td>
        <td>${item.quantity || 1}</td>
        <td>${this.formatCurrency(item.price || item.unitPrice || 0)}</td>
        <td>${this.formatCurrency(item.total || item.totalPrice || (item.quantity || 1) * (item.price || item.unitPrice || 0))}</td>
      </tr>
    `).join('');
  }

  /**
   * Obtiene el subtotal del estimado
   */
  private getSubtotal(estimateData: any): number {
    if (estimateData.subtotal) return estimateData.subtotal;
    
    const items = estimateData.items || [];
    return items.reduce((sum: number, item: any) => {
      return sum + (item.total || item.totalPrice || (item.quantity || 1) * (item.price || item.unitPrice || 0));
    }, 0);
  }

  /**
   * Obtiene el monto de impuestos
   */
  private getTaxAmount(estimateData: any): number {
    if (estimateData.tax || estimateData.taxAmount) {
      return estimateData.tax || estimateData.taxAmount;
    }
    
    const subtotal = this.getSubtotal(estimateData);
    const taxRate = estimateData.taxRate || 0.0875; // 8.75% por defecto
    return subtotal * taxRate;
  }

  /**
   * Obtiene el total del estimado
   */
  private getEstimateTotal(estimateData: any): number {
    if (estimateData.total) return estimateData.total;
    
    const subtotal = this.getSubtotal(estimateData);
    const tax = this.getTaxAmount(estimateData);
    return subtotal + tax;
  }

  /**
   * Obtiene tiempo de completación estimado
   */
  private getCompletionTime(estimateData: any): string {
    if (estimateData.timeline) return estimateData.timeline;
    if (estimateData.estimatedDays) return `${estimateData.estimatedDays} días`;
    
    // Estimación básica basada en el tipo de proyecto
    const projectType = estimateData.projectType || estimateData.project?.type || '';
    if (projectType.toLowerCase().includes('fence')) {
      return '2-5 días laborales';
    }
    if (projectType.toLowerCase().includes('roof')) {
      return '3-7 días laborales';
    }
    return '1-3 días laborales';
  }

  /**
   * Genera el HTML para un estimado usando plantilla simplificada
   */
  async generateEstimateHtml(estimateData: any): Promise<string> {
    console.log('Generando HTML del estimado...');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estimado Profesional</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #0079F2; padding-bottom: 20px; margin-bottom: 30px; }
        .company-info { margin-bottom: 20px; }
        .estimate-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .client-info, .estimate-meta { flex: 1; }
        .estimate-meta { text-align: right; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .items-table th { background-color: #f8f9fa; }
        .totals { text-align: right; margin-bottom: 30px; }
        .total-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .total-final { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; }
        .terms { margin-top: 30px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ESTIMADO PROFESIONAL</h1>
        <div class="company-info">
            <h2>${estimateData.contractor?.companyName || estimateData.contractor?.name || 'Su Empresa'}</h2>
            <p>${this.formatFullAddress(estimateData.contractor?.address) || 'Dirección de la empresa'}</p>
            <p>Teléfono: ${estimateData.contractor?.phone || '(555) 123-4567'} | Email: ${estimateData.contractor?.email || 'contacto@empresa.com'}</p>
        </div>
    </div>

    <div class="estimate-details">
        <div class="client-info">
            <h3>Cliente:</h3>
            <p><strong>${estimateData.client?.name || 'Nombre del Cliente'}</strong></p>
            <p>${estimateData.client?.email || 'email@cliente.com'}</p>
            <p>${estimateData.client?.phone || '(555) 987-6543'}</p>
            <p>${this.formatFullAddress(estimateData.client?.address) || 'Dirección del cliente'}</p>
        </div>
        <div class="estimate-meta">
            <p><strong>Número de Estimado:</strong> ${estimateData.estimateNumber || `EST-${Date.now()}`}</p>
            <p><strong>Fecha:</strong> ${this.formatDate(estimateData.estimateDate) || new Date().toLocaleDateString()}</p>
            <p><strong>Válido hasta:</strong> ${this.formatDate(estimateData.validUntil) || this.calculateValidUntil()}</p>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${this.generateEstimateTableRows(estimateData)}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(this.getSubtotal(estimateData))}</span>
        </div>
        <div class="total-line">
            <span>Impuestos:</span>
            <span>${this.formatCurrency(this.getTaxAmount(estimateData))}</span>
        </div>
        <div class="total-line total-final">
            <span>TOTAL:</span>
            <span>${this.formatCurrency(this.getEstimateTotal(estimateData))}</span>
        </div>
    </div>

    <div class="terms">
        <h4>Términos y Condiciones:</h4>
        <p>• Este estimado es válido por 30 días desde la fecha de emisión.</p>
        <p>• Los precios están sujetos a cambios sin previo aviso.</p>
        <p>• Se requiere un depósito del 50% para iniciar el trabajo.</p>
        <p>• El trabajo será completado según las especificaciones acordadas.</p>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Formatea una dirección completa
   */
  private formatFullAddress(address: any): string {
    if (typeof address === 'string') {
      return address;
    }
    if (typeof address === 'object' && address !== null) {
      const parts = [
        address.street || address.address,
        address.city,
        address.state,
        address.zipCode || address.zip
      ].filter(Boolean);
      return parts.join(', ');
    }
    return '';
  }

  /**
   * Formatea una fecha
   */
  private formatDate(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return '';
  }

  /**
   * Calcula fecha de validez del estimado (30 días)
   */
  private calculateValidUntil(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString();
  }

  /**
   * Formatea cantidad como moneda
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  /**
   * Genera las filas de la tabla de items
   */
  private generateEstimateTableRows(estimateData: any): string {
    const items = estimateData.items || [];
    if (items.length === 0) {
      return '<tr><td colspan="4">No hay items especificados</td></tr>';
    }

    return items.map((item: any) => `
      <tr>
        <td>${item.name || item.description || 'Item'}</td>
        <td>${item.quantity || 1}</td>
        <td>${this.formatCurrency(item.price || item.unitPrice || 0)}</td>
        <td>${this.formatCurrency(item.total || item.totalPrice || (item.quantity || 1) * (item.price || item.unitPrice || 0))}</td>
      </tr>
    `).join('');
  }

  /**
   * Obtiene el subtotal del estimado
   */
  private getSubtotal(estimateData: any): number {
    if (estimateData.subtotal) return estimateData.subtotal;
    
    const items = estimateData.items || [];
    return items.reduce((sum: number, item: any) => {
      return sum + (item.total || item.totalPrice || (item.quantity || 1) * (item.price || item.unitPrice || 0));
    }, 0);
  }

  /**
   * Obtiene el monto de impuestos
   */
  private getTaxAmount(estimateData: any): number {
    if (estimateData.tax || estimateData.taxAmount) {
      return estimateData.tax || estimateData.taxAmount;
    }
    
    const subtotal = this.getSubtotal(estimateData);
    const taxRate = estimateData.taxRate || 0.0875; // 8.75% por defecto
    return subtotal * taxRate;
  }

  /**
   * Obtiene el total del estimado
   */
  private getEstimateTotal(estimateData: any): number {
    if (estimateData.total) return estimateData.total;
    
    const subtotal = this.getSubtotal(estimateData);
    const tax = this.getTaxAmount(estimateData);
    return subtotal + tax;
  }

  /**
   * Obtiene tiempo de completación estimado
   */
  private getCompletionTime(estimateData: any): string {
    if (estimateData.timeline) return estimateData.timeline;
    if (estimateData.estimatedDays) return `${estimateData.estimatedDays} días`;
    
    // Estimación básica basada en el tipo de proyecto
    const projectType = estimateData.projectType || estimateData.project?.type || '';
    if (projectType.toLowerCase().includes('fence')) {
      return '2-5 días laborales';
    }
    if (projectType.toLowerCase().includes('roof')) {
      return '3-7 días laborales';
    }
    return '1-3 días laborales';
  }
}
    } catch (error) {
      console.error('Error generating estimate HTML:', error);
      throw error;
    }
  }

  /**
   * Helper method to format addresses
   */
  private formatFullAddress(address: any): string {
    if (!address) return '';

    if (typeof address === 'string') return address;

    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);

    return parts.join(', ');
  }

  /**
   * Helper method to format dates
   */
  private formatDate(dateValue: any): string {
    if (!dateValue) return '';

    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  }

  /**
   * Helper method to calculate valid until date
   */
  private calculateValidUntil(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days from now
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Helper method to get completion time
   */
  private getCompletionTime(estimateData: any): string {
    if (estimateData.rulesBasedEstimate?.estimatedDays) {
      const days = estimateData.rulesBasedEstimate.estimatedDays;
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    }
    return '';
  }

  /**
   * Helper method to get estimate total
   */
  private getEstimateTotal(estimateData: any): number {
    if (!estimateData.rulesBasedEstimate) return 0;

    const materialTotal = estimateData.rulesBasedEstimate.materialTotal || 0;
    const laborTotal = estimateData.rulesBasedEstimate.labor?.totalCost || 0;
    const additionalTotal = estimateData.rulesBasedEstimate.additionalTotal || 0;
    const subtotal = materialTotal + laborTotal + additionalTotal;
    const taxAmount = subtotal * 0.0875; // 8.75% tax rate

    return subtotal + taxAmount;
  }

  /**
   * Helper method to format currency
   */
  private formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Generate estimate table rows HTML
   */
  private generateEstimateTableRows(estimateData: any): string {
    let html = '';

    // Materials section
    if (estimateData.rulesBasedEstimate?.materials) {
      const materials = estimateData.rulesBasedEstimate.materials;

      Object.entries(materials).forEach(([key, value]: [string, any]) => {
        if (key === 'roofing') {
          html += `
          `;
        } else if (key === 'posts') {
          html += `
          `;
        } else if (key === 'rails') {
          html += `
          `;
        } else if (key === 'pickets' || key === 'panels' || key === 'mesh') {
          const itemName = key === 'pickets' ? 'Pickets' : key === 'panels' ? 'Panels' : 'Mesh';
          const description = key === 'pickets' ? 'Vertical fence pickets' : 
                            key === 'panels' ? 'Fence panels' : 'Wire mesh material';
          html += `
          `;
        } else if (key === 'concrete') {
          html += `
          `;
        } else if (key === 'underlayment' || key === 'flashing' || key === 'hardware') {
          const itemName = key === 'underlayment' ? 'Underlayment' : 
                          key === 'flashing' ? 'Flashing' : 'Hardware';
          const description = key === 'underlayment' ? 'Protective underlayment material' :
                            key === 'flashing' ? 'Weather protection flashing' : 'Installation hardware';
          html += `
          `;
        }
      });
    }

    // Labor section
    if (estimateData.rulesBasedEstimate?.labor) {
      const labor = estimateData.rulesBasedEstimate.labor;
      html += `
      `;
    }

    // Additional costs section
    if (estimateData.rulesBasedEstimate?.additionalCosts) {
      const additionalCosts = estimateData.rulesBasedEstimate.additionalCosts;

      Object.entries(additionalCosts).forEach(([key, value]: [string, any]) => {
        let itemName = key;
        let description = 'Additional service';

        if (key === 'demolition') {
          itemName = 'Demolition/Removal';
          description = 'Removal of existing structures';
        } else if (key === 'painting') {
          itemName = 'Painting/Finishing';
          description = 'Paint and finishing work';
        } else if (key === 'lattice') {
          itemName = 'Lattice Work';
          description = 'Decorative lattice installation';
        } else if (key === 'gates') {
          itemName = 'Gates';
          description = 'Gate installation and hardware';
        } else if (key === 'roofRemoval') {
          itemName = 'Roof Removal';
          description = 'Existing roof removal';
        } else if (key === 'ventilation') {
          itemName = 'Ventilation';
          description = 'Ventilation system installation';
        } else if (key === 'gutters') {
          itemName = 'Gutters';
          description = 'Gutter system installation';
        }

        html += `
        `;
      });
    }

    return html;
  }
}

// Exportar una instancia del servicio
export const estimatorService = new EstimatorService();

// Función procesadora de mensajes para el chat (requerida por chatService)
export async function estimateMessageProcessor(
  userId: number,
  sessionId: string,
  message: string,
  history: any[],
  req: any
) {
  try {
    console.log(`Procesando mensaje de estimado para usuario ${userId}`);

    // Procesar el mensaje y extraer información relevante para el estimado
    // Por ahora, devolver una respuesta básica
    return {
      text: `He recibido tu solicitud de estimado: "${message}". Te ayudo a crear un estimado detallado. ¿Podrías proporcionarme más detalles sobre el tipo de proyecto?`,
      role: 'assistant',
      sessionId,
      userId
    };
  } catch (error) {
    console.error('Error en estimateMessageProcessor:', error);
    return {
      text: 'Disculpa, hubo un error procesando tu solicitud de estimado. ¿Podrías intentar de nuevo?',
      role: 'assistant',
      sessionId,
      userId
    };
  }
}
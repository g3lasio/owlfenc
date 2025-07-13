/**
 * Advanced Labor Pricing Service
 * 
 * Sistema avanzado que integra análisis de ubicación geográfica precisa
 * con costos de labor específicos por tipo de trabajo y región.
 */

import { enhancedLocationPricingService } from './enhancedLocationPricingService';

interface LaborTask {
  type: 'roofing' | 'concrete' | 'landscaping' | 'framing' | 'electrical' | 'plumbing' | 'drywall' | 'painting' | 'flooring' | 'general';
  operation: 'install' | 'remove' | 'repair' | 'prepare' | 'finish' | 'cleanup';
  description: string;
  baseRate: number;
  unit: string;
  skillLevel: 'helper' | 'skilled' | 'specialist' | 'foreman';
  complexity: 'low' | 'medium' | 'high';
  seasonality: number; // 0-1 factor
  regulatoryFactor: number; // 0-1 factor
}

interface PreciseLaborCost {
  taskId: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  baseRate: number;
  adjustedRate: number;
  totalCost: number;
  factors: {
    location: number;
    seasonal: number;
    complexity: number;
    regulation: number;
    market: number;
  };
  confidence: number;
  lastUpdated: Date;
}

export class AdvancedLaborPricingService {
  
  /**
   * Calcula costos de labor con precisión geográfica avanzada
   */
  async calculatePreciseLaborCosts(
    projectDescription: string,
    location: string,
    laborTasks: LaborTask[]
  ): Promise<PreciseLaborCost[]> {
    try {
      console.log('🎯 Advanced Labor Pricing: Calculating precise costs for', location);
      
      // 1. Analizar ubicación con precisión avanzada
      const locationAnalysis = await enhancedLocationPricingService.analyzePreciseLocation(location);
      
      // 2. Procesar cada tarea de labor
      const preciseResults = await Promise.all(
        laborTasks.map(task => this.processSingleLaborTask(task, locationAnalysis, projectDescription))
      );
      
      console.log('✅ Advanced Labor Pricing: Processed', preciseResults.length, 'labor tasks');
      
      return preciseResults;
      
    } catch (error) {
      console.error('❌ Advanced Labor Pricing Error:', error);
      throw new Error(`Advanced labor pricing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Procesa una tarea individual de labor
   */
  private async processSingleLaborTask(
    task: LaborTask,
    locationAnalysis: any,
    projectDescription: string
  ): Promise<PreciseLaborCost> {
    
    // 1. Obtener rate base específico por tipo de trabajo
    const typeSpecificRate = this.getTypeSpecificRate(task.type, task.operation, locationAnalysis.location);
    
    // 2. Aplicar ajustes por skill level
    const skillAdjustedRate = this.applySkillLevelAdjustment(typeSpecificRate, task.skillLevel);
    
    // 3. Aplicar factores de ubicación
    const locationAdjustedRate = this.applyLocationFactors(skillAdjustedRate, locationAnalysis);
    
    // 4. Aplicar factores de proyecto específicos
    const projectAdjustedRate = this.applyProjectFactors(locationAdjustedRate, task, projectDescription);
    
    // 5. Calcular factores individuales para transparencia
    const factors = this.calculateIndividualFactors(task, locationAnalysis);
    
    return {
      taskId: `${task.type}_${task.operation}_${Date.now()}`,
      name: this.generateTaskName(task),
      description: task.description,
      quantity: 1, // Se ajustará según el proyecto
      unit: task.unit,
      baseRate: task.baseRate,
      adjustedRate: projectAdjustedRate,
      totalCost: projectAdjustedRate, // Se multiplicará por cantidad después
      factors,
      confidence: this.calculateTaskConfidence(task, locationAnalysis),
      lastUpdated: new Date()
    };
  }
  
  /**
   * Obtiene rates específicos por tipo de trabajo y ubicación
   */
  private getTypeSpecificRate(type: string, operation: string, location: any): number {
    const baseRates: Record<string, Record<string, number>> = {
      roofing: {
        install: 8.50,  // Por sq ft
        remove: 3.75,   // Por sq ft
        repair: 45.00,  // Por hora
        prepare: 35.00, // Por hora
        finish: 40.00,  // Por hora
        cleanup: 25.00  // Por hora
      },
      concrete: {
        install: 12.00, // Por sq ft
        remove: 8.50,   // Por sq ft
        repair: 55.00,  // Por hora
        prepare: 45.00, // Por hora
        finish: 50.00,  // Por hora
        cleanup: 30.00  // Por hora
      },
      landscaping: {
        install: 4.50,  // Por sq ft
        remove: 3.00,   // Por sq ft
        repair: 35.00,  // Por hora
        prepare: 30.00, // Por hora
        finish: 38.00,  // Por hora
        cleanup: 25.00  // Por hora
      },
      framing: {
        install: 6.50,  // Por sq ft
        remove: 4.25,   // Por sq ft
        repair: 48.00,  // Por hora
        prepare: 40.00, // Por hora
        finish: 45.00,  // Por hora
        cleanup: 28.00  // Por hora
      },
      electrical: {
        install: 85.00, // Por hora (especialista)
        remove: 65.00,  // Por hora
        repair: 95.00,  // Por hora
        prepare: 75.00, // Por hora
        finish: 80.00,  // Por hora
        cleanup: 45.00  // Por hora
      },
      plumbing: {
        install: 80.00, // Por hora (especialista)
        remove: 60.00,  // Por hora
        repair: 90.00,  // Por hora
        prepare: 70.00, // Por hora
        finish: 75.00,  // Por hora
        cleanup: 40.00  // Por hora
      },
      general: {
        install: 35.00, // Por hora
        remove: 25.00,  // Por hora
        repair: 40.00,  // Por hora
        prepare: 30.00, // Por hora
        finish: 35.00,  // Por hora
        cleanup: 20.00  // Por hora
      }
    };
    
    const typeRates = baseRates[type] || baseRates.general;
    const baseRate = typeRates[operation] || typeRates.install;
    
    // Ajustar por estado/región
    const stateMultipliers: Record<string, number> = {
      'california': 1.45,
      'new york': 1.35,
      'hawaii': 1.30,
      'massachusetts': 1.25,
      'washington': 1.20,
      'connecticut': 1.20,
      'new jersey': 1.18,
      'maryland': 1.15,
      'alaska': 1.40,
      'oregon': 1.10,
      'colorado': 1.08,
      'illinois': 1.08,
      'texas': 1.00,
      'florida': 1.05,
      'georgia': 0.95,
      'arizona': 0.98,
      'north carolina': 0.92,
      'tennessee': 0.90,
      'kentucky': 0.88,
      'alabama': 0.85,
      'mississippi': 0.82,
      'west virginia': 0.80,
      'default': 1.00
    };
    
    const stateKey = location.state?.toLowerCase() || 'default';
    const stateMultiplier = stateMultipliers[stateKey] || stateMultipliers.default;
    
    return baseRate * stateMultiplier;
  }
  
  /**
   * Aplica ajustes por skill level
   */
  private applySkillLevelAdjustment(baseRate: number, skillLevel: string): number {
    const skillMultipliers: Record<string, number> = {
      helper: 0.75,
      skilled: 1.0,
      specialist: 1.35,
      foreman: 1.55
    };
    
    return baseRate * (skillMultipliers[skillLevel] || 1.0);
  }
  
  /**
   * Aplica factores de ubicación específicos
   */
  private applyLocationFactors(baseRate: number, locationAnalysis: any): number {
    let adjustedRate = baseRate;
    
    // Aplicar multiplicador general de ubicación
    adjustedRate *= locationAnalysis.overallMultiplier;
    
    // Ajustes específicos por factores de mercado
    adjustedRate *= (1 + locationAnalysis.marketFactors.seasonalDemand * 0.1);
    adjustedRate *= (1 - locationAnalysis.marketFactors.competitionLevel * 0.08);
    adjustedRate *= (1 + locationAnalysis.marketFactors.permitComplexity * 0.05);
    
    return Math.round(adjustedRate * 100) / 100;
  }
  
  /**
   * Aplica factores específicos del proyecto
   */
  private applyProjectFactors(
    baseRate: number,
    task: LaborTask,
    projectDescription: string
  ): number {
    let adjustedRate = baseRate;
    
    // Ajuste por complejidad
    const complexityMultipliers = {
      low: 1.0,
      medium: 1.15,
      high: 1.35
    };
    
    adjustedRate *= complexityMultipliers[task.complexity];
    
    // Ajuste por factores estacionales
    adjustedRate *= (1 + task.seasonality * 0.12);
    
    // Ajuste por factores regulatorios
    adjustedRate *= (1 + task.regulatoryFactor * 0.08);
    
    // Ajustes por características del proyecto
    const projectLower = projectDescription.toLowerCase();
    
    // Proyectos urgentes
    if (projectLower.includes('urgent') || projectLower.includes('emergency')) {
      adjustedRate *= 1.25;
    }
    
    // Proyectos de alta calidad
    if (projectLower.includes('premium') || projectLower.includes('high-end')) {
      adjustedRate *= 1.15;
    }
    
    // Proyectos grandes (economías de escala)
    if (projectLower.includes('1200') || projectLower.includes('large')) {
      adjustedRate *= 0.95; // Pequeño descuento por volumen
    }
    
    return Math.round(adjustedRate * 100) / 100;
  }
  
  /**
   * Calcula factores individuales para transparencia
   */
  private calculateIndividualFactors(task: LaborTask, locationAnalysis: any): any {
    return {
      location: locationAnalysis.overallMultiplier,
      seasonal: 1 + task.seasonality * 0.12,
      complexity: task.complexity === 'low' ? 1.0 : task.complexity === 'medium' ? 1.15 : 1.35,
      regulation: 1 + task.regulatoryFactor * 0.08,
      market: 1 - locationAnalysis.marketFactors.competitionLevel * 0.08
    };
  }
  
  /**
   * Genera nombre descriptivo para la tarea
   */
  private generateTaskName(task: LaborTask): string {
    const typeNames: Record<string, string> = {
      roofing: 'Roofing',
      concrete: 'Concrete',
      landscaping: 'Landscaping',
      framing: 'Framing',
      electrical: 'Electrical',
      plumbing: 'Plumbing',
      drywall: 'Drywall',
      painting: 'Painting',
      flooring: 'Flooring',
      general: 'General'
    };
    
    const operationNames: Record<string, string> = {
      install: 'Installation',
      remove: 'Removal',
      repair: 'Repair',
      prepare: 'Preparation',
      finish: 'Finishing',
      cleanup: 'Cleanup'
    };
    
    const typeName = typeNames[task.type] || 'General';
    const operationName = operationNames[task.operation] || 'Work';
    
    return `${typeName} ${operationName}`;
  }
  
  /**
   * Calcula confianza de la tarea
   */
  private calculateTaskConfidence(task: LaborTask, locationAnalysis: any): number {
    let confidence = 0.8; // Base confidence
    
    // Aumentar confianza para tareas más comunes
    if (['roofing', 'concrete', 'framing'].includes(task.type)) {
      confidence += 0.1;
    }
    
    // Reducir confianza para tareas más especializadas
    if (['electrical', 'plumbing'].includes(task.type)) {
      confidence -= 0.05;
    }
    
    // Usar confianza de análisis de ubicación
    confidence = Math.min(confidence, locationAnalysis.confidence);
    
    return Math.max(0.5, Math.min(1.0, confidence));
  }
  
  /**
   * Obtiene tareas de labor específicas por tipo de proyecto
   */
  static getProjectLaborTasks(projectDescription: string): LaborTask[] {
    const description = projectDescription.toLowerCase();
    const tasks: LaborTask[] = [];
    
    // Roofing projects
    if (description.includes('roof') || description.includes('shingle')) {
      tasks.push(
        {
          type: 'roofing',
          operation: 'remove',
          description: 'Remove existing roofing material',
          baseRate: 3.75,
          unit: 'sq ft',
          skillLevel: 'skilled',
          complexity: 'medium',
          seasonality: 0.3,
          regulatoryFactor: 0.2
        },
        {
          type: 'roofing',
          operation: 'install',
          description: 'Install new roofing system',
          baseRate: 8.50,
          unit: 'sq ft',
          skillLevel: 'skilled',
          complexity: 'high',
          seasonality: 0.4,
          regulatoryFactor: 0.3
        }
      );
    }
    
    // Concrete projects
    if (description.includes('concrete') || description.includes('foundation')) {
      tasks.push(
        {
          type: 'concrete',
          operation: 'prepare',
          description: 'Site preparation and excavation',
          baseRate: 45.00,
          unit: 'hour',
          skillLevel: 'skilled',
          complexity: 'medium',
          seasonality: 0.2,
          regulatoryFactor: 0.4
        },
        {
          type: 'concrete',
          operation: 'install',
          description: 'Pour and finish concrete',
          baseRate: 12.00,
          unit: 'sq ft',
          skillLevel: 'specialist',
          complexity: 'high',
          seasonality: 0.3,
          regulatoryFactor: 0.5
        }
      );
    }
    
    // Landscaping projects
    if (description.includes('landscape') || description.includes('yard')) {
      tasks.push(
        {
          type: 'landscaping',
          operation: 'prepare',
          description: 'Site preparation and grading',
          baseRate: 30.00,
          unit: 'hour',
          skillLevel: 'skilled',
          complexity: 'low',
          seasonality: 0.5,
          regulatoryFactor: 0.1
        },
        {
          type: 'landscaping',
          operation: 'install',
          description: 'Install landscaping features',
          baseRate: 4.50,
          unit: 'sq ft',
          skillLevel: 'skilled',
          complexity: 'medium',
          seasonality: 0.6,
          regulatoryFactor: 0.1
        }
      );
    }
    
    // Framing projects
    if (description.includes('framing') || description.includes('frame')) {
      tasks.push(
        {
          type: 'framing',
          operation: 'install',
          description: 'Install structural framing',
          baseRate: 6.50,
          unit: 'sq ft',
          skillLevel: 'skilled',
          complexity: 'high',
          seasonality: 0.2,
          regulatoryFactor: 0.6
        }
      );
    }
    
    // Default general tasks if no specific type found
    if (tasks.length === 0) {
      tasks.push(
        {
          type: 'general',
          operation: 'install',
          description: 'General construction work',
          baseRate: 35.00,
          unit: 'hour',
          skillLevel: 'skilled',
          complexity: 'medium',
          seasonality: 0.2,
          regulatoryFactor: 0.3
        }
      );
    }
    
    return tasks;
  }
}

export const advancedLaborPricingService = new AdvancedLaborPricingService();
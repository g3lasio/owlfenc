/**
 * INTENTION ENGINE - ANÁLISIS INTELIGENTE DE INTENCIONES
 * 
 * Motor de análisis que interpreta el lenguaje natural del usuario
 * y determina qué acciones debe ejecutar el agente autónomamente.
 * 
 * Responsabilidades:
 * - Análisis de intención primaria del usuario
 * - Detección de complejidad de la tarea
 * - Mapeo a endpoints necesarios
 * - Generación de planes de ejecución
 */

export interface UserIntention {
  primary: 'estimate' | 'contract' | 'permit' | 'property' | 'payment' | 'analytics' | 'client' | 'material' | 'general';
  secondary?: string[];
  complexity: 'simple' | 'complex' | 'multi-step';
  confidence: number; // 0-1
  requiredEndpoints: string[];
  estimatedSteps: number;
  parameters: Record<string, any>;
  context: IntentionContext;
}

export interface IntentionContext {
  conversationHistory: any[];
  userProfile?: any;
  currentProject?: any;
  recentActions: string[];
  availableData: Record<string, any>;
}

export interface TaskExecutionPlan {
  steps: TaskStep[];
  estimatedDuration: number;
  requiredPermissions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  canRollback: boolean;
}

export interface TaskStep {
  id: string;
  name: string;
  description: string;
  endpoint?: string;
  parameters: Record<string, any>;
  dependsOn?: string[];
  estimatedDuration: number;
  required: boolean;
}

export class IntentionEngine {
  private config: any;
  private intentionPatterns: Map<string, RegExp[]> = new Map();
  private contextWords: Map<string, string[]> = new Map();

  constructor(config: any) {
    this.config = config;
    this.initializePatterns();
  }

  /**
   * Analizar input del usuario y determinar intención
   */
  async analyzeUserInput(input: string, conversationHistory: any[]): Promise<UserIntention> {
    const normalizedInput = this.normalizeInput(input);
    
    // 1. Detectar intención primaria
    const primary = this.detectPrimaryIntention(normalizedInput);
    
    // 2. Detectar intenciones secundarias
    const secondary = this.detectSecondaryIntentions(normalizedInput);
    
    // 3. Calcular complejidad
    const complexity = this.calculateComplexity(normalizedInput, conversationHistory);
    
    // 4. Calcular confianza
    const confidence = this.calculateConfidence(primary, normalizedInput);
    
    // 5. Mapear endpoints necesarios
    const requiredEndpoints = this.mapEndpoints(primary, secondary, normalizedInput);
    
    // 6. Estimar pasos necesarios
    const estimatedSteps = this.estimateSteps(primary, complexity, requiredEndpoints);
    
    // 7. Extraer parámetros
    const parameters = this.extractParameters(normalizedInput, primary);
    
    // 8. Construir contexto
    const context = this.buildIntentionContext(conversationHistory, parameters);

    return {
      primary,
      secondary,
      complexity,
      confidence,
      requiredEndpoints,
      estimatedSteps,
      parameters,
      context
    };
  }

  /**
   * Generar plan de ejecución basado en intención
   */
  async generateExecutionPlan(intention: UserIntention): Promise<TaskExecutionPlan> {
    const steps: TaskStep[] = [];
    let totalDuration = 0;
    const requiredPermissions: string[] = [];

    // Generar pasos basados en la intención primaria
    switch (intention.primary) {
      case 'estimate':
        steps.push(...this.generateEstimateSteps(intention));
        requiredPermissions.push('basic_estimates', 'ai_estimates');
        break;
        
      case 'contract':
        steps.push(...this.generateContractSteps(intention));
        requiredPermissions.push('contracts', 'dual_signature');
        break;
        
      case 'permit':
        steps.push(...this.generatePermitSteps(intention));
        requiredPermissions.push('permit_advisor', 'property_verification');
        break;
        
      case 'property':
        steps.push(...this.generatePropertySteps(intention));
        requiredPermissions.push('property_verification');
        break;
        
      case 'payment':
        steps.push(...this.generatePaymentSteps(intention));
        requiredPermissions.push('payment_tracking');
        break;
        
      case 'analytics':
        steps.push(...this.generateAnalyticsSteps(intention));
        requiredPermissions.push('analytics');
        break;
        
      default:
        steps.push(...this.generateGeneralSteps(intention));
    }

    // Calcular duración total
    totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

    // Determinar nivel de riesgo
    const riskLevel = this.calculateRiskLevel(intention, steps);

    return {
      steps,
      estimatedDuration: totalDuration,
      requiredPermissions,
      riskLevel,
      canRollback: riskLevel !== 'high'
    };
  }

  /**
   * Inicializar patrones de reconocimiento
   */
  private initializePatterns(): void {
    this.intentionPatterns = new Map([
      ['estimate', [
        /estimado|estimate|presupuesto|cotizaci[óo]n|precio/i,
        /cu[áa]nto cuesta|precio de|costo de/i,
        /(generar|crear|hacer)\s+(estimado|presupuesto)/i
      ]],
      ['contract', [
        /contrato|contract|acuerdo|convenio/i,
        /(generar|crear|hacer)\s+contrato/i,
        /firma|firmar|signature/i,
        /legal|cl[áa]usulas/i
      ]],
      ['permit', [
        /permiso|permit|licencia/i,
        /municipio|ciudad|gobierno/i,
        /regulaci[óo]n|normativa/i
      ]],
      ['property', [
        /propiedad|property|ownership/i,
        /verificar|verify|comprobar/i,
        /due[ñn]o|propietario|owner/i
      ]],
      ['payment', [
        /pago|payment|cobro/i,
        /seguimiento|tracking|monitor/i,
        /factura|invoice|bill/i
      ]],
      ['analytics', [
        /an[áa]lisis|analytics|reporte|report/i,
        /estad[íi]stica|stats|metrics/i,
        /dashboard|panel/i
      ]]
    ]);

    this.contextWords = new Map([
      ['urgency', ['urgente', 'r[áa]pido', 'pronto', 'asap', 'ya']],
      ['size', ['grande', 'peque[ñn]o', 'mediano', 'largo', 'corto']],
      ['material', ['madera', 'vinilo', 'metal', 'concreto', 'alambre']],
      ['location', ['casa', 'comercial', 'residencial', 'industrial']]
    ]);
  }

  /**
   * Detectar intención primaria
   */
  private detectPrimaryIntention(input: string): UserIntention['primary'] {
    let maxScore = 0;
    let primaryIntention: UserIntention['primary'] = 'general';

    for (const [intention, patterns] of Array.from(this.intentionPatterns.entries())) {
      const score = patterns.reduce((sum: number, pattern: RegExp) => {
        return sum + (pattern.test(input) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        primaryIntention = intention as UserIntention['primary'];
      }
    }

    return primaryIntention;
  }

  /**
   * Detectar intenciones secundarias
   */
  private detectSecondaryIntentions(input: string): string[] {
    const secondary: string[] = [];

    for (const [intention, patterns] of Array.from(this.intentionPatterns.entries())) {
      const hasMatch = patterns.some((pattern: RegExp) => pattern.test(input));
      if (hasMatch) {
        secondary.push(intention);
      }
    }

    return secondary;
  }

  /**
   * Calcular complejidad de la tarea
   */
  private calculateComplexity(input: string, history: any[]): UserIntention['complexity'] {
    let complexityScore = 0;

    // Factores que aumentan complejidad
    if (input.length > 100) complexityScore += 1;
    if (/y|and|adem[áa]s|tambi[ée]n/.test(input)) complexityScore += 1;
    if (history.length > 5) complexityScore += 1;
    if (/\d+/.test(input)) complexityScore += 1; // Tiene números específicos
    if (/email|env[íi]ar|send/.test(input)) complexityScore += 1;

    if (complexityScore >= 4) return 'multi-step';
    if (complexityScore >= 2) return 'complex';
    return 'simple';
  }

  /**
   * Calcular confianza en la detección
   */
  private calculateConfidence(primary: string, input: string): number {
    if (primary === 'general') return 0.3;

    const patterns = this.intentionPatterns.get(primary) || [];
    const matches = patterns.filter(pattern => pattern.test(input)).length;
    
    return Math.min(0.9, 0.4 + (matches * 0.2));
  }

  /**
   * Mapear endpoints necesarios
   */
  private mapEndpoints(primary: string, secondary: string[], input: string): string[] {
    const endpointMap: Record<string, string[]> = {
      estimate: ['/api/estimates', '/api/mervin/estimate', '/api/materials'],
      contract: ['/api/legal-defense', '/api/dual-signature', '/api/estimates'],
      permit: ['/api/permit-advisor', '/api/property-verification'],
      property: ['/api/property-verification', '/api/clients'],
      payment: ['/api/payment-tracking', '/api/quickbooks'],
      analytics: ['/api/analytics', '/api/usage'],
      client: ['/api/clients', '/api/contact'],
      material: ['/api/materials', '/api/ai-import']
    };

    const endpoints = new Set(endpointMap[primary] || []);

    // Agregar endpoints secundarios
    secondary.forEach(intent => {
      const secondaryEndpoints = endpointMap[intent] || [];
      secondaryEndpoints.forEach(ep => endpoints.add(ep));
    });

    // Endpoints adicionales basados en contexto
    if (/email|env[íi]ar/.test(input)) {
      endpoints.add('/api/centralized-email');
    }

    if (/pdf|descargar/.test(input)) {
      endpoints.add('/api/generate-pdf');
    }

    return Array.from(endpoints);
  }

  /**
   * Estimar número de pasos
   */
  private estimateSteps(primary: string, complexity: string, endpoints: string[]): number {
    const baseSteps: Record<string, number> = {
      estimate: 3,
      contract: 5,
      permit: 4,
      property: 2,
      payment: 3,
      analytics: 2,
      general: 1
    };

    let steps = baseSteps[primary] || 1;

    // Ajustar por complejidad
    if (complexity === 'complex') steps += 2;
    if (complexity === 'multi-step') steps += 4;

    // Ajustar por número de endpoints
    steps += Math.floor(endpoints.length / 2);

    return Math.min(10, steps); // Máximo 10 pasos
  }

  /**
   * Extraer parámetros del input
   */
  private extractParameters(input: string, primary: string): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Extraer números (dimensiones, precios, etc.)
    const numbers = input.match(/\d+(?:\.\d+)?/g);
    if (numbers) {
      parameters.numbers = numbers.map(n => parseFloat(n));
    }

    // Extraer emails
    const emails = input.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emails) {
      parameters.emails = emails;
    }

    // Extraer nombres (palabras capitalizadas)
    const names = input.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (names) {
      parameters.possibleNames = names;
    }

    // Contexto específico por intención
    if (primary === 'estimate') {
      // Buscar materiales mencionados
      const materials = ['madera', 'vinilo', 'metal', 'concreto', 'alambre', 'cerca'];
      parameters.materials = materials.filter(m => 
        new RegExp(m, 'i').test(input)
      );
    }

    return parameters;
  }

  /**
   * Construir contexto de intención
   */
  private buildIntentionContext(history: any[], parameters: Record<string, any>): IntentionContext {
    return {
      conversationHistory: history,
      recentActions: history.slice(-3).map(h => h.action || 'chat'),
      availableData: parameters
    };
  }

  /**
   * Generar pasos para estimados usando el flujo conversacional del Estimate Wizard
   * CRÍTICO: No generar estimado completo de una vez - debe ser conversacional paso a paso
   */
  private generateEstimateSteps(intention: UserIntention): TaskStep[] {
    return [
      {
        id: 'start_estimate_conversation',
        name: 'Iniciar Estimado Conversacional',
        description: 'Empezar flujo conversacional pidiendo información del cliente paso a paso',
        endpoint: 'conversational_flow',
        parameters: {
          ...intention.parameters,
          conversationStep: 'request_client_info',
          nextStep: 'capture_client_info',
          useWizardEndpoints: true,
          stepByStep: true
        },
        estimatedDuration: 1000,
        required: true
      }
    ];
  }

  /**
   * Generar pasos para contratos
   */
  private generateContractSteps(intention: UserIntention): TaskStep[] {
    return [
      {
        id: 'select_estimate',
        name: 'Seleccionar Estimado',
        description: 'Localizar estimado base',
        endpoint: '/api/estimates',
        parameters: intention.parameters,
        estimatedDuration: 2000,
        required: true
      },
      {
        id: 'generate_contract',
        name: 'Generar Contrato',
        description: 'Crear contrato legal',
        endpoint: '/api/legal-defense',
        parameters: intention.parameters,
        dependsOn: ['select_estimate'],
        estimatedDuration: 8000,
        required: true
      },
      {
        id: 'setup_signatures',
        name: 'Configurar Firmas',
        description: 'Iniciar protocolo de firma dual',
        endpoint: '/api/dual-signature',
        parameters: intention.parameters,
        dependsOn: ['generate_contract'],
        estimatedDuration: 3000,
        required: false
      }
    ];
  }

  /**
   * Generar pasos para permisos
   */
  private generatePermitSteps(intention: UserIntention): TaskStep[] {
    return [
      {
        id: 'verify_property',
        name: 'Verificar Propiedad',
        description: 'Validar información de la propiedad',
        endpoint: '/api/property-verification',
        parameters: intention.parameters,
        estimatedDuration: 4000,
        required: true
      },
      {
        id: 'analyze_permits',
        name: 'Analizar Permisos',
        description: 'Identificar permisos necesarios',
        endpoint: '/api/permit-advisor',
        parameters: intention.parameters,
        dependsOn: ['verify_property'],
        estimatedDuration: 6000,
        required: true
      }
    ];
  }

  /**
   * Generar pasos para propiedades
   */
  private generatePropertySteps(intention: UserIntention): TaskStep[] {
    return [
      {
        id: 'property_lookup',
        name: 'Buscar Propiedad',
        description: 'Localizar información de la propiedad',
        endpoint: '/api/property-verification',
        parameters: intention.parameters,
        estimatedDuration: 3000,
        required: true
      }
    ];
  }

  /**
   * Generar pasos para pagos
   */
  private generatePaymentSteps(intention: UserIntention): TaskStep[] {
    return [
      {
        id: 'payment_analysis',
        name: 'Análisis de Pagos',
        description: 'Revisar estado de pagos',
        endpoint: '/api/payment-tracking',
        parameters: intention.parameters,
        estimatedDuration: 3000,
        required: true
      }
    ];
  }

  /**
   * Generar pasos para analytics
   */
  private generateAnalyticsSteps(intention: UserIntention): TaskStep[] {
    return [
      {
        id: 'generate_analytics',
        name: 'Generar Analíticas',
        description: 'Crear reporte de analíticas',
        endpoint: '/api/analytics',
        parameters: intention.parameters,
        estimatedDuration: 4000,
        required: true
      }
    ];
  }

  /**
   * Generar pasos generales
   */
  private generateGeneralSteps(intention: UserIntention): TaskStep[] {
    return [
      {
        id: 'general_response',
        name: 'Respuesta General',
        description: 'Proporcionar información general',
        parameters: intention.parameters,
        estimatedDuration: 1000,
        required: true
      }
    ];
  }

  /**
   * Calcular nivel de riesgo
   */
  private calculateRiskLevel(intention: UserIntention, steps: TaskStep[]): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Factores de riesgo
    if (intention.primary === 'contract') riskScore += 2;
    if (intention.primary === 'payment') riskScore += 1;
    if (steps.length > 5) riskScore += 1;
    if (intention.complexity === 'multi-step') riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Normalizar input del usuario
   */
  private normalizeInput(input: string): string {
    return input.toLowerCase().trim();
  }
}
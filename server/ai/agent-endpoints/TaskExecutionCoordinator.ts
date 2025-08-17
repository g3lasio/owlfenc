/**
 * TASK EXECUTION COORDINATOR - COORDINADOR DE EJECUCIÓN DE TAREAS
 * 
 * Este coordinador maneja la planificación y ejecución de tareas complejas
 * que requieren interacción con múltiples endpoints del sistema existente.
 */

export interface TaskExecutionPlan {
  requiresExecution: boolean;
  taskType: string;
  steps: string[];
  endpoints: string[];
  estimatedTime: number;
  prerequisites: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface EndpointDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  requiredData: string[];
  expectedOutput: string;
}

export class TaskExecutionCoordinator {
  private availableEndpoints: Map<string, EndpointDefinition>;

  constructor() {
    this.initializeEndpoints();
    console.log('⚡ [TASK-COORDINATOR] Coordinador de ejecución inicializado');
  }

  /**
   * Planifica la ejecución de una tarea basada en el input del usuario
   */
  async planExecution(input: string, taskType: string): Promise<TaskExecutionPlan> {
    console.log(`📋 [TASK-COORDINATOR] Planificando ejecución para: ${taskType}`);

    try {
      const plan = this.createExecutionPlan(input, taskType);
      console.log(`✅ [TASK-COORDINATOR] Plan creado: ${plan.steps.length} pasos, ${plan.endpoints.length} endpoints`);
      return plan;
    } catch (error) {
      console.error('❌ [TASK-COORDINATOR] Error planificando ejecución:', error);
      return this.createFallbackPlan(taskType);
    }
  }

  /**
   * Crea un plan de ejecución específico para el tipo de tarea
   */
  private createExecutionPlan(input: string, taskType: string): TaskExecutionPlan {
    const planTemplates = {
      'estimate': {
        requiresExecution: true,
        taskType: 'estimate',
        steps: [
          'Recopilar información del cliente y proyecto',
          'Calcular materiales necesarios',
          'Estimar costos de mano de obra',
          'Generar estimado profesional en PDF',
          'Enviar estimado al cliente por email'
        ],
        endpoints: [
          '/api/estimates/create',
          '/api/estimate-email/send',
          '/api/pdf/generate'
        ],
        estimatedTime: 180, // 3 minutos
        prerequisites: [
          'Información del cliente',
          'Detalles del proyecto',
          'Dimensiones y especificaciones'
        ],
        riskLevel: 'low' as const
      },
      
      'contract': {
        requiresExecution: true,
        taskType: 'contract',
        steps: [
          'Validar información del cliente y proyecto',
          'Generar contrato legal profesional',
          'Incluir términos y condiciones específicos',
          'Preparar documento para firma digital',
          'Enviar contrato para revisión del cliente'
        ],
        endpoints: [
          '/api/anthropic/generate-contract',
          '/api/dual-signature/create',
          '/api/email-contract/send'
        ],
        estimatedTime: 300, // 5 minutos
        prerequisites: [
          'Estimado aprobado',
          'Información legal completa',
          'Términos de pago acordados'
        ],
        riskLevel: 'medium' as const
      },

      'permit': {
        requiresExecution: true,
        taskType: 'permit',
        steps: [
          'Analizar tipo de proyecto y ubicación',
          'Determinar permisos requeridos',
          'Consultar regulaciones locales',
          'Preparar documentación necesaria',
          'Generar guía de solicitud de permisos'
        ],
        endpoints: [
          '/api/permits/analyze',
          '/api/jurisdiction/detect',
          '/api/legal-defense/permit-guide'
        ],
        estimatedTime: 240, // 4 minutos
        prerequisites: [
          'Dirección exacta del proyecto',
          'Tipo y alcance del trabajo',
          'Planos o especificaciones'
        ],
        riskLevel: 'medium' as const
      },

      'property': {
        requiresExecution: true,
        taskType: 'property',
        steps: [
          'Verificar dirección y ubicación',
          'Consultar registros de propiedad',
          'Verificar límites y servidumbres',
          'Analizar historial de permisos',
          'Generar reporte de verificación'
        ],
        endpoints: [
          '/api/property/verify',
          '/api/property/ownership',
          '/api/property/permits-history'
        ],
        estimatedTime: 200, // 3.3 minutos
        prerequisites: [
          'Dirección completa de la propiedad',
          'Propósito de la verificación'
        ],
        riskLevel: 'low' as const
      }
    };

    const template = planTemplates[taskType as keyof typeof planTemplates];
    if (!template) {
      return this.createCustomPlan(input, taskType);
    }

    // Personalizar el plan basado en el input específico
    const customizedPlan = { ...template };
    customizedPlan.steps = this.customizeSteps(template.steps, input);
    
    return customizedPlan;
  }

  /**
   * Personaliza los pasos basado en el input específico del usuario
   */
  private customizeSteps(baseSteps: string[], input: string): string[] {
    // Analizar el input para personalizar los pasos
    const lowerInput = input.toLowerCase();
    let customizedSteps = [...baseSteps];

    // Agregar pasos específicos basados en palabras clave
    if (lowerInput.includes('urgente') || lowerInput.includes('urgent')) {
      customizedSteps.unshift('Priorizar procesamiento urgente');
    }

    if (lowerInput.includes('email') || lowerInput.includes('enviar')) {
      if (!customizedSteps.some(step => step.includes('email'))) {
        customizedSteps.push('Enviar documento por email');
      }
    }

    if (lowerInput.includes('pdf') || lowerInput.includes('documento')) {
      if (!customizedSteps.some(step => step.includes('PDF'))) {
        customizedSteps.push('Generar documento en formato PDF');
      }
    }

    return customizedSteps;
  }

  /**
   * Crea un plan personalizado para tareas no predefinidas
   */
  private createCustomPlan(input: string, taskType: string): TaskExecutionPlan {
    return {
      requiresExecution: true,
      taskType: taskType || 'custom',
      steps: [
        'Analizar solicitud específica',
        'Determinar endpoints necesarios',
        'Ejecutar tarea personalizada',
        'Generar resultado según especificaciones'
      ],
      endpoints: ['/api/custom/process'],
      estimatedTime: 300, // 5 minutos por defecto
      prerequisites: ['Información suficiente para procesar'],
      riskLevel: 'medium'
    };
  }

  /**
   * Crea un plan de fallback en caso de error
   */
  private createFallbackPlan(taskType: string): TaskExecutionPlan {
    return {
      requiresExecution: false,
      taskType: taskType,
      steps: [
        'Proporcionar asistencia básica',
        'Solicitar más información si es necesario'
      ],
      endpoints: [],
      estimatedTime: 60, // 1 minuto
      prerequisites: [],
      riskLevel: 'low'
    };
  }

  /**
   * Inicializa el mapa de endpoints disponibles
   */
  private initializeEndpoints(): void {
    this.availableEndpoints = new Map([
      // Endpoints de estimados
      ['/api/estimates/create', {
        path: '/api/estimates/create',
        method: 'POST',
        description: 'Crear estimado profesional',
        requiredData: ['clientName', 'projectType', 'dimensions'],
        expectedOutput: 'Estimado en formato PDF'
      }],
      
      // Endpoints de contratos
      ['/api/anthropic/generate-contract', {
        path: '/api/anthropic/generate-contract',
        method: 'POST',
        description: 'Generar contrato legal con IA',
        requiredData: ['clientInfo', 'projectDetails', 'terms'],
        expectedOutput: 'Contrato legal completo'
      }],

      // Endpoints de permisos
      ['/api/permits/analyze', {
        path: '/api/permits/analyze',
        method: 'POST',
        description: 'Analizar permisos requeridos',
        requiredData: ['projectType', 'location', 'scope'],
        expectedOutput: 'Lista de permisos necesarios'
      }],

      // Endpoints de propiedades
      ['/api/property/verify', {
        path: '/api/property/verify',
        method: 'POST',
        description: 'Verificar información de propiedad',
        requiredData: ['address'],
        expectedOutput: 'Información de propiedad verificada'
      }],

      // Endpoints de email
      ['/api/estimate-email/send', {
        path: '/api/estimate-email/send',
        method: 'POST',
        description: 'Enviar estimado por email',
        requiredData: ['estimateData', 'clientEmail'],
        expectedOutput: 'Confirmación de envío'
      }],

      // Endpoints de PDF
      ['/api/pdf/generate', {
        path: '/api/pdf/generate',
        method: 'POST',
        description: 'Generar documento PDF',
        requiredData: ['htmlContent', 'documentType'],
        expectedOutput: 'Documento PDF generado'
      }]
    ]);
  }

  /**
   * Obtiene información de un endpoint específico
   */
  getEndpointInfo(endpointPath: string): EndpointDefinition | undefined {
    return this.availableEndpoints.get(endpointPath);
  }

  /**
   * Lista todos los endpoints disponibles
   */
  listAvailableEndpoints(): EndpointDefinition[] {
    return Array.from(this.availableEndpoints.values());
  }

  /**
   * Valida si un plan de ejecución es viable
   */
  validateExecutionPlan(plan: TaskExecutionPlan): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Validar que los endpoints existen
    for (const endpoint of plan.endpoints) {
      if (!this.availableEndpoints.has(endpoint)) {
        issues.push(`Endpoint no disponible: ${endpoint}`);
      }
    }

    // Validar que hay pasos definidos
    if (plan.steps.length === 0) {
      issues.push('Plan no tiene pasos definidos');
    }

    // Validar tiempo estimado razonable
    if (plan.estimatedTime <= 0 || plan.estimatedTime > 1800) { // Máximo 30 minutos
      issues.push('Tiempo estimado fuera del rango válido');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
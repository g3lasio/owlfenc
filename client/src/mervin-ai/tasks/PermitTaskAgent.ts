/**
 * PERMIT TASK AGENT - AGENTE ESPECIALIZADO EN PERMISOS
 * 
 * Agente especializado que maneja completamente el análisis de permisos,
 * verificación de propiedades y consulta de regulaciones municipales.
 * 
 * Responsabilidades:
 * - Verificación de ownership de propiedades
 * - Análisis de permisos municipales requeridos
 * - Investigación de códigos de construcción
 * - Generación de reportes de permisos
 * - Coordinación con autoridades locales
 */

export interface PermitRequest {
  propertyAddress: string;
  projectType: 'fence' | 'roofing' | 'construction' | 'renovation' | 'other';
  projectDescription?: string;
  ownershipVerification?: boolean;
  clientData?: {
    name: string;
    email?: string;
    phone?: string;
  };
  preferences?: {
    includeOwnershipCheck?: boolean;
    includeBuildingCodes?: boolean;
    generateReport?: boolean;
    contactMunicipality?: boolean;
  };
}

export interface PermitResult {
  success: boolean;
  permitId?: string;
  propertyInfo?: {
    address: string;
    owner: string;
    verified: boolean;
    parcelNumber?: string;
    zoning?: string;
  };
  requiredPermits?: Array<{
    type: string;
    description: string;
    authority: string;
    estimatedCost: number;
    processingTime: string;
    required: boolean;
  }>;
  buildingCodes?: Array<{
    code: string;
    description: string;
    compliance: 'compliant' | 'non-compliant' | 'requires-review';
  }>;
  recommendations?: string[];
  nextSteps?: string[];
  error?: string;
  confidence: number;
}

export class PermitTaskAgent {
  private endpointCoordinator: any;
  private contextManager: any;
  private permissionValidator: any;

  constructor(dependencies: {
    endpointCoordinator: any;
    contextManager: any;
    permissionValidator: any;
  }) {
    this.endpointCoordinator = dependencies.endpointCoordinator;
    this.contextManager = dependencies.contextManager;
    this.permissionValidator = dependencies.permissionValidator;
  }

  /**
   * Procesar solicitud completa de análisis de permisos
   */
  async processPermitRequest(request: PermitRequest): Promise<PermitResult> {
    try {
      console.log('🏛️ [PERMIT-AGENT] Procesando análisis de permisos para:', request.propertyAddress);

      // 1. Validar permisos necesarios
      const permissionCheck = await this.permissionValidator.validatePermission('permit_advisor');
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: `Permisos insuficientes: ${permissionCheck.reason}`,
          confidence: 0,
          recommendations: ['Actualiza tu plan para acceder al asesor de permisos']
        };
      }

      // 2. Verificar ownership de propiedad si se solicita
      let propertyInfo;
      if (request.preferences?.includeOwnershipCheck) {
        propertyInfo = await this.verifyPropertyOwnership(request.propertyAddress);
      }

      // 3. Analizar permisos requeridos
      const permitsAnalysis = await this.analyzeRequiredPermits(request);

      // 4. Verificar códigos de construcción si se solicita
      let buildingCodes;
      if (request.preferences?.includeBuildingCodes) {
        buildingCodes = await this.analyzeBuildingCodes(request);
      }

      // 5. Generar recomendaciones
      const recommendations = this.generatePermitRecommendations(permitsAnalysis, propertyInfo, buildingCodes);
      const nextSteps = this.generatePermitNextSteps(request, permitsAnalysis);

      // 6. Registrar uso del permiso
      await this.permissionValidator.recordUsage('permit_advisor');

      return {
        success: true,
        permitId: `PERMIT-${Date.now()}`,
        propertyInfo,
        requiredPermits: permitsAnalysis.permits,
        buildingCodes,
        recommendations,
        nextSteps,
        confidence: permitsAnalysis.confidence
      };

    } catch (error) {
      console.error('❌ [PERMIT-AGENT] Error procesando permisos:', error);
      
      return {
        success: false,
        error: `Error analizando permisos: ${(error as Error).message}`,
        confidence: 0,
        recommendations: [
          'Verifica que la dirección de la propiedad sea correcta',
          'Asegúrate de tener una conexión estable a internet'
        ]
      };
    }
  }

  /**
   * Verificar ownership de la propiedad
   */
  private async verifyPropertyOwnership(address: string): Promise<any> {
    try {
      console.log('🏠 [PERMIT-AGENT] Verificando ownership de propiedad');

      const verificationResult = await this.endpointCoordinator.executeEndpoint('/api/property-verification', {
        address,
        includeOwnership: true,
        includeZoning: true
      });

      return {
        address,
        owner: verificationResult.owner || 'No disponible',
        verified: verificationResult.verified || false,
        parcelNumber: verificationResult.parcelNumber,
        zoning: verificationResult.zoning,
        confidence: verificationResult.confidence || 0.5
      };

    } catch (error) {
      console.warn('⚠️ [PERMIT-AGENT] Error verificando propiedad:', error);
      
      return {
        address,
        owner: 'No disponible',
        verified: false,
        confidence: 0
      };
    }
  }

  /**
   * Analizar permisos requeridos
   */
  private async analyzeRequiredPermits(request: PermitRequest): Promise<{
    permits: any[];
    confidence: number;
  }> {
    try {
      console.log('📋 [PERMIT-AGENT] Analizando permisos requeridos');

      const permitPayload = {
        address: request.propertyAddress,
        projectType: request.projectType,
        projectDescription: request.projectDescription,
        clientData: request.clientData
      };

      const permitResult = await this.endpointCoordinator.executeEndpoint('/api/permit-advisor', permitPayload);

      const permits = permitResult.permits || this.generateFallbackPermits(request);
      const confidence = permitResult.confidence || 0.7;

      return { permits, confidence };

    } catch (error) {
      console.warn('⚠️ [PERMIT-AGENT] Error analizando permisos, usando fallback');
      
      return {
        permits: this.generateFallbackPermits(request),
        confidence: 0.5
      };
    }
  }

  /**
   * Analizar códigos de construcción
   */
  private async analyzeBuildingCodes(request: PermitRequest): Promise<any[]> {
    try {
      console.log('📐 [PERMIT-AGENT] Analizando códigos de construcción');

      const codesPayload = {
        address: request.propertyAddress,
        projectType: request.projectType,
        projectDescription: request.projectDescription
      };

      const codesResult = await this.endpointCoordinator.executeEndpoint('/api/building-codes', codesPayload);
      return codesResult.codes || this.generateFallbackBuildingCodes(request);

    } catch (error) {
      console.warn('⚠️ [PERMIT-AGENT] Error analizando códigos, usando fallback');
      return this.generateFallbackBuildingCodes(request);
    }
  }

  /**
   * Generar permisos de fallback
   */
  private generateFallbackPermits(request: PermitRequest): any[] {
    const basePermits = [];

    switch (request.projectType) {
      case 'fence':
        basePermits.push({
          type: 'Fence Permit',
          description: 'Permiso para construcción de cerca',
          authority: 'Municipio Local',
          estimatedCost: 50,
          processingTime: '3-5 días hábiles',
          required: true
        });
        break;

      case 'roofing':
        basePermits.push({
          type: 'Roofing Permit',
          description: 'Permiso para trabajos de techado',
          authority: 'Departamento de Construcción',
          estimatedCost: 150,
          processingTime: '7-10 días hábiles',
          required: true
        });
        break;

      case 'construction':
        basePermits.push({
          type: 'Building Permit',
          description: 'Permiso general de construcción',
          authority: 'Departamento de Construcción',
          estimatedCost: 300,
          processingTime: '14-21 días hábiles',
          required: true
        });
        break;

      default:
        basePermits.push({
          type: 'General Permit',
          description: 'Permiso general para mejoras',
          authority: 'Municipio Local',
          estimatedCost: 100,
          processingTime: '5-7 días hábiles',
          required: true
        });
    }

    // Permisos adicionales comunes
    basePermits.push({
      type: 'Survey Verification',
      description: 'Verificación de límites de propiedad',
      authority: 'Agrimensor Certificado',
      estimatedCost: 200,
      processingTime: '2-3 días hábiles',
      required: false
    });

    return basePermits;
  }

  /**
   * Generar códigos de construcción de fallback
   */
  private generateFallbackBuildingCodes(request: PermitRequest): any[] {
    const codes = [];

    switch (request.projectType) {
      case 'fence':
        codes.push(
          {
            code: 'FENCE-HEIGHT-001',
            description: 'Altura máxima permitida: 6 pies en patio trasero, 4 pies en patio delantero',
            compliance: 'requires-review'
          },
          {
            code: 'FENCE-SETBACK-001',
            description: 'Distancia mínima de 2 pies desde línea de propiedad',
            compliance: 'requires-review'
          }
        );
        break;

      case 'roofing':
        codes.push(
          {
            code: 'ROOF-MATERIAL-001',
            description: 'Materiales deben cumplir con estándares de resistencia al fuego',
            compliance: 'compliant'
          },
          {
            code: 'ROOF-SLOPE-001',
            description: 'Pendiente mínima requerida según código local',
            compliance: 'requires-review'
          }
        );
        break;

      default:
        codes.push({
          code: 'GENERAL-001',
          description: 'Cumplimiento con códigos de construcción locales',
          compliance: 'requires-review'
        });
    }

    return codes;
  }

  /**
   * Generar recomendaciones
   */
  private generatePermitRecommendations(permitsAnalysis: any, propertyInfo?: any, buildingCodes?: any[]): string[] {
    const recommendations: string[] = [];

    if (permitsAnalysis.confidence < 0.7) {
      recommendations.push('Verifica los permisos específicos con tu municipio local');
    }

    if (propertyInfo && !propertyInfo.verified) {
      recommendations.push('Confirma el ownership de la propiedad antes de solicitar permisos');
    }

    if (buildingCodes && buildingCodes.some(code => code.compliance === 'non-compliant')) {
      recommendations.push('Revisa códigos de construcción que no cumplen con regulaciones');
    }

    const totalCost = permitsAnalysis.permits.reduce((sum: number, permit: any) => sum + permit.estimatedCost, 0);
    if (totalCost > 500) {
      recommendations.push(`Presupuesta aproximadamente $${totalCost} para permisos`);
    }

    recommendations.push('Consulta con un contratista licenciado antes de iniciar trabajos');
    recommendations.push('Mantén copias de todos los permisos durante la construcción');

    return recommendations;
  }

  /**
   * Generar próximos pasos
   */
  private generatePermitNextSteps(request: PermitRequest, permitsAnalysis: any): string[] {
    const nextSteps: string[] = [];

    nextSteps.push('Contactar al municipio para confirmar permisos requeridos');
    
    const requiredPermits = permitsAnalysis.permits.filter((permit: any) => permit.required);
    if (requiredPermits.length > 0) {
      nextSteps.push(`Solicitar ${requiredPermits.length} permiso(s) requerido(s)`);
    }

    nextSteps.push('Programar inspecciones necesarias durante construcción');
    nextSteps.push('Verificar que el contratista tenga licencias válidas');
    
    const maxProcessingTime = Math.max(...permitsAnalysis.permits.map((permit: any) => 
      parseInt(permit.processingTime) || 7
    ));
    
    nextSteps.push(`Esperar ${maxProcessingTime} días hábiles para aprobación de permisos`);

    return nextSteps;
  }
}
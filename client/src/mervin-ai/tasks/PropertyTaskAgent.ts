/**
 * PROPERTY TASK AGENT - AGENTE ESPECIALIZADO EN PROPIEDADES
 * 
 * Agente especializado que maneja verificación de propiedades,
 * análisis de ownership y validación de datos inmobiliarios.
 * 
 * Responsabilidades:
 * - Verificación de ownership de propiedades
 * - Análisis de registros públicos
 * - Validación de datos inmobiliarios
 * - Generación de reportes de propiedad
 */

export interface PropertyRequest {
  address: string;
  verificationLevel: 'basic' | 'comprehensive' | 'legal';
  includeOwnership?: boolean;
  includeZoning?: boolean;
  includeTaxInfo?: boolean;
  includeHistory?: boolean;
  clientData?: {
    name: string;
    email?: string;
  };
}

export interface PropertyResult {
  success: boolean;
  propertyId?: string;
  basicInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: { lat: number; lng: number };
  };
  ownershipInfo?: {
    owner: string;
    ownerType: 'individual' | 'business' | 'trust' | 'government';
    verified: boolean;
    confidence: number;
  };
  zoning?: {
    zone: string;
    description: string;
    allowedUses: string[];
    restrictions: string[];
  };
  taxInfo?: {
    assessedValue: number;
    taxAmount: number;
    taxYear: number;
    exemptions: string[];
  };
  history?: {
    saleDate?: string;
    salePrice?: number;
    previousOwners?: string[];
  };
  recommendations?: string[];
  nextSteps?: string[];
  error?: string;
  confidence: number;
}

export class PropertyTaskAgent {
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
   * Procesar solicitud completa de verificación de propiedad
   */
  async processPropertyRequest(request: PropertyRequest): Promise<PropertyResult> {
    try {
      console.log('🏠 [PROPERTY-AGENT] Verificando propiedad:', request.address);

      // 1. Validar permisos necesarios
      const permissionCheck = await this.permissionValidator.validatePermission('property_verification');
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: `Permisos insuficientes: ${permissionCheck.reason}`,
          confidence: 0,
          recommendations: ['Actualiza tu plan para acceder a verificación de propiedades']
        };
      }

      // 2. Verificar información básica
      const basicInfo = await this.getBasicPropertyInfo(request.address);
      if (!basicInfo) {
        return {
          success: false,
          error: 'No se pudo encontrar información de la propiedad',
          confidence: 0,
          recommendations: ['Verifica que la dirección sea correcta y completa']
        };
      }

      // 3. Obtener información de ownership si se solicita
      let ownershipInfo;
      if (request.includeOwnership) {
        ownershipInfo = await this.getOwnershipInfo(request.address, request.verificationLevel);
      }

      // 4. Obtener información de zoning si se solicita
      let zoning;
      if (request.includeZoning) {
        zoning = await this.getZoningInfo(request.address);
      }

      // 5. Obtener información fiscal si se solicita
      let taxInfo;
      if (request.includeTaxInfo) {
        taxInfo = await this.getTaxInfo(request.address);
      }

      // 6. Obtener historial si se solicita
      let history;
      if (request.includeHistory) {
        history = await this.getPropertyHistory(request.address);
      }

      // 7. Generar recomendaciones y próximos pasos
      const recommendations = this.generatePropertyRecommendations(basicInfo, ownershipInfo, zoning);
      const nextSteps = this.generatePropertyNextSteps(request, ownershipInfo);

      // 8. Calcular confianza general
      const confidence = this.calculateOverallConfidence(basicInfo, ownershipInfo, zoning, taxInfo);

      // 9. Registrar uso del permiso
      await this.permissionValidator.recordUsage('property_verification');

      return {
        success: true,
        propertyId: `PROP-${Date.now()}`,
        basicInfo,
        ownershipInfo,
        zoning,
        taxInfo,
        history,
        recommendations,
        nextSteps,
        confidence
      };

    } catch (error) {
      console.error('❌ [PROPERTY-AGENT] Error verificando propiedad:', error);
      
      return {
        success: false,
        error: `Error verificando propiedad: ${(error as Error).message}`,
        confidence: 0,
        recommendations: [
          'Verifica que la dirección sea válida',
          'Intenta con una dirección más específica'
        ]
      };
    }
  }

  /**
   * Obtener información básica de la propiedad usando el endpoint real
   */
  private async getBasicPropertyInfo(address: string): Promise<any> {
    try {
      console.log('📍 [PROPERTY-AGENT] Obteniendo información básica');

      // Usar el endpoint real como lo hace PropertyOwnershipVerifier.tsx
      const basicResult = await this.endpointCoordinator.executeEndpoint('/api/property/details', {
        address: address
      });

      if (basicResult && basicResult.success) {
        return {
          address: basicResult.property?.address || address,
          city: basicResult.property?.city,
          state: basicResult.property?.state,
          zipCode: basicResult.property?.zipCode,
          coordinates: basicResult.property?.coordinates
        };
      }

      throw new Error('No se encontró información de la propiedad');
    } catch (error) {
      console.error('❌ [PROPERTY-AGENT] Error obteniendo info básica:', error);
      throw error;
    }
  }

  /**
   * Obtener información de ownership usando el endpoint real
   */
  private async getOwnershipInfo(address: string, verificationLevel: string): Promise<any> {
    try {
      console.log('👤 [PROPERTY-AGENT] Verificando ownership');

      // Usar el mismo endpoint que el anterior ya que /api/property/details maneja ownership
      const ownershipResult = await this.endpointCoordinator.executeEndpoint('/api/property/details', {
        address: address,
        includeOwnership: true
      });

      return {
        owner: ownershipResult.property?.owner || 'No disponible',
        ownerType: 'individual',
        verified: ownershipResult.property?.verified || false,
        confidence: ownershipResult.confidence || 0.7
      };

    } catch (error) {
      console.error('❌ [PROPERTY-AGENT] Error verificando ownership:', error);
      throw error;
    }
  }

  /**
   * Obtener información de zoning
   */
  private async getZoningInfo(address: string): Promise<any> {
    try {
      console.log('🏘️ [PROPERTY-AGENT] Obteniendo información de zoning');

      const zoningResult = await this.endpointCoordinator.executeEndpoint('/api/property-verification', {
        address,
        type: 'zoning'
      });

      return {
        zone: zoningResult.zone || 'No disponible',
        description: zoningResult.description || 'Información no disponible',
        allowedUses: zoningResult.allowedUses || [],
        restrictions: zoningResult.restrictions || []
      };

    } catch (error) {
      console.warn('⚠️ [PROPERTY-AGENT] Error obteniendo zoning:', error);
      return {
        zone: 'No disponible',
        description: 'Información no disponible',
        allowedUses: [],
        restrictions: []
      };
    }
  }

  /**
   * Obtener información fiscal
   */
  private async getTaxInfo(address: string): Promise<any> {
    try {
      console.log('💰 [PROPERTY-AGENT] Obteniendo información fiscal');

      const taxResult = await this.endpointCoordinator.executeEndpoint('/api/property-verification', {
        address,
        type: 'tax'
      });

      return {
        assessedValue: taxResult.assessedValue || 0,
        taxAmount: taxResult.taxAmount || 0,
        taxYear: taxResult.taxYear || new Date().getFullYear(),
        exemptions: taxResult.exemptions || []
      };

    } catch (error) {
      console.warn('⚠️ [PROPERTY-AGENT] Error obteniendo info fiscal:', error);
      return {
        assessedValue: 0,
        taxAmount: 0,
        taxYear: new Date().getFullYear(),
        exemptions: []
      };
    }
  }

  /**
   * Obtener historial de la propiedad
   */
  private async getPropertyHistory(address: string): Promise<any> {
    try {
      console.log('📚 [PROPERTY-AGENT] Obteniendo historial');

      const historyResult = await this.endpointCoordinator.executeEndpoint('/api/property-verification', {
        address,
        type: 'history'
      });

      return {
        saleDate: historyResult.lastSaleDate,
        salePrice: historyResult.lastSalePrice,
        previousOwners: historyResult.previousOwners || []
      };

    } catch (error) {
      console.warn('⚠️ [PROPERTY-AGENT] Error obteniendo historial:', error);
      return {
        saleDate: null,
        salePrice: null,
        previousOwners: []
      };
    }
  }

  /**
   * Generar fallback básico
   */
  private generateBasicFallback(address: string): any {
    // Extraer ciudad y estado de la dirección si es posible
    const addressParts = address.split(',').map(part => part.trim());
    
    return {
      address,
      city: addressParts[1] || 'No disponible',
      state: addressParts[2]?.split(' ')[0] || 'No disponible',
      zipCode: addressParts[2]?.split(' ')[1] || 'No disponible',
      coordinates: null
    };
  }

  /**
   * Generar recomendaciones
   */
  private generatePropertyRecommendations(basicInfo: any, ownershipInfo?: any, zoning?: any): string[] {
    const recommendations: string[] = [];

    if (ownershipInfo && !ownershipInfo.verified) {
      recommendations.push('Verifica la información de ownership con registros públicos oficiales');
    }

    if (ownershipInfo && ownershipInfo.confidence < 0.7) {
      recommendations.push('La información de ownership tiene baja confianza - confirma independientemente');
    }

    if (zoning && zoning.restrictions.length > 0) {
      recommendations.push('Revisa las restricciones de zoning antes de planificar construcción');
    }

    if (!basicInfo.coordinates) {
      recommendations.push('Considera obtener coordenadas exactas para mayor precisión');
    }

    recommendations.push('Consulta con un abogado de bienes raíces para transacciones importantes');

    return recommendations;
  }

  /**
   * Generar próximos pasos
   */
  private generatePropertyNextSteps(request: PropertyRequest, ownershipInfo?: any): string[] {
    const nextSteps: string[] = [];

    if (request.verificationLevel === 'basic') {
      nextSteps.push('Considera verificación comprehensive para más detalles');
    }

    if (ownershipInfo && !ownershipInfo.verified) {
      nextSteps.push('Solicitar documentos oficiales de ownership');
    }

    nextSteps.push('Verificar información con registros públicos locales');
    nextSteps.push('Consultar con profesionales antes de tomar decisiones importantes');

    if (request.clientData?.email) {
      nextSteps.push('Enviar reporte detallado por email');
    }

    return nextSteps;
  }

  /**
   * Calcular confianza general
   */
  private calculateOverallConfidence(basicInfo: any, ownershipInfo?: any, zoning?: any, taxInfo?: any): number {
    let totalConfidence = 0;
    let factors = 0;

    // Factor básico
    if (basicInfo) {
      totalConfidence += basicInfo.coordinates ? 0.8 : 0.6;
      factors++;
    }

    // Factor ownership
    if (ownershipInfo) {
      totalConfidence += ownershipInfo.confidence;
      factors++;
    }

    // Factor zoning
    if (zoning) {
      totalConfidence += zoning.zone !== 'No disponible' ? 0.7 : 0.3;
      factors++;
    }

    // Factor fiscal
    if (taxInfo) {
      totalConfidence += taxInfo.assessedValue > 0 ? 0.8 : 0.4;
      factors++;
    }

    return factors > 0 ? totalConfidence / factors : 0.5;
  }
}
/**
 * CONTRACT TASK AGENT - AGENTE ESPECIALIZADO EN CONTRATOS
 * 
 * Agente especializado que maneja completamente la generación de contratos legales,
 * desde la selección del estimado base hasta la entrega con firma dual.
 * 
 * Responsabilidades:
 * - Selección inteligente de estimados base
 * - Generación de contratos legales profesionales
 * - Configuración automática de términos y condiciones
 * - Inicialización de protocolo de firma dual
 * - Seguimiento del proceso de firma
 */

export interface ContractRequest {
  estimateId?: string;
  clientData?: {
    name: string;
    email: string;
    phone?: string;
    address: string;
  };
  contractorData?: {
    company: string;
    license: string;
    address: string;
    phone: string;
    email: string;
  };
  projectDetails?: {
    description: string;
    startDate?: string;
    completionDate?: string;
    duration?: string;
  };
  paymentTerms?: {
    milestones: Array<{
      title: string;
      percentage: number;
      description: string;
    }>;
    totalAmount: number;
  };
  preferences?: {
    includeWarranty?: boolean;
    warrantyPeriod?: string;
    includeInsurance?: boolean;
    requirePermits?: boolean;
    sendForSignature?: boolean;
    generatePDF?: boolean;
  };
}

export interface ContractResult {
  success: boolean;
  contractId?: string;
  contractHTML?: string;
  pdfUrl?: string;
  signatureLinks?: {
    contractorUrl: string;
    clientUrl: string;
  };
  error?: string;
  recommendations?: string[];
  nextSteps?: string[];
  status: 'draft' | 'pending_signature' | 'signed' | 'error';
}

export interface EstimateSelection {
  estimateId: string;
  clientName: string;
  projectDescription: string;
  totalAmount: number;
  items: any[];
  confidence: number;
}

export class ContractTaskAgent {
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
   * Procesar solicitud completa de contrato
   */
  async processContractRequest(request: ContractRequest): Promise<ContractResult> {
    try {
      console.log('📋 [CONTRACT-AGENT] Procesando solicitud de contrato');

      // 1. Validar permisos necesarios
      const permissionChecks = await this.validateRequiredPermissions(request);
      if (!permissionChecks.allValid) {
        return {
          success: false,
          error: `Permisos insuficientes: ${permissionChecks.missingPermissions.join(', ')}`,
          status: 'error',
          recommendations: ['Actualiza tu plan para acceder a la generación de contratos']
        };
      }

      // 2. Seleccionar o validar estimado base
      const selectedEstimate = await this.selectBaseEstimate(request);
      if (!selectedEstimate) {
        return {
          success: false,
          error: 'No se pudo encontrar un estimado válido para el contrato',
          status: 'error',
          recommendations: ['Crea un estimado antes de generar el contrato']
        };
      }

      // 3. Enriquecer datos del contrato
      const enrichedContractData = await this.enrichContractData(request, selectedEstimate);

      // 4. Generar contrato legal
      const contractResult = await this.generateLegalContract(enrichedContractData);
      if (!contractResult.success) {
        return {
          success: false,
          error: contractResult.error,
          status: 'error'
        };
      }

      // 5. Generar PDF si se solicita
      let pdfUrl;
      if (request.preferences?.generatePDF) {
        pdfUrl = await this.generateContractPDF(contractResult.contractHTML, enrichedContractData);
      }

      // 6. Inicializar firma dual si se solicita
      let signatureLinks;
      if (request.preferences?.sendForSignature) {
        signatureLinks = await this.initializeDualSignature(contractResult.contractHTML, enrichedContractData);
      }

      // 7. Registrar uso de permisos
      await this.recordPermissionUsage(request);

      // 8. Generar recomendaciones y próximos pasos
      const recommendations = this.generateContractRecommendations(enrichedContractData, contractResult);
      const nextSteps = this.generateContractNextSteps(request, signatureLinks);

      const finalStatus = signatureLinks ? 'pending_signature' : 'draft';

      return {
        success: true,
        contractId: contractResult.contractId,
        contractHTML: contractResult.contractHTML,
        pdfUrl,
        signatureLinks,
        status: finalStatus,
        recommendations,
        nextSteps
      };

    } catch (error) {
      console.error('❌ [CONTRACT-AGENT] Error procesando contrato:', error);
      
      return {
        success: false,
        error: `Error generando contrato: ${(error as Error).message}`,
        status: 'error',
        recommendations: [
          'Verifica que todos los datos requeridos estén completos',
          'Asegúrate de tener un estimado válido como base'
        ]
      };
    }
  }

  /**
   * Validar permisos requeridos para contrato
   */
  private async validateRequiredPermissions(request: ContractRequest): Promise<{
    allValid: boolean;
    missingPermissions: string[];
  }> {
    const requiredPermissions = ['contracts'];
    
    if (request.preferences?.sendForSignature) {
      requiredPermissions.push('dual_signature');
    }

    const results = await this.permissionValidator.validateMultiplePermissions(requiredPermissions);
    
    const missingPermissions = Object.entries(results)
      .filter(([_, result]) => !result.allowed)
      .map(([permission, _]) => permission);

    return {
      allValid: missingPermissions.length === 0,
      missingPermissions
    };
  }

  /**
   * Seleccionar estimado base para el contrato
   */
  private async selectBaseEstimate(request: ContractRequest): Promise<EstimateSelection | null> {
    try {
      // Si se proporciona estimateId específico, usarlo
      if (request.estimateId) {
        return await this.getEstimateById(request.estimateId);
      }

      // Si se proporciona nombre de cliente, buscar estimados recientes
      if (request.clientData?.name) {
        return await this.findEstimateByClient(request.clientData.name);
      }

      // Buscar el estimado más reciente del usuario
      return await this.getLatestEstimate();

    } catch (error) {
      console.error('❌ [CONTRACT-AGENT] Error seleccionando estimado:', error);
      return null;
    }
  }

  /**
   * Obtener estimado por ID
   */
  private async getEstimateById(estimateId: string): Promise<EstimateSelection | null> {
    try {
      const estimates = await this.endpointCoordinator.executeEndpoint('/api/estimates', {
        id: estimateId
      });

      if (estimates && estimates.length > 0) {
        const estimate = estimates[0];
        return {
          estimateId: estimate.id,
          clientName: estimate.clientName,
          projectDescription: estimate.projectDescription,
          totalAmount: estimate.total,
          items: estimate.items || [],
          confidence: 1.0
        };
      }

      return null;
    } catch (error) {
      console.warn('⚠️ [CONTRACT-AGENT] Error obteniendo estimado por ID:', error);
      return null;
    }
  }

  /**
   * Buscar estimado por cliente
   */
  private async findEstimateByClient(clientName: string): Promise<EstimateSelection | null> {
    try {
      const estimates = await this.endpointCoordinator.executeEndpoint('/api/estimates', {
        clientName: clientName,
        limit: 5
      });

      if (estimates && estimates.length > 0) {
        // Seleccionar el más reciente
        const estimate = estimates[0];
        return {
          estimateId: estimate.id,
          clientName: estimate.clientName,
          projectDescription: estimate.projectDescription,
          totalAmount: estimate.total,
          items: estimate.items || [],
          confidence: 0.9
        };
      }

      return null;
    } catch (error) {
      console.warn('⚠️ [CONTRACT-AGENT] Error buscando estimado por cliente:', error);
      return null;
    }
  }

  /**
   * Obtener último estimado
   */
  private async getLatestEstimate(): Promise<EstimateSelection | null> {
    try {
      const estimates = await this.endpointCoordinator.executeEndpoint('/api/estimates', {
        limit: 1,
        orderBy: 'createdAt',
        order: 'desc'
      });

      if (estimates && estimates.length > 0) {
        const estimate = estimates[0];
        return {
          estimateId: estimate.id,
          clientName: estimate.clientName,
          projectDescription: estimate.projectDescription,
          totalAmount: estimate.total,
          items: estimate.items || [],
          confidence: 0.7
        };
      }

      return null;
    } catch (error) {
      console.warn('⚠️ [CONTRACT-AGENT] Error obteniendo último estimado:', error);
      return null;
    }
  }

  /**
   * Enriquecer datos del contrato
   */
  private async enrichContractData(request: ContractRequest, estimate: EstimateSelection): Promise<any> {
    // Obtener perfil del contratista
    const contractorProfile = await this.getContractorProfile();

    // Combinar datos del request con estimado y perfil
    const enrichedData = {
      // Datos del contrato
      contractId: `CNT-${Date.now()}`,
      createdAt: new Date().toISOString(),
      
      // Datos del estimado
      estimateData: estimate,
      
      // Datos del cliente (request override estimate)
      clientData: {
        name: request.clientData?.name || estimate.clientName,
        email: request.clientData?.email || '',
        phone: request.clientData?.phone || '',
        address: request.clientData?.address || ''
      },
      
      // Datos del contratista (request override profile)
      contractorData: {
        company: request.contractorData?.company || contractorProfile.company || 'Tu Empresa',
        license: request.contractorData?.license || contractorProfile.license || '',
        address: request.contractorData?.address || contractorProfile.address || '',
        phone: request.contractorData?.phone || contractorProfile.phone || '',
        email: request.contractorData?.email || contractorProfile.email || ''
      },
      
      // Detalles del proyecto
      projectDetails: {
        description: request.projectDetails?.description || estimate.projectDescription,
        startDate: request.projectDetails?.startDate || this.generateDefaultStartDate(),
        completionDate: request.projectDetails?.completionDate || this.generateDefaultCompletionDate(),
        duration: request.projectDetails?.duration || '30 días'
      },
      
      // Términos de pago
      paymentTerms: request.paymentTerms || this.generateDefaultPaymentTerms(estimate.totalAmount),
      
      // Preferencias
      preferences: request.preferences || {}
    };

    return enrichedData;
  }

  /**
   * Obtener perfil del contratista
   */
  private async getContractorProfile(): Promise<any> {
    try {
      const context = await this.contextManager.getCurrentContext();
      return context.user?.profile || {};
    } catch (error) {
      console.warn('⚠️ [CONTRACT-AGENT] No se pudo obtener perfil del contratista');
      return {};
    }
  }

  /**
   * Generar contrato legal usando el endpoint real
   */
  private async generateLegalContract(contractData: any): Promise<{
    success: boolean;
    contractId?: string;
    contractHTML?: string;
    error?: string;
  }> {
    try {
      console.log('⚖️ [CONTRACT-AGENT] Generando contrato legal profesional');

      // Usar el endpoint real como lo hace LegalDefenseProfile.tsx
      const contractPayload = {
        prompt: `Generar contrato profesional para ${contractData.projectDetails.description}`,
        projectData: {
          id: contractData.contractId,
          clientName: contractData.clientData.name,
          address: contractData.clientData.address,
          projectType: contractData.projectDetails.description,
          totalPrice: contractData.paymentTerms.totalAmount,
          clientEmail: contractData.clientData.email,
          clientPhone: contractData.clientData.phone
        },
        riskAnalysis: {
          riskLevel: 'medio'
        },
        protectionConfig: {
          includeStandardClauses: true
        },
        baseTemplate: 'professional'
      };

      const result = await this.endpointCoordinator.executeEndpoint('/api/legal-defense/generate-contract', contractPayload);

      return {
        success: true,
        contractId: contractData.contractId,
        contractHTML: result.html || result.contractHTML
      };

    } catch (error) {
      console.error('❌ [CONTRACT-AGENT] Error generando contrato legal:', error);
      throw error;
    }
  }

  /**
   * Generar PDF del contrato
   */
  private async generateContractPDF(contractHTML: string, contractData: any): Promise<string | undefined> {
    try {
      console.log('📄 [CONTRACT-AGENT] Generando PDF del contrato');

      const pdfPayload = {
        html: contractHTML,
        filename: `contract-${contractData.contractId}.pdf`,
        options: {
          format: 'A4',
          margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' }
        }
      };

      const result = await this.endpointCoordinator.executeEndpoint('/api/generate-pdf', pdfPayload);
      return result.url || result.downloadUrl;

    } catch (error) {
      console.warn('⚠️ [CONTRACT-AGENT] Error generando PDF:', error);
      return undefined;
    }
  }

  /**
   * Inicializar protocolo de firma dual
   */
  private async initializeDualSignature(contractHTML: string, contractData: any): Promise<{
    contractorUrl: string;
    clientUrl: string;
  } | undefined> {
    try {
      console.log('✍️ [CONTRACT-AGENT] Inicializando protocolo de firma dual');

      const signaturePayload = {
        contractHTML,
        contractData,
        parties: {
          contractor: contractData.contractorData,
          client: contractData.clientData
        }
      };

      const result = await this.endpointCoordinator.executeEndpoint('/api/dual-signature', signaturePayload);

      return {
        contractorUrl: result.contractorSignUrl,
        clientUrl: result.clientSignUrl
      };

    } catch (error) {
      console.warn('⚠️ [CONTRACT-AGENT] Error inicializando firma dual:', error);
      return undefined;
    }
  }

  /**
   * Registrar uso de permisos
   */
  private async recordPermissionUsage(request: ContractRequest): Promise<void> {
    await this.permissionValidator.recordUsage('contracts');
    
    if (request.preferences?.sendForSignature) {
      await this.permissionValidator.recordUsage('dual_signature');
    }
  }

  /**
   * Generar recomendaciones
   */
  private generateContractRecommendations(contractData: any, contractResult: any): string[] {
    const recommendations: string[] = [];

    if (contractData.estimateData.confidence < 0.8) {
      recommendations.push('Verifica la precisión del estimado base antes de enviar el contrato');
    }

    if (!contractData.clientData.email) {
      recommendations.push('Agrega email del cliente para envío automático del contrato');
    }

    if (contractData.paymentTerms.totalAmount > 10000) {
      recommendations.push('Proyecto de alto valor - considera requerir garantías adicionales');
    }

    if (!contractData.contractorData.license) {
      recommendations.push('Agrega número de licencia de contratista al perfil');
    }

    return recommendations;
  }

  /**
   * Generar próximos pasos
   */
  private generateContractNextSteps(request: ContractRequest, signatureLinks?: any): string[] {
    const nextSteps: string[] = [];

    if (signatureLinks) {
      nextSteps.push('Enviar enlace de firma al cliente');
      nextSteps.push('Firmar contrato como contratista');
      nextSteps.push('Hacer seguimiento del proceso de firma');
    } else {
      nextSteps.push('Revisar contrato generado');
      nextSteps.push('Enviar contrato al cliente para revisión');
      nextSteps.push('Programar reunión para firma presencial');
    }

    nextSteps.push('Verificar permisos necesarios antes de iniciar trabajo');
    nextSteps.push('Programar fecha de inicio del proyecto');

    return nextSteps;
  }

  // Métodos auxiliares
  private generateDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7); // 7 días a partir de hoy
    return date.toISOString().split('T')[0];
  }

  private generateDefaultCompletionDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 37); // 30 días de trabajo + 7 días de inicio
    return date.toISOString().split('T')[0];
  }

  private generateDefaultPaymentTerms(totalAmount: number): any {
    return {
      totalAmount,
      milestones: [
        {
          title: 'Inicio del proyecto',
          percentage: 30,
          description: 'Pago inicial para materiales y comienzo de trabajos'
        },
        {
          title: 'Progreso 50%',
          percentage: 40,
          description: 'Pago por avance del 50% del proyecto'
        },
        {
          title: 'Finalización',
          percentage: 30,
          description: 'Pago final al completar el proyecto'
        }
      ]
    };
  }

  private generateBasicContractHTML(contractData: any): string {
    return `
      <html>
        <head>
          <title>Contrato ${contractData.contractId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 2rem; }
            .section { margin-bottom: 1.5rem; }
            .signature-area { margin-top: 3rem; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CONTRATO DE CONSTRUCCIÓN</h1>
            <p>Contrato ID: ${contractData.contractId}</p>
            <p>Fecha: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h2>PARTES</h2>
            <p><strong>Contratista:</strong> ${contractData.contractorData.company}<br>
            Dirección: ${contractData.contractorData.address}<br>
            Teléfono: ${contractData.contractorData.phone}<br>
            Email: ${contractData.contractorData.email}</p>

            <p><strong>Cliente:</strong> ${contractData.clientData.name}<br>
            Dirección: ${contractData.clientData.address}<br>
            Teléfono: ${contractData.clientData.phone}<br>
            Email: ${contractData.clientData.email}</p>
          </div>

          <div class="section">
            <h2>DESCRIPCIÓN DEL PROYECTO</h2>
            <p>${contractData.projectDetails.description}</p>
            <p><strong>Fecha de inicio:</strong> ${contractData.projectDetails.startDate}</p>
            <p><strong>Fecha de finalización:</strong> ${contractData.projectDetails.completionDate}</p>
          </div>

          <div class="section">
            <h2>TÉRMINOS FINANCIEROS</h2>
            <p><strong>Monto total:</strong> $${contractData.paymentTerms.totalAmount.toFixed(2)}</p>
            <h3>Cronograma de pagos:</h3>
            <ul>
              ${contractData.paymentTerms.milestones.map((milestone: any) => `
                <li>${milestone.title} (${milestone.percentage}%): $${(contractData.paymentTerms.totalAmount * milestone.percentage / 100).toFixed(2)}</li>
              `).join('')}
            </ul>
          </div>

          <div class="signature-area">
            <div>
              <p>_________________________</p>
              <p><strong>Contratista</strong><br>${contractData.contractorData.company}</p>
            </div>
            <div>
              <p>_________________________</p>
              <p><strong>Cliente</strong><br>${contractData.clientData.name}</p>
            </div>
          </div>

          <p style="margin-top: 2rem; font-size: 0.9em; color: #666;">
            Contrato generado automáticamente por Mervin AI - ${new Date().toLocaleString()}
          </p>
        </body>
      </html>
    `;
  }
}
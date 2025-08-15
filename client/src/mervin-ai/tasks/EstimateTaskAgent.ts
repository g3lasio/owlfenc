/**
 * ESTIMATE TASK AGENT - AGENTE ESPECIALIZADO EN ESTIMADOS
 * 
 * Agente especializado que maneja completamente la generación de estimados,
 * desde la interpretación de requisitos hasta la entrega final.
 * 
 * Responsabilidades:
 * - Procesamiento inteligente de descripciones de proyectos
 * - Coordinación con DeepSearch AI para materiales y mano de obra
 * - Generación de estimados profesionales
 * - Envío automático de estimados por email
 * - Seguimiento y optimización
 */

export interface EstimateRequest {
  projectDescription: string;
  clientData?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  preferences?: {
    includeDeepSearch?: boolean;
    materialQuality?: 'standard' | 'premium' | 'luxury';
    includeLabor?: boolean;
    sendByEmail?: boolean;
    format?: 'simple' | 'detailed' | 'professional';
  };
  context?: any;
}

export interface EstimateResult {
  success: boolean;
  estimateId?: string;
  estimateData?: any;
  htmlContent?: string;
  pdfUrl?: string;
  emailSent?: boolean;
  error?: string;
  recommendations?: string[];
  nextSteps?: string[];
}

export interface DeepSearchResult {
  materials: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    category: string;
    confidence: number;
  }>;
  labor: Array<{
    task: string;
    hours: number;
    hourlyRate: number;
    totalCost: number;
    category: string;
  }>;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalProjectCost: number;
  recommendations: string[];
  confidence: number;
}

export class EstimateTaskAgent {
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
   * Procesar solicitud completa de estimado
   */
  async processEstimateRequest(request: EstimateRequest): Promise<EstimateResult> {
    try {
      console.log('🔍 [ESTIMATE-AGENT] Procesando solicitud de estimado:', request.projectDescription);

      // 1. Validar permisos
      const permissionCheck = await this.permissionValidator.validatePermission(
        request.preferences?.includeDeepSearch ? 'ai_estimates' : 'basic_estimates'
      );
      
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: `Permisos insuficientes: ${permissionCheck.reason}`,
          recommendations: ['Considera actualizar tu plan para acceder a esta función']
        };
      }

      // 2. Enriquecer datos del cliente
      const enrichedClientData = await this.enrichClientData(request.clientData);

      // 3. Analizar descripción del proyecto
      const projectAnalysis = await this.analyzeProjectDescription(request.projectDescription);

      // 4. Decidir si usar DeepSearch o estimado básico
      let estimateData;
      if (request.preferences?.includeDeepSearch && projectAnalysis.complexity === 'complex') {
        estimateData = await this.generateDeepSearchEstimate(request, projectAnalysis);
      } else {
        estimateData = await this.generateBasicEstimate(request, projectAnalysis);
      }

      // 5. Generar formato de presentación
      const htmlContent = await this.generateEstimateHTML(estimateData, request.preferences?.format || 'professional');

      // 6. Enviar por email si se solicita
      let emailSent = false;
      if (request.preferences?.sendByEmail && enrichedClientData.email) {
        emailSent = await this.sendEstimateByEmail(estimateData, htmlContent, enrichedClientData.email);
      }

      // 7. Registrar uso del permiso
      await this.permissionValidator.recordUsage(
        request.preferences?.includeDeepSearch ? 'ai_estimates' : 'basic_estimates'
      );

      // 8. Generar recomendaciones y próximos pasos
      const recommendations = this.generateRecommendations(estimateData, projectAnalysis);
      const nextSteps = this.generateNextSteps(estimateData, request);

      return {
        success: true,
        estimateId: estimateData.id,
        estimateData,
        htmlContent,
        emailSent,
        recommendations,
        nextSteps
      };

    } catch (error) {
      console.error('❌ [ESTIMATE-AGENT] Error procesando estimado:', error);
      
      return {
        success: false,
        error: `Error generando estimado: ${(error as Error).message}`,
        recommendations: [
          'Verifica que la descripción del proyecto sea clara y detallada',
          'Asegúrate de tener una conexión estable a internet'
        ]
      };
    }
  }

  /**
   * Enriquecer datos del cliente con información existente
   */
  private async enrichClientData(clientData?: EstimateRequest['clientData']): Promise<any> {
    if (!clientData) {
      return { name: 'Cliente', email: null, phone: null, address: null };
    }

    try {
      // Buscar cliente existente en la base de datos
      const existingClients = await this.endpointCoordinator.executeEndpoint('/api/clients', {
        search: clientData.name
      });

      if (existingClients && existingClients.length > 0) {
        const existingClient = existingClients[0];
        return {
          name: clientData.name,
          email: clientData.email || existingClient.email,
          phone: clientData.phone || existingClient.phone,
          address: clientData.address || existingClient.address,
          id: existingClient.id
        };
      }

      return clientData;
    } catch (error) {
      console.warn('⚠️ [ESTIMATE-AGENT] No se pudo buscar cliente existente:', error);
      return clientData;
    }
  }

  /**
   * Analizar descripción del proyecto
   */
  private async analyzeProjectDescription(description: string): Promise<any> {
    // Análisis básico de la descripción
    const analysis = {
      projectType: this.detectProjectType(description),
      complexity: this.assessComplexity(description),
      materials: this.extractMentionedMaterials(description),
      dimensions: this.extractDimensions(description),
      location: this.extractLocation(description),
      urgency: this.assessUrgency(description),
      keywords: this.extractKeywords(description)
    };

    console.log('🔍 [ESTIMATE-AGENT] Análisis del proyecto:', analysis);
    return analysis;
  }

  /**
   * Generar estimado con DeepSearch AI
   */
  private async generateDeepSearchEstimate(request: EstimateRequest, analysis: any): Promise<any> {
    try {
      console.log('🧠 [ESTIMATE-AGENT] Usando DeepSearch AI para estimado avanzado');

      // Preparar payload para DeepSearch
      const deepSearchPayload = {
        projectDescription: request.projectDescription,
        projectType: analysis.projectType,
        dimensions: analysis.dimensions,
        clientData: request.clientData,
        preferences: {
          materialQuality: request.preferences?.materialQuality || 'standard',
          includeLabor: request.preferences?.includeLabor !== false
        }
      };

      // Ejecutar DeepSearch
      const deepSearchResult = await this.endpointCoordinator.executeEndpoint('/api/deepsearch', deepSearchPayload);

      // Procesar resultado y crear estimado
      const estimateData = {
        id: `EST-${Date.now()}`,
        type: 'ai_enhanced',
        projectDescription: request.projectDescription,
        clientData: request.clientData,
        materials: deepSearchResult.materials || [],
        labor: deepSearchResult.labor || [],
        totals: {
          materials: deepSearchResult.totalMaterialCost || 0,
          labor: deepSearchResult.totalLaborCost || 0,
          total: deepSearchResult.totalProjectCost || 0
        },
        analysis,
        confidence: deepSearchResult.confidence || 0.8,
        createdAt: new Date().toISOString()
      };

      return estimateData;
    } catch (error) {
      console.warn('⚠️ [ESTIMATE-AGENT] DeepSearch falló, usando estimado básico como fallback');
      return this.generateBasicEstimate(request, analysis);
    }
  }

  /**
   * Generar estimado básico
   */
  private async generateBasicEstimate(request: EstimateRequest, analysis: any): Promise<any> {
    try {
      console.log('📊 [ESTIMATE-AGENT] Generando estimado básico');

      // Preparar payload para estimado básico
      const estimatePayload = {
        projectDescription: request.projectDescription,
        projectType: analysis.projectType,
        clientData: request.clientData,
        dimensions: analysis.dimensions
      };

      // Ejecutar endpoint de estimados básicos
      const estimateResult = await this.endpointCoordinator.executeEndpoint('/api/estimates', estimatePayload);

      // Estructurar datos del estimado
      const estimateData = {
        id: estimateResult.estimateId || `EST-${Date.now()}`,
        type: 'basic',
        projectDescription: request.projectDescription,
        clientData: request.clientData,
        items: estimateResult.items || [],
        totals: {
          subtotal: estimateResult.subtotal || 0,
          tax: estimateResult.tax || 0,
          total: estimateResult.total || 0
        },
        analysis,
        confidence: 0.7,
        createdAt: new Date().toISOString()
      };

      return estimateData;
    } catch (error) {
      // Si falla el endpoint, crear estimado simulado básico
      console.warn('⚠️ [ESTIMATE-AGENT] Endpoint de estimados falló, generando estimado simulado');
      
      return {
        id: `EST-${Date.now()}`,
        type: 'simulated',
        projectDescription: request.projectDescription,
        clientData: request.clientData,
        items: this.generateSimulatedItems(analysis),
        totals: this.calculateSimulatedTotals(analysis),
        analysis,
        confidence: 0.5,
        createdAt: new Date().toISOString(),
        note: 'Estimado simulado - datos aproximados'
      };
    }
  }

  /**
   * Generar HTML del estimado
   */
  private async generateEstimateHTML(estimateData: any, format: string): Promise<string> {
    try {
      // Usar el servicio de generación HTML si está disponible
      const htmlResult = await this.endpointCoordinator.executeEndpoint('/api/mervin/estimate/html', {
        estimateData,
        format
      });

      return htmlResult.html || this.generateBasicHTML(estimateData);
    } catch (error) {
      console.warn('⚠️ [ESTIMATE-AGENT] Servicio HTML falló, generando HTML básico');
      return this.generateBasicHTML(estimateData);
    }
  }

  /**
   * Enviar estimado por email
   */
  private async sendEstimateByEmail(estimateData: any, htmlContent: string, email: string): Promise<boolean> {
    try {
      console.log('📧 [ESTIMATE-AGENT] Enviando estimado por email a:', email);

      const emailPayload = {
        to: email,
        subject: `Estimado #${estimateData.id} - ${estimateData.clientData?.name || 'Cliente'}`,
        htmlContent,
        attachments: [] // Se podría agregar PDF si está disponible
      };

      await this.endpointCoordinator.executeEndpoint('/api/centralized-email', emailPayload);
      return true;
    } catch (error) {
      console.error('❌ [ESTIMATE-AGENT] Error enviando email:', error);
      return false;
    }
  }

  /**
   * Generar recomendaciones
   */
  private generateRecommendations(estimateData: any, analysis: any): string[] {
    const recommendations: string[] = [];

    if (estimateData.confidence < 0.7) {
      recommendations.push('Considera proporcionar más detalles del proyecto para un estimado más preciso');
    }

    if (analysis.urgency === 'high') {
      recommendations.push('Proyecto marcado como urgente - considera ajustes en cronograma y recursos');
    }

    if (estimateData.type === 'simulated') {
      recommendations.push('Este es un estimado simulado - confirma detalles antes de presentar al cliente');
    }

    if (estimateData.totals.total > 5000) {
      recommendations.push('Proyecto de alto valor - considera generar contrato formal');
    }

    return recommendations;
  }

  /**
   * Generar próximos pasos
   */
  private generateNextSteps(estimateData: any, request: EstimateRequest): string[] {
    const nextSteps: string[] = [];

    nextSteps.push('Revisar y aprobar el estimado generado');

    if (!request.preferences?.sendByEmail) {
      nextSteps.push('Considerar envío por email al cliente');
    }

    if (estimateData.totals.total > 1000) {
      nextSteps.push('Evaluar generación de contrato formal');
    }

    nextSteps.push('Hacer seguimiento con el cliente en 2-3 días');
    nextSteps.push('Programar cita para medición en sitio si es necesario');

    return nextSteps;
  }

  // Métodos auxiliares para análisis
  private detectProjectType(description: string): string {
    const fenceKeywords = ['cerca', 'fence', 'valla', 'cerco'];
    const roofKeywords = ['techo', 'roof', 'tejado'];
    const constructionKeywords = ['construcción', 'build', 'construir'];

    if (fenceKeywords.some(keyword => description.toLowerCase().includes(keyword))) {
      return 'fence';
    } else if (roofKeywords.some(keyword => description.toLowerCase().includes(keyword))) {
      return 'roofing';
    } else if (constructionKeywords.some(keyword => description.toLowerCase().includes(keyword))) {
      return 'construction';
    }
    
    return 'general';
  }

  private assessComplexity(description: string): 'simple' | 'complex' | 'very_complex' {
    const complexityIndicators = [
      description.length > 200,
      /\d+/.test(description), // contiene números
      /(material|tipo|calidad)/i.test(description),
      /(urgente|rápido|pronto)/i.test(description)
    ];

    const complexityScore = complexityIndicators.filter(Boolean).length;
    
    if (complexityScore >= 3) return 'very_complex';
    if (complexityScore >= 2) return 'complex';
    return 'simple';
  }

  private extractMentionedMaterials(description: string): string[] {
    const materialKeywords = ['madera', 'wood', 'vinilo', 'vinyl', 'metal', 'concreto', 'concrete'];
    return materialKeywords.filter(material => 
      description.toLowerCase().includes(material)
    );
  }

  private extractDimensions(description: string): any {
    const dimensionRegex = /(\d+(?:\.\d+)?)\s*(ft|feet|pies?|metros?|m)\b/gi;
    const matches = Array.from(description.matchAll(dimensionRegex));
    
    return {
      found: matches.length > 0,
      dimensions: matches.map(match => ({
        value: parseFloat(match[1]),
        unit: match[2]
      }))
    };
  }

  private extractLocation(description: string): string | null {
    // Extracto básico de ubicación
    const locationRegex = /en\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/;
    const match = description.match(locationRegex);
    return match ? match[1] : null;
  }

  private assessUrgency(description: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['urgente', 'urgent', 'rápido', 'quick', 'asap', 'pronto'];
    const hasUrgentKeywords = urgentKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );
    
    return hasUrgentKeywords ? 'high' : 'medium';
  }

  private extractKeywords(description: string): string[] {
    const words = description.toLowerCase().split(/\s+/);
    const relevantWords = words.filter(word => 
      word.length > 3 && 
      !['que', 'para', 'con', 'por', 'una', 'the', 'and', 'for', 'with'].includes(word)
    );
    
    return relevantWords.slice(0, 10); // Top 10 keywords
  }

  private generateSimulatedItems(analysis: any): any[] {
    const baseItems = [
      { name: 'Materiales básicos', quantity: 1, unit: 'lote', price: 500 },
      { name: 'Mano de obra', quantity: 1, unit: 'servicio', price: 800 }
    ];

    if (analysis.projectType === 'fence') {
      baseItems.push(
        { name: 'Postes', quantity: 10, unit: 'pieza', price: 25 },
        { name: 'Paneles', quantity: 8, unit: 'pieza', price: 75 }
      );
    }

    return baseItems;
  }

  private calculateSimulatedTotals(analysis: any): any {
    let baseTotal = 1300; // Base para proyecto simple
    
    if (analysis.complexity === 'complex') baseTotal *= 1.5;
    if (analysis.complexity === 'very_complex') baseTotal *= 2;
    
    const subtotal = baseTotal;
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }

  private generateBasicHTML(estimateData: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h1>Estimado #${estimateData.id}</h1>
        <h2>Cliente: ${estimateData.clientData?.name || 'N/A'}</h2>
        <h3>Descripción del Proyecto:</h3>
        <p>${estimateData.projectDescription}</p>
        
        <h3>Detalles del Estimado:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${estimateData.items?.map((item: any) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity} ${item.unit}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">$${item.price?.toFixed(2) || '0.00'}</td>
            </tr>
          `).join('') || '<tr><td colspan="3">No hay elementos disponibles</td></tr>'}
        </table>
        
        <h3>Total: $${estimateData.totals?.total?.toFixed(2) || '0.00'}</h3>
        
        <p><em>Generado automáticamente por Mervin AI - ${new Date().toLocaleDateString()}</em></p>
      </div>
    `;
  }
}
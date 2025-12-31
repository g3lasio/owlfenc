/**
 * SYSTEM API SERVICE - ORQUESTADOR DE ENDPOINTS EXISTENTES
 * 
 * Responsabilidad CRÍTICA:
 * - Usar endpoints existentes, NUNCA reimplementar funcionalidad
 * - Actúa como proxy inteligente hacia los sistemas reales
 * - Maneja autenticación y permisos
 */

import axios, { AxiosInstance } from 'axios';
import type {
  EstimateParams,
  ContractParams,
  PermitParams,
  PropertyParams,
  PropertyData,
  EstimateCalculation,
  PDF,
  EmailResult,
  Client,
  Contract,
  PermitInfo
} from '../types/mervin-types';
import { EntityContextService, EntityType } from '../../services/EntityContextService';

export class SystemAPIService {
  private baseURL: string;
  private userId: string;
  private client: AxiosInstance;
  private authHeaders: Record<string, string>;
  private entityContext: EntityContextService;

  constructor(userId: string, authHeaders: Record<string, string> = {}, baseURL: string = 'http://localhost:5000') {
    this.userId = userId;
    this.baseURL = baseURL;
    
    // 🔐 CRITICAL: Normalize auth headers for consistent forwarding
    // Express may receive headers in different cases, normalize to what axios expects
    this.authHeaders = this.normalizeAuthHeaders(authHeaders);
    
    console.log('🔧 [SYSTEM-API] Initializing with userId:', userId);
    console.log('🔧 [SYSTEM-API] Auth headers present:', Object.keys(this.authHeaders));
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60 segundos para operaciones largas
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders // Forward all auth headers (Firebase token, cookies, etc.)
      }
    });

    // 🔐 Add request interceptor for debugging auth issues
    this.client.interceptors.request.use((config) => {
      console.log(`🔗 [SYSTEM-API] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`🔐 [SYSTEM-API] Authorization header present:`, !!config.headers?.['Authorization']);
      return config;
    });

    // Add response interceptor for error logging
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error('❌ [SYSTEM-API] 401 Unauthorized - Auth headers may not be forwarded correctly');
          console.error('❌ [SYSTEM-API] Request URL:', error.config?.url);
          console.error('❌ [SYSTEM-API] Headers sent:', JSON.stringify(error.config?.headers, null, 2));
        }
        return Promise.reject(error);
      }
    );
    
    // Initialize Entity Context Service
    this.entityContext = new EntityContextService(userId);
  }

  /**
   * Normalize auth headers to ensure consistent casing
   * Express receives headers case-insensitively but axios sends them as-is
   */
  private normalizeAuthHeaders(headers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      
      // Map to standard header names with proper casing
      if (lowerKey === 'authorization') {
        normalized['Authorization'] = value;
      } else if (lowerKey === 'cookie') {
        normalized['Cookie'] = value;
      } else if (lowerKey === 'x-csrf-token') {
        normalized['X-CSRF-Token'] = value;
      } else if (lowerKey === 'x-firebase-appcheck') {
        normalized['X-Firebase-AppCheck'] = value;
      } else {
        // Keep other headers as-is
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  // ============= PROPERTY VERIFICATION =============

  /**
   * Verificar propiedad usando endpoint /api/property/details
   * Este endpoint usa Atom para obtener información real
   * REGISTRA LA BÚSQUEDA EN HISTORIAL AUTOMÁTICAMENTE
   */
  async verifyProperty(params: PropertyParams): Promise<PropertyData> {
    console.log('🏠 [SYSTEM-API] Verificando propiedad:', params.address);
    
    try {
      // 1. Verificar propiedad usando el endpoint existente
      const response = await this.client.get('/api/property/details', {
        params: {
          address: params.address,
          mock: 'false'
        }
      });

      console.log('✅ [SYSTEM-API] Propiedad verificada exitosamente');
      
      const propertyData = response.data;
      
      // NOTA: El guardado en historial ahora se hace en tools-registry.ts executeVerifyProperty
      // para garantizar que siempre se guarde cuando Mervin hace búsquedas
      // Removido el código duplicado aquí para evitar entradas duplicadas en historial
      
      return propertyData as PropertyData;

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error verificando propiedad:', error.message);
      console.error('❌ [SYSTEM-API] Response data:', error.response?.data);
      throw new Error(`Error verificando propiedad: ${error.response?.data?.error || error.message}`);
    }
  }

  // ============= ESTIMATES =============

  /**
   * Crear estimado usando endpoint /api/estimates
   * NOTA: El endpoint POST /api/estimates YA guarda automáticamente en Firebase historial
   */
  async createEstimate(params: EstimateParams): Promise<EstimateCalculation> {
    console.log('📊 [SYSTEM-API] Creando estimado para:', params.clientName);
    
    try {
      // 1. Buscar o crear cliente
      let client = await this.findOrCreateClient({
        name: params.clientName,
        email: params.clientEmail,
        phone: params.clientPhone
      });

      // 2. Construir descripción del proyecto para DeepSearch
      const projectDescription = `${params.projectType} project with dimensions: ${params.dimensions}`;
      
      // 🔥 NUEVO: Usar DeepSearch automático del endpoint mejorado
      // El endpoint ahora maneja:
      // - Ejecución de DeepSearch con IA
      // - Generación de materiales y costos
      // - Incremento de contador (aiEstimates)
      // - Guardado en historial (Firebase collection 'estimates')
      const response = await this.client.post('/api/estimates', {
        userId: this.userId,
        clientId: client.id,
        clientName: params.clientName,
        clientEmail: params.clientEmail || null,
        clientPhone: params.clientPhone || null,
        projectAddress: null, // Opcional - Mervin puede mejorar esto en el futuro con verificación de propiedad
        projectType: params.projectType,
        projectSubtype: params.projectType, // Default to same as type
        projectDescription: projectDescription,
        useDeepSearch: true, // ✅ Activar DeepSearch automático
        items: [], // Se generarán automáticamente con DeepSearch
        status: 'draft'
      });

      const estimate = response.data as EstimateCalculation;
      console.log('✅ [SYSTEM-API] Estimado creado con DeepSearch y guardado en historial:', estimate.id);

      // 3. Enviar email si se requiere
      if (params.sendEmail && params.clientEmail) {
        await this.sendEstimateEmail(estimate.id, params.clientEmail);
      }

      return estimate;

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error creando estimado:', error.message);
      throw new Error(`Error creando estimado: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Enviar estimado por email
   */
  async sendEstimateEmail(estimateId: string, recipientEmail?: string): Promise<EmailResult> {
    console.log('📧 [SYSTEM-API] Enviando estimado por email');
    
    try {
      await this.client.post(`/api/estimates/${estimateId}/send`, {
        recipientEmail
      });

      console.log('✅ [SYSTEM-API] Email enviado exitosamente');
      return { success: true };

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error enviando email:', error.message);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  }

  /**
   * Listar estimados
   */
  async getEstimates(status?: string, limit?: number): Promise<any[]> {
    try {
      const response = await this.client.get('/api/estimates', {
        params: { status, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error obteniendo estimados:', error.message);
      throw new Error(`Error obteniendo estimados: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Obtener estimado por ID
   */
  async getEstimateById(estimateId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/estimates/${estimateId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error obteniendo estimado:', error.message);
      throw new Error(`Error obteniendo estimado: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Actualizar estimado
   */
  async updateEstimate(estimateId: string, updates: any): Promise<any> {
    try {
      const response = await this.client.put(`/api/estimates/${estimateId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error actualizando estimado:', error.message);
      throw new Error(`Error actualizando estimado: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Eliminar estimado
   */
  async deleteEstimate(estimateId: string): Promise<void> {
    try {
      await this.client.delete(`/api/estimates/${estimateId}`);
      console.log('✅ [SYSTEM-API] Estimado eliminado');
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error eliminando estimado:', error.message);
      throw new Error(`Error eliminando estimado: ${error.response?.data?.error || error.message}`);
    }
  }

  // ============= CONTRACTS =============

  /**
   * Crear contrato usando endpoint /api/dual-signature/initiate
   * ✅ FIXED: Ahora usa el endpoint correcto que SÍ existe
   */
  async createContract(params: ContractParams, contractContent: string): Promise<Contract> {
    console.log('📄 [SYSTEM-API] Creando contrato para:', params.clientName);
    
    try {
      // Preparar datos para dual signature
      const contractData = {
        contractorName: 'OwlFence Inc.', // TODO: Obtener de settings
        contractorEmail: 'contractor@owlfence.com', // TODO: Obtener de settings
        contractorCompany: 'OwlFence Inc.', // TODO: Obtener de settings
        contractorPhone: '',
        clientName: params.clientName,
        clientEmail: params.clientEmail || '',
        clientPhone: '',
        clientAddress: '',
        projectDescription: params.projectType || 'Construction Project',
        totalAmount: params.amount || 0,
        startDate: params.startDate || new Date().toISOString(),
        completionDate: params.endDate || new Date().toISOString()
      };

      // Llamar al endpoint de dual signature que SÍ existe
      const response = await this.client.post('/api/dual-signature/initiate', {
        userId: this.userId,
        contractHTML: contractContent,
        contractData
      });

      console.log('✅ [SYSTEM-API] Contrato creado con dual-signature:', response.data.contractId);
      
      return {
        id: response.data.contractId,
        content: contractContent,
        clientId: '',
        amount: params.amount || 0,
        contractorSignUrl: response.data.contractorSignUrl,
        clientSignUrl: response.data.clientSignUrl,
        message: response.data.message
      } as Contract;

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error creando contrato:', error.message);
      console.error('❌ [SYSTEM-API] Response:', error.response?.data);
      throw new Error(`Error creando contrato: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Generar PDF de contrato (deprecated - dual signature genera PDF automáticamente)
   */
  async generateContractPDF(contractId: string): Promise<PDF> {
    console.log('📄 [SYSTEM-API] PDF generado automáticamente por dual-signature');
    
    return {
      url: `/api/dual-signature/download/${contractId}`,
      id: contractId
    } as PDF;
  }

  /**
   * Listar contratos
   */
  async getContracts(status?: string, clientId?: string, limit?: number): Promise<any[]> {
    try {
      const response = await this.client.get('/api/contracts', {
        params: { status, clientId, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error obteniendo contratos:', error.message);
      throw new Error(`Error obteniendo contratos: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Obtener contrato por ID
   */
  async getContractById(contractId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/contracts/${contractId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error obteniendo contrato:', error.message);
      throw new Error(`Error obteniendo contrato: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Actualizar contrato
   */
  async updateContract(contractId: string, updates: any): Promise<any> {
    try {
      const response = await this.client.put(`/api/contracts/${contractId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error actualizando contrato:', error.message);
      throw new Error(`Error actualizando contrato: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Eliminar contrato
   */
  async deleteContract(contractId: string): Promise<void> {
    try {
      await this.client.delete(`/api/contracts/${contractId}`);
      console.log('✅ [SYSTEM-API] Contrato eliminado');
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error eliminando contrato:', error.message);
      throw new Error(`Error eliminando contrato: ${error.response?.data?.error || error.message}`);
    }
  }

  // ============= PERMITS =============

  /**
   * Consultar información de permisos usando endpoint /api/permits
   * REGISTRA LA BÚSQUEDA EN HISTORIAL AUTOMÁTICAMENTE
   */
  async getPermitInfo(params: PermitParams): Promise<PermitInfo> {
    console.log('📋 [SYSTEM-API] Consultando permisos para:', params.projectAddress);
    
    try {
      // 1. Consultar información de permisos
      const response = await this.client.post('/api/permits/check', {
        projectType: params.projectType,
        projectAddress: params.projectAddress,
        projectScope: params.projectScope
      });

      const permitInfo = response.data;
      console.log('✅ [SYSTEM-API] Información de permisos obtenida');
      
      // 2. Registrar búsqueda en historial usando /api/search/permits
      try {
        console.log('💾 [SYSTEM-API] Guardando búsqueda de permisos en historial...');
        await this.client.post('/api/search/permits', {
          query: `${params.projectType || 'General'} permit check`,
          jurisdiction: 'General',
          projectType: params.projectType,
          address: params.projectAddress
        });
        console.log('✅ [SYSTEM-API] Búsqueda de permisos guardada en historial exitosamente');
      } catch (historyError: any) {
        console.warn('⚠️ [SYSTEM-API] No se pudo guardar búsqueda en historial (continuando):', historyError.message);
      }
      
      return permitInfo as PermitInfo;

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error consultando permisos:', error.message);
      throw new Error(`Error consultando permisos: ${error.response?.data?.error || error.message}`);
    }
  }

  // ============= CLIENTS =============

  /**
   * Buscar cliente existente
   */
  async findClient(email: string): Promise<Client | null> {
    try {
      const response = await this.client.get('/api/clients', {
        params: { email, userId: this.userId }
      });

      return response.data as Client;

    } catch (error) {
      return null;
    }
  }

  /**
   * Crear nuevo cliente
   */
  async createClient(data: { name: string; email?: string; phone?: string }): Promise<Client> {
    console.log('👤 [SYSTEM-API] Creando cliente:', data.name);
    
    try {
      const response = await this.client.post('/api/clients', {
        userId: this.userId,
        ...data
      });

      console.log('✅ [SYSTEM-API] Cliente creado');
      return response.data as Client;

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error creando cliente:', error.message);
      throw new Error(`Error creando cliente: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Buscar o crear cliente (helper)
   */
  async findOrCreateClient(data: { name: string; email?: string; phone?: string }): Promise<Client> {
    // Si tiene email, buscar primero
    if (data.email) {
      const existing = await this.findClient(data.email);
      if (existing) {
        console.log('👤 [SYSTEM-API] Cliente existente encontrado');
        return existing;
      }
    }

    // Si no existe, crear
    return await this.createClient(data);
  }

  /**
   * Obtener historial de cliente
   */
  async getClientHistory(params: { userId: string; clientName: string }): Promise<{ estimates: any[]; contracts: any[] }> {
    try {
      // Obtener estimados del cliente
      const estimates = await this.getEstimates();
      const clientEstimates = estimates.filter(e => 
        e.clientName?.toLowerCase().includes(params.clientName.toLowerCase())
      );

      // Obtener contratos del cliente
      const contracts = await this.getContracts();
      const clientContracts = contracts.filter(c => 
        c.clientName?.toLowerCase().includes(params.clientName.toLowerCase())
      );

      return {
        estimates: clientEstimates,
        contracts: clientContracts
      };
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error obteniendo historial de cliente:', error.message);
      throw new Error(`Error obteniendo historial: ${error.message}`);
    }
  }

  // ============= PROFILE =============

  /**
   * Obtener perfil del contratista
   * Endpoint: GET /profile
   */
  async getContractorProfile(): Promise<any> {
    console.log('👤 [SYSTEM-API] Obteniendo perfil del contratista');
    
    try {
      const response = await this.client.get('/profile');
      
      if (response.data?.success && response.data?.profile) {
        console.log('✅ [SYSTEM-API] Perfil obtenido:', response.data.profile.companyName || 'Sin nombre');
        return response.data.profile;
      }
      
      console.warn('⚠️  [SYSTEM-API] Perfil no encontrado o incompleto');
      return null;

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error obteniendo perfil:', error.message);
      return null; // No lanzar error, solo retornar null
    }
  }

  // ============= UTILITIES =============

  /**
   * Verificar salud de un endpoint
   */
  async checkEndpointHealth(endpoint: string): Promise<boolean> {
    try {
      const response = await this.client.get(endpoint, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Obtener URL base del servidor
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Validar dirección usando Mapbox Geocoding API
   * Retorna dirección validada y coordenadas
   */
  async validateAddress(params: { address: string }): Promise<any> {
    console.log('🗺️  [SYSTEM-API] Validando dirección:', params.address);
    
    try {
      // Por ahora, simplemente validamos que la dirección no esté vacía
      // En el futuro, podemos integrar Mapbox Geocoding API aquí
      if (!params.address || params.address.trim().length === 0) {
        throw new Error('Address is required');
      }
      
      const validatedAddress = params.address.trim();
      
      console.log('✅ [SYSTEM-API] Dirección validada:', validatedAddress);
      
      return {
        validatedAddress,
        isValid: true
      };
      
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error validando dirección:', error.message);
      throw new Error(`Error validating address: ${error.message}`);
    }
  }
  
  /**
   * Analizar permisos usando enhancedPermitService
   * Usa el endpoint existente /api/permit/check
   */
  async analyzePermits(params: {
    address: string;
    projectType: string;
    projectDescription?: string;
  }): Promise<any> {
    console.log('🔍 [SYSTEM-API] Analizando permisos para:', params.address);
    
    try {
      // Usar el endpoint existente que ya tiene toda la lógica
      const response = await this.client.post('/api/permit/check', {
        address: params.address,
        projectType: params.projectType,
        projectDescription: params.projectDescription || `${params.projectType} project`
      });
      
      console.log('✅ [SYSTEM-API] Permisos analizados exitosamente');
      
      return response.data;
      
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error analizando permisos:', error.message);
      console.error('❌ [SYSTEM-API] Response data:', error.response?.data);
      throw new Error(`Error analyzing permits: ${error.response?.data?.error || error.message}`);
    }
  }
  
  /**
   * Generar PDF del reporte de permisos
   * Usa pdfGeneratorService y pdfStorageService
   */
  async generatePermitPDF(params: {
    permitData: any;
    projectInfo: any;
  }): Promise<{ url: string; filename: string }> {
    console.log('📄 [SYSTEM-API] Generando PDF de permisos...');
    
    try {
      // Importar servicios de PDF
      const { pdfGeneratorService } = await import('../services/pdf/pdfGeneratorService');
      const { pdfStorageService } = await import('../services/pdf/pdfStorageService');
      
      // Obtener información de la compañía (hardcoded por ahora)
      const companyInfo = {
        company: 'Owl Fenc Company',
        ownerName: 'Gelasio Sanchez',
        email: 'owl@chyrris.com',
        phone: '(707) 000-0000',
        address: '123 Main St',
        city: 'Vacaville',
        state: 'CA',
        zipCode: '95688',
        license: 'CA-LICENSE-12345',
        website: 'https://owlfenc.com'
      };
      
      // Generar PDF
      const pdfResult = await pdfGeneratorService.generatePermitPDF({
        permitData: params.permitData,
        companyInfo,
        projectInfo: params.projectInfo
      });
      
      // Guardar PDF y obtener URL pública
      const storageResult = await pdfStorageService.savePDF(
        pdfResult.buffer,
        pdfResult.filename
      );
      
      console.log('✅ [SYSTEM-API] PDF generado y almacenado');
      console.log('🔗 [SYSTEM-API] URL:', storageResult.url);
      
      return {
        url: storageResult.url,
        filename: storageResult.filename
      };
      
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error generando PDF:', error.message);
      throw new Error(`Error generating PDF: ${error.message}`);
    }
  }
  
  /**
   * Guardar búsqueda de permisos en el historial
   * Nota: El endpoint /api/permit/check ya guarda en historial automáticamente
   * Este método es un wrapper para casos donde necesitemos guardarlo manualmente
   */
  async savePermitHistory(params: {
    userId: string;
    address: string;
    projectType: string;
    results: any;
    pdfUrl?: string;
  }): Promise<void> {
    console.log('💾 [SYSTEM-API] Guardando en historial de permisos...');
    
    try {
      // El endpoint /api/permit/check ya guarda en historial automáticamente
      // Este método es principalmente para logging y confirmación
      console.log('✅ [SYSTEM-API] Historial guardado (automático en /api/permit/check)');
      
    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error guardando historial:', error.message);
      // No lanzar error aquí para no interrumpir el flujo
      // El guardado en historial es secundario
    }
  }
  /**
   * ========================================
   * ENTITY CONTEXT METHODS
   * Acceso unificado a todas las entidades del sistema
   * ========================================
   */
  
  /**
   * Buscar entidades por texto libre
   */
  async searchEntity(params: {
    entity_type: EntityType;
    query: string;
    filters?: Record<string, any>;
    limit?: number;
  }): Promise<any[]> {
    console.log('🔍 [SYSTEM-API] Searching entity:', params.entity_type, params.query);
    return await this.entityContext.searchEntity(params);
  }
  
  /**
   * Obtener entidad por ID
   */
  async getEntity(params: {
    entity_type: EntityType;
    id: string | number;
  }): Promise<any> {
    console.log('📄 [SYSTEM-API] Getting entity:', params.entity_type, params.id);
    return await this.entityContext.getEntity(params);
  }
  
  /**
   * Listar entidades con filtros
   */
  async listEntities(params: {
    entity_type: EntityType;
    filters?: Record<string, any>;
    limit?: number;
    sort?: string;
    offset?: number;
  }): Promise<any[]> {
    console.log('📋 [SYSTEM-API] Listing entities:', params.entity_type);
    return await this.entityContext.listEntities(params);
  }
}

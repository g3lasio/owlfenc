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

export class SystemAPIService {
  private baseURL: string;
  private userId: string;
  private client: AxiosInstance;
  private authHeaders: Record<string, string>;

  constructor(userId: string, authHeaders: Record<string, string> = {}, baseURL: string = 'http://localhost:5000') {
    this.userId = userId;
    this.baseURL = baseURL;
    this.authHeaders = authHeaders;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60 segundos para operaciones largas
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders // Forward all auth headers (Firebase token, cookies, etc.)
      }
    });
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
      
      // 2. Registrar búsqueda en historial usando /api/search/property
      try {
        console.log('💾 [SYSTEM-API] Guardando búsqueda de propiedad en historial...');
        await this.client.post('/api/search/property', {
          address: params.address,
          city: propertyData.property?.address?.city,
          state: propertyData.property?.address?.state,
          zipCode: propertyData.property?.address?.zip
        });
        console.log('✅ [SYSTEM-API] Búsqueda guardada en historial exitosamente');
      } catch (historyError: any) {
        console.warn('⚠️ [SYSTEM-API] No se pudo guardar en historial (continuando):', historyError.message);
        // No lanzar error - la búsqueda fue exitosa aunque no se guardó en historial
      }
      
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

      // 2. Crear el estimado (se guarda automáticamente en historial Firebase)
      const response = await this.client.post('/api/estimates', {
        userId: this.userId,
        clientId: client.id,
        projectType: params.projectType,
        dimensions: params.dimensions
      });

      const estimate = response.data as EstimateCalculation;
      console.log('✅ [SYSTEM-API] Estimado creado y guardado en historial:', estimate.id);

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
  async sendEstimateEmail(estimateId: string, email: string): Promise<EmailResult> {
    console.log('📧 [SYSTEM-API] Enviando estimado por email:', email);
    
    try {
      const response = await this.client.post('/api/estimates/send', {
        estimateId,
        email
      });

      console.log('✅ [SYSTEM-API] Email enviado exitosamente');
      return { success: true, messageId: response.data.messageId };

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error enviando email:', error.message);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  }

  // ============= CONTRACTS =============

  /**
   * Crear contrato usando endpoint /api/contracts
   * REGISTRA EN HISTORIAL AUTOMÁTICAMENTE usando /api/contracts/save
   */
  async createContract(params: ContractParams, contractContent: string): Promise<Contract> {
    console.log('📄 [SYSTEM-API] Creando contrato para:', params.clientName);
    
    try {
      // 1. Buscar o crear cliente
      let client = await this.findOrCreateClient({
        name: params.clientName,
        email: params.clientEmail
      });

      // 2. Crear el contrato
      const response = await this.client.post('/api/contracts', {
        userId: this.userId,
        clientId: client.id,
        content: contractContent,
        amount: params.amount,
        projectType: params.projectType,
        projectAddress: params.projectAddress,
        startDate: params.startDate,
        endDate: params.endDate,
        specialTerms: params.specialTerms
      });

      const contract = response.data as Contract;
      console.log('✅ [SYSTEM-API] Contrato creado:', contract.id);
      
      // 3. Guardar en historial usando /api/contracts/save
      try {
        console.log('💾 [SYSTEM-API] Guardando contrato en historial...');
        await this.client.post('/api/contracts/save', {
          contractData: {
            contractData: {
              clientName: params.clientName,
              clientAddress: params.clientAddress || '',
              projectType: params.projectType || 'Construction Project',
              projectDescription: params.projectDescription || '',
              projectLocation: params.projectAddress || '',
              contractorName: params.contractorName || '',
              totalAmount: params.amount?.toString() || '0',
              clientPhone: params.clientPhone || '',
              clientEmail: params.clientEmail || '',
              startDate: params.startDate || new Date().toISOString(),
              completionDate: params.endDate || new Date().toISOString()
            },
            html: contractContent
          },
          name: `Contract for ${params.clientName}`,
          status: 'generated'
        });
        console.log('✅ [SYSTEM-API] Contrato guardado en historial exitosamente');
      } catch (historyError: any) {
        console.warn('⚠️ [SYSTEM-API] No se pudo guardar contrato en historial (continuando):', historyError.message);
        // No lanzar error - el contrato fue creado exitosamente
      }

      return contract;

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error creando contrato:', error.message);
      throw new Error(`Error creando contrato: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Generar PDF de contrato
   */
  async generateContractPDF(contractId: string): Promise<PDF> {
    console.log('📄 [SYSTEM-API] Generando PDF de contrato:', contractId);
    
    try {
      const response = await this.client.post('/api/contracts/pdf', {
        contractId
      });

      console.log('✅ [SYSTEM-API] PDF generado exitosamente');
      return response.data as PDF;

    } catch (error: any) {
      console.error('❌ [SYSTEM-API] Error generando PDF:', error.message);
      throw new Error(`Error generando PDF: ${error.response?.data?.error || error.message}`);
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
          jurisdiction: params.jurisdiction || 'General',
          permitType: params.permitType,
          projectType: params.projectType,
          address: params.projectAddress,
          city: params.city,
          state: params.state,
          zipCode: params.zipCode
        });
        console.log('✅ [SYSTEM-API] Búsqueda de permisos guardada en historial exitosamente');
      } catch (historyError: any) {
        console.warn('⚠️ [SYSTEM-API] No se pudo guardar búsqueda en historial (continuando):', historyError.message);
        // No lanzar error - la búsqueda fue exitosa
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
}

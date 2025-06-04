/**
 * Servicio de PDF con PDF Monkey para Owl Fence
 * Maneja la generación de PDFs de estimados y contratos
 */

import axios from 'axios';

export interface EstimateData {
  estimateNumber: string;
  date: string;
  client: {
    name: string;
    email: string;
    address: string;
    phone: string;
  };
  contractor: {
    companyName: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    license?: string;
    insurancePolicy?: string;
    logo?: string;
    website?: string;
  };
  project: {
    type: string;
    description: string;
    location: string;
    scopeOfWork: string;
  };
  items: Array<{
    id: string;
    name: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
  validUntil: string;
}

export interface ContractData {
  contractNumber: string;
  date: string;
  client: {
    name: string;
    email: string;
    address: string;
    phone: string;
  };
  contractor: {
    companyName: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    license?: string;
    insurancePolicy?: string;
    logo?: string;
  };
  project: {
    description: string;
    location: string;
    scopeOfWork: string;
    startDate: string;
    estimatedDuration: string;
  };
  pricing: {
    totalAmount: number;
    depositAmount: number;
    balanceAmount: number;
    paymentTerms: string;
  };
  terms: string;
}

class PDFMonkeyService {
  private apiKey: string;
  private baseURL = 'https://api.pdfmonkey.io/api/v1';
  
  constructor() {
    this.apiKey = process.env.PDFMONKEY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ PDFMONKEY_API_KEY no está configurado');
    }
  }

  /**
   * Generar PDF de estimado usando PDF Monkey
   */
  async generateEstimatePDF(data: EstimateData, templateId?: string): Promise<Buffer> {
    console.log('📄 [PDF-Monkey] Iniciando generación de estimado PDF...');
    console.log('📄 [PDF-Monkey] Template ID:', templateId || 'sin especificar');
    console.log('📄 [PDF-Monkey] Datos del estimado:', {
      estimateNumber: data.estimateNumber,
      clientName: data.client.name,
      itemsCount: data.items.length,
      total: data.total
    });

    if (!this.apiKey) {
      throw new Error('PDF Monkey API key no configurado');
    }

    try {
      // Usar template por defecto si no se proporciona
      const finalTemplateId = templateId || 'estimate_default';
      
      // Preparar datos para PDF Monkey
      const pdfData = {
        document: {
          document_template_id: finalTemplateId,
          payload: {
            // Información del estimado
            estimate_number: data.estimateNumber,
            date: data.date,
            valid_until: data.validUntil,
            
            // Cliente
            client_name: data.client.name,
            client_email: data.client.email,
            client_address: data.client.address,
            client_phone: data.client.phone,
            
            // Contratista
            company_name: data.contractor.companyName,
            contractor_name: data.contractor.name,
            contractor_email: data.contractor.email,
            contractor_phone: data.contractor.phone,
            contractor_address: data.contractor.address,
            contractor_city: data.contractor.city,
            contractor_state: data.contractor.state,
            contractor_zipcode: data.contractor.zipCode,
            contractor_license: data.contractor.license || 'N/A',
            contractor_insurance: data.contractor.insurancePolicy || 'N/A',
            contractor_logo: data.contractor.logo || '',
            contractor_website: data.contractor.website || '',
            
            // Proyecto
            project_type: data.project.type,
            project_description: data.project.description,
            project_location: data.project.location,
            scope_of_work: data.project.scopeOfWork,
            
            // Items del estimado
            items: data.items.map(item => ({
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unitPrice,
              total: item.total
            })),
            
            // Totales
            subtotal: data.subtotal,
            tax_rate: data.taxRate,
            tax_amount: data.tax,
            total_amount: data.total,
            
            // Notas adicionales
            notes: data.notes || '',
            
            // Información adicional
            generated_date: new Date().toISOString(),
            currency: 'USD'
          },
          meta: {
            _filename: `estimate_${data.estimateNumber}.pdf`
          }
        }
      };

      console.log('📄 [PDF-Monkey] Enviando petición a PDF Monkey...');
      console.log('📄 [PDF-Monkey] Payload items count:', pdfData.document.payload.items.length);

      const response = await axios.post(
        `${this.baseURL}/documents/sync`,
        pdfData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 segundos timeout
        }
      );

      console.log('✅ [PDF-Monkey] Respuesta exitosa:', {
        status: response.status,
        documentId: response.data?.document?.id,
        filename: response.data?.document?.filename
      });

      if (response.data?.document?.download_url) {
        console.log('📄 [PDF-Monkey] Descargando PDF desde URL...');
        
        const pdfResponse = await axios.get(response.data.document.download_url, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        console.log('✅ [PDF-Monkey] PDF descargado exitosamente, tamaño:', pdfResponse.data.length, 'bytes');
        return Buffer.from(pdfResponse.data);
      } else {
        throw new Error('No se recibió URL de descarga del PDF');
      }

    } catch (error: any) {
      console.error('❌ [PDF-Monkey] Error generando estimado PDF:', error);
      
      if (error.response) {
        console.error('❌ [PDF-Monkey] Error de respuesta:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`PDF Monkey API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('❌ [PDF-Monkey] Error de red:', error.message);
        throw new Error(`Error de conexión con PDF Monkey: ${error.message}`);
      } else {
        console.error('❌ [PDF-Monkey] Error interno:', error.message);
        throw new Error(`Error interno: ${error.message}`);
      }
    }
  }

  /**
   * Generar PDF de contrato usando PDF Monkey
   */
  async generateContractPDF(data: ContractData, templateId?: string): Promise<Buffer> {
    console.log('📄 [PDF-Monkey] Iniciando generación de contrato PDF...');
    console.log('📄 [PDF-Monkey] Contract Template ID:', templateId || 'sin especificar');

    if (!this.apiKey) {
      throw new Error('PDF Monkey API key no configurado');
    }

    try {
      const finalTemplateId = templateId || 'contract_default';
      
      const pdfData = {
        document: {
          document_template_id: finalTemplateId,
          payload: {
            // Información del contrato
            contract_number: data.contractNumber,
            date: data.date,
            
            // Cliente
            client_name: data.client.name,
            client_email: data.client.email,
            client_address: data.client.address,
            client_phone: data.client.phone,
            
            // Contratista
            company_name: data.contractor.companyName,
            contractor_name: data.contractor.name,
            contractor_email: data.contractor.email,
            contractor_phone: data.contractor.phone,
            contractor_address: data.contractor.address,
            contractor_city: data.contractor.city,
            contractor_state: data.contractor.state,
            contractor_zipcode: data.contractor.zipCode,
            contractor_license: data.contractor.license || 'N/A',
            contractor_insurance: data.contractor.insurancePolicy || 'N/A',
            contractor_logo: data.contractor.logo || '',
            
            // Proyecto
            project_description: data.project.description,
            project_location: data.project.location,
            scope_of_work: data.project.scopeOfWork,
            start_date: data.project.startDate,
            estimated_duration: data.project.estimatedDuration,
            
            // Precios
            total_amount: data.pricing.totalAmount,
            deposit_amount: data.pricing.depositAmount,
            balance_amount: data.pricing.balanceAmount,
            payment_terms: data.pricing.paymentTerms,
            
            // Términos
            contract_terms: data.terms,
            
            // Información adicional
            generated_date: new Date().toISOString(),
            currency: 'USD'
          },
          meta: {
            _filename: `contract_${data.contractNumber}.pdf`
          }
        }
      };

      console.log('📄 [PDF-Monkey] Enviando petición de contrato a PDF Monkey...');

      const response = await axios.post(
        `${this.baseURL}/documents/sync`,
        pdfData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      console.log('✅ [PDF-Monkey] Contrato generado exitosamente');

      if (response.data?.document?.download_url) {
        const pdfResponse = await axios.get(response.data.document.download_url, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        console.log('✅ [PDF-Monkey] Contrato PDF descargado exitosamente');
        return Buffer.from(pdfResponse.data);
      } else {
        throw new Error('No se recibió URL de descarga del contrato PDF');
      }

    } catch (error: any) {
      console.error('❌ [PDF-Monkey] Error generando contrato PDF:', error);
      
      if (error.response) {
        console.error('❌ [PDF-Monkey] Error de respuesta del contrato:', {
          status: error.response.status,
          data: error.response.data
        });
        throw new Error(`PDF Monkey Contract API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`Error generando contrato: ${error.message}`);
      }
    }
  }

  /**
   * Verificar estado del servicio PDF Monkey
   */
  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('⚠️ [PDF-Monkey] API key no configurado para health check');
      return false;
    }

    try {
      console.log('🔍 [PDF-Monkey] Verificando estado del servicio...');
      
      // Hacer una petición simple para verificar conectividad
      const response = await axios.get(`${this.baseURL}/documents`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000
      });

      console.log('✅ [PDF-Monkey] Servicio activo y accesible');
      return response.status === 200;
    } catch (error: any) {
      console.error('❌ [PDF-Monkey] Health check falló:', error.message);
      return false;
    }
  }

  /**
   * Listar templates disponibles
   */
  async listTemplates(): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error('PDF Monkey API key no configurado');
    }

    try {
      console.log('📋 [PDF-Monkey] Obteniendo lista de templates...');
      
      const response = await axios.get(`${this.baseURL}/document_templates`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000
      });

      console.log('✅ [PDF-Monkey] Templates obtenidos:', response.data?.length || 0);
      return response.data || [];
    } catch (error: any) {
      console.error('❌ [PDF-Monkey] Error obteniendo templates:', error.message);
      throw error;
    }
  }
}

export const pdfMonkeyService = new PDFMonkeyService();
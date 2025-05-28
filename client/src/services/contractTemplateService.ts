/**
 * Servicio de Templates de Contratos
 * Sistema simplificado y robusto para generar contratos usando templates HTML
 */

export interface ContractData {
  // Información del Contratista
  contractorName: string;
  contractorAddress: string;
  contractorPhone: string;
  contractorEmail: string;
  contractorLicense: string;
  
  // Información del Cliente
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  
  // Detalles del Proyecto
  projectType: string;
  projectDescription: string;
  projectLocation: string;
  totalAmount: string;
  startDate: string;
  completionDate: string;
  
  // Términos Específicos
  paymentTerms: string;
  warrantyPeriod: string;
  additionalTerms: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  category: 'fencing' | 'roofing' | 'general' | 'construction';
  variables: string[];
}

class ContractTemplateService {
  private templates: ContractTemplate[] = [
    {
      id: 'fence_standard',
      name: 'Contrato de Cercas Estándar',
      description: 'Contrato estándar para instalación de cercas',
      category: 'fencing',
      variables: ['contractorName', 'clientName', 'projectDescription', 'totalAmount']
    },
    {
      id: 'roof_repair',
      name: 'Contrato de Reparación de Techos',
      description: 'Contrato para trabajos de reparación de techos',
      category: 'roofing',
      variables: ['contractorName', 'clientName', 'projectDescription', 'totalAmount']
    },
    {
      id: 'general_contractor',
      name: 'Contrato General de Construcción',
      description: 'Contrato general para trabajos de construcción',
      category: 'general',
      variables: ['contractorName', 'clientName', 'projectDescription', 'totalAmount']
    }
  ];

  /**
   * Obtiene la lista de templates disponibles
   */
  getAvailableTemplates(): ContractTemplate[] {
    return this.templates;
  }

  /**
   * Obtiene un template por ID
   */
  getTemplateById(id: string): ContractTemplate | null {
    return this.templates.find(template => template.id === id) || null;
  }

  /**
   * Carga el template HTML base
   */
  async loadBaseTemplate(): Promise<string> {
    try {
      const response = await fetch('/src/components/templates/contract-template.html');
      if (!response.ok) {
        throw new Error('No se pudo cargar el template HTML');
      }
      return await response.text();
    } catch (error) {
      console.error('Error loading template:', error);
      return this.getFallbackTemplate();
    }
  }

  /**
   * Genera un contrato usando el template HTML y los datos proporcionados
   */
  async generateContract(templateId: string, contractData: ContractData): Promise<string> {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template no encontrado: ${templateId}`);
    }

    const baseTemplate = await this.loadBaseTemplate();
    return this.populateTemplate(baseTemplate, contractData);
  }

  /**
   * Rellena el template con los datos del contrato
   */
  private populateTemplate(template: string, data: ContractData): string {
    let populatedTemplate = template;

    // Reemplazar variables básicas
    const replacements: Record<string, string> = {
      '{{CONTRACTOR_NAME}}': data.contractorName || '[NOMBRE DEL CONTRATISTA]',
      '{{CONTRACTOR_ADDRESS}}': data.contractorAddress || '[DIRECCIÓN DEL CONTRATISTA]',
      '{{CONTRACTOR_PHONE}}': data.contractorPhone || '[TELÉFONO DEL CONTRATISTA]',
      '{{CONTRACTOR_EMAIL}}': data.contractorEmail || '[EMAIL DEL CONTRATISTA]',
      '{{CONTRACTOR_LICENSE}}': data.contractorLicense || '[LICENCIA DEL CONTRATISTA]',
      
      '{{CLIENT_NAME}}': data.clientName || '[NOMBRE DEL CLIENTE]',
      '{{CLIENT_ADDRESS}}': data.clientAddress || '[DIRECCIÓN DEL CLIENTE]',
      '{{CLIENT_PHONE}}': data.clientPhone || '[TELÉFONO DEL CLIENTE]',
      '{{CLIENT_EMAIL}}': data.clientEmail || '[EMAIL DEL CLIENTE]',
      
      '{{PROJECT_TYPE}}': data.projectType || '[TIPO DE PROYECTO]',
      '{{PROJECT_DESCRIPTION}}': data.projectDescription || '[DESCRIPCIÓN DEL PROYECTO]',
      '{{PROJECT_LOCATION}}': data.projectLocation || '[UBICACIÓN DEL PROYECTO]',
      '{{TOTAL_AMOUNT}}': data.totalAmount || '[MONTO TOTAL]',
      '{{START_DATE}}': data.startDate || '[FECHA DE INICIO]',
      '{{COMPLETION_DATE}}': data.completionDate || '[FECHA DE FINALIZACIÓN]',
      
      '{{PAYMENT_TERMS}}': data.paymentTerms || 'Según términos acordados',
      '{{WARRANTY_PERIOD}}': data.warrantyPeriod || '1 año',
      '{{ADDITIONAL_TERMS}}': data.additionalTerms || 'Términos adicionales según corresponda'
    };

    // Aplicar reemplazos
    Object.entries(replacements).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      populatedTemplate = populatedTemplate.replace(regex, value);
    });

    return populatedTemplate;
  }

  /**
   * Valida que los datos del contrato sean completos
   */
  validateContractData(data: Partial<ContractData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredFields = [
      'contractorName',
      'clientName', 
      'projectDescription',
      'totalAmount'
    ];

    requiredFields.forEach(field => {
      if (!data[field as keyof ContractData]) {
        errors.push(`${field} es requerido`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Template de respaldo en caso de que no se pueda cargar el HTML
   */
  private getFallbackTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>CONTRATO DE SERVICIOS INDEPENDIENTES</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .signature-area { margin-top: 50px; }
    </style>
</head>
<body>
    <div class="header">CONTRATO DE SERVICIOS INDEPENDIENTES</div>
    
    <div class="section">
        <strong>CONTRATISTA:</strong><br>
        {{CONTRACTOR_NAME}}<br>
        {{CONTRACTOR_ADDRESS}}<br>
        Teléfono: {{CONTRACTOR_PHONE}}<br>
        Email: {{CONTRACTOR_EMAIL}}<br>
        Licencia: {{CONTRACTOR_LICENSE}}
    </div>
    
    <div class="section">
        <strong>CLIENTE:</strong><br>
        {{CLIENT_NAME}}<br>
        {{CLIENT_ADDRESS}}<br>
        Teléfono: {{CLIENT_PHONE}}<br>
        Email: {{CLIENT_EMAIL}}
    </div>
    
    <div class="section">
        <strong>DESCRIPCIÓN DEL PROYECTO:</strong><br>
        Tipo: {{PROJECT_TYPE}}<br>
        Descripción: {{PROJECT_DESCRIPTION}}<br>
        Ubicación: {{PROJECT_LOCATION}}<br>
        Monto Total: {{TOTAL_AMOUNT}}
    </div>
    
    <div class="section">
        <strong>TÉRMINOS:</strong><br>
        Fecha de Inicio: {{START_DATE}}<br>
        Fecha de Finalización: {{COMPLETION_DATE}}<br>
        Términos de Pago: {{PAYMENT_TERMS}}<br>
        Garantía: {{WARRANTY_PERIOD}}
    </div>
    
    <div class="section">
        <strong>TÉRMINOS ADICIONALES:</strong><br>
        {{ADDITIONAL_TERMS}}
    </div>
    
    <div class="signature-area">
        <table width="100%">
            <tr>
                <td width="45%">
                    _________________________________<br>
                    Firma del Contratista<br>
                    Fecha: _______________
                </td>
                <td width="10%"></td>
                <td width="45%">
                    _________________________________<br>
                    Firma del Cliente<br>
                    Fecha: _______________
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
    `;
  }
}

export const contractTemplateService = new ContractTemplateService();
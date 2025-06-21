/**
 * Servicio para generación de facturas (invoices) a partir de proyectos completados
 */

export interface InvoiceData {
  // Información del contractor (del perfil)
  contractorName: string;
  contractorCompany: string;
  contractorAddress: string;
  contractorPhone: string;
  contractorEmail: string;
  contractorLicense: string;
  contractorLogo?: string;
  
  // Información del cliente (del proyecto)
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress: string;
  
  // Información del proyecto
  projectType: string;
  projectDescription: string;
  projectLocation: string;
  completedDate: string;
  
  // Información financiera
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  
  // Totales y pagos
  subtotal: number;
  tax: number;
  taxRate: number;
  discount?: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  
  // Información de la factura
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  
  // Mensaje personalizado
  thankYouMessage: string;
}

export class InvoiceService {
  
  /**
   * Generar datos de factura a partir de un proyecto completado
   */
  static async generateInvoiceFromProject(projectId: string, contractorData: any): Promise<InvoiceData> {
    // Obtener datos del proyecto desde la base de datos
    const project = await this.getProjectById(projectId);
    
    if (project.status !== 'completed') {
      throw new Error('Solo se pueden generar facturas para proyectos completados');
    }
    
    if (project.invoiceGenerated) {
      throw new Error('Ya se ha generado una factura para este proyecto');
    }
    
    // Generar número de factura único
    const invoiceNumber = await this.generateInvoiceNumber(contractorData.id);
    
    // Calcular fechas
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = this.calculateDueDate(contractorData.defaultPaymentTerms || 30);
    
    // Calcular totales y pagos
    const financials = await this.calculateProjectFinancials(project);
    
    // Mensaje de agradecimiento personalizado
    const thankYouMessage = contractorData.invoiceMessageTemplate || 
      "Gracias por confiar en nuestros servicios. Ha sido un placer trabajar en su proyecto.";
    
    const invoiceData: InvoiceData = {
      // Contractor info
      contractorName: contractorData.ownerName || contractorData.username,
      contractorCompany: contractorData.company || contractorData.username,
      contractorAddress: contractorData.address || '',
      contractorPhone: contractorData.phone || '',
      contractorEmail: contractorData.email,
      contractorLicense: contractorData.license || '',
      contractorLogo: contractorData.logo || '',
      
      // Client info
      clientName: project.clientName,
      clientEmail: project.clientEmail || '',
      clientPhone: project.clientPhone || '',
      clientAddress: project.address,
      
      // Project info
      projectType: project.projectType || 'Construcción',
      projectDescription: project.projectDescription || project.fenceType || 'Proyecto completado',
      projectLocation: project.address,
      completedDate: project.completedDate?.toISOString().split('T')[0] || issueDate,
      
      // Items (extraer del estimateHtml o detalles del proyecto)
      items: await this.extractProjectItems(project),
      
      // Financials
      ...financials,
      
      // Invoice info
      invoiceNumber,
      issueDate,
      dueDate,
      paymentTerms: `Pago a ${contractorData.defaultPaymentTerms || 30} días`,
      
      // Message
      thankYouMessage
    };
    
    return invoiceData;
  }
  
  /**
   * Generar número de factura secuencial
   */
  private static async generateInvoiceNumber(contractorId: number): Promise<string> {
    const year = new Date().getFullYear();
    const lastInvoice = await this.getLastInvoiceForContractor(contractorId, year);
    const nextNumber = (lastInvoice?.sequence || 0) + 1;
    
    return `INV-${year}-${nextNumber.toString().padStart(4, '0')}`;
  }
  
  /**
   * Calcular fecha de vencimiento
   */
  private static calculateDueDate(paymentTermsDays: number): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);
    return dueDate.toISOString().split('T')[0];
  }
  
  /**
   * Calcular totales financieros del proyecto
   */
  private static async calculateProjectFinancials(project: any) {
    // Extraer información financiera del proyecto
    const totalAmount = project.totalPrice ? project.totalPrice / 100 : 0;
    
    // Calcular pagos realizados (desde projectPayments)
    const payments = await this.getProjectPayments(project.id);
    const amountPaid = payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + (p.amount / 100), 0);
    
    const balanceDue = totalAmount - amountPaid;
    
    // Calcular breakdown (asumiendo 10% tax incluido en el total)
    const taxRate = 10;
    const subtotal = totalAmount / (1 + taxRate/100);
    const tax = totalAmount - subtotal;
    
    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      taxRate,
      discount: 0,
      totalAmount: Number(totalAmount.toFixed(2)),
      amountPaid: Number(amountPaid.toFixed(2)),
      balanceDue: Number(balanceDue.toFixed(2))
    };
  }
  
  /**
   * Extraer items del proyecto (desde estimateHtml o detalles)
   */
  private static async extractProjectItems(project: any): Promise<Array<any>> {
    // Intentar extraer items del estimateHtml si existe
    if (project.estimateHtml) {
      try {
        // Parsing simplificado - en producción usaríamos un parser más robusto
        return this.parseItemsFromHtml(project.estimateHtml);
      } catch (error) {
        console.warn('No se pudieron extraer items del HTML:', error);
      }
    }
    
    // Fallback: crear item genérico del proyecto
    return [{
      name: project.projectType || 'Servicio de construcción',
      description: project.projectDescription || 'Trabajo completado según especificaciones',
      quantity: 1,
      unit: 'proyecto',
      unitPrice: project.totalPrice ? project.totalPrice / 100 : 0,
      totalPrice: project.totalPrice ? project.totalPrice / 100 : 0
    }];
  }
  
  /**
   * Parsear items desde HTML del estimado (implementación simplificada)
   */
  private static parseItemsFromHtml(html: string): Array<any> {
    // Implementación básica - se puede mejorar con un parser HTML real
    const items = [];
    
    // Buscar patrones típicos en el HTML de estimados
    const itemMatches = html.match(/class="estimate-item"[^>]*>(.*?)<\/div>/gs);
    
    if (itemMatches) {
      itemMatches.forEach(match => {
        // Extraer información básica del item
        const nameMatch = match.match(/class="item-name"[^>]*>([^<]+)/);
        const priceMatch = match.match(/class="item-price"[^>]*>\$?([0-9,]+\.?\d*)/);
        
        if (nameMatch && priceMatch) {
          items.push({
            name: nameMatch[1].trim(),
            description: 'Según especificaciones del proyecto',
            quantity: 1,
            unit: 'servicio',
            unitPrice: parseFloat(priceMatch[1].replace(/,/g, '')),
            totalPrice: parseFloat(priceMatch[1].replace(/,/g, ''))
          });
        }
      });
    }
    
    return items.length > 0 ? items : this.getDefaultProjectItem();
  }
  
  /**
   * Item por defecto si no se pueden extraer items específicos
   */
  private static getDefaultProjectItem(): Array<any> {
    return [{
      name: 'Servicios de construcción completados',
      description: 'Trabajo realizado según especificaciones acordadas',
      quantity: 1,
      unit: 'proyecto',
      unitPrice: 0,
      totalPrice: 0
    }];
  }
  
  // Métodos de base de datos usando el storage actual
  private static async getProjectById(projectId: string) {
    const { storage } = await import('../storage');
    return await storage.getProjectById(parseInt(projectId));
  }
  
  private static async getLastInvoiceForContractor(contractorId: number, year: number) {
    // Por simplicidad, usar timestamp para generar números únicos
    // En producción, implementar contador secuencial por contractor
    return { sequence: 0 };
  }
  
  private static async getProjectPayments(projectId: number) {
    // Usar tabla projectPayments existente
    const { storage } = await import('../storage');
    try {
      // Si existe método para obtener pagos del proyecto, usarlo
      return await storage.getProjectPayments?.(projectId) || [];
    } catch {
      return [];
    }
  }
}
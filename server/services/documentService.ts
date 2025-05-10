
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

interface DocumentData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  fenceType: string;
  fenceHeight: number;
  linearFeet: number;
  demolition: boolean;
  painting: boolean;
  gates: Array<{type: string; width: number; price: number}>;
  breakdown: {
    posts: number;
    concrete: number;
    rails: number;
    pickets: number;
    hardware: number;
  };
  costs: {
    materials: number;
    labor: number;
    subtotal: number;
    tax: number;
    total: number;
  };
  contractorInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    license: string;
  };
}

export class DocumentService {
  private async loadTemplate(templatePath: string): Promise<string> {
    const fullPath = path.join(process.cwd(), 'client/src/components/templates', templatePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  private replaceTemplateVariables(template: string, data: DocumentData): string {
    // Verificar y establecer valores predeterminados para evitar errores
    const safeData = {
      contractorInfo: {
        name: data.contractorInfo?.name || 'OWL FENC LLC',
        phone: data.contractorInfo?.phone || '(202) 549-3519',
        email: data.contractorInfo?.email || 'contacto@owlfenc.com',
        address: data.contractorInfo?.address || '2901 Owens Ct, Fairfield, CA 94534 US',
        license: data.contractorInfo?.license || 'Pendiente'
      },
      clientName: data.clientName || 'Cliente',
      clientPhone: data.clientPhone || 'Pendiente',
      clientEmail: data.clientEmail || 'Pendiente',
      clientAddress: data.clientAddress || 'Pendiente',
      fenceType: data.fenceType || 'Cercado de madera',
      fenceHeight: data.fenceHeight || 6,
      fenceLength: data.fenceLength || 0,
      projectTotal: data.projectTotal || 0,
      depositPercent: data.depositPercent || 30,
      startDate: data.startDate || 'A determinar',
      completionDate: data.completionDate || 'A determinar'
    };
    
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
    
    console.log("Reemplazando variables de la plantilla con datos:", safeData);
    
    return template
      .replace(/{{contractorName}}/g, safeData.contractorInfo.name)
      .replace(/{{contractorPhone}}/g, safeData.contractorInfo.phone)
      .replace(/{{contractorEmail}}/g, safeData.contractorInfo.email)
      .replace(/{{contractorAddress}}/g, safeData.contractorInfo.address)
      .replace(/{{contractorLicense}}/g, safeData.contractorInfo.license)
      .replace(/{{clientName}}/g, safeData.clientName)
      .replace(/{{clientPhone}}/g, safeData.clientPhone)
      .replace(/{{clientEmail}}/g, safeData.clientEmail)
      .replace(/{{clientAddress}}/g, safeData.clientAddress)
      .replace(/{{fenceDetails.type}}/g, safeData.fenceType)
      .replace(/{{fenceDetails.height}}/g, safeData.fenceHeight.toString())
      .replace(/{{fenceDetails.length}}/g, data.linearFeet.toString())
      .replace(/{{breakdown.posts}}/g, formatCurrency(data.breakdown.posts))
      .replace(/{{breakdown.concrete}}/g, formatCurrency(data.breakdown.concrete))
      .replace(/{{breakdown.rails}}/g, formatCurrency(data.breakdown.rails))
      .replace(/{{breakdown.pickets}}/g, formatCurrency(data.breakdown.pickets))
      .replace(/{{breakdown.hardware}}/g, formatCurrency(data.breakdown.hardware))
      .replace(/{{subtotal}}/g, formatCurrency(data.costs.subtotal))
      .replace(/{{total}}/g, formatCurrency(data.costs.total));
  }

  /**
   * Genera un PDF a partir de HTML usando puppeteer
   * @param html Contenido HTML para convertir a PDF
   * @returns Buffer con el contenido del PDF
   */
  async generatePdfFromHtml(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });

      // Convertir a Buffer de Node.js si no lo es ya
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async generateDocument(data: DocumentData, type: 'estimate' | 'contract'): Promise<Buffer> {
    const templatePath = type === 'estimate' ? 'template-estimate.html' : 'contract-template.html';
    const template = await this.loadTemplate(templatePath);
    const filledTemplate = this.replaceTemplateVariables(template, data);

    return this.generatePdfFromHtml(filledTemplate);
  }
}

export const documentService = new DocumentService();

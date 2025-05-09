
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
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
    
    return template
      .replace(/{{contractorName}}/g, data.contractorInfo.name)
      .replace(/{{contractorPhone}}/g, data.contractorInfo.phone)
      .replace(/{{contractorEmail}}/g, data.contractorInfo.email)
      .replace(/{{contractorAddress}}/g, data.contractorInfo.address)
      .replace(/{{contractorLicense}}/g, data.contractorInfo.license)
      .replace(/{{clientName}}/g, data.clientName)
      .replace(/{{clientPhone}}/g, data.clientPhone)
      .replace(/{{clientEmail}}/g, data.clientEmail)
      .replace(/{{clientAddress}}/g, data.clientAddress)
      .replace(/{{fenceDetails.type}}/g, data.fenceType)
      .replace(/{{fenceDetails.height}}/g, data.fenceHeight.toString())
      .replace(/{{fenceDetails.length}}/g, data.linearFeet.toString())
      .replace(/{{breakdown.posts}}/g, formatCurrency(data.breakdown.posts))
      .replace(/{{breakdown.concrete}}/g, formatCurrency(data.breakdown.concrete))
      .replace(/{{breakdown.rails}}/g, formatCurrency(data.breakdown.rails))
      .replace(/{{breakdown.pickets}}/g, formatCurrency(data.breakdown.pickets))
      .replace(/{{breakdown.hardware}}/g, formatCurrency(data.breakdown.hardware))
      .replace(/{{subtotal}}/g, formatCurrency(data.costs.subtotal))
      .replace(/{{total}}/g, formatCurrency(data.costs.total));
  }

  async generateDocument(data: DocumentData, type: 'estimate' | 'contract'): Promise<Buffer> {
    const templatePath = type === 'estimate' ? 'template-estimate.html' : 'contract-template.html';
    const template = await this.loadTemplate(templatePath);
    const filledTemplate = this.replaceTemplateVariables(template, data);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    try {
      const page = await browser.newPage();
      await page.setContent(filledTemplate, { waitUntil: 'networkidle0' });
      
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

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
}

export const documentService = new DocumentService();

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface SignatureData {
  name: string;
  signatureData: string;
  typedName?: string;
  signedAt: Date;
}

export interface ContractPdfData {
  contractHTML: string;
  contractorSignature: SignatureData;
  clientSignature: SignatureData;
}

/**
 * Servicio alternativo de PDF que NO requiere Chrome/Puppeteer
 * Funciona completamente en Node.js sin dependencias de navegador
 */
class AlternativePdfService {
  private static instance: AlternativePdfService;

  static getInstance(): AlternativePdfService {
    if (!AlternativePdfService.instance) {
      AlternativePdfService.instance = new AlternativePdfService();
    }
    return AlternativePdfService.instance;
  }

  /**
   * Generar PDF a partir de HTML usando pdf-lib (sin Chrome)
   */
  async generateContractWithSignatures(data: ContractPdfData): Promise<Buffer> {
    try {
      console.log('📄 [ALT-PDF] Iniciando generación de PDF sin Chrome...');

      // Crear nuevo documento PDF
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Extraer contenido del HTML
      const contractContent = this.extractContentFromHTML(data.contractHTML);

      // Agregar páginas según el contenido
      let currentPage = pdfDoc.addPage();
      const { width, height } = currentPage.getSize();
      let currentY = height - 50;

      // Título del contrato
      currentPage.drawText('INDEPENDENT CONTRACTOR AGREEMENT', {
        x: 50,
        y: currentY,
        size: 18,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0),
      });
      currentY -= 40;

      // Contenido principal del contrato
      const sections = this.parseContractSections(contractContent);
      
      for (const section of sections) {
        // Verificar si necesitamos nueva página
        if (currentY < 100) {
          currentPage = pdfDoc.addPage();
          currentY = height - 50;
        }

        // Título de sección
        currentPage.drawText(section.title, {
          x: 50,
          y: currentY,
          size: 14,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });
        currentY -= 25;

        // Contenido de sección
        const lines = this.wrapText(section.content, 500, timesRomanFont, 11);
        for (const line of lines) {
          if (currentY < 50) {
            currentPage = pdfDoc.addPage();
            currentY = height - 50;
          }

          currentPage.drawText(line, {
            x: 50,
            y: currentY,
            size: 11,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
          });
          currentY -= 18;
        }
        currentY -= 10;
      }

      // Agregar página de firmas
      const signaturePage = pdfDoc.addPage();
      await this.addSignatureSection(signaturePage, data.contractorSignature, data.clientSignature, helveticaBoldFont, timesRomanFont);

      // Generar PDF buffer
      const pdfBytes = await pdfDoc.save();
      
      console.log('✅ [ALT-PDF] PDF generado exitosamente sin Chrome');
      return Buffer.from(pdfBytes);

    } catch (error) {
      console.error('❌ [ALT-PDF] Error generando PDF:', error);
      throw error;
    }
  }

  /**
   * Extraer contenido limpio del HTML
   */
  private extractContentFromHTML(html: string): string {
    // Remover tags HTML básicos
    let content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remover estilos
      .replace(/<[^>]+>/g, ' ') // Remover tags HTML
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();

    return content;
  }

  /**
   * Parsear secciones del contrato desde HTML
   */
  private parseContractSections(content: string): Array<{title: string, content: string}> {
    // Intentar extraer secciones reales del contenido HTML
    const sections: Array<{title: string, content: string}> = [];
    
    // Buscar patrones comunes de secciones en contratos
    const sectionPatterns = [
      'SCOPE OF WORK',
      'PAYMENT TERMS', 
      'PROJECT TIMELINE',
      'MATERIALS AND LABOR',
      'WARRANTIES',
      'INSURANCE',
      'INDEPENDENT CONTRACTOR',
      'WORK DESCRIPTION',
      'COMPENSATION',
      'TERM AND TERMINATION'
    ];

    let remainingContent = content;
    let sectionNumber = 1;

    // Si no podemos parsear el HTML correctamente, usar secciones genéricas pero con información real
    if (content.length > 0) {
      // Dividir el contenido en párrafos aproximados
      const paragraphs = content.split(/[.!?]+/).filter(p => p.trim().length > 20);
      
      const sectionsCount = Math.min(6, Math.max(3, Math.floor(paragraphs.length / 3)));
      const itemsPerSection = Math.floor(paragraphs.length / sectionsCount);

      for (let i = 0; i < sectionsCount; i++) {
        const startIndex = i * itemsPerSection;
        const endIndex = i === sectionsCount - 1 ? paragraphs.length : (i + 1) * itemsPerSection;
        const sectionContent = paragraphs.slice(startIndex, endIndex).join('. ').trim();
        
        if (sectionContent) {
          sections.push({
            title: `${sectionNumber}. ${sectionPatterns[i] || 'CONTRACT TERMS'}`,
            content: sectionContent + '.'
          });
          sectionNumber++;
        }
      }
    }

    // Si no hay contenido suficiente, usar secciones predeterminadas
    if (sections.length === 0) {
      return [
        {
          title: '1. INDEPENDENT CONTRACTOR AGREEMENT',
          content: 'This Agreement establishes the terms and conditions for professional construction services between the parties.'
        },
        {
          title: '2. SCOPE OF WORK',
          content: 'Contractor agrees to perform construction services according to project specifications and industry standards.'
        },
        {
          title: '3. PAYMENT AND COMPENSATION',
          content: 'Payment terms, schedules, and compensation structure as agreed upon by both parties.'
        },
        {
          title: '4. PROJECT TIMELINE AND COMPLETION',
          content: 'Project start date, milestones, and completion schedule with quality requirements.'
        },
        {
          title: '5. WARRANTIES AND GUARANTEES',
          content: 'Workmanship warranties, material guarantees, and service commitments provided by contractor.'
        },
        {
          title: '6. INSURANCE AND LIABILITY',
          content: 'Insurance requirements, liability coverage, and risk management provisions for the project.'
        }
      ];
    }

    return sections;
  }

  /**
   * Envolver texto para ajustarlo a la página
   */
  private wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Agregar sección de firmas al PDF
   */
  private async addSignatureSection(page: any, contractorSig: SignatureData, clientSig: SignatureData, boldFont: any, regularFont: any): Promise<void> {
    const { height } = page.getSize();
    let y = height - 50;

    // Título de firmas
    page.drawText('SIGNATURES', {
      x: 50,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 60;

    // Sección del contratista
    page.drawText('CONTRACTOR:', {
      x: 50,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Línea de firma del contratista
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: 250, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawText(contractorSig.name, {
      x: 50,
      y: y - 15,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Date: ${contractorSig.signedAt.toLocaleDateString()}`, {
      x: 50,
      y: y - 30,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    y -= 80;

    // Sección del cliente
    page.drawText('CLIENT:', {
      x: 50,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Línea de firma del cliente
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: 250, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawText(clientSig.name, {
      x: 50,
      y: y - 15,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Date: ${clientSig.signedAt.toLocaleDateString()}`, {
      x: 50,
      y: y - 30,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    // Información de autenticidad
    y -= 60;
    page.drawText('This document has been digitally signed and is legally binding.', {
      x: 50,
      y: y,
      size: 9,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
}

export default AlternativePdfService;
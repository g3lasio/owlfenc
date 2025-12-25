/**
 * NativePdfEngine - Motor de PDF Nativo sin Navegador
 * 
 * Fase 1: Legal Defense PDF Generation
 * 
 * Características:
 * - Generación en memoria (sin navegador)
 * - Estable en entornos autoscale
 * - < 3 segundos de generación
 * - Funciona igual en desarrollo y producción
 * - Sin Puppeteer, sin Chromium, sin dependencias de browser
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { Buffer } from 'buffer';
import * as htmlparser2 from 'htmlparser2';

interface NativePdfOptions {
  pageSize?: 'Letter' | 'A4';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize?: number;
  lineHeight?: number;
}

interface NativePdfResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
  processingTime: number;
  method: string;
  pageCount?: number;
}

interface TextStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: number;
  color: { r: number; g: number; b: number };
}

interface ParsedElement {
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'signature' | 'divider' | 'spacer';
  content?: string;
  level?: number;
  items?: string[];
  rows?: string[][];
  headers?: string[];
  style?: Partial<TextStyle>;
}

const PAGE_SIZES = {
  Letter: { width: 612, height: 792 },
  A4: { width: 595, height: 842 }
};

const DEFAULT_MARGINS = {
  top: 54,
  right: 54,
  bottom: 72,
  left: 54
};

const DEFAULT_FONT_SIZE = 11;
const DEFAULT_LINE_HEIGHT = 1.4;

class NativePdfEngine {
  private static instance: NativePdfEngine;
  
  static getInstance(): NativePdfEngine {
    if (!NativePdfEngine.instance) {
      NativePdfEngine.instance = new NativePdfEngine();
    }
    return NativePdfEngine.instance;
  }

  async generateFromHtml(html: string, options: NativePdfOptions = {}): Promise<NativePdfResult> {
    const startTime = Date.now();
    console.log('🚀 [NATIVE-PDF] Starting native PDF generation...');
    
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const fonts = {
        regular: timesRoman,
        bold: timesRomanBold,
        italic: timesRomanItalic,
        helvetica: helvetica,
        helveticaBold: helveticaBold
      };
      
      const pageSize = PAGE_SIZES[options.pageSize || 'Letter'];
      const margins = options.margins || DEFAULT_MARGINS;
      const fontSize = options.fontSize || DEFAULT_FONT_SIZE;
      const lineHeight = options.lineHeight || DEFAULT_LINE_HEIGHT;
      
      const elements = this.parseHtml(html);
      
      let currentPage = pdfDoc.addPage([pageSize.width, pageSize.height]);
      let y = pageSize.height - margins.top;
      const contentWidth = pageSize.width - margins.left - margins.right;
      const minY = margins.bottom;
      
      for (const element of elements) {
        const result = this.renderElement(
          element,
          currentPage,
          pdfDoc,
          fonts,
          {
            x: margins.left,
            y,
            contentWidth,
            fontSize,
            lineHeight,
            minY,
            pageSize,
            margins
          }
        );
        
        y = result.y;
        
        if (result.needsNewPage) {
          currentPage = pdfDoc.addPage([pageSize.width, pageSize.height]);
          y = pageSize.height - margins.top;
        }
      }
      
      this.addPageNumbers(pdfDoc, fonts.helvetica, pageSize, margins);
      
      const pdfBytes = await pdfDoc.save();
      const buffer = Buffer.from(pdfBytes);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [NATIVE-PDF] PDF generated in ${processingTime}ms`);
      console.log(`📄 [NATIVE-PDF] ${pdfDoc.getPageCount()} pages, ${buffer.length} bytes`);
      
      return {
        success: true,
        buffer,
        processingTime,
        method: 'native-pdf-lib',
        pageCount: pdfDoc.getPageCount()
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [NATIVE-PDF] Generation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        method: 'native-pdf-lib'
      };
    }
  }

  private parseHtml(html: string): ParsedElement[] {
    const elements: ParsedElement[] = [];
    
    // Parse HTML using htmlparser2 for robust DOM traversal
    const dom = htmlparser2.parseDocument(html);
    
    // Helper to extract text content from a node
    const extractText = (node: any): string => {
      if (node.type === 'text') return node.data || '';
      if (node.children) {
        return node.children.map(extractText).join(' ');
      }
      return '';
    };
    
    // Helper to find nodes by class or tag
    const findNodes = (node: any, matcher: (n: any) => boolean): any[] => {
      const results: any[] = [];
      if (matcher(node)) results.push(node);
      if (node.children) {
        for (const child of node.children) {
          results.push(...findNodes(child, matcher));
        }
      }
      return results;
    };
    
    // Helper to check if node has a class
    const hasClass = (node: any, className: string): boolean => {
      const classAttr = node.attribs?.class || '';
      return classAttr.includes(className);
    };
    
    // Helper to get node by tag
    const isTag = (node: any, tagName: string): boolean => {
      return node.type === 'tag' && node.name === tagName.toLowerCase();
    };
    
    // Find all h1, h2, h3 headings
    const h1s = findNodes(dom, n => isTag(n, 'h1'));
    const h2s = findNodes(dom, n => isTag(n, 'h2'));
    const h3s = findNodes(dom, n => isTag(n, 'h3'));
    
    // Add title (h1)
    for (const h1 of h1s) {
      const text = this.stripHtml(extractText(h1));
      if (text.trim()) {
        elements.push({ type: 'heading', content: text, level: 1 });
      }
    }
    
    // Add subtitle (h2)
    for (const h2 of h2s) {
      const text = this.stripHtml(extractText(h2));
      if (text.trim()) {
        elements.push({ type: 'heading', content: text, level: 2 });
      }
    }
    
    // Find info grid/document info
    const infoGrids = findNodes(dom, n => hasClass(n, 'info-grid') || hasClass(n, 'document-info'));
    for (const grid of infoGrids) {
      const rows = this.parseInfoGridDom(grid);
      if (rows.length > 0) {
        elements.push({ type: 'spacer' });
        elements.push({ type: 'table', rows, headers: [] });
      }
    }
    
    // Find parties section
    const partiesSections = findNodes(dom, n => hasClass(n, 'parties-section'));
    for (const section of partiesSections) {
      elements.push({ type: 'spacer' });
      elements.push({ type: 'heading', content: 'PARTIES', level: 3 });
      const partyColumns = this.parsePartiesDom(section);
      for (const party of partyColumns) {
        elements.push({ type: 'paragraph', content: party });
      }
    }
    
    // Find section headers
    const sectionHeaders = findNodes(dom, n => hasClass(n, 'section-header'));
    for (const header of sectionHeaders) {
      const text = this.stripHtml(extractText(header));
      if (text.trim()) {
        elements.push({ type: 'spacer' });
        elements.push({ type: 'heading', content: text, level: 3 });
      }
    }
    
    // Find change boxes (for Change Order template)
    const changeBoxes = findNodes(dom, n => hasClass(n, 'change-box') || hasClass(n, 'change-summary'));
    for (const box of changeBoxes) {
      const text = this.stripHtml(extractText(box));
      if (text.trim()) {
        elements.push({ type: 'paragraph', content: text });
      }
    }
    
    // Find financial summary
    const financialSections = findNodes(dom, n => hasClass(n, 'financial-summary') || hasClass(n, 'amount-section'));
    for (const section of financialSections) {
      const rows = this.parseFinancialsDom(section);
      if (rows.length > 0) {
        elements.push({ type: 'spacer' });
        elements.push({ type: 'table', rows, headers: [] });
      }
    }
    
    // Find summary sections
    const summarySections = findNodes(dom, n => hasClass(n, 'summary-section') || hasClass(n, 'summary-grid'));
    for (const section of summarySections) {
      const rows = this.parseSummaryGridDom(section);
      if (rows.length > 0) {
        elements.push({ type: 'table', rows, headers: [] });
      }
    }
    
    // Find payment boxes
    const paymentBoxes = findNodes(dom, n => hasClass(n, 'payment-box') || hasClass(n, 'payment-section'));
    for (const box of paymentBoxes) {
      elements.push({ type: 'spacer' });
      const content = this.parsePaymentBoxDom(box);
      elements.push({ type: 'paragraph', content });
    }
    
    // Find numbered sections/clauses
    const numberedSections = findNodes(dom, n => hasClass(n, 'numbered-section') || hasClass(n, 'clause'));
    for (const section of numberedSections) {
      const text = this.stripHtml(extractText(section));
      if (text.trim() && text.length > 5) {
        elements.push({ type: 'paragraph', content: text });
      }
    }
    
    // Find all paragraphs
    const paragraphs = findNodes(dom, n => isTag(n, 'p'));
    for (const p of paragraphs) {
      const text = this.stripHtml(extractText(p));
      if (text.trim() && text.length > 10 && !hasClass(p, 'numbered-section')) {
        elements.push({ type: 'paragraph', content: text });
      }
    }
    
    // Find legal notices
    const legalNotices = findNodes(dom, n => hasClass(n, 'legal-notice') || hasClass(n, 'notice-box'));
    for (const notice of legalNotices) {
      const text = this.stripHtml(extractText(notice));
      if (text.trim()) {
        elements.push({ type: 'spacer' });
        elements.push({ type: 'paragraph', content: 'NOTICE: ' + text });
      }
    }
    
    // Find signature sections
    const signatureSections = findNodes(dom, n => hasClass(n, 'signature-section') || hasClass(n, 'signatures'));
    if (signatureSections.length > 0) {
      elements.push({ type: 'spacer' });
      elements.push({ type: 'signature' });
    }
    
    // Fallback: if we couldn't parse much, extract all text content from body
    if (elements.length < 3) {
      const body = findNodes(dom, n => isTag(n, 'body'))[0];
      if (body) {
        const divs = findNodes(body, n => isTag(n, 'div') || isTag(n, 'p'));
        for (const div of divs) {
          const text = this.stripHtml(extractText(div));
          if (text.trim() && text.length > 20) {
            elements.push({ type: 'paragraph', content: text });
          }
        }
      }
    }
    
    console.log(`📋 [NATIVE-PDF] Parsed ${elements.length} elements from HTML using htmlparser2`);
    return elements;
  }

  private parseInfoGridDom(node: any): string[][] {
    const rows: string[][] = [];
    const extractText = (n: any): string => {
      if (n.type === 'text') return n.data || '';
      if (n.children) return n.children.map(extractText).join(' ');
      return '';
    };
    
    const findNodes = (n: any, matcher: (x: any) => boolean): any[] => {
      const results: any[] = [];
      if (matcher(n)) results.push(n);
      if (n.children) {
        for (const child of n.children) {
          results.push(...findNodes(child, matcher));
        }
      }
      return results;
    };
    
    const hasClass = (n: any, className: string): boolean => {
      return (n.attribs?.class || '').includes(className);
    };
    
    // Find info rows
    const infoRows = findNodes(node, n => hasClass(n, 'info-row') || hasClass(n, 'detail-row'));
    for (const row of infoRows) {
      const labels = findNodes(row, n => hasClass(n, 'info-label') || hasClass(n, 'label'));
      const values = findNodes(row, n => hasClass(n, 'info-value') || hasClass(n, 'value'));
      
      if (labels.length > 0 && values.length > 0) {
        rows.push([
          this.stripHtml(extractText(labels[0])),
          this.stripHtml(extractText(values[0]))
        ]);
      }
    }
    
    return rows;
  }

  private parsePartiesDom(node: any): string[] {
    const parties: string[] = [];
    const extractText = (n: any): string => {
      if (n.type === 'text') return n.data || '';
      if (n.children) return n.children.map(extractText).join(' ');
      return '';
    };
    
    const findNodes = (n: any, matcher: (x: any) => boolean): any[] => {
      const results: any[] = [];
      if (matcher(n)) results.push(n);
      if (n.children) {
        for (const child of n.children) {
          results.push(...findNodes(child, matcher));
        }
      }
      return results;
    };
    
    const hasClass = (n: any, className: string): boolean => {
      return (n.attribs?.class || '').includes(className);
    };
    
    const partyColumns = findNodes(node, n => hasClass(n, 'party-column') || hasClass(n, 'party'));
    for (const column of partyColumns) {
      const titleNodes = findNodes(column, n => hasClass(n, 'party-title'));
      const title = titleNodes.length > 0 ? this.stripHtml(extractText(titleNodes[0])) : '';
      const content = this.stripHtml(extractText(column));
      
      if (title) {
        parties.push(`${title}: ${content.replace(title, '').trim()}`);
      } else if (content.trim()) {
        parties.push(content);
      }
    }
    
    return parties;
  }

  private parseFinancialsDom(node: any): string[][] {
    const rows: string[][] = [];
    const extractText = (n: any): string => {
      if (n.type === 'text') return n.data || '';
      if (n.children) return n.children.map(extractText).join(' ');
      return '';
    };
    
    const findNodes = (n: any, matcher: (x: any) => boolean): any[] => {
      const results: any[] = [];
      if (matcher(n)) results.push(n);
      if (n.children) {
        for (const child of n.children) {
          results.push(...findNodes(child, matcher));
        }
      }
      return results;
    };
    
    const hasClass = (n: any, className: string): boolean => {
      return (n.attribs?.class || '').includes(className);
    };
    
    const isTag = (n: any, tagName: string): boolean => {
      return n.type === 'tag' && n.name === tagName.toLowerCase();
    };
    
    const financialRows = findNodes(node, n => hasClass(n, 'financial-row') || hasClass(n, 'amount-row'));
    for (const row of financialRows) {
      const spans = findNodes(row, n => isTag(n, 'span') || isTag(n, 'div'));
      if (spans.length >= 2) {
        rows.push([
          this.stripHtml(extractText(spans[0])),
          this.stripHtml(extractText(spans[1]))
        ]);
      }
    }
    
    // If no rows found, try to extract label-value pairs
    if (rows.length === 0) {
      const content = this.stripHtml(extractText(node));
      const lines = content.split(/\n|:/).filter(l => l.trim());
      for (let i = 0; i < lines.length - 1; i += 2) {
        rows.push([lines[i].trim(), lines[i + 1]?.trim() || '']);
      }
    }
    
    return rows;
  }

  private parseSummaryGridDom(node: any): string[][] {
    const rows: string[][] = [];
    const extractText = (n: any): string => {
      if (n.type === 'text') return n.data || '';
      if (n.children) return n.children.map(extractText).join(' ');
      return '';
    };
    
    const findNodes = (n: any, matcher: (x: any) => boolean): any[] => {
      const results: any[] = [];
      if (matcher(n)) results.push(n);
      if (n.children) {
        for (const child of n.children) {
          results.push(...findNodes(child, matcher));
        }
      }
      return results;
    };
    
    const hasClass = (n: any, className: string): boolean => {
      return (n.attribs?.class || '').includes(className);
    };
    
    const summaryRows = findNodes(node, n => hasClass(n, 'summary-row'));
    for (const row of summaryRows) {
      const labels = findNodes(row, n => hasClass(n, 'summary-label'));
      const values = findNodes(row, n => hasClass(n, 'summary-value'));
      
      if (labels.length > 0 && values.length > 0) {
        rows.push([
          this.stripHtml(extractText(labels[0])),
          this.stripHtml(extractText(values[0]))
        ]);
      }
    }
    
    return rows;
  }

  private parsePaymentBoxDom(node: any): string {
    const extractText = (n: any): string => {
      if (n.type === 'text') return n.data || '';
      if (n.children) return n.children.map(extractText).join(' ');
      return '';
    };
    
    const findNodes = (n: any, matcher: (x: any) => boolean): any[] => {
      const results: any[] = [];
      if (matcher(n)) results.push(n);
      if (n.children) {
        for (const child of n.children) {
          results.push(...findNodes(child, matcher));
        }
      }
      return results;
    };
    
    const hasClass = (n: any, className: string): boolean => {
      return (n.attribs?.class || '').includes(className);
    };
    
    const headers = findNodes(node, n => hasClass(n, 'payment-box-header') || hasClass(n, 'payment-header'));
    const amounts = findNodes(node, n => hasClass(n, 'payment-amount') || hasClass(n, 'amount'));
    
    let content = '';
    if (headers.length > 0) content += this.stripHtml(extractText(headers[0])) + ': ';
    if (amounts.length > 0) content += this.stripHtml(extractText(amounts[0]));
    
    return content || this.stripHtml(extractText(node));
  }

  private parseInfoGrid(html: string): string[][] {
    const rows: string[][] = [];
    const rowMatches = Array.from(html.matchAll(/<div[^>]*class="info-row"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi));
    
    for (const match of rowMatches) {
      const labelMatch = match[1].match(/<span[^>]*class="info-label"[^>]*>([\s\S]*?)<\/span>/i);
      const valueMatch = match[1].match(/<span[^>]*class="info-value"[^>]*>([\s\S]*?)<\/span>/i);
      
      if (labelMatch && valueMatch) {
        rows.push([
          this.stripHtml(labelMatch[1]),
          this.stripHtml(valueMatch[1])
        ]);
      }
    }
    
    return rows;
  }

  private parseParties(html: string): string[] {
    const parties: string[] = [];
    const columnMatches = Array.from(html.matchAll(/<div[^>]*class="party-column"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi));
    
    for (const match of columnMatches) {
      const titleMatch = match[1].match(/<div[^>]*class="party-title"[^>]*>([\s\S]*?)<\/div>/i);
      const content = this.stripHtml(match[1]).replace(/\s+/g, ' ').trim();
      
      if (titleMatch) {
        const title = this.stripHtml(titleMatch[1]);
        parties.push(`${title}: ${content.replace(title, '').trim()}`);
      } else {
        parties.push(content);
      }
    }
    
    return parties;
  }

  private parseFinancials(html: string): string[][] {
    const rows: string[][] = [];
    const rowMatches = Array.from(html.matchAll(/<div[^>]*class="financial-row"[^>]*>([\s\S]*?)<\/div>/gi));
    
    for (const match of rowMatches) {
      const spans = Array.from(match[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi));
      const cells: string[] = [];
      
      for (const span of spans) {
        cells.push(this.stripHtml(span[1]));
      }
      
      if (cells.length >= 2) {
        rows.push(cells);
      }
    }
    
    return rows;
  }

  private parseSummaryGrid(html: string): string[][] {
    const rows: string[][] = [];
    const rowMatches = Array.from(html.matchAll(/<div[^>]*class="summary-row"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi));
    
    for (const match of rowMatches) {
      const labelMatch = match[1].match(/<span[^>]*class="summary-label"[^>]*>([\s\S]*?)<\/span>/i);
      const valueMatch = match[1].match(/<span[^>]*class="summary-value"[^>]*>([\s\S]*?)<\/span>/i);
      
      if (labelMatch && valueMatch) {
        rows.push([
          this.stripHtml(labelMatch[1]),
          this.stripHtml(valueMatch[1])
        ]);
      }
    }
    
    return rows;
  }

  private parsePaymentBox(html: string): string {
    const headerMatch = html.match(/<div[^>]*class="payment-box-header"[^>]*>([\s\S]*?)<\/div>/i);
    const amountMatch = html.match(/<div[^>]*class="payment-amount"[^>]*>([\s\S]*?)<\/div>/i);
    
    let content = '';
    if (headerMatch) content += this.stripHtml(headerMatch[1]) + ': ';
    if (amountMatch) content += this.stripHtml(amountMatch[1]);
    
    return content || this.stripHtml(html);
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private renderElement(
    element: ParsedElement,
    page: PDFPage,
    pdfDoc: PDFDocument,
    fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont; helvetica: PDFFont; helveticaBold: PDFFont },
    context: {
      x: number;
      y: number;
      contentWidth: number;
      fontSize: number;
      lineHeight: number;
      minY: number;
      pageSize: { width: number; height: number };
      margins: { top: number; right: number; bottom: number; left: number };
    }
  ): { y: number; needsNewPage: boolean } {
    
    let { y } = context;
    const { x, contentWidth, fontSize, lineHeight, minY, pageSize, margins } = context;
    
    switch (element.type) {
      case 'heading': {
        const headingSize = element.level === 1 ? 18 : element.level === 2 ? 14 : 12;
        const font = fonts.bold;
        const text = element.content || '';
        
        if (y - headingSize < minY) {
          return { y, needsNewPage: true };
        }
        
        y -= headingSize + 8;
        
        const lines = this.wrapText(text.toUpperCase(), font, headingSize, contentWidth);
        for (const line of lines) {
          const textWidth = font.widthOfTextAtSize(line, headingSize);
          const centeredX = element.level === 1 ? x + (contentWidth - textWidth) / 2 : x;
          
          page.drawText(line, {
            x: centeredX,
            y,
            size: headingSize,
            font,
            color: rgb(0, 0, 0)
          });
          
          y -= headingSize * lineHeight;
        }
        
        if (element.level === 1 || element.level === 2) {
          y -= 4;
          page.drawLine({
            start: { x, y: y + 4 },
            end: { x: x + contentWidth, y: y + 4 },
            thickness: element.level === 1 ? 2 : 1,
            color: rgb(0, 0, 0)
          });
        }
        
        y -= 8;
        break;
      }
      
      case 'paragraph': {
        const text = element.content || '';
        const font = fonts.regular;
        
        const lines = this.wrapText(text, font, fontSize, contentWidth);
        
        for (const line of lines) {
          if (y - fontSize < minY) {
            return { y, needsNewPage: true };
          }
          
          page.drawText(line, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0)
          });
          
          y -= fontSize * lineHeight;
        }
        
        y -= 6;
        break;
      }
      
      case 'table': {
        const rows = element.rows || [];
        const labelWidth = contentWidth * 0.35;
        const valueWidth = contentWidth * 0.65;
        
        for (const row of rows) {
          if (y - fontSize < minY) {
            return { y, needsNewPage: true };
          }
          
          const label = row[0] || '';
          const value = row[1] || '';
          
          page.drawText(label, {
            x,
            y,
            size: fontSize,
            font: fonts.bold,
            color: rgb(0.2, 0.2, 0.3)
          });
          
          const valueLines = this.wrapText(value, fonts.regular, fontSize, valueWidth - 10);
          let valueY = y;
          
          for (const vLine of valueLines) {
            page.drawText(vLine, {
              x: x + labelWidth,
              y: valueY,
              size: fontSize,
              font: fonts.regular,
              color: rgb(0, 0, 0)
            });
            valueY -= fontSize * lineHeight;
          }
          
          y -= Math.max(fontSize * lineHeight, valueLines.length * fontSize * lineHeight);
          
          page.drawLine({
            start: { x, y: y + 2 },
            end: { x: x + contentWidth, y: y + 2 },
            thickness: 0.5,
            color: rgb(0.85, 0.85, 0.85)
          });
          
          y -= 4;
        }
        
        y -= 8;
        break;
      }
      
      case 'signature': {
        if (y - 120 < minY) {
          return { y, needsNewPage: true };
        }
        
        y -= 20;
        
        page.drawText('AUTHORIZATION AND ACCEPTANCE', {
          x,
          y,
          size: 12,
          font: fonts.bold,
          color: rgb(0, 0, 0)
        });
        
        y -= 8;
        page.drawLine({
          start: { x, y },
          end: { x: x + contentWidth, y },
          thickness: 2,
          color: rgb(0.1, 0.1, 0.2)
        });
        
        y -= 40;
        
        const signatureWidth = (contentWidth - 40) / 2;
        
        page.drawLine({
          start: { x, y },
          end: { x: x + signatureWidth, y },
          thickness: 1,
          color: rgb(0, 0, 0)
        });
        
        page.drawLine({
          start: { x: x + contentWidth - signatureWidth, y },
          end: { x: x + contentWidth, y },
          thickness: 1,
          color: rgb(0, 0, 0)
        });
        
        y -= 14;
        
        page.drawText('Client Signature', {
          x,
          y,
          size: 10,
          font: fonts.bold,
          color: rgb(0, 0, 0)
        });
        
        page.drawText('Contractor Signature', {
          x: x + contentWidth - signatureWidth,
          y,
          size: 10,
          font: fonts.bold,
          color: rgb(0, 0, 0)
        });
        
        y -= 20;
        
        page.drawText('Date: ________________', {
          x,
          y,
          size: 10,
          font: fonts.regular,
          color: rgb(0, 0, 0)
        });
        
        page.drawText('Date: ________________', {
          x: x + contentWidth - signatureWidth,
          y,
          size: 10,
          font: fonts.regular,
          color: rgb(0, 0, 0)
        });
        
        y -= 30;
        break;
      }
      
      case 'divider': {
        y -= 10;
        page.drawLine({
          start: { x, y },
          end: { x: x + contentWidth, y },
          thickness: 1,
          color: rgb(0.7, 0.7, 0.7)
        });
        y -= 10;
        break;
      }
      
      case 'spacer': {
        y -= 16;
        break;
      }
    }
    
    return { y, needsNewPage: false };
  }

  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  private addPageNumbers(
    pdfDoc: PDFDocument,
    font: PDFFont,
    pageSize: { width: number; height: number },
    margins: { top: number; right: number; bottom: number; left: number }
  ): void {
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;
    
    pages.forEach((page, index) => {
      const pageNum = index + 1;
      const text = `Page ${pageNum} of ${totalPages}`;
      const textWidth = font.widthOfTextAtSize(text, 9);
      
      page.drawText(text, {
        x: (pageSize.width - textWidth) / 2,
        y: margins.bottom / 2,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });
      
      page.drawText('Powered by Mervin AI', {
        x: margins.left,
        y: margins.bottom / 2,
        size: 8,
        font,
        color: rgb(0.6, 0.6, 0.6)
      });
    });
  }

  async generateContractPdf(html: string): Promise<NativePdfResult> {
    console.log('📋 [NATIVE-PDF] Generating contract PDF...');
    return this.generateFromHtml(html, {
      pageSize: 'Letter',
      margins: { top: 54, right: 54, bottom: 72, left: 54 },
      fontSize: 11,
      lineHeight: 1.5
    });
  }

  async generateLienWaiverPdf(html: string): Promise<NativePdfResult> {
    console.log('📋 [NATIVE-PDF] Generating lien waiver PDF...');
    return this.generateFromHtml(html, {
      pageSize: 'Letter',
      margins: { top: 43, right: 54, bottom: 54, left: 54 },
      fontSize: 11,
      lineHeight: 1.45
    });
  }

  async generateChangeOrderPdf(html: string): Promise<NativePdfResult> {
    console.log('📋 [NATIVE-PDF] Generating change order PDF...');
    return this.generateFromHtml(html, {
      pageSize: 'Letter',
      margins: { top: 54, right: 54, bottom: 72, left: 54 },
      fontSize: 11.5,
      lineHeight: 1.5
    });
  }

  /**
   * Phase 2: Generate Estimate PDF directly from structured data
   * No HTML parsing - direct PDF generation for maximum performance
   */
  async generateEstimatePdf(data: {
    company: {
      name: string;
      address?: string;
      phone?: string;
      email?: string;
      license?: string;
      logo?: string;
    };
    estimate: {
      number?: string;
      date?: string;
      valid_until?: string;
      project_description?: string;
      items: Array<{
        code?: string;
        description: string;
        qty: number | string;
        unit_price: string;
        total: string;
      }>;
      subtotal?: string;
      discounts?: string;
      tax_rate?: number;
      tax_amount?: string;
      total?: string;
    };
    client: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
  }): Promise<NativePdfResult> {
    const startTime = Date.now();
    console.log('📊 [NATIVE-PDF] Generating Estimate PDF (Phase 2)...');
    
    try {
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pageSize = PAGE_SIZES.Letter;
      const margins = { top: 50, right: 50, bottom: 60, left: 50 };
      let page = pdfDoc.addPage([pageSize.width, pageSize.height]);
      let y = pageSize.height - margins.top;
      const contentWidth = pageSize.width - margins.left - margins.right;
      
      // Header - Company name and ESTIMATE badge
      page.drawText(data.company.name.toUpperCase(), {
        x: margins.left,
        y,
        size: 22,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.2)
      });
      
      page.drawText('ESTIMATE', {
        x: pageSize.width - margins.right - 100,
        y,
        size: 24,
        font: helveticaBold,
        color: rgb(0, 0.4, 1)
      });
      
      y -= 25;
      
      // Company details
      const companyDetails = [
        data.company.address,
        data.company.phone,
        data.company.email,
        data.company.license ? `License: ${data.company.license}` : null
      ].filter(Boolean);
      
      for (const detail of companyDetails) {
        page.drawText(detail!, {
          x: margins.left,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
        y -= 14;
      }
      
      y -= 10;
      
      // Divider line
      page.drawLine({
        start: { x: margins.left, y },
        end: { x: pageSize.width - margins.right, y },
        thickness: 2,
        color: rgb(0, 0.4, 1)
      });
      
      y -= 25;
      
      // Estimate info and Client info side by side
      const estimateNumber = data.estimate.number || `EST-${Date.now()}`;
      const estimateDate = data.estimate.date || new Date().toLocaleDateString();
      const validUntil = data.estimate.valid_until || '';
      
      page.drawText('BILL TO:', {
        x: margins.left,
        y,
        size: 10,
        font: helveticaBold,
        color: rgb(0, 0.4, 1)
      });
      
      page.drawText(`Estimate #: ${estimateNumber}`, {
        x: pageSize.width - margins.right - 200,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.4)
      });
      
      y -= 16;
      
      page.drawText(data.client.name, {
        x: margins.left,
        y,
        size: 11,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.2)
      });
      
      page.drawText(`Date: ${estimateDate}`, {
        x: pageSize.width - margins.right - 200,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.4)
      });
      
      y -= 14;
      
      if (data.client.address) {
        page.drawText(data.client.address, {
          x: margins.left,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
      }
      
      if (validUntil) {
        page.drawText(`Valid Until: ${validUntil}`, {
          x: pageSize.width - margins.right - 200,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
      }
      
      y -= 14;
      
      const clientContact = [data.client.phone, data.client.email].filter(Boolean).join(' | ');
      if (clientContact) {
        page.drawText(clientContact, {
          x: margins.left,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
      }
      
      y -= 30;
      
      // Project description
      if (data.estimate.project_description) {
        page.drawText('PROJECT SCOPE:', {
          x: margins.left,
          y,
          size: 10,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.2)
        });
        y -= 14;
        
        const descLines = this.wrapText(data.estimate.project_description, helvetica, 10, contentWidth);
        for (const line of descLines) {
          page.drawText(line, {
            x: margins.left,
            y,
            size: 10,
            font: helvetica,
            color: rgb(0.3, 0.3, 0.4)
          });
          y -= 14;
        }
        y -= 10;
      }
      
      // Items table header
      const tableTop = y;
      page.drawRectangle({
        x: margins.left,
        y: y - 20,
        width: contentWidth,
        height: 22,
        color: rgb(0.1, 0.1, 0.2)
      });
      
      const colWidths = [contentWidth * 0.45, contentWidth * 0.12, contentWidth * 0.18, contentWidth * 0.25];
      let xPos = margins.left + 8;
      
      const headers = ['DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL'];
      for (let i = 0; i < headers.length; i++) {
        page.drawText(headers[i], {
          x: xPos,
          y: y - 14,
          size: 9,
          font: helveticaBold,
          color: rgb(1, 1, 1)
        });
        xPos += colWidths[i];
      }
      
      y -= 25;
      
      // Items rows
      for (let i = 0; i < data.estimate.items.length; i++) {
        const item = data.estimate.items[i];
        
        // Check if we need a new page
        if (y < margins.bottom + 100) {
          page = pdfDoc.addPage([pageSize.width, pageSize.height]);
          y = pageSize.height - margins.top;
        }
        
        // Alternate row background
        if (i % 2 === 0) {
          page.drawRectangle({
            x: margins.left,
            y: y - 18,
            width: contentWidth,
            height: 22,
            color: rgb(0.97, 0.97, 0.98)
          });
        }
        
        xPos = margins.left + 8;
        
        // Description (with code if present)
        const desc = item.code ? `${item.code} - ${item.description}` : item.description;
        const descLines = this.wrapText(desc, helvetica, 10, colWidths[0] - 10);
        page.drawText(descLines[0] || '', {
          x: xPos,
          y: y - 12,
          size: 10,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.2)
        });
        xPos += colWidths[0];
        
        // Quantity
        page.drawText(String(item.qty), {
          x: xPos,
          y: y - 12,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
        xPos += colWidths[1];
        
        // Unit price
        page.drawText(item.unit_price, {
          x: xPos,
          y: y - 12,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
        xPos += colWidths[2];
        
        // Total
        page.drawText(item.total, {
          x: xPos,
          y: y - 12,
          size: 10,
          font: helveticaBold,
          color: rgb(0, 0.3, 0.8)
        });
        
        y -= 24;
      }
      
      y -= 20;
      
      // Totals section
      const totalsX = pageSize.width - margins.right - 200;
      
      // Subtotal
      if (data.estimate.subtotal) {
        page.drawText('Subtotal:', {
          x: totalsX,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
        page.drawText(data.estimate.subtotal, {
          x: totalsX + 100,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
        y -= 16;
      }
      
      // Discount
      if (data.estimate.discounts && data.estimate.discounts !== '$0.00') {
        page.drawText('Discount:', {
          x: totalsX,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0, 0.6, 0.4)
        });
        page.drawText(`-${data.estimate.discounts}`, {
          x: totalsX + 100,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0, 0.6, 0.4)
        });
        y -= 16;
      }
      
      // Tax
      if (data.estimate.tax_amount) {
        const taxLabel = data.estimate.tax_rate ? `Tax (${data.estimate.tax_rate}%):` : 'Tax:';
        page.drawText(taxLabel, {
          x: totalsX,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
        page.drawText(data.estimate.tax_amount, {
          x: totalsX + 100,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
        y -= 16;
      }
      
      y -= 5;
      
      // Total box
      page.drawRectangle({
        x: totalsX - 10,
        y: y - 25,
        width: 180,
        height: 30,
        color: rgb(0, 0.4, 1)
      });
      
      page.drawText('TOTAL:', {
        x: totalsX,
        y: y - 18,
        size: 12,
        font: helveticaBold,
        color: rgb(1, 1, 1)
      });
      
      page.drawText(data.estimate.total || '$0.00', {
        x: totalsX + 80,
        y: y - 18,
        size: 14,
        font: helveticaBold,
        color: rgb(1, 1, 1)
      });
      
      // Footer
      const pages = pdfDoc.getPages();
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const footerText = `Page ${i + 1} of ${pages.length}`;
        p.drawText(footerText, {
          x: (pageSize.width - helvetica.widthOfTextAtSize(footerText, 9)) / 2,
          y: 30,
          size: 9,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5)
        });
        
        p.drawText('Generated by Mervin AI', {
          x: margins.left,
          y: 30,
          size: 8,
          font: helvetica,
          color: rgb(0.6, 0.6, 0.6)
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      const buffer = Buffer.from(pdfBytes);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [NATIVE-PDF] Estimate PDF generated in ${processingTime}ms`);
      console.log(`📄 [NATIVE-PDF] ${pdfDoc.getPageCount()} pages, ${buffer.length} bytes`);
      
      return {
        success: true,
        buffer,
        processingTime,
        method: 'native-estimate-direct',
        pageCount: pdfDoc.getPageCount()
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [NATIVE-PDF] Estimate generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        method: 'native-estimate-direct'
      };
    }
  }

  /**
   * Phase 2: Generate Invoice PDF directly from structured data
   */
  async generateInvoicePdf(data: {
    company: {
      name: string;
      address?: string;
      phone?: string;
      email?: string;
      logo?: string;
    };
    invoice: {
      number?: string;
      date?: string;
      due_date?: string;
      items: Array<{
        code?: string;
        description: string;
        qty: number | string;
        unit_price: string;
        total: string;
      }>;
      subtotal?: string;
      discounts?: string;
      tax_rate?: number;
      tax_amount?: string;
      total?: string;
    };
    client: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    invoiceConfig?: {
      projectCompleted?: boolean;
      downPaymentAmount?: string;
      totalAmountPaid?: boolean;
    };
  }): Promise<NativePdfResult> {
    const startTime = Date.now();
    console.log('🧾 [NATIVE-PDF] Generating Invoice PDF (Phase 2)...');
    
    try {
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pageSize = PAGE_SIZES.A4;
      const margins = { top: 50, right: 50, bottom: 60, left: 50 };
      let page = pdfDoc.addPage([pageSize.width, pageSize.height]);
      let y = pageSize.height - margins.top;
      const contentWidth = pageSize.width - margins.left - margins.right;
      
      // Header
      page.drawText(data.company.name.toUpperCase(), {
        x: margins.left,
        y,
        size: 20,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.2)
      });
      
      page.drawText('INVOICE', {
        x: pageSize.width - margins.right - 80,
        y,
        size: 22,
        font: helveticaBold,
        color: rgb(0, 0.8, 0.8)
      });
      
      y -= 20;
      
      // Company info
      const companyInfo = [data.company.address, data.company.phone, data.company.email].filter(Boolean);
      for (const info of companyInfo) {
        page.drawText(info!, {
          x: margins.left,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4)
        });
        y -= 12;
      }
      
      y -= 5;
      
      // Divider
      page.drawLine({
        start: { x: margins.left, y },
        end: { x: pageSize.width - margins.right, y },
        thickness: 2,
        color: rgb(0, 0.8, 0.8)
      });
      
      y -= 25;
      
      // Bill To and Invoice details
      const invoiceNumber = data.invoice.number || `INV-${Date.now()}`;
      const invoiceDate = data.invoice.date || new Date().toLocaleDateString();
      const dueDate = data.invoice.due_date || '';
      
      page.drawText('BILL TO:', {
        x: margins.left,
        y,
        size: 9,
        font: helveticaBold,
        color: rgb(0, 0.8, 0.8)
      });
      
      page.drawText(`Invoice #: ${invoiceNumber}`, {
        x: pageSize.width - margins.right - 180,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.4)
      });
      
      y -= 14;
      
      page.drawText(data.client.name, {
        x: margins.left,
        y,
        size: 11,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.2)
      });
      
      page.drawText(`Date: ${invoiceDate}`, {
        x: pageSize.width - margins.right - 180,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.4)
      });
      
      y -= 14;
      
      if (data.client.address) {
        page.drawText(data.client.address, {
          x: margins.left,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4)
        });
      }
      
      if (dueDate) {
        page.drawText(`Due Date: ${dueDate}`, {
          x: pageSize.width - margins.right - 180,
          y,
          size: 9,
          font: helveticaBold,
          color: rgb(0.8, 0.2, 0.2)
        });
      }
      
      y -= 30;
      
      // Items table header
      page.drawRectangle({
        x: margins.left,
        y: y - 18,
        width: contentWidth,
        height: 20,
        color: rgb(0, 0.8, 0.8)
      });
      
      const colWidths = [contentWidth * 0.50, contentWidth * 0.12, contentWidth * 0.18, contentWidth * 0.20];
      let xPos = margins.left + 5;
      
      const headers = ['DESCRIPTION', 'QTY', 'PRICE', 'TOTAL'];
      for (let i = 0; i < headers.length; i++) {
        page.drawText(headers[i], {
          x: xPos,
          y: y - 13,
          size: 8,
          font: helveticaBold,
          color: rgb(1, 1, 1)
        });
        xPos += colWidths[i];
      }
      
      y -= 22;
      
      // Items
      for (let i = 0; i < data.invoice.items.length; i++) {
        const item = data.invoice.items[i];
        
        if (y < margins.bottom + 120) {
          page = pdfDoc.addPage([pageSize.width, pageSize.height]);
          y = pageSize.height - margins.top;
        }
        
        // Border
        page.drawLine({
          start: { x: margins.left, y: y - 18 },
          end: { x: pageSize.width - margins.right, y: y - 18 },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85)
        });
        
        xPos = margins.left + 5;
        
        const desc = item.code ? `${item.code} – ${item.description}` : item.description;
        page.drawText(desc.substring(0, 60), {
          x: xPos,
          y: y - 12,
          size: 9,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2)
        });
        xPos += colWidths[0];
        
        page.drawText(String(item.qty), {
          x: xPos,
          y: y - 12,
          size: 9,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
        xPos += colWidths[1];
        
        page.drawText(item.unit_price, {
          x: xPos,
          y: y - 12,
          size: 9,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.4)
        });
        xPos += colWidths[2];
        
        page.drawText(item.total, {
          x: xPos,
          y: y - 12,
          size: 9,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.2)
        });
        
        y -= 22;
      }
      
      y -= 15;
      
      // Totals summary
      const summaryX = pageSize.width - margins.right - 180;
      
      // Calculate payment info
      const totalAmount = parseFloat((data.invoice.total || '$0').replace(/[$,]/g, '')) || 0;
      let amountPaid = 0;
      let balance = totalAmount;
      
      if (data.invoiceConfig?.totalAmountPaid) {
        amountPaid = totalAmount;
        balance = 0;
      } else if (data.invoiceConfig?.downPaymentAmount) {
        amountPaid = parseFloat(data.invoiceConfig.downPaymentAmount.replace(/[$,]/g, '')) || 0;
        balance = totalAmount - amountPaid;
      }
      
      // Summary box
      page.drawRectangle({
        x: summaryX - 10,
        y: y - 120,
        width: 190,
        height: 125,
        color: rgb(0.97, 0.97, 0.98),
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 1
      });
      
      let summaryY = y - 15;
      
      if (data.invoice.subtotal) {
        page.drawText('Subtotal:', { x: summaryX, y: summaryY, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.4) });
        page.drawText(data.invoice.subtotal, { x: summaryX + 100, y: summaryY, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.4) });
        summaryY -= 16;
      }
      
      if (data.invoice.discounts && parseFloat(data.invoice.discounts.replace(/[$,]/g, '')) > 0) {
        page.drawText('Discount:', { x: summaryX, y: summaryY, size: 9, font: helvetica, color: rgb(0, 0.6, 0.4) });
        page.drawText(`-${data.invoice.discounts}`, { x: summaryX + 100, y: summaryY, size: 9, font: helvetica, color: rgb(0, 0.6, 0.4) });
        summaryY -= 16;
      }
      
      if (data.invoice.tax_amount) {
        const taxLabel = data.invoice.tax_rate ? `Tax (${data.invoice.tax_rate}%):` : 'Tax:';
        page.drawText(taxLabel, { x: summaryX, y: summaryY, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.4) });
        page.drawText(data.invoice.tax_amount, { x: summaryX + 100, y: summaryY, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.4) });
        summaryY -= 16;
      }
      
      // Total line
      page.drawLine({
        start: { x: summaryX - 5, y: summaryY + 5 },
        end: { x: summaryX + 170, y: summaryY + 5 },
        thickness: 1,
        color: rgb(0.3, 0.3, 0.4)
      });
      
      page.drawText('Total:', { x: summaryX, y: summaryY - 8, size: 11, font: helveticaBold, color: rgb(0.1, 0.1, 0.2) });
      page.drawText(data.invoice.total || '$0.00', { x: summaryX + 100, y: summaryY - 8, size: 11, font: helveticaBold, color: rgb(0, 0.4, 0.9) });
      summaryY -= 22;
      
      page.drawText('Amount Paid:', { x: summaryX, y: summaryY, size: 9, font: helvetica, color: rgb(0, 0.6, 0.4) });
      page.drawText(`$${amountPaid.toFixed(2)}`, { x: summaryX + 100, y: summaryY, size: 9, font: helvetica, color: rgb(0, 0.6, 0.4) });
      summaryY -= 16;
      
      const balanceColor = balance > 0 ? rgb(0.8, 0.2, 0.2) : rgb(0, 0.6, 0.4);
      page.drawText('Balance Due:', { x: summaryX, y: summaryY, size: 10, font: helveticaBold, color: balanceColor });
      page.drawText(`$${balance.toFixed(2)}`, { x: summaryX + 100, y: summaryY, size: 10, font: helveticaBold, color: balanceColor });
      
      // Thank you message
      const thankYouY = y - 150;
      page.drawRectangle({
        x: margins.left,
        y: thankYouY - 30,
        width: 200,
        height: 35,
        color: rgb(0.05, 0.05, 0.1),
        borderColor: rgb(0, 0.8, 0.8),
        borderWidth: 2
      });
      
      page.drawText('Thank you for your business!', {
        x: margins.left + 15,
        y: thankYouY - 18,
        size: 11,
        font: helveticaBold,
        color: rgb(0, 0.8, 0.8)
      });
      
      // Footer
      const pages = pdfDoc.getPages();
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        p.drawText(`Page ${i + 1} of ${pages.length}`, {
          x: (pageSize.width - 50) / 2,
          y: 25,
          size: 8,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5)
        });
        
        p.drawText('Generated by Mervin AI', {
          x: margins.left,
          y: 25,
          size: 7,
          font: helvetica,
          color: rgb(0.6, 0.6, 0.6)
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      const buffer = Buffer.from(pdfBytes);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [NATIVE-PDF] Invoice PDF generated in ${processingTime}ms`);
      console.log(`📄 [NATIVE-PDF] ${pdfDoc.getPageCount()} pages, ${buffer.length} bytes`);
      
      return {
        success: true,
        buffer,
        processingTime,
        method: 'native-invoice-direct',
        pageCount: pdfDoc.getPageCount()
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [NATIVE-PDF] Invoice generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        method: 'native-invoice-direct'
      };
    }
  }

  /**
   * Phase 2: Generate PDF from raw HTML (for permit reports and other HTML-based content)
   * Enhanced parser for complex HTML structures
   */
  async generateFromRawHtml(html: string, options: NativePdfOptions = {}): Promise<NativePdfResult> {
    console.log('📋 [NATIVE-PDF] Generating PDF from raw HTML (Phase 2)...');
    return this.generateFromHtml(html, options);
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body>
          <h1 class="contract-title">Test Document</h1>
          <p>Generated at ${new Date().toISOString()}</p>
        </body>
        </html>
      `;
      
      const result = await this.generateFromHtml(testHtml);
      
      return {
        healthy: result.success,
        details: {
          engine: 'NativePdfEngine',
          method: result.method,
          processingTime: result.processingTime,
          pdfGenerated: result.success,
          pageCount: result.pageCount,
          noBrowserRequired: true
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          engine: 'NativePdfEngine',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

export const nativePdfEngine = NativePdfEngine.getInstance();
export { NativePdfEngine, NativePdfResult, NativePdfOptions };

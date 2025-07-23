/**
 * NUEVA SOLUCIÓN PARA PDF - HTML-PDF-NODE
 * Reemplaza completamente los sistemas anteriores que no funcionaron
 */

import * as htmlPdf from 'html-pdf-node';

interface PdfOptions {
  contractId: string;
  clientName: string;
  format?: string;
  width?: string;
  height?: string;
  border?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export async function generatePdfFromHtml(htmlContent: string, options: PdfOptions): Promise<Buffer> {
  try {
    console.log('🚀 [HTML-PDF-NODE] Starting PDF generation with new service');
    
    // Configuración para PDF de alta calidad
    const pdfOptions = {
      format: 'A4',
      width: '8.5in',
      height: '11in',
      border: {
        top: '0.75in',
        right: '0.75in',
        bottom: '1in',
        left: '0.75in'
      },
      paginationOffset: 1,
      type: 'pdf',
      quality: '75',
      httpHeaders: {},
      phantomjsOptions: {
        'ignore-ssl-errors': 'yes',
        'local-to-remote-url-access': 'yes'
      }
    };

    // Preparar el HTML para mejor renderizado
    const enhancedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Contract - ${options.clientName}</title>
      <style>
        @page {
          size: A4;
          margin: 0.75in 0.75in 1in 0.75in;
        }
        
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          background: white;
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 100%;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        
        .header h1 {
          font-size: 18pt;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        
        .party-info {
          display: table;
          width: 100%;
          margin: 20px 0;
          border-collapse: separate;
          border-spacing: 20px 0;
        }
        
        .party-box {
          display: table-cell;
          width: 45%;
          border: 2px solid #000;
          padding: 20px;
          vertical-align: top;
        }
        
        .party-title {
          font-weight: bold;
          font-size: 14pt;
          text-align: center;
          margin-bottom: 15px;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }
        
        .section-title {
          font-size: 14pt;
          font-weight: bold;
          margin: 25px 0 15px 0;
          text-transform: uppercase;
          text-align: center;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }
        
        .legal-text {
          text-align: justify;
          margin-bottom: 15px;
          line-height: 1.6;
        }
        
        .signature-container {
          display: table;
          width: 100%;
          margin: 40px 0;
          border-collapse: separate;
          border-spacing: 30px 0;
        }
        
        .signature-box {
          display: table-cell;
          width: 45%;
          border: 2px solid #000;
          padding: 30px 20px;
          vertical-align: top;
          text-align: center;
        }
        
        .signature-title {
          font-weight: bold;
          font-size: 14pt;
          margin-bottom: 30px;
          text-transform: uppercase;
        }
        
        .signature-line {
          border-bottom: 2px solid #000;
          height: 50px;
          margin: 25px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${htmlContent}
      </div>
    </body>
    </html>
    `;

    const file = { content: enhancedHtml };
    
    console.log('⚡ [HTML-PDF-NODE] Converting HTML to PDF...');
    const pdfBuffer = await htmlPdf.generatePdf(file, pdfOptions);
    
    console.log('✅ [HTML-PDF-NODE] PDF generated successfully');
    console.log(`📄 [HTML-PDF-NODE] PDF size: ${pdfBuffer.length} bytes`);
    
    return pdfBuffer;
    
  } catch (error: any) {
    console.error('❌ [HTML-PDF-NODE] Failed to generate PDF:', error.message);
    throw new Error(`HTML-PDF-NODE generation failed: ${error.message}`);
  }
}

export async function generateContractPdfDirect(htmlContent: string, contractId: string, clientName: string): Promise<Buffer> {
  try {
    console.log(`🎯 [HTML-PDF-NODE] Generating PDF for contract: ${contractId}`);
    
    const pdfBuffer = await generatePdfFromHtml(htmlContent, {
      contractId,
      clientName,
      format: 'A4'
    });
    
    return pdfBuffer;
    
  } catch (error: any) {
    console.error('❌ [HTML-PDF-NODE] Contract PDF generation failed:', error);
    throw error;
  }
}
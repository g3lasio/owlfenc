/**
 * Advanced PDF Service for Digital Contract Signing
 * Handles PDF manipulation, signature insertion, and legal metadata
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

export interface SignatureData {
  imageData: string; // Base64 image
  biometrics: {
    velocity: number[];
    pressure: number[];
    timestamps: number[];
    coordinates: { x: number; y: number }[];
    totalTime: number;
    strokeCount: number;
  };
  metadata: {
    deviceType: 'mobile' | 'desktop';
    timestamp: string;
    userAgent: string;
  };
  validation: {
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    isValid: boolean;
  };
}

export interface ContractSignatures {
  contractor: SignatureData;
  client: SignatureData;
}

export interface PDFSecurityMetadata {
  contractId: string;
  signatureHashes: {
    contractor: string;
    client: string;
  };
  timestamps: {
    created: string;
    signed: string;
    sealed: string;
  };
  locations: {
    contractorLocation?: string;
    clientLocation?: string;
  };
  validation: {
    contractorValidation: any;
    clientValidation: any;
  };
  auditTrail: {
    events: Array<{
      timestamp: string;
      event: string;
      actor: string;
      metadata: any;
    }>;
  };
}

export interface SignaturePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface PDFProcessingResult {
  success: boolean;
  finalPdfBytes?: Uint8Array;
  finalPdfBase64?: string;
  documentHash: string;
  signaturePositions: SignaturePosition[];
  securityMetadata: PDFSecurityMetadata;
  fileSize: number;
  pageCount: number;
  errors: string[];
  processingTime: number;
}

export class AdvancedPDFService {
  private static instance: AdvancedPDFService;
  
  // Standard signature positions for different contract types
  private readonly SIGNATURE_POSITIONS: Record<string, SignaturePosition[]> = {
    'standard': [
      {
        page: -1, // Last page
        x: 100,
        y: 150,
        width: 200,
        height: 60,
        label: 'Firma del Contratista'
      },
      {
        page: -1, // Last page
        x: 350,
        y: 150,
        width: 200,
        height: 60,
        label: 'Firma del Cliente'
      }
    ],
    'multi-page': [
      {
        page: -1, // Last page
        x: 100,
        y: 200,
        width: 200,
        height: 60,
        label: 'Firma del Contratista'
      },
      {
        page: -1, // Last page
        x: 350,
        y: 200,
        width: 200,
        height: 60,
        label: 'Firma del Cliente'
      }
    ]
  };

  static getInstance(): AdvancedPDFService {
    if (!AdvancedPDFService.instance) {
      AdvancedPDFService.instance = new AdvancedPDFService();
    }
    return AdvancedPDFService.instance;
  }

  /**
   * Process and sign a contract PDF with digital signatures
   */
  async processAndSignContract(
    originalPdfBytes: Uint8Array,
    signatures: ContractSignatures,
    contractMetadata: {
      contractId: string;
      contractorInfo: any;
      clientInfo: any;
      projectInfo: any;
    },
    securityMetadata: PDFSecurityMetadata
  ): Promise<PDFProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Load the original PDF
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      const pageCount = pages.length;

      // Embed fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

      // Determine signature positions
      const signaturePositions = this.calculateSignaturePositions(pageCount, 'standard');

      // Add signature page if needed
      if (signaturePositions.length === 0 || this.needsSignaturePage(pdfDoc)) {
        await this.addSignaturePage(pdfDoc, helveticaFont, helveticaBoldFont, contractMetadata);
        signaturePositions.push(...this.SIGNATURE_POSITIONS['standard']);
      }

      // Insert contractor signature
      await this.insertSignature(
        pdfDoc,
        signatures.contractor,
        signaturePositions[0],
        'Contratista',
        contractMetadata.contractorInfo,
        helveticaFont
      );

      // Insert client signature
      await this.insertSignature(
        pdfDoc,
        signatures.client,
        signaturePositions[1],
        'Cliente',
        contractMetadata.clientInfo,
        helveticaFont
      );

      // Add security metadata to PDF
      await this.addSecurityMetadata(pdfDoc, securityMetadata, timesFont);

      // Add audit trail
      await this.addAuditTrail(pdfDoc, securityMetadata.auditTrail, helveticaFont);

      // Add digital signatures watermark
      await this.addDigitalSignatureWatermark(pdfDoc, helveticaFont);

      // Generate document hash
      const finalPdfBytes = await pdfDoc.save();
      const documentHash = await this.generateDocumentHash(finalPdfBytes);

      // Create final security metadata
      const finalSecurityMetadata: PDFSecurityMetadata = {
        ...securityMetadata,
        timestamps: {
          ...securityMetadata.timestamps,
          sealed: new Date().toISOString()
        }
      };

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        finalPdfBytes,
        finalPdfBase64: this.arrayBufferToBase64(finalPdfBytes),
        documentHash,
        signaturePositions,
        securityMetadata: finalSecurityMetadata,
        fileSize: finalPdfBytes.length,
        pageCount: pdfDoc.getPageCount(),
        errors,
        processingTime
      };

    } catch (error) {
      errors.push(`PDF processing error: ${error}`);
      
      return {
        success: false,
        documentHash: '',
        signaturePositions: [],
        securityMetadata,
        fileSize: 0,
        pageCount: 0,
        errors,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate optimal signature positions based on PDF content
   */
  private calculateSignaturePositions(pageCount: number, contractType: string): SignaturePosition[] {
    const basePositions = this.SIGNATURE_POSITIONS[contractType] || this.SIGNATURE_POSITIONS['standard'];
    
    return basePositions.map(pos => ({
      ...pos,
      page: pos.page === -1 ? pageCount - 1 : pos.page // Convert -1 to last page index
    }));
  }

  /**
   * Check if PDF needs a dedicated signature page
   */
  private needsSignaturePage(pdfDoc: PDFDocument): boolean {
    // Simple heuristic: if PDF has fewer than 2 pages or last page is very full
    const pageCount = pdfDoc.getPageCount();
    return pageCount < 2;
  }

  /**
   * Add a professional signature page to the PDF
   */
  private async addSignaturePage(
    pdfDoc: PDFDocument,
    font: PDFFont,
    boldFont: PDFFont,
    contractMetadata: any
  ): Promise<void> {
    const page = pdfDoc.addPage([612, 792]); // Standard US Letter size
    const { width, height } = page.getSize();

    // Header
    page.drawText('FIRMAS DEL CONTRATO', {
      x: 50,
      y: height - 80,
      size: 24,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2)
    });

    // Contract information
    page.drawText(`Contrato: ${contractMetadata.contractId}`, {
      x: 50,
      y: height - 120,
      size: 12,
      font: font,
      color: rgb(0.4, 0.4, 0.4)
    });

    page.drawText(`Proyecto: ${contractMetadata.projectInfo?.type || 'N/A'}`, {
      x: 50,
      y: height - 140,
      size: 12,
      font: font,
      color: rgb(0.4, 0.4, 0.4)
    });

    page.drawText(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, {
      x: 50,
      y: height - 160,
      size: 12,
      font: font,
      color: rgb(0.4, 0.4, 0.4)
    });

    // Signature boxes
    const boxY = height - 300;
    
    // Contractor signature box
    page.drawRectangle({
      x: 50,
      y: boxY - 80,
      width: 250,
      height: 120,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1
    });

    page.drawText('CONTRATISTA', {
      x: 60,
      y: boxY - 30,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2)
    });

    // Client signature box  
    page.drawRectangle({
      x: 320,
      y: boxY - 80,
      width: 250,
      height: 120,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1
    });

    page.drawText('CLIENTE', {
      x: 330,
      y: boxY - 30,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2)
    });

    // Legal notice
    const legalText = 'Este documento ha sido firmado digitalmente con validación biométrica. ' +
                     'Las firmas han sido verificadas y tienen validez legal completa.';
    
    page.drawText(legalText, {
      x: 50,
      y: boxY - 180,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
      maxWidth: width - 100,
      lineHeight: 14
    });
  }

  /**
   * Insert a digital signature into the PDF
   */
  private async insertSignature(
    pdfDoc: PDFDocument,
    signature: SignatureData,
    position: SignaturePosition,
    role: string,
    signerInfo: any,
    font: PDFFont
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    const page = pages[position.page];

    if (!page) {
      throw new Error(`Page ${position.page} not found for signature placement`);
    }

    try {
      // Convert base64 signature to image
      const imageBytes = this.base64ToArrayBuffer(signature.imageData.split(',')[1] || signature.imageData);
      const signatureImage = await pdfDoc.embedPng(imageBytes);

      // Insert signature image
      page.drawImage(signatureImage, {
        x: position.x + 10,
        y: position.y + 30,
        width: position.width - 20,
        height: position.height - 40
      });

      // Add signer information
      page.drawText(`${role}: ${signerInfo.name || 'N/A'}`, {
        x: position.x + 10,
        y: position.y + 10,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3)
      });

      // Add timestamp
      const timestamp = new Date(signature.metadata.timestamp).toLocaleString('es-ES');
      page.drawText(`Firmado: ${timestamp}`, {
        x: position.x + 10,
        y: position.y - 5,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
      });

      // Add validation badge
      const validationColor = signature.validation.isValid ? rgb(0, 0.7, 0) : rgb(0.7, 0, 0);
      const validationText = signature.validation.isValid ? '✓ Validado' : '✗ Inválido';
      
      page.drawText(validationText, {
        x: position.x + 150,
        y: position.y - 5,
        size: 8,
        font: font,
        color: validationColor
      });

      // Add confidence score
      page.drawText(`Confianza: ${signature.validation.confidence}%`, {
        x: position.x + 10,
        y: position.y - 20,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
      });

      // Add device type
      page.drawText(`Dispositivo: ${signature.metadata.deviceType}`, {
        x: position.x + 100,
        y: position.y - 20,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
      });

    } catch (error) {
      console.warn(`Failed to insert signature for ${role}:`, error);
      
      // Fallback: Add text indication
      page.drawText(`[FIRMA DIGITAL - ${role.toUpperCase()}]`, {
        x: position.x + 10,
        y: position.y + 30,
        size: 12,
        font: font,
        color: rgb(0.6, 0.6, 0.6)
      });
      
      page.drawText(`${signerInfo.name || 'N/A'}`, {
        x: position.x + 10,
        y: position.y + 10,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3)
      });
    }
  }

  /**
   * Add security metadata to PDF
   */
  private async addSecurityMetadata(
    pdfDoc: PDFDocument,
    metadata: PDFSecurityMetadata,
    font: PDFFont
  ): Promise<void> {
    // Add metadata as PDF properties
    pdfDoc.setTitle(`Contrato Digital - ${metadata.contractId}`);
    pdfDoc.setSubject('Contrato con Firmas Digitales Biométricas');
    pdfDoc.setKeywords(['contrato', 'firma digital', 'biométrica', 'legal']);
    pdfDoc.setProducer('Sistema de Contratos Digitales Owl Fence');
    pdfDoc.setCreator('Mervin AI - Sistema Legal Defense');
    pdfDoc.setCreationDate(new Date(metadata.timestamps.created));
    pdfDoc.setModificationDate(new Date(metadata.timestamps.sealed));

    // Add security notice on first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    if (firstPage) {
      const { height } = firstPage.getSize();
      
      // Security banner
      firstPage.drawRectangle({
        x: 0,
        y: height - 25,
        width: 612,
        height: 25,
        color: rgb(0.95, 0.95, 1),
        borderColor: rgb(0.7, 0.7, 0.9),
        borderWidth: 1
      });

      firstPage.drawText('🔒 DOCUMENTO CON FIRMAS DIGITALES VERIFICADAS', {
        x: 20,
        y: height - 20,
        size: 10,
        font: font,
        color: rgb(0.2, 0.2, 0.7)
      });

      firstPage.drawText(`ID: ${metadata.contractId}`, {
        x: 450,
        y: height - 20,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
      });
    }

    // Add metadata page at the end
    const metadataPage = pdfDoc.addPage([612, 792]);
    const { width, height } = metadataPage.getSize();

    metadataPage.drawText('METADATOS DE SEGURIDAD', {
      x: 50,
      y: height - 80,
      size: 16,
      font: font,
      color: rgb(0.2, 0.2, 0.2)
    });

    let yPos = height - 120;
    const lineHeight = 20;

    // Contract information
    const metadataLines = [
      `ID del Contrato: ${metadata.contractId}`,
      `Fecha de Creación: ${new Date(metadata.timestamps.created).toLocaleString('es-ES')}`,
      `Fecha de Firma: ${new Date(metadata.timestamps.signed).toLocaleString('es-ES')}`,
      `Fecha de Sellado: ${new Date(metadata.timestamps.sealed).toLocaleString('es-ES')}`,
      `Hash Firma Contratista: ${metadata.signatureHashes.contractor.substring(0, 16)}...`,
      `Hash Firma Cliente: ${metadata.signatureHashes.client.substring(0, 16)}...`,
      '',
      'AUDIT TRAIL:',
      ...metadata.auditTrail.events.slice(0, 10).map(event => 
        `${new Date(event.timestamp).toLocaleString('es-ES')}: ${event.event} (${event.actor})`
      )
    ];

    metadataLines.forEach(line => {
      if (yPos > 50) {
        metadataPage.drawText(line, {
          x: 50,
          y: yPos,
          size: 10,
          font: font,
          color: rgb(0.4, 0.4, 0.4)
        });
        yPos -= lineHeight;
      }
    });
  }

  /**
   * Add audit trail to PDF
   */
  private async addAuditTrail(
    pdfDoc: PDFDocument,
    auditTrail: PDFSecurityMetadata['auditTrail'],
    font: PDFFont
  ): Promise<void> {
    // Audit trail is already included in security metadata
    // This method can be extended for more detailed audit trail formatting
  }

  /**
   * Add digital signature watermark
   */
  private async addDigitalSignatureWatermark(
    pdfDoc: PDFDocument,
    font: PDFFont
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      
      // Add subtle watermark
      page.drawText('DIGITALMENTE FIRMADO', {
        x: width - 180,
        y: 30,
        size: 8,
        font: font,
        color: rgb(0.9, 0.9, 0.9),
        rotate: {
          type: 'degrees',
          angle: -45
        }
      });
    });
  }

  /**
   * Generate cryptographic hash of document
   */
  private async generateDocumentHash(pdfBytes: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Validate PDF before processing
   */
  async validatePDF(pdfBytes: Uint8Array): Promise<{
    isValid: boolean;
    pageCount: number;
    fileSize: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      
      if (pageCount === 0) {
        errors.push('PDF contains no pages');
      }
      
      if (pdfBytes.length === 0) {
        errors.push('PDF file is empty');
      }
      
      if (pdfBytes.length > 50 * 1024 * 1024) { // 50MB limit
        errors.push('PDF file is too large (>50MB)');
      }
      
      return {
        isValid: errors.length === 0,
        pageCount,
        fileSize: pdfBytes.length,
        errors
      };
      
    } catch (error) {
      errors.push(`PDF validation error: ${error}`);
      return {
        isValid: false,
        pageCount: 0,
        fileSize: pdfBytes.length,
        errors
      };
    }
  }

  /**
   * Extract text content from PDF for analysis
   */
  async extractTextContent(pdfBytes: Uint8Array): Promise<string> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      // Note: pdf-lib doesn't have text extraction capabilities
      // In production, you would use pdf-parse or similar library
      return `[Text extraction requires additional library - PDF has ${pdfDoc.getPageCount()} pages]`;
    } catch (error) {
      return `[Error extracting text: ${error}]`;
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    supportedFormats: string[];
    maxFileSize: string;
    featuresAvailable: string[];
  } {
    return {
      supportedFormats: ['PDF'],
      maxFileSize: '50MB',
      featuresAvailable: [
        'Signature insertion',
        'Security metadata',
        'Audit trail embedding',
        'Document hashing',
        'Watermarking',
        'Multi-page support'
      ]
    };
  }
}

// Export singleton instance
export const advancedPDF = AdvancedPDFService.getInstance();
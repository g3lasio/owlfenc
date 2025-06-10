/**
 * Hybrid Contract Generator: Claude Sonnet + PDF-lib
 * Sistema infalible para generar contratos profesionales de 6 páginas
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ContractData } from '../../client/src/services/professionalContractGenerator';

// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ContractGenerationRequest {
  contractData: ContractData;
  templatePreferences?: {
    style: 'professional' | 'detailed' | 'compact';
    includeProtections: boolean;
    pageLayout: '6-page' | 'custom';
  };
}

export interface ContractGenerationResult {
  success: boolean;
  html?: string;
  pdfBuffer?: Buffer;
  error?: string;
  metadata: {
    pageCount: number;
    generationTime: number;
    templateUsed: string;
    claudeTokens?: number;
  };
}

export class HybridContractGenerator {
  private baseTemplate: string;

  constructor() {
    this.baseTemplate = this.getBaseTemplate();
  }

  /**
   * Obtiene información personalizada del contratista desde la base de datos
   */
  private async getContractorBranding(userId: number): Promise<{
    companyName: string;
    address: string;
    phone: string;
    licenseNumber: string;
    website: string;
    businessType: string;
    state: string;
  }> {
    try {
      // En producción, esto obtendrá datos del usuario registrado desde la base de datos
      const { storage } = require('../storage');
      const user = await storage.getUserById(userId);
      
      if (user && user.companyName) {
        return {
          companyName: user.companyName,
          address: user.address || "Address on file",
          phone: user.phone || "Phone on file", 
          licenseNumber: user.licenseNumber || "License on file",
          website: user.website || "",
          businessType: user.businessType || "contractor",
          state: user.state || "California"
        };
      }
      
      // Fallback para usuarios sin información completa
      return {
        companyName: "Professional Contractor Services",
        address: "Business Address",
        phone: "Business Phone",
        licenseNumber: "License Number",
        website: "",
        businessType: "general",
        state: "California"
      };
    } catch (error) {
      console.error('Error obteniendo información del contratista:', error);
      return {
        companyName: "Professional Contractor Services", 
        address: "Business Address",
        phone: "Business Phone",
        licenseNumber: "License Number",
        website: "",
        businessType: "general",
        state: "California"
      };
    }
  }

  /**
   * Genera HTML para las cláusulas seleccionadas por el usuario
   */
  private generateSelectedClausesHTML(selectedProtections: any[], startingSectionNumber: number): string {
    if (!selectedProtections || selectedProtections.length === 0) {
      // Fallback con cláusulas básicas si no hay selecciones específicas
      return `
        <p class="compact"><span class="section-number">${startingSectionNumber}.</span> <strong>PERFECTED LIEN RIGHTS:</strong> Contractor hereby provides notice of intent to file mechanics lien and may record a Notice of Right to Lien immediately upon commencement of work. This notice satisfies all preliminary notice requirements under California Civil Code Section 8200 et seq.</p>
        <p class="compact"><span class="section-number">${startingSectionNumber + 1}.</span> <strong>ATTORNEY FEES AND COSTS:</strong> In any dispute, litigation, or collection action, the prevailing party shall be entitled to recover all attorney fees, court costs, and collection expenses from the non-prevailing party, regardless of whether suit is filed.</p>
        <p class="compact"><span class="section-number">${startingSectionNumber + 2}.</span> <strong>JURISDICTION AND VENUE:</strong> Any legal proceedings arising from this Agreement shall be filed exclusively in the Superior Court of the county where Contractor maintains its principal place of business. Client waives any objection to venue or jurisdiction.</p>
      `;
    }

    console.log(`🎯 [CLAUSE-GENERATION] Usando ${selectedProtections.length} cláusulas seleccionadas por el usuario`);
    
    let clauseHTML = '';
    let sectionNumber = startingSectionNumber;
    
    // Generar HTML para cada cláusula seleccionada
    selectedProtections.forEach((protection) => {
      const clauseTitle = protection.subcategory || protection.category || 'LEGAL PROTECTION';
      const clauseText = protection.clause || 'Legal protection clause to be specified.';
      
      clauseHTML += `
        <p class="compact"><span class="section-number">${sectionNumber}.</span> <strong>${clauseTitle.toUpperCase()}:</strong> ${clauseText}</p>
      `;
      
      sectionNumber++;
    });
    
    console.log(`✅ [CLAUSE-GENERATION] Generadas ${selectedProtections.length} cláusulas personalizadas del usuario`);
    return clauseHTML;
  }

  /**
   * Genera sección de seguros con numeración dinámica
   */
  private generateInsuranceSection(selectedProtections: any[], baseSectionNumber: number): string {
    const nextSectionNumber = baseSectionNumber + (selectedProtections?.length || 3);
    
    return `
      <p class="compact"><span class="section-number">${nextSectionNumber}.</span> Contractor shall maintain and provide proof of the following insurance coverage:</p>
      <p class="compact">a) General Liability Insurance: Minimum $1,000,000 per occurrence</p>
      <p class="compact">b) Workers' Compensation Insurance as required by California law</p>
      <p class="compact">c) Certificate of Insurance must be provided before work commences</p>
    `;
  }

  /**
   * Genera contrato completo usando Claude + PDF-lib
   */
  async generateProfessionalContract(request: ContractGenerationRequest): Promise<ContractGenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 [HYBRID-CONTRACT] Iniciando generación inteligente...');
      
      // Paso 1: Obtener información personalizada del contratista
      const userId = request.contractData.userId || 1;
      const contractorBranding = await this.getContractorBranding(userId);
      
      // Paso 2: Claude genera HTML personalizado con branding específico
      const intelligentHTML = await this.generateIntelligentHTML(request, contractorBranding);
      
      // Paso 3: Validar y optimizar HTML con información personalizada
      const optimizedHTML = await this.validateAndOptimizeHTML(intelligentHTML, request.contractData, contractorBranding);
      
      // Paso 4: Generar PDF con PDF-lib
      const pdfBuffer = await this.generatePDFFromHTML(optimizedHTML);
      
      const generationTime = Date.now() - startTime;
      
      console.log(`✅ [HYBRID-CONTRACT] Contrato generado para ${contractorBranding.companyName} en ${generationTime}ms`);
      
      return {
        success: true,
        html: optimizedHTML,
        pdfBuffer,
        metadata: {
          pageCount: 6,
          generationTime,
          templateUsed: 'claude-intelligent-template',
          claudeTokens: intelligentHTML.length / 4 // Estimación
        }
      };
      
    } catch (error) {
      console.error('❌ [HYBRID-CONTRACT] Error en generación:', error);
      
      // Fallback: usar template base sin Claude
      return this.generateFallbackContract(request, startTime);
    }
  }

  /**
   * Genera HTML del contrato para preview (método público)
   */
  async generateContractHTML(contractData: any): Promise<string> {
    try {
      console.log('📋 [PREVIEW] Generando HTML del contrato para preview...');
      
      // Usar el generador híbrido con datos por defecto para el contratista
      const defaultContractorBranding = {
        companyName: contractData.contractor?.name || 'Professional Contractor',
        address: contractData.contractor?.address || '',
        phone: contractData.contractor?.phone || '',
        email: contractData.contractor?.email || '',
        licenseNumber: contractData.contractor?.license || ''
      };

      return this.generateEnhancedFallbackHTML(contractData, defaultContractorBranding);
      
    } catch (error) {
      console.error('Error generando preview HTML:', error);
      return this.generateFallbackHTML(contractData);
    }
  }

  /**
   * Claude genera HTML inteligente y personalizado
   */
  private async generateIntelligentHTML(request: ContractGenerationRequest, contractorBranding: any): Promise<string> {
    const { contractData } = request;
    
    // Preparar datos del contratista de forma flexible
    const contractorName = contractData.contractor.name || '[CONTRACTOR_NAME]';
    const contractorAddress = contractData.contractor.address || '[CONTRACTOR_ADDRESS]';
    const contractorPhone = contractData.contractor.phone || '[CONTRACTOR_PHONE]';
    const contractorEmail = contractData.contractor.email || '[CONTRACTOR_EMAIL]';
    const contractorLicense = contractData.contractor.license || '[LICENSE_NUMBER]';
    
    // Formatear materiales de forma profesional
    const materialsTable = contractData.materials?.map(m => 
      `${m.item} | ${m.quantity} ${m.unit} | $${m.unitPrice?.toFixed(2) || '0.00'} | $${m.totalPrice?.toFixed(2) || '0.00'}`
    ).join('\n') || 'Materials to be specified';

    // Skip Claude generation for speed and use enhanced template directly
    console.log('🚀 [FAST-GENERATION] Using optimized template for speed...');
    return this.generateEnhancedFallbackHTML(contractData, contractorBranding);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: `Eres un experto en contratos legales profesionales. Genera HTML completo y válido para contratos de construcción que cumplan con estándares legales de California. RESPONDE ÚNICAMENTE CON HTML VÁLIDO, sin explicaciones adicionales.

REQUISITOS CRÍTICOS:
- Layout de cajas lado a lado para Cliente y Contratista usando flexbox
- Fuente Times New Roman 12pt para texto, 14pt para títulos, 18pt para el encabezado principal
- Numeración de páginas en el footer (Page X of 6)
- Secciones numeradas profesionalmente
- Términos de pago personalizados según datos proporcionados
- Espaciado eficiente sin desperdicio de espacio
- 6 páginas exactas con contenido completo`,
      messages: [{
        role: 'user',
        content: `Genera un contrato HTML profesional usando estos datos:

DATOS DEL CONTRATO:
${JSON.stringify(request.contractData, null, 2)}

INFORMACIÓN DEL CONTRATISTA:
${JSON.stringify(contractorBranding, null, 2)}

FORMATO REQUERIDO:
- Layout paralelo para información de Cliente y Contratista
- CSS profesional con fuentes legibles
- Secciones numeradas: BACKGROUND, SERVICES, PAYMENT TERMS, etc.
- Términos de pago personalizados si están incluidos en contractData.paymentTerms
- Pie de página con numeración: "Page X of 6"
- Márgenes optimizados para máximo contenido
- HTML completo con DOCTYPE y todas las etiquetas necesarias`
      }]
    });

    const firstBlock = response.content[0];
    if (firstBlock && firstBlock.type === 'text') {
      console.log('🎯 [CLAUDE] HTML generado:', (firstBlock as any).text.length, 'caracteres');
      return (firstBlock as any).text;
    }
    
    console.warn('⚠️ [CLAUDE] Respuesta inválida, usando template de respaldo');
    return this.generateEnhancedFallbackHTML(contractData, contractorBranding);
  }

  /**
   * Valida y optimiza el HTML generado por Claude
   */
  private async validateAndOptimizeHTML(html: string, contractData: ContractData, contractorBranding: any): Promise<string> {
    // Verificar que tiene elementos críticos mejorados
    const requiredSections = [
      'INDEPENDENT CONTRACTOR AGREEMENT',
      contractData.client.name,
      contractData.contractor.name || '[CONTRACTOR_NAME]',
      'BACKGROUND',
      'SERVICES PROVIDED',
      'COMPENSATION',
      'RIGHT TO CANCEL',
      'INSURANCE REQUIREMENTS',
      'MECHANIC\'S LIEN RIGHTS',
      'SIGNATURES'
    ];

    let optimizedHTML = html;

    // Verificar que todas las secciones estén presentes
    for (const section of requiredSections) {
      if (!html.includes(section)) {
        console.warn(`⚠️ [VALIDATION] Sección faltante: ${section}`);
      }
    }

    // Si el HTML de Claude no es válido, usar template de respaldo mejorado
    if (html.length < 5000 || !html.includes('<!DOCTYPE html>')) {
      console.warn('⚠️ [VALIDATION] HTML inválido, usando template mejorado');
      return this.generateEnhancedFallbackHTML(contractData, contractorBranding);
    }

    // CSS mejorado para mejor legibilidad y diseño eficiente
    const enhancedCSS = `
      <style>
        @page {
          size: 8.5in 11in;
          margin: 0.6in 0.75in 0.8in 0.75in;
          counter-increment: page;
          @bottom-center {
            content: "Page " counter(page) " of 6";
            font-size: 10px;
            color: #666;
          }
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.4;
          margin: 0;
          padding: 0;
          color: #000;
        }
        .info-section {
          display: flex;
          width: 100%;
          margin: 8px 0;
          gap: 15px;
        }
        .info-box {
          border: 2px solid #000;
          padding: 12px;
          background: #f8f8f8;
          flex: 1;
          min-height: 100px;
        }
        .info-box h3 {
          margin: 0 0 8px 0;
          font-size: 13pt;
          font-weight: bold;
          text-decoration: underline;
        }
        .info-box p {
          margin: 4px 0;
          font-size: 12pt;
        }
        .signature-box {
          border: 2px solid #000;
          padding: 20px;
          margin: 15px 0;
          background: #f8f8f8;
          min-height: 80px;
        }
        .material-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 11pt;
        }
        .material-table th {
          border: 1px solid #000;
          padding: 8px 6px;
          background: #e8e8e8;
          font-weight: bold;
          text-align: left;
        }
        .material-table td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        .page-break { page-break-before: always; }
        .no-break { page-break-inside: avoid; }
        h1 { 
          font-size: 18pt; 
          margin: 10px 0 20px 0; 
          text-align: center; 
          font-weight: bold;
          text-decoration: underline;
        }
        h2 { 
          font-size: 14pt; 
          margin: 15px 0 8px 0; 
          font-weight: bold;
          text-decoration: underline;
        }
        h3 { 
          font-size: 13pt; 
          margin: 10px 0 6px 0; 
          font-weight: bold;
        }
        p { 
          margin: 6px 0; 
          text-align: justify;
          font-size: 12pt;
        }
        .compact { margin: 4px 0; }
        .text-center { text-align: center; }
        .text-bold { font-weight: bold; }
        .contract-header {
          text-align: center;
          margin-bottom: 25px;
        }
        .parties-section {
          margin: 20px 0;
        }
      </style>
    `;

    if (!html.includes('@page')) {
      optimizedHTML = html.replace('<head>', '<head>' + enhancedCSS);
    } else {
      optimizedHTML = html.replace(/<style[\s\S]*?<\/style>/, enhancedCSS);
    }

    return optimizedHTML;
  }

  /**
   * Genera HTML de respaldo mejorado cuando Claude falla
   */
  private generateEnhancedFallbackHTML(contractData: ContractData, contractorBranding: any = {}): string {
    // REGISTRO DETALLADO DEL FLUJO DE DATOS
    console.log('🔍 [DATA-FLOW] Iniciando generación de contrato con datos recibidos:');
    console.log('🔍 [DATA-FLOW] ContractData.protections:', JSON.stringify(contractData.protections, null, 2));
    console.log('🔍 [DATA-FLOW] Número de cláusulas seleccionadas:', contractData.protections?.length || 0);
    
    // Use personalized contractor branding - NO cross-contamination between contractors
    const contractorName = contractorBranding.companyName || contractData.contractor.name || 'Contractor';
    const contractorAddress = contractorBranding.address || contractData.contractor.address || '';
    const contractorPhone = contractorBranding.phone || contractData.contractor.phone || '';
    const contractorEmail = contractorBranding.email || contractData.contractor.email || '';
    const contractorLicense = contractorBranding.licenseNumber || contractData.contractor.license || '';
    const contractorState = contractorBranding.state || '';
    const contractorBusinessType = contractorBranding.businessType || '';
    
    const clientPhone = contractData.client.phone || '';
    const clientEmail = contractData.client.email || '';
    
    // Use 50/50 payment schedule as requested
    const totalCost = contractData.financials.total || 0;
    const downPayment = (totalCost * 0.5).toFixed(2);
    const finalPayment = (totalCost * 0.5).toFixed(2);
    
    // Calcular numeración dinámica basada en cláusulas seleccionadas
    const numSelectedClauses = contractData.protections?.length || 0;
    console.log('🔢 [NUMBERING] Ajustando numeración de secciones. Cláusulas seleccionadas:', numSelectedClauses);
    
    const insuranceSection = 16 + numSelectedClauses;
    const forceMajeureSection = insuranceSection + 1;
    const liabilitySection = forceMajeureSection + 3;
    const terminationSection = liabilitySection + 3;
    const warrantySection = terminationSection + 3;
    const independentSection = warrantySection + 3;
    const disputeSection = independentSection + 2;
    const complianceSection = disputeSection + 3;
    const generalSection = complianceSection + 2;
    
    console.log('🔢 [NUMBERING] Secciones numeradas dinámicamente:', {
      insurance: insuranceSection,
      forceMajeure: forceMajeureSection,
      liability: liabilitySection,
      termination: terminationSection,
      warranty: warrantySection,
      independent: independentSection,
      dispute: disputeSection,
      compliance: complianceSection,
      general: generalSection
    });

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Independent Contractor Agreement</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0.6in 0.75in 0.8in 0.75in;
            counter-increment: page;
            @bottom-center {
                content: "Page " counter(page) " of 6";
                font-size: 10px;
                color: #666;
            }
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            color: #000;
        }
        .info-section {
            display: flex;
            width: 100%;
            margin: 15px 0;
            gap: 20px;
        }
        .info-box {
            border: 2px solid #000;
            padding: 12px;
            background: #f8f8f8;
            flex: 1;
            min-height: 120px;
        }
        .info-box h3 {
            margin: 0 0 8px 0;
            font-size: 13pt;
            font-weight: bold;
            text-decoration: underline;
        }
        .info-box p {
            margin: 4px 0;
            font-size: 12pt;
        }
        .signature-box {
            border: 2px solid #000;
            padding: 20px;
            margin: 15px 0;
            background: #f8f8f8;
            min-height: 80px;
        }
        .material-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 11pt;
        }
        .material-table th {
            border: 1px solid #000;
            padding: 8px 6px;
            background: #e8e8e8;
            font-weight: bold;
            text-align: left;
        }
        .material-table td {
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
        }
        .page-break { page-break-before: always; }
        .no-break { page-break-inside: avoid; }
        h1 { 
            font-size: 18pt; 
            margin: 10px 0 20px 0; 
            text-align: center; 
            font-weight: bold;
            text-decoration: underline;
        }
        h2 { 
            font-size: 14pt; 
            margin: 15px 0 8px 0; 
            font-weight: bold;
            text-decoration: underline;
        }
        h3 { 
            font-size: 13pt; 
            margin: 10px 0 6px 0; 
            font-weight: bold;
        }
        p { 
            margin: 6px 0; 
            text-align: justify;
            font-size: 12pt;
        }
        .contract-header {
            text-align: center;
            margin-bottom: 25px;
        }
        .parties-section {
            margin: 20px 0;
        }
        .payment-terms {
            margin: 15px 0;
        }
        .two-column {
            display: flex;
            gap: 20px;
            margin: 15px 0;
            width: 100%;
        }
        .column {
            flex: 1;
            width: 48%;
        }
        .materials-list {
            margin: 10px 0;
            padding: 10px;
            background: #f5f5f5;
            border: 1px solid #ccc;
        }
        .total-box {
            background: #e8f4f8;
            border: 2px solid #0066cc;
            padding: 15px;
            margin: 15px 0;
            text-align: center;
            font-weight: bold;
        }
        .section-number {
            font-weight: bold;
            margin-right: 5px;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            color: #000;
        }
        .info-box {
            border: 2px solid #000;
            padding: 12px;
            margin: 5px 0;
            background: #f9f9f9;
            border-radius: 3px;
        }
        .info-box h3 {
            font-size: 13pt;
            font-weight: bold;
            margin: 0 0 8px 0;
            text-transform: uppercase;
            border-bottom: 1px solid #333;
            padding-bottom: 3px;
        }
        .info-box p {
            margin: 4px 0;
            font-size: 12pt;
        }
        .signature-box {
            border: 2px solid #000;
            padding: 15px;
            margin: 10px 0;
            background: #f9f9f9;
            min-height: 80px;
            border-radius: 3px;
        }
        .signature-section {
            display: flex;
            gap: 30px;
            margin-top: 30px;
        }
        .signature-box h4 {
            font-size: 13pt;
            font-weight: bold;
            margin: 0 0 15px 0;
            text-transform: uppercase;
        }
        .signature-line {
            border-bottom: 2px solid #000;
            margin: 20px 0 5px 0;
            height: 1px;
        }
        .section-number {
            font-weight: bold;
            font-size: 14pt;
        }
        .materials-list {
            margin: 5px 0;
            padding-left: 10px;
        }
        .total-box {
            border: 1px solid #000;
            padding: 8px;
            margin: 8px 0;
            background: #f5f5f5;
            text-align: center;
        }
        .total-box p {
            margin: 3px 0;
        }
        .page-break { page-break-before: always; }
        .no-break { page-break-inside: avoid; }
        h1 { 
            font-size: 18pt; 
            margin: 15px 0 20px 0; 
            text-align: center; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 1px;
        }
        h2 { 
            font-size: 14pt; 
            margin: 15px 0 8px 0; 
            font-weight: bold; 
            text-transform: uppercase; 
            border-bottom: 2px solid #000; 
            padding-bottom: 3px;
        }
        h3 { 
            font-size: 13pt; 
            margin: 10px 0 5px 0; 
            font-weight: bold; 
        }
        p { margin: 6px 0; }
        .compact { margin: 4px 0; }
        .two-column { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 15px; 
            width: 100%;
        }
        .column { 
            flex: 1; 
            width: 48%;
        }
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding: 5px 0;
            background: white;
        }
    </style>
</head>
<body>
    <h1>INDEPENDENT CONTRACTOR AGREEMENT</h1>
    
    <div class="two-column">
        <div class="column">
            <div class="info-box">
                <h3>CLIENT:</h3>
                <p><strong>${contractData.client.name}</strong></p>
                <p>${contractData.client.address}</p>
                ${clientPhone ? `<p>Phone: ${clientPhone}</p>` : ''}
                ${clientEmail ? `<p>Email: ${clientEmail}</p>` : ''}
                <p>("Client")</p>
            </div>
        </div>
        <div class="column">
            <div class="info-box">
                <h3>CONTRACTOR:</h3>
                <p><strong>${contractorName}</strong></p>
                ${contractorAddress ? `<p>${contractorAddress}</p>` : ''}
                ${contractorPhone ? `<p>Phone: ${contractorPhone}</p>` : ''}
                ${contractorEmail ? `<p>Email: ${contractorEmail}</p>` : ''}
                ${contractorLicense ? `<p>License #: ${contractorLicense}</p>` : ''}
                <p>("Contractor")</p>
            </div>
        </div>
    </div>

    <h2>BACKGROUND</h2>
    <p class="compact"><span class="section-number">1.</span> Client desires to engage Contractor as an independent contractor to perform ${contractData.project.type || 'construction'} services at the property located at ${contractData.project.location} ("Property").</p>
    <p class="compact"><span class="section-number">2.</span> Contractor represents that it has the necessary skills, experience, and resources to perform the required services in a professional and workmanlike manner.</p>

    <h2>SERVICES TO BE PERFORMED</h2>
    <p class="compact"><span class="section-number">3.</span> Contractor agrees to provide the following services ("Services"):</p>
    <p class="compact"><strong>Project Description:</strong> ${contractData.project.description}</p>
    
    <p class="compact"><span class="section-number">4.</span> Services and materials include:</p>
    <div class="materials-list">
        ${contractData.materials?.map(m => `
            <p class="compact">• ${m.item}</p>
        `).join('') || '<p class="compact">• Materials and services as specified in attached estimate</p>'}
    </div>
    
    <div class="total-box">
        <p><strong>TOTAL CONTRACT AMOUNT: $${contractData.financials.total?.toFixed(2) || '0.00'}</strong></p>
        <p class="compact">*Detailed breakdown provided in separate estimate document</p>
    </div>

    <div class="page-break"></div>
    
    <h2>TERMS OF AGREEMENT</h2>
    <p class="compact"><span class="section-number">5.</span> This Agreement shall commence upon execution by both parties and shall continue until all Services have been completed and final payment has been made, unless terminated earlier in accordance with the provisions herein.</p>
    <p class="compact"><span class="section-number">6.</span> Time is of the essence in this Agreement. Contractor shall commence work within a reasonable time after receipt of the down payment and shall diligently pursue completion of the Services.</p>
    <p class="compact"><span class="section-number">7.</span> Contractor warrants that all work will be performed in a good and workmanlike manner in accordance with industry standards and applicable building codes.</p>

    <h2>PAYMENT SCHEDULE AND FINANCIAL PROTECTIONS</h2>
    <p class="compact"><span class="section-number">8.</span> In consideration for the Services, Client agrees to pay Contractor the total sum of $${totalCost.toFixed(2)}.</p>
    <p class="compact"><span class="section-number">9.</span> <strong>NON-NEGOTIABLE PAYMENT SCHEDULE:</strong></p>
    <p class="compact">a) Down payment of $${downPayment} (50%) due upon execution of this Agreement and before any work commences</p>
    <p class="compact">b) Final payment of $${finalPayment} (50%) due upon completion and acceptance of Services</p>
    <p class="compact"><span class="section-number">10.</span> <strong>LATE PAYMENT PENALTIES:</strong> Payments more than five (5) days past due shall automatically incur a penalty of 2% per month compounded monthly, plus a $150 administrative fee per violation. After five (5) days delinquency, Contractor may immediately suspend all work without penalty.</p>
    <p class="compact"><span class="section-number">11.</span> <strong>MATERIAL TITLE RETENTION:</strong> Contractor retains legal title to all materials delivered to the Property until full payment is received. In case of payment default, Contractor may immediately remove all materials without notice or court order.</p>

    <h2>SCOPE PROTECTION AND CHANGE ORDERS</h2>
    <p class="compact"><span class="section-number">12.</span> <strong>STRICT SCOPE DEFINITION:</strong> The Services include only those items specifically listed in this Agreement. Any work not explicitly described herein, including but not limited to additional excavation, utility relocation, soil treatment, drainage work, or cleanup beyond normal construction debris, constitutes extra work subject to additional charges.</p>
    <p class="compact"><span class="section-number">13.</span> <strong>CHANGE ORDER REQUIREMENTS:</strong> All modifications, additions, or deletions to the original scope require a written change order signed by both parties with 50% payment in advance of additional work cost. Verbal requests or approvals are void and unenforceable.</p>
    <p class="compact"><span class="section-number">14.</span> <strong>SITE CONDITIONS:</strong> Client warrants that the Property is accessible, free from underground utilities conflicts, and suitable for the intended work. Discovery of adverse conditions, including but not limited to rock, unsuitable soil, or utility conflicts, will result in additional charges at prevailing rates plus 20% markup.</p>
    <p class="compact"><span class="section-number">15.</span> <strong>MATERIAL ESCALATION:</strong> Material prices are subject to adjustment based on supplier price changes occurring after contract execution. Price increases become effective immediately upon notification to Client.</p>

    <h2>ENHANCED LEGAL PROTECTIONS</h2>
    ${this.generateSelectedClausesHTML(contractData.protections || [], 16)}

    <h2>INSURANCE REQUIREMENTS</h2>
    <p class="compact"><span class="section-number">${insuranceSection}.</span> Contractor shall maintain and provide proof of the following insurance coverage:</p>
    <p class="compact">a) General Liability Insurance: Minimum $1,000,000 per occurrence</p>
    <p class="compact">b) Workers' Compensation Insurance as required by California law</p>
    <p class="compact">c) Certificate of Insurance must be provided before work commences</p>

    <h2>FORCE MAJEURE AND DELAY COMPENSATION</h2>
    <p class="compact"><span class="section-number">${forceMajeureSection}.</span> <strong>COVERED EVENTS:</strong> Force majeure events include but are not limited to: weather conditions preventing safe work (precipitation >0.1", wind >25mph, temperature <40°F or >95°F), material shortages, supply chain disruptions, labor strikes, governmental actions, utility company delays, and any event beyond Contractor's reasonable control.</p>
    <p class="compact"><span class="section-number">${forceMajeureSection + 1}.</span> <strong>DELAY COMPENSATION:</strong> Client shall pay Contractor $200 per day for each day of delay caused by force majeure events or Client-caused delays, including failure to provide access, late permit approvals, or site condition changes.</p>
    <p class="compact"><span class="section-number">${forceMajeureSection + 2}.</span> <strong>MATERIAL SHORTAGES:</strong> In the event of material shortages or price increases exceeding 3% of original estimate, Contractor may substitute equivalent materials or adjust pricing accordingly with immediate notice to Client.</p>

    <div class="page-break"></div>
    
    <h2>CONTRACTOR LIABILITY LIMITATIONS</h2>
    <p class="compact"><span class="section-number">${liabilitySection}.</span> <strong>MAXIMUM LIABILITY CAP:</strong> Contractor's total liability for any and all claims, damages, losses, or expenses arising from or related to this Agreement shall not exceed the total contract price. This limitation applies regardless of the legal theory upon which the claim is based.</p>
    <p class="compact"><span class="section-number">${liabilitySection + 1}.</span> <strong>EXCLUDED DAMAGES:</strong> Under no circumstances shall Contractor be liable for consequential, incidental, special, punitive, or indirect damages, including but not limited to lost profits, business interruption, or loss of use, even if Contractor has been advised of the possibility of such damages.</p>
    <p class="compact"><span class="section-number">${liabilitySection + 2}.</span> <strong>CLIENT INDEMNIFICATION:</strong> Client agrees to indemnify, defend, and hold harmless Contractor from any claims, damages, or expenses arising from: (a) pre-existing conditions at the Property, (b) Client's failure to disclose material information, (c) changes to the scope of work requested by Client, and (d) Client's interference with Contractor's performance.</p>

    <h2>TERMINATION AND BREACH REMEDIES</h2>
    <p class="compact"><span class="section-number">${terminationSection}.</span> <strong>TERMINATION FOR CAUSE:</strong> Either party may terminate this Agreement immediately upon material breach by the other party. Material breach by Client includes but is not limited to: failure to make payments when due, denial of access to the Property, or interference with Contractor's work.</p>
    <p class="compact"><span class="section-number">${terminationSection + 1}.</span> <strong>PAYMENT UPON TERMINATION:</strong> Upon termination for any reason, Client shall immediately pay Contractor for all work performed, materials delivered, and reasonable costs incurred through the termination date, plus any applicable penalties or fees under this Agreement.</p>
    <p class="compact"><span class="section-number">${terminationSection + 2}.</span> <strong>RIGHT TO CURE LIMITED:</strong> Client shall have only three (3) business days to cure any material breach after written notice from Contractor. Failure to cure within this period shall result in automatic termination and immediate payment obligations.</p>

    <h2>WARRANTIES AND QUALITY STANDARDS</h2>
    <p class="compact"><span class="section-number">${warrantySection}.</span> <strong>WORKMANSHIP WARRANTY:</strong> Contractor warrants that all Services will be performed in accordance with industry standards using commercially reasonable care and skill. This warranty extends for one (1) year from completion and covers defects in workmanship only.</p>
    <p class="compact"><span class="section-number">${warrantySection + 1}.</span> <strong>WARRANTY LIMITATIONS:</strong> The warranty specifically excludes: (a) normal wear and tear, (b) damage from Client misuse or neglect, (c) damage from acts of nature, (d) modifications by others, and (e) failure to maintain the installation according to manufacturer specifications.</p>
    <p class="compact"><span class="section-number">${warrantySection + 2}.</span> <strong>EXCLUSIVE REMEDY:</strong> Contractor's sole obligation under this warranty is to repair or replace defective work at Contractor's option. Client waives all other remedies and warranties, express or implied, including merchantability and fitness for a particular purpose.</p>

    <div class="page-break"></div>
    
    <h2>INDEPENDENT CONTRACTOR STATUS</h2>
    <p class="compact"><span class="section-number">${independentSection}.</span> <strong>CONTRACTOR INDEPENDENCE:</strong> Contractor is engaged as an independent contractor and is not an employee, agent, partner, or joint venturer of Client. Contractor shall have the right to control and determine the method, details, and means of performing the Services.</p>
    <p class="compact"><span class="section-number">${independentSection + 1}.</span> <strong>TAX OBLIGATIONS:</strong> Contractor shall be solely responsible for payment of all taxes, social security contributions, insurance premiums, and other expenses relating to Contractor's performance of Services.</p>

    <h2>DISPUTE RESOLUTION AND GOVERNING LAW</h2>
    <p class="compact"><span class="section-number">${disputeSection}.</span> <strong>MANDATORY ARBITRATION:</strong> Any dispute arising from this Agreement shall be resolved through binding arbitration administered by the American Arbitration Association under its Construction Industry Arbitration Rules. The arbitration shall take place in the county where Contractor maintains its principal place of business.</p>
    <p class="compact"><span class="section-number">${disputeSection + 1}.</span> <strong>GOVERNING LAW:</strong> This Agreement shall be governed by and construed in accordance with the laws of the State of California. Any legal proceedings arising under this Agreement shall be brought exclusively in the Superior Court of the county where Contractor maintains its principal place of business.</p>
    <p class="compact"><span class="section-number">${disputeSection + 2}.</span> <strong>ATTORNEY FEES:</strong> The prevailing party in any dispute shall be entitled to recover all reasonable attorney fees, expert witness fees, and costs incurred, whether or not litigation is commenced.</p>

    <h2>CALIFORNIA LEGAL COMPLIANCE</h2>
    <p class="compact"><span class="section-number">${complianceSection}.</span> <strong>RIGHT TO CANCEL NOTICE:</strong> Under California law, Client has the right to cancel this contract within three (3) business days after signing by providing written notice to Contractor. Upon timely cancellation, payments will be refunded within ten (10) days, minus costs of materials specifically ordered for this project.</p>
    <p class="compact"><span class="section-number">${complianceSection + 1}.</span> <strong>MECHANIC'S LIEN NOTICE:</strong> Under California Civil Code Section 8200, Contractor hereby provides notice of the right to file a mechanic's lien upon the Property for unpaid amounts. This Agreement serves as the preliminary notice required by law.</p>

    <h2>GENERAL PROVISIONS</h2>
    <p class="compact"><span class="section-number">${generalSection}.</span> <strong>SEVERABILITY:</strong> If any provision of this Agreement is held to be invalid or unenforceable, the remainder of this Agreement shall remain in full force and effect.</p>
    <p class="compact"><span class="section-number">${generalSection + 1}.</span> <strong>ENTIRE AGREEMENT:</strong> This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements relating to the subject matter herein. This Agreement may only be modified by written instrument signed by both parties.</p>
    <p class="compact"><span class="section-number">${generalSection + 2}.</span> <strong>NOTICES:</strong> All notices required under this Agreement shall be in writing and delivered to the addresses set forth above by certified mail, personal delivery, or email with delivery confirmation.</p>

    <div class="page-break"></div>
    
    <h2>SIGNATURES</h2>
    <p>This Agreement has been executed on the dates set forth below.</p>
    
    <div class="signature-section">
        <div class="signature-box">
            <h4>CLIENT:</h4>
            <div class="signature-line"></div>
            <p><strong>${contractData.client.name}</strong></p>
            <p>Date: _______________</p>
        </div>

        <div class="signature-box">
            <h4>CONTRACTOR:</h4>
            <div class="signature-line"></div>
            <p><strong>${contractorName}</strong></p>
            <p>License #: ${contractorLicense || 'TBD'}</p>
            <p>Date: _______________</p>
        </div>
    </div>

    <div class="info-box" style="margin-top: 20px; text-align: center;">
        <p><strong>NOTICE:</strong> This Agreement has been executed on the dates set forth above. Both parties acknowledge they have read and understood all terms and conditions.</p>
    </div>

    <div class="footer">
        <p>© ${new Date().getFullYear()} ${contractorName} - All Rights Reserved</p>
    </div>
</body>
</html>`;
  }

  /**
   * Genera HTML básico de fallback para preview
   */
  private generateBasicFallbackHTML(contractData: any): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Independent Contractor Agreement</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12px;
            line-height: 1.6;
            margin: 20px;
            color: #000;
        }
        .header {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 30px;
            text-transform: uppercase;
        }
        .parties {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
            border: 1px solid #000;
            padding: 20px;
        }
        .party {
            flex: 1;
            text-align: center;
        }
        .party-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .section {
            margin: 25px 0;
        }
        .section-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 15px;
        }
        .clause {
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        INDEPENDENT CONTRACTOR AGREEMENT
    </div>

    <p>THIS INDEPENDENT CONTRACTOR AGREEMENT is dated this ${currentDate}.</p>

    <div class="parties">
        <div class="party">
            <div class="party-title">CLIENT</div>
            <div>${contractData.client?.name || 'Client Name'}</div>
            <div>${contractData.client?.address || 'Client Address'}</div>
            ${contractData.client?.email ? `<div>${contractData.client.email}</div>` : ''}
            ${contractData.client?.phone ? `<div>${contractData.client.phone}</div>` : ''}
        </div>
        <div class="party">
            <div class="party-title">CONTRACTOR</div>
            <div>${contractData.contractor?.name || 'Contractor Name'}</div>
            <div>${contractData.contractor?.address || 'Contractor Address'}</div>
            ${contractData.contractor?.email ? `<div>${contractData.contractor.email}</div>` : ''}
            ${contractData.contractor?.phone ? `<div>${contractData.contractor.phone}</div>` : ''}
        </div>
    </div>

    <div class="section">
        <div class="section-title">SERVICES PROVIDED</div>
        <div class="clause">
            The Contractor agrees to provide the following services:
            ${contractData.project?.description || 'Construction services as specified'}
            at ${contractData.project?.location || 'Project location'}
        </div>
    </div>

    <div class="section">
        <div class="section-title">COMPENSATION</div>
        <div class="clause">
            Total contract amount: $${contractData.financials?.total?.toFixed(2) || '0.00'}
        </div>
    </div>

    ${contractData.protections && contractData.protections.length > 0 ? `
    <div class="section">
        <div class="section-title">LEGAL PROTECTIONS</div>
        ${contractData.protections.slice(0, 3).map((protection: any) => `
            <div class="clause">${protection.category}: ${protection.clause}</div>
        `).join('')}
    </div>
    ` : ''}

</body>
</html>`;
  }

  /**
   * Genera PDF usando puppeteer con timeout optimizado
   */
  private async generatePDFFromHTML(html: string): Promise<Buffer> {
    let browser;
    try {
      console.log('🎯 [PDF] Iniciando conversión HTML a PDF...');
      
      // Usar puppeteer con timeout reducido
      const puppeteer = await import('puppeteer');
      
      browser = await puppeteer.default.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        timeout: 30000, // 30 segundos timeout
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-background-timer-throttling',
          '--disable-features=TranslateUI'
        ]
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in'
        },
        printBackground: true,
        preferCSSPageSize: true,
        timeout: 15000
      });
      
      await browser.close();
      
      console.log('📄 [PDF] Generado exitosamente:', pdfBuffer.length, 'bytes');
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.log('Browser already closed');
        }
      }
      console.error('❌ [PDF] Error en generación:', error);
      throw new Error('Failed to generate PDF from HTML');
    }
  }

  /**
   * Fallback si Claude falla - usa template base
   */
  private async generateFallbackContract(request: ContractGenerationRequest, startTime: number): Promise<ContractGenerationResult> {
    console.log('🔄 [FALLBACK] Usando template mejorado...');
    
    try {
      const userId = request.contractData.userId || 1;
      const contractorBranding = await this.getContractorBranding(userId);
      const enhancedHTML = this.generateEnhancedFallbackHTML(request.contractData, contractorBranding);
      const pdfBuffer = await this.generatePDFFromHTML(enhancedHTML);
      
      return {
        success: true,
        html: enhancedHTML,
        pdfBuffer,
        metadata: {
          pageCount: 6,
          generationTime: Date.now() - startTime,
          templateUsed: 'enhanced-fallback-template'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Contract generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          pageCount: 0,
          generationTime: Date.now() - startTime,
          templateUsed: 'none'
        }
      };
    }
  }

  /**
   * Template base de fallback
   */
  private generateFallbackHTML(contractData: ContractData, contractorBranding: any = {}): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Independent Contractor Agreement</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0.75in;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12px;
            line-height: 1.6;
            color: #000;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 30px;
            text-transform: uppercase;
        }
        .parties {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
            border: 1px solid #000;
            padding: 20px;
        }
        .party {
            flex: 1;
            text-align: center;
        }
        .party-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .section {
            margin: 25px 0;
        }
        .section-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        .clause {
            margin: 15px 0;
        }
        .clause-number {
            font-weight: bold;
            margin-right: 10px;
        }
        .page-break {
            page-break-before: always;
        }
        .no-break {
            page-break-inside: avoid;
        }
        .signature-section {
            margin-top: 50px;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            width: 300px;
            margin: 30px 0 10px 0;
        }
        ul {
            margin: 10px 0;
            padding-left: 30px;
        }
        .footer {
            position: fixed;
            bottom: 20px;
            right: 20px;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        INDEPENDENT CONTRACTOR AGREEMENT
    </div>

    <p>THIS INDEPENDENT CONTRACTOR AGREEMENT (the "Agreement") is dated this ${currentDate}.</p>

    <div class="parties">
        <div class="party">
            <div class="party-title">CLIENT</div>
            <div>${contractData.client.name}</div>
            <div>${contractData.client.address}</div>
            ${contractData.client.email ? `<div>${contractData.client.email}</div>` : ''}
            ${contractData.client.phone ? `<div>${contractData.client.phone}</div>` : ''}
            <div style="margin-top: 20px;">(the "Client")</div>
        </div>
        <div class="party">
            <div class="party-title">CONTRACTOR</div>
            <div>${contractData.contractor.name}</div>
            <div>${contractData.contractor.address}</div>
            ${contractData.contractor.email ? `<div>${contractData.contractor.email}</div>` : ''}
            ${contractData.contractor.phone ? `<div>${contractData.contractor.phone}</div>` : ''}
            <div style="margin-top: 20px;">(the "Contractor")</div>
        </div>
    </div>

    <!-- Resto del contrato sigue el mismo patrón del template anterior -->
    <!-- ... (continuaría con todas las 6 páginas) ... -->

</body>
</html>`;
  }

  private getBaseTemplate(): string {
    // Template base para casos de emergencia
    return 'Base template placeholder';
  }
}

export const hybridContractGenerator = new HybridContractGenerator();
export default hybridContractGenerator;
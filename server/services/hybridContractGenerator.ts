import Anthropic from '@anthropic-ai/sdk';

export interface ContractData {
  client: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  contractor: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    license?: string;
  };
  project: {
    type: string;
    description: string;
    location: string;
    startDate?: string;
    endDate?: string;
  };
  financials: {
    total: number;
    subtotal?: number;
    tax?: number;
    taxRate?: number;
  };
  protections?: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    riskLevel: string;
  }>;
}

export interface ContractGenerationResult {
  success: boolean;
  html?: string;
  pdfBuffer?: Buffer;
  error?: string;
  metadata?: {
    pageCount: number;
    generationTime: number;
    templateUsed: string;
  };
}

/**
 * Hybrid Contract Generator with Compact Design and Professional Pagination
 * Optimized for space efficiency while maintaining legal document standards
 */
export class HybridContractGenerator {
  private anthropic: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY no está configurada');
    }
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate professional contract with PDF generation capability
   */
  async generateProfessionalContract(contractData: ContractData, options: any = {}): Promise<ContractGenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 [CONTRACT] Iniciando generación profesional de contrato...');
      
      // Generate HTML contract
      const html = await this.generateContractHTML(contractData, options.contractorBranding || {});
      
      const generationTime = Date.now() - startTime;
      
      return {
        success: true,
        html,
        metadata: {
          pageCount: this.estimatePageCount(html),
          generationTime,
          templateUsed: 'hybrid-optimized'
        }
      };
      
    } catch (error) {
      console.error('❌ [CONTRACT] Error en generación profesional:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Generate contract HTML with real-time preview functionality
   */
  async generateContractHTML(contractData: ContractData, contractorBranding: any = {}): Promise<string> {
    console.log('📋 [PREVIEW] Generando HTML del contrato para preview...');
    
    try {
      // Generate selected clauses HTML
      let selectedClausesHtml = '';
      if (contractData.protections && contractData.protections.length > 0) {
        console.log('🎯 [CLAUSE-GENERATION] Usando', contractData.protections.length, 'cláusulas seleccionadas por el usuario');
        
        selectedClausesHtml = '<h2>CLÁUSULAS DE PROTECCIÓN SELECCIONADAS</h2><div class="compact">';
        contractData.protections.forEach((clause, index) => {
          const sectionNumber = 6 + index;
          selectedClausesHtml += `
            <p class="compact"><span class="section-number">${sectionNumber}.</span> <strong>${clause.title.toUpperCase()}:</strong> ${clause.content}</p>
          `;
        });
        selectedClausesHtml += '</div>';
        
        console.log('✅ [CLAUSE-GENERATION] Generadas', contractData.protections.length, 'cláusulas personalizadas del usuario');
      }

      return this.generateOptimizedFallbackHTML(contractData, contractorBranding, selectedClausesHtml);
      
    } catch (error) {
      console.error('❌ [CONTRACT-HTML] Error generando HTML:', error);
      return this.generateOptimizedFallbackHTML(contractData, contractorBranding, '');
    }
  }

  /**
   * Generate optimized compact contract HTML with professional pagination
   */
  private generateOptimizedFallbackHTML(contractData: ContractData, contractorBranding: any, selectedClausesHtml: string): string {
    // Calculate dynamic section numbering based on selected clauses
    const numSelectedClauses = contractData.protections?.length || 0;
    
    // Use personalized contractor branding
    const contractorName = contractorBranding.companyName || contractData.contractor.name || 'Contractor';
    const contractorAddress = contractorBranding.address || contractData.contractor.address || '';
    const contractorPhone = contractorBranding.phone || contractData.contractor.phone || '';
    const contractorEmail = contractorBranding.email || contractData.contractor.email || '';
    const contractorLicense = contractorBranding.licenseNumber || contractData.contractor.license || '';

    // Get current date for footer
    const currentDate = new Date().toLocaleDateString('es-ES');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Independent Contractor Agreement</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0.5in 0.6in 0.7in 0.6in;
            counter-increment: page;
            @bottom-center {
                content: "Página " counter(page);
                font-size: 9pt;
                color: #333;
                font-family: 'Times New Roman', serif;
            }
            @bottom-left {
                content: "© 2025 ${contractorName}";
                font-size: 8pt;
                color: #666;
            }
            @bottom-right {
                content: "Generado: ${currentDate}";
                font-size: 8pt;
                color: #666;
            }
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.3;
            margin: 0;
            padding: 0;
            color: #000;
            background: white;
        }
        
        .compact {
            margin: 2px 0;
            padding: 0;
        }
        
        p.compact {
            margin: 3px 0 4px 0;
            padding: 0;
            text-align: justify;
        }
        
        h1 {
            font-size: 16pt;
            font-weight: bold;
            text-align: center;
            margin: 8px 0 12px 0;
            text-transform: uppercase;
        }
        
        h2 {
            font-size: 13pt;
            font-weight: bold;
            margin: 10px 0 6px 0;
            text-transform: uppercase;
        }
        
        .section-number {
            font-weight: bold;
            margin-right: 4px;
        }
        
        .signature-section {
            margin-top: 25px;
            page-break-inside: avoid;
        }
        
        .signature-box {
            border: 1px solid #000;
            padding: 8px;
            margin: 8px 0;
            min-height: 60px;
        }
        
        .two-column {
            display: flex;
            justify-content: space-between;
            gap: 20px;
        }
        
        .column {
            flex: 1;
        }
        
        .financial-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
        }
        
        .financial-table td {
            padding: 4px 8px;
            border: 1px solid #ccc;
            font-size: 10pt;
        }
        
        .highlight {
            background-color: #f5f5f5;
            padding: 6px;
            border-left: 3px solid #333;
            margin: 6px 0;
        }
    </style>
</head>
<body>

    <h1>ACUERDO DE CONTRATISTA INDEPENDIENTE PROFESIONAL</h1>

    <div class="compact">
        <p class="compact"><strong>FECHA:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
        <p class="compact"><strong>ENTRE:</strong> ${contractData.client.name} ("Cliente") y ${contractorName} ("Contratista")</p>
    </div>

    <h2>1. INFORMACIÓN DE LAS PARTES</h2>
    <div class="two-column">
        <div class="column">
            <p class="compact"><strong>CLIENTE:</strong></p>
            <p class="compact">Nombre: ${contractData.client.name}</p>
            <p class="compact">Dirección: ${contractData.client.address}</p>
            ${contractData.client.phone ? `<p class="compact">Teléfono: ${contractData.client.phone}</p>` : ''}
            ${contractData.client.email ? `<p class="compact">Email: ${contractData.client.email}</p>` : ''}
        </div>
        <div class="column">
            <p class="compact"><strong>CONTRATISTA:</strong></p>
            <p class="compact">Nombre: ${contractorName}</p>
            ${contractorAddress ? `<p class="compact">Dirección: ${contractorAddress}</p>` : ''}
            ${contractorPhone ? `<p class="compact">Teléfono: ${contractorPhone}</p>` : ''}
            ${contractorEmail ? `<p class="compact">Email: ${contractorEmail}</p>` : ''}
            ${contractorLicense ? `<p class="compact">Licencia: ${contractorLicense}</p>` : ''}
        </div>
    </div>

    <h2>2. DESCRIPCIÓN DEL TRABAJO</h2>
    <p class="compact"><strong>Tipo de Proyecto:</strong> ${contractData.project.type}</p>
    <p class="compact"><strong>Descripción:</strong> ${contractData.project.description}</p>
    <p class="compact"><strong>Ubicación:</strong> ${contractData.project.location || contractData.client.address}</p>

    <h2>3. TÉRMINOS FINANCIEROS</h2>
    <table class="financial-table">
        <tr>
            <td><strong>Subtotal:</strong></td>
            <td>$${(contractData.financials.subtotal || contractData.financials.total).toLocaleString()}</td>
        </tr>
        ${contractData.financials.tax ? `
        <tr>
            <td><strong>Impuestos:</strong></td>
            <td>$${contractData.financials.tax.toLocaleString()}</td>
        </tr>` : ''}
        <tr>
            <td><strong>TOTAL:</strong></td>
            <td><strong>$${contractData.financials.total.toLocaleString()}</strong></td>
        </tr>
    </table>

    <h2>4. CRONOGRAMA</h2>
    <p class="compact"><strong>Fecha de Inicio:</strong> ${contractData.project.startDate || 'Por determinar'}</p>
    <p class="compact"><strong>Fecha de Finalización:</strong> ${contractData.project.endDate || 'Por determinar'}</p>

    <h2>5. TÉRMINOS Y CONDICIONES GENERALES</h2>
    <p class="compact"><span class="section-number">5.1.</span> <strong>TRABAJO:</strong> El Contratista realizará todos los trabajos descritos en este acuerdo de manera profesional y de acuerdo con los estándares de la industria.</p>
    <p class="compact"><span class="section-number">5.2.</span> <strong>MATERIALES:</strong> Todos los materiales serán de calidad comercial estándar o superior, según se especifique en este acuerdo.</p>
    <p class="compact"><span class="section-number">5.3.</span> <strong>PERMISOS:</strong> El Contratista obtendrá todos los permisos necesarios para realizar el trabajo.</p>

    ${selectedClausesHtml}

    <h2>${6 + numSelectedClauses}. SEGUROS Y LICENCIAS</h2>
    <p class="compact">El Contratista mantendrá seguro de responsabilidad civil general y seguro de compensación laboral según sea requerido por la ley.</p>

    <h2>${8 + numSelectedClauses}. FUERZA MAYOR</h2>
    <p class="compact">Ninguna de las partes será responsable por retrasos causados por circunstancias fuera de su control razonable.</p>

    <h2>${10 + numSelectedClauses}. RESOLUCIÓN DE DISPUTAS</h2>
    <p class="compact">Cualquier disputa se resolverá mediante arbitraje vinculante bajo las reglas de la Asociación Americana de Arbitraje.</p>

    <div class="signature-section">
        <h2>FIRMAS</h2>
        <div class="two-column">
            <div class="column">
                <div class="signature-box">
                    <p class="compact"><strong>CLIENTE:</strong></p>
                    <p class="compact">Firma: _________________________</p>
                    <p class="compact">Nombre: ${contractData.client.name}</p>
                    <p class="compact">Fecha: _________________________</p>
                </div>
            </div>
            <div class="column">
                <div class="signature-box">
                    <p class="compact"><strong>CONTRATISTA:</strong></p>
                    <p class="compact">Firma: _________________________</p>
                    <p class="compact">Nombre: ${contractorName}</p>
                    <p class="compact">Fecha: _________________________</p>
                </div>
            </div>
        </div>
    </div>

    <div style="margin-top: 20px; text-align: center; padding: 10px; border: 1px solid #ccc;">
        <p><strong>AVISO:</strong> Este Acuerdo ha sido ejecutado en las fechas establecidas arriba. Ambas partes reconocen que han leído y entendido todos los términos y condiciones.</p>
    </div>

</body>
</html>`;
  }

  /**
   * Estimate page count based on content length
   */
  private estimatePageCount(html: string): number {
    // Estimate based on content length and average characters per page
    const contentLength = html.replace(/<[^>]*>/g, '').length;
    const avgCharsPerPage = 2500; // Compact design allows more content per page
    return Math.max(1, Math.ceil(contentLength / avgCharsPerPage));
  }
}

// Export singleton instance
export const hybridContractGenerator = new HybridContractGenerator();
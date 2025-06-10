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
    
    const insuranceSection = 6 + numSelectedClauses;
    const forceMajeureSection = insuranceSection + 2;
    const liabilitySection = forceMajeureSection + 3;
    const terminationSection = liabilitySection + 3;
    const warrantySection = terminationSection + 3;
    const independentSection = warrantySection + 3;
    const disputeSection = independentSection + 2;
    const complianceSection = disputeSection + 3;
    const generalSection = complianceSection + 2;

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
        }
        .info-section {
            display: flex;
            width: 100%;
            margin: 6px 0;
            gap: 12px;
        }
        .info-box {
            border: 2px solid #000;
            padding: 8px;
            background: #f8f8f8;
            flex: 1;
            min-height: 70px;
        }
        .info-box h3 {
            margin: 0 0 4px 0;
            font-size: 12pt;
            font-weight: bold;
            text-decoration: underline;
        }
        .info-box p {
            margin: 2px 0;
            font-size: 10pt;
            line-height: 1.2;
        }
        .signature-box {
            border: 2px solid #000;
            padding: 12px;
            margin: 8px 0;
            background: #f8f8f8;
            min-height: 60px;
        }
        .material-table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
            font-size: 10pt;
        }
        .material-table th {
            border: 1px solid #000;
            padding: 4px;
            background: #e8e8e8;
            font-weight: bold;
            text-align: left;
        }
        .material-table td {
            border: 1px solid #000;
            padding: 3px;
            text-align: left;
        }
        .page-break { page-break-before: always; }
        .no-break { page-break-inside: avoid; }
        h1 { 
            font-size: 16pt; 
            margin: 8px 0 12px 0; 
            text-align: center; 
            font-weight: bold;
            text-decoration: underline;
        }
        h2 { 
            font-size: 13pt; 
            margin: 10px 0 6px 0; 
            font-weight: bold;
            text-decoration: underline;
        }
        h3 { 
            font-size: 12pt; 
            margin: 8px 0 4px 0; 
            font-weight: bold;
        }
        p { 
            margin: 4px 0; 
            text-align: justify;
            font-size: 11pt;
            line-height: 1.3;
        }
        .compact {
            margin: 2px 0;
            line-height: 1.2;
        }
        .contract-header {
            text-align: center;
            margin-bottom: 15px;
        }
        .total-box {
            background: #e8f4f8;
            border: 2px solid #0066cc;
            padding: 8px;
            margin: 8px 0;
            text-align: center;
            font-weight: bold;
            font-size: 11pt;
        }
        .section-number {
            font-weight: bold;
            margin-right: 3px;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            height: 25px;
            margin: 6px 0;
        }
        .text-center { text-align: center; }
    </style>
</head>
<body>

    <div class="contract-header">
        <h1>INDEPENDENT CONTRACTOR AGREEMENT</h1>
        <p><strong>Contract ID:</strong> CON-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}</p>
    </div>

    <div class="info-section">
        <div class="info-box">
            <h3>CONTRATISTA</h3>
            <p><strong>${contractorName}</strong></p>
            <p>${contractorAddress}</p>
            <p>Teléfono: ${contractorPhone}</p>
            <p>Email: ${contractorEmail}</p>
            <p>Licencia: ${contractorLicense}</p>
        </div>
        
        <div class="info-box">
            <h3>CLIENTE</h3>
            <p><strong>${contractData.client.name}</strong></p>
            <p>${contractData.client.address}</p>
            <p>Teléfono: ${contractData.client.phone || 'N/A'}</p>
            <p>Email: ${contractData.client.email || 'N/A'}</p>
        </div>
    </div>

    <h2>DETALLES DEL PROYECTO</h2>
    <div class="compact">
        <p><strong>Descripción:</strong> ${contractData.project.description}</p>
        <p><strong>Tipo de Proyecto:</strong> ${contractData.project.type || 'Instalación de Cerca'}</p>
        <p><strong>Fecha de Inicio:</strong> ${contractData.project.startDate || 'Por determinar'}</p>
        <p><strong>Fecha de Finalización:</strong> ${contractData.project.endDate || 'Por determinar'}</p>
    </div>

    <h2>TÉRMINOS FINANCIEROS</h2>
    <div class="total-box">
        <p><strong>SUBTOTAL:</strong> $${(contractData.financials.subtotal || contractData.financials.total * 0.9).toLocaleString()}</p>
        <p><strong>IMPUESTOS:</strong> $${(contractData.financials.tax || contractData.financials.total * 0.1).toLocaleString()}</p>
        <p><strong>TOTAL DEL CONTRATO:</strong> $${contractData.financials.total.toLocaleString()}</p>
        <p><strong>DEPÓSITO (50%):</strong> $${(contractData.financials.total * 0.5).toLocaleString()}</p>
        <p><strong>SALDO FINAL:</strong> $${(contractData.financials.total * 0.5).toLocaleString()}</p>
    </div>

    <h2>TÉRMINOS Y CONDICIONES PRINCIPALES</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">1.</span> <strong>PARTES:</strong> Este acuerdo se celebra entre ${contractorName} (el "Contratista") y ${contractData.client.name} (el "Cliente").</p>
        <p class="compact"><span class="section-number">2.</span> <strong>ALCANCE DEL TRABAJO:</strong> El Contratista proporcionará todos los materiales, mano de obra, equipo y servicios necesarios para ${contractData.project.description}.</p>
        <p class="compact"><span class="section-number">3.</span> <strong>PRECIO DEL CONTRATO:</strong> El precio total del contrato es de $${contractData.financials.total.toLocaleString()}, pagadero según los términos establecidos.</p>
        <p class="compact"><span class="section-number">4.</span> <strong>PROGRAMA DE PAGOS:</strong> Depósito inicial de $${(contractData.financials.total * 0.5).toLocaleString()} al firmar. Saldo de $${(contractData.financials.total * 0.5).toLocaleString()} al completar el trabajo.</p>
        <p class="compact"><span class="section-number">5.</span> <strong>MATERIALES:</strong> Todos los materiales serán de primera calidad y cumplirán con los códigos de construcción locales aplicables.</p>
    </div>

    <!-- Selected Defense Clauses -->
    ${selectedClausesHtml}

    <h2>SEGURO Y RESPONSABILIDAD</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">${insuranceSection}.</span> <strong>SEGURO DE RESPONSABILIDAD GENERAL:</strong> El Contratista mantendrá un seguro de responsabilidad general comercial con límites mínimos de $1,000,000 por incidente y $2,000,000 agregado anual.</p>
        <p class="compact"><span class="section-number">${insuranceSection + 1}.</span> <strong>SEGURO DE COMPENSACIÓN LABORAL:</strong> El Contratista proporcionará cobertura de compensación laboral según los requisitos estatales para todos los empleados y subcontratistas.</p>
    </div>

    <h2>FUERZA MAYOR</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">${forceMajeureSection}.</span> <strong>EVENTOS DE FUERZA MAYOR:</strong> Ninguna de las partes será responsable por demoras o incumplimientos causados por actos de Dios, guerra, terrorismo, disturbios civiles, huelgas, epidemias, regulaciones gubernamentales, incendios, inundaciones u otras causas fuera del control razonable de las partes.</p>
        <p class="compact"><span class="section-number">${forceMajeureSection + 1}.</span> <strong>NOTIFICACIÓN:</strong> La parte afectada notificará por escrito a la otra parte dentro de los 7 días del evento de fuerza mayor.</p>
        <p class="compact"><span class="section-number">${forceMajeureSection + 2}.</span> <strong>MITIGACIÓN:</strong> Las partes harán esfuerzos razonables para mitigar los efectos de cualquier evento de fuerza mayor.</p>
    </div>

    <div class="page-break"></div>
    
    <h2>LIMITACIÓN DE RESPONSABILIDAD</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">${liabilitySection}.</span> <strong>LÍMITE DE RESPONSABILIDAD:</strong> La responsabilidad total del Contratista bajo este acuerdo no excederá el monto total del contrato.</p>
        <p class="compact"><span class="section-number">${liabilitySection + 1}.</span> <strong>EXCLUSIÓN DE DAÑOS CONSECUENCIALES:</strong> En ningún caso el Contratista será responsable por daños indirectos, incidentales, especiales o consecuenciales.</p>
        <p class="compact"><span class="section-number">${liabilitySection + 2}.</span> <strong>RECUPERACIÓN DE HONORARIOS LEGALES:</strong> En caso de disputa legal, la parte prevaleciente tendrá derecho a recuperar todos los honorarios razonables de abogados, costos de testigos expertos y gastos incurridos.</p>
    </div>

    <h2>TERMINACIÓN</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">${terminationSection}.</span> <strong>TERMINACIÓN POR CONVENIENCIA:</strong> Cualquier parte puede terminar este acuerdo con 30 días de aviso previo por escrito.</p>
        <p class="compact"><span class="section-number">${terminationSection + 1}.</span> <strong>TERMINACIÓN POR CAUSA:</strong> Este acuerdo puede ser terminado inmediatamente por incumplimiento material que no sea curado dentro de 10 días después del aviso escrito.</p>
        <p class="compact"><span class="section-number">${terminationSection + 2}.</span> <strong>EFECTOS DE LA TERMINACIÓN:</strong> Al terminar, el Cliente pagará por todo el trabajo completado satisfactoriamente hasta la fecha de terminación.</p>
    </div>

    <h2>GARANTÍA</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">${warrantySection}.</span> <strong>GARANTÍA DE MANO DE OBRA:</strong> El Contratista garantiza que toda la mano de obra estará libre de defectos por un período de 2 años desde la finalización.</p>
        <p class="compact"><span class="section-number">${warrantySection + 1}.</span> <strong>GARANTÍA DE MATERIALES:</strong> Los materiales estarán cubiertos por las garantías del fabricante, las cuales serán transferidas al Cliente.</p>
        <p class="compact"><span class="section-number">${warrantySection + 2}.</span> <strong>EXCLUSIONES DE GARANTÍA:</strong> Las garantías no cubren daños causados por uso indebido, negligencia, alteraciones no autorizadas o desgaste normal.</p>
    </div>

    <h2>CONTRATISTA INDEPENDIENTE</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">${independentSection}.</span> <strong>RELACIÓN INDEPENDIENTE:</strong> El Contratista es un contratista independiente y no un empleado del Cliente. El Contratista es responsable de todos los impuestos, seguro social y otros beneficios.</p>
        <p class="compact"><span class="section-number">${independentSection + 1}.</span> <strong>CONTROL:</strong> El Contratista mantendrá control exclusivo sobre los métodos y medios de realizar el trabajo, sujeto a los resultados especificados en este acuerdo.</p>
    </div>

    <h2>RESOLUCIÓN DE DISPUTAS</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">${disputeSection}.</span> <strong>MEDIACIÓN OBLIGATORIA:</strong> Las partes primero intentarán resolver cualquier disputa a través de mediación con un mediador mutuamente acordado.</p>
        <p class="compact"><span class="section-number">${disputeSection + 1}.</span> <strong>ARBITRAJE VINCULANTE:</strong> Si la mediación falla, las disputas serán resueltas a través de arbitraje vinculante bajo las reglas de la Asociación Americana de Arbitraje.</p>
        <p class="compact"><span class="section-number">${disputeSection + 2}.</span> <strong>HONORARIOS DE ABOGADOS:</strong> La parte prevaleciente tendrá derecho a recuperar todos los honorarios razonables de abogados, honorarios de testigos expertos y costos incurridos, ya sea que se inicie o no el litigio.</p>
    </div>

    <h2>CUMPLIMIENTO LEGAL DE CALIFORNIA</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">${complianceSection}.</span> <strong>AVISO DE DERECHO DE CANCELACIÓN:</strong> Bajo la ley de California, el Cliente tiene derecho a cancelar este contrato dentro de tres (3) días hábiles después de firmarlo proporcionando aviso escrito al Contratista. Tras la cancelación oportuna, los pagos serán reembolsados dentro de diez (10) días, menos los costos de materiales específicamente ordenados para este proyecto.</p>
        <p class="compact"><span class="section-number">${complianceSection + 1}.</span> <strong>AVISO DE GRAVAMEN MECÁNICO:</strong> Bajo el Código Civil de California Sección 8200, el Contratista por este medio proporciona aviso del derecho a presentar un gravamen mecánico sobre la Propiedad por montos impagos. Este Acuerdo sirve como el aviso preliminar requerido por ley.</p>
    </div>

    <h2>DISPOSICIONES GENERALES</h2>
    <div class="compact">
        <p class="compact"><span class="section-number">${generalSection}.</span> <strong>DIVISIBILIDAD:</strong> Si cualquier disposición de este Acuerdo se considera inválida o inaplicable, el resto de este Acuerdo permanecerá en pleno vigor y efecto.</p>
        <p class="compact"><span class="section-number">${generalSection + 1}.</span> <strong>ACUERDO COMPLETO:</strong> Este Acuerdo constituye el acuerdo completo entre las partes y reemplaza todas las negociaciones, representaciones o acuerdos previos relacionados con el tema aquí tratado. Este Acuerdo solo puede ser modificado por instrumento escrito firmado por ambas partes.</p>
        <p class="compact"><span class="section-number">${generalSection + 2}.</span> <strong>AVISOS:</strong> Todos los avisos requeridos bajo este Acuerdo serán por escrito y entregados a las direcciones establecidas arriba por correo certificado, entrega personal o correo electrónico con confirmación de entrega.</p>
    </div>

    <div class="page-break"></div>
    
    <h2>FIRMAS</h2>
    <p>Este Acuerdo ha sido ejecutado en las fechas establecidas a continuación.</p>
    
    <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div class="signature-box" style="flex: 1;">
            <h4>CLIENTE:</h4>
            <div class="signature-line"></div>
            <p><strong>${contractData.client.name}</strong></p>
            <p>Fecha: _______________</p>
        </div>

        <div class="signature-box" style="flex: 1;">
            <h4>CONTRATISTA:</h4>
            <div class="signature-line"></div>
            <p><strong>${contractorName}</strong></p>
            <p>Licencia #: ${contractorLicense}</p>
            <p>Fecha: _______________</p>
        </div>
    </div>

    <div style="margin-top: 20px; text-align: center; padding: 10px; border: 1px solid #ccc;">
        <p><strong>AVISO:</strong> Este Acuerdo ha sido ejecutado en las fechas establecidas arriba. Ambas partes reconocen que han leído y entendido todos los términos y condiciones.</p>
    </div>

</body>
</html>`;
  }
}

// Export singleton instance
export const hybridContractGenerator = new HybridContractGenerator();
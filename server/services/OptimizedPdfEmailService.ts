/**
 * Servicio Optimizado de PDF para Emails - PDF Monkey Integration
 * 
 * Sistema completo y robusto para generar PDFs profesionales
 * y enviarlos por email con manejo avanzado de errores
 */

import { pdfMonkeyService, PDFMonkeyResult } from './PDFMonkeyService.js';
import { resendService } from './resendService.js';
import { simpleTracker } from './SimpleEstimateTracker.js';

export interface EstimateEmailData {
  estimateNumber: string;
  date: string;
  client: {
    name: string;
    email: string;
    address?: string;
    phone?: string;
  };
  contractor: {
    companyName: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    license?: string;
    logo?: string;
    website?: string;
  };
  project: {
    type: string;
    description: string;
    location?: string;
    scopeOfWork?: string;
  };
  items: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
  terms?: string;
  validUntil?: string;
}

export interface PdfEmailResult {
  success: boolean;
  messageId?: string;
  pdfGenerated: boolean;
  pdfSize?: number;
  processingTime: number;
  error?: string;
  estimateTracked?: boolean;
}

export class OptimizedPdfEmailService {
  private static instance: OptimizedPdfEmailService;

  public static getInstance(): OptimizedPdfEmailService {
    if (!OptimizedPdfEmailService.instance) {
      OptimizedPdfEmailService.instance = new OptimizedPdfEmailService();
    }
    return OptimizedPdfEmailService.instance;
  }

  /**
   * Genera HTML optimizado para PDF Monkey
   */
  private generatePdfOptimizedHTML(data: EstimateEmailData): string {
    const logoSection = data.contractor.logo 
      ? `<div class="logo-section"><img src="${data.contractor.logo}" alt="Logo" style="max-height: 80px; max-width: 200px;"></div>`
      : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Estimado ${data.estimateNumber}</title>
    <style>
        @page { 
            margin: 20px; 
            size: A4;
        }
        body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #2563eb;
            margin-bottom: 30px;
        }
        .logo-section {
            text-align: center;
            margin-bottom: 20px;
        }
        .estimate-title {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin: 10px 0;
        }
        .estimate-number {
            font-size: 18px;
            color: #6b7280;
            margin: 5px 0;
        }
        .company-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #2563eb;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
        }
        .client-section {
            background: #fef3e2;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #f59e0b;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .project-info {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #10b981;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .items-table th {
            background: #2563eb;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        .items-table tr:nth-child(even) {
            background: #f9fafb;
        }
        .total-section {
            background: #f8fafc;
            padding: 25px;
            border-radius: 8px;
            margin-top: 25px;
            border: 2px solid #e5e7eb;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 16px;
        }
        .total-final {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            border-top: 2px solid #2563eb;
            padding-top: 15px;
            margin-top: 15px;
        }
        .terms-section {
            background: #fffbeb;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
            border-left: 4px solid #f59e0b;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
        }
        .amount {
            font-weight: 600;
            color: #059669;
        }
        .text-right {
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="header">
        ${logoSection}
        <div class="estimate-title">ESTIMADO PROFESIONAL</div>
        <div class="estimate-number">Número: ${data.estimateNumber}</div>
        <div class="estimate-number">Fecha: ${data.date}</div>
        ${data.validUntil ? `<div class="estimate-number">Válido hasta: ${data.validUntil}</div>` : ''}
    </div>

    <div class="company-info">
        <div class="company-name">${data.contractor.companyName}</div>
        <div><strong>Contacto:</strong> ${data.contractor.name}</div>
        <div><strong>Email:</strong> ${data.contractor.email}</div>
        <div><strong>Teléfono:</strong> ${data.contractor.phone}</div>
        <div><strong>Dirección:</strong> ${data.contractor.address}, ${data.contractor.city}, ${data.contractor.state} ${data.contractor.zipCode}</div>
        ${data.contractor.license ? `<div><strong>Licencia:</strong> ${data.contractor.license}</div>` : ''}
        ${data.contractor.website ? `<div><strong>Website:</strong> ${data.contractor.website}</div>` : ''}
    </div>

    <div class="client-section">
        <div class="section-title">Información del Cliente</div>
        <div><strong>Nombre:</strong> ${data.client.name}</div>
        <div><strong>Email:</strong> ${data.client.email}</div>
        ${data.client.phone ? `<div><strong>Teléfono:</strong> ${data.client.phone}</div>` : ''}
        ${data.client.address ? `<div><strong>Dirección:</strong> ${data.client.address}</div>` : ''}
    </div>

    <div class="project-info">
        <div class="section-title">Detalles del Proyecto</div>
        <div><strong>Tipo:</strong> ${data.project.type}</div>
        <div><strong>Descripción:</strong> ${data.project.description}</div>
        ${data.project.location ? `<div><strong>Ubicación:</strong> ${data.project.location}</div>` : ''}
        ${data.project.scopeOfWork ? `<div><strong>Alcance:</strong> ${data.project.scopeOfWork}</div>` : ''}
    </div>

    <div class="section-title">Desglose de Costos</div>
    <table class="items-table">
        <thead>
            <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Precio Unitario</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            ${data.items.map(item => `
                <tr>
                    <td>
                        <strong>${item.name}</strong>
                        ${item.description ? `<br><small style="color: #6b7280;">${item.description}</small>` : ''}
                    </td>
                    <td>${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td class="amount">$${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right amount">$${item.total.toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span><strong>Subtotal:</strong></span>
            <span class="amount">$${data.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
            <span><strong>Impuestos (${(data.taxRate * 100).toFixed(1)}%):</strong></span>
            <span class="amount">$${data.tax.toFixed(2)}</span>
        </div>
        <div class="total-row total-final">
            <span><strong>TOTAL:</strong></span>
            <span>$${data.total.toFixed(2)}</span>
        </div>
    </div>

    ${data.terms ? `
    <div class="terms-section">
        <div class="section-title">Términos y Condiciones</div>
        <div>${data.terms}</div>
    </div>
    ` : ''}

    ${data.notes ? `
    <div class="terms-section">
        <div class="section-title">Notas Adicionales</div>
        <div>${data.notes}</div>
    </div>
    ` : ''}

    <div class="footer">
        <p>Este estimado fue generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}</p>
        <p>Gracias por considerarnos para su proyecto</p>
    </div>
</body>
</html>`;
  }

  /**
   * Genera email HTML para el cliente
   */
  private generateClientEmailHTML(data: EstimateEmailData): string {
    const approveUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/estimate-email/approve?action=quick-approve&estimateId=${encodeURIComponent(data.estimateNumber)}&clientName=${encodeURIComponent(data.client.name)}&clientEmail=${encodeURIComponent(data.client.email)}&contractorEmail=${encodeURIComponent(data.contractor.email)}`;
    
    const changesUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/estimate-email/request-changes?estimateId=${encodeURIComponent(data.estimateNumber)}&clientName=${encodeURIComponent(data.client.name)}&clientEmail=${encodeURIComponent(data.client.email)}&contractorEmail=${encodeURIComponent(data.contractor.email)}`;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estimado ${data.estimateNumber} - ${data.contractor.companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">📋 Nuevo Estimado</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Estimado #${data.estimateNumber}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hola ${data.client.name},</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Nos complace enviarle el estimado detallado para su proyecto de <strong>${data.project.type}</strong>.
            </p>

            <!-- Project Summary -->
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">📋 Resumen del Proyecto</h3>
                <p style="margin: 0 0 8px 0; color: #047857;"><strong>Tipo:</strong> ${data.project.type}</p>
                <p style="margin: 0 0 8px 0; color: #047857;"><strong>Descripción:</strong> ${data.project.description}</p>
                ${data.project.location ? `<p style="margin: 0 0 8px 0; color: #047857;"><strong>Ubicación:</strong> ${data.project.location}</p>` : ''}
            </div>

            <!-- Total -->
            <div style="background: #fef3e2; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; text-align: center;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">TOTAL DEL PROYECTO</h3>
                <div style="font-size: 32px; font-weight: bold; color: #2563eb; margin: 10px 0;">$${data.total.toFixed(2)}</div>
                <p style="color: #92400e; margin: 0; font-size: 14px;">Impuestos incluidos</p>
            </div>

            <!-- Action Buttons -->
            <div style="text-align: center; margin: 30px 0;">
                <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">¿Qué le gustaría hacer?</h3>
                
                <div style="margin: 15px 0;">
                    <a href="${approveUrl}" 
                       style="display: inline-block; background: #10b981; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
                              box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                        ✅ Aprobar Estimado
                    </a>
                </div>
                
                <div style="margin: 15px 0;">
                    <a href="${changesUrl}" 
                       style="display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
                              box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                        📝 Solicitar Cambios
                    </a>
                </div>
            </div>

            <!-- PDF Notice -->
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">📄 Estimado Detallado Adjunto</h4>
                <p style="color: #1e3a8a; margin: 0; font-size: 14px;">
                    Encontrará el estimado completo en formato PDF adjunto a este email con todos los detalles, 
                    términos y condiciones del proyecto.
                </p>
            </div>

            <!-- Company Info -->
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Información de Contacto</h4>
                <p style="margin: 0 0 5px 0; color: #6b7280;"><strong>${data.contractor.companyName}</strong></p>
                <p style="margin: 0 0 5px 0; color: #6b7280;">📧 ${data.contractor.email}</p>
                <p style="margin: 0 0 5px 0; color: #6b7280;">📞 ${data.contractor.phone}</p>
                <p style="margin: 0; color: #6b7280;">📍 ${data.contractor.address}, ${data.contractor.city}, ${data.contractor.state}</p>
            </div>

            <!-- Next Steps -->
            <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                <h4 style="color: #374151; margin: 0 0 15px 0;">Próximos Pasos:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Revise el estimado detallado adjunto</li>
                    <li style="margin-bottom: 8px;">Use los botones de arriba para aprobar o solicitar cambios</li>
                    <li style="margin-bottom: 8px;">Contáctenos si tiene preguntas adicionales</li>
                    <li>Una vez aprobado, coordinaremos el inicio del proyecto</li>
                </ul>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Este email fue enviado por ${data.contractor.companyName} el ${new Date().toLocaleDateString('es-ES')}
            </p>
            ${data.validUntil ? `<p style="margin: 5px 0 0 0; color: #dc2626; font-size: 12px; font-weight: 600;">Este estimado es válido hasta ${data.validUntil}</p>` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Envía estimado por email con PDF adjunto
   */
  public async sendEstimateEmail(data: EstimateEmailData): Promise<PdfEmailResult> {
    const startTime = Date.now();
    console.log(`📧 [PDF-EMAIL] Iniciando envío de estimado ${data.estimateNumber}...`);

    try {
      // 1. Registrar estimado en el tracker
      const trackerData = {
        estimateNumber: data.estimateNumber,
        client: data.client,
        contractor: data.contractor,
        total: data.total
      };
      
      simpleTracker.saveEstimate(trackerData);
      console.log(`✅ [PDF-EMAIL] Estimado registrado en tracker`);

      // 2. Generar HTML optimizado para PDF
      const pdfHtml = this.generatePdfOptimizedHTML(data);
      console.log(`📝 [PDF-EMAIL] HTML generado - ${pdfHtml.length} caracteres`);

      // 3. Generar PDF con PDF Monkey
      console.log(`🔨 [PDF-EMAIL] Generando PDF con PDF Monkey...`);
      const pdfResult = await pdfMonkeyService.generateEstimatePdf(pdfHtml, data.estimateNumber);

      if (!pdfResult.success) {
        throw new Error(`Error generando PDF: ${pdfResult.error}`);
      }

      console.log(`✅ [PDF-EMAIL] PDF generado exitosamente - ${pdfResult.buffer?.length} bytes en ${pdfResult.processingTime}ms`);

      // 4. Generar email HTML para cliente
      const emailHtml = this.generateClientEmailHTML(data);

      // 5. Enviar email con PDF adjunto
      console.log(`📤 [PDF-EMAIL] Enviando email a ${data.client.email}...`);
      const emailResult = await resendService.sendEmail({
        to: data.client.email,
        subject: `📋 Estimado ${data.estimateNumber} - ${data.contractor.companyName}`,
        html: emailHtml,
        attachments: [{
          content: pdfResult.buffer?.toString('base64') || '',
          filename: `estimado_${data.estimateNumber}.pdf`,
          contentType: 'application/pdf'
        }]
      });

      if (!emailResult) {
        throw new Error('Error enviando email: respuesta vacía del servicio');
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ [PDF-EMAIL] Email enviado exitosamente en ${processingTime}ms`);

      return {
        success: true,
        messageId: 'email-sent',
        pdfGenerated: true,
        pdfSize: pdfResult.buffer?.length || 0,
        processingTime,
        estimateTracked: true
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      console.error(`❌ [PDF-EMAIL] Error en envío:`, errorMessage);
      
      return {
        success: false,
        pdfGenerated: false,
        processingTime,
        error: errorMessage,
        estimateTracked: false
      };
    }
  }

  /**
   * Envía notificación al contratista
   */
  public async sendContractorNotification(estimateNumber: string, clientName: string, status: 'sent' | 'viewed'): Promise<boolean> {
    try {
      const estimate = simpleTracker.getEstimateByNumber(estimateNumber);
      if (!estimate) {
        console.log(`⚠️ [PDF-EMAIL] Estimado ${estimateNumber} no encontrado para notificación`);
        return false;
      }

      const subject = status === 'sent' 
        ? `📤 Estimado ${estimateNumber} enviado a ${clientName}`
        : `👀 Estimado ${estimateNumber} visto por ${clientName}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Notificación de Estimado</h2>
          <p><strong>Estimado:</strong> ${estimateNumber}</p>
          <p><strong>Cliente:</strong> ${clientName}</p>
          <p><strong>Estado:</strong> ${status === 'sent' ? 'Enviado' : 'Visto'}</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
        </div>
      `;

      const result = await resendService.sendEmail({
        to: estimate.contractorEmail,
        subject,
        html
      });

      return result.success;
    } catch (error) {
      console.error('❌ [PDF-EMAIL] Error enviando notificación:', error);
      return false;
    }
  }
}

// Instancia singleton
export const optimizedPdfEmailService = OptimizedPdfEmailService.getInstance();
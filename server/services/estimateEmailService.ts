/**
 * Servicio de Email para Estimados Profesionales
 * Renderiza estimados como HTML y maneja aprobaciones/ajustes del cliente
 */

import { resendService } from './resendService';

export interface EstimateData {
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
    insurancePolicy?: string;
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
  validUntil?: string;
}

export interface EstimateApproval {
  estimateId: string;
  clientName: string;
  approvalDate: string;
  clientSignature?: string;
  contractorEmail: string;
}

export interface EstimateAdjustment {
  estimateId: string;
  clientNotes: string;
  requestedChanges: string;
  contractorEmail: string;
  clientEmail: string;
}

export class EstimateEmailService {
  
  /**
   * Generar HTML profesional para el estimado
   */
  static generateEstimateHTML(data: EstimateData): string {
    const appUrl = process.env.APP_URL || 'https://owlfence.replit.app';
    
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Estimado ${data.estimateNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8fafc;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        
        .logo {
          max-width: 150px;
          height: auto;
          margin-bottom: 20px;
          border-radius: 8px;
        }
        
        .company-name {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .estimate-title {
          font-size: 20px;
          opacity: 0.9;
        }
        
        .content {
          padding: 30px;
        }
        
        .section {
          margin-bottom: 30px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .section-header {
          background-color: #f3f4f6;
          padding: 15px 20px;
          font-weight: bold;
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .section-content {
          padding: 20px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 20px;
        }
        
        @media (max-width: 600px) {
          .info-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .container {
            margin: 0;
            box-shadow: none;
          }
          
          .content {
            padding: 20px;
          }
          
          .header {
            padding: 30px 20px;
          }
        }
        
        .info-block h4 {
          color: #4b5563;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .info-block p {
          margin-bottom: 5px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        
        .items-table th,
        .items-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .items-table th {
          background-color: #f8fafc;
          font-weight: 600;
          color: #374151;
        }
        
        .items-table tr:hover {
          background-color: #f9fafb;
        }
        
        .amount {
          text-align: right;
          font-weight: 600;
        }
        
        .totals {
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        
        .total-line {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .total-line:last-child {
          border-bottom: none;
          font-size: 18px;
          font-weight: bold;
          color: #1e40af;
        }
        
        .project-details {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          margin: 20px 0;
        }
        
        .notes {
          background-color: #e0f2fe;
          border-left: 4px solid #0284c7;
          padding: 20px;
          margin: 20px 0;
        }
        
        .action-buttons {
          display: flex;
          gap: 15px;
          margin: 30px 0;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 15px 30px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 180px;
        }
        
        .btn-approve {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }
        
        .btn-approve:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
        }
        
        .btn-adjust {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }
        
        .btn-adjust:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-2px);
        }
        
        .footer {
          background-color: #1f2937;
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .footer-content {
          margin-bottom: 20px;
        }
        
        .powered-by {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 20px;
        }
        
        .estimate-meta {
          text-align: right;
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f1f5f9;
          border-radius: 8px;
        }
        
        .estimate-number {
          font-size: 18px;
          font-weight: bold;
          color: #1e40af;
        }
        
        .estimate-date {
          color: #64748b;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          ${data.contractor.logo ? `<img src="${data.contractor.logo}" alt="${data.contractor.companyName}" class="logo">` : ''}
          <div class="company-name">${data.contractor.companyName}</div>
          <div class="estimate-title">Estimado Profesional</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <!-- Estimate Meta -->
          <div class="estimate-meta">
            <div class="estimate-number">Estimado #${data.estimateNumber}</div>
            <div class="estimate-date">Fecha: ${data.date}</div>
            ${data.validUntil ? `<div class="estimate-date">Válido hasta: ${data.validUntil}</div>` : ''}
          </div>
          
          <!-- Contact Information -->
          <div class="section">
            <div class="section-header">Información de Contacto</div>
            <div class="section-content">
              <div class="info-grid">
                <div class="info-block">
                  <h4>Contratista</h4>
                  <p><strong>${data.contractor.companyName}</strong></p>
                  <p>${data.contractor.address}</p>
                  <p>${data.contractor.city}, ${data.contractor.state} ${data.contractor.zipCode}</p>
                  <p>📞 ${data.contractor.phone}</p>
                  <p>✉️ ${data.contractor.email}</p>
                  ${data.contractor.website ? `<p>🌐 ${data.contractor.website}</p>` : ''}
                  ${data.contractor.license ? `<p>🏗️ Licencia: ${data.contractor.license}</p>` : ''}
                </div>
                <div class="info-block">
                  <h4>Cliente</h4>
                  <p><strong>${data.client.name}</strong></p>
                  ${data.client.address ? `<p>${data.client.address}</p>` : ''}
                  <p>✉️ ${data.client.email}</p>
                  ${data.client.phone ? `<p>📞 ${data.client.phone}</p>` : ''}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Project Details -->
          <div class="section">
            <div class="section-header">Detalles del Proyecto</div>
            <div class="section-content">
              <div class="project-details">
                <h4>Tipo de Proyecto: ${data.project.type}</h4>
                <p><strong>Descripción:</strong> ${data.project.description}</p>
                ${data.project.location ? `<p><strong>Ubicación:</strong> ${data.project.location}</p>` : ''}
                ${data.project.scopeOfWork ? `
                  <div style="margin-top: 15px;">
                    <h4>Alcance del Trabajo:</h4>
                    <p>${data.project.scopeOfWork}</p>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          
          <!-- Items and Pricing -->
          <div class="section">
            <div class="section-header">Materiales y Servicios</div>
            <div class="section-content">
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 40%">Descripción</th>
                    <th style="width: 15%">Cantidad</th>
                    <th style="width: 20%">Precio Unitario</th>
                    <th style="width: 25%" class="amount">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.items.map(item => `
                    <tr>
                      <td>
                        <strong>${item.name}</strong>
                        ${item.description ? `<br><small style="color: #6b7280;">${item.description}</small>` : ''}
                      </td>
                      <td>${item.quantity} ${item.unit}</td>
                      <td>$${item.unitPrice.toFixed(2)}</td>
                      <td class="amount">$${item.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="totals">
                <div class="total-line">
                  <span>Subtotal:</span>
                  <span>$${data.subtotal.toFixed(2)}</span>
                </div>
                <div class="total-line">
                  <span>Impuesto (${data.taxRate}%):</span>
                  <span>$${data.tax.toFixed(2)}</span>
                </div>
                <div class="total-line">
                  <span>TOTAL:</span>
                  <span>$${data.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          ${data.notes ? `
            <div class="notes">
              <h4>Notas Adicionales:</h4>
              <p>${data.notes}</p>
            </div>
          ` : ''}
          
          <!-- Action Buttons -->
          <div class="action-buttons">
            <a href="${appUrl}/api/estimates/approve?id=${data.estimateNumber}&email=${encodeURIComponent(data.client.email)}" 
               class="btn btn-approve">
              ✅ Aprobar Estimado
            </a>
            <a href="${appUrl}/api/estimates/adjust?id=${data.estimateNumber}&email=${encodeURIComponent(data.client.email)}" 
               class="btn btn-adjust">
              📝 Solicitar Ajustes
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <p>Gracias por considerar nuestros servicios profesionales.</p>
            <p>Para cualquier pregunta, puede contactarnos directamente.</p>
          </div>
          <div class="powered-by">
            Generado por Mervin AI - Soluciones profesionales para contratistas
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }
  
  /**
   * Enviar estimado por email al cliente
   */
  static async sendEstimateToClient(data: EstimateData): Promise<{
    success: boolean;
    message: string;
    emailId?: string;
  }> {
    try {
      console.log('📧 [ESTIMATE-EMAIL] Generando estimado HTML para cliente...');
      
      const htmlContent = EstimateEmailService.generateEstimateHTML(data);
      
      const success = await resendService.sendEmail({
        to: data.client.email,
        from: 'mervin@owlfenc.com',
        subject: `Estimado ${data.estimateNumber} - ${data.project.type} | ${data.contractor.companyName}`,
        html: htmlContent,
        replyTo: data.contractor.email
      });
      
      if (success) {
        console.log('✅ [ESTIMATE-EMAIL] Estimado enviado exitosamente al cliente');
        
        // Enviar copia al contratista
        const copySuccess = await resendService.sendEmail({
          to: data.contractor.email,
          from: 'mervin@owlfenc.com',
          subject: `[COPIA] Estimado ${data.estimateNumber} enviado a ${data.client.name}`,
          html: `
            <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <p style="margin: 0; color: #1e40af;"><strong>📧 Copia del estimado enviado a su cliente</strong></p>
              <p style="margin: 5px 0 0 0; color: #64748b;">Enviado a: ${data.client.name} (${data.client.email})</p>
            </div>
            ${htmlContent}
          `,
          replyTo: 'mervin@owlfenc.com'
        });
        
        return {
          success: true,
          message: 'Estimado enviado exitosamente al cliente'
        };
      } else {
        return {
          success: false,
          message: 'Error enviando el estimado'
        };
      }
      
    } catch (error) {
      console.error('❌ [ESTIMATE-EMAIL] Error enviando estimado:', error);
      return {
        success: false,
        message: 'Error interno enviando estimado'
      };
    }
  }
  
  /**
   * Procesar aprobación del estimado
   */
  static async processEstimateApproval(approval: EstimateApproval): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('✅ [ESTIMATE-APPROVAL] Procesando aprobación del estimado...');
      
      // Notificar al contratista sobre la aprobación
      const success = await resendService.sendEmail({
        to: approval.contractorEmail,
        from: 'mervin@owlfenc.com',
        subject: `🎉 Estimado ${approval.estimateId} APROBADO por ${approval.clientName}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>🎉 ¡Estimado Aprobado!</h1>
            </div>
            
            <div style="padding: 30px; background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2>Felicitaciones, su estimado ha sido aprobado</h2>
              
              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <p><strong>Estimado:</strong> ${approval.estimateId}</p>
                <p><strong>Cliente:</strong> ${approval.clientName}</p>
                <p><strong>Fecha de Aprobación:</strong> ${approval.approvalDate}</p>
              </div>
              
              <h3>Próximos Pasos:</h3>
              <ul>
                <li>Contacte al cliente para coordinar el inicio del proyecto</li>
                <li>Prepare los materiales necesarios</li>
                <li>Confirme las fechas de ejecución</li>
                <li>Genere el contrato oficial si es necesario</li>
              </ul>
              
              <p style="margin-top: 30px;">
                <strong>¡Excelente trabajo!</strong> Este estimado aprobado representa una nueva oportunidad de negocio.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
              Powered by Mervin AI - Professional contractor solutions
            </div>
          </div>
        `,
        replyTo: 'mervin@owlfenc.com'
      });
      
      if (success) {
        console.log('✅ [ESTIMATE-APPROVAL] Notificación enviada al contratista');
        return {
          success: true,
          message: 'Aprobación procesada exitosamente'
        };
      } else {
        return {
          success: false,
          message: 'Error enviando notificación de aprobación'
        };
      }
      
    } catch (error) {
      console.error('❌ [ESTIMATE-APPROVAL] Error procesando aprobación:', error);
      return {
        success: false,
        message: 'Error interno procesando aprobación'
      };
    }
  }
  
  /**
   * Procesar solicitud de ajustes del estimado
   */
  static async processEstimateAdjustment(adjustment: EstimateAdjustment): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('📝 [ESTIMATE-ADJUSTMENT] Procesando solicitud de ajustes...');
      
      // Notificar al contratista sobre los ajustes solicitados
      const success = await resendService.sendEmail({
        to: adjustment.contractorEmail,
        from: 'mervin@owlfenc.com',
        subject: `📝 Ajustes solicitados para estimado ${adjustment.estimateId}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>📝 Ajustes Solicitados</h1>
            </div>
            
            <div style="padding: 30px; background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2>Su cliente ha solicitado ajustes al estimado</h2>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                <p><strong>Estimado:</strong> ${adjustment.estimateId}</p>
                <p><strong>Cliente:</strong> ${adjustment.clientEmail}</p>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Comentarios del Cliente:</h3>
                <p style="font-style: italic; margin-top: 10px;">"${adjustment.clientNotes}"</p>
              </div>
              
              <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Cambios Solicitados:</h3>
                <p style="margin-top: 10px;">${adjustment.requestedChanges}</p>
              </div>
              
              <h3>Próximos Pasos:</h3>
              <ul>
                <li>Revise los comentarios y cambios solicitados</li>
                <li>Actualice el estimado según las necesidades del cliente</li>
                <li>Envíe el estimado revisado</li>
                <li>Contacte al cliente si necesita aclaraciones</li>
              </ul>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="mailto:${adjustment.clientEmail}" 
                   style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  Contactar Cliente
                </a>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
              Powered by Mervin AI - Professional contractor solutions
            </div>
          </div>
        `,
        replyTo: adjustment.clientEmail
      });
      
      if (success) {
        console.log('✅ [ESTIMATE-ADJUSTMENT] Notificación enviada al contratista');
        return {
          success: true,
          message: 'Solicitud de ajustes procesada exitosamente'
        };
      } else {
        return {
          success: false,
          message: 'Error enviando notificación de ajustes'
        };
      }
      
    } catch (error) {
      console.error('❌ [ESTIMATE-ADJUSTMENT] Error procesando ajustes:', error);
      return {
        success: false,
        message: 'Error interno procesando ajustes'
      };
    }
  }
}
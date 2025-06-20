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
    logo?: string | null;
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
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
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
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Professional Estimate ${data.estimateNumber}</title>
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

        /* Responsividad móvil para tabla */
        @media (max-width: 640px) {
          .items-table-wrapper {
            display: none;
          }
          
          .mobile-items {
            display: block;
          }
          
          .mobile-item {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
          }
          
          .mobile-item-name {
            font-weight: bold;
            font-size: 16px;
            color: #1f2937;
            margin-bottom: 8px;
          }
          
          .mobile-item-description {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .mobile-item-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
          }
          
          .mobile-item-quantity {
            color: #4b5563;
          }
          
          .mobile-item-price {
            font-weight: bold;
            color: #059669;
            font-size: 16px;
          }
        }
        
        @media (min-width: 641px) {
          .mobile-items {
            display: none;
          }
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

        /* Universal Email Client Compatible Button Styles */
        .email-button-table {
          border-collapse: separate;
          border-spacing: 0;
          border-radius: 8px;
          overflow: hidden;
          display: inline-block;
          margin: 0 8px;
        }

        .email-button-cell {
          padding: 0;
          border: none;
        }

        .email-button-link {
          display: block;
          padding: 15px 30px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          border-radius: 8px;
          min-width: 160px;
          box-sizing: border-box;
        }

        .approve-button {
          background-color: #10b981 !important;
          color: #ffffff !important;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .approve-button:hover {
          background-color: #059669 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .adjust-button {
          background-color: #f59e0b !important;
          color: #ffffff !important;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .adjust-button:hover {
          background-color: #d97706 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
        }

        .email-button-cell {
          transition: all 0.2s ease;
        }

        .email-button-cell:hover {
          transform: translateY(-1px);
        }

        /* Formularios inline */
        .inline-form {
          display: none;
          background: #f8fafc;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 25px;
          margin: 20px 0;
          animation: slideDown 0.3s ease;
        }

        .inline-form.active {
          display: block;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        /* Logo display styles */
        .contractor-logo {
          max-width: 150px;
          max-height: 100px;
          width: auto;
          height: auto;
          margin-bottom: 15px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          background: white;
          padding: 8px;
          object-fit: contain;
        }
        
        .logo-placeholder {
          max-width: 150px;
          height: 80px;
          margin: 0 auto 15px auto;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed rgba(255,255,255,0.3);
          color: rgba(255,255,255,0.7);
          font-size: 12px;
        }

        .btn-submit {
          background: #10b981;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-cancel {
          background: #6b7280;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsividad móvil para formularios */
        @media (max-width: 640px) {
          .action-buttons {
            flex-direction: column;
            align-items: stretch;
          }
          
          .btn {
            min-width: auto;
            width: 100%;
          }
          
          .form-buttons {
            flex-direction: column;
          }
          
          .btn-submit, .btn-cancel {
            width: 100%;
            margin: 5px 0;
          }
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
          ${data.contractor.logo ? `
            <div style="margin-bottom: 20px;">
              <img src="${data.contractor.logo}" 
                   alt="${data.contractor.companyName} Logo" 
                   class="contractor-logo"
                   style="max-width: 150px; max-height: 100px; width: auto; height: auto; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.15); display: block; margin-left: auto; margin-right: auto; background: white; padding: 8px;"
                   onerror="this.style.display='none'; console.log('Logo failed to load:', '${data.contractor.logo}');">
            </div>
          ` : `
            <div style="margin-bottom: 20px;">
              <div style="max-width: 150px; height: 80px; margin: 0 auto; background: rgba(255,255,255,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px dashed rgba(255,255,255,0.3);">
                <span style="color: rgba(255,255,255,0.7); font-size: 12px;">Company Logo</span>
              </div>
            </div>
          `}
          <div class="company-name">${data.contractor.companyName}</div>
          <div class="estimate-title">Professional Estimate</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <!-- Estimate Meta -->
          <div class="estimate-meta">
            <div class="estimate-number">Estimate #${data.estimateNumber}</div>
            <div class="estimate-date">Date: ${data.date}</div>
            ${data.validUntil ? `<div class="estimate-date">Valid until: ${data.validUntil}</div>` : ''}
          </div>
          
          <!-- Contact Information -->
          <div class="section">
            <div class="section-header">Contact Information</div>
            <div class="section-content">
              <div class="info-grid">
                <div class="info-block">
                  <h4>Contractor</h4>
                  <p><strong>${data.contractor.companyName}</strong></p>
                  <p>${data.contractor.address}</p>
                  <p>${data.contractor.city}, ${data.contractor.state} ${data.contractor.zipCode}</p>
                  <p>📞 ${data.contractor.phone}</p>
                  <p>✉️ ${data.contractor.email}</p>
                  ${data.contractor.website ? `<p>🌐 ${data.contractor.website}</p>` : ''}
                  ${data.contractor.license ? `<p>🏗️ License: ${data.contractor.license}</p>` : ''}
                </div>
                <div class="info-block">
                  <h4>Client</h4>
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
            <div class="section-header">Project Details</div>
            <div class="section-content">
              <div class="project-details">
                <h4>Project Type: ${data.project.type}</h4>
                <p><strong>Description:</strong> ${data.project.description}</p>
                ${data.project.location ? `<p><strong>Location:</strong> ${data.project.location}</p>` : ''}
                ${data.project.scopeOfWork ? `
                  <div style="margin-top: 15px;">
                    <h4>Scope of Work:</h4>
                    <p>${data.project.scopeOfWork}</p>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          
          <!-- Items and Pricing -->
          <div class="section">
            <div class="section-header">Materials and Services</div>
            <div class="section-content">
              <!-- Tabla para desktop -->
              <div class="items-table-wrapper">
                <table class="items-table">
                  <thead>
                    <tr>
                      <th style="width: 40%">Description</th>
                      <th style="width: 15%">Quantity</th>
                      <th style="width: 20%">Unit Price</th>
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
              </div>

              <!-- Cards para móvil -->
              <div class="mobile-items">
                ${data.items.map(item => `
                  <div class="mobile-item">
                    <div class="mobile-item-name">${item.name}</div>
                    ${item.description ? `<div class="mobile-item-description">${item.description}</div>` : ''}
                    <div class="mobile-item-details">
                      <div class="mobile-item-quantity">${item.quantity} ${item.unit} × $${item.unitPrice.toFixed(2)}</div>
                      <div class="mobile-item-price">$${item.total.toFixed(2)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <div class="totals">
                <div class="total-line">
                  <span>Materiales (${data.items.length} items):</span>
                  <span>$${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.discount && data.discount > 0 ? `
                <div class="total-line" style="color: #059669;">
                  <span>Descuento${data.discountType === 'percentage' ? ` (${data.discountValue}%)` : ''}:</span>
                  <span>-$${data.discount.toFixed(2)}</span>
                </div>
                ` : ''}
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
              <h4>Additional Notes:</h4>
              <p>${data.notes}</p>
            </div>
          ` : ''}
          
          <!-- Direct Action Buttons - Email Client Compatible -->
          <div class="action-buttons" style="text-align: center; margin: 30px 0;">
            <!-- Approve Button - Direct Link -->
            <table class="email-button-table" cellpadding="0" cellspacing="0" border="0" style="display: inline-block; margin: 0 8px;">
              <tr>
                <td class="email-button-cell" style="background-color: #10b981; border-radius: 8px;">
                  <a href="https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/api/estimate-email/approve?estimateId=${data.estimateNumber}&clientName=${encodeURIComponent(data.client.name)}&clientEmail=${encodeURIComponent(data.client.email)}&contractorEmail=${encodeURIComponent(data.contractor.email)}&action=quick-approve" 
                     class="email-button-link approve-button" 
                     style="display: block; padding: 15px 30px; color: #ffffff; font-weight: 600; font-size: 16px; text-decoration: none; text-align: center; border-radius: 8px; min-width: 160px;">
                    ✅ Aprobar Estimado
                  </a>
                </td>
              </tr>
            </table>
            
            <!-- Request Changes Button - Direct Link -->
            <table class="email-button-table" cellpadding="0" cellspacing="0" border="0" style="display: inline-block; margin: 0 8px;">
              <tr>
                <td class="email-button-cell" style="background-color: #f59e0b; border-radius: 8px;">
                  <a href="https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/api/estimate-email/request-changes?estimateId=${data.estimateNumber}&clientName=${encodeURIComponent(data.client.name)}&clientEmail=${encodeURIComponent(data.client.email)}&contractorEmail=${encodeURIComponent(data.contractor.email)}" 
                     class="email-button-link adjust-button" 
                     style="display: block; padding: 15px 30px; color: #ffffff; font-weight: 600; font-size: 16px; text-decoration: none; text-align: center; border-radius: 8px; min-width: 160px;">
                    📝 Solicitar Cambios
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <!-- Approval Form -->
          <div id="approvalForm" class="inline-form">
            <h3 style="color: #059669; margin-bottom: 20px;">📋 Confirmación de Aprobación</h3>
            <form action="${appUrl}/api/estimate-email/approve" method="POST">
              <input type="hidden" name="estimateId" value="${data.estimateNumber}">
              <input type="hidden" name="contractorEmail" value="${data.contractor.email}">
              
              <div class="form-group">
                <label class="form-label">Su nombre completo:</label>
                <input type="text" name="clientName" class="form-input" value="${data.client.name}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Email de contacto:</label>
                <input type="email" name="clientEmail" class="form-input" value="${data.client.email}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Fecha de aprobación:</label>
                <input type="date" name="approvalDate" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">
                  <input type="checkbox" required style="margin-right: 8px;">
                  Confirmo que apruebo este estimado y autorizo proceder con el proyecto según los términos descritos.
                </label>
              </div>
              
              <div class="form-buttons">
                <button type="button" onclick="hideApprovalForm()" class="btn-cancel">Cancelar</button>
                <button type="submit" class="btn-submit">✅ Autorizar Proyecto</button>
              </div>
            </form>
          </div>

          <!-- Adjustment Form -->
          <div id="adjustmentForm" class="inline-form">
            <h3 style="color: #d97706; margin-bottom: 20px;">📝 Solicitar Modificaciones</h3>
            <form action="${appUrl}/api/estimate-email/adjust" method="POST">
              <input type="hidden" name="estimateId" value="${data.estimateNumber}">
              <input type="hidden" name="contractorEmail" value="${data.contractor.email}">
              <input type="hidden" name="clientEmail" value="${data.client.email}">
              
              <div class="form-group">
                <label class="form-label">Su nombre:</label>
                <input type="text" name="clientName" class="form-input" value="${data.client.name}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Notas sobre los cambios requeridos:</label>
                <textarea name="clientNotes" class="form-textarea" 
                          placeholder="Por favor describa específicamente qué cambios le gustaría hacer al estimado..." 
                          required></textarea>
              </div>
              
              <div class="form-group">
                <label class="form-label">Cambios solicitados (detalles específicos):</label>
                <textarea name="requestedChanges" class="form-textarea" 
                          placeholder="Ej: Cambiar material de madera a vinilo, ajustar número de postes, modificar cronograma, etc..." 
                          required></textarea>
              </div>
              
              <div class="form-buttons">
                <button type="button" onclick="hideAdjustmentForm()" class="btn-cancel">Cancelar</button>
                <button type="submit" class="btn-submit">📝 Enviar Solicitud</button>
              </div>
            </form>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 8px; font-size: 14px; color: #6b7280;">
            <p style="margin: 0 0 10px 0;"><strong>💡 Instrucciones:</strong></p>
            <p style="margin: 0 0 5px 0;">• <strong>Aprobar:</strong> Haga clic en el botón verde y complete el formulario de aprobación</p>
            <p style="margin: 0;">• <strong>Solicitar Cambios:</strong> Haga clic en el botón naranja y describa qué cambios necesita</p>
          </div>
          
          <!-- Status Messages -->
          <div id="statusMessage" style="display: none; margin: 20px 0; padding: 15px; border-radius: 8px; text-align: center; font-weight: 600;"></div>
        </div>
        
        <script>
          function showApprovalForm() {
            document.getElementById('approvalForm').classList.add('active');
            document.getElementById('adjustmentForm').classList.remove('active');
            document.getElementById('approvalForm').scrollIntoView({ behavior: 'smooth' });
          }
          
          function hideApprovalForm() {
            document.getElementById('approvalForm').classList.remove('active');
          }
          
          function showAdjustmentForm() {
            document.getElementById('adjustmentForm').classList.add('active');
            document.getElementById('approvalForm').classList.remove('active');
            document.getElementById('adjustmentForm').scrollIntoView({ behavior: 'smooth' });
          }
          
          function hideAdjustmentForm() {
            document.getElementById('adjustmentForm').classList.remove('active');
          }
          
          function showStatus(message, type) {
            const statusEl = document.getElementById('statusMessage');
            statusEl.textContent = message;
            statusEl.style.display = 'block';
            statusEl.style.backgroundColor = type === 'success' ? '#d1fae5' : '#fef2f2';
            statusEl.style.color = type === 'success' ? '#065f46' : '#991b1b';
            statusEl.style.borderColor = type === 'success' ? '#a7f3d0' : '#fecaca';
            statusEl.scrollIntoView({ behavior: 'smooth' });
          }
          
          // Form submission handlers
          document.addEventListener('DOMContentLoaded', function() {
            const approvalForm = document.querySelector('#approvalForm form');
            const adjustmentForm = document.querySelector('#adjustmentForm form');
            
            if (approvalForm) {
              approvalForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                
                try {
                  const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData
                  });
                  
                  if (response.ok) {
                    showStatus('✅ ¡Estimado aprobado exitosamente! El contratista ha sido notificado.', 'success');
                    hideApprovalForm();
                  } else {
                    showStatus('❌ Hubo un error procesando su aprobación. Por favor intente de nuevo.', 'error');
                  }
                } catch (error) {
                  showStatus('❌ Error de conexión. Por favor verifique su internet e intente de nuevo.', 'error');
                }
              });
            }
            
            if (adjustmentForm) {
              adjustmentForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                
                try {
                  const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData
                  });
                  
                  if (response.ok) {
                    showStatus('📝 ¡Solicitud de cambios enviada exitosamente! El contratista revisará y responderá.', 'success');
                    hideAdjustmentForm();
                  } else {
                    showStatus('❌ Hubo un error enviando su solicitud. Por favor intente de nuevo.', 'error');
                  }
                } catch (error) {
                  showStatus('❌ Error de conexión. Por favor verifique su internet e intente de nuevo.', 'error');
                }
              });
            }
          });
        </script>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <p>Thank you for considering our professional services.</p>
            <p>For any questions, please contact us directly.</p>
          </div>
          <div class="powered-by">
            Generated by Mervin AI - Professional solutions for contractors
          </div>
        </div>
      </div>

      <script>
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', function() {
          console.log('Email estimate script loaded');
          
          // Make functions globally available
          window.showApprovalForm = function() {
            console.log('Showing approval form');
            hideAdjustmentForm();
            const form = document.getElementById('approvalForm');
            if (form) {
              form.classList.add('active');
              form.scrollIntoView({ behavior: 'smooth' });
            }
          };

          window.hideApprovalForm = function() {
            console.log('Hiding approval form');
            const form = document.getElementById('approvalForm');
            if (form) {
              form.classList.remove('active');
            }
          };

          window.showAdjustmentForm = function() {
            console.log('Showing adjustment form');
            hideApprovalForm();
            const form = document.getElementById('adjustmentForm');
            if (form) {
              form.classList.add('active');
              form.scrollIntoView({ behavior: 'smooth' });
            }
          };

          window.hideAdjustmentForm = function() {
            console.log('Hiding adjustment form');
            const form = document.getElementById('adjustmentForm');
            if (form) {
              form.classList.remove('active');
            }
          };

          // Auto-hide forms when clicking outside
          document.addEventListener('click', function(e) {
            const approvalForm = document.getElementById('approvalForm');
            const adjustmentForm = document.getElementById('adjustmentForm');
            const buttons = document.querySelector('.action-buttons');
            
            if (approvalForm && adjustmentForm && buttons) {
              if (!approvalForm.contains(e.target) && !adjustmentForm.contains(e.target) && !buttons.contains(e.target)) {
                hideApprovalForm();
                hideAdjustmentForm();
              }
            }
          });

          // Form submission with success feedback
          const approvalForm = document.querySelector('#approvalForm form');
          if (approvalForm) {
            approvalForm.addEventListener('submit', function(e) {
              const submitBtn = this.querySelector('.btn-submit');
              if (submitBtn) {
                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;
              }
            });
          }

          const adjustmentForm = document.querySelector('#adjustmentForm form');
          if (adjustmentForm) {
            adjustmentForm.addEventListener('submit', function(e) {
              const submitBtn = this.querySelector('.btn-submit');
              if (submitBtn) {
                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;
              }
            });
          }
        });
      </script>
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
      
      // Use verified owlfenc.com domain for sending
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
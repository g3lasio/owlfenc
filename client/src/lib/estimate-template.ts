/**
 * Plantilla unificada para la generación de estimados
 * Esta es la ÚNICA fuente de verdad para el HTML de estimados
 * Garantiza consistencia total entre preview y PDF
 */

interface EstimateData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectDescription?: string;
  items?: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  notes?: string;
  estimateNumber?: string;
  estimateDate?: string;
  contractor?: {
    companyName?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    license?: string;
    insurancePolicy?: string;
  };
}

/**
 * Genera el HTML completo del estimado usando una plantilla unificada
 * Esta función es la ÚNICA fuente de verdad para generar HTML de estimados
 */
export function generateUnifiedEstimateHTML(data: EstimateData): string {
  const {
    clientName = 'Cliente',
    clientEmail = '',
    clientPhone = '',
    clientAddress = '',
    projectDescription = 'Proyecto de construcción',
    items = [],
    subtotal = 0,
    tax = 0,
    total = 0,
    notes = '',
    estimateNumber = `EST-${Date.now()}`,
    estimateDate = new Date().toLocaleDateString('es-ES'),
    contractor = {}
  } = data;

  // Generar filas de items
  const itemsHTML = items.map(item => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 8px; text-align: left; font-size: 14px; color: #374151;">
        ${item.name}
        ${item.description ? `<br><small style="color: #6b7280; font-size: 12px;">${item.description}</small>` : ''}
      </td>
      <td style="padding: 12px 8px; text-align: center; font-size: 14px; color: #374151;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 8px; text-align: center; font-size: 14px; color: #374151;">
        ${item.unit}
      </td>
      <td style="padding: 12px 8px; text-align: right; font-size: 14px; color: #374151;">
        $${item.price.toFixed(2)}
      </td>
      <td style="padding: 12px 8px; text-align: right; font-size: 14px; font-weight: 600; color: #111827;">
        $${item.total.toFixed(2)}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estimado Profesional - ${estimateNumber}</title>
  <style>
    /* Reset y configuración base */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #111827;
      background: #ffffff;
      font-size: 14px;
    }
    
    /* Contenedor principal */
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 30px;
      background: #ffffff;
    }
    
    /* Encabezado */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-name {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    
    .company-details {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .estimate-info {
      text-align: right;
      flex-shrink: 0;
    }
    
    .estimate-title {
      font-size: 32px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 8px;
    }
    
    .estimate-details {
      color: #6b7280;
      font-size: 14px;
    }
    
    /* Información del cliente */
    .client-section {
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 0 6px 6px 0;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 12px;
    }
    
    .client-info {
      color: #374151;
      line-height: 1.6;
    }
    
    /* Detalles del proyecto */
    .project-section {
      margin-bottom: 30px;
    }
    
    .project-description {
      background: #f9fafb;
      padding: 16px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      color: #374151;
      font-style: italic;
    }
    
    /* Tabla de materiales */
    .materials-section {
      margin-bottom: 30px;
    }
    
    .materials-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .table-header {
      background: #374151;
      color: #ffffff;
    }
    
    .table-header th {
      padding: 16px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 0.025em;
    }
    
    .table-header th:nth-child(2),
    .table-header th:nth-child(3),
    .table-header th:nth-child(4),
    .table-header th:nth-child(5) {
      text-align: center;
    }
    
    .table-header th:nth-child(4),
    .table-header th:nth-child(5) {
      text-align: right;
    }
    
    /* Totales */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    
    .totals-table {
      width: 300px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row.subtotal {
      color: #6b7280;
    }
    
    .total-row.tax {
      color: #6b7280;
    }
    
    .total-row.final {
      background: #3b82f6;
      color: #ffffff;
      font-weight: 700;
      font-size: 18px;
      padding: 16px 20px;
      margin-top: 8px;
      border-radius: 6px;
      border: none;
    }
    
    /* Notas */
    .notes-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    
    .notes-content {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 16px;
      color: #92400e;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }
    
    .footer-highlight {
      font-weight: 600;
      color: #374151;
      margin: 10px 0;
    }
    
    /* Optimizaciones para PDF */
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      
      .container {
        margin: 0;
        padding: 20px;
        max-width: none;
      }
      
      .header {
        page-break-inside: avoid;
      }
      
      .materials-table {
        page-break-inside: avoid;
      }
      
      .totals-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Encabezado -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${contractor.companyName || 'Su Empresa'}</div>
        <div class="company-details">
          ${contractor.name ? `<div>${contractor.name}</div>` : ''}
          ${contractor.email ? `<div>Email: ${contractor.email}</div>` : ''}
          ${contractor.phone ? `<div>Teléfono: ${contractor.phone}</div>` : ''}
          ${contractor.address ? `<div>${contractor.address}</div>` : ''}
          ${contractor.website ? `<div>Web: ${contractor.website}</div>` : ''}
          ${contractor.license ? `<div>Licencia: ${contractor.license}</div>` : ''}
        </div>
      </div>
      <div class="estimate-info">
        <div class="estimate-title">ESTIMADO PROFESIONAL</div>
        <div class="estimate-details">
          <div><strong>#${estimateNumber}</strong></div>
          <div>Fecha: ${estimateDate}</div>
        </div>
      </div>
    </div>

    <!-- Información del cliente -->
    <div class="client-section">
      <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
      <div class="client-info">
        <div><strong>Nombre:</strong> ${clientName}</div>
        ${clientEmail ? `<div><strong>Email:</strong> ${clientEmail}</div>` : ''}
        ${clientPhone ? `<div><strong>Teléfono:</strong> ${clientPhone}</div>` : ''}
        ${clientAddress ? `<div><strong>Dirección:</strong> ${clientAddress}</div>` : ''}
      </div>
    </div>

    <!-- Detalles del proyecto -->
    <div class="project-section">
      <div class="section-title">DETALLES DEL PROYECTO</div>
      <div class="project-description">
        ${projectDescription}
      </div>
    </div>

    <!-- Materiales y servicios -->
    <div class="materials-section">
      <div class="section-title">MATERIALES Y SERVICIOS</div>
      <table class="materials-table">
        <thead class="table-header">
          <tr>
            <th>Descripción</th>
            <th>Cant.</th>
            <th>Unidad</th>
            <th>Precio Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML || `
            <tr>
              <td colspan="5" style="padding: 40px; text-align: center; color: #6b7280; font-style: italic;">
                No se han agregado materiales o servicios
              </td>
            </tr>
          `}
        </tbody>
      </table>

      <!-- Totales -->
      <div class="totals-section">
        <div class="totals-table">
          <div class="total-row subtotal">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row tax">
            <span>Impuesto (${((tax / subtotal) * 100).toFixed(1)}%):</span>
            <span>$${tax.toFixed(2)}</span>
          </div>
          <div class="total-row final">
            <span>TOTAL:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Notas adicionales -->
    ${notes ? `
    <div class="notes-section">
      <div class="section-title">NOTAS ADICIONALES</div>
      <div class="notes-content">
        ${notes}
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-highlight">Este estimado es válido por 30 días a partir de la fecha mostrada arriba.</div>
      <div>¡Gracias por considerar ${contractor.companyName || 'nuestra empresa'} para su proyecto!</div>
      ${contractor.insurancePolicy ? `<div>Totalmente Asegurado - Póliza #: ${contractor.insurancePolicy}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
}
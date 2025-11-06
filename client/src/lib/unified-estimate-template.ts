/**
 * Sistema de Plantilla Unificada para Estimados
 * 
 * Sistema simple y eficaz que garantiza consistencia total
 * entre preview y PDF final. Reutilizable para contratos.
 */

export interface UnifiedTemplateData {
  // Información de la empresa
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  
  // Información del estimado
  estimateNumber?: string;
  date?: string;
  
  // Información del cliente
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  
  // Detalles del proyecto
  projectDescription?: string;
  scope?: string;
  
  // Items del estimado
  items?: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    category?: string;
  }>;
  
  // Totales
  subtotal?: number;
  taxRate?: number;
  tax?: number;
  total?: number;
  
  // Notas
  notes?: string;
}

/**
 * Convierte datos del estimado al formato de plantilla unificada
 */
export function convertEstimateDataToTemplate(estimateData: any, companyData: any = {}): UnifiedTemplateData {
  const now = new Date();
  
  return {
    // Empresa
    companyName: companyData.companyName || companyData.ownerName || 'Owl Fenc',
    companyAddress: companyData.address || companyData.fullAddress || '',
    companyPhone: companyData.phone || companyData.mobilePhone || '',
    companyEmail: companyData.email || '',
    
    // Estimado
    estimateNumber: estimateData.estimateNumber || `EST-${Date.now()}`,
    date: new Date(estimateData.createdAt || now).toLocaleDateString('es-ES'),
    
    // Cliente
    clientName: estimateData.clientName || '',
    clientEmail: estimateData.clientEmail || '',
    clientPhone: estimateData.clientPhone || '',
    clientAddress: estimateData.clientAddress || '',
    
    // Proyecto
    projectDescription: estimateData.projectDescription || '',
    scope: estimateData.scope || '',
    
    // Items
    items: estimateData.items || [],
    
    // Totales
    subtotal: calculateSubtotal(estimateData.items || []),
    taxRate: estimateData.taxRate || 0,
    tax: calculateTax(estimateData.items || [], estimateData.taxRate || 0),
    total: calculateTotal(estimateData.items || [], estimateData.taxRate || 0),
    
    // Notas
    notes: estimateData.notes || ''
  };
}

/**
 * Genera HTML usando la plantilla unificada
 * Esta es la ÚNICA plantilla que se usa tanto para preview como para PDF
 */
export function generateUnifiedEstimateHTML(data: UnifiedTemplateData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estimado Profesional</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: bold;
            margin: 0;
        }
        
        .header .estimate-number {
            text-align: right;
        }
        
        .header .estimate-number h2 {
            font-size: 18px;
            margin-bottom: 5px;
            opacity: 0.9;
        }
        
        .header .estimate-number .date {
            font-size: 16px;
            opacity: 0.8;
        }
        
        .content {
            background: white;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
        }
        
        .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 30px;
        }
        
        .info-block h3 {
            color: #2563eb;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .info-block p {
            margin-bottom: 8px;
            color: #4b5563;
        }
        
        .project-section {
            margin-bottom: 30px;
        }
        
        .project-section h3 {
            color: #2563eb;
            font-size: 18px;
            margin-bottom: 15px;
        }
        
        .project-section p {
            color: #4b5563;
            line-height: 1.7;
        }
        
        .items-section {
            margin-bottom: 30px;
        }
        
        .items-section h3 {
            color: #2563eb;
            font-size: 18px;
            margin-bottom: 20px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .items-table th {
            background: #374151;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        
        .items-table th:nth-child(2) { text-align: center; }
        .items-table th:nth-child(3) { text-align: center; }
        .items-table th:nth-child(4) { text-align: right; }
        .items-table th:nth-child(5) { text-align: right; }
        
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        
        .items-table td:nth-child(2) { text-align: center; }
        .items-table td:nth-child(3) { text-align: center; }
        .items-table td:nth-child(4) { text-align: right; }
        .items-table td:nth-child(5) { text-align: right; font-weight: 600; }
        
        .items-table tbody tr:hover {
            background: #f9fafb;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        
        .totals-box {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            min-width: 300px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
        }
        
        .total-row.subtotal {
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 15px;
            padding-bottom: 15px;
        }
        
        .total-row.final {
            background: #2563eb;
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin: 15px -20px -20px -20px;
            padding: 15px 20px;
            border-radius: 0 0 6px 6px;
        }
        
        .notes-section {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 20px;
            margin-top: 20px;
        }
        
        .notes-section h4 {
            color: #92400e;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .notes-section p {
            color: #78350f;
            line-height: 1.6;
        }
        
        @media print {
            body { -webkit-print-color-adjust: exact; }
            .container { max-width: none; margin: 0; padding: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ESTIMADO PROFESIONAL</h1>
            <div class="estimate-number">
                <h2>#${data.estimateNumber || ''}</h2>
                <div class="date">Fecha: ${data.date || ''}</div>
            </div>
        </div>
        
        <div class="content">
            <div class="info-section">
                <div class="info-block">
                    <h3>INFORMACIÓN DEL CLIENTE</h3>
                    <p><strong>Nombre:</strong> ${data.clientName || ''}</p>
                    ${data.clientEmail ? `<p><strong>Email:</strong> ${data.clientEmail}</p>` : ''}
                    ${data.clientPhone ? `<p><strong>Teléfono:</strong> ${data.clientPhone}</p>` : ''}
                    ${data.clientAddress ? `<p><strong>Dirección:</strong> ${data.clientAddress}</p>` : ''}
                </div>
                
                <div class="info-block">
                    <h3>INFORMACIÓN DE LA EMPRESA</h3>
                    <p><strong>${data.companyName || 'Owl Fenc'}</strong></p>
                    ${data.companyAddress ? `<p>${data.companyAddress}</p>` : ''}
                    ${data.companyPhone ? `<p>Tel: ${data.companyPhone}</p>` : ''}
                    ${data.companyEmail ? `<p>Email: ${data.companyEmail}</p>` : ''}
                </div>
            </div>
            
            ${data.projectDescription || data.scope ? `
            <div class="project-section">
                <h3>DETALLES DEL PROYECTO</h3>
                ${data.projectDescription ? `<p>${data.projectDescription}</p>` : ''}
                ${data.scope ? `<p><strong>Alcance:</strong> ${data.scope}</p>` : ''}
            </div>
            ` : ''}
            
            <div class="items-section">
                <h3>MATERIALES Y SERVICIOS</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th>Cant.</th>
                            <th>Unidad</th>
                            <th>Precio Unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(data.items || []).map(item => `
                            <tr>
                                <td>
                                    <strong>${item.name}</strong>
                                    ${item.description ? `<br><small style="color: #6b7280;">${item.description}</small>` : ''}
                                </td>
                                <td>${item.quantity}</td>
                                <td>${item.unit}</td>
                                <td>${formatCurrency(item.unitPrice)}</td>
                                <td>${formatCurrency(item.totalPrice)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="totals-section">
                <div class="totals-box">
                    <div class="total-row subtotal">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(data.subtotal || 0)}</span>
                    </div>
                    <div class="total-row">
                        <span>Impuesto (${data.taxRate || 0}%):</span>
                        <span>${formatCurrency(data.tax || 0)}</span>
                    </div>
                    <div class="total-row final">
                        <span>TOTAL:</span>
                        <span>${formatCurrency(data.total || 0)}</span>
                    </div>
                </div>
            </div>
            
            ${data.notes ? `
            <div class="notes-section">
                <h4>Notas importantes</h4>
                <p>${data.notes}</p>
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
}

// Funciones auxiliares para cálculos
function calculateSubtotal(items: any[]): number {
  return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
}

function calculateTax(items: any[], taxRate: number): number {
  const subtotal = calculateSubtotal(items);
  return subtotal * (taxRate / 100);
}

function calculateTotal(items: any[], taxRate: number): number {
  const subtotal = calculateSubtotal(items);
  const tax = calculateTax(items, taxRate);
  return subtotal + tax;
}
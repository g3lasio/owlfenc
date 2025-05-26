/**
 * Sistema Unificado de Plantillas para Estimados
 * 
 * Este archivo garantiza que el preview y el PDF generado sean EXACTAMENTE idénticos
 * usando la misma plantilla HTML y los mismos datos.
 */

export interface EstimateTemplateData {
  // Datos del estimado
  id: string;
  title: string;
  date: string;
  estimateNumber: string;
  
  // Datos del cliente
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  
  // Datos de la empresa
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
  
  // Descripción del proyecto
  projectDescription: string;
  
  // Items del estimado
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  
  // Totales
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

/**
 * Genera el HTML unificado para preview y PDF
 * EXACTAMENTE la misma plantilla para ambos casos
 */
export function generateUnifiedEstimateHTML(data: EstimateTemplateData): string {
  console.log('🎨 [TEMPLATE] Generando HTML unificado para:', data.id);
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estimado Profesional - ${data.estimateNumber}</title>
    <style>
        @page {
            size: letter;
            margin: 0.75in;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4A90E2;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-logo {
            width: 80px;
            height: 80px;
            margin-bottom: 10px;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #4A90E2;
            margin-bottom: 5px;
        }
        
        .company-details {
            font-size: 11px;
            color: #666;
            line-height: 1.3;
        }
        
        .estimate-title {
            text-align: right;
            flex: 1;
        }
        
        .estimate-title h1 {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        
        .estimate-meta {
            font-size: 11px;
            color: #666;
        }
        
        .client-section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #4A90E2;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #E1E5E9;
        }
        
        .client-info {
            background: #F8F9FA;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #4A90E2;
        }
        
        .client-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .project-section {
            margin-bottom: 25px;
        }
        
        .project-description {
            background: #F8F9FA;
            padding: 15px;
            border-radius: 5px;
            font-style: italic;
            color: #555;
        }
        
        .items-section {
            margin-bottom: 25px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .items-table th {
            background: #4A90E2;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
        }
        
        .items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #E1E5E9;
            font-size: 11px;
        }
        
        .items-table tr:nth-child(even) {
            background: #F8F9FA;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .totals-section {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
        }
        
        .totals-table {
            width: 300px;
            border-collapse: collapse;
        }
        
        .totals-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #E1E5E9;
        }
        
        .totals-table .label {
            font-weight: bold;
            text-align: right;
            background: #F8F9FA;
        }
        
        .totals-table .amount {
            text-align: right;
            font-weight: bold;
        }
        
        .total-row {
            background: #4A90E2 !important;
            color: white !important;
            font-size: 14px;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E1E5E9;
            text-align: center;
            font-size: 10px;
            color: #888;
        }
        
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            ${data.company.logo ? `<img src="${data.company.logo}" alt="Company Logo" class="company-logo">` : ''}
            <div class="company-name">${data.company.name}</div>
            <div class="company-details">
                ${data.company.address || ''}<br>
                ${data.company.phone ? `Teléfono: ${data.company.phone}` : ''}<br>
                ${data.company.email ? `Email: ${data.company.email}` : ''}
            </div>
        </div>
        <div class="estimate-title">
            <h1>ESTIMADO PROFESIONAL</h1>
            <div class="estimate-meta">
                <strong>Fecha:</strong> ${data.date}<br>
                <strong>Estimado #:</strong> ${data.estimateNumber}
            </div>
        </div>
    </div>

    <div class="client-section">
        <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
        <div class="client-info">
            <div class="client-name">${data.client.name}</div>
            ${data.client.address ? `<div>${data.client.address}</div>` : ''}
            ${data.client.city || data.client.state || data.client.zipCode ? 
              `<div>${[data.client.city, data.client.state, data.client.zipCode].filter(Boolean).join(', ')}</div>` : ''}
            ${data.client.phone ? `<div>Teléfono: ${data.client.phone}</div>` : ''}
            ${data.client.email ? `<div>Email: ${data.client.email}</div>` : ''}
        </div>
    </div>

    <div class="project-section">
        <div class="section-title">DETALLES DEL PROYECTO</div>
        <div class="project-description">
            ${data.projectDescription || 'Descripción del proyecto no especificada.'}
        </div>
    </div>

    <div class="items-section">
        <div class="section-title">MATERIALES Y SERVICIOS</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 45%;">Descripción</th>
                    <th style="width: 15%;" class="text-center">Cantidad</th>
                    <th style="width: 15%;" class="text-center">Unidad</th>
                    <th style="width: 15%;" class="text-right">Precio Unit.</th>
                    <th style="width: 15%;" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map(item => `
                    <tr>
                        <td>${item.description}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-center">${item.unit}</td>
                        <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                        <td class="text-right">${formatCurrency(item.total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="amount">${formatCurrency(data.subtotal)}</td>
                </tr>
                <tr>
                    <td class="label">Impuesto (${data.taxRate}%):</td>
                    <td class="amount">${formatCurrency(data.taxAmount)}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">TOTAL:</td>
                    <td class="amount">${formatCurrency(data.total)}</td>
                </tr>
            </table>
        </div>
    </div>

    <div class="footer">
        <p>Este estimado es válido por 30 días desde la fecha de emisión.</p>
        <p>Si tiene alguna pregunta sobre este estimado, no dude en contactarnos.</p>
    </div>
</body>
</html>`;
}

/**
 * Convierte datos de estimado de Firebase al formato de plantilla
 */
export function convertEstimateDataToTemplate(estimateData: any, companyData: any): EstimateTemplateData {
  console.log('🔄 [TEMPLATE] Convirtiendo datos del estimado:', estimateData.id);
  
  // Calcular totales
  const items = estimateData.items || [];
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
  const taxRate = estimateData.taxRate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  
  return {
    id: estimateData.id,
    title: estimateData.title || 'Estimado Sin Título',
    date: new Date().toLocaleDateString('es-ES'),
    estimateNumber: `EST-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    
    client: {
      name: estimateData.client?.name || estimateData.clientName || 'Cliente',
      email: estimateData.client?.email,
      phone: estimateData.client?.phone,
      address: estimateData.client?.address,
      city: estimateData.client?.city,
      state: estimateData.client?.state,
      zipCode: estimateData.client?.zipCode,
    },
    
    company: {
      name: companyData?.companyName || companyData?.name || 'Su Empresa',
      address: companyData?.address || 'Dirección de la Empresa',
      phone: companyData?.phone || 'Número de Teléfono',
      email: companyData?.email || 'email@empresa.com',
      logo: companyData?.logo,
    },
    
    projectDescription: estimateData.scope || estimateData.description || 'Descripción del proyecto',
    
    items: items.map((item: any) => ({
      description: item.name || item.description || 'Item',
      quantity: item.quantity || 1,
      unit: item.unit || 'unidad',
      unitPrice: item.unitPrice || 0,
      total: item.totalPrice || 0,
    })),
    
    subtotal,
    taxRate,
    taxAmount,
    total,
  };
}
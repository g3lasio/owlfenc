/**
 * Template profesional para facturas (invoices)
 * Diferente al template de estimados - enfocado en facturación
 */

import { InvoiceData } from '../services/invoiceService';

export function generateInvoiceHtml(data: InvoiceData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${data.invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: white;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-logo {
            max-width: 120px;
            max-height: 80px;
            margin-bottom: 10px;
        }
        
        .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .invoice-title {
            text-align: right;
            flex: 1;
        }
        
        .invoice-title h1 {
            font-size: 32px;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
        }
        
        .invoice-number {
            font-size: 14px;
            font-weight: bold;
        }
        
        .billing-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .bill-to, .invoice-details {
            flex: 1;
            margin-right: 20px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #000;
        }
        
        .address-block {
            line-height: 1.6;
        }
        
        .project-info {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 30px;
            border-left: 4px solid #000;
        }
        
        .project-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .items-table th,
        .items-table td {
            padding: 12px 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .items-table th {
            background: #f8f9fa;
            font-weight: bold;
            border-bottom: 2px solid #000;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        
        .totals-table {
            width: 300px;
        }
        
        .totals-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #ddd;
        }
        
        .totals-table .total-row {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
        }
        
        .balance-due {
            background: #fff3cd;
            font-size: 16px;
            font-weight: bold;
        }
        
        .payment-info {
            background: #e3f2fd;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 4px;
        }
        
        .thank-you-message {
            background: #f1f8e9;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 4px;
            border-left: 4px solid #4caf50;
        }
        
        .footer {
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-paid {
            background: #d4edda;
            color: #155724;
        }
        
        .status-pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-overdue {
            background: #f8d7da;
            color: #721c24;
        }
        
        @media print {
            .invoice-container {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                ${data.contractorLogo ? 
                    `<img src="${data.contractorLogo}" alt="Logo" class="company-logo">` : 
                    ''
                }
                <div class="company-name">${data.contractorCompany}</div>
                <div class="address-block">
                    ${data.contractorAddress}<br>
                    ${data.contractorPhone}<br>
                    ${data.contractorEmail}
                    ${data.contractorLicense ? `<br>Licencia: ${data.contractorLicense}` : ''}
                </div>
            </div>
            <div class="invoice-title">
                <h1>FACTURA</h1>
                <div class="invoice-number">${data.invoiceNumber}</div>
                ${data.balanceDue > 0 ? 
                    '<span class="status-badge status-pending">Pendiente</span>' :
                    '<span class="status-badge status-paid">Pagado</span>'
                }
            </div>
        </div>
        
        <!-- Billing Information -->
        <div class="billing-section">
            <div class="bill-to">
                <div class="section-title">FACTURAR A:</div>
                <div class="address-block">
                    <strong>${data.clientName}</strong><br>
                    ${data.clientAddress}<br>
                    ${data.clientPhone ? `${data.clientPhone}<br>` : ''}
                    ${data.clientEmail}
                </div>
            </div>
            <div class="invoice-details">
                <div class="section-title">DETALLES DE FACTURA:</div>
                <div>
                    <strong>Fecha de emisión:</strong> ${new Date(data.issueDate).toLocaleDateString('es-ES')}<br>
                    <strong>Fecha de vencimiento:</strong> ${new Date(data.dueDate).toLocaleDateString('es-ES')}<br>
                    <strong>Términos de pago:</strong> ${data.paymentTerms}<br>
                    <strong>Proyecto completado:</strong> ${new Date(data.completedDate).toLocaleDateString('es-ES')}
                </div>
            </div>
        </div>
        
        <!-- Project Information -->
        <div class="project-info">
            <div class="project-title">PROYECTO COMPLETADO</div>
            <div><strong>Tipo:</strong> ${data.projectType}</div>
            <div><strong>Ubicación:</strong> ${data.projectLocation}</div>
            <div><strong>Descripción:</strong> ${data.projectDescription}</div>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 40%">Descripción</th>
                    <th style="width: 15%" class="text-center">Cantidad</th>
                    <th style="width: 15%" class="text-right">Precio Unit.</th>
                    <th style="width: 15%" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map(item => `
                    <tr>
                        <td>
                            <strong>${item.name}</strong>
                            ${item.description ? `<br><small>${item.description}</small>` : ''}
                        </td>
                        <td class="text-center">${item.quantity} ${item.unit}</td>
                        <td class="text-right">$${item.unitPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td class="text-right">$${item.totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">$${data.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
                <tr>
                    <td>Impuestos (${data.taxRate}%):</td>
                    <td class="text-right">$${data.tax.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
                ${data.discount && data.discount > 0 ? `
                <tr>
                    <td>Descuento:</td>
                    <td class="text-right">-$${data.discount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                    <td>Total de la factura:</td>
                    <td class="text-right">$${data.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
                ${data.amountPaid > 0 ? `
                <tr>
                    <td>Cantidad pagada:</td>
                    <td class="text-right">$${data.amountPaid.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
                ` : ''}
                <tr class="total-row balance-due">
                    <td>Saldo pendiente:</td>
                    <td class="text-right">$${data.balanceDue.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
            </table>
        </div>
        
        <!-- Payment Information -->
        ${data.balanceDue > 0 ? `
        <div class="payment-info">
            <div class="section-title">INFORMACIÓN DE PAGO</div>
            <p>Por favor, realice el pago antes de la fecha de vencimiento para evitar cargos por mora.</p>
            <p><strong>Términos:</strong> ${data.paymentTerms}</p>
        </div>
        ` : ''}
        
        <!-- Thank You Message -->
        <div class="thank-you-message">
            <div class="section-title">MENSAJE DE AGRADECIMIENTO</div>
            <p>${data.thankYouMessage}</p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Esta factura fue generada automáticamente por Mervin AI • Powered by Owl Fence Platform</p>
            <p>Para preguntas sobre esta factura, contacte: ${data.contractorEmail} • ${data.contractorPhone}</p>
        </div>
    </div>
</body>
</html>`;
}
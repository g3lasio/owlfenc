import { resendService } from './resendService';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceEmailData {
  userId?: string; // Firebase UID of the contractor sending the invoice
  contractor: {
    company: string;
    email: string;
    phone?: string;
    address?: string;
    logo?: string;
  };
  client: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  invoice: {
    number: string;
    date: string;
    dueDate: string;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    discountAmount: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
  };
  paymentLink?: string;
  ccContractor?: boolean;
  testMode?: boolean;
}

function generateInvoiceEmailHTML(data: InvoiceEmailData): string {
  const { contractor, client, invoice, paymentLink } = data;
  
  const itemsHTML = invoice.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Factura ${invoice.number}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px; text-align: center;">
            ${contractor.logo ? `<img src="${contractor.logo}" alt="${contractor.company}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
            <h1 style="color: white; margin: 0; font-size: 24px;">${contractor.company}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Factura Profesional</p>
          </div>

          <!-- Invoice Details -->
          <div style="padding: 30px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
              <div>
                <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Facturar A:</h3>
                <p style="margin: 0; color: #111827; font-weight: 600;">${client.name}</p>
                ${client.email ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">${client.email}</p>` : ''}
                ${client.phone ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">${client.phone}</p>` : ''}
                ${client.address ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">${client.address}</p>` : ''}
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Factura #</p>
                <p style="margin: 0; color: #111827; font-weight: 600; font-size: 18px;">${invoice.number}</p>
                <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">Fecha: ${invoice.date}</p>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Vencimiento: ${invoice.dueDate}</p>
              </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151; font-size: 12px; text-transform: uppercase;">Descripción</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; color: #374151; font-size: 12px; text-transform: uppercase;">Cant.</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151; font-size: 12px; text-transform: uppercase;">Precio</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151; font-size: 12px; text-transform: uppercase;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <!-- Totals -->
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #6b7280;">Subtotal:</span>
                <span style="color: #111827;">$${invoice.subtotal.toFixed(2)}</span>
              </div>
              ${invoice.discountAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #6b7280;">Descuento:</span>
                <span style="color: #10b981;">-$${invoice.discountAmount.toFixed(2)}</span>
              </div>` : ''}
              ${invoice.tax > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #6b7280;">Impuestos:</span>
                <span style="color: #111827;">$${invoice.tax.toFixed(2)}</span>
              </div>` : ''}
              <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #e5e7eb;">
                <span style="color: #111827; font-weight: 600; font-size: 18px;">Total:</span>
                <span style="color: #0891b2; font-weight: 700; font-size: 18px;">$${invoice.total.toFixed(2)}</span>
              </div>
              ${invoice.amountPaid > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                <span style="color: #6b7280;">Monto Pagado:</span>
                <span style="color: #10b981;">-$${invoice.amountPaid.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e5e7eb;">
                <span style="color: #111827; font-weight: 600;">Balance Pendiente:</span>
                <span style="color: #dc2626; font-weight: 700;">$${invoice.balanceDue.toFixed(2)}</span>
              </div>` : ''}
            </div>

            ${paymentLink ? `
            <!-- Payment Button -->
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Pagar Ahora
              </a>
            </div>` : invoice.balanceDue > 0 ? `
            <!-- Payment Instructions (No Stripe Connect) -->
            <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Para realizar el pago, por favor contacte directamente al contratista.</p>
            </div>` : ''}

            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Gracias por su preferencia</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">${contractor.company}</p>
              ${contractor.phone ? `<p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">${contractor.phone}</p>` : ''}
              ${contractor.email ? `<p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">${contractor.email}</p>` : ''}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    console.log('📧 [INVOICE-EMAIL] Starting invoice email send...');
    console.log('📧 [INVOICE-EMAIL] Recipient:', data.client.email);
    console.log('📧 [INVOICE-EMAIL] Invoice #:', data.invoice.number);
    
    if (!data.client.email) {
      console.error('❌ [INVOICE-EMAIL] No client email provided');
      return {
        success: false,
        error: 'No se proporcionó email del cliente'
      };
    }

    const html = generateInvoiceEmailHTML(data);
    
    const emailSent = await resendService.sendEmail({
      to: data.client.email,
      subject: `Factura ${data.invoice.number} - ${data.contractor.company}`,
      html: html,
      replyTo: data.contractor.email,
      userId: data.userId || 'unknown',
      emailType: 'invoice'
    });

    if (emailSent) {
      console.log('✅ [INVOICE-EMAIL] Email sent successfully to:', data.client.email);
      
      if (data.ccContractor && data.contractor.email) {
        console.log('📧 [INVOICE-EMAIL] Sending copy to contractor:', data.contractor.email);
        await resendService.sendEmail({
          to: data.contractor.email,
          subject: `[Copia] Factura ${data.invoice.number} enviada a ${data.client.name}`,
          html: html,
          userId: data.userId || 'unknown',
          emailType: 'invoice'
        });
      }
      
      return {
        success: true,
        messageId: `invoice-${data.invoice.number}-${Date.now()}`
      };
    } else {
      console.error('❌ [INVOICE-EMAIL] Failed to send email');
      return {
        success: false,
        error: 'Error al enviar el email'
      };
    }
  } catch (error) {
    console.error('❌ [INVOICE-EMAIL] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar email'
    };
  }
}

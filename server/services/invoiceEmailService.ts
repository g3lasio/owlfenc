/**
 * Servicio especializado para envío de facturas por email en formato HTML
 * Utiliza Resend para envío profesional con soporte reply-to
 */

import { Resend } from 'resend';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InvoiceEmailData {
  contractor: {
    company: string;
    email: string;
    phone: string;
    address: string;
    logo?: string;
  };
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  invoice: {
    number: string;
    date: string;
    dueDate: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    discountAmount: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
  };
  paymentLink?: string;
}

/**
 * Genera el contenido HTML profesional para el email de factura
 */
function generateInvoiceEmailHTML(data: InvoiceEmailData): string {
  const { contractor, client, invoice } = data;
  
  // Calcular el balance pendiente
  const balanceDue = invoice.total - invoice.amountPaid;
  const paymentStatus = balanceDue <= 0 ? 'PAGADO' : 'PENDIENTE';
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoice.number}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 8px 8px 0 0;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left">
                    ${contractor.logo ? `
                      <img src="${contractor.logo}" alt="${contractor.company}" style="max-height: 60px; max-width: 200px;">
                    ` : `
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${contractor.company}</h1>
                    `}
                  </td>
                  <td align="right">
                    <h2 style="margin: 0; color: #00d4ff; font-size: 24px; font-weight: 300;">FACTURA</h2>
                    <p style="margin: 5px 0 0; color: #ffffff; font-size: 14px;">#${invoice.number}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Invoice Details -->
          <tr>
            <td style="padding: 30px 40px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="50%" valign="top">
                    <h3 style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: 600;">Facturado a:</h3>
                    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                      <strong>${client.name}</strong><br>
                      ${client.address}<br>
                      ${client.phone}<br>
                      ${client.email}
                    </p>
                  </td>
                  <td width="50%" align="right" valign="top">
                    <table cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="right" style="padding-bottom: 8px;">
                          <span style="color: #666; font-size: 14px;">Fecha:</span>
                        </td>
                        <td align="right" style="padding-left: 20px; padding-bottom: 8px;">
                          <strong style="color: #333; font-size: 14px;">${invoice.date}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td align="right" style="padding-bottom: 8px;">
                          <span style="color: #666; font-size: 14px;">Vencimiento:</span>
                        </td>
                        <td align="right" style="padding-left: 20px; padding-bottom: 8px;">
                          <strong style="color: #333; font-size: 14px;">${invoice.dueDate}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td align="right">
                          <span style="color: #666; font-size: 14px;">Estado:</span>
                        </td>
                        <td align="right" style="padding-left: 20px;">
                          <span style="
                            display: inline-block;
                            padding: 4px 12px;
                            background-color: ${paymentStatus === 'PAGADO' ? '#4ade80' : '#fbbf24'};
                            color: ${paymentStatus === 'PAGADO' ? '#166534' : '#92400e'};
                            font-size: 12px;
                            font-weight: 600;
                            border-radius: 4px;
                          ">${paymentStatus}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Items Table -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8f9fa; border-bottom: 2px solid #e9ecef;">
                    <th align="left" style="padding: 12px; color: #495057; font-size: 12px; font-weight: 600; text-transform: uppercase;">Descripción</th>
                    <th align="center" style="padding: 12px; color: #495057; font-size: 12px; font-weight: 600; text-transform: uppercase;">Cant.</th>
                    <th align="right" style="padding: 12px; color: #495057; font-size: 12px; font-weight: 600; text-transform: uppercase;">Precio</th>
                    <th align="right" style="padding: 12px; color: #495057; font-size: 12px; font-weight: 600; text-transform: uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items.map(item => `
                    <tr style="border-bottom: 1px solid #e9ecef;">
                      <td style="padding: 16px 12px; color: #333; font-size: 14px;">${item.description}</td>
                      <td align="center" style="padding: 16px 12px; color: #666; font-size: 14px;">${item.quantity}</td>
                      <td align="right" style="padding: 16px 12px; color: #666; font-size: 14px;">$${item.unitPrice.toFixed(2)}</td>
                      <td align="right" style="padding: 16px 12px; color: #333; font-size: 14px; font-weight: 500;">$${item.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Totals -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="60%"></td>
                  <td width="40%">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Subtotal:</td>
                        <td align="right" style="padding: 8px 0; color: #333; font-size: 14px;">$${invoice.subtotal.toFixed(2)}</td>
                      </tr>
                      ${invoice.discountAmount > 0 ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Descuento:</td>
                        <td align="right" style="padding: 8px 0; color: #ef4444; font-size: 14px;">-$${invoice.discountAmount.toFixed(2)}</td>
                      </tr>
                      ` : ''}
                      ${invoice.tax > 0 ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Impuestos:</td>
                        <td align="right" style="padding: 8px 0; color: #333; font-size: 14px;">$${invoice.tax.toFixed(2)}</td>
                      </tr>
                      ` : ''}
                      <tr style="border-top: 2px solid #e9ecef;">
                        <td style="padding: 12px 0 8px; color: #333; font-size: 16px; font-weight: 600;">Total:</td>
                        <td align="right" style="padding: 12px 0 8px; color: #333; font-size: 16px; font-weight: 600;">$${invoice.total.toFixed(2)}</td>
                      </tr>
                      ${invoice.amountPaid > 0 ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Pagado:</td>
                        <td align="right" style="padding: 8px 0; color: #10b981; font-size: 14px;">-$${invoice.amountPaid.toFixed(2)}</td>
                      </tr>
                      ` : ''}
                      <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; color: #333; font-size: 18px; font-weight: 700;">Balance:</td>
                        <td align="right" style="padding: 12px; color: ${balanceDue > 0 ? '#ef4444' : '#10b981'}; font-size: 18px; font-weight: 700;">
                          $${balanceDue.toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Payment Link -->
          ${balanceDue > 0 && data.paymentLink ? `
          <tr>
            <td style="padding: 0 40px 40px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%); border-radius: 8px;">
                <tr>
                  <td align="center" style="padding: 30px;">
                    <h3 style="margin: 0 0 15px; color: #ffffff; font-size: 20px; font-weight: 600;">¿Listo para pagar?</h3>
                    <p style="margin: 0 0 20px; color: #ffffff; font-size: 14px; line-height: 1.6;">
                      Haga clic en el botón de abajo para procesar su pago de forma segura
                    </p>
                    <a href="${data.paymentLink}" style="
                      display: inline-block;
                      padding: 14px 32px;
                      background-color: #ffffff;
                      color: #0099cc;
                      font-size: 16px;
                      font-weight: 600;
                      text-decoration: none;
                      border-radius: 6px;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">Pagar $${balanceDue.toFixed(2)} Ahora</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 10px; color: #666; font-size: 14px; font-weight: 600;">${contractor.company}</p>
                    <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.6;">
                      ${contractor.address}<br>
                      ${contractor.phone} • ${contractor.email}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Envía la factura por email en formato HTML
 */
export async function sendInvoiceEmail(data: InvoiceEmailData & { 
  ccContractor?: boolean;
  testMode?: boolean;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { contractor, client, ccContractor = true, testMode = false } = data;
    
    // Generar el HTML del email
    const htmlContent = generateInvoiceEmailHTML(data);
    
    // Preparar los destinatarios
    const to = testMode ? 'gelasio@chyrris.com' : client.email;
    const cc = ccContractor && contractor.email && !testMode ? [contractor.email] : undefined;
    
    // Enviar el email
    const response = await resend.emails.send({
      from: `${contractor.company} <noreply@resend.dev>`,
      to: [to],
      cc,
      replyTo: contractor.email,
      subject: `Factura #${data.invoice.number} - ${contractor.company}`,
      html: htmlContent,
    });
    
    return {
      success: true,
      messageId: response.id,
    };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar email',
    };
  }
}
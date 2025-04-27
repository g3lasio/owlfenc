import { MailService } from '@sendgrid/mail';
import { storage } from "../storage";

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY no está configurado. El envío de correos no estará disponible.");
}

const mailService = new MailService();

// Configurar API key de SendGrid
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Interfaz para los parámetros de email
interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: 'attachment' | 'inline';
    contentId?: string;
  }>;
}

export class EmailService {
  /**
   * Envía un correo electrónico con los parámetros proporcionados
   */
  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.error("No se puede enviar email: SENDGRID_API_KEY no está configurado");
      return false;
    }
    
    try {
      await mailService.send({
        to: params.to,
        from: params.from,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments: params.attachments
      });
      
      console.log(`Email enviado a ${params.to}`);
      return true;
    } catch (error) {
      console.error("Error al enviar email con SendGrid:", error);
      return false;
    }
  }
  
  /**
   * Envía un estimado por correo electrónico
   */
  async sendEstimateByEmail(
    estimateData: any,
    templateId: number | null,
    recipientEmail: string,
    subject: string,
    message: string
  ): Promise<boolean> {
    try {
      // Obtener los datos del contratista para el remitente
      const userId = estimateData.contractor?.id;
      let senderEmail = "noreply@example.com"; // Email por defecto
      let senderName = "Sistema de Estimados";
      
      if (userId) {
        const settings = await storage.getSettings(userId);
        if (settings && settings.businessEmail) {
          senderEmail = settings.businessEmail;
          senderName = settings.businessName || "Su Contratista";
        }
      }
      
      // Generar el HTML del estimado
      let estimateHtml = "";
      
      // Si se proporciona un ID de plantilla, usar esa plantilla
      if (templateId) {
        const template = await storage.getTemplate(templateId);
        if (template) {
          estimateHtml = await this.generateHtmlFromTemplate(template.html, estimateData);
        } else {
          // Si no se encuentra la plantilla, generar HTML básico
          estimateHtml = this.generateBasicEstimateHtml(estimateData);
        }
      } else {
        // Usar la plantilla predeterminada del usuario
        const defaultTemplate = await storage.getDefaultTemplate(userId, "estimate");
        if (defaultTemplate) {
          estimateHtml = await this.generateHtmlFromTemplate(defaultTemplate.html, estimateData);
        } else {
          // Si no hay plantilla predeterminada, generar HTML básico
          estimateHtml = this.generateBasicEstimateHtml(estimateData);
        }
      }
      
      // Generar un PDF del estimado para adjuntar (implementación simplificada)
      // En una implementación real, generaríamos un PDF con una biblioteca como PDFKit
      const attachPdf = false; // Desactivado por ahora
      const attachments = attachPdf ? [{
        content: Buffer.from(estimateHtml).toString('base64'),
        filename: `Estimado-${estimateData.projectId || 'proyecto'}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment'
      }] : undefined;
      
      // Construir el email
      const emailParams: EmailParams = {
        to: recipientEmail,
        from: {
          email: senderEmail,
          name: senderName
        } as any, // TypeScript requiere este cast
        subject: subject || `Estimado para su proyecto`,
        text: message || `Adjunto encontrará el estimado para su proyecto.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Estimado para su proyecto</h2>
            <p>${message || 'Adjunto encontrará el estimado para su proyecto.'}</p>
            <div style="margin-top: 20px; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
              ${estimateHtml}
            </div>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">
              Este correo electrónico fue enviado por ${senderName}. Si tiene alguna pregunta, por favor responda a este correo.
            </p>
          </div>
        `,
        attachments
      };
      
      // Enviar el email
      return await this.sendEmail(emailParams);
      
    } catch (error) {
      console.error("Error al enviar estimado por email:", error);
      return false;
    }
  }
  
  /**
   * Genera HTML a partir de una plantilla reemplazando variables
   */
  private async generateHtmlFromTemplate(templateHtml: string, data: any): Promise<string> {
    let html = templateHtml;
    
    // Reemplazar variables básicas
    const replacements: Record<string, string> = {
      "{{estimateNumber}}": data.projectId || "",
      "{{estimateDate}}": new Date().toLocaleDateString(),
      "{{validUntil}}": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      "{{contractorName}}": data.contractor?.name || "",
      "{{contractorCompany}}": data.contractor?.company || "",
      "{{contractorLicense}}": data.contractor?.license || "",
      "{{contractorAddress}}": data.contractor?.address || "",
      "{{contractorPhone}}": data.contractor?.phone || "",
      "{{contractorEmail}}": data.contractor?.email || "",
      "{{clientName}}": data.client?.name || "",
      "{{clientAddress}}": data.client?.address || "",
      "{{clientPhone}}": data.client?.phone || "",
      "{{clientEmail}}": data.client?.email || "",
      "{{projectType}}": data.project?.type || "",
      "{{projectSubtype}}": data.project?.subtype || "",
      "{{projectDimensions}}": this.formatDimensions(data.project?.dimensions),
      "{{projectNotes}}": data.project?.notes || "",
    };
    
    // Aplicar reemplazos
    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.replace(new RegExp(placeholder, "g"), value || "");
    }
    
    // Reemplazar variables que puedan contener HTML
    if (html.includes("{{lineItems}}")) {
      const lineItemsHtml = this.generateLineItemsHtml(data);
      html = html.replace("{{lineItems}}", lineItemsHtml);
    }
    
    return html;
  }
  
  /**
   * Genera una representación de texto de las dimensiones del proyecto
   */
  private formatDimensions(dimensions: any): string {
    if (!dimensions) return "";
    
    const parts = [];
    if (dimensions.length) parts.push(`${dimensions.length} pies de longitud`);
    if (dimensions.height) parts.push(`${dimensions.height} pies de altura`);
    if (dimensions.width) parts.push(`${dimensions.width} pies de ancho`);
    if (dimensions.area) parts.push(`${dimensions.area} pies cuadrados`);
    
    return parts.join(", ");
  }
  
  /**
   * Genera HTML para los ítems de línea del estimado
   */
  private generateLineItemsHtml(data: any): string {
    let html = "";
    
    // Si hay un estimado basado en reglas
    if (data.rulesBasedEstimate) {
      const estimate = data.rulesBasedEstimate;
      
      // Agregar materiales
      if (estimate.materials) {
        // Si hay desglose detallado de materiales
        if (estimate.materials.posts) {
          html += this.generateLineItemRowHtml(
            `Postes (${estimate.materials.posts.type || 'estándar'})`,
            estimate.materials.posts.quantity || 0,
            "unidad",
            estimate.materials.posts.costPerUnit || 0,
            estimate.materials.posts.totalCost || 0
          );
          
          html += this.generateLineItemRowHtml(
            "Concreto",
            estimate.materials.concrete?.bags || 0,
            "bolsa",
            estimate.materials.concrete?.costPerBag || 0,
            estimate.materials.concrete?.totalCost || 0
          );
          
          if (estimate.materials.rails) {
            html += this.generateLineItemRowHtml(
              "Rieles",
              estimate.materials.rails.quantity || 0,
              "unidad",
              estimate.materials.rails.costPerUnit || 0,
              estimate.materials.rails.totalCost || 0
            );
          }
          
          if (estimate.materials.pickets) {
            html += this.generateLineItemRowHtml(
              "Tablas",
              estimate.materials.pickets.quantity || 0,
              "unidad",
              estimate.materials.pickets.costPerUnit || 0,
              estimate.materials.pickets.totalCost || 0
            );
          }
        } else {
          // Si solo hay un costo total de materiales
          html += this.generateLineItemRowHtml(
            "Materiales",
            1,
            "conjunto",
            estimate.materials.totalCost || 0,
            estimate.materials.totalCost || 0
          );
        }
      }
      
      // Agregar mano de obra
      if (estimate.labor) {
        html += this.generateLineItemRowHtml(
          "Mano de obra",
          1,
          "servicio",
          estimate.labor.totalCost || 0,
          estimate.labor.totalCost || 0
        );
      }
      
      // Agregar costos adicionales
      if (estimate.additionalCosts) {
        const additionalCosts = estimate.additionalCosts;
        
        if (additionalCosts.demolition && additionalCosts.demolition > 0) {
          html += this.generateLineItemRowHtml(
            "Demolición y remoción",
            1,
            "servicio",
            additionalCosts.demolition,
            additionalCosts.demolition
          );
        }
        
        if (additionalCosts.painting && additionalCosts.painting > 0) {
          html += this.generateLineItemRowHtml(
            "Pintura y acabados",
            1,
            "servicio",
            additionalCosts.painting,
            additionalCosts.painting
          );
        }
        
        if (additionalCosts.lattice && additionalCosts.lattice > 0) {
          html += this.generateLineItemRowHtml(
            "Celosía decorativa",
            1,
            "servicio",
            additionalCosts.lattice,
            additionalCosts.lattice
          );
        }
        
        if (additionalCosts.gates && additionalCosts.gates > 0) {
          html += this.generateLineItemRowHtml(
            "Puertas e instalación",
            1,
            "conjunto",
            additionalCosts.gates,
            additionalCosts.gates
          );
        }
      }
    }
    
    // Si no hay ítems, mostrar un mensaje
    if (html === "") {
      html = "<tr><td colspan='5' style='text-align: center;'>No hay ítems disponibles</td></tr>";
    }
    
    return html;
  }
  
  /**
   * Genera una fila HTML para un ítem de línea
   */
  private generateLineItemRowHtml(
    description: string,
    quantity: number,
    unit: string,
    unitPrice: number,
    totalPrice: number
  ): string {
    return `
      <tr>
        <td>${description}</td>
        <td>${quantity}</td>
        <td>${unit}</td>
        <td>$${unitPrice.toFixed(2)}</td>
        <td>$${totalPrice.toFixed(2)}</td>
      </tr>
    `;
  }
  
  /**
   * Genera un HTML básico para un estimado
   */
  private generateBasicEstimateHtml(data: any): string {
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1>Estimado para ${data.client?.name || 'Cliente'}</h1>
          <p>Fecha: ${new Date().toLocaleDateString()}</p>
          <p>Válido hasta: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <h3>Contratista:</h3>
            <p>${data.contractor?.name || ''}</p>
            <p>${data.contractor?.company || ''}</p>
            <p>${data.contractor?.address || ''}</p>
            <p>Tel: ${data.contractor?.phone || ''}</p>
            <p>Email: ${data.contractor?.email || ''}</p>
            <p>Licencia: ${data.contractor?.license || ''}</p>
          </div>
          
          <div>
            <h3>Cliente:</h3>
            <p>${data.client?.name || ''}</p>
            <p>${data.client?.address || ''}</p>
            <p>Tel: ${data.client?.phone || ''}</p>
            <p>Email: ${data.client?.email || ''}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3>Detalles del Proyecto:</h3>
          <p><strong>Tipo:</strong> ${data.project?.type || ''} - ${data.project?.subtype || ''}</p>
          <p><strong>Dimensiones:</strong> ${this.formatDimensions(data.project?.dimensions)}</p>
          <p><strong>Notas:</strong> ${data.project?.notes || ''}</p>
        </div>
        
        <div>
          <h3>Desglose de Costos:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descripción</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Cantidad</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Unidad</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Precio Unitario</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${this.generateLineItemsHtml(data)}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">$${(data.rulesBasedEstimate?.totals?.subtotal || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Impuestos:</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">$${(data.rulesBasedEstimate?.totals?.tax || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Total:</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;"><strong>$${(data.rulesBasedEstimate?.totals?.total || 0).toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
          <p style="font-style: italic;">Este estimado es válido por 30 días desde la fecha de emisión.</p>
          <p>Para aceptar este estimado, por favor contáctenos por teléfono o email.</p>
        </div>
      </div>
    `;
    
    return html;
  }
}

// Exportar una instancia del servicio para uso global
export const emailService = new EmailService();
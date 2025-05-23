
import { sharedEstimateService } from "./sharedEstimateService";
import { ProjectInput } from "./estimatorService";

/**
 * Servicio específico para que Mervin genere estimados
 * Actúa como una capa entre Mervin y el servicio compartido de estimados
 */
export class MervinEstimateService {
  /**
   * Procesa un comando de estimación recibido a través del chat
   */
  async processEstimateCommand(userInput: string, conversationContext: any): Promise<any> {
    try {
      // Extraer el ID del usuario del contexto
      const userId = conversationContext.userId || 1;
      
      // Interpretar el lenguaje natural para extraer datos del proyecto
      const projectData = await sharedEstimateService.interpretNaturalLanguage(userInput, userId);
      
      // Enriquecer los datos del proyecto con información del contexto de la conversación
      this.enrichProjectDataFromContext(projectData, conversationContext);
      
      // Si hay datos insuficientes, devolver una solicitud de más información
      const missingFields = this.checkMissingFields(projectData);
      if (missingFields.length > 0) {
        return {
          type: "information_request",
          missingFields,
          message: `Necesito más información para generar el estimado. Por favor proporciona: ${missingFields.join(", ")}`
        };
      }
      
      // Generar el estimado usando el servicio compartido
      const estimateResult = await sharedEstimateService.generateEstimate(projectData);
      
      // Si hay error, devolver mensaje amigable
      if (!estimateResult.success) {
        return {
          type: "error",
          message: "Lo siento, no pude generar el estimado. " + estimateResult.error
        };
      }
      
      // Generar HTML para presentación
      const estimateHtml = await sharedEstimateService.generateEstimateHtml(estimateResult.data);
      
      // Devolver resultado estructurado para Mervin
      return {
        type: "estimate_result",
        estimateData: estimateResult.data,
        html: estimateHtml,
        summary: this.generateSummary(estimateResult.data)
      };
    } catch (error: any) {
      console.error("Error en MervinEstimateService:", error);
      return {
        type: "error",
        message: "Ocurrió un error al procesar tu solicitud de estimado: " + error.message
      };
    }
  }
  
  /**
   * Enriquece los datos del proyecto con información del contexto de la conversación
   */
  private enrichProjectDataFromContext(projectData: ProjectInput, context: any): void {
    // Si el contexto tiene información del cliente, usarla
    if (context.clientName) {
      projectData.clientName = context.clientName;
    }
    
    if (context.clientAddress) {
      projectData.projectAddress = context.clientAddress;
    }
    
    if (context.clientPhone) {
      projectData.clientPhone = context.clientPhone;
    }
    
    if (context.clientEmail) {
      projectData.clientEmail = context.clientEmail;
    }
    
    // Si hay dimensiones en el contexto
    if (context.fenceLength) {
      projectData.projectDimensions.length = parseFloat(context.fenceLength);
    }
    
    if (context.fenceHeight) {
      projectData.projectDimensions.height = parseFloat(context.fenceHeight);
    }
    
    // Si hay información sobre el contratista
    if (context.contractorProfile) {
      projectData.contractorName = context.contractorProfile.companyName || context.contractorProfile.name;
      projectData.contractorAddress = context.contractorProfile.address;
      projectData.contractorPhone = context.contractorProfile.phone || context.contractorProfile.mobilePhone;
      projectData.contractorEmail = context.contractorProfile.email;
      projectData.contractorLogo = context.contractorProfile.logo;
    }
  }
  
  /**
   * Verifica si faltan campos requeridos en los datos del proyecto
   */
  private checkMissingFields(projectData: ProjectInput): string[] {
    const missingFields = [];
    
    if (!projectData.clientName) missingFields.push("nombre del cliente");
    if (!projectData.projectAddress) missingFields.push("dirección del proyecto");
    
    if (projectData.projectType.toLowerCase() === "fence") {
      if (!projectData.projectDimensions?.length) missingFields.push("longitud de la cerca");
      if (!projectData.projectDimensions?.height) missingFields.push("altura de la cerca");
    }
    
    return missingFields;
  }
  
  /**
   * Genera un resumen del estimado para presentar en el chat
   */
  private generateSummary(estimateData: any): string {
    try {
      // Extraer información relevante
      const materials = estimateData.rulesBasedEstimate?.materialTotal || 0;
      const labor = estimateData.rulesBasedEstimate?.labor?.totalCost || 0;
      const additionalCosts = estimateData.rulesBasedEstimate?.additionalTotal || 0;
      const total = estimateData.rulesBasedEstimate?.totals?.total || 0;
      const timeframe = estimateData.rulesBasedEstimate?.estimatedDays || "No disponible";
      
      // Formatear números para presentación
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      });
      
      // Generar resumen
      return `
Resumen del Estimado:
- Materiales: ${formatter.format(materials)}
- Mano de obra: ${formatter.format(labor)}
- Costos adicionales: ${formatter.format(additionalCosts)}
- Total: ${formatter.format(total)}
- Tiempo estimado: ${timeframe}
      `;
    } catch (error) {
      console.error("Error generando resumen:", error);
      return "No se pudo generar un resumen detallado.";
    }
  }
}

// Exportar una instancia para uso global
export const mervinEstimateService = new MervinEstimateService();

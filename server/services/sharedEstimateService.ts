
import { estimatorService, ProjectInput } from "./estimatorService";

/**
 * Servicio compartido de estimados que puede ser utilizado tanto por la interfaz 
 * manual como por Mervin AI
 */
export class SharedEstimateService {
  /**
   * Genera un estimado a partir de los datos de entrada estandarizados
   * Esta función puede ser llamada tanto desde la interfaz manual como desde Mervin
   */
  async generateEstimate(input: ProjectInput): Promise<any> {
    try {
      // Validar los datos de entrada
      this.validateInput(input);
      
      // Utilizar el servicio existente para generar el estimado
      const estimateResult = await estimatorService.generateEstimate(input);
      
      // Devolver el resultado en un formato estandarizado
      return {
        success: true,
        data: estimateResult,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error en sharedEstimateService.generateEstimate:', error);
      return {
        success: false,
        error: error.message || 'Error al generar estimado',
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Genera el HTML para un estimado
   * Puede ser utilizado tanto por la interfaz manual como por Mervin
   */
  async generateEstimateHtml(estimateData: any, templateId?: number): Promise<string> {
    try {
      return await estimatorService.generateEstimateHtml(estimateData);
    } catch (error) {
      console.error('Error generando HTML del estimado:', error);
      throw error;
    }
  }
  
  /**
   * Interpreta datos en lenguaje natural para convertirlos en formato ProjectInput
   * Especialmente útil para que Mervin procese solicitudes de clientes
   */
  async interpretNaturalLanguage(text: string, userId: number): Promise<ProjectInput> {
    // Aquí podrías implementar la lógica para extraer datos del texto natural
    // Por simplicidad, devolvemos un template básico que luego Mervin completará
    return {
      contractorId: userId,
      contractorName: "",
      clientName: "Cliente extraído de la conversación",
      projectAddress: "",
      projectType: "fence", // Por defecto asumimos cerca
      projectSubtype: "wood", // Por defecto asumimos madera
      projectDimensions: {
        length: 0,
        height: 0
      }
    };
  }
  
  /**
   * Valida los datos de entrada del proyecto
   */
  private validateInput(input: ProjectInput): void {
    // Validaciones básicas
    if (!input.clientName) {
      throw new Error("Se requiere nombre del cliente");
    }
    
    if (!input.projectAddress) {
      throw new Error("Se requiere dirección del proyecto");
    }
    
    if (!input.projectType) {
      throw new Error("Se requiere tipo de proyecto");
    }
    
    // Validaciones específicas por tipo de proyecto
    if (input.projectType.toLowerCase() === "fence") {
      if (!input.projectDimensions?.length || !input.projectDimensions?.height) {
        throw new Error("Para proyectos de cerca se requiere longitud y altura");
      }
    }
    
    // Más validaciones según sea necesario
  }
}

// Exportar una instancia para uso global
export const sharedEstimateService = new SharedEstimateService();

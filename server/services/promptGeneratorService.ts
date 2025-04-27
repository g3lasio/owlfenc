import OpenAI from "openai";
import { storage } from "../storage";
import { PromptTemplate, InsertPromptTemplate } from "@shared/schema";

// Verificar la disponibilidad de la API key de OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY no está configurado. La generación de prompts asistida por IA no estará disponible.");
}

// Inicializar cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class PromptGeneratorService {
  /**
   * Obtiene un template de prompt por ID
   */
  async getPromptTemplate(id: number): Promise<PromptTemplate | undefined> {
    return await storage.getPromptTemplate(id);
  }
  
  /**
   * Obtiene templates de prompts por categoría
   */
  async getPromptTemplatesByCategory(userId: number, category: string): Promise<PromptTemplate[]> {
    return await storage.getPromptTemplatesByCategory(userId, category);
  }
  
  /**
   * Obtiene el template de prompt predeterminado para una categoría
   */
  async getDefaultPromptTemplate(userId: number, category: string): Promise<PromptTemplate | undefined> {
    return await storage.getDefaultPromptTemplate(userId, category);
  }
  
  /**
   * Crea un nuevo template de prompt
   */
  async createPromptTemplate(insertTemplate: InsertPromptTemplate): Promise<PromptTemplate> {
    return await storage.createPromptTemplate(insertTemplate);
  }
  
  /**
   * Actualiza un template de prompt existente
   */
  async updatePromptTemplate(id: number, templateData: Partial<PromptTemplate>): Promise<PromptTemplate> {
    return await storage.updatePromptTemplate(id, templateData);
  }
  
  /**
   * Elimina un template de prompt
   */
  async deletePromptTemplate(id: number): Promise<boolean> {
    return await storage.deletePromptTemplate(id);
  }
  
  /**
   * Genera un prompt para un proyecto usando plantillas existentes
   * o creando uno desde cero si no hay plantillas disponibles
   */
  async generatePromptForProject(userId: number, projectData: any, category: string): Promise<string> {
    try {
      // Intentar obtener el template predeterminado para la categoría
      const defaultTemplate = await this.getDefaultPromptTemplate(userId, category);
      
      if (defaultTemplate) {
        // Usar el template predeterminado y reemplazar variables
        return this.fillTemplateWithProjectData(defaultTemplate.content, projectData);
      }
      
      // Si no hay template predeterminado, generar uno básico basado en la categoría
      return this.generateBasicPromptForCategory(category, projectData);
      
    } catch (error) {
      console.error(`Error generando prompt para proyecto (${category}):`, error);
      // En caso de error, retornar un prompt genérico
      return this.generateFallbackPrompt(category, projectData);
    }
  }
  
  /**
   * Rellena un template con datos del proyecto
   */
  private fillTemplateWithProjectData(templateContent: string, projectData: any): string {
    let filledTemplate = templateContent;
    
    // Reemplazar variables básicas
    const replacements: Record<string, string> = {
      "{{projectType}}": projectData.projectType || "",
      "{{projectSubtype}}": projectData.projectSubtype || "",
      "{{length}}": projectData.projectDimensions?.length?.toString() || "",
      "{{height}}": projectData.projectDimensions?.height?.toString() || "",
      "{{width}}": projectData.projectDimensions?.width?.toString() || "",
      "{{area}}": projectData.projectDimensions?.area?.toString() || "",
      "{{clientState}}": projectData.clientState || "",
      "{{clientCity}}": projectData.clientCity || "",
      "{{demolition}}": projectData.additionalFeatures?.demolition ? "Sí" : "No",
      "{{painting}}": projectData.additionalFeatures?.painting ? "Sí" : "No",
      "{{lattice}}": projectData.additionalFeatures?.lattice ? "Sí" : "No",
      "{{notes}}": projectData.notes || ""
    };
    
    // Aplicar reemplazos
    for (const [placeholder, value] of Object.entries(replacements)) {
      filledTemplate = filledTemplate.replace(new RegExp(placeholder, "g"), value);
    }
    
    // Manejar gates si existen
    if (projectData.additionalFeatures?.gates && projectData.additionalFeatures.gates.length > 0) {
      let gatesText = "Puertas:\n";
      projectData.additionalFeatures.gates.forEach((gate: any, index: number) => {
        gatesText += `- Puerta ${index + 1}: Tipo ${gate.type}, Ancho ${gate.width} pies, Cantidad ${gate.quantity}\n`;
      });
      
      filledTemplate = filledTemplate.replace("{{gates}}", gatesText);
    } else {
      filledTemplate = filledTemplate.replace("{{gates}}", "No se requieren puertas");
    }
    
    return filledTemplate;
  }
  
  /**
   * Genera un prompt básico basado en la categoría del proyecto
   */
  private generateBasicPromptForCategory(category: string, projectData: any): string {
    switch (category.toLowerCase()) {
      case "fencing":
        return this.generateFencingPrompt(projectData);
      case "roofing":
        return this.generateRoofingPrompt(projectData);
      case "deck":
        return this.generateDeckPrompt(projectData);
      case "patio":
        return this.generatePatioPrompt(projectData);
      default:
        return this.generateGenericConstructionPrompt(projectData);
    }
  }
  
  /**
   * Genera un prompt para proyectos de cercas
   */
  private generateFencingPrompt(projectData: any): string {
    const prompt = `
# Solicitud de Estimado para Cerca

## Tipo de Proyecto
- Tipo: Cerca
- Subtipo: ${projectData.projectSubtype || "Estándar"}

## Dimensiones
- Longitud: ${projectData.projectDimensions?.length || "N/A"} pies
- Altura: ${projectData.projectDimensions?.height || "N/A"} pies

## Ubicación
- Estado: ${projectData.clientState || "N/A"}
- Ciudad: ${projectData.clientCity || "N/A"}

## Características Adicionales
- Demolición de cerca existente: ${projectData.additionalFeatures?.demolition ? "Sí" : "No"}
- Pintura o tinte: ${projectData.additionalFeatures?.painting ? "Sí" : "No"}
- Celosía decorativa: ${projectData.additionalFeatures?.lattice ? "Sí" : "No"}
${this.formatGatesForPrompt(projectData.additionalFeatures?.gates)}

## Instrucciones Específicas
Por favor genera un estimado de materiales y mano de obra para el proyecto de cerca descrito.
El estimado debe incluir:
1. Lista detallada de todos los materiales necesarios con cantidades y precios unitarios
2. Costo total de materiales
3. Estimado de horas de trabajo y costo de mano de obra
4. Costos adicionales (permisos, disposición de materiales, etc.)
5. Costo total del proyecto

Considera los siguientes aspectos:
- La separación estándar entre postes debe ser de 8 pies (o menos según requerido por código local)
- Se requiere concreto para los postes (1-2 bolsas por poste)
- Incluye todos los herrajes y sujetadores necesarios
- Asegúrate de incluir un margen para desperdicios del 10%

${projectData.notes ? `## Notas Adicionales\n${projectData.notes}` : ""}
    `;
    
    return prompt.trim();
  }
  
  /**
   * Genera un prompt para proyectos de techos
   */
  private generateRoofingPrompt(projectData: any): string {
    const prompt = `
# Solicitud de Estimado para Techo

## Tipo de Proyecto
- Tipo: Techo
- Subtipo: ${projectData.projectSubtype || "Estándar"}

## Dimensiones
- Área: ${projectData.projectDimensions?.area || "N/A"} pies cuadrados

## Ubicación
- Estado: ${projectData.clientState || "N/A"}
- Ciudad: ${projectData.clientCity || "N/A"}

## Características Adicionales
- Remoción de techo existente: ${projectData.additionalFeatures?.demolition ? "Sí" : "No"}
- Ventilación adicional: ${projectData.additionalFeatures?.additionalVentilation ? "Sí" : "No"}
- Nuevos canalones: ${projectData.additionalFeatures?.newGutters ? "Sí" : "No"}

## Instrucciones Específicas
Por favor genera un estimado de materiales y mano de obra para el proyecto de techo descrito.
El estimado debe incluir:
1. Lista detallada de todos los materiales necesarios con cantidades y precios unitarios
2. Costo total de materiales
3. Estimado de horas de trabajo y costo de mano de obra
4. Costos adicionales (permisos, disposición de materiales, etc.)
5. Costo total del proyecto

Considera los siguientes aspectos:
- Incluye fieltro para techo o membrana sintética como capa base
- Incluye tapajuntas para todas las penetraciones (chimeneas, respiraderos, etc.)
- Incluye todos los herrajes y sujetadores necesarios
- Asegúrate de incluir un margen para desperdicios del 15%

${projectData.notes ? `## Notas Adicionales\n${projectData.notes}` : ""}
    `;
    
    return prompt.trim();
  }
  
  /**
   * Genera un prompt para proyectos de deck
   */
  private generateDeckPrompt(projectData: any): string {
    const prompt = `
# Solicitud de Estimado para Deck

## Tipo de Proyecto
- Tipo: Deck
- Subtipo: ${projectData.projectSubtype || "Estándar"}

## Dimensiones
- Área: ${projectData.projectDimensions?.area || "N/A"} pies cuadrados
- Altura: ${projectData.projectDimensions?.height || "N/A"} pies (desde el suelo)

## Ubicación
- Estado: ${projectData.clientState || "N/A"}
- Ciudad: ${projectData.clientCity || "N/A"}

## Características Adicionales
- Remoción de deck existente: ${projectData.additionalFeatures?.demolition ? "Sí" : "No"}
- Barandas: ${projectData.additionalFeatures?.railing ? "Sí" : "No"}
- Escalones: ${projectData.additionalFeatures?.steps ? "Sí" : "No"}
- Iluminación: ${projectData.additionalFeatures?.lighting ? "Sí" : "No"}

## Instrucciones Específicas
Por favor genera un estimado de materiales y mano de obra para el proyecto de deck descrito.
El estimado debe incluir:
1. Lista detallada de todos los materiales necesarios con cantidades y precios unitarios
2. Costo total de materiales
3. Estimado de horas de trabajo y costo de mano de obra
4. Costos adicionales (permisos, disposición de materiales, etc.)
5. Costo total del proyecto

Considera los siguientes aspectos:
- Vigas y postes estructurales adecuados para el tamaño del deck
- Concreto para los cimientos
- Todos los herrajes y sujetadores necesarios
- Asegúrate de incluir un margen para desperdicios del 10%

${projectData.notes ? `## Notas Adicionales\n${projectData.notes}` : ""}
    `;
    
    return prompt.trim();
  }
  
  /**
   * Genera un prompt para proyectos de patio
   */
  private generatePatioPrompt(projectData: any): string {
    const prompt = `
# Solicitud de Estimado para Patio

## Tipo de Proyecto
- Tipo: Patio
- Subtipo: ${projectData.projectSubtype || "Estándar"}

## Dimensiones
- Área: ${projectData.projectDimensions?.area || "N/A"} pies cuadrados

## Ubicación
- Estado: ${projectData.clientState || "N/A"}
- Ciudad: ${projectData.clientCity || "N/A"}

## Características Adicionales
- Remoción de patio existente: ${projectData.additionalFeatures?.demolition ? "Sí" : "No"}
- Muro de contención: ${projectData.additionalFeatures?.retainingWall ? "Sí" : "No"}
- Desagüe: ${projectData.additionalFeatures?.drainage ? "Sí" : "No"}
- Iluminación: ${projectData.additionalFeatures?.lighting ? "Sí" : "No"}

## Instrucciones Específicas
Por favor genera un estimado de materiales y mano de obra para el proyecto de patio descrito.
El estimado debe incluir:
1. Lista detallada de todos los materiales necesarios con cantidades y precios unitarios
2. Costo total de materiales
3. Estimado de horas de trabajo y costo de mano de obra
4. Costos adicionales (permisos, disposición de materiales, etc.)
5. Costo total del proyecto

Considera los siguientes aspectos:
- Base apropiada de grava compactada
- Arena para nivelar (según sea necesario)
- Materiales para bordes y contenciones
- Asegúrate de incluir un margen para desperdicios del 10%

${projectData.notes ? `## Notas Adicionales\n${projectData.notes}` : ""}
    `;
    
    return prompt.trim();
  }
  
  /**
   * Genera un prompt genérico para proyectos de construcción
   */
  private generateGenericConstructionPrompt(projectData: any): string {
    const prompt = `
# Solicitud de Estimado para Proyecto de Construcción

## Tipo de Proyecto
- Tipo: ${projectData.projectType || "Construcción"}
- Subtipo: ${projectData.projectSubtype || "General"}

## Dimensiones
${projectData.projectDimensions?.length ? `- Longitud: ${projectData.projectDimensions.length} pies\n` : ""}
${projectData.projectDimensions?.width ? `- Ancho: ${projectData.projectDimensions.width} pies\n` : ""}
${projectData.projectDimensions?.height ? `- Altura: ${projectData.projectDimensions.height} pies\n` : ""}
${projectData.projectDimensions?.area ? `- Área: ${projectData.projectDimensions.area} pies cuadrados\n` : ""}

## Ubicación
- Estado: ${projectData.clientState || "N/A"}
- Ciudad: ${projectData.clientCity || "N/A"}

## Características Adicionales
- Demolición/remoción requerida: ${projectData.additionalFeatures?.demolition ? "Sí" : "No"}

## Instrucciones Específicas
Por favor genera un estimado de materiales y mano de obra para el proyecto descrito.
El estimado debe incluir:
1. Lista de los materiales principales necesarios con cantidades estimadas y precios unitarios
2. Costo total de materiales
3. Estimado de horas de trabajo y costo de mano de obra
4. Costos adicionales (permisos, disposición de materiales, etc.)
5. Costo total del proyecto

Considera incluir un margen para desperdicios e imprevistos del 15-20%.

${projectData.notes ? `## Notas Adicionales\n${projectData.notes}` : ""}
    `;
    
    return prompt.trim();
  }
  
  /**
   * Genera un prompt de respaldo genérico en caso de error
   */
  private generateFallbackPrompt(category: string, projectData: any): string {
    return `
# Solicitud de Estimado de Construcción

## Proyecto
- Tipo: ${projectData.projectType || category || "Construcción"}
- Subtipo: ${projectData.projectSubtype || "General"}

## Detalles
Por favor genera un estimado detallado para este proyecto incluyendo materiales, mano de obra y costos totales.
Dimensiones principales: ${this.formatDimensionsForPrompt(projectData.projectDimensions)}

## Notas Adicionales
${projectData.notes || "No se proporcionaron notas adicionales."}
    `.trim();
  }
  
  /**
   * Formatea las puertas para incluirlas en un prompt
   */
  private formatGatesForPrompt(gates: any[] | undefined): string {
    if (!gates || gates.length === 0) {
      return "- Puertas: No";
    }
    
    let gatesText = "- Puertas: Sí\n  Detalles de puertas:";
    gates.forEach((gate, index) => {
      gatesText += `\n  * Puerta ${index + 1}: Tipo ${gate.type}, Ancho ${gate.width} pies, Cantidad ${gate.quantity}`;
    });
    
    return gatesText;
  }
  
  /**
   * Formatea las dimensiones para incluirlas en un prompt
   */
  private formatDimensionsForPrompt(dimensions: any): string {
    if (!dimensions) return "No se proporcionaron dimensiones";
    
    const parts = [];
    if (dimensions.length) parts.push(`${dimensions.length} pies de longitud`);
    if (dimensions.height) parts.push(`${dimensions.height} pies de altura`);
    if (dimensions.width) parts.push(`${dimensions.width} pies de ancho`);
    if (dimensions.area) parts.push(`${dimensions.area} pies cuadrados`);
    
    return parts.length > 0 ? parts.join(", ") : "No se proporcionaron dimensiones";
  }
  
  /**
   * Procesa un prompt con OpenAI para obtener una respuesta estructurada
   */
  async processPromptWithAI(prompt: string, systemInstructions?: string): Promise<any> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY no está configurado");
    }
    
    try {
      const systemContent = systemInstructions || `
        Eres un asistente especializado en estimación de costos para proyectos de construcción.
        Analiza detalladamente la solicitud y genera un estimado completo con los siguientes componentes:
        1. Lista detallada de materiales con cantidades y precios unitarios
        2. Costos de mano de obra
        3. Costos adicionales cuando apliquen
        4. Impuestos (usar 8.75% como tasa estándar)
        5. Total del proyecto
        Proporciona tu respuesta en formato JSON siguiendo exactamente esta estructura:
        {
          "materials": [
            {"item": "nombre", "quantity": number, "unit": "unidad", "unitPrice": number, "totalPrice": number}
          ],
          "labor": {
            "hours": number,
            "ratePerHour": number,
            "totalCost": number
          },
          "additionalCosts": [
            {"description": "string", "cost": number}
          ],
          "summary": {
            "materialTotal": number,
            "laborTotal": number,
            "additionalTotal": number,
            "subtotal": number,
            "tax": number,
            "total": number,
            "timeEstimate": "string"
          }
        }
      `;
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0].message.content;
      return JSON.parse(content);
      
    } catch (error) {
      console.error("Error al procesar prompt con OpenAI:", error);
      throw error;
    }
  }
}

// Exportar instancia del servicio para uso global
export const promptGeneratorService = new PromptGeneratorService();
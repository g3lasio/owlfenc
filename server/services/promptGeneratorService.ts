import OpenAI from "openai";
import { storage } from "../storage";
import { PromptTemplate, InsertPromptTemplate } from "@shared/schema";

interface PromptGeneratorOptions {
  userId: number;
  basePromptId?: number;
  customInstructions?: string;
}

export class PromptGeneratorService {
  private openai: OpenAI;

  constructor() {
    // Inicializar cliente de OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY no configurada, algunas funcionalidades no estarán disponibles");
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Obtener todas las plantillas de un usuario
  async getPromptTemplates(userId: number): Promise<PromptTemplate[]> {
    try {
      return await storage.getPromptTemplatesByUserId(userId);
    } catch (error) {
      console.error("Error obteniendo plantillas de prompts:", error);
      throw error;
    }
  }

  // Obtener una plantilla específica
  async getPromptTemplate(id: number): Promise<PromptTemplate | undefined> {
    try {
      return await storage.getPromptTemplate(id);
    } catch (error) {
      console.error("Error obteniendo plantilla de prompt:", error);
      throw error;
    }
  }

  // Crear una nueva plantilla de prompt
  async createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate> {
    try {
      return await storage.createPromptTemplate(template);
    } catch (error) {
      console.error("Error creando plantilla de prompt:", error);
      throw error;
    }
  }

  // Actualizar una plantilla existente
  async updatePromptTemplate(id: number, template: Partial<PromptTemplate>): Promise<PromptTemplate> {
    try {
      return await storage.updatePromptTemplate(id, template);
    } catch (error) {
      console.error("Error actualizando plantilla de prompt:", error);
      throw error;
    }
  }

  // Eliminar una plantilla
  async deletePromptTemplate(id: number): Promise<boolean> {
    try {
      return await storage.deletePromptTemplate(id);
    } catch (error) {
      console.error("Error eliminando plantilla de prompt:", error);
      throw error;
    }
  }

  // Generar un prompt final con todos los datos del proyecto
  async generateCompletedPrompt(projectData: any, options: PromptGeneratorOptions): Promise<string> {
    try {
      // Si se proporciona un ID de prompt base, usar esa plantilla
      let basePromptTemplate: PromptTemplate | undefined;
      
      if (options.basePromptId) {
        basePromptTemplate = await this.getPromptTemplate(options.basePromptId);
      } else {
        // Si no, buscar la plantilla por defecto para el usuario
        const templates = await this.getPromptTemplates(options.userId);
        basePromptTemplate = templates.find(t => t.isDefault);
      }

      if (!basePromptTemplate) {
        // Si no hay plantilla, usar la plantilla por defecto de la aplicación
        return this.getDefaultPrompt(projectData, options.customInstructions);
      }

      // Reemplazar variables en la plantilla
      let completedPrompt = basePromptTemplate.promptText;
      
      // Reemplazar cada variable con el dato correspondiente
      // Contractor info
      completedPrompt = completedPrompt.replace(/\[nombre del contratista\]/g, projectData.contractorName || "");
      completedPrompt = completedPrompt.replace(/\[nombre de la empresa\]/g, projectData.contractorCompany || "");
      completedPrompt = completedPrompt.replace(/\[número de licencia\]/g, projectData.contractorLicense || "");

      // Project info
      completedPrompt = completedPrompt.replace(/\[tipo\/subtipo\]/g, 
        `${projectData.projectType || ""}${projectData.projectSubtype ? '/' + projectData.projectSubtype : ''}`);
      
      // Format dimensions based on the input data structure
      let dimensionsText = "";
      if (projectData.projectDimensions) {
        if (typeof projectData.projectDimensions === 'string') {
          dimensionsText = projectData.projectDimensions;
        } else {
          // Convert object to string representation
          dimensionsText = Object.entries(projectData.projectDimensions)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        }
      }
      completedPrompt = completedPrompt.replace(/\[dimensiones\]/g, dimensionsText);
      
      // Location
      const location = [
        projectData.clientAddress,
        projectData.clientCity,
        projectData.clientState,
        projectData.clientZip
      ].filter(Boolean).join(", ");
      
      completedPrompt = completedPrompt.replace(/\[dirección\]/g, location);
      completedPrompt = completedPrompt.replace(/\[ubicación\]/g, projectData.clientState || "California");

      // Additional details
      let detailsText = "";
      if (projectData.additionalFeatures) {
        if (typeof projectData.additionalFeatures === 'string') {
          detailsText = projectData.additionalFeatures;
        } else {
          // Convert object to string
          detailsText = Object.entries(projectData.additionalFeatures)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        }
      }
      completedPrompt = completedPrompt.replace(/\[detalles\]/g, detailsText);

      // Append custom instructions if provided
      if (options.customInstructions) {
        completedPrompt += "\n\nInstrucciones adicionales:\n" + options.customInstructions;
      }

      return completedPrompt;
    } catch (error) {
      console.error("Error generando prompt completo:", error);
      // Return default prompt as fallback
      return this.getDefaultPrompt(projectData, options.customInstructions);
    }
  }

  // Generar un estimado usando OpenAI con el prompt completado
  async generateEstimateWithPrompt(prompt: string, format: "json" | "text" = "json"): Promise<any> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API Key no configurada. No se puede utilizar generación por IA.");
      }

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Genera un estimado detallado basado en la información proporcionada." }
        ],
        response_format: format === "json" ? { type: "json_object" } : undefined
      });

      // Return the result
      if (format === "json") {
        try {
          // Parse the response if json format was requested
          return JSON.parse(response.choices[0].message.content);
        } catch (parseError) {
          console.error("Error parsing OpenAI JSON response:", parseError);
          // Return raw text if parsing fails
          return { error: "Failed to parse response", raw: response.choices[0].message.content };
        }
      } else {
        // Return raw text for text format
        return response.choices[0].message.content;
      }
    } catch (error) {
      console.error("Error generando estimado con prompt:", error);
      throw error;
    }
  }

  // Plantilla por defecto para cuando no hay ninguna guardada
  private getDefaultPrompt(projectData: any, customInstructions?: string): string {
    // Template based on the user's request
    let defaultPrompt = `Eres un experto en ${projectData.projectType || "construcción"}. Un contratista llamado ${projectData.contractorName || "[nombre del contratista]"}, de la empresa ${projectData.contractorCompany || "[nombre de la empresa]"}, con licencia ${projectData.contractorLicense || "[número de licencia]"}, solicita un estimado para el siguiente proyecto:

Tipo/Subtipo: ${projectData.projectType || ""}${projectData.projectSubtype ? '/' + projectData.projectSubtype : ''}
Dimensiones: ${typeof projectData.projectDimensions === 'object' ? JSON.stringify(projectData.projectDimensions) : (projectData.projectDimensions || '')}
Ubicación: ${projectData.clientState || "California"}
Detalles adicionales: ${typeof projectData.additionalFeatures === 'object' ? JSON.stringify(projectData.additionalFeatures) : (projectData.additionalFeatures || '')}

Por favor, indica:

1. Lista de materiales necesarios y cantidades.
2. Precios promedio de cada material en ${projectData.clientState || "California"}.
3. Costo promedio de mano de obra.
4. Sugerencias de permisos o códigos requeridos.

Devuelve el resultado en formato tabla y con un resumen final.`;

    // Append custom instructions if provided
    if (customInstructions) {
      defaultPrompt += "\n\nInstrucciones adicionales:\n" + customInstructions;
    }

    return defaultPrompt;
  }
}

// Exportar una instancia del servicio
export const promptGeneratorService = new PromptGeneratorService();
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

class MistralService {
  private apiKey: string;
  private baseURL: string = 'https://api.mistral.ai/v1';

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || '';
    if (!this.apiKey) {
      console.warn('MISTRAL_API_KEY no está configurada. MistralService no funcionará correctamente.');
    }
  }

  /**
   * Extrae datos de un PDF usando Mistral AI con capacidades OCR
   * @param pdfPath Ruta del archivo PDF
   * @param prompt Instrucción detallada sobre qué datos extraer
   * @returns Objeto con los datos extraídos del PDF
   */
  async extractDataFromPDF(pdfPath: string, prompt: string): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error('MISTRAL_API_KEY no está configurada');
      }

      // Leer el archivo PDF como base64
      const fileBuffer = fs.readFileSync(pdfPath);
      const base64PDF = fileBuffer.toString('base64');

      // Llamar a la API de Mistral con el archivo PDF
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "mistral-large-latest", // Usar el mejor modelo de Mistral para OCR
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image",
                  image: {
                    data: base64PDF,
                    // Especificar application/pdf para indicar que es un documento PDF
                    media_type: "application/pdf"
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Extraer y devolver la respuesta
      const result = response.data.choices[0].message.content;
      console.log('Respuesta de Mistral AI:', result);
      
      return JSON.parse(result);
    } catch (error: any) {
      console.error('Error en MistralService:', error.response?.data || error.message);
      throw new Error(`Error al procesar el PDF con Mistral AI: ${error.message}`);
    }
  }

  /**
   * Genera cláusulas personalizadas para contratos basadas en una descripción
   * @param projectDescription Descripción del proyecto
   * @returns Array de cláusulas generadas
   */
  async generateCustomClauses(projectDescription: string): Promise<string[]> {
    try {
      if (!this.apiKey) {
        throw new Error('MISTRAL_API_KEY no está configurada');
      }

      const prompt = `
        Basándote en esta descripción de proyecto de instalación de cerca:
        
        "${projectDescription}"
        
        Genera 5 cláusulas contractuales específicas que deberían incluirse en un contrato formal. 
        Considera aspectos como:
        
        - Especificaciones técnicas de instalación
        - Materiales a utilizar
        - Garantías específicas para este tipo de cerca
        - Aclaraciones sobre la preparación del terreno
        - Responsabilidades del cliente
        - Condiciones climáticas y su impacto en la instalación
        - Gestión de residuos/escombros
        
        Devuelve un array JSON de strings, donde cada string sea una cláusula completa.
      `;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "mistral-large-latest",
          messages: [
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.choices[0].message.content;
      const clauses = JSON.parse(result);
      
      return Array.isArray(clauses) ? clauses : [];
    } catch (error: any) {
      console.error('Error generando cláusulas con Mistral:', error.response?.data || error.message);
      
      // En caso de error, devolvemos cláusulas predeterminadas
      return [
        "El contratista garantiza la calidad de los materiales utilizados por un período de 1 año.",
        "El cliente será responsable de marcar correctamente las líneas de propiedad antes de la instalación.",
        "Cualquier modificación al diseño original requerirá aprobación por escrito y podría generar costos adicionales.",
        "El contratista no es responsable por daños a líneas de servicios no marcadas adecuadamente.",
        "Los tiempos de instalación están sujetos a condiciones climáticas favorables."
      ];
    }
  }
}

export const mistralService = new MistralService();
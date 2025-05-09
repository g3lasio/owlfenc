import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

// Inicializar API de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const GPT_MODEL = "gpt-4o";

export class PDFVisionService {
  /**
   * Extrae datos relevantes de un PDF utilizando GPT-4 Vision API
   * @param pdfPath Ruta temporal del archivo PDF
   * @returns Datos extraídos del PDF como objeto JSON
   */
  async extractDataFromPDF(pdfPath: string): Promise<any> {
    try {
      // Leer el archivo PDF como un buffer
      const pdfBuffer = await fs.readFile(pdfPath);
      
      // Convertir a base64
      const base64PDF = pdfBuffer.toString('base64');
      
      // Prompt para GPT-4 Vision
      const prompt = `
      Eres un asistente experto en extraer información de documentos. 
      Analiza este PDF que contiene un estimado para un proyecto de construcción de cercas (fence) o similar.
      
      Por favor, extrae la siguiente información específica:
      
      1. Nombre completo del cliente
      2. Dirección del cliente
      3. Teléfono del cliente
      4. Correo electrónico del cliente
      5. Descripción breve del proyecto (qué tipo de cerca, dimensiones, materiales)
      6. Costo total del proyecto
      7. Condiciones de pago (si se especifican)
      
      Devuelve los datos en formato JSON estructurado con estas claves:
      {
        "clientName": "nombre completo",
        "clientAddress": "dirección completa",
        "clientPhone": "número de teléfono",
        "clientEmail": "email",
        "projectDescription": "descripción del proyecto",
        "totalCost": "costo total en formato numérico",
        "paymentTerms": "condiciones de pago"
      }
      
      Si no encuentras alguno de estos datos, usa "No especificado" como valor.
      `;
      
      // Llamada a GPT-4 Vision API
      const response = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64PDF}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });
      
      // Extraer respuesta JSON
      const jsonResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      return jsonResponse;
    } catch (error) {
      console.error('Error extracting data from PDF:', error);
      throw new Error('Failed to extract data from PDF');
    }
  }
  
  /**
   * Genera cláusulas personalizadas para contrato basado en la descripción del proyecto
   * @param projectDescription Descripción del proyecto extraída del PDF
   * @returns Array de cláusulas personalizadas
   */
  async generateCustomClauses(projectDescription: string): Promise<string[]> {
    try {
      const prompt = `
      Eres un asesor legal especializado en contratos para contratistas de construcción, especialmente de cercas.
      
      Basado en la siguiente descripción de proyecto:
      "${projectDescription}"
      
      Genera tres cláusulas de contrato específicas y personalizadas que protejan al contratista en este proyecto particular.
      
      Estas cláusulas deben:
      1. Ser específicas para el tipo de proyecto descrito
      2. Proteger al contratista de riesgos potenciales
      3. Estar redactadas en español con lenguaje legal claro pero efectivo
      4. Ser completas, con un mínimo de 3-4 oraciones cada una
      
      Devuelve exactamente tres cláusulas numeradas, sin introducción ni comentarios adicionales.
      `;
      
      // Llamada a GPT-4
      const response = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [
          { role: "system", content: "Eres un abogado especializado en contratos de construcción." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1000
      });
      
      // Procesamiento de la respuesta para extraer las cláusulas
      const content = response.choices[0].message.content || '';
      
      // Dividir el contenido en líneas y procesar cada cláusula
      const lines = content.split('\n');
      const clauses: string[] = [];
      let currentClause = '';
      
      for (const line of lines) {
        // Si es una nueva cláusula numerada
        if (/^\d+\./.test(line.trim())) {
          // Si ya teníamos una cláusula acumulada, la guardamos
          if (currentClause.trim()) {
            clauses.push(currentClause.trim());
          }
          // Comenzamos una nueva cláusula
          currentClause = line.trim();
        } else if (line.trim()) {
          // Seguimos acumulando la cláusula actual
          currentClause += ' ' + line.trim();
        }
      }
      
      // Añadir la última cláusula si existe
      if (currentClause.trim()) {
        clauses.push(currentClause.trim());
      }
      
      return clauses.length > 0 ? clauses : [
        "1. El contratista se reserva el derecho de modificar materiales de similar calidad si los especificados no están disponibles, sin que esto implique un incumplimiento del contrato.",
        "2. El cliente es responsable de obtener permisos necesarios antes del inicio de los trabajos. Cualquier retraso debido a la falta de permisos no será responsabilidad del contratista.",
        "3. Las condiciones climáticas adversas pueden retrasar el proyecto sin penalización al contratista, extendiendo proporcionalmente la fecha de finalización estimada."
      ];
    } catch (error) {
      console.error('Error generating custom clauses:', error);
      // Devolver cláusulas predeterminadas en caso de error
      return [
        "1. El contratista se reserva el derecho de modificar materiales de similar calidad si los especificados no están disponibles, sin que esto implique un incumplimiento del contrato.",
        "2. El cliente es responsable de obtener permisos necesarios antes del inicio de los trabajos. Cualquier retraso debido a la falta de permisos no será responsabilidad del contratista.",
        "3. Las condiciones climáticas adversas pueden retrasar el proyecto sin penalización al contratista, extendiendo proporcionalmente la fecha de finalización estimada."
      ];
    }
  }
}

export const pdfVisionService = new PDFVisionService();
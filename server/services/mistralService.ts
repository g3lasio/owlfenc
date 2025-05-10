import axios from 'axios';
import * as fs from 'fs';
import OpenAI from "openai"; // Importar OpenAI como fallback

// Configurar cliente de OpenAI para usar como fallback
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interfaz para los datos de cliente y proyecto extraídos
export interface DatosExtraidos {
  cliente?: {
    nombre?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  proyecto?: {
    tipoCerca?: string;
    altura?: string;
    longitud?: string;
    ubicacion?: string;
    estilo?: string;
    material?: string;
  };
  presupuesto?: {
    subtotal?: string;
    impuestos?: string;
    total?: string;
    deposito?: string;
  };
}

/**
 * Servicio para interactuar con la API de Mistral AI
 * Reemplaza la funcionalidad de OCR de OpenAI GPT-4 Vision
 */
export class MistralService {
  private baseUrl: string;
  private apiKey: string;
  
  constructor() {
    this.baseUrl = 'https://api.mistral.ai/v1';
    this.apiKey = process.env.MISTRAL_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('ADVERTENCIA: MISTRAL_API_KEY no está configurada');
    }
  }
  
  /**
   * Extrae información relevante del PDF del estimado
   */
  async extraerInformacionPDF(pdfBuffer: Buffer): Promise<DatosExtraidos> {
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY no está configurada');
    }
    
    try {
      console.log('Iniciando extracción con Mistral AI...');
      console.log(`Tamaño del PDF: ${pdfBuffer.length} bytes`);
      
      // Utilizar pdf-parse correctamente con ESM
      // Importar dinámicamente pero inyectar opciones seguras
      console.log('Importando pdf-parse...');
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = pdfParseModule.default;
      
      // Extraer texto del PDF usando opciones seguras
      console.log('Extrayendo texto del PDF con pdf-parse...');
      // Configurar opciones para evitar acceso a archivos de test
      const options = {
        max: 0, // Sin límite máximo de páginas
        // No incluimos pagerender custom porque tiene problemas de tipo
        // y pdf-parse tiene buen manejo de texto por defecto
      };
      
      const pdfData = await pdfParse(pdfBuffer, options);
      const pdfText = pdfData.text;
      
      console.log(`PDF procesado con éxito. Páginas: ${pdfData.numpages}`);
      console.log(`Texto extraído: ${pdfText.length} caracteres`);
      console.log(`Muestra: ${pdfText.substring(0, 300)}...`);
      
      const prompt = `
Eres un asistente especializado en extraer información estructurada de PDFs de estimados de construcción de cercas. 
Tu tarea es extraer la siguiente información del texto extraído del documento:

1. Información del cliente: nombre, dirección, teléfono, email
2. Detalles del proyecto: tipo de cerca, altura, longitud, ubicación, estilo y material
3. Información de precios: subtotal, impuestos, total y depósito requerido

Devuelve ÚNICAMENTE un objeto JSON con esta estructura:
{
  "cliente": {
    "nombre": "",
    "direccion": "",
    "telefono": "",
    "email": ""
  },
  "proyecto": {
    "tipoCerca": "",
    "altura": "",
    "longitud": "",
    "ubicacion": "",
    "estilo": "",
    "material": ""
  },
  "presupuesto": {
    "subtotal": "",
    "impuestos": "",
    "total": "",
    "deposito": ""
  }
}

Aquí está el texto extraído del PDF:
${pdfText}

Si no encuentras algún dato, deja el campo vacío. NO incluyas explicaciones adicionales, solo el JSON.
      `;
      
      console.log('Enviando texto extraído a Mistral AI para análisis...');
      
      // Configurar la petición a la API de Mistral (con texto en lugar de imagen)
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1, // Baja temperatura para respuestas más precisas
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      
      // Extraer y parsear la respuesta
      const content = response.data.choices[0].message.content;
      
      try {
        const datosExtraidos = JSON.parse(content);
        console.log('Datos extraídos correctamente:', datosExtraidos);
        return datosExtraidos;
      } catch (parseError) {
        console.error('Error parseando la respuesta JSON:', parseError);
        
        // Intentar extraer JSON de la respuesta en caso de que venga con texto adicional
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const jsonContent = jsonMatch[0];
            const datosExtraidos = JSON.parse(jsonContent);
            console.log('Datos extraídos del match:', datosExtraidos);
            return datosExtraidos;
          } catch (secondParseError) {
            console.error('Error en segundo intento de parsing:', secondParseError);
          }
        }
        
        throw new Error('No se pudo parsear la respuesta del modelo');
      }
    } catch (error: any) {
      console.error('Error extrayendo información con Mistral AI:', error);
      
      if (error.response) {
        console.error('Detalles del error:', error.response.data);
      }
      
      // Si fallamos con Mistral, intentar con OpenAI como fallback
      if (process.env.OPENAI_API_KEY) {
        console.log('Intentando procesamiento alternativo con OpenAI...');
        try {
          // Tenemos que extraer el texto nuevamente
          console.log('Re-extrayendo texto del PDF para OpenAI...');
          const pdfParseModule = await import('pdf-parse');
          const pdfParse = pdfParseModule.default;
          const pdfData = await pdfParse(pdfBuffer, { max: 0 });
          const pdfText = pdfData.text;
          
          if (!pdfText) {
            throw new Error('No se pudo extraer texto del PDF');
          }
          
          // Usar OpenAI como fallback con el mismo prompt
          const openAIResponse = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              {
                role: "user",
                content: `Eres un asistente especializado en extraer información estructurada de PDFs de estimados de construcción de cercas. 
Tu tarea es extraer la siguiente información del texto extraído del documento:

1. Información del cliente: nombre, dirección, teléfono, email
2. Detalles del proyecto: tipo de cerca, altura, longitud, ubicación, estilo y material
3. Información de precios: subtotal, impuestos, total y depósito requerido

Devuelve ÚNICAMENTE un objeto JSON con esta estructura:
{
  "cliente": {
    "nombre": "",
    "direccion": "",
    "telefono": "",
    "email": ""
  },
  "proyecto": {
    "tipoCerca": "",
    "altura": "",
    "longitud": "",
    "ubicacion": "",
    "estilo": "",
    "material": ""
  },
  "presupuesto": {
    "subtotal": "",
    "impuestos": "",
    "total": "",
    "deposito": ""
  }
}

Aquí está el texto extraído del PDF:
${pdfText}

Si no encuentras algún dato, deja el campo vacío. NO incluyas explicaciones adicionales, solo el JSON.`
              }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          });
          
          const content = openAIResponse.choices[0].message.content;
          if (!content) {
            throw new Error('OpenAI devolvió una respuesta vacía');
          }
          
          const datosExtraidos = JSON.parse(content);
          console.log('Datos extraídos correctamente con OpenAI como fallback:', datosExtraidos);
          return datosExtraidos;
        } catch (openAIError) {
          console.error('Error usando OpenAI como fallback:', openAIError);
          // Si incluso el fallback falla, lanzamos el error original
          throw new Error('Error procesando el PDF con Mistral AI y OpenAI');
        }
      } else {
        // Si no tenemos OpenAI API Key configurada, lanzamos el error original
        throw new Error('Error procesando el PDF con Mistral AI');
      }
    }
  }
  
  /**
   * Genera un contrato utilizando los datos extraídos
   */
  async generarContrato(datos: DatosExtraidos, informacionAdicional: any = {}): Promise<string> {
    if (!this.apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error('No hay APIs configuradas (MISTRAL_API_KEY o OPENAI_API_KEY)');
    }
    
    try {
      const datosCompletos = {
        ...datos,
        adicional: informacionAdicional,
      };
      
      const prompt = `
Eres un abogado especializado en contratos de construcción de cercas. 
Tu tarea es generar un contrato completo y profesional utilizando la siguiente información:

${JSON.stringify(datosCompletos, null, 2)}

El contrato debe incluir:
1. Encabezado con información de la empresa "Owl Fence Co."
2. Información del cliente y detalles del proyecto
3. Alcance del trabajo con especificaciones detalladas
4. Precio total, términos de pago y calendario de pagos
5. Calendario de proyecto con fecha de inicio y duración estimada
6. Garantías del trabajo
7. Términos y condiciones estándar
8. Espacios para firmas

Genera el contrato en HTML usando clases de Tailwind para una presentación profesional.
Usa sections, divs y otros elementos HTML para estructurar adecuadamente el documento.
NO incluyas elementos que no se renderizarían en un PDF (como scripts o interacciones).
Mantén un diseño limpio y profesional adecuado para un documento legal.
      `;
      
      // Configurar la petición a la API de Mistral
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.4,
          max_tokens: 4000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      
      // Extraer y devolver el HTML generado
      const htmlContrato = response.data.choices[0].message.content;
      return htmlContrato;
    } catch (error: any) {
      console.error('Error generando contrato con Mistral AI:', error);
      
      if (error.response) {
        console.error('Detalles del error:', error.response.data);
      }
      
      // Si fallamos con Mistral, intentar con OpenAI como fallback
      if (process.env.OPENAI_API_KEY) {
        console.log('Intentando generar contrato con OpenAI como fallback...');
        try {
          const datosCompletos = {
            ...datos,
            adicional: informacionAdicional,
          };
          
          // Usar OpenAI como fallback con el mismo prompt
          const openAIResponse = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              {
                role: "user",
                content: `Eres un abogado especializado en contratos de construcción de cercas. 
Tu tarea es generar un contrato completo y profesional utilizando la siguiente información:

${JSON.stringify(datosCompletos, null, 2)}

El contrato debe incluir:
1. Encabezado con información de la empresa "Owl Fence Co."
2. Información del cliente y detalles del proyecto
3. Alcance del trabajo con especificaciones detalladas
4. Precio total, términos de pago y calendario de pagos
5. Calendario de proyecto con fecha de inicio y duración estimada
6. Garantías del trabajo
7. Términos y condiciones estándar
8. Espacios para firmas

Genera el contrato en HTML usando clases de Tailwind para una presentación profesional.
Usa sections, divs y otros elementos HTML para estructurar adecuadamente el documento.
NO incluyas elementos que no se renderizarían en un PDF (como scripts o interacciones).
Mantén un diseño limpio y profesional adecuado para un documento legal.`
              }
            ],
            temperature: 0.4,
            max_tokens: 4000
          });
          
          const htmlContrato = openAIResponse.choices[0].message.content;
          if (!htmlContrato) {
            throw new Error('OpenAI devolvió una respuesta vacía');
          }
          
          console.log('Contrato generado correctamente con OpenAI como fallback');
          return htmlContrato;
        } catch (openAIError) {
          console.error('Error usando OpenAI como fallback para generar contrato:', openAIError);
          // Si incluso el fallback falla, lanzamos el error original
          throw new Error('Error generando el contrato con Mistral AI y OpenAI');
        }
      } else {
        // Si no tenemos OpenAI API Key configurada, lanzamos el error original
        throw new Error('Error generando el contrato con Mistral AI');
      }
    }
  }
}

// Exportar una instancia única del servicio
export const mistralService = new MistralService();
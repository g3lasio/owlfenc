import axios from 'axios';
import * as fs from 'fs';
import OpenAI from "openai"; // Importar OpenAI como fallback
import pdf from 'pdf-parse'; // Importar pdf-parse directamente

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
    
    // Crear directorio temporal si no existe
    this.ensureTempDirExists();
  }
  
  /**
   * Asegura que exista el directorio temporal para archivos PDF
   */
  private ensureTempDirExists(): void {
    try {
      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log('Directorio temporal creado:', tempDir);
      }
    } catch (error) {
      console.error('Error verificando/creando directorio temporal:', error);
    }
  }
  
  /**
   * Extrae texto del PDF utilizando pdf-parse
   * @param pdfBuffer Buffer del PDF
   * @returns Texto extraído del PDF
   */
  private async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      console.log('Extrayendo texto con pdf-parse...');
      
      // Guardar una copia del PDF en disco (puede ayudar con ciertos errores de pdf-parse)
      const timestamp = Date.now();
      const tempPdfPath = `./temp/temp_pdf_${timestamp}.pdf`;
      
      try {
        fs.writeFileSync(tempPdfPath, pdfBuffer);
        console.log(`PDF guardado temporalmente en: ${tempPdfPath}`);
      } catch (saveError) {
        console.error('Error guardando PDF temporal:', saveError);
        // Continuar incluso si no podemos guardar
      }
      
      // Usar opciones simples
      const options = { max: 0 };
      
      // Extraer texto
      const data = await pdf(pdfBuffer, options);
      
      console.log(`PDF procesado. Páginas: ${data.numpages}`);
      console.log(`Texto extraído: ${data.text.length} caracteres`);
      
      if (data.text.length === 0) {
        throw new Error('No se pudo extraer texto del PDF - La extracción resultó en texto vacío');
      }
      
      console.log(`Muestra: ${data.text.substring(0, 300)}...`);
      
      // Limpiar archivo temporal
      try {
        fs.unlinkSync(tempPdfPath);
      } catch (cleanupError) {
        console.error('Error limpiando archivo temporal:', cleanupError);
        // No lanzar error por esto
      }
      
      return data.text;
    } catch (error: any) {
      console.error('Error extrayendo texto con pdf-parse:', error);
      
      if (error.message && typeof error.message === 'string') {
        // Verificar errores específicos conocidos
        if (error.message.includes('test/data')) {
          console.log('Error con archivos de prueba en pdf-parse. Este es un problema conocido.');
          throw new Error('La biblioteca pdf-parse está intentando acceder a archivos de prueba que no existen. Contacta al soporte técnico.');
        }
      }
      
      throw new Error(`Error procesando PDF: ${error.message || 'Error desconocido'}`);
    }
  }
  
  /**
   * Extrae información relevante del PDF del estimado
   */
  async extraerInformacionPDF(pdfBuffer: Buffer): Promise<DatosExtraidos> {
    if (!this.apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error('No hay APIs configuradas (MISTRAL_API_KEY o OPENAI_API_KEY)');
    }
    
    try {
      console.log('Iniciando extracción con Mistral AI...');
      console.log(`Tamaño del PDF: ${pdfBuffer.length} bytes`);
      
      // Extraer texto usando método robusto
      const pdfText = await this.extractTextFromPDF(pdfBuffer);
      
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
      
      if (this.apiKey) {
        try {
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
            console.log('Datos extraídos correctamente con Mistral:', datosExtraidos);
            return datosExtraidos;
          } catch (parseError) {
            console.error('Error parseando la respuesta JSON de Mistral:', parseError);
            
            // Intentar extraer JSON de la respuesta en caso de que venga con texto adicional
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const jsonContent = jsonMatch[0];
                const datosExtraidos = JSON.parse(jsonContent);
                console.log('Datos extraídos del match con Mistral:', datosExtraidos);
                return datosExtraidos;
              } catch (secondParseError) {
                console.error('Error en segundo intento de parsing con Mistral:', secondParseError);
                throw new Error('No se pudo parsear la respuesta de Mistral');
              }
            } else {
              throw new Error('No se pudo encontrar JSON en la respuesta de Mistral');
            }
          }
        } catch (mistralError) {
          console.error('Error en la API de Mistral:', mistralError);
          
          // Propagar el error si no hay OpenAI configurado
          if (!process.env.OPENAI_API_KEY) {
            throw mistralError;
          }
          
          // Si hay error con Mistral y OpenAI está configurado, continuamos al fallback
          console.log('Error con Mistral, intentando con OpenAI...');
        }
      }
      
      // Si llegamos aquí, o bien Mistral falló o no está configurado, pero OpenAI sí
      if (process.env.OPENAI_API_KEY) {
        console.log('Procesando con OpenAI...');
        
        // Usar OpenAI como fallback o como primera opción si Mistral no está configurado
        const openAIResponse = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "user",
              content: prompt
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
        console.log('Datos extraídos correctamente con OpenAI:', datosExtraidos);
        return datosExtraidos;
      } else {
        throw new Error('No se pudo procesar con Mistral AI y OpenAI no está configurado');
      }
    } catch (error: any) {
      console.error('Error extrayendo información del PDF:', error);
      
      if (error.response) {
        console.error('Detalles del error de API:', error.response.data);
      }
      
      throw new Error(`Error procesando el PDF: ${error.message || 'Error desconocido'}`);
    }
  }
  
  /**
   * Genera un contrato utilizando los datos extraídos
   */
  async generarContrato(datos: DatosExtraidos, informacionAdicional: any = {}): Promise<string> {
    if (!this.apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error('No hay APIs configuradas (MISTRAL_API_KEY o OPENAI_API_KEY)');
    }
    
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
    
    try {
      if (this.apiKey) {
        try {
          console.log('Generando contrato con Mistral AI...');
          
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
          console.log('Contrato generado correctamente con Mistral AI');
          return htmlContrato;
        } catch (mistralError) {
          console.error('Error generando contrato con Mistral AI:', mistralError);
          
          // Propagar el error si no hay OpenAI configurado
          if (!process.env.OPENAI_API_KEY) {
            throw mistralError;
          }
          
          // Si hay error con Mistral y OpenAI está configurado, continuamos al fallback
          console.log('Error con Mistral, intentando generar contrato con OpenAI...');
        }
      }
      
      // Si llegamos aquí, o bien Mistral falló o no está configurado, pero OpenAI sí
      if (process.env.OPENAI_API_KEY) {
        console.log('Generando contrato con OpenAI...');
        
        // Usar OpenAI como fallback o como primera opción si Mistral no está configurado
        const openAIResponse = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.4,
          max_tokens: 4000
        });
        
        const htmlContrato = openAIResponse.choices[0].message.content;
        if (!htmlContrato) {
          throw new Error('OpenAI devolvió una respuesta vacía');
        }
        
        console.log('Contrato generado correctamente con OpenAI');
        return htmlContrato;
      } else {
        throw new Error('No se pudo generar el contrato con Mistral AI y OpenAI no está configurado');
      }
    } catch (error: any) {
      console.error('Error generando contrato:', error);
      
      if (error.response) {
        console.error('Detalles del error de API:', error.response.data);
      }
      
      throw new Error(`Error generando el contrato: ${error.message || 'Error desconocido'}`);
    }
  }
}

// Exportar una instancia única del servicio
export const mistralService = new MistralService();
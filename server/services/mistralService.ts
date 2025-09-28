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
  contratista?: {
    nombre?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    licencia?: string;
    sitioWeb?: string;
  };
  proyecto?: {
    tipoCerca?: string;
    altura?: string;
    longitud?: string;
    ubicacion?: string;
    estilo?: string;
    material?: string;
    fechaInicio?: string;
    duracionEstimada?: string;
    descripcion?: string;
  };
  presupuesto?: {
    subtotal?: string;
    impuestos?: string;
    total?: string;
    deposito?: string;
    formaPago?: string;
  };
  clausulasAdicionales?: string[];
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
  async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
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

1. Información del cliente: nombre completo, dirección, teléfono, email
2. Información del contratista: nombre de la empresa, dirección, teléfono, email, número de licencia, sitio web
3. Detalles del proyecto: tipo de cerca, altura, longitud, ubicación, estilo, material, fecha de inicio (si está disponible), duración estimada, descripción del trabajo
4. Información de precios: subtotal, impuestos, total y depósito requerido, forma de pago

Es CRÍTICO extraer toda la información del contratista que figure en el documento, ya que será utilizada para un contrato legal.

Devuelve ÚNICAMENTE un objeto JSON con esta estructura:
{
  "cliente": {
    "nombre": "",
    "direccion": "",
    "telefono": "",
    "email": ""
  },
  "contratista": {
    "nombre": "",
    "direccion": "",
    "telefono": "",
    "email": "",
    "licencia": "",
    "sitioWeb": ""
  },
  "proyecto": {
    "tipoCerca": "",
    "altura": "",
    "longitud": "",
    "ubicacion": "",
    "estilo": "",
    "material": "",
    "fechaInicio": "",
    "duracionEstimada": "",
    "descripcion": ""
  },
  "presupuesto": {
    "subtotal": "",
    "impuestos": "",
    "total": "",
    "deposito": "",
    "formaPago": ""
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
              role: "system",
              content: "Eres un asistente especializado en extraer información detallada de documentos relacionados con construcción de cercas. Cuando hay información faltante en el documento, déjala en blanco pero NUNCA inventes datos. Es crítico extraer todos los datos disponibles del contratista y cliente para un contrato legal."
            },
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
    
    // Importamos y utilizamos el generador de contratos basado en plantilla
    // En lugar de generar HTML con la API, lo generamos localmente
    // Esto permite un control más preciso y un contrato más consistente y profesional
    
    // Convertimos los datos extraídos al formato esperado por el generador
    // Nota: Esta línea es solo para referencia. La lógica real se implementará
    // en el generador de contratos.
    
    // La lógica para generar el contrato se traslada al cliente con el nuevo generador de contratos
    // Este prompt sólo lo conservamos para la API de Mistral en caso de que sea necesario
    const prompt = `
Eres un abogado especializado en contratos de construcción de cercas.
Tu tarea es generar un contrato completo y profesional utilizando la siguiente información:

${JSON.stringify(datosCompletos, null, 2)}

REQUISITOS CRÍTICOS:
- Si falta la información del contratista, asume que es "Owl Fenc" con dirección en "2901 Owens Ct, Fairfield, CA 94534 US" y número (202) 549-3519.
- Si falta alguna información importante del cliente, MARCA CLARAMENTE esos datos faltantes con [FALTA: dato] para que puedan ser completados manualmente.
- Si existen cláusulas adicionales, debes incluirlas exactamente como se proporcionan sin alterarlas, incluso si parecen inusuales.

El contrato debe incluir:
1. Encabezado con información completa del contratista
2. Información completa del cliente
3. Detalles del proyecto con todas las especificaciones disponibles
4. Alcance del trabajo con especificaciones detalladas
5. Precio total, términos de pago y calendario de pagos
6. Calendario de proyecto con fecha de inicio y duración estimada
7. Garantías del trabajo (mínimo 1 año en mano de obra)
8. Términos y condiciones estándar, incluyendo:
   - Condiciones de cancelación
   - Responsabilidades de las partes
   - Proceso de modificación del contrato
   - Resolución de disputas
9. Cláusulas adicionales (si existen)
10. Espacios para firmas de AMBAS PARTES con fecha
11. Información de contacto del contratista para preguntas o emergencias

Genera el contrato en HTML basado en la plantilla que está en 'client/src/components/templates/contract-template.html'.
Llena los campos con marcadores entre corchetes con la información correcta.
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
              role: "system",
              content: "Eres un abogado experto especializado en contratos de construcción. Tu tarea es generar contratos legalmente vinculantes que incluyan toda la información necesaria. Debes marcar claramente la información faltante como [FALTA: dato] para que pueda ser completada manualmente. Si el contratista no se menciona, asume que es 'Owl Fenc'. Si se incluyen cláusulas adicionales, agrégalas exactamente como se proporcionan sin juzgarlas."
            },
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
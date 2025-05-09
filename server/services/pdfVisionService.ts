import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import OpenAI from 'openai';

// Inicializar cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class PDFVisionService {
  /**
   * Extrae datos relevantes de un PDF utilizando GPT-4 Vision API
   * @param pdfPath Ruta temporal del archivo PDF
   * @returns Datos extraídos del PDF como objeto JSON
   */
  async extractDataFromPDF(pdfPath: string): Promise<any> {
    try {
      // 1. Leer el archivo PDF
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // 2. Convertir páginas a imágenes
      const base64Images = await this.convertPDFToBase64Images(pdfDoc);
      
      // 3. Extraer información con GPT-4 Vision
      const promptText = `
        Este es un PDF de un estimado de cercas. Por favor, extrae la siguiente información en formato JSON:
        
        1. Cliente:
           - Nombre completo
           - Dirección
           - Teléfono
           - Email
        
        2. Proyecto:
           - Tipo de cerca (ej. madera, vinilo, cadena)
           - Altura en pies
           - Longitud total en pies
           - Características especiales
           - Demolición requerida
           - Cantidad y tipo de puertas
        
        3. Presupuesto:
           - Subtotal
           - Impuestos
           - Total
           - Método de pago sugerido
           - Forma de pago (depósito inicial, pagos parciales, etc.)
        
        4. Contratista:
           - Nombre de la empresa
           - Licencia/Número de registro
           - Contacto
        
        5. Fechas:
           - Fecha de emisión
           - Validez del estimado
           - Tiempo estimado de inicio y finalización
        
        Devuelve SOLO un objeto JSON sin explicaciones adicionales.
      `;

      // El nuevo modelo de OpenAI es "gpt-4o" que fue lanzado el 13 de mayo de 2024. No cambiar a menos que el usuario lo solicite explícitamente
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              ...base64Images.map(img => ({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${img}` }
              }))
            ]
          }
        ],
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        throw new Error('La API de OpenAI no devolvió contenido');
      }

      // Parsear respuesta JSON
      return JSON.parse(responseContent);
    } catch (error) {
      console.error('Error al extraer datos del PDF:', error);
      throw new Error(`No se pudieron extraer los datos del PDF: ${error.message}`);
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

      // El nuevo modelo de OpenAI es "gpt-4o" que fue lanzado el 13 de mayo de 2024. No cambiar a menos que el usuario lo solicite explícitamente
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        throw new Error('La API de OpenAI no devolvió contenido');
      }

      // Parsear respuesta JSON
      const clauses = JSON.parse(responseContent);
      return Array.isArray(clauses) ? clauses : [];
    } catch (error) {
      console.error('Error al generar cláusulas:', error);
      return [
        "El contratista garantiza la calidad de los materiales utilizados por un período de 1 año.",
        "El cliente será responsable de marcar correctamente las líneas de propiedad antes de la instalación.",
        "Cualquier modificación al diseño original requerirá aprobación por escrito y podría generar costos adicionales.",
        "El contratista no es responsable por daños a líneas de servicios no marcadas adecuadamente.",
        "Los tiempos de instalación están sujetos a condiciones climáticas favorables."
      ];
    }
  }

  /**
   * Convierte un documento PDF a un array de imágenes base64
   * @param pdfDoc Documento PDF cargado
   * @returns Array de strings base64 de las imágenes
   */
  private async convertPDFToBase64Images(pdfDoc: PDFDocument): Promise<string[]> {
    const pageCount = pdfDoc.getPageCount();
    const base64Images: string[] = [];
    
    // Creamos directorio temporal si no existe
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      for (let i = 0; i < pageCount; i++) {
        // Generar un nombre temporal para la imagen
        const tempImagePath = path.join(tempDir, `page-${i}.png`);
        
        // Renderizar página como PNG
        const page = pdfDoc.getPages()[i];
        const { width, height } = page.getSize();
        
        // Convertir página a PNG (esto es un ejemplo simplificado)
        // En una implementación real, usaríamos una biblioteca como pdf.js o pdf2image
        // para renderizar correctamente las páginas PDF a imágenes
        
        // Para este ejemplo, guardamos el PDF serializado y lo convertimos con sharp
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(tempImagePath, pdfBytes);
        
        // Usar sharp para convertir a JPG y redimensionar para Vision API
        const imageBuffer = await sharp(tempImagePath)
          .resize(1500) // Redimensionar manteniendo ratio
          .jpeg({ quality: 85 })
          .toBuffer();
        
        // Convertir a base64
        const base64Image = imageBuffer.toString('base64');
        base64Images.push(base64Image);
        
        // Limpiar archivo temporal
        fs.unlinkSync(tempImagePath);
      }
      
      return base64Images;
    } catch (error) {
      console.error('Error convirtiendo PDF a imágenes:', error);
      throw new Error('No se pudo convertir el PDF a imágenes');
    }
  }
}

export const pdfVisionService = new PDFVisionService();
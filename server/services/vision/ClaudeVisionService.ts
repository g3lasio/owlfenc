/**
 * Claude Vision Service
 * 
 * Servicio para analizar imágenes, PDFs y documentos usando Claude Sonnet Vision.
 * Proporciona capacidades de OCR avanzado y análisis visual para Mervin.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

export interface VisionAnalysisRequest {
  images: ImageInput[];
  prompt: string;
  context?: string;
  analysisType?: 'general' | 'estimate' | 'contract' | 'property' | 'measurements';
}

export interface ImageInput {
  type: 'url' | 'base64' | 'path';
  data: string;
  mediaType?: string; // 'image/jpeg', 'image/png', 'image/webp', 'image/gif'
}

export interface VisionAnalysisResponse {
  analysis: string;
  detectedElements?: {
    measurements?: string[];
    materials?: string[];
    structures?: string[];
    text?: string[];
  };
  confidence: number;
  suggestions?: string[];
}

export class ClaudeVisionService {
  private client: Anthropic;
  private model: string = 'claude-sonnet-4-20250514';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY no está configurada');
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Analizar imágenes con Claude Sonnet Vision
   */
  async analyzeImages(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse> {
    try {
      console.log('🔍 [VISION] Iniciando análisis de imágenes...');
      console.log(`📸 [VISION] Número de imágenes: ${request.images.length}`);
      console.log(`🎯 [VISION] Tipo de análisis: ${request.analysisType || 'general'}`);

      // Preparar el prompt según el tipo de análisis
      const systemPrompt = this.buildSystemPrompt(request.analysisType);
      const userPrompt = this.buildUserPrompt(request);

      // Preparar las imágenes para la API
      const imageBlocks = await this.prepareImageBlocks(request.images);

      // Construir el mensaje con texto e imágenes
      const content: any[] = [
        ...imageBlocks,
        {
          type: 'text',
          text: userPrompt
        }
      ];

      // Llamar a la API de Claude con visión
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content
          }
        ]
      });

      const analysis = response.content[0].type === 'text' ? response.content[0].text : '';

      console.log('✅ [VISION] Análisis completado');
      console.log(`📝 [VISION] Longitud de respuesta: ${analysis.length} caracteres`);

      // Extraer elementos detectados del análisis
      const detectedElements = this.extractDetectedElements(analysis, request.analysisType);

      return {
        analysis,
        detectedElements,
        confidence: this.estimateConfidence(analysis),
        suggestions: this.generateSuggestions(analysis, request.analysisType)
      };

    } catch (error: any) {
      console.error('❌ [VISION] Error en análisis:', error);
      throw new Error(`Error analizando imágenes: ${error.message}`);
    }
  }

  /**
   * Preparar bloques de imágenes para la API
   */
  private async prepareImageBlocks(images: ImageInput[]): Promise<any[]> {
    const blocks: any[] = [];

    for (const image of images) {
      let imageData: string;
      let mediaType: string = image.mediaType || 'image/jpeg';

      if (image.type === 'base64') {
        // Ya está en base64
        imageData = image.data;
      } else if (image.type === 'path') {
        // Leer archivo del sistema de archivos
        const buffer = fs.readFileSync(image.data);
        imageData = buffer.toString('base64');
        
        // Detectar tipo de archivo
        const ext = path.extname(image.data).toLowerCase();
        if (ext === '.png') mediaType = 'image/png';
        else if (ext === '.webp') mediaType = 'image/webp';
        else if (ext === '.gif') mediaType = 'image/gif';
      } else if (image.type === 'url') {
        // Para URLs, necesitamos descargar la imagen primero
        // Por ahora, lanzamos un error
        throw new Error('URL images not yet supported. Use base64 or path.');
      } else {
        throw new Error(`Tipo de imagen no soportado: ${image.type}`);
      }

      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: imageData
        }
      });
    }

    return blocks;
  }

  /**
   * Construir prompt del sistema según el tipo de análisis
   */
  private buildSystemPrompt(analysisType?: string): string {
    const basePrompt = `Eres Mervin, un asistente experto en construcción y cercas. Tienes la capacidad de analizar imágenes con gran precisión.`;

    const typeSpecificPrompts: Record<string, string> = {
      estimate: `${basePrompt} Tu tarea es analizar imágenes de terrenos, propiedades y proyectos para ayudar a generar estimados precisos. Identifica:
- Dimensiones y medidas visibles
- Tipo de terreno y condiciones
- Estructuras existentes
- Materiales visibles
- Obstáculos o desafíos
- Acceso y logística`,

      contract: `${basePrompt} Tu tarea es analizar documentos, planos y especificaciones para ayudar a crear contratos detallados. Extrae:
- Información del cliente y propiedad
- Especificaciones técnicas
- Términos y condiciones
- Fechas y plazos
- Costos y pagos`,

      property: `${basePrompt} Tu tarea es analizar imágenes de propiedades para verificación y evaluación. Identifica:
- Dirección y ubicación visible
- Características de la propiedad
- Límites y linderos
- Estructuras y construcciones
- Estado general`,

      measurements: `${basePrompt} Tu tarea es extraer medidas y dimensiones de imágenes, planos y documentos. Identifica:
- Longitudes y distancias
- Alturas y profundidades
- Áreas y perímetros
- Escalas y referencias
- Unidades de medida`,

      general: `${basePrompt} Analiza las imágenes proporcionadas y describe lo que ves de manera detallada y precisa.`
    };

    return typeSpecificPrompts[analysisType || 'general'] || typeSpecificPrompts.general;
  }

  /**
   * Construir prompt del usuario
   */
  private buildUserPrompt(request: VisionAnalysisRequest): string {
    let prompt = request.prompt;

    if (request.context) {
      prompt = `Contexto adicional: ${request.context}\n\n${prompt}`;
    }

    // Agregar instrucciones específicas según el tipo
    if (request.analysisType === 'estimate') {
      prompt += `\n\nProporciona un análisis estructurado que incluya:
1. Descripción general del proyecto
2. Medidas y dimensiones estimadas
3. Materiales identificados
4. Condiciones del terreno
5. Posibles desafíos o consideraciones especiales`;
    }

    return prompt;
  }

  /**
   * Extraer elementos detectados del análisis
   */
  private extractDetectedElements(analysis: string, analysisType?: string): any {
    const elements: any = {};

    // Extraer medidas (números seguidos de unidades)
    const measurementRegex = /(\d+(?:\.\d+)?)\s*(ft|feet|m|meters|metros|pies|in|inches|pulgadas)/gi;
    const measurements = analysis.match(measurementRegex);
    if (measurements && measurements.length > 0) {
      elements.measurements = [...new Set(measurements)];
    }

    // Extraer materiales comunes
    const materialKeywords = ['wood', 'madera', 'vinyl', 'vinilo', 'chain link', 'alambre', 'metal', 'concrete', 'concreto', 'stone', 'piedra'];
    const materials: string[] = [];
    materialKeywords.forEach(keyword => {
      if (analysis.toLowerCase().includes(keyword)) {
        materials.push(keyword);
      }
    });
    if (materials.length > 0) {
      elements.materials = materials;
    }

    // Extraer estructuras
    const structureKeywords = ['fence', 'cerca', 'gate', 'portón', 'post', 'poste', 'panel', 'wall', 'muro'];
    const structures: string[] = [];
    structureKeywords.forEach(keyword => {
      if (analysis.toLowerCase().includes(keyword)) {
        structures.push(keyword);
      }
    });
    if (structures.length > 0) {
      elements.structures = structures;
    }

    return Object.keys(elements).length > 0 ? elements : undefined;
  }

  /**
   * Estimar confianza del análisis
   */
  private estimateConfidence(analysis: string): number {
    // Heurística simple basada en la longitud y detalle del análisis
    if (analysis.length < 100) return 0.5;
    if (analysis.length < 300) return 0.7;
    if (analysis.length < 600) return 0.85;
    return 0.95;
  }

  /**
   * Generar sugerencias basadas en el análisis
   */
  private generateSuggestions(analysis: string, analysisType?: string): string[] {
    const suggestions: string[] = [];

    if (analysisType === 'estimate') {
      if (!analysis.toLowerCase().includes('medida') && !analysis.toLowerCase().includes('dimension')) {
        suggestions.push('Considera proporcionar medidas más específicas para un estimado más preciso.');
      }
      if (!analysis.toLowerCase().includes('material')) {
        suggestions.push('Especifica los materiales deseados para calcular costos exactos.');
      }
    }

    return suggestions;
  }

  /**
   * Analizar una sola imagen (método de conveniencia)
   */
  async analyzeSingleImage(
    imagePath: string,
    prompt: string,
    analysisType?: VisionAnalysisRequest['analysisType']
  ): Promise<VisionAnalysisResponse> {
    return this.analyzeImages({
      images: [{ type: 'path', data: imagePath }],
      prompt,
      analysisType
    });
  }
}

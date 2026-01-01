/**
 * Vision Analysis Tool
 * 
 * Herramienta para que Mervin analice imágenes usando Claude Sonnet Vision.
 * Se integra con el sistema Auto-Discovery.
 */

import { ClaudeVisionService, VisionAnalysisRequest } from '../../services/vision/ClaudeVisionService';

export interface VisionToolInput {
  images: Array<{
    type: 'url' | 'base64' | 'path';
    data: string;
    mediaType?: string;
  }>;
  prompt: string;
  context?: string;
  analysisType?: 'general' | 'estimate' | 'contract' | 'property' | 'measurements';
}

export class VisionAnalysisTool {
  private visionService: ClaudeVisionService;

  constructor() {
    this.visionService = new ClaudeVisionService();
  }

  /**
   * Definición de la herramienta para Claude
   */
  static getToolDefinition() {
    return {
      name: 'analyze_images',
      description: `Analiza imágenes, fotos, planos, PDFs o documentos visuales para extraer información relevante.
      
Casos de uso:
- Analizar fotos del terreno para entender el proyecto
- Leer planos y extraer medidas
- Identificar materiales y estructuras en imágenes
- Procesar documentos con OCR avanzado
- Detectar características de propiedades

IMPORTANTE: Usa esta herramienta cuando el usuario adjunte imágenes o cuando necesites "ver" algo para dar una mejor respuesta.`,
      input_schema: {
        type: 'object',
        properties: {
          images: {
            type: 'array',
            description: 'Lista de imágenes a analizar',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['url', 'base64', 'path'],
                  description: 'Tipo de imagen'
                },
                data: {
                  type: 'string',
                  description: 'URL, base64 o ruta del archivo'
                },
                mediaType: {
                  type: 'string',
                  description: 'Tipo MIME (image/jpeg, image/png, etc.)'
                }
              },
              required: ['type', 'data']
            }
          },
          prompt: {
            type: 'string',
            description: 'Pregunta o instrucción sobre qué analizar en las imágenes'
          },
          context: {
            type: 'string',
            description: 'Contexto adicional sobre el proyecto o situación'
          },
          analysisType: {
            type: 'string',
            enum: ['general', 'estimate', 'contract', 'property', 'measurements'],
            description: 'Tipo de análisis a realizar'
          }
        },
        required: ['images', 'prompt']
      }
    };
  }

  /**
   * Ejecutar el análisis de imágenes
   */
  async execute(input: VisionToolInput): Promise<any> {
    try {
      console.log('🔍 [VISION-TOOL] Ejecutando análisis de imágenes...');
      console.log(`📸 [VISION-TOOL] Imágenes: ${input.images.length}`);
      console.log(`🎯 [VISION-TOOL] Tipo: ${input.analysisType || 'general'}`);

      const request: VisionAnalysisRequest = {
        images: input.images,
        prompt: input.prompt,
        context: input.context,
        analysisType: input.analysisType || 'general'
      };

      const result = await this.visionService.analyzeImages(request);

      console.log('✅ [VISION-TOOL] Análisis completado');

      // Formatear respuesta para Mervin
      return {
        success: true,
        analysis: result.analysis,
        detectedElements: result.detectedElements,
        confidence: result.confidence,
        suggestions: result.suggestions,
        summary: this.generateSummary(result)
      };

    } catch (error: any) {
      console.error('❌ [VISION-TOOL] Error:', error);
      return {
        success: false,
        error: error.message,
        analysis: 'No se pudo analizar las imágenes. Por favor, intenta de nuevo.'
      };
    }
  }

  /**
   * Generar resumen del análisis
   */
  private generateSummary(result: any): string {
    let summary = '📸 Análisis de imágenes completado.\n\n';

    if (result.detectedElements) {
      if (result.detectedElements.measurements) {
        summary += `📏 Medidas detectadas: ${result.detectedElements.measurements.join(', ')}\n`;
      }
      if (result.detectedElements.materials) {
        summary += `🏗️ Materiales identificados: ${result.detectedElements.materials.join(', ')}\n`;
      }
      if (result.detectedElements.structures) {
        summary += `🏛️ Estructuras detectadas: ${result.detectedElements.structures.join(', ')}\n`;
      }
    }

    summary += `\n✨ Confianza: ${(result.confidence * 100).toFixed(0)}%`;

    return summary;
  }
}

// Exportar instancia singleton
export const visionAnalysisTool = new VisionAnalysisTool();

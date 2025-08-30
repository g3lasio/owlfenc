/**
 * Servicio frontend para importación inteligente de clientes con IA
 */

import { apiRequest } from '@/lib/queryClient';

export interface IntelligentImportResult {
  success: boolean;
  mappedClients: any[];
  error?: string;
  originalHeaders: string[];
  detectedFormat: string;
}

export class ClientIntelligentImportService {
  private baseUrl = '/api/intelligent-import';

  /**
   * Procesa un archivo CSV usando IA para mapeo inteligente de columnas
   */
  async processCSVWithAI(csvFile: File): Promise<IntelligentImportResult> {
    try {
      console.log('🤖 [CLIENT-INTELLIGENT-IMPORT] Iniciando procesamiento con IA...');
      
      // Leer el contenido del archivo CSV
      const csvContent = await this.readFileAsText(csvFile);
      
      console.log('📊 [CLIENT-INTELLIGENT-IMPORT] Archivo leído, enviando a API...');
      
      // Usar apiRequest que maneja automáticamente la autenticación
      const result = await apiRequest.post(`${this.baseUrl}/csv`, {
        csvContent
      });
      
      console.log('✅ [CLIENT-INTELLIGENT-IMPORT] Procesamiento completado:', {
        success: result.success,
        clientsFound: result.mappedClients?.length || 0,
        format: result.detectedFormat
      });

      return result;
      
    } catch (error) {
      console.error('❌ [CLIENT-INTELLIGENT-IMPORT] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la importación inteligente';
      return {
        success: false,
        mappedClients: [],
        error: errorMessage,
        originalHeaders: [],
        detectedFormat: 'Error'
      };
    }
  }

  /**
   * Prueba la funcionalidad de importación inteligente
   */
  async testIntelligentImport(): Promise<IntelligentImportResult> {
    try {
      console.log('🧪 [CLIENT-INTELLIGENT-IMPORT] Ejecutando prueba...');
      
      // Usar apiRequest que maneja automáticamente la autenticación
      const result = await apiRequest.get(`${this.baseUrl}/test`);
      
      console.log('✅ [CLIENT-INTELLIGENT-IMPORT] Prueba completada:', result);

      return result.testResult || {
        success: false,
        mappedClients: [],
        error: 'No se recibieron datos de prueba',
        originalHeaders: [],
        detectedFormat: 'Test'
      };
      
    } catch (error) {
      console.error('❌ [CLIENT-INTELLIGENT-IMPORT] Error en prueba:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error en la prueba de importación inteligente';
      return {
        success: false,
        mappedClients: [],
        error: errorMessage,
        originalHeaders: [],
        detectedFormat: 'Test Error'
      };
    }
  }

  /**
   * Lee un archivo como texto
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Error al leer el archivo como texto'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }
}

export const intelligentImportService = new ClientIntelligentImportService();
/**
 * AGENT CLIENT - CLIENTE DE API PARA MERVIN V2
 * 
 * Responsabilidades:
 * - Comunicación con endpoints de Mervin V2
 * - Soporte para JSON y streaming SSE
 * - Manejo de errores y reintentos
 * - Autenticación con Firebase token
 */

export interface MervinMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface MervinResponse {
  type: 'CONVERSATION' | 'TASK_COMPLETED' | 'TASK_ERROR' | 'NEEDS_MORE_INFO';
  message: string;
  data?: any;
  executionTime?: number;
  taskProgress?: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
    progress: number;
    estimatedTimeRemaining: number;
  };
  suggestedActions?: string[];
}

export interface StreamUpdate {
  type: 'progress' | 'message' | 'complete' | 'error';
  content: string;
  progress?: any;
  data?: any;
}

export type StreamCallback = (update: StreamUpdate) => void;
export type AuthTokenProvider = () => Promise<string | null>;

export class AgentClient {
  private baseURL: string;
  private userId: string;
  private getAuthToken: AuthTokenProvider | null;

  constructor(userId: string, baseURL: string = '', getAuthToken: AuthTokenProvider | null = null) {
    this.userId = userId;
    this.baseURL = baseURL;
    this.getAuthToken = getAuthToken;
  }

  /**
   * Parsear un evento SSE completo (maneja multi-línea data: y CRLF)
   * @returns Objeto parseado o null si no hay data válida
   */
  private parseSSEEvent(eventText: string): any | null {
    // Normalizar CRLF a LF
    const normalized = eventText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    
    // Concatenar todas las líneas data: en un solo payload
    let dataLines: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        dataLines.push(line.substring(6));
      } else if (line.startsWith('data:')) {
        dataLines.push(line.substring(5));
      }
    }
    
    if (dataLines.length === 0) {
      return null;
    }
    
    // Unir las líneas data: (multi-line data blocks se concatenan con \n)
    const jsonStr = dataLines.join('\n');
    
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('❌ [SSE-PARSER] Error parsing JSON:', e);
      console.error('   JSON string:', jsonStr.substring(0, 200));
      return null;
    }
  }
  
  /**
   * Obtener headers de autenticación
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Incluir Firebase token si está disponible
    if (this.getAuthToken) {
      try {
        const token = await this.getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('❌ [AGENT-CLIENT] Error obteniendo token:', error);
      }
    }
    
    return headers;
  }

  /**
   * Enviar mensaje sin streaming (response JSON)
   */
  async sendMessage(
    input: string,
    conversationHistory: MervinMessage[] = [],
    language: 'es' | 'en' = 'es'
  ): Promise<MervinResponse> {
    try {
      console.log('📨 [AGENT-CLIENT] Enviando mensaje:', input.substring(0, 50));
      
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseURL}/api/mervin-v2/process`, {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies for session-based auth
        body: JSON.stringify({
          input,
          userId: this.userId,
          conversationHistory,
          language
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [AGENT-CLIENT] Response recibido');
      
      return data as MervinResponse;

    } catch (error: any) {
      console.error('❌ [AGENT-CLIENT] Error:', error);
      throw new Error(`Error enviando mensaje: ${error.message}`);
    }
  }

  /**
   * Enviar mensaje con streaming SSE (con buffer de chunks parciales)
   */
  async sendMessageStream(
    input: string,
    conversationHistory: MervinMessage[] = [],
    language: 'es' | 'en' = 'es',
    onUpdate: StreamCallback
  ): Promise<void> {
    let parseErrors = 0;
    let eventsProcessed = 0;
    
    try {
      console.log('📡 [AGENT-CLIENT] Iniciando streaming:', input.substring(0, 50));
      
      const headers = await this.getAuthHeaders();
      
      const requestBody = {
        input,
        userId: this.userId,
        conversationHistory,
        language
      };
      
      console.log('📤 [AGENT-CLIENT-DEBUG] Request details:', {
        url: `${this.baseURL}/api/mervin-v2/stream`,
        method: 'POST',
        headers: Object.keys(headers),
        bodyKeys: Object.keys(requestBody),
        inputLength: input.length,
        historyLength: conversationHistory.length
      });

      const response = await fetch(`${this.baseURL}/api/mervin-v2/stream`, {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies for session-based auth
        body: JSON.stringify(requestBody)
      });

      console.log(`📊 [AGENT-CLIENT] Response status: ${response.status} ${response.statusText}`);

      // 🛡️ DEFENSIVE ERROR HANDLING: Surface HTTP errors to UI instead of silent failures
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorText = await response.text();
          console.error(`❌ [AGENT-CLIENT] Server error response:`, errorText);
          
          // Try to parse JSON error
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch {
            // Not JSON, use raw text if meaningful
            if (errorText && errorText.length < 200) {
              errorMessage = errorText;
            }
          }
        } catch (readError) {
          console.error(`❌ [AGENT-CLIENT] Could not read error body:`, readError);
        }
        
        // Send error to UI via callback
        onUpdate({
          type: 'error',
          content: `Error del servidor: ${errorMessage}`,
          data: { status: response.status }
        });
        
        throw new Error(errorMessage);
      }
      
      console.log(`🔄 [AGENT-CLIENT] Starting to read stream...`);

      // Leer stream SSE con buffer persistente para chunks parciales
      const reader = response.body?.getReader();
      const decoder = new TextDecoder(); // Sin stream:true para simplicidad

      if (!reader) {
        throw new Error('No se pudo crear reader del stream');
      }

      // 🔧 BUFFER PERSISTENTE: Acumula texto parcial entre chunks
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // 🔧 FLUSH FINAL: Decodificar cualquier byte UTF-8 pendiente
          const finalChunk = decoder.decode(); // Sin stream:true para flush final
          if (finalChunk) {
            buffer += finalChunk;
          }
          
          // 🔧 PROCESAR BUFFER RESIDUAL: EOF termina el evento final implícitamente
          if (buffer.trim()) {
            console.log('📦 [AGENT-CLIENT] Procesando evento final sin delimitador (EOF)');
            
            // Usar la misma lógica de parsing que para eventos normales
            const data = this.parseSSEEvent(buffer);
            if (data) {
              onUpdate(data as StreamUpdate);
              eventsProcessed++;
              console.log('✅ [AGENT-CLIENT] Evento final procesado exitosamente');
            } else {
              console.warn('⚠️ [AGENT-CLIENT] Buffer residual no contiene evento SSE válido:', buffer.substring(0, 100));
            }
          }
          
          console.log(`✅ [AGENT-CLIENT] Stream completado - ${eventsProcessed} eventos procesados, ${parseErrors} errores`);
          break;
        }

        // Decodificar chunk y agregarlo al buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Dividir por eventos SSE completos (separados por \n\n o \r\n\r\n)
        // Normalizar CRLF a LF para simplificar
        const normalizedBuffer = buffer.replace(/\r\n/g, '\n');
        let eventEnd: number;
        
        while ((eventEnd = normalizedBuffer.indexOf('\n\n')) !== -1) {
          // Extraer un evento completo del buffer original
          // Calcular posición real en el buffer original
          const realEventEnd = buffer.indexOf('\n\n');
          if (realEventEnd === -1) {
            // Fallback: buscar \r\n\r\n
            const crlfEnd = buffer.indexOf('\r\n\r\n');
            if (crlfEnd !== -1) {
              const event = buffer.substring(0, crlfEnd);
              buffer = buffer.substring(crlfEnd + 4);
              
              // Parsear evento usando helper
              const data = this.parseSSEEvent(event);
              if (data) {
                onUpdate(data as StreamUpdate);
                eventsProcessed++;
              } else {
                parseErrors++;
              }
            } else {
              break; // No hay delimitadores completos
            }
          } else {
            const event = buffer.substring(0, realEventEnd);
            buffer = buffer.substring(realEventEnd + 2);
            
            // Parsear evento usando helper
            const data = this.parseSSEEvent(event);
            if (data) {
              onUpdate(data as StreamUpdate);
              eventsProcessed++;
            } else {
              parseErrors++;
              if (parseErrors === 1) {
                console.warn('⚠️ [AGENT-CLIENT] Primer error de parsing detectado');
              }
            }
          }
        }
      }

      // 📊 Telemetría final
      if (parseErrors > 0) {
        console.warn(`⚠️ [AGENT-CLIENT] Streaming completado con ${parseErrors} errores de parsing de ${eventsProcessed + parseErrors} eventos totales (${((parseErrors / (eventsProcessed + parseErrors)) * 100).toFixed(1)}% fallos)`);
      }

    } catch (error: any) {
      console.error('❌ [AGENT-CLIENT] Error en streaming:', error);
      console.error(`   Eventos procesados: ${eventsProcessed}, Parse errors: ${parseErrors}`);
      onUpdate({
        type: 'error',
        content: `Error en streaming: ${error.message}`
      });
    }
  }

  /**
   * Enviar mensaje con archivos adjuntos (streaming SSE con buffer de chunks parciales)
   */
  async sendMessageWithFiles(
    input: string,
    files: File[],
    conversationHistory: MervinMessage[] = [],
    language: 'es' | 'en' = 'es',
    onUpdate: StreamCallback
  ): Promise<void> {
    let parseErrors = 0;
    let eventsProcessed = 0;
    
    try {
      console.log(`📨 [AGENT-CLIENT] Enviando mensaje con ${files.length} archivo(s)`);

      // Crear FormData para multipart/form-data
      const formData = new FormData();
      formData.append('input', input);
      formData.append('userId', this.userId);
      formData.append('language', language);
      formData.append('conversationHistory', JSON.stringify(conversationHistory));

      // Adjuntar archivos
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      // Obtener headers de autenticación (solo Authorization, no Content-Type para FormData)
      const headers: Record<string, string> = {};
      if (this.getAuthToken) {
        try {
          const token = await this.getAuthToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('❌ [AGENT-CLIENT] Error obteniendo token:', error);
        }
      }

      const response = await fetch(`${this.baseURL}/api/mervin-v2/process-with-files`, {
        method: 'POST',
        headers, // No incluir Content-Type aquí, FormData lo configura automáticamente
        credentials: 'include', // Include cookies for session-based auth
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Leer stream SSE con buffer persistente para chunks parciales
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No se pudo crear reader del stream');
      }

      // 🔧 BUFFER PERSISTENTE: Acumula texto parcial entre chunks
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // 🔧 FLUSH FINAL: Decodificar cualquier byte UTF-8 pendiente
          const finalChunk = decoder.decode(); // Sin stream:true para flush final
          if (finalChunk) {
            buffer += finalChunk;
          }
          
          // 🔧 PROCESAR BUFFER RESIDUAL: EOF termina el evento final implícitamente
          if (buffer.trim()) {
            console.log('📦 [AGENT-CLIENT-FILES] Procesando evento final sin delimitador (EOF)');
            
            // Usar la misma lógica de parsing que para eventos normales
            const data = this.parseSSEEvent(buffer);
            if (data) {
              onUpdate(data as StreamUpdate);
              eventsProcessed++;
              console.log('✅ [AGENT-CLIENT-FILES] Evento final procesado exitosamente');
            } else {
              console.warn('⚠️ [AGENT-CLIENT-FILES] Buffer residual no contiene evento SSE válido:', buffer.substring(0, 100));
            }
          }
          
          console.log(`✅ [AGENT-CLIENT-FILES] Stream completado - ${eventsProcessed} eventos procesados, ${parseErrors} errores`);
          break;
        }

        // Decodificar chunk y agregarlo al buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Dividir por eventos SSE completos (separados por \n\n o \r\n\r\n)
        // Normalizar CRLF a LF para simplificar
        const normalizedBuffer = buffer.replace(/\r\n/g, '\n');
        let eventEnd: number;
        
        while ((eventEnd = normalizedBuffer.indexOf('\n\n')) !== -1) {
          // Extraer un evento completo del buffer original
          // Calcular posición real en el buffer original
          const realEventEnd = buffer.indexOf('\n\n');
          if (realEventEnd === -1) {
            // Fallback: buscar \r\n\r\n
            const crlfEnd = buffer.indexOf('\r\n\r\n');
            if (crlfEnd !== -1) {
              const event = buffer.substring(0, crlfEnd);
              buffer = buffer.substring(crlfEnd + 4);
              
              // Parsear evento usando helper
              const data = this.parseSSEEvent(event);
              if (data) {
                onUpdate(data as StreamUpdate);
                eventsProcessed++;
              } else {
                parseErrors++;
              }
            } else {
              break; // No hay delimitadores completos
            }
          } else {
            const event = buffer.substring(0, realEventEnd);
            buffer = buffer.substring(realEventEnd + 2);
            
            // Parsear evento usando helper
            const data = this.parseSSEEvent(event);
            if (data) {
              onUpdate(data as StreamUpdate);
              eventsProcessed++;
            } else {
              parseErrors++;
              if (parseErrors === 1) {
                console.warn('⚠️ [AGENT-CLIENT-FILES] Primer error de parsing detectado');
              }
            }
          }
        }
      }

      // 📊 Telemetría final
      if (parseErrors > 0) {
        console.warn(`⚠️ [AGENT-CLIENT-FILES] Streaming completado con ${parseErrors} errores de parsing de ${eventsProcessed + parseErrors} eventos totales (${((parseErrors / (eventsProcessed + parseErrors)) * 100).toFixed(1)}% fallos)`);
      }

    } catch (error: any) {
      console.error('❌ [AGENT-CLIENT-FILES] Error enviando archivos:', error);
      console.error(`   Eventos procesados: ${eventsProcessed}, Parse errors: ${parseErrors}`);
      onUpdate({
        type: 'error',
        content: `Error enviando archivos: ${error.message}`
      });
    }
  }

  /**
   * Health check del servicio
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/mervin-v2/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Obtener estado del sistema
   */
  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/mervin-v2/status`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}

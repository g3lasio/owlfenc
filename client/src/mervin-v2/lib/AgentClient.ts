/**
 * AGENT CLIENT - CLIENTE DE API PARA MERVIN V2
 * 
 * Responsabilidades:
 * - Comunicación con endpoints de Mervin V2
 * - Soporte para JSON y streaming SSE
 * - Manejo de errores y reintentos
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

export class AgentClient {
  private baseURL: string;
  private userId: string;

  constructor(userId: string, baseURL: string = '') {
    this.userId = userId;
    this.baseURL = baseURL;
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

      const response = await fetch(`${this.baseURL}/api/mervin-v2/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
   * Enviar mensaje con streaming SSE
   */
  async sendMessageStream(
    input: string,
    conversationHistory: MervinMessage[] = [],
    language: 'es' | 'en' = 'es',
    onUpdate: StreamCallback
  ): Promise<void> {
    try {
      console.log('📡 [AGENT-CLIENT] Iniciando streaming:', input.substring(0, 50));

      const response = await fetch(`${this.baseURL}/api/mervin-v2/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      // Leer stream SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No se pudo crear reader del stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ [AGENT-CLIENT] Stream completado');
          break;
        }

        // Decodificar chunk
        const chunk = decoder.decode(value);
        
        // Parsear líneas de SSE (formato: "data: {...}\n\n")
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              onUpdate(data as StreamUpdate);
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

    } catch (error: any) {
      console.error('❌ [AGENT-CLIENT] Error en streaming:', error);
      onUpdate({
        type: 'error',
        content: `Error en streaming: ${error.message}`
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

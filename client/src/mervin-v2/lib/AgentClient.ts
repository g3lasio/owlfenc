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
    language: 'es' | 'en' = 'es',
    mode: 'chat' | 'agent' = 'agent',
    pageContext?: { url?: string; section?: string; action?: string }
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
          language,
          mode,
          pageContext
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
   * Enviar mensaje (ahora retorna JSON directo, sin SSE)
   * NOTA: HttpFallbackClient es el método recomendado para HTTP simple
   */
  async sendMessageStream(
    input: string,
    conversationHistory: MervinMessage[] = [],
    language: 'es' | 'en' = 'es',
    onUpdate: StreamCallback,
    mode: 'chat' | 'agent' = 'agent',
    pageContext?: { url?: string; section?: string; action?: string }
  ): Promise<void> {
    try {
      console.log('📡 [AGENT-CLIENT] Enviando mensaje (JSON directo):', input.substring(0, 50));
      
      const requestBody = {
        input,
        userId: this.userId,
        conversationHistory,
        language,
        mode,
        pageContext
      };
      
      const fullUrl = `${this.baseURL}/api/mervin-v2/stream`;
      
      console.log('📤 [AGENT-CLIENT] Request a:', fullUrl);

      const fetchStart = performance.now();
      
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      const fetchEnd = performance.now();
      console.log(`✅ [AGENT-CLIENT] fetch() completado en ${(fetchEnd - fetchStart).toFixed(2)}ms`);

      console.log(`📊 [AGENT-CLIENT] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [AGENT-CLIENT] Server error response:`, errorText);
        
        // Send error to UI via callback
        onUpdate({
          type: 'error',
          content: `Error del servidor: ${errorText}`,
          data: { status: response.status }
        });
        
        throw new Error(errorText);
      }
      
      // Ahora el backend retorna JSON directo (no SSE)
      const data = await response.json();
      console.log('🔍 [AGENT-CLIENT] Response data:', JSON.stringify(data, null, 2));
      console.log(`✅ [AGENT-CLIENT] Response recibido, message length: ${data.message?.length || 0}`);

      // Enviar mensaje completo de una vez
      const updatePayload = {
        type: 'complete' as const,
        content: data.message || 'No response',
        data: data.data
      };
      console.log('📤 [AGENT-CLIENT] Sending update:', JSON.stringify(updatePayload, null, 2));
      onUpdate(updatePayload);

      console.log('✅ [AGENT-CLIENT] Procesamiento completado');

    } catch (error: any) {
      console.error('❌ [AGENT-CLIENT] Error:', error);
      onUpdate({
        type: 'error',
        content: `Error: ${error.message}`
      });
    }
  }

  /**
   * Enviar mensaje con archivos adjuntos (ahora retorna JSON directo)
   */
  async sendMessageWithFiles(
    input: string,
    files: File[],
    conversationHistory: MervinMessage[] = [],
    language: 'es' | 'en' = 'es',
    onUpdate: StreamCallback,
    mode: 'chat' | 'agent' = 'agent',
    pageContext?: { url?: string; section?: string; action?: string }
  ): Promise<void> {
    try {
      console.log(`📨 [AGENT-CLIENT-FILES] Enviando mensaje con ${files.length} archivo(s)`);

      // Crear FormData para multipart/form-data
      const formData = new FormData();
      formData.append('input', input);
      formData.append('userId', this.userId);
      formData.append('language', language);
      formData.append('mode', mode);
      formData.append('conversationHistory', JSON.stringify(conversationHistory));
      if (pageContext) {
        formData.append('pageContext', JSON.stringify(pageContext));
      }

      // Adjuntar archivos
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      // Obtener headers de autenticación (sin Content-Type para FormData)
      const authHeaders = await this.getAuthHeaders();
      
      // Eliminar Content-Type si existe, FormData lo configura automáticamente
      const headers: Record<string, string> = { ...authHeaders };
      delete headers['Content-Type'];

      const response = await fetch(`${this.baseURL}/api/mervin-v2/process-with-files`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Ahora el backend retorna JSON directo (no SSE)
      const data = await response.json();
      console.log(`✅ [AGENT-CLIENT-FILES] Response recibido, message length: ${data.message?.length || 0}`);

      // Enviar mensaje completo de una vez
      onUpdate({
        type: 'complete',
        content: data.message || 'No response',
        data: data.data
      });

      console.log('✅ [AGENT-CLIENT-FILES] Procesamiento con archivos completado');

    } catch (error: any) {
      console.error('❌ [AGENT-CLIENT-FILES] Error enviando archivos:', error);
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

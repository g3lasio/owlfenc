/**
 * CONVERSATION PERSISTENCE CONTROLLER
 * 
 * Maneja la persistencia automática de conversaciones de Mervin V2 a Firebase Firestore
 * a través de /api/conversations endpoints.
 * 
 * Características:
 * - Creación lazy de conversaciones (primer mensaje del usuario)
 * - Append asíncrono de mensajes (no bloqueante)
 * - Generación automática de títulos (después de 2-3 mensajes)
 * - Retry con backoff exponencial
 * - Event emitters para toast notifications
 */

import { auth } from '@/lib/firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string; // ISO string
}

export interface ConversationMetadata {
  id: string;
  title: string;
  lastActivityAt: string;
  messageCount: number;
  isPinned: boolean;
  category: string;
  aiModel: string;
}

export type PersistenceStatus = 'idle' | 'creating' | 'saving' | 'generating_title' | 'error';

export interface PersistenceState {
  status: PersistenceStatus;
  conversationId: string | null;
  error: string | null;
  pendingSaves: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 segundo
  backoffMultiplier: 2,
};

const TITLE_GENERATION_THRESHOLD = 4; // Generar título después de 2 intercambios (4 mensajes: 2 user + 2 assistant)

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class ConversationPersistenceController {
  private conversationId: string | null = null;
  private status: PersistenceStatus = 'idle';
  private error: string | null = null;
  private pendingSaves: number = 0;
  private messageCount: number = 0;
  private titleGenerated: boolean = false;
  private userId: string;
  private onStateChange: ((state: PersistenceState) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  
  // 🔒 Queue para serializar operaciones y evitar race conditions
  private saveQueue: Promise<void> = Promise.resolve();
  private isCreating: boolean = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Guardar nuevo mensaje (user o assistant)
   * 🔒 Serializado con cola para evitar race conditions
   */
  async saveMessage(message: ConversationMessage): Promise<void> {
    if (this.userId === 'guest') {
      console.log('⚠️ [CONVERSATION] Guest user, skipping save');
      return;
    }

    // 🔒 Encolar operación para serialización
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        // Si no hay conversación activa y no hay una creación en progreso, crear una nueva
        if (!this.conversationId && !this.isCreating) {
          this.isCreating = true;
          try {
            await this.createConversation([message]);
          } finally {
            // 🔧 Siempre resetear flag, incluso si falla
            this.isCreating = false;
          }
        } else {
          // Esperar a que termine la creación si está en progreso (con timeout)
          let waitCount = 0;
          const maxWait = 50; // 5 segundos máximo (50 * 100ms)
          while (this.isCreating && waitCount < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
          }
          
          // Timeout o error de creación
          if (this.isCreating) {
            throw new Error('Timeout waiting for conversation creation');
          }
          
          // Ahora sí agregar mensaje a conversación existente
          if (this.conversationId) {
            await this.appendMessage(message);
          } else {
            throw new Error('Conversation not created');
          }
        }

        // Incrementar contador de mensajes
        this.messageCount++;

        // Generar título automático después del threshold
        if (
          !this.titleGenerated &&
          this.messageCount >= TITLE_GENERATION_THRESHOLD &&
          this.conversationId
        ) {
          this.generateTitle();
        }
      } catch (error) {
        console.error('❌ [CONVERSATION] Error saving message:', error);
        this.handleError(`Error guardando mensaje: ${(error as Error).message}`);
        // Re-throw para detener la cadena si es crítico
        throw error;
      }
    }).catch((error) => {
      // Capturar errores de la cadena para evitar unhandled rejections
      console.error('❌ [CONVERSATION] Queue error:', error);
    });

    return this.saveQueue;
  }

  /**
   * Crear nueva conversación con retry/backoff
   */
  private async createConversation(messages: ConversationMessage[]): Promise<void> {
    this.setStatus('creating');
    this.pendingSaves++;
    this.emitStateChange();

    try {
      const result = await this.retryWithBackoff(async () => {
        const token = await this.getAuthToken();
        if (!token) {
          throw new Error('No auth token available');
        }

        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages,
            title: 'Nueva Conversación',
            aiModel: 'mervin-v2',
            category: 'general',
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !data.conversation) {
          throw new Error('Invalid response from server');
        }

        return data.conversation;
      });

      // Extract conversation ID with fallback handling
      this.conversationId = result.id ?? result.conversationId ?? result._id;
      
      // Fail-fast if no ID was returned
      if (!this.conversationId) {
        throw new Error('Server did not return a conversation ID');
      }
      
      console.log(`✅ [CONVERSATION] Created: ${this.conversationId}`);
      this.setStatus('idle');
      this.error = null;
    } catch (error) {
      console.error('❌ [CONVERSATION] Create error after retries:', error);
      this.handleError(`Error creando conversación: ${(error as Error).message}`);
    } finally {
      this.pendingSaves--;
      this.emitStateChange();
    }
  }

  /**
   * Agregar mensaje a conversación existente con retry/backoff
   */
  private async appendMessage(message: ConversationMessage): Promise<void> {
    if (!this.conversationId) return;

    this.setStatus('saving');
    this.pendingSaves++;
    this.emitStateChange();

    try {
      await this.retryWithBackoff(async () => {
        const token = await this.getAuthToken();
        if (!token) {
          throw new Error('No auth token available');
        }

        const response = await fetch(`/api/conversations/${this.conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [message],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error('Failed to append message');
        }

        return data;
      });

      console.log(`✅ [CONVERSATION] Message saved to ${this.conversationId}`);
      this.setStatus('idle');
      this.error = null;
    } catch (error) {
      console.error('❌ [CONVERSATION] Append error after retries:', error);
      this.handleError(`Error guardando mensaje: ${(error as Error).message}`);
    } finally {
      this.pendingSaves--;
      this.emitStateChange();
    }
  }

  /**
   * Generar título automático
   */
  private async generateTitle(): Promise<void> {
    if (!this.conversationId || this.titleGenerated) return;

    this.setStatus('generating_title');
    this.emitStateChange();

    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      // Obtener conversación actual
      const response = await fetch(`/api/conversations/${this.conversationId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.conversation) {
        throw new Error('Failed to get conversation');
      }

      // Generar título con ChatGPT
      const titleResponse = await fetch('/api/conversations/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: data.conversation.messages,
        }),
      });

      if (!titleResponse.ok) {
        throw new Error(`HTTP ${titleResponse.status}: ${titleResponse.statusText}`);
      }

      const titleData = await titleResponse.json();

      if (titleData.success && titleData.title) {
        // Actualizar título
        const updateResponse = await fetch(`/api/conversations/${this.conversationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: titleData.title,
          }),
        });

        if (updateResponse.ok) {
          console.log(`✅ [CONVERSATION] Title generated: "${titleData.title}"`);
          this.titleGenerated = true;
        }
      }

      this.setStatus('idle');
    } catch (error) {
      console.error('❌ [CONVERSATION] Title generation error:', error);
      // No emitir error aquí, la generación de título es opcional
      this.setStatus('idle');
    } finally {
      this.emitStateChange();
    }
  }

  /**
   * Resetear para nueva conversación
   */
  reset(): void {
    this.conversationId = null;
    this.status = 'idle';
    this.error = null;
    this.pendingSaves = 0;
    this.messageCount = 0;
    this.titleGenerated = false;
    this.emitStateChange();
  }

  /**
   * Cargar conversación existente
   */
  loadConversation(conversationId: string): void {
    this.conversationId = conversationId;
    this.titleGenerated = true; // Assume existing conversations have titles
    this.emitStateChange();
  }

  /**
   * Obtener estado actual
   */
  getState(): PersistenceState {
    return {
      status: this.status,
      conversationId: this.conversationId,
      error: this.error,
      pendingSaves: this.pendingSaves,
    };
  }

  /**
   * Registrar callback de cambio de estado
   */
  onStateChangeCallback(callback: (state: PersistenceState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Registrar callback de error
   */
  onErrorCallback(callback: (error: string) => void): void {
    this.onError = callback;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private setStatus(status: PersistenceStatus): void {
    this.status = status;
  }

  private handleError(error: string): void {
    this.error = error;
    this.setStatus('error');
    this.emitStateChange();

    if (this.onError) {
      this.onError(error);
    }
  }

  private emitStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error('❌ [CONVERSATION] Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Retry con backoff exponencial
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= RETRY_CONFIG.maxRetries) {
        throw error; // Max retries alcanzados
      }

      const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
      console.log(`⚠️ [CONVERSATION] Retry attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithBackoff(operation, attempt + 1);
    }
  }
}

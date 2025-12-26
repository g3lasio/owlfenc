/**
 * CONVERSATION STATE MANAGER
 * 
 * Gestiona el estado de las conversaciones de Mervin AI.
 * Mantiene el contexto, parámetros recolectados, y el historial de mensajes.
 * 
 * Responsabilidades:
 * - Crear y recuperar estados de conversación
 * - Actualizar parámetros recolectados
 * - Mantener historial de mensajes
 * - Persistir estado en memoria (con opción futura de Redis/DB)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConversationState, ConversationMessage } from '../ai/ClaudeConversationalEngine';

// ============= IN-MEMORY STORE =============

class ConversationStore {
  private states: Map<string, ConversationState> = new Map();
  private readonly MAX_STATES = 1000;
  private readonly STATE_TTL_MS = 3600000; // 1 hora
  
  set(conversationId: string, state: ConversationState): void {
    this.states.set(conversationId, state);
    
    // Limpiar estados antiguos si excedemos el límite
    if (this.states.size > this.MAX_STATES) {
      this.cleanupOldStates();
    }
  }
  
  get(conversationId: string): ConversationState | null {
    return this.states.get(conversationId) || null;
  }
  
  delete(conversationId: string): void {
    this.states.delete(conversationId);
  }
  
  private cleanupOldStates(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [id, state] of this.states.entries()) {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && now - lastMessage.timestamp.getTime() > this.STATE_TTL_MS) {
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => this.states.delete(id));
    
    if (toDelete.length > 0) {
      console.log(`🧹 [STATE-MANAGER] Cleaned up ${toDelete.length} old conversation states`);
    }
  }
}

const store = new ConversationStore();

// ============= CONVERSATION STATE MANAGER =============

export class ConversationStateManager {
  /**
   * Crear un nuevo estado de conversación
   */
  createConversation(userId: string): ConversationState {
    const conversationId = uuidv4();
    
    const state: ConversationState = {
      conversationId,
      userId,
      messages: [],
      currentIntent: null,
      collectedParameters: {},
      missingParameters: [],
      lastToolResult: null,
      workflowSessionId: null
    };
    
    store.set(conversationId, state);
    
    console.log(`💬 [STATE-MANAGER] Created conversation: ${conversationId} for user: ${userId}`);
    
    return state;
  }
  
  /**
   * Obtener estado de conversación existente
   */
  getConversation(conversationId: string): ConversationState | null {
    const state = store.get(conversationId);
    
    if (!state) {
      console.warn(`⚠️ [STATE-MANAGER] Conversation not found: ${conversationId}`);
    }
    
    return state;
  }
  
  /**
   * Obtener o crear conversación
   */
  getOrCreateConversation(conversationId: string | undefined, userId: string): ConversationState {
    if (conversationId) {
      const existing = this.getConversation(conversationId);
      if (existing) {
        return existing;
      }
    }
    
    return this.createConversation(userId);
  }
  
  /**
   * Agregar mensaje al historial
   */
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string | Array<any>
  ): void {
    const state = store.get(conversationId);
    if (!state) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date()
    };
    
    state.messages.push(message);
    store.set(conversationId, state);
    
    console.log(`💬 [STATE-MANAGER] Added ${role} message to ${conversationId}`);
  }
  
  /**
   * Actualizar intención actual
   */
  setIntent(conversationId: string, intent: string): void {
    const state = store.get(conversationId);
    if (!state) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    state.currentIntent = intent;
    store.set(conversationId, state);
    
    console.log(`🎯 [STATE-MANAGER] Set intent for ${conversationId}: ${intent}`);
  }
  
  /**
   * Actualizar parámetros recolectados
   */
  updateParameters(conversationId: string, params: Record<string, any>): void {
    const state = store.get(conversationId);
    if (!state) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    state.collectedParameters = {
      ...state.collectedParameters,
      ...params
    };
    
    store.set(conversationId, state);
    
    console.log(`📊 [STATE-MANAGER] Updated parameters for ${conversationId}:`, Object.keys(params));
  }
  
  /**
   * Establecer parámetros faltantes
   */
  setMissingParameters(conversationId: string, missing: string[]): void {
    const state = store.get(conversationId);
    if (!state) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    state.missingParameters = missing;
    store.set(conversationId, state);
    
    console.log(`❓ [STATE-MANAGER] Set missing parameters for ${conversationId}:`, missing);
  }
  
  /**
   * Guardar resultado de herramienta
   */
  setLastToolResult(conversationId: string, result: any): void {
    const state = store.get(conversationId);
    if (!state) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    state.lastToolResult = result;
    store.set(conversationId, state);
    
    console.log(`🔧 [STATE-MANAGER] Saved tool result for ${conversationId}`);
  }
  
  /**
   * Asociar con sesión de workflow
   */
  setWorkflowSession(conversationId: string, workflowSessionId: string): void {
    const state = store.get(conversationId);
    if (!state) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    state.workflowSessionId = workflowSessionId;
    store.set(conversationId, state);
    
    console.log(`🔗 [STATE-MANAGER] Linked conversation ${conversationId} to workflow ${workflowSessionId}`);
  }
  
  /**
   * Limpiar conversación
   */
  clearConversation(conversationId: string): void {
    store.delete(conversationId);
    console.log(`🗑️ [STATE-MANAGER] Cleared conversation: ${conversationId}`);
  }
  
  /**
   * Obtener resumen del estado actual
   */
  getSummary(conversationId: string): any {
    const state = store.get(conversationId);
    if (!state) {
      return null;
    }
    
    return {
      conversationId: state.conversationId,
      userId: state.userId,
      messageCount: state.messages.length,
      currentIntent: state.currentIntent,
      collectedParameters: Object.keys(state.collectedParameters),
      missingParameters: state.missingParameters,
      hasToolResult: !!state.lastToolResult,
      workflowSessionId: state.workflowSessionId
    };
  }
  
  /**
   * Obtener historial de mensajes formateado
   */
  getMessageHistory(conversationId: string, limit?: number): ConversationMessage[] {
    const state = store.get(conversationId);
    if (!state) {
      return [];
    }
    
    const messages = state.messages;
    
    if (limit && messages.length > limit) {
      return messages.slice(-limit);
    }
    
    return messages;
  }
}

// ============= SINGLETON EXPORT =============

export const conversationStateManager = new ConversationStateManager();

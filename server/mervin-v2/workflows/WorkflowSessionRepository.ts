/**
 * WorkflowSessionRepository
 * 
 * Gestiona el estado de las sesiones de workflow:
 * - Redis: Estado en memoria para velocidad
 * - PostgreSQL: Audit log para histórico
 * 
 * Proporciona persistencia, recuperación y consulta de workflows en ejecución.
 */

import { WorkflowSession, WorkflowStatus, WorkflowProgressEvent } from './types';
import { Redis } from '@upstash/redis';

export class WorkflowSessionRepository {
  private redis: Redis | null = null;
  private inMemoryStore: Map<string, WorkflowSession> = new Map();
  
  constructor() {
    // Inicializar Redis si está disponible
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (redisUrl && redisToken) {
      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      console.log('✅ [WORKFLOW-REPO] Redis initialized for workflow state');
    } else {
      console.log('⚠️ [WORKFLOW-REPO] Redis not available, using in-memory store');
    }
  }
  
  /**
   * Crear nueva sesión de workflow
   */
  async createSession(session: WorkflowSession): Promise<void> {
    const key = this.getRedisKey(session.sessionId);
    
    try {
      if (this.redis) {
        // Guardar en Redis con TTL de 24 horas
        await this.redis.setex(key, 86400, JSON.stringify(session));
      } else {
        // Fallback a memoria
        this.inMemoryStore.set(session.sessionId, session);
      }
      
      console.log(`📝 [WORKFLOW-REPO] Session created: ${session.sessionId}`);
      
      // TODO: Guardar en PostgreSQL para audit log
      // await this.saveToPostgres(session);
      
    } catch (error) {
      console.error(`❌ [WORKFLOW-REPO] Error creating session:`, error);
      throw error;
    }
  }
  
  /**
   * Obtener sesión por ID
   */
  async getSession(sessionId: string): Promise<WorkflowSession | null> {
    const key = this.getRedisKey(sessionId);
    
    try {
      if (this.redis) {
        const data = await this.redis.get(key);
        if (!data) return null;
        
        const session = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Convertir fechas de strings a Date objects
        return this.deserializeSession(session);
      } else {
        // Fallback a memoria
        return this.inMemoryStore.get(sessionId) || null;
      }
    } catch (error) {
      console.error(`❌ [WORKFLOW-REPO] Error getting session:`, error);
      return null;
    }
  }
  
  /**
   * Actualizar sesión existente
   */
  async updateSession(session: WorkflowSession): Promise<void> {
    const key = this.getRedisKey(session.sessionId);
    session.updatedAt = new Date();
    
    try {
      if (this.redis) {
        await this.redis.setex(key, 86400, JSON.stringify(session));
      } else {
        this.inMemoryStore.set(session.sessionId, session);
      }
      
      console.log(`🔄 [WORKFLOW-REPO] Session updated: ${session.sessionId}`);
      
      // TODO: Actualizar en PostgreSQL
      
    } catch (error) {
      console.error(`❌ [WORKFLOW-REPO] Error updating session:`, error);
      throw error;
    }
  }
  
  /**
   * Actualizar estado de la sesión
   */
  async updateSessionStatus(sessionId: string, status: WorkflowStatus): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    session.status = status;
    
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      session.completedAt = new Date();
    }
    
    await this.updateSession(session);
  }
  
  /**
   * Agregar paso completado al historial
   */
  async addCompletedStep(
    sessionId: string, 
    stepId: string, 
    result?: any, 
    error?: string
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    session.completedSteps.push({
      stepId,
      completedAt: new Date(),
      result,
      error
    });
    
    await this.updateSession(session);
  }
  
  /**
   * Actualizar contexto de la sesión
   */
  async updateContext(sessionId: string, context: Record<string, any>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    session.context = {
      ...session.context,
      ...context
    };
    
    await this.updateSession(session);
  }
  
  /**
   * Establecer pregunta pendiente para el usuario
   */
  async setPendingQuestion(
    sessionId: string,
    stepId: string,
    question: string,
    fields: string[]
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    session.status = 'waiting_input';
    session.pendingQuestion = {
      stepId,
      question,
      fields,
      askedAt: new Date()
    };
    
    await this.updateSession(session);
  }
  
  /**
   * Limpiar pregunta pendiente (ya fue respondida)
   */
  async clearPendingQuestion(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    session.pendingQuestion = undefined;
    session.status = 'running';
    
    await this.updateSession(session);
  }
  
  /**
   * Obtener todas las sesiones activas de un usuario
   */
  async getUserActiveSessions(userId: string): Promise<WorkflowSession[]> {
    // TODO: Implementar con PostgreSQL para búsquedas eficientes
    // Por ahora, buscar en Redis/memoria
    
    if (this.redis) {
      // Redis scan para encontrar todas las keys del usuario
      // Esto es costoso, mejor usar PostgreSQL en producción
      return [];
    } else {
      const sessions: WorkflowSession[] = [];
      for (const session of this.inMemoryStore.values()) {
        if (session.userId === userId && 
            (session.status === 'running' || session.status === 'waiting_input')) {
          sessions.push(session);
        }
      }
      return sessions;
    }
  }
  
  /**
   * Eliminar sesión (después de completar o cancelar)
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = this.getRedisKey(sessionId);
    
    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.inMemoryStore.delete(sessionId);
      }
      
      console.log(`🗑️ [WORKFLOW-REPO] Session deleted: ${sessionId}`);
      
    } catch (error) {
      console.error(`❌ [WORKFLOW-REPO] Error deleting session:`, error);
    }
  }
  
  /**
   * Helper: Generar key de Redis
   */
  private getRedisKey(sessionId: string): string {
    return `workflow:session:${sessionId}`;
  }
  
  /**
   * Helper: Deserializar sesión (convertir strings a Dates)
   */
  private deserializeSession(data: any): WorkflowSession {
    return {
      ...data,
      startedAt: new Date(data.startedAt),
      updatedAt: new Date(data.updatedAt),
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      completedSteps: data.completedSteps?.map((step: any) => ({
        ...step,
        completedAt: new Date(step.completedAt)
      })) || [],
      pendingQuestion: data.pendingQuestion ? {
        ...data.pendingQuestion,
        askedAt: new Date(data.pendingQuestion.askedAt)
      } : undefined
    };
  }
}

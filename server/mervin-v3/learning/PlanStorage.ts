/**
 * PLAN STORAGE - ALMACENAMIENTO DE PLANES EXITOSOS
 * 
 * Sistema de aprendizaje que guarda planes exitosos para mejorar
 * futuras ejecuciones de tareas similares.
 */

import { db } from '../../lib/firebase-admin';
import type { TaskPlan } from '../types/agent-types';

export interface StoredPlan {
  id: string;
  userId: string;
  taskType: string;
  userInput: string;
  plan: TaskPlan;
  executionSuccess: boolean;
  executionTimeMs: number;
  feedback?: 'positive' | 'negative' | 'neutral';
  createdAt: Date;
  usageCount: number;
}

export interface PlanQuery {
  userId: string;
  taskType?: string;
  limit?: number;
  onlySuccessful?: boolean;
}

export class PlanStorageService {
  private collection = 'mervin_plan_storage';

  /**
   * Guardar un plan ejecutado
   */
  async storePlan(data: {
    userId: string;
    taskType: string;
    userInput: string;
    plan: TaskPlan;
    executionSuccess: boolean;
    executionTimeMs: number;
  }): Promise<string> {
    try {
      console.log('💾 [PLAN-STORAGE] Guardando plan exitoso:', data.taskType);

      const planDoc = {
        userId: data.userId,
        taskType: data.taskType,
        userInput: data.userInput,
        plan: data.plan,
        executionSuccess: data.executionSuccess,
        executionTimeMs: data.executionTimeMs,
        feedback: 'neutral' as const,
        createdAt: new Date(),
        usageCount: 0
      };

      const docRef = await db.collection(this.collection).add(planDoc);

      console.log('✅ [PLAN-STORAGE] Plan guardado con ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ [PLAN-STORAGE] Error guardando plan:', error.message);
      throw error;
    }
  }

  /**
   * Buscar planes similares para aprender de ejecuciones previas
   */
  async findSimilarPlans(query: PlanQuery): Promise<StoredPlan[]> {
    try {
      console.log('🔍 [PLAN-STORAGE] Buscando planes similares para:', query.taskType);

      let firestoreQuery = db
        .collection(this.collection)
        .where('userId', '==', query.userId);

      if (query.taskType) {
        firestoreQuery = firestoreQuery.where('taskType', '==', query.taskType);
      }

      if (query.onlySuccessful) {
        firestoreQuery = firestoreQuery.where('executionSuccess', '==', true);
      }

      // Ordenar por uso y fecha
      firestoreQuery = firestoreQuery
        .orderBy('usageCount', 'desc')
        .orderBy('createdAt', 'desc')
        .limit(query.limit || 10);

      const snapshot = await firestoreQuery.get();

      const plans: StoredPlan[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        plans.push({
          id: doc.id,
          userId: data.userId,
          taskType: data.taskType,
          userInput: data.userInput,
          plan: data.plan,
          executionSuccess: data.executionSuccess,
          executionTimeMs: data.executionTimeMs,
          feedback: data.feedback,
          createdAt: data.createdAt.toDate(),
          usageCount: data.usageCount || 0
        });
      });

      console.log(`✅ [PLAN-STORAGE] Encontrados ${plans.length} planes similares`);
      return plans;
    } catch (error: any) {
      console.error('❌ [PLAN-STORAGE] Error buscando planes:', error.message);
      return [];
    }
  }

  /**
   * Actualizar feedback de un plan
   */
  async updateFeedback(planId: string, feedback: 'positive' | 'negative' | 'neutral'): Promise<void> {
    try {
      console.log(`👍 [PLAN-STORAGE] Actualizando feedback de plan ${planId}:`, feedback);

      await db.collection(this.collection).doc(planId).update({
        feedback,
        updatedAt: new Date()
      });

      console.log('✅ [PLAN-STORAGE] Feedback actualizado');
    } catch (error: any) {
      console.error('❌ [PLAN-STORAGE] Error actualizando feedback:', error.message);
      throw error;
    }
  }

  /**
   * Incrementar contador de uso de un plan
   */
  async incrementUsage(planId: string): Promise<void> {
    try {
      const docRef = db.collection(this.collection).doc(planId);
      const doc = await docRef.get();

      if (doc.exists) {
        const currentCount = doc.data()?.usageCount || 0;
        await docRef.update({
          usageCount: currentCount + 1,
          lastUsedAt: new Date()
        });

        console.log(`📈 [PLAN-STORAGE] Uso incrementado para plan ${planId}: ${currentCount + 1}`);
      }
    } catch (error: any) {
      console.error('❌ [PLAN-STORAGE] Error incrementando uso:', error.message);
    }
  }

  /**
   * Obtener estadísticas de aprendizaje del usuario
   */
  async getUserStats(userId: string): Promise<{
    totalPlans: number;
    successfulPlans: number;
    averageExecutionTime: number;
    mostUsedTaskTypes: Array<{ taskType: string; count: number }>;
  }> {
    try {
      console.log('📊 [PLAN-STORAGE] Obteniendo estadísticas para usuario:', userId);

      const snapshot = await db
        .collection(this.collection)
        .where('userId', '==', userId)
        .get();

      const plans: StoredPlan[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        plans.push({
          id: doc.id,
          userId: data.userId,
          taskType: data.taskType,
          userInput: data.userInput,
          plan: data.plan,
          executionSuccess: data.executionSuccess,
          executionTimeMs: data.executionTimeMs,
          feedback: data.feedback,
          createdAt: data.createdAt.toDate(),
          usageCount: data.usageCount || 0
        });
      });

      const totalPlans = plans.length;
      const successfulPlans = plans.filter(p => p.executionSuccess).length;
      const averageExecutionTime = plans.length > 0
        ? plans.reduce((sum, p) => sum + p.executionTimeMs, 0) / plans.length
        : 0;

      // Contar task types más usados
      const taskTypeCounts: Record<string, number> = {};
      plans.forEach(p => {
        taskTypeCounts[p.taskType] = (taskTypeCounts[p.taskType] || 0) + 1;
      });

      const mostUsedTaskTypes = Object.entries(taskTypeCounts)
        .map(([taskType, count]) => ({ taskType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      console.log('✅ [PLAN-STORAGE] Estadísticas calculadas');

      return {
        totalPlans,
        successfulPlans,
        averageExecutionTime,
        mostUsedTaskTypes
      };
    } catch (error: any) {
      console.error('❌ [PLAN-STORAGE] Error obteniendo estadísticas:', error.message);
      return {
        totalPlans: 0,
        successfulPlans: 0,
        averageExecutionTime: 0,
        mostUsedTaskTypes: []
      };
    }
  }

  /**
   * Limpiar planes antiguos (más de 90 días)
   */
  async cleanOldPlans(userId: string, daysToKeep: number = 90): Promise<number> {
    try {
      console.log(`🧹 [PLAN-STORAGE] Limpiando planes antiguos (>${daysToKeep} días)`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const snapshot = await db
        .collection(this.collection)
        .where('userId', '==', userId)
        .where('createdAt', '<', cutoffDate)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`✅ [PLAN-STORAGE] ${snapshot.size} planes antiguos eliminados`);
      return snapshot.size;
    } catch (error: any) {
      console.error('❌ [PLAN-STORAGE] Error limpiando planes:', error.message);
      return 0;
    }
  }
}

// Singleton instance
export const planStorage = new PlanStorageService();

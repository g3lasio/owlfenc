/**
 * USER PERSONALIZATION - PERSONALIZACIÓN POR USUARIO
 * 
 * Sistema que aprende las preferencias del usuario y adapta
 * las respuestas de Mervin según su estilo y necesidades.
 */

import { db } from '../../lib/firebase-admin';

export interface UserPreferences {
  userId: string;
  
  // Estilo de comunicación
  communicationStyle: 'concise' | 'detailed' | 'balanced';
  
  // Preferencias de workflow
  preferredTemplates: Array<{ templateId: string; usageCount: number }>;
  frequentClients: Array<{ clientId: string; clientName: string; projectCount: number }>;
  commonProjectTypes: Array<{ projectType: string; count: number }>;
  
  // Comportamiento aprendido
  alwaysAskForConfirmation: boolean;
  preferEmailNotifications: boolean;
  defaultEstimateSettings: {
    includeTax: boolean;
    taxRate?: number;
    defaultMarkup?: number;
  };
  
  // Feedback histórico
  positiveActions: string[]; // Acciones que el usuario valoró positivamente
  negativeActions: string[]; // Acciones que el usuario rechazó
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  totalInteractions: number;
}

export interface FeedbackEvent {
  userId: string;
  executionId: string;
  action: string;
  feedback: 'positive' | 'negative' | 'neutral';
  comment?: string;
  timestamp: Date;
}

export class UserPersonalizationService {
  private preferencesCollection = 'mervin_user_preferences';
  private feedbackCollection = 'mervin_feedback';

  /**
   * Obtener preferencias del usuario (o crear defaults)
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      console.log('🔍 [PERSONALIZATION] Obteniendo preferencias para:', userId);

      const doc = await db.collection(this.preferencesCollection).doc(userId).get();

      if (doc.exists) {
        const data = doc.data()!;
        return {
          userId,
          communicationStyle: data.communicationStyle || 'balanced',
          preferredTemplates: data.preferredTemplates || [],
          frequentClients: data.frequentClients || [],
          commonProjectTypes: data.commonProjectTypes || [],
          alwaysAskForConfirmation: data.alwaysAskForConfirmation ?? true,
          preferEmailNotifications: data.preferEmailNotifications ?? false,
          defaultEstimateSettings: data.defaultEstimateSettings || {
            includeTax: true,
            taxRate: 0.0825,
            defaultMarkup: 1.3
          },
          positiveActions: data.positiveActions || [],
          negativeActions: data.negativeActions || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          totalInteractions: data.totalInteractions || 0
        };
      }

      // Crear preferencias por defecto
      const defaultPreferences: UserPreferences = {
        userId,
        communicationStyle: 'balanced',
        preferredTemplates: [],
        frequentClients: [],
        commonProjectTypes: [],
        alwaysAskForConfirmation: true,
        preferEmailNotifications: false,
        defaultEstimateSettings: {
          includeTax: true,
          taxRate: 0.0825,
          defaultMarkup: 1.3
        },
        positiveActions: [],
        negativeActions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        totalInteractions: 0
      };

      await db.collection(this.preferencesCollection).doc(userId).set(defaultPreferences);

      console.log('✅ [PERSONALIZATION] Preferencias por defecto creadas');
      return defaultPreferences;
    } catch (error: any) {
      console.error('❌ [PERSONALIZATION] Error obteniendo preferencias:', error.message);
      throw error;
    }
  }

  /**
   * Registrar feedback del usuario
   */
  async recordFeedback(event: FeedbackEvent): Promise<void> {
    try {
      console.log(`👍 [PERSONALIZATION] Registrando feedback ${event.feedback} para:`, event.action);

      // Guardar evento de feedback
      await db.collection(this.feedbackCollection).add(event);

      // Actualizar preferencias basadas en feedback
      const preferences = await this.getUserPreferences(event.userId);

      if (event.feedback === 'positive') {
        if (!preferences.positiveActions.includes(event.action)) {
          preferences.positiveActions.push(event.action);
        }
        // Remover de negativas si estaba
        preferences.negativeActions = preferences.negativeActions.filter(a => a !== event.action);
      } else if (event.feedback === 'negative') {
        if (!preferences.negativeActions.includes(event.action)) {
          preferences.negativeActions.push(event.action);
        }
        // Remover de positivas si estaba
        preferences.positiveActions = preferences.positiveActions.filter(a => a !== event.action);
      }

      preferences.updatedAt = new Date();
      preferences.totalInteractions++;

      await db.collection(this.preferencesCollection).doc(event.userId).update({
        positiveActions: preferences.positiveActions,
        negativeActions: preferences.negativeActions,
        updatedAt: preferences.updatedAt,
        totalInteractions: preferences.totalInteractions
      });

      console.log('✅ [PERSONALIZATION] Feedback registrado y preferencias actualizadas');
    } catch (error: any) {
      console.error('❌ [PERSONALIZATION] Error registrando feedback:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar template usado
   */
  async recordTemplateUsage(userId: string, templateId: string): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId);

      const existingTemplate = preferences.preferredTemplates.find(t => t.templateId === templateId);

      if (existingTemplate) {
        existingTemplate.usageCount++;
      } else {
        preferences.preferredTemplates.push({ templateId, usageCount: 1 });
      }

      // Ordenar por uso y mantener top 10
      preferences.preferredTemplates.sort((a, b) => b.usageCount - a.usageCount);
      preferences.preferredTemplates = preferences.preferredTemplates.slice(0, 10);

      await db.collection(this.preferencesCollection).doc(userId).update({
        preferredTemplates: preferences.preferredTemplates,
        updatedAt: new Date()
      });

      console.log(`📊 [PERSONALIZATION] Template ${templateId} registrado`);
    } catch (error: any) {
      console.error('❌ [PERSONALIZATION] Error registrando template:', error.message);
    }
  }

  /**
   * Actualizar cliente frecuente
   */
  async recordClientInteraction(userId: string, clientId: string, clientName: string): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId);

      const existingClient = preferences.frequentClients.find(c => c.clientId === clientId);

      if (existingClient) {
        existingClient.projectCount++;
      } else {
        preferences.frequentClients.push({ clientId, clientName, projectCount: 1 });
      }

      // Ordenar por proyectos y mantener top 20
      preferences.frequentClients.sort((a, b) => b.projectCount - a.projectCount);
      preferences.frequentClients = preferences.frequentClients.slice(0, 20);

      await db.collection(this.preferencesCollection).doc(userId).update({
        frequentClients: preferences.frequentClients,
        updatedAt: new Date()
      });

      console.log(`📊 [PERSONALIZATION] Cliente ${clientName} registrado`);
    } catch (error: any) {
      console.error('❌ [PERSONALIZATION] Error registrando cliente:', error.message);
    }
  }

  /**
   * Actualizar tipo de proyecto común
   */
  async recordProjectType(userId: string, projectType: string): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId);

      const existingType = preferences.commonProjectTypes.find(p => p.projectType === projectType);

      if (existingType) {
        existingType.count++;
      } else {
        preferences.commonProjectTypes.push({ projectType, count: 1 });
      }

      // Ordenar por count y mantener top 10
      preferences.commonProjectTypes.sort((a, b) => b.count - a.count);
      preferences.commonProjectTypes = preferences.commonProjectTypes.slice(0, 10);

      await db.collection(this.preferencesCollection).doc(userId).update({
        commonProjectTypes: preferences.commonProjectTypes,
        updatedAt: new Date()
      });

      console.log(`📊 [PERSONALIZATION] Tipo de proyecto ${projectType} registrado`);
    } catch (error: any) {
      console.error('❌ [PERSONALIZATION] Error registrando tipo de proyecto:', error.message);
    }
  }

  /**
   * Actualizar estilo de comunicación basado en interacciones
   */
  async updateCommunicationStyle(userId: string, style: 'concise' | 'detailed' | 'balanced'): Promise<void> {
    try {
      await db.collection(this.preferencesCollection).doc(userId).update({
        communicationStyle: style,
        updatedAt: new Date()
      });

      console.log(`💬 [PERSONALIZATION] Estilo de comunicación actualizado a:`, style);
    } catch (error: any) {
      console.error('❌ [PERSONALIZATION] Error actualizando estilo:', error.message);
    }
  }

  /**
   * Obtener recomendaciones personalizadas
   */
  async getPersonalizedRecommendations(userId: string): Promise<{
    suggestedTemplates: string[];
    frequentClients: string[];
    commonProjectTypes: string[];
    communicationTips: string[];
  }> {
    try {
      const preferences = await this.getUserPreferences(userId);

      return {
        suggestedTemplates: preferences.preferredTemplates
          .slice(0, 3)
          .map(t => t.templateId),
        frequentClients: preferences.frequentClients
          .slice(0, 5)
          .map(c => c.clientName),
        commonProjectTypes: preferences.commonProjectTypes
          .slice(0, 3)
          .map(p => p.projectType),
        communicationTips: this.generateCommunicationTips(preferences)
      };
    } catch (error: any) {
      console.error('❌ [PERSONALIZATION] Error obteniendo recomendaciones:', error.message);
      return {
        suggestedTemplates: [],
        frequentClients: [],
        commonProjectTypes: [],
        communicationTips: []
      };
    }
  }

  /**
   * Generar tips de comunicación basados en preferencias
   */
  private generateCommunicationTips(preferences: UserPreferences): string[] {
    const tips: string[] = [];

    if (preferences.communicationStyle === 'concise') {
      tips.push('Prefiere respuestas breves y directas');
    } else if (preferences.communicationStyle === 'detailed') {
      tips.push('Aprecia explicaciones detalladas');
    }

    if (preferences.alwaysAskForConfirmation) {
      tips.push('Siempre pide confirmación antes de acciones importantes');
    }

    if (preferences.preferEmailNotifications) {
      tips.push('Prefiere recibir notificaciones por email');
    }

    if (preferences.positiveActions.length > 5) {
      tips.push('Usuario experimentado, puede manejar workflows complejos');
    }

    return tips;
  }

  /**
   * Obtener feedback histórico
   */
  async getFeedbackHistory(userId: string, limit: number = 50): Promise<FeedbackEvent[]> {
    try {
      const snapshot = await db
        .collection(this.feedbackCollection)
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const feedback: FeedbackEvent[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        feedback.push({
          userId: data.userId,
          executionId: data.executionId,
          action: data.action,
          feedback: data.feedback,
          comment: data.comment,
          timestamp: data.timestamp.toDate()
        });
      });

      return feedback;
    } catch (error: any) {
      console.error('❌ [PERSONALIZATION] Error obteniendo historial:', error.message);
      return [];
    }
  }
}

// Singleton instance
export const userPersonalization = new UserPersonalizationService();

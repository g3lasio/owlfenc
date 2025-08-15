/**
 * CONTEXT MANAGER - GESTIÓN DE CONTEXTO Y ESTADO
 * 
 * Maneja el contexto completo de la conversación, estado del usuario,
 * y toda la información necesaria para que el agente tome decisiones informadas.
 * 
 * Responsabilidades:
 * - Gestión de contexto de conversación
 * - Estado persistente del usuario
 * - Información de sesión y permisos
 * - Historial de interacciones
 */

import { UserIntention } from './IntentionEngine';

export interface UserContext {
  userId: string;
  profile?: any;
  permissions: Record<string, boolean>;
  subscriptionLevel: string;
  currentProjects: any[];
  recentEstimates: any[];
  recentContracts: any[];
  conversationHistory: any[];
  preferences: Record<string, any>;
  lastActivity: Date;
}

export interface ConversationContext {
  messages: any[];
  currentTopic: string | null;
  activeEntities: Record<string, any>;
  pendingTasks: any[];
  sessionStartTime: Date;
}

export class ContextManager {
  private userId: string;
  private userContext: UserContext | null = null;
  private conversationContext: ConversationContext;
  private contextUpdateCallbacks: ((context: UserContext) => void)[] = [];

  constructor(userId: string) {
    this.userId = userId;
    this.conversationContext = {
      messages: [],
      currentTopic: null,
      activeEntities: {},
      pendingTasks: [],
      sessionStartTime: new Date()
    };
  }

  /**
   * Inicializar contexto del usuario
   */
  async initializeUserContext(): Promise<UserContext> {
    try {
      // Cargar contexto desde localStorage si existe
      const storedContext = this.loadStoredContext();
      if (storedContext && this.isContextValid(storedContext)) {
        this.userContext = storedContext;
        return storedContext;
      }

      // Crear nuevo contexto
      this.userContext = await this.createFreshContext();
      this.saveContext();
      return this.userContext;

    } catch (error) {
      console.error('❌ [CONTEXT-MANAGER] Error inicializando contexto:', error);
      
      // Contexto mínimo de emergencia
      this.userContext = {
        userId: this.userId,
        permissions: {},
        subscriptionLevel: 'free',
        currentProjects: [],
        recentEstimates: [],
        recentContracts: [],
        conversationHistory: [],
        preferences: {},
        lastActivity: new Date()
      };
      
      return this.userContext;
    }
  }

  /**
   * Actualizar contexto con nueva información
   */
  async updateContext(userInput: string, intention: UserIntention): Promise<void> {
    if (!this.userContext) {
      await this.initializeUserContext();
    }

    // Actualizar historial de conversación
    this.conversationContext.messages.push({
      timestamp: new Date(),
      userInput,
      intention,
      type: 'user'
    });

    // Mantener solo los últimos 50 mensajes
    if (this.conversationContext.messages.length > 50) {
      this.conversationContext.messages = this.conversationContext.messages.slice(-50);
    }

    // Actualizar topic actual
    this.conversationContext.currentTopic = intention.primary;

    // Extraer entidades mencionadas
    this.extractAndUpdateEntities(userInput, intention);

    // Actualizar última actividad
    if (this.userContext) {
      this.userContext.lastActivity = new Date();
      this.saveContext();
    }

    // Notificar callbacks
    this.notifyContextUpdate();
  }

  /**
   * Obtener contexto actual completo
   */
  async getCurrentContext(): Promise<any> {
    if (!this.userContext) {
      await this.initializeUserContext();
    }

    return {
      user: this.userContext,
      conversation: this.conversationContext,
      session: {
        duration: Date.now() - this.conversationContext.sessionStartTime.getTime(),
        messageCount: this.conversationContext.messages.length,
        topics: this.getConversationTopics()
      }
    };
  }

  /**
   * Obtener permisos del usuario
   */
  async getUserPermissions(): Promise<Record<string, boolean>> {
    if (!this.userContext) {
      await this.initializeUserContext();
    }

    return this.userContext?.permissions || {};
  }

  /**
   * Actualizar permisos del usuario
   */
  async updateUserPermissions(permissions: Record<string, boolean>): Promise<void> {
    if (!this.userContext) {
      await this.initializeUserContext();
    }

    if (this.userContext) {
      this.userContext.permissions = { ...this.userContext.permissions, ...permissions };
      this.saveContext();
      this.notifyContextUpdate();
    }
  }

  /**
   * Obtener proyectos recientes del usuario
   */
  async getRecentProjects(): Promise<any[]> {
    if (!this.userContext) {
      await this.initializeUserContext();
    }

    return this.userContext?.currentProjects || [];
  }

  /**
   * Agregar nuevo proyecto al contexto
   */
  async addProject(project: any): Promise<void> {
    if (!this.userContext) {
      await this.initializeUserContext();
    }

    if (this.userContext) {
      this.userContext.currentProjects.unshift(project);
      
      // Mantener solo los últimos 20 proyectos
      if (this.userContext.currentProjects.length > 20) {
        this.userContext.currentProjects = this.userContext.currentProjects.slice(0, 20);
      }

      this.saveContext();
      this.notifyContextUpdate();
    }
  }

  /**
   * Obtener entidades activas (clientes, proyectos mencionados recientemente)
   */
  getActiveEntities(): Record<string, any> {
    return this.conversationContext.activeEntities;
  }

  /**
   * Obtener historial de conversación relevante
   */
  getConversationHistory(limit: number = 10): any[] {
    return this.conversationContext.messages.slice(-limit);
  }

  /**
   * Limpiar contexto de conversación
   */
  clearConversationContext(): void {
    this.conversationContext = {
      messages: [],
      currentTopic: null,
      activeEntities: {},
      pendingTasks: [],
      sessionStartTime: new Date()
    };
  }

  /**
   * Registrar callback para actualizaciones de contexto
   */
  onContextUpdate(callback: (context: UserContext) => void): void {
    this.contextUpdateCallbacks.push(callback);
  }

  /**
   * Crear contexto fresco para nuevo usuario
   */
  private async createFreshContext(): Promise<UserContext> {
    try {
      // Intentar cargar datos del perfil del usuario
      const profileData = await this.loadUserProfile();
      
      return {
        userId: this.userId,
        profile: profileData,
        permissions: await this.loadUserPermissions(),
        subscriptionLevel: profileData?.subscriptionLevel || 'free',
        currentProjects: [],
        recentEstimates: [],
        recentContracts: [],
        conversationHistory: [],
        preferences: {},
        lastActivity: new Date()
      };
    } catch (error) {
      console.error('❌ [CONTEXT-MANAGER] Error creando contexto fresco:', error);
      throw error;
    }
  }

  /**
   * Cargar perfil del usuario
   */
  private async loadUserProfile(): Promise<any> {
    try {
      // Intentar cargar desde localStorage primero
      const stored = localStorage.getItem(`userProfile_${this.userId}`);
      if (stored) {
        return JSON.parse(stored);
      }

      // Si no hay datos locales, devolver estructura básica
      return {
        userId: this.userId,
        subscriptionLevel: 'free'
      };
    } catch (error) {
      console.error('❌ [CONTEXT-MANAGER] Error cargando perfil:', error);
      return null;
    }
  }

  /**
   * Cargar permisos del usuario
   */
  private async loadUserPermissions(): Promise<Record<string, boolean>> {
    try {
      // Permisos básicos por defecto
      const defaultPermissions = {
        basic_estimates: true,
        ai_estimates: false,
        contracts: false,
        dual_signature: false,
        permit_advisor: false,
        property_verification: false,
        payment_tracking: false,
        analytics: false
      };

      // Intentar cargar permisos específicos del usuario
      const stored = localStorage.getItem(`userPermissions_${this.userId}`);
      if (stored) {
        const storedPermissions = JSON.parse(stored);
        return { ...defaultPermissions, ...storedPermissions };
      }

      return defaultPermissions;
    } catch (error) {
      console.error('❌ [CONTEXT-MANAGER] Error cargando permisos:', error);
      return {};
    }
  }

  /**
   * Cargar contexto almacenado
   */
  private loadStoredContext(): UserContext | null {
    try {
      const stored = localStorage.getItem(`userContext_${this.userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convertir fechas de strings a Date objects
        if (parsed.lastActivity) {
          parsed.lastActivity = new Date(parsed.lastActivity);
        }
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('❌ [CONTEXT-MANAGER] Error cargando contexto:', error);
      return null;
    }
  }

  /**
   * Verificar si el contexto es válido
   */
  private isContextValid(context: UserContext): boolean {
    // Verificar que no sea muy antiguo (más de 7 días)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días en ms
    const age = Date.now() - context.lastActivity.getTime();
    
    return age < maxAge && context.userId === this.userId;
  }

  /**
   * Guardar contexto
   */
  private saveContext(): void {
    if (this.userContext) {
      try {
        localStorage.setItem(
          `userContext_${this.userId}`,
          JSON.stringify(this.userContext)
        );
      } catch (error) {
        console.error('❌ [CONTEXT-MANAGER] Error guardando contexto:', error);
      }
    }
  }

  /**
   * Extraer y actualizar entidades del input
   */
  private extractAndUpdateEntities(userInput: string, intention: UserIntention): void {
    // Extraer posibles nombres de clientes
    const names = userInput.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (names) {
      names.forEach(name => {
        this.conversationContext.activeEntities[`client_${name.toLowerCase().replace(/\s+/g, '_')}`] = {
          type: 'client',
          name,
          mentionedAt: new Date(),
          confidence: 0.7
        };
      });
    }

    // Extraer números (posibles IDs de proyectos/estimados)
    const numbers = userInput.match(/\b\d{3,}\b/g);
    if (numbers) {
      numbers.forEach(num => {
        this.conversationContext.activeEntities[`id_${num}`] = {
          type: 'reference_id',
          value: num,
          mentionedAt: new Date(),
          confidence: 0.8
        };
      });
    }

    // Limpiar entidades antigas (más de 1 hora)
    const cutoff = Date.now() - (60 * 60 * 1000);
    Object.keys(this.conversationContext.activeEntities).forEach(key => {
      const entity = this.conversationContext.activeEntities[key];
      if (entity.mentionedAt.getTime() < cutoff) {
        delete this.conversationContext.activeEntities[key];
      }
    });
  }

  /**
   * Obtener topics de conversación
   */
  private getConversationTopics(): string[] {
    const topics = this.conversationContext.messages
      .map(msg => msg.intention?.primary)
      .filter(topic => topic);
    
    return [...new Set(topics)]; // Remover duplicados
  }

  /**
   * Notificar callbacks de actualización
   */
  private notifyContextUpdate(): void {
    if (this.userContext) {
      this.contextUpdateCallbacks.forEach(callback => {
        try {
          callback(this.userContext!);
        } catch (error) {
          console.error('❌ [CONTEXT-CALLBACK] Error:', error);
        }
      });
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.saveContext();
    this.contextUpdateCallbacks = [];
  }
}
/**
 * CONVERSATION ENGINE - MOTOR DE CONVERSACIÓN INTELIGENTE
 * 
 * Sistema avanzado que maneja la fluidez conversacional de Mervin AI
 * con personalidades adaptativas y respuestas contextuales inteligentes.
 * 
 * Características:
 * - Detección automática de idioma y personalidad
 * - Memoria conversacional inteligente
 * - Respuestas contextuales fluidas
 * - Manejo de emociones del usuario
 * - Transiciones naturales entre temas
 */

import { LanguageDetector, LanguageProfile, languageDetector } from './LanguageDetector';

export interface ConversationState {
  currentLanguageProfile: LanguageProfile;
  conversationHistory: ConversationTurn[];
  currentTopic?: string;
  userEmotion: 'frustrated' | 'excited' | 'confused' | 'satisfied' | 'neutral';
  contextStack: ConversationContext[];
  lastInteractionTime: Date;
}

export interface ConversationTurn {
  id: string;
  userMessage: string;
  agentResponse: string;
  languageProfile: LanguageProfile;
  emotion: string;
  timestamp: Date;
  topic?: string;
}

export interface ConversationContext {
  topic: string;
  entities: Record<string, any>;
  userPreferences: Record<string, any>;
  priority: number;
}

export interface ConversationResponse {
  message: string;
  emotion: 'empathetic' | 'enthusiastic' | 'helpful' | 'clarifying' | 'celebrating';
  languageProfile: LanguageProfile;
  suggestedActions?: string[];
  followUpQuestions?: string[];
}

class ConversationEngine {
  private state: ConversationState;
  private languageDetector: LanguageDetector;
  private readonly MAX_HISTORY = 20; // Mantener últimas 20 interacciones

  constructor(userId: string) {
    this.languageDetector = languageDetector;
    this.state = {
      currentLanguageProfile: {
        language: 'spanish',
        confidence: 0.8,
        region: 'mexican',
        personalityStyle: this.languageDetector['mexicanPersonality'], // Default mexicano
        detectedPhrases: []
      },
      conversationHistory: [],
      userEmotion: 'neutral',
      contextStack: [],
      lastInteractionTime: new Date()
    };

    console.log(`🗣️ [CONVERSATION-ENGINE] Initialized for user: ${userId}`);
  }

  /**
   * Procesar mensaje del usuario y generar respuesta inteligente
   */
  async processUserMessage(userMessage: string, context?: any): Promise<ConversationResponse> {
    // 1. Detectar idioma y personalidad
    const languageProfile = this.languageDetector.detectLanguage(userMessage);
    this.updateLanguageProfile(languageProfile);

    // 2. Detectar emoción del usuario
    const userEmotion = this.languageDetector.detectUserEmotion(userMessage);
    this.state.userEmotion = userEmotion;

    // 3. Analizar contexto conversacional
    const conversationContext = this.analyzeConversationContext(userMessage);

    // 4. Generar respuesta contextual
    const response = await this.generateContextualResponse(
      userMessage,
      languageProfile,
      userEmotion,
      conversationContext
    );

    // 5. Actualizar historial
    this.updateConversationHistory(userMessage, response.message, languageProfile, userEmotion);

    return response;
  }

  /**
   * Generar mensaje de bienvenida personalizado
   */
  generateWelcomeMessage(isAgentMode: boolean = true): string {
    const { currentLanguageProfile } = this.state;
    const { language, personalityStyle } = currentLanguageProfile;

    if (language === 'spanish') {
      const greeting = personalityStyle.greetings[0]; // Usar el primer saludo
      
      if (isAgentMode) {
        return `${greeting}

🤖 **Soy Mervin AI en modo Agente Autónomo**, primo. Aquí andamos para ayudarte con todo lo que necesites.

**Puedo hacer tareas complejas de manera autónoma como:**
• 📊 Generar estimados completos y profesionales
• 📋 Crear contratos con firma dual automática
• 🏛️ Analizar permisos municipales al detalle
• 🏠 Verificar propiedades y datos catastrales
• 💰 Gestionar pagos y facturación
• Y mucho más, compadre...

¿En qué te echo la mano hoy?`;
      } else {
        return `${greeting}

💬 **Soy Mervin AI en modo Legacy**, primo. Aquí ando para platicar contigo y guiarte paso a paso.

Dime, ¿en qué puedo ayudarte, compadre?`;
      }
    } else {
      const greeting = personalityStyle.greetings[0];
      
      if (isAgentMode) {
        return `${greeting}

🤖 **I'm Mervin AI in Autonomous Agent mode**, dude. I'm here to help you with whatever you need.

**I can handle complex tasks autonomously like:**
• 📊 Generate complete professional estimates
• 📋 Create contracts with dual signature automation
• 🏛️ Analyze municipal permits in detail
• 🏠 Verify properties and cadastral data
• 💰 Manage payments and billing
• And much more, bro...

What can I help you out with today?`;
      } else {
        return `${greeting}

💬 **I'm Mervin AI in Legacy mode**, dude. I'm here to chat with you and guide you step by step.

So, what can I do for you today, bro?`;
      }
    }
  }

  /**
   * Generar respuesta contextual inteligente
   */
  private async generateContextualResponse(
    userMessage: string,
    languageProfile: LanguageProfile,
    userEmotion: string,
    context: any
  ): Promise<ConversationResponse> {
    let baseResponse = '';
    let emotion: ConversationResponse['emotion'] = 'helpful';
    let suggestedActions: string[] = [];
    let followUpQuestions: string[] = [];

    // Respuesta basada en emoción del usuario
    switch (userEmotion) {
      case 'frustrated':
        baseResponse = this.languageDetector.generateEmpathyResponse(languageProfile);
        emotion = 'empathetic';
        break;
      case 'excited':
        baseResponse = this.languageDetector.generateExcitementResponse(languageProfile);
        emotion = 'enthusiastic';
        break;
      case 'confused':
        baseResponse = languageProfile.language === 'spanish' 
          ? 'No te preocupes, primo. Te explico paso a paso.'
          : 'No worries, dude. Let me break it down for you.';
        emotion = 'clarifying';
        break;
      case 'satisfied':
        baseResponse = languageProfile.language === 'spanish'
          ? '¡Órale! Me da mucho gusto que todo esté funcionando bien.'
          : 'Awesome! So stoked that everything is working out for you.';
        emotion = 'celebrating';
        break;
      default:
        baseResponse = this.languageDetector.generateFollowUpQuestion(languageProfile);
        emotion = 'helpful';
    }

    // Generar sugerencias contextuales
    suggestedActions = this.generateSuggestedActions(userMessage, languageProfile);
    followUpQuestions = this.generateFollowUpQuestions(userMessage, languageProfile);

    return {
      message: baseResponse,
      emotion,
      languageProfile,
      suggestedActions,
      followUpQuestions
    };
  }

  /**
   * Adaptar respuesta de tarea completada
   */
  adaptTaskResponse(taskResponse: string, success: boolean): string {
    const { currentLanguageProfile } = this.state;
    const { language, personalityStyle } = currentLanguageProfile;

    if (success) {
      const excitement = this.languageDetector.generateExcitementResponse(currentLanguageProfile);
      return this.languageDetector.adaptResponse(
        `${excitement} ${taskResponse}`,
        currentLanguageProfile,
        'casual'
      );
    } else {
      const empathy = this.languageDetector.generateEmpathyResponse(currentLanguageProfile);
      return this.languageDetector.adaptResponse(
        `${empathy} ${taskResponse}`,
        currentLanguageProfile,
        'formal'
      );
    }
  }

  /**
   * Generar transición natural entre temas
   */
  generateTopicTransition(newTopic: string): string {
    const { currentLanguageProfile } = this.state;
    const { language, personalityStyle } = currentLanguageProfile;

    const transition = personalityStyle.transitions[
      Math.floor(Math.random() * personalityStyle.transitions.length)
    ];

    if (language === 'spanish') {
      return `${transition}ahora hablemos de ${newTopic}.`;
    } else {
      return `${transition}let's talk about ${newTopic}.`;
    }
  }

  /**
   * Obtener resumen de conversación
   */
  getConversationSummary(): string {
    const { conversationHistory, currentLanguageProfile } = this.state;
    const { language } = currentLanguageProfile;
    
    if (conversationHistory.length === 0) {
      return language === 'spanish' 
        ? 'Aún no hemos platicado, primo.'
        : 'We haven\'t chatted yet, dude.';
    }

    const topics = conversationHistory
      .map(turn => turn.topic)
      .filter(Boolean);
    const topicsCovered = Array.from(new Set(topics));

    if (language === 'spanish') {
      return `Hemos platicado sobre: ${topicsCovered.join(', ')}. En total ${conversationHistory.length} intercambios.`;
    } else {
      return `We've talked about: ${topicsCovered.join(', ')}. Total ${conversationHistory.length} exchanges.`;
    }
  }

  /**
   * Métodos auxiliares privados
   */
  private updateLanguageProfile(newProfile: LanguageProfile): void {
    // Actualizar con suavizado para evitar cambios bruscos
    const current = this.state.currentLanguageProfile;
    const blendedConfidence = (current.confidence * 0.7) + (newProfile.confidence * 0.3);
    
    if (newProfile.confidence > 0.6 || blendedConfidence > current.confidence) {
      this.state.currentLanguageProfile = {
        ...newProfile,
        confidence: blendedConfidence
      };
    }
  }

  private analyzeConversationContext(userMessage: string): ConversationContext {
    // Analizar contexto básico del mensaje
    const entities: Record<string, any> = {};
    const userPreferences: Record<string, any> = {};
    
    // Detectar entidades simples
    if (userMessage.toLowerCase().includes('estimate') || userMessage.toLowerCase().includes('estimado')) {
      entities.topic = 'estimate';
    } else if (userMessage.toLowerCase().includes('contract') || userMessage.toLowerCase().includes('contrato')) {
      entities.topic = 'contract';
    }

    return {
      topic: entities.topic || 'general',
      entities,
      userPreferences,
      priority: 1
    };
  }

  private generateSuggestedActions(userMessage: string, languageProfile: LanguageProfile): string[] {
    const { language } = languageProfile;
    
    if (language === 'spanish') {
      return [
        'Generar un estimado',
        'Crear un contrato',
        'Verificar una propiedad',
        'Consultar permisos'
      ];
    } else {
      return [
        'Generate an estimate',
        'Create a contract',
        'Verify a property',
        'Check permits'
      ];
    }
  }

  private generateFollowUpQuestions(userMessage: string, languageProfile: LanguageProfile): string[] {
    const { language } = languageProfile;
    
    if (language === 'spanish') {
      return [
        '¿Necesitas más detalles sobre algo específico?',
        '¿Te gustaría que revisemos otra cosa?',
        '¿Hay algo más en lo que pueda ayudarte?'
      ];
    } else {
      return [
        'Need more details about something specific?',
        'Would you like me to check something else?',
        'Anything else I can help you with?'
      ];
    }
  }

  private updateConversationHistory(
    userMessage: string,
    agentResponse: string,
    languageProfile: LanguageProfile,
    emotion: string
  ): void {
    const turn: ConversationTurn = {
      id: Date.now().toString(),
      userMessage,
      agentResponse,
      languageProfile,
      emotion,
      timestamp: new Date(),
      topic: this.analyzeConversationContext(userMessage).topic
    };

    this.state.conversationHistory.push(turn);

    // Mantener solo las últimas N interacciones
    if (this.state.conversationHistory.length > this.MAX_HISTORY) {
      this.state.conversationHistory = this.state.conversationHistory.slice(-this.MAX_HISTORY);
    }

    this.state.lastInteractionTime = new Date();
  }

  /**
   * Getters públicos
   */
  getCurrentLanguageProfile(): LanguageProfile {
    return this.state.currentLanguageProfile;
  }

  getConversationHistory(): ConversationTurn[] {
    return [...this.state.conversationHistory];
  }

  getUserEmotion(): string {
    return this.state.userEmotion;
  }
}

export { ConversationEngine };
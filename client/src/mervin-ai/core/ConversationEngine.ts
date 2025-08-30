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
import { AdvancedConversationalIntelligence } from './AdvancedConversationalIntelligence';

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
  private advancedIntelligence: AdvancedConversationalIntelligence;
  private readonly MAX_HISTORY = 20; // Mantener últimas 20 interacciones

  constructor(userId: string) {
    // 🛡️ VALIDACIÓN DE SEGURIDAD CRÍTICA
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('🚨 SECURITY: userId is required and cannot be empty');
    }
    
    if (userId === 'null' || userId === 'undefined' || userId.includes('<script') || userId.includes('../')) {
      throw new Error('🚨 SECURITY: Invalid userId format detected');
    }

    this.languageDetector = languageDetector;
    this.advancedIntelligence = new AdvancedConversationalIntelligence();
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
    console.log(`🧠 [ADVANCED-INTELLIGENCE] Sistema súper avanzado activado`);
  }

  /**
   * Procesar mensaje del usuario con INTELIGENCIA SÚPER AVANZADA
   */
  async processUserMessage(userMessage: string, context?: any): Promise<ConversationResponse> {
    // 🛡️ SANITIZACIÓN DE SEGURIDAD - Prevenir XSS
    const sanitizedMessage = this.sanitizeInput(userMessage);
    
    console.log(`🧠 [SUPER-ADVANCED] Procesando mensaje: "${sanitizedMessage}"`);
    
    // 🧠 ANÁLISIS CONVERSACIONAL SÚPER AVANZADO
    const advancedAnalysis = await this.advancedIntelligence.analyzeAdvancedConversationalContext(
      sanitizedMessage, 
      this.state.conversationHistory
    );
    
    console.log(`🎯 [ADVANCED-ANALYSIS]`, {
      linguistic: advancedAnalysis.linguisticAnalysis?.complexity,
      emotional: advancedAnalysis.emotionalInsights?.current,
      inferences: advancedAnalysis.intelligentInferences?.implicit?.length || 0
    });

    // 1. Detectar idioma y personalidad (mejorado con análisis avanzado)
    const languageProfile = this.languageDetector.detectLanguage(sanitizedMessage);
    this.updateLanguageProfile(languageProfile);

    // 2. Análisis emocional avanzado
    this.state.userEmotion = this.determineAdvancedEmotion(advancedAnalysis.emotionalInsights);

    // 3. Contexto conversacional inteligente
    const conversationContext = this.analyzeConversationContext(sanitizedMessage);

    // 4. Generar respuesta súper avanzada
    const response = await this.generateAdvancedContextualResponse(
      sanitizedMessage,
      languageProfile,
      this.state.userEmotion,
      conversationContext,
      advancedAnalysis
    );

    // 🛡️ SANITIZACIÓN DE SALIDA - Prevenir XSS en respuestas
    response.message = this.sanitizeOutput(response.message);

    // 5. Actualizar memoria emocional y patrones
    this.updateAdvancedMemory(sanitizedMessage, response.message, advancedAnalysis);

    // 6. Actualizar historial con insights avanzados
    this.updateConversationHistory(sanitizedMessage, response.message, languageProfile, this.state.userEmotion);

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
   * Generar respuesta contextual súper avanzada
   */
  private async generateAdvancedContextualResponse(
    userMessage: string,
    languageProfile: LanguageProfile,
    userEmotion: string,
    context: any,
    advancedAnalysis: any
  ): Promise<ConversationResponse> {
    const { language } = languageProfile;
    const { messageType, intent, topic, emotionalContext } = context.entities;
    
    // 🧠 INTEGRAR INSIGHTS AVANZADOS
    const { linguisticAnalysis, intelligentInferences, predictiveContext, adaptivePersonality } = advancedAnalysis;
    
    let baseResponse = '';
    let emotion: ConversationResponse['emotion'] = 'helpful';
    let suggestedActions: string[] = [];
    let followUpQuestions: string[] = [];

    // 🚀 GENERACIÓN DE RESPUESTA SÚPER AVANZADA
    baseResponse = this.generateSuperAdvancedResponse(
      userMessage, 
      messageType, 
      intent, 
      topic, 
      emotionalContext, 
      language,
      linguisticAnalysis,
      intelligentInferences,
      adaptivePersonality
    );
    
    // Ajustar emoción con insights emocionales avanzados
    emotion = this.determineAdvancedResponseEmotion(
      messageType, 
      emotionalContext, 
      intent,
      advancedAnalysis.emotionalInsights
    );
    
    // 🎯 SUGERENCIAS PREDICTIVAS INTELIGENTES
    suggestedActions = this.generatePredictiveSuggestions(
      topic, 
      intent, 
      language,
      predictiveContext,
      intelligentInferences
    );
    
    followUpQuestions = this.generateIntelligentFollowUps(messageType, topic, intent, language);

    return {
      message: baseResponse,
      emotion,
      languageProfile,
      suggestedActions,
      followUpQuestions
    };
  }

  /**
   * Generar respuesta súper avanzada con análisis profundo
   */
  private generateSuperAdvancedResponse(
    userMessage: string,
    messageType: string,
    intent: string,
    topic: string,
    emotionalContext: string,
    language: string,
    linguisticAnalysis: any,
    intelligentInferences: any,
    adaptivePersonality: any
  ): string {
    const isSpanish = language === 'spanish';
    
    // 🎯 RESPUESTAS ADAPTADAS AL NIVEL DE EXPERTISE
    if (linguisticAnalysis.complexity === 'expert') {
      return this.generateExpertLevelResponse(userMessage, topic, isSpanish, intelligentInferences);
    }
    
    if (linguisticAnalysis.complexity === 'basic' && intelligentInferences.missing_context.length > 0) {
      return this.generateEducationalResponse(userMessage, topic, isSpanish, intelligentInferences);
    }
    
    // 🔄 RESPUESTAS CON INFERENCIAS INTELIGENTES
    if (intelligentInferences.implicit.length > 0) {
      return this.generateImplicitAwareResponse(
        userMessage, 
        messageType, 
        topic, 
        isSpanish, 
        intelligentInferences
      );
    }
    
    // 📈 RESPUESTAS PREDICTIVAS
    if (intelligentInferences.anticipated_needs.length > 0) {
      return this.generateAnticipatoryResponse(
        userMessage, 
        messageType, 
        topic, 
        isSpanish, 
        intelligentInferences
      );
    }
    
    // Fallback a respuesta específica SÚPER MEJORADA
    console.log(`🔄 [FALLBACK] Generando respuesta contextual inteligente`);
    return this.generateIntelligentContextualResponse(userMessage, messageType, intent, topic, emotionalContext, language, intelligentInferences);
  }

  private generateExpertLevelResponse(message: string, topic: string, isSpanish: boolean, inferences: any): string {
    if (topic === 'estimate') {
      return isSpanish 
        ? `Perfecto, primo. Veo que manejas bien el tema. Te armo un estimado técnico completo con especificaciones detalladas, análisis de materiales premium y cronograma de implementación optimizado. ${inferences.implicit.length > 0 ? 'También incluyo ' + inferences.implicit[0].toLowerCase() + '.' : ''}`
        : `Perfect, dude. I can see you know your stuff. I'll build you a comprehensive technical estimate with detailed specs, premium material analysis, and optimized implementation timeline. ${inferences.implicit.length > 0 ? 'I\'ll also include ' + inferences.implicit[0].toLowerCase() + '.' : ''}`;
    }
    
    return isSpanish
      ? `Órale, compadre, veo que tienes experiencia en esto. Te doy la información técnica completa que necesitas.`
      : `Right on, bro. I can see you've got experience with this. I'll give you the full technical breakdown you need.`;
  }

  private generateEducationalResponse(message: string, topic: string, isSpanish: boolean, inferences: any): string {
    const missingInfo = inferences.missing_context[0] || 'información adicional';
    
    if (topic === 'estimate') {
      return isSpanish 
        ? `Te ayudo con eso, primo. Para darte un estimado preciso, necesito ${missingInfo.toLowerCase()}. Te explico paso a paso cómo funciona todo el proceso para que tengas claridad completa.`
        : `I'll help you with that, dude. To give you an accurate estimate, I need ${missingInfo.toLowerCase()}. Let me walk you through the whole process step by step so you have complete clarity.`;
    }
    
    return isSpanish
      ? `Claro, compadre. Te explico todo con detalle para que entiendas perfectamente el proceso.`
      : `For sure, bro. I'll break it all down so you understand the process perfectly.`;
  }

  private generateImplicitAwareResponse(
    message: string, 
    messageType: string, 
    topic: string, 
    isSpanish: boolean, 
    inferences: any
  ): string {
    const implicitNeed = inferences.implicit[0] || '';
    
    return isSpanish
      ? `Perfecto, primo. ${implicitNeed ? 'Además de lo que me pides, ' + implicitNeed.toLowerCase() + '. ' : ''}Así tenemos todo completo desde el principio.`
      : `Perfect, dude. ${implicitNeed ? 'Besides what you\'re asking for, ' + implicitNeed.toLowerCase() + '. ' : ''}This way we have everything complete from the start.`;
  }

  private generateAnticipatoryResponse(
    message: string, 
    messageType: string, 
    topic: string, 
    isSpanish: boolean, 
    inferences: any
  ): string {
    const nextNeed = inferences.anticipated_needs[0] || '';
    
    return isSpanish
      ? `Órale sí, primo. Te ayudo con eso ahora, y después probablemente vas a necesitar ${nextNeed.toLowerCase()}. ¿Te preparo todo de una vez?`
      : `Oh yeah, dude. I'll help you with that now, and then you'll probably need ${nextNeed.toLowerCase()}. Want me to prepare everything at once?`;
  }

  /**
   * MÉTODOS SÚPER AVANZADOS PARA INTELIGENCIA CONVERSACIONAL
   */
  private determineAdvancedEmotion(emotionalInsights: any): 'frustrated' | 'excited' | 'confused' | 'satisfied' | 'neutral' {
    if (!emotionalInsights?.current) return 'neutral';
    
    const { confidence, satisfaction, urgency, engagement } = emotionalInsights.current;
    
    // Lógica avanzada de determinación emocional
    if (satisfaction < 0.3 && urgency > 0.7) return 'frustrated';
    if (satisfaction > 0.8 && engagement > 0.7) return 'excited';
    if (confidence < 0.3 && engagement < 0.4) return 'confused';
    if (satisfaction > 0.6 && confidence > 0.6) return 'satisfied';
    
    return 'neutral';
  }

  private updateAdvancedMemory(userMessage: string, agentResponse: string, advancedAnalysis: any): void {
    // Actualizar expertise del usuario basado en análisis
    if (advancedAnalysis.linguisticAnalysis?.complexity === 'expert') {
      this.advancedIntelligence.updateUserExpertise('expert');
    } else if (advancedAnalysis.linguisticAnalysis?.complexity === 'advanced') {
      this.advancedIntelligence.updateUserExpertise('advanced');
    }
    
    // Incrementar profundidad de relación
    this.advancedIntelligence.incrementRelationshipDepth();
    
    // Agregar patrón conversacional si es relevante
    if (advancedAnalysis.predictiveContext?.conversation_trajectory) {
      const pattern = {
        type: 'workflow' as const,
        pattern: userMessage.toLowerCase().substring(0, 50),
        frequency: 1,
        context: [advancedAnalysis.linguisticAnalysis?.complexity || 'basic'],
        predictive: {
          nextLikely: advancedAnalysis.intelligentInferences?.anticipated_needs || [],
          confidence: 0.7
        }
      };
      this.advancedIntelligence.addConversationalPattern(pattern);
    }
  }

  private determineAdvancedResponseEmotion(
    messageType: string, 
    emotionalContext: string, 
    intent: string,
    emotionalInsights: any
  ): ConversationResponse['emotion'] {
    // Lógica súper avanzada para determinar emoción de respuesta
    if (emotionalInsights?.current?.satisfaction < 0.3) return 'empathetic';
    if (emotionalInsights?.current?.engagement > 0.8) return 'enthusiastic';
    if (messageType === 'confirmation' && emotionalInsights?.current?.satisfaction > 0.7) return 'celebrating';
    if (emotionalContext === 'frustrated') return 'empathetic';
    if (messageType === 'greeting') return 'enthusiastic';
    if (intent === 'create' || intent === 'request') return 'helpful';
    if (emotionalInsights?.current?.confidence < 0.4) return 'clarifying';
    
    return 'helpful';
  }

  private generatePredictiveSuggestions(
    topic: string, 
    intent: string, 
    language: string,
    predictiveContext: any,
    intelligentInferences: any
  ): string[] {
    const isSpanish = language === 'spanish';
    const suggestions: string[] = [];
    
    // Sugerencias basadas en necesidades anticipadas
    if (intelligentInferences?.anticipated_needs?.length > 0) {
      const nextNeed = intelligentInferences.anticipated_needs[0];
      suggestions.push(
        isSpanish 
          ? `Preparar ${nextNeed.toLowerCase()}`
          : `Prepare ${nextNeed.toLowerCase()}`
      );
    }
    
    // Sugerencias predictivas basadas en contexto
    if (predictiveContext?.next_user_message?.length > 0) {
      suggestions.push(
        isSpanish 
          ? 'Explorar opciones avanzadas'
          : 'Explore advanced options'
      );
    }
    
    // Sugerencias específicas por tema con inteligencia predictiva
    if (topic === 'estimate') {
      suggestions.push(
        isSpanish 
          ? 'Generar estimado inteligente'
          : 'Generate smart estimate'
      );
      
      if (intelligentInferences?.missing_context?.includes('Ubicación o dirección de la propiedad')) {
        suggestions.push(
          isSpanish 
            ? 'Agregar ubicación automáticamente'
            : 'Add location automatically'
        );
      }
    }
    
    if (topic === 'contract') {
      suggestions.push(
        isSpanish 
          ? 'Crear contrato profesional'
          : 'Create professional contract'
      );
      
      if (intelligentInferences?.implicit?.some((i: string) => i.includes('firma'))) {
        suggestions.push(
          isSpanish 
            ? 'Configurar firma digital'
            : 'Set up digital signature'
        );
      }
    }
    
    // Fallback con sugerencias contextuales mejoradas
    if (suggestions.length === 0) {
      suggestions.push(...this.generateContextualSuggestions(topic, intent, language));
    }
    
    return suggestions.slice(0, 4); // Máximo 4 sugerencias para no abrumar
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
    const message = userMessage.toLowerCase().trim();
    const entities: Record<string, any> = {};
    const userPreferences: Record<string, any> = {};
    
    // Detectar tipo de mensaje
    entities.messageType = this.detectMessageType(message);
    
    // Detectar temas principales con mayor precisión
    if (message.includes('estimado') || message.includes('estimate') || message.includes('cotiz') || message.includes('presupuesto') || message.includes('quote')) {
      entities.topic = 'estimate';
      entities.specificity = 'high';
    } else if (message.includes('contrato') || message.includes('contract') || message.includes('acuerdo') || message.includes('agreement')) {
      entities.topic = 'contract';
      entities.specificity = 'high';
    } else if (message.includes('propiedad') || message.includes('property') || message.includes('terreno') || message.includes('casa') || message.includes('house')) {
      entities.topic = 'property';
      entities.specificity = 'high';
    } else if (message.includes('permiso') || message.includes('permit') || message.includes('licencia') || message.includes('municipal')) {
      entities.topic = 'permit';
      entities.specificity = 'high';
    } else if (message.includes('pago') || message.includes('payment') || message.includes('factura') || message.includes('invoice')) {
      entities.topic = 'payment';
      entities.specificity = 'high';
    } else {
      entities.topic = 'general';
      entities.specificity = 'low';
    }
    
    // Detectar intención específica
    entities.intent = this.detectUserIntent(message);
    
    // Detectar contexto emocional específico
    entities.emotionalContext = this.detectEmotionalContext(message);

    return {
      topic: entities.topic,
      entities,
      userPreferences,
      priority: entities.specificity === 'high' ? 2 : 1
    };
  }

  private detectMessageType(message: string): string {
    // Preguntas
    if (message.includes('?') || message.startsWith('qué') || message.startsWith('cómo') || 
        message.startsWith('cuándo') || message.startsWith('dónde') || message.startsWith('por qué') ||
        message.startsWith('what') || message.startsWith('how') || message.startsWith('when') ||
        message.startsWith('where') || message.startsWith('why') || message.startsWith('can you')) {
      return 'question';
    }
    
    // Confirmaciones
    if (message.includes('sí') || message.includes('yes') || message.includes('correcto') || 
        message.includes('exacto') || message.includes('está bien') || message.includes('ok') ||
        message.includes('está bien') || message.includes('perfecto') || message.includes('perfect')) {
      return 'confirmation';
    }
    
    // Negaciones
    if (message.includes('no') || message.includes('not') || message.includes('never') ||
        message.includes('nunca') || message.includes('no quiero') || message.includes("don't")) {
      return 'negation';
    }
    
    // Solicitudes/Comandos
    if (message.startsWith('necesito') || message.startsWith('quiero') || message.startsWith('puedes') ||
        message.startsWith('i need') || message.startsWith('i want') || message.startsWith('please') ||
        message.startsWith('help') || message.startsWith('ayuda')) {
      return 'request';
    }
    
    // Saludos y conversación casual
    if (message.includes('hola') || message.includes('hello') || message.includes('hi') ||
        message.includes('buenos días') || message.includes('good morning') || message.includes('hey') ||
        message.includes('como estas') || message.includes('como andas') || message.includes('que tal') ||
        message.includes('how are you') || message.includes('how you doing') || message.includes('whats up') ||
        message.includes('oye mervin') || message.includes('saludando') || message.includes('saludo') ||
        message.includes('buenas') || message.includes('que onda') || message.includes('primo') ||
        message.includes('espero que estes bien') || message.includes('hope you are well') ||
        (message.includes('mervin') && (message.includes('estas') || message.includes('andas') || message.includes('tal')))) {
      return 'greeting';
    }
    
    // Seguimientos
    if (message.includes('y después') || message.includes('and then') || message.includes('siguiente') ||
        message.includes('next') || message.includes('también') || message.includes('también') || message.includes('also')) {
      return 'followup';
    }
    
    return 'statement';
  }

  private detectUserIntent(message: string): string {
    // Crear/Generar
    if (message.includes('crear') || message.includes('generar') || message.includes('hacer') ||
        message.includes('create') || message.includes('generate') || message.includes('make')) {
      return 'create';
    }
    
    // Ver/Revisar
    if (message.includes('ver') || message.includes('revisar') || message.includes('mostrar') ||
        message.includes('show') || message.includes('view') || message.includes('check')) {
      return 'view';
    }
    
    // Modificar/Cambiar
    if (message.includes('cambiar') || message.includes('modificar') || message.includes('editar') ||
        message.includes('change') || message.includes('modify') || message.includes('edit')) {
      return 'modify';
    }
    
    // Eliminar
    if (message.includes('eliminar') || message.includes('borrar') || message.includes('quitar') ||
        message.includes('delete') || message.includes('remove')) {
      return 'delete';
    }
    
    // Explicar/Ayudar
    if (message.includes('explicar') || message.includes('ayudar') || message.includes('cómo') ||
        message.includes('explain') || message.includes('help') || message.includes('how')) {
      return 'explain';
    }
    
    return 'general';
  }

  private detectEmotionalContext(message: string): string {
    // Frustración
    if (message.includes('no funciona') || message.includes('problema') || message.includes('error') ||
        message.includes("doesn't work") || message.includes('problem') || message.includes('broken')) {
      return 'frustrated';
    }
    
    // Satisfacción
    if (message.includes('perfecto') || message.includes('excelente') || message.includes('genial') ||
        message.includes('perfect') || message.includes('excellent') || message.includes('great')) {
      return 'satisfied';
    }
    
    // Urgencia
    if (message.includes('urgente') || message.includes('rápido') || message.includes('ya') ||
        message.includes('urgent') || message.includes('quickly') || message.includes('asap')) {
      return 'urgent';
    }
    
    return 'neutral';
  }

  /**
   * SISTEMA MEJORADO - Respuestas contextuales súper inteligentes
   */
  private generateIntelligentContextualResponse(
    userMessage: string, 
    messageType: string, 
    intent: string, 
    topic: string, 
    emotionalContext: string, 
    language: string,
    inferences: any
  ): string {
    const isSpanish = language === 'spanish';
    const normalizedMessage = userMessage.toLowerCase();
    
    // 🎯 ANÁLISIS CONTEXTUAL PROFUNDO
    const context = this.analyzeDeepContext(normalizedMessage);
    
    // 🧠 RESPUESTAS SÚPER CONTEXTUALES
    if (context.contains.license || context.contains.permit || normalizedMessage.includes('c-13') || normalizedMessage.includes('licencia')) {
      return this.generateLicensePermitResponse(normalizedMessage, isSpanish);
    }
    
    if (context.contains.pricing || context.contains.cost || context.contains.estimate) {
      return this.generatePricingResponse(normalizedMessage, isSpanish);
    }
    
    if (context.contains.contract || context.contains.agreement) {
      return this.generateContractResponse(normalizedMessage, isSpanish);
    }
    
    if (context.contains.business || context.contains.company) {
      return this.generateBusinessResponse(normalizedMessage, isSpanish);
    }
    
    // 🎭 RESPUESTAS ADAPTADAS POR TIPO DE MENSAJE
    return this.generateAdaptiveResponse(userMessage, messageType, intent, topic, emotionalContext, isSpanish);
  }

  private generateSpecificResponse(
    userMessage: string, 
    messageType: string, 
    intent: string, 
    topic: string, 
    emotionalContext: string, 
    language: string
  ): string {
    // Respuestas específicas por tipo de mensaje y contexto
    switch (messageType) {
      case 'greeting':
        // Respuestas específicas para "como estas" y conversación casual
        if (userMessage.toLowerCase().includes('como estas') || userMessage.toLowerCase().includes('como andas')) {
          const statusResponses = [
            '¡Aquí andamos al cien, primo! Todo bien por aquí, trabajando duro para ayudarte. ¿Y tú qué tal? ¿Cómo van los proyectos?',
            '¡Órale, todo chido por acá, compadre! Bien activo ayudando a contratistas como tú. ¿Cómo te ha ido? ¿En qué andas metido?',
            '¡Todo bien, hermano! Aquí echándole ganas, siempre listo para echar la mano. ¿Y tú cómo andas? ¿Qué tal el trabajo?',
            '¡De pelos, primo! Aquí en la lucha, pero con buena actitud. ¿Y tú qué cuentas? ¿Cómo van las cosas?',
            '¡Al cien, compadre! Aquí siempre disponible para lo que necesites. ¿Tú cómo andas? ¿Todo bien con los proyectos?'
          ];
          return statusResponses[Math.floor(Math.random() * statusResponses.length)];
        }
        
        // Respuestas para saludos de seguimiento o casuales
        if (userMessage.toLowerCase().includes('saludando') || userMessage.toLowerCase().includes('saludo') || 
            userMessage.toLowerCase().includes('espero que estes bien')) {
          const casualResponses = [
            '¡Órale, qué buena onda, primo! Muy amable de tu parte. Yo aquí andamos bien, siempre listo para platicar y ayudarte con lo que necesites.',
            '¡Ay, qué chido, compadre! Muchas gracias, se agradece el detalle. Todo bien por acá. ¿Y tú cómo andas? ¿Todo tranquilo?',
            '¡Qué padre, hermano! Muy gentil de tu parte preguntar. Aquí andamos de buenas, siempre disponible para platicar contigo.',
            '¡Gracias, primo! Qué bueno que te des el tiempo de saludar. Aquí todo bien, trabajando y echándole ganas. ¿Y tú qué tal?',
            '¡Órale, qué considerado! Se aprecia mucho, compadre. Todo chido por aquí. ¿Cómo has estado tú? ¿Todo bien?'
          ];
          return casualResponses[Math.floor(Math.random() * casualResponses.length)];
        }
        
        // Saludos generales normales
        const greetings = language === 'spanish' ? [
          '¡Órale primo! ¿Cómo andas? ¿En qué te puedo echar la mano hoy?',
          '¡Qué onda, compadre! ¿Todo bien? ¿Qué necesitas que hagamos?',
          '¡Ey, hermano! ¿Cómo está la cosa? ¿En qué andas trabajando?',
          '¡Hola primo! ¿Qué tal todo? ¿Cómo te ayudo el día de hoy?',
          '¡Órale, qué bueno verte! ¿Todo chido? ¿Qué proyecto traes?'
        ] : [
          'Hey there, dude! What\'s up? How can I help you out today?',
          'What\'s good, bro! How\'s it going? What can I do for you?',
          'Hey man! How\'s everything? What are you working on?',
          'Hello there, dude! What\'s happening? How can I help today?',
          'Hey, good to see you! What\'s up? What project you got going?'
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];

      case 'question':
        return this.generateQuestionResponse(intent, topic, language, userMessage);

      case 'confirmation':
        return this.generateConfirmationResponse(topic, language);

      case 'negation':
        const negationResponses = language === 'spanish' ? [
          'No hay problema, primo. ¿Hay algo más que te interese o quieres que cambiemos de rumbo?',
          'Todo bien, compadre. ¿Qué otra cosa podemos hacer o en qué más te ayudo?',
          'Órale, no hay pedo. ¿Quieres que veamos algo diferente o cómo le hacemos?',
          'Perfecto, hermano. ¿Hay otra cosa que necesites o cambiamos de tema?'
        ] : [
          'No worries at all, dude. Is there something else you\'re interested in or want to pivot to?',
          'All good, bro. What else can we work on or how else can I help?',
          'Cool, no problem. Want to try something different or what should we do?',
          'Totally fine, man. Is there something else you need or should we switch gears?'
        ];
        return negationResponses[Math.floor(Math.random() * negationResponses.length)];

      case 'request':
        return this.generateRequestResponse(intent, topic, language, userMessage);

      case 'followup':
        return this.generateFollowupResponse(topic, language);

      default:
        return this.generateContextualStatement(intent, topic, emotionalContext, language, userMessage);
    }
  }

  /**
   * Analizar contexto profundo del mensaje
   */
  private analyzeDeepContext(message: string): any {
    return {
      contains: {
        license: /licencia|license|permit|c-13|c-27|contractors|contratista/.test(message),
        permit: /permiso|permit|aplicar|apply|municipio|city|gobierno/.test(message),
        pricing: /precio|cost|costo|cuanto|how much|estimate|estimado/.test(message),
        estimate: /estimado|estimate|presupuesto|cotización|quote/.test(message),
        contract: /contrato|contract|acuerdo|agreement|firma|sign/.test(message),
        business: /negocio|business|empresa|company|trabajo|work/.test(message)
      }
    };
  }

  /**
   * Respuesta especializada para licencias y permisos
   */
  private generateLicensePermitResponse(message: string, isSpanish: boolean): string {
    if (message.includes('c-13') || message.includes('c13')) {
      return isSpanish 
        ? `¡Órale primo! La licencia C-13 es para fencing contractors. Te ayudo con todo el proceso. Necesitas experiencia comprobable, seguro de responsabilidad civil, y pasar el examen del estado. Te guío paso a paso - ¿en qué estado estás aplicando?`
        : `Right on, dude! C-13 license is for fencing contractors. I'll help you with the whole process. You need verifiable experience, liability insurance, and to pass the state exam. I'll guide you step by step - which state are you applying in?`;
    }
    
    return isSpanish
      ? `Perfecto, compadre. Te ayudo con los permisos y licencias. Cada estado tiene sus requisitos específicos - dime exactamente qué licencia necesitas y en qué ubicación, y te armo el plan completo.`
      : `Perfect, bro. I'll help you with permits and licenses. Each state has specific requirements - tell me exactly which license you need and the location, and I'll put together the complete plan for you.`;
  }

  /**
   * Respuesta especializada para precios y estimados
   */
  private generatePricingResponse(message: string, isSpanish: boolean): string {
    return isSpanish
      ? `¡Ándale primo! Para darte un precio exacto necesito los detalles del proyecto. ¿Qué tipo de cerca necesitas? ¿Residencial o comercial? ¿Cuántos pies lineales? Con esa info te armo un estimado profesional al tiro.`
      : `Let's do it, dude! To give you an exact price I need the project details. What type of fence do you need? Residential or commercial? How many linear feet? With that info I'll put together a professional estimate right away.`;
  }

  /**
   * Respuesta especializada para contratos
   */
  private generateContractResponse(message: string, isSpanish: boolean): string {
    return isSpanish
      ? `¡Órale compadre! Te genero contratos profesionales con todas las cláusulas necesarias. Solo dime los detalles del trabajo y del cliente, y te armo el documento completo listo para firmar.`
      : `Right on, bro! I'll generate professional contracts with all necessary clauses. Just give me the work details and client info, and I'll put together the complete document ready to sign.`;
  }

  /**
   * Respuesta especializada para negocios
   */
  private generateBusinessResponse(message: string, isSpanish: boolean): string {
    return isSpanish
      ? `¡Simón primo! Te ayudo con todo lo del negocio - desde permisos y licencias hasta contratos y estimados. ¿En qué parte del proceso andas? ¿Empezando o ya tienes experiencia?`
      : `For sure, dude! I'll help with all the business stuff - from permits and licenses to contracts and estimates. What part of the process are you at? Just starting or do you have experience?`;
  }

  /**
   * Respuestas adaptivas mejoradas
   */
  private generateAdaptiveResponse(
    userMessage: string, 
    messageType: string, 
    intent: string, 
    topic: string, 
    emotionalContext: string, 
    isSpanish: boolean
  ): string {
    const normalizedMessage = userMessage.toLowerCase();
    
    // 🎯 ANÁLISIS CONTEXTUAL INTELIGENTE PRIMERO
    if (messageType === 'greeting' || /^(hola|hello|hi|hey|qué tal|what's up)/i.test(normalizedMessage)) {
      const greetings = isSpanish ? [
        '¡Órale primo! ¿Cómo andas? ¿En qué te puedo echar la mano hoy?',
        '¡Qué onda, compadre! ¿Todo bien? ¿Qué proyecto traes entre manos?',
        '¡Ey, hermano! ¿Cómo está la cosa? ¿Listo para armar algo chingón?',
        '¡Hola primo! ¿Qué tal todo? ¿En qué andamos trabajando hoy?'
      ] : [
        'Hey there, dude! What\'s up? How can I help you out today?',
        'What\'s good, bro! How\'s everything? What project you working on?',
        'Hey man! How\'s it going? Ready to build something awesome?',
        'Hello there, dude! What\'s happening? What are we working on today?'
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // 🤝 RESPUESTAS DE CONTINUACIÓN (follow-up)
    if (/^(solo en eso|only that|just that|that's it)/i.test(normalizedMessage)) {
      return isSpanish 
        ? `Perfecto, primo. Si necesitas algo más específico o quieres que cambiemos de tema, nomás me dices.`
        : `Perfect, dude. If you need something more specific or want to change topics, just let me know.`;
    }
    
    if (/^(i gave you|ya te di|te dije|i told you|already gave)/i.test(normalizedMessage)) {
      return isSpanish
        ? `Órale primo, tienes razón. Déjame revisar bien la información que me diste para darte la respuesta que necesitas.`
        : `Right on, dude, you're right. Let me review the info you gave me properly to give you the response you need.`;
    }
    
    // 🤔 RESPUESTAS DE CONFIRMACIÓN
    if (/^(sí|yes|ok|okay|correcto|right|sure)/i.test(normalizedMessage)) {
      return isSpanish
        ? `¡Simón! ¿En qué más te ayudo o qué quieres que hagamos ahora?`
        : `Cool! What else can I help you with or what should we do now?`;
    }
    
    // ❌ RESPUESTAS DE NEGACIÓN
    if (/^(no|nope|nah|not really)/i.test(normalizedMessage)) {
      return isSpanish
        ? `No hay problema, compadre. ¿Hay algo más en lo que te pueda ayudar o quieres que veamos otra cosa?`
        : `No worries, bro. Is there something else I can help you with or want to look at something different?`;
    }
    
    // 🤷 RESPUESTAS VAGAS - Pedir clarificación
    if (normalizedMessage.length < 15) {
      return isSpanish
        ? `¿Puedes darme un poco más de contexto, primo? Así te ayudo mejor con lo que necesitas.`
        : `Can you give me a bit more context, dude? That way I can help you better with what you need.`;
    }
    
    // 📝 PREGUNTAS
    if (messageType === 'question' || normalizedMessage.includes('?') || /^(cómo|how|qué|what|cuándo|when|dónde|where)/i.test(normalizedMessage)) {
      return isSpanish
        ? `Claro primo, te contesto eso. ${this.generateContextualHelp(userMessage, topic, isSpanish)}`
        : `For sure, dude, I'll answer that. ${this.generateContextualHelp(userMessage, topic, isSpanish)}`;
    }
    
    // 🔄 FALLBACK INTELIGENTE - Ya no genérico
    return isSpanish
      ? `Entiendo, compadre. ¿Podrías ser más específico sobre lo que necesitas? Así te doy una respuesta más precisa.`
      : `I understand, bro. Could you be more specific about what you need? That way I can give you a more precise answer.`;
  }

  private generateContextualHelp(message: string, topic: string, isSpanish: boolean): string {
    const helpTexts = isSpanish ? [
      'Te explico todo paso a paso.',
      'Te doy toda la información que necesitas.',
      'Te armo la solución completa.',
      'Te ayudo a resolverlo todo.'
    ] : [
      'I\'ll explain everything step by step.',
      'I\'ll give you all the info you need.',
      'I\'ll put together the complete solution.',
      'I\'ll help you solve it all.'
    ];
    
    return helpTexts[Math.floor(Math.random() * helpTexts.length)];
  }

  private generateQuestionResponse(intent: string, topic: string, language: string, userMessage: string): string {
    const isSpanish = language === 'spanish';
    
    if (topic === 'estimate') {
      return isSpanish 
        ? 'Claro primo, te puedo ayudar con estimados. ¿Es para una cerca nueva, reparación, o qué tipo de trabajo necesitas cotizar?'
        : 'Sure thing, dude! I can help with estimates. Is it for a new fence, repair, or what kind of work do you need quoted?';
    }
    
    if (topic === 'contract') {
      return isSpanish
        ? '¡Por supuesto! Te ayudo con contratos, compadre. ¿Ya tienes los detalles del trabajo o necesitas que armemos todo desde cero?'
        : 'Absolutely! I can help with contracts, bro. Do you have the job details or do we need to build everything from scratch?';
    }
    
    if (topic === 'property') {
      return isSpanish
        ? 'Perfecto, primo. Te ayudo a verificar propiedades. ¿Tienes la dirección o número de parcela que quieres que revise?'
        : 'Perfect, dude! I can help verify properties. Do you have the address or parcel number you want me to check?';
    }
    
    if (intent === 'explain') {
      return isSpanish
        ? 'Te explico lo que necesites, compadre. Dime específicamente qué parte quieres que te detalle.'
        : 'I\'ll explain whatever you need, bro. Tell me specifically what part you want me to break down.';
    }
    
    const responses = isSpanish ? [
      'Dime más detalles sobre lo que necesitas, primo. Mientras más me cuentes, mejor te puedo ayudar.',
      'Órale, cuéntame bien qué andas buscando, compadre. Entre más me expliques, mejor te voy a poder ayudar.',
      'Ándale, primo, platícame más detalles. Así te doy la ayuda que necesitas.',
      'Explícame un poco más sobre lo que necesitas, hermano. Quiero ayudarte bien.'
    ] : [
      'Tell me more about what you need, dude. The more you share, the better I can help you out.',
      'Break it down for me, bro. The more details you give me, the better I can help.',
      'Give me more info about what you\'re looking for, man. Want to help you properly.',
      'Fill me in on what you need, dude. More details means better help from me.'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateConfirmationResponse(topic: string, language: string): string {
    const isSpanish = language === 'spanish';
    
    if (topic === 'estimate' || topic === 'contract' || topic === 'property') {
      return isSpanish
        ? '¡Perfecto primo! Vamos con eso. ¿Qué detalles tienes para que arranquemos?'
        : 'Perfect, dude! Let\'s do this. What details do you have so we can get started?';
    }
    
    return isSpanish
      ? '¡Órale, perfecto! Entonces seguimos por ahí. ¿Qué sigue, compadre?'
      : 'Awesome, perfect! So we\'re going with that. What\'s next, bro?';
  }

  private generateRequestResponse(intent: string, topic: string, language: string, userMessage: string): string {
    const isSpanish = language === 'spanish';
    
    if (intent === 'create' && topic === 'estimate') {
      return isSpanish
        ? '¡Claro que sí, primo! Te ayudo a crear un estimado. Cuéntame: ¿qué tipo de cerca necesitas, para qué propiedad, y tienes las medidas?'
        : 'Absolutely, dude! I\'ll help you create an estimate. Tell me: what type of fence do you need, for which property, and do you have measurements?';
    }
    
    if (intent === 'create' && topic === 'contract') {
      return isSpanish
        ? '¡Por supuesto, compadre! Armamos un contrato profesional. ¿Ya tienes acordados los detalles del trabajo con el cliente?'
        : 'Of course, bro! Let\'s build a professional contract. Do you already have the job details agreed upon with the client?';
    }
    
    if (intent === 'view' || intent === 'check') {
      return isSpanish
        ? 'Te ayudo a revisar eso, primo. Dame más detalles sobre qué específicamente quieres que verifique.'
        : 'I\'ll help you check that out, dude. Give me more details about what specifically you want me to verify.';
    }
    
    return isSpanish
      ? 'Entendido, primo. Te ayudo con eso. Compárteme los detalles para saber exactamente cómo proceder.'
      : 'Got it, dude. I\'ll help you with that. Share the details so I know exactly how to proceed.';
  }

  private generateFollowupResponse(topic: string, language: string): string {
    const isSpanish = language === 'spanish';
    
    return isSpanish
      ? '¡Órale sí! Seguimos con eso, primo. Dime qué más necesitas que hagamos.'
      : 'Oh yeah! Let\'s keep going with that, dude. Tell me what else we need to do.';
  }

  private generateContextualStatement(intent: string, topic: string, emotionalContext: string, language: string, userMessage: string): string {
    const isSpanish = language === 'spanish';
    
    if (emotionalContext === 'frustrated') {
      const responses = isSpanish ? [
        'Órale primo, veo que algo no está funcionando bien. Platícame qué está pasando para que lo arreglemos juntos.',
        'No te preocupes, compadre. Entiendo que es frustrante. Dime qué problema tienes y lo resolvemos.',
        'Tranquilo, primo. Vamos a ver qué está fallando y lo componemos de una vez.'
      ] : [
        'Hey dude, I can see something isn\'t working right. Tell me what\'s going on so we can fix it together.',
        'No worries, bro. I get that it\'s frustrating. Tell me what\'s up and we\'ll sort it out.',
        'Chill, man. Let\'s see what\'s going wrong and get it fixed right away.'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    if (emotionalContext === 'satisfied') {
      const responses = isSpanish ? [
        '¡Qué bueno escuchar eso, compadre! Me da mucho gusto que todo esté saliendo bien. ¿Qué sigue en la lista?',
        '¡Órale, perfecto! Me da mucho gusto que esté funcionando chido. ¿En qué más te ayudo?',
        '¡Está padrísimo, primo! Me alegra que todo vaya bien. ¿Qué otro proyecto traes?'
      ] : [
        'So great to hear that, bro! Really stoked that everything is working out. What\'s next on the list?',
        'Awesome, dude! Super happy that it\'s working smoothly. What else can I help with?',
        'That\'s rad, man! Glad everything\'s going well. What other project you got going?'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Respuesta inteligente basada en contenido específico
    if (userMessage.toLowerCase().includes('gracias') || userMessage.toLowerCase().includes('thank')) {
      const responses = isSpanish ? [
        '¡De nada, primo! Para eso estamos. Si necesitas algo más, aquí andamos.',
        '¡Órale, no hay de qué, compadre! Cualquier cosa que necesites, aquí me tienes.',
        '¡Para eso andamos, hermano! Lo que se te ofrezca, nada más dime.'
      ] : [
        'You\'re welcome, dude! That\'s what we\'re here for. If you need anything else, just let me know.',
        'No problem, bro! Happy to help. Just holler if you need anything else.',
        'Totally, man! That\'s what I\'m here for. Hit me up for whatever you need.'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Respuestas variadas para casos generales
    const generalResponses = isSpanish ? [
      'Entiendo, primo. Cuéntame más para saber exactamente cómo ayudarte mejor.',
      'Órale, sí veo. Dame más detalles para ayudarte como debe ser, compadre.',
      'Ándale, primo. Explícame un poquito más para darte la mejor ayuda.',
      'Simón, hermano. Entre más me cuentes, mejor te voy a poder echar la mano.'
    ] : [
      'I hear you, dude. Tell me more so I know exactly how to help you better.',
      'Got it, bro. Give me more details so I can help you properly.',
      'Right on, man. Break it down a bit more so I can give you the best help.',
      'For sure, dude. The more you tell me, the better I can help you out.'
    ];
    
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  }

  private determineResponseEmotion(messageType: string, emotionalContext: string, intent: string): ConversationResponse['emotion'] {
    if (emotionalContext === 'frustrated') return 'empathetic';
    if (emotionalContext === 'satisfied') return 'celebrating';
    if (messageType === 'greeting') return 'enthusiastic';
    if (messageType === 'confirmation') return 'enthusiastic';
    if (intent === 'create' || intent === 'request') return 'helpful';
    
    return 'helpful';
  }

  private generateContextualSuggestions(topic: string, intent: string, language: string): string[] {
    const isSpanish = language === 'spanish';
    
    if (topic === 'estimate') {
      return isSpanish ? [
        'Crear estimado detallado',
        'Ver materiales disponibles',
        'Calcular costos de mano de obra'
      ] : [
        'Create detailed estimate',
        'View available materials', 
        'Calculate labor costs'
      ];
    }
    
    if (topic === 'contract') {
      return isSpanish ? [
        'Generar contrato profesional',
        'Ver términos estándar',
        'Configurar firma digital'
      ] : [
        'Generate professional contract',
        'View standard terms',
        'Set up digital signature'
      ];
    }
    
    if (topic === 'property') {
      return isSpanish ? [
        'Verificar propiedad',
        'Ver información catastral',
        'Revisar permisos necesarios'
      ] : [
        'Verify property',
        'View cadastral information',
        'Check required permits'
      ];
    }
    
    return isSpanish ? [
      'Generar estimado',
      'Crear contrato',
      'Verificar propiedad'
    ] : [
      'Generate estimate',
      'Create contract',
      'Verify property'
    ];
  }

  private generateIntelligentFollowUps(messageType: string, topic: string, intent: string, language: string): string[] {
    const isSpanish = language === 'spanish';
    
    if (messageType === 'question' && topic === 'estimate') {
      return isSpanish ? [
        '¿Qué tipo de material prefieres?',
        '¿Cuáles son las medidas exactas?',
        '¿Para cuándo necesitas el trabajo?'
      ] : [
        'What type of material do you prefer?',
        'What are the exact measurements?',
        'When do you need the work done?'
      ];
    }
    
    if (messageType === 'request' && intent === 'create') {
      return isSpanish ? [
        '¿Tienes todos los detalles necesarios?',
        '¿Quieres que usemos un formato específico?',
        '¿Hay algún plazo especial para esto?'
      ] : [
        'Do you have all the necessary details?',
        'Want me to use a specific format?',
        'Is there a special deadline for this?'
      ];
    }
    
    return isSpanish ? [
      '¿En qué más puedo ayudarte?',
      '¿Quieres que revisemos algo específico?',
      '¿Hay algo más que necesites aclarar?'
    ] : [
      'What else can I help you with?',
      'Want me to check something specific?',
      'Is there anything else you need clarified?'
    ];
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

  /**
   * 🛡️ MÉTODOS DE SEGURIDAD CRÍTICOS
   */
  private sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // 🚨 DETECTAR Y FILTRAR INFORMACIÓN SENSIBLE
    let sanitized = input;
    const originalInput = input;
    
    // Filtrar números de tarjeta de crédito
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[TARJETA-FILTRADA]');
    
    // Filtrar SSN
    sanitized = sanitized.replace(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, '[SSN-FILTRADO]');
    
    // Filtrar passwords comunes
    sanitized = sanitized.replace(/\b(password|contraseña|clave|pass)\s*[:=]?\s*\w+/gi, '[CONTRASEÑA-FILTRADA]');
    
    // Filtrar API keys y tokens
    sanitized = sanitized.replace(/\b(sk_live_|pk_live_|AIzaSy|ya29\.|1\/\/)\w+/g, '[API-KEY-FILTRADA]');
    
    // Filtrar emails con passwords
    sanitized = sanitized.replace(/(\w+@\w+\.\w+)\s+(password|contraseña)\s*[:=]?\s*\w+/gi, '$1 [CONTRASEÑA-FILTRADA]');
    
    // Log evento de seguridad si se detectó información sensible
    if (sanitized !== originalInput) {
      console.warn('🛡️ [SECURITY-EVENT] Información sensible detectada y filtrada', {
        timestamp: new Date().toISOString(),
        userId: 'current-user',
        event: 'sensitive_data_filtered',
        inputLength: originalInput.length
      });
    }

    // Prevenir XSS - remover tags peligrosos
    sanitized = sanitized
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<img[^>]*onerror[^>]*>/gi, '')
      .replace(/<svg[^>]*onload[^>]*>/gi, '')
      .replace(/alert\s*\(/gi, 'BLOCKED(')
      .replace(/confirm\s*\(/gi, 'BLOCKED(')
      .replace(/prompt\s*\(/gi, 'BLOCKED(');

    // Prevenir injection - escapar caracteres peligrosos
    sanitized = sanitized
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/\$ne/gi, '')
      .replace(/\$where/gi, '')
      .replace(/DROP/gi, '')
      .replace(/DELETE/gi, '')
      .replace(/UPDATE/gi, '')
      .replace(/INSERT/gi, '');

    // Limitar tamaño para prevenir DoS
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000) + '... [mensaje truncado por seguridad]';
    }

    return sanitized;
  }

  private sanitizeOutput(output: string): string {
    if (!output || typeof output !== 'string') {
      return '';
    }

    // Asegurar que la respuesta no contenga scripts maliciosos
    return output
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Obtener estado seguro (para testing)
   */
  getState(): ConversationState {
    return { ...this.state };
  }
}

export { ConversationEngine };
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
    // 🛡️ VALIDACIÓN DE SEGURIDAD CRÍTICA
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('🚨 SECURITY: userId is required and cannot be empty');
    }
    
    if (userId === 'null' || userId === 'undefined' || userId.includes('<script') || userId.includes('../')) {
      throw new Error('🚨 SECURITY: Invalid userId format detected');
    }

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
    // 🛡️ SANITIZACIÓN DE SEGURIDAD - Prevenir XSS
    const sanitizedMessage = this.sanitizeInput(userMessage);
    // 1. Detectar idioma y personalidad
    const languageProfile = this.languageDetector.detectLanguage(sanitizedMessage);
    this.updateLanguageProfile(languageProfile);

    // 2. Detectar emoción del usuario
    const userEmotion = this.languageDetector.detectUserEmotion(sanitizedMessage);
    this.state.userEmotion = userEmotion;

    // 3. Analizar contexto conversacional
    const conversationContext = this.analyzeConversationContext(sanitizedMessage);

    // 4. Generar respuesta contextual
    const response = await this.generateContextualResponse(
      sanitizedMessage,
      languageProfile,
      userEmotion,
      conversationContext
    );

    // 🛡️ SANITIZACIÓN DE SALIDA - Prevenir XSS en respuestas
    response.message = this.sanitizeOutput(response.message);

    // 5. Actualizar historial
    this.updateConversationHistory(sanitizedMessage, response.message, languageProfile, userEmotion);

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
    const { language } = languageProfile;
    const { messageType, intent, topic, emotionalContext } = context.entities;
    
    let baseResponse = '';
    let emotion: ConversationResponse['emotion'] = 'helpful';
    let suggestedActions: string[] = [];
    let followUpQuestions: string[] = [];

    // Generar respuesta específica basada en análisis contextual
    baseResponse = this.generateSpecificResponse(userMessage, messageType, intent, topic, emotionalContext, language);
    
    // Ajustar emoción de respuesta
    emotion = this.determineResponseEmotion(messageType, emotionalContext, intent);
    
    // Generar sugerencias contextuales específicas
    suggestedActions = this.generateContextualSuggestions(topic, intent, language);
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
    
    // Saludos
    if (message.includes('hola') || message.includes('hello') || message.includes('hi') ||
        message.includes('buenos días') || message.includes('good morning') || message.includes('hey')) {
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
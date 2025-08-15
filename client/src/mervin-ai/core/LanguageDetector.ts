/**
 * LANGUAGE DETECTOR - DETECCIÓN AUTOMÁTICA DE IDIOMA Y PERSONALIDAD
 * 
 * Sistema inteligente que detecta el idioma del usuario automáticamente
 * y adapta la personalidad de Mervin AI según las preferencias:
 * - Español: Estilo mexicano norteño (primo, amable, familiar)
 * - Inglés: Estilo californiano (casual, friendly, laid-back)
 * - Otros idiomas: Adaptación inteligente
 */

export interface LanguageProfile {
  language: 'spanish' | 'english' | 'mixed' | 'other';
  confidence: number;
  region?: 'mexican' | 'californian' | 'neutral';
  personalityStyle: PersonalityStyle;
  detectedPhrases: string[];
}

export interface PersonalityStyle {
  greetings: string[];
  farewells: string[];
  affirmations: string[];
  empathy: string[];
  excitement: string[];
  questions: string[];
  transitions: string[];
  casualPhrases: string[];
  formalPhrases: string[];
}

export class LanguageDetector {
  private spanishKeywords = [
    'hola', 'que', 'como', 'estas', 'ayuda', 'necesito', 'quiero', 'puedes', 'favor',
    'gracias', 'por', 'para', 'con', 'sin', 'muy', 'bueno', 'malo', 'grande', 'pequeño',
    'casa', 'trabajo', 'dinero', 'tiempo', 'día', 'noche', 'sí', 'no', 'tal', 'vez',
    'primo', 'amigo', 'hermano', 'compadre', 'oye', 'órale', 'ándale'
  ];

  private mexicanPhrases = [
    'primo', 'compadre', 'órale', 'ándale', 'qué onda', 'está padrísimo', 'está chido',
    'no manches', 'está padre', 'qué tal', 'órale pues', 'simón', 'nel', 'arre'
  ];

  private englishKeywords = [
    'hello', 'hi', 'what', 'how', 'are', 'you', 'help', 'need', 'want', 'can', 'please',
    'thanks', 'thank', 'good', 'bad', 'great', 'nice', 'work', 'time', 'day', 'night',
    'yes', 'no', 'maybe', 'sure', 'cool', 'awesome', 'dude', 'bro', 'buddy'
  ];

  private californianPhrases = [
    'dude', 'bro', 'totally', 'awesome', 'cool', 'rad', 'gnarly', 'stoked', 'chill',
    'no worries', 'for sure', 'right on', 'sweet', 'sick', 'tight', 'fresh'
  ];

  // Personalidades predefinidas
  private mexicanPersonality: PersonalityStyle = {
    greetings: [
      '¡Órale, primo! ¿Qué tal?',
      '¡Qué onda! ¿Cómo andas?',
      '¡Hola, compadre! ¿Todo bien?',
      '¡Ey, primo! ¿En qué te ayudo?',
      '¡Qué tal, hermano! ¿Cómo está la cosa?'
    ],
    farewells: [
      '¡Ándale pues, primo! Aquí andamos.',
      '¡Órale! Cualquier cosa me dices.',
      '¡Está padrísimo! Nos vemos, compadre.',
      '¡Sale y vale! Que esté bien chido todo.',
      '¡Simón! Aquí andamos para lo que necesites.'
    ],
    affirmations: [
      '¡Simón, primo!',
      '¡Órale, está padrísimo!',
      '¡Ándale! Eso está chido.',
      '¡Perfecto, compadre!',
      '¡Está padre! Le damos.'
    ],
    empathy: [
      'Óyeme, primo, te entiendo perfectamente.',
      'No te preocupes, compadre, aquí andamos para ayudarte.',
      'Entiendo la situación, hermano. Vamos a resolverlo.',
      'No hay pedo, primo. Lo vamos a arreglar.',
      'Tranquilo, compadre. Todo tiene solución.'
    ],
    excitement: [
      '¡No manches! ¡Está padrísimo!',
      '¡Órale! ¡Qué chido!',
      '¡Ándale! ¡Eso está de lujo!',
      '¡Simón! ¡Está de pelos!',
      '¡Está padre! ¡Dale que dale!'
    ],
    questions: [
      '¿Qué necesitas, primo?',
      '¿En qué te echo la mano, compadre?',
      '¿Cómo le hacemos, hermano?',
      '¿Qué se te ofrece?',
      '¿Por dónde empezamos, primo?'
    ],
    transitions: [
      'Órale pues, ',
      'Ándale, ',
      'Simón, ',
      'Está bien, primo, ',
      'Perfecto, compadre, '
    ],
    casualPhrases: [
      'está chido',
      'está padre',
      'está padrísimo',
      'no hay pedo',
      'órale pues',
      'ándale',
      'simón',
      'primo',
      'compadre'
    ],
    formalPhrases: [
      'con mucho gusto',
      'será un placer',
      'por supuesto',
      'desde luego',
      'sin problema alguno'
    ]
  };

  private californianPersonality: PersonalityStyle = {
    greetings: [
      'Hey there, dude! What\'s up?',
      'Yo! How\'s it going, bro?',
      'Hey! What can I do for you today?',
      'What\'s good! How are things?',
      'Sup! How can I help you out?'
    ],
    farewells: [
      'Awesome! Catch you later, dude!',
      'Cool! Hit me up anytime, bro!',
      'Sweet! Talk to you soon!',
      'Right on! Take it easy!',
      'For sure! Have a rad day!'
    ],
    affirmations: [
      'Totally!',
      'For sure, dude!',
      'Absolutely, bro!',
      'Right on!',
      'Sweet! I got you.'
    ],
    empathy: [
      'I totally get it, dude.',
      'No worries, bro. I\'m here to help.',
      'I feel you. Let\'s figure this out.',
      'Totally understand. We\'ll get this sorted.',
      'I hear you. Let\'s make this happen.'
    ],
    excitement: [
      'Dude, that\'s awesome!',
      'Sweet! That\'s rad!',
      'Totally stoked about this!',
      'That\'s so cool, bro!',
      'Right on! That\'s gnarly!'
    ],
    questions: [
      'What do you need, dude?',
      'How can I help you out, bro?',
      'What\'s the plan?',
      'What are we working on?',
      'What can I do for you?'
    ],
    transitions: [
      'Cool, so ',
      'Alright, ',
      'Sweet, ',
      'Right on, ',
      'Awesome, '
    ],
    casualPhrases: [
      'totally',
      'for sure',
      'no worries',
      'right on',
      'sweet',
      'cool',
      'awesome',
      'rad',
      'dude',
      'bro'
    ],
    formalPhrases: [
      'absolutely',
      'certainly',
      'of course',
      'definitely',
      'without a doubt'
    ]
  };

  /**
   * Detectar idioma y estilo del mensaje del usuario
   */
  detectLanguage(message: string): LanguageProfile {
    const normalizedMessage = message.toLowerCase().trim();
    const words = normalizedMessage.split(/\s+/);
    
    let spanishScore = 0;
    let englishScore = 0;
    let mexicanScore = 0;
    let californianScore = 0;
    
    const detectedPhrases: string[] = [];

    // Contar palabras en español
    words.forEach(word => {
      if (this.spanishKeywords.includes(word)) {
        spanishScore++;
      }
      if (this.englishKeywords.includes(word)) {
        englishScore++;
      }
    });

    // Detectar frases mexicanas
    this.mexicanPhrases.forEach(phrase => {
      if (normalizedMessage.includes(phrase)) {
        mexicanScore += 2;
        spanishScore += 1;
        detectedPhrases.push(phrase);
      }
    });

    // Detectar frases californianas
    this.californianPhrases.forEach(phrase => {
      if (normalizedMessage.includes(phrase)) {
        californianScore += 2;
        englishScore += 1;
        detectedPhrases.push(phrase);
      }
    });

    // Determinar idioma predominante
    const totalWords = words.length;
    const spanishRatio = spanishScore / totalWords;
    const englishRatio = englishScore / totalWords;

    let language: 'spanish' | 'english' | 'mixed' | 'other';
    let confidence: number;
    let region: 'mexican' | 'californian' | 'neutral' | undefined;
    let personalityStyle: PersonalityStyle;

    if (spanishRatio > englishRatio && spanishRatio > 0.2) {
      language = 'spanish';
      confidence = Math.min(spanishRatio * 2, 1);
      region = mexicanScore > 0 ? 'mexican' : 'neutral';
      personalityStyle = this.mexicanPersonality;
    } else if (englishRatio > spanishRatio && englishRatio > 0.2) {
      language = 'english';
      confidence = Math.min(englishRatio * 2, 1);
      region = californianScore > 0 ? 'californian' : 'neutral';
      personalityStyle = this.californianPersonality;
    } else if (spanishRatio > 0.1 && englishRatio > 0.1) {
      language = 'mixed';
      confidence = 0.7;
      region = mexicanScore > californianScore ? 'mexican' : 'californian';
      personalityStyle = mexicanScore > californianScore ? this.mexicanPersonality : this.californianPersonality;
    } else {
      language = 'other';
      confidence = 0.5;
      region = 'neutral';
      personalityStyle = this.mexicanPersonality; // Default a mexicano
    }

    return {
      language,
      confidence,
      region,
      personalityStyle,
      detectedPhrases
    };
  }

  /**
   * Obtener saludo personalizado según el idioma detectado
   */
  getPersonalizedGreeting(languageProfile: LanguageProfile): string {
    const { personalityStyle } = languageProfile;
    const randomGreeting = personalityStyle.greetings[
      Math.floor(Math.random() * personalityStyle.greetings.length)
    ];
    return randomGreeting;
  }

  /**
   * Adaptar respuesta según personalidad
   */
  adaptResponse(response: string, languageProfile: LanguageProfile, context: 'casual' | 'formal' = 'casual'): string {
    const { personalityStyle, language } = languageProfile;
    
    // Agregar transición personalizada
    const transition = personalityStyle.transitions[
      Math.floor(Math.random() * personalityStyle.transitions.length)
    ];

    // Seleccionar frases según contexto
    const phrases = context === 'casual' 
      ? personalityStyle.casualPhrases 
      : personalityStyle.formalPhrases;

    // Agregar frase característica al final si es apropiado
    const casualPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    // Construir respuesta adaptada
    let adaptedResponse = `${transition}${response}`;
    
    // Agregar toque personal al final para mensajes largos
    if (response.length > 100) {
      if (language === 'spanish') {
        adaptedResponse += ` ¡Está ${casualPhrase}!`;
      } else if (language === 'english') {
        adaptedResponse += ` That's ${casualPhrase}!`;
      }
    }

    return adaptedResponse;
  }

  /**
   * Generar respuesta empática
   */
  generateEmpathyResponse(languageProfile: LanguageProfile): string {
    const { personalityStyle } = languageProfile;
    return personalityStyle.empathy[
      Math.floor(Math.random() * personalityStyle.empathy.length)
    ];
  }

  /**
   * Generar respuesta de entusiasmo
   */
  generateExcitementResponse(languageProfile: LanguageProfile): string {
    const { personalityStyle } = languageProfile;
    return personalityStyle.excitement[
      Math.floor(Math.random() * personalityStyle.excitement.length)
    ];
  }

  /**
   * Generar pregunta de seguimiento
   */
  generateFollowUpQuestion(languageProfile: LanguageProfile): string {
    const { personalityStyle } = languageProfile;
    return personalityStyle.questions[
      Math.floor(Math.random() * personalityStyle.questions.length)
    ];
  }

  /**
   * Detectar si el usuario está frustrado o necesita apoyo
   */
  detectUserEmotion(message: string): 'frustrated' | 'excited' | 'confused' | 'satisfied' | 'neutral' {
    const normalizedMessage = message.toLowerCase();
    
    const frustrationWords = ['no funciona', 'no sirve', 'error', 'problema', 'mal', 'doesn\'t work', 'broken', 'issue', 'wrong'];
    const excitementWords = ['genial', 'excelente', 'perfecto', 'awesome', 'great', 'perfect', 'amazing', 'fantastic'];
    const confusionWords = ['no entiendo', 'confundido', 'cómo', 'confused', 'don\'t understand', 'how'];
    const satisfactionWords = ['gracias', 'perfecto', 'bien', 'thanks', 'good', 'nice', 'works'];

    if (frustrationWords.some(word => normalizedMessage.includes(word))) {
      return 'frustrated';
    } else if (excitementWords.some(word => normalizedMessage.includes(word))) {
      return 'excited';
    } else if (confusionWords.some(word => normalizedMessage.includes(word))) {
      return 'confused';
    } else if (satisfactionWords.some(word => normalizedMessage.includes(word))) {
      return 'satisfied';
    }
    
    return 'neutral';
  }
}

export const languageDetector = new LanguageDetector();
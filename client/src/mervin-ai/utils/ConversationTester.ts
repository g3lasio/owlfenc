/**
 * CONVERSATION TESTER - UTILIDAD PARA PROBAR EL SISTEMA CONVERSACIONAL
 * 
 * Utilidad de desarrollo para probar y validar el sistema de conversación
 * inteligente con diferentes idiomas y personalidades.
 */

import { LanguageDetector, languageDetector } from '../core/LanguageDetector';
import { ConversationEngine } from '../core/ConversationEngine';

export class ConversationTester {
  private languageDetector: LanguageDetector;
  private conversationEngine: ConversationEngine;

  constructor() {
    this.languageDetector = languageDetector;
    this.conversationEngine = new ConversationEngine('test-user');
  }

  /**
   * Probar detección de idiomas y personalidades
   */
  testLanguageDetection() {
    const testMessages = [
      // Español mexicano
      "¡Órale primo! ¿Cómo andas?",
      "Necesito ayuda con un contrato, compadre",
      "¿Puedes generar un estimado para una cerca?",
      "Está padrísimo el sistema, ándale",
      
      // Inglés californiano
      "Hey dude, what's up?",
      "That's totally awesome, bro!",
      "Can you help me with something cool?",
      "No worries, I'm super stoked about this",
      
      // Español formal
      "Buenos días, necesito asistencia",
      "¿Podría ayudarme con un documento?",
      "Gracias por su atención",
      
      // Inglés formal
      "Good morning, I need assistance",
      "Could you help me with a document?",
      "Thank you for your attention",
      
      // Mixto
      "Hello primo, how are you doing today?",
      "Gracias dude, that's very helpful"
    ];

    console.log('🧪 [CONVERSATION-TESTER] Testing language detection...\n');

    testMessages.forEach((message, index) => {
      const profile = this.languageDetector.detectLanguage(message);
      console.log(`Test ${index + 1}: "${message}"`);
      console.log(`  Language: ${profile.language} (${profile.confidence.toFixed(2)} confidence)`);
      console.log(`  Region: ${profile.region}`);
      console.log(`  Detected phrases: [${profile.detectedPhrases.join(', ')}]`);
      console.log('');
    });
  }

  /**
   * Probar respuestas conversacionales
   */
  async testConversationalResponses() {
    const testScenarios = [
      {
        message: "¡Órale primo! Necesito generar un estimado",
        emotion: "excited" as const
      },
      {
        message: "Hey dude, can you help me create a contract?",
        emotion: "neutral" as const
      },
      {
        message: "No funciona nada, esto está mal",
        emotion: "frustrated" as const
      },
      {
        message: "Awesome! That worked perfectly, bro!",
        emotion: "satisfied" as const
      },
      {
        message: "No entiendo cómo hacer esto",
        emotion: "confused" as const
      }
    ];

    console.log('🧪 [CONVERSATION-TESTER] Testing conversational responses...\n');

    for (const scenario of testScenarios) {
      try {
        const response = await this.conversationEngine.processUserMessage(scenario.message);
        console.log(`Input: "${scenario.message}"`);
        console.log(`Detected Language: ${response.languageProfile.language}`);
        console.log(`Response Emotion: ${response.emotion}`);
        console.log(`Response: "${response.message}"`);
        console.log('---');
      } catch (error) {
        console.error(`Error testing scenario: ${scenario.message}`, error);
      }
    }
  }

  /**
   * Probar mensajes de bienvenida
   */
  testWelcomeMessages() {
    console.log('🧪 [CONVERSATION-TESTER] Testing welcome messages...\n');

    // Probar en español
    const spanishWelcomeAgent = this.conversationEngine.generateWelcomeMessage(true);
    const spanishWelcomeLegacy = this.conversationEngine.generateWelcomeMessage(false);

    console.log('Spanish Agent Mode Welcome:');
    console.log(spanishWelcomeAgent);
    console.log('\nSpanish Legacy Mode Welcome:');
    console.log(spanishWelcomeLegacy);

    // Cambiar a inglés simulando detección de idioma
    this.conversationEngine['state'].currentLanguageProfile = {
      language: 'english',
      confidence: 0.9,
      region: 'californian',
      personalityStyle: this.languageDetector['californianPersonality'],
      detectedPhrases: ['dude']
    };

    const englishWelcomeAgent = this.conversationEngine.generateWelcomeMessage(true);
    const englishWelcomeLegacy = this.conversationEngine.generateWelcomeMessage(false);

    console.log('\n\nEnglish Agent Mode Welcome:');
    console.log(englishWelcomeAgent);
    console.log('\nEnglish Legacy Mode Welcome:');
    console.log(englishWelcomeLegacy);
  }

  /**
   * Ejecutar todas las pruebas
   */
  async runAllTests() {
    console.log('🚀 [CONVERSATION-TESTER] Starting comprehensive tests...\n');
    
    this.testLanguageDetection();
    await this.testConversationalResponses();
    this.testWelcomeMessages();
    
    console.log('\n✅ [CONVERSATION-TESTER] All tests completed!');
  }
}

// Función auxiliar para ejecutar pruebas en desarrollo
export function runConversationTests() {
  if (process.env.NODE_ENV === 'development') {
    const tester = new ConversationTester();
    tester.runAllTests();
  }
}

export default ConversationTester;
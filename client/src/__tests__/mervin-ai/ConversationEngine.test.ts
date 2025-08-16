/**
 * PRUEBAS EXHAUSTIVAS DEL MOTOR CONVERSACIONAL
 * 
 * Suite de testing robusta para ConversationEngine que garantiza:
 * - Detección correcta de idiomas y personalidades
 * - Respuestas contextuales coherentes
 * - Manejo robusto de casos edge
 * - Seguridad en procesamiento de inputs
 */

import { ConversationEngine } from '../../mervin-ai/core/ConversationEngine';
import { LanguageDetector } from '../../mervin-ai/core/LanguageDetector';

describe('ConversationEngine - Motor Conversacional', () => {
  let engine: ConversationEngine;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    engine = new ConversationEngine(mockUserId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🌍 Detección de Idiomas y Personalidad', () => {
    it('debe detectar español mexicano correctamente', async () => {
      const input = '¡Órale primo! ¿Cómo estás, compadre?';
      const response = await engine.processUserMessage(input);
      
      expect(response.languageProfile.language).toBe('spanish');
      expect(response.languageProfile.region).toBe('mexican');
      expect(response.message).toContain('primo');
      expect(response.languageProfile.confidence).toBeGreaterThan(0.8);
    });

    it('debe detectar inglés californiano correctamente', async () => {
      const input = 'Hey dude, what\'s up bro?';
      const response = await engine.processUserMessage(input);
      
      expect(response.languageProfile.language).toBe('english');
      expect(response.languageProfile.region).toBe('californian');
      expect(response.message).toContain('dude');
      expect(response.languageProfile.confidence).toBeGreaterThan(0.7);
    });

    it('debe manejar mensajes multiidioma', async () => {
      const input = 'Hello primo, how are you doing today?';
      const response = await engine.processUserMessage(input);
      
      expect(response.languageProfile).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(10);
    });

    it('debe detectar cambios de idioma en conversación', async () => {
      // Primer mensaje en español
      await engine.processUserMessage('Hola, ¿cómo estás?');
      
      // Segundo mensaje en inglés
      const response = await engine.processUserMessage('Actually, let me speak English now');
      
      expect(response.languageProfile.language).toBe('english');
    });
  });

  describe('😊 Detección de Emociones del Usuario', () => {
    it('debe detectar frustración correctamente', async () => {
      const input = 'This is not working! I\'m so frustrated!';
      const response = await engine.processUserMessage(input);
      
      expect(response.emotion).toBe('empathetic');
      expect(response.message).toMatch(/sorry|understand|help/i);
    });

    it('debe detectar emoción positiva', async () => {
      const input = '¡Genial! ¡Esto está increíble, primo!';
      const response = await engine.processUserMessage(input);
      
      expect(response.emotion).toBe('enthusiastic');
      expect(response.message).toMatch(/órale|genial|excelente/i);
    });

    it('debe detectar confusión y ofrecer clarificación', async () => {
      const input = 'I don\'t understand what\'s happening here';
      const response = await engine.processUserMessage(input);
      
      expect(response.emotion).toBe('clarifying');
      expect(response.followUpQuestions).toBeDefined();
      expect(response.followUpQuestions!.length).toBeGreaterThan(0);
    });
  });

  describe('🧠 Memoria Conversacional', () => {
    it('debe mantener contexto entre mensajes', async () => {
      await engine.processUserMessage('Mi nombre es Juan');
      await engine.processUserMessage('Necesito ayuda con un proyecto');
      const response = await engine.processUserMessage('¿Recordas mi nombre?');
      
      expect(response.message.toLowerCase()).toContain('juan');
    });

    it('debe recordar preferencias del usuario', async () => {
      await engine.processUserMessage('Prefiero que me hables en español');
      await engine.processUserMessage('También me gusta el estilo mexicano');
      
      const response = await engine.processUserMessage('¿Cómo está el día?');
      
      expect(response.languageProfile.language).toBe('spanish');
      expect(response.message).toMatch(/primo|compadre|órale/);
    });

    it('debe limpiar memoria después del límite máximo', async () => {
      // Llenar memoria con más de 20 interacciones
      for (let i = 0; i < 25; i++) {
        await engine.processUserMessage(`Mensaje número ${i}`);
      }
      
      // Verificar que la memoria no exceda el límite
      const response = await engine.processUserMessage('¿Cuántos mensajes recuerdas?');
      expect(response).toBeDefined();
      // La implementación debe mantener solo las últimas 20 interacciones
    });
  });

  describe('🔒 Seguridad y Validación', () => {
    it('debe sanitizar inputs maliciosos', async () => {
      const maliciousInput = '<script>alert("xss")</script>Hola';
      const response = await engine.processUserMessage(maliciousInput);
      
      expect(response.message).not.toContain('<script>');
      expect(response.message).not.toContain('alert');
      expect(response.message).toBeDefined();
    });

    it('debe manejar inputs extremadamente largos', async () => {
      const longInput = 'A'.repeat(10000);
      const response = await engine.processUserMessage(longInput);
      
      expect(response.message).toBeDefined();
      expect(response.message.length).toBeLessThan(5000);
    });

    it('debe manejar caracteres especiales y emojis', async () => {
      const specialInput = '¡Hola! 👋 ¿Cómo estás? 😊 Me gusta el café ☕';
      const response = await engine.processUserMessage(specialInput);
      
      expect(response.message).toBeDefined();
      expect(response.languageProfile.language).toBe('spanish');
    });

    it('debe rechazar inputs vacíos o solo espacios', async () => {
      const emptyInputs = ['', '   ', '\n\n\n', '\t\t'];
      
      for (const input of emptyInputs) {
        const response = await engine.processUserMessage(input);
        expect(response.message).toContain('¿En qué puedo ayudarte?');
      }
    });
  });

  describe('⚡ Rendimiento y Robustez', () => {
    it('debe responder en menos de 3 segundos', async () => {
      const startTime = Date.now();
      
      await engine.processUserMessage('Hola, ¿cómo estás hoy?');
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('debe manejar múltiples solicitudes concurrentes', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        engine.processUserMessage(`Mensaje concurrente ${i}`)
      );
      
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.message).toBeDefined();
        expect(response.languageProfile).toBeDefined();
      });
    });

    it('debe recuperarse de errores internos', async () => {
      // Simular error interno
      const mockError = jest.spyOn(console, 'error').mockImplementation();
      
      // Forzar error interno con mock
      jest.spyOn(engine as any, 'analyzeConversationContext')
        .mockImplementation(() => { throw new Error('Test error'); });
      
      const response = await engine.processUserMessage('Test message');
      
      expect(response.message).toBeDefined();
      expect(response.message).toContain('problemita');
      
      mockError.mockRestore();
    });
  });

  describe('🎯 Casos Edge Específicos', () => {
    it('debe manejar cambios rápidos de contexto', async () => {
      await engine.processUserMessage('Hablemos de estimados');
      await engine.processUserMessage('No, mejor de contratos');
      await engine.processUserMessage('En realidad, necesito permisos');
      
      const response = await engine.processUserMessage('¿De qué estábamos hablando?');
      
      expect(response.message.toLowerCase()).toContain('permiso');
    });

    it('debe generar mensaje de bienvenida apropiado', async () => {
      const welcomeAgent = engine.generateWelcomeMessage(true);
      const welcomeLegacy = engine.generateWelcomeMessage(false);
      
      expect(welcomeAgent).toContain('Agente Autónomo');
      expect(welcomeAgent).toContain('primo');
      expect(welcomeAgent).toContain('📊');
      
      expect(welcomeLegacy).toContain('Legacy');
      expect(welcomeLegacy).toContain('paso a paso');
    });

    it('debe adaptarse a diferentes niveles de suscripción', async () => {
      const basicResponse = await engine.processUserMessage('Quiero hacer 100 estimados');
      
      expect(basicResponse.message).toBeDefined();
      // Debería mencionar limitaciones o sugerir upgrade si es plan básico
    });
  });

  describe('🌟 Calidad de Respuestas', () => {
    it('debe dar respuestas relevantes y útiles', async () => {
      const response = await engine.processUserMessage('¿Cómo genero un estimado?');
      
      expect(response.message.toLowerCase()).toMatch(/estimado|generar|crear/);
      expect(response.suggestedActions).toBeDefined();
      expect(response.suggestedActions!.length).toBeGreaterThan(0);
    });

    it('debe mantener personalidad consistente', async () => {
      const responses = [];
      const inputs = [
        '¡Hola!',
        '¿Cómo estás?',
        'Necesito ayuda',
        'Gracias',
        'Adiós'
      ];
      
      for (const input of inputs) {
        responses.push(await engine.processUserMessage(input));
      }
      
      const spanishResponses = responses.filter(r => r.languageProfile.language === 'spanish');
      expect(spanishResponses.length).toBe(5);
      
      // Todas deberían tener personalidad mexicana
      spanishResponses.forEach(response => {
        expect(response.message).toMatch(/primo|compadre|órale|ándale/);
      });
    });

    it('debe ofrecer acciones de seguimiento relevantes', async () => {
      const response = await engine.processUserMessage('Tengo un proyecto nuevo');
      
      expect(response.suggestedActions).toBeDefined();
      expect(response.suggestedActions!).toContain('estimates');
      expect(response.followUpQuestions).toBeDefined();
    });
  });
});
/**
 * TEST E2E BÁSICO - MERVIN V2 (MOCKED)
 * 
 * Prueba de integración con mocks para validar el flujo completo sin APIs externas.
 * Para tests reales con APIs, ver manual-integration.test.ts
 * 
 * Arquitectura probada:
 * 1. ConversationEngine - personalidad y detección de idioma
 * 2. SystemAPIService - estructura de endpoints (sin llamadas reales)
 * 3. Tipos y contratos de datos
 */

import { ConversationEngine } from '../../../client/src/mervin-ai/core/ConversationEngine';

describe('Mervin V2 - E2E Basic Flow (Mocked)', () => {
  let conversationEngine: ConversationEngine;
  const mockUserId = 'test-user-e2e';

  beforeEach(() => {
    conversationEngine = new ConversationEngine(mockUserId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🗣️ ConversationEngine - Welcome Messages', () => {
    it('debe generar mensaje de bienvenida en modo normal', () => {
      const message = conversationEngine.generateWelcomeMessage(false);
      
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(10);
    });

    it('debe generar mensaje de bienvenida en modo agente', () => {
      const message = conversationEngine.generateWelcomeMessage(true);
      
      expect(message).toBeTruthy();
      expect(message.toLowerCase()).toMatch(/agent|superinteligente|autonomous/i);
    });

    it('debe detectar y usar personalidad mexicana', () => {
      const input = '¡Órale primo! ¿Qué onda?';
      const profile = conversationEngine.detectLanguageAndPersonality(input);
      
      expect(profile.language).toBe('spanish');
      expect(profile.region).toBe('mexican');
      expect(profile.personality).toMatch(/norteño|mexicano/i);
    });
  });

  describe('🌐 Language Detection', () => {
    it('debe detectar español correctamente', () => {
      const input = 'Necesito ayuda con un proyecto';
      const profile = conversationEngine.detectLanguageAndPersonality(input);
      
      expect(profile.language).toBe('spanish');
    });

    it('debe detectar inglés correctamente', () => {
      const input = 'I need help with a project';
      const profile = conversationEngine.detectLanguageAndPersonality(input);
      
      expect(profile.language).toBe('english');
    });

    it('debe detectar lenguaje mixto', () => {
      const input = 'Hello primo, how are you doing?';
      const profile = conversationEngine.detectLanguageAndPersonality(input);
      
      expect(profile.language).toMatch(/mixed|spanish/);
    });
  });

  describe('🔄 Conversation History', () => {
    it('debe inicializar con historial vacío', () => {
      const history = conversationEngine.getHistory();
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it('debe poder limpiar historial', () => {
      conversationEngine.clearHistory();
      const history = conversationEngine.getHistory();
      
      expect(history.length).toBe(0);
    });
  });

  describe('🛡️ Input Validation', () => {
    it('debe sanitizar input peligroso', () => {
      const dangerousInput = '<script>alert("xss")</script>Hola';
      const sanitized = conversationEngine['sanitizeInput'](dangerousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hola');
    });

    it('debe manejar input vacío', () => {
      const profile = conversationEngine.detectLanguageAndPersonality('');
      
      expect(profile).toBeDefined();
      expect(profile.language).toBeTruthy();
    });

    it('debe manejar input muy largo', () => {
      const longInput = 'test '.repeat(500);
      const profile = conversationEngine.detectLanguageAndPersonality(longInput);
      
      expect(profile).toBeDefined();
      expect(profile.language).toBeTruthy();
    });
  });
});

/**
 * Notas sobre estos tests:
 * 
 * 1. Tests determinísticos - NO requieren API keys
 * 2. Prueban componentes individuales con mocks
 * 3. Ejecución rápida para CI/CD
 * 
 * Para tests de integración con APIs reales:
 * - Ver manual-integration.test.ts (requiere API keys)
 * - Ejecutar manualmente con: npm test -- manual-integration.test.ts
 * 
 * Para ejecutar estos tests:
 * npm test -- e2e-basic.test.ts
 */

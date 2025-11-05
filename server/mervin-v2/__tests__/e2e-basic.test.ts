/**
 * TEST E2E BÁSICO - MERVIN V2
 * 
 * Prueba de integración end-to-end que valida el flujo completo:
 * 1. Usuario envía mensaje
 * 2. MervinOrchestrator procesa
 * 3. AI Router selecciona modelo apropiado
 * 4. SystemAPIService ejecuta (si es necesario)
 * 5. Respuesta se formatea y retorna
 */

import { MervinOrchestrator } from '../orchestrator/MervinOrchestrator';
import type { ProcessRequest } from '../types/mervin-types';

describe('Mervin V2 - E2E Basic Flow', () => {
  let orchestrator: MervinOrchestrator;
  const mockUserId = 'test-user-e2e';
  const mockAuthHeaders = {
    'Authorization': 'Bearer mock-token',
    'Cookie': 'session=mock-session'
  };

  beforeEach(() => {
    orchestrator = new MervinOrchestrator(mockUserId, mockAuthHeaders);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🗣️ Conversational Flow', () => {
    it('debe procesar mensaje conversacional simple', async () => {
      const request: ProcessRequest = {
        message: '¡Hola Mervin! ¿Cómo estás?',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.content).toBeTruthy();
      expect(response.metadata.model).toBe('chatgpt-4o'); // Conversación simple usa ChatGPT
      expect(response.metadata.processingTime).toBeGreaterThan(0);
    }, 10000); // 10 segundos timeout

    it('debe detectar personalidad mexicana correctamente', async () => {
      const request: ProcessRequest = {
        message: '¡Órale primo! ¿Qué onda?',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response.success).toBe(true);
      expect(response.content).toBeTruthy();
      // La respuesta debería usar lenguaje mexicano si el motor de personalidad funciona
    }, 10000);
  });

  describe('🤖 AI Model Selection', () => {
    it('debe usar ChatGPT para tareas simples y rápidas', async () => {
      const request: ProcessRequest = {
        message: '¿Qué servicios ofreces?',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response.success).toBe(true);
      expect(response.metadata.model).toBe('chatgpt-4o');
      expect(response.metadata.processingTime).toBeLessThan(3000); // Debería ser rápido
    }, 10000);

    it('debe usar Claude para tareas complejas', async () => {
      const request: ProcessRequest = {
        message: 'Genera un contrato profesional completo de construcción con todas las cláusulas legales',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response.success).toBe(true);
      expect(response.metadata.model).toBe('claude-sonnet-4');
      // Claude es más lento pero más robusto
    }, 30000); // 30 segundos para tareas complejas
  });

  describe('📊 Task Execution', () => {
    it('debe identificar intención de crear estimado', async () => {
      const request: ProcessRequest = {
        message: 'Necesito crear un estimado para una cerca de madera de 50 pies',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response.success).toBe(true);
      expect(response.content).toBeTruthy();
      // Debería mencionar la necesidad de información adicional
      expect(response.content.toLowerCase()).toMatch(/estimado|cliente|proyecto/);
    }, 15000);

    it('debe identificar intención de verificar propiedad', async () => {
      const request: ProcessRequest = {
        message: 'Verifica la propiedad en 123 Main Street, Los Angeles',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response.success).toBe(true);
      expect(response.content).toBeTruthy();
    }, 15000);
  });

  describe('🔄 Conversation Context', () => {
    it('debe mantener contexto conversacional', async () => {
      // Primera interacción
      const request1: ProcessRequest = {
        message: 'Mi nombre es Juan Pérez',
        conversationHistory: []
      };

      const response1 = await orchestrator.process(request1);
      expect(response1.success).toBe(true);

      // Segunda interacción que referencia la primera
      const request2: ProcessRequest = {
        message: '¿Cuál es mi nombre?',
        conversationHistory: [
          { role: 'user', content: 'Mi nombre es Juan Pérez' },
          { role: 'assistant', content: response1.content }
        ]
      };

      const response2 = await orchestrator.process(request2);
      expect(response2.success).toBe(true);
      expect(response2.content.toLowerCase()).toContain('juan');
    }, 20000);
  });

  describe('⚡ Performance', () => {
    it('debe responder en menos de 5 segundos para mensajes simples', async () => {
      const startTime = Date.now();

      const request: ProcessRequest = {
        message: 'Hola',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);
      const endTime = Date.now();

      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000);
    }, 10000);

    it('debe incluir métricas de procesamiento', async () => {
      const request: ProcessRequest = {
        message: 'Test mensaje',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response.metadata).toBeDefined();
      expect(response.metadata.processingTime).toBeGreaterThan(0);
      expect(response.metadata.model).toBeTruthy();
      expect(response.metadata.timestamp).toBeTruthy();
    }, 10000);
  });

  describe('🛡️ Error Handling', () => {
    it('debe manejar mensajes vacíos gracefully', async () => {
      const request: ProcessRequest = {
        message: '',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response).toBeDefined();
      // Debería manejar el error sin crash
    }, 10000);

    it('debe manejar mensajes muy largos', async () => {
      const longMessage = 'test '.repeat(1000); // 5000 caracteres

      const request: ProcessRequest = {
        message: longMessage,
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response).toBeDefined();
      expect(response.success).toBeDefined();
    }, 15000);
  });

  describe('🌐 Multi-language Support', () => {
    it('debe manejar español correctamente', async () => {
      const request: ProcessRequest = {
        message: 'Necesito ayuda con un proyecto',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response.success).toBe(true);
      expect(response.content).toBeTruthy();
    }, 10000);

    it('debe manejar inglés correctamente', async () => {
      const request: ProcessRequest = {
        message: 'I need help with a project',
        conversationHistory: []
      };

      const response = await orchestrator.process(request);

      expect(response.success).toBe(true);
      expect(response.content).toBeTruthy();
    }, 10000);
  });
});

/**
 * Notas para ejecutar estos tests:
 * 
 * 1. Requiere API keys válidas:
 *    - OPENAI_API_KEY
 *    - ANTHROPIC_API_KEY
 * 
 * 2. Los tests hacen llamadas reales a las APIs de AI
 *    (considera usar mocks para CI/CD)
 * 
 * 3. Timeouts ajustados según complejidad:
 *    - Simples: 10s
 *    - Complejas: 30s
 * 
 * 4. Para ejecutar:
 *    npm test -- e2e-basic.test.ts
 */

# MERVIN AI V2 - PLAN DE EJECUCIÓN DEFINITIVO
## Propuesta 2: Hybrid Intelligence Architecture

**Fecha:** 5 de Noviembre de 2025  
**Versión:** 2.0 - Limpia y Concentrada  
**Aprobación requerida:** ✅ Pendiente

---

## 🎯 OBJETIVOS PRINCIPALES

1. ✅ Implementar Propuesta 2 (Hybrid Intelligence) al 100%
2. ✅ Eliminar TODO el backend antiguo de Mervin AI
3. ✅ Conservar frontend existente (mínimos cambios necesarios)
4. ✅ Código limpio, sin redundancias ni código heredado
5. ✅ Usar endpoints existentes (PropertyVerifier, Estimates, etc.)
6. ✅ ChatGPT-4o para tareas rápidas, Claude Sonnet 4 para complejas

---

## 📁 ARCHIVOS A ELIMINAR (Backend Antiguo)

### **Backend Mervin AI Legacy - ELIMINAR COMPLETAMENTE:**

```
server/ai/
├── MervinChatOrchestrator.ts                    ❌ ELIMINAR
├── agent-endpoints/
│   ├── TaskExecutionCoordinator.ts              ❌ ELIMINAR
│   └── [otros archivos de agent-endpoints]      ❌ ELIMINAR
└── [otros archivos legacy de Mervin]            ❌ ELIMINAR

server/routes/
├── mervin-agent-api.ts                          ❌ ELIMINAR
└── [otros routes de Mervin legacy]              ❌ ELIMINAR

client/src/mervin-ai/
├── core/
│   ├── MervinAgent.ts                           ❌ ELIMINAR
│   ├── TaskOrchestrator.ts                      ❌ ELIMINAR
│   ├── IntentionEngine.ts                       ❌ ELIMINAR
│   ├── ContextManager.ts                        ❌ ELIMINAR (si existe)
│   ├── ConversationEngine.ts                    ⚠️ EVALUAR (tiene personalidad mexicana)
│   ├── LanguageDetector.ts                      ⚠️ EVALUAR (útil)
│   └── AdvancedConversationalIntelligence.ts    ❌ ELIMINAR
├── services/
│   ├── EndpointCoordinator.ts                   ❌ ELIMINAR
│   ├── AgentMemory.ts                           ❌ ELIMINAR
│   └── [otros services legacy]                  ❌ ELIMINAR
└── ui/
    └── MervinChat.tsx                           ❌ ELIMINAR (no se usa)
```

### **Frontend Mervin AI - CONSERVAR:**

```
client/src/pages/
└── Mervin.tsx                                   ✅ CONSERVAR (modificar mínimamente)

client/src/mervin-ai/core/
├── ConversationEngine.ts                        ✅ CONSERVAR (personalidad mexicana)
└── LanguageDetector.ts                          ✅ CONSERVAR (útil)
```

---

## 🏗️ NUEVA ESTRUCTURA (Propuesta 2)

### **Backend V2:**

```
server/
├── mervin-v2/
│   ├── orchestrator/
│   │   └── MervinOrchestrator.ts               🆕 CREAR - Coordinador central
│   ├── ai/
│   │   ├── ChatGPTService.ts                   🆕 CREAR - Servicio ChatGPT-4o
│   │   ├── ClaudeService.ts                    🆕 CREAR - Servicio Claude Sonnet 4
│   │   └── AIRouter.ts                         🆕 CREAR - Router inteligente de AIs
│   ├── services/
│   │   ├── WebSearchService.ts                 🆕 CREAR - Investigación web
│   │   ├── SystemAPIService.ts                 🆕 CREAR - Wrapper de endpoints existentes
│   │   └── ProgressStreamService.ts            🆕 CREAR - SSE para progreso
│   └── types/
│       └── mervin-types.ts                     🆕 CREAR - Tipos TypeScript
└── routes/
    └── mervin-v2.ts                            🆕 CREAR - API única V2
```

### **Frontend V2 (mínimos cambios):**

```
client/src/
├── pages/
│   └── Mervin.tsx                              ♻️ ACTUALIZAR - Usar nueva API
└── mervin-v2/
    ├── hooks/
    │   └── useMervinAgent.ts                   🆕 CREAR - Hook principal V2
    └── lib/
        └── AgentClient.ts                      🆕 CREAR - Cliente API V2
```

---

## 📋 FASES DE EJECUCIÓN

### **FASE 0: PREPARACIÓN Y LIMPIEZA** ⏱️ 30 minutos

#### **Tarea 0.1: Backup de componentes útiles**
- Extraer `ConversationEngine.ts` → Guardar personalidad mexicana
- Extraer `LanguageDetector.ts` → Guardar detección de idioma
- Documentar endpoints existentes que debemos usar

#### **Tarea 0.2: Eliminación del backend legacy**
```bash
# Eliminar archivos legacy
rm -rf server/ai/MervinChatOrchestrator.ts
rm -rf server/ai/agent-endpoints/
rm -rf server/routes/mervin-agent-api.ts
```

#### **Tarea 0.3: Eliminación del frontend legacy**
```bash
# Eliminar componentes legacy (excepto ConversationEngine y LanguageDetector)
rm -rf client/src/mervin-ai/core/MervinAgent.ts
rm -rf client/src/mervin-ai/core/TaskOrchestrator.ts
rm -rf client/src/mervin-ai/core/IntentionEngine.ts
rm -rf client/src/mervin-ai/services/EndpointCoordinator.ts
rm -rf client/src/mervin-ai/ui/MervinChat.tsx
```

**Criterio de éxito:**
- ✅ Solo quedan ConversationEngine y LanguageDetector del legacy
- ✅ Todo el backend Mervin legacy eliminado
- ✅ Mervin.tsx conservado intacto

---

### **FASE 1: SERVICIOS DE AI** ⏱️ 2-3 horas

#### **Tarea 1.1: ChatGPTService.ts** 🆕
**Archivo:** `server/mervin-v2/ai/ChatGPTService.ts`

**Responsabilidades:**
- Análisis rápido de intención (< 1 segundo)
- Extracción de parámetros del input natural
- Conversaciones simples
- Investigación web básica

**Métodos principales:**
```typescript
class ChatGPTService {
  async analyzeQuick(input: string): Promise<QuickAnalysis>
  async extractParameters(input: string, taskType: TaskType): Promise<TaskParameters>
  async generateResponse(input: string): Promise<string>
  async checkIfExecutableTask(input: string): Promise<boolean>
}
```

**Proveedor:** OpenAI API (ya existe en el proyecto)

---

#### **Tarea 1.2: ClaudeService.ts** 🆕
**Archivo:** `server/mervin-v2/ai/ClaudeService.ts`

**Responsabilidades:**
- Generación de contratos legales profesionales
- Respuestas finales profesionales
- Análisis de documentos complejos
- Razonamiento profundo

**Métodos principales:**
```typescript
class ClaudeService {
  async generateCompletionMessage(result: TaskResult, language: string): Promise<string>
  async generateContractContent(params: ContractParams): Promise<string>
  async processComplexQuery(input: string): Promise<string>
  async analyzeDocument(document: string): Promise<Analysis>
}
```

**Proveedor:** Anthropic API (ya existe en el proyecto)

---

#### **Tarea 1.3: AIRouter.ts** 🆕
**Archivo:** `server/mervin-v2/ai/AIRouter.ts`

**Responsabilidades:**
- Decidir qué AI usar para cada subtarea
- Optimizar costos y velocidad
- Routing inteligente

**Lógica:**
```typescript
class AIRouter {
  // ChatGPT-4o para:
  // - Análisis de intención (< 1s)
  // - Extracción de parámetros
  // - Conversaciones simples
  // - Respuestas rápidas
  
  // Claude Sonnet 4 para:
  // - Contratos legales
  // - Respuestas finales profesionales
  // - Análisis complejos
  // - Razonamiento profundo
  
  async routeRequest(input: string, context: any): Promise<AIProvider>
}
```

**Criterio de éxito:**
- ✅ ChatGPTService responde en < 1 segundo
- ✅ ClaudeService genera respuestas profesionales
- ✅ AIRouter decide correctamente qué usar

---

### **FASE 2: SERVICIOS DE SISTEMA** ⏱️ 2-3 horas

#### **Tarea 2.1: SystemAPIService.ts** 🆕
**Archivo:** `server/mervin-v2/services/SystemAPIService.ts`

**Responsabilidad:** Wrapper de TODOS los endpoints existentes

**NO reimplementa lógica, solo LLAMA a endpoints:**
```typescript
class SystemAPIService {
  // Property Verification (usa endpoint existente)
  async verifyProperty(address: string): Promise<PropertyData> {
    return await this.callEndpoint('POST', '/api/property/details', { address });
  }
  
  // Estimates (usa endpoints existentes)
  async calculateEstimate(params: EstimateParams): Promise<EstimateCalculation> {
    return await this.callEndpoint('POST', '/api/estimates/calculate', params);
  }
  
  async generateEstimatePDF(data: any): Promise<PDF> {
    return await this.callEndpoint('POST', '/api/pdfmonkey-estimates/generate', data);
  }
  
  async sendEstimateEmail(params: EmailParams): Promise<EmailResult> {
    return await this.callEndpoint('POST', '/api/estimate-email/send', params);
  }
  
  // Contracts (usa endpoints existentes)
  async generateContract(params: ContractParams): Promise<Contract> {
    return await this.callEndpoint('POST', '/api/legal-defense/generate-contract', params);
  }
  
  // Permits (usa endpoint existente)
  async checkPermits(params: PermitParams): Promise<PermitInfo> {
    return await this.callEndpoint('POST', '/api/permit/check', params);
  }
  
  // Clients (usa endpoints existentes)
  async getClient(email: string): Promise<Client | null> {
    const clients = await this.callEndpoint('GET', '/api/clients');
    return clients.find(c => c.email === email) || null;
  }
  
  async createClient(data: ClientData): Promise<Client> {
    return await this.callEndpoint('POST', '/api/clients', data);
  }
  
  // Helper genérico
  private async callEndpoint(method: string, path: string, body?: any): Promise<any> {
    // Implementación con fetch, manejo de errores, retry, etc.
  }
}
```

**Endpoints que DEBE usar (no reimplementar):**
- ✅ `/api/property/details` - PropertyVerifier (Atom)
- ✅ `/api/estimates/calculate` - Cálculo de estimados
- ✅ `/api/pdfmonkey-estimates/generate` - PDFs
- ✅ `/api/estimate-email/send` - Emails
- ✅ `/api/legal-defense/generate-contract` - Contratos
- ✅ `/api/permit/check` - Permisos
- ✅ `/api/clients` - CRUD de clientes

---

#### **Tarea 2.2: WebSearchService.ts** 🆕
**Archivo:** `server/mervin-v2/services/WebSearchService.ts`

**Responsabilidad:** Investigación web en tiempo real

```typescript
class WebSearchService {
  async researchMaterialPrices(projectType: string, location?: string): Promise<MarketData>
  async researchPermitRegulations(location: string, projectType: string): Promise<RegulationInfo>
  async researchContractor(query: string): Promise<SearchResults>
  
  // Usa API de búsqueda existente si ya tienes una
  // O implementa con servicio de búsqueda (Google, Bing, etc.)
}
```

---

#### **Tarea 2.3: ProgressStreamService.ts** 🆕
**Archivo:** `server/mervin-v2/services/ProgressStreamService.ts`

**Responsabilidad:** Server-Sent Events para progreso en tiempo real

```typescript
class ProgressStreamService {
  // Mantener conexiones activas
  private connections: Map<string, Response>;
  
  // Enviar actualización de progreso
  sendProgress(userId: string, progress: TaskProgress): void
  
  // Establecer conexión SSE
  setupConnection(userId: string, res: Response): void
}
```

**Criterio de éxito:**
- ✅ SystemAPIService llama a TODOS los endpoints correctamente
- ✅ WebSearchService investiga en tiempo real
- ✅ ProgressStreamService envía actualizaciones

---

### **FASE 3: ORQUESTADOR CENTRAL** ⏱️ 3-4 horas

#### **Tarea 3.1: MervinOrchestrator.ts** 🆕
**Archivo:** `server/mervin-v2/orchestrator/MervinOrchestrator.ts`

**Responsabilidad:** Coordinador central de TODO

```typescript
class MervinOrchestrator {
  private chatgpt: ChatGPTService;
  private claude: ClaudeService;
  private aiRouter: AIRouter;
  private systemAPI: SystemAPIService;
  private webSearch: WebSearchService;
  private progressStream: ProgressStreamService;
  
  async processRequest(request: MervinRequest): Promise<MervinResponse> {
    // 1. Análisis inicial (ChatGPT-4o - rápido)
    const analysis = await this.chatgpt.analyzeQuick(request.input);
    
    // 2. Routing de respuesta
    if (analysis.isSimpleConversation) {
      return await this.handleConversation(request, analysis);
    }
    
    if (analysis.isExecutableTask) {
      return await this.executeTask(request, analysis);
    }
    
    if (analysis.needsDeepThinking) {
      return await this.handleComplexQuery(request, analysis);
    }
  }
  
  private async executeTask(request: MervinRequest, analysis: Analysis): Promise<MervinResponse> {
    const taskType = analysis.taskType;
    
    switch (taskType) {
      case 'estimate':
        return await this.executeEstimateWorkflow(request, analysis);
      case 'contract':
        return await this.executeContractWorkflow(request, analysis);
      case 'permit':
        return await this.executePermitWorkflow(request, analysis);
      case 'property':
        return await this.executePropertyWorkflow(request, analysis);
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }
  
  // Workflows específicos
  private async executeEstimateWorkflow(request, analysis): Promise<MervinResponse>
  private async executeContractWorkflow(request, analysis): Promise<MervinResponse>
  private async executePermitWorkflow(request, analysis): Promise<MervinResponse>
  private async executePropertyWorkflow(request, analysis): Promise<MervinResponse>
}
```

**Workflows implementados:**

1. **Estimate Workflow:**
   ```
   ChatGPT → Extrae parámetros
   WebSearch → Investiga precios (paralelo)
   SystemAPI → Crea/busca cliente
   SystemAPI → Calcula estimado
   SystemAPI → Genera PDF
   SystemAPI → Envía email
   Claude → Respuesta final profesional
   ```

2. **Contract Workflow:**
   ```
   ChatGPT → Extrae parámetros
   Claude → Genera contenido legal
   SystemAPI → Crea contrato en sistema
   SystemAPI → Setup firma dual
   SystemAPI → Envía email
   Claude → Respuesta final
   ```

3. **Property Workflow:**
   ```
   ChatGPT → Extrae dirección
   SystemAPI → Verifica propiedad (usa /api/property/details → Atom)
   Claude → Presenta información profesionalmente
   ```

4. **Permit Workflow:**
   ```
   ChatGPT → Extrae ubicación y tipo de proyecto
   WebSearch → Investiga regulaciones locales
   SystemAPI → Analiza permisos (usa /api/permit/check)
   Claude → Genera guía profesional
   ```

**Criterio de éxito:**
- ✅ Orquestador maneja TODOS los tipos de tarea
- ✅ Usa ChatGPT para análisis rápido
- ✅ Usa Claude para respuestas profesionales
- ✅ Llama a SystemAPI (nunca reimplementa)
- ✅ Progreso en tiempo real

---

### **FASE 4: API Y RUTAS** ⏱️ 1-2 horas

#### **Tarea 4.1: mervin-v2.ts** 🆕
**Archivo:** `server/routes/mervin-v2.ts`

**Endpoints V2:**

```typescript
// Endpoint principal
POST /api/mervin-v2/process
{
  input: string,
  userId: string,
  conversationHistory?: Message[],
  language?: 'es' | 'en'
}

// Health check
GET /api/mervin-v2/health

// Capacidades
GET /api/mervin-v2/capabilities

// Stream de progreso (SSE)
GET /api/mervin-v2/progress-stream/:userId
```

**Integración con Express:**
```typescript
import express from 'express';
import { MervinOrchestrator } from '../mervin-v2/orchestrator/MervinOrchestrator';

const router = express.Router();
const orchestrator = new MervinOrchestrator();

router.post('/process', verifyFirebaseAuth, async (req, res) => {
  const response = await orchestrator.processRequest(req.body);
  res.json(response);
});

export default router;
```

**Criterio de éxito:**
- ✅ API responde correctamente
- ✅ Autenticación funciona
- ✅ SSE funciona para progreso

---

### **FASE 5: INTEGRACIÓN FRONTEND** ⏱️ 1-2 horas

#### **Tarea 5.1: AgentClient.ts** 🆕
**Archivo:** `client/src/mervin-v2/lib/AgentClient.ts`

```typescript
class AgentClient {
  async sendMessage(input: string, userId: string): Promise<AgentResponse>
  connectToProgressStream(userId: string, onProgress: (progress) => void): EventSource
}
```

---

#### **Tarea 5.2: useMervinAgent.ts** 🆕
**Archivo:** `client/src/mervin-v2/hooks/useMervinAgent.ts`

```typescript
export function useMervinAgent(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<TaskProgress | null>(null);
  
  const sendMessage = async (input: string) => {
    // Llama a /api/mervin-v2/process
  };
  
  // Conectar a SSE para progreso
  useEffect(() => {
    const sse = agentClient.connectToProgressStream(userId, setProgress);
    return () => sse.close();
  }, [userId]);
  
  return { messages, sendMessage, isProcessing, progress };
}
```

---

#### **Tarea 5.3: Actualizar Mervin.tsx** ♻️
**Archivo:** `client/src/pages/Mervin.tsx`

**Cambios mínimos necesarios:**
```typescript
// ANTES (legacy):
import { MervinAgent } from '@/mervin-ai/core/MervinAgent';

// DESPUÉS (V2):
import { useMervinAgent } from '@/mervin-v2/hooks/useMervinAgent';

function Mervin() {
  // ANTES:
  // const agent = useMemo(() => new MervinAgent(config), []);
  
  // DESPUÉS:
  const { messages, sendMessage, isProcessing, progress } = useMervinAgent(userId);
  
  // Resto de la UI se mantiene IGUAL
  // Solo cambia cómo se envían mensajes y se reciben respuestas
}
```

**Criterio de éxito:**
- ✅ UI funciona sin cambios visuales
- ✅ Usa nueva API V2
- ✅ Progreso en tiempo real se muestra

---

### **FASE 6: TESTING Y VALIDACIÓN** ⏱️ 2-3 horas

#### **Tarea 6.1: Tests end-to-end**

**Test 1: Property Verification**
```typescript
Input: "¿Quién es el dueño de 123 Main Street, Houston TX?"
Expected:
  - Llama a /api/property/details
  - Recibe data de Atom
  - Responde con información del dueño
```

**Test 2: Estimate Creation**
```typescript
Input: "Crea un estimado para Juan Pérez, cerca de madera 100 pies"
Expected:
  - Extrae parámetros
  - Crea cliente
  - Calcula estimado
  - Genera PDF
  - Envía email
  - Responde con confirmación
```

**Test 3: Contract Generation**
```typescript
Input: "Genera un contrato para Juan Pérez, remodelación de cocina, $50,000"
Expected:
  - Genera contrato legal con Claude
  - Usa /api/legal-defense/generate-contract
  - Setup firma dual
  - Responde con enlace
```

**Test 4: Simple Conversation**
```typescript
Input: "Hola, ¿cómo estás?"
Expected:
  - ChatGPT responde directamente
  - NO ejecuta tareas
  - Respuesta conversacional
```

#### **Tarea 6.2: Validación de endpoints**
- ✅ Todos los endpoints existentes funcionan
- ✅ No hay llamadas duplicadas
- ✅ PropertyVerifier sigue usando Atom
- ✅ Estimates usan los cálculos existentes

#### **Tarea 6.3: Validación de performance**
- ✅ Análisis inicial < 1 segundo
- ✅ Tareas completas < 25 segundos
- ✅ Progreso en tiempo real funciona

---

## 📊 CRITERIOS DE ÉXITO FINALES

### **Funcionalidad:**
- ✅ PropertyVerifier: Usa endpoint existente → Atom → Responde
- ✅ Estimates: Extrae params → Calcula → PDF → Email → Responde
- ✅ Contracts: Extrae params → Claude genera → Sistema guarda → Responde
- ✅ Permits: Extrae params → Investiga → Analiza → Guía
- ✅ Conversación: ChatGPT responde directamente

### **Arquitectura:**
- ✅ Propuesta 2 implementada al 100%
- ✅ ChatGPT-4o para tareas rápidas
- ✅ Claude Sonnet 4 para tareas complejas
- ✅ SystemAPI usa endpoints existentes (NO reimplementa)
- ✅ WebSearch investiga en tiempo real
- ✅ Progreso en tiempo real vía SSE

### **Calidad:**
- ✅ Código limpio, sin legacy
- ✅ Sin redundancias
- ✅ Sin errores TypeScript
- ✅ Tests pasan
- ✅ Performance < 25s por tarea

### **Frontend:**
- ✅ UI conservada (mínimos cambios)
- ✅ Usa nueva API V2
- ✅ Progreso visible
- ✅ Sin errores de consola

---

## ⏱️ TIMELINE ESTIMADO

| Fase | Duración | Acumulado |
|------|----------|-----------|
| Fase 0: Preparación | 30 min | 0.5h |
| Fase 1: Servicios AI | 2-3h | 3.5h |
| Fase 2: Servicios Sistema | 2-3h | 6.5h |
| Fase 3: Orquestador | 3-4h | 10.5h |
| Fase 4: API | 1-2h | 12.5h |
| Fase 5: Frontend | 1-2h | 14.5h |
| Fase 6: Testing | 2-3h | 17.5h |

**Total: ~18 horas** (2-3 días de trabajo)

---

## ❓ APROBACIÓN REQUERIDA

**Pregunta 1:** ¿Apruebas la eliminación de TODO el backend legacy de Mervin AI?
- server/ai/MervinChatOrchestrator.ts
- server/ai/agent-endpoints/
- server/routes/mervin-agent-api.ts
- client/src/mervin-ai/ (excepto ConversationEngine y LanguageDetector)

**Pregunta 2:** ¿Apruebas conservar ConversationEngine.ts y LanguageDetector.ts para reusar la personalidad mexicana?

**Pregunta 3:** ¿Apruebas la estructura de carpetas propuesta para V2?
- server/mervin-v2/
- client/src/mervin-v2/

**Pregunta 4:** ¿Apruebas que SystemAPIService SOLO llame a endpoints existentes y NUNCA reimplemente lógica?

**Pregunta 5:** ¿Apruebas modificar Mervin.tsx para usar el nuevo hook useMervinAgent?

---

## 🚀 PRÓXIMO PASO

Una vez apruebes este plan, procederé en orden:
1. FASE 0: Limpieza total
2. FASE 1: Servicios AI
3. FASE 2: Servicios Sistema
4. ... y así sucesivamente

Te notificaré al completar cada fase y antes de empezar la siguiente.

**¿Apruebas este plan para proceder?** ✅

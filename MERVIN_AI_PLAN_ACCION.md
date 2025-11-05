# PLAN DE ACCIÓN PARA CORREGIR MERVIN AI

**Fecha:** 5 de Noviembre de 2025  
**Objetivo:** Transformar Mervin AI de chatbot a agente ejecutor autónomo funcional

---

## 🎯 OBJETIVO FINAL

Hacer que Mervin AI realmente **EJECUTE TAREAS** de manera autónoma, no solo hable de ellas.

**Métrica de éxito:**
```
Usuario: "Crea un estimado para Juan Pérez, cerca de 100 pies"
  ↓
Mervin ejecuta → Crea cliente → Calcula → Genera PDF → Envía email → Guarda DB
  ↓
Mervin: "✅ Listo! Estimado EST-123 creado y enviado. Total: $2,450"
```

---

## 📊 FASES DEL PLAN

### **FASE 0: Correcciones Críticas Inmediatas** (1-2 horas)
Arreglar errores que impiden que el código funcione básicamente.

### **FASE 1: Task Execution Bridge** (4-6 horas)
Crear el puente entre conversación y ejecución real.

### **FASE 2: Integración con Sistema Real** (6-8 horas)
Conectar con los endpoints y sistemas existentes (estimates, contracts, etc.).

### **FASE 3: Progreso en Tiempo Real** (2-3 horas)
Implementar feedback visual real durante ejecución.

### **FASE 4: Testing y Refinamiento** (3-4 horas)
Probar end-to-end y pulir detalles.

---

## 🔧 FASE 0: CORRECCIONES CRÍTICAS INMEDIATAS

### **Tarea 0.1: Arreglar dependencia faltante en EndpointCoordinator**

**Archivo:** `client/src/mervin-ai/services/EndpointCoordinator.ts`

**Problema (línea 517):**
```typescript
const token = await robustAuth.getAuthToken();
// robustAuth no está importado
```

**Solución:**
```typescript
// Agregar al inicio del archivo:
import { robustAuth } from '@/lib/robust-auth';
```

---

### **Tarea 0.2: Eliminar o implementar método fantasma**

**Archivo:** `client/src/mervin-ai/core/TaskOrchestrator.ts`

**Problema (línea 152):**
```typescript
const basePlan = await intentionEngine.generateExecutionPlan(intention);
// Este método no existe en IntentionEngine
```

**Solución (opción 1 - Temporal):**
```typescript
// Comentar por ahora y usar generación directa
// const basePlan = await intentionEngine.generateExecutionPlan(intention);
const basePlan = this.createBasicPlan(intention);
```

**Solución (opción 2 - Permanente):**
Implementar el método en `IntentionEngine.ts`

---

### **Tarea 0.3: Arreglar lógica de detección conversacional**

**Archivo:** `client/src/mervin-ai/core/MervinAgent.ts`

**Problema (línea 473-484):**
```typescript
private isSimpleConversationalMessage(input: string, conversationResponse: any): boolean {
  const isSpanish = /[áéíóúñ]|hola|como|.../.test(input);
  
  if (isSpanish) {
    console.log('🇲🇽 [SPANISH-DETECTED] Enviando al backend...');
    return false; // ¡NUNCA usar frontend para español!
  }
  // ...
}
```

**Problema:** TODO en español va al backend, incluso "hola" y "gracias"

**Solución:**
```typescript
private isSimpleConversationalMessage(input: string, conversationResponse: any): boolean {
  const isSpanish = /[áéíóúñ]|hola|como|.../.test(input);
  
  // Patrones conversacionales simples en ESPAÑOL también
  const simpleSpanishPatterns = [
    /^(hola|buenas|qué tal|cómo estás)/i,
    /^(gracias|muchas gracias)/i,
    /^(adiós|hasta luego|nos vemos)/i,
    /^(ok|bueno|perfecto|entiendo)/i,
  ];
  
  // Si es español Y es patrón simple, usar frontend
  if (isSpanish && simpleSpanishPatterns.some(p => p.test(input))) {
    return true; // SÍ usar frontend para saludos simples
  }
  
  // Para tareas específicas en español, usar backend
  const taskWords = ['crear', 'generar', 'hacer', 'estimado', 'contrato'];
  if (isSpanish && taskWords.some(w => input.toLowerCase().includes(w))) {
    return false; // Backend para tareas
  }
  
  // Para inglés, usar lógica original
  // ...
}
```

---

### **Tarea 0.4: Arreglar badges falsos de "tarea completada"**

**Archivo:** `client/src/pages/Mervin.tsx`

**Problema (línea 232-243):**
```typescript
const isActualTaskCompletion = result.success && 
  result.data && 
  (result.data.fileGenerated || result.data.estimateCreated || ...);

const agentResponse: Message = {
  // ...
  ...(isActualTaskCompletion && { taskResult: result })
};
```

**Problema:** La lógica es correcta, pero `result.data` nunca tiene esos campos porque no se ejecuta nada.

**Solución temporal:**
Comentar logs engañosos hasta que tengamos ejecución real:
```typescript
// Por ahora, NUNCA mostrar badge hasta que implementemos ejecución
const isActualTaskCompletion = false; // TODO: Fix when execution works
```

---

## 🌉 FASE 1: TASK EXECUTION BRIDGE

### **Tarea 1.1: Crear TaskExecutionService en backend**

**Nuevo archivo:** `server/services/taskExecutionService.ts`

**Propósito:** 
Servicio que REALMENTE ejecuta tareas, no solo las planifica.

**Implementación:**
```typescript
export class TaskExecutionService {
  async executeEstimateTask(params: EstimateTaskParams): Promise<EstimateResult> {
    // 1. Validar o crear cliente
    const client = await this.getOrCreateClient(params.clientName, params.clientEmail);
    
    // 2. Calcular materiales
    const materials = await this.calculateMaterials(params.projectType, params.dimensions);
    
    // 3. Generar estimado en DB
    const estimate = await this.createEstimate(client.id, materials, params);
    
    // 4. Generar PDF
    const pdf = await this.generateEstimatePDF(estimate);
    
    // 5. Enviar email
    if (params.sendEmail) {
      await this.sendEstimateEmail(client.email, pdf);
    }
    
    return {
      success: true,
      estimateId: estimate.id,
      total: estimate.total,
      pdfUrl: pdf.url,
      emailSent: params.sendEmail
    };
  }
  
  async executeContractTask(params: ContractTaskParams): Promise<ContractResult> {
    // Implementación similar para contratos
  }
  
  async executePermitTask(params: PermitTaskParams): Promise<PermitResult> {
    // Implementación similar para permisos
  }
  
  async executePropertyTask(params: PropertyTaskParams): Promise<PropertyResult> {
    // Implementación similar para propiedades
  }
}
```

---

### **Tarea 1.2: Integrar TaskExecutionService en MervinChatOrchestrator**

**Archivo:** `server/ai/MervinChatOrchestrator.ts`

**Agregar:**
```typescript
import { TaskExecutionService } from '../services/taskExecutionService';

export class MervinChatOrchestrator {
  private taskExecutor: TaskExecutionService;
  
  constructor() {
    // ...
    this.taskExecutor = new TaskExecutionService();
  }
  
  async processRequest(request: MervinRequest): Promise<MervinResponse> {
    // ... código existente ...
    
    // NUEVO: Si requiere ejecución de tarea, ejecutar
    if (processingType.requiresTaskExecution && request.agentMode === 'executor') {
      console.log('⚡ [MERVIN] Ejecutando tarea real:', request.taskType);
      
      try {
        const taskResult = await this.executeRealTask(request);
        response.taskExecution = {
          requiresExecution: true,
          taskType: request.taskType || 'general',
          steps: taskResult.stepsCompleted,
          endpoints: taskResult.endpointsUsed,
          estimatedTime: taskResult.executionTime,
          result: taskResult.data
        };
        
        // Generar respuesta conversacional con resultado real
        response.conversationalResponse = await this.generateTaskCompletionResponse(
          request,
          taskResult,
          userContext
        );
      } catch (error) {
        console.error('❌ [TASK-EXECUTION] Error:', error);
        response.conversationalResponse = this.generateTaskErrorResponse(request, error);
      }
    }
    
    // ... resto del código ...
  }
  
  private async executeRealTask(request: MervinRequest): Promise<any> {
    const params = this.extractTaskParameters(request.input);
    
    switch (request.taskType) {
      case 'estimate':
      case 'estimate_wizard_conversational':
        return await this.taskExecutor.executeEstimateTask(params);
      
      case 'contract':
        return await this.taskExecutor.executeContractTask(params);
      
      case 'permit':
        return await this.taskExecutor.executePermitTask(params);
      
      case 'property':
        return await this.taskExecutor.executePropertyTask(params);
      
      default:
        throw new Error(`Task type not supported: ${request.taskType}`);
    }
  }
  
  private extractTaskParameters(input: string): any {
    // Usar AI para extraer parámetros del input natural
    // Ejemplo: "Crea estimado para Juan Pérez, cerca de 100 pies"
    // → { clientName: "Juan Pérez", dimensions: "100 pies", projectType: "cerca" }
  }
}
```

---

### **Tarea 1.3: Agregar endpoint de ejecución real**

**Archivo:** `server/routes/mervin-agent-api.ts`

**Ya existe** `/api/mervin/execute-task` pero no hace nada real.

**Actualizar:**
```typescript
router.post('/execute-task', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { taskType, input, userId, parameters } = req.body;
    
    // ... validaciones ...
    
    console.log(`⚡ [MERVIN-API] EJECUTANDO TAREA REAL: ${taskType}`);
    
    const orchestrator = getOrchestrator();
    const response = await orchestrator.processRequest({
      input,
      userId,
      conversationHistory: [],
      agentMode: 'executor', // MODO EJECUTOR, no intelligent
      taskType: taskType as any,
      requiresWebResearch: false
    });
    
    // Respuesta debe incluir datos reales de ejecución
    res.json({
      success: response.taskExecution?.result ? true : false,
      data: {
        taskExecution: response.taskExecution,
        conversationalResponse: response.conversationalResponse,
        realDataGenerated: true, // Indicador de que se ejecutó realmente
        estimateId: response.taskExecution?.result?.estimateId,
        total: response.taskExecution?.result?.total,
        // etc.
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    // ... manejo de error ...
  }
});
```

---

## 🔗 FASE 2: INTEGRACIÓN CON SISTEMA REAL

### **Tarea 2.1: Implementar executeEstimateTask**

**Archivo:** `server/services/taskExecutionService.ts`

**Conectar con sistema real:**
```typescript
import { db } from '../db';
import { clients, estimates, materials } from '../db/schema';
import { generateEstimatePDF } from './premiumPdfService';
import { sendEstimateEmail } from './estimateEmailService';

async executeEstimateTask(params: EstimateTaskParams): Promise<EstimateResult> {
  const steps: string[] = [];
  const endpointsUsed: string[] = [];
  
  try {
    // Paso 1: Cliente
    steps.push('Validando cliente...');
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.email, params.clientEmail))
      .limit(1);
    
    let clientId;
    if (client.length === 0) {
      steps.push('Creando nuevo cliente...');
      const newClient = await db.insert(clients).values({
        name: params.clientName,
        email: params.clientEmail,
        phone: params.clientPhone || ''
      }).returning();
      clientId = newClient[0].id;
      endpointsUsed.push('/api/clients (create)');
    } else {
      clientId = client[0].id;
      endpointsUsed.push('/api/clients (found)');
    }
    
    // Paso 2: Materiales
    steps.push('Calculando materiales...');
    const materialList = await this.calculateMaterialsForProject(params);
    endpointsUsed.push('/api/materials (calculate)');
    
    // Paso 3: Crear estimado
    steps.push('Generando estimado...');
    const estimateData = {
      clientId,
      projectType: params.projectType,
      dimensions: params.dimensions,
      materials: materialList,
      labor: this.calculateLabor(params),
      total: this.calculateTotal(materialList)
    };
    
    const newEstimate = await db.insert(estimates).values(estimateData).returning();
    endpointsUsed.push('/api/estimates (create)');
    
    // Paso 4: PDF
    steps.push('Generando PDF profesional...');
    const pdf = await generateEstimatePDF(newEstimate[0]);
    endpointsUsed.push('/api/pdfmonkey-estimates/generate');
    
    // Paso 5: Email
    if (params.sendEmail) {
      steps.push('Enviando email al cliente...');
      await sendEstimateEmail(client[0].email, pdf, newEstimate[0]);
      endpointsUsed.push('/api/estimate-email/send');
    }
    
    return {
      success: true,
      estimateId: newEstimate[0].id,
      total: estimateData.total,
      pdfUrl: pdf.url,
      emailSent: params.sendEmail,
      stepsCompleted: steps,
      endpointsUsed
    };
    
  } catch (error) {
    console.error('Error executing estimate task:', error);
    throw error;
  }
}
```

---

### **Tarea 2.2: Implementar extractTaskParameters con AI**

**Archivo:** `server/ai/MervinChatOrchestrator.ts`

**Usar Anthropic para extraer parámetros:**
```typescript
private async extractTaskParameters(input: string, taskType: string): Promise<any> {
  const extractionPrompt = `
Extrae los parámetros necesarios de este input del usuario para una tarea de tipo "${taskType}".

Input: "${input}"

Responde SOLO con JSON válido en este formato exacto:
${this.getParameterSchema(taskType)}

Ejemplo para estimate:
{
  "clientName": "Juan Pérez",
  "clientEmail": "juan@example.com",
  "clientPhone": "555-1234",
  "projectType": "cerca de madera",
  "dimensions": "100 pies lineales",
  "sendEmail": true
}

Si falta información crítica, usa valores razonables o deja como null.
`;

  const response = await this.anthropic.messages.create({
    model: DEFAULT_ANTHROPIC_MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content: extractionPrompt }]
  });
  
  const content = response.content[0];
  if (content.type === 'text') {
    try {
      return JSON.parse(content.text);
    } catch (error) {
      console.error('Error parsing AI parameter extraction:', error);
      return {};
    }
  }
  
  return {};
}

private getParameterSchema(taskType: string): string {
  const schemas = {
    estimate: `{
  "clientName": "string",
  "clientEmail": "string",
  "clientPhone": "string | null",
  "projectType": "string",
  "dimensions": "string",
  "sendEmail": boolean
}`,
    contract: `{
  "clientName": "string",
  "projectDetails": "string",
  "amount": "number",
  "terms": "string"
}`,
    // etc.
  };
  
  return schemas[taskType as keyof typeof schemas] || '{}';
}
```

---

## 📊 FASE 3: PROGRESO EN TIEMPO REAL

### **Tarea 3.1: Implementar Server-Sent Events (SSE)**

**Nuevo archivo:** `server/routes/mervin-sse.ts`

```typescript
import express from 'express';

const router = express.Router();

// Mapa de conexiones activas
const connections = new Map<string, express.Response>();

router.get('/stream/:userId', (req, res) => {
  const userId = req.params.userId;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  connections.set(userId, res);
  
  // Heartbeat cada 30 segundos
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    connections.delete(userId);
  });
});

export function sendProgressUpdate(userId: string, progress: any) {
  const connection = connections.get(userId);
  if (connection) {
    connection.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`);
  }
}

export default router;
```

---

### **Tarea 3.2: Enviar progreso durante ejecución**

**Actualizar:** `server/services/taskExecutionService.ts`

```typescript
import { sendProgressUpdate } from '../routes/mervin-sse';

async executeEstimateTask(params: EstimateTaskParams, userId: string): Promise<EstimateResult> {
  const totalSteps = 5;
  let currentStep = 0;
  
  const updateProgress = (stepName: string) => {
    currentStep++;
    sendProgressUpdate(userId, {
      currentStep,
      totalSteps,
      stepName,
      progress: (currentStep / totalSteps) * 100
    });
  };
  
  updateProgress('Validando cliente...');
  const client = await this.getOrCreateClient(...);
  
  updateProgress('Calculando materiales...');
  const materials = await this.calculateMaterials(...);
  
  updateProgress('Generando estimado...');
  const estimate = await this.createEstimate(...);
  
  updateProgress('Creando PDF profesional...');
  const pdf = await this.generatePDF(...);
  
  updateProgress('Enviando email...');
  await this.sendEmail(...);
  
  updateProgress('Completado ✅');
  
  return { ... };
}
```

---

### **Tarea 3.3: Conectar SSE en frontend**

**Actualizar:** `client/src/mervin-ai/core/MervinAgent.ts`

```typescript
private sseConnection: EventSource | null = null;

constructor(config: AgentConfig) {
  // ... código existente ...
  
  // Conectar a SSE para progreso en tiempo real
  this.connectToProgressStream();
}

private connectToProgressStream(): void {
  const userId = this.config.userId;
  this.sseConnection = new EventSource(`/api/mervin-sse/stream/${userId}`);
  
  this.sseConnection.addEventListener('progress', (event) => {
    const progress = JSON.parse(event.data);
    this.updateState({
      currentTask: progress.stepName,
      progress: progress.progress,
      estimatedTimeRemaining: 0
    });
    
    console.log('📊 [PROGRESS-UPDATE]', progress);
  });
  
  this.sseConnection.onerror = () => {
    console.error('❌ [SSE] Connection error');
    setTimeout(() => this.connectToProgressStream(), 5000);
  };
}
```

---

## 🧪 FASE 4: TESTING Y REFINAMIENTO

### **Tarea 4.1: Test end-to-end de estimate**

**Crear:** `tests/mervin-estimate-e2e.test.ts`

```typescript
describe('Mervin AI - Estimate Generation E2E', () => {
  it('should create real estimate from natural language', async () => {
    const input = "Crea un estimado para Juan Pérez (juan@test.com), cerca de madera de 100 pies";
    
    const result = await mervinAgent.processUserInput(input, []);
    
    expect(result.success).toBe(true);
    expect(result.data.estimateId).toBeDefined();
    expect(result.data.total).toBeGreaterThan(0);
    expect(result.data.pdfUrl).toBeDefined();
    expect(result.data.emailSent).toBe(true);
    
    // Verificar que realmente se creó en la DB
    const estimate = await db.select().from(estimates)
      .where(eq(estimates.id, result.data.estimateId));
    
    expect(estimate.length).toBe(1);
    expect(estimate[0].clientId).toBeDefined();
  });
});
```

---

### **Tarea 4.2: Agregar logging detallado**

**Actualizar todos los archivos críticos:**
```typescript
console.log('🎯 [MERVIN-EXECUTION-START]', { taskType, userId, timestamp: new Date() });
console.log('📊 [STEP-1] Validating client...');
console.log('📊 [STEP-2] Calculating materials...');
console.log('📊 [STEP-3] Generating estimate...');
console.log('📊 [STEP-4] Creating PDF...');
console.log('📊 [STEP-5] Sending email...');
console.log('✅ [MERVIN-EXECUTION-COMPLETE]', { estimateId, total, duration });
```

---

### **Tarea 4.3: Manejo de errores robusto**

**Implementar try-catch en cada paso:**
```typescript
try {
  const client = await this.getOrCreateClient(params);
} catch (error) {
  return {
    success: false,
    error: 'No pude validar el cliente. Por favor verifica la información.',
    partialData: { step: 'client_validation', originalError: error.message }
  };
}
```

---

## ✅ CRITERIOS DE ÉXITO

### **Para cada fase:**

**FASE 0: Correcciones**
- ✅ No hay errores en consola
- ✅ Código compila sin errores TypeScript
- ✅ Mervin responde a saludos sin ir al backend

**FASE 1: Execution Bridge**
- ✅ Backend ejecuta TaskExecutionService
- ✅ Se crean registros reales en DB
- ✅ Se generan PDFs reales
- ✅ Se envían emails reales

**FASE 2: Integración**
- ✅ Estimados funcionan end-to-end
- ✅ Contratos funcionan end-to-end
- ✅ Permisos funcionan end-to-end
- ✅ Propiedades funcionan end-to-end

**FASE 3: Progreso**
- ✅ Usuario ve progreso en tiempo real
- ✅ Cada paso se visualiza correctamente
- ✅ Errores se muestran de inmediato

**FASE 4: Testing**
- ✅ 90%+ tests pasan
- ✅ Logs son claros y útiles
- ✅ Errores se manejan gracefully

---

## 📅 TIMELINE ESTIMADO

| Fase | Duración | Acumulado |
|------|----------|-----------|
| Fase 0 | 1-2 horas | 2 horas |
| Fase 1 | 4-6 horas | 8 horas |
| Fase 2 | 6-8 horas | 16 horas |
| Fase 3 | 2-3 horas | 19 horas |
| Fase 4 | 3-4 horas | 23 horas |

**Total: ~23 horas** (3 días de trabajo full-time)

---

## 🚀 SIGUIENTE PASO INMEDIATO

**¿Quieres que empiece con la Fase 0?**

Puedo arreglar inmediatamente:
1. Import de robustAuth
2. Lógica de detección conversacional
3. Badges falsos de "tarea completada"
4. Método fantasma de generateExecutionPlan

**¿Procedemos?**

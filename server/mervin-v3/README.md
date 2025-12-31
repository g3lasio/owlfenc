# Mervin V3: Modo Agente Inteligente

**Versión:** 1.0  
**Fecha:** 30 de Diciembre, 2025  
**Estado:** Implementación Inicial (PoC)

## 🎯 Descripción

Mervin V3 es la evolución del sistema de IA de Owl Fenc, transformando a Mervin de un ejecutor de workflows predefinidos a un **agente verdaderamente autónomo** capaz de planificar, razonar y ejecutar tareas complejas de manera dinámica.

### Características Principales

- **Planificación Dinámica:** Genera planes de ejecución personalizados para cada solicitud.
- **Razonamiento Avanzado:** Utiliza Claude 3.5 Sonnet para análisis de intenciones y toma de decisiones.
- **Ejecución Robusta:** Manejo de errores, reintentos automáticos y acciones de fallback.
- **Colaboración Inteligente:** Solicita confirmación para acciones críticas y clarificación cuando falta información.
- **Memoria de Trabajo (Scratchpad):** Mantiene contexto entre pasos para decisiones informadas.

## 📁 Estructura del Proyecto

```
server/mervin-v3/
├── agent/
│   ├── AgentCore.ts          # Orquestador principal
│   ├── TaskPlanner.ts         # Generador de planes
│   └── StepExecutor.ts        # Ejecutor de pasos
├── prompts/
│   └── AgentPrompts.ts        # Prompts especializados
├── types/
│   └── agent-types.ts         # Definiciones de tipos
├── tests/
│   └── agent-poc.ts           # Prueba de concepto
├── AGENT_V3_TECHNICAL_DOCS.md # Documentación técnica
└── README.md                  # Este archivo
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 22+
- TypeScript
- API Key de Anthropic Claude
- Acceso al sistema Owl Fenc existente

### Instalación

1. Las dependencias ya están instaladas en el proyecto principal.

2. Configurar variables de entorno:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   BASE_URL=http://localhost:5000
   ```

### Ejecución de la Prueba de Concepto

```bash
cd /home/ubuntu/owlfenc
npx ts-node server/mervin-v3/tests/agent-poc.ts
```

## 📖 Uso

### Ejemplo Básico

```typescript
import { AgentCore } from './agent/AgentCore';
import type { PlanningContext } from './types/agent-types';

// 1. Inicializar el agente
const agent = new AgentCore(
  userId,
  authHeaders,
  baseURL,
  { debug: true }
);

// 2. Definir el contexto
const context: PlanningContext = {
  userInput: "Crea un estimado para Juan Pérez, cerca de 100 pies",
  userId: "user-123",
  contractorProfile: { companyName: "Mi Compañía" },
  conversationHistory: [],
  recentActions: [],
  availableTools: tools
};

// 3. Procesar la solicitud
const response = await agent.processRequest(context);

// 4. Manejar la respuesta
if (response.type === 'needs_confirmation') {
  // Solicitar confirmación al usuario
  const confirmed = await askUser(response.message);
  if (confirmed) {
    const finalResponse = await agent.resumeExecution(
      response.executionId!,
      { confirmed: true }
    );
  }
} else if (response.type === 'task_completed') {
  console.log('Tarea completada:', response.message);
}
```

## 🔧 Configuración

El agente acepta una configuración opcional:

```typescript
const config: Partial<AgentConfig> = {
  planningModel: 'claude-3-5-sonnet-20241022',
  synthesisModel: 'claude-3-5-sonnet-20241022',
  planningTemperature: 0.2,
  synthesisTemperature: 0.7,
  maxRetries: 3,
  stepTimeout: 60000,
  debug: false,
  savePlans: true,
  enableLearning: true
};

const agent = new AgentCore(userId, authHeaders, baseURL, config);
```

## 📊 Flujo de Ejecución

```
1. Usuario envía solicitud
   ↓
2. AgentCore recibe y llama a TaskPlanner
   ↓
3. TaskPlanner genera plan estructurado
   ↓
4. ¿Requiere confirmación?
   ├─ Sí → Pausa y pregunta al usuario
   └─ No → Continúa
   ↓
5. StepExecutor ejecuta cada paso
   ├─ Llama a SystemAPIService o WorkflowRunner
   ├─ Actualiza Scratchpad con resultados
   └─ Maneja errores con reintentos
   ↓
6. ResponseSynthesizer genera respuesta final
   ↓
7. Usuario recibe resultado
```

## 🧪 Testing

### Ejecutar Prueba de Concepto

```bash
npx ts-node server/mervin-v3/tests/agent-poc.ts
```

### Casos de Prueba Recomendados

1. **Tarea Simple:** "Busca al cliente Juan Pérez"
2. **Tarea Compleja:** "Crea un estimado para María González, cerca de 150 pies, y envíaselo por email"
3. **Ambigüedad:** "Crea un estimado para Juan" (múltiples clientes con ese nombre)
4. **Información Faltante:** "Crea un contrato" (sin especificar cliente ni monto)

## 📚 Documentación Adicional

- **[Documentación Técnica](./AGENT_V3_TECHNICAL_DOCS.md)**: Detalles de arquitectura y componentes.
- **[Plan de Implementación](/home/ubuntu/agent_implementation_plan.md)**: Roadmap completo del proyecto.
- **[Comparación con Otros Sistemas](/home/ubuntu/agent_comparison.md)**: Análisis comparativo.

## 🔄 Integración con Mervin V2

Mervin V3 está diseñado para coexistir con Mervin V2. La integración se realiza en el `MervinConversationalOrchestrator`:

```typescript
// En MervinConversationalOrchestrator.ts
if (mode === 'agent_v3') {
  const agentCore = new AgentCore(userId, authHeaders, baseURL);
  return await agentCore.processRequest(context);
} else {
  // Usar el sistema V2 existente
  return await this.processWithV2(context);
}
```

## 🛠️ Próximos Pasos

### Fase 1: Fundamentos (Completada)
- ✅ TaskPlanner
- ✅ StepExecutor
- ✅ AgentCore
- ✅ Tipos y Prompts

### Fase 2: Integración (En Progreso)
- [ ] Integrar con MervinConversationalOrchestrator
- [ ] Agregar endpoint API `/api/mervin-v3/agent`
- [ ] Actualizar frontend para soportar confirmaciones

### Fase 3: Confirmación y Colaboración
- [ ] Sistema de confirmación robusto
- [ ] Preguntas de clarificación inteligentes
- [ ] Visualización de planes en UI

### Fase 4: Aprendizaje y Optimización
- [ ] Guardar planes en Firestore
- [ ] Búsqueda de planes similares
- [ ] Métricas y dashboard

## 🤝 Contribuir

Para agregar nuevas capacidades al agente:

1. **Nueva Herramienta:** Agregar en `SystemAPIService` o `WorkflowRunner`
2. **Nueva Acción:** Actualizar `StepExecutor.executeSystemAPI()`
3. **Nuevo Tipo de Plan:** Modificar `TaskPlanner` y prompts
4. **Tests:** Agregar casos de prueba en `tests/`

## 📝 Notas de Desarrollo

- **Modelo de IA:** Claude 3.5 Sonnet es el recomendado por su capacidad de razonamiento.
- **Temperatura:** Baja (0.2) para planificación, media (0.7) para síntesis.
- **Timeout:** 60 segundos por paso para operaciones largas.
- **Reintentos:** Hasta 3 intentos con exponential backoff.

## 📄 Licencia

Propiedad de Owl Fenc App. Todos los derechos reservados.

## 📞 Soporte

Para preguntas o problemas, contactar al equipo de desarrollo de Owl Fenc.

---

**¡Bienvenido al futuro de la automatización inteligente para contratistas!** 🦉🔧

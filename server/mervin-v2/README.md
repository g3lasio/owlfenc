# Mervin AI Conversational System

## 🎯 Descripción

Mervin AI Conversational es un agente inteligente basado en Claude 3.5 Sonnet que transforma la experiencia de usuario en Owl Fenc App. Mervin mantiene conversaciones naturales, entiende contexto, maneja ambigüedad, y ejecuta workflows complejos de manera inteligente.

## ✨ Características Principales

- 🗣️ **Conversaciones Multi-Turno** - Mantiene contexto a través de múltiples mensajes
- 🧠 **Comprensión de Lenguaje Natural** - Entiende lenguaje coloquial y slang mexicano
- 🔍 **Detección de Ambigüedad** - Clarifica información ambigua automáticamente
- 📸 **OCR de Documentos** - Extrae texto de imágenes y PDFs
- 🔄 **Ejecución de Workflows** - Ejecuta workflows completos usando endpoints existentes
- 🇲🇽 **Personalidad Auténtica** - Personalidad mexicana norteña natural

## 🏗️ Arquitectura

```
MervinConversationalOrchestrator
    ├── ClaudeConversationalEngine (IA + OCR)
    ├── ConversationStateManager (Memoria)
    └── WorkflowRunner (Ejecutor)
            └── WorkflowEngine (Motor multi-paso)
                    ├── SystemAPIStepAdapter
                    ├── DeepSearchStepAdapter
                    └── TransformStepAdapter
```

## 🚀 Quick Start

### 1. Configurar API Key

```bash
# En Replit Secrets
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Registrar Rutas

```typescript
// server/index.ts
import mervinConversationalRoutes from './routes/mervin-conversational';
app.use('/api/mervin-conversational', mervinConversationalRoutes);
```

### 3. Usar en el Frontend

```typescript
const response = await fetch('/api/mervin-conversational/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    input: 'crea un estimado para juan perez',
    conversationId: conversationId // opcional
  })
});
```

## 📚 Documentación

- **[MERVIN_CONVERSATIONAL_DOCS.md](./MERVIN_CONVERSATIONAL_DOCS.md)** - Documentación técnica completa
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Guía de pruebas exhaustiva
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Guía de integración paso a paso

## 🔧 Workflows Disponibles

### 1. Property Verification
Verifica información de ownership de una propiedad.

```
Usuario: "verifica la propiedad en 123 Main St, Fairfield, CA"
```

### 2. Estimate Wizard
Crea un estimado completo con cálculos automáticos.

```
Usuario: "crea un estimado para juan perez, cerca de 100 pies en fairfield"
```

### 3. Contract Generator
Genera un contrato legal con firma dual.

```
Usuario: "crea un contrato para juan perez por $2,500"
```

### 4. Permit Advisor
Consulta permisos de construcción necesarios.

```
Usuario: "qué permisos necesito para una cerca en fairfield?"
```

## 🧪 Testing

```bash
cd /home/ubuntu/owlfenc
npx tsx server/test-mervin-conversational.ts
```

## 📁 Estructura de Archivos

```
server/mervin-v2/
├── ai/
│   └── ClaudeConversationalEngine.ts
├── orchestrator/
│   └── MervinConversationalOrchestrator.ts
├── services/
│   ├── ConversationStateManager.ts
│   ├── WorkflowRunner.ts
│   └── SystemAPIService.ts
├── workflows/
│   ├── WorkflowEngine.ts
│   ├── adapters/
│   │   ├── SystemAPIStepAdapter.ts
│   │   ├── DeepSearchStepAdapter.ts
│   │   └── TransformStepAdapter.ts
│   └── definitions/
│       ├── PropertyVerificationWorkflow.ts
│       ├── EstimateWorkflow.ts
│       ├── ContractWorkflow.ts
│       └── PermitWorkflow.ts
├── tools/
│   └── ClaudeToolDefinitions.ts
├── prompts/
│   └── MervinSystemPrompt.ts
└── routes/
    └── mervin-conversational.ts
```

## 🎨 Ejemplo de Conversación

```
Usuario: "crea un estimado para juan perez"
Mervin: "¡Órale primo! Vamos a crear ese estimado. ¿Para qué tipo de proyecto es?"

Usuario: "una cerca de madera"
Mervin: "Perfecto. ¿Cuántos pies lineales y dónde es el proyecto?"

Usuario: "100 pies en fairfield"
Mervin: "Simón. ¿Cuál es la dirección exacta en Fairfield?"

Usuario: "123 main st"
Mervin: [Ejecuta workflow completo]
       "¡Listo jefe! Creé el estimado EST-1234 por $2,500. 
        Aquí está el link para compartir: https://..."
```

## 🔑 API Endpoints

### POST /api/mervin-conversational/message
Procesar mensaje conversacional.

**Request:**
```json
{
  "input": "crea un estimado para juan perez",
  "conversationId": "uuid-opcional"
}
```

**Response:**
```json
{
  "success": true,
  "type": "workflow_completed",
  "message": "¡Listo primo! Creé el estimado...",
  "conversationId": "uuid",
  "data": { ... }
}
```

### POST /api/mervin-conversational/ocr
Procesar imagen con OCR.

### GET /api/mervin-conversational/conversation/:id
Obtener estado de conversación.

### DELETE /api/mervin-conversational/conversation/:id
Limpiar conversación.

## 🐛 Troubleshooting

### Error: "ANTHROPIC_API_KEY is not configured"
**Solución:** Configurar la variable en Replit Secrets.

### Error: "401 Unauthorized"
**Solución:** Verificar que el token de Firebase es válido.

### Error: "Workflow session not found"
**Solución:** Revisar logs del WorkflowEngine.

Ver más en [MERVIN_CONVERSATIONAL_DOCS.md](./MERVIN_CONVERSATIONAL_DOCS.md#troubleshooting)

## 📊 Comparación con Sistema Antiguo

| Característica | Antiguo | Nuevo |
|----------------|---------|-------|
| Conversación Multi-Turno | ❌ | ✅ |
| Manejo de Ambigüedad | ❌ | ✅ |
| OCR | ❌ | ✅ |
| Personalidad Consistente | ⚠️ | ✅ |
| Ejecución de Workflows | ⚠️ | ✅ |
| Documentación | ⚠️ | ✅ |

## 🤝 Contribuir

Para agregar un nuevo workflow:

1. Crear definición en `workflows/definitions/`
2. Registrar en `WorkflowRunner.ts`
3. Agregar herramienta en `ClaudeToolDefinitions.ts`
4. Actualizar `MervinConversationalOrchestrator.ts`
5. Documentar en `MERVIN_CONVERSATIONAL_DOCS.md`

## 📝 Licencia

Propiedad de Owl Fenc App

## 🎉 Créditos

Desarrollado con precisión quirúrgica para Owl Fenc App.

*"¡Órale primo! Mervin está listo para trabajar."* - Mervin AI

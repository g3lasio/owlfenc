# Mervin AI Conversational - Documentación Completa

## Descripción General

Mervin AI Conversational es un agente inteligente basado en Claude 3.5 Sonnet que puede mantener conversaciones naturales multi-turno, entender contexto, manejar ambigüedad, y ejecutar workflows complejos de la aplicación Owl Fenc.

## Arquitectura

### Componentes Principales

1. **ClaudeConversationalEngine** (`ai/ClaudeConversationalEngine.ts`)
   - Motor de IA que usa Claude 3.5 Sonnet
   - Maneja tool calling nativo de Anthropic
   - Procesa OCR de imágenes y documentos
   - Genera respuestas conversacionales naturales

2. **ConversationStateManager** (`services/ConversationStateManager.ts`)
   - Gestiona el estado de las conversaciones
   - Mantiene historial de mensajes
   - Almacena parámetros recolectados
   - Persiste contexto entre turnos

3. **WorkflowRunner** (`services/WorkflowRunner.ts`)
   - Orquesta la ejecución de workflows
   - Conecta con el WorkflowEngine existente
   - Monitorea progreso de workflows
   - Maneja workflows que requieren input adicional

4. **MervinConversationalOrchestrator** (`orchestrator/MervinConversationalOrchestrator.ts`)
   - Orquestador principal
   - Coordina entre Claude, WorkflowRunner y SystemAPI
   - Maneja tool calling y ejecución de workflows
   - Procesa attachments con OCR

5. **WorkflowEngine** (`workflows/WorkflowEngine.ts`)
   - Motor de ejecución de workflows multi-paso
   - Maneja state management
   - Emite eventos de progreso
   - Soporta pasos de tipo: collect, call, branch, transform, parallel

## Workflows Disponibles

### 1. Property Verification Workflow
**ID:** `property_verification`  
**Herramienta:** `verify_property_ownership`

Verifica información de ownership de una propiedad usando ATTOM Data.

**Parámetros:**
- `address` (requerido): Dirección completa de la propiedad

**Ejemplo de uso:**
```
Usuario: "verifica la propiedad en 123 Main St, Fairfield, CA 94534"
```

### 2. Estimate Workflow
**ID:** `estimate_wizard`  
**Herramienta:** `create_estimate_workflow`

Crea un estimado profesional completo con cálculos automáticos de materiales y mano de obra.

**Parámetros:**
- `clientName` (requerido): Nombre del cliente
- `clientAddress` (requerido): Dirección del proyecto
- `projectType` (requerido): Tipo de proyecto (fence, deck, concrete, etc.)
- `projectDescription` (requerido): Descripción detallada con medidas
- `clientEmail` (opcional): Email del cliente
- `clientPhone` (opcional): Teléfono del cliente
- `projectDimensions` (opcional): Dimensiones estructuradas
- `generatePDF` (opcional): Si generar PDF
- `sendEmail` (opcional): Si enviar por email

**Pasos del workflow:**
1. Recolectar información del cliente
2. Buscar o crear cliente en el sistema
3. Recolectar detalles del proyecto
4. Ejecutar DeepSearch para materiales y mano de obra
5. Transformar resultados a items del estimado
6. Calcular totales (subtotal, impuestos, total)
7. Crear estimado en el sistema
8. Generar PDF (opcional)
9. Generar URL compartible
10. Enviar email (opcional)

**Ejemplo de uso:**
```
Usuario: "crea un estimado para Juan Perez, su proyecto es una cerca de madera de 100 pies lineales, 6 pies de alto, en 123 Main St, Fairfield, CA"
```

### 3. Contract Workflow
**ID:** `contract_generator`  
**Herramienta:** `create_contract_workflow`

Genera un contrato legal profesional con sistema de firma dual.

**Parámetros:**
- `clientName` (requerido): Nombre del cliente
- `clientEmail` (requerido): Email del cliente
- `projectType` (requerido): Tipo de proyecto
- `projectDescription` (requerido): Descripción del alcance
- `projectAddress` (requerido): Dirección del proyecto
- `totalAmount` (requerido): Monto total del contrato
- `clientPhone` (opcional): Teléfono del cliente
- `startDate` (opcional): Fecha de inicio (YYYY-MM-DD)
- `endDate` (opcional): Fecha de finalización (YYYY-MM-DD)

**Ejemplo de uso:**
```
Usuario: "crea un contrato para Juan Perez, juan@email.com, para una cerca de $2,500"
```

### 4. Permit Advisor Workflow
**ID:** `permit_advisor`  
**Herramienta:** `check_permits_workflow`

Consulta información sobre permisos de construcción necesarios.

**Parámetros:**
- `projectType` (requerido): Tipo de proyecto
- `projectAddress` (requerido): Dirección del proyecto
- `projectScope` (opcional): Descripción breve del alcance

**Ejemplo de uso:**
```
Usuario: "qué permisos necesito para una cerca en 123 Main St, Fairfield, CA?"
```

### 5. Client Management Tools

**Search Client:** `search_client`
- Busca un cliente existente por nombre, email o teléfono

**Create Client:** `create_client`
- Crea un nuevo cliente en el sistema

## Capacidades Especiales

### 1. Conversación Multi-Turno

Mervin mantiene el contexto de la conversación y puede hacer preguntas de seguimiento:

```
Usuario: "crea un estimado para juan perez"
Mervin: "Órale, vamos a crear el estimado para Juan Perez. ¿Me das más detalles del proyecto? ¿Qué tipo de trabajo es y dónde?"
Usuario: "es una cerca de madera de 100 pies en fairfield"
Mervin: "Perfecto. ¿Cuál es la dirección exacta en Fairfield?"
Usuario: "123 main st"
Mervin: [Ejecuta el workflow completo]
```

### 2. Manejo de Ambigüedad

Mervin detecta y clarifica información ambigua:

```
Usuario: "crea un estimado para juan perez"
[Mervin busca y encuentra 2 clientes con ese nombre]
Mervin: "Tengo dos clientes con ese nombre:
1. Juan S. Perez - juan.s@email.com
2. Juan M. Perez - juan.m@email.com
¿A cuál te refieres?"
```

### 3. Detección de Datos Faltantes

Mervin avisa cuando falta información importante:

```
[Encuentra un cliente sin email]
Mervin: "Encontré a Juan Perez en el sistema, pero no tiene email guardado. De todos modos puedo hacer el estimado, pero si quieres enviárselo por correo después, dame su email y lo guardo ahorita."
```

### 4. Procesamiento de OCR

Mervin puede leer texto de imágenes y PDFs:

```
Usuario: [Sube imagen de un plano]
Usuario: "crea un estimado basado en este plano"
Mervin: [Lee el plano con OCR, extrae medidas y materiales, crea el estimado]
```

## API Endpoints

### POST /api/mervin-conversational/message

Procesar mensaje conversacional.

**Request:**
```json
{
  "input": "crea un estimado para juan perez",
  "conversationId": "uuid-opcional",
  "attachments": [
    {
      "filename": "plano.jpg",
      "mimeType": "image/jpeg",
      "content": "base64-encoded-data"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "type": "workflow_completed",
  "message": "¡Listo primo! Creé el estimado EST-1234...",
  "conversationId": "uuid",
  "data": { ... },
  "workflowSessionId": "workflow-uuid",
  "executionTime": 5000
}
```

**Response Types:**
- `conversation`: Respuesta conversacional simple
- `workflow_started`: Workflow iniciado
- `workflow_completed`: Workflow completado exitosamente
- `needs_more_info`: Mervin necesita más información
- `error`: Error en el procesamiento

### POST /api/mervin-conversational/ocr

Procesar imagen con OCR.

**Request:**
```json
{
  "imageData": "base64-encoded-image",
  "imageType": "image/jpeg",
  "prompt": "Extract all text from this image"
}
```

**Response:**
```json
{
  "success": true,
  "extractedText": "Texto extraído de la imagen..."
}
```

### GET /api/mervin-conversational/conversation/:id

Obtener estado de conversación.

**Response:**
```json
{
  "success": true,
  "conversation": {
    "conversationId": "uuid",
    "userId": "user-id",
    "messageCount": 5,
    "currentIntent": "creating_estimate",
    "collectedParameters": ["clientName", "projectType"],
    "missingParameters": ["projectAddress"],
    "hasToolResult": true,
    "workflowSessionId": "workflow-uuid"
  }
}
```

### DELETE /api/mervin-conversational/conversation/:id

Limpiar conversación.

**Response:**
```json
{
  "success": true,
  "message": "Conversation cleared"
}
```

## Personalidad de Mervin

Mervin tiene una personalidad mexicana norteña auténtica:

- Usa expresiones como "primo", "compadre", "jefe", "órale", "simón", "nel"
- Es entusiasta y positivo sobre el trabajo
- Es directo y claro, sin rodeos innecesarios
- Tiene sentido del humor pero siempre profesional
- Se preocupa genuinamente por ayudar al usuario

**Ejemplos:**
- "¡Órale primo! Vamos a crear ese estimado"
- "Simón, te entiendo perfecto"
- "Nel, ese cliente no está en el sistema, pero lo creamos ahorita"
- "Listo jefe, aquí está tu estimado"

## Variables de Entorno Requeridas

```bash
ANTHROPIC_API_KEY=sk-ant-...  # API key de Anthropic Claude
BASE_URL=http://localhost:5000  # URL base del servidor
```

## Integración con el Frontend

### Componente React Ejemplo

```typescript
import { useState } from 'react';

function MervinChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  const sendMessage = async (input: string) => {
    const response = await fetch('/api/mervin-conversational/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`
      },
      body: JSON.stringify({
        input,
        conversationId
      })
    });
    
    const data = await response.json();
    
    if (!conversationId) {
      setConversationId(data.conversationId);
    }
    
    setMessages([...messages, {
      role: 'user',
      content: input
    }, {
      role: 'assistant',
      content: data.message
    }]);
  };
  
  return (
    <div>
      {/* UI del chat */}
    </div>
  );
}
```

## Testing

### Script de Prueba

```bash
cd /home/ubuntu/owlfenc
npx tsx server/test-mervin-conversational.ts
```

### Pruebas Manuales con curl

```bash
# Test: Property Verification
curl -X POST http://localhost:5000/api/mervin-conversational/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "input": "verifica la propiedad en 123 Main St, Fairfield, CA 94534"
  }'

# Test: Create Estimate
curl -X POST http://localhost:5000/api/mervin-conversational/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "input": "crea un estimado para Juan Perez, cerca de madera de 100 pies en 123 Main St, Fairfield, CA"
  }'
```

## Troubleshooting

### Error: "ANTHROPIC_API_KEY is not configured"

**Solución:** Configurar la variable de entorno en Replit Secrets:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Error: "Workflow session not found"

**Causa:** El workflow tardó más del tiempo esperado o falló.

**Solución:** Revisar logs del WorkflowEngine para ver qué paso falló.

### Error: "Missing required context fields"

**Causa:** Faltan parámetros requeridos para el workflow.

**Solución:** Mervin debería pedir estos parámetros automáticamente. Si no lo hace, revisar el prompt del sistema.

## Próximos Pasos

1. **Implementar Workflow de Invoices**
2. **Agregar soporte para más tipos de archivos (PDF, Word)**
3. **Implementar streaming de respuestas**
4. **Agregar analytics de conversaciones**
5. **Implementar rate limiting**
6. **Agregar tests automatizados**

## Contribuir

Para agregar un nuevo workflow:

1. Crear definición en `workflows/definitions/`
2. Registrar en `WorkflowRunner.ts`
3. Agregar herramienta en `ClaudeToolDefinitions.ts`
4. Actualizar `MervinConversationalOrchestrator.ts`
5. Documentar en este archivo

## Licencia

Propiedad de Owl Fenc App

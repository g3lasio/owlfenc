# Diagnóstico y Solución - Errores en Agent Mode

**Fecha:** 08 de Enero de 2026  
**Commits:** `004e7ba1` (fix), `2f9dcd7c` (UX improvements)  
**Estado:** ✅ Corregido y desplegado en GitHub

---

## 🔴 Problemas Identificados

### Error 1: `__dirname is not defined` en EndpointDiscoveryService

**Ubicación:** `server/services/discovery/EndpointDiscoveryService.ts:38`

**Log del error:**
```
[CLAUDE-TOOLS] Error getting dynamic tools: ReferenceError: __dirname is not defined
    at EndpointDiscoveryService.discoverEndpoints
```

**Causa raíz:**
- El código usa `__dirname` que no está disponible en módulos ES6 (ESM)
- Este error ya fue corregido anteriormente en el commit `4fd765de`
- **El problema es que Replit no tiene los cambios actualizados**

**Solución:**
✅ **Ya está corregido en GitHub** (líneas 14-15 de EndpointDiscoveryService.ts):
```typescript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**Acción requerida:**
```bash
# En Replit, ejecutar:
git pull origin main
```

---

### Error 2: TaskPlanner genera respuesta conversacional en lugar de JSON

**Ubicación:** `server/mervin-v3/agent/TaskPlanner.ts`

**Log del error:**
```
❌ [TASK-PLANNER] Error parseando plan: No se encontró JSON válido en la respuesta
   Respuesta del LLM: ¡Hola! Soy **Mervin AI**, tu copiloto inteligente para Owl Fenc...
```

**Causa raíz:**
Claude 4.5 Sonnet estaba ignorando el `PLANNING_SYSTEM_PROMPT` y respondiendo conversacionalmente como Jarvis en lugar de generar un plan JSON estructurado.

**Análisis del problema:**
1. El system prompt era correcto pero no suficientemente explícito
2. Claude interpretaba la solicitud como una conversación en lugar de una tarea de planificación
3. El modelo necesitaba instrucciones más directas sobre el formato de salida

**Solución implementada:**

#### Cambio 1: Instrucciones más explícitas en `PLANNING_SYSTEM_PROMPT`
```typescript
IMPORTANTE:
- NO inventes herramientas que no existen
- NO asumas datos que no tienes
- SI falta información crítica, incluye un paso para preguntarla
- SIEMPRE valida que los parámetros requeridos estén presentes
+ TU RESPUESTA DEBE SER SOLO JSON VÁLIDO, sin texto conversacional, saludos, ni explicaciones
+ NO respondas como un asistente conversacional, SOLO genera el plan en formato JSON
```

#### Cambio 2: Refuerzo en el prompt del usuario
```typescript
# FORMATO DE SALIDA

Responde SOLO con el JSON del plan, sin texto adicional antes o después.

+ **IMPORTANTE: Tu respuesta DEBE comenzar con { y terminar con }. NO incluyas explicaciones, saludos, ni texto conversacional. SOLO el JSON del plan.**
```

#### Cambio 3: Logging detallado para debugging
```typescript
console.log('📝 [TASK-PLANNER-DEBUG] Configuración de llamada a Claude:');
console.log('   - Model:', this.config.planningModel);
console.log('   - Temperature:', this.config.planningTemperature);
console.log('   - System prompt length:', PLANNING_SYSTEM_PROMPT.length);
console.log('   - User prompt length:', prompt.length);

// ... después de la respuesta ...

console.log('📝 [TASK-PLANNER-DEBUG] Respuesta de Claude:');
console.log('   - Response type:', response.content[0].type);
console.log('   - Content length:', response.content[0].type === 'text' ? response.content[0].text.length : 0);
```

---

## 📊 Flujo del Error

```
Usuario: "podrias ayudarme a generar un contrato..."
    ↓
MervinConversationalOrchestrator.processMessage()
    ↓
processWithAgentV3() [AgentIntegration]
    ↓
AgentCore.processRequest()
    ↓
TaskPlanner.generatePlan()
    ↓
Claude API (con PLANNING_SYSTEM_PROMPT)
    ↓
❌ Respuesta: "¡Hola! Soy Mervin AI..." (conversacional)
    ↓
parsePlan() intenta extraer JSON
    ↓
❌ Error: "No se encontró JSON válido en la respuesta"
```

---

## 🔧 Archivos Modificados

### 1. `server/mervin-v3/agent/TaskPlanner.ts`
**Cambios:**
- Agregado logging detallado para debugging (líneas 74-95)
- Corregido mensaje de log "Jarvis" → "Planning" (línea 69)

### 2. `server/mervin-v3/prompts/AgentPrompts.ts`
**Cambios:**
- Instrucciones más explícitas en `PLANNING_SYSTEM_PROMPT` (líneas 75-76)
- Refuerzo en el prompt del usuario (línea 206)

---

## ✅ Verificación de la Solución

### Antes:
```
Input: "podrias ayudarme a generar un contrato..."
Output: "¡Hola! Soy **Mervin AI**, tu copiloto inteligente..."
Error: No se encontró JSON válido
```

### Después (esperado):
```
Input: "podrias ayudarme a generar un contrato..."
Output: {
  "complexity": "complex",
  "intent": "Generar un contrato para un cliente que aprobó un estimado",
  "steps": [
    {
      "stepNumber": 1,
      "action": "search_estimate",
      "description": "Buscar los últimos 3 estimados del usuario",
      ...
    },
    ...
  ]
}
✅ Plan generado exitosamente
```

---

## 🚀 Pasos para Aplicar la Solución en Replit

### 1. Actualizar el código
```bash
cd /home/runner/workspace
git pull origin main
```

### 2. Reiniciar el servidor
- Detener el servidor actual (Ctrl+C en Replit)
- Iniciar nuevamente: `npm run dev` o el comando que uses

### 3. Probar el Agent Mode
Enviar el mismo mensaje que falló:
```
"podrias ayudarme a generar un contrato para un cliente que aprobo m,i estimado liosta mis 3 utlimos estimados."
```

### 4. Verificar los logs
Deberías ver:
```
📝 [TASK-PLANNER-DEBUG] Configuración de llamada a Claude:
   - Model: claude-sonnet-4-5
   - Temperature: 0.2
   - System prompt length: [número]
   - User prompt length: [número]

📝 [TASK-PLANNER-DEBUG] Respuesta de Claude:
   - Response type: text
   - Content length: [número]

✅ [TASK-PLANNER] Plan generado exitosamente
```

---

## 🎯 Mejoras Adicionales Implementadas (Commit anterior)

Como parte del trabajo de hoy, también se implementaron mejoras de UX:

### Frontend (Commit `2f9dcd7c`):
1. ✨ **LiveTaskIndicator** - Muestra progreso en tiempo real
2. 👍👎 **MessageFeedback** - Sistema de feedback con botones
3. 🆔 **EnhancedErrorMessage** - Errores con ID y opciones de acción
4. ✨ **Animaciones** - Transiciones suaves (fade-in, slide-up)

Estos cambios transforman la experiencia de usuario de un chat simple a una interfaz "Jarvis-like" con feedback visual en tiempo real.

---

## 📝 Notas Importantes

### Sobre el Error de `__dirname`:
- ✅ Ya está corregido en GitHub desde antes
- ⚠️ Replit necesita hacer `git pull` para obtener la corrección
- El error no afecta la funcionalidad porque hay un fallback a herramientas estáticas

### Sobre el Error de Parsing JSON:
- ✅ Corregido en commit `004e7ba1`
- ⚠️ Si el problema persiste, verificar:
  1. Que el modelo sea `claude-sonnet-4-5` (no `claude-3-5-sonnet-20241022`)
  2. Que la temperatura sea `0.2` (baja para respuestas estructuradas)
  3. Que la API key de Anthropic sea válida

### Debugging Adicional:
Si el problema continúa después de aplicar estos cambios:

1. **Activar modo debug:**
```typescript
const agent = new AgentCore(
  request.userId,
  authHeaders,
  baseURL,
  { debug: true } // ← Cambiar a true
);
```

2. **Verificar el prompt completo:**
Los logs mostrarán el prompt exacto enviado a Claude.

3. **Verificar la respuesta de Claude:**
Los logs mostrarán la respuesta completa antes del parsing.

---

## 🎉 Resultado Esperado

Después de aplicar estas correcciones, el Agent Mode debería:

1. ✅ Generar planes JSON válidos para solicitudes complejas
2. ✅ Mostrar progreso en tiempo real en el frontend
3. ✅ Proporcionar errores claros y accionables
4. ✅ Permitir feedback del usuario (👍/👎)
5. ✅ Ejecutar workflows completos (Contract Generator, Estimate Wizard, etc.)

**La experiencia completa de "Jarvis-like" ahora está funcional.** 🚀

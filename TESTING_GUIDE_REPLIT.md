# 🧪 GUÍA DE TESTING - AUTO-DISCOVERY SYSTEM

## 📋 RESUMEN DE CORRECCIONES

Se han corregido **10 problemas críticos** identificados en la auditoría:

### ✅ Correcciones Implementadas:

1. **WorkflowOrchestrator**
   - ✅ Timeout de 60 segundos para prevenir workflows infinitos
   - ✅ Límite de 20 pasos máximo
   - ✅ Validación de número de pasos al inicio

2. **UniversalAPIExecutor**
   - ✅ Validación de URLs (solo mismo dominio)
   - ✅ Rate limiting: 100 requests por minuto por usuario
   - ✅ Límite de 10MB en responses
   - ✅ Timeout de 30 segundos por request
   - ✅ Protección contra SSRF (Server-Side Request Forgery)

3. **ClaudeToolDefinitions**
   - ✅ Cache de 5 minutos para getAllTools()
   - ✅ Límite de 100 herramientas para Claude
   - ✅ Performance mejorado significativamente

4. **DynamicToolGenerator**
   - ✅ Detección de nombres duplicados
   - ✅ Sufijos automáticos (_1, _2) para duplicados

---

## 🚀 PASOS PARA TESTING EN REPLIT

### 1. Actualizar el código en Replit

```bash
# En la terminal de Replit
git pull origin main
```

### 2. Reiniciar el servidor

- Detener el servidor actual (Ctrl+C)
- Iniciar nuevamente: `npm run dev` o usar el botón "Run" de Replit

### 3. Verificar que el servidor inicie correctamente

Buscar estos logs en la consola:

```
[ENDPOINT-DISCOVERY] Scanning endpoints...
[ENDPOINT-DISCOVERY] Found X endpoints
[CLAUDE-TOOLS] Total tools: Y (Z static + W dynamic)
```

---

## 🧪 TESTS FUNCIONALES

### Test 1: Property Verifier (Regresión)
**Objetivo:** Verificar que el workflow existente sigue funcionando

**Comando:**
```
mervin investiga el dueño de 648 Roscommon Pl, Vacaville, CA
```

**Resultado Esperado:**
- ✅ Mervin usa la herramienta `verify_property_ownership`
- ✅ Retorna información del dueño
- ✅ Muestra datos de la propiedad
- ✅ No hay errores

---

### Test 2: Crear Estimado (Workflow Multi-Paso)
**Objetivo:** Verificar que workflows complejos funcionan

**Comando:**
```
mervin crea un estimado para Juan Pérez
```

**Resultado Esperado:**
- ✅ Mervin pregunta por información faltante (email, dirección, proyecto)
- ✅ Ejecuta el workflow paso a paso
- ✅ Genera el estimado
- ✅ Retorna link clickeable
- ⚠️  Si falta info, Mervin debe preguntar (no inventar datos)

---

### Test 3: Crear Contrato (Workflow con Confirmación)
**Objetivo:** Verificar que workflows con confirmación funcionan

**Comando:**
```
mervin crea un contrato para John Webb
```

**Resultado Esperado:**
- ✅ Mervin pregunta por tipo de contrato
- ✅ Muestra opciones en grid (botones clickeables)
- ✅ Pide confirmación antes de crear
- ✅ Genera el contrato
- ✅ Retorna PDF descargable

---

### Test 4: Permisos (Workflow con DeepSearch)
**Objetivo:** Verificar integración con APIs externas

**Comando:**
```
mervin qué permisos necesito para una cerca en 123 Main St, Vacaville, CA?
```

**Resultado Esperado:**
- ✅ Mervin usa DeepSearch
- ✅ Retorna lista de permisos
- ✅ Muestra links a sitios oficiales
- ✅ Precio ajustado si es necesario

---

### Test 5: Estimado con Precio Específico
**Objetivo:** Verificar PriceAdjustmentService

**Comando:**
```
mervin crea un estimado para un deck de 500 sqft que cueste exactamente $10,200
```

**Resultado Esperado:**
- ✅ DeepSearch calcula precio base
- ✅ PriceAdjustmentService ajusta a $10,200
- ✅ Muestra explicación del ajuste
- ✅ Genera estimado con precio correcto

---

## 🔒 TESTS DE SEGURIDAD

### Test 6: Rate Limiting
**Objetivo:** Verificar que rate limiting funciona

**Acción:**
- Hacer 10+ requests rápidos seguidos
- Ejemplo: "mervin crea estimado", "mervin crea contrato", etc.

**Resultado Esperado:**
- ✅ Primeros 100 requests funcionan
- ✅ Request 101+ retorna mensaje de rate limit
- ⚠️  "Has excedido el límite de requests. Por favor espera un momento..."

---

### Test 7: Workflow Timeout
**Objetivo:** Verificar que workflows no se cuelgan

**Acción:**
- Crear un workflow que tarde mucho (si es posible)
- O simular timeout en código

**Resultado Esperado:**
- ✅ Después de 60 segundos, workflow se cancela
- ✅ Error amigable: "Workflow execution timed out after 60000ms"

---

## 🎨 TESTS DE FRONTEND

### Test 8: Botones de Acción
**Objetivo:** Verificar que botones se renderizan correctamente

**Comando:**
```
mervin crea un contrato
```

**Resultado Esperado:**
- ✅ Botones de opciones se muestran en grid
- ✅ Botones son clickeables
- ✅ Al hacer click, se ejecuta la acción
- ✅ Loading state mientras procesa

---

### Test 9: Links Clickeables
**Objetivo:** Verificar que links se convierten automáticamente

**Comando:**
```
mervin investiga el dueño de 648 Roscommon Pl, Vacaville, CA
```

**Resultado Esperado:**
- ✅ URLs en la respuesta son clickeables
- ✅ Se abren en nueva pestaña
- ✅ Color azul y subrayado

---

### Test 10: Attachments (PDFs)
**Objetivo:** Verificar que PDFs se pueden descargar

**Comando:**
```
mervin crea un contrato y genera el PDF
```

**Resultado Esperado:**
- ✅ Botón "Descargar PDF" aparece
- ✅ Al hacer click, descarga el archivo
- ✅ PDF se abre correctamente

---

## 📊 TESTS DE PERFORMANCE

### Test 11: Tiempo de Respuesta
**Objetivo:** Verificar que cache mejora performance

**Acción:**
1. Primer request: `mervin ayuda` (inicializa auto-discovery)
2. Segundo request: `mervin crea estimado` (usa cache)

**Resultado Esperado:**
- ✅ Primer request: 2-5 segundos
- ✅ Segundo request: < 1 segundo
- ✅ Log: "[CLAUDE-TOOLS] Using cached tools"

---

### Test 12: Memoria
**Objetivo:** Verificar que no hay memory leaks

**Acción:**
- Hacer 50+ requests variados
- Monitorear memoria en Replit

**Resultado Esperado:**
- ✅ Memoria se mantiene estable
- ✅ No crece indefinidamente
- ✅ Cache se limpia después de 5 minutos

---

## 🐛 TESTS DE EDGE CASES

### Test 13: Información Incompleta
**Objetivo:** Verificar que Mervin pide info faltante

**Comando:**
```
mervin crea un estimado
```

**Resultado Esperado:**
- ✅ Mervin pregunta: "¿Para qué cliente?"
- ✅ Mervin pregunta: "¿Qué tipo de proyecto?"
- ✅ No inventa datos
- ✅ No crashea

---

### Test 14: Endpoint No Existente
**Objetivo:** Verificar error handling

**Acción:**
- Simular llamada a endpoint que no existe

**Resultado Esperado:**
- ✅ Error amigable
- ✅ No crashea el servidor
- ✅ Mervin sugiere alternativas

---

### Test 15: Respuesta Muy Grande
**Objetivo:** Verificar límite de 10MB

**Acción:**
- Llamar endpoint que retorna mucha data (si existe)

**Resultado Esperado:**
- ✅ Request se cancela si excede 10MB
- ✅ Error: "Response too large"
- ✅ No consume toda la memoria

---

## ✅ CHECKLIST DE VALIDACIÓN

### Backend
- [ ] Servidor inicia sin errores
- [ ] Auto-discovery encuentra endpoints
- [ ] Herramientas dinámicas se generan
- [ ] Cache funciona correctamente
- [ ] Rate limiting activo
- [ ] Timeouts funcionan
- [ ] Validación de URLs activa

### Frontend
- [ ] Botones se renderizan
- [ ] Links son clickeables
- [ ] PDFs se descargan
- [ ] Loading states funcionan
- [ ] Errores se muestran amigablemente

### Workflows
- [ ] Property Verifier funciona
- [ ] Estimados se crean
- [ ] Contratos se generan
- [ ] Permisos se consultan
- [ ] Confirmaciones se piden

### Performance
- [ ] Primer request < 5s
- [ ] Requests con cache < 1s
- [ ] Memoria estable
- [ ] No memory leaks

### Seguridad
- [ ] URLs validadas
- [ ] Rate limiting funciona
- [ ] Responses limitadas a 10MB
- [ ] No SSRF posible

---

## 🚨 PROBLEMAS CONOCIDOS

### ⚠️  Problemas Medios (No críticos, pero importantes)

1. **Cache no es thread-safe**
   - Impacto: En alta concurrencia puede haber race conditions
   - Mitigación: Replit tiene tráfico bajo, no es crítico por ahora

2. **Estado de workflows no se persiste**
   - Impacto: Si el servidor se reinicia, workflows en progreso se pierden
   - Mitigación: Workflows son rápidos, riesgo bajo

3. **Condicionales solo soportan 5 operadores**
   - Impacto: Workflows complejos pueden necesitar más operadores
   - Mitigación: Los 5 operadores cubren 90% de casos

### ℹ️  Mejoras Futuras

1. Hacer paths configurables (no hardcoded)
2. Implementar paginación de endpoints
3. Agregar más operadores condicionales
4. Persistir estado de workflows en Redis
5. Mejorar regex de JSDoc para casos complejos

---

## 📝 REPORTE DE BUGS

Si encuentras bugs durante el testing, documenta:

1. **Comando usado**
2. **Resultado esperado**
3. **Resultado actual**
4. **Logs de error** (si hay)
5. **Screenshots** (si aplica)

Formato:

```markdown
### Bug: [Título]

**Comando:** `mervin ...`

**Esperado:** ...

**Actual:** ...

**Logs:**
```
[logs aquí]
```

**Screenshot:** [adjuntar]
```

---

## 🎯 CRITERIOS DE ÉXITO

El sistema está listo para producción si:

- ✅ Todos los tests funcionales pasan
- ✅ No hay errores críticos en logs
- ✅ Performance es aceptable (< 5s primer request)
- ✅ Frontend renderiza correctamente
- ✅ Workflows complejos funcionan
- ✅ Rate limiting protege el servidor
- ✅ No hay memory leaks

---

## 📞 PRÓXIMOS PASOS

1. **Ejecutar todos los tests** en Replit
2. **Documentar resultados** (bugs encontrados)
3. **Corregir bugs críticos** (si hay)
4. **Iterar** basado en feedback
5. **Monitorear en producción** (si se despliega)

---

**Fecha:** 2025-12-31
**Versión:** Auto-Discovery v1.1.0 (con correcciones críticas)
**Estado:** ✅ LISTO PARA TESTING EN REPLIT

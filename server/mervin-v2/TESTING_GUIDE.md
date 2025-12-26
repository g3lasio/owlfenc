# Guía de Pruebas - Mervin AI Conversational

## Prerequisitos

Antes de ejecutar las pruebas, asegúrate de tener configurado:

1. **ANTHROPIC_API_KEY** en Replit Secrets o variables de entorno
2. Servidor corriendo en `localhost:5000`
3. Firebase Auth configurado
4. Base de datos con datos de prueba (clientes, estimados, etc.)

## Estructura de Pruebas

Cada workflow tiene 3 tipos de pruebas:

1. **Happy Path** - Flujo completo con todos los datos correctos
2. **Conversational Flow** - Flujo multi-turno con preguntas de seguimiento
3. **Error Handling** - Manejo de errores y datos faltantes

---

## Test 1: Property Verification Workflow

### Test 1.1: Happy Path

**Objetivo:** Verificar que Mervin puede verificar una propiedad con dirección completa.

**Input:**
```
"verifica la propiedad en 123 Main St, Fairfield, CA 94534"
```

**Expected Output:**
- Tipo: `workflow_completed`
- Mensaje incluye: nombre del dueño, tamaño de la propiedad, habitaciones
- Data contiene: `address`, `owner`, `sqft`, `bedrooms`, `bathrooms`, `yearBuilt`

**Validaciones:**
- ✅ Workflow completa exitosamente
- ✅ Datos de propiedad son correctos
- ✅ Respuesta en español con personalidad mexicana
- ✅ Tiempo de ejecución < 30 segundos

### Test 1.2: Conversational Flow

**Objetivo:** Verificar que Mervin pide aclaración cuando la dirección es incompleta.

**Turno 1:**
```
Input: "verifica la casa de la calle main"
Expected: Mervin pide dirección completa
Type: needs_more_info
```

**Turno 2:**
```
Input: "123 main st, fairfield, ca 94534"
Expected: Mervin ejecuta la verificación
Type: workflow_completed
```

**Validaciones:**
- ✅ Mervin detecta información faltante
- ✅ Pregunta es clara y específica
- ✅ Mantiene contexto entre turnos
- ✅ Completa la tarea después de recibir la información

### Test 1.3: Error Handling

**Objetivo:** Verificar manejo de dirección inválida.

**Input:**
```
"verifica la propiedad en 999 Nonexistent St, Fakecity, XX 00000"
```

**Expected Output:**
- Tipo: `error` o mensaje indicando que no se encontró la propiedad
- Mensaje explica el problema claramente

**Validaciones:**
- ✅ Error manejado gracefully
- ✅ Mensaje de error es claro y útil
- ✅ No crash del sistema

---

## Test 2: Estimate Workflow

### Test 2.1: Happy Path

**Objetivo:** Crear un estimado completo con todos los datos.

**Input:**
```
"crea un estimado para Juan Perez, su proyecto es una cerca de madera de 100 pies lineales, 6 pies de alto, en 123 Main St, Fairfield, CA"
```

**Expected Output:**
- Tipo: `workflow_completed`
- Mensaje incluye: ID del estimado, total, URL compartible
- Data contiene: `estimateId`, `total`, `shareableUrl`

**Validaciones:**
- ✅ Cliente buscado o creado correctamente
- ✅ DeepSearch ejecutado con éxito
- ✅ Materiales y mano de obra calculados
- ✅ Totales correctos (subtotal + impuestos)
- ✅ Estimado guardado en la base de datos
- ✅ URL compartible generada
- ✅ Tiempo de ejecución < 60 segundos

### Test 2.2: Conversational Flow - Cliente Ambiguo

**Objetivo:** Manejar cliente con nombre ambiguo.

**Setup:** Crear 2 clientes con nombres similares:
- Juan S. Perez (juan.s@email.com)
- Juan M. Perez (juan.m@email.com)

**Turno 1:**
```
Input: "crea un estimado para juan perez"
Expected: Mervin muestra opciones de clientes
Type: needs_more_info
```

**Turno 2:**
```
Input: "el primero, juan s perez"
Expected: Mervin confirma y pide detalles del proyecto
Type: needs_more_info
```

**Turno 3:**
```
Input: "cerca de madera de 100 pies en 123 main st fairfield ca"
Expected: Mervin ejecuta el workflow
Type: workflow_completed
```

**Validaciones:**
- ✅ Detecta ambigüedad en el nombre
- ✅ Presenta opciones claras
- ✅ Entiende la selección del usuario
- ✅ Mantiene contexto a través de múltiples turnos
- ✅ Completa el estimado correctamente

### Test 2.3: Conversational Flow - Cliente Sin Email

**Objetivo:** Detectar y manejar cliente sin email.

**Setup:** Crear cliente "Juan Perez" sin email en la base de datos.

**Turno 1:**
```
Input: "crea un estimado para juan perez, cerca de 100 pies en fairfield"
Expected: Mervin encuentra cliente pero nota que no tiene email
```

**Expected Message:**
```
"Encontré a Juan Perez en el sistema, pero no tiene email guardado. 
De todos modos puedo hacer el estimado, pero si quieres enviárselo 
por correo después, dame su email y lo guardo ahorita."
```

**Turno 2 (Opción A - Continuar sin email):**
```
Input: "continua sin email"
Expected: Mervin crea el estimado sin enviar email
```

**Turno 2 (Opción B - Proporcionar email):**
```
Input: "su email es juan@email.com"
Expected: Mervin actualiza el cliente y crea el estimado
```

**Validaciones:**
- ✅ Detecta dato faltante (email)
- ✅ Ofrece opciones al usuario
- ✅ Puede continuar sin el dato opcional
- ✅ Puede actualizar el dato si el usuario lo proporciona

### Test 2.4: Error Handling - Descripción Insuficiente

**Objetivo:** Manejar descripción de proyecto muy vaga.

**Input:**
```
"crea un estimado para juan perez, es un proyecto de construcción"
```

**Expected Output:**
- Tipo: `needs_more_info`
- Mensaje pide detalles específicos (tipo de proyecto, medidas, ubicación)

**Validaciones:**
- ✅ Detecta información insuficiente
- ✅ Pide detalles específicos
- ✅ Da ejemplos de lo que necesita

---

## Test 3: Contract Workflow

### Test 3.1: Happy Path

**Objetivo:** Crear un contrato completo.

**Input:**
```
"crea un contrato para Juan Perez, juan@email.com, para una cerca de madera por $2,500, en 123 Main St, Fairfield, CA"
```

**Expected Output:**
- Tipo: `workflow_completed`
- Mensaje incluye: ID del contrato, URLs de firma
- Data contiene: `contractId`, `contractorSignUrl`, `clientSignUrl`

**Validaciones:**
- ✅ Contrato generado con Claude
- ✅ Dual-signature iniciado
- ✅ URLs de firma creadas
- ✅ Email enviado al cliente
- ✅ Tiempo de ejecución < 90 segundos

### Test 3.2: Conversational Flow - Email Faltante

**Objetivo:** Pedir email si no se proporciona.

**Turno 1:**
```
Input: "crea un contrato para juan perez"
Expected: Mervin pide email (requerido para contratos)
Type: needs_more_info
```

**Turno 2:**
```
Input: "su email es juan@email.com"
Expected: Mervin pide detalles del proyecto
Type: needs_more_info
```

**Turno 3:**
```
Input: "cerca de madera por $2,500 en 123 main st fairfield"
Expected: Mervin crea el contrato
Type: workflow_completed
```

**Validaciones:**
- ✅ Identifica email como requerido
- ✅ Explica por qué es necesario
- ✅ Recolecta información paso a paso
- ✅ Completa el contrato exitosamente

---

## Test 4: Permit Advisor Workflow

### Test 4.1: Happy Path

**Objetivo:** Consultar permisos necesarios.

**Input:**
```
"qué permisos necesito para una cerca de 6 pies en 123 Main St, Fairfield, CA?"
```

**Expected Output:**
- Tipo: `workflow_completed`
- Mensaje incluye: información sobre permisos necesarios
- Data contiene: `permitInfo` con requisitos

**Validaciones:**
- ✅ Consulta ejecutada correctamente
- ✅ Información de permisos es relevante
- ✅ Respuesta es clara y accionable
- ✅ Tiempo de ejecución < 30 segundos

### Test 4.2: Conversational Flow

**Objetivo:** Recolectar información faltante.

**Turno 1:**
```
Input: "necesito saber sobre permisos para un proyecto"
Expected: Mervin pide tipo de proyecto y ubicación
Type: needs_more_info
```

**Turno 2:**
```
Input: "es una cerca en fairfield california"
Expected: Mervin consulta permisos
Type: workflow_completed
```

**Validaciones:**
- ✅ Identifica información faltante
- ✅ Pide detalles específicos
- ✅ Ejecuta consulta con información completa

---

## Test 5: Client Management

### Test 5.1: Search Client - Found

**Objetivo:** Buscar cliente existente.

**Input:**
```
"busca el cliente juan perez"
```

**Expected Output:**
- Tipo: `conversation`
- Mensaje incluye: información del cliente encontrado

**Validaciones:**
- ✅ Cliente encontrado correctamente
- ✅ Información completa mostrada
- ✅ Formato claro y legible

### Test 5.2: Search Client - Not Found

**Objetivo:** Buscar cliente que no existe.

**Input:**
```
"busca el cliente nonexistent person"
```

**Expected Output:**
- Tipo: `conversation`
- Mensaje indica que no se encontró el cliente
- Ofrece crear el cliente

**Validaciones:**
- ✅ Maneja cliente no encontrado gracefully
- ✅ Ofrece alternativa (crear cliente)

### Test 5.3: Create Client

**Objetivo:** Crear nuevo cliente.

**Input:**
```
"crea un cliente llamado Maria Garcia, email maria@email.com, teléfono 555-1234"
```

**Expected Output:**
- Tipo: `conversation`
- Mensaje confirma creación del cliente
- Data contiene: `clientId`

**Validaciones:**
- ✅ Cliente creado correctamente
- ✅ Todos los datos guardados
- ✅ Confirmación clara

---

## Test 6: OCR Functionality

### Test 6.1: Image OCR

**Objetivo:** Extraer texto de una imagen.

**Setup:** Preparar imagen con texto claro (ej. plano de construcción).

**Input:**
```
POST /api/mervin-conversational/ocr
{
  "imageData": "base64-encoded-image",
  "imageType": "image/jpeg"
}
```

**Expected Output:**
```json
{
  "success": true,
  "extractedText": "Texto extraído..."
}
```

**Validaciones:**
- ✅ Texto extraído correctamente
- ✅ Formato legible
- ✅ Medidas y números identificados

### Test 6.2: OCR + Estimate Creation

**Objetivo:** Crear estimado basado en imagen de plano.

**Input:**
```
[Usuario sube imagen de plano]
"crea un estimado para juan perez basado en este plano"
```

**Expected Flow:**
1. Mervin procesa imagen con OCR
2. Extrae medidas y especificaciones
3. Pide confirmación de información extraída
4. Crea el estimado

**Validaciones:**
- ✅ OCR ejecutado automáticamente
- ✅ Información extraída correctamente
- ✅ Usuario puede confirmar/corregir
- ✅ Estimado creado con datos correctos

---

## Test 7: Conversational Personality

### Test 7.1: Natural Language Understanding

**Objetivo:** Verificar que Mervin entiende lenguaje natural y coloquial.

**Test Cases:**
```
1. "crea un estimdo para juan perez" (typo)
   Expected: Mervin entiende "estimado"

2. "verifica la casa de juan"
   Expected: Mervin pide dirección específica

3. "simon ese mero" (slang mexicano)
   Expected: Mervin entiende como confirmación

4. "nel, el otro" (slang mexicano)
   Expected: Mervin entiende como negación y selección alternativa
```

**Validaciones:**
- ✅ Tolera errores de escritura
- ✅ Entiende lenguaje coloquial
- ✅ Interpreta slang mexicano correctamente

### Test 7.2: Personality Consistency

**Objetivo:** Verificar que Mervin mantiene su personalidad.

**Validaciones:**
- ✅ Usa expresiones mexicanas ("primo", "órale", "simón")
- ✅ Tono amigable pero profesional
- ✅ Entusiasta sobre el trabajo
- ✅ Directo y claro
- ✅ No usa emojis excesivos

---

## Test 8: Error Recovery

### Test 8.1: API Timeout

**Objetivo:** Manejar timeout de API externa.

**Setup:** Simular timeout en DeepSearch.

**Expected Behavior:**
- Mervin intenta retry (según retryPolicy)
- Si falla, informa al usuario claramente
- Ofrece alternativa (crear estimado manual)

**Validaciones:**
- ✅ Retry automático
- ✅ Error manejado gracefully
- ✅ Usuario informado claramente
- ✅ Alternativas ofrecidas

### Test 8.2: Invalid Data

**Objetivo:** Manejar datos inválidos del usuario.

**Test Cases:**
```
1. Monto negativo: "crea un contrato por $-500"
2. Fecha inválida: "fecha de inicio: 32 de enero"
3. Email inválido: "email: not-an-email"
```

**Expected Behavior:**
- Mervin detecta dato inválido
- Explica el problema
- Pide dato correcto

**Validaciones:**
- ✅ Validación de datos
- ✅ Mensajes de error claros
- ✅ Permite corrección

---

## Checklist de Pruebas

### Property Verification
- [ ] Test 1.1: Happy Path
- [ ] Test 1.2: Conversational Flow
- [ ] Test 1.3: Error Handling

### Estimate Workflow
- [ ] Test 2.1: Happy Path
- [ ] Test 2.2: Cliente Ambiguo
- [ ] Test 2.3: Cliente Sin Email
- [ ] Test 2.4: Descripción Insuficiente

### Contract Workflow
- [ ] Test 3.1: Happy Path
- [ ] Test 3.2: Email Faltante

### Permit Advisor
- [ ] Test 4.1: Happy Path
- [ ] Test 4.2: Conversational Flow

### Client Management
- [ ] Test 5.1: Search Found
- [ ] Test 5.2: Search Not Found
- [ ] Test 5.3: Create Client

### OCR
- [ ] Test 6.1: Image OCR
- [ ] Test 6.2: OCR + Estimate

### Personality
- [ ] Test 7.1: Natural Language
- [ ] Test 7.2: Personality Consistency

### Error Recovery
- [ ] Test 8.1: API Timeout
- [ ] Test 8.2: Invalid Data

---

## Ejecutar Pruebas

### Método 1: Script Automatizado

```bash
cd /home/ubuntu/owlfenc
npx tsx server/test-mervin-conversational.ts
```

### Método 2: Pruebas Manuales con curl

Ver ejemplos en `MERVIN_CONVERSATIONAL_DOCS.md`

### Método 3: Frontend de Pruebas

Usar el componente `MervinExperience.tsx` en el frontend.

---

## Criterios de Éxito

Para que Mervin AI Conversational se considere completamente funcional:

1. ✅ Todos los workflows completan exitosamente (Happy Path)
2. ✅ Conversaciones multi-turno funcionan correctamente
3. ✅ Manejo de errores es robusto
4. ✅ Personalidad es consistente
5. ✅ OCR funciona con precisión razonable (>80%)
6. ✅ Tiempo de respuesta < 60 segundos para workflows complejos
7. ✅ No hay crashes o errores no manejados
8. ✅ Documentación completa y precisa

---

## Reporte de Bugs

Si encuentras un bug durante las pruebas, documenta:

1. **Input del usuario**
2. **Expected behavior**
3. **Actual behavior**
4. **Logs relevantes**
5. **Pasos para reproducir**

Formato:
```
BUG: [Título descriptivo]

Input: "..."
Expected: ...
Actual: ...

Logs:
```
[logs]
```

Steps to reproduce:
1. ...
2. ...
```

# 🛠️ Cómo Agregar Nuevas Herramientas a Mervin AI

Esta guía documenta el proceso exacto para agregar nuevas herramientas (tools) a Mervin AI. Sigue estos pasos y Mervin aprenderá automáticamente a usar la nueva herramienta.

## 📋 Prerequisitos

Antes de agregar una herramienta, asegúrate que:
1. ✅ El endpoint backend correspondiente EXISTE y funciona
2. ✅ Tienes claro qué hace la herramienta y cuándo usarla
3. ✅ Conoces los parámetros que requiere

## 🎯 Proceso Completo (5 Pasos)

### Paso 1: Agregar Método a SystemAPIService

**Archivo:** `server/mervin-v2/services/SystemAPIService.ts`

**Patrón:** Los métodos actúan como **proxies** a endpoints existentes. NUNCA reimplementar funcionalidad.

```typescript
/**
 * Descripción clara de qué hace el método
 */
async miNuevoMetodo(params: TipoParams): Promise<TipoRetorno> {
  try {
    const response = await this.client.post('/api/endpoint-existente', params);
    console.log('✅ [SYSTEM-API] Operación exitosa');
    return response.data;
  } catch (error: any) {
    console.error('❌ [SYSTEM-API] Error:', error.message);
    throw new Error(`Error en operación: ${error.response?.data?.error || error.message}`);
  }
}
```

**Convenciones de nombres:**
- GET/List → `getThing()` o `getThings()`
- POST/Create → `createThing()`
- PUT/Update → `updateThing()`
- DELETE → `deleteThing()`
- POST/Send → `sendThing()` o `sendThingEmail()`

### Paso 2: Agregar Tool Definition

**Archivo:** `server/assistants/tools-registry.ts`

**Agregar a array `TOOL_DEFINITIONS`:**

```typescript
{
  type: 'function',
  function: {
    name: 'mi_nueva_tool',  // snake_case
    description: 'Descripción CLARA de qué hace esta herramienta y cuándo usarla',
    parameters: {
      type: 'object',
      properties: {
        parametro1: {
          type: 'string',
          description: 'Descripción del parámetro'
        },
        parametro2: {
          type: 'number',
          description: 'Otro parámetro (opcional si no está en required)'
        }
      },
      required: ['parametro1']  // Solo parámetros OBLIGATORIOS
    }
  }
}
```

**Tips importantes:**
- Description debe ser MUY clara - Mervin la lee para decidir cuándo usar la tool
- Usar snake_case para tool names (ej: `create_invoice`, no `createInvoice`)
- `required` array solo incluye parámetros OBLIGATORIOS
- Si todos los parámetros son opcionales, usar `required: []`

### Paso 3: Crear Tool Executor

**Archivo:** `server/assistants/tools-registry.ts`

**Agregar función executor antes del TOOL_REGISTRY:**

```typescript
/**
 * Executor para mi_nueva_tool
 */
const executeMiNuevaTool: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = new SystemAPIService(
      userContext.userId,
      {},
      process.env.NODE_ENV === 'production' ? 'https://app.owlfenc.com' : ''
    );

    const result = await systemAPI.miNuevoMetodo(args);

    return {
      ...result,
      message: `✅ Operación completada exitosamente`
    };
  } catch (error: any) {
    throw new Error(`Failed to execute: ${error.message}`);
  }
};
```

**Estructura del executor:**
- Recibe `args` (parámetros de la herramienta) y `userContext` (userId, etc.)
- Crea instancia de SystemAPIService con userId correcto
- Llama al método correspondiente
- Retorna resultado con mensaje user-friendly
- Maneja errores apropiadamente

### Paso 4: Registrar en TOOL_REGISTRY

**Archivo:** `server/assistants/tools-registry.ts`

**Agregar entrada al objeto `TOOL_REGISTRY`:**

```typescript
export const TOOL_REGISTRY: ToolRegistry = {
  // ... herramientas existentes ...
  
  mi_nueva_tool: {
    definition: TOOL_DEFINITIONS[X],  // Índice de tu definition en el array
    executor: executeMiNuevaTool,
    requiresConfirmation: false  // true solo para acciones CRÍTICAS/DESTRUCTIVAS
  }
};
```

**Cuándo usar `requiresConfirmation: true`:**
- ✅ DELETE operations
- ✅ Crear contratos legales
- ✅ Enviar emails masivos
- ❌ GET/READ operations
- ❌ CREATE operations normales

### Paso 5: Agregar Metadata (Opcional pero Recomendado)

**Archivo:** `server/assistants/tool-metadata.ts`

**Agregar a `TOOL_METADATA_REGISTRY`:**

```typescript
mi_nueva_tool: {
  name: 'mi_nueva_tool',
  category: ToolCategory.INVOICES,  // O la categoría apropiada
  operation: ToolOperation.CREATE,  // CREATE, READ, UPDATE, DELETE, SEND, etc.
  requiresConfirmation: false,
  description: 'Breve descripción',
  examples: [
    'Create invoice for completed project',
    'Generate bill for client'
  ],
  relatedTools: ['get_invoice', 'send_invoice_email']
}
```

**Categorías disponibles:**
- `ESTIMATES`, `CONTRACTS`, `INVOICES`, `PROPERTY`, `PERMITS`, `CLIENTS`, `PAYMENTS`, `REPORTS`, `OTHER`

**Operaciones disponibles:**
- `CREATE`, `READ`, `UPDATE`, `DELETE`, `SEND`, `ANALYZE`, `VERIFY`

## ✅ Validación

Después de agregar tu herramienta, valida que todo está correcto:

```typescript
import { printValidationReport } from './validation';

// En server startup o en test
printValidationReport();
```

Esto verificará:
- ✅ Definition existe
- ✅ Executor existe
- ✅ Metadata registrada
- ✅ No hay herramientas huérfanas

## 🔄 Actualizar Assistant en OpenAI

El assistant se actualiza automáticamente cuando el servidor inicia. Si el assistant ya existe, se actualizará con las nuevas herramientas.

Para forzar actualización manual:
```typescript
import { updateMervinAssistant } from './config';
import { TOOL_DEFINITIONS } from './tools-registry';

await updateMervinAssistant(assistantId, TOOL_DEFINITIONS);
```

## 📝 Ejemplo Completo: Agregar `create_invoice`

### 1. SystemAPIService

```typescript
async createInvoice(params: {
  contractId: string;
  dueDate?: string;
  notes?: string;
}): Promise<any> {
  try {
    const response = await this.client.post('/api/invoices', params);
    console.log('✅ [SYSTEM-API] Invoice created');
    return response.data;
  } catch (error: any) {
    throw new Error(`Error creating invoice: ${error.message}`);
  }
}
```

### 2. Tool Definition

```typescript
{
  type: 'function',
  function: {
    name: 'create_invoice',
    description: 'Create an invoice for a completed project or contract',
    parameters: {
      type: 'object',
      properties: {
        contractId: {
          type: 'string',
          description: 'ID of the contract to invoice'
        },
        dueDate: {
          type: 'string',
          description: 'Payment due date (optional)'
        },
        notes: {
          type: 'string',
          description: 'Additional notes for invoice (optional)'
        }
      },
      required: ['contractId']
    }
  }
}
```

### 3. Executor

```typescript
const executeCreateInvoice: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = new SystemAPIService(userContext.userId, {}, 
      process.env.NODE_ENV === 'production' ? 'https://app.owlfenc.com' : '');
    
    const invoice = await systemAPI.createInvoice({
      contractId: args.contractId,
      dueDate: args.dueDate,
      notes: args.notes
    });

    return {
      invoiceId: invoice.id,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      message: `✅ Invoice #${invoice.id} created successfully`
    };
  } catch (error: any) {
    throw new Error(`Failed to create invoice: ${error.message}`);
  }
};
```

### 4. Registry Entry

```typescript
create_invoice: {
  definition: TOOL_DEFINITIONS[14],  // Asumiendo que es el índice 14
  executor: executeCreateInvoice,
  requiresConfirmation: false
}
```

### 5. Metadata

```typescript
create_invoice: {
  name: 'create_invoice',
  category: ToolCategory.INVOICES,
  operation: ToolOperation.CREATE,
  requiresConfirmation: false,
  description: 'Create invoice for completed work',
  examples: ['Create invoice for completed project', 'Bill client for work'],
  relatedTools: ['get_contract_by_id', 'send_invoice_email']
}
```

## 🎓 Filosofía de Mervin

Recuerda: **Mervin aprende herramientas nuevas automáticamente**. 

Las instrucciones del Assistant están diseñadas para ser "meta" - enseñan a Mervin CÓMO identificar y usar herramientas, no a memorizar herramientas específicas.

Cuando agregas una nueva herramienta:
1. OpenAI recibe la definition con descripción clara
2. Mervin lee la descripción y entiende qué hace
3. Mervin identifica el patrón (create_*, get_*, update_*, etc.)
4. Mervin sabe cuándo usarla basándose en el request del usuario

**No necesitas modificar las instrucciones del Assistant** cada vez que agregas una herramienta. Solo asegúrate que la description sea clara y siga los patrones establecidos.

## 🚨 Checklist Pre-Deploy

Antes de deployar herramientas nuevas:

- [ ] Endpoint backend existe y funciona
- [ ] Método en SystemAPIService implementado
- [ ] Tool definition agregada a TOOL_DEFINITIONS
- [ ] Executor implementado
- [ ] Registry actualizado
- [ ] Metadata agregada (opcional)
- [ ] Validation pasa sin errores
- [ ] Probado manualmente con Mervin
- [ ] Documentación actualizada si necesario

## 🆘 Troubleshooting

**Error: "Tool not found in registry"**
- Verificar que el nombre en definition, executor y registry sean EXACTAMENTE iguales
- Usar snake_case consistentemente

**Error: "Missing required parameter"**
- Verificar que args.parametro exista en el executor
- Si es opcional, usar `args.parametro || valorDefault`

**Error: "Endpoint not found"**
- Verificar que la ruta en SystemAPIService sea correcta
- Confirmar que el endpoint esté montado en server/index.ts o routes.ts

**Mervin no usa la herramienta:**
- Mejorar la description - debe ser MUY clara y específica
- Agregar ejemplos de uso en la description
- Verificar que el patrón de naming sea consistente

## 📚 Referencias

- Tool Definitions: `server/assistants/tools-registry.ts`
- SystemAPIService: `server/mervin-v2/services/SystemAPIService.ts`
- Metadata: `server/assistants/tool-metadata.ts`
- Validation: `server/assistants/validation.ts`
- Config: `server/assistants/config.ts`

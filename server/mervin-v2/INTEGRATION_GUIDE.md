# Guía de Integración - Mervin AI Conversational

## Descripción General

Esta guía explica cómo integrar el nuevo sistema Mervin AI Conversational con el frontend existente de Owl Fenc App.

## Pasos de Integración

### Paso 1: Configurar Variables de Entorno

En Replit Secrets, agregar:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
BASE_URL=https://tu-dominio.replit.app
```

### Paso 2: Registrar Rutas en el Servidor Principal

Editar `server/index.ts` o `server/routes.ts`:

```typescript
import mervinConversationalRoutes from './routes/mervin-conversational';

// Registrar rutas
app.use('/api/mervin-conversational', mervinConversationalRoutes);
```

### Paso 3: Actualizar el Frontend

#### Opción A: Actualizar Componente Existente

Si ya tienes un componente `MervinExperience.tsx`, actualizarlo para usar el nuevo endpoint:

```typescript
// client/src/components/mervin/MervinExperience.tsx

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: string;
  data?: any;
}

export function MervinExperience() {
  const { user, getIdToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = await getIdToken();
      
      const response = await fetch('/api/mervin-conversational/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          input: input,
          conversationId: conversationId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Guardar conversation ID para mantener contexto
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          type: data.type,
          data: data.data
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Si el workflow se completó, mostrar resultados especiales
        if (data.type === 'workflow_completed') {
          handleWorkflowCompleted(data);
        }
      } else {
        throw new Error(data.error || 'Error desconocido');
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: `Lo siento, hubo un error: ${error.message}`,
        type: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkflowCompleted = (data: any) => {
    // Manejar diferentes tipos de workflows
    switch (data.workflowId) {
      case 'estimate_wizard':
        // Mostrar botón para ver el estimado
        if (data.data?.shareableUrl) {
          console.log('Estimate created:', data.data.shareableUrl);
          // Opcional: Navegar a la página del estimado
          // navigate(`/estimates/${data.data.estimateId}`);
        }
        break;
        
      case 'contract_generator':
        // Mostrar links de firma
        if (data.data?.contractorSignUrl) {
          console.log('Contract created:', data.data.contractorSignUrl);
        }
        break;
        
      case 'property_verification':
        // Mostrar información de la propiedad
        console.log('Property verified:', data.data);
        break;
    }
  };

  const clearConversation = async () => {
    if (!conversationId) return;

    try {
      const token = await getIdToken();
      
      await fetch(`/api/mervin-conversational/conversation/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setConversationId(null);
      setMessages([]);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  return (
    <div className="mervin-chat">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="content">{msg.content}</div>
            {msg.type === 'workflow_completed' && msg.data && (
              <div className="workflow-result">
                {renderWorkflowResult(msg.data)}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message assistant loading">
            <div className="content">Mervin está pensando...</div>
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Escribe tu mensaje..."
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
          Enviar
        </button>
        {conversationId && (
          <button onClick={clearConversation} className="clear-btn">
            Nueva Conversación
          </button>
        )}
      </div>
    </div>
  );
}

function renderWorkflowResult(data: any) {
  if (data.shareableUrl) {
    return (
      <a href={data.shareableUrl} target="_blank" rel="noopener noreferrer">
        Ver Estimado
      </a>
    );
  }
  
  if (data.contractorSignUrl) {
    return (
      <div>
        <a href={data.contractorSignUrl} target="_blank" rel="noopener noreferrer">
          Firmar como Contratista
        </a>
        <br />
        <a href={data.clientSignUrl} target="_blank" rel="noopener noreferrer">
          Link para Cliente
        </a>
      </div>
    );
  }
  
  return null;
}
```

#### Opción B: Crear Nuevo Componente

Si prefieres mantener el componente antiguo, crear uno nuevo:

```typescript
// client/src/components/mervin/MervinConversationalChat.tsx
// [Mismo código que arriba]
```

Y agregarlo a las rutas:

```typescript
// client/src/App.tsx o router config
import { MervinConversationalChat } from './components/mervin/MervinConversationalChat';

// ...
<Route path="/mervin-v3" element={<MervinConversationalChat />} />
```

### Paso 4: Agregar Soporte para OCR (Opcional)

Si quieres que los usuarios puedan subir imágenes:

```typescript
// Agregar al componente MervinExperience

const [selectedFile, setSelectedFile] = useState<File | null>(null);

const handleFileUpload = async (file: File) => {
  setIsLoading(true);

  try {
    // Convertir a base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const imageData = base64Data.split(',')[1]; // Remover prefijo data:image/...
      
      const token = await getIdToken();
      
      // Procesar OCR
      const ocrResponse = await fetch('/api/mervin-conversational/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageData,
          imageType: file.type
        })
      });

      const ocrData = await ocrResponse.json();

      if (ocrData.success) {
        // Agregar texto extraído al input
        setInput(prev => `${prev}\n\nTexto extraído de imagen:\n${ocrData.extractedText}`);
      }
    };
  } catch (error) {
    console.error('Error processing image:', error);
  } finally {
    setIsLoading(false);
  }
};

// En el JSX, agregar input de archivo
<input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }}
/>
```

### Paso 5: Actualizar el Sidebar (Opcional)

Si quieres agregar un link al nuevo Mervin en el sidebar:

```typescript
// client/src/components/Sidebar.tsx

const menuItems = [
  // ... otros items
  {
    icon: <MessageSquare />,
    label: 'Mervin AI',
    path: '/mervin-v3',
    badge: 'NEW'
  }
];
```

### Paso 6: Migración Gradual

Para migrar gradualmente del sistema antiguo al nuevo:

#### Opción 1: Feature Flag

```typescript
// client/src/config.ts
export const FEATURES = {
  USE_MERVIN_CONVERSATIONAL: true // Cambiar a true para habilitar
};

// En el componente
import { FEATURES } from '../../config';

const endpoint = FEATURES.USE_MERVIN_CONVERSATIONAL
  ? '/api/mervin-conversational/message'
  : '/api/mervin-v2/message';
```

#### Opción 2: A/B Testing

```typescript
// Asignar aleatoriamente a usuarios
const useMervinConversational = Math.random() > 0.5;
```

#### Opción 3: Botón de Toggle

```typescript
const [useMervinConversational, setUseMervinConversational] = useState(false);

// En el UI
<button onClick={() => setUseMervinConversational(!useMervinConversational)}>
  {useMervinConversational ? 'Usar Mervin Clásico' : 'Usar Mervin Conversacional'}
</button>
```

### Paso 7: Estilos CSS

Agregar estilos para el nuevo componente:

```css
/* client/src/components/mervin/MervinChat.css */

.mervin-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message .content {
  background: #f0f0f0;
  padding: 12px 16px;
  border-radius: 12px;
  white-space: pre-wrap;
}

.message.user .content {
  background: #007bff;
  color: white;
}

.message.loading .content {
  background: #e0e0e0;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.workflow-result {
  margin-top: 8px;
  padding: 12px;
  background: #e8f5e9;
  border-radius: 8px;
}

.workflow-result a {
  color: #2e7d32;
  text-decoration: underline;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
}

.input-area input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
}

.input-area button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.input-area button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.input-area button.clear-btn {
  background: #6c757d;
}
```

### Paso 8: Testing en Desarrollo

Antes de desplegar a producción:

1. **Test local:**
   ```bash
   npm run dev
   ```

2. **Verificar que el servidor está corriendo:**
   ```bash
   curl http://localhost:5000/api/mervin-conversational/message \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"input": "hola"}'
   ```

3. **Probar en el frontend:**
   - Abrir la app en el navegador
   - Navegar a `/mervin-v3` (o la ruta que configuraste)
   - Enviar mensaje de prueba

### Paso 9: Despliegue a Producción

1. **Commit y push:**
   ```bash
   git add .
   git commit -m "feat: Add Mervin AI Conversational system"
   git push origin main
   ```

2. **Verificar que Replit redespliega automáticamente**

3. **Configurar variables de entorno en producción:**
   - Ir a Replit Secrets
   - Agregar `ANTHROPIC_API_KEY`

4. **Verificar que funciona en producción:**
   ```bash
   curl https://tu-app.replit.app/api/mervin-conversational/message \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"input": "hola"}'
   ```

### Paso 10: Monitoreo

Agregar logging y analytics:

```typescript
// En el componente
const sendMessage = async () => {
  // ... código existente

  // Log analytics
  if (window.gtag) {
    window.gtag('event', 'mervin_message_sent', {
      conversation_id: conversationId,
      message_length: input.length
    });
  }

  // ... resto del código
};
```

## Troubleshooting

### Error: "ANTHROPIC_API_KEY is not configured"

**Solución:**
1. Ir a Replit Secrets
2. Agregar `ANTHROPIC_API_KEY=sk-ant-...`
3. Reiniciar el servidor

### Error: "401 Unauthorized"

**Causa:** Token de Firebase inválido o expirado.

**Solución:**
1. Verificar que `getIdToken()` está funcionando
2. Verificar que el token se está enviando en el header
3. Verificar que Firebase Auth está configurado correctamente

### Error: "Workflow session not found"

**Causa:** El workflow tardó más del tiempo esperado.

**Solución:**
1. Revisar logs del servidor
2. Aumentar timeout en `WorkflowEngine`
3. Verificar que todos los endpoints están respondiendo

### Mensajes no aparecen en el chat

**Causa:** Estado no se actualiza correctamente.

**Solución:**
1. Verificar que `setMessages` está usando función updater: `setMessages(prev => [...prev, newMessage])`
2. Verificar que el componente se está re-renderizando

## Mejores Prácticas

1. **Siempre usar conversationId** para mantener contexto
2. **Limpiar conversación** cuando el usuario cambia de tarea
3. **Mostrar loading state** mientras Mervin procesa
4. **Manejar errores gracefully** con mensajes claros
5. **Guardar historial** en localStorage para persistencia
6. **Implementar rate limiting** para evitar abuso
7. **Agregar analytics** para mejorar el sistema

## Próximos Pasos

1. Implementar streaming de respuestas (SSE)
2. Agregar soporte para voz (speech-to-text)
3. Implementar sugerencias de mensajes
4. Agregar shortcuts de teclado
5. Implementar modo oscuro
6. Agregar notificaciones cuando workflows completan

## Recursos Adicionales

- [Documentación de Mervin Conversational](./MERVIN_CONVERSATIONAL_DOCS.md)
- [Guía de Pruebas](./TESTING_GUIDE.md)
- [Documentación de Claude API](https://docs.anthropic.com/)
- [Documentación de Firebase Auth](https://firebase.google.com/docs/auth)

## Soporte

Si tienes problemas con la integración, revisa:
1. Logs del servidor
2. Console del navegador
3. Network tab en DevTools
4. Documentación de Mervin Conversational

Para reportar bugs o pedir features, crear un issue en el repositorio.

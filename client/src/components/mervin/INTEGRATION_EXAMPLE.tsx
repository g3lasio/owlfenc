/**
 * INTEGRATION_EXAMPLE.tsx
 * 
 * Este archivo muestra cómo integrar los nuevos componentes de renderizado
 * con el sistema de mensajes existente de Mervin.
 * 
 * NO ES UN COMPONENTE FUNCIONAL - ES SOLO UN EJEMPLO DE REFERENCIA
 */

import { useState } from 'react';
import { Message } from '@/mervin-v2/types/responses';
import { AttachmentViewer } from './AttachmentViewer';
import { LinksSection } from './LinksSection';
import { DynamicActionButtons } from './DynamicActionButtons';
import { SmartLoadingEffect } from './SmartLoadingEffect';
import { WorkflowProgressIndicator } from './WorkflowProgressIndicator';
import { MessageContent } from './MessageContent';

/**
 * Ejemplo 1: Renderizar un mensaje con todas las capacidades
 */
function ExampleMessageRenderer() {
  const [message] = useState<Message>({
    id: 'msg-1',
    sender: 'assistant',
    content: 'He encontrado información sobre la propiedad. Aquí están los detalles:',
    
    // Actions dinámicos del backend
    actions: [
      {
        label: 'Generar Estimado',
        action: 'generate_estimate',
        params: { propertyId: '123' },
        style: 'primary'
      },
      {
        label: 'Ver Mapa',
        action: 'show_map',
        params: { lat: 38.2, lng: -122.1 },
        style: 'secondary'
      }
    ],
    
    // Links estructurados
    links: [
      {
        url: 'https://example.com/property/123',
        label: 'Ver en Zillow',
        external: true
      },
      {
        url: '/properties/123',
        label: 'Detalles Internos',
        external: false
      }
    ],
    
    // Adjuntos
    attachments: [
      {
        type: 'pdf',
        url: 'https://example.com/report.pdf',
        filename: 'Property_Report.pdf'
      },
      {
        type: 'image',
        url: 'https://example.com/photo.jpg',
        filename: 'property_photo.jpg'
      }
    ],
    
    // Metadata para efectos inteligentes
    metadata: {
      workflowId: 'wf-123',
      currentStep: 2,
      totalSteps: 5,
      stepName: 'Analizando documentos...',
      progress: 40
    }
  });

  const handleActionExecute = async (action: string, params?: Record<string, any>) => {
    console.log('Ejecutando acción:', action, params);
    // Aquí se haría una llamada al backend con el action y params
    // El backend ejecutaría la herramienta correspondiente
  };

  return (
    <div className="p-4 space-y-4">
      {/* Contenido principal del mensaje */}
      <MessageContent 
        content={message.content}
        sender={message.sender}
        enableTyping={true}
      />
      
      {/* Botones de acción dinámicos */}
      {message.actions && (
        <DynamicActionButtons
          actions={message.actions}
          onActionExecute={handleActionExecute}
        />
      )}
      
      {/* Links estructurados */}
      {message.links && (
        <LinksSection links={message.links} />
      )}
      
      {/* Adjuntos */}
      {message.attachments && (
        <AttachmentViewer attachments={message.attachments} />
      )}
      
      {/* Indicador de progreso de workflow */}
      {message.metadata?.workflowId && (
        <WorkflowProgressIndicator
          metadata={message.metadata}
          isVisible={true}
        />
      )}
    </div>
  );
}

/**
 * Ejemplo 2: Usar SmartLoadingEffect con metadata
 */
function ExampleSmartLoading() {
  const [isLoading, setIsLoading] = useState(true);
  const [metadata] = useState({
    workflowStep: 'analysis',
    currentTool: 'property_search',
    operation: 'analyze'
  });

  return (
    <SmartLoadingEffect
      isVisible={isLoading}
      metadata={metadata}
      onComplete={() => setIsLoading(false)}
    />
  );
}

/**
 * Ejemplo 3: Integración completa en un componente de chat
 */
function ExampleChatIntegration() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState<Record<string, any> | undefined>();

  const handleSendMessage = async (input: string) => {
    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: input
    };
    setMessages(prev => [...prev, userMessage]);

    // Mostrar loading con metadata
    setIsLoading(true);
    setLoadingMetadata({ currentTool: 'processing_request' });

    try {
      // Llamar al backend (AgentClient)
      // const response = await agentClient.sendMessage(input);
      
      // Simular respuesta del backend con EnrichedResponse
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: 'Respuesta del backend',
        actions: [
          { label: 'Acción 1', action: 'action_1', style: 'primary' }
        ],
        links: [
          { url: 'https://example.com', label: 'Ver más', external: true }
        ]
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setLoadingMetadata(undefined);
    }
  };

  const handleActionExecute = async (action: string, params?: Record<string, any>) => {
    // Ejecutar acción dinámica
    console.log('Ejecutando:', action, params);
    
    // Mostrar loading
    setIsLoading(true);
    setLoadingMetadata({ currentTool: action });
    
    try {
      // Llamar al backend para ejecutar la acción
      // const response = await agentClient.sendMessage(`Ejecutar ${action}`, [], 'es', 'agent');
      
      // Agregar respuesta como nuevo mensaje
      // setMessages(prev => [...prev, response]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <MessageContent 
              content={message.content}
              sender={message.sender}
              enableTyping={message.sender === 'assistant'}
            />
            
            {message.actions && (
              <DynamicActionButtons
                actions={message.actions}
                onActionExecute={handleActionExecute}
              />
            )}
            
            {message.links && <LinksSection links={message.links} />}
            {message.attachments && <AttachmentViewer attachments={message.attachments} />}
            {message.metadata?.workflowId && (
              <WorkflowProgressIndicator metadata={message.metadata} isVisible={true} />
            )}
          </div>
        ))}
      </div>

      {/* Loading effect */}
      <SmartLoadingEffect
        isVisible={isLoading}
        metadata={loadingMetadata}
      />

      {/* Input area */}
      <div className="p-4 border-t">
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
          className="w-full p-2 border rounded"
        />
      </div>
    </div>
  );
}

export { ExampleMessageRenderer, ExampleSmartLoading, ExampleChatIntegration };

/**
 * CLAUDE CONVERSATIONAL ENGINE
 * 
 * Motor conversacional principal de Mervin AI usando Claude 3.5 Sonnet.
 * 
 * Responsabilidades:
 * - Mantener conversaciones multi-turno con contexto
 * - Usar tool calling nativo de Claude para ejecutar workflows
 * - Manejar ambigüedad y hacer preguntas de seguimiento
 * - Procesar OCR de imágenes y documentos
 * - Gestionar el estado de la conversación
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ToolUseBlock, TextBlock } from '@anthropic-ai/sdk/resources/messages';

// ============= TYPES =============

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string | Array<any>;
  timestamp: Date;
}

export interface ConversationState {
  conversationId: string;
  userId: string;
  messages: ConversationMessage[];
  currentIntent: string | null;
  collectedParameters: Record<string, any>;
  missingParameters: string[];
  lastToolResult: any | null;
  workflowSessionId: string | null;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ConversationTurn {
  userMessage: string;
  assistantResponse: string;
  toolCalls?: Array<{
    toolName: string;
    params: any;
    result: any;
  }>;
  needsMoreInfo: boolean;
  isComplete: boolean;
}

// ============= CLAUDE CONVERSATIONAL ENGINE =============

export class ClaudeConversationalEngine {
  private anthropic: Anthropic;
  private model: string = 'claude-sonnet-4-20250514'; // Claude Sonnet 4 (May 2025)
  private maxTokens: number = 4096;
  
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ANTHROPIC_API_KEY is not configured in production');
      } else {
        console.warn('⚠️ ANTHROPIC_API_KEY not set. Using a mock for development.');
        this.anthropic = {
          messages: {
            create: async (params) => {
              console.log('--- MOCK ANTHROPIC CALL ---');
              return {
                id: 'mock_message_id',
                type: 'message',
                role: 'assistant',
                content: [{ type: 'text', text: 'This is a mock response from Claude.' }],
                model: 'mock-claude-sonnet-4',
                stop_reason: 'end_turn',
                stop_sequence: null,
                usage: { input_tokens: 10, output_tokens: 10 },
              };
            }
          }
        } as any;
        return;
      }
    }
    
    this.anthropic = new Anthropic({ apiKey });
    console.log('🧠 [CLAUDE-ENGINE] Initialized with model:', this.model);
  }
  
  /**
   * Procesar un turno de conversación con tool calling
   */
  async processConversationTurn(
    state: ConversationState,
    userMessage: string,
    availableTools: ToolDefinition[],
    systemPrompt: string
  ): Promise<ConversationTurn> {
    console.log('💬 [CLAUDE-ENGINE] Processing conversation turn');
    console.log('   User:', userMessage.substring(0, 100) + '...');
    console.log('   Available tools:', availableTools.map(t => t.name).join(', '));
    
    // Agregar mensaje del usuario al historial
    state.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });
    
    // Preparar mensajes para Claude
    const messages = this.prepareMessages(state);
    
    // Preparar herramientas en formato de Claude
    const tools: Tool[] = availableTools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema
    }));
    
    try {
      // Llamar a Claude con tool use
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: messages,
        tools: tools.length > 0 ? tools : undefined
      });
      
      console.log('✅ [CLAUDE-ENGINE] Response received');
      console.log('   Stop reason:', response.stop_reason);
      console.log('   Content blocks:', response.content.length);
      
      // Procesar respuesta
      return await this.processResponse(response, state);
      
    } catch (error: any) {
      console.error('❌ [CLAUDE-ENGINE] Error:', error.message);
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
  
  /**
   * Procesar respuesta de Claude y extraer información
   */
  private async processResponse(
    response: Anthropic.Message,
    state: ConversationState
  ): Promise<ConversationTurn> {
    const turn: ConversationTurn = {
      userMessage: '',
      assistantResponse: '',
      toolCalls: [],
      needsMoreInfo: false,
      isComplete: false
    };
    
    let textContent = '';
    const toolCalls: Array<{ toolName: string; params: any; result: any }> = [];
    
    // Procesar bloques de contenido
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += (block as TextBlock).text;
      } else if (block.type === 'tool_use') {
        const toolBlock = block as ToolUseBlock;
        console.log('🔧 [CLAUDE-ENGINE] Tool call detected:', toolBlock.name);
        
        toolCalls.push({
          toolName: toolBlock.name,
          params: toolBlock.input,
          result: null // Se llenará después de ejecutar
        });
      }
    }
    
    turn.assistantResponse = textContent;
    turn.toolCalls = toolCalls;
    
    // Determinar si Claude está pidiendo más información
    if (response.stop_reason === 'end_turn' && toolCalls.length === 0) {
      // Claude respondió con texto, probablemente pidiendo aclaración
      const lowerText = textContent.toLowerCase();
      turn.needsMoreInfo = 
        lowerText.includes('?') ||
        lowerText.includes('necesito') ||
        lowerText.includes('cuál') ||
        lowerText.includes('qué') ||
        lowerText.includes('podrías') ||
        lowerText.includes('puedes darme');
    }
    
    // Determinar si la conversación está completa
    if (response.stop_reason === 'end_turn' && toolCalls.length === 0 && !turn.needsMoreInfo) {
      turn.isComplete = true;
    }
    
    // Agregar respuesta del asistente al estado
    state.messages.push({
      role: 'assistant',
      content: textContent,
      timestamp: new Date()
    });
    
    return turn;
  }
  
  /**
   * Continuar conversación después de ejecutar una herramienta
   */
  async continueAfterToolExecution(
    state: ConversationState,
    toolResults: Array<{ toolName: string; result: any }>,
    availableTools: ToolDefinition[],
    systemPrompt: string
  ): Promise<ConversationTurn> {
    console.log('🔄 [CLAUDE-ENGINE] Continuing after tool execution');
    console.log('   Tool results:', toolResults.map(r => r.toolName).join(', '));
    
    // Preparar mensajes incluyendo los resultados de las herramientas
    const messages = this.prepareMessagesWithToolResults(state, toolResults);
    
    // Preparar herramientas
    const tools: Tool[] = availableTools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema
    }));
    
    try {
      // Llamar a Claude nuevamente con los resultados
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: messages,
        tools: tools.length > 0 ? tools : undefined
      });
      
      console.log('✅ [CLAUDE-ENGINE] Continuation response received');
      
      // Procesar respuesta
      return await this.processResponse(response, state);
      
    } catch (error: any) {
      console.error('❌ [CLAUDE-ENGINE] Error in continuation:', error.message);
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
  
  /**
   * Preparar mensajes en formato de Claude
   */
  private prepareMessages(state: ConversationState): MessageParam[] {
    const messages: MessageParam[] = [];
    
    for (const msg of state.messages) {
      messages.push({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content
      });
    }
    
    return messages;
  }
  
  /**
   * Preparar mensajes incluyendo resultados de herramientas
   */
  private prepareMessagesWithToolResults(
    state: ConversationState,
    toolResults: Array<{ toolName: string; result: any }>
  ): MessageParam[] {
    const messages = this.prepareMessages(state);
    
    // El último mensaje del asistente debería contener los tool_use blocks
    // Necesitamos agregar los tool_result blocks
    
    // Por ahora, simplificamos agregando los resultados como texto
    // En una implementación completa, necesitaríamos reconstruir los bloques tool_use
    const resultsText = toolResults.map(r => 
      `Tool ${r.toolName} result: ${JSON.stringify(r.result, null, 2)}`
    ).join('\n\n');
    
    messages.push({
      role: 'user',
      content: `[SYSTEM] Tool execution results:\n${resultsText}`
    });
    
    return messages;
  }
  
  /**
   * Procesar imagen con visión de Claude
   */
  async processImageWithOCR(
    imageData: string,
    imageType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
    prompt: string = 'Extract all text from this image'
  ): Promise<string> {
    console.log('📷 [CLAUDE-ENGINE] Processing image with OCR');
    
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageType,
                  data: imageData
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      });
      
      const textBlock = response.content.find(b => b.type === 'text') as TextBlock;
      const extractedText = textBlock ? textBlock.text : '';
      
      console.log('✅ [CLAUDE-ENGINE] OCR completed');
      console.log('   Extracted text length:', extractedText.length);
      
      return extractedText;
      
    } catch (error: any) {
      console.error('❌ [CLAUDE-ENGINE] OCR error:', error.message);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }
  
  /**
   * Generar respuesta simple sin tool calling
   */
  async generateSimpleResponse(
    messages: ConversationMessage[],
    systemPrompt: string
  ): Promise<string> {
    console.log('💬 [CLAUDE-ENGINE] Generating simple response');
    
    const claudeMessages = messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));
    
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: claudeMessages as MessageParam[]
      });
      
      const textBlock = response.content.find(b => b.type === 'text') as TextBlock;
      const text = textBlock ? textBlock.text : '';
      
      console.log('✅ [CLAUDE-ENGINE] Simple response generated');
      
      return text;
      
    } catch (error: any) {
      console.error('❌ [CLAUDE-ENGINE] Error generating response:', error.message);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

// ============= EXPORTS =============

export const claudeEngine = new ClaudeConversationalEngine();

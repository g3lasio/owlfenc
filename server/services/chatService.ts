
import { Message, MessageRole } from "@anthropic/sdk/messages";
import { estimateMessageProcessor } from './estimatorService';
import { mervinProfile } from './mervinProfile';
import { Request } from 'express';
import { sharedEstimateService } from './sharedEstimateService';

// Procesador central de mensajes para el chat
export async function processChatMessage(
  userId: number,
  sessionId: string,
  message: string,
  history: Message[],
  req: Request
) {
  console.log(`Procesando mensaje del usuario ${userId} en sesión ${sessionId}`);
  
  // Analizar el mensaje para determinar la intención
  const lowerMessage = message.toLowerCase();
  
  // Si el mensaje contiene palabras clave relacionadas con estimados
  if (
    lowerMessage.includes('estimado') || 
    lowerMessage.includes('estimate') || 
    lowerMessage.includes('presupuesto') || 
    lowerMessage.includes('cotización') ||
    lowerMessage.includes('cotizacion') ||
    lowerMessage.includes('precio') ||
    lowerMessage.includes('costo')
  ) {
    console.log('Detectada intención de crear un estimado, redirigiendo al procesador de estimados');
    return await estimateMessageProcessor(userId, sessionId, message, history, req);
  }
  
  // Si llega aquí, procesar como un mensaje general
  return await processGeneralChatMessage(userId, sessionId, message, history);
}

// Procesador para mensajes generales
async function processGeneralChatMessage(
  userId: number,
  sessionId: string,
  message: string,
  history: Message[]
) {
  // Implementación básica para mensajes generales
  // Aquí se puede integrar con un servicio LLM como Anthropic Claude
  
  const responseText = `Recibí tu mensaje: "${message}". Soy ${mervinProfile.name}, 
    tu asistente virtual para proyectos de construcción. 
    ¿En qué más puedo ayudarte hoy?`;
  
  return {
    text: responseText,
    role: 'assistant' as MessageRole,
    sessionId,
    userId
  };
}

// Export del servicio principal
export const chatService = {
  processChatMessage
};


import OpenAI from "openai";
import { storage } from "../storage";
import { fenceTypes } from "../../client/src/data/rules/fenceRules";

export class ChatService {
  private openai: OpenAI;
  private currentQuestion: string = "";

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  private getFenceTypeOptions() {
    return Object.keys(fenceTypes).map(type => ({
      text: fenceTypes[type].name,
      clickable: true
    }));
  }

  private getHeightOptions() {
    return ["3 feet", "4 feet", "6 feet", "8 feet"].map(height => ({
      text: height,
      clickable: true
    }));
  }

  async processMessage(message: string, context: any = {}) {
    try {
      // Determinar el estado actual de la conversación
      const conversationState = this.determineConversationState(context);
      let options = [];

      // Generar opciones según el estado
      if (conversationState === "fence_type_selection") {
        options = this.getFenceTypeOptions();
      } else if (conversationState === "height_selection") {
        options = this.getHeightOptions();
      }

      const aiResponse = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Eres un asistente para una empresa de construcción de cercas. Haz una pregunta a la vez y espera la respuesta antes de continuar. Usa las reglas y precios de woodfencerules.js para tus cálculos."
          },
          ...((context.messages || []).map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.content
          }))),
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 150
      });

      return {
        message: aiResponse.choices[0].message.content,
        options,
        context: {
          ...context,
          currentState: this.updateConversationState(conversationState, message)
        }
      };
    } catch (error) {
      console.error("Error en ChatService:", error);
      throw error;
    }
  }

  private determineConversationState(context: any): string {
    // Lógica para determinar el estado actual de la conversación
    if (!context.clientName) return "asking_name";
    if (!context.fenceType) return "fence_type_selection";
    if (!context.fenceHeight) return "height_selection";
    return "general";
  }

  private updateConversationState(currentState: string, message: string): string {
    // Lógica para actualizar el estado según la respuesta del usuario
    switch (currentState) {
      case "asking_name":
        return "fence_type_selection";
      case "fence_type_selection":
        return "height_selection";
      default:
        return "general";
    }
  }
}

export const chatService = new ChatService(process.env.OPENAI_API_KEY || '');

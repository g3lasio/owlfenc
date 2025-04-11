
import OpenAI from "openai";
import { storage } from "../storage";
export class ChatService {
  private openai: OpenAI;
  private currentQuestion: string = "";

  private fenceTypes = {
    wood: { name: "Wood Fence" },
    chainLink: { name: "Chain Link Fence" },
    vinyl: { name: "Vinyl Fence" }
  };

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  private getFenceTypeOptions() {
    return Object.keys(this.fenceTypes).map(type => ({
      text: this.fenceTypes[type].name,
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
      const conversationState = this.determineConversationState(context);
      let options = [];
      
      // Get fence rules from the imported module
      const woodRules = await import("../../client/src/data/rules/woodfencerules.js");
      
      if (conversationState === "fence_type_selection") {
        options = this.getFenceTypeOptions();
      } else if (conversationState === "height_selection") {
        options = this.getHeightOptions();
      }

      const systemPrompt = `Eres un asistente mexicano carismático para una empresa de construcción de cercas. 
      Sigue este flujo exacto de preguntas:
      1. Pide el nombre del cliente
      2. Pregunta el tipo de cerca (wood, chain link, vinyl)
      3. Pregunta la altura (3, 4, 6, 8 pies)
      4. Pregunta los pies lineales
      5. Pregunta si necesita demolición
      6. Pregunta si quiere pintura
      7. Pregunta si quiere puertas
      
      Usa las reglas de ${JSON.stringify(woodRules)} para los cálculos.`;

      const aiResponse = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          ...(context.messages || []).map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.content
          })),
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
    if (!context.clientName) return "asking_name";
    if (!context.fenceType) return "fence_type_selection";
    if (!context.fenceHeight) return "height_selection";
    if (!context.linearFeet) return "asking_length";
    if (context.demolition === undefined) return "asking_demolition";
    if (context.painting === undefined) return "asking_painting";
    if (context.gates === undefined) return "asking_gates";
    return "calculating_estimate";
  }

  private updateConversationState(currentState: string, message: string): string {
    const nextStates = {
      "asking_name": "fence_type_selection",
      "fence_type_selection": "height_selection",
      "height_selection": "asking_length",
      "asking_length": "asking_demolition",
      "asking_demolition": "asking_painting",
      "asking_painting": "asking_gates",
      "asking_gates": "calculating_estimate"
    };
    return nextStates[currentState] || "calculating_estimate";
  }
}

export const chatService = new ChatService(process.env.OPENAI_API_KEY || '');

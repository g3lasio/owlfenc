
import OpenAI from "openai";
import { storage } from "../storage";

export class ChatService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async processMessage(message: string, context: any = {}) {
    try {
      const aiResponse = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Eres un asistente para una empresa de construcción de cercas. Ayudas a los clientes a diseñar y obtener presupuestos para proyectos de instalación de cercas."
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 150
      });

      return {
        message: aiResponse.choices[0].message.content,
        context
      };
    } catch (error) {
      console.error("Error en ChatService:", error);
      throw error;
    }
  }
}

export const chatService = new ChatService(process.env.OPENAI_API_KEY || '');


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

  private lastUserContext: any = null;

  private contextHasChanged(newContext: any): boolean {
    return JSON.stringify(this.lastUserContext) !== JSON.stringify(newContext);
  }

  async processMessage(message: string, context: any = {}) {
    // Update context tracking
    const contextChanged = this.contextHasChanged(context);
    this.lastUserContext = {...context};
    try {
      const conversationState = this.determineConversationState(context);
      let options = [];

      if (message === "START_CHAT" && context.isInitialMessage) {
        const initialResponse = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `Eres Mervin, el asistente virtual de ${context.contractorName}. 
              Ya conoces al contratista y sus datos:
              - Nombre: ${context.contractorName}
              - Licencia: ${context.contractorLicense}
              - Teléfono: ${context.contractorPhone}
              - Email: ${context.contractorEmail}
              - Dirección: ${context.contractorAddress}
              
              Saluda al contratista por su nombre y pregunta por los datos del cliente nuevo para generar un estimado:
              1. Nombre completo del cliente
              2. Teléfono
              3. Email
              4. Dirección donde se instalará la cerca
              
              Usa un tono profesional pero amigable y mexicano.`
            }
          ],
          max_tokens: 150
        });
        return {
          message: initialResponse.choices[0].message.content,
          options: [],
          context: { ...context, currentState: "asking_name" }
        };
      }
      
      // Get fence rules from the imported module
      const woodRules = await import("../../client/src/data/rules/woodfencerules.js");
      
      if (conversationState === "fence_type_selection") {
        options = this.getFenceTypeOptions();
      } else if (conversationState === "height_selection") {
        options = this.getHeightOptions();
      }

      const systemPrompt = `Eres Mervin, asistente de ${context.contractorName || 'Owl Fence'}. 
      - Sé breve y directo
      - Haz UNA sola pregunta a la vez
      - Respuestas cortas y amigables
      - Si el contexto del usuario cambió, utilízalo inmediatamente
      
      Flujo de preguntas:
      1. Nombre del cliente
      2. Tipo de cerca
      3. Altura
      4. Pies lineales
      5. ¿Demolición?
      6. ¿Pintura?
      7. ¿Puertas?
      
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
    if (!context.clientName) return "asking_client_name";
    if (!context.clientPhone) return "asking_client_phone";
    if (!context.clientEmail) return "asking_client_email";
    if (!context.clientAddress) return "asking_client_address";
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
      "asking_client_name": "asking_client_phone",
      "asking_client_phone": "asking_client_email",
      "asking_client_email": "asking_client_address",
      "asking_client_address": "fence_type_selection",
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

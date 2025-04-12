
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

      const systemPrompt = `Eres Mervin, un asistente súper mexicano y carismático de ${context.contractorName || 'Owl Fence'}. 
      Tu personalidad:
      - Usas MUCHAS expresiones mexicanas ("chale", "órale", "va que va", "sale y vale", "chido", "fierro")
      - Eres súper directo y divertido, como un cuate de confianza
      - Haces UNA SOLA pregunta por mensaje, corta y al grano
      - Tu humor es 100% mexicano pero profesional
      
      Reglas estrictas:
      - UNA pregunta por mensaje, no más
      - Máximo 2 líneas de texto por respuesta
      - Usa albures ligeros y humor mexicano
      - Si hay duda, recomienda basado en ${JSON.stringify(woodRules)}
      
      Ejemplos de respuestas correctas:
      "¿Qué onda cuate, de qué material quieres tu cerca? 🌵"
      "¡Arre! ¿Cuántos metros necesitas, compa? 🤠"
      
      Prioriza obtener:
      1. Info del cliente (nombre, contacto)
      2. Detalles de la cerca (tipo, altura, longitud)
      3. Extras (demolición, pintura, puertas)`;

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
    // Verificar si tenemos toda la información necesaria
    const hasAllInfo = context.clientName && 
                      context.clientPhone && 
                      context.clientEmail && 
                      context.clientAddress &&
                      context.fenceType &&
                      context.fenceHeight &&
                      context.linearFeet &&
                      context.demolition !== undefined &&
                      context.painting !== undefined &&
                      context.gates !== undefined;

    // Si tenemos toda la información, preparar el estimado
    if (hasAllInfo) {
      return "preparing_estimate";
    }

    // Si no, continuar con el flujo normal
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
    
    return "preparing_estimate";
  }

  private async updateConversationState(currentState: string, message: string): Promise<string> {
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
      "asking_gates": "preparing_estimate"
    };

    const nextState = nextStates[currentState] || currentState;
    
    if (nextState === "preparing_estimate") {
      // Generar el estimado usando el template
      const estimateHtml = await this.generateEstimate(context);
      return {
        message: "¡Listo! Aquí está tu estimado. ¿Quieres que lo revise contigo o prefieres que te lo envíe por correo?",
        template: {
          type: "estimate",
          html: estimateHtml
        }
      };
    }

    return nextState;
  }

  private async generateEstimate(context: any) {
    try {
      const response = await fetch('/api/generate-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectDetails: {
            clientName: context.clientName,
            clientPhone: context.clientPhone,
            clientEmail: context.clientEmail,
            address: context.clientAddress,
            fenceType: context.fenceType,
            fenceHeight: context.fenceHeight,
            fenceLength: context.linearFeet,
            demolition: context.demolition,
            painting: context.painting,
            gates: context.gates,
            context: context
          }
        })
      });

      const data = await response.json();
      return data.html;
    } catch (error) {
      console.error('Error generating estimate:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService(process.env.OPENAI_API_KEY || '');

// ChatService.ts
import OpenAI from "openai";
import { storage } from "../storage";

export class ChatService {
  private openai: OpenAI;
  private currentQuestion: string = "";
  private lastUserContext: any = null; // Contexto acumulado del usuario

  // Opciones de cercas disponibles:
  private fenceTypes = {
    wood: { name: "Wood Fence" },
    chainLink: { name: "Chain Link Fence" },
    vinyl: { name: "Vinyl Fence" },
  };

  private getFenceTypeOptions(isSpanish: boolean): string[] {
    return isSpanish
      ? ["Cerca de Madera", "Cerca de Metal (Chain Link)", "Cerca de Vinilo"]
      : ["Wood Fence", "Chain Link Fence", "Vinyl Fence"];
  }

  private getHeightOptions(isSpanish: boolean): string[] {
    return isSpanish
      ? [
          "3 pies (36 pulgadas)",
          "4 pies (48 pulgadas)",
          "6 pies (72 pulgadas)",
          "8 pies (96 pulgadas)",
        ]
      : [
          "3 feet (36 inches)",
          "4 feet (48 inches)",
          "6 feet (72 inches)",
          "8 feet (96 inches)",
        ];
  }

  private detectLanguage(message: string): boolean {
    // Detección simple de español por palabras clave
    const spanishIndicators = [
      "hola",
      "gracias",
      "por favor",
      "pies",
      "cerca",
      "madera",
      "necesito",
    ];
    return spanishIndicators.some((word) =>
      message.toLowerCase().includes(word),
    );
  }

  private getDemolitionOptions(): string[] {
    return ["Sí, necesito demolición", "No, no necesito demolición"];
  }

  private getPaintingOptions(): string[] {
    return ["Sí, quiero incluir pintura", "No, no necesito pintura"];
  }

  private getGatesOptions(): string[] {
    return ["Sí, necesito puertas", "No, no necesito puertas"];
  }

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Compara contextos para ver si han cambiado
   */
  private contextHasChanged(newContext: any): boolean {
    return JSON.stringify(this.lastUserContext) !== JSON.stringify(newContext);
  }

  /**
   * Procesa el mensaje del usuario y actualiza el contexto de la conversación.
   */
  async processMessage(message: string, context: any = {}) {
    // Actualiza el contexto si ha cambiado
    const contextChanged = this.contextHasChanged(context);
    this.lastUserContext = { ...context };

    try {
      const conversationState = this.determineConversationState(context);
      let options: string[] = [];

      if (message === "START_CHAT" && context.isInitialMessage) {
        const initialResponse = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `Eres Mervin, el asistente virtual de ${context.contractorName || "Acme Fencing"}. 
Conoces al contratista y sus datos:
- Nombre: ${context.contractorName || "Acme Fencing"}
- Licencia: ${context.contractorLicense || "CCB #123456"}
- Teléfono: ${context.contractorPhone || "(555) 123-4567"}
- Email: ${context.contractorEmail || "info@acmefencing.com"}
- Dirección: ${context.contractorAddress || "123 Main St"}

Saluda al contratista por su nombre y pregunta por los datos del cliente nuevo para generar un estimado:
1. Nombre completo del cliente
2. Teléfono
3. Email
4. Dirección donde se instalará la cerca

Usa un tono profesional pero amigable, con toques mexicanos.`,
            },
          ],
          max_tokens: 150,
        });

        return {
          message:
            initialResponse.choices[0].message.content ||
            "¡Hola! ¿Cómo puedo ayudarte hoy?",
          options: [],
          context: { ...context, currentState: "asking_client_name" },
        };
      }

      // Estado "confirming_details": Se tiene toda la información.
      if (conversationState === "confirming_details") {
        const hasAllRequiredInfo =
          context.clientName &&
          context.clientPhone &&
          context.clientEmail &&
          context.clientAddress &&
          context.fenceType &&
          context.fenceHeight &&
          context.linearFeet;

        if (!hasAllRequiredInfo) {
          return {
            message:
              "¡Órale! Me faltan algunos datos importantes. Permíteme hacer las preguntas necesarias.",
            options: [],
            context: { ...context, currentState: "asking_client_name" },
          };
        }

        const summary = `
¡Perfecto! Aquí está el resumen de la información:

📋 Datos del Cliente:
- Nombre: ${context.clientName}
- Tel: ${context.clientPhone || "Pendiente"}
- Email: ${context.clientEmail || "Pendiente"}
- Dirección: ${context.clientAddress}

🏗️ Detalles de la Cerca:
- Tipo: ${context.fenceType}
- Altura: ${context.fenceHeight} ft
- Longitud: ${context.linearFeet} ft

⚙️ Extras:
- Demolición: ${context.demolition ? "Sí" : "No"}
- Pintura: ${context.painting ? "Sí" : "No"}
- Puertas: ${context.gates ? (Array.isArray(context.gates) ? context.gates.length + " puerta(s)" : "Sí") : "No"}
        `;

        if (
          message.toLowerCase().includes("correcto") ||
          message.toLowerCase().includes("si") ||
          message.toLowerCase().includes("sí")
        ) {
          return {
            message:
              "¡Órale! Voy a preparar tu estimado con estos datos. Dame un momento...",
            options: [],
            context: { ...context, currentState: "preparing_estimate" },
          };
        }

        return {
          message:
            summary +
            "\n\n¿Todo está correcto o necesitas hacer algún cambio? 🤔",
          options: [
            "✅ Todo está correcto, prepara el estimado",
            "🔄 Necesito hacer cambios",
          ],
          context: { ...context, currentState: "confirming_details" },
        };
      }

      // Estado "preparing_estimate": se genera el estimado.
      if (conversationState === "preparing_estimate") {
        if (
          !context.clientName ||
          !context.clientAddress ||
          !context.fenceType ||
          !context.fenceHeight ||
          !context.linearFeet
        ) {
          return {
            message:
              "¡Ups! Me faltan algunos datos importantes. Volvamos a las preguntas.",
            options: [],
            context: { ...context, currentState: "asking_client_name" },
          };
        }

        // Llamada a generateEstimate (API endpoint para generar el HTML del estimado)
        const estimateHtml = await this.generateEstimate(context);
        const summary = `
🎉 ¡Listo compa! Ya preparé el estimado para:
- ${context.fenceType} de ${context.fenceHeight} ft de altura
- ${context.linearFeet} ft lineales
- Para: ${context.clientName}
- En: ${context.clientAddress}
        `;

        return {
          message:
            summary +
            "\n\n¿Quieres que lo revisemos juntos o prefieres que te lo envíe por correo? 📧",
          template: { type: "estimate", html: estimateHtml },
          options: ["👀 Revisar estimado juntos", "📨 Enviar por correo"],
          context: { ...context, currentState: "estimate_ready" },
        };
      }

      // Establecer opciones basadas en el estado de la conversación
      if (conversationState === "fence_type_selection") {
        options = this.getFenceTypeOptions(this.detectLanguage(message));
      } else if (conversationState === "height_selection") {
        options = this.getHeightOptions(this.detectLanguage(message));
      } else if (conversationState === "asking_demolition") {
        options = this.getDemolitionOptions();
      } else if (conversationState === "asking_painting") {
        options = this.getPaintingOptions();
      } else if (conversationState === "asking_gates") {
        options = this.getGatesOptions();
      }

      const isSpanish = this.detectLanguage(message);
      const basePrompt = isSpanish
        ? `Eres Mervin, un asistente profesional bilingüe de ${context.contractorName || "Owl Fence"}. 
Usa un tono profesional y amigable en español y pregunta una sola cosa por mensaje.`
        : `You are Mervin, a professional bilingual assistant from ${context.contractorName || "Owl Fence"}. 
Ask one question per message in clear, friendly English.`;

      const rules = `
Reglas:
- Una pregunta por mensaje, máximo dos líneas.
- Usa humor ligero y tono cordial.
- Prioriza: Client info, Fence details, Extras.`;

      const examples = `
Ejemplo:
"¿Qué tipo de cerca deseas, compa? Wood Fence, Chain Link, o Vinyl Fence?"`;

      const priorities = `
Priority:
1. Client info (name, phone, email, address)
2. Fence details (type, height, length)
3. Extras (demolition, painting, gates)`;

      const systemPrompt =
        basePrompt + "\n" + rules + "\n" + examples + "\n" + priorities;

      const aiResponse = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          ...(context.messages || []).map((m: any) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: message },
        ],
        max_tokens: 150,
      });

      const nextState = await this.updateConversationState(
        conversationState,
        message,
      );
      const updatedContext = {
        ...context,
        ...this.lastUserContext,
        currentState: nextState,
      };

      if (
        updatedContext.fenceType === "Wood Fence" &&
        conversationState === "fence_type_selection"
      ) {
        const woodFencePrompt = `
Ahora el cliente ha seleccionado Cerca de Madera.
Recuerda: Alturas comunes (3,4,6,8 ft). Pregunta extras (demolición, pintura, puertas).
Haz una pregunta a la vez.`;
        if (aiResponse.choices[0].message.content?.includes("?")) {
          return {
            message:
              aiResponse.choices[0].message.content ||
              "¿Qué altura deseas para tu cerca de madera?",
            options,
            context: updatedContext,
          };
        }
      }

      return {
        message:
          aiResponse.choices[0].message.content ||
          "Lo siento, no pude procesar tu mensaje.",
        options,
        context: updatedContext,
      };
    } catch (error) {
      console.error("Error en ChatService:", error);
      throw error;
    }
  }

  private determineConversationState(context: any): string {
    if (
      context.currentState === "confirming_details" ||
      context.currentState === "preparing_estimate" ||
      context.currentState === "estimate_ready"
    ) {
      return context.currentState;
    }

    const hasAllInfo =
      context.clientName &&
      context.clientPhone &&
      context.clientEmail &&
      context.clientAddress &&
      context.fenceType &&
      context.fenceHeight &&
      context.linearFeet &&
      context.demolition !== undefined &&
      context.painting !== undefined &&
      context.gates !== undefined;

    if (hasAllInfo && context.currentState === "asking_gates") {
      return "confirming_details";
    }

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

    return context.currentState || "asking_client_name";
  }

  private async updateConversationState(
    currentState: string,
    message: string,
  ): Promise<string> {
    // Validar si tenemos todos los datos necesarios
    const validateRequiredData = () => {
      const required = [
        'clientName',
        'clientPhone',
        'clientEmail',
        'clientAddress',
        'fenceType',
        'fenceHeight',
        'linearFeet'
      ];
      
      return required.every(field => this.lastUserContext[field]);
    };

    // Extraer números del mensaje
    const extractNumber = (msg: string): number | null => {
      const matches = msg.match(/\d+/);
      return matches ? parseInt(matches[0]) : null;
    };

    const nextStates: Record<string, string> = {
      asking_client_name: "asking_client_phone",
      asking_client_phone: "asking_client_email",
      asking_client_email: "asking_client_address",
      asking_client_address: "fence_type_selection",
      fence_type_selection: "height_selection",
      height_selection: "asking_length",
      asking_length: "asking_demolition",
      asking_demolition: "asking_painting",
      asking_painting: "asking_gates",
      asking_gates: "confirming_details",
      confirming_details: "preparing_estimate",
    };

    // Procesar mensajes según el estado actual
    if (currentState === "asking_length") {
      const feet = extractNumber(message);
      if (feet) {
        this.lastUserContext.linearFeet = feet;
        this.lastUserContext.state = "California"; // Default state
      }
    }

    if (
      currentState === "confirming_details" &&
      message.toLowerCase().includes("correcto")
    ) {
      return "preparing_estimate";
    }

    if (currentState === "asking_client_name") {
      const nameParts = message.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        this.lastUserContext.clientName = message.trim();
      }
    }

    if (currentState === "fence_type_selection") {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("madera")) {
        this.lastUserContext.fenceType = "Wood Fence";
        const woodRules = await import(
          "../../client/src/data/rules/woodfencerules.js"
        );
        if (woodRules && woodRules.defaultSettings) {
          this.lastUserContext.woodRulesLoaded = true;
          this.lastUserContext.postType =
            woodRules.defaultSettings.postType || "4x4";
        }
      } else if (
        lowerMessage.includes("metal") ||
        lowerMessage.includes("chain link")
      ) {
        this.lastUserContext.fenceType = "Chain Link Fence";
      } else if (
        lowerMessage.includes("vinilo") ||
        lowerMessage.includes("vinyl")
      ) {
        this.lastUserContext.fenceType = "Vinyl Fence";
      }
    }

    if (currentState === "height_selection") {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("3")) {
        this.lastUserContext.fenceHeight = 3;
      } else if (lowerMessage.includes("4")) {
        this.lastUserContext.fenceHeight = 4;
      } else if (lowerMessage.includes("6")) {
        this.lastUserContext.fenceHeight = 6;
      } else if (lowerMessage.includes("8")) {
        this.lastUserContext.fenceHeight = 8;
      }
    }

    if (currentState === "asking_demolition") {
      const lowerMessage = message.toLowerCase();
      this.lastUserContext.demolition =
        lowerMessage.includes("sí") ||
        lowerMessage.includes("si") ||
        lowerMessage.includes("demolición");
    }

    if (currentState === "asking_painting") {
      const lowerMessage = message.toLowerCase();
      this.lastUserContext.painting =
        lowerMessage.includes("sí") ||
        lowerMessage.includes("si") ||
        lowerMessage.includes("pintura");
    }

    if (currentState === "asking_gates") {
      const lowerMessage = message.toLowerCase();
      const needsGates =
        lowerMessage.includes("sí") ||
        lowerMessage.includes("si") ||
        lowerMessage.includes("necesito puertas");
      this.lastUserContext.gates = needsGates ? [] : false;
      if (needsGates) {
        this.lastUserContext.gatesCount = 1;
      }
    }

    return nextStates[currentState] || currentState;
  }

  private async generateEstimate(context: any) {
    try {
      // Validar datos requeridos
      const requiredFields = [
        'clientName',
        'clientPhone', 
        'clientEmail',
        'clientAddress',
        'fenceType',
        'fenceHeight',
        'linearFeet'
      ];

      const missingFields = requiredFields.filter(field => !context[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Faltan datos requeridos: ${missingFields.join(', ')}`);
      }

      // Preparar detalles del proyecto
      const projectDetails = {
        clientName: context.clientName,
        clientPhone: context.clientPhone,
        clientEmail: context.clientEmail,
        address: context.clientAddress,
        fenceType: context.fenceType,
        fenceHeight: context.fenceHeight,
        fenceLength: context.linearFeet,
        demolition: context.demolition || false,
        painting: context.painting || false,
        gates: context.gates || [],
        state: context.state || 'California',
        context: {
          ...context,
          estimateDate: new Date().toISOString(),
          projectId: `EST-${Date.now()}`,
          contractorInfo: {
            name: context.contractorName,
            license: context.contractorLicense,
            phone: context.contractorPhone,
            email: context.contractorEmail,
            address: context.contractorAddress
          }
        },
      };

      const response = await fetch("/api/generate-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectDetails }),
      });
      const data = await response.json();
      return data.html;
    } catch (error) {
      console.error("Error generating estimate:", error);
      throw error;
    }
  }
}

export const chatService = new ChatService(process.env.OPENAI_API_KEY || "");

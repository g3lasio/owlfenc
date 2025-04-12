import OpenAI from "openai";

interface ChatContext {
  currentState?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  fenceType?: string;
  fenceHeight?: number;
  linearFeet?: number;
  demolition?: boolean;
  painting?: boolean;
  gates?: any[];
  postType?: string;
  state?: string;
}

interface ChatResponse {
  message: string;
  context?: ChatContext;
  options?: string[];
  template?: { 
    type: string; 
    html: string;
  };
}

// Implementación simplificada y robusta de ChatService
class ChatService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async handleMessage(message: string, userContext: any = {}): Promise<ChatResponse> {
    try {
      // Si es mensaje inicial, dar la bienvenida
      if (message === "START_CHAT" && userContext.isInitialMessage) {
        return this.getInitialResponse(userContext);
      }

      // Comenzamos a procesar el mensaje del usuario y actualizar el contexto
      const context: ChatContext = { ...userContext };
      const currentState = this.determineConversationState(context);

      // Si tenemos todos los datos y el estado es confirming_details, generar estimado
      if (currentState === "confirming_details" && 
          (message.toLowerCase().includes("correcto") || 
           message.toLowerCase().includes("sí") || 
           message.toLowerCase().includes("si"))) {
        return this.prepareEstimateResponse(context);
      }

      // En cualquier otro caso, responder apropiadamente según el estado
      const response = await this.generateResponse(message, context, currentState);
      const nextState = this.getNextState(currentState, message, context);

      return {
        message: response,
        options: this.getOptionsForState(nextState, message),
        context: { ...context, currentState: nextState }
      };
    } catch (error) {
      console.error("Error en ChatService:", error);
      return { 
        message: "Lo siento, ocurrió un error procesando tu mensaje. ¿Podrías intentarlo de nuevo?",
        context: userContext
      };
    }
  }

  private async getInitialResponse(context: any): Promise<ChatResponse> {
    try {
      const response = await this.openai.chat.completions.create({
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
        message: response.choices[0].message.content || "¡Hola! ¿Cómo puedo ayudarte hoy?",
        context: { ...context, currentState: "asking_client_name" }
      };
    } catch (error) {
      console.error("Error al obtener respuesta inicial:", error);
      return {
        message: "¡Hola! Estoy aquí para ayudarte a crear un estimado para tu cliente. ¿Me podrías proporcionar el nombre del cliente para comenzar?",
        context: { ...context, currentState: "asking_client_name" }
      };
    }
  }

  private determineConversationState(context: ChatContext): string {
    // Verificar si ya tenemos todos los datos
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

    // Verificar qué datos faltan y devolver el estado correspondiente
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

  private getNextState(currentState: string, message: string, context: ChatContext): string {
    // Extraer información del mensaje según el estado actual
    if (currentState === "asking_client_name" && message.trim().length > 0) {
      context.clientName = message.trim();
      return "asking_client_phone";
    }

    if (currentState === "asking_client_phone") {
      // Extraer teléfono (buscar secuencia de números)
      const phoneMatch = message.match(/\d{3}[\s-]?\d{3}[\s-]?\d{4}/);
      if (phoneMatch) {
        context.clientPhone = phoneMatch[0];
        return "asking_client_email";
      }
      context.clientPhone = message.trim();
      return "asking_client_email";
    }

    if (currentState === "asking_client_email") {
      // Extraer email (buscar formato de email)
      const emailMatch = message.match(/\S+@\S+\.\S+/);
      if (emailMatch) {
        context.clientEmail = emailMatch[0];
      } else {
        context.clientEmail = message.trim();
      }
      return "asking_client_address";
    }

    if (currentState === "asking_client_address") {
      context.clientAddress = message.trim();
      return "fence_type_selection";
    }

    if (currentState === "fence_type_selection") {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("madera") || lowerMessage.includes("wood")) {
        context.fenceType = "Wood Fence";
      } else if (lowerMessage.includes("chain") || lowerMessage.includes("metal")) {
        context.fenceType = "Chain Link Fence";
      } else if (lowerMessage.includes("vinyl") || lowerMessage.includes("vinilo")) {
        context.fenceType = "Vinyl Fence";
      } else {
        context.fenceType = "Wood Fence"; // Default
      }
      return "height_selection";
    }

    if (currentState === "height_selection") {
      const heightMatch = message.match(/\d+/);
      if (heightMatch) {
        const height = parseInt(heightMatch[0]);
        if ([3, 4, 6, 8].includes(height)) {
          context.fenceHeight = height;
        } else {
          context.fenceHeight = 6; // Default
        }
      } else {
        context.fenceHeight = 6; // Default
      }
      return "asking_length";
    }

    if (currentState === "asking_length") {
      const lengthMatch = message.match(/\d+/);
      if (lengthMatch) {
        context.linearFeet = parseInt(lengthMatch[0]);
      } else {
        context.linearFeet = 100; // Default
      }
      context.state = "California"; // Default state
      return "asking_demolition";
    }

    if (currentState === "asking_demolition") {
      const lowerMessage = message.toLowerCase();
      context.demolition = lowerMessage.includes("sí") || lowerMessage.includes("si") || lowerMessage.includes("yes");
      return "asking_painting";
    }

    if (currentState === "asking_painting") {
      const lowerMessage = message.toLowerCase();
      context.painting = lowerMessage.includes("sí") || lowerMessage.includes("si") || lowerMessage.includes("yes");
      return "asking_gates";
    }

    if (currentState === "asking_gates") {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("sí") || lowerMessage.includes("si") || lowerMessage.includes("yes")) {
        context.gates = [{ type: "Standard", width: 4, price: 350, description: "Puerta estándar" }];
      } else {
        context.gates = [];
      }
      return "confirming_details";
    }

    // Si estamos en confirming_details y confirmaron, pasamos a preparar el estimado
    if (currentState === "confirming_details") {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("correcto") || lowerMessage.includes("sí") || lowerMessage.includes("si")) {
        return "preparing_estimate";
      }
      return "confirming_details";
    }

    return currentState;
  }

  private getOptionsForState(state: string, message: string = ""): string[] {
    const isSpanish = this.detectLanguage(message);

    switch (state) {
      case "fence_type_selection":
        return isSpanish
          ? ["Cerca de Madera", "Cerca de Metal (Chain Link)", "Cerca de Vinilo"]
          : ["Wood Fence", "Chain Link Fence", "Vinyl Fence"];

      case "height_selection":
        return isSpanish
          ? ["3 pies (36 pulgadas)", "4 pies (48 pulgadas)", "6 pies (72 pulgadas)", "8 pies (96 pulgadas)"]
          : ["3 feet (36 inches)", "4 feet (48 inches)", "6 feet (72 inches)", "8 feet (96 inches)"];

      case "asking_length":
        return ["50 pies", "75 pies", "100 pies", "125 pies", "150 pies"];

      case "asking_demolition":
        return ["Sí, necesito demolición", "No, no necesito demolición"];

      case "asking_painting":
        return ["Sí, quiero incluir pintura", "No, no necesito pintura"];

      case "asking_gates":
        return ["Sí, necesito puertas", "No, no necesito puertas"];

      case "confirming_details":
        return ["✅ Todo está correcto, prepara el estimado", "🔄 Necesito hacer cambios"];

      default:
        return [];
    }
  }

  private detectLanguage(message: string): boolean {
    // Detección simple de español por palabras clave
    const spanishIndicators = [
      "hola", "gracias", "por favor", "pies", "cerca", "madera", "necesito",
    ];
    return spanishIndicators.some((word) => message.toLowerCase().includes(word));
  }

  private calculateProgress(context: ChatContext): number {
    const requiredFields = ['clientName', 'clientPhone', 'clientEmail', 'clientAddress', 'fenceType', 'fenceHeight', 'linearFeet', 'demolition', 'painting', 'gates'];
    const completedFields = requiredFields.filter(field => context[field] !== undefined).length;
    return Math.round((completedFields / requiredFields.length) * 100);
  }

  private async generateResponse(message: string, context: ChatContext, currentState: string): Promise<string> {
    try {
      const progress = this.calculateProgress(context);
      const isSpanish = this.detectLanguage(message);
      const basePrompt = isSpanish
        ? `Eres Mervin, asistente de ${context.contractorName || "Acme Fence"}. IMPORTANTE:
- Haz UNA sola pregunta corta por mensaje
- Muestra el progreso: [${progress}% completado]
- Sé breve y directo`
        : `You are Mervin from ${context.contractorName || "Acme Fence"}. IMPORTANT:
- Ask ONE short question per message
- Show progress: [${progress}% completed]
- Be brief and direct`;

      const rules = `Formato: "[XX% completado] ¿Tu pregunta breve aquí?"`;
      const systemPrompt = basePrompt + "\n" + rules;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.choices[0].message.content || "Lo siento, no pude procesar tu mensaje.";
    } catch (error) {
      console.error("Error al generar respuesta:", error);

      // Respuestas de fallback según el estado actual
      switch (currentState) {
        case "asking_client_name":
          return "¿Cuál es el nombre del cliente?";
        case "asking_client_phone":
          return "¿Me podrías proporcionar el número de teléfono del cliente?";
        case "asking_client_email":
          return "¿Cuál es el correo electrónico del cliente?";
        case "asking_client_address":
          return "¿Cuál es la dirección donde se instalará la cerca?";
        case "fence_type_selection":
          return "¿Qué tipo de cerca te gustaría instalar? ¿Wood Fence, Chain Link o Vinyl Fence?";
        case "height_selection":
          return "¿Qué altura necesitas para la cerca? ¿3, 4, 6 u 8 pies?";
        case "asking_length":
          return "¿Cuántos pies lineales de cerca necesitas?";
        case "asking_demolition":
          return "¿Necesitas demolición?";
        case "asking_painting":
          return "¿Quieres incluir pintura en el proyecto?";
        case "asking_gates":
          return "¿Necesitas incluir puertas?";
        case "confirming_details":
          return "¿Confirmamos los detalles y procedemos con el estimado?";
        default:
          return "¿En qué más puedo ayudarte?";
      }
    }
  }

  private calculateProgress(context: ChatContext): number {
    const totalFields = 9; // Number of required fields
    let completedFields = 0;

    if (context.clientName) completedFields++;
    if (context.clientPhone) completedFields++;
    if (context.clientEmail) completedFields++;
    if (context.clientAddress) completedFields++;
    if (context.fenceType) completedFields++;
    if (context.fenceHeight) completedFields++;
    if (context.linearFeet) completedFields++;
    if (context.demolition !== undefined) completedFields++;
    if (context.painting !== undefined) completedFields++;


    return Math.round((completedFields / totalFields) * 100);
  }


  private async prepareEstimateResponse(context: ChatContext): Promise<ChatResponse> {
    try {
      const progress = this.calculateProgress(context);
      if (progress < 100) {
        return {
          message: `⚠️ Aún faltan algunos detalles (${progress}% completado). ¿Continuamos con la información faltante?`,
          context: { ...context }
        };
      }

      const summary = `
✅ ¡Perfecto! Tengo toda la información necesaria:

📋 DETALLES DEL CLIENTE:
- Nombre: ${context.clientName}
- Tel: ${context.clientPhone}
- Email: ${context.clientEmail}
- Dirección: ${context.clientAddress}

🏗️ ESPECIFICACIONES:
- Tipo: ${context.fenceType}
- Altura: ${context.fenceHeight} pies
- Longitud: ${context.linearFeet} pies lineales
- Demolición: ${context.demolition ? 'Sí' : 'No'}
- Pintura/Acabado: ${context.painting ? 'Sí' : 'No'}
- Puertas: ${context.gates?.length || 0}

¿Procedemos a generar el estimado con estos detalles?`;

      return {
        message: summary,
        options: [
          "✅ Generar Estimado",
          "📝 Editar Detalles",
          "❌ Cancelar"
        ],
        context: { ...context, currentState: "confirming_details" }
      };
    } catch (error) {
      console.error("Error al preparar el estimado:", error);
      return {
        message: "Lo siento, ha ocurrido un error al preparar el estimado. ¿Podemos intentarlo de nuevo?",
        context: { ...context, currentState: "asking_client_name" }
      };
    }
  }
}

export const chatService = new ChatService(process.env.OPENAI_API_KEY || "");
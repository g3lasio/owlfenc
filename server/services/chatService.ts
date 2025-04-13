import OpenAI from "openai";
import { mervinRoles } from './mervinRoles';

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
    const currentState = context.currentState || "collecting_customer_info";
    
    // Validar el estado actual
    if (!mervinRoles.validateState(currentState, context)) {
      return currentState;
    }

    // Si el estado actual es válido, obtener el siguiente estado
    const nextState = mervinRoles.getNextState(currentState);
    if (nextState) {
      return nextState;
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
    // Obtener opciones clickeables según el estado actual
    const stateOptions = mervinRoles.getClickableOptions(state);
    if (stateOptions.length > 0) {
      return stateOptions;
    }

    // Opciones por defecto para inputs específicos
    switch (state) {
      case "collecting_project_info":
        if (!context.fenceType) {
          return ["🌲 Cerca de Madera", "🔗 Cerca de Metal (Chain Link)", "🏠 Cerca de Vinilo"];
        }

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

  private getQuestionSequence(fenceType: string): string[] {
    const baseQuestions = [
      'clientName',
      'clientPhone',
      'clientEmail',
      'clientAddress'
    ];

    const woodFenceQuestions = [
      'height',
      'linearFeet',
      'postType',
      'demolition',
      'painting',
      'gates'
    ];

    return [...baseQuestions, ...woodFenceQuestions];
  }

  private calculateProgress(context: ChatContext): number {
    const sequence = this.getQuestionSequence(context.fenceType || 'wood');
    const completed = sequence.filter(field => context[field] !== undefined).length;
    return Math.round((completed / sequence.length) * 100);
  }

  private getNextQuestion(context: ChatContext): string {
    const sequence = this.getQuestionSequence(context.fenceType || 'wood');
    const nextField = sequence.find(field => context[field] === undefined);

    const questions = {
      clientName: '¿Cuál es el nombre completo del cliente?',
      clientPhone: '¿Cuál es el número de teléfono para contactar?',
      clientEmail: '¿Cuál es el correo electrónico?',
      clientAddress: '¿Cuál es la dirección de instalación?',
      height: '¿Qué altura necesita? (3, 4, 6 u 8 pies)',
      linearFeet: '¿Cuántos pies lineales de cerca necesita?',
      postType: '¿Qué tipo de postes prefiere? (4x4, 6x6 o metal)',
      demolition: '¿Necesita demolición de cerca existente?',
      painting: '¿Desea incluir pintura o acabado?',
      gates: '¿Cuántas puertas necesita?'
    };

    return questions[nextField] || '¿Podemos revisar los detalles del proyecto?';
  }

  private getNextRequiredField(context: ChatContext): string | null {
      
      if (!nextField) {
        return `¡Perfecto! Tengo toda la información necesaria. [${progress}% completado]`;
      }

      const questions = {
        clientName: '¿Cuál es el nombre completo del cliente?',
        clientPhone: '¿Cuál es el número de teléfono para contactar?',
        clientEmail: '¿Cuál es el correo electrónico?',
        clientAddress: '¿Cuál es la dirección de instalación?',
        fenceType: '¿Qué tipo de cerca necesita? (Madera, Metal o Vinilo)',
        fenceHeight: '¿Qué altura necesita? (3, 4, 6 u 8 pies)',
        linearFeet: '¿Cuántos pies lineales de cerca necesita?',
        demolition: '¿Necesita demolición de cerca existente?',
        painting: '¿Desea incluir pintura o acabado?'
      };

      const response = `[${progress}% completado] ${questions[nextField]}`;
      return response;
    } catch (error) {
      console.error("Error generando respuesta:", error);
      return "Disculpe, hubo un error. ¿Podemos continuar con la información del cliente?";
    }
  }
    try {
      const progress = this.calculateProgress(context);
      const nextField = this.getNextRequiredField(context);
      
      if (!nextField) {
        return `¡Perfecto! Tengo toda la información necesaria. [${progress}% completado]`;
      }

      const questions = {
        clientName: '¿Cuál es el nombre completo del cliente?',
        clientPhone: '¿Cuál es el número de teléfono para contactar?',
        clientEmail: '¿Cuál es el correo electrónico?',
        clientAddress: '¿Cuál es la dirección de instalación?',
        fenceType: '¿Qué tipo de cerca necesita? (Madera, Metal o Vinilo)',
        fenceHeight: '¿Qué altura necesita? (3, 4, 6 u 8 pies)',
        linearFeet: '¿Cuántos pies lineales de cerca necesita?',
        demolition: '¿Necesita demolición de cerca existente?',
        painting: '¿Desea incluir pintura o acabado?'
      };

      const response = `[${progress}% completado] ${questions[nextField]}`;
      return response;
    } catch (error) {
      console.error("Error generando respuesta:", error);
      return "Disculpe, hubo un error. ¿Podemos continuar con la información del cliente?";
    }
  }

  private getNextRequiredField(context: ChatContext): string | null {
    const fields = [
      'clientName',
      'clientPhone', 
      'clientEmail',
      'clientAddress',
      'fenceType',
      'fenceHeight',
      'linearFeet',
      'demolition',
      'painting'
    ];

    return fields.find(field => context[field] === undefined) || null;
  }


  private async prepareEstimateResponse(context: ChatContext): Promise<ChatResponse> {
    try {
      const progress = this.calculateProgress(context);
      
      // Validar que tengamos toda la información necesaria
      const requiredFields = [
        'clientName', 'clientPhone', 'clientEmail', 'clientAddress',
        'fenceType', 'fenceHeight', 'linearFeet', 'demolition', 'painting'
      ];

      const missingFields = requiredFields.filter(field => !context[field]);
      
      if (missingFields.length > 0) {
        return {
          message: `Aún necesito algunos datos: ${missingFields.join(', ')}`,
          context: { ...context, currentState: 'collecting_info' }
        };
      }

      // Preparar datos para el documento
      const documentData = {
        clientName: context.clientName,
        clientPhone: context.clientPhone,
        clientEmail: context.clientEmail,
        clientAddress: context.clientAddress,
        fenceType: context.fenceType,
        fenceHeight: context.fenceHeight,
        linearFeet: context.linearFeet,
        demolition: context.demolition,
        painting: context.painting,
        gates: context.gates || [],
        breakdown: this.calculateBreakdown(context),
        costs: this.calculateCosts(context),
        contractorInfo: {
          name: "Acme Fencing",
          phone: "(555) 123-4567",
          email: "info@acmefencing.com",
          address: "123 Main St",
          license: "CCB #123456"
        }
      };

      // Generar documento usando documentService
      const pdfBuffer = await documentService.generateDocument(documentData, 'estimate');
      
      if (!pdfBuffer) {
        return {
          message: "Lo siento, hubo un error generando el documento. ¿Intentamos de nuevo?",
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
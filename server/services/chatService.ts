
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
  
  private getFenceTypeOptions(isSpanish: boolean): string[] {
    return isSpanish ? [
      "Cerca de Madera",
      "Cerca de Metal (Chain Link)",
      "Cerca de Vinilo"
    ] : [
      "Wood Fence",
      "Chain Link Fence",
      "Vinyl Fence"
    ];
  }
  
  private getHeightOptions(isSpanish: boolean): string[] {
    return isSpanish ? [
      "3 pies (36 pulgadas)",
      "4 pies (48 pulgadas)", 
      "6 pies (72 pulgadas)",
      "8 pies (96 pulgadas)"
    ] : [
      "3 feet (36 inches)",
      "4 feet (48 inches)",
      "6 feet (72 inches)", 
      "8 feet (96 inches)"
    ];
  }

  private detectLanguage(message: string): boolean {
    // Simple language detection based on common Spanish words
    const spanishIndicators = ['hola', 'gracias', 'por favor', 'pies', 'cerca', 'madera', 'necesito'];
    return spanishIndicators.some(word => message.toLowerCase().includes(word));
  }
  
  private getDemolitionOptions(): string[] {
    return [
      "Sí, necesito demolición",
      "No, no necesito demolición"
    ];
  }
  
  private getPaintingOptions(): string[] {
    return [
      "Sí, quiero incluir pintura",
      "No, no necesito pintura"
    ];
  }
  
  private getGatesOptions(): string[] {
    return [
      "Sí, necesito puertas",
      "No, no necesito puertas"
    ];
  }

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
      let options: string[] = [];

      if (message === "START_CHAT" && context.isInitialMessage) {
        const initialResponse = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `Eres Mervin, el asistente virtual de ${context.contractorName || 'Acme Fencing'}. 
              Ya conoces al contratista y sus datos:
              - Nombre: ${context.contractorName || 'Acme Fencing'}
              - Licencia: ${context.contractorLicense || 'CCB #123456'}
              - Teléfono: ${context.contractorPhone || '(555) 123-4567'}
              - Email: ${context.contractorEmail || 'info@acmefencing.com'}
              - Dirección: ${context.contractorAddress || '123 Main St'}
              
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
          message: initialResponse.choices[0].message.content || "¡Hola! ¿Cómo puedo ayudarte hoy?",
          options: [],
          context: { ...context, currentState: "asking_client_name" }
        };
      }
      
      // Manejo del estado confirming_details - resumen de toda la información
      if (conversationState === "confirming_details") {
        // Construye un resumen de toda la información recopilada
        const summary = `
        Aquí está el resumen de la información que tengo:
        
        Cliente: ${context.clientName || 'No proporcionado'}
        Teléfono: ${context.clientPhone || 'No proporcionado'}
        Email: ${context.clientEmail || 'No proporcionado'}
        Dirección: ${context.clientAddress || 'No proporcionada'}
        Tipo de cerca: ${context.fenceType || 'No seleccionado'}
        Altura: ${context.fenceHeight ? context.fenceHeight + ' pies' : 'No seleccionada'}
        Longitud: ${context.linearFeet ? context.linearFeet + ' pies' : 'No proporcionada'}
        Demolición necesaria: ${context.demolition ? 'Sí' : 'No'}
        Pintura incluida: ${context.painting ? 'Sí' : 'No'}
        Puertas: ${context.gates ? (Array.isArray(context.gates) ? context.gates.length : 'Sí') : 'No'}
        `;
        
        return {
          message: "¡Excelente! Ahora tengo toda la información que necesito. " + 
                  "¿Está todo correcto o quieres cambiar algo antes de que prepare el estimado? " +
                  summary,
          options: ["Todo está correcto, prepara el estimado", "Necesito cambiar algunos detalles"],
          context: {
            ...context,
            currentState: message.includes("correcto") ? "preparing_estimate" : "confirming_details"
          }
        };
      }
      
      // Manejo del estado preparing_estimate - generación del estimado
      if (conversationState === "preparing_estimate") {
        // Genera el estimado
        const estimateHtml = await this.generateEstimate(context);
        
        return {
          message: "¡Ya mero! Estoy preparando tu estimado con todos los detalles que me proporcionaste. ¡Listo! Aquí está tu estimado. ¿Quieres que lo revise contigo o prefieres que te lo envíe por correo?",
          template: {
            type: "estimate",
            html: estimateHtml
          },
          options: ["Revisar estimado conmigo", "Enviar por correo"],
          context: {
            ...context,
            currentState: "estimate_ready"
          }
        };
      }
      
      // Get fence rules from the imported module
      // @ts-ignore - No necesitamos tipado para woodRules ya que solo se usa para el prompt
      const woodRules = await import("../../client/src/data/rules/woodfencerules.js");
      
      // Asignar opciones según el estado de la conversación
      if (conversationState === "fence_type_selection") {
        options = this.getFenceTypeOptions();
      } else if (conversationState === "height_selection") {
        options = this.getHeightOptions();
      } else if (conversationState === "asking_demolition") {
        options = this.getDemolitionOptions();
      } else if (conversationState === "asking_painting") {
        options = this.getPaintingOptions();
      } else if (conversationState === "asking_gates") {
        options = this.getGatesOptions();
      }

      const isSpanish = this.detectLanguage(message);
      const basePrompt = isSpanish ? 
        `Eres Mervin, un asistente profesional bilingüe de ${context.contractorName || 'Owl Fence'}. 
        Tu personalidad en español:
        - Usas un español profesional con toques amigables
        - Siempre mencionas medidas en pies y pulgadas
        - Haces UNA pregunta por mensaje, clara y directa
        - Mantienes un tono cordial pero eficiente` :
        `You are Mervin, a professional bilingual assistant from ${context.contractorName || 'Owl Fence'}.
        Your English personality:
        - You use professional yet friendly American English
        - You always specify measurements in feet and inches
        - You ask ONE question per message, clear and direct
        - You maintain a cordial but efficient tone`;
      
      const rules = `
      Reglas estrictas:
      - UNA pregunta por mensaje, no más
      - Máximo 2 líneas de texto por respuesta
      - Usa albures ligeros y humor mexicano
      - Si hay duda, recomienda basado en ${JSON.stringify(woodRules)}
      `;
      
      const examples = `
      Ejemplos de respuestas correctas:
      "¿Qué onda cuate, de qué material quieres tu cerca? 🌵"
      "¡Arre! ¿Cuántos metros necesitas, compa? 🤠"
      `;
      
      const systemPrompt = basePrompt + rules + examples;
      
      Prioriza obtener:
      1. Info del cliente (nombre, contacto)
      2. Detalles de la cerca (tipo, altura, longitud)
      3. Extras (demolición, pintura, puertas)`;

      // Procesamiento del mensaje con OpenAI
      const aiResponse = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          ...(context.messages || []).map((m: any) => ({
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

      // Actualización del estado de la conversación y contexto
      const nextState = await this.updateConversationState(conversationState, message);
      
      // Aquí actualizamos el contexto para incluir datos capturados en updateConversationState
      const updatedContext = {
        ...context,
        ...this.lastUserContext, // Incluimos cualquier cambio que se haya hecho durante updateConversationState
        currentState: nextState
      };
      
      // Si es un tipo de cerca "Wood Fence", cargamos reglas específicas
      if (updatedContext.fenceType === "Wood Fence" && conversationState === "fence_type_selection") {
        const woodFencePrompt = `
          Ahora el cliente ha seleccionado Cerca de Madera.
          
          Para cercas de madera, recuerda:
          - Las alturas estándar son 3, 4, 6 y 8 pies
          - Para 6 pies o más, recomendar postes 4x4 o 6x6
          - Preguntar sobre demolición, pintura y puertas
          
          Haz una pregunta a la vez siguiendo el flujo establecido.
        `;
        
        // Modificamos el mensaje en caso de selección de cerca de madera
        if (aiResponse.choices[0].message.content?.includes("?")) {
          // Solo si el mensaje contiene una pregunta
          return {
            message: aiResponse.choices[0].message.content || "¿Qué altura necesitas para tu cerca de madera? 🌵",
            options,
            context: updatedContext
          };
        }
      }

      return {
        message: aiResponse.choices[0].message.content || "Lo siento, no pude procesar tu mensaje.",
        options,
        context: updatedContext
      };
    } catch (error) {
      console.error("Error en ChatService:", error);
      throw error;
    }
  }

  private determineConversationState(context: any): string {
    // Si ya estamos en ciertos estados, mantenerlos
    if (context.currentState === "confirming_details" || 
        context.currentState === "preparing_estimate" ||
        context.currentState === "estimate_ready") {
      return context.currentState;
    }
    
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

    // Si tenemos toda la información, vamos al resumen para confirmar
    if (hasAllInfo && context.currentState === "asking_gates") {
      return "confirming_details";
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
    
    // Si ya tenemos toda la información pero no estamos en el paso final,
    // probablemente estamos editando algún detalle, entonces confirmamos
    if (hasAllInfo) {
      return "confirming_details";
    }
    
    // Caso por defecto
    return context.currentState || "asking_client_name";
  }

  private async updateConversationState(currentState: string, message: string): Promise<string> {
    const nextStates: Record<string, string> = {
      "asking_client_name": "asking_client_phone",
      "asking_client_phone": "asking_client_email",
      "asking_client_email": "asking_client_address",
      "asking_client_address": "fence_type_selection",
      "fence_type_selection": "height_selection",
      "height_selection": "asking_length",
      "asking_length": "asking_demolition",
      "asking_demolition": "asking_painting",
      "asking_painting": "asking_gates",
      "asking_gates": "confirming_details",
      "confirming_details": "preparing_estimate"
    };

    // Transiciones específicas basadas en el mensaje
    if (currentState === "confirming_details" && message.toLowerCase().includes("correcto")) {
      return "preparing_estimate";
    }
    
    // Capturar el nombre del cliente
    if (currentState === "asking_client_name") {
      // Intentamos extraer un nombre de al menos dos palabras
      const nameParts = message.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        this.lastUserContext.clientName = message.trim();
      }
    }
    
    // Si está seleccionando el tipo de cerca
    if (currentState === "fence_type_selection") {
      // Detectar selección del tipo de cerca
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("madera")) {
        this.lastUserContext.fenceType = "Wood Fence";
        console.log("Tipo de cerca seleccionado: Wood Fence");
        
        // Cargar las reglas de woodfencerules.js para cercas de madera
        // @ts-ignore
        const woodRules = await import("../../client/src/data/rules/woodfencerules.js");
        
        // Establecer valores predeterminados basados en las reglas
        if (woodRules && woodRules.defaultSettings) {
          this.lastUserContext.woodRulesLoaded = true;
          this.lastUserContext.postType = woodRules.defaultSettings.postType || "4x4";
        }
      } else if (lowerMessage.includes("metal") || lowerMessage.includes("chain link")) {
        this.lastUserContext.fenceType = "Chain Link Fence";
      } else if (lowerMessage.includes("vinilo") || lowerMessage.includes("vinyl")) {
        this.lastUserContext.fenceType = "Vinyl Fence";
      }
    }
    
    // Si está seleccionando altura
    if (currentState === "height_selection") {
      // Extraer altura de la selección
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
    
    // Si está respondiendo sobre demolición
    if (currentState === "asking_demolition") {
      const lowerMessage = message.toLowerCase();
      this.lastUserContext.demolition = lowerMessage.includes("sí") || lowerMessage.includes("si") || lowerMessage.includes("necesito demolición");
    }
    
    // Si está respondiendo sobre pintura
    if (currentState === "asking_painting") {
      const lowerMessage = message.toLowerCase();
      this.lastUserContext.painting = lowerMessage.includes("sí") || lowerMessage.includes("si") || lowerMessage.includes("incluir pintura");
    }
    
    // Si está respondiendo sobre puertas
    if (currentState === "asking_gates") {
      const lowerMessage = message.toLowerCase();
      const needsGates = lowerMessage.includes("sí") || lowerMessage.includes("si") || lowerMessage.includes("necesito puertas");
      this.lastUserContext.gates = needsGates ? [] : false;
      
      // Si necesita puertas, inicializamos un array vacío que se llenará después
      if (needsGates) {
        this.lastUserContext.gatesCount = 1; // Por defecto 1 puerta
      }
    }

    const nextState = nextStates[currentState] || currentState;
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

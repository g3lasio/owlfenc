import OpenAI from "openai";
import { mervinRoles } from './mervinRoles';
import * as woodFenceRules from '../../client/src/data/rules/woodfencerules.js';

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
  
  // Contractor info
  contractorName?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  contractorAddress?: string;
  contractorLicense?: string;
  
  // Fields to track conversation flow
  lastQuestion?: string;
  progress?: number;
  isConfirmed?: boolean;
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
    const stateOptions = mervinRoles.getOptionsForState(state, message);
    if (stateOptions.length > 0) {
      return stateOptions;
    }

    // Opciones por defecto para inputs específicos
    switch (state) {
      case "collecting_project_info":
        return ["🌲 Cerca de Madera", "🔗 Cerca de Metal (Chain Link)", "🏠 Cerca de Vinilo"];

      case "fence_type_selection":
        return ["🌲 Cerca de Madera", "🔗 Cerca de Metal (Chain Link)", "🏠 Cerca de Vinilo"];

      case "height_selection":
        const isSpanish = this.detectLanguage(message);
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
    let completed = 0;
    
    // Count completed fields
    if (context.clientName) completed++;
    if (context.clientPhone) completed++;
    if (context.clientEmail) completed++;
    if (context.clientAddress) completed++;
    if (context.fenceType) completed++;
    if (context.fenceHeight) completed++;
    if (context.linearFeet) completed++;
    if (context.demolition !== undefined) completed++;
    if (context.painting !== undefined) completed++;
    if (context.gates !== undefined) completed++;
    
    const totalFields = 10; // Total number of fields we're checking
    return Math.round((completed / totalFields) * 100);
  }

  private getNextQuestion(context: ChatContext): string {
    // Determine which field is missing
    if (!context.clientName) return '¿Cuál es el nombre completo del cliente?';
    if (!context.clientPhone) return '¿Cuál es el número de teléfono para contactar?';
    if (!context.clientEmail) return '¿Cuál es el correo electrónico?';
    if (!context.clientAddress) return '¿Cuál es la dirección de instalación?';
    if (!context.fenceType) return '¿Qué tipo de cerca necesita? (Madera, Metal o Vinilo)';
    if (!context.fenceHeight) return '¿Qué altura necesita? (3, 4, 6 u 8 pies)';
    if (!context.linearFeet) return '¿Cuántos pies lineales de cerca necesita?';
    if (context.demolition === undefined) return '¿Necesita demolición de cerca existente?';
    if (context.painting === undefined) return '¿Desea incluir pintura o acabado?';
    if (context.gates === undefined) return '¿Cuántas puertas necesita?';
    
    return '¿Podemos revisar los detalles del proyecto?';
  }

  private getNextRequiredField(context: ChatContext): string | null {
    if (!context.clientName) return 'clientName';
    if (!context.clientPhone) return 'clientPhone';
    if (!context.clientEmail) return 'clientEmail';
    if (!context.clientAddress) return 'clientAddress';
    if (!context.fenceType) return 'fenceType';
    if (!context.fenceHeight) return 'fenceHeight';
    if (!context.linearFeet) return 'linearFeet';
    if (context.demolition === undefined) return 'demolition';
    if (context.painting === undefined) return 'painting';
    if (context.gates === undefined) return 'gates';
    
    return null;
  }

  private async prepareEstimateResponse(context: ChatContext): Promise<ChatResponse> {
    try {
      const progress = this.calculateProgress(context);

      // Validar que tengamos toda la información necesaria
      const requiredFields = [
        'clientName', 'clientPhone', 'clientEmail', 'clientAddress',
        'fenceType', 'fenceHeight', 'linearFeet', 'demolition', 'painting'
      ];

      const missingFields = [];
      if (!context.clientName) missingFields.push('clientName');
      if (!context.clientPhone) missingFields.push('clientPhone');
      if (!context.clientEmail) missingFields.push('clientEmail');
      if (!context.clientAddress) missingFields.push('clientAddress');
      if (!context.fenceType) missingFields.push('fenceType');
      if (!context.fenceHeight) missingFields.push('fenceHeight');
      if (!context.linearFeet) missingFields.push('linearFeet');
      if (context.demolition === undefined) missingFields.push('demolition');
      if (context.painting === undefined) missingFields.push('painting');

      if (missingFields.length > 0) {
        return {
          message: `Aún necesito algunos datos: ${missingFields.join(', ')}`,
          context: { ...context, currentState: 'collecting_info' }
        };
      }

      // Calcular detalles y costos basados en woodFenceRules
      const costs = this.calculateCosts(context);
      const breakdown = this.calculateBreakdown(context);
      
      // Generar un número de estimado aleatorio
      const estimateNumber = `EST-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Preparar datos para el documento
      const documentData = {
        estimateNumber,
        date: new Date().toLocaleDateString(),
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
        breakdown,
        costs,
        contractorInfo: {
          name: context.contractorName || "Acme Fencing",
          phone: context.contractorPhone || "(555) 123-4567",
          email: context.contractorEmail || "info@acmefencing.com",
          address: context.contractorAddress || "123 Main St",
          license: context.contractorLicense || "CCB #123456"
        }
      };
      
      // Generar el HTML del estimado
      const htmlContent = this.generateEstimateHtml(documentData);

      const summary = `
✅ ¡Perfecto! Tengo toda la información necesaria y he generado tu estimado:

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

💰 COSTOS:
- Materiales: $${costs.materials.toFixed(2)}
- Mano de Obra: $${costs.labor.toFixed(2)}
- Subtotal: $${costs.subtotal.toFixed(2)}
- Impuesto: $${costs.tax.toFixed(2)}
- TOTAL: $${costs.total.toFixed(2)}

El estimado está listo. ¿Deseas guardarlo o enviarlo al cliente?`;

      return {
        message: summary,
        options: [
          "💾 Guardar PDF",
          "📧 Enviar por Email",
          "📋 Crear Nuevo Estimado"
        ],
        context: { ...context, currentState: "estimate_generated" },
        template: {
          type: "estimate",
          html: htmlContent
        }
      };
    } catch (error) {
      console.error("Error al preparar el estimado:", error);
      return {
        message: "Lo siento, ha ocurrido un error al preparar el estimado. ¿Podemos intentarlo de nuevo?",
        context: { ...context, currentState: "asking_client_name" }
      };
    }
  }

  private async generateResponse(message: string, context: ChatContext, currentState: string): Promise<string> {
    try {
      // Actualizar el contexto basado en el mensaje y estado actual
      if (currentState === "asking_client_name" && !context.clientName) {
        context.clientName = message;
        return "¿Cuál es el número de teléfono para contactar?";
      } 
      if (currentState === "asking_client_phone" && !context.clientPhone) {
        context.clientPhone = message;
        return "¿Cuál es el correo electrónico?";
      } 
      if (currentState === "asking_client_email" && !context.clientEmail) {
        context.clientEmail = message;
        return "¿Cuál es la dirección de instalación?";
      } 
      if (currentState === "asking_client_address" && !context.clientAddress) {
        context.clientAddress = message;
        return "¿Qué tipo de cerca necesita? (Madera, Metal o Vinilo)";
      }
      
      // Si ya tenemos toda la información básica, mostrar resumen
      if (context.clientName && context.clientPhone && context.clientEmail && context.clientAddress) {
        const progress = this.calculateProgress(context);
        return `
✅ He recopilado la siguiente información:

📋 Datos del Cliente:
- Nombre: ${context.clientName}
- Teléfono: ${context.clientPhone}
- Email: ${context.clientEmail}
- Dirección: ${context.clientAddress}

[${progress}% completado]

¿Es correcta esta información? Podemos continuar con los detalles de la cerca o hacer correcciones.`;
      }

      // Si llegamos aquí, continuar con preguntas sobre la cerca
      const questions: {[key: string]: string} = {
        fence_type_selection: '¿Qué tipo de cerca necesita? (Madera, Metal o Vinilo)',
        height_selection: '¿Qué altura necesita? (3, 4, 6 u 8 pies)',
        asking_length: '¿Cuántos pies lineales de cerca necesita?',
        asking_demolition: '¿Necesita demolición de cerca existente?',
        asking_painting: '¿Desea incluir pintura o acabado?',
        asking_gates: '¿Necesita incluir puertas?',
        confirming_details: '¿Los detalles son correctos? Podemos generar el estimado.'
      };

      return questions[currentState] || '¿Continuamos con el siguiente paso?';
    } catch (error) {
      console.error("Error generando respuesta:", error);
      return "Disculpe, hubo un error. ¿Podemos continuar con la información del cliente?";
    }
  }

  // Método para calcular el desglose de materiales
  private calculateBreakdown(context: ChatContext): any {
    try {
      if (context.fenceType?.toLowerCase().includes('wood')) {
        // Calcular cantidades según las reglas de cerca de madera
        const linearFeet = context.linearFeet || 100;
        const height = context.fenceHeight || 6;
        const state = context.state || "California";
        
        // Calcular espaciado y cantidad de postes
        const spacing = 8; // 8 pies entre postes
        const postsCount = Math.ceil(linearFeet / spacing) + 1; // +1 para el último poste
        
        // Calcular concreto (2 bolsas por poste)
        const concreteBags = postsCount * 2;
        
        // Calcular rieles (2 por sección)
        const railsCount = Math.ceil(linearFeet / 8) * 2;
        
        // Calcular tablones (pickets)
        const picketCoverage = 7.5; // pulgadas
        const picketCount = Math.ceil((linearFeet * 12) / picketCoverage);
        
        // Agregar 10% extra para materiales
        const extraFactor = 1.1;
        
        return {
          posts: Math.ceil(postsCount * extraFactor),
          concrete: Math.ceil(concreteBags * extraFactor),
          rails: Math.ceil(railsCount * extraFactor),
          pickets: Math.ceil(picketCount * extraFactor),
          hardware: Math.ceil(postsCount * 4 * extraFactor), // 4 herrajes por poste
          screws: Math.ceil(linearFeet / 50) // 1 caja por cada 50 pies
        };
      }
      
      // Si no es cerca de madera, devolver valores por defecto
      return {
        posts: 0,
        concrete: 0,
        rails: 0,
        pickets: 0,
        hardware: 0,
        screws: 0
      };
    } catch (error) {
      console.error("Error calculando desglose:", error);
      // Valores por defecto en caso de error
      return {
        posts: 0,
        concrete: 0,
        rails: 0,
        pickets: 0, 
        hardware: 0,
        screws: 0
      };
    }
  }
  
  // Método para calcular costos
  private calculateCosts(context: ChatContext): any {
    try {
      // Si es cerca de madera, usar las reglas específicas
      if (context.fenceType?.toLowerCase().includes('wood')) {
        const linearFeet = context.linearFeet || 100;
        const height = context.fenceHeight || 6;
        const state = context.state || "California";
        const demolition = context.demolition || false;
        const painting = context.painting || false;
        
        // Intentar usar woodFenceRules si está disponible
        try {
          const options = {
            demolition: demolition,
            painting: painting,
            postType: "auto"
          };
          
          const result = woodFenceRules.calculateWoodFenceCost(linearFeet, height, state, options);
          return {
            materials: parseFloat(result.totalMaterialsCost.toFixed(2)),
            labor: parseFloat(result.totalLaborCost.toFixed(2)),
            subtotal: parseFloat(result.baseTotalCost.toFixed(2)),
            tax: parseFloat((result.baseTotalCost * 0.0875).toFixed(2)),
            total: parseFloat(result.finalTotalCost.toFixed(2))
          };
        } catch (e) {
          console.error("Error usando woodFenceRules:", e);
        }
        
        // Cálculo alternativo si falló el método anterior
        const baseRate = demolition ? 65 : 60; // $/pie
        const heightFactor = height === 3 ? 0.8 : 
                            height === 6 ? 1.0 : 
                            height === 8 ? 1.2 : 1.0;
        
        const basePrice = linearFeet * baseRate * heightFactor;
        const materialsRatio = demolition ? 0.41 : 0.45;
        const laborRatio = demolition ? 0.59 : 0.55;
        
        const materialsCost = basePrice * materialsRatio;
        const laborCost = basePrice * laborRatio;
        
        // Añadir costo de pintura si es necesario
        const paintingCost = painting ? (linearFeet * height * 3.5) : 0;
        
        const subtotal = materialsCost + laborCost + paintingCost;
        const tax = subtotal * 0.0875; // 8.75% de impuesto
        const total = subtotal + tax;
        
        return {
          materials: parseFloat(materialsCost.toFixed(2)),
          labor: parseFloat(laborCost.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          total: parseFloat(total.toFixed(2))
        };
      }
      
      // Valores por defecto para otros tipos de cerca
      return {
        materials: 0,
        labor: 0,
        subtotal: 0,
        tax: 0,
        total: 0
      };
    } catch (error) {
      console.error("Error calculando costos:", error);
      // Valores por defecto en caso de error
      return {
        materials: 0,
        labor: 0,
        subtotal: 0,
        tax: 0,
        total: 0
      };
    }
  }
  
  // Método para generar el HTML del estimado
  private generateEstimateHtml(data: any): string {
    // Plantilla básica de estimado en HTML
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Estimado #${data.estimateNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .logo { font-weight: bold; font-size: 24px; }
          .estimate-info { text-align: right; }
          .client-info, .project-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${data.contractorInfo.name}</div>
          <div class="estimate-info">
            <h2>ESTIMADO</h2>
            <p>No: ${data.estimateNumber}</p>
            <p>Fecha: ${data.date}</p>
          </div>
        </div>
        
        <div class="client-info">
          <h3>CLIENTE</h3>
          <p><strong>Nombre:</strong> ${data.clientName}</p>
          <p><strong>Teléfono:</strong> ${data.clientPhone}</p>
          <p><strong>Email:</strong> ${data.clientEmail}</p>
          <p><strong>Dirección:</strong> ${data.clientAddress}</p>
        </div>
        
        <div class="project-info">
          <h3>DETALLES DEL PROYECTO</h3>
          <p><strong>Tipo de Cerca:</strong> ${data.fenceType}</p>
          <p><strong>Altura:</strong> ${data.fenceHeight} pies</p>
          <p><strong>Longitud:</strong> ${data.linearFeet} pies lineales</p>
          <p><strong>Demolición Incluida:</strong> ${data.demolition ? 'Sí' : 'No'}</p>
          <p><strong>Pintura/Acabado:</strong> ${data.painting ? 'Sí' : 'No'}</p>
          <p><strong>Puertas:</strong> ${data.gates.length}</p>
        </div>
        
        <div class="materials">
          <h3>MATERIALES (incluye 10% adicional)</h3>
          <table>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
            </tr>
            <tr>
              <td>Postes</td>
              <td>${data.breakdown.posts}</td>
            </tr>
            <tr>
              <td>Bolsas de Concreto</td>
              <td>${data.breakdown.concrete}</td>
            </tr>
            <tr>
              <td>Rieles</td>
              <td>${data.breakdown.rails}</td>
            </tr>
            <tr>
              <td>Tablones</td>
              <td>${data.breakdown.pickets}</td>
            </tr>
            <tr>
              <td>Herrajes</td>
              <td>${data.breakdown.hardware}</td>
            </tr>
            <tr>
              <td>Cajas de Tornillos</td>
              <td>${data.breakdown.screws}</td>
            </tr>
          </table>
        </div>
        
        <div class="costs">
          <h3>COSTOS</h3>
          <table>
            <tr>
              <td>Materiales</td>
              <td>$${data.costs.materials.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Mano de Obra</td>
              <td>$${data.costs.labor.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Subtotal</td>
              <td>$${data.costs.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Impuesto (8.75%)</td>
              <td>$${data.costs.tax.toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td>TOTAL</td>
              <td>$${data.costs.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div class="footer">
          <p><strong>Términos:</strong> 50% de anticipo, saldo al completar el trabajo.</p>
          <p><strong>Validez del Estimado:</strong> 30 días</p>
          <p><strong>Tiempo Estimado de Ejecución:</strong> ${Math.ceil(data.linearFeet / 50)} días</p>
          
          <p style="margin-top: 40px">
            <strong>${data.contractorInfo.name}</strong><br>
            ${data.contractorInfo.license}<br>
            ${data.contractorInfo.phone}<br>
            ${data.contractorInfo.email}<br>
            ${data.contractorInfo.address}
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

export const chatService = new ChatService(process.env.OPENAI_API_KEY || "");
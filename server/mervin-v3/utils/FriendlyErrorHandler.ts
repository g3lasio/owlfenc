/**
 * FRIENDLY ERROR HANDLER
 * 
 * Convierte errores técnicos en mensajes amigables con humor
 * para que Mervin responda profesionalmente sin asustar al usuario
 */

export interface ErrorContext {
  errorType: string;
  originalMessage: string;
  userInput?: string;
  availableTools?: string[];
  attemptedTool?: string;
}

export class FriendlyErrorHandler {
  
  /**
   * Convierte un error técnico en un mensaje amigable
   */
  static getFriendlyMessage(context: ErrorContext): string {
    const { errorType, originalMessage, userInput, availableTools, attemptedTool } = context;
    
    // Detectar tipo de error y retornar mensaje apropiado
    if (errorType === 'tool_not_found' || originalMessage.includes('Herramienta no disponible')) {
      return this.getToolNotFoundMessage(attemptedTool, availableTools);
    }
    
    if (errorType === 'planning_error' || originalMessage.includes('Error generando plan')) {
      return this.getPlanningErrorMessage(userInput);
    }
    
    if (errorType === 'execution_error' || originalMessage.includes('Error ejecutando')) {
      return this.getExecutionErrorMessage();
    }
    
    if (errorType === 'timeout' || originalMessage.includes('timeout')) {
      return this.getTimeoutMessage();
    }
    
    if (errorType === 'auth_error' || originalMessage.includes('401') || originalMessage.includes('Unauthorized')) {
      return this.getAuthErrorMessage();
    }
    
    if (errorType === 'network_error' || originalMessage.includes('ECONNREFUSED') || originalMessage.includes('network')) {
      return this.getNetworkErrorMessage();
    }
    
    // Error genérico
    return this.getGenericErrorMessage();
  }
  
  /**
   * Mensaje cuando una herramienta no está disponible
   */
  private static getToolNotFoundMessage(attemptedTool?: string, availableTools?: string[]): string {
    const messages = [
      `¡Órale compadre! Esa función todavía está en el taller. 🔧\n\nEstoy trabajando duro para traértela pronto. Mientras tanto, ¿te ayudo con algo más?`,
      
      `¡Ey primo! Esa herramienta aún no la tengo instalada. 🛠️\n\nPero no te preocupes, estoy aprendiendo nuevos trucos cada día. ¿Qué más puedo hacer por ti?`,
      
      `¡Ah caray! Esa función está en construcción. 🚧\n\nComo buen contratista, sé que las mejores cosas toman tiempo. ¿Te ayudo con otra cosa mientras tanto?`,
      
      `¡Nel pastel! Esa herramienta todavía no está lista. 🎯\n\nPero tranquilo, el equipo de Owl Fenc está trabajando en ello. ¿Qué más necesitas?`,
      
      `¡Uy compa! Esa función está en desarrollo. 💻\n\nComo dice el dicho: "Roma no se construyó en un día". ¿Te echo la mano con algo más?`
    ];
    
    // Seleccionar mensaje aleatorio
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Si tenemos herramientas disponibles, agregarlas
    if (availableTools && availableTools.length > 0) {
      const toolsList = availableTools
        .map(t => `• ${this.getToolFriendlyName(t)}`)
        .join('\n');
      
      return `${randomMessage}\n\n**Lo que sí puedo hacer ahora:**\n${toolsList}`;
    }
    
    return randomMessage;
  }
  
  /**
   * Mensaje cuando falla la generación del plan
   */
  private static getPlanningErrorMessage(userInput?: string): string {
    const messages = [
      `¡Órale! Me trabé un poco tratando de entender eso. 🤔\n\n¿Podrías decírmelo de otra manera? A veces mi cerebro necesita un poco más de claridad, compadre.`,
      
      `¡Ey primo! No entendí bien lo que necesitas. 😅\n\n¿Me lo explicas con otras palabras? Así te ayudo mejor.`,
      
      `¡Ah caray! Me confundí un poco. 🧠\n\nDame más detalles de lo que necesitas y te ayudo al tiro.`,
      
      `¡Nel! No capté bien la onda. 🎯\n\n¿Puedes ser más específico? Entre más detalles me des, mejor te puedo ayudar.`,
      
      `¡Uy compa! Se me cruzaron los cables. 🔌\n\nIntenta decirme qué necesitas paso por paso, así te entiendo mejor.`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  /**
   * Mensaje cuando falla la ejecución de un paso
   */
  private static getExecutionErrorMessage(): string {
    return `¡Órale! Algo salió mal con esta función conversacional. 🔧

**Mientras tanto, puedes usar las herramientas manuales:**
• **Estimate Wizard** - Para crear estimados
• **Contract Generator** - Para generar contratos
• **Invoice Generator** - Para crear facturas
• **Permit Advisor** - Para información de permisos

🚧 *Las capacidades conversacionales avanzadas están en desarrollo.*`;
  }
  
  /**
   * Mensaje cuando hay timeout
   */
  private static getTimeoutMessage(): string {
    const messages = [
      `¡Órale! Esto está tardando más de lo normal. ⏰\n\nA veces los sistemas se ponen lentos, como el tráfico en hora pico. ¿Intentamos de nuevo?`,
      
      `¡Ey primo! Se me acabó el tiempo de espera. ⌛\n\nComo cuando el concreto tarda en secar. ¿Lo intentamos otra vez?`,
      
      `¡Ah caray! Esto se está tardando mucho. 🕐\n\nMejor cancelamos y lo intentamos de nuevo, ¿va?`,
      
      `¡Nel! El sistema está muy lento. 🐌\n\nComo dice el dicho: "La paciencia es una virtud", pero mejor intentamos de nuevo.`,
      
      `¡Uy compa! Se quedó pensando mucho tiempo. 💭\n\n¿Qué te parece si lo intentamos otra vez? A veces funciona mejor al segundo intento.`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  /**
   * Mensaje cuando hay error de autenticación
   */
  private static getAuthErrorMessage(): string {
    return `¡Órale compadre! Parece que tu sesión expiró. 🔐\n\nPor favor recarga la página o vuelve a iniciar sesión. Es como cuando se te olvidan las llaves, ¿no?`;
  }
  
  /**
   * Mensaje cuando hay error de red
   */
  private static getNetworkErrorMessage(): string {
    return `¡Ey primo! Parece que hay problemas de conexión. 📡\n\nRevisa tu internet o intenta de nuevo en un momento. Es como cuando se va la luz en medio de un proyecto.`;
  }
  
  /**
   * Mensaje genérico para errores desconocidos
   */
  private static getGenericErrorMessage(): string {
    const messages = [
      `¡Órale! Algo inesperado pasó. 🤷\n\nPero tranquilo, estos errores nos ayudan a mejorar. ¿Intentamos algo diferente?`,
      
      `¡Ey primo! Hubo un problemita técnico. 🔧\n\nNo te preocupes, el equipo de Owl Fenc está al tanto. ¿Te ayudo con otra cosa?`,
      
      `¡Ah caray! Algo raro sucedió. 🎯\n\nComo cuando encuentras un clavo donde no debería estar. ¿Qué más necesitas?`,
      
      `¡Nel! Algo no cuadró. 📐\n\nPero como buen contratista, sé que siempre hay solución. ¿Intentamos otra cosa?`,
      
      `¡Uy compa! Tuve un error inesperado. 💥\n\nEstas cosas pasan, pero estamos trabajando para que sean menos frecuentes. ¿Qué más puedo hacer por ti?`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  /**
   * Convierte nombres técnicos de herramientas en nombres amigables
   */
  private static getToolFriendlyName(toolName: string): string {
    const friendlyNames: Record<string, string> = {
      'verify_property_ownership': 'Verificar dueño de propiedad',
      'create_estimate_workflow': 'Crear estimado/presupuesto',
      'create_contract_workflow': 'Crear contrato',
      'check_permits_workflow': 'Revisar permisos',
      'analyze_permits': 'Analizar permisos requeridos',
      'search_entity': 'Buscar clientes, estimados, contratos, etc.',
      'get_entity': 'Obtener detalles de clientes, estimados, etc.',
      'list_entities': 'Listar clientes, estimados, contratos, etc.',
      'search_client': 'Buscar clientes',
      'create_client': 'Crear nuevo cliente'
    };
    
    return friendlyNames[toolName] || toolName.replace(/_/g, ' ');
  }
  
  /**
   * Determina si un error debe mostrarse al usuario o solo loguearse
   */
  static shouldShowToUser(error: any): boolean {
    // Errores que NO deben mostrarse al usuario (solo logs internos)
    const internalErrors = [
      'ECONNREFUSED',
      'socket hang up',
      'ETIMEDOUT',
      'ENOTFOUND'
    ];
    
    const errorMessage = error.message || error.toString();
    
    return !internalErrors.some(internal => errorMessage.includes(internal));
  }
  
  /**
   * Obtiene un emoji apropiado para el tipo de error
   */
  static getErrorEmoji(errorType: string): string {
    const emojiMap: Record<string, string> = {
      'tool_not_found': '🔧',
      'planning_error': '🤔',
      'execution_error': '⚠️',
      'timeout': '⏰',
      'auth_error': '🔐',
      'network_error': '📡',
      'generic': '🎯'
    };
    
    return emojiMap[errorType] || '🤷';
  }
}

/**
 * MODE DETECTOR - DETECCIÓN INTELIGENTE DEL MODO DE OPERACIÓN
 * 
 * Determina si una solicitud debe usar modo AGENT o CHAT
 * basándose en el contenido de la solicitud del usuario.
 * 
 * ESTRATEGIA DE LANZAMIENTO:
 * - Agent Mode SOLO para Property Verifier (100% funcional)
 * - Otras funciones usan modo CHAT con mensajes amigables
 */

/**
 * Determina el modo de operación para una solicitud
 * 
 * REGLAS (ACTUALIZADO PARA LANZAMIENTO):
 * 1. Property verification → modo AGENT ✅
 * 2. Estimados, contratos, etc. → modo CHAT (con mensaje amigable)
 * 3. Conversación simple → modo CHAT
 */
export function determineMode(
  requestedMode: string | undefined,
  input: string
): 'agent' | 'chat' {
  
  const inputLower = input.toLowerCase();
  
  // REGLA 1: Property Verifier - ÚNICO caso que usa Agent Mode
  const propertyKeywords = [
    'propiedad', 'propiedades', 'property', 'properties',
    'dueño', 'owner', 'ownership', 'propietario',
    'verifica propiedad', 'verificar propiedad',
    'verify property', 'property verification',
    'quien es el dueño', 'who owns', 'who is the owner'
  ];
  
  const isPropertyVerification = propertyKeywords.some(keyword => 
    inputLower.includes(keyword)
  );
  
  if (isPropertyVerification) {
    console.log('🏠 [MODE-DETECTOR] Property Verification detectada → Modo AGENT');
    return 'agent';
  }
  
  // REGLA 2: Todas las demás acciones → modo CHAT
  // Esto incluye: estimados, contratos, invoices, clientes, proyectos
  const otherActionKeywords = [
    'estimado', 'estimate', 'cotización', 'quote',
    'contrato', 'contract', 'agreement',
    'factura', 'invoice', 'bill',
    'permiso', 'permit', 'license',
    'cliente', 'client', 'customer',
    'proyecto', 'project', 'trabajo', 'job',
    'lista', 'listar', 'list', 'show',
    'dame', 'muestra', 'mostrar', 'get', 'show me',
    'busca', 'buscar', 'search', 'find',
    'crea', 'crear', 'create', 'generate'
  ];
  
  const hasOtherAction = otherActionKeywords.some(keyword => 
    inputLower.includes(keyword)
  );
  
  if (hasOtherAction) {
    console.log('💬 [MODE-DETECTOR] Acción detectada (no-property) → Modo CHAT con mensaje amigable');
    return 'chat';
  }
  
  // REGLA 3: Conversación simple → modo CHAT
  console.log('💬 [MODE-DETECTOR] Conversación simple → Modo CHAT');
  return 'chat';
}

/**
 * Detecta el tipo de acción solicitada para generar mensaje apropiado
 */
export function detectActionType(input: string): 
  | 'estimate' 
  | 'contract' 
  | 'invoice' 
  | 'permit' 
  | 'client' 
  | 'project'
  | 'list'
  | 'property'
  | 'general' {
  
  const inputLower = input.toLowerCase();
  
  if (inputLower.includes('estimado') || inputLower.includes('estimate') || 
      inputLower.includes('cotización') || inputLower.includes('quote')) {
    return 'estimate';
  }
  
  if (inputLower.includes('contrato') || inputLower.includes('contract')) {
    return 'contract';
  }
  
  if (inputLower.includes('factura') || inputLower.includes('invoice')) {
    return 'invoice';
  }
  
  if (inputLower.includes('permiso') || inputLower.includes('permit')) {
    return 'permit';
  }
  
  if (inputLower.includes('cliente') || inputLower.includes('client')) {
    return 'client';
  }
  
  if (inputLower.includes('proyecto') || inputLower.includes('project')) {
    return 'project';
  }
  
  if (inputLower.includes('lista') || inputLower.includes('listar') || 
      inputLower.includes('list') || inputLower.includes('dame') ||
      inputLower.includes('muestra') || inputLower.includes('show')) {
    return 'list';
  }
  
  if (inputLower.includes('propiedad') || inputLower.includes('property')) {
    return 'property';
  }
  
  return 'general';
}

/**
 * Genera mensaje amigable dirigiendo al usuario a la herramienta manual
 */
export function generateFriendlyRedirectMessage(actionType: string): string {
  const messages = {
    estimate: `¡Claro! Para crear un estimado, usa la herramienta **Estimate Wizard** en el menú principal.

📊 **Estimate Wizard** te permite:
- Calcular costos de materiales y mano de obra
- Generar estimados profesionales en PDF
- Enviar estimados directamente a tus clientes

🚧 *La creación conversacional de estimados está en desarrollo y estará disponible pronto.*`,

    contract: `¡Perfecto! Para generar un contrato, usa la herramienta **Contract Generator** en el menú.

📄 **Contract Generator** te permite:
- Crear contratos legales personalizados
- Usar templates pre-aprobados
- Generar documentos listos para firmar

🚧 *La generación conversacional de contratos está en desarrollo.*`,

    invoice: `¡Entendido! Para crear una factura, usa la herramienta **Invoice Generator** en el menú.

💰 **Invoice Generator** te permite:
- Generar facturas profesionales
- Rastrear pagos
- Enviar recordatorios automáticos

🚧 *La creación conversacional de facturas está en desarrollo.*`,

    permit: `¡Claro! Para información sobre permisos, usa la herramienta **Permit Advisor** en el menú.

📋 **Permit Advisor** te ayuda con:
- Requisitos de permisos por ciudad
- Documentación necesaria
- Proceso de aplicación

🚧 *El asesor conversacional de permisos está en desarrollo.*`,

    client: `¡Perfecto! Para gestionar clientes, ve a la sección **Clients** en el menú.

👥 **Client Management** te permite:
- Ver todos tus clientes
- Agregar nuevos clientes
- Ver historial de proyectos

🚧 *La gestión conversacional de clientes está en desarrollo.*`,

    project: `¡Entendido! Para gestionar proyectos, ve a la sección **Projects** en el menú.

🏗️ **Project Management** te permite:
- Ver todos tus proyectos
- Crear nuevos proyectos
- Rastrear progreso

🚧 *La gestión conversacional de proyectos está en desarrollo.*`,

    list: `¡Claro! Para ver tus registros, usa las secciones correspondientes en el menú:

📊 **Menú Principal:**
- **Estimates** - Ver todos tus estimados
- **Contracts** - Ver todos tus contratos
- **Invoices** - Ver todas tus facturas
- **Clients** - Ver todos tus clientes
- **Projects** - Ver todos tus proyectos

🚧 *La consulta conversacional de datos está en desarrollo.*`,

    property: `🏠 **Property Verifier** está disponible y funcional.

Por favor, proporciona:
- Dirección completa de la propiedad
- Ciudad y estado

Verificaré la información del propietario usando registros públicos.`,

    general: `¡Hola! Actualmente, **Property Verifier** está completamente funcional. 

Para otras funciones como estimados, contratos, o facturas, por favor usa las herramientas manuales en el menú principal.

🚧 *Las capacidades conversacionales avanzadas están en desarrollo.*

¿En qué puedo ayudarte específicamente?`
  };
  
  return messages[actionType] || messages.general;
}

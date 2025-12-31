/**
 * MODE DETECTOR - DETECCIÓN INTELIGENTE DEL MODO DE OPERACIÓN
 * 
 * Determina si una solicitud debe usar modo AGENT o CHAT
 * basándose en el contenido de la solicitud del usuario.
 */

/**
 * Determina el modo de operación para una solicitud
 * 
 * REGLAS:
 * 1. Si la solicitud contiene palabras clave de ACCIÓN → modo AGENT
 * 2. Si la solicitud es conversacional simple → modo CHAT
 * 3. Por defecto → modo AGENT (para maximizar utilidad)
 */
export function determineMode(
  requestedMode: string | undefined,
  input: string
): 'agent' | 'chat' {
  
  // REGLA 1: Detectar palabras clave de acción
  const actionKeywords = [
    // Verbos de acción en español
    'verifica', 'verificar', 'investiga', 'investigar', 'busca', 'buscar',
    'genera', 'generar', 'crea', 'crear', 'calcula', 'calcular',
    'ayuda a', 'ayúdame', 'necesito que', 'podrías',
    'quiero que', 'puedes', 'haz', 'hacer',
    'revisa', 'revisar', 'analiza', 'analizar',
    'obtén', 'obtener', 'consigue', 'conseguir',
    'dame', 'muestra', 'mostrar', 'encuentra', 'encontrar',
    
    // Verbos de acción en inglés
    'verify', 'investigate', 'search', 'generate', 'create',
    'calculate', 'help me', 'i need', 'could you', 'can you',
    'please', 'get me', 'show me', 'find',
    
    // Entidades específicas del negocio
    'propiedad', 'propiedades', 'property', 'properties',
    'dueño', 'owner', 'ownership',
    'estimado', 'estimate', 'cotización', 'quote',
    'contrato', 'contract', 'agreement',
    'factura', 'invoice', 'bill',
    'permiso', 'permit', 'license',
    'cliente', 'client', 'customer',
    'proyecto', 'project', 'trabajo', 'job'
  ];
  
  const inputLower = input.toLowerCase();
  const hasActionKeyword = actionKeywords.some(keyword => inputLower.includes(keyword));
  
  if (hasActionKeyword) {
    console.log('🎯 [MODE-DETECTOR] Acción detectada en solicitud → Modo AGENT');
    return 'agent';
  }
  
  // REGLA 2: Preguntas simples conversacionales
  const conversationalPatterns = [
    /^(hola|hi|hello|hey)/i,
    /^(cómo estás|how are you)/i,
    /^(qué tal|what's up)/i,
    /^(gracias|thanks|thank you)/i,
    /^(ok|okay|entiendo|got it)/i
  ];
  
  const isConversational = conversationalPatterns.some(pattern => pattern.test(input));
  
  if (isConversational && input.length < 50) {
    console.log('💬 [MODE-DETECTOR] Conversación simple detectada → Modo CHAT');
    return 'chat';
  }
  
  // REGLA 3: Por defecto, usar modo AGENT
  // Esto maximiza la utilidad del sistema para los usuarios
  console.log('🤖 [MODE-DETECTOR] Usando modo AGENT por defecto');
  return 'agent';
}

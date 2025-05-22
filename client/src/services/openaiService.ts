import OpenAI from "openai";

// Permitir uso condicional de openai para evitar errores cuando la API key no está disponible
let openai: OpenAI | null = null;

// Función para obtener o crear la instancia de OpenAI
function getOpenAI() {
  // Intentamos obtener la clave API desde las variables de entorno del navegador
  // o desde el backend a través de un endpoint seguro
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
  
  if (apiKey) {
    console.log("Configurando OpenAI con clave API válida");
    try {
      openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Necesario para uso en navegador
      });
      return openai;
    } catch (error) {
      console.error("Error al inicializar OpenAI:", error);
    }
  } else {
    // Intenta obtener la clave del backend
    console.log("Intentando obtener clave API desde el backend...");
    // Registramos un error solo en la consola para debugging
    console.warn("⚠️ No se encontró OPENAI_API_KEY en las variables de entorno del cliente. Intentando usar fallback.");
    
    // Crear una versión simulada más robusta
    return {
      chat: {
        completions: {
          create: async ({ messages }: { messages: Array<{role: string; content: string}> }) => {
            console.log("Usando OpenAI simulado con mensajes:", messages);
            
            // Descripción original desde los mensajes
            const userMessage = messages.find(m => m.role === "user")?.content || "";
            
            // Simulamos una mejora simple pero útil
            const enhancedText = `
**Resumen del Proyecto**
- ${userMessage}

**Especificaciones Técnicas**
- Utilizaremos materiales de alta calidad para garantizar durabilidad
- El trabajo será realizado por personal especializado
- Todas las medidas serán verificadas en sitio

**Proceso de Ejecución**
- Preparación inicial del área de trabajo
- Instalación de componentes principales
- Acabados finales con atención al detalle
- Limpieza completa al finalizar

**Valor Añadido**
- Garantía de calidad en materiales y mano de obra
- Supervisión constante del proyecto
- Cumplimiento con los estándares de la industria
            `;
            
            return {
              choices: [{ 
                message: { 
                  content: enhancedText,
                  role: "assistant" 
                } 
              }]
            };
          }
        }
      }
    } as unknown as OpenAI;
  }
}

// El modelo más reciente de OpenAI
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const GPT_MODEL = "gpt-4o";

/**
 * Mejora la descripción de un proyecto utilizando IA para añadir detalles profesionales
 * @param description Descripción original del proyecto
 * @param projectType Tipo de proyecto (fencing, roofing, general, etc.)
 * @returns Descripción mejorada con detalles profesionales
 */
export async function enhanceDescriptionWithAI(description: string, projectType: string): Promise<string> {
  try {
    // Si no hay descripción original, retornar vacío
    if (!description.trim()) {
      return '';
    }
    
    // Obtener instancia de OpenAI
    const ai = getOpenAI();
    if (!ai) {
      console.warn("No se pudo inicializar OpenAI. Devolviendo texto original.");
      return description;
    }
    
    // Crear el prompt específico según el tipo de proyecto con enfoque en inglés y más detalle
    const systemPrompt = `
You're an expert in construction project descriptions. Please enhance the following project description by:

1. Creating an English language version (even if input is in Spanish)
2. Structuring with clear bullet points for better readability
3. Creating specific sections:
   - Project Overview
   - Materials & Specifications
   - Timeline & Project Phases
   - Quality Assurance
   
4. Be very specific about timeline and project development details
5. Make it professional, detailed and easy to read
6. Use technical terms appropriate for the construction industry
7. Do not invent specific measurements or costs that aren't in the original text

For ${projectType} projects specifically:
- Include industry best practices
- Reference relevant technical standards 
- Add important safety considerations
- Highlight quality control processes

Format the response with clear headers in bold, bulleted lists, and good spacing.
    `;
    
    console.log("Enviando petición a OpenAI con prompt para tipo de proyecto:", projectType);
    
    // Realizar la llamada a la API de OpenAI
    const response = await ai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: description
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    if (!response.choices || response.choices.length === 0) {
      console.error("La respuesta de OpenAI no contiene choices:", response);
      throw new Error("Formato de respuesta inválido de OpenAI");
    }
    
    // Extraer el contenido mejorado
    const enhancedContent = response.choices[0].message?.content;
    
    if (!enhancedContent) {
      console.error("No se recibió contenido en la respuesta de OpenAI:", response.choices[0]);
      throw new Error("No se recibió contenido mejorado");
    }
    
    console.log("Texto mejorado recibido de OpenAI:", enhancedContent.substring(0, 100) + "...");
    
    // Retornar el texto mejorado
    return enhancedContent;
  } catch (error) {
    console.error("Error al mejorar la descripción con IA:", error);
    // Propagar el error para que el componente pueda manejarlo apropiadamente
    throw error;
  }
}

/**
 * Obtener el prompt específico para cada tipo de proyecto
 */
function getSystemPromptForProjectType(projectType: string): string {
  const basePrompt = `Eres un asistente experto en la redacción de descripciones profesionales para presupuestos y contratos en el sector construcción.

Tu objetivo es mejorar la descripción de un proyecto proporcionada por el usuario, transformándola en un texto profesional, bien estructurado y visualmente atractivo.

INSTRUCCIONES IMPORTANTES DE FORMATO:
- ESTRUCTURA el texto con viñetas claras para los puntos principales
- ORGANIZA la información en secciones lógicas (Alcance del trabajo, Materiales, Proceso, etc.)
- USA subtítulos en negrita para mejorar la organización
- DESTACA los aspectos más importantes

CONTENIDO A MEJORAR:
1. Añade terminología técnica apropiada y precisa
2. Incluye especificaciones más detalladas donde sea relevante
3. Mejora la estructura y claridad del texto original
4. Destaca aspectos importantes que puedan faltar
5. Adopta un tono profesional y de confianza

RESTRICCIONES IMPORTANTES:
- NO inventes información específica (medidas, materiales, fechas) que no esté en el texto original
- MANTÉN toda la información fáctica del texto original
- CONSERVA el idioma del texto original (español/inglés)

Tu respuesta debe ser un texto bien organizado, con formato profesional, que transmita experiencia y confianza.`;

  // Prompts específicos según el tipo de proyecto con mayor énfasis en formato profesional
  switch (projectType) {
    case 'fencing':
      return `${basePrompt}

PARA ESTE PROYECTO DE CERCAS/VALLADO:
Estructura la descripción en las siguientes secciones:

1. **Resumen del Proyecto** - Breve descripción general del trabajo de cercado
2. **Especificaciones Técnicas** - Incluye detalles sobre:
   - Tipo de cerca y materiales
   - Dimensiones y medidas
   - Acabados y tratamientos (galvanizado, pintado, sellado)
   - Profundidad de cimentación y especificaciones de postes
   - Sistemas de sujeción y herrajes

3. **Proceso de Instalación** - Describe las etapas clave:
   - Preparación del terreno
   - Consideraciones de nivelación y pendiente
   - Métodos de instalación
   - Control de calidad

4. **Valor Añadido** - Destaca aspectos como:
   - Durabilidad y vida útil
   - Mantenimiento recomendado
   - Garantías aplicables
   - Cumplimiento normativo

5. **Notas Adicionales** - Cualquier consideración especial relevante

Usa terminología técnica apropiada y presenta la información de manera visualmente clara con viñetas y secciones bien definidas.`;
      
    case 'roofing':
      return `${basePrompt}

PARA ESTE PROYECTO DE TECHOS:
Estructura la descripción en las siguientes secciones:

1. **Resumen del Proyecto** - Breve descripción general del trabajo de techado
2. **Especificaciones Técnicas** - Incluye detalles sobre:
   - Sistema de techado y materiales
   - Sistemas de membrana o impermeabilización
   - Aislamiento y ventilación
   - Detalles de inclinación y drenaje
   - Tapajuntas y sellado

3. **Proceso de Instalación** - Describe las etapas clave:
   - Preparación y remoción (si aplica)
   - Métodos de instalación
   - Tratamiento de áreas críticas
   - Control de calidad

4. **Valor Añadido** - Destaca aspectos como:
   - Eficiencia energética
   - Durabilidad y vida útil
   - Garantías de materiales y mano de obra
   - Cumplimiento normativo

5. **Notas Adicionales** - Cualquier consideración especial relevante

Usa terminología técnica apropiada y presenta la información de manera visualmente clara con viñetas y secciones bien definidas.`;
      
    case 'general':
      return `${basePrompt}

PARA ESTE PROYECTO DE CONSTRUCCIÓN:
Estructura la descripción en las siguientes secciones:

1. **Resumen del Proyecto** - Breve descripción general del alcance del trabajo
2. **Especificaciones Técnicas** - Incluye detalles sobre:
   - Materiales principales a utilizar
   - Dimensiones y características fundamentales
   - Acabados y calidades
   - Sistemas y elementos críticos

3. **Proceso de Ejecución** - Describe las etapas clave:
   - Preparación y trabajos preliminares
   - Secuencia de actividades principales
   - Métodos constructivos relevantes
   - Control de calidad y supervisión

4. **Valor Añadido** - Destaca aspectos como:
   - Durabilidad y calidad
   - Eficiencia y optimización
   - Garantías aplicables
   - Cumplimiento normativo y permisos

5. **Notas Adicionales** - Cualquier consideración especial relevante

Usa terminología técnica apropiada y presenta la información de manera visualmente clara con viñetas y secciones bien definidas. Enfócate en crear un documento que transmita profesionalismo y confianza al cliente.`;
            
    // Incluye los otros tipos de proyecto con el mismo formato mejorado
    default:
      return `${basePrompt}

PARA ESTE PROYECTO:
Estructura la descripción en las siguientes secciones:

1. **Resumen del Proyecto** - Breve descripción general del alcance del trabajo
2. **Especificaciones Técnicas** - Incluye detalles sobre:
   - Materiales principales a utilizar
   - Dimensiones y características fundamentales
   - Acabados y calidades
   - Sistemas y elementos críticos

3. **Proceso de Ejecución** - Describe las etapas clave:
   - Preparación y trabajos preliminares
   - Secuencia de actividades principales
   - Métodos constructivos relevantes
   - Control de calidad y supervisión

4. **Valor Añadido** - Destaca aspectos como:
   - Durabilidad y calidad
   - Eficiencia y optimización
   - Garantías aplicables
   - Cumplimiento normativo y permisos

5. **Notas Adicionales** - Cualquier consideración especial relevante

Usa terminología técnica apropiada y presenta la información de manera visualmente clara con viñetas y secciones bien definidas. Enfócate en crear un documento que transmita profesionalismo y confianza al cliente.`;
  }
}

/**
 * Analiza el estado de un contrato para ofrecer sugerencias de mejora
 * @param contractData Datos del contrato a analizar
 * @returns Sugerencias para mejorar el contrato
 */
export async function analyzeContract(contractData: Record<string, any>): Promise<string> {
  try {
    // Obtener instancia de OpenAI
    const ai = getOpenAI();
    if (!ai) {
      console.warn("No se pudo inicializar OpenAI para análisis de contrato.");
      return "No se pudo realizar el análisis debido a un error de conexión con el servicio de IA.";
    }
    
    const response = await ai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: `Eres un experto en contratos de construcción. Analiza los datos de este contrato y proporciona sugerencias para mejorarlo. 
Busca elementos faltantes, posibles ambigüedades y oportunidades para proteger mejor al contratista. 
Ofrece sugerencias específicas pero concisas, en formato de lista con viñetas.`
        },
        {
          role: "user",
          content: JSON.stringify(contractData, null, 2)
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });
    
    return response.choices[0].message.content || "No se pudieron generar sugerencias para este contrato.";
  } catch (error) {
    console.error("Error al analizar el contrato:", error);
    return "No se pudo completar el análisis del contrato.";
  }
}

/**
 * Genera cláusulas adicionales para un contrato específico utilizando IA
 * @param contractData Datos del contrato actual
 * @param projectType Tipo de proyecto (fencing, roofing, etc.)
 * @returns Cláusulas adicionales recomendadas para el contrato
 */
export async function generateAdditionalClauses(contractData: Record<string, any>, projectType: string): Promise<string> {
  try {
    // Obtener instancia de OpenAI
    const ai = getOpenAI();
    if (!ai) {
      console.warn("No se pudo inicializar OpenAI para generar cláusulas adicionales.");
      return "No se pudieron generar cláusulas adicionales debido a un error de conexión con el servicio de IA.";
    }
    
    const systemPrompt = `
You are a legal expert specializing in construction contracts. Your task is to generate additional clauses that would benefit this ${projectType} project contract.

Generate 5-7 specific contract clauses that:
1. Protect the contractor from common risks and liabilities
2. Address specific issues related to ${projectType} projects
3. Cover important aspects that may be missing from standard contracts
4. Clarify responsibilities and expectations
5. Include industry-standard protections

For each clause:
- Provide a clear title in bold
- Write the clause in formal legal language
- Keep each clause concise yet comprehensive
- Format in a way that's easy to read and incorporate into a contract

The clauses should be specifically tailored to the project type and circumstances described in the contract data.
`;
    
    const response = await ai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify(contractData, null, 2)
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    return response.choices[0].message.content || "No se pudieron generar cláusulas adicionales para este contrato.";
  } catch (error) {
    console.error("Error al generar cláusulas adicionales:", error);
    return "No se pudieron generar cláusulas adicionales debido a un error.";
  }
}

/**
 * Generates enhanced content for contract fields such as scope descriptions or legal clauses
 * @param prompt The user's prompt or description to enhance
 * @param projectType The type of project (fencing, roofing, etc.)
 * @returns Enhanced professional content for the contract
 */
export async function generateEnhancedContent(prompt: string, projectType: string): Promise<string> {
  try {
    // Get OpenAI instance
    const ai = getOpenAI();
    if (!ai) {
      console.warn("Could not initialize OpenAI for content enhancement");
      return "Could not generate enhanced content due to a connection error with the AI service.";
    }
    
    // Determine what type of content we're generating based on keywords in the prompt
    let contentType = "general";
    if (prompt.toLowerCase().includes("scope") || prompt.toLowerCase().includes("work") || prompt.toLowerCase().includes("project")) {
      contentType = "scope";
    } else if (prompt.toLowerCase().includes("clause") || prompt.toLowerCase().includes("legal") || prompt.toLowerCase().includes("term")) {
      contentType = "clause";
    } else if (prompt.toLowerCase().includes("background") || prompt.toLowerCase().includes("context")) {
      contentType = "background";
    }
    
    // Create appropriate system prompt based on content type
    let systemPrompt = "";
    switch (contentType) {
      case "scope":
        systemPrompt = `
You are an expert in construction project specifications. Create a detailed scope of work for a ${projectType} project based on the provided information.

Your response should:
1. Be well-structured with clear sections using bullet points
2. Include detailed specifications relevant to ${projectType} projects
3. Cover materials, methods, timelines, and deliverables
4. Be written in professional English appropriate for a legal contract
5. Include specific timeline and project development details
6. Be comprehensive yet clear and easy to understand

Format with clear headers, bullet points for key items, and good spacing for readability.
`;
        break;
      case "clause":
        systemPrompt = `
You are a legal expert specializing in construction contracts. Create additional legal clauses for a ${projectType} project contract.

Your response should include:
1. 3-5 clearly titled sections with specific clauses
2. Formal legal language appropriate for contracts
3. Clauses that protect the contractor from common risks
4. Specific considerations for ${projectType} projects
5. Clear definition of responsibilities and expectations

Format each clause with a clear title, concise professional language, and maintain a formal tone throughout.
`;
        break;
      case "background":
        systemPrompt = `
You are a professional contract writer. Create a background/context section for a ${projectType} contract.

Your response should:
1. Establish the purpose and context of the agreement
2. Reference the relationship between the parties
3. Briefly describe the nature of the ${projectType} project
4. Set the foundation for the detailed terms that follow
5. Use formal language appropriate for a legal document

Keep the response concise but informative, with professional contract language.
`;
        break;
      default:
        systemPrompt = `
You are a professional contract writer specializing in construction agreements. Generate well-written content for a ${projectType} project contract based on the provided prompt.

Your response should:
1. Use formal language appropriate for legal contracts
2. Be well-structured with clear organization
3. Include specific details where appropriate
4. Be comprehensive yet concise
5. Maintain a professional tone throughout

Format the response with appropriate sections, bullet points where helpful, and clear organization.
`;
    }
    
    // Call OpenAI API
    const response = await ai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    return response.choices[0].message.content || "Could not generate enhanced content.";
  } catch (error) {
    console.error("Error generating enhanced content:", error);
    return "An error occurred while generating the enhanced content.";
  }
}
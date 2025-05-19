import OpenAI from "openai";

// Crear instancia de OpenAI con la API key del entorno
const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY });

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
    
    // Crear el prompt específico según el tipo de proyecto
    const systemPrompt = getSystemPromptForProjectType(projectType);
    
    // Realizar la llamada a la API de OpenAI
    const response = await openai.chat.completions.create({
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
      max_tokens: 800
    });
    
    // Extraer y retornar el texto mejorado
    return response.choices[0].message.content || description;
  } catch (error) {
    console.error("Error al mejorar la descripción con IA:", error);
    // En caso de error, devolver la descripción original
    return description;
  }
}

/**
 * Obtener el prompt específico para cada tipo de proyecto
 */
function getSystemPromptForProjectType(projectType: string): string {
  const basePrompt = `Eres un asistente experto en la redacción de descripciones profesionales para contratos en el sector construcción. 
Tu tarea es mejorar la descripción de un proyecto que proporcionará el usuario. 
La descripción debe ser clara, detallada, precisa y profesional. 
Debes mantener toda la información original proporcionada, pero mejorarla añadiendo:
1. Terminología técnica apropiada
2. Especificaciones más detalladas cuando sea apropiado
3. Mejor estructura y claridad
4. Mencionar importantes aspectos que pudieran faltar
5. Un tono profesional y formal apropiado para un contrato

NO inventes información específica que no esté en la descripción original, como medidas exactas, materiales o fechas.
Mejora el formato y la presentación para facilitar la lectura.`;

  // Prompts específicos según el tipo de proyecto
  switch (projectType) {
    case 'fencing':
      return `${basePrompt}
Para este proyecto de cercas o vallado, asegúrate de incluir términos apropiados como:
- Acabados y tratamientos (galvanizado, pintado, sellado)
- Profundidad de cimentación de postes
- Sujeciones y herrajes
- Consideraciones de nivelación y pendiente
- Medidas de seguridad
- Aspectos de durabilidad y mantenimiento`;
      
    case 'roofing':
      return `${basePrompt}
Para este proyecto de techado, asegúrate de incluir términos apropiados como:
- Sistemas de membrana o impermeabilización
- Ventilación y aislamiento
- Detalles de inclinación y drenaje
- Tapajuntas y sellado
- Garantía de materiales
- Procedimientos de remoción (si aplica)`;
      
    case 'plumbing':
      return `${basePrompt}
Para este proyecto de plomería, asegúrate de incluir términos apropiados como:
- Tipos de tuberías y conexiones
- Presión y flujo de agua
- Sistemas de drenaje y ventilación
- Pruebas de presión y fugas
- Códigos y regulaciones aplicables
- Procedimientos de cierres temporales de agua`;
      
    case 'electrical':
      return `${basePrompt}
Para este proyecto eléctrico, asegúrate de incluir términos apropiados como:
- Capacidad de amperaje y voltaje
- Tipos de cableado y conductos
- Protección de circuitos
- Cumplimiento de código eléctrico
- Consideraciones de seguridad específicas
- Pruebas y certificación`;
      
    case 'carpentry':
      return `${basePrompt}
Para este proyecto de carpintería, asegúrate de incluir términos apropiados como:
- Tipos y grados de madera
- Métodos de unión y fijación
- Acabados y tratamientos
- Tolerancias y ajustes
- Aspectos estéticos y funcionales
- Técnicas de instalación`;
      
    case 'concrete':
      return `${basePrompt}
Para este proyecto de concreto, asegúrate de incluir términos apropiados como:
- Resistencia del concreto (PSI/MPa)
- Métodos de preparación y colocación
- Refuerzo (varillas, malla, fibra)
- Juntas de expansión y control
- Curado y acabado
- Consideraciones climáticas`;
      
    case 'landscaping':
      return `${basePrompt}
Para este proyecto de paisajismo, asegúrate de incluir términos apropiados como:
- Preparación del terreno y nivelación
- Selección de plantas y distribución
- Sistemas de riego y drenaje
- Elementos decorativos y funcionales
- Mantenimiento inicial
- Garantía de supervivencia de plantas`;
      
    case 'painting':
      return `${basePrompt}
Para este proyecto de pintura, asegúrate de incluir términos apropiados como:
- Preparación de superficies
- Tipos de pintura y acabados
- Número de capas y espesor
- Técnicas de aplicación
- Protección de áreas adyacentes
- Tiempos de secado`;
      
    case 'flooring':
      return `${basePrompt}
Para este proyecto de pisos, asegúrate de incluir términos apropiados como:
- Preparación del subsuelo
- Material y especificaciones
- Patrón de instalación
- Sistemas de adhesión
- Acabados y selladores
- Expansión y contracción`;
      
    case 'hvac':
      return `${basePrompt}
Para este proyecto de calefacción/aire acondicionado, asegúrate de incluir términos apropiados como:
- Capacidad y dimensionamiento
- Eficiencia energética
- Distribución de aire o fluido
- Controles y termostatos
- Pruebas y balanceo
- Permisos y cumplimiento normativo`;
    
    default:
      return basePrompt; // Prompt genérico para otros tipos de proyecto
  }
}

/**
 * Analiza el estado de un contrato para ofrecer sugerencias de mejora
 * @param contractData Datos del contrato a analizar
 * @returns Sugerencias para mejorar el contrato
 */
export async function analyzeContract(contractData: Record<string, any>): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
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
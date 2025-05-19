import OpenAI from "openai";

// OpenAI client configuration
let openai: OpenAI | null = null;
let isUsingServerEndpoint = false;

// Función para obtener o crear la instancia de OpenAI
function getOpenAI() {
  if (!openai) {
    // Verificar si tenemos una clave de API desde las variables de entorno
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (apiKey) {
      // Usar API key directamente desde el cliente 
      openai = new OpenAI({ apiKey });
      console.log("OpenAI inicializado con clave de API local");
    } else {
      // Si no tenemos API key local, intentaremos usar el endpoint del servidor
      console.log("No se encuentra OPENAI_API_KEY local, intentando usar el endpoint del servidor...");
      isUsingServerEndpoint = true;
      
      // No necesitamos un cliente OpenAI en este caso, ya que haremos 
      // peticiones a nuestro servidor que tiene las claves configuradas
      return null;
    }
  }
  
  return openai;
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
    
    // Obtener instancia de OpenAI o verificar si usamos el endpoint del servidor
    const ai = getOpenAI();
    
    // Crear el prompt específico según el tipo de proyecto
    const systemPrompt = getSystemPromptForProjectType(projectType);
    
    // Primero intentar con OpenAI directo si está disponible
    if (ai) {
      console.log("Intentando usar API de OpenAI directamente...");
      
      try {
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
          max_tokens: 800
        });
        
        // Extraer y retornar el texto mejorado
        const enhancedText = response.choices[0].message.content || description;
        console.log("Descripción mejorada exitosamente con OpenAI directo");
        return enhancedText;
      } catch (directError) {
        console.warn("Error al usar OpenAI directo, intentando con servidor:", directError);
        // Si falla la conexión directa, usaremos el endpoint del servidor como fallback
        isUsingServerEndpoint = true;
      }
    }
    
    // Si llegamos aquí, o bien falló OpenAI directo o estamos configurados para usar el endpoint del servidor
    if (isUsingServerEndpoint) {
      console.log("Usando endpoint del servidor para mejorar descripción...");
      
      try {
        // Llamar al endpoint del servidor que maneja la comunicación con OpenAI
        const response = await fetch('/api/enhance-description', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description,
            projectType,
            systemPrompt
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No se pudo leer el mensaje de error');
          console.error(`Error del servidor (${response.status}):`, errorText);
          throw new Error(`Error del servidor: ${response.status}. ${errorText}`);
        }
        
        const data = await response.json();
        if (!data.enhancedDescription) {
          console.warn("La respuesta del servidor no incluye descripción mejorada:", data);
        }
        console.log("Descripción mejorada exitosamente con endpoint del servidor");
        return data.enhancedDescription || description;
      } catch (serverError) {
        console.error("Error al comunicarse con el servidor:", serverError);
        
        // Mensaje de error más detallado
        let errorMsg = "No se pudo procesar la descripción. ";
        
        if (serverError instanceof Error) {
          if (serverError.message.includes('Failed to fetch') || serverError.message.includes('NetworkError')) {
            errorMsg += 'Hay un problema de conexión con el servidor. Verifica tu conexión a internet.';
          } else if (serverError.message.includes('401') || serverError.message.includes('403')) {
            errorMsg += 'El servicio no está autorizado. La API key podría no ser válida.';
          } else if (serverError.message.includes('500')) {
            errorMsg += 'Error interno en el servidor. Por favor, inténtalo más tarde.';
          } else {
            errorMsg += `Error: ${serverError.message}`;
          }
        } else {
          errorMsg += 'Error desconocido al procesar tu solicitud.';
        }
        
        throw new Error(errorMsg);
      }
    }
    
    // Si llegamos aquí es que no pudimos usar ninguno de los métodos
    console.error("No se pudo establecer conexión con ningún servicio de IA.");
    throw new Error("No se pudo establecer conexión con el servicio de IA. Contacte al administrador o revise la configuración de la app.");
  } catch (error) {
    console.error("Error al mejorar la descripción con IA:", error);
    // Agregar datos de diagnóstico al error para mejor solución de problemas
    const diagError = new Error(
      error instanceof Error ? 
      `${error.message} (AI Enhancement Error - ${new Date().toISOString()})` : 
      "Error desconocido al mejorar la descripción"
    );
    throw diagError;
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
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ProjectEnhancementRequest {
  originalText: string;
  projectType?: string;
}

export interface ProjectEnhancementResponse {
  enhancedDescription: string;
  bulletPoints: string[];
  professionalSummary: string;
}

/**
 * Mejora una descripción de proyecto usando OpenAI GPT-4
 * Traduce al inglés y hace el texto más profesional con bullet points
 */
export async function enhanceProjectDescription(
  request: ProjectEnhancementRequest
): Promise<ProjectEnhancementResponse> {
  const { originalText, projectType = 'general' } = request;

  if (!originalText || originalText.trim().length < 5) {
    throw new Error('El texto debe tener al menos 5 caracteres');
  }

  const prompt = `
You are a professional project description enhancement specialist. Your task is to transform the following project description into a professional, clear, and well-structured English description.

Original text (may be in Spanish or English): "${originalText}"
Project type: ${projectType}

Please provide:
1. A professional English translation and enhancement of the description
2. Clear bullet points breaking down the work scope
3. A concise professional summary

Requirements:
- Translate to English if necessary
- Use professional construction/project management terminology
- Create clear, specific bullet points
- Make it sound professional and detailed
- Include estimated scope and methodology when possible
- Use proper grammar and professional language

Format your response as a JSON object with these exact keys:
{
  "enhancedDescription": "Full professional description in paragraph form",
  "bulletPoints": ["• Point 1", "• Point 2", "• Point 3"],
  "professionalSummary": "Concise 1-2 sentence summary"
}

Ensure the response is valid JSON and focuses on construction/project work details.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional project description enhancement specialist. Always respond with valid JSON format as requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    // Intentar parsear la respuesta JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      // Si no es JSON válido, crear una respuesta estructurada
      console.warn('Respuesta no es JSON válido, creando respuesta estructurada:', parseError);
      
      // Extraer el contenido y estructurarlo
      const enhancedText = responseText.trim();
      parsedResponse = {
        enhancedDescription: enhancedText,
        bulletPoints: enhancedText.split('\n').filter(line => 
          line.trim().length > 0 && (line.includes('•') || line.includes('-'))
        ).slice(0, 5), // Tomar máximo 5 bullet points
        professionalSummary: enhancedText.split('\n')[0] || enhancedText.substring(0, 150) + '...'
      };
    }

    // Validar que la respuesta tenga la estructura esperada
    if (!parsedResponse.enhancedDescription) {
      throw new Error('Respuesta de IA no tiene la estructura esperada');
    }

    return {
      enhancedDescription: parsedResponse.enhancedDescription,
      bulletPoints: parsedResponse.bulletPoints || [],
      professionalSummary: parsedResponse.professionalSummary || parsedResponse.enhancedDescription.substring(0, 150) + '...'
    };

  } catch (error) {
    console.error('Error en enhanceProjectDescription:', error);
    throw new Error(`Error al mejorar descripción: ${error.message}`);
  }
}

/**
 * Función de respaldo para casos donde OpenAI no esté disponible
 */
export function createFallbackEnhancement(originalText: string): ProjectEnhancementResponse {
  // Traducciones básicas y mejoras sin IA
  const translationMap: Record<string, string> = {
    'remover': 'remove',
    'installar': 'install',
    'fence': 'fence',
    'existente': 'existing',
    'madera': 'wood',
    'altura': 'height',
    'nuevo': 'new',
    'longitud': 'length',
    'pintura': 'paint',
    'barnizada': 'stained'
  };

  let enhancedText = originalText.toLowerCase();
  
  // Aplicar traducciones básicas
  Object.entries(translationMap).forEach(([spanish, english]) => {
    enhancedText = enhancedText.replace(new RegExp(spanish, 'g'), english);
  });

  // Capitalizar primera letra
  enhancedText = enhancedText.charAt(0).toUpperCase() + enhancedText.slice(1);

  return {
    enhancedDescription: `Professional ${enhancedText} project with proper materials and installation procedures.`,
    bulletPoints: [
      '• Scope assessment and planning',
      '• Material procurement and preparation', 
      '• Professional installation procedures',
      '• Quality control and finishing'
    ],
    professionalSummary: `Professional project involving ${enhancedText.substring(0, 50)}...`
  };
}
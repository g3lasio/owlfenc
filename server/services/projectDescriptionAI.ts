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
You are Mervin AI, a professional construction project enhancement specialist. Transform the following project description into a comprehensive, detailed, and well-organized English description with visual elements.

Original text (may be in Spanish or English): "${originalText}"
Project type: ${projectType}

Create a detailed professional description with:

1. **Enhanced Description**: A comprehensive professional paragraph in English with technical details, materials, methodology, and quality standards

2. **Detailed Bullet Points**: Create 6-8 specific bullet points with relevant icons/emojis for visual appeal:
   - Use appropriate icons: 🔨 for demolition, 🏗️ for construction, 📏 for measurements, 🎨 for finishes, etc.
   - Include specific measurements, materials, and techniques
   - Add quality standards and professional methods
   - Include timeline estimates where appropriate

3. **Professional Summary**: A concise 2-3 sentence executive summary

Requirements:
- Translate to English if input is in Spanish
- Use professional construction/project management terminology
- Be highly detailed and specific
- Include material specifications, installation methods, and quality standards
- Add visual appeal with relevant icons/emojis
- Make it sound professional and comprehensive
- Include safety considerations and best practices

Format your response as a JSON object with these exact keys:
{
  "enhancedDescription": "Comprehensive professional description with technical details",
  "bulletPoints": ["🔨 Detailed point 1 with specifics", "🏗️ Detailed point 2 with materials", "📏 Detailed point 3 with measurements"],
  "professionalSummary": "Detailed 2-3 sentence executive summary"
}

Ensure the response is valid JSON and focuses on comprehensive construction/project work details with visual elements.
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
 * Función de respaldo mejorada para casos donde OpenAI no esté disponible
 */
export function createFallbackEnhancement(originalText: string): ProjectEnhancementResponse {
  // Traducciones básicas y mejoras sin IA
  const translationMap: Record<string, string> = {
    'remover': 'remove',
    'installar': 'install', 
    'instalar': 'install',
    'fence': 'fence',
    'cerca': 'fence',
    'existente': 'existing',
    'madera': 'wood',
    'altura': 'height',
    'nuevo': 'new',
    'longitud': 'length',
    'pintura': 'paint',
    'barnizada': 'stained',
    'barniz': 'stain',
    'ft': 'ft',
    'pies': 'feet',
    'metros': 'meters',
    'demoler': 'demolish',
    'construir': 'build',
    'agregar': 'add',
    'despues': 'then'
  };

  let enhancedText = originalText.toLowerCase();
  
  // Aplicar traducciones básicas
  Object.entries(translationMap).forEach(([spanish, english]) => {
    enhancedText = enhancedText.replace(new RegExp(spanish, 'gi'), english);
  });

  // Detectar tipo de proyecto básico
  const isFencing = /fence|cerca|wood|madera/i.test(originalText);
  const isDemolition = /remover|demoler|remove|demolish/i.test(originalText);
  const isPainting = /pintura|paint|barniz|stain/i.test(originalText);

  // Crear bullet points específicos con iconos
  let bulletPoints = [
    '🔍 Professional site assessment and measurement verification',
    '📋 Detailed project planning and permit coordination',
    '🚚 Material procurement and delivery scheduling'
  ];

  if (isDemolition) {
    bulletPoints.push('🔨 Safe demolition of existing structures following safety protocols');
  }

  if (isFencing) {
    bulletPoints = bulletPoints.concat([
      '📏 Precise measurement and marking of fence line boundaries',
      '🏗️ Professional installation using proper construction techniques',
      '🔧 Quality hardware and fastening systems installation'
    ]);
  }

  if (isPainting) {
    bulletPoints.push('🎨 Professional finish application with premium materials');
  }

  bulletPoints = bulletPoints.concat([
    '✅ Quality control inspection and final walkthrough',
    '📞 Client communication and project completion documentation'
  ]);

  // Capitalizar primera letra del texto mejorado
  enhancedText = enhancedText.charAt(0).toUpperCase() + enhancedText.slice(1);

  return {
    enhancedDescription: `This comprehensive project involves ${enhancedText} executed with professional construction standards, quality materials, and adherence to industry best practices. All work will be performed by qualified professionals using appropriate tools and safety measures to ensure optimal results and long-lasting durability.`,
    bulletPoints: bulletPoints.slice(0, 8), // Máximo 8 puntos
    professionalSummary: `Professional construction project featuring ${enhancedText.substring(0, 60)}. This project will be executed using industry-standard methods and quality materials to ensure exceptional results and client satisfaction.`
  };
}
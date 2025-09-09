/**
 * DEEPSEARCH REFINEMENT SERVICE
 * 
 * Servicio para procesar solicitudes de refinamiento de DeepSearch
 * mediante chat interactivo con IA conversacional.
 */

import Anthropic from '@anthropic-ai/sdk';

interface DeepSearchResult {
  projectType: string;
  projectScope: string;
  materials: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    supplier?: string;
    specifications?: string;
  }>;
  laborCosts: Array<{
    category: string;
    description: string;
    hours: number;
    rate: number;
    total: number;
  }>;
  totalMaterialsCost: number;
  totalLaborCost: number;
  grandTotal: number;
  confidence: number;
  location?: string;
}

interface RefinementRequest {
  userRequest: string;
  currentResult: DeepSearchResult;
  projectDescription: string;
  location?: string;
  conversationHistory?: string[];
}

interface RefinementResponse {
  success: boolean;
  response: string;
  updatedResult?: DeepSearchResult;
  suggestedActions?: string[];
  error?: string;
}

export class DeepSearchRefinementService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Procesa una solicitud de refinamiento del usuario
   */
  async processRefinementRequest(request: RefinementRequest): Promise<RefinementResponse> {
    console.log('🔍 [REFINEMENT] Procesando solicitud:', request.userRequest);

    try {
      // Analizar el tipo de solicitud
      const requestType = this.analyzeRequestType(request.userRequest);
      console.log('📊 [REFINEMENT] Tipo de solicitud detectado:', requestType);

      // Procesar según el tipo
      switch (requestType) {
        case 'total_adjustment':
          return await this.handleTotalAdjustment(request);
        case 'price_adjustment':
          return await this.handlePriceAdjustment(request);
        case 'quantity_change':
          return await this.handleQuantityChange(request);
        case 'material_addition':
          return await this.handleMaterialAddition(request);
        case 'material_removal':
          return await this.handleMaterialRemoval(request);
        case 'labor_adjustment':
          return await this.handleLaborAdjustment(request);
        case 'location_specific':
          return await this.handleLocationSpecificAdjustment(request);
        case 'alternative_materials':
          return await this.handleAlternativeMaterials(request);
        case 'precision_request':
          return await this.handlePrecisionRequest(request);
        default:
          return await this.handleGeneralRequest(request);
      }

    } catch (error) {
      console.error('❌ [REFINEMENT] Error procesando solicitud:', error);
      return {
        success: false,
        response: `❌ **Error procesando tu solicitud**\n\n${(error as Error).message}\n\nPor favor intenta reformular tu pregunta o contacta soporte.`,
        error: (error as Error).message
      };
    }
  }

  /**
   * Analiza el tipo de solicitud del usuario
   */
  private analyzeRequestType(userRequest: string): string {
    const request = userRequest.toLowerCase();

    // Patrones para diferentes tipos de solicitudes
    const patterns = {
      total_adjustment: /(?:total|cueste|valga|costo total|precio total|sea de|que sea|\$[\d,]+|[\d,]+\s*(?:dólares|dolares|pesos))/,
      price_adjustment: /(?:precio|cost|expensive|cheap|caro|barato|muy alto|muy bajo|expensive|affordable)/,
      quantity_change: /(?:cantidad|quantity|more|less|increase|decrease|cambiar|ajustar|agregar|quitar|más|menos)/,
      material_addition: /(?:falta|missing|add|agregar|include|incluir|necesito|need|forgot|olvidé)/,
      material_removal: /(?:remove|remover|delete|eliminar|don't need|no necesito|sobra|quitar)/,
      labor_adjustment: /(?:labor|mano de obra|trabajo|workers|trabajadores|hours|horas|rate|tarifa)/,
      location_specific: /(?:location|ubicación|area|zona|state|estado|city|ciudad|region|región|local)/,
      alternative_materials: /(?:alternative|alternativa|different|diferente|substitute|sustituto|replace|reemplazar)/,
      precision_request: /(?:precision|precisión|detail|detalle|specific|específico|exact|exacto|accurate|más detalle)/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(request)) {
        return type;
      }
    }

    return 'general';
  }

  /**
   * Maneja ajustes de total específico (ej: "que cueste $9,100")
   */
  private async handleTotalAdjustment(request: RefinementRequest): Promise<RefinementResponse> {
    // Extraer el monto objetivo del texto
    const amountMatch = request.userRequest.match(/\$?([\d,]+)(?:\s*(?:dólares|dolares|pesos))?/);
    
    if (!amountMatch) {
      return {
        success: true,
        response: `🤔 **No pude identificar el monto específico**\n\n¿Podrías especificar el total exacto que necesitas? Por ejemplo:\n• "Que cueste $9,100"\n• "El total debe ser $10,000"\n• "Necesito que valga 8,500 dólares"`,
        suggestedActions: [
          'Especificar monto exacto',
          'Ajustar total gradualmente',
          'Revisar precios actuales',
          'Mostrar desglose'
        ]
      };
    }

    const targetTotal = parseFloat(amountMatch[1].replace(/,/g, ''));
    const currentTotal = request.currentResult.grandTotal;
    const difference = targetTotal - currentTotal;
    const adjustmentFactor = targetTotal / currentTotal;

    // Crear resultado actualizado
    const updatedResult = { ...request.currentResult };

    // Ajustar proporcionalmente materiales y labor
    updatedResult.materials = updatedResult.materials.map(material => ({
      ...material,
      unitPrice: material.unitPrice * adjustmentFactor,
      totalPrice: material.totalPrice * adjustmentFactor
    }));

    updatedResult.laborCosts = updatedResult.laborCosts.map(labor => ({
      ...labor,
      rate: labor.rate * adjustmentFactor,
      total: labor.total * adjustmentFactor
    }));

    // Recalcular totales
    updatedResult.totalMaterialsCost = updatedResult.materials.reduce((sum, m) => sum + m.totalPrice, 0);
    updatedResult.totalLaborCost = updatedResult.laborCosts.reduce((sum, l) => sum + l.total, 0);
    updatedResult.grandTotal = updatedResult.totalMaterialsCost + updatedResult.totalLaborCost;

    const adjustmentPercent = ((adjustmentFactor - 1) * 100).toFixed(1);
    const directionText = adjustmentFactor > 1 ? 'incrementado' : 'reducido';

    const responseMessage = `✅ **¡Perfecto! He ajustado tu estimado a $${targetTotal.toLocaleString()}**

He ${directionText} todos los precios ${Math.abs(parseFloat(adjustmentPercent))}% para alcanzar tu objetivo:

**💰 Nuevo total:** $${updatedResult.grandTotal.toLocaleString()}
**📦 Materiales:** $${updatedResult.totalMaterialsCost.toLocaleString()}
**⚒️ Labor:** $${updatedResult.totalLaborCost.toLocaleString()}

Los ajustes están listos para aplicar. ¿Te parece bien?`;

    return {
      success: true,
      response: responseMessage,
      updatedResult: updatedResult,
      suggestedActions: [
        'Ajustar detalles',
        'Ver desglose',
        'Cambiar más cosas'
      ]
    };
  }

  /**
   * Maneja ajustes de precios
   */
  private async handlePriceAdjustment(request: RefinementRequest): Promise<RefinementResponse> {
    const prompt = `Eres un experto en estimados de construcción. El usuario quiere ajustar precios.

SOLICITUD: "${request.userRequest}"
UBICACIÓN: ${request.location || 'No especificada'}
PROYECTO: ${request.projectDescription}

ESTIMADO ACTUAL:
- Materiales (${request.currentResult.materials.length}): $${request.currentResult.totalMaterialsCost.toFixed(2)}
- Labor (${request.currentResult.laborCosts.length}): $${request.currentResult.totalLaborCost.toFixed(2)}
- TOTAL: $${request.currentResult.grandTotal.toFixed(2)}

INSTRUCCIONES:
1. Analiza si los precios son razonables para la ubicación
2. Identifica materiales/labor con precios fuera de rango
3. Sugiere ajustes específicos con justificación
4. Proporciona rangos de precios alternativos

Responde en formato conversacional amigable en español, explicando los ajustes y por qué son necesarios.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';

    // Aplicar ajustes automáticos si es posible
    const updatedResult = this.applyPriceAdjustments(request.currentResult, request.userRequest, request.location);

    return {
      success: true,
      response: aiResponse,
      updatedResult: updatedResult.hasChanges ? updatedResult.result : undefined,
      suggestedActions: [
        'Reducir precios de labor 10%',
        'Usar materiales económicos',
        'Verificar precios locales',
        'Mostrar rango de precios'
      ]
    };
  }

  /**
   * Maneja cambios de cantidad
   */
  private async handleQuantityChange(request: RefinementRequest): Promise<RefinementResponse> {
    // Extraer información de cantidad del texto
    const quantityMatch = request.userRequest.match(/(\d+(?:\.\d+)?)/);
    const materialMatch = request.userRequest.match(/(?:de |del |para )([\w\s]+?)(?:\s|$|,|\.|en|a|con)/i);
    
    let updatedResult = { ...request.currentResult };
    let hasChanges = false;
    let responseMessage = '';

    if (quantityMatch && materialMatch) {
      const newQuantity = parseFloat(quantityMatch[1]);
      const materialKeyword = materialMatch[1].toLowerCase().trim();
      
      // Buscar material que coincida
      const materialIndex = updatedResult.materials.findIndex(m => 
        m.name.toLowerCase().includes(materialKeyword) ||
        m.description.toLowerCase().includes(materialKeyword) ||
        m.category.toLowerCase().includes(materialKeyword)
      );

      if (materialIndex !== -1) {
        const material = updatedResult.materials[materialIndex];
        const oldQuantity = material.quantity;
        const oldTotal = material.totalPrice;
        
        // Actualizar cantidad
        updatedResult.materials[materialIndex] = {
          ...material,
          quantity: newQuantity,
          totalPrice: material.unitPrice * newQuantity
        };

        // Recalcular totales
        updatedResult.totalMaterialsCost = updatedResult.materials.reduce((sum, m) => sum + m.totalPrice, 0);
        updatedResult.grandTotal = updatedResult.totalMaterialsCost + updatedResult.totalLaborCost;
        
        hasChanges = true;
        
        responseMessage = `✅ **Cantidad actualizada exitosamente**

📦 **Material:** ${material.name}
🔢 **Cambio:** ${oldQuantity} ${material.unit} → **${newQuantity} ${material.unit}**
💰 **Costo:** $${oldTotal.toFixed(2)} → **$${(material.unitPrice * newQuantity).toFixed(2)}**

📊 **Nuevo total del proyecto:** $${updatedResult.grandTotal.toFixed(2)}

¿Necesitas ajustar alguna otra cantidad o material?`;
      } else {
        responseMessage = `🔍 **No encontré ese material específico**

Los materiales disponibles en tu estimado son:
${updatedResult.materials.slice(0, 5).map(m => `• ${m.name} (${m.quantity} ${m.unit})`).join('\n')}

¿Podrías ser más específico sobre cuál material quieres modificar?`;
      }
    } else {
      responseMessage = `🤔 **Necesito más información para cambiar cantidades**

Por favor especifica:
• **Qué material** quieres modificar
• **Nueva cantidad** deseada

Ejemplo: "Cambiar la cantidad de postes a 15" o "Necesito 200 pies lineales de cerca"`;
    }

    return {
      success: true,
      response: responseMessage,
      updatedResult: hasChanges ? updatedResult : undefined,
      suggestedActions: [
        'Aumentar cantidad 25%',
        'Reducir cantidad 25%',
        'Mostrar cantidades actuales',
        'Calcular para área específica'
      ]
    };
  }

  /**
   * Maneja adición de materiales
   */
  private async handleMaterialAddition(request: RefinementRequest): Promise<RefinementResponse> {
    const prompt = `Eres un experto en construcción. El usuario quiere agregar un material faltante.

SOLICITUD: "${request.userRequest}"
PROYECTO: ${request.projectDescription}
UBICACIÓN: ${request.location || 'General'}

MATERIALES ACTUALES:
${request.currentResult.materials.map(m => `• ${m.name} (${m.category})`).join('\n')}

INSTRUCCIONES:
1. Identifica qué material específico falta
2. Determina cantidad estimada necesaria
3. Calcula precio unitario realista
4. Explica por qué es necesario este material

Responde en español, siendo específico sobre el material a agregar y su justificación.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      success: true,
      response: aiResponse,
      suggestedActions: [
        'Agregar material específico',
        'Recalcular estimado completo',
        'Revisar lista de materiales',
        'Verificar completitud'
      ]
    };
  }

  /**
   * Maneja solicitudes generales con IA - MEJORADO para aplicar cambios automáticamente
   */
  private async handleGeneralRequest(request: RefinementRequest): Promise<RefinementResponse> {
    // Paso 1: Analizar si es una solicitud que requiere cambios específicos
    const changeAnalysis = this.analyzeChangeRequirement(request.userRequest, request.currentResult);
    
    let updatedResult = changeAnalysis.hasChanges ? changeAnalysis.updatedResult : undefined;
    
    // Paso 2: Generar respuesta conversacional con IA
    const prompt = `Eres Mervin AI, un asistente inteligente especializado en estimados de construcción. Tu personalidad es amigable, eficiente y directa. Ayudas a contratistas a refinar sus estimados de manera práctica.

PROYECTO ACTUAL:
- ${request.projectDescription}
- Ubicación: ${request.location || 'General'}  
- Total actual: $${request.currentResult.grandTotal.toFixed(2)}
- ${request.currentResult.materials.length} materiales, ${request.currentResult.laborCosts.length} categorías de labor

SOLICITUD DEL USUARIO: "${request.userRequest}"

${changeAnalysis.hasChanges ? `
CAMBIOS APLICADOS AUTOMÁTICAMENTE:
${changeAnalysis.appliedChanges.join('\n')}

Nuevo total: $${updatedResult?.grandTotal.toFixed(2)}
` : ''}

INSTRUCCIONES:
- Responde de manera conversacional y amigable en español
- ${changeAnalysis.hasChanges ? 'Explica los cambios que apliqué automáticamente' : 'Proporciona consejos prácticos'}
- Sé específico y ofrece sugerencias útiles
- Mantén un tono profesional pero cercano
- ${changeAnalysis.hasChanges ? 'Confirma que los cambios están listos para aplicar' : 'Si no puedo hacer cambios automáticos, explica qué necesito para ayudar mejor'}

Ayuda al contratista de manera práctica y eficiente.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      success: true,
      response: aiResponse,
      updatedResult: updatedResult,
      suggestedActions: changeAnalysis.hasChanges ? [
        'Ver desglose detallado',
        'Hacer más ajustes',
        'Finalizar estimado'
      ] : [
        'Especificar cambios deseados',
        'Ver opciones de materiales',
        'Ajustar precios globalmente'
      ]
    };
  }

  /**
   * Analiza si la solicitud requiere cambios automáticos y los aplica
   */
  private analyzeChangeRequirement(userRequest: string, currentResult: DeepSearchResult): {
    hasChanges: boolean;
    updatedResult?: DeepSearchResult;
    appliedChanges: string[];
  } {
    const request = userRequest.toLowerCase();
    let updatedResult = { ...currentResult };
    let hasChanges = false;
    const appliedChanges: string[] = [];

    // 1. Cambio de material específico (concreto -> pasto)
    if (request.includes('concreto') && (request.includes('pasto') || request.includes('césped') || request.includes('grass'))) {
      // Eliminar materiales relacionados con concreto
      const concreteKeywords = ['concrete', 'concreto', 'cement', 'cemento', 'rebar', 'varilla'];
      const beforeCount = updatedResult.materials.length;
      
      updatedResult.materials = updatedResult.materials.filter(material => 
        !concreteKeywords.some(keyword => 
          material.name.toLowerCase().includes(keyword) || 
          material.description.toLowerCase().includes(keyword)
        )
      );

      // Agregar materiales para pasto
      const grassMaterials = [
        {
          id: `grass_${Date.now()}_1`,
          name: 'Pasto Sintético Premium',
          description: 'Césped artificial de alta calidad resistente a UV',
          category: 'landscaping',
          quantity: Math.ceil((currentResult.materials.find(m => m.name.toLowerCase().includes('concrete'))?.quantity || 1) * 66), // conversión de yardas cúbicas a pies cuadrados
          unit: 'sq ft',
          unitPrice: 4.50,
          totalPrice: 0,
          specifications: 'Altura de fibra 40mm, respaldo drenante'
        },
        {
          id: `grass_${Date.now()}_2`,
          name: 'Preparación de Base para Pasto',
          description: 'Preparación y nivelación del terreno',
          category: 'preparation',
          quantity: Math.ceil((currentResult.materials.find(m => m.name.toLowerCase().includes('concrete'))?.quantity || 1) * 66),
          unit: 'sq ft',
          unitPrice: 1.25,
          totalPrice: 0
        },
        {
          id: `grass_${Date.now()}_3`,
          name: 'Arena de Compactación',
          description: 'Arena especializada para base de pasto sintético',
          category: 'base_materials',
          quantity: 3,
          unit: 'cubic yards',
          unitPrice: 35.00,
          totalPrice: 0
        }
      ];

      grassMaterials.forEach(material => {
        material.totalPrice = material.quantity * material.unitPrice;
        updatedResult.materials.push(material);
      });

      hasChanges = true;
      appliedChanges.push(`• Eliminé ${beforeCount - updatedResult.materials.length + grassMaterials.length} materiales de concreto`);
      appliedChanges.push(`• Agregué ${grassMaterials.length} materiales para instalación de pasto sintético`);
    }

    // 2. Ajustes de precio generales
    if (request.includes('barato') || request.includes('económico') || request.includes('reducir precio')) {
      const reductionFactor = 0.85; // 15% de reducción
      
      updatedResult.materials = updatedResult.materials.map(material => ({
        ...material,
        unitPrice: Math.round(material.unitPrice * reductionFactor * 100) / 100,
        totalPrice: Math.round(material.quantity * material.unitPrice * reductionFactor * 100) / 100
      }));

      updatedResult.laborCosts = updatedResult.laborCosts.map(labor => ({
        ...labor,
        rate: Math.round(labor.rate * reductionFactor * 100) / 100,
        total: Math.round(labor.hours * labor.rate * reductionFactor * 100) / 100
      }));

      hasChanges = true;
      appliedChanges.push('• Reduje todos los precios en un 15% para opción económica');
    }

    // 3. Aumentar/reducir cantidad general
    if (request.includes('aumentar') || request.includes('más cantidad')) {
      const increaseFactor = 1.25; // 25% más
      
      updatedResult.materials = updatedResult.materials.map(material => ({
        ...material,
        quantity: Math.round(material.quantity * increaseFactor * 100) / 100,
        totalPrice: Math.round(material.quantity * increaseFactor * material.unitPrice * 100) / 100
      }));

      hasChanges = true;
      appliedChanges.push('• Aumenté todas las cantidades en un 25%');
    }

    if (request.includes('reducir cantidad') || request.includes('menos cantidad')) {
      const decreaseFactor = 0.80; // 20% menos
      
      updatedResult.materials = updatedResult.materials.map(material => ({
        ...material,
        quantity: Math.round(material.quantity * decreaseFactor * 100) / 100,
        totalPrice: Math.round(material.quantity * decreaseFactor * material.unitPrice * 100) / 100
      }));

      hasChanges = true;
      appliedChanges.push('• Reduje todas las cantidades en un 20%');
    }

    // 4. Eliminar labor si se solicita
    if (request.includes('sin mano de obra') || request.includes('sin labor') || request.includes('only materials')) {
      updatedResult.laborCosts = [];
      hasChanges = true;
      appliedChanges.push('• Eliminé todos los costos de mano de obra');
    }

    // 5. Recalcular totales si hubo cambios
    if (hasChanges) {
      updatedResult.totalMaterialsCost = updatedResult.materials.reduce((sum, m) => sum + m.totalPrice, 0);
      updatedResult.totalLaborCost = updatedResult.laborCosts.reduce((sum, l) => sum + l.total, 0);
      updatedResult.grandTotal = updatedResult.totalMaterialsCost + updatedResult.totalLaborCost;
    }

    return {
      hasChanges,
      updatedResult: hasChanges ? updatedResult : undefined,
      appliedChanges
    };
  }

  /**
   * Aplica ajustes automáticos de precio
   */
  private applyPriceAdjustments(result: DeepSearchResult, userRequest: string, location?: string): { result: DeepSearchResult, hasChanges: boolean } {
    const updatedResult = { ...result };
    let hasChanges = false;

    // Detectar si el usuario quiere precios más bajos
    if (/(?:alto|expensive|caro|reduce|lower|barato|cheap)/i.test(userRequest)) {
      // Aplicar reducción del 10-15% en materiales y labor
      const reductionFactor = 0.85; // 15% de reducción

      updatedResult.materials = updatedResult.materials.map(material => ({
        ...material,
        unitPrice: material.unitPrice * reductionFactor,
        totalPrice: material.unitPrice * reductionFactor * material.quantity
      }));

      updatedResult.laborCosts = updatedResult.laborCosts.map(labor => ({
        ...labor,
        rate: labor.rate * reductionFactor,
        total: labor.hours * (labor.rate * reductionFactor)
      }));

      // Recalcular totales
      updatedResult.totalMaterialsCost = updatedResult.materials.reduce((sum, m) => sum + m.totalPrice, 0);
      updatedResult.totalLaborCost = updatedResult.laborCosts.reduce((sum, l) => sum + l.total, 0);
      updatedResult.grandTotal = updatedResult.totalMaterialsCost + updatedResult.totalLaborCost;

      hasChanges = true;
    }

    return { result: updatedResult, hasChanges };
  }

  /**
   * Maneja ajustes específicos de labor
   */
  private async handleLaborAdjustment(request: RefinementRequest): Promise<RefinementResponse> {
    // Implementación específica para ajustes de labor
    return await this.handleGeneralRequest(request);
  }

  /**
   * Maneja ajustes específicos por ubicación
   */
  private async handleLocationSpecificAdjustment(request: RefinementRequest): Promise<RefinementResponse> {
    // Implementación específica para ajustes por ubicación
    return await this.handleGeneralRequest(request);
  }

  /**
   * Maneja búsqueda de materiales alternativos
   */
  private async handleAlternativeMaterials(request: RefinementRequest): Promise<RefinementResponse> {
    // Implementación específica para materiales alternativos
    return await this.handleGeneralRequest(request);
  }

  /**
   * Maneja solicitudes de mayor precisión
   */
  private async handlePrecisionRequest(request: RefinementRequest): Promise<RefinementResponse> {
    // Implementación específica para solicitudes de precisión
    return await this.handleGeneralRequest(request);
  }

  /**
   * Maneja remoción de materiales
   */
  private async handleMaterialRemoval(request: RefinementRequest): Promise<RefinementResponse> {
    // Implementación específica para remoción de materiales
    return await this.handleGeneralRequest(request);
  }
}

export const deepSearchRefinementService = new DeepSearchRefinementService();
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

    const responseMessage = `✅ **Total ajustado exitosamente a $${targetTotal.toLocaleString()}**

📊 **Resumen del ajuste:**
• **Total anterior:** $${currentTotal.toLocaleString()}
• **Total nuevo:** $${updatedResult.grandTotal.toLocaleString()}
• **Diferencia:** ${difference >= 0 ? '+' : ''}$${difference.toLocaleString()}
• **Ajuste aplicado:** ${directionText} ${Math.abs(parseFloat(adjustmentPercent))}%

🔧 **Cambios realizados:**
• **Materiales:** $${updatedResult.totalMaterialsCost.toLocaleString()}
• **Labor:** $${updatedResult.totalLaborCost.toLocaleString()}

Los precios han sido ajustados proporcionalmente para alcanzar el total deseado. ¿Te parece bien este ajuste?`;

    return {
      success: true,
      response: responseMessage,
      updatedResult: updatedResult,
      suggestedActions: [
        'Ajustar solo materiales',
        'Ajustar solo labor',
        'Revisar desglose detallado',
        'Aplicar cambios'
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
   * Maneja solicitudes generales con IA
   */
  private async handleGeneralRequest(request: RefinementRequest): Promise<RefinementResponse> {
    const prompt = `Eres un asistente experto en estimados de construcción que ayuda a contratistas a refinar sus estimados.

CONTEXTO DEL PROYECTO:
- Descripción: ${request.projectDescription}
- Ubicación: ${request.location || 'No especificada'}
- Total actual: $${request.currentResult.grandTotal.toFixed(2)}
- Materiales: ${request.currentResult.materials.length} items
- Labor: ${request.currentResult.laborCosts.length} categorías

SOLICITUD DEL USUARIO: "${request.userRequest}"

CONVERSACIÓN PREVIA:
${request.conversationHistory?.slice(-3).join('\n') || 'Primera interacción'}

INSTRUCCIONES:
1. Analiza la solicitud específica del usuario
2. Proporciona consejos prácticos y actionables
3. Si es posible, sugiere ajustes específicos
4. Mantén un tono profesional pero amigable
5. Responde en español
6. Se específico y práctico

Responde de manera conversacional y útil, enfocándote en ayudar al contratista.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      success: true,
      response: aiResponse,
      suggestedActions: [
        'Revisar precios',
        'Agregar detalles',
        'Verificar cantidades',
        'Optimizar costos'
      ]
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
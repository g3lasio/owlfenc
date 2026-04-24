/**
 * TransformStepAdapter
 * 
 * Adapter para ejecutar transformaciones de datos en workflows.
 * Maneja operaciones como formateo, validación, cálculos, etc.
 * 
 * CHANGELOG:
 * - v2.1.0 (2026-04-24): Fixed tax calculation to apply ONLY to materials (not labor).
 *   California sales tax (and most US states) applies only to tangible goods, not services.
 *   Added flat rate / profit margin support with dual-view transparency.
 */

import { WorkflowStep, WorkflowStepAdapter } from '../types';

// Labor-related keywords used to classify items when no explicit type field is present.
// This is the fallback heuristic for items coming from older DeepSearch formats.
const LABOR_KEYWORDS = [
  'labor', 'labour', 'installation', 'install', 'service', 'work', 'crew',
  'hours', 'hrs', 'man-hour', 'man hour', 'workforce', 'technician',
  'electrician', 'plumber', 'painter', 'roofer', 'cleaner', 'landscaper',
  'demo', 'demolition', 'excavation', 'hauling', 'disposal', 'cleanup',
  'mano de obra', 'instalación', 'servicio', 'trabajo', 'cuadrilla'
];

/**
 * Determine if an item is a labor/service item (not taxable in most US states).
 * Priority: explicit type/category field → name/description keyword heuristic.
 */
function isLaborItem(item: any): boolean {
  // 1. Explicit type field (set by DeepSearch adapters)
  if (item.type) {
    const t = String(item.type).toLowerCase();
    if (t === 'labor' || t === 'labour' || t === 'service') return true;
    if (t === 'material' || t === 'materials' || t === 'product') return false;
  }

  // 2. Explicit category field
  if (item.category) {
    const c = String(item.category).toLowerCase();
    if (c.includes('labor') || c.includes('labour') || c.includes('service') || c.includes('work')) return true;
    if (c.includes('material') || c.includes('product') || c.includes('supply')) return false;
  }

  // 3. Heuristic: check name and description for labor keywords
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  return LABOR_KEYWORDS.some(kw => text.includes(kw));
}

export class TransformStepAdapter implements WorkflowStepAdapter {
  
  /**
   * Verificar si este adapter puede manejar el paso
   */
  canHandle(step: WorkflowStep): boolean {
    return step.type === 'transform';
  }
  
  /**
   * Ejecutar el paso
   */
  async execute(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    if (!step.transform) {
      throw new Error(`Step ${step.id} has no transform defined`);
    }
    
    const { input, output, operation } = step.transform;
    
    console.log(`🔄 [TRANSFORM-ADAPTER] Executing ${operation} on ${input}`);
    
    try {
      // Obtener valor de entrada
      const inputValue = context[input];
      
      // Ejecutar transformación
      const result = await this.executeTransform(operation, inputValue, context);
      
      console.log(`✅ [TRANSFORM-ADAPTER] ${operation} completed`);
      
      return result;
      
    } catch (error: any) {
      console.error(`❌ [TRANSFORM-ADAPTER] ${operation} failed:`, error.message);
      throw error;
    }
  }
  
  /**
   * Ejecutar transformación específica
   */
  private async executeTransform(
    operation: string,
    inputValue: any,
    context: Record<string, any>
  ): Promise<any> {
    switch (operation) {
      case 'validate_address':
        return this.validateAddress(inputValue);
        
      case 'format_property_info':
        return this.formatPropertyInfo(inputValue);
        
      case 'deepsearch_to_items':
        return this.deepSearchToItems(inputValue);
        
      case 'calculate_estimate_totals':
        return this.calculateEstimateTotals(inputValue, context);
        
      case 'identity':
        return inputValue;
        
      case 'skip_message':
        return { skipped: true, reason: 'Insufficient information' };
      
      case 'extract_permit_request':
        return this.extractPermitRequest(inputValue, context);
      
      case 'format_permit_response':
        return this.formatPermitResponse(inputValue, context);
        
      default:
        throw new Error(`Unknown transform operation: ${operation}`);
    }
  }
  
  /**
   * Validar dirección
   */
  private validateAddress(address: string): string {
    if (!address || address.trim().length === 0) {
      throw new Error('Address is required');
    }
    return address.trim();
  }
  
  /**
   * Formatear información de propiedad
   */
  private formatPropertyInfo(propertyData: any): any {
    if (!propertyData) {
      throw new Error('Property data is empty');
    }
    
    const property = propertyData.property || propertyData;
    
    return {
      address: property.address || 'Unknown',
      owner: property.owner || 'Unknown',
      sqft: property.sqft || property.building?.size?.livingSize || 'N/A',
      bedrooms: property.bedrooms || property.building?.rooms?.beds || 'N/A',
      bathrooms: property.bathrooms || property.building?.rooms?.bathsTotal || 'N/A',
      yearBuilt: property.yearBuilt || property.summary?.yearBuilt || 'N/A',
      propertyType: property.propertyType || property.summary?.propertyType || 'N/A',
      assessedValue: property.assessedValue || property.assessment?.assessed?.assdTtlValue || 'N/A',
      lotSize: property.lotSize || property.lot?.lotSize2 || 'N/A',
      parcelNumber: property.parcelNumber || property.identifier?.apn || 'N/A',
      ownerOccupied: property.ownerOccupied || property.owner?.ownerOccupied || false,
      source: propertyData.source || 'ATTOM',
      raw: property
    };
  }
  
  /**
   * Convertir resultados de DeepSearch a items de estimado
   */
  private deepSearchToItems(deepSearchResult: any): any[] {
    if (!deepSearchResult) {
      return [];
    }
    
    const items: any[] = [];
    
    // Procesar materiales
    if (deepSearchResult.materials && Array.isArray(deepSearchResult.materials)) {
      for (const material of deepSearchResult.materials) {
        items.push({
          type: 'material',
          name: material.name || material.item,
          quantity: material.quantity || 1,
          unit: material.unit || 'unit',
          unitCost: material.unitCost || material.cost || 0,
          totalCost: (material.quantity || 1) * (material.unitCost || material.cost || 0),
          category: material.category || 'Materials'
        });
      }
    }
    
    // Procesar mano de obra
    if (deepSearchResult.items && Array.isArray(deepSearchResult.items)) {
      for (const item of deepSearchResult.items) {
        items.push({
          type: 'labor',
          name: item.description || item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'hours',
          unitCost: item.unitCost || item.rate || 0,
          totalCost: (item.quantity || 1) * (item.unitCost || item.rate || 0),
          category: item.category || 'Labor'
        });
      }
    }
    
    // Si DeepSearch devolvió un formato combinado
    if (deepSearchResult.combinedItems && Array.isArray(deepSearchResult.combinedItems)) {
      return deepSearchResult.combinedItems;
    }
    
    return items;
  }
  
  /**
   * Calcular totales del estimado con tax correcto (solo materiales) y soporte de Flat Rate / Profit Margin.
   * 
   * CORRECCIÓN CRÍTICA: En California y la mayoría de estados de EE.UU., el sales tax
   * aplica SOLO a materiales (bienes tangibles), NO a mano de obra (servicios).
   * Ref: California Revenue and Taxation Code §6006, §6010.
   * 
   * FLAT RATE / PROFIT MARGIN:
   * Si el contexto contiene `targetPrice` (precio acordado con el cliente) o
   * `profitMarginPercent` (margen de ganancia deseado), se calculan dos vistas:
   *   - contractorView: costo base + margen de ganancia + tax = precio final al cliente
   *   - clientView: solo el precio final (sin revelar el margen)
   * 
   * @param items - Array de ítems del estimado
   * @param context - Contexto del workflow (puede contener taxRate, targetPrice, profitMarginPercent)
   */
  private calculateEstimateTotals(items: any[], context: Record<string, any>): any {
    if (!items || items.length === 0) {
      return {
        subtotal: 0,
        materialsSubtotal: 0,
        laborSubtotal: 0,
        tax: 0,
        total: 0,
        taxRate: 0,
        taxAppliedTo: 'materials_only',
        profitMargin: null,
        contractorView: null,
      };
    }
    
    // ─── 1. Separate materials from labor ────────────────────────────────────
    let materialsSubtotal = 0;
    let laborSubtotal = 0;
    
    for (const item of items) {
      const cost = item.totalCost || 0;
      if (isLaborItem(item)) {
        laborSubtotal += cost;
      } else {
        materialsSubtotal += cost;
      }
    }
    
    const subtotal = materialsSubtotal + laborSubtotal;
    
    // ─── 2. Tax calculation (NATIONWIDE — no CA default) ──────────────────────
    // taxRate: always provided by caller. Can be decimal (0.0875) or percent (8.75).
    // Normalize: if value > 1, treat as percentage and convert to decimal.
    const rawTaxRate = typeof context.taxRate === 'number' ? context.taxRate : 0;
    const taxRate = rawTaxRate > 1 ? rawTaxRate / 100 : rawTaxRate;
    
    // taxOnMaterialsOnly: true = apply tax only to materials (most US states for labor).
    // false = apply tax to full subtotal (some states/jurisdictions).
    // Default: true (conservative, legally safer for most US states).
    const taxOnMaterialsOnly: boolean = context.taxOnMaterialsOnly !== false;
    
    const tax = taxOnMaterialsOnly ? (materialsSubtotal * taxRate) : (subtotal * taxRate);
    const baseTotal = subtotal + tax;
    
    // ─── 3. Flat Rate / Profit Margin ─────────────────────────────────────────
    let profitMarginData: any = null;
    let finalTotal = baseTotal;
    
    const targetPrice: number | undefined = context.targetPrice;
    const profitMarginPercent: number | undefined = context.profitMarginPercent;
    
    if (targetPrice && targetPrice > 0) {
      // Contractor set a specific agreed price with the client.
      // Calculate what the actual profit/margin is.
      const profitAmount = targetPrice - baseTotal;
      const profitPercent = baseTotal > 0 ? (profitAmount / baseTotal) * 100 : 0;
      
      profitMarginData = {
        mode: 'flat_rate',
        targetPrice: Math.round(targetPrice * 100) / 100,
        baseCost: Math.round(baseTotal * 100) / 100,
        profitAmount: Math.round(profitAmount * 100) / 100,
        profitPercent: Math.round(profitPercent * 10) / 10,
        // Scaling factor applied to each item for the client-facing PDF
        scalingFactor: baseTotal > 0 ? targetPrice / baseTotal : 1,
      };
      finalTotal = targetPrice;
      
    } else if (profitMarginPercent && profitMarginPercent > 0) {
      // Contractor wants a specific profit margin percentage.
      // Calculate the price to charge the client.
      const profitAmount = baseTotal * (profitMarginPercent / 100);
      const priceToClient = baseTotal + profitAmount;
      
      profitMarginData = {
        mode: 'margin',
        profitPercent: profitMarginPercent,
        profitAmount: Math.round(profitAmount * 100) / 100,
        baseCost: Math.round(baseTotal * 100) / 100,
        priceToClient: Math.round(priceToClient * 100) / 100,
        scalingFactor: 1 + (profitMarginPercent / 100),
      };
      finalTotal = priceToClient;
    }
    
    // ─── 4. Build contractor-facing breakdown ─────────────────────────────────
    const contractorView = profitMarginData ? {
      baseMaterialsCost: Math.round(materialsSubtotal * 100) / 100,
      baseLaborCost: Math.round(laborSubtotal * 100) / 100,
      baseSubtotal: Math.round(subtotal * 100) / 100,
      taxOnMaterials: Math.round(tax * 100) / 100,
      baseTotalWithTax: Math.round(baseTotal * 100) / 100,
      profitAmount: Math.round(profitMarginData.profitAmount * 100) / 100,
      profitPercent: profitMarginData.profitPercent,
      finalPriceToClient: Math.round(finalTotal * 100) / 100,
    } : null;
    
    // ─── 5. Return ─────────────────────────────────────────────────────────────
    console.log(`💰 [TRANSFORM-ADAPTER] Tax calculation:`, {
      materialsSubtotal: Math.round(materialsSubtotal * 100) / 100,
      laborSubtotal: Math.round(laborSubtotal * 100) / 100,
      taxRate: `${(taxRate * 100).toFixed(2)}%`,
      taxOnMaterials: Math.round(tax * 100) / 100,
      baseTotal: Math.round(baseTotal * 100) / 100,
      profitMode: profitMarginData?.mode || 'none',
      finalTotal: Math.round(finalTotal * 100) / 100,
    });
    
    return {
      // Core totals (used by PDF engine and frontend)
      subtotal: Math.round(subtotal * 100) / 100,
      materialsSubtotal: Math.round(materialsSubtotal * 100) / 100,
      laborSubtotal: Math.round(laborSubtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      taxRate: taxRate,
      taxAppliedTo: 'materials_only',
      total: Math.round(finalTotal * 100) / 100,
      // Profit margin data (only present when flat rate or margin mode is active)
      profitMargin: profitMarginData,
      // Contractor-only view (never sent to client PDF)
      contractorView: contractorView,
    };
  }

  /**
   * Extraer información de solicitud de permisos del mensaje del usuario
   * Usa Claude AI para identificar: address, projectType, description
   */
  private async extractPermitRequest(userMessage: string, context: Record<string, any>): Promise<any> {
    console.log('🔍 [TRANSFORM-ADAPTER] Extrayendo información de solicitud de permisos...');
    
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        temperature: 0.1,
        system: `You are an expert at extracting project information from user messages.

Extract the following information from the user's message:
1. address: The property address (full street address with city, state, zip if available)
2. projectType: Type of construction project (fence, renovation, addition, electrical, plumbing, roofing, hvac, deck, pool, solar, demolition, etc.)
3. description: Brief description of the project (optional)

RESPOND IN JSON FORMAT ONLY:
{
  "address": "extracted address or null",
  "projectType": "extracted project type or null",
  "description": "extracted description or null",
  "hasRequiredInfo": true/false
}

Set hasRequiredInfo to true ONLY if you found both address AND projectType.
If you're not certain about a field, set it to null.`,
        messages: [{
          role: "user",
          content: `Extract project information from this message: "${userMessage}"`
        }]
      });
      
      const textContent = response.content.find((c) => c.type === 'text') as { type: 'text'; text: string } | undefined;
      let rawText = textContent?.text || '{}';
      
      if (rawText.includes('```json')) {
        rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (rawText.includes('```')) {
        rawText = rawText.replace(/```\s*/g, '');
      }
      
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawText = jsonMatch[0];
      }
      
      const extracted = JSON.parse(rawText);
      
      console.log('✅ [TRANSFORM-ADAPTER] Información extraída:', extracted);
      
      return {
        address: extracted.address || null,
        projectType: extracted.projectType || null,
        description: extracted.description || null,
        hasRequiredInfo: !!extracted.address && !!extracted.projectType
      };
      
    } catch (error: any) {
      console.error('❌ [TRANSFORM-ADAPTER] Error extrayendo información:', error.message);
      return {
        address: null,
        projectType: null,
        description: null,
        hasRequiredInfo: false
      };
    }
  }
  
  /**
   * Formatear respuesta de análisis de permisos para el usuario
   */
  private formatPermitResponse(permitData: any, context: Record<string, any>): string {
    console.log('📝 [TRANSFORM-ADAPTER] Formateando respuesta de permisos...');
    
    try {
      const pdfUrl = context.generate_pdf?.url || context.pdfUrl;
      const address = context.projectInfo?.address || permitData.meta?.location || 'la propiedad';
      const projectType = context.projectInfo?.projectType || permitData.meta?.projectType || 'proyecto';
      
      let response = `¡Órale jefe! Ya investigué los permisos para tu proyecto de ${projectType} en ${address}.\n\n`;
      
      if (permitData.requiredPermits && permitData.requiredPermits.length > 0) {
        response += `📋 **PERMISOS REQUERIDOS:**\n`;
        for (const permit of permitData.requiredPermits.slice(0, 3)) {
          response += `\n**${permit.name}** - ${permit.issuingAuthority}\n`;
          if (permit.estimatedTimeline) response += `   • Timeline: ${permit.estimatedTimeline}\n`;
          if (permit.averageCost) response += `   • Costo estimado: ${permit.averageCost}\n`;
          if (permit.description) response += `   • ${permit.description}\n`;
        }
        response += '\n';
      }
      
      if (permitData.buildingCodes && permitData.buildingCodes.length > 0) {
        response += `🏗️ **CÓDIGOS APLICABLES:**\n`;
        for (const code of permitData.buildingCodes.slice(0, 3)) {
          response += `   • ${code.title || code.code}\n`;
        }
        response += '\n';
      }
      
      if (permitData.contactInfo || permitData.contact) {
        const contact = permitData.contactInfo || permitData.contact;
        response += `📞 **CONTACTO:**\n`;
        response += `${contact.department || 'Building Department'}\n`;
        if (contact.phone) response += `${contact.phone}\n`;
        if (contact.website) response += `${contact.website}\n`;
        response += '\n';
      }
      
      if (pdfUrl) {
        response += `📄 **REPORTE COMPLETO:**\n`;
        response += `He generado un reporte detallado en PDF con todos los permisos, códigos, proceso de aplicación y contactos.\n\n`;
        response += `[Descargar Reporte PDF](${pdfUrl})\n\n`;
      }
      
      response += `¿Necesitas ayuda con algo más, compadre?`;
      
      console.log('✅ [TRANSFORM-ADAPTER] Respuesta formateada');
      return response;
      
    } catch (error: any) {
      console.error('❌ [TRANSFORM-ADAPTER] Error formateando respuesta:', error.message);
      return 'Lo siento compadre, hubo un error formateando la respuesta de permisos.';
    }
  }
}

/**
 * TransformStepAdapter
 * 
 * Adapter para ejecutar transformaciones de datos en workflows.
 * Maneja operaciones como formateo, validación, cálculos, etc.
 */

import { WorkflowStep, WorkflowStepAdapter } from '../types';

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
        return this.calculateEstimateTotals(inputValue);
        
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
    
    // Normalizar dirección
    return address.trim();
  }
  
  /**
   * Formatear información de propiedad
   */
  private formatPropertyInfo(propertyData: any): any {
    if (!propertyData) {
      throw new Error('Property data is empty');
    }
    
    // El endpoint /api/property/details retorna { property: {...}, source: "ATTOM" }
    // Extraer el objeto property si existe
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
   * Calcular totales del estimado
   */
  private calculateEstimateTotals(items: any[]): any {
    if (!items || items.length === 0) {
      return {
        subtotal: 0,
        tax: 0,
        total: 0
      };
    }
    
    // Calcular subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.totalCost || 0);
    }, 0);
    
    // Calcular impuesto (asumiendo 8.5%)
    const taxRate = 0.085;
    const tax = subtotal * taxRate;
    
    // Total
    const total = subtotal + tax;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      taxRate: taxRate
    };
  }

  /**
   * Extraer información de solicitud de permisos del mensaje del usuario
   * Usa Claude AI para identificar: address, projectType, description
   */
  private async extractPermitRequest(userMessage: string, context: Record<string, any>): Promise<any> {
    console.log('🔍 [TRANSFORM-ADAPTER] Extrayendo información de solicitud de permisos...');
    
    try {
      // Importar Anthropic
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
      
      // Remove markdown code blocks
      if (rawText.includes('```json')) {
        rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (rawText.includes('```')) {
        rawText = rawText.replace(/```\s*/g, '');
      }
      
      // Try to extract JSON object
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
      
      // Fallback: retornar sin información
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
      
      // Construir respuesta
      let response = `¡Órale jefe! Ya investigué los permisos para tu proyecto de ${projectType} en ${address}.\n\n`;
      
      // Permisos requeridos
      if (permitData.requiredPermits && permitData.requiredPermits.length > 0) {
        response += `📋 **PERMISOS REQUERIDOS:**\n`;
        for (const permit of permitData.requiredPermits.slice(0, 3)) {
          response += `\n**${permit.name}** - ${permit.issuingAuthority}\n`;
          if (permit.estimatedTimeline) {
            response += `   • Timeline: ${permit.estimatedTimeline}\n`;
          }
          if (permit.averageCost) {
            response += `   • Costo estimado: ${permit.averageCost}\n`;
          }
          if (permit.description) {
            response += `   • ${permit.description}\n`;
          }
        }
        response += '\n';
      }
      
      // Códigos de construcción
      if (permitData.buildingCodes && permitData.buildingCodes.length > 0) {
        response += `🏗️ **CÓDIGOS APLICABLES:**\n`;
        for (const code of permitData.buildingCodes.slice(0, 3)) {
          response += `   • ${code.title || code.code}\n`;
        }
        response += '\n';
      }
      
      // Información de contacto
      if (permitData.contactInfo || permitData.contact) {
        const contact = permitData.contactInfo || permitData.contact;
        response += `📞 **CONTACTO:**\n`;
        response += `${contact.department || 'Building Department'}\n`;
        if (contact.phone) {
          response += `${contact.phone}\n`;
        }
        if (contact.website) {
          response += `${contact.website}\n`;
        }
        response += '\n';
      }
      
      // Link al PDF
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

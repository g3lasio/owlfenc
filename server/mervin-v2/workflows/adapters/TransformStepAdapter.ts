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
}

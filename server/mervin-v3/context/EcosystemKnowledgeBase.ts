/**
 * EcosystemKnowledgeBase - Sistema de Conocimiento del Ecosistema de Owl Fenc
 * 
 * Proporciona a Mervin conocimiento profundo sobre:
 * - Templates de documentos legales disponibles
 * - Cuándo usar cada template
 * - Búsqueda inteligente de entidades (clientes, estimados, contratos)
 * - Contexto del usuario y su historial
 * 
 * Este es el cerebro que permite a Mervin ser un agente tipo Jarvis.
 */

import { templateRegistry } from '../../templates/registry';
import { featureFlags } from '../../config/featureFlags';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: 'contract' | 'document' | 'protection';
  signatureType: 'none' | 'single' | 'dual';
  
  // Guía para el agente
  whenToUse: string;
  requiredFields: string[];
  optionalFields: string[];
  examples: string[];
  
  // Metadata adicional
  isActive: boolean;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface Entity {
  id: string;
  type: 'client' | 'estimate' | 'contract' | 'permit' | 'property';
  name: string;
  data: Record<string, any>;
  lastUpdated: Date;
  relevanceScore?: number;
}

export interface SearchResult {
  entities: Entity[];
  totalCount: number;
  query: string;
  executionTimeMs: number;
}

export class EcosystemKnowledgeBase {
  
  /**
   * Obtener todos los templates disponibles con metadata enriquecida
   */
  async getAvailableTemplates(params?: {
    category?: 'contract' | 'document' | 'protection';
    includeInactive?: boolean;
  }): Promise<TemplateInfo[]> {
    try {
      console.log('📚 [ECOSYSTEM] Getting available templates...');
      
      // Obtener todos los templates del registry
      const allTemplates = Array.from(templateRegistry.getAll().values());
      
      // Filtrar por categoría si se especifica
      let filtered = allTemplates;
      if (params?.category) {
        filtered = filtered.filter(t => t.category === params.category);
      }
      
      // Filtrar por feature flags (activos/inactivos)
      if (!params?.includeInactive) {
        filtered = filtered.filter(t => {
          // Por ahora asumimos que todos están activos
          // En el futuro se puede integrar con featureFlags
          return true;
        });
      }
      
      // Enriquecer con información contextual
      const enrichedTemplates: TemplateInfo[] = filtered.map(t => ({
        id: t.id,
        name: t.displayName,
        description: t.description,
        category: t.category,
        signatureType: t.signatureType,
        
        // Guía contextual
        whenToUse: this.getTemplateGuidance(t.id),
        requiredFields: this.getRequiredFields(t.id),
        optionalFields: this.getOptionalFields(t.id),
        examples: this.getTemplateExamples(t.id),
        
        // Metadata
        isActive: true,
        complexity: this.getTemplateComplexity(t.id)
      }));
      
      console.log(`✅ [ECOSYSTEM] Found ${enrichedTemplates.length} templates`);
      
      return enrichedTemplates;
      
    } catch (error) {
      console.error('❌ [ECOSYSTEM] Error getting templates:', error);
      throw new Error(`Failed to get templates: ${error.message}`);
    }
  }
  
  /**
   * Guía contextual de cuándo usar cada template
   */
  private getTemplateGuidance(templateId: string): string {
    const guidance: Record<string, string> = {
      'independent-contractor': 'Usar para proyectos nuevos desde estimados aprobados. Ideal para trabajos de construcción estándar donde estableces términos completos del proyecto.',
      
      'change-order': 'Usar cuando el cliente solicita cambios al proyecto original (agregar trabajo, cambiar materiales, modificar scope). REQUIERE referencia al contrato base existente.',
      
      'contract-addendum': 'Usar para agregar cláusulas o términos adicionales sin cambiar el scope del trabajo. Por ejemplo: agregar términos de pago, cláusulas de garantía, o condiciones especiales.',
      
      'work-order': 'Usar para tareas específicas dentro de un proyecto mayor. Más simple que un contrato completo. Ideal para trabajos rápidos o subcontratistas.',
      
      'lien-waiver': 'Usar cuando el cliente paga (parcial o total) y quieres renunciar a derechos de gravamen sobre la propiedad. Protege al cliente y documenta el pago recibido.',
      
      'certificate-completion': 'Usar al finalizar un proyecto para certificar oficialmente que el trabajo está completo y cumple con los términos acordados.',
      
      'warranty-agreement': 'Usar para definir garantías post-proyecto sobre materiales y mano de obra. Protege a ambas partes estableciendo términos claros de garantía.'
    };
    
    return guidance[templateId] || 'Template disponible para uso general en proyectos de construcción.';
  }
  
  /**
   * Campos requeridos para cada template
   */
  private getRequiredFields(templateId: string): string[] {
    const required: Record<string, string[]> = {
      'independent-contractor': [
        'contractorName', 'contractorCompany', 'contractorEmail',
        'clientName', 'clientEmail', 'clientAddress',
        'projectDescription', 'totalAmount', 'startDate', 'completionDate'
      ],
      'change-order': [
        'originalContractId', 'changeDescription', 'additionalAmount',
        'contractorName', 'clientName'
      ],
      'lien-waiver': [
        'contractorName', 'clientName', 'propertyAddress',
        'paymentAmount', 'paymentDate'
      ],
      'certificate-completion': [
        'contractorName', 'clientName', 'projectDescription',
        'completionDate', 'propertyAddress'
      ]
    };
    
    return required[templateId] || [
      'contractorName', 'clientName', 'projectDescription'
    ];
  }
  
  /**
   * Campos opcionales para cada template
   */
  private getOptionalFields(templateId: string): string[] {
    const optional: Record<string, string[]> = {
      'independent-contractor': [
        'contractorPhone', 'contractorAddress', 'contractorLicense',
        'clientPhone', 'paymentSchedule', 'warrantyTerms'
      ],
      'change-order': [
        'reasonForChange', 'approvedBy', 'approvalDate'
      ],
      'lien-waiver': [
        'projectDescription', 'originalContractAmount'
      ]
    };
    
    return optional[templateId] || ['contractorPhone', 'clientPhone'];
  }
  
  /**
   * Ejemplos de cuándo usar cada template
   */
  private getTemplateExamples(templateId: string): string[] {
    const examples: Record<string, string[]> = {
      'independent-contractor': [
        'Cliente aprobó estimado de $15,000 para instalación de cerca de madera',
        'Nuevo proyecto de remodelación de cocina por $25,000',
        'Instalación de deck en patio trasero - $8,500',
        'Proyecto de pintura exterior completa - $12,000'
      ],
      
      'change-order': [
        'Cliente quiere agregar 20 pies más de cerca (+$2,000)',
        'Cambio de material de madera a vinilo (+$3,500)',
        'Agregar puerta adicional al proyecto (+$800)',
        'Extender el deck 5 pies más (+$1,500)'
      ],
      
      'contract-addendum': [
        'Agregar cláusula de garantía extendida',
        'Modificar términos de pago a 3 cuotas',
        'Agregar condiciones especiales de acceso a la propiedad',
        'Incluir cláusula de mantenimiento post-instalación'
      ],
      
      'work-order': [
        'Reparación rápida de sección de cerca dañada - $500',
        'Instalación de puerta de acceso - $350',
        'Pintura de retoque en áreas específicas - $200',
        'Reemplazo de postes dañados - $600'
      ],
      
      'lien-waiver': [
        'Cliente pagó el 50% inicial ($7,500) del proyecto',
        'Pago final recibido - liberar gravamen completo',
        'Pago de milestone completado - $5,000',
        'Cliente pagó por materiales - $3,200'
      ],
      
      'certificate-completion': [
        'Proyecto de cerca completado según contrato',
        'Instalación de deck finalizada y aprobada',
        'Remodelación terminada - cliente satisfecho',
        'Trabajo de pintura completado exitosamente'
      ],
      
      'warranty-agreement': [
        'Garantía de 2 años en materiales y mano de obra',
        'Garantía extendida de 5 años en estructura',
        'Garantía de 1 año en pintura y acabados',
        'Garantía de 3 años en instalación eléctrica'
      ]
    };
    
    return examples[templateId] || [
      'Proyecto estándar de construcción',
      'Trabajo de remodelación',
      'Instalación o reparación'
    ];
  }
  
  /**
   * Complejidad del template
   */
  private getTemplateComplexity(templateId: string): 'simple' | 'medium' | 'complex' {
    const complexity: Record<string, 'simple' | 'medium' | 'complex'> = {
      'work-order': 'simple',
      'lien-waiver': 'simple',
      'certificate-completion': 'simple',
      'contract-addendum': 'medium',
      'change-order': 'medium',
      'warranty-agreement': 'medium',
      'independent-contractor': 'complex'
    };
    
    return complexity[templateId] || 'medium';
  }
  
  /**
   * Buscar entidades (clientes, estimados, contratos) de manera inteligente
   */
  async searchEntities(params: {
    entityType: 'client' | 'estimate' | 'contract' | 'permit' | 'property';
    query: string;
    userId: string;
    limit?: number;
  }): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [ECOSYSTEM] Searching ${params.entityType}s with query: "${params.query}"`);
      
      // Importar EntityContextService dinámicamente
      const { EntityContextService } = await import('../../services/EntityContextService');
      const entityContext = new EntityContextService();
      
      // Buscar usando el servicio existente
      const results = await entityContext.searchEntities({
        entity_type: params.entityType,
        query: params.query,
        user_id: params.userId,
        limit: params.limit || 10
      });
      
      // Transformar resultados a formato Entity
      const entities: Entity[] = results.map(r => ({
        id: r.id,
        type: params.entityType,
        name: this.extractEntityName(r, params.entityType),
        data: r,
        lastUpdated: r.updatedAt || r.createdAt || new Date(),
        relevanceScore: r.relevance_score
      }));
      
      const executionTimeMs = Date.now() - startTime;
      
      console.log(`✅ [ECOSYSTEM] Found ${entities.length} ${params.entityType}(s) in ${executionTimeMs}ms`);
      
      return {
        entities,
        totalCount: entities.length,
        query: params.query,
        executionTimeMs
      };
      
    } catch (error) {
      console.error(`❌ [ECOSYSTEM] Error searching ${params.entityType}s:`, error);
      
      // Retornar resultado vacío en caso de error
      return {
        entities: [],
        totalCount: 0,
        query: params.query,
        executionTimeMs: Date.now() - startTime
      };
    }
  }
  
  /**
   * Extraer nombre de la entidad según su tipo
   */
  private extractEntityName(entity: any, type: string): string {
    switch (type) {
      case 'client':
        return entity.name || entity.clientName || 'Unknown Client';
      case 'estimate':
        return entity.estimateNumber || `Estimate #${entity.id}`;
      case 'contract':
        return entity.contractId || `Contract #${entity.id}`;
      case 'permit':
        return entity.permitNumber || entity.address || 'Permit';
      case 'property':
        return entity.address || 'Property';
      default:
        return entity.name || entity.id || 'Unknown';
    }
  }
  
  /**
   * Obtener detalles completos de una entidad específica
   */
  async getEntityDetails(params: {
    entityType: 'client' | 'estimate' | 'contract' | 'permit' | 'property';
    entityId: string;
    userId: string;
  }): Promise<Entity | null> {
    try {
      console.log(`📄 [ECOSYSTEM] Getting details for ${params.entityType} ${params.entityId}`);
      
      const { EntityContextService } = await import('../../services/EntityContextService');
      const entityContext = new EntityContextService();
      
      const result = await entityContext.getEntity({
        entity_type: params.entityType,
        id: params.entityId,
        user_id: params.userId
      });
      
      if (!result) {
        console.log(`⚠️  [ECOSYSTEM] Entity not found: ${params.entityType} ${params.entityId}`);
        return null;
      }
      
      const entity: Entity = {
        id: result.id,
        type: params.entityType,
        name: this.extractEntityName(result, params.entityType),
        data: result,
        lastUpdated: result.updatedAt || result.createdAt || new Date()
      };
      
      console.log(`✅ [ECOSYSTEM] Retrieved ${params.entityType} details`);
      
      return entity;
      
    } catch (error) {
      console.error(`❌ [ECOSYSTEM] Error getting ${params.entityType} details:`, error);
      return null;
    }
  }
  
  /**
   * Recomendar template basado en contexto e intención del usuario
   */
  async recommendTemplate(context: {
    userInput: string;
    clientHistory?: any;
    existingContracts?: any[];
    projectType?: string;
  }): Promise<{
    templateId: string;
    confidence: number;
    reason: string;
    alternatives: string[];
  }> {
    const input = context.userInput.toLowerCase();
    
    // Análisis de palabras clave
    const keywords = {
      change: ['cambio', 'modificar', 'agregar', 'change', 'modify', 'add more'],
      payment: ['pago', 'pagó', 'payment', 'paid', 'recibí'],
      complete: ['terminé', 'completé', 'finished', 'completed', 'done'],
      warranty: ['garantía', 'warranty', 'garantizar'],
      addendum: ['agregar términos', 'cláusula', 'addendum', 'add terms'],
      quick: ['rápido', 'quick', 'simple', 'pequeño']
    };
    
    // Detectar Change Order
    if (keywords.change.some(k => input.includes(k)) && context.existingContracts?.length > 0) {
      return {
        templateId: 'change-order',
        confidence: 0.90,
        reason: 'Detecté que quieres modificar un proyecto existente. Change Order es el documento correcto para documentar cambios al contrato original.',
        alternatives: ['contract-addendum']
      };
    }
    
    // Detectar Lien Waiver
    if (keywords.payment.some(k => input.includes(k))) {
      return {
        templateId: 'lien-waiver',
        confidence: 0.85,
        reason: 'Mencionaste un pago. El Lien Waiver documenta el pago recibido y libera el gravamen sobre la propiedad, protegiendo al cliente.',
        alternatives: []
      };
    }
    
    // Detectar Certificate of Completion
    if (keywords.complete.some(k => input.includes(k))) {
      return {
        templateId: 'certificate-completion',
        confidence: 0.88,
        reason: 'El proyecto está terminado. Certificate of Completion certifica oficialmente que el trabajo está completo según los términos acordados.',
        alternatives: ['warranty-agreement']
      };
    }
    
    // Detectar Warranty Agreement
    if (keywords.warranty.some(k => input.includes(k))) {
      return {
        templateId: 'warranty-agreement',
        confidence: 0.92,
        reason: 'Quieres establecer garantías. Warranty Agreement define los términos de garantía sobre materiales y mano de obra.',
        alternatives: []
      };
    }
    
    // Detectar Contract Addendum
    if (keywords.addendum.some(k => input.includes(k))) {
      return {
        templateId: 'contract-addendum',
        confidence: 0.87,
        reason: 'Quieres agregar términos adicionales. Contract Addendum es perfecto para agregar cláusulas sin cambiar el scope del trabajo.',
        alternatives: ['change-order']
      };
    }
    
    // Detectar Work Order (trabajo simple/rápido)
    if (keywords.quick.some(k => input.includes(k))) {
      return {
        templateId: 'work-order',
        confidence: 0.80,
        reason: 'Para trabajos rápidos o simples, Work Order es más ágil que un contrato completo.',
        alternatives: ['independent-contractor']
      };
    }
    
    // Default: Independent Contractor Agreement
    return {
      templateId: 'independent-contractor',
      confidence: 0.75,
      reason: 'Para un proyecto nuevo estándar, Independent Contractor Agreement es el contrato completo que establece todos los términos.',
      alternatives: ['work-order']
    };
  }
}

// Singleton instance
export const ecosystemKnowledge = new EcosystemKnowledgeBase();

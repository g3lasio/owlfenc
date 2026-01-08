/**
 * ENTITY CONTEXT SERVICE
 * 
 * Servicio unificado para acceder a todas las entidades del sistema.
 * Usa un patrón genérico para evitar código duplicado.
 * 
 * Soporta 3 operaciones principales:
 * - searchEntity: Busca entidades por texto libre
 * - getEntity: Obtiene una entidad específica por ID
 * - listEntities: Lista entidades con filtros y ordenamiento
 */

import { db } from '../db';
import { 
  clients, 
  estimates, 
  contracts, 
  invoices, 
  projects,
  permitSearchHistory, 
  propertySearchHistory, 
  materials,
  templates,
  projectTemplates,
  smartMaterialLists,
  digitalContracts,
  notifications
} from '@shared/schema';
import { eq, like, and, desc, asc, or, sql, ilike } from 'drizzle-orm';

// Tipos de entidades soportadas
export type EntityType = 
  | 'client'
  | 'estimate'
  | 'contract'
  | 'invoice'
  | 'project'
  | 'permit_history'
  | 'property_history'
  | 'material'
  | 'template'
  | 'project_template'
  | 'smart_material_list'
  | 'digital_contract'
  | 'notification';

// Mapeo de entity_type a tabla de Drizzle
const ENTITY_TABLES: Record<EntityType, any> = {
  client: clients,
  estimate: estimates,
  contract: contracts,
  invoice: invoices,
  project: projects,
  permit_history: permitSearchHistory,
  property_history: propertySearchHistory,
  material: materials,
  template: templates,
  project_template: projectTemplates,
  smart_material_list: smartMaterialLists,
  digital_contract: digitalContracts,
  notification: notifications
};

// Campos de búsqueda por entidad (case-insensitive)
const SEARCH_FIELDS: Record<EntityType, string[]> = {
  client: ['firstName', 'lastName', 'email', 'phone', 'address', 'city'],
  estimate: ['clientName', 'projectAddress', 'projectType', 'estimateNumber', 'city'],
  contract: ['clientName', 'projectAddress', 'contractNumber', 'projectType'],
  invoice: ['clientName', 'invoiceNumber', 'projectName'],
  project: ['clientName', 'address', 'projectType', 'fenceType', 'city'],
  permit_history: ['address', 'projectType', 'city'],
  property_history: ['address', 'city'],
  material: ['name', 'description', 'category', 'supplier'],
  template: ['name', 'description', 'category'],
  project_template: ['name', 'description', 'projectType'],
  smart_material_list: ['name', 'description', 'projectType'],
  digital_contract: ['clientName', 'projectAddress', 'contractNumber'],
  notification: ['title', 'message']
};

// Campos de ordenamiento por defecto
const DEFAULT_SORT_FIELDS: Record<EntityType, string> = {
  client: 'createdAt',
  estimate: 'createdAt',
  contract: 'createdAt',
  invoice: 'createdAt',
  project: 'createdAt',
  permit_history: 'createdAt',
  property_history: 'createdAt',
  material: 'name',
  template: 'name',
  project_template: 'name',
  smart_material_list: 'name',
  digital_contract: 'createdAt',
  notification: 'createdAt'
};

// Nombres amigables para logging
const ENTITY_NAMES: Record<EntityType, string> = {
  client: 'Cliente',
  estimate: 'Estimado',
  contract: 'Contrato',
  invoice: 'Factura',
  project: 'Proyecto',
  permit_history: 'Historial de Permisos',
  property_history: 'Historial de Propiedades',
  material: 'Material',
  template: 'Template',
  project_template: 'Template de Proyecto',
  smart_material_list: 'Lista de Materiales',
  digital_contract: 'Contrato Digital',
  notification: 'Notificación'
};

export class EntityContextService {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
    console.log(`🔧 [ENTITY-CONTEXT] Initialized for user: ${userId}`);
  }
  
  /**
   * Buscar entidades por texto libre
   * Busca en múltiples campos usando ILIKE (case-insensitive)
   */
  async searchEntity(params: {
    entity_type: EntityType;
    query: string;
    filters?: Record<string, any>;
    limit?: number;
  }): Promise<any[]> {
    const { entity_type, query, filters = {}, limit = 10 } = params;
    
    console.log(`🔍 [ENTITY-CONTEXT] Searching ${ENTITY_NAMES[entity_type]}s: "${query}"`);
    
    const table = ENTITY_TABLES[entity_type];
    if (!table) {
      throw new Error(`Unknown entity type: ${entity_type}`);
    }
    
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const searchFields = SEARCH_FIELDS[entity_type];
    
    // Construir condiciones de búsqueda (case-insensitive)
    const searchConditions = searchFields
      .filter(field => table[field]) // Solo campos que existen en la tabla
      .map(field => ilike(table[field], `%${query}%`));
    
    if (searchConditions.length === 0) {
      console.warn(`⚠️  [ENTITY-CONTEXT] No searchable fields found for ${entity_type}`);
      return [];
    }
    
    // Construir condiciones base
    const conditions: any[] = [or(...searchConditions)];
    
    // Agregar filtro de userId si la tabla lo tiene
    if (table.userId) {
      conditions.push(eq(table.userId, parseInt(this.userId)));
    }
    
    // Agregar filtros adicionales
    for (const [key, value] of Object.entries(filters)) {
      if (table[key]) {
        if (typeof value === 'string') {
          conditions.push(ilike(table[key], `%${value}%`));
        } else {
          conditions.push(eq(table[key], value));
        }
      }
    }
    
    try {
      // Ejecutar query
      const results = await db
        .select()
        .from(table)
        .where(and(...conditions))
        .limit(limit);
      
      console.log(`✅ [ENTITY-CONTEXT] Found ${results.length} ${ENTITY_NAMES[entity_type]}(s)`);
      return results;
    } catch (error) {
      console.error(`❌ [ENTITY-CONTEXT] Search error:`, error);
      throw error;
    }
  }
  
  /**
   * Obtener entidad por ID
   */
  async getEntity(params: {
    entity_type: EntityType;
    id: string | number;
  }): Promise<any> {
    const { entity_type, id } = params;
    
    console.log(`📄 [ENTITY-CONTEXT] Getting ${ENTITY_NAMES[entity_type]}: ${id}`);
    
    const table = ENTITY_TABLES[entity_type];
    if (!table) {
      throw new Error(`Unknown entity type: ${entity_type}`);
    }
    
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Construir condiciones
    const conditions: any[] = [eq(table.id, typeof id === 'string' ? parseInt(id) : id)];
    
    // Agregar filtro de userId si la tabla lo tiene
    if (table.userId) {
      conditions.push(eq(table.userId, parseInt(this.userId)));
    }
    
    try {
      const result = await db
        .select()
        .from(table)
        .where(and(...conditions))
        .limit(1);
      
      if (result.length === 0) {
        console.warn(`⚠️  [ENTITY-CONTEXT] ${ENTITY_NAMES[entity_type]} not found: ${id}`);
        return null;
      }
      
      console.log(`✅ [ENTITY-CONTEXT] ${ENTITY_NAMES[entity_type]} found`);
      return result[0];
    } catch (error) {
      console.error(`❌ [ENTITY-CONTEXT] Get error:`, error);
      throw error;
    }
  }
  
  /**
   * Listar entidades con filtros y ordenamiento
   */
  async listEntities(params: {
    entity_type: EntityType;
    filters?: Record<string, any>;
    limit?: number;
    sort?: string;
    offset?: number;
  }): Promise<any[]> {
    const { 
      entity_type, 
      filters = {}, 
      limit = 10, 
      sort,
      offset = 0
    } = params;
    
    console.log(`📋 [ENTITY-CONTEXT] Listing ${ENTITY_NAMES[entity_type]}s (limit: ${limit})`);
    
    const table = ENTITY_TABLES[entity_type];
    if (!table) {
      throw new Error(`Unknown entity type: ${entity_type}`);
    }
    
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Construir condiciones
    const conditions: any[] = [];
    
    // Agregar filtro de userId si la tabla lo tiene
    // Algunas tablas no tienen userId pero sí tienen otros campos para filtrar por usuario
    if (table.userId !== undefined) {
      conditions.push(eq(table.userId, parseInt(this.userId)));
    }
    // Para estimates y contracts, no filtramos por usuario aquí
    // porque pueden ser compartidos o no tener userId directo
    
    // Agregar filtros adicionales
    for (const [key, value] of Object.entries(filters)) {
      if (table[key]) {
        if (typeof value === 'string') {
          conditions.push(ilike(table[key], `%${value}%`));
        } else {
          conditions.push(eq(table[key], value));
        }
      }
    }
    
    // Parse sort
    let sortField = DEFAULT_SORT_FIELDS[entity_type];
    let sortDir: 'asc' | 'desc' = 'desc';
    
    if (sort) {
      const [field, dir] = sort.split(':');
      if (table[field]) {
        sortField = field;
        sortDir = (dir === 'asc' ? 'asc' : 'desc');
      }
    }
    
    const sortFn = sortDir === 'asc' ? asc : desc;
    
    try {
      // Ejecutar query
      const query = db
        .select()
        .from(table);
      
      // Aplicar condiciones si existen
      const finalQuery = conditions.length > 0 
        ? query.where(and(...conditions))
        : query;
      
      const results = await finalQuery
        .orderBy(sortFn(table[sortField] || table.id))
        .limit(limit)
        .offset(offset);
      
      console.log(`✅ [ENTITY-CONTEXT] Listed ${results.length} ${ENTITY_NAMES[entity_type]}(s)`);
      return results;
    } catch (error) {
      console.error(`❌ [ENTITY-CONTEXT] List error:`, error);
      throw error;
    }
  }
  
  /**
   * Contar entidades (útil para paginación)
   */
  async countEntities(params: {
    entity_type: EntityType;
    filters?: Record<string, any>;
  }): Promise<number> {
    const { entity_type, filters = {} } = params;
    
    const table = ENTITY_TABLES[entity_type];
    if (!table) {
      throw new Error(`Unknown entity type: ${entity_type}`);
    }
    
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Construir condiciones
    const conditions: any[] = [];
    
    // Agregar filtro de userId si la tabla lo tiene
    // Algunas tablas no tienen userId pero sí tienen otros campos para filtrar por usuario
    if (table.userId !== undefined) {
      conditions.push(eq(table.userId, parseInt(this.userId)));
    }
    // Para estimates y contracts, no filtramos por usuario aquí
    // porque pueden ser compartidos o no tener userId directo
    
    // Agregar filtros adicionales
    for (const [key, value] of Object.entries(filters)) {
      if (table[key]) {
        conditions.push(eq(table[key], value));
      }
    }
    
    try {
      const query = db
        .select({ count: sql<number>`count(*)` })
        .from(table);
      
      const finalQuery = conditions.length > 0 
        ? query.where(and(...conditions))
        : query;
      
      const result = await finalQuery;
      return result[0]?.count || 0;
    } catch (error) {
      console.error(`❌ [ENTITY-CONTEXT] Count error:`, error);
      throw error;
    }
  }
}

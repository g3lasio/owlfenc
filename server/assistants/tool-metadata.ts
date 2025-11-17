/**
 * TOOL METADATA SYSTEM
 * 
 * Sistema de metadata para organizar herramientas cuando escalan a 50+
 * Facilita mantenimiento, debugging y documentación
 */

/**
 * Categorías de herramientas por workflow/dominio
 */
export enum ToolCategory {
  ESTIMATES = 'estimates',
  CONTRACTS = 'contracts',
  INVOICES = 'invoices',
  PROPERTY = 'property',
  PERMITS = 'permits',
  CLIENTS = 'clients',
  PAYMENTS = 'payments',
  REPORTS = 'reports',
  OTHER = 'other'
}

/**
 * Tipo de operación CRUD
 */
export enum ToolOperation {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  SEND = 'send',
  ANALYZE = 'analyze',
  VERIFY = 'verify'
}

/**
 * Metadata para cada herramienta
 */
export interface ToolMetadata {
  name: string;
  category: ToolCategory;
  operation: ToolOperation;
  requiresConfirmation: boolean;
  description: string;
  examples?: string[];
  relatedTools?: string[];
}

/**
 * Registro de metadata para todas las herramientas
 */
export const TOOL_METADATA_REGISTRY: Record<string, ToolMetadata> = {
  // === ESTIMATES ===
  create_estimate: {
    name: 'create_estimate',
    category: ToolCategory.ESTIMATES,
    operation: ToolOperation.CREATE,
    requiresConfirmation: false,
    description: 'Create a new construction estimate',
    examples: ['Create estimate for 100ft fence', 'Quote for deck project'],
    relatedTools: ['send_estimate_email', 'create_contract']
  },
  get_estimates: {
    name: 'get_estimates',
    category: ToolCategory.ESTIMATES,
    operation: ToolOperation.READ,
    requiresConfirmation: false,
    description: 'List all estimates with optional filters',
    examples: ['Show my estimates', 'List pending estimates'],
    relatedTools: ['get_estimate_by_id']
  },
  get_estimate_by_id: {
    name: 'get_estimate_by_id',
    category: ToolCategory.ESTIMATES,
    operation: ToolOperation.READ,
    requiresConfirmation: false,
    description: 'Get details of specific estimate',
    examples: ['Show estimate #123', 'Get details of Juan\'s estimate'],
    relatedTools: ['update_estimate', 'send_estimate_email']
  },
  update_estimate: {
    name: 'update_estimate',
    category: ToolCategory.ESTIMATES,
    operation: ToolOperation.UPDATE,
    requiresConfirmation: false,
    description: 'Modify existing estimate',
    examples: ['Change price to $5000', 'Update estimate status'],
    relatedTools: ['get_estimate_by_id']
  },
  delete_estimate: {
    name: 'delete_estimate',
    category: ToolCategory.ESTIMATES,
    operation: ToolOperation.DELETE,
    requiresConfirmation: true,
    description: 'Delete estimate permanently',
    examples: ['Delete rejected estimate', 'Remove draft estimate'],
    relatedTools: []
  },
  send_estimate_email: {
    name: 'send_estimate_email',
    category: ToolCategory.ESTIMATES,
    operation: ToolOperation.SEND,
    requiresConfirmation: false,
    description: 'Send estimate to client via email',
    examples: ['Email estimate to client', 'Send quote to john@example.com'],
    relatedTools: ['get_estimate_by_id']
  },

  // === CONTRACTS ===
  create_contract: {
    name: 'create_contract',
    category: ToolCategory.CONTRACTS,
    operation: ToolOperation.CREATE,
    requiresConfirmation: true,
    description: 'Generate legal contract with dual signature',
    examples: ['Create contract for approved estimate', 'Generate agreement'],
    relatedTools: ['get_contract_by_id']
  },
  get_contracts: {
    name: 'get_contracts',
    category: ToolCategory.CONTRACTS,
    operation: ToolOperation.READ,
    requiresConfirmation: false,
    description: 'List all contracts with optional filters',
    examples: ['Show my contracts', 'List signed contracts'],
    relatedTools: ['get_contract_by_id']
  },
  get_contract_by_id: {
    name: 'get_contract_by_id',
    category: ToolCategory.CONTRACTS,
    operation: ToolOperation.READ,
    requiresConfirmation: false,
    description: 'Get details of specific contract',
    examples: ['Show contract #456', 'Get Maria\'s contract details'],
    relatedTools: ['update_contract']
  },
  update_contract: {
    name: 'update_contract',
    category: ToolCategory.CONTRACTS,
    operation: ToolOperation.UPDATE,
    requiresConfirmation: false,
    description: 'Modify existing contract',
    examples: ['Change completion date', 'Update contract terms'],
    relatedTools: ['get_contract_by_id']
  },
  delete_contract: {
    name: 'delete_contract',
    category: ToolCategory.CONTRACTS,
    operation: ToolOperation.DELETE,
    requiresConfirmation: true,
    description: 'Delete contract permanently',
    examples: ['Delete cancelled contract', 'Remove draft contract'],
    relatedTools: []
  },

  // === PROPERTY ===
  verify_property: {
    name: 'verify_property',
    category: ToolCategory.PROPERTY,
    operation: ToolOperation.VERIFY,
    requiresConfirmation: false,
    description: 'Verify property ownership and details',
    examples: ['Verify property at 123 Main St', 'Check property ownership'],
    relatedTools: ['create_estimate']
  },

  // === PERMITS ===
  get_permit_info: {
    name: 'get_permit_info',
    category: ToolCategory.PERMITS,
    operation: ToolOperation.ANALYZE,
    requiresConfirmation: false,
    description: 'Get permit requirements and regulations',
    examples: ['Check if permits needed', 'Get permit info for fence'],
    relatedTools: ['create_estimate']
  },

  // === CLIENTS ===
  get_client_history: {
    name: 'get_client_history',
    category: ToolCategory.CLIENTS,
    operation: ToolOperation.READ,
    requiresConfirmation: false,
    description: 'Get all estimates and contracts for a client',
    examples: ['Show Juan\'s history', 'What work did I do for client?'],
    relatedTools: ['get_estimates', 'get_contracts']
  }
};

/**
 * Obtener metadata de una herramienta
 */
export function getToolMetadata(toolName: string): ToolMetadata | undefined {
  return TOOL_METADATA_REGISTRY[toolName];
}

/**
 * Obtener todas las herramientas de una categoría
 */
export function getToolsByCategory(category: ToolCategory): ToolMetadata[] {
  return Object.values(TOOL_METADATA_REGISTRY).filter(
    tool => tool.category === category
  );
}

/**
 * Obtener todas las herramientas de un tipo de operación
 */
export function getToolsByOperation(operation: ToolOperation): ToolMetadata[] {
  return Object.values(TOOL_METADATA_REGISTRY).filter(
    tool => tool.operation === operation
  );
}

/**
 * Verificar si una herramienta existe en el registro
 */
export function toolExists(toolName: string): boolean {
  return toolName in TOOL_METADATA_REGISTRY;
}

/**
 * Obtener herramientas relacionadas
 */
export function getRelatedTools(toolName: string): ToolMetadata[] {
  const tool = getToolMetadata(toolName);
  if (!tool || !tool.relatedTools) return [];
  
  return tool.relatedTools
    .map(name => getToolMetadata(name))
    .filter((t): t is ToolMetadata => t !== undefined);
}

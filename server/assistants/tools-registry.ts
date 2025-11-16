/**
 * ASSISTANTS API - TOOL REGISTRY
 * 
 * Mapeo de herramientas de Mervin al formato de OpenAI function calling
 * Convierte las tools existentes al formato que OpenAI Assistants entiende
 */

import type { ToolDefinition, ToolExecutor, ToolRegistry } from './types';
import type { UserContext } from './types';

/**
 * Definiciones de herramientas en formato OpenAI
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // 1. CREATE ESTIMATE
  {
    type: 'function',
    function: {
      name: 'create_estimate',
      description: 'Create a detailed construction estimate with materials, labor, and pricing. Can optionally send the estimate to the client via email.',
      parameters: {
        type: 'object',
        properties: {
          clientName: {
            type: 'string',
            description: 'Full name of the client'
          },
          clientEmail: {
            type: 'string',
            description: 'Email address of the client'
          },
          clientPhone: {
            type: 'string',
            description: 'Phone number of the client (optional)'
          },
          projectType: {
            type: 'string',
            description: 'Type of construction project (e.g., "fence", "deck", "patio", "driveway")'
          },
          dimensions: {
            type: 'string',
            description: 'Project dimensions (e.g., "100 linear feet", "20x30 sq ft")'
          },
          sendEmail: {
            type: 'boolean',
            description: 'Whether to send the estimate to the client via email (default: true)'
          }
        },
        required: ['clientName', 'clientEmail', 'projectType', 'dimensions']
      }
    }
  },

  // 2. CREATE CONTRACT
  {
    type: 'function',
    function: {
      name: 'create_contract',
      description: 'Generate a professional legal contract with dual signature system. This is a critical action that creates a binding legal document.',
      parameters: {
        type: 'object',
        properties: {
          clientName: {
            type: 'string',
            description: 'Full name of the client'
          },
          clientEmail: {
            type: 'string',
            description: 'Email address of the client (optional)'
          },
          projectType: {
            type: 'string',
            description: 'Type of construction project'
          },
          projectAddress: {
            type: 'string',
            description: 'Address where the work will be performed (optional)'
          },
          amount: {
            type: 'number',
            description: 'Total contract amount in dollars'
          },
          startDate: {
            type: 'string',
            description: 'Project start date in ISO format (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            description: 'Project completion date in ISO format (YYYY-MM-DD)'
          },
          specialTerms: {
            type: 'string',
            description: 'Any special terms or conditions for the contract'
          }
        },
        required: ['clientName', 'projectType', 'amount']
      }
    }
  },

  // 3. VERIFY PROPERTY
  {
    type: 'function',
    function: {
      name: 'verify_property',
      description: 'Verify property ownership and details using real property records. Provides information about the owner, property type, year built, and square footage.',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Full property address to verify (street, city, state, zip)'
          },
          includeHistory: {
            type: 'boolean',
            description: 'Whether to include historical property data (default: false)'
          }
        },
        required: ['address']
      }
    }
  },

  // 4. GET PERMIT INFO
  {
    type: 'function',
    function: {
      name: 'get_permit_info',
      description: 'Get required permits and regulations for a construction project. Analyzes local building codes and permit requirements.',
      parameters: {
        type: 'object',
        properties: {
          projectType: {
            type: 'string',
            description: 'Type of construction project (e.g., "fence", "deck", "addition")'
          },
          projectAddress: {
            type: 'string',
            description: 'Project location address (city and state minimum)'
          },
          projectScope: {
            type: 'string',
            description: 'Detailed description of the scope and nature of the work'
          }
        },
        required: ['projectType', 'projectAddress', 'projectScope']
      }
    }
  },

  // 5. GET CLIENT HISTORY
  {
    type: 'function',
    function: {
      name: 'get_client_history',
      description: 'Get previous estimates and contracts for a specific client. Useful for finding past work and client information.',
      parameters: {
        type: 'object',
        properties: {
          clientName: {
            type: 'string',
            description: 'Name of the client to search for (partial names work)'
          }
        },
        required: ['clientName']
      }
    }
  }
];

/**
 * Executors reales de las herramientas
 * Estas funciones llaman a los endpoints backend existentes
 */

// Importar servicios reales
import { SystemAPIService } from '../mervin-v2/services/SystemAPIService';
import { ClaudeService } from '../mervin-v2/ai/ClaudeService';
import type { UserSnapshot } from '../mervin-v2/services/SnapshotService';

// Instancias globales de servicios (se reinicializan por request con userId)
const claude = new ClaudeService();

/**
 * Executor para create_estimate
 */
const executeCreateEstimate: ToolExecutor = async (args, userContext) => {
  try {
    // Crear instancia de SystemAPI para este usuario
    const systemAPI = new SystemAPIService(
      userContext.userId,
      {}, // authHeaders se pasarán desde el request
      process.env.NODE_ENV === 'production' ? 'https://app.owlfenc.com' : ''
    );

    const estimate = await systemAPI.createEstimate({
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      clientPhone: args.clientPhone,
      projectType: args.projectType,
      dimensions: args.dimensions,
      sendEmail: args.sendEmail !== false
    });

    return {
      estimateId: estimate.id,
      total: estimate.total,
      clientName: args.clientName,
      projectType: args.projectType,
      emailSent: args.sendEmail !== false,
      message: `✅ Estimate #${estimate.id} created successfully for ${args.clientName}. Total: $${estimate.total}`
    };
  } catch (error: any) {
    throw new Error(`Failed to create estimate: ${error.message}`);
  }
};

/**
 * Executor para create_contract
 */
const executeCreateContract: ToolExecutor = async (args, userContext) => {
  try {
    // Crear instancia de SystemAPI para este usuario
    const systemAPI = new SystemAPIService(
      userContext.userId,
      {},
      process.env.NODE_ENV === 'production' ? 'https://app.owlfenc.com' : ''
    );

    // Generar contenido del contrato usando Claude
    const contractContent = await claude.generateContractContent({
      clientName: args.clientName,
      projectType: args.projectType,
      projectAddress: args.projectAddress,
      amount: args.amount,
      startDate: args.startDate,
      endDate: args.endDate,
      specialTerms: args.specialTerms
    });

    // Crear contrato con dual signature
    const contract = await systemAPI.createContract(args, contractContent);

    return {
      contractId: contract.id,
      clientName: args.clientName,
      amount: args.amount,
      status: 'pending_signatures',
      signatureUrl: contract.signatureUrl,
      message: `✅ Contract #${contract.id} generated for ${args.clientName}. Amount: $${args.amount}. Awaiting signatures.`
    };
  } catch (error: any) {
    throw new Error(`Failed to create contract: ${error.message}`);
  }
};

/**
 * Executor para verify_property
 */
const executeVerifyProperty: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = new SystemAPIService(
      userContext.userId,
      {},
      process.env.NODE_ENV === 'production' ? 'https://app.owlfenc.com' : ''
    );

    const propertyData = await systemAPI.verifyProperty({
      address: args.address,
      includeHistory: args.includeHistory || false
    });

    return {
      address: args.address,
      owner: propertyData.owner,
      propertyType: propertyData.propertyType,
      yearBuilt: propertyData.yearBuilt,
      sqft: propertyData.sqft,
      message: `✅ Property verified: ${propertyData.owner} owns property at ${args.address}`
    };
  } catch (error: any) {
    throw new Error(`Failed to verify property: ${error.message}`);
  }
};

/**
 * Executor para get_permit_info
 */
const executeGetPermitInfo: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = new SystemAPIService(
      userContext.userId,
      {},
      process.env.NODE_ENV === 'production' ? 'https://app.owlfenc.com' : ''
    );

    const permitInfo = await systemAPI.getPermitInfo({
      projectType: args.projectType,
      projectAddress: args.projectAddress,
      projectScope: args.projectScope
    });

    return {
      required: permitInfo.required,
      permits: permitInfo.permits,
      regulations: permitInfo.regulations,
      estimatedCost: permitInfo.estimatedCost,
      message: `✅ Permit analysis complete. ${permitInfo.required ? 'Permits ARE required' : 'No permits required'} for this project.`
    };
  } catch (error: any) {
    throw new Error(`Failed to get permit information: ${error.message}`);
  }
};

/**
 * Executor para get_client_history
 */
const executeGetClientHistory: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = new SystemAPIService(
      userContext.userId,
      {},
      process.env.NODE_ENV === 'production' ? 'https://app.owlfenc.com' : ''
    );

    // Aquí normalmente buscaríamos en Firebase/PostgreSQL
    // Por ahora retornamos estructura básica
    const history = await systemAPI.getClientHistory({
      userId: userContext.userId,
      clientName: args.clientName
    });

    return {
      clientName: args.clientName,
      estimates: history.estimates,
      contracts: history.contracts,
      totalEstimates: history.estimates.length,
      totalContracts: history.contracts.length,
      message: `✅ Found ${history.estimates.length} estimates and ${history.contracts.length} contracts for ${args.clientName}`
    };
  } catch (error: any) {
    throw new Error(`Failed to get client history: ${error.message}`);
  }
};

/**
 * Registry completo de herramientas con executors
 */
export const TOOL_REGISTRY: ToolRegistry = {
  create_estimate: {
    definition: TOOL_DEFINITIONS[0],
    executor: executeCreateEstimate,
    requiresConfirmation: false
  },
  create_contract: {
    definition: TOOL_DEFINITIONS[1],
    executor: executeCreateContract,
    requiresConfirmation: true // Acción crítica
  },
  verify_property: {
    definition: TOOL_DEFINITIONS[2],
    executor: executeVerifyProperty,
    requiresConfirmation: false
  },
  get_permit_info: {
    definition: TOOL_DEFINITIONS[3],
    executor: executeGetPermitInfo,
    requiresConfirmation: false
  },
  get_client_history: {
    definition: TOOL_DEFINITIONS[4],
    executor: executeGetClientHistory,
    requiresConfirmation: false
  }
};

/**
 * Obtener tool executor por nombre
 */
export function getToolExecutor(toolName: string): ToolExecutor | undefined {
  return TOOL_REGISTRY[toolName]?.executor;
}

/**
 * Verificar si tool requiere confirmación
 */
export function requiresConfirmation(toolName: string): boolean {
  return TOOL_REGISTRY[toolName]?.requiresConfirmation || false;
}

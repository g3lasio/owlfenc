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
  },

  // 6. GET ESTIMATES
  {
    type: 'function',
    function: {
      name: 'get_estimates',
      description: 'List all estimates for the current user. Can filter by status (draft, sent, viewed, approved, rejected, expired).',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by estimate status: draft, sent, viewed, approved, rejected, expired',
            enum: ['draft', 'sent', 'viewed', 'approved', 'rejected', 'expired']
          },
          limit: {
            type: 'number',
            description: 'Maximum number of estimates to return'
          }
        },
        required: []
      }
    }
  },

  // 7. GET ESTIMATE BY ID
  {
    type: 'function',
    function: {
      name: 'get_estimate_by_id',
      description: 'Get detailed information about a specific estimate including all items, pricing, client info.',
      parameters: {
        type: 'object',
        properties: {
          estimateId: {
            type: 'string',
            description: 'The ID of the estimate to retrieve'
          }
        },
        required: ['estimateId']
      }
    }
  },

  // 8. UPDATE ESTIMATE
  {
    type: 'function',
    function: {
      name: 'update_estimate',
      description: 'Modify an existing estimate. Can update client info, items, pricing, status, or any field.',
      parameters: {
        type: 'object',
        properties: {
          estimateId: {
            type: 'string',
            description: 'The ID of the estimate to update'
          },
          updates: {
            type: 'object',
            description: 'Object containing the fields to update (clientName, items, total, status, etc.)',
            additionalProperties: true
          }
        },
        required: ['estimateId', 'updates']
      }
    }
  },

  // 9. DELETE ESTIMATE
  {
    type: 'function',
    function: {
      name: 'delete_estimate',
      description: 'Permanently delete an estimate. This action cannot be undone.',
      parameters: {
        type: 'object',
        properties: {
          estimateId: {
            type: 'string',
            description: 'The ID of the estimate to delete'
          }
        },
        required: ['estimateId']
      }
    }
  },

  // 10. SEND ESTIMATE EMAIL
  {
    type: 'function',
    function: {
      name: 'send_estimate_email',
      description: 'Send an estimate to the client via email and mark it as sent.',
      parameters: {
        type: 'object',
        properties: {
          estimateId: {
            type: 'string',
            description: 'The ID of the estimate to send'
          },
          recipientEmail: {
            type: 'string',
            description: 'Email address to send the estimate to (optional, defaults to client email)'
          }
        },
        required: ['estimateId']
      }
    }
  },

  // 11. GET CONTRACTS
  {
    type: 'function',
    function: {
      name: 'get_contracts',
      description: 'List all contracts for the current user. Can filter by status or client.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by contract status: draft, sent, signed, in_progress, completed, cancelled',
            enum: ['draft', 'sent', 'signed', 'in_progress', 'completed', 'cancelled']
          },
          clientId: {
            type: 'string',
            description: 'Filter by client ID'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of contracts to return'
          }
        },
        required: []
      }
    }
  },

  // 12. GET CONTRACT BY ID
  {
    type: 'function',
    function: {
      name: 'get_contract_by_id',
      description: 'Get detailed information about a specific contract including terms, signatures, payment schedule.',
      parameters: {
        type: 'object',
        properties: {
          contractId: {
            type: 'string',
            description: 'The ID of the contract to retrieve'
          }
        },
        required: ['contractId']
      }
    }
  },

  // 13. UPDATE CONTRACT
  {
    type: 'function',
    function: {
      name: 'update_contract',
      description: 'Modify an existing contract. Can update terms, dates, amounts, or status.',
      parameters: {
        type: 'object',
        properties: {
          contractId: {
            type: 'string',
            description: 'The ID of the contract to update'
          },
          updates: {
            type: 'object',
            description: 'Object containing the fields to update',
            additionalProperties: true
          }
        },
        required: ['contractId', 'updates']
      }
    }
  },

  // 14. DELETE CONTRACT
  {
    type: 'function',
    function: {
      name: 'delete_contract',
      description: 'Permanently delete a contract. This action cannot be undone.',
      parameters: {
        type: 'object',
        properties: {
          contractId: {
            type: 'string',
            description: 'The ID of the contract to delete'
          }
        },
        required: ['contractId']
      }
    }
  },

  // 15. RUN DEEPSEARCH - Analyze materials and labor for a project
  {
    type: 'function',
    function: {
      name: 'run_deepsearch',
      description: 'Run DeepSearch AI to analyze a construction project and generate detailed materials list with pricing, labor costs, and recommendations. Use this when the user wants to know costs without creating a full estimate.',
      parameters: {
        type: 'object',
        properties: {
          projectDescription: {
            type: 'string',
            description: 'Detailed description of the project (e.g., "150 linear feet cedar fence 6ft tall with 2 gates")'
          },
          location: {
            type: 'string',
            description: 'Project location for regional pricing (city, state)'
          }
        },
        required: ['projectDescription']
      }
    }
  },

  // 16. GET ESTIMATE SHARE URL - Generate public shareable URL
  {
    type: 'function',
    function: {
      name: 'get_estimate_share_url',
      description: 'Generate a public shareable URL for an estimate that clients can view, approve, or request changes without needing to login.',
      parameters: {
        type: 'object',
        properties: {
          estimateId: {
            type: 'string',
            description: 'The ID of the estimate to share'
          }
        },
        required: ['estimateId']
      }
    }
  },

  // 17. GENERATE ESTIMATE PDF - Create downloadable PDF
  {
    type: 'function',
    function: {
      name: 'generate_estimate_pdf',
      description: 'Generate a professional PDF document for an estimate that can be downloaded or sent to clients.',
      parameters: {
        type: 'object',
        properties: {
          estimateId: {
            type: 'string',
            description: 'The ID of the estimate to generate PDF for'
          }
        },
        required: ['estimateId']
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
import { deepSearchService } from '../services/deepSearchService';
import type { UserSnapshot } from '../mervin-v2/services/SnapshotService';

// Instancias globales de servicios (se reinicializan por request con userId)
const claude = new ClaudeService();

/**
 * 🔥 Helper function para crear SystemAPIService autenticado
 */
function createAuthenticatedSystemAPI(userContext: UserContext): SystemAPIService {
  const authHeaders: Record<string, string> = userContext.firebaseToken ? {
    'Authorization': `Bearer ${userContext.firebaseToken}`
  } : {};
  
  return new SystemAPIService(
    userContext.userId,
    authHeaders,
    process.env.NODE_ENV === 'production' ? 'https://app.owlfenc.com' : 'http://localhost:5000'
  );
}

/**
 * Executor para create_estimate
 */
const executeCreateEstimate: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);

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
    const systemAPI = createAuthenticatedSystemAPI(userContext);

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
    const contract = await systemAPI.createContract({
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      projectType: args.projectType,
      projectAddress: args.projectAddress,
      amount: args.amount,
      startDate: args.startDate,
      endDate: args.endDate,
      specialTerms: args.specialTerms
    }, contractContent);

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
    const systemAPI = createAuthenticatedSystemAPI(userContext);

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
    const systemAPI = createAuthenticatedSystemAPI(userContext);

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
    const systemAPI = createAuthenticatedSystemAPI(userContext);

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
 * Executor para get_estimates
 */
const executeGetEstimates: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);
    const estimates = await systemAPI.getEstimates(args.status, args.limit);
    return {
      estimates,
      total: estimates.length,
      message: `✅ Found ${estimates.length} estimates${args.status ? ` with status '${args.status}'` : ''}`
    };
  } catch (error: any) {
    throw new Error(`Failed to get estimates: ${error.message}`);
  }
};

/**
 * Executor para get_estimate_by_id
 */
const executeGetEstimateById: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);
    const estimate = await systemAPI.getEstimateById(args.estimateId);
    return {
      estimate,
      message: `✅ Retrieved estimate #${estimate.estimateNumber || args.estimateId}`
    };
  } catch (error: any) {
    throw new Error(`Failed to get estimate: ${error.message}`);
  }
};

/**
 * Executor para update_estimate
 */
const executeUpdateEstimate: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);
    const updated = await systemAPI.updateEstimate(args.estimateId, args.updates);
    return {
      estimate: updated,
      message: `✅ Estimate #${args.estimateId} updated successfully`
    };
  } catch (error: any) {
    throw new Error(`Failed to update estimate: ${error.message}`);
  }
};

/**
 * Executor para delete_estimate
 */
const executeDeleteEstimate: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);
    await systemAPI.deleteEstimate(args.estimateId);
    return {
      success: true,
      message: `✅ Estimate #${args.estimateId} deleted successfully`
    };
  } catch (error: any) {
    throw new Error(`Failed to delete estimate: ${error.message}`);
  }
};

/**
 * Executor para send_estimate_email
 */
const executeSendEstimateEmail: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);
    await systemAPI.sendEstimateEmail(args.estimateId, args.recipientEmail);
    return {
      success: true,
      message: `✅ Estimate #${args.estimateId} sent via email successfully`
    };
  } catch (error: any) {
    throw new Error(`Failed to send estimate email: ${error.message}`);
  }
};

/**
 * Executor para get_contracts
 */
const executeGetContracts: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);
    const contracts = await systemAPI.getContracts(args.status, args.clientId, args.limit);
    return {
      contracts,
      total: contracts.length,
      message: `✅ Found ${contracts.length} contracts${args.status ? ` with status '${args.status}'` : ''}`
    };
  } catch (error: any) {
    throw new Error(`Failed to get contracts: ${error.message}`);
  }
};

/**
 * Executor para get_contract_by_id
 */
const executeGetContractById: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);
    const contract = await systemAPI.getContractById(args.contractId);
    return {
      contract,
      message: `✅ Retrieved contract #${contract.contractNumber || args.contractId}`
    };
  } catch (error: any) {
    throw new Error(`Failed to get contract: ${error.message}`);
  }
};

/**
 * Executor para update_contract
 */
const executeUpdateContract: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);
    const updated = await systemAPI.updateContract(args.contractId, args.updates);
    return {
      contract: updated,
      message: `✅ Contract #${args.contractId} updated successfully`
    };
  } catch (error: any) {
    throw new Error(`Failed to update contract: ${error.message}`);
  }
};

/**
 * Executor para delete_contract
 */
const executeDeleteContract: ToolExecutor = async (args, userContext) => {
  try {
    const systemAPI = createAuthenticatedSystemAPI(userContext);
    await systemAPI.deleteContract(args.contractId);
    return {
      success: true,
      message: `✅ Contract #${args.contractId} deleted successfully`
    };
  } catch (error: any) {
    throw new Error(`Failed to delete contract: ${error.message}`);
  }
};

/**
 * Executor para run_deepsearch
 */
const executeRunDeepsearch: ToolExecutor = async (args, userContext) => {
  try {
    console.log('🔍 [TOOL] Ejecutando DeepSearch para:', args.projectDescription);
    
    const result = await deepSearchService.analyzeProject(
      args.projectDescription,
      args.location
    );

    return {
      projectType: result.projectType,
      projectScope: result.projectScope,
      materials: result.materials.slice(0, 10), // Top 10 para no sobrecargar
      totalMaterialsCost: result.totalMaterialsCost,
      totalLaborCost: result.totalLaborCost,
      grandTotal: result.grandTotal,
      recommendations: result.recommendations,
      warnings: result.warnings,
      confidence: result.confidence,
      message: `✅ DeepSearch completado: ${result.materials.length} materiales, Total: $${result.grandTotal.toFixed(2)}`
    };
  } catch (error: any) {
    throw new Error(`Failed to run DeepSearch: ${error.message}`);
  }
};

/**
 * Executor para get_estimate_share_url
 */
const executeGetEstimateShareUrl: ToolExecutor = async (args, userContext) => {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.owlfenc.com' 
      : 'http://localhost:5000';
    
    // La URL pública para que el cliente vea/apruebe el estimado
    const shareUrl = `${baseUrl}/api/simple-estimate/approve?estimateId=${args.estimateId}`;
    
    return {
      estimateId: args.estimateId,
      shareUrl,
      approveUrl: shareUrl,
      adjustUrl: `${baseUrl}/api/simple-estimate/adjust?estimateId=${args.estimateId}`,
      message: `✅ URL de estimado generada. El cliente puede ver, aprobar o solicitar cambios sin necesidad de iniciar sesión.`
    };
  } catch (error: any) {
    throw new Error(`Failed to generate share URL: ${error.message}`);
  }
};

/**
 * Executor para generate_estimate_pdf
 */
const executeGenerateEstimatePdf: ToolExecutor = async (args, userContext) => {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.owlfenc.com' 
      : 'http://localhost:5000';
    
    // URL para descargar el PDF generado por Puppeteer
    const pdfUrl = `${baseUrl}/api/estimate-puppeteer-pdf?estimateId=${args.estimateId}`;
    
    return {
      estimateId: args.estimateId,
      pdfUrl,
      downloadUrl: pdfUrl,
      message: `✅ PDF del estimado disponible para descarga.`
    };
  } catch (error: any) {
    throw new Error(`Failed to generate estimate PDF: ${error.message}`);
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
    requiresConfirmation: true
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
  },
  get_estimates: {
    definition: TOOL_DEFINITIONS[5],
    executor: executeGetEstimates,
    requiresConfirmation: false
  },
  get_estimate_by_id: {
    definition: TOOL_DEFINITIONS[6],
    executor: executeGetEstimateById,
    requiresConfirmation: false
  },
  update_estimate: {
    definition: TOOL_DEFINITIONS[7],
    executor: executeUpdateEstimate,
    requiresConfirmation: false
  },
  delete_estimate: {
    definition: TOOL_DEFINITIONS[8],
    executor: executeDeleteEstimate,
    requiresConfirmation: true
  },
  send_estimate_email: {
    definition: TOOL_DEFINITIONS[9],
    executor: executeSendEstimateEmail,
    requiresConfirmation: false
  },
  get_contracts: {
    definition: TOOL_DEFINITIONS[10],
    executor: executeGetContracts,
    requiresConfirmation: false
  },
  get_contract_by_id: {
    definition: TOOL_DEFINITIONS[11],
    executor: executeGetContractById,
    requiresConfirmation: false
  },
  update_contract: {
    definition: TOOL_DEFINITIONS[12],
    executor: executeUpdateContract,
    requiresConfirmation: false
  },
  delete_contract: {
    definition: TOOL_DEFINITIONS[13],
    executor: executeDeleteContract,
    requiresConfirmation: true
  },
  run_deepsearch: {
    definition: TOOL_DEFINITIONS[14],
    executor: executeRunDeepsearch,
    requiresConfirmation: false
  },
  get_estimate_share_url: {
    definition: TOOL_DEFINITIONS[15],
    executor: executeGetEstimateShareUrl,
    requiresConfirmation: false
  },
  generate_estimate_pdf: {
    definition: TOOL_DEFINITIONS[16],
    executor: executeGenerateEstimatePdf,
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

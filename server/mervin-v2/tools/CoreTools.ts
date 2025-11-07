/**
 * CORE TOOLS - HERRAMIENTAS PRINCIPALES DE MERVIN
 * 
 * Responsabilidad:
 * - Definir y registrar todas las herramientas disponibles
 * - Conectar ToolRegistry con SystemAPIService
 * - Proporcionar acciones ejecutables para el agente
 */

import { toolRegistry, type Tool, type ToolResult } from './ToolRegistry';
import { SystemAPIService } from '../services/SystemAPIService';
import { ClaudeService } from '../ai/ClaudeService';
import { ChatGPTService } from '../ai/ChatGPTService';
import type { UserSnapshot } from '../services/SnapshotService';
import type { 
  EstimateParams, 
  ContractParams, 
  PropertyParams, 
  PermitParams 
} from '../types/mervin-types';

const claude = new ClaudeService();
const chatgpt = new ChatGPTService();

/**
 * Registrar todas las herramientas principales
 */
export function registerCoreTools(userId: string, authHeaders: Record<string, string>, baseURL?: string) {
  const systemAPI = new SystemAPIService(userId, authHeaders, baseURL);

  // ============= ESTIMATE TOOLS =============

  const createEstimateTool: Tool = {
    name: 'create_estimate',
    description: 'Create a detailed construction estimate with materials, labor, and pricing',
    category: 'create',
    requiresConfirmation: false,
    parameters: [
      {
        name: 'clientName',
        type: 'string',
        description: 'Name of the client',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'clientEmail',
        type: 'string',
        description: 'Email address of the client',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'clientPhone',
        type: 'string',
        description: 'Phone number of the client',
        required: false,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'projectType',
        type: 'string',
        description: 'Type of construction project (e.g., fence, deck, patio)',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'dimensions',
        type: 'string',
        description: 'Project dimensions (e.g., "100 linear feet", "20x30 sq ft")',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'sendEmail',
        type: 'boolean',
        description: 'Whether to send the estimate to the client via email',
        required: false,
        defaultValue: true,
        canBeInferredFromSnapshot: false
      }
    ],
    execute: async (params: EstimateParams, snapshot: UserSnapshot): Promise<ToolResult> => {
      try {
        const estimate = await systemAPI.createEstimate(params);
        
        return {
          success: true,
          data: {
            estimateId: estimate.id,
            total: estimate.total,
            clientName: params.clientName,
            projectType: params.projectType,
            emailSent: params.sendEmail || false
          },
          message: `Estimate ${estimate.id} created successfully for ${params.clientName}. Total: $${estimate.total}`,
          metadata: {
            resourcesCreated: [estimate.id],
            endpointsUsed: ['/api/estimates', params.sendEmail ? '/api/estimates/send' : ''].filter(Boolean)
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Failed to create estimate: ${error.message}`
        };
      }
    }
  };

  // ============= CONTRACT TOOLS =============

  const createContractTool: Tool = {
    name: 'create_contract',
    description: 'Generate a professional legal contract with dual signature system',
    category: 'create',
    requiresConfirmation: true, // Acción crítica - requiere confirmación
    parameters: [
      {
        name: 'clientName',
        type: 'string',
        description: 'Name of the client',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'clientEmail',
        type: 'string',
        description: 'Email address of the client',
        required: false,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'projectType',
        type: 'string',
        description: 'Type of construction project',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'projectAddress',
        type: 'string',
        description: 'Address where the work will be performed',
        required: false,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'amount',
        type: 'number',
        description: 'Total contract amount in dollars',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'startDate',
        type: 'string',
        description: 'Project start date (ISO format)',
        required: false,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'endDate',
        type: 'string',
        description: 'Project completion date (ISO format)',
        required: false,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'specialTerms',
        type: 'string',
        description: 'Any special terms or conditions',
        required: false,
        canBeInferredFromSnapshot: false
      }
    ],
    execute: async (params: ContractParams, snapshot: UserSnapshot): Promise<ToolResult> => {
      try {
        // 1. Generar contenido del contrato usando Claude
        const contractContent = await claude.generateContractContent({
          clientName: params.clientName,
          projectType: params.projectType,
          projectAddress: params.projectAddress,
          amount: params.amount,
          startDate: params.startDate,
          endDate: params.endDate,
          specialTerms: params.specialTerms
        });

        // 2. Crear contrato con dual signature
        const contract = await systemAPI.createContract(params, contractContent);

        return {
          success: true,
          data: {
            contractId: contract.id,
            clientName: params.clientName,
            amount: params.amount,
            contractorSignUrl: (contract as any).contractorSignUrl,
            clientSignUrl: (contract as any).clientSignUrl,
            message: (contract as any).message
          },
          message: `Contract ${contract.id} created successfully. Dual signature URLs generated.`,
          metadata: {
            resourcesCreated: [contract.id],
            endpointsUsed: ['/api/dual-signature/initiate']
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Failed to create contract: ${error.message}`
        };
      }
    }
  };

  // ============= PROPERTY VERIFICATION TOOLS =============

  const verifyPropertyTool: Tool = {
    name: 'verify_property',
    description: 'Verify property ownership and details using real property records',
    category: 'verify',
    requiresConfirmation: false,
    parameters: [
      {
        name: 'address',
        type: 'string',
        description: 'Full property address to verify',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'includeHistory',
        type: 'boolean',
        description: 'Include historical property data',
        required: false,
        defaultValue: false,
        canBeInferredFromSnapshot: false
      }
    ],
    execute: async (params: PropertyParams, snapshot: UserSnapshot): Promise<ToolResult> => {
      try {
        const propertyData = await systemAPI.verifyProperty(params);

        return {
          success: true,
          data: {
            address: params.address,
            owner: propertyData.owner,
            propertyType: propertyData.propertyType,
            yearBuilt: propertyData.yearBuilt,
            sqft: propertyData.sqft,
            fullData: propertyData
          },
          message: `Property verified: ${propertyData.owner} owns property at ${params.address}`,
          metadata: {
            endpointsUsed: ['/api/property/details', '/api/search/property']
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Failed to verify property: ${error.message}`
        };
      }
    }
  };

  // ============= PERMIT TOOLS =============

  const getPermitInfoTool: Tool = {
    name: 'get_permit_info',
    description: 'Get required permits and regulations for a construction project',
    category: 'analyze',
    requiresConfirmation: false,
    parameters: [
      {
        name: 'projectType',
        type: 'string',
        description: 'Type of construction project',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'projectAddress',
        type: 'string',
        description: 'Project location address',
        required: true,
        canBeInferredFromSnapshot: false
      },
      {
        name: 'projectScope',
        type: 'string',
        description: 'Scope and description of the work',
        required: true,
        canBeInferredFromSnapshot: false
      }
    ],
    execute: async (params: PermitParams, snapshot: UserSnapshot): Promise<ToolResult> => {
      try {
        const permitInfo = await systemAPI.getPermitInfo(params);

        return {
          success: true,
          data: {
            required: permitInfo.required,
            permits: permitInfo.permits,
            regulations: permitInfo.regulations,
            estimatedCost: permitInfo.estimatedCost,
            fullInfo: permitInfo
          },
          message: `Permit analysis complete. ${permitInfo.required ? 'Permits ARE required' : 'No permits required'} for this project.`,
          metadata: {
            endpointsUsed: ['/api/permits/check', '/api/search/permits']
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Failed to get permit information: ${error.message}`
        };
      }
    }
  };

  // ============= CONTEXT TOOLS =============

  const getClientHistoryTool: Tool = {
    name: 'get_client_history',
    description: 'Get previous estimates and contracts for a specific client',
    category: 'read',
    requiresConfirmation: false,
    parameters: [
      {
        name: 'clientName',
        type: 'string',
        description: 'Name of the client to search for',
        required: true,
        canBeInferredFromSnapshot: false
      }
    ],
    execute: async (params: { clientName: string }, snapshot: UserSnapshot): Promise<ToolResult> => {
      try {
        // Buscar en el snapshot
        const clientEstimates = snapshot.estimates.recent.filter(
          e => e.clientName.toLowerCase().includes(params.clientName.toLowerCase())
        );
        
        const clientContracts = snapshot.contracts.recent.filter(
          c => c.clientName.toLowerCase().includes(params.clientName.toLowerCase())
        );

        return {
          success: true,
          data: {
            clientName: params.clientName,
            estimates: clientEstimates,
            contracts: clientContracts,
            totalEstimates: clientEstimates.length,
            totalContracts: clientContracts.length
          },
          message: `Found ${clientEstimates.length} estimates and ${clientContracts.length} contracts for ${params.clientName}`
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Failed to get client history: ${error.message}`
        };
      }
    }
  };

  // ============= REGISTRAR TODAS LAS HERRAMIENTAS =============

  toolRegistry.registerTool(createEstimateTool);
  toolRegistry.registerTool(createContractTool);
  toolRegistry.registerTool(verifyPropertyTool);
  toolRegistry.registerTool(getPermitInfoTool);
  toolRegistry.registerTool(getClientHistoryTool);

  console.log('✅ [CORE-TOOLS] Registradas 5 herramientas principales');
}

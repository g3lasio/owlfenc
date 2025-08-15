/**
 * MERVIN AI SYSTEM - PUNTO DE ENTRADA PRINCIPAL
 * 
 * Exporta todos los componentes del nuevo sistema de agente autónomo
 * para facilitar la importación y uso en toda la aplicación.
 */

// Core system
export { MervinAgent } from './core/MervinAgent';
export { IntentionEngine } from './core/IntentionEngine';
export { TaskOrchestrator } from './core/TaskOrchestrator';
export { SmartTaskCoordinator } from './core/SmartTaskCoordinator';
export { ParallelExecutionEngine } from './core/ParallelExecutionEngine';
export { ContextManager } from './core/ContextManager';

// Services
export { EndpointCoordinator } from './services/EndpointCoordinator';
export { AgentMemory } from './services/AgentMemory';
export { PermissionValidator } from './services/PermissionValidator';

// Task agents
export { EstimateTaskAgent } from './tasks/EstimateTaskAgent';
export { ContractTaskAgent } from './tasks/ContractTaskAgent';
export { PermitTaskAgent } from './tasks/PermitTaskAgent';
export { PropertyTaskAgent } from './tasks/PropertyTaskAgent';

// UI components
export { MervinChat } from './ui/MervinChat';

// Types
export type { 
  AgentConfig, 
  AgentState, 
  TaskResult 
} from './core/MervinAgent';

export type { 
  UserIntention, 
  TaskExecutionPlan, 
  TaskStep 
} from './core/IntentionEngine';

export type { 
  TaskProgress 
} from './core/TaskOrchestrator';

export type { 
  EstimateRequest, 
  EstimateResult 
} from './tasks/EstimateTaskAgent';

export type { 
  ContractRequest, 
  ContractResult 
} from './tasks/ContractTaskAgent';

export type { 
  PermitRequest, 
  PermitResult 
} from './tasks/PermitTaskAgent';

export type { 
  PropertyRequest, 
  PropertyResult 
} from './tasks/PropertyTaskAgent';

// Demo
export { SmartCoordinatorDemo, runSmartCoordinatorDemo } from './demo/SmartCoordinatorDemo';
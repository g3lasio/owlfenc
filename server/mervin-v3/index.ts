/**
 * MERVIN V3 - MODO AGENTE
 * 
 * Exportaciones principales del sistema de modo agente.
 */

export { AgentCore } from './agent/AgentCore';
export { TaskPlanner } from './agent/TaskPlanner';
export { StepExecutor } from './agent/StepExecutor';

export { 
  processWithAgentV3, 
  shouldUseAgentV3, 
  hasAgentV3Access 
} from './integration/AgentIntegration';

export type {
  TaskPlan,
  PlanStep,
  PlanningContext,
  ExecutionContext,
  AgentResponse,
  AgentConfig,
  Scratchpad
} from './types/agent-types';

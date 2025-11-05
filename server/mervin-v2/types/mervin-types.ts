/**
 * MERVIN AI V2 - TIPOS TYPESCRIPT
 * Definiciones de tipos para toda la arquitectura V2
 */

// ============= REQUEST/RESPONSE TYPES =============

export interface FileAttachment {
  filename: string;
  mimeType: string;
  size: number;
  content: string; // Base64 or extracted text content
  extractedText?: string; // For PDFs, images with OCR, etc.
  metadata?: Record<string, any>;
}

export interface MervinRequest {
  input: string;
  userId: string;
  conversationHistory?: Message[];
  language?: 'es' | 'en';
  attachments?: FileAttachment[];
}

export interface MervinResponse {
  type: 'CONVERSATION' | 'TASK_COMPLETED' | 'TASK_ERROR' | 'NEEDS_MORE_INFO';
  message: string;
  data?: any;
  executionTime?: number;
  taskProgress?: TaskProgress;
  suggestedActions?: string[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// ============= TASK TYPES =============

export type TaskType = 
  | 'estimate' 
  | 'contract' 
  | 'permit' 
  | 'property' 
  | 'conversation'
  | 'research';

export interface TaskIntent {
  type: TaskType;
  confidence: number;
  needsMoreInfo: boolean;
  requiredParameters: string[];
  extractedParameters: Record<string, any>;
}

export interface TaskProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  progress: number; // 0-100
  estimatedTimeRemaining: number; // seconds
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  stepsCompleted: string[];
  endpointsUsed: string[];
}

// ============= ANALYSIS TYPES =============

export interface QuickAnalysis {
  isSimpleConversation: boolean;
  isExecutableTask: boolean;
  isWorkflow?: boolean; // True si requiere workflow multi-paso completo
  workflowType?: 'estimate_wizard' | 'contract_generator' | 'permit_advisor' | 'property_verifier' | null;
  needsDeepThinking: boolean;
  needsWebResearch: boolean;
  taskType?: TaskType;
  confidence: number;
  language: 'es' | 'en';
}

// ============= PARAMETER TYPES =============

export interface EstimateParams {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  projectType: string;
  dimensions: string;
  sendEmail?: boolean;
  needsResearch?: boolean;
}

export interface ContractParams {
  clientName: string;
  clientEmail?: string;
  projectType: string;
  projectAddress?: string;
  amount: number;
  startDate?: string;
  endDate?: string;
  specialTerms?: string;
}

export interface PermitParams {
  projectType: string;
  projectAddress: string;
  projectScope: string;
}

export interface PropertyParams {
  address: string;
  includeHistory?: boolean;
}

export type TaskParameters = EstimateParams | ContractParams | PermitParams | PropertyParams;

// ============= AI SERVICE TYPES =============

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============= SYSTEM API TYPES =============

export interface PropertyData {
  owner: string;
  propertyType: string;
  yearBuilt?: number;
  sqft?: number;
  address: string;
  [key: string]: any;
}

export interface EstimateCalculation {
  id: string;
  total: number;
  materials: any[];
  labor: any;
  clientId: string;
  [key: string]: any;
}

export interface PDF {
  url: string;
  id: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  [key: string]: any;
}

export interface Contract {
  id: string;
  content: string;
  clientId: string;
  amount: number;
  [key: string]: any;
}

export interface PermitInfo {
  required: boolean;
  permits: string[];
  regulations: string[];
  estimatedCost?: number;
  [key: string]: any;
}

// ============= WEB RESEARCH TYPES =============

export interface MarketData {
  materials: MaterialPrice[];
  averagePrice: number;
  sources: string[];
  timestamp: Date;
}

export interface MaterialPrice {
  name: string;
  price: number;
  unit: string;
  source: string;
}

export interface RegulationInfo {
  location: string;
  regulations: string[];
  permitTypes: string[];
  sources: string[];
}

export interface SearchResults {
  results: SearchResult[];
  query: string;
  totalResults: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

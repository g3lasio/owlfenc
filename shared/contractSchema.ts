/**
 * Unified Contract Data Schema and Types
 * Central definition for all contract-related data structures
 */

import { z } from 'zod';

// Base contract data schema
export const contractDataSchema = z.object({
  // Client Information
  clientName: z.string().min(1, "Nombre del cliente requerido"),
  clientAddress: z.string().min(1, "Dirección del cliente requerida"),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email().optional(),
  
  // Project Information
  projectType: z.string().min(1, "Tipo de proyecto requerido"),
  projectDescription: z.string().min(1, "Descripción del proyecto requerida"),
  projectLocation: z.string().min(1, "Ubicación del proyecto requerida"),
  
  // Contractor Information
  contractorName: z.string().default("OWL FENCE LLC"),
  contractorAddress: z.string().optional(),
  contractorPhone: z.string().optional(),
  contractorEmail: z.string().optional(),
  contractorLicense: z.string().optional(),
  
  // Financial Information
  totalAmount: z.string().min(1, "Monto total requerido"),
  depositAmount: z.string().optional(),
  paymentTerms: z.string().optional(),
  
  // Contract Terms
  startDate: z.date().optional(),
  completionDate: z.date().optional(),
  warrantyPeriod: z.string().optional(),
  
  // Legal Protection Data
  riskLevel: z.enum(['bajo', 'medio', 'alto', 'crítico']).optional(),
  protectiveClause: z.array(z.string()).optional(),
  
  // Processing Status
  isComplete: z.boolean().default(false),
  missingFields: z.array(z.string()).default([]),
  dataSource: z.enum(['manual', 'ocr', 'project']).default('manual')
});

export type ContractData = z.infer<typeof contractDataSchema>;

// OCR Processing Result
export const ocrResultSchema = z.object({
  success: z.boolean(),
  extractedData: contractDataSchema.partial(),
  confidence: z.number().min(0).max(100),
  missingFields: z.array(z.string()),
  rawText: z.string().optional(),
  processingTime: z.number().optional()
});

export type OCRResult = z.infer<typeof ocrResultSchema>;

// Contract Generation Request
export const contractGenerationRequestSchema = z.object({
  contractData: contractDataSchema,
  template: z.enum(['standard', 'defensive', 'veteran']).default('defensive'),
  protectionLevel: z.enum(['basic', 'standard', 'maximum']).default('standard'),
  includeRiskAnalysis: z.boolean().default(true)
});

export type ContractGenerationRequest = z.infer<typeof contractGenerationRequestSchema>;

// Generated Contract Response
export const generatedContractSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  html: z.string(),
  contractData: contractDataSchema,
  riskAnalysis: z.object({
    riskLevel: z.enum(['bajo', 'medio', 'alto', 'crítico']),
    riskScore: z.number(),
    protectiveRecommendations: z.array(z.string()),
    contractorProtections: z.array(z.string()),
    paymentSafeguards: z.array(z.string()),
    liabilityShields: z.array(z.string())
  }).optional(),
  protections: z.array(z.string()).default([]),
  status: z.enum(['draft', 'preview', 'approved', 'sent', 'signed', 'completed']).default('draft'),
  generatedAt: z.string(),
  approvedAt: z.string().optional(),
  signedAt: z.string().optional()
});

export type GeneratedContract = z.infer<typeof generatedContractSchema>;

// Contract Storage Schema (for Firebase)
export const contractStorageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string(),
  contractData: contractDataSchema,
  html: z.string(),
  status: z.enum(['draft', 'preview', 'approved', 'sent', 'signed', 'completed']),
  riskAnalysis: z.object({
    riskLevel: z.enum(['bajo', 'medio', 'alto', 'crítico']),
    protections: z.array(z.string())
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().optional(),
  sentAt: z.string().optional(),
  signedAt: z.string().optional(),
  version: z.number().default(1)
});

export type ContractStorage = z.infer<typeof contractStorageSchema>;

// Missing Field Detection
export interface MissingFieldInfo {
  field: string;
  displayName: string;
  required: boolean;
  suggestedValue?: string;
  reason: string;
}

// Contract Processing Status
export interface ProcessingStatus {
  step: 'ocr' | 'validation' | 'generation' | 'preview' | 'approval' | 'storage';
  progress: number;
  message: string;
  completed: boolean;
}
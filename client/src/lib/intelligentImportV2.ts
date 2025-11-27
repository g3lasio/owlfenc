import { apiRequest } from './queryClient';

export interface ImportedContact {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  source?: string;
  classification?: string;
  tags?: string[];
}

export interface ImportIssue {
  type: 'structural' | 'semantic' | 'validation' | 'duplicate';
  severity: 'error' | 'warning' | 'info';
  rowIndex: number;
  columnIndex?: number;
  field?: string;
  message: string;
  originalValue?: string;
  suggestedValue?: string;
  confidence: number;
}

export interface ColumnAnalysis {
  index: number;
  header: string;
  detectedType: 'name' | 'email' | 'phone' | 'address' | 'city' | 'state' | 'zipCode' | 'notes' | 'unknown' | 'mixed';
  confidence: number;
  samples: string[];
  issues: string[];
  suggestedMapping: string;
}

export interface StructuralAnalysis {
  hasHeaders: boolean;
  headerRow: string[];
  totalRows: number;
  totalColumns: number;
  emptyRows: number[];
  inconsistentRowLengths: number[];
  mergedCellsDetected: boolean;
  concatenatedColumnsDetected: number[];
  overallQuality: 'good' | 'fair' | 'poor' | 'corrupted';
  issues: ImportIssue[];
}

export interface ImportV2Response {
  success: boolean;
  jobId: string;
  phase: string;
  contacts: ImportedContact[];
  structuralAnalysis?: StructuralAnalysis;
  columnAnalysis?: ColumnAnalysis[];
  issues: ImportIssue[];
  duplicates: Array<{ contact: ImportedContact; existingMatch: string; confidence: number }>;
  stats: {
    totalRows: number;
    validContacts: number;
    issuesFound: number;
    duplicatesFound: number;
    autoCorrections: number;
    aiAssisted: number;
  };
  error?: string;
}

export interface ImportConfirmResponse {
  success: boolean;
  savedCount: number;
  totalAttempted: number;
  errors?: string[];
}

export async function processImportV2(csvContent: string, fileType: 'csv' | 'excel' = 'csv'): Promise<ImportV2Response> {
  const response = await apiRequest('POST', '/api/intelligent-import/v2/process', {
    csvContent,
    fileType,
  });
  return response.json();
}

export async function confirmImportV2(
  contacts: ImportedContact[],
  includeDuplicates: boolean = false,
  duplicatesToInclude: ImportedContact[] = []
): Promise<ImportConfirmResponse> {
  const response = await apiRequest('POST', '/api/intelligent-import/v2/confirm', {
    contacts,
    includeDuplicates,
    duplicatesToInclude,
  });
  return response.json();
}

export function getQualityColor(quality: StructuralAnalysis['overallQuality']): string {
  switch (quality) {
    case 'good': return 'text-green-600 bg-green-50 border-green-200';
    case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'poor': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'corrupted': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
  if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

export function formatIssueMessage(issue: ImportIssue): string {
  const prefix = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
  let message = `${prefix} Row ${issue.rowIndex + 1}`;
  if (issue.field) message += ` (${issue.field})`;
  message += `: ${issue.message}`;
  return message;
}

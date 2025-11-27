import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { NormalizationToolkit, AutoCleanService } from './autoCleanService';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ImportedContact {
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

export interface ImportJobResult {
  success: boolean;
  jobId: string;
  phase: 'ingestion' | 'structural' | 'semantic' | 'normalization' | 'validation' | 'complete';
  structuralAnalysis?: StructuralAnalysis;
  columnAnalysis?: ColumnAnalysis[];
  normalizedContacts: ImportedContact[];
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
}

export class IntelligentImportPipeline {
  private autoCleanService = new AutoCleanService();
  
  async processFile(
    fileContent: string, 
    fileType: 'csv' | 'excel',
    existingContacts?: Array<{ email?: string; phone?: string; name?: string }>
  ): Promise<ImportJobResult> {
    const jobId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`🚀 [IMPORT-PIPELINE] Starting job ${jobId}`);
    
    const result: ImportJobResult = {
      success: false,
      jobId,
      phase: 'ingestion',
      normalizedContacts: [],
      issues: [],
      duplicates: [],
      stats: {
        totalRows: 0,
        validContacts: 0,
        issuesFound: 0,
        duplicatesFound: 0,
        autoCorrections: 0,
        aiAssisted: 0,
      },
    };

    try {
      const rows = this.phase0_ingest(fileContent, fileType);
      result.stats.totalRows = rows.length - 1;
      result.phase = 'structural';

      const structural = await this.phase1_structuralAnalysis(rows);
      result.structuralAnalysis = structural;
      result.issues.push(...structural.issues);
      result.phase = 'semantic';

      const { columns, mappedRows } = await this.phase2_semanticMapping(structural.headerRow, rows.slice(1), structural);
      result.columnAnalysis = columns;
      result.phase = 'normalization';

      const { contacts, corrections } = await this.phase3_normalization(mappedRows, columns);
      result.stats.autoCorrections = corrections;
      result.phase = 'validation';

      const { validatedContacts, validationIssues, duplicates } = await this.phase4_validationAndDedupe(
        contacts, 
        existingContacts || []
      );
      
      result.normalizedContacts = validatedContacts;
      result.issues.push(...validationIssues);
      result.duplicates = duplicates;
      result.stats.validContacts = validatedContacts.length;
      result.stats.issuesFound = result.issues.length;
      result.stats.duplicatesFound = duplicates.length;
      result.phase = 'complete';
      result.success = true;

      console.log(`✅ [IMPORT-PIPELINE] Job ${jobId} complete: ${validatedContacts.length} contacts imported`);
    } catch (error) {
      console.error(`❌ [IMPORT-PIPELINE] Job ${jobId} failed:`, error);
      result.issues.push({
        type: 'structural',
        severity: 'error',
        rowIndex: -1,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 1,
      });
    }

    return result;
  }

  private phase0_ingest(content: string, type: 'csv' | 'excel'): string[][] {
    console.log('📥 [PHASE-0] Ingesting file...');
    
    if (type === 'csv') {
      return this.parseCSV(content);
    }
    
    throw new Error('Excel parsing requires server-side xlsx library');
  }

  private parseCSV(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
    
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell !== '')) {
        rows.push(currentRow);
      }
    }
    
    return rows;
  }

  private async phase1_structuralAnalysis(rows: string[][]): Promise<StructuralAnalysis> {
    console.log('🔍 [PHASE-1] Analyzing structure...');
    
    const issues: ImportIssue[] = [];
    const emptyRows: number[] = [];
    const inconsistentRowLengths: number[] = [];
    const concatenatedColumns: number[] = [];
    
    if (rows.length === 0) {
      return {
        hasHeaders: false,
        headerRow: [],
        totalRows: 0,
        totalColumns: 0,
        emptyRows: [],
        inconsistentRowLengths: [],
        mergedCellsDetected: false,
        concatenatedColumnsDetected: [],
        overallQuality: 'corrupted',
        issues: [{
          type: 'structural',
          severity: 'error',
          rowIndex: 0,
          message: 'File is empty or could not be parsed',
          confidence: 1,
        }],
      };
    }

    const headerRow = rows[0];
    const expectedColumns = headerRow.length;

    const hasHeaders = this.detectHeaders(headerRow, rows.slice(1, 5));
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      if (row.every(cell => !cell || cell.trim() === '')) {
        emptyRows.push(i);
        continue;
      }
      
      if (row.length !== expectedColumns) {
        inconsistentRowLengths.push(i);
        issues.push({
          type: 'structural',
          severity: 'warning',
          rowIndex: i,
          message: `Row has ${row.length} columns, expected ${expectedColumns}`,
          confidence: 0.9,
        });
      }
      
      for (let j = 0; j < row.length; j++) {
        const cell = row[j];
        if (cell && cell.length > 50) {
          const concat = NormalizationToolkit.detectConcatenatedData(cell);
          if (concat.isConcatenated) {
            if (!concatenatedColumns.includes(j)) {
              concatenatedColumns.push(j);
            }
            issues.push({
              type: 'structural',
              severity: 'warning',
              rowIndex: i,
              columnIndex: j,
              message: 'Possible concatenated data detected',
              originalValue: cell,
              suggestedValue: concat.parts.join(' | '),
              confidence: concat.confidence,
            });
          }
        }
      }
    }

    let overallQuality: 'good' | 'fair' | 'poor' | 'corrupted' = 'good';
    const totalDataRows = rows.length - 1;
    const issueRatio = (inconsistentRowLengths.length + emptyRows.length) / Math.max(1, totalDataRows);
    
    if (issueRatio > 0.5) overallQuality = 'corrupted';
    else if (issueRatio > 0.2) overallQuality = 'poor';
    else if (issueRatio > 0.05 || concatenatedColumns.length > 0) overallQuality = 'fair';

    console.log(`📊 [PHASE-1] Quality: ${overallQuality}, Issues: ${issues.length}`);

    return {
      hasHeaders,
      headerRow,
      totalRows: rows.length,
      totalColumns: expectedColumns,
      emptyRows,
      inconsistentRowLengths,
      mergedCellsDetected: concatenatedColumns.length > 2,
      concatenatedColumnsDetected: concatenatedColumns,
      overallQuality,
      issues,
    };
  }

  private detectHeaders(firstRow: string[], sampleRows: string[][]): boolean {
    const firstRowHasEmails = firstRow.some(cell => NormalizationToolkit.isEmail(cell).isEmail);
    const firstRowHasPhones = firstRow.some(cell => NormalizationToolkit.isPhone(cell).isPhone);
    
    if (firstRowHasEmails || firstRowHasPhones) {
      return false;
    }

    const headerKeywords = /^(name|nombre|email|correo|phone|tel|address|direc|city|ciudad|state|estado|zip|postal|notes|notas|client|contact)/i;
    const hasKeywords = firstRow.some(cell => headerKeywords.test(cell));
    
    if (hasKeywords) return true;

    const firstRowAllText = firstRow.every(cell => !/^\d+$/.test(cell));
    const dataRowsHaveNumbers = sampleRows.some(row => row.some(cell => /^\d+$/.test(cell)));
    
    return firstRowAllText && dataRowsHaveNumbers;
  }

  private async phase2_semanticMapping(
    headers: string[], 
    dataRows: string[][], 
    structural: StructuralAnalysis
  ): Promise<{ columns: ColumnAnalysis[]; mappedRows: Record<string, string>[] }> {
    console.log('🧠 [PHASE-2] Semantic mapping...');
    
    const columns: ColumnAnalysis[] = [];
    const usedFields = new Set<string>();

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i] || `Column${i + 1}`;
      const samples = dataRows.slice(0, 10).map(row => row[i] || '').filter(v => v.trim());
      
      const analysis = this.analyzeColumn(header, samples, usedFields);
      columns.push({
        index: i,
        header,
        ...analysis,
        samples: samples.slice(0, 3),
      });
      
      if (analysis.suggestedMapping !== 'unknown') {
        usedFields.add(analysis.suggestedMapping);
      }
    }

    if (structural.overallQuality === 'corrupted' || columns.every(c => c.confidence < 0.5)) {
      console.log('🤖 [PHASE-2] Low confidence, invoking AI for mapping...');
      const aiMappings = await this.getAIMappings(headers, dataRows.slice(0, 5));
      
      for (let i = 0; i < columns.length; i++) {
        if (aiMappings[i] && columns[i].confidence < 0.7) {
          columns[i].suggestedMapping = aiMappings[i];
          columns[i].confidence = 0.8;
          columns[i].issues.push('AI-assisted mapping');
        }
      }
    }

    const mappedRows = dataRows.map(row => {
      const mapped: Record<string, string> = {};
      for (const col of columns) {
        if (col.suggestedMapping !== 'unknown') {
          const value = row[col.index] || '';
          if (value.trim()) {
            if (mapped[col.suggestedMapping]) {
              mapped[col.suggestedMapping] += ' ' + value.trim();
            } else {
              mapped[col.suggestedMapping] = value.trim();
            }
          }
        }
      }
      return mapped;
    });

    console.log(`✅ [PHASE-2] Mapped ${columns.length} columns`);
    return { columns, mappedRows };
  }

  private analyzeColumn(header: string, samples: string[], usedFields: Set<string>): Omit<ColumnAnalysis, 'index' | 'header' | 'samples'> {
    const issues: string[] = [];
    const lowerHeader = header.toLowerCase();

    const headerMappings: Record<string, string[]> = {
      name: ['name', 'nombre', 'client', 'cliente', 'contact', 'contacto', 'customer', 'full name', 'nombre completo'],
      email: ['email', 'correo', 'e-mail', 'mail', 'electronic', 'electrónico'],
      phone: ['phone', 'tel', 'teléfono', 'telefono', 'fono', 'cell', 'celular', 'móvil', 'movil', 'mobile'],
      address: ['address', 'dirección', 'direccion', 'street', 'calle', 'domicilio', 'ubicación', 'location'],
      city: ['city', 'ciudad', 'town', 'localidad', 'municipio'],
      state: ['state', 'estado', 'province', 'provincia', 'región', 'region'],
      zipCode: ['zip', 'postal', 'código postal', 'cp', 'codigo postal', 'zipcode'],
      notes: ['notes', 'notas', 'comment', 'comentario', 'observation', 'observación'],
    };

    let detectedType: ColumnAnalysis['detectedType'] = 'unknown';
    let confidence = 0;
    let suggestedMapping = 'unknown';

    for (const [field, keywords] of Object.entries(headerMappings)) {
      if (keywords.some(kw => lowerHeader.includes(kw))) {
        detectedType = field as ColumnAnalysis['detectedType'];
        suggestedMapping = field;
        confidence = 0.85;
        break;
      }
    }

    if (confidence < 0.7 && samples.length > 0) {
      const contentAnalysis = this.analyzeContentType(samples);
      if (contentAnalysis.confidence > confidence) {
        detectedType = contentAnalysis.type;
        suggestedMapping = contentAnalysis.type === 'mixed' ? 'unknown' : contentAnalysis.type;
        confidence = contentAnalysis.confidence;
        if (contentAnalysis.issues.length > 0) {
          issues.push(...contentAnalysis.issues);
        }
      }
    }

    if (usedFields.has(suggestedMapping) && suggestedMapping !== 'unknown') {
      if (suggestedMapping === 'phone') {
        suggestedMapping = 'mobilePhone';
      } else if (suggestedMapping === 'address') {
        issues.push('Duplicate address column - will be merged');
      } else {
        issues.push(`Field ${suggestedMapping} already mapped`);
        suggestedMapping = 'notes';
        confidence *= 0.7;
      }
    }

    return { detectedType, confidence, issues, suggestedMapping };
  }

  private analyzeContentType(samples: string[]): { type: ColumnAnalysis['detectedType']; confidence: number; issues: string[] } {
    const counts = { email: 0, phone: 0, address: 0, city: 0, state: 0, zipCode: 0, name: 0, unknown: 0 };
    const issues: string[] = [];
    
    for (const sample of samples) {
      if (!sample.trim()) continue;
      
      const emailCheck = NormalizationToolkit.isEmail(sample);
      if (emailCheck.isEmail) { counts.email++; continue; }
      
      const phoneCheck = NormalizationToolkit.isPhone(sample);
      if (phoneCheck.isPhone) { counts.phone++; continue; }
      
      const zipCheck = NormalizationToolkit.isZipCode(sample);
      if (zipCheck.isZip) { counts.zipCode++; continue; }
      
      const stateCheck = NormalizationToolkit.isState(sample);
      if (stateCheck.isState) { counts.state++; continue; }
      
      const addressCheck = NormalizationToolkit.isAddress(sample);
      if (addressCheck.isAddress) { counts.address++; continue; }
      
      const cityCheck = NormalizationToolkit.isCity(sample);
      if (cityCheck.isCity) { counts.city++; continue; }
      
      if (/^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-\.]+$/.test(sample) && sample.length > 2 && sample.length < 50) {
        counts.name++;
        continue;
      }
      
      counts.unknown++;
    }

    const total = samples.filter(s => s.trim()).length;
    if (total === 0) return { type: 'unknown', confidence: 0, issues: [] };

    let maxType: ColumnAnalysis['detectedType'] = 'unknown';
    let maxCount = 0;
    
    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type as ColumnAnalysis['detectedType'];
      }
    }

    const confidence = maxCount / total;
    
    if (confidence < 0.6 && counts.unknown < total * 0.5) {
      issues.push('Mixed content types detected');
      return { type: 'mixed', confidence: 0.5, issues };
    }

    return { type: maxType, confidence, issues };
  }

  private async getAIMappings(headers: string[], sampleRows: string[][]): Promise<string[]> {
    try {
      const prompt = `Analyze these CSV headers and sample data. Map each column to the correct field type.

HEADERS: ${JSON.stringify(headers)}

SAMPLE DATA:
${sampleRows.map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`).join('\n')}

Return ONLY a JSON array with the field type for each column in order.
Valid types: "name", "email", "phone", "address", "city", "state", "zipCode", "notes", "unknown"

Example: ["name", "email", "phone", "address", "unknown"]

Respond with ONLY the JSON array, no explanation.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0,
      });

      const content = response.choices[0]?.message?.content?.trim() || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('❌ [PHASE-2] AI mapping failed:', error);
    }
    
    return headers.map(() => 'unknown');
  }

  private async phase3_normalization(
    mappedRows: Record<string, string>[], 
    columns: ColumnAnalysis[]
  ): Promise<{ contacts: ImportedContact[]; corrections: number }> {
    console.log('🧹 [PHASE-3] Normalizing data...');
    
    let totalCorrections = 0;
    const contacts: ImportedContact[] = [];

    for (const row of mappedRows) {
      if (!row.name && !row.email && !row.phone) continue;

      const contact: ImportedContact = {
        name: row.name || '',
        email: row.email ? NormalizationToolkit.normalizeEmail(row.email) : undefined,
        phone: row.phone ? NormalizationToolkit.normalizePhone(row.phone) : undefined,
        mobilePhone: row.mobilePhone ? NormalizationToolkit.normalizePhone(row.mobilePhone) : undefined,
        address: row.address,
        city: row.city,
        state: row.state,
        zipCode: row.zipCode,
        notes: row.notes,
        source: 'CSV Import',
        classification: 'cliente',
      };

      if (contact.phone) {
        const currentPhone = contact.phone;
        const phoneCheck = NormalizationToolkit.isPhone(currentPhone);
        if (!phoneCheck.isPhone) {
          const addressCheck = NormalizationToolkit.isAddress(currentPhone);
          if (addressCheck.isAddress && addressCheck.confidence > 0.7) {
            if (!contact.address) {
              contact.address = currentPhone;
            }
            contact.phone = undefined;
            totalCorrections++;
          }
          
          if (contact.phone) {
            const emailFound = NormalizationToolkit.extractEmailFromText(contact.phone);
            if (emailFound && !contact.email) {
              contact.email = emailFound;
              contact.phone = contact.phone.replace(emailFound, '').trim() || undefined;
              totalCorrections++;
            }
          }
        }
      }

      if (contact.address) {
        const concat = NormalizationToolkit.detectConcatenatedData(contact.address);
        if (concat.isConcatenated && concat.suggestedSplit) {
          const split = concat.suggestedSplit;
          if (split.address) contact.address = split.address;
          if (split.city && !contact.city) contact.city = split.city;
          if (split.state && !contact.state) contact.state = split.state;
          if (split.zip && !contact.zipCode) contact.zipCode = split.zip;
          totalCorrections++;
        }
      }

      if (contact.state) {
        const stateCheck = NormalizationToolkit.isState(contact.state);
        if (stateCheck.isState) {
          contact.state = stateCheck.normalized;
        }
      }

      if (!contact.name) {
        contact.name = contact.email?.split('@')[0] || 
                       `Contact ${Date.now().toString(36)}`;
      }

      contacts.push(contact);
    }

    console.log(`✅ [PHASE-3] Normalized ${contacts.length} contacts, ${totalCorrections} auto-corrections`);
    return { contacts, corrections: totalCorrections };
  }

  private async phase4_validationAndDedupe(
    contacts: ImportedContact[],
    existingContacts: Array<{ email?: string; phone?: string; name?: string }>
  ): Promise<{
    validatedContacts: ImportedContact[];
    validationIssues: ImportIssue[];
    duplicates: Array<{ contact: ImportedContact; existingMatch: string; confidence: number }>;
  }> {
    console.log('✅ [PHASE-4] Validating and deduplicating...');
    
    const validationIssues: ImportIssue[] = [];
    const duplicates: Array<{ contact: ImportedContact; existingMatch: string; confidence: number }> = [];
    const validatedContacts: ImportedContact[] = [];
    
    const existingEmails = new Set(existingContacts.map(c => c.email?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set(existingContacts.map(c => this.normalizePhoneForComparison(c.phone)).filter(Boolean));
    
    const seenInBatch = {
      emails: new Set<string>(),
      phones: new Set<string>(),
    };

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      let isDuplicate = false;
      let duplicateMatch = '';
      let duplicateConfidence = 0;

      if (contact.email) {
        const normalizedEmail = contact.email.toLowerCase();
        
        if (existingEmails.has(normalizedEmail)) {
          isDuplicate = true;
          duplicateMatch = `Existing contact with email ${contact.email}`;
          duplicateConfidence = 1.0;
        } else if (seenInBatch.emails.has(normalizedEmail)) {
          isDuplicate = true;
          duplicateMatch = `Duplicate in import batch: ${contact.email}`;
          duplicateConfidence = 1.0;
        } else {
          seenInBatch.emails.add(normalizedEmail);
        }
      }

      if (!isDuplicate && contact.phone) {
        const normalizedPhone = this.normalizePhoneForComparison(contact.phone);
        
        if (normalizedPhone && existingPhones.has(normalizedPhone)) {
          isDuplicate = true;
          duplicateMatch = `Existing contact with phone ${contact.phone}`;
          duplicateConfidence = 0.95;
        } else if (normalizedPhone && seenInBatch.phones.has(normalizedPhone)) {
          isDuplicate = true;
          duplicateMatch = `Duplicate in import batch: ${contact.phone}`;
          duplicateConfidence = 0.95;
        } else if (normalizedPhone) {
          seenInBatch.phones.add(normalizedPhone);
        }
      }

      if (contact.email) {
        const emailCheck = NormalizationToolkit.isEmail(contact.email);
        if (!emailCheck.isEmail) {
          validationIssues.push({
            type: 'validation',
            severity: 'warning',
            rowIndex: i,
            field: 'email',
            message: 'Invalid email format',
            originalValue: contact.email,
            confidence: 0.9,
          });
        }
      }

      if (contact.phone) {
        const phoneCheck = NormalizationToolkit.isPhone(contact.phone);
        if (!phoneCheck.isPhone) {
          validationIssues.push({
            type: 'validation',
            severity: 'warning',
            rowIndex: i,
            field: 'phone',
            message: 'Invalid phone format',
            originalValue: contact.phone,
            confidence: 0.9,
          });
        }
      }

      if (isDuplicate) {
        duplicates.push({
          contact,
          existingMatch: duplicateMatch,
          confidence: duplicateConfidence,
        });
      } else {
        validatedContacts.push(contact);
      }
    }

    console.log(`✅ [PHASE-4] Validated: ${validatedContacts.length}, Duplicates: ${duplicates.length}, Issues: ${validationIssues.length}`);
    return { validatedContacts, validationIssues, duplicates };
  }

  private normalizePhoneForComparison(phone?: string): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
    return null;
  }

  async processCorruptedRow(row: string[], headers: string[]): Promise<ImportedContact | null> {
    try {
      const prompt = `Parse this corrupted CSV row into a contact. Data may be in wrong columns or concatenated.

Headers: ${JSON.stringify(headers)}
Row data: ${JSON.stringify(row)}

Extract and return a JSON object with these fields:
- name: Full name
- email: Email address (if found)
- phone: Phone number (if found)
- address: Street address (if found)
- city: City (if found)
- state: State abbreviation (if found)
- zipCode: ZIP code (if found)

Be intelligent about:
- Separating concatenated data (e.g., "123 Main StNew York" → address: "123 Main St", city: "New York")
- Finding data in wrong columns (e.g., phone number in address field)
- Extracting embedded emails from text
- Normalizing state names to abbreviations

Return ONLY a valid JSON object.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0,
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          name: parsed.name || 'Unknown',
          email: parsed.email,
          phone: parsed.phone,
          address: parsed.address,
          city: parsed.city,
          state: parsed.state,
          zipCode: parsed.zipCode,
          source: 'AI-assisted import',
          classification: 'cliente',
        };
      }
    } catch (error) {
      console.error('❌ [AI-PARSE] Failed to parse corrupted row:', error);
    }
    
    return null;
  }
}

export const intelligentImportPipeline = new IntelligentImportPipeline();

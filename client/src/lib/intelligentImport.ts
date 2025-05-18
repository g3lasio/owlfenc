import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ColumnMapping {
  originalHeader: string;
  detectedType: string;
  targetField: string;
  confidence: number;
  examples: string[];
}

export interface CSVAnalysisResult {
  mappings: ColumnMapping[];
  headerRow: string[];
  sampleRows: string[][];
  hasHeaderRow: boolean;
}

/**
 * Analyzes a CSV file to detect column types and suggest mappings
 * @param csvData The raw CSV data as a string
 * @returns Analysis result with column mappings
 */
export const analyzeCSVStructure = async (csvData: string): Promise<CSVAnalysisResult> => {
  try {
    // Parse the CSV
    const rows = csvData.split('\n')
      .map(row => row.split(',').map(cell => cell.trim()))
      .filter(row => row.some(cell => cell.length > 0)); // Filter out empty rows
    
    if (rows.length === 0) {
      throw new Error("El archivo CSV está vacío");
    }

    // Check if first row is likely a header row
    const firstRow = rows[0];
    const secondRow = rows.length > 1 ? rows[1] : [];
    
    // Determine if first row is a header by checking if it has text patterns different from data rows
    let hasHeaderRow = true;
    
    if (rows.length > 1) {
      const firstRowAllText = firstRow.every(cell => isNaN(Number(cell)));
      const secondRowHasNumbers = secondRow.some(cell => !isNaN(Number(cell)) && cell.length > 0);
      
      // If first row has distinctly different pattern than second row, it's likely a header
      hasHeaderRow = firstRowAllText && secondRowHasNumbers;
    }
    
    const headerRow = hasHeaderRow ? firstRow : generateDefaultHeaders(firstRow.length);
    const dataRows = hasHeaderRow ? rows.slice(1) : rows;
    
    // Prepare sample for AI analysis (limit to 10 rows for efficiency)
    const sampleRows = dataRows.slice(0, 10);
    
    // Prepare data for AI analysis
    const prompt = prepareCSVAnalysisPrompt(headerRow, sampleRows);
    
    // Get AI analysis
    const response = await anthropic.messages.create({
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-3-7-sonnet-20250219',
      system: "You are an expert data analyst specializing in CSV file analysis. Your task is to analyze CSV column data and detect what kind of information each column represents. Respond in JSON format only with no explanations or additional text."
    });
    
    // Safely extract text content from response
    let content = '';
    if (response.content && response.content.length > 0) {
      const firstContent = response.content[0];
      if ('text' in firstContent) {
        content = firstContent.text;
      }
    }
    
    // Parse JSON from Claude's response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No se pudo analizar la respuesta del modelo IA");
    }
    
    const analysisResult = JSON.parse(jsonMatch[0]);
    
    // Transform AI's analysis into our ColumnMapping format
    const mappings: ColumnMapping[] = Object.entries(analysisResult.columnMappings).map(([index, mapping]: [string, any]) => {
      const columnIndex = parseInt(index);
      return {
        originalHeader: headerRow[columnIndex],
        detectedType: mapping.type,
        targetField: determineTargetField(mapping.type),
        confidence: mapping.confidence,
        examples: extractExamplesForColumn(sampleRows, columnIndex)
      };
    });
    
    return {
      mappings,
      headerRow,
      sampleRows,
      hasHeaderRow
    };
  } catch (error) {
    console.error("Error analyzing CSV structure:", error);
    throw error;
  }
};

/**
 * Generate default headers (Column1, Column2, etc.) when no header row is present
 */
function generateDefaultHeaders(columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, i) => `Column${i + 1}`);
}

/**
 * Extract a few examples from the sample rows for a specific column
 */
function extractExamplesForColumn(sampleRows: string[][], columnIndex: number): string[] {
  return sampleRows
    .map(row => columnIndex < row.length ? row[columnIndex] : '')
    .filter(example => example.trim().length > 0)
    .slice(0, 3); // Just take up to 3 examples
}

/**
 * Map detected field types to our client data model
 */
function determineTargetField(detectedType: string): string {
  const typeToFieldMap: Record<string, string> = {
    'name': 'name',
    'full_name': 'name',
    'person_name': 'name',
    'first_name': 'name', // We might want to combine with last_name in a real implementation
    'last_name': 'name',
    'email': 'email',
    'email_address': 'email',
    'phone': 'phone',
    'phone_number': 'phone',
    'telephone': 'phone',
    'mobile': 'mobilePhone',
    'mobile_phone': 'mobilePhone',
    'cell': 'mobilePhone',
    'cell_phone': 'mobilePhone',
    'address': 'address',
    'street_address': 'address',
    'street': 'address',
    'city': 'city',
    'state': 'state',
    'province': 'state',
    'zip': 'zipCode', 
    'zip_code': 'zipCode',
    'postal_code': 'zipCode',
    'notes': 'notes',
    'comments': 'notes',
    'source': 'source',
    'tags': 'tags',
    'classification': 'classification',
    'type': 'classification',
    'category': 'classification'
  };

  // Try to find a direct match
  const normalizedType = detectedType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (typeToFieldMap[normalizedType]) {
    return typeToFieldMap[normalizedType];
  }
  
  // Try to find a partial match
  for (const [key, value] of Object.entries(typeToFieldMap)) {
    if (normalizedType.includes(key)) {
      return value;
    }
  }
  
  // If no match found, return unknown
  return 'unknown';
}

/**
 * Prepare a prompt for Claude to analyze CSV data
 */
function prepareCSVAnalysisPrompt(headerRow: string[], sampleRows: string[][]): string {
  let prompt = `Analyze the structure of this CSV data and identify what kind of information each column contains.

CSV Headers: ${JSON.stringify(headerRow)}

Sample Data (up to 10 rows):
`;

  for (const row of sampleRows) {
    prompt += `${JSON.stringify(row)}\n`;
  }

  prompt += `
For each column, determine:
1. The type of data it contains (e.g., name, email, phone, address, etc.)
2. A confidence score between 0 and 1
3. Any special format or pattern in the data

Return the results as JSON in the following format:
{
  "columnMappings": {
    "0": {
      "type": "detected_data_type",
      "confidence": 0.95,
      "notes": "any special observations"
    },
    "1": {
      "type": "detected_data_type",
      "confidence": 0.85,
      "notes": "any special observations"
    },
    ...
  }
}

Only return the JSON with no explanations or additional text.`;

  return prompt;
}

/**
 * Process a row with the detected column mappings
 * @param row A row of CSV data
 * @param mappings The column mappings detected
 * @returns Structured client data
 */
export const processCsvRowWithMapping = (row: string[], mappings: ColumnMapping[]): Record<string, any> => {
  const clientData: Record<string, any> = {};
  
  // Start with default fields
  clientData.clientId = `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  clientData.source = "CSV Import";
  clientData.classification = "cliente";
  
  // Map data based on detected fields
  mappings.forEach((mapping, index) => {
    if (index < row.length && mapping.targetField !== 'unknown' && row[index]) {
      // Special handling for tags field (assuming comma-separated values)
      if (mapping.targetField === 'tags' && row[index]) {
        clientData[mapping.targetField] = row[index].split(/[,;]/).map(tag => tag.trim()).filter(tag => tag);
      } else {
        clientData[mapping.targetField] = row[index];
      }
    }
  });
  
  return clientData;
};
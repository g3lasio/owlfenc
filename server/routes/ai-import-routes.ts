import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { ColumnMapping } from '../../client/src/lib/intelligentImport';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const router = express.Router();

/**
 * Servicio que analiza la estructura de un CSV y detecta automáticamente los tipos de columnas
 */
router.post('/analyze-csv', async (req: Request, res: Response) => {
  try {
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ message: 'No se proporcionaron datos CSV' });
    }

    // Parse the CSV
    const rows = csvData.split('\n')
      .map((row: string) => row.split(',').map((cell: string) => cell.trim()))
      .filter((row: string[]) => row.some(cell => cell.length > 0)); // Filter out empty rows
    
    if (rows.length === 0) {
      return res.status(400).json({ message: 'El archivo CSV está vacío' });
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
      return res.status(500).json({ message: 'No se pudo analizar la respuesta del modelo IA' });
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
    
    res.status(200).json({
      mappings,
      headerRow,
      sampleRows,
      hasHeaderRow
    });
  } catch (error: any) {
    console.error('Error al analizar CSV:', error);
    res.status(500).json({ 
      message: 'Error al analizar el archivo CSV',
      error: error.message || 'Error desconocido'
    });
  }
});

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

export default router;
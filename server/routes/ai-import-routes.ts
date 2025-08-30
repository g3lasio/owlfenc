import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ColumnMapping } from '../../client/src/lib/intelligentImport';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const router = express.Router();

/**
 * Servicio que analiza la estructura de un CSV y detecta automáticamente los tipos de columnas
 * 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger análisis de CSV
 */
router.post('/analyze-csv', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ message: 'No se proporcionaron datos CSV' });
    }

    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden analizar CSV
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ message: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Analyzing CSV for REAL user_id: ${userId}`);

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
 * Enhanced contact data processing with name extraction
 * This endpoint takes the mapped data and tries to extract proper names from it
 */
// 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger mejora de contactos
router.post('/enhance-contacts', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { contacts } = req.body;
    
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ message: 'No se proporcionaron datos de contactos válidos' });
    }

    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden mejorar contactos
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ message: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Enhancing contacts for REAL user_id: ${userId}`);
    
    // Process contacts in batches to avoid hitting rate limits
    const batchSize = 10;
    const enhancedContacts = [];
    
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const enhancedBatch = await enhanceContactsWithAI(batch);
      enhancedContacts.push(...enhancedBatch);
    }
    
    res.status(200).json({
      enhancedContacts
    });
  } catch (error: any) {
    console.error('Error al mejorar contactos:', error);
    res.status(500).json({ 
      message: 'Error al procesar los contactos',
      error: error.message || 'Error desconocido'
    });
  }
});

/**
 * Uses OpenAI to analyze contact data and extract proper names and other information
 * Con reglas más estrictas y detección precisa de patrones
 */
async function enhanceContactsWithAI(contacts: any[]): Promise<any[]> {
  try {
    // Primera pasada: aplicar reglas básicas de preprocesamiento
    const preprocessedContacts = contacts.map(contact => {
      // Copia del contacto para no modificar el original
      const enhancedContact = { ...contact };
      
      // Regla 1: Si el nombre está vacío o es "Cliente sin nombre", pero hay email, intentar extraer nombre del email
      if (!enhancedContact.name || enhancedContact.name === "Cliente sin nombre") {
        if (enhancedContact.email && enhancedContact.email.includes('@')) {
          const emailParts = enhancedContact.email.split('@')[0];
          // Separar por puntos, guiones o guiones bajos
          const nameParts = emailParts.split(/[._-]/);
          
          if (nameParts.length >= 1) {
            // Capitalizar cada parte y unir
            const possibleName = nameParts.map(part => 
              part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join(' ');
            
            if (possibleName.length > 2) {
              enhancedContact.name = possibleName;
            }
          }
        }
      }
      
      // Regla 2: Asegurarse de que el teléfono está en el campo correcto
      // Si phone tiene formato de dirección (contiene letras) pero mobilePhone es numérico
      if (enhancedContact.phone && /[a-zA-Z]/.test(enhancedContact.phone)) {
        if (enhancedContact.mobilePhone && /^[0-9()\s-+]+$/.test(enhancedContact.mobilePhone)) {
          // El teléfono móvil parece un número de teléfono válido
          const temp = enhancedContact.phone;
          enhancedContact.phone = enhancedContact.mobilePhone;
          // Si parece dirección, moverla a dirección
          if (!enhancedContact.address) {
            enhancedContact.address = temp;
          }
        }
      }
      
      // Regla 3: Detectar números de teléfono en otros campos
      // Si el campo dirección contiene lo que parece ser un teléfono
      if (enhancedContact.address && /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(enhancedContact.address)) {
        const phoneMatch = enhancedContact.address.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (phoneMatch && !enhancedContact.phone) {
          enhancedContact.phone = phoneMatch[0];
          // Eliminar el teléfono de la dirección
          enhancedContact.address = enhancedContact.address.replace(phoneMatch[0], '').trim();
        }
      }
      
      return enhancedContact;
    });
    
    // Ahora usamos IA para un análisis más profundo
    const contactsJson = JSON.stringify(preprocessedContacts, null, 2);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Eres un experto en procesamiento y estructuración de contactos. Tu tarea es analizar y mejorar datos de contactos con reglas muy precisas:

1. NOMBRES:
   - Si el campo 'name' es vacío o "Cliente sin nombre", debes extraer el nombre de otros campos
   - Los emails suelen tener el formato nombre.apellido@dominio.com o nombreapellido@dominio.com
   - Convierte nombres como "juangomez" a "Juan Gomez"
   - Muchas veces los nombres están en los datos de dirección o en notas

2. TELÉFONOS:
   - Un número de teléfono válido debe tener aproximadamente 10 dígitos (con posibles separadores)
   - Formatos válidos: (123) 456-7890, 123-456-7890, 123.456.7890, etc.
   - Si encuentras un teléfono en otros campos (dirección, notas), muévelo al campo correcto
   
3. DIRECCIONES:
   - Las direcciones normalmente contienen palabras como St, Ave, Blvd, Road, etc.
   - Si una dirección está en el campo de teléfono, muévela al campo correcto
   
4. EMAIL:
   - Un email siempre contiene el símbolo @
   - Si encuentras un email en otros campos, muévelo al campo de email`
        },
        {
          role: "user",
          content: `Analiza estos datos de contactos y mejora la información, aplicando las reglas estrictas.

Por cada contacto:
1. Si el nombre está incompleto o ausente, extráelo de otros campos (especialmente email)
2. Asegúrate de que cada dato esté en su campo correcto (teléfonos en campo phone, emails en campo email, etc.)
3. Corrige y mejora la estructura de los datos sin inventar información
4. Devuelve EXACTAMENTE los mismos campos que te envío, manteniendo todos los IDs y metadatos

Datos de contactos:
${contactsJson}

Responde con un JSON que contiene una lista 'contacts' con los contactos mejorados.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    // Parse the response
    let enhancedContacts = preprocessedContacts; // Default fallback
    try {
      const responseContent = response.choices[0].message.content;
      if (responseContent) {
        const parsedResponse = JSON.parse(responseContent);
        if (parsedResponse.contacts) {
          enhancedContacts = parsedResponse.contacts;
        }
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }
    
    // Aplicamos reglas de post-procesamiento para garantizar la calidad
    const finalContacts = enhancedContacts.map(contact => {
      const finalContact = { ...contact };
      
      // Validar teléfono: debe ser numérico con posibles separadores
      if (finalContact.phone && !/^[0-9()\s.\-+]+$/.test(finalContact.phone.replace(/[^0-9()\s.\-+]/g, ''))) {
        // Si no parece un teléfono válido, intentar encontrar uno en el campo
        const phoneMatch = finalContact.phone.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (phoneMatch) {
          finalContact.phone = phoneMatch[0];
        } else if (finalContact.phone.length > 30 || /[a-zA-Z]{3,}/.test(finalContact.phone)) {
          // Si es muy largo o tiene muchas letras, probablemente es una dirección
          if (!finalContact.address) finalContact.address = finalContact.phone;
          finalContact.phone = '';
        }
      }
      
      // Validar email: debe contener @
      if (finalContact.email && !finalContact.email.includes('@')) {
        // Si no parece un email válido, buscar uno en el campo
        const emailMatch = finalContact.email.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          finalContact.email = emailMatch[0];
        } else {
          // Si no encontramos un email, podría ser otro tipo de dato
          finalContact.email = '';
        }
      }
      
      // Asegurarse de que el nombre tenga algo razonable
      if (!finalContact.name || finalContact.name === "Cliente sin nombre") {
        if (finalContact.email && finalContact.email.includes('@')) {
          const username = finalContact.email.split('@')[0];
          finalContact.name = username
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
        }
      }
      
      return finalContact;
    });
    
    return finalContacts;
  } catch (error) {
    console.error('Error in AI enhancement:', error);
    return contacts; // Return original contacts if enhancement fails
  }
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
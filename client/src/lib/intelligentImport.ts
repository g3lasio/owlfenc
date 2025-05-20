import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Permitir uso en el navegador
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
 * Analiza un archivo CSV utilizando IA para detectar qué tipo de datos contiene cada columna
 * y sugiere asignaciones a los campos del modelo de cliente
 */
export async function analyzeCSVWithIA(csvContent: string): Promise<CSVAnalysisResult> {
  try {
    // Para mayor seguridad, usamos nuestra API en el servidor 
    // en lugar de llamar directamente a la API de Anthropic desde el cliente
    const response = await fetch('/api/import/analyze-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ csvData: csvContent }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al analizar el CSV');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en análisis IA del CSV:', error);
    throw error;
  }
}

// Función para mejorar los contactos utilizando IA avanzada para identificar nombres
export async function enhanceContactsWithAI(contacts: any[]): Promise<any[]> {
  try {
    // Llamar al servicio de mejora de contactos en el servidor
    const response = await fetch('/api/import/enhance-contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contacts }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al mejorar los contactos');
    }

    const result = await response.json();
    return result.enhancedContacts;
  } catch (error) {
    console.error('Error en la mejora IA de contactos:', error);
    // Si falla la mejora, devolver los contactos originales
    return contacts;
  }
}

/**
 * Analiza un archivo VCF utilizando IA para extraer contactos
 */
export async function analyzeVCFWithIA(vcfContent: string) {
  try {
    // Similar a la función anterior, pero para archivos VCF
    const response = await fetch('/api/import/analyze-vcf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vcfData: vcfContent }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al analizar el VCF');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en análisis IA del VCF:', error);
    throw error;
  }
}

/**
 * Mapea los datos del CSV a la estructura de cliente utilizando las asignaciones establecidas
 */
export function mapCSVToClients(data: string[][], mappings: ColumnMapping[]): any[] {
  // Filtramos filas vacías
  const nonEmptyRows = data.filter(row => row.some(cell => cell.trim().length > 0));
  
  // Mapeamos cada fila a un objeto cliente
  return nonEmptyRows.map(row => {
    const client: Record<string, any> = {
      // Valores predeterminados
      clientId: `CLI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Aplicamos los mapeos definidos
    mappings.forEach((mapping, index) => {
      if (index < row.length && mapping.targetField !== 'unknown') {
        // Si el campo es conocido, lo asignamos al objeto cliente
        client[mapping.targetField] = row[index];
      }
    });

    return client;
  });
}

/**
 * Normaliza los datos del cliente para garantizar que cumplen con el formato esperado
 */
export function normalizeClientData(clients: any[]): any[] {
  return clients.map(client => {
    // Aseguramos que el nombre no esté vacío
    if (!client.name || client.name.trim() === '') {
      client.name = 'Cliente sin nombre';
    }

    // Normalizamos emails
    if (client.email) {
      client.email = client.email.toLowerCase().trim();
    }

    // Normalizamos teléfonos
    if (client.phone) {
      client.phone = normalizePhoneNumber(client.phone);
    }

    if (client.mobilePhone) {
      client.mobilePhone = normalizePhoneNumber(client.mobilePhone);
    }

    // Formateo de códigos postales
    if (client.zipCode) {
      client.zipCode = client.zipCode.trim();
    }

    return client;
  });
}

/**
 * Normaliza un número telefónico eliminando caracteres no numéricos
 * y aplicando formato estándar
 */
function normalizePhoneNumber(phone: string): string {
  // Eliminamos todos los caracteres no numéricos
  const digits = phone.replace(/\D/g, '');
  
  // Si es número de EE.UU. (10 dígitos), aplicamos formato (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }
  
  // Si tiene código de país (+1 para EE.UU., 11 dígitos), aplicamos formato +1 (XXX) XXX-XXXX
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
  }
  
  // Para otros formatos, devolvemos los dígitos tal cual
  return digits;
}

// Tipos esperados de campo para asignación
export const CLIENT_FIELD_OPTIONS = [
  { label: 'Nombre', value: 'name' },
  { label: 'Email', value: 'email' },
  { label: 'Teléfono', value: 'phone' },
  { label: 'Móvil', value: 'mobilePhone' },
  { label: 'Dirección', value: 'address' },
  { label: 'Ciudad', value: 'city' },
  { label: 'Estado/Provincia', value: 'state' },
  { label: 'Código Postal', value: 'zipCode' },
  { label: 'Notas', value: 'notes' },
  { label: 'Fuente', value: 'source' },
  { label: 'Etiquetas', value: 'tags' },
  { label: 'Clasificación', value: 'classification' },
  { label: 'No importar', value: 'unknown' }
];
import { Client } from '@/types/client';

/**
 * Tipos de campo que podemos detectar e identificar
 */
type FieldType = 'name' | 'email' | 'phone' | 'address' | 'city' | 'state' | 'zipcode' | 'country' | 'unknown';

/**
 * Interfaz para representar el mapeo de campos
 */
interface FieldMapping {
  sourceIndex: number;  // Índice de la columna en el CSV
  targetField: string;  // Nombre del campo en el objeto Cliente
  confidence: number;   // Nivel de confianza de 0 a 1
  detectedType: FieldType; // Tipo de campo detectado
}

/**
 * Patrones para detectar diferentes tipos de datos
 */
const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$|^\d{10}$|^\d{3}[\s.-]?\d{3}[\s.-]?\d{4}$/,
  zipcode: /^\d{5}(-\d{4})?$/,
  name: /^[A-Za-zÀ-ÖØ-öø-ÿ\s\.'-]{2,}$/,
  address: /^[A-Za-z0-9\s,\.#'-]{5,}$/
};

/**
 * Analiza una muestra de datos para inferir el tipo de cada columna
 */
export function inferColumnTypes(headers: string[], sampleData: string[][]): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  
  // Para cada columna del CSV
  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const header = headers[colIndex].toLowerCase();
    const columnSamples = sampleData.map(row => row[colIndex] || '');
    
    // Intentar identificar el tipo de columna
    const fieldType = identifyFieldType(header, columnSamples);
    const targetField = mapToClientField(fieldType, header);
    
    // Calcular nivel de confianza basado en el header y los datos
    const confidence = calculateConfidence(header, columnSamples, fieldType);
    
    mappings.push({
      sourceIndex: colIndex,
      targetField,
      confidence,
      detectedType: fieldType
    });
  }
  
  // Resolver conflictos - si múltiples columnas mapean al mismo campo
  return resolveConflicts(mappings);
}

/**
 * Determina el tipo de campo basado en su encabezado y valores de muestra
 */
function identifyFieldType(header: string, samples: string[]): FieldType {
  header = header.toLowerCase();
  
  // Primero probamos con encabezados comunes
  if (header.includes('email') || header.includes('correo') || header.includes('e-mail')) {
    return 'email';
  }
  
  if (header.includes('phone') || header.includes('tel') || header.includes('teléfono') || header.includes('telefono') || header.includes('móvil') || header.includes('movil')) {
    return 'phone';
  }
  
  if (header.includes('address') || header.includes('dirección') || header.includes('direccion') || header.includes('street') || header.includes('calle')) {
    return 'address';
  }
  
  if (header.includes('name') || header.includes('nombre') || header.includes('client') || header.includes('cliente')) {
    return 'name';
  }
  
  if (header.includes('city') || header.includes('ciudad')) {
    return 'city';
  }
  
  if (header.includes('state') || header.includes('estado') || header.includes('province') || header.includes('provincia')) {
    return 'state';
  }
  
  if (header.includes('zip') || header.includes('postal') || header.includes('cp') || header.includes('código postal')) {
    return 'zipcode';
  }
  
  if (header.includes('country') || header.includes('país') || header.includes('pais')) {
    return 'country';
  }
  
  // Si no podemos inferir por encabezado, analizamos el contenido
  return inferTypeFromContent(samples);
}

/**
 * Infiere el tipo de campo basado en su contenido
 */
function inferTypeFromContent(samples: string[]): FieldType {
  // Filtramos valores vacíos
  const validSamples = samples.filter(sample => sample && sample.trim());
  if (validSamples.length === 0) return 'unknown';
  
  // Contamos cuántas muestras coinciden con cada patrón
  const counts = {
    email: 0,
    phone: 0,
    name: 0,
    address: 0,
    zipcode: 0,
    unknown: 0
  };
  
  for (const sample of validSamples) {
    if (patterns.email.test(sample)) {
      counts.email++;
    } else if (patterns.phone.test(sample)) {
      counts.phone++;
    } else if (patterns.zipcode.test(sample)) {
      counts.zipcode++;
    } else if (patterns.name.test(sample)) {
      counts.name++;
    } else if (patterns.address.test(sample)) {
      counts.address++;
    } else {
      counts.unknown++;
    }
  }
  
  // Determinar el tipo más frecuente
  let maxCount = 0;
  let maxType: FieldType = 'unknown';
  
  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type as FieldType;
    }
  }
  
  // Calculamos un umbral mínimo para clasificar (30% de las muestras válidas)
  const threshold = validSamples.length * 0.3;
  
  return maxCount >= threshold ? maxType : 'unknown';
}

/**
 * Mapea un tipo de campo detectado a un campo del modelo Client
 */
function mapToClientField(fieldType: FieldType, header: string): string {
  switch (fieldType) {
    case 'name': return 'name';
    case 'email': return 'email';
    case 'phone': return 'phone';
    case 'address': return 'address';
    case 'city': 
      // En nuestro modelo actual, la ciudad podría ir en address
      return 'city';
    case 'state': 
      // Estado podría ir en address
      return 'state';
    case 'zipcode':
      // Código postal podría ir en address
      return 'zipcode';
    case 'country':
      return 'country';
    default:
      // Si no podemos determinar el tipo, usamos el nombre del encabezado
      // como una pista para campos personalizados
      return header;
  }
}

/**
 * Calcula el nivel de confianza de un mapeo
 */
function calculateConfidence(header: string, samples: string[], fieldType: FieldType): number {
  // Base de confianza
  let confidence = 0.5;
  
  // Aumentamos la confianza si el encabezado coincide con el tipo
  const headerTerms = {
    name: ['name', 'nombre', 'client', 'cliente', 'contact', 'contacto'],
    email: ['email', 'correo', 'e-mail', 'mail'],
    phone: ['phone', 'tel', 'teléfono', 'telefono', 'móvil', 'movil', 'celular', 'cell'],
    address: ['address', 'dirección', 'direccion', 'street', 'calle', 'domicilio'],
    city: ['city', 'ciudad', 'town', 'localidad'],
    state: ['state', 'estado', 'province', 'provincia'],
    zipcode: ['zip', 'postal', 'código postal', 'cp'],
    country: ['country', 'país', 'pais', 'nation']
  };
  
  const relevantTerms = headerTerms[fieldType as keyof typeof headerTerms] || [];
  
  for (const term of relevantTerms) {
    if (header.includes(term)) {
      confidence += 0.3;
      break;
    }
  }
  
  // Ajustamos la confianza según el contenido
  const validSamples = samples.filter(s => s && s.trim());
  if (validSamples.length === 0) return confidence;
  
  // Verificamos cuántas muestras coinciden con el patrón esperado
  let matchCount = 0;
  const pattern = patterns[fieldType as keyof typeof patterns];
  
  if (pattern) {
    matchCount = validSamples.filter(sample => pattern.test(sample)).length;
    const matchRatio = matchCount / validSamples.length;
    
    if (matchRatio > 0.7) confidence += 0.3;
    else if (matchRatio > 0.3) confidence += 0.1;
    else confidence -= 0.2;
  }
  
  // Límites de confianza
  return Math.max(0.1, Math.min(0.95, confidence));
}

/**
 * Resuelve conflictos cuando múltiples columnas mapean al mismo campo
 */
function resolveConflicts(mappings: FieldMapping[]): FieldMapping[] {
  const targetFields = new Map<string, FieldMapping[]>();
  
  // Agrupar mappings por campo destino
  for (const mapping of mappings) {
    if (!targetFields.has(mapping.targetField)) {
      targetFields.set(mapping.targetField, []);
    }
    targetFields.get(mapping.targetField)!.push(mapping);
  }
  
  const resolvedMappings: FieldMapping[] = [];
  
  // Para cada grupo de mapeos al mismo campo
  for (const [field, fieldMappings] of targetFields.entries()) {
    if (fieldMappings.length === 1) {
      // No hay conflicto
      resolvedMappings.push(fieldMappings[0]);
    } else {
      // Ordenar por confianza descendente
      fieldMappings.sort((a, b) => b.confidence - a.confidence);
      
      // El mapping con más confianza mantiene el campo original
      resolvedMappings.push(fieldMappings[0]);
      
      // Los demás hacen fallback a campos relacionados o a unknown
      for (let i = 1; i < fieldMappings.length; i++) {
        const mapping = { ...fieldMappings[i] };
        
        // Reasignar según el tipo
        if (mapping.detectedType === 'address') {
          mapping.targetField = 'address2';
        } else if (mapping.detectedType === 'phone') {
          mapping.targetField = 'alternativePhone';
        } else if (mapping.detectedType === 'email') {
          mapping.targetField = 'alternativeEmail';
        } else {
          mapping.targetField = `${mapping.targetField}_${i}`;
        }
        
        resolvedMappings.push(mapping);
      }
    }
  }
  
  return resolvedMappings;
}

/**
 * Analiza un string para detectar si contiene una dirección
 */
export function detectAddressPattern(value: string): boolean {
  if (!value) return false;
  
  // Patrones comunes de direcciones
  const streetNumberPattern = /^\d+\s/;
  const streetNamePattern = /\s(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|plz|square|sq|parkway|pkwy|highway|hwy|calle|avenida|av|carretera|carr|bulevar|ctra)\b/i;
  const buildingPattern = /\b(apt|apartment|suite|unit|room|building|floor|piso|departamento|depto|edificio)\b\s*[a-z0-9#\-]+/i;
  
  // Si contiene un número seguido de texto, probablemente es una dirección
  if (streetNumberPattern.test(value)) return true;
  
  // Si contiene terminaciones de calle
  if (streetNamePattern.test(value)) return true;
  
  // Si contiene indicadores de apartamento/edificio
  if (buildingPattern.test(value)) return true;
  
  // Si tiene formato de número típico de direcciones (como "1234 Main St")
  if (/^\d+\s+[A-Za-z]/.test(value)) return true;
  
  return false;
}

/**
 * Analiza un string para detectar si contiene un email
 */
export function detectEmailPattern(value: string): boolean {
  if (!value) return false;
  return patterns.email.test(value);
}

/**
 * Analiza un string para detectar si contiene un número de teléfono
 */
export function detectPhonePattern(value: string): boolean {
  if (!value) return false;
  return patterns.phone.test(value);
}

/**
 * Procesa los datos en bruto de un archivo importado y crea el mapeo inteligente
 * @param rawData Datos en bruto del archivo importado
 * @returns Datos procesados con mapeo inteligente
 */
export function processImportedData(
  headers: string[], 
  rawData: string[][]
): { mappings: FieldMapping[], processedData: Record<string, string>[] } {
  // Inferir los tipos de columnas
  const mappings = inferColumnTypes(headers, rawData);
  
  // Procesar cada fila usando los mappings
  const processedData = rawData.map(row => {
    const processedRow: Record<string, string> = {};
    
    // Aplicar mappings
    for (const mapping of mappings) {
      const value = row[mapping.sourceIndex] || '';
      processedRow[mapping.targetField] = value;
    }
    
    // Post-procesamiento para corregir campos mal asignados
    correctMisclassifiedFields(processedRow);
    
    return processedRow;
  });
  
  return { mappings, processedData };
}

/**
 * Corrige campos mal clasificados después del mapeo inicial
 */
function correctMisclassifiedFields(data: Record<string, string>): void {
  // Verificar si hay campos que probablemente estén mal clasificados
  
  // Verificar teléfono en campo de dirección
  if (data.address && detectPhonePattern(data.address)) {
    // Si no hay teléfono o el campo de teléfono ya tiene otro valor
    if (!data.phone || !detectPhonePattern(data.phone)) {
      data.phone = data.address;
      // No borramos la dirección por si contiene otros datos
      if (data.address2) {
        data.address = data.address2;
        data.address2 = '';
      } else {
        data.address = '';
      }
    }
  }
  
  // Verificar email en otros campos
  for (const [field, value] of Object.entries(data)) {
    if (field !== 'email' && detectEmailPattern(value)) {
      if (!data.email) {
        data.email = value;
        // Si el valor está en un campo importante como nombre o dirección,
        // no lo borramos completamente para preservar datos potencialmente útiles
        if (field !== 'name' && field !== 'address') {
          data[field] = '';
        }
      }
    }
  }
  
  // Verificar direcciones en campo de teléfono
  if (data.phone && detectAddressPattern(data.phone)) {
    if (!data.address || data.address.length < data.phone.length) {
      // Si no hay dirección o la que hay es menos detallada
      data.address = data.phone;
      data.phone = '';
    }
  }
  
  // Buscar partes de dirección en campos incorrectos
  if (!data.address || data.address.trim() === '') {
    // Buscar en otros campos
    for (const [field, value] of Object.entries(data)) {
      if (['name', 'email', 'phone'].includes(field)) continue;
      
      if (detectAddressPattern(value)) {
        data.address = value;
        // Solo eliminar el valor si no es un campo esencial
        if (!['city', 'state', 'zipcode', 'country'].includes(field)) {
          data[field] = '';
        }
        break;
      }
    }
  }
}

/**
 * Convierte los datos procesados a un array de objetos Client
 */
export function convertToClientObjects(processedData: Record<string, string>[]): Partial<Client>[] {
  return processedData.map(row => {
    // Por defecto crear un ID temporal único
    const clientId = `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Crear objeto cliente con los campos obligatorios
    const client: Partial<Client> = {
      clientId,
      name: row.name || 'Sin nombre',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'CSV Import',
      classification: 'cliente'
    };
    
    // Agregar cualquier otro campo disponible
    for (const [key, value] of Object.entries(row)) {
      if (!['name', 'email', 'phone', 'address'].includes(key) && value) {
        // @ts-ignore - Campos dinámicos
        client[key] = value;
      }
    }
    
    return client;
  });
}

/**
 * Procesa un CSV completo y lo convierte en objetos Client
 */
export function processCSVToClients(headers: string[], data: string[][]): {
  clients: Partial<Client>[],
  mappings: FieldMapping[]
} {
  const { mappings, processedData } = processImportedData(headers, data);
  const clients = convertToClientObjects(processedData);
  
  return { clients, mappings };
}

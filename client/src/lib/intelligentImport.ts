import Anthropic from '@anthropic-ai/sdk';
import type { Client } from '@/types/client'; // Usar 'type' para evitar duplicación

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Permitir uso en el navegador
});

// Interfaces para el manejo de mapeos y análisis
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

// Tipos de campos que podemos identificar
export type FieldType = 'name' | 'email' | 'phone' | 'address' | 'city' | 'state' | 'zipcode' | 'country' | 'unknown';

// Interface para mapeo interno de campos
export interface FieldMapping {
  sourceIndex: number;
  targetField: string;
  confidence: number;
  detectedType: FieldType;
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
// Ya importado arriba
// Tipos ya definidos arriba
}

/**
 * Patrones mejorados para detectar diferentes tipos de datos
 */
const patterns = {
  // Patrón mejorado de email: más flexible con puntos y caracteres especiales
  email: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/i,
  
  // Patrón mejorado de teléfono: soporta más formatos internacionales y mexicanos
  phone: /^(?:\+?(?:[0-9] ?){1,3})?[- (]?(?:[0-9]{2,3})[- )]?(?:[0-9]{2,4})[- ]?(?:[0-9]{2,4})[- ]?(?:[0-9]{2,4})$|^\d{10}$|^(?:\+?52|0052)?[- ]?(?:1|01)?[- ]?(?:[0-9]{2})[- ]?(?:[0-9]{4})[- ]?(?:[0-9]{4})$/,
  
  // Patrón mejorado de código postal: soporta formatos internacionales (5-6 dígitos) y México
  zipcode: /^\d{4,6}(-\d{4})?$/,
  
  // Patrón mejorado de nombre: más inclusivo con caracteres internacionales
  name: /^[A-Za-zÀ-ÖØ-öø-ÿ\s\.'\-,]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ\s\.'\-,]+)*$/,
  
  // Patrón mejorado de dirección: detecta direcciones con números, letras y símbolos comunes
  address: /^.*(calle|avenida|av|blvd|boulevard|carretera|carr|plaza|calzada|paseo|camino|colonia|col\.|#|num|número|no\.|cp|c\.p\.).*$/i
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
 * Funciones auxiliares para detectar patrones específicos
 */

/**
 * Infiere el tipo de campo basado en su contenido con análisis contextual mejorado
 */
function inferTypeFromContent(samples: string[]): FieldType {
  // Filtramos valores vacíos
  const validSamples = samples.filter(sample => sample && sample.trim());
  if (validSamples.length === 0) return 'unknown';
  
  // Preparamos análisis avanzado de contenido
  const counts = {
    email: 0,
    phone: 0,
    name: 0,
    address: 0,
    zipcode: 0,
    city: 0,
    state: 0,
    country: 0,
    unknown: 0
  };
  
  // Detectores contextuales mejorados
  const cityIndicators = ['ciudad', 'city', 'localidad', 'municipio'];
  const stateIndicators = ['estado', 'state', 'provincia', 'province'];
  const countryIndicators = ['país', 'pais', 'country', 'nación', 'nation'];
  
  // Analizamos cada muestra con múltiples niveles de detección
  for (const sample of validSamples) {
    // Limpiamos el texto para análisis
    const cleanSample = sample.trim();
    
    // Aplicamos detección secuencial con prioridad (email y teléfono son más distintivos)
    if (detectEmailPattern(cleanSample)) {
      counts.email++;
    } 
    else if (detectPhonePattern(cleanSample)) {
      counts.phone++;
    }
    else if (patterns.zipcode.test(cleanSample)) {
      counts.zipcode++;
    }
    else if (patterns.address.test(cleanSample) || detectAddressPattern(cleanSample)) {
      counts.address++;
    }
    else if (patterns.name.test(cleanSample) && cleanSample.length < 40) {
      // Nombres típicamente no son extremadamente largos
      counts.name++;
    }
    // Detección de ciudad, estado y país por coincidencia de términos conocidos
    else if (cityIndicators.some(term => cleanSample.toLowerCase().includes(term))) {
      counts.city++;
    }
    else if (stateIndicators.some(term => cleanSample.toLowerCase().includes(term))) {
      counts.state++;
    }
    else if (countryIndicators.some(term => cleanSample.toLowerCase().includes(term))) {
      counts.country++;
    }
    else {
      // Análisis secundario para datos que no coinciden con patrones principales
      
      // Si contiene solo letras y espacios y tiene entre 2-30 caracteres, probablemente es un nombre
      if (/^[A-Za-zÀ-ÖØ-öø-ÿ\s\.'\-,]+$/.test(cleanSample) && cleanSample.length > 2 && cleanSample.length < 30) {
        counts.name++;
      }
      // Si contiene números y letras mezclados, es más probable que sea una dirección
      else if (/[0-9].*[A-Za-z]|[A-Za-z].*[0-9]/.test(cleanSample) && cleanSample.length > 5) {
        counts.address++;
      }
      else {
        counts.unknown++;
      }
    }
  }
  
  // Determinamos el tipo más frecuente con ponderación mejorada
  let maxCount = 0;
  let maxType: FieldType = 'unknown';
  
  // Ponderamos ciertos tipos con mayor peso por su importancia
  counts.email *= 1.3;    // Damos prioridad a la detección de email por su unicidad
  counts.phone *= 1.2;    // Los teléfonos también son bastante distintivos
  
  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type as FieldType;
    }
  }
  
  // Umbral adaptativo basado en la cantidad de muestras
  const baseThreshold = 0.25; // Reducimos el umbral para mayor sensibilidad
  const dynamicThreshold = validSamples.length <= 3 ? 
                          baseThreshold / 2 : // Para pocas muestras, somos más permisivos
                          baseThreshold;
  
  const threshold = validSamples.length * dynamicThreshold;
  
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
  targetFields.forEach((fieldMappings, field) => {
    if (fieldMappings.length === 1) {
      // No hay conflicto
      resolvedMappings.push(fieldMappings[0]);
    } else {
      // Ordenar por confianza descendente
      fieldMappings.sort((a: FieldMapping, b: FieldMapping) => b.confidence - a.confidence);
      
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
  });
  
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
 * Corrige campos mal clasificados con análisis contextual avanzado
 * 
 * Esta función mejorada analiza el contexto completo de los datos del cliente
 * y utiliza análisis de patrón y heurísticas para detectar y corregir problemas
 * comunes de clasificación errónea de datos entre campos.
 */
function correctMisclassifiedFields(data: Record<string, string>): void {
  // Guardar una copia de los datos originales para comparar
  const originalData = { ...data };
  
  // PASO 1: IDENTIFICACIÓN Y EXTRACCIÓN DE CORREOS ELECTRÓNICOS
  // Los emails son los más distintivos y fáciles de identificar correctamente
  let foundEmailInOtherField = false;
  
  for (const [field, value] of Object.entries(data)) {
    if (field !== 'email' && value && detectEmailPattern(value)) {
      // Extraer solo la parte del email si está mezclada con otros datos
      const emailMatch = value.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/i);
      
      if (emailMatch && emailMatch[0]) {
        // Si el campo email está vacío o si hemos encontrado un email mejor formado
        if (!data.email || (data.email && !detectEmailPattern(data.email))) {
          data.email = emailMatch[0];
          foundEmailInOtherField = true;
          
          // Eliminar solo el email del campo original, preservando el resto del contenido
          data[field] = value.replace(emailMatch[0], '').trim();
        }
      }
    }
  }
  
  // PASO 2: IDENTIFICACIÓN Y EXTRACCIÓN DE NÚMEROS TELEFÓNICOS
  // Los teléfonos también son bastante distintivos
  let foundPhoneInOtherField = false;
  
  for (const [field, value] of Object.entries(data)) {
    if (field !== 'phone' && field !== 'mobilePhone' && value) {
      // Primero verificamos si toda la cadena es un teléfono
      if (detectPhonePattern(value)) {
        if (!data.phone) {
          data.phone = value;
          foundPhoneInOtherField = true;
          data[field] = '';
        } else if (!data.mobilePhone) {
          // Si ya hay un teléfono principal, usamos este como móvil
          data.mobilePhone = value;
          foundPhoneInOtherField = true;
          data[field] = '';
        }
      } else {
        // Intentamos extraer teléfonos mezclados con otros datos
        // Patrones comunes de teléfono que podemos encontrar en texto
        const phonePatterns = [
          /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,  // (555) 123-4567 o 555-123-4567
          /\+\d{1,3}[-.\s]?\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, // +1 555 123 4567
          /\b\d{10}\b/g  // 10 dígitos juntos
        ];
        
        for (const pattern of phonePatterns) {
          const matches = value.match(pattern);
          if (matches && matches.length > 0) {
            if (!data.phone) {
              data.phone = matches[0];
              foundPhoneInOtherField = true;
            } else if (!data.mobilePhone && matches[0] !== data.phone) {
              data.mobilePhone = matches[0];
              foundPhoneInOtherField = true;
            }
            
            // Eliminamos los teléfonos encontrados del texto original
            data[field] = value.replace(pattern, '').trim();
          }
        }
      }
    }
  }
  
  // PASO 3: ANÁLISIS Y CORRECCIÓN DE DIRECCIONES
  
  // Verificar si hay direcciones en campos no apropiados (incluido teléfono)
  if (!data.address || data.address.trim() === '') {
    // Buscar direcciones en otros campos con prioridad
    const fieldPriority = ['notes', 'alternativeAddress', 'phone', 'mobilePhone', 'name'];
    
    for (const field of fieldPriority) {
      if (data[field] && detectAddressPattern(data[field])) {
        data.address = data[field];
        
        // Si el campo era phone o mobilePhone y hemos movido su contenido a dirección, 
        // lo limpiamos solo si previamente encontramos un teléfono en otro campo
        if ((field === 'phone' && foundPhoneInOtherField) || 
            (field === 'mobilePhone' && foundPhoneInOtherField)) {
          data[field] = '';
        }
        // Para otros campos, preservamos el contenido para no perder datos
        else if (field !== 'name') {
          data[field] = '';
        }
        break;
      }
    }
  }
  
  // PASO 4: ANÁLISIS Y CORRECCIÓN DE NOMBRES
  
  // Si no hay nombre pero tenemos otros campos que podrían contenerlo
  if (!data.name || data.name.trim() === '') {
    for (const [field, value] of Object.entries(data)) {
      if (field !== 'email' && field !== 'phone' && field !== 'address' && 
          field !== 'mobilePhone' && value) {
        
        // Si parece un nombre (solo letras, no demasiado largo)
        if (/^[A-Za-zÀ-ÖØ-öø-ÿ\s\.'\-,]+$/.test(value) && 
            value.length > 2 && value.length < 50 &&
            !detectAddressPattern(value)) {
          data.name = value;
          data[field] = '';
          break;
        }
      }
    }
  }
  
  // PASO 5: LIMPIEZA FINAL Y VALIDACIÓN
  
  // Eliminar campos vacíos que no son esenciales
  for (const field in data) {
    if (data[field] === '') {
      // Mantener los campos principales incluso si están vacíos
      if (!['name', 'email', 'phone', 'address'].includes(field)) {
        delete data[field];
      }
    }
  }
  
  // Si después de todo el procesamiento, seguimos sin nombre, creamos uno temporal
  if (!data.name || data.name.trim() === '') {
    if (data.email) {
      // Usar parte del email como nombre temporal
      const emailParts = data.email.split('@');
      data.name = `Cliente ${emailParts[0]}`;
    } else if (data.phone) {
      // Usar teléfono como identificador temporal
      data.name = `Cliente ${data.phone.substring(Math.max(0, data.phone.length - 6))}`;
    } else {
      data.name = 'Cliente sin identificar';
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

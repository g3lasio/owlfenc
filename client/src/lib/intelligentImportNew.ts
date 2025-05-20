import { Client } from '@/types/client';

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
 * Patrones avanzados para detectar diferentes tipos de datos
 */
const patterns = {
  // Patrón para emails: flexible con puntos y caracteres especiales
  email: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/i,
  
  // Patrón para teléfonos: soporta formatos internacionales y mexicanos
  phone: /^(?:\+?(?:[0-9] ?){1,3})?[- (]?(?:[0-9]{2,3})[- )]?(?:[0-9]{2,4})[- ]?(?:[0-9]{2,4})[- ]?(?:[0-9]{2,4})$|^\d{10}$|^(?:\+?52|0052)?[- ]?(?:1|01)?[- ]?(?:[0-9]{2})[- ]?(?:[0-9]{4})[- ]?(?:[0-9]{4})$/,
  
  // Patrón para códigos postales: formatos internacionales (5-6 dígitos) y México
  zipcode: /^\d{4,6}(-\d{4})?$/,
  
  // Patrón para nombres: inclusivo con caracteres internacionales
  name: /^[A-Za-zÀ-ÖØ-öø-ÿ\s\.'\-,]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ\s\.'\-,]+)*$/,
  
  // Patrón para direcciones: palabras clave y estructura
  address: /^.*(calle|avenida|av|blvd|boulevard|carretera|carr|plaza|calzada|paseo|camino|colonia|col\.|#|num|número|no\.|cp|c\.p\.).*$/i
};

/**
 * Detecta si un string contiene una dirección
 */
export function detectAddressPattern(value: string): boolean {
  if (!value) return false;
  
  // Patrones específicos para direcciones
  const streetNumberPattern = /^\d+\s/;
  const streetNamePattern = /\s(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|plz|square|sq|parkway|pkwy|highway|hwy|calle|avenida|av|carretera|carr|bulevar|ctra)\b/i;
  const buildingPattern = /\b(apt|apartment|suite|unit|room|building|floor|piso|departamento|depto|edificio)\b\s*[a-z0-9#\-]+/i;
  
  // Verificamos con el patrón general primero
  if (patterns.address.test(value)) return true;
  
  // Verificaciones adicionales específicas
  if (streetNumberPattern.test(value)) return true;
  if (streetNamePattern.test(value)) return true;
  if (buildingPattern.test(value)) return true;
  
  // Patrones comunes en direcciones mexicanas
  if (/\b(col\.|colonia|fracc\.|fraccionamiento)\b/i.test(value)) return true;
  
  // Si contiene combinación de números y letras con ciertas palabras clave
  if (/\d+\s+[A-Za-z]+/.test(value) && value.length > 8 && /\b(no\.|#|calle|av|avenida)\b/i.test(value)) return true;
  
  return false;
}

/**
 * Detecta si un string contiene un email
 */
export function detectEmailPattern(value: string): boolean {
  if (!value) return false;
  
  // Verificamos con el patrón general primero
  if (patterns.email.test(value)) return true;
  
  // Verificación adicional para emails que pueden estar en formatos no estándar
  const basicEmailCheck = value.includes('@') && value.includes('.') && !value.includes(' ');
  if (basicEmailCheck) {
    // Verificación adicional: verificar que tenga algo antes y después del @
    const parts = value.split('@');
    if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detecta si un string contiene un número de teléfono
 */
export function detectPhonePattern(value: string): boolean {
  if (!value) return false;
  
  // Verificamos con el patrón general primero
  if (patterns.phone.test(value)) return true;
  
  // Patrones adicionales para teléfonos
  const phonePatterns = [
    /^\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}$/,  // Formato básico de dígitos agrupados
    /\(\d{2,3}\)[\s\-]?\d{3,4}[\s\-]?\d{3,4}/, // Formato con paréntesis (55) 1234-5678
    /\b\d{10}\b/,                             // Exactamente 10 dígitos juntos
    /\+\d{1,3}[\s\-]?\d{8,10}/                // Formato internacional +52 55 1234 5678
  ];
  
  for (const pattern of phonePatterns) {
    if (pattern.test(value)) return true;
  }
  
  // Si contiene al menos 8 dígitos consecutivos, probablemente es teléfono
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 8 && digits.length <= 15) {
    // Verificar que no sea un código postal (normalmente 5 dígitos)
    if (digits.length !== 5) {
      return true;
    }
  }
  
  return false;
}

/**
 * Normaliza un número telefónico eliminando caracteres no numéricos
 * y aplicando un formato estándar
 */
export function normalizePhoneNumber(phone: string): string {
  // Eliminamos todos los caracteres no numéricos
  const digits = phone.replace(/\D/g, '');
  
  // Si es número de México (10 dígitos), aplicamos formato (XX) XXXX-XXXX
  if (digits.length === 10) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  }
  
  // Si tiene código de país (+52 para México, 12 dígitos), aplicamos formato +52 (XX) XXXX-XXXX
  if (digits.length === 12 && digits.startsWith('52')) {
    return `+52 (${digits.substring(2, 4)}) ${digits.substring(4, 8)}-${digits.substring(8)}`;
  }
  
  // Para otros formatos, devolvemos los dígitos agrupados de forma lógica
  if (digits.length === 8) {
    return `${digits.substring(0, 4)}-${digits.substring(4)}`;
  }
  
  // Para otros formatos, devolvemos los dígitos tal cual
  return digits;
}

/**
 * Determina el tipo de campo basado en su encabezado y muestras
 */
function identifyFieldType(header: string, samples: string[]): FieldType {
  header = header.toLowerCase();
  
  // Mapeo de términos comunes en encabezados a tipos de campo
  const headerTerms: Record<FieldType, string[]> = {
    name: ['name', 'nombre', 'client', 'cliente', 'contact', 'contacto', 'persona'],
    email: ['email', 'correo', 'e-mail', 'mail', 'electronic', 'electrónico'],
    phone: ['phone', 'tel', 'teléfono', 'telefono', 'móvil', 'movil', 'celular', 'cell', 'fono'],
    address: ['address', 'dirección', 'direccion', 'street', 'calle', 'domicilio', 'ubicación', 'ubicacion'],
    city: ['city', 'ciudad', 'town', 'localidad', 'municipio'],
    state: ['state', 'estado', 'province', 'provincia', 'región', 'region'],
    zipcode: ['zip', 'postal', 'código postal', 'cp', 'codigo postal', 'código', 'codigo'],
    country: ['country', 'país', 'pais', 'nation', 'nación'],
    unknown: []
  };
  
  // Primero verificamos coincidencias directas en el encabezado
  for (const [type, terms] of Object.entries(headerTerms)) {
    if (terms.some(term => header.includes(term))) {
      return type as FieldType;
    }
  }
  
  // Si no hay coincidencia en el encabezado, analizamos el contenido
  return inferTypeFromContent(samples);
}

/**
 * Infiere el tipo de campo basado en su contenido
 */
function inferTypeFromContent(samples: string[]): FieldType {
  // Filtramos valores vacíos
  const validSamples = samples.filter(sample => sample && sample.trim());
  if (validSamples.length === 0) return 'unknown';
  
  // Contamos coincidencias para cada tipo
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
  
  // Analizamos cada muestra con prioridad en detección
  for (const sample of validSamples) {
    const cleanSample = sample.trim();
    
    // Prioridad de detección: email > teléfono > dirección > otros
    if (detectEmailPattern(cleanSample)) {
      counts.email++;
    } 
    else if (detectPhonePattern(cleanSample)) {
      counts.phone++;
    }
    else if (patterns.zipcode.test(cleanSample)) {
      counts.zipcode++;
    }
    else if (detectAddressPattern(cleanSample)) {
      counts.address++;
    }
    else if (patterns.name.test(cleanSample) && cleanSample.length < 40) {
      counts.name++;
    }
    else {
      // Análisis secundario para datos que no coinciden con patrones principales
      if (/^[A-Za-zÀ-ÖØ-öø-ÿ\s\.'\-,]+$/.test(cleanSample) && 
          cleanSample.length > 2 && cleanSample.length < 30) {
        counts.name++;
      }
      else if (/[0-9].*[A-Za-z]|[A-Za-z].*[0-9]/.test(cleanSample) && cleanSample.length > 5) {
        counts.address++;
      }
      else {
        counts.unknown++;
      }
    }
  }
  
  // Ponderación de ciertos tipos para mejorar la detección
  counts.email *= 1.3;    // Prioridad a email por su unicidad
  counts.phone *= 1.2;    // Prioridad a teléfono por su formato distintivo
  
  // Determinar el tipo más frecuente
  let maxCount = 0;
  let maxType: FieldType = 'unknown';
  
  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type as FieldType;
    }
  }
  
  // Umbral dinámico basado en la cantidad de muestras
  const threshold = validSamples.length * (validSamples.length <= 3 ? 0.2 : 0.25);
  
  return maxCount >= threshold ? maxType : 'unknown';
}

/**
 * Mapea un tipo de campo a un campo del modelo Client
 */
function mapToClientField(fieldType: FieldType, header: string): string {
  switch (fieldType) {
    case 'name': return 'name';
    case 'email': return 'email';
    case 'phone': return 'phone';
    case 'address': return 'address';
    case 'city': return 'city';
    case 'state': return 'state';
    case 'zipcode': return 'zipCode';
    case 'country': return 'country';
    default:
      // Para campos desconocidos, usamos el nombre del encabezado
      // para campos personalizados o 'unknown' para ignorar
      return header.toLowerCase().includes('note') || 
             header.toLowerCase().includes('nota') ? 
             'notes' : 'unknown';
  }
}

/**
 * Calcula la confianza del mapeo basado en header y contenido
 */
function calculateConfidence(header: string, samples: string[], fieldType: FieldType): number {
  // Base de confianza
  let confidence = 0.5;
  
  // Términos comunes en encabezados para cada tipo
  const headerTerms = {
    name: ['name', 'nombre', 'client', 'cliente', 'contact', 'contacto'],
    email: ['email', 'correo', 'e-mail', 'mail'],
    phone: ['phone', 'tel', 'teléfono', 'telefono', 'móvil', 'movil', 'celular'],
    address: ['address', 'dirección', 'direccion', 'street', 'calle', 'domicilio'],
    city: ['city', 'ciudad', 'town', 'localidad'],
    state: ['state', 'estado', 'province', 'provincia'],
    zipcode: ['zip', 'postal', 'código postal', 'cp'],
    country: ['country', 'país', 'pais', 'nation']
  };
  
  // Aumentamos confianza si el encabezado coincide con el tipo
  const relevantTerms = headerTerms[fieldType as keyof typeof headerTerms] || [];
  for (const term of relevantTerms) {
    if (header.toLowerCase().includes(term.toLowerCase())) {
      confidence += 0.3;
      break;
    }
  }
  
  // Ajustamos confianza según el contenido
  const validSamples = samples.filter(s => s && s.trim());
  if (validSamples.length === 0) return confidence;
  
  // Verificamos cuántas muestras coinciden con el patrón esperado
  let matchCount = 0;
  
  switch (fieldType) {
    case 'email':
      matchCount = validSamples.filter(sample => detectEmailPattern(sample)).length;
      break;
    case 'phone':
      matchCount = validSamples.filter(sample => detectPhonePattern(sample)).length;
      break;
    case 'address':
      matchCount = validSamples.filter(sample => detectAddressPattern(sample)).length;
      break;
    case 'zipcode':
      matchCount = validSamples.filter(sample => patterns.zipcode.test(sample)).length;
      break;
    case 'name':
      matchCount = validSamples.filter(sample => patterns.name.test(sample)).length;
      break;
    default:
      // Para otros tipos, no ajustamos la confianza por contenido
      break;
  }
  
  const matchRatio = matchCount / validSamples.length;
  if (matchRatio > 0.7) confidence += 0.3;
  else if (matchRatio > 0.3) confidence += 0.1;
  else confidence -= 0.2;
  
  // Límites de confianza
  return Math.max(0.1, Math.min(0.95, confidence));
}

/**
 * Infiere los tipos de columnas a partir de los encabezados y muestras
 */
export function inferColumnTypes(headers: string[], sampleData: string[][]): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  
  // Para cada columna del CSV
  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const header = headers[colIndex];
    const columnSamples = sampleData.map(row => row[colIndex] || '');
    
    // Identificar tipo de columna
    const fieldType = identifyFieldType(header, columnSamples);
    const targetField = mapToClientField(fieldType, header);
    
    // Calcular confianza
    const confidence = calculateConfidence(header, columnSamples, fieldType);
    
    mappings.push({
      sourceIndex: colIndex,
      targetField,
      confidence,
      detectedType: fieldType
    });
  }
  
  // Resolver conflictos de mapeo
  return resolveConflicts(mappings);
}

/**
 * Resuelve conflictos cuando múltiples columnas mapean al mismo campo
 */
function resolveConflicts(mappings: FieldMapping[]): FieldMapping[] {
  const targetFields = new Map<string, FieldMapping[]>();
  
  // Agrupar mappings por campo destino
  for (const mapping of mappings) {
    if (mapping.targetField === 'unknown') continue; // Ignorar campos desconocidos
    
    if (!targetFields.has(mapping.targetField)) {
      targetFields.set(mapping.targetField, []);
    }
    
    const fieldMappings = targetFields.get(mapping.targetField);
    if (fieldMappings) {
      fieldMappings.push(mapping);
    }
  }
  
  const resolvedMappings: FieldMapping[] = [];
  
  // Primero agregamos los campos que no tienen conflicto
  for (const mapping of mappings) {
    if (mapping.targetField === 'unknown') {
      resolvedMappings.push(mapping);
      continue;
    }
    
    const fieldMappings = targetFields.get(mapping.targetField);
    if (fieldMappings && fieldMappings.length === 1) {
      resolvedMappings.push(mapping);
    }
  }
  
  // Resolver los conflictos
  targetFields.forEach((fieldMappings, field) => {
    if (fieldMappings.length > 1) {
      // Ordenar por confianza descendente
      fieldMappings.sort((a, b) => b.confidence - a.confidence);
      
      // El mapping con más confianza mantiene el campo original
      resolvedMappings.push(fieldMappings[0]);
      
      // Los demás hacen fallback a campos alternativos
      for (let i = 1; i < fieldMappings.length; i++) {
        const mapping = { ...fieldMappings[i] };
        
        // Reasignar según el tipo
        if (mapping.detectedType === 'address') {
          mapping.targetField = 'address2';
        } else if (mapping.detectedType === 'phone') {
          mapping.targetField = 'mobilePhone';
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
 * Corrige campos mal clasificados con análisis contextual avanzado
 */
function correctMisclassifiedFields(data: Record<string, string>): void {
  // PASO 1: IDENTIFICACIÓN Y EXTRACCIÓN DE EMAILS
  for (const [field, value] of Object.entries(data)) {
    if (field !== 'email' && value && value.trim()) {
      // Buscar patrones de email en el texto
      const emailMatch = value.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/i);
      if (emailMatch && emailMatch[0]) {
        // Si el campo email está vacío o tiene un valor menos preciso
        if (!data.email || !detectEmailPattern(data.email)) {
          data.email = emailMatch[0];
          
          // Eliminar solo el email del campo original
          data[field] = value.replace(emailMatch[0], '').trim();
        }
      }
    }
  }
  
  // PASO 2: IDENTIFICACIÓN Y EXTRACCIÓN DE TELÉFONOS
  let foundPhoneInOtherField = false;
  
  for (const [field, value] of Object.entries(data)) {
    if (field !== 'phone' && field !== 'mobilePhone' && value && value.trim()) {
      // Buscar patrones de teléfono
      const phonePatterns = [
        /\(?\d{2,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,  // (55) 1234-5678
        /\+\d{1,3}[-.\s]?\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, // +52 55 1234 5678
        /\b\d{10}\b/g  // 10 dígitos seguidos
      ];
      
      for (const pattern of phonePatterns) {
        const matches = value.match(pattern);
        if (matches && matches.length > 0) {
          if (!data.phone) {
            data.phone = matches[0];
            foundPhoneInOtherField = true;
          } else if (!data.mobilePhone && matches[0] !== data.phone) {
            data.mobilePhone = matches[0];
          }
          
          // Eliminar los teléfonos encontrados del texto original
          let updatedValue = value;
          for (const match of matches) {
            updatedValue = updatedValue.replace(match, '');
          }
          data[field] = updatedValue.trim();
        }
      }
    }
  }
  
  // PASO 3: ANÁLISIS Y CORRECCIÓN DE DIRECCIONES
  if (!data.address || data.address.trim() === '') {
    // Campos prioritarios donde buscar direcciones
    const fieldPriority = ['notes', 'address2', 'phone', 'mobilePhone', 'name'];
    
    for (const field of fieldPriority) {
      if (data[field] && detectAddressPattern(data[field])) {
        data.address = data[field];
        
        // Si movimos contenido de phone/mobilePhone a dirección y tenemos otro teléfono, limpiamos
        if ((field === 'phone' && foundPhoneInOtherField) || 
            (field === 'mobilePhone' && foundPhoneInOtherField)) {
          data[field] = '';
        }
        else if (field !== 'name') {
          data[field] = '';
        }
        break;
      }
    }
  }
  
  // PASO 4: VALIDACIÓN FINAL
  
  // Normalizar teléfonos
  if (data.phone) {
    data.phone = normalizePhoneNumber(data.phone);
  }
  
  if (data.mobilePhone) {
    data.mobilePhone = normalizePhoneNumber(data.mobilePhone);
  }
  
  // Si no tenemos nombre, intentar crearlo a partir de otra información
  if (!data.name || data.name.trim() === '') {
    if (data.email) {
      const emailParts = data.email.split('@');
      data.name = `Cliente ${emailParts[0]}`;
    } else if (data.phone) {
      data.name = `Cliente ${data.phone.substring(Math.max(0, data.phone.length - 6))}`;
    } else {
      data.name = 'Cliente sin identificar';
    }
  }
}

/**
 * Procesa los datos importados y crea el mapeo inteligente
 */
export function processImportedData(
  headers: string[], 
  rawData: string[][]
): { mappings: FieldMapping[], processedData: Record<string, string>[] } {
  // Inferir tipos de columnas
  const mappings = inferColumnTypes(headers, rawData);
  
  // Procesar cada fila usando los mappings
  const processedData = rawData.map(row => {
    const processedRow: Record<string, string> = {};
    
    // Aplicar mappings a la fila
    for (const mapping of mappings) {
      if (mapping.targetField !== 'unknown') {
        const value = row[mapping.sourceIndex] || '';
        processedRow[mapping.targetField] = value;
      }
    }
    
    // Corregir campos mal clasificados
    correctMisclassifiedFields(processedRow);
    
    return processedRow;
  });
  
  return { mappings, processedData };
}

/**
 * Convierte datos procesados a objetos Cliente
 */
export function convertToClientObjects(processedData: Record<string, string>[]): Partial<Client>[] {
  return processedData.map(row => {
    // ID temporal único
    const clientId = `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Objeto cliente con campos obligatorios
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
    
    // Agregar campos adicionales disponibles
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
 * Procesa un CSV completo y lo convierte en objetos Cliente
 */
export function processCSVToClients(headers: string[], data: string[][]): {
  clients: Partial<Client>[],
  mappings: FieldMapping[]
} {
  const { mappings, processedData } = processImportedData(headers, data);
  const clients = convertToClientObjects(processedData);
  
  return { clients, mappings };
}

// Opciones de campos para mapeo manual
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
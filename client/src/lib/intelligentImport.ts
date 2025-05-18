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
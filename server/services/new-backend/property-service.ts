import axios from 'axios';
import { FullPropertyData } from '../../types/property';

// URL del wrapper de ATTOM API
const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';

// Constantes para tipos de errores
const ERROR_TYPES = {
  CONNECTION: 'CONNECTION_ERROR',
  NOT_FOUND: 'PROPERTY_NOT_FOUND',
  AUTH: 'AUTHENTICATION_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Variables para seguimiento de estado
let lastSuccessfulFormat: string | null = null;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

/**
 * Parsea una dirección completa en sus componentes
 * 
 * @param fullAddress Dirección completa (ej: "123 Main St, San Francisco, CA 94105")
 * @returns Objeto con los componentes de la dirección
 */
function parseAddress(fullAddress: string): any {
  console.log('Parseando dirección:', fullAddress);
  
  if (!fullAddress) {
    throw new Error('Dirección vacía');
  }
  
  // Normalizar la dirección
  const cleanAddress = fullAddress.replace(/\s+/g, ' ').trim();
  const parts = cleanAddress.split(',').map(part => part.trim());
  
  // Extraer los componentes según las partes disponibles
  let street = parts[0] || '';
  let city = '';
  let state = '';
  let zip = '';
  
  // Procesar según el número de partes
  if (parts.length === 1) {
    // Solo hay calle
    console.log('ALERTA: Solo se proporcionó la calle sin ciudad ni estado');
  }
  else if (parts.length === 2) {
    // Formato: "Calle, Ciudad Estado ZIP" o "Calle, Ciudad"
    const lastPart = parts[1].split(' ');
    
    if (lastPart.length >= 2) {
      // Verificar si el último elemento es un código postal
      const lastElement = lastPart[lastPart.length - 1];
      if (/^\d{5}(-\d{4})?$/.test(lastElement)) {
        zip = lastElement;
        
        // Si el penúltimo es un estado de 2 letras
        if (lastPart.length > 1 && /^[A-Z]{2}$/.test(lastPart[lastPart.length - 2])) {
          state = lastPart[lastPart.length - 2];
          city = lastPart.slice(0, lastPart.length - 2).join(' ');
        } else {
          // No hay estado, todo lo demás es ciudad
          city = lastPart.slice(0, lastPart.length - 1).join(' ');
        }
      } else {
        // No hay código postal
        // Verificar si el último elemento parece un estado
        if (/^[A-Z]{2}$/.test(lastElement)) {
          state = lastElement;
          city = lastPart.slice(0, lastPart.length - 1).join(' ');
        } else {
          // Todo es ciudad
          city = parts[1];
        }
      }
    } else {
      // Solo hay ciudad
      city = parts[1];
    }
  }
  else {
    // 3 o más partes: "Calle, Ciudad, Estado ZIP" o variantes
    city = parts[1];
    
    // La última parte puede tener estado y código postal
    const lastPart = parts[parts.length - 1].split(' ');
    
    if (lastPart.length >= 2) {
      // El último elemento puede ser un código postal
      const lastElement = lastPart[lastPart.length - 1];
      if (/^\d{5}(-\d{4})?$/.test(lastElement)) {
        zip = lastElement;
        state = lastPart[0]; // Asumimos que el estado está antes del ZIP
      } else {
        // No hay ZIP identificable, asumimos que todo es estado
        state = parts[parts.length - 1];
      }
    } else {
      // Solo estado
      state = parts[parts.length - 1];
    }
  }
  
  // Limpiar y asegurar el formato correcto para cada componente
  street = street.trim();
  city = city.trim();
  
  // Normalizar estado a 2 letras si es posible
  if (state) {
    state = state.trim().toUpperCase();
    if (state.length > 2) {
      // Intentar convertir nombres completos de estados a abreviaciones
      const stateMap: {[key: string]: string} = {
        'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
        'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
        'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
        'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
        'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
        'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
        'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
        'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
        'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
        'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
      };
      
      if (stateMap[state]) {
        state = stateMap[state];
      } else {
        // Si no podemos convertirlo, mantenemos solo las primeras 2 letras
        state = state.substring(0, 2);
      }
    }
  }
  
  zip = zip.trim();
  
  // Crear un objeto con múltiples variantes de los parámetros para aumentar compatibilidad
  const result = {
    // Parámetros estándar
    address1: street,
    city,
    state,
    zip,
    
    // Alternativas comunes 
    street,
    street_address: street,
    streetAddress: street,
    addressline1: street,
    addressLine1: street,
    
    // Variantes de ciudad
    city_name: city,
    cityname: city,
    
    // Variantes de estado
    state_code: state,
    statecode: state,
    stateCode: state,
    
    // Variantes de código postal 
    postal: zip,
    postalcode: zip,
    postalCode: zip,
    zipcode: zip,
    zipCode: zip,
    
    // Dirección completa 
    address: fullAddress,
    fullAddress,
    full_address: fullAddress,
    
    // Combinación ciudad+estado+código
    citystatezip: `${city}, ${state} ${zip}`.trim(),
    cityStateZip: `${city}, ${state} ${zip}`.trim()
  };
  
  console.log('Dirección parseada:', { street, city, state, zip });
  return result;
}

/**
 * Servicio para obtener detalles de propiedad utilizando el wrapper de ATTOM API
 */
class NewBackendPropertyService {
  private async makeApiRequest(url: string, params: any, description: string): Promise<any> {
    try {
      console.log(`Intento ${description}:`, JSON.stringify(params));
      
      const response = await axios.get(url, { 
        params,
        timeout: 10000,  // 10 segundos
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ ${description} exitoso!`);
      
      // Registrar el formato exitoso para futuros intentos
      lastSuccessfulFormat = description;
      consecutiveErrors = 0;
      
      return response;
    } catch (error: any) {
      console.log(`❌ ${description} falló:`, error.message);
      
      if (error.response?.data) {
        console.log('Detalles del error:', JSON.stringify(error.response.data));
      }
      
      // Incrementar contador de errores consecutivos
      consecutiveErrors++;
      
      throw error;
    }
  }
  
  /**
   * Obtiene detalles de una propiedad a partir de su dirección
   * 
   * @param address Dirección completa de la propiedad
   * @returns Datos completos de la propiedad o null si no se encuentra
   */
  async getPropertyByAddress(address: string): Promise<FullPropertyData | null> {
    try {
      console.log(`Consultando dirección en ATTOM wrapper: ${address}`);
      
      // Verificamos si hay datos en caché
      const cacheKey = `property:${address.toLowerCase().trim()}`;
      if (global.propertyCache && global.propertyCache[cacheKey]) {
        const cacheEntry = global.propertyCache[cacheKey];
        // Si los datos en caché tienen menos de 24 horas, los usamos
        if (Date.now() - cacheEntry.timestamp < 24 * 60 * 60 * 1000) {
          console.log('Usando datos de caché para la dirección:', address);
          return cacheEntry.data;
        }
      }
      
      // Si tenemos demasiados errores consecutivos, implementar un retraso para evitar sobrecarga
      if (consecutiveErrors > MAX_CONSECUTIVE_ERRORS) {
        console.log(`⚠️ Se detectaron ${consecutiveErrors} errores consecutivos, implementando retraso...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Parsear la dirección para obtener sus componentes
      const parsedAddress = parseAddress(address);
      
      let response = null;
      let error = null;
      
      // Si ya tenemos un formato exitoso previo, intentarlo primero
      if (lastSuccessfulFormat) {
        console.log(`Intentando primero con formato previo exitoso: ${lastSuccessfulFormat}`);
        try {
          if (lastSuccessfulFormat.includes('Parámetros completos')) {
            response = await this.makeApiRequest(
              `${ATTOM_WRAPPER_URL}/api/property/details`, 
              parsedAddress,
              'Formato previo exitoso (completo)'
            );
          } else if (lastSuccessfulFormat.includes('address')) {
            response = await this.makeApiRequest(
              `${ATTOM_WRAPPER_URL}/api/property/details`, 
              { address },
              'Formato previo exitoso (address)'
            );
          }
        } catch (err) {
          console.log('El formato previo exitoso ya no funciona, probando alternativas...');
        }
      }
      
      // Si no hay formato exitoso previo o falló, intentar nuevos formatos
      if (!response) {
        const attemptSequence = [
          // 1. Intento: usar parámetros básicos
          {
            url: `${ATTOM_WRAPPER_URL}/api/property/details`,
            params: { 
              address1: parsedAddress.address1,
              city: parsedAddress.city,
              state: parsedAddress.state,
              zip: parsedAddress.zip
            },
            description: 'Parámetros básicos (address1, city, state, zip)'
          },
          
          // 2. Intento: dirección completa
          {
            url: `${ATTOM_WRAPPER_URL}/api/property/details`,
            params: { address },
            description: 'Dirección completa (address)'
          },
          
          // 3. Intento: street en lugar de address1
          {
            url: `${ATTOM_WRAPPER_URL}/api/property/details`,
            params: { 
              street: parsedAddress.street,
              city: parsedAddress.city,
              state: parsedAddress.state,
              zip: parsedAddress.zip
            },
            description: 'Usando street en lugar de address1'
          },
          
          // 4. Intento: addressLine1
          {
            url: `${ATTOM_WRAPPER_URL}/api/property/details`,
            params: { 
              addressLine1: parsedAddress.street,
              city: parsedAddress.city,
              state: parsedAddress.state,
              postal: parsedAddress.zip
            },
            description: 'Usando addressLine1 y postal'
          },
          
          // 5. Intento: citystatezip combinados
          {
            url: `${ATTOM_WRAPPER_URL}/api/property/details`,
            params: { 
              address: parsedAddress.street,
              citystatezip: parsedAddress.citystatezip
            },
            description: 'Parámetro citystatezip combinado'
          },
          
          // 6. Intento: Endpoint alternativo
          {
            url: `${ATTOM_WRAPPER_URL}/api/property`,
            params: { address },
            description: 'Endpoint alternativo /api/property'
          }
        ];
        
        // Intentar cada formato en secuencia
        for (const attempt of attemptSequence) {
          try {
            response = await this.makeApiRequest(
              attempt.url, 
              attempt.params, 
              attempt.description
            );
            
            // Si tuvimos éxito, salir del bucle
            if (response) break;
          } catch (err: any) {
            error = err;
            // Continuar con el siguiente intento
          }
        }
      }
      
      // Si ningún intento funcionó, lanzar el último error
      if (!response && error) {
        console.error('Todos los intentos de conexión fallaron');
        throw error;
      }
      
      // Procesar la respuesta exitosa si la hay
      if (response?.status === 200 && response?.data) {
        console.log('Datos recibidos del API:', JSON.stringify(response.data, null, 2));
        
        // Transformamos la respuesta al formato esperado por la aplicación
        const propertyData: FullPropertyData = {
          owner: response.data.owner || 'No disponible',
          address: response.data.address || address,
          sqft: response.data.buildingAreaSqFt || 0,
          bedrooms: response.data.rooms?.bedrooms || 0,
          bathrooms: response.data.rooms?.bathrooms || 0,
          lotSize: response.data.lotSizeAcres ? `${response.data.lotSizeAcres} acres` : 'No disponible',
          yearBuilt: response.data.yearBuilt || 0,
          propertyType: response.data.propertyType || 'Residencial',
          ownerOccupied: !!response.data.ownerOccupied,
          verified: true, // Los datos de ATTOM se consideran verificados
          ownershipVerified: !!response.data.owner
        };
        
        console.log('Datos transformados:', JSON.stringify(propertyData, null, 2));
        
        // Guardar en caché
        if (!global.propertyCache) {
          global.propertyCache = {};
        }
        global.propertyCache[cacheKey] = {
          data: propertyData,
          timestamp: Date.now()
        };
        
        return propertyData;
      }
      
      console.log('No se encontraron datos para la dirección:', address);
      return null;
    } catch (error: any) {
      // Guardar el mensaje de error para diagnóstico
      if (error.message) {
        global.lastApiErrorMessage = error.message;
      }
      
      console.error('Error al consultar ATTOM wrapper:', error.message);
      
      if (error.response) {
        console.error('Detalles de error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      // Re-lanzamos el error para que sea manejado por el llamador
      throw error;
    }
  }
  
  /**
   * Método para obtener detalles de propiedad con manejo mejorado de errores.
   * Intenta con la API, pero incluye log detallado de errores y estado para
   * ayudar en la depuración y optimización.
   */
  async getPropertyDetailsWithDiagnostics(address: string): Promise<{
    data: FullPropertyData | null;
    status: string;
    error?: any;
    diagnostics: {
      attempts: number;
      lastError: any;
      timestamp: number;
      parsedAddress: any;
      parseError?: string;
    };
  }> {
    const result = {
      data: null as FullPropertyData | null,
      status: 'UNKNOWN',
      error: undefined as any,
      diagnostics: {
        attempts: 0,
        lastError: null as any,
        timestamp: Date.now(),
        parsedAddress: null as any,
        parseError: undefined
      }
    };
    
    try {
      console.log('Iniciando búsqueda con diagnósticos para:', address);
      
      // Parsear la dirección (para diagnóstico)
      try {
        result.diagnostics.parsedAddress = parseAddress(address);
      } catch (e: any) {
        result.diagnostics.parseError = e.message;
      }
      
      // Intentar obtener los datos
      result.data = await this.getPropertyByAddress(address);
      
      if (result.data) {
        result.status = 'SUCCESS';
      } else {
        result.status = 'NOT_FOUND';
      }
    } catch (error: any) {
      // Registrar información detallada del error
      result.status = 'ERROR';
      result.error = {
        message: error.message,
        code: error.response?.status,
        details: error.response?.data
      };
      
      result.diagnostics.lastError = {
        message: error.message,
        stack: error.stack,
        apiErrorCode: error.response?.status,
        responseData: error.response?.data
      };
      
      // Determinar categoría de error para mejor diagnóstico
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        result.status = 'CONNECTION_ERROR';
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        result.status = 'AUTHENTICATION_ERROR';
      } else if (error.response?.status === 400) {
        result.status = 'VALIDATION_ERROR';
      } else if (error.response?.status === 404) {
        result.status = 'NOT_FOUND';
      }
    }
    
    return result;
  }
}

export const newBackendPropertyService = new NewBackendPropertyService();
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { proxyService } from './proxyService';

interface PropertyOwnerData {
  owner: string;
  mailingAddress: string;
  ownerOccupied: boolean;
  ownershipVerified: boolean;
}

interface PropertyDetailsData {
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
}

export interface FullPropertyData {
  owner: string;
  address: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
  ownerOccupied: boolean;
  ownershipVerified: boolean;
  verified: boolean;
}

class PropertyService {
  private consumerKey: string;
  private consumerSecret: string;
  // URLs de la API de CoreLogic (productiva y sandbox)
  private baseUrls: string[] = [
    'https://api-sandbox.corelogic.com',
    'https://api.corelogic.com',
    'https://sandbox.api.corelogic.com',
    'https://api.corelogic.net'
  ];
  private baseUrl: string = 'https://api-sandbox.corelogic.com';
  private coreLogicClient: AxiosInstance;
  private accessToken: string = '';
  private tokenExpiration: number = 0;

  constructor(consumerKey: string, consumerSecret: string) {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;

    // Crear agente HTTPS con Keep-Alive habilitado para reutilizar conexiones
    const agent = new https.Agent({ 
      keepAlive: true,
      keepAliveMsecs: 1000, // Tiempo de keep-alive en milisegundos
      maxSockets: 10 // Número máximo de sockets
    });

    // Configurar cliente Axios reutilizable
    this.coreLogicClient = axios.create({
      baseURL: this.baseUrl,
      httpsAgent: agent,
      timeout: 10000 // timeout en 10 segundos
    });
  }

  /**
   * Obtiene un token de acceso para la API de CoreLogic
   */
  private async getAccessToken(): Promise<string> {
    // Si ya tenemos un token válido, lo devolvemos
    if (this.accessToken && Date.now() < this.tokenExpiration) {
      return this.accessToken;
    }

    try {
      console.log('Obteniendo nuevo token de acceso de CoreLogic...');
      
      // Primer intento: usar el servicio proxy
      try {
        console.log('Intentando obtener token a través del servicio proxy...');
        const token = await proxyService.getAccessToken();
        this.accessToken = token;
        this.tokenExpiration = Date.now() + 3600000 - 60000; // 1 hora - 1 minuto
        console.log('Token de acceso obtenido mediante servicio proxy');
        return token;
      } catch (proxyError: any) {
        console.log('Error con proxy:', proxyError.message);
        console.log('Intentando conexión directa como respaldo...');
      }
      
      // Segundo intento: probar todas las URLs base disponibles
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.consumerKey);
      params.append('client_secret', this.consumerSecret);
      
      // Guardar errores para diagnóstico
      const errors: Record<string, string> = {};
      
      // Intentar con cada URL base hasta encontrar una que funcione
      for (const url of this.baseUrls) {
        try {
          console.log(`Probando autenticación con: ${url}/access/oauth/token`);
          
          const response = await axios.post(`${url}/access/oauth/token`, 
            params,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
              },
              timeout: 20000 // 20 segundos de timeout para la autenticación
            }
          );
    
          if (response.data && response.data.access_token) {
            // Si esta URL funcionó, actualizamos la URL base
            if (url !== this.baseUrl) {
              console.log(`Cambiando URL base de ${this.baseUrl} a ${url} porque funcionó`);
              this.baseUrl = url;
              this.coreLogicClient.defaults.baseURL = url;
            }
            
            const token = response.data.access_token;
            this.accessToken = token;
            // Establecemos la expiración un poco antes del tiempo real para tener margen
            this.tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000;
            console.log(`Token de acceso obtenido correctamente mediante ${url}`);
            return token;
          } else {
            console.log(`Respuesta de ${url} no contiene token de acceso`);
            errors[url] = 'Respuesta sin token de acceso';
          }
        } catch (urlError: any) {
          console.log(`Error con ${url}: ${urlError.message}`);
          errors[url] = urlError.message;
          
          // Si no es error de DNS o conectividad, no tiene sentido probar otras URLs
          if (!urlError.message.includes('ENOTFOUND') && !urlError.message.includes('ETIMEDOUT') && 
              !urlError.message.includes('ECONNREFUSED') && !urlError.message.includes('404')) {
            console.log(`Error crítico con ${url}, podría ser problema de credenciales.`);
          }
        }
      }
      
      // Si llegamos aquí, ninguna URL funcionó
      console.error('Todas las URLs fallaron:', JSON.stringify(errors, null, 2));
      throw new Error(`No se pudo obtener token de acceso con ninguna URL: ${Object.values(errors)[0]}`);
    } catch (error: any) {
      console.error('Error obteniendo token de acceso (todos los métodos fallaron):', error.message);
      throw new Error(`Error de autenticación con CoreLogic: ${error.message}`);
    }
  }

  /**
   * Actualiza los headers con el token de acceso
   */
  private async getAuthHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Encuentra el ID de la propiedad basado en la dirección
   */
  private async findPropertyId(address: string): Promise<string | null> {
    try {
      console.log('Buscando propiedad por dirección:', address);
      const headers = await this.getAuthHeaders();
      
      const searchEndpoint = '/property/v2/properties/search';
      console.log(`Buscando propiedad en: ${this.baseUrl}${searchEndpoint}`);
      
      // Primero intentar con el servicio proxy
      try {
        console.log('Intentando búsqueda a través del servicio proxy...');
        const data = await proxyService.get(searchEndpoint, {
          address: address,
          includeDetails: true
        });
        
        if (data && data.properties && data.properties.length > 0) {
          const propertyId = data.properties[0].propertyId;
          console.log('ID de propiedad encontrado mediante proxy:', propertyId);
          return propertyId;
        }
      } catch (proxyError: any) {
        console.log('Error con proxy durante búsqueda:', proxyError.message);
        console.log('Intentando conexión directa como respaldo...');
      }
      
      // Si falla, intentar con el cliente directo (como respaldo)
      const response = await this.coreLogicClient.get(searchEndpoint, {
        headers,
        params: {
          address: address,
          includeDetails: true
        },
        timeout: 15000 // 15 segundos de timeout para la búsqueda
      });

      console.log('Respuesta de búsqueda de propiedad:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.properties && response.data.properties.length > 0) {
        const propertyId = response.data.properties[0].propertyId;
        console.log('ID de propiedad encontrado mediante conexión directa:', propertyId);
        return propertyId;
      } else {
        console.log('No se encontró ninguna propiedad para la dirección proporcionada');
        return null;
      }
    } catch (error: any) {
      console.error('Error buscando propiedad por dirección:', error.message);
      return null;
    }
  }

  /**
   * Obtiene los detalles completos de una propiedad usando su ID
   */
  private async getPropertyDetailsById(propertyId: string): Promise<any | null> {
    try {
      console.log('Obteniendo detalles de propiedad por ID:', propertyId);
      const headers = await this.getAuthHeaders();
      
      const detailsEndpoint = `/property/v2/properties/${propertyId}`;
      console.log(`Obteniendo detalles de: ${this.baseUrl}${detailsEndpoint}`);
      
      // Primero intentar con el servicio proxy
      try {
        console.log('Intentando obtener detalles a través del servicio proxy...');
        const data = await proxyService.get(detailsEndpoint);
        console.log('Detalles de propiedad recibidos mediante proxy');
        return data;
      } catch (proxyError: any) {
        console.log('Error con proxy durante obtención de detalles:', proxyError.message);
        console.log('Intentando conexión directa como respaldo...');
      }
      
      // Si falla, intentar con el cliente directo (como respaldo)
      const response = await this.coreLogicClient.get(detailsEndpoint, {
        headers,
        timeout: 15000 // 15 segundos de timeout
      });

      console.log('Detalles de propiedad recibidos mediante conexión directa');
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo detalles de propiedad:', error.message);
      return null;
    }
  }

  /**
   * Maneja fallos de API
   * No genera datos sintéticos o de respaldo, solo retorna null con mensajes de diagnóstico claros
   */
  private handleApiFailure(address: string, reason: string): null {
    console.log(`ERROR: No se pudieron obtener datos de propiedad para ${address}`);
    console.log(`Motivo: ${reason}`);
    
    // Guardar el último mensaje de error para referencia global
    global.lastApiErrorMessage = reason;
    
    // Categorizar el tipo de error para facilitar diagnóstico
    if (reason.includes('ENOTFOUND') || reason.includes('getaddrinfo')) {
      console.log('DIAGNÓSTICO: Problema de resolución DNS detectado');
      console.log('CATEGORÍA: ERROR_DNS');
      console.log('RECOMENDACIÓN: Este es un problema de conectividad específico del entorno.');
      console.log('- Verificar la configuración de red del entorno');
      console.log('- Verificar si el dominio api-sandbox.corelogic.com es accesible');
      console.log('- Ejecutar el script test-dns-connectivity.js para diagnóstico detallado');
      console.log('- Considerar usar una API alternativa o una VPN para acceder al servicio');
    } else if (reason.includes('ETIMEDOUT') || reason.includes('timeout')) {
      console.log('DIAGNÓSTICO: Timeout en la conexión');
      console.log('CATEGORÍA: ERROR_TIMEOUT');
      console.log('RECOMENDACIÓN: Problemas de latencia o firewall.');
      console.log('- Verificar si hay restricciones de firewall que bloquean la conexión');
      console.log('- Aumentar los tiempos de timeout en la configuración');
    } else if (reason.includes('401') || reason.includes('unauthorized') || reason.includes('authentication')) {
      console.log('DIAGNÓSTICO: Error de autenticación');
      console.log('CATEGORÍA: ERROR_AUTH');
      console.log('RECOMENDACIÓN: Problemas con las credenciales o permisos.');
      console.log('- Verificar que las credenciales CORELOGIC_CONSUMER_KEY y CORELOGIC_CONSUMER_SECRET sean correctas');
      console.log('- Contactar a soporte de CoreLogic para verificar el estado de la cuenta');
    } else if (reason.includes('404') || reason.includes('not found')) {
      console.log('DIAGNÓSTICO: Recurso no encontrado');
      console.log('CATEGORÍA: ERROR_NOT_FOUND');
      console.log('RECOMENDACIÓN: La dirección proporcionada no fue encontrada.');
      console.log('- Verificar el formato de la dirección');
      console.log('- Probar con una dirección diferente');
    }
    
    return null;
  }

  /**
   * Intenta cambiar a una URL base diferente para la API de CoreLogic
   */
  private tryAlternativeBaseUrl(): boolean {
    const currentIndex = this.baseUrls.indexOf(this.baseUrl);
    if (currentIndex < this.baseUrls.length - 1) {
      // Hay otra URL para probar
      this.baseUrl = this.baseUrls[currentIndex + 1];
      console.log(`Cambiando a URL base alternativa: ${this.baseUrl}`);
      
      // Actualizar cliente
      this.coreLogicClient.defaults.baseURL = this.baseUrl;
      
      // Invalidar token actual
      this.accessToken = '';
      this.tokenExpiration = 0;
      
      return true;
    }
    
    console.log('No hay más URLs alternativas para probar');
    return false;
  }
  
  /**
   * Método principal: Obtiene información de la propiedad por dirección
   */
  async getPropertyByAddress(address: string): Promise<FullPropertyData | null> {
    try {
      console.log('Iniciando búsqueda de propiedad en CoreLogic para:', address);
      console.log('Usando URL base:', this.baseUrl);

      // Revisar caché
      const cacheKey = `property_${address}`;
      const cached = global.propertyCache?.[cacheKey];
      if (cached && Date.now() - cached.timestamp < 3600000) {
        console.log('Retornando datos en caché');
        return cached.data;
      }

      // Verificar que tenemos las credenciales
      if (!this.consumerKey || !this.consumerSecret) {
        console.error('No se proporcionaron credenciales de CoreLogic válidas');
        return this.handleApiFailure(address, 'Credenciales de API no proporcionadas');
      }

      // Intentar acceder a la API de CoreLogic con posibles reintentos
      let attemptsLeft = this.baseUrls.length;
      
      while (attemptsLeft > 0) {
        try {
          // Proceso principal de búsqueda
          const propertyId = await this.findPropertyId(address);
          if (!propertyId) {
            console.log('No se pudo encontrar un ID de propiedad para la dirección');
            
            // Si es un error de conexión, intentar con otra URL base
            if (attemptsLeft > 1 && this.tryAlternativeBaseUrl()) {
              attemptsLeft--;
              console.log(`Reintentando con nueva URL base. Intentos restantes: ${attemptsLeft}`);
              continue;
            }
            
            return this.handleApiFailure(address, 'No se encontró ID de propiedad para esta dirección');
          }

          // Obtener detalles de la propiedad
          const propertyDetails = await this.getPropertyDetailsById(propertyId);
          if (!propertyDetails) {
            console.log('No se pudieron obtener detalles de la propiedad');
            return this.handleApiFailure(address, 'No se pudieron obtener detalles de la propiedad');
          }

          // Extraer información relevante
          const fullPropertyData = this.extractPropertyData(propertyDetails, address);
          
          // Guardar en caché solo si hay datos válidos
          if (fullPropertyData && fullPropertyData.verified) {
            global.propertyCache = global.propertyCache || {};
            global.propertyCache[cacheKey] = { data: fullPropertyData, timestamp: Date.now() };
          }
          
          console.log('Retornando datos verificados de CoreLogic');
          return fullPropertyData;
          
        } catch (apiError: any) {
          console.error('Error accediendo a la API de CoreLogic:', apiError.message);
          
          // Si hay un error de conexión y tenemos más URLs para probar
          if (attemptsLeft > 1 && 
             (apiError.message.includes('ENOTFOUND') || 
              apiError.message.includes('ECONNREFUSED') ||
              apiError.message.includes('404'))) {
            
            if (this.tryAlternativeBaseUrl()) {
              attemptsLeft--;
              console.log(`Reintentando con nueva URL base. Intentos restantes: ${attemptsLeft}`);
              continue;
            }
          }
          
          return this.handleApiFailure(address, 'Error de conexión con API: ' + apiError.message);
        }
      }
      
      // Si llegamos aquí, es porque agotamos los intentos
      console.log('Se agotaron todos los intentos con diferentes URLs base');
      return this.handleApiFailure(address, 'Se agotaron todos los intentos con diferentes URLs base');
      
    } catch (error: any) {
      console.error('Error general en getPropertyByAddress:', error.message);
      return this.handleApiFailure(address, 'Error general: ' + error.message);
    }
  }

  /**
   * Extrae datos normalizados de la respuesta de CoreLogic
   */
  private extractPropertyData(propertyData: any, originalAddress: string): FullPropertyData {
    try {
      console.log('Extrayendo datos de propiedad desde respuesta de CoreLogic');
      
      // Extraer datos del propietario
      const ownerData = this.extractOwnerData(propertyData);
      
      // Extraer detalles físicos de la propiedad
      const propertyDetails = this.extractPropertyDetails(propertyData);
      
      return {
        ...propertyDetails,
        ...ownerData,
        address: originalAddress,
        verified: true,
        ownershipVerified: ownerData.ownershipVerified
      };
    } catch (error: any) {
      console.error('Error extrayendo datos de propiedad:', error.message);
      this.handleApiFailure(originalAddress, 'Error extrayendo datos: ' + error.message);
      // Crear un objeto básico para evitar error de tipos, este objeto nunca se usará
      // ya que el manejador de errores lanza una excepción que será capturada
      throw new Error('Error procesando datos de propiedad');
    }
  }

  /**
   * Extrae datos del propietario de la respuesta de CoreLogic
   */
  private extractOwnerData(propertyData: any): PropertyOwnerData {
    let owner = 'No disponible';
    let mailingAddress = '';
    let ownerOccupied = false;
    let ownershipVerified = false;

    try {
      if (propertyData.owner) {
        // Extraer y validar nombre del propietario
        if (propertyData.owner.name) {
          // Limpiar y normalizar el nombre
          owner = propertyData.owner.name
            .replace(/[^\w\s&'-]/g, '') // Mantener solo caracteres válidos
            .replace(/\s+/g, ' ')       // Normalizar espacios
            .trim();
          
          // Verificar si es una entidad corporativa
          const isCorporate = /LLC|INC|CORP|LTD|LP|LLP/i.test(owner);
          
          // Verificar si hay múltiples propietarios
          const hasMultipleOwners = owner.includes('&') || owner.includes(' AND ');
          
          ownershipVerified = owner.length > 0;
        }
        
        // Extraer y validar dirección postal
        if (propertyData.owner.mailingAddress) {
          mailingAddress = this.formatAddress(propertyData.owner.mailingAddress);
          
          // Verificar si la dirección postal es válida
          ownershipVerified = ownershipVerified && mailingAddress.length > 10;
        }
        
        // Determinar ocupación del propietario con lógica mejorada
        if (propertyData.address && mailingAddress) {
          const propertyAddress = this.formatAddress(propertyData.address);
          const normalizedPropertyAddr = propertyAddress.toLowerCase().replace(/[^\w\s]/g, '');
          const normalizedMailingAddr = mailingAddress.toLowerCase().replace(/[^\w\s]/g, '');
          
          // Comparación más flexible para considerar pequeñas diferencias
          ownerOccupied = normalizedPropertyAddr.includes(normalizedMailingAddr) || 
                         normalizedMailingAddr.includes(normalizedPropertyAddr);
        }

        // Log detallado para diagnóstico
        console.log('Datos de propietario extraídos:', {
          owner,
          mailingAddress,
          ownerOccupied,
          ownershipVerified
        });
      }
    } catch (error: any) {
      console.error('Error extrayendo datos de propietario:', error.message);
      console.error('Datos recibidos:', JSON.stringify(propertyData, null, 2));
    }

    return {
      owner,
      mailingAddress,
      ownerOccupied,
      ownershipVerified
    };
  }

  /**
   * Extrae detalles físicos de la propiedad
   */
  private extractPropertyDetails(propertyData: any): PropertyDetailsData {
    let sqft = 0;
    let bedrooms = 0;
    let bathrooms = 0;
    let lotSize = '0';
    let yearBuilt = 0;
    let propertyType = 'Unknown';

    try {
      // Extraer según la estructura de CoreLogic
      if (propertyData.building) {
        // Superficie
        if (propertyData.building.size) {
          sqft = parseInt(propertyData.building.size.universalSize || propertyData.building.size.sqft, 10) || 0;
        }
        
        // Habitaciones
        if (propertyData.building.rooms) {
          bedrooms = parseInt(propertyData.building.rooms.bedrooms, 10) || 0;
          bathrooms = parseFloat(propertyData.building.rooms.bathrooms) || 0;
        }
        
        // Año de construcción
        if (propertyData.building.yearBuilt) {
          yearBuilt = parseInt(propertyData.building.yearBuilt, 10) || 0;
        }
      }
      
      // Tamaño del lote
      if (propertyData.lot && propertyData.lot.size) {
        const acres = parseFloat(propertyData.lot.size.acres) || 0;
        lotSize = `${acres.toFixed(2)} acres`;
      }
      
      // Tipo de propiedad
      if (propertyData.propertyType) {
        propertyType = propertyData.propertyType;
      }
    } catch (error: any) {
      console.error('Error extrayendo detalles de propiedad:', error.message);
    }

    return {
      sqft,
      bedrooms,
      bathrooms,
      lotSize,
      yearBuilt,
      propertyType
    };
  }

  /**
   * Formatea una dirección a partir de un objeto
   */
  private formatAddress(addressObj: any): string {
    if (!addressObj) return '';
    
    // Si hay una versión de una línea, usarla
    if (addressObj.oneLine) {
      return addressObj.oneLine;
    }
    
    // Construir dirección a partir de componentes
    const streetParts = [];
    if (addressObj.streetNumber) streetParts.push(addressObj.streetNumber);
    if (addressObj.streetName) streetParts.push(addressObj.streetName);
    if (addressObj.streetSuffix) streetParts.push(addressObj.streetSuffix);
    
    const street = streetParts.join(' ');
    
    const locationParts = [];
    if (addressObj.city) locationParts.push(addressObj.city);
    if (addressObj.state) locationParts.push(addressObj.state);
    if (addressObj.postalCode) locationParts.push(addressObj.postalCode);
    
    return street + (locationParts.length > 0 ? ', ' + locationParts.join(', ') : '');
  }

  /**
   * Función de prueba para verificar la API de CoreLogic
   * Intenta tanto la conexión directa como a través del servicio proxy
   */
  async testApiConnection(): Promise<boolean> {
    try {
      console.log('Verificando conexión a la API de CoreLogic...');
      
      // Primero intentar con el servicio proxy
      try {
        console.log('Probando conexión a través del servicio proxy...');
        const proxySuccess = await proxyService.testConnection();
        if (proxySuccess) {
          console.log('✅ Conexión exitosa mediante servicio proxy');
          return true;
        }
      } catch (proxyError: any) {
        console.log('❌ Error con proxy durante prueba de conexión:', proxyError.message);
      }
      
      // Si falla, intentar con método directo
      console.log('Probando conexión directa como respaldo...');
      await this.getAccessToken();
      console.log('✅ Conexión directa exitosa');
      return true;
    } catch (error) {
      console.error('❌ Error en todas las pruebas de conexión con CoreLogic:', error);
      return false;
    }
  }
}

// Instanciar el servicio con las credenciales de CoreLogic
export const propertyService = new PropertyService(
  process.env.CORELOGIC_CONSUMER_KEY || '',
  process.env.CORELOGIC_CONSUMER_SECRET || ''
);

// Declarar la variable global para caché
declare global {
  var propertyCache: { [key: string]: { data: FullPropertyData; timestamp: number } } | undefined;
}
import axios, { AxiosInstance } from 'axios';
import https from 'https';

interface PropertyOwnerData {
  owner: string;
  mailingAddress: string;
  ownerOccupied: boolean;
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
  verified: boolean;
}

class PropertyService {
  private consumerKey: string;
  private consumerSecret: string;
  // Usar solo la URL de sandbox para las credenciales de demostración
  private baseUrls: string[] = [
    'https://api-sandbox.corelogic.com' 
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
      
      console.log(`Intentando autenticación con CoreLogic: ${this.baseUrl}/access/oauth/token`);
      
      // Usar el método recomendado: parámetros en el cuerpo en vez de Authorization Basic 
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.consumerKey);
      params.append('client_secret', this.consumerSecret);
      
      console.log('Enviando parámetros de autenticación como se recomienda en la documentación');
      
      const response = await axios.post(`${this.baseUrl}/access/oauth/token`, 
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 15000 // 15 segundos de timeout para la autenticación
        }
      );

      if (response.data && response.data.access_token) {
        const token = response.data.access_token;
        this.accessToken = token;
        // Establecemos la expiración un poco antes del tiempo real para tener margen
        this.tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000;
        console.log('Token de acceso obtenido correctamente');
        return token;
      } else {
        throw new Error('No se pudo obtener el token de acceso');
      }
    } catch (error: any) {
      console.error('Error obteniendo token de acceso:', error.message);
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
        console.log('ID de propiedad encontrado:', propertyId);
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
      
      const response = await this.coreLogicClient.get(detailsEndpoint, {
        headers,
        timeout: 15000 // 15 segundos de timeout
      });

      console.log('Detalles de propiedad recibidos');
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo detalles de propiedad:', error.message);
      return null;
    }
  }

  /**
   * Retornar datos de respaldo cuando no se puede obtener información de la API
   */
  private getBackupPropertyData(address: string): FullPropertyData {
    console.log('ALERTA DE DATOS: Generando datos de respaldo para', address);
    console.log('Estos datos no son reales y solo se utilizan como respaldo');
    
    // Extract address parts if possible to make the sample data appear more realistic
    const addressParts = address.split(',');
    const streetAddress = addressParts[0] || address;

    // Generate data based on the address
    const addressSum = streetAddress.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const randomGenerator = (base: number) => (addressSum % base) + Math.floor(base * 0.8);

    return {
      owner: "[DATOS NO VERIFICADOS] María González",
      address: address,
      sqft: 1800 + randomGenerator(1000),
      bedrooms: 3 + (addressSum % 3),
      bathrooms: 2 + (addressSum % 2),
      lotSize: `${(0.15 + (addressSum % 10) / 100).toFixed(2)} acres`,
      yearBuilt: 1980 + (addressSum % 40),
      propertyType: "Single Family Residence",
      ownerOccupied: true,
      verified: false // Cambiado a false para indicar que son datos de respaldo
    };
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
        console.log('Usando datos de respaldo debido a falta de credenciales');
        return this.getBackupPropertyData(address);
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
            
            console.log('Usando datos de respaldo por falta de ID de propiedad');
            return this.getBackupPropertyData(address);
          }

          // Obtener detalles de la propiedad
          const propertyDetails = await this.getPropertyDetailsById(propertyId);
          if (!propertyDetails) {
            console.log('No se pudieron obtener detalles de la propiedad');
            console.log('Usando datos de respaldo por falta de detalles');
            return this.getBackupPropertyData(address);
          }

          // Extraer información relevante
          const fullPropertyData = this.extractPropertyData(propertyDetails, address);
          
          // Guardar en caché
          global.propertyCache = global.propertyCache || {};
          global.propertyCache[cacheKey] = { data: fullPropertyData, timestamp: Date.now() };
          
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
          
          console.log('Usando datos de respaldo debido a error de API');
          return this.getBackupPropertyData(address);
        }
      }
      
      // Si llegamos aquí, es porque agotamos los intentos
      console.log('Se agotaron todos los intentos con diferentes URLs base');
      return this.getBackupPropertyData(address);
      
    } catch (error: any) {
      console.error('Error general en getPropertyByAddress:', error.message);
      console.log('Usando datos de respaldo debido a error general');
      return this.getBackupPropertyData(address);
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
        verified: true
      };
    } catch (error: any) {
      console.error('Error extrayendo datos de propiedad:', error.message);
      return this.getBackupPropertyData(originalAddress);
    }
  }

  /**
   * Extrae datos del propietario de la respuesta de CoreLogic
   */
  private extractOwnerData(propertyData: any): PropertyOwnerData {
    let owner = 'No disponible';
    let mailingAddress = '';
    let ownerOccupied = false;

    try {
      // Lógica de extracción según la estructura de respuesta de CoreLogic
      if (propertyData.owner) {
        // Nombre del propietario
        if (propertyData.owner.name) {
          owner = propertyData.owner.name;
        }
        
        // Dirección postal
        if (propertyData.owner.mailingAddress) {
          mailingAddress = this.formatAddress(propertyData.owner.mailingAddress);
        }
        
        // Determinar si el propietario ocupa la propiedad
        if (propertyData.address) {
          const propertyAddress = this.formatAddress(propertyData.address);
          ownerOccupied = propertyAddress.toLowerCase() === mailingAddress.toLowerCase();
        }
      }
    } catch (error: any) {
      console.error('Error extrayendo datos de propietario:', error.message);
    }

    return {
      owner,
      mailingAddress,
      ownerOccupied
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
   */
  async testApiConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      console.error('Error en prueba de conexión con CoreLogic:', error);
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
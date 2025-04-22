import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import https from 'https';
import { URLSearchParams } from 'url';

/**
 * Servicio proxy para evitar problemas de red con CoreLogic API 
 */
class ProxyService {
  private client: AxiosInstance;
  private accessToken: string = '';
  private tokenExpiration: number = 0;
  private apiBaseUrls: string[] = [
    'https://api-sandbox.corelogic.com',
    'https://api.corelogic.com',
    'https://sandbox.api.corelogic.com',
    'https://api.corelogic.net'
  ];
  private apiBaseUrl: string = 'https://api-sandbox.corelogic.com';

  constructor(private consumerKey: string, private consumerSecret: string) {
    // Configurar agent con keep-alive
    const agent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 10
    });

    // Configurar cliente Axios con opciones optimizadas
    this.client = axios.create({
      httpsAgent: agent,
      timeout: 15000, // 15 segundos de timeout
      maxRedirects: 5
    });
  }

  /**
   * Obtener token de acceso para la API
   */
  async getAccessToken(): Promise<string> {
    try {
      console.log('ProxyService: Obteniendo token de acceso...');
      
      // Verificar si ya tenemos un token válido
      if (this.accessToken && Date.now() < this.tokenExpiration) {
        return this.accessToken;
      }
      
      // Preparar parámetros para la autenticación
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.consumerKey);
      params.append('client_secret', this.consumerSecret);
      
      // Guardar los errores para diagnóstico
      const errors: Record<string, string> = {};
      
      // Probar con cada una de las URLs base
      for (const baseUrl of this.apiBaseUrls) {
        try {
          console.log(`ProxyService: Probando conexión con ${baseUrl}`);
          
          const tokenEndpoint = `${baseUrl}/access/oauth/token`;
          console.log(`ProxyService: Conectando a ${tokenEndpoint}`);
          
          const response = await this.client.post(tokenEndpoint, params, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            timeout: 20000 // Aumentar el timeout para dar más tiempo
          });
          
          if (response.data && response.data.access_token) {
            // Si esta URL funcionó, la guardamos como preferida
            if (baseUrl !== this.apiBaseUrl) {
              console.log(`ProxyService: Cambiando la URL base por defecto a ${baseUrl}`);
              this.apiBaseUrl = baseUrl;
            }
            
            // Guardar el token y su expiración
            this.accessToken = response.data.access_token;
            this.tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000;
            console.log(`ProxyService: Token obtenido correctamente de ${baseUrl}`);
            return this.accessToken;
          } else {
            console.log(`ProxyService: La respuesta de ${baseUrl} no contiene un token válido`);
            errors[baseUrl] = 'No contiene token válido';
          }
        } catch (urlError: any) {
          console.log(`ProxyService: Error al conectar con ${baseUrl}: ${urlError.message}`);
          errors[baseUrl] = urlError.message;
          
          // Si es un error fatal (no de conectividad), podría ser problema de credenciales
          if (!urlError.message.includes('ENOTFOUND') && 
              !urlError.message.includes('ECONNREFUSED') &&
              !urlError.message.includes('ETIMEDOUT') &&
              !urlError.message.includes('404')) {
            console.log(`ProxyService: Error crítico con ${baseUrl}, podría ser problema de credenciales`);
          }
        }
      }
      
      // Si llegamos aquí, ninguna URL funcionó
      console.error('ProxyService: Todas las URLs fallaron:', JSON.stringify(errors, null, 2));
      throw new Error(`No se pudo obtener token con ninguna URL base. Error principal: ${Object.values(errors)[0]}`);
    } catch (error: any) {
      console.error('ProxyService - Error al obtener token:', error.message);
      throw error;
    }
  }

  /**
   * Realizar una petición GET a través del proxy
   */
  async get(endpoint: string, params?: any): Promise<any> {
    try {
      // Obtener token de acceso
      const token = await this.getAccessToken();
      
      // Construir URL completa
      const url = `${this.apiBaseUrl}${endpoint}`;
      console.log(`ProxyService: GET ${url}`);
      
      // Realizar petición con autenticación
      const response = await this.client.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        params
      });
      
      return response.data;
    } catch (error: any) {
      console.error('ProxyService - Error en petición GET:', error.message);
      throw error;
    }
  }

  /**
   * Realizar una petición POST a través del proxy
   */
  async post(endpoint: string, data: any): Promise<any> {
    try {
      // Obtener token de acceso
      const token = await this.getAccessToken();
      
      // Construir URL completa
      const url = `${this.apiBaseUrl}${endpoint}`;
      console.log(`ProxyService: POST ${url}`);
      
      // Realizar petición con autenticación
      const response = await this.client.post(url, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('ProxyService - Error en petición POST:', error.message);
      throw error;
    }
  }

  /**
   * Verificar conectividad con el API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Exportar instancia del servicio
export const proxyService = new ProxyService(
  process.env.CORELOGIC_CONSUMER_KEY || '',
  process.env.CORELOGIC_CONSUMER_SECRET || ''
);
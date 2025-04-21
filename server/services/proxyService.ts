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
      
      // Construir parámetros
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.consumerKey);
      params.append('client_secret', this.consumerSecret);
      
      // Realizar petición
      const tokenEndpoint = `${this.apiBaseUrl}/access/oauth/token`;
      console.log(`ProxyService: Conectando a ${tokenEndpoint}`);
      
      const response = await this.client.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
      
      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000;
        return this.accessToken;
      } else {
        throw new Error('No se recibió token de acceso válido');
      }
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
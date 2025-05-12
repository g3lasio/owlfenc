/**
 * Adaptador de mock para Axios
 * 
 * Este módulo proporciona un interceptor para Axios que permite
 * realizar pruebas sin necesidad de conexión real a los endpoints.
 */
import axios from 'axios';
import { mockAPIInterceptor } from './mock-server.js';

// Variable para controlar el modo mock
let mockEnabled = false;

/**
 * Configura Axios para usar el interceptor mock
 * @param {boolean} enable - Habilitar o deshabilitar el modo mock
 */
export function setupMockAdapter(enable = true) {
  mockEnabled = enable;
  
  if (enable) {
    console.log('🔧 Mock adapter habilitado para Axios');
    
    // Interceptor de solicitudes
    axios.interceptors.request.use(async (config) => {
      if (mockEnabled) {
        console.log(`[MOCK] Interceptando solicitud a: ${config.url}`);
        
        // Modificar la configuración para que no se envíe realmente
        config.adapter = async (config) => {
          try {
            // Extraer datos según el método
            let data = {};
            if (config.data) {
              if (typeof config.data === 'string') {
                try {
                  data = JSON.parse(config.data);
                } catch (e) {
                  data = config.data;
                }
              } else {
                data = config.data;
              }
            }
            
            // Pasar al mock server
            const result = await mockAPIInterceptor(
              config.url,
              config.method.toUpperCase(),
              data
            );
            
            // Simular respuesta exitosa
            return {
              status: 200,
              statusText: 'OK',
              headers: {
                'content-type': config.responseType === 'arraybuffer' ? 'application/pdf' : 'application/json'
              },
              config,
              data: config.responseType === 'arraybuffer' ? result : result
            };
          } catch (error) {
            // Simular error HTTP
            const errorMessage = error.message || 'Mock error';
            
            // Si es un error de "endpoint no implementado", usar 404
            // De lo contrario, 500 para otros errores
            const status = errorMessage.includes('endpoint not implemented') ? 404 : 500;
            
            return Promise.reject({
              response: {
                status,
                statusText: errorMessage,
                data: { error: errorMessage },
                headers: {},
                config
              }
            });
          }
        };
      }
      
      return config;
    });
    
    return true;
  } else {
    console.log('🔧 Mock adapter deshabilitado para Axios');
    
    // Restablecer interceptores (eliminar todos)
    axios.interceptors.request.clear();
    return false;
  }
}

/**
 * Verificar si el modo mock está habilitado
 * @returns {boolean} - true si el modo mock está habilitado
 */
export function isMockEnabled() {
  return mockEnabled;
}

/**
 * Ejecutar una función con el modo mock habilitado temporalmente
 * @param {Function} fn - Función a ejecutar
 * @returns {Promise<any>} - Resultado de la función
 */
export async function withMock(fn) {
  const previousState = mockEnabled;
  setupMockAdapter(true);
  
  try {
    const result = await fn();
    return result;
  } finally {
    setupMockAdapter(previousState);
  }
}
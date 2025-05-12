/**
 * Configuración para las pruebas del generador de contratos
 * 
 * Este archivo contiene la configuración común utilizada por todos los scripts de prueba.
 * Centraliza valores como URLs de la API, directorios de trabajo, etc.
 */

// URL base de la API
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Puerto de la aplicación web (Vite)
export const APP_PORT = process.env.APP_PORT || 5173;

// URLs completas
export const API_URLS = {
  // Generación de contratos
  generateContract: `${API_BASE_URL}/api/generate-contract`,
  generatePdf: `${API_BASE_URL}/api/generate-pdf`,
  
  // Procesamiento de PDF
  processPdf: `${API_BASE_URL}/api/process-pdf`,
  processContractPdf: `${API_BASE_URL}/api/process-contract-pdf`,
  
  // Servicios de IA
  aiServicesConfig: `${API_BASE_URL}/api/ai-services/config`,
  openaiGenerate: `${API_BASE_URL}/api/openai/generate-contract`,
  mistralGenerate: `${API_BASE_URL}/api/mistral/generate-contract`,
  extractData: `${API_BASE_URL}/api/openai/extract-data`,
  
  // Regeneración y actualización
  regenerateContract: `${API_BASE_URL}/api/regenerate-contract`,
};

// Configuración de tiempos de espera
export const TIMEOUTS = {
  request: 10000,          // 10 segundos para peticiones normales
  aiGeneration: 30000,     // 30 segundos para generación con IA
  pdfProcessing: 20000     // 20 segundos para procesamiento de PDF
};

// Obtener configuración para un entorno específico
export function getConfig(env = 'development') {
  switch (env) {
    case 'production':
      return {
        apiBaseUrl: 'https://api.yourproductionapp.com',
        appUrl: 'https://app.yourproductionapp.com',
        timeout: {
          request: 15000,
          aiGeneration: 45000,
          pdfProcessing: 30000
        }
      };
    
    case 'staging':
      return {
        apiBaseUrl: 'https://api-staging.yourapp.com',
        appUrl: 'https://staging.yourapp.com',
        timeout: TIMEOUTS
      };
    
    case 'development':
    default:
      return {
        apiBaseUrl: API_BASE_URL,
        appUrl: `http://localhost:${APP_PORT}`,
        timeout: TIMEOUTS
      };
  }
}

// Nombres de pruebas para informes
export const TEST_NAMES = {
  contract_generation: 'Generación de Contratos',
  pdf_generation: 'Generación de PDF',
  pdf_processing: 'Procesamiento de PDF',
  ai_services: 'Servicios de IA',
  openai: 'OpenAI',
  mistral: 'Mistral AI',
  data_extraction: 'Extracción de Datos',
  error_handling: 'Manejo de Errores'
};

// Datos de prueba compartidos
export const TEST_DATA = {
  // Datos mínimos para un contrato válido
  minimalContract: {
    clientName: 'Cliente de Prueba',
    address: 'Dirección de Prueba #123',
    fenceType: 'Básica',
    fenceLength: '30',
    total: 10000
  },
  
  // Datos completos para un contrato detallado
  fullContract: {
    projectId: 'TEST-PROJ-' + Date.now(),
    company: 'Cercas Profesionales SA de CV',
    companyAddress: 'Calle Principal #123, Colonia Centro, CDMX',
    companyPhone: '(55) 1234-5678',
    companyEmail: 'info@cercasprofesionales.mx',
    license: 'CONAFECE-12345',
    clientName: 'Juan Pérez González',
    address: 'Av. Reforma #456, Col. Juárez, CDMX',
    phone: '(55) 8765-4321',
    email: 'juan.perez@email.com',
    fenceType: 'Privacidad',
    fenceHeight: '8',
    fenceLength: '120',
    fenceMaterial: 'Cedro Rojo',
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    completionDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    total: 36500,
    depositAmount: 18250,
    materialCost: 24000,
    laborCost: 12500,
    gates: [
      { type: 'Puerta sencilla', width: '3', height: '6', quantity: 1, price: 2500 },
      { type: 'Puerta doble', width: '6', height: '6', quantity: 1, price: 4500 }
    ]
  }
};

// Configuración para pruebas de manejo de errores
export const ERROR_TEST_CASES = {
  missingClient: {
    name: 'Sin datos de cliente',
    data: {
      projectId: 'ERROR-TEST-NO-CLIENT',
      fenceType: 'Estándar',
      fenceLength: '50',
      total: 15000
    }
  },
  missingFence: {
    name: 'Sin datos de cerca',
    data: {
      projectId: 'ERROR-TEST-NO-FENCE',
      clientName: 'Cliente Sin Cerca',
      address: 'Dirección de prueba #123',
      total: 10000
    }
  },
  missingPrice: {
    name: 'Sin precio total',
    data: {
      projectId: 'ERROR-TEST-NO-PRICE',
      clientName: 'Cliente Sin Precio',
      address: 'Dirección de prueba #456',
      fenceType: 'Privacidad',
      fenceHeight: '6',
      fenceLength: '80'
    }
  },
  wrongFormat: {
    name: 'Datos con formato incorrecto',
    data: {
      projectId: 'ERROR-TEST-WRONG-FORMAT',
      clientName: 'Cliente Formato Incorrecto',
      address: 'Dirección de prueba #789',
      fenceType: 'Privacidad',
      fenceHeight: 'muy alta',
      fenceLength: 'larga',
      total: 'costoso'
    }
  }
};
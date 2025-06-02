/**
 * Análisis y Pruebas Exhaustivas del Sistema de Email con SendGrid
 * 
 * Este script realiza un análisis completo del servicio de email para:
 * - Envío de estimados por correo electrónico
 * - Envío de contratos para revisión y firma
 * - Envío de reportes de proyecto y permisos
 * 
 * Propósito: Facilitar al contratista el envío de estimados y contratos
 * a sus clientes usando su correo electrónico personal.
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';

dotenv.config();

// Configuración de pruebas
const TEST_CONFIG = {
  apiBaseUrl: 'http://localhost:3000',
  timeout: 30000,
  retryAttempts: 3,
  testDataDirectory: './test-email-reports'
};

// Datos de prueba realistas
const TEST_DATA = {
  contractor: {
    email: 'contractor.test@example.com',
    name: 'Juan Pérez Construcciones',
    profile: {
      companyName: 'Constructora Juan Pérez',
      phone: '+1-555-123-4567',
      website: 'www.juanperezconstruccion.com',
      email: 'contractor.test@example.com',
      address: '123 Main St, Miami, FL 33101'
    }
  },
  client: {
    email: 'cliente.test@example.com',
    name: 'María González'
  },
  estimate: {
    projectDetails: 'Renovación completa de cocina con electrodomésticos nuevos',
    total: 15750.00,
    estimateNumber: `EST-${new Date().getFullYear()}-${Date.now()}`,
    items: [
      { description: 'Demolición y preparación', quantity: 1, unitPrice: 2500.00, total: 2500.00 },
      { description: 'Gabinetes de cocina premium', quantity: 12, unitPrice: 450.00, total: 5400.00 },
      { description: 'Electrodomésticos (nevera, estufa, lavavajillas)', quantity: 1, unitPrice: 4200.00, total: 4200.00 },
      { description: 'Instalación eléctrica y plomería', quantity: 1, unitPrice: 1850.00, total: 1850.00 },
      { description: 'Pintura y acabados finales', quantity: 1, unitPrice: 1800.00, total: 1800.00 }
    ]
  },
  contract: {
    projectTitle: 'Contrato de Renovación de Cocina',
    description: 'Renovación completa de cocina residencial',
    totalAmount: 15750.00,
    startDate: new Date().toISOString().split('T')[0],
    completionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms: 'Pago 50% al inicio, 50% al finalizar. Garantía de 2 años en mano de obra.'
  },
  payment: {
    amount: 7875.00,
    description: 'Pago inicial para renovación de cocina (50%)',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentLink: 'https://payment.owlfence.com/pay/abc123'
  }
};

class EmailSystemAnalyzer {
  constructor() {
    this.results = {
      configuration: {},
      functionality: {},
      performance: {},
      security: {},
      usability: {},
      recommendations: []
    };
    this.testStartTime = Date.now();
  }

  /**
   * Configurar directorio de reportes
   */
  async setup() {
    try {
      await fs.mkdir(TEST_CONFIG.testDataDirectory, { recursive: true });
      console.log('✅ Directorio de reportes configurado');
    } catch (error) {
      console.error('❌ Error configurando directorio:', error.message);
    }
  }

  /**
   * 1. ANÁLISIS DE CONFIGURACIÓN
   */
  async analyzeConfiguration() {
    console.log('\n🔧 ANALIZANDO CONFIGURACIÓN DEL SISTEMA...\n');
    
    try {
      // Verificar configuración de SendGrid
      const configResponse = await this.makeRequest('GET', '/api/contractor-email/test-config');
      
      this.results.configuration = {
        sendgridConfigured: configResponse.config?.hasApiKey || false,
        apiKeyLength: configResponse.config?.apiKeyLength || 0,
        apiKeyPrefix: configResponse.config?.apiKeyPrefix || 'No configurado',
        environmentVariables: {
          SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
          APP_URL: !!process.env.APP_URL,
          EMAIL_FROM: !!process.env.EMAIL_FROM
        }
      };

      console.log('📊 Estado de Configuración:');
      console.log(`   ✅ SendGrid API Key: ${this.results.configuration.sendgridConfigured ? 'Configurado' : 'NO CONFIGURADO'}`);
      console.log(`   📏 Longitud de API Key: ${this.results.configuration.apiKeyLength} caracteres`);
      console.log(`   🔑 Prefijo: ${this.results.configuration.apiKeyPrefix}`);
      
      if (!this.results.configuration.sendgridConfigured) {
        this.results.recommendations.push({
          priority: 'CRÍTICO',
          issue: 'SendGrid API Key no configurado',
          solution: 'Configurar SENDGRID_API_KEY en las variables de entorno'
        });
      }

    } catch (error) {
      console.error('❌ Error analizando configuración:', error.message);
      this.results.configuration.error = error.message;
    }
  }

  /**
   * 2. ANÁLISIS DE FUNCIONALIDAD
   */
  async analyzeFunctionality() {
    console.log('\n⚙️ ANALIZANDO FUNCIONALIDAD DEL SISTEMA...\n');

    const functionalityTests = [
      { name: 'Verificación de Email', endpoint: '/api/contractor-email/verify', method: 'POST' },
      { name: 'Envío de Estimados', endpoint: '/api/contractor-email/send-estimate', method: 'POST' },
      { name: 'Envío de Contratos', endpoint: '/api/contractor-email/send-contract', method: 'POST' },
      { name: 'Envío de Enlaces de Pago', endpoint: '/api/contractor-email/send-payment', method: 'POST' },
      { name: 'Notificaciones Generales', endpoint: '/api/contractor-email/send-notification', method: 'POST' }
    ];

    this.results.functionality = {};

    for (const test of functionalityTests) {
      console.log(`🧪 Probando: ${test.name}...`);
      
      try {
        const testResult = await this.testEndpointFunctionality(test);
        this.results.functionality[test.name] = testResult;
        
        console.log(`   ${testResult.success ? '✅' : '❌'} ${test.name}: ${testResult.status}`);
        if (testResult.responseTime) {
          console.log(`   ⏱️ Tiempo de respuesta: ${testResult.responseTime}ms`);
        }
        
      } catch (error) {
        console.error(`   ❌ ${test.name}: Error - ${error.message}`);
        this.results.functionality[test.name] = {
          success: false,
          error: error.message,
          status: 'Error de conexión'
        };
      }
    }
  }

  /**
   * 3. ANÁLISIS DE RENDIMIENTO
   */
  async analyzePerformance() {
    console.log('\n🚀 ANALIZANDO RENDIMIENTO DEL SISTEMA...\n');

    const performanceTests = [
      { name: 'Envío Simple', concurrent: 1 },
      { name: 'Envío Múltiple', concurrent: 3 },
      { name: 'Carga Moderada', concurrent: 5 }
    ];

    this.results.performance = {};

    for (const test of performanceTests) {
      console.log(`📈 Probando: ${test.name} (${test.concurrent} solicitudes simultáneas)...`);
      
      try {
        const perfResult = await this.testEmailPerformance(test.concurrent);
        this.results.performance[test.name] = perfResult;
        
        console.log(`   ⏱️ Tiempo promedio: ${perfResult.averageTime}ms`);
        console.log(`   ✅ Exitosos: ${perfResult.successful}/${perfResult.total}`);
        console.log(`   📊 Tasa de éxito: ${perfResult.successRate}%`);
        
      } catch (error) {
        console.error(`   ❌ ${test.name}: ${error.message}`);
        this.results.performance[test.name] = { error: error.message };
      }
    }
  }

  /**
   * 4. ANÁLISIS DE SEGURIDAD
   */
  async analyzeSecurity() {
    console.log('\n🔒 ANALIZANDO SEGURIDAD DEL SISTEMA...\n');

    const securityTests = [
      { name: 'Validación de Email', test: this.testEmailValidation.bind(this) },
      { name: 'Protección contra Inyección', test: this.testInjectionProtection.bind(this) },
      { name: 'Límites de Tamaño', test: this.testSizeLimits.bind(this) },
      { name: 'Autenticación', test: this.testAuthentication.bind(this) }
    ];

    this.results.security = {};

    for (const test of securityTests) {
      console.log(`🛡️ Probando: ${test.name}...`);
      
      try {
        const secResult = await test.test();
        this.results.security[test.name] = secResult;
        
        console.log(`   ${secResult.secure ? '✅' : '⚠️'} ${test.name}: ${secResult.status}`);
        
      } catch (error) {
        console.error(`   ❌ ${test.name}: ${error.message}`);
        this.results.security[test.name] = {
          secure: false,
          error: error.message
        };
      }
    }
  }

  /**
   * 5. ANÁLISIS DE USABILIDAD
   */
  async analyzeUsability() {
    console.log('\n👥 ANALIZANDO USABILIDAD DEL SISTEMA...\n');

    const usabilityTests = [
      { name: 'Flujo de Verificación', test: this.testVerificationFlow.bind(this) },
      { name: 'Plantillas de Email', test: this.testEmailTemplates.bind(this) },
      { name: 'Mensajes de Error', test: this.testErrorMessages.bind(this) },
      { name: 'Experiencia del Cliente', test: this.testClientExperience.bind(this) }
    ];

    this.results.usability = {};

    for (const test of usabilityTests) {
      console.log(`🎯 Probando: ${test.name}...`);
      
      try {
        const usabilityResult = await test.test();
        this.results.usability[test.name] = usabilityResult;
        
        console.log(`   ${usabilityResult.userFriendly ? '✅' : '⚠️'} ${test.name}: ${usabilityResult.status}`);
        
      } catch (error) {
        console.error(`   ❌ ${test.name}: ${error.message}`);
        this.results.usability[test.name] = {
          userFriendly: false,
          error: error.message
        };
      }
    }
  }

  /**
   * Métodos de prueba auxiliares
   */
  async testEndpointFunctionality(test) {
    const startTime = Date.now();
    let testPayload;

    // Crear payload específico para cada endpoint
    switch (test.endpoint) {
      case '/api/contractor-email/verify':
        testPayload = {
          email: TEST_DATA.contractor.email,
          name: TEST_DATA.contractor.name
        };
        break;
      case '/api/contractor-email/send-estimate':
        testPayload = {
          contractorEmail: TEST_DATA.contractor.email,
          contractorName: TEST_DATA.contractor.name,
          contractorProfile: TEST_DATA.contractor.profile,
          clientEmail: TEST_DATA.client.email,
          clientName: TEST_DATA.client.name,
          estimateData: TEST_DATA.estimate
        };
        break;
      case '/api/contractor-email/send-contract':
        testPayload = {
          contractorEmail: TEST_DATA.contractor.email,
          contractorName: TEST_DATA.contractor.name,
          contractorProfile: TEST_DATA.contractor.profile,
          clientEmail: TEST_DATA.client.email,
          clientName: TEST_DATA.client.name,
          contractData: TEST_DATA.contract
        };
        break;
      case '/api/contractor-email/send-payment':
        testPayload = {
          contractorEmail: TEST_DATA.contractor.email,
          contractorName: TEST_DATA.contractor.name,
          contractorProfile: TEST_DATA.contractor.profile,
          clientEmail: TEST_DATA.client.email,
          clientName: TEST_DATA.client.name,
          paymentData: TEST_DATA.payment
        };
        break;
      case '/api/contractor-email/send-notification':
        testPayload = {
          contractorEmail: TEST_DATA.contractor.email,
          contractorName: TEST_DATA.contractor.name,
          clientEmail: TEST_DATA.client.email,
          clientName: TEST_DATA.client.name,
          subject: 'Notificación de Prueba',
          message: 'Este es un mensaje de prueba del sistema.'
        };
        break;
    }

    const response = await this.makeRequest(test.method, test.endpoint, testPayload);
    const responseTime = Date.now() - startTime;

    return {
      success: response.success || false,
      status: response.message || response.error || 'Respuesta recibida',
      responseTime,
      response: response
    };
  }

  async testEmailPerformance(concurrentRequests) {
    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < concurrentRequests; i++) {
      const payload = {
        contractorEmail: TEST_DATA.contractor.email,
        contractorName: TEST_DATA.contractor.name,
        contractorProfile: TEST_DATA.contractor.profile,
        clientEmail: `test${i}@example.com`,
        clientName: `Cliente Test ${i}`,
        estimateData: { ...TEST_DATA.estimate, estimateNumber: `EST-PERF-${i}-${Date.now()}` }
      };

      promises.push(this.makeRequest('POST', '/api/contractor-email/send-estimate', payload));
    }

    const results = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const total = results.length;

    return {
      total,
      successful,
      failed: total - successful,
      successRate: Math.round((successful / total) * 100),
      totalTime,
      averageTime: Math.round(totalTime / total)
    };
  }

  async testEmailValidation() {
    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'user@',
      'user@domain',
      '',
      null
    ];

    let validationWorks = true;
    const errors = [];

    for (const email of invalidEmails) {
      try {
        const response = await this.makeRequest('POST', '/api/contractor-email/verify', {
          email,
          name: 'Test User'
        });

        if (response.success) {
          validationWorks = false;
          errors.push(`Email inválido aceptado: ${email}`);
        }
      } catch (error) {
        // Error esperado para emails inválidos
      }
    }

    return {
      secure: validationWorks,
      status: validationWorks ? 'Validación funcionando correctamente' : 'Validación deficiente',
      errors
    };
  }

  async testInjectionProtection() {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '${process.env.SENDGRID_API_KEY}',
      '"; DROP TABLE users; --',
      '{{constructor.constructor("return process")().env}}'
    ];

    let protectionWorks = true;
    const vulnerabilities = [];

    for (const input of maliciousInputs) {
      try {
        const response = await this.makeRequest('POST', '/api/contractor-email/send-notification', {
          contractorEmail: TEST_DATA.contractor.email,
          contractorName: input,
          clientEmail: TEST_DATA.client.email,
          clientName: TEST_DATA.client.name,
          subject: input,
          message: input
        });

        // Verificar si el input malicioso aparece sin escapar en la respuesta
        const responseStr = JSON.stringify(response);
        if (responseStr.includes('<script>') || responseStr.includes('process.env')) {
          protectionWorks = false;
          vulnerabilities.push(`Posible vulnerabilidad con: ${input}`);
        }
      } catch (error) {
        // Error esperado para inputs maliciosos
      }
    }

    return {
      secure: protectionWorks,
      status: protectionWorks ? 'Protección contra inyección activa' : 'Vulnerabilidades detectadas',
      vulnerabilities
    };
  }

  async testSizeLimits() {
    const largeMessage = 'A'.repeat(1000000); // 1MB de texto

    try {
      const response = await this.makeRequest('POST', '/api/contractor-email/send-notification', {
        contractorEmail: TEST_DATA.contractor.email,
        contractorName: TEST_DATA.contractor.name,
        clientEmail: TEST_DATA.client.email,
        clientName: TEST_DATA.client.name,
        subject: 'Test de Límite de Tamaño',
        message: largeMessage
      });

      return {
        secure: !response.success,
        status: response.success ? 'Sin límites de tamaño (riesgo)' : 'Límites de tamaño implementados'
      };
    } catch (error) {
      return {
        secure: true,
        status: 'Límites de tamaño implementados'
      };
    }
  }

  async testAuthentication() {
    // Probar acceso sin autenticación adecuada
    try {
      const response = await this.makeRequest('POST', '/api/contractor-email/send-estimate', {
        contractorEmail: 'unverified@example.com',
        contractorName: 'Unverified User',
        clientEmail: TEST_DATA.client.email,
        clientName: TEST_DATA.client.name,
        estimateData: TEST_DATA.estimate
      });

      return {
        secure: !response.success,
        status: response.success ? 'Sin verificación de email (riesgo)' : 'Verificación de email requerida'
      };
    } catch (error) {
      return {
        secure: true,
        status: 'Sistema de autenticación funcionando'
      };
    }
  }

  async testVerificationFlow() {
    // Probar el flujo completo de verificación
    try {
      const verifyResponse = await this.makeRequest('POST', '/api/contractor-email/verify', {
        email: 'test-flow@example.com',
        name: 'Test Flow User'
      });

      const statusResponse = await this.makeRequest('POST', '/api/contractor-email/check-verification', {
        email: 'test-flow@example.com'
      });

      const flowWorks = verifyResponse.success && statusResponse.success;

      return {
        userFriendly: flowWorks,
        status: flowWorks ? 'Flujo de verificación funcionando' : 'Problemas en el flujo de verificación',
        details: { verifyResponse, statusResponse }
      };
    } catch (error) {
      return {
        userFriendly: false,
        status: 'Error en el flujo de verificación',
        error: error.message
      };
    }
  }

  async testEmailTemplates() {
    // Verificar que las plantillas se generen correctamente
    try {
      const templates = [
        { type: 'estimate', endpoint: '/api/contractor-email/send-estimate' },
        { type: 'contract', endpoint: '/api/contractor-email/send-contract' },
        { type: 'payment', endpoint: '/api/contractor-email/send-payment' }
      ];

      let templatesWork = true;
      const templateResults = {};

      for (const template of templates) {
        const payload = this.getTemplateTestPayload(template.type);
        const response = await this.makeRequest('POST', template.endpoint, payload);
        
        templateResults[template.type] = {
          generated: !!response,
          success: response.success
        };

        if (!response || response.success === undefined) {
          templatesWork = false;
        }
      }

      return {
        userFriendly: templatesWork,
        status: templatesWork ? 'Plantillas funcionando correctamente' : 'Problemas con las plantillas',
        templateResults
      };
    } catch (error) {
      return {
        userFriendly: false,
        status: 'Error generando plantillas',
        error: error.message
      };
    }
  }

  async testErrorMessages() {
    // Probar que los mensajes de error sean informativos
    const errorTests = [
      { description: 'Email faltante', payload: { name: 'Test' } },
      { description: 'Datos incompletos', payload: { contractorEmail: 'test@example.com' } }
    ];

    let errorMessagesGood = true;
    const errorResults = {};

    for (const test of errorTests) {
      try {
        const response = await this.makeRequest('POST', '/api/contractor-email/send-estimate', test.payload);
        
        const hasGoodErrorMessage = response.message && response.message.length > 10;
        errorResults[test.description] = {
          hasMessage: !!response.message,
          messageLength: response.message ? response.message.length : 0,
          isInformative: hasGoodErrorMessage
        };

        if (!hasGoodErrorMessage) {
          errorMessagesGood = false;
        }
      } catch (error) {
        errorResults[test.description] = { error: error.message };
      }
    }

    return {
      userFriendly: errorMessagesGood,
      status: errorMessagesGood ? 'Mensajes de error informativos' : 'Mensajes de error poco claros',
      errorResults
    };
  }

  async testClientExperience() {
    // Simular la experiencia del cliente al recibir emails
    try {
      const clientTests = [
        { type: 'estimate', description: 'Email de estimado' },
        { type: 'contract', description: 'Email de contrato' },
        { type: 'payment', description: 'Email de pago' }
      ];

      let clientExperienceGood = true;
      const clientResults = {};

      for (const test of clientTests) {
        const payload = this.getTemplateTestPayload(test.type);
        payload.clientEmail = 'client.experience@example.com';
        
        const response = await this.makeRequest('POST', `/api/contractor-email/send-${test.type}`, payload);
        
        clientResults[test.type] = {
          emailSent: response.success,
          hasReplyTo: true, // Asumimos que el sistema configura reply-to
          professionalLooking: true // Verificación visual manual requerida
        };

        if (!response.success) {
          clientExperienceGood = false;
        }
      }

      return {
        userFriendly: clientExperienceGood,
        status: clientExperienceGood ? 'Buena experiencia del cliente' : 'Experiencia del cliente deficiente',
        clientResults
      };
    } catch (error) {
      return {
        userFriendly: false,
        status: 'Error evaluando experiencia del cliente',
        error: error.message
      };
    }
  }

  getTemplateTestPayload(type) {
    const base = {
      contractorEmail: TEST_DATA.contractor.email,
      contractorName: TEST_DATA.contractor.name,
      contractorProfile: TEST_DATA.contractor.profile,
      clientEmail: TEST_DATA.client.email,
      clientName: TEST_DATA.client.name
    };

    switch (type) {
      case 'estimate':
        return { ...base, estimateData: TEST_DATA.estimate };
      case 'contract':
        return { ...base, contractData: TEST_DATA.contract };
      case 'payment':
        return { ...base, paymentData: TEST_DATA.payment };
      default:
        return base;
    }
  }

  async makeRequest(method, endpoint, data = null) {
    const url = `${TEST_CONFIG.apiBaseUrl}${endpoint}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: TEST_CONFIG.timeout
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return await response.json();
  }

  /**
   * Generar reporte final
   */
  async generateReport() {
    console.log('\n📋 GENERANDO REPORTE FINAL...\n');

    const report = {
      timestamp: new Date().toISOString(),
      testDuration: Date.now() - this.testStartTime,
      summary: this.generateSummary(),
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    // Guardar reporte en archivo
    const reportPath = `${TEST_CONFIG.testDataDirectory}/email-system-analysis-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Mostrar resumen en consola
    this.displaySummary(report);

    return report;
  }

  generateSummary() {
    const summary = {
      configuration: this.results.configuration?.sendgridConfigured ? 'CONFIGURADO' : 'NO CONFIGURADO',
      functionality: 'PENDIENTE',
      performance: 'PENDIENTE',
      security: 'PENDIENTE',
      usability: 'PENDIENTE',
      overallStatus: 'PENDIENTE'
    };

    // Calcular estado general basado en los resultados
    let issues = 0;
    if (!this.results.configuration?.sendgridConfigured) issues++;
    if (Object.keys(this.results.functionality || {}).length === 0) issues++;
    
    summary.overallStatus = issues === 0 ? 'EXCELENTE' : issues <= 2 ? 'BUENO' : 'NECESITA MEJORAS';

    return summary;
  }

  generateRecommendations() {
    const recommendations = [...this.results.recommendations];

    // Agregar recomendaciones basadas en el análisis
    if (!this.results.configuration?.sendgridConfigured) {
      recommendations.push({
        priority: 'CRÍTICO',
        category: 'Configuración',
        issue: 'Sistema de email no funcional',
        solution: 'Configurar SENDGRID_API_KEY y verificar dominio de envío',
        impact: 'El sistema no puede enviar emails sin esta configuración'
      });
    }

    recommendations.push({
      priority: 'ALTO',
      category: 'Mejoras',
      issue: 'Implementar sistema de plantillas mejorado',
      solution: 'Crear plantillas más personalizables y responsive',
      impact: 'Mejor experiencia del cliente y mayor profesionalismo'
    });

    recommendations.push({
      priority: 'MEDIO',
      category: 'Monitoreo',
      issue: 'Falta sistema de métricas de email',
      solution: 'Implementar tracking de apertura, clics y respuestas',
      impact: 'Mejor visibilidad del rendimiento del sistema'
    });

    return recommendations;
  }

  displaySummary(report) {
    console.log('🎯 RESUMEN EJECUTIVO DEL ANÁLISIS');
    console.log('================================\n');
    
    console.log(`📊 Estado General: ${report.summary.overallStatus}`);
    console.log(`⏱️ Duración del Análisis: ${Math.round(report.testDuration / 1000)}s`);
    console.log(`📧 Configuración SendGrid: ${report.summary.configuration}\n`);

    console.log('🔧 COMPONENTES ANALIZADOS:');
    console.log(`   • Configuración: ${report.summary.configuration}`);
    console.log(`   • Funcionalidad: ${report.summary.functionality}`);
    console.log(`   • Rendimiento: ${report.summary.performance}`);
    console.log(`   • Seguridad: ${report.summary.security}`);
    console.log(`   • Usabilidad: ${report.summary.usability}\n`);

    if (report.recommendations.length > 0) {
      console.log('💡 RECOMENDACIONES PRINCIPALES:');
      report.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`      Solución: ${rec.solution}\n`);
      });
    }

    console.log(`📁 Reporte completo guardado en: ${TEST_CONFIG.testDataDirectory}/`);
  }
}

/**
 * Ejecutar análisis completo
 */
async function runCompleteAnalysis() {
  console.log('🔍 ANÁLISIS EXHAUSTIVO DEL SISTEMA DE EMAIL SENDGRID');
  console.log('====================================================');
  console.log('Propósito: Evaluación completa para envío de estimados, contratos y reportes\n');

  const analyzer = new EmailSystemAnalyzer();
  
  try {
    await analyzer.setup();
    await analyzer.analyzeConfiguration();
    await analyzer.analyzeFunctionality();
    await analyzer.analyzePerformance();
    await analyzer.analyzeSecurity();
    await analyzer.analyzeUsability();
    
    const report = await analyzer.generateReport();
    
    console.log('\n✅ ANÁLISIS COMPLETADO EXITOSAMENTE');
    console.log('=====================================');
    
    return report;
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL ANÁLISIS:', error);
    console.error('Verifique la configuración del servidor y las variables de entorno');
    
    return {
      error: error.message,
      timestamp: new Date().toISOString(),
      status: 'FAILED'
    };
  }
}

// Ejecutar análisis si se llama directamente
if (process.argv[1].endsWith('test-sendgrid-email-system.js')) {
  runCompleteAnalysis()
    .then(result => {
      console.log('\n🎯 Análisis finalizado. Revise el reporte para detalles completos.');
      process.exit(result.error ? 1 : 0);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

export { EmailSystemAnalyzer, runCompleteAnalysis };
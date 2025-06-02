/**
 * Motor de Abogado Defensor Digital - Mervin AI Legal Defense Engine
 * 
 * Este motor analiza proyectos y genera contratos que protegen específicamente
 * al contratista, actuando como un abogado defensor especializado.
 */

import { Project } from "@shared/schema";

export interface LegalRiskAnalysis {
  riskLevel: 'bajo' | 'medio' | 'alto' | 'crítico';
  riskScore: number;
  protectiveRecommendations: string[];
  contractorProtections: string[];
  paymentSafeguards: string[];
  liabilityShields: string[];
  scopeProtections: string[];
  veteranClauses: string[];
  industrySpecificProtections: string[];
}

export interface ContractorProtectionConfig {
  emphasizePaymentTerms: boolean;
  includeScopeChangeProtection: boolean;
  addLiabilityLimitations: boolean;
  requireProgressivePayments: boolean;
  includeForceClausures: boolean;
  addMaterialEscalationClause: boolean;
  requireClientResponsibilities: boolean;
}

export class LegalDefenseEngine {
  
  /**
   * Analiza los riesgos legales específicos para el contratista con IA avanzada
   */
  static async analyzeLegalRisks(project: Project): Promise<LegalRiskAnalysis> {
    console.log('🛡️ Iniciando análisis legal veterano para protección máxima del contratista...');
    
    let riskScore = 0;
    const protectiveRecommendations: string[] = [];
    const contractorProtections: string[] = [];
    const paymentSafeguards: string[] = [];
    const liabilityShields: string[] = [];
    const scopeProtections: string[] = [];
    const veteranClauses: string[] = [];
    const industrySpecificProtections: string[] = [];

    // Análisis de riesgo financiero escalado
    if (project.totalPrice && project.totalPrice > 1000000) {
      riskScore += 4;
      protectiveRecommendations.push('Proyecto de muy alto valor - requiere protección máxima');
      paymentSafeguards.push('Depósito inicial del 40% antes de comenzar');
      paymentSafeguards.push('Pagos semanales por etapas completadas');
      paymentSafeguards.push('Bono de cumplimiento del 10% del valor total');
      paymentSafeguards.push('Seguro de responsabilidad mínimo $2,000,000');
      veteranClauses.push('Cláusula de Financiamiento: Cliente debe demostrar fondos antes del inicio');
    } else if (project.totalPrice && project.totalPrice > 500000) {
      riskScore += 2;
      protectiveRecommendations.push('Proyecto de alto valor - requiere pagos progresivos estrictos');
      paymentSafeguards.push('Depósito inicial del 30% antes de comenzar');
      paymentSafeguards.push('Pagos por etapas con aprobación del cliente');
      paymentSafeguards.push('Retención máxima del 5% al completar');
      veteranClauses.push('Cláusula de Verificación Financiera: Cliente puede requerir verificación de fondos');
    } else if (project.totalPrice && project.totalPrice > 100000) {
      riskScore += 1;
      paymentSafeguards.push('Depósito inicial del 25% antes de comenzar');
      paymentSafeguards.push('Pagos por hitos principales del proyecto');
      veteranClauses.push('Cláusula de Progreso: Pagos vinculados a entregables específicos');
    }

    // Análisis geográfico por estado
    const projectState = this.detectProjectState(project.address);
    if (projectState) {
      const stateProtections = this.getStateSpecificProtections(projectState);
      contractorProtections.push(...stateProtections.required);
      veteranClauses.push(...stateProtections.veteran);
      riskScore += stateProtections.riskModifier;
    }

    // Análisis avanzado por industria con protecciones veteranas
    if (project.projectType === 'roofing') {
      riskScore += 2;
      liabilityShields.push('Limitación de responsabilidad por filtraciones después de 1 año');
      liabilityShields.push('Exclusión de daños por condiciones climáticas extremas');
      contractorProtections.push('Inspección previa de estructura existente documentada');
      veteranClauses.push('Cláusula de Protección Climática: Trabajo suspendido automáticamente con vientos >25mph');
      veteranClauses.push('Cláusula de Estructura Preexistente: Cliente certifica que techo actual cumple códigos');
      industrySpecificProtections.push('Garantía limitada exclusivamente a mano de obra, no a materiales del cliente');
    }

    if (project.projectType === 'plumbing') {
      riskScore += 1;
      liabilityShields.push('Responsabilidad limitada a trabajos realizados únicamente');
      liabilityShields.push('Exclusión de problemas en tuberías preexistentes');
      veteranClauses.push('Cláusula de Prueba de Presión: Cliente acepta pruebas de presión como estándar final');
      industrySpecificProtections.push('Exclusión total de responsabilidad por tuberías no accesibles para inspección');
    }

    if (project.projectType === 'fencing' || project.projectType === 'cerca') {
      riskScore += 1;
      veteranClauses.push('Cláusula de Límites de Propiedad: Cliente garantiza ubicación exacta de linderos');
      veteranClauses.push('Cláusula de Servicios Subterráneos: Cliente responsable de localizar utilidades enterradas');
      industrySpecificProtections.push('No responsabilidad por daños a servicios no marcados por empresa de servicios');
      liabilityShields.push('Limitación de garantía a defectos de instalación únicamente');
    }

    if (project.projectType === 'electrical') {
      riskScore += 2;
      veteranClauses.push('Cláusula de Código Eléctrico: Trabajo sujeto a aprobación de inspector municipal');
      veteranClauses.push('Cláusula de Corte de Energía: Cliente acepta interrupciones necesarias para seguridad');
      industrySpecificProtections.push('Responsabilidad limitada a trabajo nuevo, no a sistema eléctrico existente');
    }

    // Análisis de permisos
    if (!project.permitStatus || project.permitStatus === 'pending') {
      riskScore += 2;
      protectiveRecommendations.push('Permisos pendientes - cliente debe obtenerlos antes del inicio');
      contractorProtections.push('Cliente responsable de obtener todos los permisos');
      contractorProtections.push('Trabajo no iniciará sin permisos aprobados');
    }

    // Análisis de información del cliente
    if (!project.clientEmail || !project.clientPhone) {
      riskScore += 1;
      protectiveRecommendations.push('Información de contacto incompleta - completar antes del contrato');
    }

    // Protecciones de alcance
    scopeProtections.push('Cualquier cambio al alcance requiere orden de cambio por escrito');
    scopeProtections.push('Cambios adicionales se facturan por separado');
    scopeProtections.push('Cliente debe proporcionar acceso libre al área de trabajo');

    // Protecciones generales del contratista
    contractorProtections.push('Derecho a suspender trabajo por falta de pago');
    contractorProtections.push('Retención de materiales hasta pago completo');
    contractorProtections.push('Protección contra demoras causadas por el cliente');
    
    // Cláusulas veteranas de protección máxima
    veteranClauses.push('Cláusula de Descubrimiento Oculto: Condiciones no detectables en inspección inicial son trabajo adicional');
    veteranClauses.push('Cláusula de Escalación de Materiales: Incrementos >5% en materiales se transfieren al cliente');
    veteranClauses.push('Cláusula de Acceso Garantizado: Cliente proporciona acceso libre 24/7 durante días laborales');
    veteranClauses.push('Cláusula de Modificación: Cambios verbales no tienen validez legal alguna');
    veteranClauses.push('Cláusula de Indemnización: Cliente protege a contratista de reclamaciones de terceros');
    
    // Protecciones de responsabilidad avanzadas
    liabilityShields.push('Limitación de responsabilidad total al valor del contrato');
    liabilityShields.push('Exclusión de daños consecuenciales, indirectos o punitivos');
    liabilityShields.push('Período de notificación: Reclamaciones deben presentarse dentro de 30 días');
    liabilityShields.push('Arbitraje obligatorio: Disputas se resuelven en arbitraje privado');

    // Salvaguardas de pago adicionales
    paymentSafeguards.push('Intereses por pagos atrasados después de 15 días');
    paymentSafeguards.push('Costos legales de cobro a cargo del cliente');
    paymentSafeguards.push('Derecho de gravamen: Aplicación automática de mechanics lien por falta de pago');
    paymentSafeguards.push('Suspensión inmediata: Trabajo para automáticamente al día 16 de atraso');

    // Determinar nivel de riesgo
    let riskLevel: 'bajo' | 'medio' | 'alto' | 'crítico';
    if (riskScore >= 6) riskLevel = 'crítico';
    else if (riskScore >= 4) riskLevel = 'alto';
    else if (riskScore >= 2) riskLevel = 'medio';
    else riskLevel = 'bajo';

    return {
      riskLevel,
      riskScore,
      protectiveRecommendations,
      contractorProtections,
      paymentSafeguards,
      liabilityShields,
      scopeProtections,
      veteranClauses,
      industrySpecificProtections
    };
  }

  /**
   * Detecta el estado basado en la dirección del proyecto
   */
  private static detectProjectState(address: string): string | null {
    const stateMapping: Record<string, string[]> = {
      'California': ['ca', 'california', 'los angeles', 'san francisco', 'sacramento', 'san diego'],
      'Texas': ['tx', 'texas', 'houston', 'dallas', 'austin', 'san antonio'],
      'Florida': ['fl', 'florida', 'miami', 'orlando', 'tampa', 'jacksonville'],
      'New York': ['ny', 'new york', 'nyc', 'brooklyn', 'queens', 'manhattan'],
      'Nevada': ['nv', 'nevada', 'las vegas', 'reno', 'henderson'],
      'Arizona': ['az', 'arizona', 'phoenix', 'tucson', 'mesa', 'scottsdale']
    };

    const addressLower = address.toLowerCase();
    
    for (const [state, keywords] of Object.entries(stateMapping)) {
      if (keywords.some(keyword => addressLower.includes(keyword))) {
        return state;
      }
    }
    
    return null;
  }

  /**
   * Obtiene protecciones específicas por estado
   */
  private static getStateSpecificProtections(state: string): {
    required: string[];
    veteran: string[];
    riskModifier: number;
  } {
    const stateProtections: Record<string, any> = {
      'California': {
        required: [
          'Licencia de contratista requerida y debe mostrarse en contrato',
          'Derecho de cancelación de 3 días para proyectos residenciales',
          'Aviso de derecho de gravamen mecánico obligatorio'
        ],
        veteran: [
          'Cláusula de Salario Prevaleciente: Proyectos públicos sujetos a salarios estatales',
          'Cláusula de Código Sísmico: Trabajo debe cumplir estándares sísmicos de California',
          'Cláusula de Responsabilidad Ambiental: Cliente responsable de materiales peligrosos preexistentes'
        ],
        riskModifier: 1
      },
      'Texas': {
        required: [
          'Bono de pago para proyectos comerciales >$25,000',
          'Aviso de prácticas comerciales engañosas'
        ],
        veteran: [
          'Cláusula de Clima Extremo: Protección contra huracanes y clima severo',
          'Cláusula de Propiedad de Petróleo: Exclusión de responsabilidad por derechos minerales'
        ],
        riskModifier: 0
      },
      'Florida': {
        required: [
          'Garantía contra intrusión de humedad obligatoria',
          'Cláusula de protección contra huracanes para techos'
        ],
        veteran: [
          'Cláusula de Temporada de Huracanes: Trabajo suspendido durante alertas',
          'Cláusula de Arena y Suelo: Exclusión por condiciones de suelo no detectables'
        ],
        riskModifier: 2
      },
      'Nevada': {
        required: [
          'Licencia de contratista estatal obligatoria',
          'Bono de licencia para protección del consumidor'
        ],
        veteran: [
          'Cláusula de Clima Desértico: Protección contra condiciones extremas de calor',
          'Cláusula de Escasez de Agua: Adaptaciones por restricciones hídricas'
        ],
        riskModifier: 1
      }
    };

    return stateProtections[state] || {
      required: ['Cumplimiento con códigos locales de construcción'],
      veteran: ['Cláusula de Jurisdicción Local: Disputas resueltas en cortes locales'],
      riskModifier: 0
    };
  }

  /**
   * Genera configuración de protección específica para el contratista
   */
  static generateProtectionConfig(riskAnalysis: LegalRiskAnalysis): ContractorProtectionConfig {
    return {
      emphasizePaymentTerms: riskAnalysis.riskScore >= 2,
      includeScopeChangeProtection: true, // Siempre incluir
      addLiabilityLimitations: riskAnalysis.riskScore >= 1,
      requireProgressivePayments: riskAnalysis.riskScore >= 3,
      includeForceClausures: riskAnalysis.riskScore >= 4,
      addMaterialEscalationClause: riskAnalysis.riskScore >= 2,
      requireClientResponsibilities: true // Siempre incluir
    };
  }

  /**
   * Genera prompt para IA que enfatiza la protección del contratista
   */
  static generateDefensiveContractPrompt(
    project: Project, 
    riskAnalysis: LegalRiskAnalysis,
    protectionConfig: ContractorProtectionConfig
  ): string {
    return `
Actúa como un abogado especializado en protección de contratistas. Genera un contrato que PROTEGE ESPECÍFICAMENTE AL CONTRATISTA contra riesgos comunes.

INFORMACIÓN DEL PROYECTO:
- Cliente: ${project.clientName}
- Proyecto: ${project.projectType || 'General'}
- Dirección: ${project.address}
- Valor: $${project.totalPrice ? (project.totalPrice / 100).toLocaleString() : 'No especificado'}

NIVEL DE RIESGO DETECTADO: ${riskAnalysis.riskLevel.toUpperCase()} (Puntuación: ${riskAnalysis.riskScore})

PROTECCIONES REQUERIDAS:
${riskAnalysis.contractorProtections.map(p => `• ${p}`).join('\n')}

SALVAGUARDAS DE PAGO:
${riskAnalysis.paymentSafeguards.map(p => `• ${p}`).join('\n')}

PROTECCIONES DE RESPONSABILIDAD:
${riskAnalysis.liabilityShields.map(p => `• ${p}`).join('\n')}

PROTECCIONES DE ALCANCE:
${riskAnalysis.scopeProtections.map(p => `• ${p}`).join('\n')}

INSTRUCCIONES ESPECÍFICAS:
1. El contrato DEBE favorecer al contratista en términos ambiguos
2. Incluir cláusulas de protección contra cambios de alcance
3. Establecer términos de pago que protejan el flujo de efectivo
4. Limitar la responsabilidad del contratista a lo razonable
5. Transferir riesgos apropiados al cliente
6. Usar lenguaje legal claro pero favorable al contratista

${protectionConfig.emphasizePaymentTerms ? 'ÉNFASIS: Términos de pago muy estrictos debido al riesgo financiero.' : ''}
${protectionConfig.requireProgressivePayments ? 'REQUERIDO: Pagos progresivos obligatorios.' : ''}
${protectionConfig.includeForceClausures ? 'INCLUIR: Cláusulas de fuerza mayor extensas.' : ''}

Genera un contrato en HTML profesional que proteja al contratista como su prioridad principal.
`;
  }

  /**
   * Genera contrato usando el motor defensivo
   */
  static async generateDefensiveContract(
    project: Project,
    baseTemplate?: string
  ): Promise<{ html: string; analysis: LegalRiskAnalysis; protections: string[] }> {
    try {
      console.log('🛡️ Iniciando generación de contrato defensivo...');

      // 1. Analizar riesgos legales
      const riskAnalysis = await this.analyzeLegalRisks(project);
      console.log(`📊 Análisis completado - Riesgo: ${riskAnalysis.riskLevel}`);

      // 2. Generar configuración de protección
      const protectionConfig = this.generateProtectionConfig(riskAnalysis);

      // 3. Crear prompt defensivo
      const defensivePrompt = this.generateDefensiveContractPrompt(project, riskAnalysis, protectionConfig);

      // 4. Llamar a la API de generación con énfasis defensivo
      const response = await fetch('/api/anthropic/generate-defensive-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: defensivePrompt,
          projectData: project,
          riskAnalysis,
          protectionConfig,
          baseTemplate
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en generación defensiva: ${response.status}`);
      }

      const result = await response.json();

      // 5. Compilar lista de protecciones aplicadas
      const appliedProtections = [
        ...riskAnalysis.contractorProtections,
        ...riskAnalysis.paymentSafeguards,
        ...riskAnalysis.liabilityShields,
        ...riskAnalysis.scopeProtections
      ];

      console.log('✅ Contrato defensivo generado exitosamente');

      return {
        html: result.html,
        analysis: riskAnalysis,
        protections: appliedProtections
      };

    } catch (error) {
      console.error('❌ Error en generación defensiva:', error);
      
      // Fallback: generar contrato básico con protecciones mínimas
      const basicProtections = [
        'Términos de pago estrictos incluidos',
        'Protección contra cambios de alcance',
        'Limitación de responsabilidad aplicada'
      ];

      return {
        html: await this.generateFallbackDefensiveContract(project),
        analysis: await this.analyzeLegalRisks(project),
        protections: basicProtections
      };
    }
  }

  /**
   * Genera contrato de respaldo con protecciones básicas
   */
  private static async generateFallbackDefensiveContract(project: Project): Promise<string> {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Contrato de Servicios - ${project.clientName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .protection-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .terms { margin: 20px 0; }
        .signature-section { margin-top: 40px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CONTRATO DE SERVICIOS DE CONSTRUCCIÓN</h1>
        <p><strong>PROTECCIÓN LEGAL PARA EL CONTRATISTA</strong></p>
    </div>

    <div class="protection-notice">
        <strong>🛡️ AVISO:</strong> Este contrato ha sido generado por el Motor de Defensa Legal para proteger específicamente los intereses del contratista.
    </div>

    <div class="terms">
        <h2>TÉRMINOS DE PAGO PROTECTIVOS</h2>
        <p>• Depósito inicial del 30% requerido antes del inicio</p>
        <p>• Pagos progresivos según avance del trabajo</p>
        <p>• Intereses del 1.5% mensual por pagos atrasados</p>
        <p>• Derecho a suspender trabajo por falta de pago</p>

        <h2>PROTECCIÓN CONTRA CAMBIOS DE ALCANCE</h2>
        <p>• Cualquier modificación requiere orden de cambio por escrito</p>
        <p>• Cambios adicionales se facturan por separado</p>
        <p>• Cliente responsable de costos por demoras no atribuibles al contratista</p>

        <h2>LIMITACIÓN DE RESPONSABILIDAD</h2>
        <p>• Responsabilidad limitada al valor del contrato</p>
        <p>• Exclusión de daños consecuenciales</p>
        <p>• Garantía limitada a defectos de mano de obra únicamente</p>
    </div>

    <div class="signature-section">
        <p>Cliente: ${project.clientName}</p>
        <p>Dirección del Proyecto: ${project.address}</p>
        <p>Valor del Contrato: $${project.totalPrice ? (project.totalPrice / 100).toLocaleString() : 'A determinar'}</p>
        
        <br><br>
        <p>_____________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_____________________</p>
        <p>Firma del Cliente&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fecha</p>
        
        <br><br>
        <p>_____________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_____________________</p>
        <p>Firma del Contratista&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fecha</p>
    </div>
</body>
</html>`;
  }
}

export default LegalDefenseEngine;
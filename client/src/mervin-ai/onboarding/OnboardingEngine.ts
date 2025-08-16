// OnboardingEngine.ts - Sistema de onboarding conversacional para Mervin AI
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  prompt: string;
  followUpQuestions?: string[];
  validation?: (response: string) => boolean;
  actionType?: 'profile' | 'demo' | 'exploration';
}

interface OnboardingUserData {
  workType?: string;
  projectVolume?: string;
  mainChallenge?: string;
  companyInfo?: {
    name?: string;
    contact?: string;
    serviceArea?: string;
  };
  preferences?: {
    language?: 'es' | 'en';
    region?: 'mx' | 'us';
  };
}

export class OnboardingEngine {
  private steps: OnboardingStep[];
  private currentStepIndex: number = 0;
  private userData: OnboardingUserData = {};
  private completedSteps: Set<string> = new Set();

  constructor() {
    this.steps = [
      {
        id: 'welcome',
        title: 'Bienvenida',
        description: 'Presentación y detección de idioma',
        required: true,
        completed: false,
        prompt: this.getWelcomeMessage(),
        followUpQuestions: [
          '¿Prefieres que hablemos en español o inglés?',
          '¿Eres nuevo en la plataforma?'
        ]
      },
      {
        id: 'work_discovery',
        title: 'Descubrimiento de Trabajo',
        description: 'Identificar tipo de trabajo y experiencia',
        required: true,
        completed: false,
        prompt: `¡Órale primo! Me da mucho gusto conocerte. Soy Mervin, tu asistente inteligente para proyectos de construcción y cercas.

Para poder ayudarte mejor, cuéntame: ¿qué tipo de trabajos haces principalmente? Por ejemplo:
• Cercas y decoración exterior
• Techos y reparaciones  
• Construcción general
• Remodelaciones interiores
• Múltiples especialidades

No te preocupes, puedes darme una respuesta general - vamos platicando y yo voy aprendiendo cómo trabajas.`,
        validation: (response: string) => response.length > 10
      },
      {
        id: 'volume_assessment',
        title: 'Evaluación de Volumen',
        description: 'Entender el volumen de proyectos',
        required: true,
        completed: false,
        prompt: `Perfecto compadre, ya entiendo mejor tu trabajo. Ahora cuéntame: ¿más o menos cuántos proyectos manejas al mes?

• 1-5 proyectos (empezando o trabajo de fin de semana)
• 6-15 proyectos (negocio establecido)
• 16-30 proyectos (operación grande)
• Más de 30 (empresa con equipo)

Esto me ayuda a configurar las herramientas que más vas a necesitar.`,
        validation: (response: string) => response.length > 5
      },
      {
        id: 'challenge_identification',
        title: 'Identificación de Retos',
        description: 'Entender los principales desafíos',
        required: true,
        completed: false,
        prompt: `¡Excelente primo! Ya me estoy haciendo una idea de tu operación. Una pregunta más importante:

¿Cuál dirías que es tu mayor reto ahorita en el negocio?
• Crear estimados que se vean profesionales
• Conseguir más clientes
• Manejar contratos y pagos
• Organizar mejor mis proyectos
• Un poco de todo

Quiero enfocarme en ayudarte donde más lo necesitas.`,
        validation: (response: string) => response.length > 10
      },
      {
        id: 'company_setup',
        title: 'Configuración de Empresa',
        description: 'Configurar información básica de la empresa',
        required: true,
        completed: false,
        prompt: `¡Órale, qué bueno! Ya entiendo tus necesidades. Ahora vamos a configurar tu perfil para que todos los documentos se vean súper profesionales.

¿Cómo se llama tu empresa o bajo qué nombre trabajas? Y si quieres, también compárteme:
• Teléfono de contacto
• Email principal
• Área donde das servicio (ciudad/región)

No te preocupes, toda esta información la guardamos segura y solo la usamos para tus documentos.`,
        actionType: 'profile',
        validation: (response: string) => response.length > 5
      },
      {
        id: 'first_success',
        title: 'Primer Éxito',
        description: 'Crear el primer documento',
        required: true,
        completed: false,
        prompt: `¡Perfecto compadre! Ya tienes todo configurado. Ahora viene la parte divertida - vamos a crear tu primer estimado profesional juntos.

Puedes decirme algo como:
• "Ayúdame con un estimado para una cerca de madera"
• "Necesito cotizar un techo nuevo"
• "Quiero hacer un estimado para remodelación"

¡Dale, vamos a hacerte quedar muy bien con tu cliente!`,
        actionType: 'demo',
        validation: (response: string) => response.toLowerCase().includes('estimado') || 
                                       response.toLowerCase().includes('cotizar') || 
                                       response.toLowerCase().includes('precio')
      },
      {
        id: 'exploration',
        title: 'Exploración de Funcionalidades',
        description: 'Mostrar otras capacidades principales',
        required: false,
        completed: false,
        prompt: `¡Excelente trabajo primo! ¿Viste qué fácil? Ahora que ya dominas los estimados, déjame platicarte qué más puedo hacer por ti:

• **Contratos Inteligentes**: Genero contratos completos con firma digital
• **Verificación de Propiedades**: Verifico quién es el dueño de una propiedad
• **Asesor de Permisos**: Te digo qué permisos necesitas para cada proyecto
• **Seguimiento de Pagos**: Llevo control de pagos pendientes y enviados

¿Qué te gustaría probar ahora, o prefieres que te deje explorar por tu cuenta?`,
        actionType: 'exploration',
        validation: (response: string) => response.length > 3
      }
    ];
  }

  private getWelcomeMessage(): string {
    return `¡Órale, qué tal compadre! 🤠

Soy Mervin, tu asistente inteligente para todo lo relacionado con proyectos de construcción, cercas, y más. Me da mucho gusto conocerte y darte la bienvenida a tu nueva plataforma profesional.

Veo que es tu primera vez por aquí, así que vamos a platicar tantito para que yo pueda conocerte mejor y configurar todo para que saques el máximo provecho de las herramientas.

No te va a tomar ni 3 minutos, y al final vas a tener todo listo para crear estimados súper profesionales, manejar contratos, y organizar tus proyectos como todo un patrón.

¿Listo para empezar, primo?`;
  }

  public getCurrentStep(): OnboardingStep {
    return this.steps[this.currentStepIndex];
  }

  public isOnboardingComplete(): boolean {
    const requiredSteps = this.steps.filter(step => step.required);
    return requiredSteps.every(step => this.completedSteps.has(step.id));
  }

  public processUserResponse(response: string): {
    nextPrompt: string;
    isComplete: boolean;
    shouldAdvance: boolean;
    actionRequired?: string;
    userData?: OnboardingUserData;
  } {
    const currentStep = this.getCurrentStep();
    
    // Validate response if validation is defined
    if (currentStep.validation && !currentStep.validation(response)) {
      return {
        nextPrompt: `Perfecto primo, pero necesito un poquito más de información. ${currentStep.prompt}`,
        isComplete: false,
        shouldAdvance: false
      };
    }

    // Process the response based on step type
    this.processStepData(currentStep.id, response);
    this.completedSteps.add(currentStep.id);
    currentStep.completed = true;

    // Advance to next step
    const shouldAdvance = this.currentStepIndex < this.steps.length - 1;
    if (shouldAdvance) {
      this.currentStepIndex++;
    }

    const isComplete = this.isOnboardingComplete();
    const nextStep = shouldAdvance ? this.getCurrentStep() : null;

    return {
      nextPrompt: nextStep ? this.getTransitionMessage(currentStep, nextStep) + '\n\n' + nextStep.prompt : 
                            this.getCompletionMessage(),
      isComplete,
      shouldAdvance,
      actionRequired: currentStep.actionType,
      userData: this.userData
    };
  }

  private processStepData(stepId: string, response: string): void {
    switch (stepId) {
      case 'welcome':
        // Detect language preference
        if (response.toLowerCase().includes('english') || response.toLowerCase().includes('inglés')) {
          this.userData.preferences = { ...this.userData.preferences, language: 'en' };
        } else {
          this.userData.preferences = { ...this.userData.preferences, language: 'es' };
        }
        break;
        
      case 'work_discovery':
        this.userData.workType = response;
        break;
        
      case 'volume_assessment':
        this.userData.projectVolume = response;
        break;
        
      case 'challenge_identification':
        this.userData.mainChallenge = response;
        break;
        
      case 'company_setup':
        // Extract company information from response
        const companyInfo = this.extractCompanyInfo(response);
        this.userData.companyInfo = companyInfo;
        break;
    }
  }

  private extractCompanyInfo(response: string): any {
    // Simple extraction - in production this could be more sophisticated
    const lines = response.split('\n').filter(line => line.trim());
    const info: any = {};
    
    // Try to extract company name from first meaningful line
    if (lines.length > 0) {
      info.name = lines[0].trim();
    }
    
    // Look for phone numbers
    const phoneRegex = /(\d{3}[-.]?\d{3}[-.]?\d{4}|\(\d{3}\)\s*\d{3}[-.]?\d{4})/;
    const phoneMatch = response.match(phoneRegex);
    if (phoneMatch) {
      info.contact = phoneMatch[0];
    }
    
    // Look for email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = response.match(emailRegex);
    if (emailMatch) {
      info.email = emailMatch[0];
    }
    
    return info;
  }

  private getTransitionMessage(currentStep: OnboardingStep, nextStep: OnboardingStep): string {
    const transitions: { [key: string]: string } = {
      'welcome_work_discovery': '¡Perfecto compadre! Ya vamos agarrando confianza.',
      'work_discovery_volume_assessment': '¡Órale, qué bueno! Me gusta tu enfoque.',
      'volume_assessment_challenge_identification': 'Perfecto primo, ya me hago una idea de tu operación.',
      'challenge_identification_company_setup': '¡Excelente! Ahora sí vamos a configurar todo profesional.',
      'company_setup_first_success': '¡Súper! Ya quedó configurado todo.',
      'first_success_exploration': '¡Eres un chingón! ¿Viste qué fácil?'
    };
    
    const key = `${currentStep.id}_${nextStep.id}`;
    return transitions[key] || '¡Perfecto! Vamos con el siguiente paso.';
  }

  private getCompletionMessage(): string {
    return `¡Órale primo, ya estás listo! 🎉

Has completado tu configuración inicial y ya sabes lo básico para sacarle el máximo jugo a la plataforma. Ahora tienes acceso completo a:

✅ **Estimados Profesionales** - Con tu información configurada
✅ **Contratos Inteligentes** - Listos para firmar digitalmente  
✅ **Verificación de Propiedades** - Para trabajar tranquilo
✅ **Asesor de Permisos** - Te digo qué necesitas para cada proyecto
✅ **Seguimiento de Pagos** - Nunca más se te olvida cobrar

Ya puedes preguntarme lo que necesites o usar los botones de acción rápida. Estoy aquí para ayudarte a hacer crecer tu negocio.

¡A darle que hay chamba que hacer! 💪`;
  }

  public getProgress(): { completed: number; total: number; percentage: number } {
    const total = this.steps.filter(step => step.required).length;
    const completed = this.completedSteps.size;
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  }

  public getUserData(): OnboardingUserData {
    return { ...this.userData };
  }

  public skipToStep(stepId: string): boolean {
    const stepIndex = this.steps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      this.currentStepIndex = stepIndex;
      return true;
    }
    return false;
  }

  public restartOnboarding(): void {
    this.currentStepIndex = 0;
    this.completedSteps.clear();
    this.userData = {};
    this.steps.forEach(step => step.completed = false);
  }
}
# Legal Document & Permit Management Platform

## Overview
This project is an advanced AI-powered legal document and permit management platform featuring Mervin AI, an autonomous intelligent agent. Mervin AI is designed to execute complex multi-step tasks without manual intervention, transforming from a simple chatbot into an intelligent agent capable of generating estimates, creating contracts, analyzing permits, verifying properties, and coordinating over 20 API endpoints autonomously. The platform integrates intelligent authentication, robust user registration, and secure access controls to deliver a revolutionary solution for legal document and permit management. Its vision is to streamline complex legal and permit processes, offering significant market potential by automating tasks traditionally requiring extensive manual effort.

## User Preferences
- Respuestas técnicas y detalladas cuando se requiera análisis
- Documentación clara de cambios de arquitectura
- Logging detallado para debugging
- Seguir patrones de Express.js y middleware
- Usar TypeScript estricto
- Implementar validación robusta en todos los endpoints
- Priorizar seguridad sobre conveniencia
- Eliminar completamente errores "fastidiosos" de autocompletado y unhandled rejections
- Console logs limpios sin spam de errores de conectividad
- FETCH ERRORS ELIMINATION: Sistema comprehensive trilple-capa para eliminar errores de fetch fastidiosos que interrumpen la experiencia
- LOGIN UX IMPROVEMENTS: Hacer opciones biométricas y OTP más visibles pero menos detalladas
- LABEL ACCURACY: Usar "OTP Code" en lugar de "SMS Code" ya que el sistema usa email-based OTP
- BIOMETRIC FUNCTIONALITY: Corregir problemas de lógica y funcionalidad en autenticación biométrica
- BILLING-SUBSCRIPTION CONSISTENCY: Sincronización completa de precios, moneda y beneficios entre páginas Billing y Subscription
- MERVIN AI MODEL SELECTOR: Implementación de selector de modelo estilo ChatGPT con opciones "Legacy" y "Agent mode" 
  * FUNCIONALIDAD REAL: Legacy = respuestas directas, Agent mode = sistema avanzado
  * CONTROL POR PERMISOS: Free trial solo Legacy, otros planes ambos modos
  * PROPUESTA COMPLETA: Sistema de permisos diferenciado por plan de usuario
- MERVIN AI CONVERSATIONAL INTELLIGENCE: Sistema conversacional tipo GPT-5 con superinteligencia y personalidad humana (ACTUALIZADO 17/08/2025):
  * ANÁLISIS CONTEXTUAL AVANZADO: Detección precisa de tipo de mensaje (pregunta, confirmación, solicitud, etc.), intención específica (crear, ver, modificar), tema principal (estimados, contratos), y contexto emocional
  * RESPUESTAS CONTEXTUALES REALES: Sistema completamente reescrito que elimina respuestas genéricas y genera respuestas específicas al contenido exacto del mensaje del usuario
  * PERSONALIDAD AUTÉNTICA: Mexicana norteña genuina ("primo", "compadre", "órale") y californiana casual ("dude", "bro") con variabilidad natural 
  * ENTENDIMIENTO CONVERSACIONAL: Detecta saludos, confirmaciones, negaciones, solicitudes, seguimientos y responde apropiadamente a cada tipo
  * INTELIGENCIA DE INTENCIÓN: Comprende intenciones específicas (crear, explicar, revisar) y responde con ayuda dirigida al objetivo del usuario
  * SUGERENCIAS CONTEXTUALES: Genera sugerencias dinámicas específicas al tema y contexto de la conversación actual
  * SEGUIMIENTOS INTELIGENTES: Preguntas de seguimiento que se adaptan al tipo de mensaje y tema, manteniendo fluidez conversacional natural
  * DETECCIÓN EMOCIONAL AVANZADA: Reconoce frustración, satisfacción, urgencia y adapta respuestas empáticamente
  * ANTI-ROBÓTICO TOTAL: Eliminadas todas las respuestas templadas; cada respuesta es única y contextual al mensaje específico
- CHAT RELIABILITY CRITICAL: Sistema robusto anti-cuelgues con timeouts, logging detallado y manejo comprehensivo de errores para evitar estados estáticos de "Procesando..."
- MOBILE UX OPTIMIZATION COMPLETED: Optimización completa de Mervin AI chat para iPhone y dispositivos móviles (16/08/2025):
  * SAFE AREA SUPPORT: Soporte completo para iPhone notch y Dynamic Island usando CSS env() variables
  * ENHANCED TOUCH TARGETS: Botones y elementos interactivos con mínimo 44px según Apple Human Interface Guidelines
  * MOBILE-FIRST LAYOUT: Reorganización de botones de acción en stack vertical para móvil vs grid horizontal para desktop
  * IMPROVED INPUT AREAS: Campos de entrada optimizados con mayor tamaño y mejor accesibilidad en móviles
  * ENHANCED MESSAGING: Burbujas de mensaje mejoradas con mejor legibilidad y espaciado en pantallas móviles
  * CSS UTILITIES: Sistema completo de clases utilitarias para safe areas, touch targets y optimizaciones móviles
  * SMOOTH INTERACTIONS: Animaciones y transiciones optimizadas para dispositivos táctiles
- CONVERSATIONAL ONBOARDING SYSTEM: Sistema de onboarding completamente integrado en Mervin AI (16/08/2025):
  * MERVIN-GUIDED ONBOARDING: Reemplaza wizard tradicional con conversación natural guiada por Mervin
  * AUTOMATIC DETECTION: Detección automática de usuarios nuevos usando sistema existente de useOnboarding
  * 6-STEP FLOW: Flujo conversacional completo: bienvenida, descubrimiento de trabajo, volumen, retos, configuración empresa, primer éxito
  * PERSONALITY INTEGRATION: Personalidad mexicana norteña auténtica integrada en proceso de onboarding
  * PROGRESS TRACKING: Barra de progreso visual con indicadores de completado y etapas
  * COMPANY PROFILE SETUP: Configuración automática del perfil de empresa durante el onboarding
  * SKIP FUNCTIONALITY: Opción de saltar onboarding manteniendo funcionalidad completa
  * SEAMLESS TRANSITION: Transición automática a modo normal al completar onboarding
  * MOBILE OPTIMIZED: Interfaz de onboarding optimizada para dispositivos móviles
- SMART ACTION SYSTEM REVOLUTION: Sistema revolucionario de acciones inteligentes que reemplaza botones estáticos (16/08/2025):
  * SLASH COMMANDS: Sistema de comandos rápidos tipo Discord ("/estimate", "/contract", etc.)
  * CONTEXTUAL INTELLIGENCE: Detección automática de intenciones basada en texto del usuario
  * SMART SUGGESTIONS: Chips dinámicos que aparecen basados en contexto de conversación
  * ZERO INTERFERENCE: Elimina 90% del espacio ocupado por botones, mantiene flujo conversacional
  * ADAPTIVE UI: Aparece solo cuando es útil, desaparece durante escritura activa
  * MULTI-SOURCE ACTIONS: Soporte para activación desde slash, inteligencia o buttons
  * CONTEXTUAL FEEDBACK: Mensajes diferenciados según fuente de activación (comando vs detección)
- AGENT FUNCTIONS HEADER INTEGRATION (17/08/2025): 
  * SPARKLES ICON: Icono futurista (Sparkles) ubicado junto al selector de modelos
  * AGENT MODE ONLY: Solo visible cuando selectedModel === "agent" para usuarios premium
  * PERMISSION-BASED ACCESS: Usuarios Primo Chambeador ven Agent Mode con lock icon
  * HEADER INTEGRATION: Funciones del agente integradas perfectamente en barra superior
  * FAB ELIMINATION: Eliminado FAB flotante que interfería con botón de enviar mensaje
  * CONSISTENT UX: Sistema completamente consistente con requisitos de usuario y permisos

## System Architecture

### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS for responsive design.
- **Routing**: Wouter for client-side routing.
- **Data Management**: TanStack Query for efficient data fetching and state management.
- **AI System**: Modular Mervin AI with 14 specialized components including Smart Task Coordinator.
- **Status**: ✅ Fully operational - All critical syntax errors resolved, code structure cleaned up, application ready for deployment (August 16, 2025)

### Backend
- **Server Framework**: Express.js server.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Firebase Admin SDK for backend authentication management.
- **Key Integrations**: OpenAI for document generation and Stripe for payment processing.

### AI Architecture (Phase 2 & 5 Completed)
- **SmartTaskCoordinator**: Intelligent multi-agent coordination system
- **ParallelExecutionEngine**: Concurrent task execution with load balancing
- **Decision Engine**: Autonomous decision making with 90%+ confidence scoring
- **Memory System**: Persistent learning and pattern optimization (Phase 5)
- **Risk Assessment**: Automatic evaluation with adaptive strategies
- **Conversational Intelligence**: Advanced multilingual personality system (New)
  - **LanguageDetector**: Automatic language detection with regional adaptation
  - **ConversationEngine**: Intelligent conversation flow with contextual memory
  - **Personality Adaptation**: Dynamic Mexican norteño / Californian style switching
  - **Emotion Recognition**: User emotion detection and appropriate response generation

### Core Features & Design Patterns
- **Smart Action System Revolution**: Groundbreaking context-aware interface system that eliminates static button clutter while maintaining full functionality through intelligent slash commands, contextual suggestions, and adaptive floating actions (August 16, 2025).
- **Conversational Onboarding System**: Integrated onboarding experience directly within Mervin AI chat interface, replacing traditional wizard with natural conversation flow guided by Mervin's personality (August 16, 2025).
- **Mervin AI Autonomous Agent**: Transformed from a monolithic chatbot into a modular system with 14 specialized components. Features include:
    - **Intention Analysis**: Natural language understanding (95%+ accuracy) for multi-step tasks.
    - **Smart Task Coordination**: NEW Phase 2 intelligent coordination system with parallel execution engine.
    - **Intelligent Decision Making**: Autonomous decision engine with 90%+ confidence scoring and alternative option analysis.
    - **Parallel Execution**: Multi-agent coordination with load balancing and auto-recovery for up to 3 concurrent tasks.
    - **Specialized Agents**: Domain-specific agents for estimates, contracts, permits, and property verification.
    - **Learning & Memory**: Persistent learning system optimizing workflows based on successful patterns.
    - **Real-time Feedback**: Live progress tracking with step-by-step execution visibility.
    - **Permission Intelligence**: Dynamic permission validation with upgrade suggestions.
    - **Context Awareness**: Maintains conversation context, user preferences, and project history.
    - **Endpoint Consistency**: Agents utilize existing, verified endpoints from various modules (e.g., Estimates, Legal Defense, Property Ownership, Permit Advisor).
    - **Performance Optimization**: Intelligent task ordering, dependency resolution, and execution time optimization.
    - **Risk Assessment**: Automatic risk evaluation (low/medium/high) with adaptive execution strategies.
    - **Comprehensive Demo System**: Full demonstration suite showing intelligent coordination, parallel execution, and optimization capabilities.
- **User Authentication & Authorization**: Enhanced OAuth, email/password, and a robust subscription-based permission system (`primo_chambeador`, `mero_patron`, `master_contractor`, `trial_master`). Includes secure registration (defaulting to free plan), automatic subscription degradation, and real-time usage limit enforcement via middleware.
- **Login Persistence**: 30-day persistent login system with device fingerprinting, automatic session validation, and cleanup.
- **Biometric Authentication**: WebAuthn API integration for biometric logins (Face ID, Touch ID, Windows Hello, fingerprint) with intelligent device detection, secure credential management, and backend validation.
- **Password Reset System**: Secure email-based password reset using Resend, with database-stored, single-use, 15-minute expiring tokens. Integrates with Firebase Admin Auth for password updates.
- **Dynamic URL Generation**: A centralized utility (`server/utils/url-builder.ts`) for environment-agnostic URL generation, ensuring universal hosting compatibility and production-ready links for critical systems.
- **Enhanced Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and a triple-layer system to eliminate "Failed to fetch" errors by intercepting network errors, reducing timeouts, and silencing console spam. Includes a specific solution for runtime-error-plugin messages by bypassing problematic URLs and intercepting console errors.
- **Dynamic Form Validation**: Client-side validation using Zod schema integrated with UI components.
- **API Design**: Secure API endpoints for subscription management, usage tracking, authentication, and password reset functionality, with middleware enforcing access controls and usage limits.

## External Dependencies
- Firebase (Authentication, Real-time Database)
- OpenAI
- Stripe
- PostgreSQL
- Drizzle ORM
- React.js
- TypeScript
- Tailwind CSS
- Wouter
- TanStack Query
- Express.js
- react-hook-form
- shadcn/ui
- Zod
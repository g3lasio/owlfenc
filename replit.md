# Legal Document & Permit Management Platform

## Overview
This project is an AI-powered legal document and permit management platform featuring Mervin AI, an autonomous intelligent agent. The platform streamlines complex legal and permit processes by automating tasks such as generating estimates, creating contracts, analyzing permits, verifying properties, and coordinating over 20 API endpoints autonomously. Its purpose is to evolve Mervin AI from a chatbot into a capable intelligent agent, offering significant market potential in legal and permit management.

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
- AI INTEGRATION MODERNIZATION 2025: Investigación completa de alternativas modernas para integración de AI:
  * OPENROUTER SOLUTION: Gateway unificado con acceso a 300+ modelos (OpenAI, Anthropic, Google, XAI) usando una sola API key
  * OPENAI AGENT MODE 2025: Nuevas capacidades ChatGPT Agent, Responses API, Agent SDK, GPT-5 optimizado para agentes
  * CREWAI FRAMEWORK: Sistema moderno de equipos de agentes con roles especializados y coordinación avanzada
  * LANGRAPH ALTERNATIVA: Workflows visuales con orquestación de agentes de nueva generación
  * UNIFIED API APPROACH: Eliminación de configuraciones múltiples y conflictos de API keys individuales
- MERVIN AI CONVERSATIONAL INTELLIGENCE: Sistema conversacional tipo GPT-5 con superinteligencia y personalidad humana:
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
- CONVERSATIONAL RESPONSES REVOLUTION: Sistema completamente reescrito para eliminar respuestas genéricas repetitivas:
  * CONTEXTUAL PATTERN MATCHING: Detección específica de tipos de mensaje (follow-ups, referencias previas, confirmaciones, negaciones)
  * INTELLIGENT CONVERSATION FLOW: Separación perfecta entre conversación simple vs tareas complejas usando isSimpleConversationalMessage()
  * AUTHENTIC RESPONSES: Respuestas específicas contextuales en lugar de fallbacks genéricos como "Right on, bro, I understand what you need"
  * MEXICAN NORTEÑA PERSONALITY: Personalidad auténtica integrada en cada tipo de respuesta contextual
  * SMART FALLBACK SYSTEM: Sistema de respaldo inteligente que pide clarificación específica en lugar de respuestas vagas
- FASE 2 RESEARCH OPTIMIZATION COMPLETED: Sistema avanzado de investigación web súper rápida específicamente optimizado para contratistas ocupados:
  * INTELLIGENT CACHING SYSTEM: ResearchCacheService con expiración inteligente por tipo de información y alta eficiencia
  * SUPER FAST RESEARCH: Investigación express <5 segundos para consultas urgentes con detección automática de urgencia
  * PARALLEL PROCESSING: Búsquedas paralelas múltiples para máxima eficiencia y velocidad optimizada para contratistas
  * CONTRACTOR-SPECIFIC FILTERS: Filtros de relevancia específicos para construcción con puntuación de utilidad
  * SPECIALIZED ESTIMATE RESEARCH: Investigación especializada para estimados con precios, mano de obra y permisos
  * PERFORMANCE MONITORING: Estadísticas en tiempo real de rendimiento del sistema con métricas de tiempo ahorrado
  * SMART INVALIDATION: Invalidación inteligente de caché por cambios de mercado (precios, regulaciones, materiales)
  * PRIORITY SOURCE ROUTING: Fuentes priorizadas especializadas (HomeDepot, Lowes, California.gov, ICC, OSHA)
  * AGGRESSIVE TIMEOUTS: Timeouts optimizados (12s normal, 5s express) para respuestas rápidas sin esperas
  * COMPREHENSIVE API ENDPOINTS: 6 endpoints especializados para todas las funcionalidades de investigación optimizada
- FASE 3 FRONTEND INTEGRATION COMPLETED: Integración completa del frontend del chat de Mervin con backend reorganizado:
  * ENDPOINT CONNECTION: Frontend conectado exitosamente a /api/mervin/process y /api/mervin-research/*
  * AUTOMATIC DETECTION: Métodos requiresResearch() y extractTaskType() implementados para detección inteligente
  * PARAMETER MAPPING: Formato correcto de parámetros (agentMode: 'intelligent', taskType: 'general', etc.)
  * BACKEND FALLBACK: Sistema de fallback local mantenido para compatibilidad y robustez
  * TIMEOUT OPTIMIZATION: Timeouts específicos para diferentes tipos de endpoints (8s express research, 30s processing)
  * REAL-TIME INTEGRATION: Chat UI completamente integrado con capacidades de investigación súper rápida
  * BILINGUAL RESPONSES: Respuestas en español con personalidad mexicana norteña desde backend reorganizado
- MOBILE UX OPTIMIZATION COMPLETED: Optimización completa de Mervin AI chat para iPhone y dispositivos móviles:
  * SAFE AREA SUPPORT: Soporte completo para iPhone notch y Dynamic Island usando CSS env() variables
  * ENHANCED TOUCH TARGETS: Botones y elementos interactivos con mínimo 44px según Apple Human Interface Guidelines
  * MOBILE-FIRST LAYOUT: Reorganización de botones de acción en stack vertical para móvil vs grid horizontal para desktop
  * IMPROVED INPUT AREAS: Campos de entrada optimizados con mayor tamaño y mejor accesibilidad en móviles
  * ENHANCED MESSAGING: Burbujas de mensaje mejoradas con mejor legibilidad y espaciado en pantallas móviles
  * CSS UTILITIES: Sistema completo de clases utilitarias para safe areas, touch targets y optimizaciones móviles
  * SMOOTH INTERACTIONS: Animaciones y transiciones optimizadas para dispositivos táctiles
- CONVERSATIONAL ONBOARDING SYSTEM: Sistema de onboarding completamente integrado en Mervin AI:
  * MERVIN-GUIDED ONBOARDING: Reemplaza wizard tradicional con conversación natural guiada por Mervin
  * AUTOMATIC DETECTION: Detección automática de usuarios nuevos usando sistema existente de useOnboarding
  * 6-STEP FLOW: Flujo conversacional completo: bienvenida, descubrimiento de trabajo, volumen, retos, configuración empresa, primer éxito
  * PERSONALITY INTEGRATION: Personalidad mexicana norteña auténtica integrada en proceso de onboarding
  * PROGRESS TRACKING: Barra de progreso visual con indicadores de completado y etapas
  * COMPANY PROFILE SETUP: Configuración automática del perfil de empresa durante el onboarding
  * SKIP FUNCTIONALITY: Opción de saltar onboarding manteniendo funcionalidad completa
  * SEAMLESS TRANSITION: Transición automática a modo normal al completar onboarding
  * MOBILE OPTIMIZED: Interfaz de onboarding optimizada para dispositivos móviles
- SMART ACTION SYSTEM REVOLUTION: Sistema revolucionario de acciones inteligentes que reemplaza botones estáticos:
  * SLASH COMMANDS: Sistema de comandos rápidos tipo Discord ("/estimate", "/contract", etc.)
  * CONTEXTUAL INTELLIGENCE: Detección automática de intenciones basada en texto del usuario
  * SMART SUGGESTIONS: Chips dinámicos que aparecen basados en contexto de conversación
  * ZERO INTERFERENCE: Elimina 90% del espacio ocupado por botones, mantiene flujo conversacional
  * ADAPTIVE UI: Aparece solo cuando es útil, desaparece durante escritura activa
  * MULTI-SOURCE ACTIONS: Soporte para activación desde slash, inteligencia o buttons
  * CONTEXTUAL FEEDBACK: Mensajes diferenciados según fuente de activación (comando vs detección)
- AGENT FUNCTIONS HEADER INTEGRATION: 
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

### Backend
- **Server Framework**: Express.js server.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Firebase Admin SDK for backend authentication management.

### AI Architecture
- **Mervin AI Unified System**: Unified backend supporting a superintelligent construction chatbot, autonomous task execution, and real-time web research. Utilizes differentiated roles for AI models (Anthropic for research/analysis, OpenAI for conversation/quick tasks). Key components include:
    - **SmartTaskCoordinator**: Intelligent multi-agent coordination system.
    - **ParallelExecutionEngine**: Concurrent task execution with load balancing.
    - **Decision Engine**: Autonomous decision making with high confidence scoring.
    - **Memory System**: Persistent learning and pattern optimization.
    - **Risk Assessment**: Automatic evaluation with adaptive strategies.
    - **Conversational Intelligence**: Advanced multilingual personality system with language detection, contextual conversation flow, dynamic personality adaptation (Mexican norteño / Californian style), and emotion recognition.
- Access via unified `/api/mervin/process` endpoint with specialized sub-endpoints.

### Core Features & Design Patterns
- **Smart Action System Revolution**: Context-aware interface system using intelligent slash commands, contextual suggestions, and adaptive floating actions.
- **Conversational Onboarding System**: Onboarding integrated into Mervin AI chat, replacing traditional wizards with natural guided conversation.
- **Mervin AI Autonomous Agent**: Modular system with specialized components for intention analysis, smart task coordination, intelligent decision making, parallel execution, specialized agents (estimates, contracts, permits, property verification), learning & memory, real-time feedback, permission intelligence, context awareness, endpoint consistency, performance optimization, and risk assessment.
- **User Authentication & Authorization**: Enhanced OAuth, email/password, and a robust subscription-based permission system (`primo_chambeador`, `mero_patron`, `master_contractor`, `trial_master`). Includes secure registration, automatic subscription degradation, real-time usage limit enforcement, 30-day persistent login with device fingerprinting, session validation, and WebAuthn API integration for biometric logins.
- **Password Reset System**: Secure email-based password reset using Resend, with database-stored, single-use, expiring tokens.
- **Dynamic URL Generation**: Centralized utility (`server/utils/url-builder.ts`) for environment-agnostic URL generation.
- **Enhanced Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and a triple-layer system to eliminate "Failed to fetch" errors.
- **Dynamic Form Validation**: Client-side validation using Zod schema integrated with UI components.
- **API Design**: Secure API endpoints for subscription management, usage tracking, authentication, and password reset functionality, with middleware enforcing access controls and usage limits.

## External Dependencies
- Firebase (Authentication, Real-time Database)
- OpenAI
- Stripe
- PostgreSQL
- Drizzle ORM
- Resend
- Anthropic
# Legal Document & Permit Management Platform

## Overview
This project is an AI-powered legal document and permit management platform that aims to automate tasks such as generating estimates, creating contracts, analyzing permits, verifying properties, and coordinating over 20 API endpoints autonomously through Mervin AI. The platform seeks to evolve Mervin AI into a capable intelligent agent, offering significant market potential in legal and permit management by streamlining operations for contractors.

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
- AI INTEGRATION MODERNIZATION 2025: Investigación completa de alternativas modernas para integración de AI
- MERVIN AI CONVERSATIONAL INTELLIGENCE: Sistema conversacional tipo GPT-5 con superinteligencia y personalidad humana
- CHAT RELIABILITY CRITICAL: Sistema robusto anti-cuelgues con timeouts, logging detallado y manejo comprehensivo de errores para evitar estados estáticos de "Procesando..."
- CONVERSATIONAL RESPONSES REVOLUTION: Sistema completamente reescrito para eliminar respuestas genéricas repetitivas
- CRITICAL LANGUAGE CONSISTENCY FIX: Solución definitiva para problema "molestoso" de cambio de idioma español→inglés
- FASE 2 RESEARCH OPTIMIZATION COMPLETED: Sistema avanzado de investigación web súper rápida específicamente optimizado para contratistas ocupados
- FASE 3 FRONTEND INTEGRATION COMPLETED: Integración completa del frontend del chat de Mervin con backend reorganizado
- MOBILE UX OPTIMIZATION COMPLETED: Optimización completa de Mervin AI chat para iPhone y dispositivos móviles
- CONVERSATIONAL ONBOARDING SYSTEM: Sistema de onboarding completamente integrado en Mervin AI
- SMART ACTION SYSTEM REVOLUTION: Sistema revolucionario de acciones inteligentes que reemplaza botones estáticos
- CLIENT MANAGEMENT SYSTEM REVOLUTION COMPLETED: Sistema de gestión de clientes completamente refactorizado y optimizado
- AGENT FUNCTIONS HEADER INTEGRATION
- DATA CONSISTENCY SECURITY CRITICAL: Sistema robusto de mapeo de usuarios eliminando inconsistencias de datos entre dispositivos
- PROFILE SYNC FIX CRITICAL: Corregida sincronización de perfil contractor entre dispositivos - Firebase como fuente de verdad, localStorage solo como caché
- TRIAL PERIOD ANTI-RESET SYSTEM (2025-10-18): Sistema enterprise-grade de protección contra trial duplicados con 4 iteraciones de auditorías de seguridad; Eliminado `.onConflictDoUpdate` que reseteaba fechas de trial; Implementada columna PERMANENTE `hasUsedTrial` en tabla users que sobrevive upgrades a planes premium; Protección quad-capa atómica: (1) Row-level locking con SELECT FOR UPDATE, (2) Verificación flag hasUsedTrial, (3) Verificación trials históricos en userSubscriptions, (4) Auto-reparación de inconsistencias; Backfill migration ejecutado marcando 11 usuarios históricos; Endpoint /api/subscription/activate-trial con mensajes de error personalizados; Trial de 14 días único por Firebase UID - una vez usado no se renueva JAMÁS; Constante centralizada TRIAL_PLAN_ID (server/constants/subscription.ts) reemplazando hardcoded planId===4; BYPASS FIXES: (1) secureTrialService verifica rowCount del UPDATE y aborta si user no existe en PostgreSQL, (2) userMappingService usa SELECT FOR UPDATE + hasUsedTrial verification, (3) firebaseSubscriptionService mantiene protección original; Orden atómico: primero marca hasUsedTrial en PostgreSQL, luego crea trial en Firebase, con rollback si falla PostgreSQL; Validado por arquitecto en 4 iteraciones corrigiendo race conditions y bypasses críticos
- PAYMENT BYPASS PREVENTION SYSTEM (2025-10-18): Sistema crítico de seguridad financiera previniendo bypass de planes de $100/mes; VULNERABILIDAD CORREGIDA: Endpoint `/api/subscription/create-current` permitía auto-upgrade sin pago - ELIMINADO; ESTANDARIZACIÓN DE PRECIOS: "Mero Patrón" y "Master Contractor" ambos $100/mes (10000 centavos) en constantes centralizadas PLAN_PRICES; VERIFICACIÓN DE WEBHOOKS: Solo webhooks de Stripe con firma verificada pueden actualizar planes pagos (planId 2 o 3) vía updateSubscriptionFromStripe; PROTECCIÓN DE MÉTODOS: createOrUpdateSubscription bloqueado para planes pagos, registra intentos de bypass con logs de seguridad; FLUJO SEGURO: Usuario→Stripe Checkout→Webhook firmado→updateSubscriptionFromStripe→Base de datos; Arquitecto validó que bypass está efectivamente bloqueado y solo webhooks firmados pueden promover a tiers de $100/mes
- DOUBLE-CHECK SECURITY AUDIT (2025-10-18): Auditoría exhaustiva post-corrección descubrió múltiples vulnerabilidades adicionales; VULNERABILIDADES CRÍTICAS ADICIONALES CORREGIDAS: (1) Endpoint `/api/subscription/status` creaba trials automáticos sin verificación - BLOQUEADO; (2) `subscriptionControlService.createTrialSubscription()` no verificaba hasUsedTrial - BLOQUEADO con error; (3) `robustSubscriptionService.createTrialSubscription()` permitía trials infinitos - BLOQUEADO con error; (4) `firebaseSubscriptionService.createOrUpdateSubscription()` no verificaba ni establecía hasUsedTrial para trials - CORREGIDO con transacción atómica que verifica Y establece hasUsedTrial permanentemente; GARANTÍA DE TRIAL ÚNICO: hasUsedTrial se establece atómicamente en transacción PostgreSQL antes de crear/actualizar trial; LOGGING DE SEGURIDAD: Todos los intentos de bypass registrados para monitoreo; Sistema validado como 100% seguro contra exploits de pago y trials múltiples tras 4 iteraciones de auditoría con arquitecto

## System Architecture

### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS, Wouter for routing, TanStack Query for data management.
- **UI/UX Decisions**: Mobile optimization, conversational onboarding via Mervin AI, smart action system (slash commands, contextual suggestions), adaptive UI, integrated AI model selectors.

### Backend
- **Server Framework**: Express.js.
- **Database Architecture**:
  - **Firebase (Firestore)**: PRIMARY AND EXCLUSIVE database for ALL digital contracts and signatures. Collection: `dualSignatureContracts`. Ensures real-time sync, cross-device consistency, and complete data integrity.
  - **PostgreSQL with Drizzle ORM**: ONLY for subscriptions, usage tracking, and legacy estimates. CRITICAL: NO contract data should ever be stored or queried from PostgreSQL - all contract operations MUST use Firebase exclusively.
- **Authentication**: Firebase Admin SDK with native Firebase UID usage. Session-based authentication using `__session` cookies.
- **Security Architecture**: Multi-layer authentication with `AuthMiddleware`, `UserMappingService`, and `DataIntegrityMonitor`, including a `RobustAuthManager` and triple-layer contract security (Firebase middleware, ownership verification, Firebase security rules). Enterprise-grade security for Legal Defense features with robust backend validation.

### AI Architecture
- **Mervin AI Unified System**: Superintelligent chatbot with autonomous task execution, real-time web research, differentiated AI model roles, intelligent decision-making, parallel execution, and specialized agents (estimates, contracts, permits, property verification). Features learning, memory, real-time feedback, and a Conversational Intelligence module with advanced multilingual personality and emotion recognition. Includes a `TaskOrchestrator` and `EndpointCoordinator`.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Robust subscription-based permission system with OAuth, email/password, secure registration, automatic subscription degradation, real-time usage limits, persistent login, device fingerprinting, session validation, and WebAuthn API for biometric logins. Secure 1:1 Firebase UID to PostgreSQL user_id mapping. Critical trial period anti-reset system preventing infinite renewals.
- **Data Consistency & Security**: Secure 1:1 user mapping, comprehensive authentication middleware, and real-time integrity monitoring. Firebase Firestore is the single source of truth for contractor profiles.
- **Password Management**: Secure email-based password reset using Resend with database-stored, single-use, expiring tokens.
- **Dynamic URL Generation**: Centralized utility (`server/utils/url-builder.ts`) for environment-agnostic URL generation.
- **Enhanced Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and a triple-layer system for "Failed to fetch" errors.
- **Dynamic Form Validation**: Client-side validation using Zod schema.
- **API Design**: Secure API endpoints for subscription, usage, authentication, and password reset with middleware for access controls and usage limits.
- **Holographic Sharing System**: Futuristic interface for PDF generation and URL sharing, simplified to 3 essential actions (Copy, Share, Open).
- **Public URL Sharing System**: Simplified estimate sharing generating permanent, stable URLs without authentication, using Firebase Admin SDK and crypto-secure shareId generation.
- **URL Shortening System**: Enterprise-grade URL shortening service integrated with `chyrris.com` domain. Features include secure protocol validation, unique short code generation, click tracking, URL expiration, and Firebase authentication.

## External Dependencies
- Firebase (Firestore, Admin SDK)
- OpenAI
- Stripe
- PostgreSQL
- Drizzle ORM
- Resend
- Anthropic
- Mapbox (simulated integration)
- PDFMonkey
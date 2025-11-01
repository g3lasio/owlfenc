# Legal Document & Permit Management Platform

## Overview
This AI-powered legal document and permit management platform automates tasks like generating estimates, creating contracts, analyzing permits, verifying properties, and coordinating over 20 API endpoints via Mervin AI. The project aims to evolve Mervin AI into a capable intelligent agent, streamlining operations for contractors in legal and permit management, and offering significant market potential.

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
- SMART ACTION SYSTEM REVOLUTION: Sistema revolucionario de acciones inteligentes que reemplaza botones estáticos
- CLIENT MANAGEMENT SYSTEM REVOLUTION COMPLETED: Sistema de gestión de clientes completamente refactorizado y optimizado
- AGENT FUNCTIONS HEADER INTEGRATION
- DATA CONSISTENCY SECURITY CRITICAL: Sistema robusto de mapeo de usuarios eliminando inconsistencias de datos entre dispositivos
- PROFILE SYNC FIX CRITICAL: Corregida sincronización de perfil contractor entre dispositivos - Firebase como fuente de verdad, localStorage solo como caché
- CHYRRIS.COM SIGNATURE URLS: Sistema de URLs dinámicas completamente reconfigurado para usar chyrris.com exclusivamente para enlaces de firma de contratos
- CHYRRIS.COM ESTIMATE SHARING URLS: Sistema de URLs compartibles de estimados completamente migrado a chyrris.com con URLs ultra-cortas
- LEGAL DEFENSE ACCESS CONTROL SYSTEM: Sistema completo de control de acceso por plan de suscripción implementado en Legal Defense con enforcement de límites

## System Architecture

### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS, Wouter for routing, TanStack Query for data management.
- **UI/UX Decisions**: Mobile optimization, conversational onboarding via Mervin AI, smart action system (slash commands, contextual suggestions), adaptive UI, integrated AI model selectors. Redesigned Project Details view with merged tabs and enhanced functionality.
- **Authentication Architecture (UNIFIED)**: Complete migration to AuthSessionProvider with cookie-based sessions. All active components use `@/hooks/use-auth` (19 files updated Nov 2025). Deprecated AuthContext eliminated from active routes. System provides backward compatibility via both 'user' and 'currentUser' properties.

### Backend
- **Server Framework**: Express.js.
- **Database Architecture**:
  - **Firebase (Firestore)**: Primary and exclusive database for all digital contracts and signatures, and contractor profiles (source of truth).
  - **PostgreSQL with Drizzle ORM**: Used for subscriptions, usage tracking, and legacy estimates.
- **Authentication**: Firebase Admin SDK with native Firebase UID usage, session-based authentication using `__session` HTTP-only cookies (5-day expiration). Unified AuthSessionProvider eliminates XSS vulnerabilities from localStorage tokens. All API requests use automatic cookie-based authentication with `credentials: 'include'`.
- **Security Architecture**: Multi-layer authentication, triple-layer contract security, enterprise-grade security for Legal Defense features. Robust 1:1 Firebase UID to PostgreSQL `user_id` mapping. HTTP-only cookies prevent client-side token exposure.

### AI Architecture
- **Mervin AI Unified System**: Superintelligent chatbot with autonomous task execution, real-time web research, differentiated AI model roles, intelligent decision-making, parallel execution, and specialized agents (estimates, contracts, permits, property verification). Features learning, memory, real-time feedback, and a Conversational Intelligence module with advanced multilingual personality and emotion recognition. Includes a `TaskOrchestrator` and `EndpointCoordinator`.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Robust subscription-based permission system with OAuth, email/password, secure registration, automatic subscription degradation, real-time usage limits, persistent login, device fingerprinting, session validation, and WebAuthn API for biometric logins. Critical trial period anti-reset system. **UNIFIED AUTH ECOSYSTEM (Nov 2025)**: Complete migration to AuthSessionProvider - 19 components updated, 0 active files using deprecated AuthContext, cookie-based sessions eliminate manual token management, architect-verified end-to-end compatibility.
- **Data Consistency & Security**: Secure 1:1 user mapping, comprehensive authentication middleware, and real-time integrity monitoring.
- **Password Management**: Secure email-based password reset using Resend with database-stored, single-use, expiring tokens.
- **Dynamic URL Generation**: Centralized utility (`server/utils/url-builder.ts`) for environment-agnostic URL generation, supporting `chyrris.com` for signature and estimate sharing URLs.
- **Enhanced Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and a triple-layer system for "Failed to fetch" errors.
- **Dynamic Form Validation**: Client-side validation using Zod schema.
- **API Design**: Secure API endpoints for subscription, usage, authentication, and password reset with middleware for access controls and usage limits.
- **Holographic Sharing System**: Futuristic interface for PDF generation and URL sharing.
- **Public URL Sharing System**: Simplified estimate sharing generating permanent, stable URLs without authentication, using Firebase Admin SDK and crypto-secure `shareId` generation.
- **URL Shortening System**: Enterprise-grade URL shortening service integrated with `chyrris.com` domain, featuring secure protocol validation, unique short code generation, click tracking, URL expiration, and Firebase authentication.
- **PERMISSIONS SYSTEM CENTRALIZED**: Complete permissions system migrated to a centralized architecture using `shared/permissions-config.ts` as the single source of truth for plan limits and permissions.
- **REDIS RATE LIMITING & USAGE TRACKING**: Hybrid RBAC + Metering system with Upstash Redis for real-time usage tracking and rate limiting (sliding window). Features a unified middleware (`subscription-protection.ts`) for authentication, rate limiting, and subscription/usage validation, with graceful fallback to in-memory tracking.
- **PERSISTENT USAGE TRACKING SYSTEM (ULTRA ROBUST)**: Production-grade usage tracking system that eliminates refresh/restart vulnerabilities through PostgreSQL persistent storage. Features:
  - **PostgreSQL Primary Storage**: `postgresUsageService.ts` provides atomic operations on `user_usage_limits` table tracking 7 features (basicEstimates, aiEstimates, contracts, propertyVerifications, permitAdvisor, projects, deepsearch)
  - **Dual-Write Architecture**: Redis cache + PostgreSQL persistence with automatic fallback for maximum reliability
  - **Firebase Authentication**: All usage endpoints (`/api/usage/*`) enforce Firebase token verification with userId matching to prevent cross-user access
  - **Correct Drizzle API**: Atomic increments using proper column references avoiding runtime errors
  - **DeepSearch Integration**: DeepSearch usage shares `basicEstimatesUsed` column (design decision documented in code)
  - **Monthly Tracking**: Automatic monthly record creation with plan-based limits initialization
  - **Security Helper**: Centralized `verifyAuthToken()` function for DRY authentication across all endpoints
  - **Protected Endpoints**: GET usage, POST increment, POST reset, GET stats, POST can-use all require authentication
  - **Ready for Deployment**: Architect-verified system resistant to refresh, server restart, and device changes
- **LEGAL DEFENSE ACCESS CONTROL SYSTEM**: Enterprise-grade subscription-based access control for Legal Defense page with complete plan-tier enforcement:
  - **Primo Chambeador (Plan ID 5)**: ZERO ACCESS - Early return renders locked upgrade screen, side effects cancelled immediately via useEffect, prevents autoguardado/processing
  - **Mero Patrón (Plan ID 9)**: LIMITED ACCESS - 50 contracts/month enforced, visible usage counter (blue→red when limit reached), PDF generation button disabled when quota exceeded, signature protocol blocked with upgrade banner
  - **Master Contractor (Plan ID 6)**: UNLIMITED ACCESS - Both PDF generation and signature protocol available without restrictions
  - **Free Trial (Plan ID 4)**: UNLIMITED ACCESS - Inherits Master Contractor privileges for 14-day trial period per permissions-config.ts
  - **Implementation**: Uses PermissionContext, canUse('contracts') validation, reactive UI with disabled states, upgrade modals on quota exceeded
  - **Architect Verified**: PASS - all tiers enforce correctly with no bypass vulnerabilities

## External Dependencies
- Firebase (Firestore, Admin SDK)
- OpenAI
- Stripe
- PostgreSQL
- Drizzle ORM
- Resend
- Anthropic
- Mapbox
- PDFMonkey
- Upstash Redis: Serverless Redis for real-time usage tracking and rate limiting.
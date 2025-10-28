# Legal Document & Permit Management Platform

## Overview
This AI-powered legal document and permit management platform automates tasks such as generating estimates, creating contracts, analyzing permits, verifying properties, and coordinating over 20 API endpoints via Mervin AI. The project aims to evolve Mervin AI into a capable intelligent agent, offering significant market potential by streamlining operations for contractors in legal and permit management.

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
- PROJECTS AUTO-REFRESH OPTIMIZATION (2025-10-28): Sistema de auto-refresh silencioso cada 30s implementado en Projects.tsx. Características: (1) isBackgroundRefreshing estado separado de isLoading para evitar skeleton flicker, (2) hasLoadedOnce useRef para prevenir toast spam, (3) useCallback en loadProjects con parámetro isBackgroundRefresh, (4) Background refresh completamente silencioso - solo logs en console, sin toasts de error, (5) UI feedback solo en initial load. Validado por architect: "Background refresh fully silent while preserving initial-load feedback".
- PROJECTS DETAIL VIEW FIX CRITICAL (2025-10-28): Solucionado problema crítico donde todos los proyectos se mostraban como "corruptos" al intentar abrir detalles. Root cause: `getProjectById()` en firebase.ts solo buscaba en colección "projects", pero los datos están en "estimates". Solución: (1) Búsqueda dual: primero "projects", fallback a "estimates", (2) Transformación de datos exacta como en Projects.tsx para consistencia total, (3) Validación de propiedad usuario en ambas colecciones, (4) Logging detallado para debugging. Resultado: 131 proyectos ahora completamente accesibles sin errores.
- PROJECTS PRICE DISPLAY FIX CRITICAL (2025-10-28): Corregido problema de precios multiplicados mostrando millones en lugar de miles. Root cause: Datos legacy guardados en centavos (enteros grandes sin decimales) mezclados con datos nuevos en dólares (con decimales). Solución: Sistema de detección automática inteligente que identifica valores en centavos (>10000 enteros) y los divide por 100, manteniendo valores correctos intactos. Implementado en Projects.tsx (listado) y firebase.ts (detalles). Resultado: Todos los 131 proyectos ahora muestran precios correctos (ej: $19,592.67 en lugar de $1,959,267.00).

## System Architecture

### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS, Wouter for routing, TanStack Query for data management.
- **UI/UX Decisions**: Mobile optimization, conversational onboarding via Mervin AI, smart action system (slash commands, contextual suggestions), adaptive UI, integrated AI model selectors.

### Backend
- **Server Framework**: Express.js.
- **Database Architecture**:
  - **Firebase (Firestore)**: Primary and exclusive database for all digital contracts and signatures (`dualSignatureContracts` collection).
  - **PostgreSQL with Drizzle ORM**: Used for subscriptions, usage tracking, and legacy estimates.
- **Authentication**: Firebase Admin SDK with native Firebase UID usage, session-based authentication using `__session` cookies.
- **Security Architecture**: Multi-layer authentication, triple-layer contract security, and enterprise-grade security for Legal Defense features.

### AI Architecture
- **Mervin AI Unified System**: Superintelligent chatbot with autonomous task execution, real-time web research, differentiated AI model roles, intelligent decision-making, parallel execution, and specialized agents (estimates, contracts, permits, property verification). Features learning, memory, real-time feedback, and a Conversational Intelligence module with advanced multilingual personality and emotion recognition. Includes a `TaskOrchestrator` and `EndpointCoordinator`.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Robust subscription-based permission system with OAuth, email/password, secure registration, automatic subscription degradation, real-time usage limits, persistent login, device fingerprinting, session validation, and WebAuthn API for biometric logins. Secure 1:1 Firebase UID to PostgreSQL `user_id` mapping. Critical trial period anti-reset system.
- **Data Consistency & Security**: Secure 1:1 user mapping, comprehensive authentication middleware, and real-time integrity monitoring. Firebase Firestore is the single source of truth for contractor profiles.
- **Password Management**: Secure email-based password reset using Resend with database-stored, single-use, expiring tokens.
- **Dynamic URL Generation**: Centralized utility (`server/utils/url-builder.ts`) for environment-agnostic URL generation, supporting `chyrris.com` for signature and estimate sharing URLs.
- **Enhanced Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and a triple-layer system for "Failed to fetch" errors.
- **Dynamic Form Validation**: Client-side validation using Zod schema.
- **API Design**: Secure API endpoints for subscription, usage, authentication, and password reset with middleware for access controls and usage limits.
- **Holographic Sharing System**: Futuristic interface for PDF generation and URL sharing, simplified to 3 essential actions (Copy, Share, Open).
- **Public URL Sharing System**: Simplified estimate sharing generating permanent, stable URLs without authentication, using Firebase Admin SDK and crypto-secure `shareId` generation.
- **URL Shortening System**: Enterprise-grade URL shortening service integrated with `chyrris.com` domain, featuring secure protocol validation, unique short code generation, click tracking, URL expiration, and Firebase authentication.
- **PERMISSIONS SYSTEM CENTRALIZED (2025-10-26)**: Sistema completo de permisos migrado a arquitectura centralizada con `shared/permissions-config.ts` como fuente única de verdad. PLAN_IDS correctos [5, 9, 6, 4] consolidados, eliminadas todas las referencias hardcoded.
- **REDIS RATE LIMITING & USAGE TRACKING (2025-10-26)**: Sistema de protección híbrido RBAC + Metering con Redis (Upstash) para conteo en tiempo real. Middleware unificado `subscription-protection.ts` que orquesta autenticación, rate limiting (sliding window), y usage tracking. Contadores mensuales con TTL automático. Graceful fallback a in-memory cuando Redis no disponible. Arquitectura escalable multi-instancia.

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
- **Upstash Redis**: Serverless Redis for real-time usage tracking and rate limiting with automatic persistence and TLS

## Technical Architecture Details

### Subscription & Usage Control System
**Architecture:** Hybrid RBAC + Metering with Redis-backed real-time tracking

**Components:**
1. **Centralized Configuration** (`shared/permissions-config.ts`):
   - Single source of truth for all plan limits and permissions
   - PLAN_IDS: Primo Chambeador (5), Mero Patrón (9), Master Contractor (6), Free Trial (4)
   - PLAN_LIMITS: Comprehensive feature flags and usage limits
   - Helper functions: getPlanLimits(), planNameToId()

2. **Redis Infrastructure** (`server/lib/redis/`):
   - **Client Factory** (`client.ts`): Upstash Redis with auto-retry and health checks
   - **Usage Service** (`redisUsageService.ts`): Monthly counters with TTL (60 days)
     - Key schema: `usage:{uid}:{feature}:{yyyymm}`
     - Atomic increment with pipeline operations
     - Fallback to in-memory UsageTracker
   - **Rate Limiter** (`redisRateLimiter.ts`): Sliding window algorithm
     - Key schema: `rate:{route}:{fingerprint}` (sorted sets)
     - Configurable windows and limits per route
     - Automatic cleanup of expired entries

3. **Unified Middleware** (`server/middleware/subscription-protection.ts`):
   - Single pipeline: Auth → Rate Limit → Subscription Check → Usage Validation
   - Predefined presets for common features (contracts, estimates, AI, etc.)
   - Response hooks for post-operation usage tracking
   - Performance optimized with parallel checks
   - Graceful degradation when Redis unavailable

**Data Flow:**
```
Request → Firebase Auth → subscriptionProtection() →
  1. Rate Limit Check (Redis sorted set)
  2. Subscription Validation (Firebase/PostgreSQL)
  3. Usage Check (Redis counter vs plan limits)
  → Proceed if all pass →
  → Response Hook: Increment usage (Redis atomic)
```

**Fallback Strategy:**
- Redis unavailable → In-memory tracking with warning headers
- Subscription service down → Block with 500 error
- Rate limit failure → Allow with logging
- Usage tracking failure → Allow but log error

**Environment Variables:**
- `UPSTASH_REDIS_REST_URL`: Redis endpoint
- `UPSTASH_REDIS_REST_TOKEN`: Authentication token
- `REDIS_ENABLED`: Enable/disable Redis (default: true)
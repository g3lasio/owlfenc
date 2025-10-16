# Legal Document & Permit Management Platform

## Overview
This project is an AI-powered legal document and permit management platform featuring Mervin AI, an autonomous intelligent agent. Its purpose is to automate tasks such as generating estimates, creating contracts, analyzing permits, verifying properties, and coordinating over 20 API endpoints autonomously. The platform aims to evolve Mervin AI from a chatbot into a capable intelligent agent, offering significant market potential in legal and permit management.

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
- ENTERPRISE CONTRACT SECURITY SYSTEM (2025-10-16): Sistema de seguridad enterprise-grade completo para Legal Defense con validación backend robusta, Demo Mode para usuarios gratuitos, contadores de uso en tiempo real y manejo personalizado de errores 403

## System Architecture

### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS, Wouter for routing, TanStack Query for data management.
- **UI/UX Decisions**: Mobile optimization (safe areas, enhanced touch targets); conversational onboarding guided by Mervin AI; smart action system (slash commands, contextual suggestions); adaptive UI elements; agent functions and model selectors integrated into the header.

### Backend
- **Server Framework**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM for main data, Firebase (Firestore) for client management data ensuring real-time sync.
- **Authentication**: Firebase Admin SDK with secure user mapping system.
- **Security Architecture**: Multi-layer authentication with AuthMiddleware, UserMappingService, and data integrity monitoring, including a robust enterprise-level authentication system (`RobustAuthManager`) with multiple fallbacks and a `DataIntegrityMonitor` for proactive data loss prevention.

### AI Architecture
- **Mervin AI Unified System**: Superintelligent chatbot with autonomous task execution and real-time web research. Features differentiated AI model roles, intelligent decision-making, parallel execution, and specialized agents (estimates, contracts, permits, property verification). Includes learning, memory, real-time feedback, and a Conversational Intelligence module with advanced multilingual personality and emotion recognition. The system integrates existing EstimatesWizard functionality conversationally, orchestrating tasks through the `TaskOrchestrator` and `EndpointCoordinator`.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Robust subscription-based permission system supporting OAuth, email/password, secure registration, automatic subscription degradation, real-time usage limit enforcement, persistent login, device fingerprinting, session validation, and WebAuthn API for biometric logins. This includes secure 1:1 Firebase UID to PostgreSQL user_id mapping and elimination of dangerous `userId = 1` fallbacks.
- **Modern WebAuthn Iframe Support (2025)**: Implemented spec-compliant Permissions-Policy headers (`publickey-credentials-get=(self), publickey-credentials-create=(self)`) to enable WebAuthn API in same-origin iframes (Chrome 123+, Safari 18+). Features intelligent dual-strategy authentication: attempts direct WebAuthn in iframe first (modern browsers), automatically falls back to popup window if iframe restrictions detected (legacy browsers). Includes comprehensive error detection, context-aware logging, and robust error handling. Located in `server/middleware/security.ts`, `client/index.html`, `client/src/lib/webauthn-service.ts`, and `client/src/components/auth/BiometricLoginButton.tsx`.
- **Data Consistency & Security**: Secure 1:1 user mapping system preventing data mixing, comprehensive authentication middleware, and real-time integrity monitoring. Includes a robust client management system with specialized backend endpoints for integrity checks and automatic repair. **CRITICAL FIX (2025-10-14)**: User profile synchronization corrected - Firebase (Firestore) is now the primary source of truth for contractor profiles, with localStorage serving only as a local cache. This ensures contractor information (company name, address, license, etc.) syncs correctly across all devices. Hook `useProfile` (client/src/hooks/use-profile.ts) refactored to always prioritize Firebase over localStorage, eliminating device-specific data inconsistencies.
- **Password Reset System**: Secure email-based password reset using Resend, with database-stored, single-use, expiring tokens.
- **Direct Email & Password Update System**: Production-ready account security system with immediate email/password changes using Firebase Admin SDK. Features: (1) `/api/auth/update-email` and `/api/auth/update-password` endpoints with Firebase Admin SDK integration, (2) Rate limiting (3 requests/15 min) for security, (3) Comprehensive validation (email format, password strength), (4) Professional error handling with specific error codes, (5) Frontend password change dialog with current/new/confirm password fields, (6) Loading states and user feedback, (7) Optional token revocation for forced re-authentication. Located in `server/routes/auth.ts` and `client/src/pages/Profile.tsx` User Settings tab.
- **Dynamic URL Generation**: Centralized utility (`server/utils/url-builder.ts`) for environment-agnostic URL generation.
- **Enhanced Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and a triple-layer system to mitigate "Failed to fetch" errors.
- **Dynamic Form Validation**: Client-side validation using Zod schema integrated with UI components.
- **API Design**: Secure API endpoints for subscription management, usage tracking, authentication, and password reset functionality, enforced with middleware for access controls and usage limits. Critical legal defense functionalities have integrated robust authentication and token verification.
- **Holographic Sharing System**: Futuristic Iron Man-style interface for PDF generation and URL sharing with complete accessibility support, motion optimization, and robust error handling. Features holographic buttons, matrix effects, scanning lines, and corner frames with professional-grade visual design.
- **Public URL Sharing System**: Simplified estimate sharing system converting decorative buttons to functional direct URL sharing. Generates permanent, stable URLs that work in both development and deployment environments without authentication requirements. Uses Firebase Admin SDK for data persistence, crypto-secure shareId generation (64-byte hex), and dynamic URL building via `url-builder.ts`. Features public routes (`/shared-estimate/:shareId`) with access tracking and permanent link storage (no expiration).
- **Enterprise Contract Security System (2025-10-16)**: Comprehensive tiered subscription-based access control for Legal Defense features with backend enforcement, frontend Demo Mode, and real-time usage tracking.

## Enterprise Contract Security System

### Security Architecture (2025-10-16)
**Triple-layer enterprise-grade security preventing expert hackers from bypassing subscription restrictions:**

#### Backend Protection (Impenetrable)
- **Subscription Middleware** (`server/middleware/subscription-auth.ts`):
  - `requireLegalDefenseAccess`: Blocks users without Legal Defense (Primo Chambeador gets 403)
  - `validateUsageLimit`: Checks usage before allowing action (Mero Patrón blocked at 50 contracts)
  - `incrementUsageOnSuccess`: Counts usage ONLY on successful 2xx responses (fixed critical bug where wrapper was installed after next())
- **Protected Endpoints**:
  - `/api/legal-defense/*`: ALL endpoints protected (extract-pdf, create-project, generate-contract, generate-defensive-contract)
  - `/api/dual-signature/initiate`: Dual-signature contract creation protected
- **Plan Structure**:
  - Free Trial (14 days): contracts: -1 (unlimited), hasLegalDefense: true
  - Primo Chambeador (FREE): contracts: 0, hasLegalDefense: false (BLOCKED)
  - Mero Patrón ($49.99): contracts: 50, hasLegalDefense: true
  - Master Contractor ($99): contracts: -1 (unlimited), hasLegalDefense: true

#### Frontend Protection (User Experience)
- **Demo Mode for Primo Chambeador** (`client/src/pages/SimpleContractGenerator.tsx`):
  - Generates local HTML preview with "DEMO MODE" watermark
  - Shows project data without backend calls
  - Blocks download and signature actions
  - Clear upgrade CTAs ($49.99/mo to Mero Patrón)
- **403 Error Handling**:
  - Personalized messages per plan
  - Primo: "Upgrade to Mero Patrón ($49.99/mo)"
  - Mero (limit): "50 contracts used, upgrade to Master"
  - Extended duration toasts (6000ms)
- **Real-time Usage Counter**:
  - Displays "X / 50 contracts used" for Mero Patrón
  - Color coding: cyan → yellow (80%) → red (100%)
  - "LIMIT REACHED" badge when exhausted
  - "Unlimited Contracts" badge for Master

#### Data Synchronization (Consistency)
- **PermissionContext** (`client/src/contexts/PermissionContext.tsx`):
  - Plan limits synced with backend (Primo: 0, Mero: 50, Trial: -1, Master: -1)
  - Loads contract usage from `/api/auth/can-access/{uid}/contracts`
  - Real-time updates via `robustSubscriptionService`
- **SimpleContractGenerator**:
  - Uses `currentPlan.limits.contracts` (no hardcoded limits)
  - Respects backend validation
  - Prevents bypass attempts

### Security Testing Checklist
1. ✅ Primo Chambeador cannot create real contracts (Demo Mode only)
2. ✅ Free Trial has full access for 14 days
3. ✅ Mero Patrón blocked at 50 contracts
4. ✅ Master Contractor has unlimited access
5. ✅ Direct API calls blocked with 403 (not just UI disabled)
6. ✅ Usage counter updates in real-time
7. ✅ Frontend-backend limits fully synchronized

## External Dependencies
- Firebase (Firestore, Admin SDK)
- OpenAI
- Stripe
- PostgreSQL
- Drizzle ORM
- Resend
- Anthropic
- Mapbox (simulated integration)
- PDFMonkey (for estimate PDF generation)
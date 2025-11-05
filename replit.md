# Legal Document & Permit Management Platform

## Overview
This AI-powered platform automates legal document and permit management for contractors. It generates estimates, creates contracts, analyzes permits, verifies properties, and coordinates over 20 API endpoints via Mervin AI. The project aims to evolve Mervin AI into a highly capable intelligent agent, streamlining operations and offering significant market potential in legal and permit management for contractors.

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

## System Architecture

### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS, Wouter for routing, TanStack Query for data management.
- **UI/UX Decisions**: Mobile optimization, conversational onboarding via Mervin AI, smart action system (slash commands, contextual suggestions), adaptive UI, integrated AI model selectors. Redesigned Project Details view with merged tabs and enhanced functionality.
- **Authentication Architecture**: Complete migration to AuthSessionProvider with cookie-based sessions, eliminating Legacy AuthContext.tsx. Single source of truth: `@/components/auth/AuthSessionProvider.tsx`.

### Backend
- **Server Framework**: Express.js.
- **Database Architecture**: Firebase (Firestore) for digital contracts, signatures, and contractor profiles. PostgreSQL with Drizzle ORM for subscriptions, usage tracking, and legacy estimates.
- **Authentication**: Firebase Admin SDK with native Firebase UID, session-based authentication using HTTP-only cookies. Unified AuthSessionProvider.
- **Security Architecture**: Multi-layer authentication, triple-layer contract security, enterprise-grade security for Legal Defense features, robust 1:1 Firebase UID to PostgreSQL `user_id` mapping.

### AI Architecture
- **Mervin AI V2 - Hybrid Intelligence Architecture**: Complete rebuild as superintelligent agent with dual-AI system. ChatGPT-4o handles fast analysis, parameter extraction, and conversations (<1s). Claude Sonnet 4 handles complex tasks, legal contracts, and professional responses. Features autonomous task execution via existing endpoints (estimates, contracts, permits, property verification), real-time web research, intelligent AI routing, streaming progress (SSE), and full authentication forwarding. Architecture: `server/mervin-v2/` with services (ChatGPTService, ClaudeService, AIRouter, SystemAPIService, WebSearchService), orchestrator (MervinOrchestrator), and routes (`/api/mervin-v2/process`, `/api/mervin-v2/stream`). Frontend integration via AgentClient and useMervinAgent hook. Conserved personality modules: ConversationEngine.ts and LanguageDetector.ts for Mexican personality.
- **Mervin V2 UI/UX Enhancement System**: Revolutionary interface with real-time transparency components. **StreamingProgress** displays live agent processing with dynamic icons, progress tracking, and streaming updates via SSE. **SmartContextPanel** shows active endpoints and AI model in use (ChatGPT-4o vs Claude Sonnet 4). **AgentCapabilitiesBadge** differentiates Agent Mode (full autonomous capabilities) from Legacy Mode (basic conversations). **DynamicActionSuggestions** replaces hardcoded menus with contextual action chips that adapt based on conversation flow (estimate, contract, permit, property contexts). **WebResearchIndicator** notifies when Mervin performs web searches with result count. **SystemStatusBar** displays V2 backend health and version in footer. All context states auto-reset on new tasks to prevent stale data.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Robust subscription-based permission system with OAuth, email/password, secure registration, automatic subscription degradation, real-time usage limits, persistent login, device fingerprinting, session validation, and WebAuthn API for biometric logins. Unified Auth Ecosystem with cookie-based sessions.
- **Data Consistency & Security**: Secure 1:1 user mapping, comprehensive authentication middleware, and real-time integrity monitoring.
- **Password Management**: Secure email-based password reset using Resend with database-stored, single-use, expiring tokens.
- **Dynamic URL Generation**: Centralized utility (`server/utils/url-builder.ts`) for environment-agnostic URL generation, supporting `chyrris.com` for signature and estimate sharing URLs.
- **Enhanced Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and a triple-layer system for "Failed to fetch" errors.
- **Dynamic Form Validation**: Client-side validation using Zod schema.
- **API Design**: Secure API endpoints for subscription, usage, authentication, and password reset with middleware for access controls and usage limits.
- **Holographic Sharing System**: Futuristic interface for PDF generation and URL sharing.
- **Public URL Sharing System**: Simplified estimate sharing generating permanent, stable URLs without authentication.
- **URL Shortening System**: Enterprise-grade URL shortening service integrated with `chyrris.com` domain.
- **Permissions System**: Centralized architecture using `shared/permissions-config.ts` for plan limits and permissions.
- **Redis Rate Limiting & Usage Tracking**: Hybrid RBAC + Metering system with Upstash Redis for real-time usage tracking and rate limiting (sliding window).
- **Persistent Usage Tracking System**: Production-grade usage tracking system utilizing PostgreSQL persistent storage with a dual-write architecture (Redis cache + PostgreSQL) for features like estimates, contracts, and permit verification.
- **Legal Defense Access Control System**: Enterprise-grade subscription-based access control for Legal Defense page with plan-tier enforcement.
- **PDF Digital Signature System**: Premium PDF service with robust signature embedding using independent strategy-based counters for contractor/client assignments.
- **Dual Signature Completion Workflow**: Automated contract completion system, including email distribution (contractor only), status management in Firebase, automatic PDF generation, and a Firebase-native notification system.
- **Stripe Connect Organization API Key Support**: Payment system configured for Stripe Organization API keys, including automatic `Stripe-Account` header inclusion and support for multiple environment variables.

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
- Upstash Redis
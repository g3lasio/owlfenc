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
- **Technology Stack**: React.js with TypeScript, Tailwind CSS, Wouter for routing, TanStack Query.
- **UI/UX Decisions**: Mobile optimization, conversational onboarding via Mervin AI, smart action system, adaptive UI, integrated AI model selectors. Public landing page system separate from protected product.
- **Authentication**: Complete migration to AuthSessionProvider with cookie-based sessions.

### Backend
- **Server Framework**: Express.js.
- **Database Architecture**: Firebase (Firestore) for digital contracts, signatures, contractor profiles. PostgreSQL with Drizzle ORM for subscriptions, usage tracking, and legacy estimates.
- **Authentication**: Firebase Admin SDK with native Firebase UID, session-based authentication using HTTP-only cookies.
- **Security Architecture**: Multi-layer authentication, triple-layer contract security, enterprise-grade security for Legal Defense features, robust 1:1 Firebase UID to PostgreSQL `user_id` mapping.

### AI Architecture (Mervin AI V4 - OpenAI Assistants API)
- **ARCHITECTURE PARADIGM SHIFT (Nov 16, 2025)**: Complete migration from custom WebSocket/HTTP orchestration to **OpenAI Assistants API** as foundational architecture. Decision driven by persistent message truncation issues and user frustration with custom infrastructure brittleness.
- **Core Architecture**: **Assistants-as-a-Service model** - Frontend communicates directly with OpenAI Assistants API through authenticated backend proxy. Backend handles ONLY secret management and tool execution callbacks. All conversation management, context retention, and streaming handled by OpenAI's battle-tested infrastructure.
- **Streaming Architecture**: **Simplified reliability-first design** - Direct OpenAI SDK streaming via HTTP POST to `/api/assistant/message`. Eliminated all custom WebSocket complexity that caused truncation. Messages guaranteed complete delivery matching Replit Agent quality.
- **Security Architecture (Nov 2025)**: **Enterprise-grade authentication enforcement** - ALL assistant endpoints (`/api/assistant/thread`, `/api/assistant/message`) require mandatory Firebase token validation. userId derived EXCLUSIVELY from verified `decodedToken.uid` via Firebase Admin SDK. Backend executes tools on behalf of authenticated users only.
- **Tool Execution Flow**: OpenAI detects tool need → sends callback to backend → backend validates auth & executes real action (create_estimate, create_contract, verify_property, etc.) → returns result to OpenAI → OpenAI continues response seamlessly.
- **Tool-Calling Architecture**: All existing Mervin tools converted to OpenAI function calling format (`server/assistants/tools-registry.ts`). Maintains full functionality: `create_estimate`, `create_contract`, `verify_property`, `get_permit_info`, `get_client_history`. Backend uses SystemAPIService for actual execution.
- **Thread Management**: Each conversation gets persistent OpenAI thread ID. Backend service (`server/assistants/service.ts`) handles thread creation, message queueing, and run orchestration. Frontend client (`AssistantsClient`) maintains thread reference for session continuity.
- **Migration Path**: Legacy systems preserved for file attachments. AssistantsClient handles text-only messages (primary use case). AgentClient retained for rare file upload scenarios until OpenAI adds native file support.
- **Benefits Over Custom Stack**: Reliable streaming (no truncation), access to GPT-4.1/GPT-5, less maintenance burden, proven at scale, matches Replit Agent architecture, future-proof as OpenAI improves.
- **Conversation History System**: Production-grade persistence and management for Mervin AI conversations using Firebase Firestore, featuring auto-save, authenticated CRUD API, and automatic title generation.
- **Legacy V3 Components (Deprecated)**: MervinOrchestratorV3, HybridAgentClient, WebSocketAgentClient, HttpFallbackClient deprecated Nov 16 2025. Retained in codebase for reference but not actively used.
- **Mervin Personality (Nov 17, 2025)**: Authentic Mexican personality with contractor-focused humor and professionalism. Uses natural modismos ("primo", "órale", "ándale", "no manches"). Balances informal warmth with technical competence. Instructions configured in `server/assistants/config.ts` with comprehensive examples and "Reglas de Oro" for authenticity.
- **Chat Flow Optimization (Nov 17, 2025)**: Resolved critical bugs in `useMervinAgent.tsx` - removed obsolete `hybridClientRef` references, implemented StreamUpdate type adapter for AssistantsClient/AgentClient compatibility (text_delta→message, tool_call_*→progress). Chat flow verified as: UI → useMervinAgent → AssistantsClient → /api/assistant/message → OpenAI with streaming → UI display.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Robust subscription-based permission system with OAuth, email/password, and usage limits.
- **Data Consistency & Security**: Secure 1:1 user mapping, comprehensive authentication middleware, real-time integrity monitoring.
- **Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and triple-layer "Failed to fetch" error handling.
- **API Design**: Secure API endpoints with middleware for access controls and usage limits.
- **Sharing Systems**: Holographic Sharing System, Public URL Sharing System for estimates, and Enterprise-grade URL Shortening System.
- **Permissions System**: Centralized architecture for plan limits.
- **Rate Limiting & Usage Tracking**: Redis-based rate limiting and PostgreSQL persistent usage tracking with a dual-write architecture.
- **Legal Defense Access Control System**: Enterprise-grade subscription-based access control.
- **PDF Digital Signature System**: Premium PDF service with robust signature embedding and a dual signature completion workflow.
- **Stripe Integration**: Production-ready subscription system with health guardrails, centralized API version, and Price ID registry. Includes startup validation and mode-aware price mappings.
- **Stripe Express Contractor Payments**: Production-ready Stripe Express Connect integration for contractor payment processing with a complete `project_payments` schema, authenticated routes, direct payment flow, and TypeScript-safe payment service. Includes enterprise-grade security hardening for payment processing with defense-in-depth architecture, authorization enforcement, atomic transactions, legacy data auto-remediation, and comprehensive audit trail.
- **Automated Email Systems**: Welcome Email System triggered on `customer.subscription.created` and Payment Failure Blocking System for real-time account suspension, both utilizing Resend.

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
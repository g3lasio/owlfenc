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
- **Tool-Calling Architecture (Nov 17, 2025)**: **Scalable & Extensible Design** - 14 production tools with capacity to scale to 50+ tools without architectural changes. Tools converted to OpenAI function calling format (`server/assistants/tools-registry.ts`). Backend uses SystemAPIService as intelligent proxy to existing Firebase/API endpoints. NEVER reimplements functionality - always proxies to real endpoints.
- **Tool Registry Structure (Nov 17, 2025)**: Three-layer architecture for maintainability: (1) **Tool Definitions** - OpenAI function calling format with clear descriptions; (2) **Tool Executors** - Execution logic with UserContext and error handling; (3) **Tool Metadata** - Categories, operations, confirmation requirements, examples, related tools. Validation system ensures every definition has matching executor and service method.
- **Mervin Philosophy (Nov 17, 2025)**: **"Constructor Experto Digital"** - Mervin is trained as a master contractor who learns tools, not memorizes them. Instructions teach PATTERN RECOGNITION over specific tool names. Can identify tool needs by analyzing: (1) Operation type (create_*, get_*, update_*, delete_*, send_*); (2) Entity (estimates, contracts, properties, permits, invoices); (3) Context (workflow stage, user intent). This "meta-learning" approach means adding new tools requires ZERO instruction updates - Mervin reads tool descriptions and applies patterns automatically.
- **Extensibility System (Nov 17, 2025)**: Complete infrastructure for adding tools: (1) `HOW_TO_ADD_TOOLS.md` - Step-by-step guide with examples; (2) `tool-metadata.ts` - Category/operation/example system; (3) `validation.ts` - Automated validation of tool registry integrity; (4) `SystemAPIService` - Consistent proxy pattern to backend endpoints. Adding a tool = 5 steps: Add service method → Add definition → Add executor → Register in registry → Add metadata. Full process documented and validated.
- **Current Tool Coverage (Nov 17, 2025)**: 14 tools across 5 workflows - **Estimates** (create, get, get_by_id, update, delete, send_email), **Contracts** (create, get, get_by_id, update, delete), **Property Verification** (verify), **Permits** (get_info), **Clients** (get_history). All tools proxy to Firebase routes at `/api/estimates` and `/api/contracts` registered in `routes.ts`.
- **Thread Management**: Each conversation gets persistent OpenAI thread ID. Backend service (`server/assistants/service.ts`) handles thread creation, message queueing, and run orchestration. Frontend client (`AssistantsClient`) maintains thread reference for session continuity.
- **Migration Path**: Legacy systems preserved for file attachments. AssistantsClient handles text-only messages (primary use case). AgentClient retained for rare file upload scenarios until OpenAI adds native file support.
- **Benefits Over Custom Stack**: Reliable streaming (no truncation), access to GPT-4.1/GPT-5, less maintenance burden, proven at scale, matches Replit Agent architecture, future-proof as OpenAI improves, infinite extensibility via OpenAI function calling.
- **Conversation History System**: Production-grade persistence and management for Mervin AI conversations using Firebase Firestore, featuring auto-save, authenticated CRUD API, and automatic title generation.
- **Legacy V3 Components (Deprecated)**: MervinOrchestratorV3, HybridAgentClient, WebSocketAgentClient, HttpFallbackClient deprecated Nov 16 2025. Retained in codebase for reference but not actively used.
- **Mervin Personality (Nov 17, 2025)**: Authentic Mexican personality with contractor-focused humor and professionalism. Uses natural modismos ("primo", "órale", "ándale", "no manches"). Balances informal warmth with technical competence. Instructions configured in `server/assistants/config.ts` with comprehensive pattern-based learning examples and "Reglas de Oro" for authenticity.
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
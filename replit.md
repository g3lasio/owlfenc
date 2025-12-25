# Legal Document & Permit Management Platform

### Overview
This AI-powered platform automates legal document and permit management for contractors. It generates estimates, creates contracts, analyzes permits, verifies properties, and coordinates over 20 API endpoints via Mervin AI. The project aims to evolve Mervin AI into a highly capable intelligent agent, streamlining operations and offering significant market potential in legal and permit management for contractors.

### User Preferences
- Respuestas técnicas y detalladas cuando se requiera análisis
- Documentación clara de cambios de arquitectura
- Logging detallado para debugging
- Seguir patrones de Express.js y middleware
- Usar TypeScript estricto
- Implementar validación robusta en todos los endpoints
- Priorizar seguridad sobre conveniencia
- Eliminar completamente errores "fastidiosos" de autocompletado y unhandled rejections
- Console logs limpios sin spam de errores de conectividad

### System Architecture

#### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS, Wouter for routing, TanStack Query.
- **UI/UX Decisions**: Mobile optimization, conversational onboarding via Mervin AI, smart action system, adaptive UI, integrated AI model selectors. Public landing page system separate from protected product.
- **Authentication**: AuthSessionProvider with cookie-based sessions.

#### Backend
- **Server Framework**: Express.js.
- **Database Architecture**: Firebase (Firestore) for digital contracts, signatures, contractor profiles. PostgreSQL with Drizzle ORM for subscriptions, usage tracking, and legacy estimates.
- **Authentication**: Firebase Admin SDK with native Firebase UID, session-based authentication using HTTP-only cookies.
- **Security Architecture**: Multi-layer authentication, triple-layer contract security, enterprise-grade security for Legal Defense features, robust 1:1 Firebase UID to PostgreSQL `user_id` mapping.

#### AI Architecture (Mervin AI - OpenAI Assistants API)
- **Core Architecture**: Assistants-as-a-Service model using OpenAI Assistants API. Backend acts as an authenticated proxy for secret management and tool execution callbacks.
- **Streaming Architecture**: Direct OpenAI SDK streaming via HTTP POST for reliable message delivery.
- **Security Architecture**: Mandatory Firebase token validation for all assistant endpoints; userId derived from verified `decodedToken.uid`.
- **Tool Execution Flow**: OpenAI triggers tool callback to backend, backend validates user, executes action, and returns result to OpenAI.
- **Tool-Calling Architecture**: Scalable design with tools defined in OpenAI function calling format, executed via `SystemAPIService`.
- **Tool Registry Structure**: Three-layer architecture (Tool Definitions, Tool Executors, Tool Metadata) for maintainability and extensibility.
- **Mervin Philosophy**: "Constructor Experto Digital" - Mervin learns by pattern recognition to identify tool needs.
- **Conversation History System**: Production-grade persistence and management for Mervin AI conversations using Firebase Firestore, with auto-save and authenticated CRUD API.
- **Dual-System Architecture**: Primary system uses OpenAI Assistants API for text-based conversations. Legacy custom orchestrator retained only for file attachments.
- **Mervin Personality**: Authentic Mexican personality with contractor-focused humor and professionalism, using natural modismos.
- **Contextual Eyes System**: Allows Mervin to understand the user's current page and provide contextual guidance.
- **Persistent Chat System**: Single persistent `MervinExperience` instance maintains context across routes with flexible layout modes.

#### Core Features & Design Patterns
- **User Authentication & Authorization**: Subscription-based permissions with OAuth, email/password, and usage limits.
- **Data Consistency & Security**: Secure 1:1 user mapping, authentication middleware, real-time integrity monitoring.
- **Error Handling**: Comprehensive Firebase authentication error handling, unhandled rejection interceptors.
- **API Design**: Secure API endpoints with middleware for access controls and usage limits.
- **Sharing Systems**: Holographic Sharing System, Public URL Sharing System, and Enterprise-grade URL Shortening System.
- **Permissions System**: Centralized architecture for plan limits.
- **Rate Limiting & Usage Tracking**: Redis-based rate limiting and PostgreSQL persistent usage tracking.
- **Legal Defense Access Control System**: Enterprise-grade subscription-based access control with `CONTRACT_GUARD` pattern.
- **PDF Digital Signature System**: Premium PDF service with robust signature embedding and dual signature workflow.
  - **Native PDF Engine (Phase 1 Complete - Dec 2025)**: Uses `pdf-lib` + `htmlparser2` for pure JavaScript PDF generation, eliminating Puppeteer/Chromium dependencies.
    - **Performance**: 10-86ms per PDF (vs 842ms+ with browser). Templates: `lien-waiver` (27ms), `change-order` (29ms), `work-order` (86ms), `contract-addendum` (29ms), `certificate-completion` (16ms), `warranty-agreement` (10ms).
    - **Endpoint**: `POST /api/generate-pdf` uses `nativePdfEngine` for all registry templates.
    - **Files**: `server/services/NativePdfEngine.ts`, `server/routes.ts` (lines 3774-3830).
  - **Puppeteer Vestiges (Phase 2 Migration Pending)**: `/api/estimate-puppeteer-pdf`, `/api/invoice-pdf`, `/api/generate-permit-report-pdf`, `independent-contractor` template. Browser pool still warms up for these legacy endpoints.
  - **PDF Generation Strategy**: All PDF services use `waitUntil: 'domcontentloaded'` with request interception to block external font loading and explicit image loading waits.
- **Stripe Integration**: Production-ready subscription system and Stripe Express Connect integration for contractor payments.
- **Automated Email Systems**: Welcome Email System and Payment Failure Blocking System, utilizing Resend.
- **Contract History System**: Production-ready classification system with Draft/In Progress/Completed categorization, archiving, and instant-response optimistic UI.
- **Legal Seal Digital Certificate System**: Production-ready PDF-embedded digital certificates with legal compliance and verification URL.
- **Dual Signature Completion System**: Production-ready distributed completion workflow with atomic job creation, distributed locking, crash recovery, idempotency, and saga pattern. Template-driven signature engine (v2.0) determines behavior based on `signatureType` in template registry.
- **Unified Lien Waiver System (v3.0 - Jurisdiction-Aware)**: Single unified template supporting both Partial (conditional) and Final (unconditional) waivers, with automatic jurisdiction detection and overlay system.
- **Unified Data Source Architecture**: All project and estimate data uses a single source of truth (Firestore 'estimates' collection).
- **AutoClean AI Data Pipeline**: Automatic contact data cleaning using heuristic detection and OpenAI GPT-4o-mini fallback, with asynchronous persistence.
- **Intelligent Import Pipeline V2**: 5-phase architecture for CSV/Excel import with automatic data corruption handling, including ingestion, structural analysis, semantic mapping, normalization, and validation/deduplication.

### External Dependencies
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
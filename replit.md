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
- **Mervin Philosophy**: "Constructor Experto Digital" - Mervin learns by pattern recognition to identify tool needs, requiring no instruction updates for new tools.
- **Extensibility System**: Comprehensive infrastructure for adding new tools, including documentation, metadata, and validation.
- **Conversation History System**: Production-grade persistence and management for Mervin AI conversations using Firebase Firestore, with auto-save and authenticated CRUD API.
- **Dual-System Architecture**: Primary system uses OpenAI Assistants API for text-based conversations. Legacy custom orchestrator retained only for file attachments until native OpenAI support.
- **Mervin Personality**: Authentic Mexican personality with contractor-focused humor and professionalism, using natural modismos.
- **Contextual Eyes System**: Allows Mervin to understand the user's current page and provide contextual guidance by enhancing AI prompts with page and step information.
- **Persistent Chat System**: Single persistent `MervinExperience` instance maintains context across routes with flexible layout modes managed by `ChatLayoutController`.

#### Core Features & Design Patterns
- **User Authentication & Authorization**: Subscription-based permissions with OAuth, email/password, and usage limits.
- **Data Consistency & Security**: Secure 1:1 user mapping, authentication middleware, real-time integrity monitoring.
- **Error Handling**: Comprehensive Firebase authentication error handling, unhandled rejection interceptors, and "Failed to fetch" error handling.
- **API Design**: Secure API endpoints with middleware for access controls and usage limits.
- **Sharing Systems**: Holographic Sharing System, Public URL Sharing System for estimates, and Enterprise-grade URL Shortening System.
- **Permissions System**: Centralized architecture for plan limits.
- **Rate Limiting & Usage Tracking**: Redis-based rate limiting and PostgreSQL persistent usage tracking.
- **Legal Defense Access Control System**: Enterprise-grade subscription-based access control.
  - **CONTRACT_GUARD Pattern**: Unified middleware protecting all contract generation endpoints, enforcing plan limits and usage counting at the generation point.
- **PDF Digital Signature System**: Premium PDF service with robust signature embedding and dual signature workflow.
- **Stripe Integration**: Production-ready subscription system with health guardrails and Price ID registry.
- **Stripe Express Contractor Payments**: Production-ready Stripe Express Connect integration for contractor payment processing with enterprise-grade security hardening.
- **Automated Email Systems**: Welcome Email System and Payment Failure Blocking System, both utilizing Resend.
- **Contract History System**: Production-ready classification system with robust Draft/In Progress/Completed categorization, comprehensive state mapping, duplicate prevention, and multi-source aggregation.
  - **Contract Archiving System**: Reversible archiving system for contract lifecycle management with comprehensive guards, dual-collection architecture, and integrity preservation.
  - **Instant-Response Optimistic UI System**: Zero-latency archive/unarchive with React Query optimistic updates for instant UI feedback.
  - **Automatic Draft Cleanup**: Smart filtering that hides drafts when a completed/in-progress version exists using composite key matching.
- **Legal Seal Digital Certificate System**: Production-ready PDF-embedded digital certificates with legal compliance, unique folio generation, and a verification URL.
- **Dual Signature Completion System**: Production-ready distributed completion workflow with atomic job creation, distributed locking, crash recovery, idempotency guarantees, and saga pattern implementation for robust asynchronous processing.
- **Unified Data Source Architecture**: All project and estimate data now uses a single source of truth (the 'estimates' Firestore collection), removing dual-writes and ensuring consistency.
- **AutoClean AI Data Pipeline**: Automatic, invisible contact data cleaning system integrated into FirebaseOnlyStorage.getClients(). Uses heuristic detection (phone/email/address patterns, concatenated data splitting) with OpenAI GPT-4o-mini fallback for low-confidence cases. Corrections are persisted asynchronously in batches of 25. No user intervention required - users only see clean data.

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
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
- **Core Architecture**: Assistants-as-a-Service model using OpenAI Assistants API. Backend acts as an authenticated proxy for secret management and tool execution callbacks.
- **Streaming Architecture**: Direct OpenAI SDK streaming via HTTP POST for reliable message delivery.
- **Security Architecture**: Mandatory Firebase token validation for all assistant endpoints; userId derived from verified `decodedToken.uid`.
- **Tool Execution Flow**: OpenAI triggers tool callback to backend, backend validates user, executes action (e.g., create estimate, verify property), and returns result to OpenAI.
- **Tool-Calling Architecture**: Scalable design with tools defined in OpenAI function calling format, executed via `SystemAPIService` which proxies to existing Firebase/API endpoints.
- **Tool Registry Structure**: Three-layer architecture (Tool Definitions, Tool Executors, Tool Metadata) for maintainability and extensibility.
- **Mervin Philosophy**: "Constructor Experto Digital" - Mervin learns by pattern recognition (operation type, entity, context) to identify tool needs, requiring no instruction updates for new tools.
- **Extensibility System**: Comprehensive infrastructure for adding new tools, including documentation, metadata, and validation.
- **Conversation History System**: Production-grade persistence and management for Mervin AI conversations using Firebase Firestore, with auto-save and authenticated CRUD API.
- **Dual-System Architecture**: Primary system uses OpenAI Assistants API for text-based conversations. Legacy custom orchestrator retained only for file attachments until native OpenAI support.
- **Mervin Personality**: Authentic Mexican personality with contractor-focused humor and professionalism, using natural modismos.
- **Contextual Eyes System**: Allows Mervin to understand the user's current page and provide contextual, step-by-step guidance by enhancing AI prompts with page and step information.
- **Persistent Chat System**: Single persistent `MervinExperience` instance maintains context across routes with flexible layout modes (full, sidebar, closed) managed by `ChatLayoutController`.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Subscription-based permissions with OAuth, email/password, and usage limits.
- **Data Consistency & Security**: Secure 1:1 user mapping, authentication middleware, real-time integrity monitoring.
- **Error Handling**: Comprehensive Firebase authentication error handling, unhandled rejection interceptors, and "Failed to fetch" error handling.
- **API Design**: Secure API endpoints with middleware for access controls and usage limits.
- **Sharing Systems**: Holographic Sharing System, Public URL Sharing System for estimates, and Enterprise-grade URL Shortening System.
- **Permissions System**: Centralized architecture for plan limits.
- **Rate Limiting & Usage Tracking**: Redis-based rate limiting and PostgreSQL persistent usage tracking.
- **Legal Defense Access Control System**: Enterprise-grade subscription-based access control.
- **PDF Digital Signature System**: Premium PDF service with robust signature embedding and dual signature workflow.
- **Stripe Integration**: Production-ready subscription system with health guardrails and Price ID registry.
- **Stripe Express Contractor Payments**: Production-ready Stripe Express Connect integration for contractor payment processing with enterprise-grade security hardening.
- **Automated Email Systems**: Welcome Email System and Payment Failure Blocking System, both utilizing Resend.
- **Contract History System**: Production-ready classification system with robust Draft/In Progress/Completed categorization. Supports comprehensive state mapping (5 in-progress states, 2 completed states) with duplicate prevention and multi-source aggregation from contractHistory and dualSignatureContracts collections. Requires Firestore composite index for in-progress query optimization.
  - **Financial Data Display**: All contract amounts stored in dollars (e.g., 45000 = $45,000). No cent-based normalization applied. Values trusted as-is from Firestore.
  - **Completion Date Tracking**: Dual-signature contracts include completionDate field mapping for accurate display in Completed contracts section.
- **Dual Signature Completion System (Nov 2025)**: Production-ready distributed completion workflow with comprehensive race condition prevention and crash recovery. Features include:
  - **Atomic Job Creation**: Completion jobs created inside Firestore transactions alongside signatures, guaranteeing no lost jobs even on server crashes.
  - **Distributed Locking**: Compare-and-set (CAS) transactions ensure only one worker instance can process each completion job, preventing duplicate PDFs and emails across multi-instance deployments.
  - **Crash Recovery**: Automatic detection and recovery of stale processing jobs (>5min timeout) ensures jobs never get stuck even if workers crash mid-processing.
  - **Idempotency Guarantees**: Comprehensive validation prevents re-processing of already-completed contracts.
  - **Saga Pattern Implementation**: Multi-step completion workflow with checkpoints, allowing graceful failure recovery without data corruption.
  - **Async Background Processing**: CompletionQueue service handles PDF generation, legal seal creation, Firebase Storage uploads, and email delivery asynchronously with proper retry logic.
  - **Firestore-Based Retries**: Failed jobs automatically retry via distributed queue with max 5 attempts, eliminating local retry bypasses that caused race conditions.
  - **Comprehensive Validation**: Pre-completion checks verify both signatures, digital certificates, required fields, and contract integrity before processing.
  - **Performance**: Target <1s completion time (down from 10-15s), 99.9% success rate.
  - **Services**: CompletionWorker (consolidated logic), CompletionQueue (async job processing with Firestore persistence), updated transactionalContractService and dualSignatureService.

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
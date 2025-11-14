# Legal Document & Permit Management Platform

## Overview
This AI-powered platform automates legal document and permit management for contractors. It generates estimates, creates contracts, analyzes permits, verifies properties, and coordinates over 20 API endpoints via Mervin AI. The project aims to evolve Mervin AI into a highly capable intelligent agent, streamlining operations and offering significant market potential in legal and permit management for contractors.

## Recent Changes

### November 14, 2025 - Stripe Connect HTTPS URL Fix
**CRITICAL PRODUCTION BUG FIXED**: Resolved issue preventing users from connecting Stripe accounts due to HTTP redirect URLs in LIVE mode.

**Problem**: 
- Stripe was rejecting onboarding requests with error: "Livemode requests must always be redirected via HTTPS"
- Code was using hardcoded HTTP URLs (`http://localhost:5000`) or inconsistent environment variables
- Duplicate URL generation logic across multiple files

**Solution Implemented**:
1. **Created Centralized URL Helper** (`server/utils/url-helpers.ts`):
   - `resolveAppBaseUrl()`: Resolves base URL with priority: APP_BASE_URL > REPLIT_DOMAINS > REPLIT_DEV_DOMAIN > localhost
   - `generateStripeRedirectUrl()`: Generates complete redirect URLs with query parameters
   - Enforces HTTPS in Stripe LIVE mode
   - Throws error if HTTP attempted in production
   - Allows HTTP only in development when not in LIVE mode

2. **Refactored Stripe Connect Endpoints**:
   - `server/index.ts`: Updated `/api/contractor-payments/stripe/connect` endpoint
   - `server/routes/contractor-payment-routes.ts`: Removed 55 lines of duplicate URL logic
   - `server/services/contractorPaymentService.ts`: Updated for Stripe Checkout Sessions
   - All endpoints now use centralized helper for consistency

3. **Architecture Benefits**:
   - Single source of truth for URL generation
   - No code duplication
   - Automatic HTTPS enforcement in production
   - Clear error messages for configuration issues
   - Future-proof for additional Stripe integrations

**Verification**: Confirmed via Stripe documentation that "live mode only accepts HTTPS" and "the Account Link creation process fails if you use HTTP"

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
- **UI/UX Decisions**: Mobile optimization, conversational onboarding via Mervin AI, smart action system, adaptive UI, integrated AI model selectors, redesigned Project Details view. Public landing page system separate from protected product.
- **Authentication**: Complete migration to AuthSessionProvider with cookie-based sessions, single source of truth.

### Backend
- **Server Framework**: Express.js.
- **Database Architecture**: Firebase (Firestore) for digital contracts, signatures, contractor profiles. PostgreSQL with Drizzle ORM for subscriptions, usage tracking, and legacy estimates.
- **Authentication**: Firebase Admin SDK with native Firebase UID, session-based authentication using HTTP-only cookies.
- **Security Architecture**: Multi-layer authentication, triple-layer contract security, enterprise-grade security for Legal Defense features, robust 1:1 Firebase UID to PostgreSQL `user_id` mapping.

### AI Architecture (Mervin AI V3 - Explicit Mode System)
- **Core Architecture**: Dual-AI system (ChatGPT-4o for fast analysis, Claude Sonnet 4 for complex tasks). Features autonomous task execution, real-time web research, intelligent AI routing, streaming progress, and full authentication forwarding.
- **Mode System** (Nov 2025): Explicit separation between CHAT mode (conversational, suggest-only) and AGENT mode (autonomous execution). Three presets: CHAT_ONLY, AGENT_SAFE (default), AGENT_AUTONOMOUS. Eliminates implicit LLM-based mode detection with structural validation.
    - **MervinOrchestratorV3**: Unified pipeline with 5 stages: context loading, analysis with validation, mode validation, confirmation middleware (pre-execution), and response generation.
    - **ConfirmationMiddleware**: Validates tool execution BEFORE running, supports wildcard patterns (delete_*, send_*), blocks critical actions requiring confirmation.
    - **Response Types**: CONVERSATION, SUGGEST_ACTION (CHAT mode), TASK_COMPLETED, NEEDS_CONFIRMATION, NEEDS_MORE_INFO.
- **Tool-Calling Architecture**: Enables Mervin to execute real tasks with contextual understanding.
    - **SnapshotService**: Centralizes user context (history, preferences, catalog) for AI situational awareness.
    - **ToolRegistry**: Dynamic tool execution system with intelligent slot-filling, supporting confirmation flows for critical actions.
    - **CoreTools**: Registered tools like create_estimate, create_contract, verify_property, get_permit_info, find_client.
    - **Telemetry System**: Complete execution time tracking across all handlers (conversation, suggest_action, execute_task), consistent logging for all response paths.
- **WorkflowEngine**: Multi-step process automation system enabling Mervin to replicate UI workflows conversationally.
    - **Architecture**: Declarative TypeScript workflow definitions, Redis-based session storage.
    - **Capabilities**: Multi-step data collection, conditional branching, automatic retries, real-time progress. Implemented workflows include `EstimateWorkflow`.
- **File Attachment System**: Multi-format file processing (PDFs, text, JSON/CSV, images metadata). Extracts content and generates contextual summaries for AI analysis.
- **UI/UX Enhancement**: Minimalist interface with real-time transparency (ThinkingIndicator, MessageContent with typing effect, SmartContextPanel, AgentCapabilitiesBadge, DynamicActionSuggestions, WebResearchIndicator, SystemStatusBar).
- **Conversation History System** (Nov 2025): Production-grade persistence and management for Mervin AI conversations using Firebase Firestore.
    - **Auto-Save Architecture**: Serialized queue-based persistence preventing race conditions, retry/backoff mechanism (3 attempts, exponential backoff), deadlock-proof flag management with timeout guards.
    - **Features**: Authenticated CRUD API, non-blocking async message persistence, automatic title generation after 2 exchanges (4 messages), AI model preservation, pinning, categorization, time-grouped display.
    - **ConversationPersistenceController**: Production-ready controller with lazy conversation creation, message append queue serialization, title generation via ChatGPT, state management with event emitters.
    - **Integration**: Fully integrated with useMervinAgent hook, automatic save on user and assistant messages, conversation resume/load support, guest mode handling.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Robust subscription-based permission system with OAuth, email/password, secure registration, and real-time usage limits. Unified Auth Ecosystem with cookie-based sessions.
- **Data Consistency & Security**: Secure 1:1 user mapping, comprehensive authentication middleware, real-time integrity monitoring.
- **Password Management**: Secure email-based password reset using Resend.
- **Dynamic URL Generation**: Centralized utility for environment-agnostic URL generation.
- **Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and triple-layer "Failed to fetch" error handling.
- **API Design**: Secure API endpoints with middleware for access controls and usage limits.
- **Sharing Systems**: Holographic Sharing System, Public URL Sharing System for estimates, and Enterprise-grade URL Shortening System.
- **Permissions System**: Centralized architecture using `shared/permissions-config.ts` for plan limits.
- **Rate Limiting & Usage Tracking**: Redis-based rate limiting and PostgreSQL persistent usage tracking with a dual-write architecture.
- **Legal Defense Access Control System**: Enterprise-grade subscription-based access control.
- **PDF Digital Signature System**: Premium PDF service with robust signature embedding and a dual signature completion workflow.
- **Stripe Connect**: Payment system configured for Stripe Organization API keys.
- **Stripe Integration (Nov 2025)**: Production-ready subscription system with health guardrails, centralized API version (2025-06-30.basil), and Price ID registry. Features startup validation against Stripe API, mode-aware price mappings (LIVE/TEST), environment variable overrides, and fail-fast deployment protection. All 4 production Price IDs validated and operational.
- **Stripe Express Contractor Payments (Nov 2025)**: Production-ready Stripe Express Connect integration for contractor payment processing. Features: (1) Complete project_payments schema with Stripe session tracking (stripe_checkout_session_id, payment_link_url, notes, sent_date), (2) Authenticated contractor payment routes with Firebase UID mapping, (3) Direct payment flow to contractor bank accounts via Stripe Connect, (4) TypeScript-safe payment service with comprehensive error handling, (5) Production LIVE mode with pk_live_* publishable key configuration.
- **Contractor Payment Security System (Nov 14, 2025)**: Enterprise-grade security hardening for payment processing with defense-in-depth architecture. Features: (1) **Authorization Enforcement**: Multi-layer ownership verification across all payment creation flows (createProjectPaymentStructure, createProjectPayment, createQuickPaymentLink), preventing cross-tenant payment creation even with poisoned database records. (2) **Atomic Transactions with Rollback**: Wrapped Stripe API calls in try/catch with automatic rollback via storage.deleteProjectPayment() if Stripe fails, preventing orphaned payment records in PostgreSQL. (3) **Legacy Data Auto-Remediation**: Automatic detection and cleanup of payments with mismatched ownership - deletes orphaned records and recreates for correct owner without blocking legitimate users. (4) **Authenticated User Priority**: All payment creation uses authenticated userId from Firebase Auth, never trusting project.userId from database to prevent poisoned data attacks. (5) **Comprehensive Audit Trail**: Detailed logging of ownership violations, remediation events, and rollback operations with [PAYMENT-REMEDIATION] tags for monitoring. (6) **Defense Layers**: Routes verify Firebase Auth → Service validates project ownership → Service validates payment ownership → Service uses authenticated userId → Atomic transaction with rollback. Result: 100% fidedigno (trustworthy) payment records with no authorization bypasses.
- **Welcome Email System (Nov 2025)**: Automated onboarding email system using Resend. Triggers on `customer.subscription.created` webhook with authentic Mexican motivational tone ("¡Bienvenido a Owl Fenc, compa! Aquí las oportunidades no se esperan… se construyen."). Features professional HTML template, async sending with error handling, and integrated with subscription lifecycle.
- **Payment Failure Blocking System (Nov 2025)**: Real-time account suspension system for payment failures. Features: (1) Firestore-backed suspension detection via `downgradedReason` field, (2) Global ProtectedRoute integration with TanStack Query polling (30s staleTime), (3) Non-dismissible PaymentBlockModal with authentic Mexican messaging, (4) Immediate lockout blocking all premium routes except /subscription and /billing, (5) Loading state gating prevents access window during query resolution. Modal redirects to payment update page while maintaining suspension state until backend clears `downgradedReason`.

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
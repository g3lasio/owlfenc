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
- **UI/UX Decisions**: Mobile optimization, conversational onboarding via Mervin AI, smart action system, adaptive UI, integrated AI model selectors, redesigned Project Details view. Public landing page system separate from protected product.
- **Authentication**: Complete migration to AuthSessionProvider with cookie-based sessions, single source of truth.

### Backend
- **Server Framework**: Express.js.
- **Database Architecture**: Firebase (Firestore) for digital contracts, signatures, contractor profiles. PostgreSQL with Drizzle ORM for subscriptions, usage tracking, and legacy estimates.
- **Authentication**: Firebase Admin SDK with native Firebase UID, session-based authentication using HTTP-only cookies.
- **Security Architecture**: Multi-layer authentication, triple-layer contract security, enterprise-grade security for Legal Defense features, robust 1:1 Firebase UID to PostgreSQL `user_id` mapping.

### AI Architecture (Mervin AI V2 - Hybrid Intelligence)
- **Core Architecture**: Dual-AI system (ChatGPT-4o for fast analysis, Claude Sonnet 4 for complex tasks). Features autonomous task execution, real-time web research, intelligent AI routing, streaming progress, and full authentication forwarding.
- **Tool-Calling Architecture**: Enables Mervin to execute real tasks with contextual understanding.
    - **SnapshotService**: Centralizes user context (history, preferences, catalog) for AI situational awareness.
    - **ToolRegistry**: Dynamic tool execution system with intelligent slot-filling, supporting confirmation flows for critical actions.
    - **CoreTools**: Registered tools like create_estimate, create_contract, verify_property, get_permit_info, find_client.
    - **Robustness Features** (Nov 2025): Multi-layer validation system prevents "workflow not found" errors. ChatGPT receives available tools in analysis context, validates workflows before execution, and automatically falls back to tools if workflow missing. TelemetryService tracks tool executions, workflow fallbacks, and errors for proactive monitoring. Routing prioritizes tools over workflows for faster, more reliable execution.
- **WorkflowEngine**: Multi-step process automation system enabling Mervin to replicate UI workflows conversationally.
    - **Architecture**: Declarative TypeScript workflow definitions, Redis-based session storage.
    - **Capabilities**: Multi-step data collection, conditional branching, automatic retries, real-time progress. Implemented workflows include `EstimateWorkflow`.
- **File Attachment System**: Multi-format file processing (PDFs, text, JSON/CSV, images metadata). Extracts content and generates contextual summaries for AI analysis.
- **UI/UX Enhancement**: Minimalist interface with real-time transparency (ThinkingIndicator, MessageContent with typing effect, SmartContextPanel, AgentCapabilitiesBadge, DynamicActionSuggestions, WebResearchIndicator, SystemStatusBar).
- **Conversation History System**: Production-grade persistence and management for Mervin AI conversations using Firebase Firestore. Features authenticated CRUD API, auto-save, automatic title generation, AI model preservation, pinning, categorization, and time-grouped display.

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
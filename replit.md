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

### AI Architecture (Mervin AI V3 - Explicit Mode System)
- **Core Architecture**: Dual-AI system (ChatGPT-4o for fast analysis, Claude Sonnet 4 for complex tasks). Features autonomous task execution, real-time web research, intelligent AI routing, streaming progress, and full authentication forwarding.
- **Mode System**: Explicit separation between CHAT mode (conversational, suggest-only) and AGENT mode (autonomous execution) with three presets: CHAT_ONLY, AGENT_SAFE (default), AGENT_AUTONOMOUS. Uses MervinOrchestratorV3 with 5 stages, including ConfirmationMiddleware for pre-execution validation.
- **Tool-Calling Architecture**: Dynamic tool execution system with intelligent slot-filling and confirmation flows. Utilizes SnapshotService for user context and ToolRegistry for core tools like create_estimate, create_contract, verify_property, get_permit_info, find_client. Includes a Telemetry System for execution tracking.
- **WorkflowEngine**: Multi-step process automation system enabling Mervin to replicate UI workflows conversationally via declarative TypeScript definitions and Redis-based session storage.
- **File Attachment System**: Multi-format file processing for content extraction and contextual summaries.
- **UI/UX Enhancement**: Minimalist interface with real-time transparency (ThinkingIndicator, MessageContent, SmartContextPanel, AgentCapabilitiesBadge, DynamicActionSuggestions, WebResearchIndicator, SystemStatusBar).
- **Conversation History System**: Production-grade persistence and management for Mervin AI conversations using Firebase Firestore, featuring auto-save, authenticated CRUD API, and automatic title generation.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Robust subscription-based permission system with OAuth, email/password, and usage limits.
- **Data Consistency & Security**: Secure 1:1 user mapping, comprehensive authentication middleware, real-time integrity monitoring.
- **Password Management**: Secure email-based password reset using Resend.
- **Dynamic URL Generation**: Centralized utility for environment-agnostic URL generation.
- **Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and triple-layer "Failed to fetch" error handling.
- **API Design**: Secure API endpoints with middleware for access controls and usage limits.
- **Sharing Systems**: Holographic Sharing System, Public URL Sharing System for estimates, and Enterprise-grade URL Shortening System.
- **Permissions System**: Centralized architecture for plan limits.
- **Rate Limiting & Usage Tracking**: Redis-based rate limiting and PostgreSQL persistent usage tracking with a dual-write architecture.
- **Legal Defense Access Control System**: Enterprise-grade subscription-based access control.
- **PDF Digital Signature System**: Premium PDF service with robust signature embedding and a dual signature completion workflow.
- **Stripe Integration**: Production-ready subscription system with health guardrails, centralized API version, and Price ID registry. Includes startup validation and mode-aware price mappings.
- **Stripe Express Contractor Payments**: Production-ready Stripe Express Connect integration for contractor payment processing with a complete `project_payments` schema, authenticated routes, direct payment flow, and TypeScript-safe payment service.
- **Contractor Payment Security System**: Enterprise-grade security hardening for payment processing with defense-in-depth architecture, including authorization enforcement, atomic transactions with rollback, legacy data auto-remediation, authenticated user priority, and a comprehensive audit trail.
- **Welcome Email System**: Automated onboarding email system using Resend, triggered on `customer.subscription.created` webhook.
- **Payment Failure Blocking System**: Real-time account suspension system for payment failures, with Firestore-backed detection, global ProtectedRoute integration, and a non-dismissible PaymentBlockModal.

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

## Recent Changes

### November 15, 2025 - Invoice Generation Unification (COMPLETE)
**CRITICAL BUG FIXED**: Unified invoice generation between Invoices.tsx and EstimatesWizard.tsx to eliminate $0.00 in line items and produce identical PDF formats.

**Root Cause Identified**:
- Backend `normalizeInvoicePayload()` (server/routes.ts:1881) expects specific field names:
  - `item.unitPrice` but EstimatesWizard sent `item.price`
  - `item.totalPrice` but EstimatesWizard sent `item.total`
- Result: Backend couldn't find price fields → defaulted to 0 → PDFs showed $0.00
- Invoices.tsx worked because saved estimates already had `unitPrice` and `totalPrice` from Firestore

**Solution Implemented**:

1. **Field renaming in EstimatesWizard.tsx** (2 locations: direct generation + dialog handler):
   ```javascript
   // Transform items to match backend expectations
   const transformedItems = estimate.items.map(item => ({
     name: item.name || "Item",
     description: item.description || "",
     quantity: item.quantity || 1,
     unitPrice: item.price || 0,      // ✅ Renamed: price → unitPrice
     totalPrice: item.total || 0      // ✅ Renamed: total → totalPrice
   }));
   ```

2. **All monetary values as pure numbers** (backend handles formatting):
   ```javascript
   estimate: {
     items: transformedItems,
     subtotal: estimate.subtotal || 0,
     discountAmount: estimate.discountAmount || 0,
     taxRate: estimate.taxRate || 0,
     tax: estimate.tax || 0,
     total: estimate.total || 0,
   }
   ```

3. **Type consistency for invoiceConfig.downPaymentAmount**:
   - Changed state from string ("") to number (0)
   - Input onChange validates with `Number.isFinite()` to prevent NaN
   - All resets use numeric 0
   - Prevents backend from receiving NaN and defaulting to $0.00

**Backend Flow** (normalizeInvoicePayload):
```javascript
// Accepts numbers or strings, converts to formatted currency
items: (estimate.items || []).map((item: any) => {
  const unitPrice = Number(item.unitPrice || 0);  // ✅ Now finds unitPrice
  const totalPrice = Number(item.totalPrice || 0); // ✅ Now finds totalPrice
  return {
    unit_price: `$${unitPrice.toFixed(2)}`,  // Backend formats
    total: `$${totalPrice.toFixed(2)}`,
  };
}),
subtotal: `$${Number(estimate.subtotal || 0).toFixed(2)}`,
tax_amount: `$${Number(estimate.tax || 0).toFixed(2)}`,
total: `$${Number(estimate.total || 0).toFixed(2)}`,
```

**Edge Cases Handled**:
- Items without price/total: default to 0
- Invalid downPaymentAmount (NaN): coerced to 0
- Missing totals: default to 0
- Transitional input values (".", "-"): validated before state update

**Architecture Lessons**:
- Always verify backend expectations before transforming data
- Field naming matters - subtle mismatches cause silent failures
- Let backend handle formatting when a normalization layer exists
- Maintain type consistency across state lifecycle
- Numbers over strings for monetary values ensures predictable calculations

**Result**: Both flows now generate identical PDFs with complete, accurate pricing and no $0.00 artifacts.
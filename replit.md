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
- **Authentication**: Complete migration to AuthSessionProvider with cookie-based sessions.

### Backend
- **Server Framework**: Express.js.
- **Database Architecture**: Firebase (Firestore) for digital contracts, signatures, contractor profiles. PostgreSQL with Drizzle ORM for subscriptions, usage tracking, and legacy estimates.
- **Authentication**: Firebase Admin SDK with native Firebase UID, session-based authentication using HTTP-only cookies.
- **Security Architecture**: Multi-layer authentication, triple-layer contract security, enterprise-grade security for Legal Defense features, robust 1:1 Firebase UID to PostgreSQL `user_id` mapping.

### AI Architecture (Mervin AI V3 - Explicit Mode System)
- **Core Architecture**: Dual-AI system (ChatGPT-4o for fast analysis, Claude Sonnet 4 for complex tasks) with autonomous task execution, real-time web research, intelligent AI routing, streaming progress, and full authentication forwarding.
- **Mode System**: Explicit separation between CHAT mode (conversational, suggest-only) and AGENT mode (autonomous execution) with three presets: CHAT_ONLY, AGENT_SAFE (default), AGENT_AUTONOMOUS. Uses MervinOrchestratorV3 with 5 stages, including ConfirmationMiddleware.
- **Tool-Calling Architecture**: Dynamic tool execution system with intelligent slot-filling and confirmation flows. Utilizes SnapshotService for user context and ToolRegistry for core tools like `create_estimate`, `create_contract`, `verify_property`, `get_permit_info`, `find_client`. Includes a Telemetry System.
- **WorkflowEngine**: Multi-step process automation system enabling Mervin to replicate UI workflows conversationally via declarative TypeScript definitions and Redis-based session storage.
- **File Attachment System**: Multi-format file processing for content extraction and contextual summaries.
- **UI/UX Enhancement**: Minimalist interface with real-time transparency (ThinkingIndicator, MessageContent, SmartContextPanel, AgentCapabilitiesBadge, DynamicActionSuggestions, WebResearchIndicator, SystemStatusBar).
- **Conversation History System**: Production-grade persistence and management for Mervin AI conversations using Firebase Firestore, featuring auto-save, authenticated CRUD API, and automatic title generation.

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

## Recent Changes

### November 15, 2025 - Project Timeline Optimization
**Timeline Simplification and Mobile UX Enhancement**

**Changes Implemented**:

1. **Removed "Project" State**:
   ```javascript
   // ❌ REMOVED:
   { key: "in_progress", label: "Project", icon: "ri-tools-line", color: "#06b6d4" }
   ```
   
   **New Timeline Flow (6 states)**:
   - Estimate → Rejected → In Contract → Scheduled → Paid → Completed
   - Lógica de progreso intacta, cálculos automáticamente ajustados
   - Sin estados huérfanos ni duplicados

2. **Mobile-First UX Optimization**:
   
   **Desktop (≥768px)**:
   - Texto visible siempre debajo de cada icono
   - Layout tradicional mantenido
   
   **Mobile (<768px)**:
   - **Solo iconos visibles** - limpio y compacto
   - **Tooltip en tap/hover**:
     - Activación: `group-hover` y `group-active` 
     - Diseño: backdrop blur, borde colorizado, flecha apuntando
     - Transición suave opacity 0 → 100
     - z-index alto para evitar solapamiento
   
   ```jsx
   // Desktop label
   <span className="hidden md:block ...">
   
   // Mobile tooltip
   <div className="md:hidden ... opacity-0 group-hover:opacity-100 group-active:opacity-100">
   ```

**Visual Impact**:
- Móvil: 50% menos espacio vertical usado
- Touch targets grandes (36x36px) para accesibilidad
- Información disponible sin saturar pantalla
- Timeline interactivo funcional en pantallas muy pequeñas (320px+)

**Technical Safety**:
- No se modificó lógica de drag & drop
- No se alteró sistema de actualización de Firebase
- Indices y cálculos de progreso automáticamente ajustados
- Estados subsecuentes mantienen orden y flujo

**Critical Fix - State Canonicalization (Same Session)**:
**Problem**: Eliminated "Project" state broke save logic - old states like "work_in_progress" mapped to non-existent timeline keys, causing validation failures.

**Solution - Canonical State Mapping**:

1. **Created centralized canonicalization** in Projects.tsx and firebase.ts:
   - Maps ALL legacy states → 6 valid timeline states
   - Handles both old `projectProgress` values AND `status` field
   - Default fallback to "estimate_created"

2. **Legacy state mappings**:
   ```javascript
   'work_in_progress' → 'scheduled'     // Removed "Project" state
   'estimate_approved' → 'client_approved'
   'project_completed' → 'completed'
   'in_progress' → 'scheduled'
   // ... 30+ total mappings
   ```

3. **Applied canonicalization at 3 critical points**:
   - **Projects.tsx** (load): `canonicalizeProjectProgress(status, existingProgress)`
   - **firebase.ts** (save): `canonicalizeProgress(progress)` before persistence
   - **FuturisticTimeline.tsx**: Already validates against 6-state array

**Result**: 
- ✅ All 100 projects load with valid states
- ✅ State updates save correctly to Firebase
- ✅ Legacy data automatically migrated on read
- ✅ No orphan states or validation errors
- ✅ **Architect Verified**: Functional equivalence confirmed - both canonicalizeProgress() and canonicalizeProjectProgress() produce identical outputs for all legacy states
- ✅ **Data Flow**: Complete canonicalization coverage on load (Projects.tsx) and save (firebase.ts)
- ⚠️ **Future Improvement**: Consider extracting shared mapping to common module for single-source-of-truth

### November 15, 2025 - ProjectDetails Data Source Fix (CRITICAL)
**CRITICAL FIX**: Corrected ProjectDetails to use project fields directly (project ES el estimate completo).

**Problem Identified**:
- ProjectDetails buscaba `project.estimateData.items` pero este campo no existe
- Validación incorrecta rechazaba todos los proyectos válidos con error "no hay presupuesto asociado"
- Usuario reportó que ningún proyecto podía generar factura desde Projects page

**Root Cause**:
- Projects.tsx carga datos desde Firebase collection "estimates"
- Cada proyecto ES un estimate completo: `allProjects.push(estimate)`
- No hay campo separado `estimateData` - los datos están directamente en project
- Invoices.tsx accede correctamente a `estimate.items`, `estimate.subtotal`, etc.

**Solution Implemented**:

1. **Eliminada validación incorrecta**:
   ```javascript
   // ❌ INCORRECTO (removed):
   if (!project.estimateData || !project.estimateData.items)
   
   // ✅ CORRECTO: El proyecto ES el estimate, validar campos directos si necesario
   ```

2. **Acceso directo a campos como Invoices.tsx**:
   ```javascript
   estimate: {
     items: project.items || [],           // ✅ Directo, no project.estimateData.items
     subtotal: project.subtotal || 0,      // ✅ Directo
     discountAmount: project.discount || 0, // ✅ Directo
     tax: project.tax || 0,                // ✅ Directo
     total: project.total || project.totalPrice || 0
   }
   ```

3. **Logging agregado para debugging**:
   ```javascript
   console.log("📊 [PROJECT-INVOICE] Project data:", {
     hasItems: !!project.items,
     itemsCount: project.items?.length || 0,
     total: project.total || project.totalPrice
   });
   ```

**Data Flow Architecture**:
```
Firebase "estimates" collection
    ↓
Projects.tsx: allProjects.push(estimate)  // estimate completo
    ↓
ProjectDetails receives: project = {
  items: [...],          // ✅ Directamente del estimate
  subtotal: 1000,        // ✅ Directamente del estimate
  clientName: "...",     // ✅ Directamente del estimate
  ...                    // Todos los campos del estimate
}
    ↓
handleGenerateInvoice: usa project.items directamente (igual que Invoices.tsx)
```

**Key Learning**:
- Verificar siempre la estructura de datos real antes de asumir campos anidados
- Projects y History comparten la misma fuente de datos (collection "estimates")
- Consistencia entre Invoices.tsx y ProjectDetails.tsx ahora garantizada

**Result**: Projects ahora genera facturas correctamente usando los mismos datos completos que History/Invoices.

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
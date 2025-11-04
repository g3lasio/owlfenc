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
- FETCH ERRORS ELIMINATION: Sistema comprehensive trilple-capa para eliminar errores de fetch fastidiosos que interrumpen la experiencia
- LOGIN UX IMPROVEMENTS: Hacer opciones biométricas y OTP más visibles pero menos detalladas
- LABEL ACCURACY: Usar "OTP Code" en lugar de "SMS Code" ya que el sistema usa email-based OTP
- BIOMETRIC FUNCTIONALITY: Corregir problemas de lógica y funcionalidad en autenticación biométrica
- BILLING-SUBSCRIPTION CONSISTENCY: Sincronización completa de precios, moneda y beneficios entre páginas Billing y Subscription
- MERVIN AI MODEL SELECTOR: Implementación de selector de modelo estilo ChatGPT con opciones "Legacy" y "Agent mode"
- AI INTEGRATION MODERNIZATION 2025: Investigación completa de alternativas modernas para integración de AI
- MERVIN AI CONVERSATIONAL INTELLIGENCE: Sistema conversacional tipo GPT-5 con superinteligencia y personalidad humana
- CHAT RELIABILITY CRITICAL: Sistema robusto anti-cuelgues con timeouts, logging detallado y manejo comprehensivo de errores para evitar estados estáticos de "Procesando..."
- CONVERSATIONAL RESPONSES REVOLUTION: Sistema completamente reescrito para eliminar respuestas genéricas repetitivas
- CRITICAL LANGUAGE CONSISTENCY FIX: Solución definitiva para problema "molestoso" de cambio de idioma español→inglés
- FASE 2 RESEARCH OPTIMIZATION COMPLETED: Sistema avanzado de investigación web súper rápida específicamente optimizado para contratistas ocupados
- FASE 3 FRONTEND INTEGRATION COMPLETED: Integración completa del frontend del chat de Mervin con backend reorganizado
- MOBILE UX OPTIMIZATION COMPLETED: Optimización completa de Mervin AI chat para iPhone y dispositivos móviles
- SMART ACTION SYSTEM REVOLUTION: Sistema revolucionario de acciones inteligentes que reemplaza botones estáticos
- CLIENT MANAGEMENT SYSTEM REVOLUTION COMPLETED: Sistema de gestión de clientes completamente refactorizado y optimizado
- AGENT FUNCTIONS HEADER INTEGRATION
- DATA CONSISTENCY SECURITY CRITICAL: Sistema robusto de mapeo de usuarios eliminando inconsistencias de datos entre dispositivos
- PROFILE SYNC FIX CRITICAL: Corregida sincronización de perfil contractor entre dispositivos - Firebase como fuente de verdad, localStorage solo como caché
- CHYRRIS.COM SIGNATURE URLS: Sistema de URLs dinámicas completamente reconfigurado para usar chyrris.com exclusivamente para enlaces de firma de contratos
- CHYRRIS.COM ESTIMATE SHARING URLS: Sistema de URLs compartibles de estimados completamente migrado a chyrris.com con URLs ultra-cortas
- LEGAL DEFENSE ACCESS CONTROL SYSTEM: Sistema completo de control de acceso por plan de suscripción implementado en Legal Defense con enforcement de límites
- PDF SIGNATURE GENERATION FIX: Sistema de firmas digitales en PDFs completados corregido usando contadores independientes por estrategia. Cada estrategia de reemplazo (signature-line, date-line, etc.) alterna independientemente entre contractor y client, eliminando el bug de asignación cruzada que causaba que ambas cajas mostraran la firma del contractor
- DUAL SIGNATURE COMPLETION WORKFLOW FIX: Sistema de firma dual completamente funcional con flujo automatizado de finalización.
- PDF ATTACHMENT FIX: PDF se adjunta directamente al email del contractor como archivo adjunto (no solo link de descarga) usando soporte nativo de Resend con type safety.
- COMPLETION EMAIL NOTIFICATION ENHANCEMENT: Email de completado rediseñado para servir claramente como notificación oficial.
- COMPLETED CONTRACT DISPLAY FIX: Corrección de visualización de datos en contratos completados.
- DUAL SIGNATURE EMAIL RESEND FIX: Sistema de reenvío de emails de firma completamente corregido y funcional.
- DOWNLOAD BUTTON FUNCTIONALITY FIX: Botón Download corregido para descargar directamente sin abrir diálogos de compartir.
- LEGAL DEFENSE DATA SOURCE CONSISTENCY FIX: Refactorización arquitectónica completa - eliminada `projects` collection, ÚNICA fuente `estimates` con ordenamiento descendente por fecha (más recientes primero) usando `orderBy("createdAt", "desc")` en query Firebase y listener en tiempo real.
- INVOICES PAGE FUNCTIONAL FIX (NOV 2025): Corrección completa de problemas funcionales reportados en página de Invoices:
  - Data Source Fix: Migrado de `projects` a usar SOLO `estimates` collection (100% consistente con arquitectura documentada)
  - Composite Index Fix: Eliminado `orderBy` de query Firebase para evitar error "failed-precondition", ordenamiento ahora en memoria
  - Currency Handling: Eliminada conversión automática de centavos - valores usados exactamente como están almacenados para prevenir corrupción de datos
  - Button States: Agregado estado `isGenerating` con spinner Loader2 para mejor UX durante generación de PDFs
  - Error Handling: Implementado logging comprehensivo y manejo robusto de errores Axios con timeout de 60s
  - Data Consistency: Agregado `firebaseUserId` a invoices collection para consistencia con estimates
  - Test IDs: Agregados data-testid a botones principales para testing automatizado
  - PRIMO CHAMBEADOR PRICING FIX (NOV 2025): Corrección crítica de precios del plan gratuito "Primo Chambeador":
    - Problema detectado: Precio anual mostraba $310 cuando debería ser gratis
    - Root cause: Inconsistencia en scripts de setup PostgreSQL y Firebase
    - Corrección aplicada:
      - Actualizado `server/scripts/setupSubscriptionPlans.ts`: yearly_price 31000 → 0
      - Actualizado `server/scripts/setupFirebaseSubscriptionPlans.ts`: yearly_price 290 → 0
      - Ejecutado UPDATE directo en PostgreSQL: `yearly_price = 0` para plan ID 5
      - Features ajustadas a coincidircon `shared/permissions-config.ts`
    - Verificación: Plan ahora 100% gratuito tanto mensual como anual en toda la arquitectura
    - Consistencia: Alineado con permissions-config.ts como fuente de verdad
  - Invoice Summary Redesign: Resumen de factura completamente rediseñado con:
    - Gradientes de color por categoría (azul/verde/naranja)
    - Contraste mejorado con texto blanco bold
    - Tarjetas financieras con bordes brillantes
    - Título "Resumen de Factura" prominente y visible
    - Badge de estado con colores sólidos (verde/amarillo/rojo)
    - Información de términos de pago agregada
  - Estimate Selection UX Enhancement: Sistema mejorado de selección de estimados con:
    - Búsqueda en tiempo real por cliente y tipo de proyecto
    - Visualización compacta inicial de 4 estimados máximo
    - Botón único "Ver más (X restantes)" que carga de 4 en 4
    - Contador de resultados mostrando "X de Y estimados"
    - Botón "Mostrar menos" para volver a vista compacta (aparece cuando displayLimit > 4)
    - Auto-reset a 4 estimados cuando cambia término de búsqueda
    - UX limpia y simple - no inunda la página, optimizada para 98+ estimados
- PROFILE DATA PERSISTENCE FIX (NOV 2025): Corrección crítica de pérdida de datos en perfiles de contratista:
  - Problema detectado: Foto de perfil y documentos se perdían después de refresh/recarga
  - Root cause: Uso de `URL.createObjectURL()` que genera URLs temporales en memoria del navegador
  - Solución implementada:
    - Foto de perfil: Sistema completo de upload a Firebase Storage con función `handleProfilePhotoUpload()`
      - Validación de tamaño (máx 5MB) y tipo de archivo (solo imágenes)
      - Upload a carpeta `profile-photos/{userId}` en Firebase Storage
      - URL permanente guardada en Firestore en campo `profilePhoto`
      - Loading state con spinner durante upload
      - Toast notifications para feedback al usuario
    - Documentos (licencias, seguros, etc.): Sistema completo de upload a Firebase Storage con función `handleDocumentUpload()`
      - Validación de tamaño (máx 10MB) para documentos
      - Upload a carpeta `documents/{userId}` en Firebase Storage
      - URLs permanentes guardadas en Firestore en campo `documents.{documentType}`
      - Loading state separado para no bloquear otras operaciones
    - Logo de empresa: Ya estaba correcto usando Base64 que persiste en Firestore
  - Archivos modificados:
    - `client/src/pages/Profile.tsx`: Agregadas funciones `handleProfilePhotoUpload()` y `handleDocumentUpload()`
    - Importado `uploadFile` desde `client/src/lib/firebase.ts`
    - Estados agregados: `uploadingPhoto` y `uploadingDocument` para UX loading
    - Reemplazado `URL.createObjectURL()` temporal por Firebase Storage permanente
  - Verificación: Datos ahora persisten correctamente entre dispositivos y sesiones usando Firebase como fuente de verdad

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
- **Mervin AI Unified System**: Superintelligent chatbot with autonomous task execution, real-time web research, differentiated AI model roles, intelligent decision-making, parallel execution, and specialized agents (estimates, contracts, permits, property verification). Features learning, memory, real-time feedback, and a Conversational Intelligence module, including a `TaskOrchestrator` and `EndpointCoordinator`.

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
# Legal Document & Permit Management Platform

## Overview
This AI-powered legal document and permit management platform automates tasks like generating estimates, creating contracts, analyzing permits, verifying properties, and coordinating over 20 API endpoints via Mervin AI. The project aims to evolve Mervin AI into a capable intelligent agent, streamlining operations for contractors in legal and permit management, and offering significant market potential.

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
- PDF SIGNATURE GENERATION FIX (NOV 2025): Sistema de firmas digitales en PDFs completados corregido usando contadores independientes por estrategia. Cada estrategia de reemplazo (signature-line, date-line, etc.) alterna independientemente entre contractor y client, eliminando el bug de asignación cruzada que causaba que ambas cajas mostraran la firma del contractor
- DUAL SIGNATURE COMPLETION WORKFLOW FIX (NOV 2025): Sistema de firma dual completamente funcional con flujo automatizado de finalización:
  - Solo el contractor recibe el PDF firmado por email (cliente no recibe email con PDF por seguridad)
  - Contratos completados se guardan automáticamente con status="completed" en Firebase (dualSignatureContracts y contractHistory)
  - PDF se genera automáticamente con firmas, fechas y sello digital usando premiumPdfService
  - Método notifyRemainingParty reimplementado para Firebase (eliminada dependencia de PostgreSQL obsoleta)
  - Sistema de notificación funciona correctamente cuando primera parte firma
  - PDF ATTACHMENT FIX (NOV 2025): PDF se adjunta directamente al email del contractor como archivo adjunto (no solo link de descarga) usando soporte nativo de Resend con type safety
  - COMPLETION EMAIL NOTIFICATION ENHANCEMENT (NOV 2025): Email de completado rediseñado para servir claramente como notificación oficial:
    - Subject: "✅ NOTIFICACIÓN: Contrato Firmado por Ambas Partes"
    - Header prominente: "📧 NOTIFICACIÓN OFICIAL"
    - Mensaje claro: "Este es un correo de notificación oficial: El contrato ha sido firmado exitosamente por ambas partes"
    - Recordatorio explícito: "El documento PDF firmado está adjunto a este email"
    - Se envía INMEDIATAMENTE cuando ambas partes completan la firma
- COMPLETED CONTRACT DISPLAY FIX (NOV 2025): Corrección de visualización de datos en contratos completados:
  - Frontend normaliza Firestore Timestamps a ISO strings antes de display (eliminando "N/A" en fechas)
  - Backend normaliza totalAmount de strings legacy a números (eliminando costo "0" en contratos antiguos)
  - Sistema dual de normalización garantiza consistencia entre frontend y backend
  - Logging condicional solo en development para evitar exposición de PII en producción
  - Manejo robusto de datos legacy (strings, timestamps, valores faltantes)
  - Normalización comprehensiva de fechas de firma (contractorSignedAt, clientSignedAt) eliminando "Invalid Date" en sección de firmas
  - Función normalizeTimestamp robusta que parsea Firestore Timestamps, strings legacy y maneja valores corruptos defensivamente (para endpoint /completed)
  - Función convertFirestoreTimestamp robusta con validación comprehensiva para HTML view eliminando "Invalid Date" en vistas Share/View Contract (validación de Date objects, Firestore Timestamps, timestamps con seconds, y strings parseables con isNaN() checks)
- DUAL SIGNATURE EMAIL RESEND FIX (NOV 2025): Sistema de reenvío de emails de firma completamente corregido y funcional:
  - Método sendDualNotifications() ahora es PUBLIC y acepta parámetros contractorSigned/clientSigned
  - Verificación INTERNA en servicio: solo envía emails a partes que NO han firmado
  - Endpoint /api/dual-signature/resend-links verifica estado de contrato Y pasa signature flags al servicio
  - Doble capa de protección: verificación en route + verificación en service
  - Logging claro de qué emails se enviaron y cuáles se saltaron
  - Elimina completamente el bug de emails duplicados a partes que ya firmaron
- DOWNLOAD BUTTON FUNCTIONALITY FIX (NOV 2025): Botón Download corregido para descargar directamente sin abrir diálogos de compartir:
  - Función downloadSignedPdf completamente refactorizada para SOLO descargar archivo PDF
  - Eliminado Web Share API del botón Download (ahora exclusivo del botón Share)
  - Descarga directa usando createElement("a") con atributo download en todos los dispositivos
  - Comportamiento consistente en desktop, móvil y tablet
  - Botón Download ahora cumple exclusivamente su función: descargar el PDF localmente
  - Botón Share mantiene funcionalidad de Web Share API para compartir el archivo

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
- **Mervin AI Unified System**: Superintelligent chatbot with autonomous task execution, real-time web research, differentiated AI model roles, intelligent decision-making, parallel execution, and specialized agents (estimates, contracts, permits, property verification). Features learning, memory, real-time feedback, and a Conversational Intelligence module. Includes a `TaskOrchestrator` and `EndpointCoordinator`.

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
- **Legal Defense Access Control System**: Enterprise-grade subscription-based access control for Legal Defense page with plan-tier enforcement (e.g., Primo Chambeador: ZERO ACCESS, Mero Patrón: LIMITED ACCESS, Master Contractor/Free Trial: UNLIMITED ACCESS).
- **PDF Digital Signature System**: Premium PDF service with robust signature embedding using independent strategy-based counters for contractor/client assignments.
- **Dual Signature Completion Workflow**: Automated contract completion system, including email distribution (contractor only), status management in Firebase, automatic PDF generation, and a Firebase-native notification system.

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
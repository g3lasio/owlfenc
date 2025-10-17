# Legal Document & Permit Management Platform

## Overview
This project is an AI-powered legal document and permit management platform featuring Mervin AI, an autonomous intelligent agent. Its purpose is to automate tasks such as generating estimates, creating contracts, analyzing permits, verifying properties, and coordinating over 20 API endpoints autonomously. The platform aims to evolve Mervin AI from a chatbot into a capable intelligent agent, offering significant market potential in legal and permit management.

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
- CONVERSATIONAL ONBOARDING SYSTEM: Sistema de onboarding completamente integrado en Mervin AI
- SMART ACTION SYSTEM REVOLUTION: Sistema revolucionario de acciones inteligentes que reemplaza botones estáticos
- CLIENT MANAGEMENT SYSTEM REVOLUTION COMPLETED: Sistema de gestión de clientes completamente refactorizado y optimizado
- AGENT FUNCTIONS HEADER INTEGRATION
- DATA CONSISTENCY SECURITY CRITICAL: Sistema robusto de mapeo de usuarios eliminando inconsistencias de datos entre dispositivos
- PROFILE SYNC FIX CRITICAL: Corregida sincronización de perfil contractor entre dispositivos - Firebase como fuente de verdad, localStorage solo como caché
- ENTERPRISE CONTRACT SECURITY SYSTEM (2025-10-16): Sistema de seguridad enterprise-grade completo para Legal Defense con validación backend robusta, Demo Mode para usuarios gratuitos, contadores de uso en tiempo real y manejo personalizado de errores 403
- CONTRACTOR EMAIL ROUTES CLEANUP (2025-10-16): Corrección crítica eliminando 5 endpoints rotos que causaban errores 500 en runtime (verifyContractorEmail, completeEmailVerification, createContractTemplate, createPaymentTemplate, checkVerificationStatus) - manteniendo solo endpoints funcionales alineados con capacidades reales del servicio
- UX CRITICAL IMPROVEMENTS (2025-10-17): Eliminación completa de auto-refresh fastidioso de 15 segundos en Legal Defense History/Completed que causaba scroll automático disruptivo; Fix de popup blocker en "View Document" abriendo ventana sincronicamente antes de fetch asíncrono con manejo robusto de errores para prevenir ventanas huérfanas; Corrección de layout responsive en "Project Total (Editable)" que estaba fuera del viewport en mobile webview - implementado sistema flex responsive (vertical en mobile, horizontal en desktop) con ajustes de padding, fuentes y anchos para eliminar overflow horizontal

## System Architecture

### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS, Wouter for routing, TanStack Query for data management.
- **UI/UX Decisions**: Mobile optimization (safe areas, enhanced touch targets); conversational onboarding guided by Mervin AI; smart action system (slash commands, contextual suggestions); adaptive UI elements; agent functions and model selectors integrated into the header.

### Backend
- **Server Framework**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM for main data, Firebase (Firestore) for client management data ensuring real-time sync.
- **Authentication**: Firebase Admin SDK with secure user mapping system.
- **Security Architecture**: Multi-layer authentication with AuthMiddleware, UserMappingService, and data integrity monitoring, including a robust enterprise-level authentication system (`RobustAuthManager`) with multiple fallbacks and a `DataIntegrityMonitor` for proactive data loss prevention.

### AI Architecture
- **Mervin AI Unified System**: Superintelligent chatbot with autonomous task execution and real-time web research. Features differentiated AI model roles, intelligent decision-making, parallel execution, and specialized agents (estimates, contracts, permits, property verification). Includes learning, memory, real-time feedback, and a Conversational Intelligence module with advanced multilingual personality and emotion recognition. The system integrates existing EstimatesWizard functionality conversationally, orchestrating tasks through the `TaskOrchestrator` and `EndpointCoordinator`.

### Core Features & Design Patterns
- **User Authentication & Authorization**: Robust subscription-based permission system supporting OAuth, email/password, secure registration, automatic subscription degradation, real-time usage limit enforcement, persistent login, device fingerprinting, session validation, and WebAuthn API for biometric logins. Includes secure 1:1 Firebase UID to PostgreSQL user_id mapping. Modern WebAuthn Iframe Support is implemented with intelligent dual-strategy authentication and comprehensive error handling.
- **Data Consistency & Security**: Secure 1:1 user mapping system preventing data mixing, comprehensive authentication middleware, and real-time integrity monitoring. Includes a robust client management system with specialized backend endpoints for integrity checks and automatic repair. Firebase (Firestore) is the primary source of truth for contractor profiles, with localStorage serving only as a local cache.
- **Password Management**: Secure email-based password reset using Resend, with database-stored, single-use, expiring tokens. Production-ready account security system with immediate email/password changes using Firebase Admin SDK, including rate limiting, validation, and professional error handling.
- **Dynamic URL Generation**: Centralized utility (`server/utils/url-builder.ts`) for environment-agnostic URL generation.
- **Enhanced Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and a triple-layer system to mitigate "Failed to fetch" errors.
- **Dynamic Form Validation**: Client-side validation using Zod schema integrated with UI components.
- **API Design**: Secure API endpoints for subscription management, usage tracking, authentication, and password reset functionality, enforced with middleware for access controls and usage limits. Critical legal defense functionalities have integrated robust authentication and token verification.
- **Holographic Sharing System**: Futuristic Iron Man-style interface for PDF generation and URL sharing with complete accessibility support, motion optimization, and robust error handling, featuring advanced visual design elements.
- **Public URL Sharing System**: Simplified estimate sharing system generating permanent, stable URLs that work without authentication requirements. Uses Firebase Admin SDK for data persistence, crypto-secure shareId generation, and dynamic URL building, with public routes and access tracking.
- **Enterprise Contract Security System**: Comprehensive tiered subscription-based access control for Legal Defense features with backend enforcement, frontend Demo Mode, and real-time usage tracking. This includes triple-layer enterprise-grade security preventing subscription restriction bypasses via robust backend protection, user-friendly frontend protection (Demo Mode, personalized 403 errors, real-time usage counter), and consistent data synchronization. Critical security fixes include patching unprotected Legal Defense Endpoints and hardening authentication by eliminating bypasses in `verifyFirebaseAuth` middleware.

## External Dependencies
- Firebase (Firestore, Admin SDK)
- OpenAI
- Stripe
- PostgreSQL
- Drizzle ORM
- Resend
- Anthropic
- Mapbox (simulated integration)
- PDFMonkey (for estimate PDF generation)
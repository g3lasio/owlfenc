# Legal Document & Permit Management Platform

## Overview
This project is an advanced AI-powered legal document and permit management platform featuring Mervin AI, an autonomous intelligent agent. Mervin AI is designed to execute complex multi-step tasks without manual intervention, transforming from a simple chatbot into an intelligent agent capable of generating estimates, creating contracts, analyzing permits, verifying properties, and coordinating over 20 API endpoints autonomously. The platform integrates intelligent authentication, robust user registration, and secure access controls to deliver a revolutionary solution for legal document and permit management. Its vision is to streamline complex legal and permit processes, offering significant market potential by automating tasks traditionally requiring extensive manual effort.

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

## System Architecture

### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS for responsive design.
- **Routing**: Wouter for client-side routing.
- **Data Management**: TanStack Query for efficient data fetching and state management.

### Backend
- **Server Framework**: Express.js server.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Firebase Admin SDK for backend authentication management.
- **Key Integrations**: OpenAI for document generation and Stripe for payment processing.

### Core Features & Design Patterns
- **Mervin AI Autonomous Agent**: Transformed from a monolithic chatbot into a modular system with 12 specialized components. It features:
    - **Intention Analysis**: Natural language understanding (95%+ accuracy) for multi-step tasks.
    - **Task Orchestration**: Autonomous coordination of 20+ API endpoints with intelligent error recovery.
    - **Specialized Agents**: Domain-specific agents for estimates, contracts, permits, and property verification.
    - **Learning & Memory**: Persistent learning system optimizing workflows based on successful patterns.
    - **Real-time Feedback**: Live progress tracking with step-by-step execution visibility.
    - **Permission Intelligence**: Dynamic permission validation with upgrade suggestions.
    - **Context Awareness**: Maintains conversation context, user preferences, and project history.
    - **Endpoint Consistency**: Agents utilize existing, verified endpoints from various modules (e.g., Estimates, Legal Defense, Property Ownership, Permit Advisor).
- **User Authentication & Authorization**: Enhanced OAuth, email/password, and a robust subscription-based permission system (`primo_chambeador`, `mero_patron`, `master_contractor`, `trial_master`). Includes secure registration (defaulting to free plan), automatic subscription degradation, and real-time usage limit enforcement via middleware.
- **Login Persistence**: 30-day persistent login system with device fingerprinting, automatic session validation, and cleanup.
- **Biometric Authentication**: WebAuthn API integration for biometric logins (Face ID, Touch ID, Windows Hello, fingerprint) with intelligent device detection, secure credential management, and backend validation.
- **Password Reset System**: Secure email-based password reset using Resend, with database-stored, single-use, 15-minute expiring tokens. Integrates with Firebase Admin Auth for password updates.
- **Dynamic URL Generation**: A centralized utility (`server/utils/url-builder.ts`) for environment-agnostic URL generation, ensuring universal hosting compatibility and production-ready links for critical systems.
- **Enhanced Error Handling**: Comprehensive Firebase authentication error handling, advanced unhandled rejection interceptors, and a triple-layer system to eliminate "Failed to fetch" errors by intercepting network errors, reducing timeouts, and silencing console spam. Includes a specific solution for runtime-error-plugin messages by bypassing problematic URLs and intercepting console errors.
- **Dynamic Form Validation**: Client-side validation using Zod schema integrated with UI components.
- **API Design**: Secure API endpoints for subscription management, usage tracking, authentication, and password reset functionality, with middleware enforcing access controls and usage limits.

## External Dependencies
- Firebase (Authentication, Real-time Database)
- OpenAI
- Stripe
- PostgreSQL
- Drizzle ORM
- React.js
- TypeScript
- Tailwind CSS
- Wouter
- TanStack Query
- Express.js
- react-hook-form
- shadcn/ui
- Zod
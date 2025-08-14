# Legal Document & Permit Management Platform

## Overview
An advanced AI-powered legal document and permit management platform with intelligent authentication strategies, focusing on robust user registration and secure access controls. The platform aims to streamline legal document and permit management processes, offering various subscription plans tailored to different user needs, from free basic access to unlimited premium features.

## User Preferences
- Respuestas técnicas y detalladas cuando se requiera análisis
- Documentación clara de cambios de arquitectura
- Logging detallado para debugging
- Seguir patrones de Express.js y middleware
- Usar TypeScript estricto
- Implementar validación robusta en todos los endpoints
- Priorizar seguridad sobre conveniencia
- **CRÍTICO**: Eliminar completamente errores "fastidiosos" de autocompletado y unhandled rejections
- Console logs limpios sin spam de errores de conectividad

## System Architecture

### Frontend
- React.js with TypeScript
- Tailwind CSS for responsive design
- Firebase authentication
- Wouter for routing
- TanStack Query for data fetching

### Backend
- Express.js server
- Firebase Admin SDK
- PostgreSQL database with Drizzle ORM
- OpenAI integration for document generation
- Stripe for payment processing

### **URL Generation & Deployment Security**
- **Dynamic URL Builder** (`server/utils/url-builder.ts`): Centralized utility for environment-agnostic URL generation
- **Universal Hosting Compatibility**: Automatic detection of protocol/host works with any hosting provider (Replit, Vercel, Railway, custom domains)
- **Production-Ready Links**: All critical systems (password reset, legal defense signing, contractor verification) use dynamic URLs that adapt to deployment environment
- **Security Features**: Automatic HTTPS in production, environment detection, no hardcoded dependencies

### Core Features & Design Patterns
- **User Authentication & Authorization**: Enhanced OAuth, email/password authentication, and a robust subscription-based permission system with defined user roles (`primo_chambeador`, `mero_patron`, `master_contractor`, `trial_master`). Features include secure registration (defaulting to free plan), automatic subscription degradation, and real-time usage limit enforcement via middleware (`requireSubscriptionLevel`, `trackAndValidateUsage`, `requirePremiumFeature`).
- **Login Persistence**: A 30-day persistent login system utilizing device fingerprinting for enhanced security and user experience. It includes automatic session validation and cleanup.
- **Biometric Authentication**: Integration of WebAuthn API for biometric logins (Face ID, Touch ID, Windows Hello, fingerprint) with intelligent device detection, secure credential management, and backend validation. This system enhances security by combining device and biometric factors without storing passwords.
- **Password Reset System**: Secure email-based password reset functionality using Resend service with database-stored tokens, 15-minute expiration, single-use validation, and professional HTML email templates. Features enhanced security that rejects reset attempts for non-registered users with explicit support contact instructions (mervin@owlfenc.com). System successfully sends emails via Resend and validates tokens, with Firebase Admin Auth integration for actual password updates.
- **Clean Error Handling**: **COMPLETELY SOLVED (Aug 14, 2025)** - Eliminated ALL "Failed to fetch" and unhandled rejection errors from Mapbox address autocomplete. Ultra-aggressive silencing strategy: `fetchWithErrorSupression` wrapper, 3s timeout, 1000ms debounce, Promise.resolve() protection, and global error handlers that silence ALL autocomplete network errors without any logs. User confirmed the "maldito problema" is resolved.
- **Dynamic Form Validation**: Client-side validation using Zod schema for forms, integrated with UI components.
- **API Design**: Secure API endpoints for subscription management, usage tracking, authentication processes, and password reset functionality, with middleware enforcing access controls and usage limits. Critical endpoints are protected, and a workaround for Vite middleware routing issues has been implemented to ensure API accessibility.

## External Dependencies
- Firebase (Authentication, Real-time Database)
- OpenAI (for document generation)
- Stripe (for payment processing)
- PostgreSQL (Database)
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
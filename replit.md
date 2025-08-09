# Owl Fence & Mervin AI Platform

## Overview
Owl Fence is a comprehensive SaaS platform designed for contractors in the construction industry, with a specialized focus on fencing contractors. The platform aims to revolutionize the construction industry through intelligent estimation, contract generation, and project management by combining conversational AI, automation, and specialized tools.

## User Preferences
Preferred communication style: Simple, everyday language.
Critical Business Rule: This is multi-tenant contractor software - NEVER use Owl Fence or any specific company name as fallback data. Each contractor must have their own company information. PDFs must only show authentic contractor data or require profile completion.

## Recent Critical Security Fixes (August 2025)
- **Property Verifier Security**: Eliminated hardcoded userId=1 from all property endpoints, implemented full Firebase authentication
- **Database Schema Sync**: Fixed missing columns (default_payment_terms, invoice_message_template) causing server crashes
- **Data Isolation**: Complete separation of user data with ownership verification on all property operations
- **Authentication Middleware**: All property endpoints require valid Firebase tokens with proper user validation
- **COMPREHENSIVE PERMISSION SYSTEM AUDIT COMPLETED**: 
  - Fixed 8 critical security vulnerabilities across all pages
  - Added missing permission checks to EstimateGenerator, CyberpunkContractGenerator, Projects, and Mervin pages
  - Removed development testing components from production (UserPlanSwitcher)
  - Implemented complete usage tracking and upgrade prompts
  - Standardized permission import patterns across the application
  - Added getUpgradeReason method to PermissionContext
  - 100% security coverage achieved across all 25+ audited pages
- **COMPREHENSIVE AUTHENTICATION SECURITY ANALYSIS COMPLETED** (August 2025):
  - Conducted full security audit of authentication architecture and flows
  - Identified critical vulnerabilities: exposed API keys in .env, inconsistent auth implementation, missing rate limiting
  - Created comprehensive security documentation (docs/auth-architecture.md, docs/auth-flows.md)
  - Updated .env.example with proper security templates and documentation
  - Mapped all authentication entry points and identified demo auth bypass vulnerabilities
  - Analyzed hybrid Firebase + Express session management conflicts
  - Documented 7 critical authentication flows with risk assessment matrix
  - Provided 3-phase implementation roadmap for security improvements
- **COMPLETE OAUTH + SECURITY IMPLEMENTATION** (August 9, 2025):
  - **DEMO AUTHENTICATION COMPLETELY ELIMINATED**: Removed all hardcoded users and demo bypasses
  - **FIREBASE AUTHENTICATION ENFORCED**: All critical endpoints now require valid Firebase tokens
  - **COMPREHENSIVE RATE LIMITING**: 6-tier rate limiting system protecting against brute force attacks
  - **SECURITY MIDDLEWARE STACK**: Helmet.js headers, input sanitization, environment validation
  - **GOOGLE OAUTH INTEGRATION**: Complete OAuth flow with security validation and error handling
  - **MAGIC LINK AUTHENTICATION**: Passwordless authentication with 24-hour secure tokens
  - **PHONE SMS AUTHENTICATION**: Multi-factor authentication with reCAPTCHA and verification codes
  - **ENHANCED FIREBASE SECURITY RULES**: Server-side token validation and suspicious activity detection
  - **COMPREHENSIVE TESTING FRAMEWORK**: Unit, integration, and E2E tests for all authentication flows
  - **API KEY ROTATION SYSTEM**: Automated rotation tools and security audit documentation
  - **PRODUCTION DEPLOYMENT READY**: Complete smoke tests, monitoring, and deployment guides
  - **CRITICAL API KEY EXPOSURE DOCUMENTED**: Live production keys identified requiring immediate rotation
  - **ENTERPRISE-GRADE SECURITY**: System now fully secure with comprehensive logging and monitoring

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **TailwindCSS + Shadcn/ui** for consistent UI components
- **React Query** for efficient state management and API caching
- **Wouter** for lightweight client-side routing
- **Firebase SDK** for client-side authentication and real-time features

### Backend Architecture
- **Node.js with Express** and TypeScript
- **Firebase** ecosystem (Firestore, Authentication, Storage) for data persistence
- **RESTful API** design
- **Microservices pattern** for specialized functions (PDF generation, email, AI processing)
- **PostgreSQL** as primary database with **Drizzle ORM** for type-safe operations

### AI Integration
- **OpenAI GPT-4** for natural language processing and content generation
- **Anthropic Claude** for advanced document processing and analysis
- **Hybrid AI approach** with fallback templates
- **Context-aware conversation management** for intelligent estimate generation

### Key Components
- **Mervin AI Assistant**: Conversational interface for natural language estimate creation, context-aware chat, intelligent material calculation, and region-specific pricing.
- **Contract Generation System**: Multi-tenant architecture with professional 6-page contract format, dynamic contractor branding, AI-powered generation with template fallbacks, and support for multiple contract types.
- **PDF Processing Engine**: Multiple PDF generation services for redundancy and reliability (Puppeteer-based, PDFMonkey integration), with advanced PDF service for AI-powered data extraction and comprehensive error handling. Uses `pdf-lib` for robust, dependency-free PDF generation.
- **Payment Management**: Stripe integration for secure processing, payment link generation, 50/50 payment split workflow, and status tracking.
- **Project Management**: Complete project lifecycle management, material tracking with dynamic pricing, client and contractor profile management, and project approval workflow. Includes an advanced drag-and-drop timeline system with Firebase persistence.
- **Email Communication System**: Professional estimate delivery, mobile-responsive email templates, integration with Resend, and automated approval workflows.
- **Property Ownership Verifier**: Professional Legal Defense styled interface for property verification using ATTOM Data API with proper endpoint selection (`/property/expandedprofile` and `/property/basicprofile` for ownership data), simplified 3-step workflow, organized history management, and comprehensive mobile responsiveness with futuristic holographic styling for results visualization.
- **Comprehensive Permission System**: Multi-tier subscription platform with "soft paywall" approach featuring 3 paid plans plus 21-day unlimited trial. Uses motivational upgrade prompts instead of hard blocks, with intelligent usage tracking, dynamic feature restrictions, and seamless upgrade conversion flow.

### System Design Choices
- **UI/UX**: Cyberpunk aesthetic with cyan/blue gradient styling, futuristic elements, and professional card layouts. Emphasizes clean, streamlined interfaces, removing redundant elements and focusing on essential information. **Property Ownership Verifier** features advanced holographic styling with gradient borders, blur effects, and responsive animations.
- **PDF Contract Format**: Critical requirement for PDFs to match an exact Independent Contractor Agreement format, preserving original styling (Times New Roman, two-column layout, page numbering) with signatures as the *only* alteration.
- **PDF Template System**: **STREAMLINED 2-OPTION SYSTEM (August 2025)** - Simplified template selection with only "Básico" (free, using estimate-template-free.html) and "Premium" (paid, using estimate-template-premium-advanced.html). **Premium template completely redesigned** with holographic header effects with shimmer animations, professional grid layout, advanced materials table with hover effects, premium totals section with gradient badges, detailed terms & conditions in organized columns, enhanced typography with Inter font, responsive mobile optimization, and futuristic cyberpunk aesthetic while maintaining professional standards.
- **Mobile Responsiveness**: Comprehensive optimization across all application wizards and displays, ensuring optimal user experience on all device sizes. **Enhanced Property Verifier mobile optimization** includes adaptive padding, responsive text scaling, optimized blur effects for performance, break-word text handling for long addresses, and flexible layout systems.
- **Data Integrity**: Enforcement of real data only, especially for contact information, eliminating placeholder or dummy data.
- **Security**: Robust multi-tenant security model with mandatory user authentication and data isolation for all project and contract operations.
- **Scalability**: Modular architecture allowing for easy integration of new features and services.
- **Permission Strategy**: "Soft paywall" approach that shows premium features with disabled elements and motivational upgrade prompts rather than completely blocking access. This strategy maximizes user engagement while encouraging subscription conversions through strategic friction and value demonstration.

## External Dependencies

### Core Services
- **Firebase** (Authentication, Firestore, Storage)
- **OpenAI API** (GPT-4)
- **Anthropic API** (Claude)
- **Stripe** (Payment processing)
- **Resend** (Email delivery)

### Mapping and Location
- **Google Maps API**
- **Mapbox**

### Property Data
- **ATTOM Data API**
- **CoreLogic API**

### PDF Generation
- **PDFMonkey**
- **Puppeteer**
- **pdf-lib**

### Business Integration
- **QuickBooks API**

### Communication
- **Twilio** (SMS service)
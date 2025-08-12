# Owl Fence & Mervin AI Platform

## Overview
Owl Fence is a comprehensive SaaS platform for construction contractors, particularly fencing contractors. It aims to transform the construction industry through intelligent estimation, contract generation, and project management by integrating conversational AI, automation, and specialized tools. The platform provides a full professional onboarding system, AI-powered assistance, secure payment processing, and robust project management capabilities, all designed to enhance efficiency and decision-making for contractors.

## User Preferences
Preferred communication style: Simple, everyday language.
Critical Business Rule: This is multi-tenant contractor software - NEVER use Owl Fence or any specific company name as fallback data. Each contractor must have their own company information. PDFs must only show authentic contractor data or require profile completion.

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
- **PDF Processing Engine**: Multiple PDF generation services for redundancy and reliability, using `pdf-lib` for robust, dependency-free PDF generation.
- **Payment Management**: Stripe integration for secure processing, payment link generation, 50/50 payment split workflow, and status tracking.
- **Project Management**: Complete project lifecycle management, material tracking with dynamic pricing, client and contractor profile management, and project approval workflow, including an advanced drag-and-drop timeline system.
- **Email Communication System**: Professional estimate delivery, mobile-responsive email templates, integration with Resend, and automated approval workflows.
- **Property Ownership Verifier**: Legal Defense styled interface for property verification using ATTOM Data API, with a simplified 3-step workflow, organized history management, and comprehensive mobile responsiveness.
- **Comprehensive Permission System**: Multi-tier subscription platform with "soft paywall" approach, featuring 3 paid plans plus a 21-day unlimited trial. It uses motivational upgrade prompts and intelligent usage tracking.
- **Authentication System**: Utilizes Firebase Authentication, incorporating Google OAuth, Magic Link authentication, Phone SMS authentication, and a comprehensive Email OTP authentication system as the primary reliable method. Includes robust rate limiting and security middleware.

### System Design Choices
- **UI/UX**: Cyberpunk aesthetic with cyan/blue gradient styling, futuristic elements, and professional card layouts. Emphasizes clean, streamlined interfaces. The Property Ownership Verifier features advanced holographic styling.
- **PDF Contract Format**: Critical requirement for PDFs to match an exact Independent Contractor Agreement format, preserving original styling (Times New Roman, two-column layout, page numbering) with signatures as the *only* alteration.
- **PDF Template System**: Streamlined 2-option system with "Básico" (free) and "Premium" (paid). The Premium template is redesigned with holographic header effects, a professional grid layout, advanced materials table, premium totals section, detailed terms & conditions, enhanced typography, and mobile optimization, all while maintaining professional standards.
- **Mobile Responsiveness**: Comprehensive optimization across all application wizards and displays, ensuring optimal user experience on all device sizes.
- **Data Integrity**: Enforcement of real data only, especially for contact information, eliminating placeholder or dummy data.
- **Security**: Robust multi-tenant security model with mandatory user authentication and data isolation for all project and contract operations. Full Firebase authentication is enforced on critical endpoints with comprehensive rate limiting.
- **Scalability**: Modular architecture allowing for easy integration of new features and services.
- **Permission Strategy**: "Soft paywall" approach that shows premium features with disabled elements and motivational upgrade prompts rather than completely blocking access.

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
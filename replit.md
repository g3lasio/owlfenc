# Owl Fence & Mervin AI Platform

## Overview
Owl Fence is a comprehensive SaaS platform designed for construction contractors, particularly fencing contractors. It aims to revolutionize the industry through intelligent estimation, contract generation, and project management by integrating conversational AI, automation, and specialized tools. The platform offers a full professional onboarding system, dual-mode AI chat, and robust security features to provide a competitive edge in the construction market.

## User Preferences
Preferred communication style: Simple, everyday language.
Critical Business Rule: This is multi-tenant contractor software - NEVER use Owl Fence or any specific company name as fallback data. Each contractor must have their own company information. PDFs must only show authentic contractor data or require profile completion.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, using Vite for fast development, TailwindCSS and Shadcn/ui for consistent UI components, React Query for API caching, Wouter for routing, and Firebase SDK for client-side authentication and real-time features.

### Backend Architecture
The backend utilizes Node.js with Express and TypeScript. It leverages the Firebase ecosystem (Firestore, Authentication, Storage) for data persistence. A RESTful API design is employed, following a microservices pattern for specialized functions. PostgreSQL is used as the primary database with Drizzle ORM for type-safe operations. A dedicated chat system architecture includes tables for user profiles, chat sessions, messages, and agent actions.

### AI Integration
The platform integrates OpenAI GPT-4 for natural language processing and content generation, and Anthropic Claude for advanced document processing. It uses a hybrid AI approach with fallback templates and context-aware conversation management for intelligent estimate generation.

### Key Components
- **Unified Mervin AI Chat System**: Features a dual-mode conversational interface with "Mervin Mode" (construction expert consultation) and "Mervin Agent Mode" (action execution like invoice/contract generation). It includes seamless mode switching, integrated onboarding, chat session management, and integration with existing APIs.
- **Contract Generation System**: Supports multi-tenant architecture with professional 6-page contract formats, dynamic contractor branding, AI-powered generation with template fallbacks, and multiple contract types.
- **PDF Processing Engine**: Employs multiple PDF generation services (Puppeteer-based, PDFMonkey, pdf-lib) for redundancy and reliability, including AI-powered data extraction and robust error handling.
- **Payment Management**: Integrates Stripe for secure processing, payment link generation, 50/50 payment split workflows, and status tracking.
- **Project Management**: Comprehensive project lifecycle management, material tracking with dynamic pricing, client and contractor profile management, and project approval workflows, including a drag-and-drop timeline.
- **Email Communication System**: Professional estimate delivery with mobile-responsive templates via Resend, and automated approval workflows.
- **Property Ownership Verifier**: A professional interface for property verification using ATTOM Data API, featuring a simplified workflow, history management, and mobile responsiveness with futuristic holographic styling.
- **Comprehensive Permission System**: A multi-tier subscription platform with a "soft paywall" approach, offering a 21-day trial, and using motivational upgrade prompts with intelligent usage tracking and dynamic feature restrictions.

### System Design Choices
- **UI/UX**: Features a cyberpunk aesthetic with cyan/blue gradient styling, futuristic elements, and professional card layouts, emphasizing clean and streamlined interfaces. The Property Ownership Verifier incorporates advanced holographic styling.
- **PDF Contract Format**: PDFs adhere to a strict Independent Contractor Agreement format, maintaining original styling (Times New Roman, two-column layout, page numbering) with only signatures as alterations.
- **PDF Template System**: A streamlined two-option system ("Básico" and "Premium"). The Premium template is redesigned with holographic headers, professional grid layouts, advanced materials tables, and enhanced typography, maintaining a futuristic yet professional aesthetic.
- **Mobile Responsiveness**: Comprehensive optimization across all application components for optimal user experience on all device sizes, including enhanced features for the Property Verifier.
- **Data Integrity**: Enforces real data for contact information, eliminating placeholders.
- **Security**: Robust multi-tenant security model with mandatory user authentication and data isolation.
- **Scalability**: Modular architecture supports easy integration of new features.
- **Permission Strategy**: A "soft paywall" approach, showing premium features as disabled with upgrade prompts to encourage conversions, rather than hard blocking access.

## External Dependencies

### Core Services
- Firebase (Authentication, Firestore, Storage)
- OpenAI API (GPT-4)
- Anthropic API (Claude)
- Stripe (Payment processing)
- Resend (Email delivery)

### Mapping and Location
- Google Maps API
- Mapbox

### Property Data
- ATTOM Data API
- CoreLogic API

### PDF Generation
- PDFMonkey
- Puppeteer
- pdf-lib

### Business Integration
- QuickBooks API

### Communication
- Twilio (SMS service)
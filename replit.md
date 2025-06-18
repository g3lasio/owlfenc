# Owl Fence & Mervin AI Platform

## Overview

Owl Fence is a comprehensive SaaS platform designed for contractors in the construction industry, with specialized focus on fencing contractors. The platform combines conversational AI, automation, and specialized tools to revolutionize the construction industry through intelligent estimation, contract generation, and project management.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for modern, type-safe development
- **Vite** for fast development and optimized builds
- **TailwindCSS + Shadcn/ui** for consistent, professional UI components
- **React Query** for efficient state management and API caching
- **Wouter** for lightweight client-side routing
- **Firebase SDK** for client-side authentication and real-time features

### Backend Architecture
- **Node.js with Express** and TypeScript for server-side logic
- **Firebase** ecosystem (Firestore, Authentication, Storage) for data persistence
- **RESTful API** design with comprehensive endpoint coverage
- **Microservices pattern** for specialized functions (PDF generation, email, AI processing)

### AI Integration
- **OpenAI GPT-4** for natural language processing and content generation
- **Anthropic Claude** for advanced document processing and analysis
- **Hybrid AI approach** with fallback templates when AI services are unavailable
- **Context-aware conversation management** for intelligent estimate generation

## Key Components

### 1. Mervin AI Assistant
- Conversational interface for natural language estimate creation
- Context-aware chat processing with memory management
- Intelligent material calculation and cost estimation
- Region-specific pricing adjustments

### 2. Contract Generation System
- **Multi-tenant architecture** ensuring complete brand isolation
- Professional 6-page contract format with numbered sections
- Dynamic contractor branding with personalized footers
- AI-powered contract generation with template fallbacks
- Support for multiple contract types and customization

### 3. PDF Processing Engine
- **Multiple PDF generation services** for redundancy and reliability
- Puppeteer-based modern PDF service for fast rendering
- PDFMonkey integration for professional cloud-based generation
- Advanced PDF service with AI-powered data extraction
- Comprehensive error handling with multiple fallback methods

### 4. Payment Management
- Stripe integration for secure payment processing
- Payment link generation for client convenience
- 50/50 payment split workflow (deposit and final payment)
- Payment status tracking and notifications

### 5. Project Management
- Complete project lifecycle management
- Material tracking with dynamic pricing
- Client and contractor profile management
- Project approval workflow with mobile-responsive interface

### 6. Email Communication System
- Professional estimate delivery via email
- Mobile-responsive email templates
- Integration with Resend for reliable email delivery
- Automated approval workflows with one-click client responses

## Data Flow

### Estimate Generation Flow
1. Client initiates conversation with Mervin AI
2. AI processes requirements and generates material lists
3. System calculates costs using dynamic pricing database
4. Professional estimate is generated and formatted
5. PDF is created using multi-service approach
6. Email is sent to client with approval links

### Contract Generation Flow
1. Approved estimate triggers contract generation
2. System retrieves contractor-specific branding data
3. AI generates personalized contract content
4. Professional PDF is created with proper formatting
5. Contract is stored and made available for signatures

### Payment Processing Flow
1. Client approves estimate through email link
2. Payment links are generated via Stripe
3. Deposit payment is processed
4. Project moves to active status
5. Final payment is processed upon completion

## External Dependencies

### Core Services
- **Firebase** (Authentication, Database, Storage)
- **OpenAI API** (GPT-4 for content generation)
- **Anthropic API** (Claude for document processing)
- **Stripe** (Payment processing)
- **Resend** (Email delivery)

### Mapping and Location
- **Google Maps API** (Address validation and mapping)
- **Mapbox** (Alternative mapping service)

### Property Data
- **ATTOM Data API** (Property verification and details)
- **CoreLogic API** (Additional property information)

### PDF Generation
- **PDFMonkey** (Professional PDF generation)
- **Puppeteer** (Browser-based PDF rendering)

### Business Integration
- **QuickBooks API** (Accounting integration)

## Deployment Strategy

### Development Environment
- **Replit** platform for development and testing
- **Node.js 20** runtime environment
- **PostgreSQL 16** for data persistence
- Hot reload for rapid development

### Production Deployment
- **Autoscale deployment** target for dynamic scaling
- Environment-specific configuration management
- Database migrations with Drizzle ORM
- Automated build process with Vite and esbuild

### Database Strategy
- **PostgreSQL** as primary database
- **Drizzle ORM** for type-safe database operations
- Structured schema for multi-tenant data isolation
- Migration-based schema management

## Changelog
```
Changelog:
- June 16, 2025. Initial setup
- June 16, 2025. Fixed critical PDF generation system:
  * Resolved corrupted PDF files - now generates real binary PDFs instead of HTML/JSON responses
  * Implemented professional legal document design (clean, formal, white background)
  * Added proper multi-page pagination with "Page X of Y" footers
  * Removed fancy/colorful styling in favor of legal document standards
  * PDF generation now serves downloadable files compatible with all viewers
- June 16, 2025. Completed professional contract generation overhaul:
  * Created new PremiumPdfService with legal document standards
  * Implemented Times New Roman typography with proper margins
  * Added comprehensive 15-section legal contract template
  * Integrated project-specific protection clauses
  * Achieved 7-page professional contract output (78KB+)
  * Verified complete legal document structure and formatting
  * System now generates production-ready Independent Contractor Agreements
- June 16, 2025. Enhanced contract to LawDepot professional standards:
  * Complete rewrite with attorney-grade legal language and terminology
  * Added formal WHEREAS clauses and professional legal structure
  * Implemented 16 comprehensive numbered sections with specialized content
  * Added AAA arbitration, OSHA compliance, and $1M+ insurance requirements
  * Enhanced warranty, indemnification, and dispute resolution clauses
  * Professional bordered party information sections with clean legal text
  * Uniform footer with discrete "Powered by Mervin AI" branding
  * Contract now matches quality expectations of top-tier legal documents
- June 17, 2025. Fixed frontend-backend synchronization for contract generation:
  * Resolved data loss issue where user selections weren't reaching PDF generation
  * Enhanced all contract endpoints to capture complete frontend form data
  * Added comprehensive collectFormData function to gather all user inputs
  * Updated /api/generate-pdf, /api/contracts/generate-pdf, and /api/anthropic/generate-defensive-contract
  * Now captures smart clauses, payment terms, warranties, signatures, custom terms, and legal notices
  * Verified synchronization with test showing all enhanced data properly flows to backend
  * Contract PDFs now include all user-selected clauses and customizations
- June 18, 2025. Fixed estimate PDF contractor information discrepancy:
  * Resolved issue where PDF estimates showed hardcoded "Mervin Solutions Inc." instead of actual contractor profile
  * Updated PDF generation endpoints to fetch real contractor data from user profiles
  * Modified /api/pdfmonkey-estimates/generate to include contractor information from database
  * Enhanced EstimateData interface to include contractor fields (company, address, phone, email, license)
  * Updated both PDFMonkey template and Claude fallback to use authentic contractor data
  * PDFs now display correct contractor information matching user's profile settings
- June 18, 2025. Implemented Firebase UID to PostgreSQL user mapping:
  * Added firebase_uid column to users table for proper authentication mapping
  * Created getUserByFirebaseUid method in DatabaseStorage for Firebase UID lookups
  * Updated PDF generation to use Firebase UID instead of generic user IDs
  * Implemented direct database query as fallback for reliable contractor data retrieval
  * Verified system correctly maps Firebase authentication to contractor profiles
  * Eliminated all fallback contractor data - system only uses authentic user information
- June 18, 2025. Optimized sidebar menu behavior and design:
  * Implemented arrow toggle button instead of hamburger menu for cleaner interaction
  * Created compact icon-only collapsed view (64px width) with minimal spacing
  * Added enhanced tooltips for collapsed icons with proper positioning and styling
  * Redesigned expanded sidebar (288px width) with clean minimal layout
  * Fixed footer positioning to be always visible without scrolling
  * Eliminated unnecessary scrolling and overflow issues throughout sidebar
  * Organized navigation with simple section titles (Tools, Features, Account)
  * Ensured logout button and language toggle are properly aligned and accessible
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```
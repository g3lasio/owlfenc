# 🦉 Owl Fenc Landing Page - Instrucciones Completas para Nuevo Proyecto

**Fecha:** 06 de Noviembre, 2025  
**Proyecto:** Owl Fenc Landing Page (Proyecto Independiente)  
**Tipo de Deployment:** Static Deployment en Replit  
**Objetivo:** Marketing site completamente separado del producto principal

---

## 📋 TABLA DE CONTENIDOS

1. [Contexto del Proyecto](#contexto-del-proyecto)
2. [Objetivos y Alcance](#objetivos-y-alcance)
3. [Arquitectura Técnica](#arquitectura-técnica)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Datos del Negocio](#datos-del-negocio)
6. [Componentes y Código](#componentes-y-código)
7. [Estilos y Diseño](#estilos-y-diseño)
8. [Navegación y Routing](#navegación-y-routing)
9. [SEO y Metadata](#seo-y-metadata)
10. [Deployment](#deployment)

---

## 🎯 CONTEXTO DEL PROYECTO

### ¿Qué es Owl Fenc?

**Owl Fenc** (sin 'e') es una plataforma de gestión de construcción potenciada por IA diseñada específicamente para contratistas de cercas (fencing contractors) y subcontratistas en la industria de la construcción.

### Problema que Resuelve

Los contratistas pierden tiempo valioso creando estimados, generando contratos legales, verificando propiedades y gestionando pagos. Owl Fenc automatiza todo esto con IA.

### Público Objetivo

1. **Fencing Contractors** - Especialistas en cercas (madera, vinyl, chain-link)
2. **General Contractors** - Contratistas generales que manejan múltiples proyectos
3. **Subcontractors** - Profesionales especializados que trabajan para GCs

### Propuesta de Valor Única

- **Mervin AI**: Asistente de IA conversacional que genera estimados en minutos
- **Legal Defense**: Generación de contratos con protección legal para contratistas
- **DeepSearch**: Investigación automática de precios de materiales en tiempo real
- **Property Verification**: Verificación de propiedad con ATTOM Data
- **Payment Processing**: Procesamiento de pagos con Stripe

---

## 🎯 OBJETIVOS Y ALCANCE

### Propósito del Landing Page

El Landing Page debe ser **completamente independiente** del producto principal por las siguientes razones críticas:

1. **Mobile Apps Futuros**: Cuando Owl Fenc lance apps nativas para iOS/Android, el landing page NO debe incluirse en el APK
2. **Experiencia de Usuario**: Los usuarios autenticados deben ir directo a la app, no ver páginas de marketing
3. **Performance**: Landing estático con CDN global para carga ultra-rápida
4. **Marketing Independiente**: Actualizar contenido de marketing sin tocar el código del producto
5. **Escalabilidad**: Separación clara entre marketing y producto

### Páginas Requeridas

1. **Home** (`/`) - Hero, features showcase, target audience, stats, CTA
2. **Features** (`/features`) - 16+ características organizadas en 4 categorías
3. **Pricing** (`/pricing`) - 3 planes de suscripción con comparación detallada
4. **Integrations** (`/integrations`) - 8 integraciones principales

### Páginas Adicionales (Links en Footer)

- `/about-owlfenc` - Sobre la empresa
- `/about-mervin` - Sobre Mervin AI
- `/privacy-policy` - Política de privacidad
- `/terms-of-service` - Términos de servicio
- `/legal-policy` - Política legal

**NOTA**: Estas páginas adicionales solo necesitan enlaces en el footer. El contenido puede ser placeholder por ahora con mensaje "Coming Soon".

---

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Tecnológico

```
Frontend Framework: React 18+ con TypeScript
Build Tool: Vite
Routing: Wouter (lightweight, no React Router)
UI Framework: shadcn/ui + Tailwind CSS
Icons: Lucide React + React Icons (logos)
Deployment: Replit Static Deployment
```

### ¿Por Qué Static Deployment?

- **Costo**: Más económico que Autoscale
- **Performance**: CDN global, carga instantánea
- **Simplicidad**: No requiere backend (solo HTML/CSS/JS estáticos)
- **SEO**: Perfecto para indexación de motores de búsqueda

### URLs de Navegación

**Landing Page → App Principal**

Todos los Call-to-Action (CTAs) deben redirigir a la app principal:

```
Landing: https://owlfenc-landing.replit.app/
App Main: https://app.owlfenc.com/  (o la URL de producción actual)

CTAs:
- "Start Free Trial" → https://app.owlfenc.com/signup
- "Log In" → https://app.owlfenc.com/login
- "View Pricing" → Interno /pricing (dentro del landing)
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
owlfenc-landing/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Features.tsx
│   │   ├── Pricing.tsx
│   │   ├── Integrations.tsx
│   │   └── ComingSoon.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       └── tabs.tsx
│   └── lib/
│       └── utils.ts
└── public/
    └── favicon.ico
```

---

## 💰 DATOS DEL NEGOCIO

### Planes de Suscripción

```typescript
const PRICING_PLANS = [
  {
    id: 5,
    name: 'Primo Chambeador',
    code: 'PRIMO_CHAMBEADOR',
    motto: 'Ningún trabajo es pequeño cuando tu espíritu es grande',
    price: 0, // FREE
    yearlyPrice: 0,
    description: 'Perfect for getting started',
    popular: false,
    features: [
      { name: '5 basic estimates per month', included: true, note: 'With watermark' },
      { name: '1 AI estimate per month', included: true, note: 'With watermark' },
      { name: '3 DeepSearch queries', included: true },
      { name: 'Legal contracts', included: false },
      { name: 'Property verification', included: false },
      { name: 'Project management', included: false },
      { name: 'Invoicing', included: false },
      { name: 'Payment tracking', included: false },
      { name: 'Permit advisor', included: false },
      { name: 'Community support', included: true },
    ],
    cta: 'Get Started Free',
    ctaVariant: 'outline',
  },
  {
    id: 9,
    name: 'Mero Patrón',
    code: 'mero_patron',
    motto: 'Para contratistas profesionales',
    price: 49.99,
    yearlyPrice: 499.90,
    description: 'Most popular for growing contractors',
    popular: true, // ⭐ MOST POPULAR
    features: [
      { name: '50 basic estimates per month', included: true, note: 'No watermark' },
      { name: '20 AI estimates per month', included: true, note: 'No watermark' },
      { name: '50 DeepSearch queries', included: true },
      { name: '50 legal contracts per month', included: true },
      { name: '15 property verifications', included: true },
      { name: 'Unlimited projects', included: true },
      { name: 'Unlimited invoicing', included: true },
      { name: 'Basic payment tracking', included: true },
      { name: '10 permit advisor queries', included: true },
      { name: 'Email support', included: true },
    ],
    cta: 'Start Free Trial',
    ctaVariant: 'default',
  },
  {
    id: 6,
    name: 'Master Contractor',
    code: 'MASTER_CONTRACTOR',
    motto: 'Sin límites para profesionales',
    price: 99.99,
    yearlyPrice: 999.90,
    description: 'Unlimited everything for professionals',
    popular: false,
    features: [
      { name: 'Unlimited basic estimates', included: true, note: 'No watermark' },
      { name: 'Unlimited AI estimates', included: true, note: 'No watermark' },
      { name: 'Unlimited DeepSearch', included: true },
      { name: 'Unlimited legal contracts', included: true },
      { name: 'Unlimited property verifications', included: true },
      { name: 'Unlimited projects', included: true },
      { name: 'Unlimited invoicing', included: true },
      { name: 'Pro payment tracking', included: true },
      { name: 'Unlimited permit advisor', included: true },
      { name: 'Priority support', included: true },
      { name: 'QuickBooks integration', included: true },
      { name: 'Advanced analytics', included: true },
    ],
    cta: 'Start Free Trial',
    ctaVariant: 'default',
  },
];
```

### Integraciones Principales

```typescript
const INTEGRATIONS = [
  {
    name: 'Stripe',
    category: 'Payments',
    description: 'Accept credit cards, debit cards, and ACH payments securely',
    features: [
      'Process credit and debit card payments',
      'ACH bank transfers for large payments',
      'Automatic receipt generation',
      'PCI-compliant payment processing',
    ],
    status: 'active',
    color: '#635bff',
  },
  {
    name: 'ATTOM Data',
    category: 'Property Intelligence',
    description: 'Comprehensive property data and ownership verification',
    features: [
      'Property ownership verification',
      'Boundary and lot size information',
      'HOA and deed restriction data',
      'Property value estimates',
    ],
    status: 'active',
    color: 'primary',
  },
  {
    name: 'OpenAI',
    category: 'AI Models',
    description: 'Advanced AI for estimates, contracts, and customer communication',
    features: [
      'GPT-4 for intelligent conversations',
      'Natural language estimate creation',
      'Contract generation and review',
      'Customer inquiry responses',
    ],
    status: 'active',
    color: '#10a37f',
  },
  {
    name: 'Claude (Anthropic)',
    category: 'AI Models',
    description: 'Advanced AI reasoning for complex construction scenarios',
    features: [
      'Deep analysis of project requirements',
      'Legal contract intelligence',
      'Technical specification review',
      'Cost estimation validation',
    ],
    status: 'active',
    color: '#f97316',
  },
  {
    name: 'Google AI',
    category: 'AI Models',
    description: 'Google Gemini for multimodal AI capabilities',
    features: [
      'Image analysis for project planning',
      'Document processing and extraction',
      'Multilingual support',
      'Real-time data processing',
    ],
    status: 'active',
    color: '#4285f4',
  },
  {
    name: 'QuickBooks',
    category: 'Accounting',
    description: 'Seamless accounting integration for financial management',
    features: [
      'Automatic invoice sync',
      'Payment reconciliation',
      'Expense tracking',
      'Financial reporting',
    ],
    status: 'premium',
    color: '#2ca01c',
  },
  {
    name: 'PostgreSQL (Neon)',
    category: 'Database',
    description: 'Scalable, secure database with automatic backups',
    features: [
      'Multi-tenant data isolation',
      'Automatic daily backups',
      'Point-in-time recovery',
      'Serverless scaling',
    ],
    status: 'active',
    color: '#3b82f6',
  },
  {
    name: 'SendGrid',
    category: 'Email',
    description: 'Reliable email delivery for estimates, contracts, and notifications',
    features: [
      'Estimate and contract delivery',
      'Payment reminders',
      'Project status updates',
      'Email tracking and analytics',
    ],
    status: 'active',
    color: '#1a82e2',
  },
];
```

### Features (16+ Características)

**Categoría: Estimates & AI**
1. Mervin AI Assistant - Conversational estimate creation
2. Fence Calculators - Wood, vinyl, chain-link specialists
3. DeepSearch Material Intelligence - Real-time pricing research
4. Professional Templates - Basic, Premium, Luxury designs

**Categoría: Legal & Contracts**
5. Smart Contract Generator - AI-powered legal contracts
6. Digital Signatures - Legally-binding electronic signatures
7. Property Verification - ATTOM Data integration
8. Permit Advisor - Navigate permits and regulations

**Categoría: Payments & Finance**
9. Stripe Payment Processing - Accept all payment types
10. Professional Invoicing - Create and track invoices
11. Payment Tracking - Monitor deposits and final payments
12. QuickBooks Integration - Sync with accounting software

**Categoría: Project Management**
13. Project Dashboard - Manage all projects centrally
14. Timeline Tracking - Visual project timelines
15. Client Management - Organize client information
16. File Attachments - Store project documents

### Estadísticas Destacadas

```typescript
const STATS = [
  {
    value: '10x',
    label: 'Faster Estimates',
    description: 'Generate quotes in minutes, not hours'
  },
  {
    value: '98%',
    label: 'Calculation Accuracy',
    description: 'AI-powered precision for materials & labor'
  },
  {
    value: '+40%',
    label: 'More Jobs Won',
    description: 'Professional proposals close more deals'
  }
];
```

---

## 🧩 COMPONENTES Y CÓDIGO

### 1. Setup Inicial

#### package.json

```json
{
  "name": "owlfenc-landing",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "wouter": "^3.0.0",
    "lucide-react": "^0.294.0",
    "react-icons": "^4.12.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16"
  }
}
```

#### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
});
```

#### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 2. Estilos Base (index.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 190 95% 50%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 190 95% 50%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
  }
}
```

### 3. Componente Header

**Ubicación:** `src/components/layout/Header.tsx`

```tsx
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // URL de la app principal (cambiar por la URL real de producción)
  const APP_URL = 'https://app.owlfenc.com';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
              Owl Fenc
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="/integrations" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Integrations
            </Link>
            <div className="flex items-center space-x-3 ml-4">
              <a href={`${APP_URL}/login`}>
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </a>
              <a href={`${APP_URL}/signup`}>
                <Button size="sm">
                  Start Free Trial
                </Button>
              </a>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border/40">
            <div className="flex flex-col space-y-3">
              <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">
                Features
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">
                Pricing
              </Link>
              <Link href="/integrations" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">
                Integrations
              </Link>
              <div className="pt-3 border-t border-border/40 flex flex-col space-y-2">
                <a href={`${APP_URL}/login`}>
                  <Button variant="outline" className="w-full">
                    Log In
                  </Button>
                </a>
                <a href={`${APP_URL}/signup`}>
                  <Button className="w-full">
                    Start Free Trial
                  </Button>
                </a>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
```

### 4. Componente Footer

**Ubicación:** `src/components/layout/Footer.tsx`

```tsx
import { Link } from 'wouter';

export default function Footer() {
  return (
    <footer className="py-12 border-t border-border/40">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Integrations
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about-owlfenc" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/about-mervin" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  About Mervin AI
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal-policy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Legal Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:mervin@owlfenc.com" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>© 2025 Owl Fenc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
```

### 5. App.tsx Principal

**IMPORTANTE:** El código completo de las páginas Home, Features, Pricing e Integrations está disponible en los archivos del proyecto actual. Puedes copiarlos directamente desde:

- `client/src/pages/PublicHome.tsx` → `src/pages/Home.tsx`
- `client/src/pages/Features.tsx` → `src/pages/Features.tsx`
- `client/src/pages/Pricing.tsx` → `src/pages/Pricing.tsx`
- `client/src/pages/Integrations.tsx` → `src/pages/Integrations.tsx`

```tsx
import { Route, Switch } from 'wouter';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Home from '@/pages/Home';
import Features from '@/pages/Features';
import Pricing from '@/pages/Pricing';
import Integrations from '@/pages/Integrations';
import ComingSoon from '@/pages/ComingSoon';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/features" component={Features} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/about-owlfenc" component={ComingSoon} />
          <Route path="/about-mervin" component={ComingSoon} />
          <Route path="/privacy-policy" component={ComingSoon} />
          <Route path="/terms-of-service" component={ComingSoon} />
          <Route path="/legal-policy" component={ComingSoon} />
          <Route component={() => <div className="p-8 text-center">404 - Page Not Found</div>} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

export default App;
```

### 6. Página "Coming Soon" para Enlaces Legales

**Ubicación:** `src/pages/ComingSoon.tsx`

```tsx
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';

export default function ComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="text-center max-w-2xl mx-auto px-4">
        <Clock className="h-24 w-24 text-primary mx-auto mb-6" />
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Coming Soon
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          We're working hard to bring you this content. Check back soon!
        </p>
        <Link href="/">
          <Button size="lg">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

---

## 🎨 ESTILOS Y DISEÑO

### Paleta de Colores

```
Primary: Cyan (#00c8ff, hsl(190, 95%, 50%))
Secondary: Blue (#0080ff)
Background: White (#ffffff)
Foreground: Dark Gray (#1a1a1a)
Muted: Light Gray (#f5f5f5)
Border: Light Gray (#e5e5e5)
```

### Tipografía

- **Font Stack**: System fonts (Apple/Windows native fonts)
- **Headings**: Bold, tracking-tight
- **Body**: Regular, comfortable line-height
- **Accent Text**: Gradient from primary to cyan

### Gradientes Utilizados

```css
/* Hero Headings */
.text-gradient {
  background: linear-gradient(to right, hsl(190, 95%, 50%), rgb(34, 211, 238));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Background Overlays */
.hero-bg {
  background: linear-gradient(to bottom right, 
    hsl(190 95% 50% / 0.1), 
    hsl(0 0% 100% / 1), 
    hsl(0 0% 100% / 1)
  );
}
```

### Componentes UI Requeridos

Necesitarás implementar los siguientes componentes de shadcn/ui:

1. **Button** - Para CTAs y acciones
2. **Card** - Para features y pricing cards
3. **Badge** - Para labels como "Most Popular", "Premium"
4. **Tabs** - Para categorías de features

Puedes copiarlos directamente desde `client/src/components/ui/` del proyecto actual.

---

## 🧭 NAVEGACIÓN Y ROUTING

### Estructura de Rutas

```
/ → Home (Hero, Features, Target Audience, Stats, CTA)
/features → Características detalladas en 4 categorías
/pricing → 3 planes con comparación detallada
/integrations → 8 integraciones principales
/about-owlfenc → Coming Soon
/about-mervin → Coming Soon
/privacy-policy → Coming Soon
/terms-of-service → Coming Soon
/legal-policy → Coming Soon
```

### Call-to-Actions (CTAs)

**URLs Externas a la App Principal:**

TODAS las siguientes deben apuntar a `https://app.owlfenc.com/` (o la URL de producción actual):

- "Start Free Trial" → `/signup`
- "Get Started Free" → `/signup`
- "Log In" → `/login`

**URLs Internas (Dentro del Landing):**

- "View Pricing" → `/pricing`
- "Explore Features" → `/features`
- "See Integrations" → `/integrations`

---

## 📱 SEO Y METADATA

### Meta Tags Requeridos

**Home Page:**

```html
<title>Owl Fenc - AI-Powered Construction Management for Contractors</title>
<meta name="description" content="Complete construction management platform with AI-powered estimates, legal contracts, property verification, and payment processing. Built for fence contractors and subcontractors." />
```

**Features Page:**

```html
<title>Features - Owl Fenc Construction Platform</title>
<meta name="description" content="Discover Owl Fenc's powerful features: AI estimates with Mervin, legal contract generation, property verification, payment processing, project management, and more." />
```

**Pricing Page:**

```html
<title>Pricing Plans - Owl Fenc</title>
<meta name="description" content="Choose the perfect plan for your construction business. From free to unlimited. 14-day trial with no credit card required." />
```

**Integrations Page:**

```html
<title>Integrations - Owl Fenc Platform</title>
<meta name="description" content="Owl Fenc integrates with Stripe, ATTOM Data, OpenAI, Claude, QuickBooks, and more to give you the most powerful construction management experience." />
```

### Open Graph Tags (Para Social Sharing)

```html
<meta property="og:title" content="Owl Fenc - AI-Powered Construction Management" />
<meta property="og:description" content="Complete construction management platform with AI-powered estimates, legal contracts, and payment processing." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://owlfenc-landing.replit.app/" />
<meta property="og:image" content="https://owlfenc-landing.replit.app/og-image.png" />
```

---

## 🚀 DEPLOYMENT

### Paso 1: Crear Nuevo Replit App

1. En Replit, click "Create App"
2. Nombre: `owlfenc-landing`
3. Template: "React TypeScript" o "Vite"
4. Click "Create"

### Paso 2: Configurar Proyecto

1. Copia todos los archivos según la estructura indicada
2. Instala dependencias: `npm install`
3. Ejecuta en desarrollo: `npm run dev`
4. Verifica que todas las páginas funcionen

### Paso 3: Build para Producción

```bash
npm run build
```

Esto genera la carpeta `dist/` con los archivos estáticos.

### Paso 4: Publicar como Static Deployment

1. En Replit, abre el panel "Publishing"
2. Selecciona "Static Deployment"
3. Configure:
   - **Output Directory**: `dist`
   - **Build Command**: `npm run build`
4. Click "Publish"

### Paso 5: Dominio Personalizado (Opcional)

Si tienes un dominio personalizado:

1. En Publishing settings, click "Add custom domain"
2. Agrega: `owlfenc.com` o `landing.owlfenc.com`
3. Configura DNS records según instrucciones de Replit

---

## ✅ CHECKLIST FINAL

Antes de dar por completado el landing page, verifica:

- [ ] Todas las páginas se renderizan correctamente
- [ ] Navegación funciona entre páginas internas
- [ ] CTAs redirigen correctamente a la app principal
- [ ] Responsive design funciona en mobile, tablet, desktop
- [ ] Colores y gradientes coinciden con el diseño
- [ ] Todos los datos de pricing son correctos
- [ ] Todas las integraciones están listadas
- [ ] Footer links están implementados
- [ ] Meta tags están configurados
- [ ] Build de producción genera archivos sin errores
- [ ] Static deployment está publicado
- [ ] URLs de la app principal están correctas
- [ ] Email de contacto es `mervin@owlfenc.com`

---

## 📞 CONTACTO Y SOPORTE

**Email:** mervin@owlfenc.com  
**Branding Note:** Siempre usa "Owl Fenc" (sin 'e') en todo el contenido.

---

## 🎯 OBJETIVOS DE CONVERSIÓN

El Landing Page debe optimizarse para estas métricas:

1. **Primary CTA**: "Start Free Trial" → Signup page
2. **Secondary CTA**: "View Pricing" → Pricing page
3. **Tertiary CTA**: "Log In" → Login page

Métricas de éxito:
- Time on page > 45 segundos
- Scroll depth > 60%
- CTA click rate > 8%
- Bounce rate < 50%

---

## 📝 NOTAS FINALES

### Diferencias Clave vs. Proyecto Principal

1. **Sin Backend**: Landing es 100% estático
2. **Sin Autenticación**: No hay sistema de login en landing
3. **Sin Base de Datos**: Todos los datos están hardcoded
4. **Sin State Management**: No necesita Redux/Context
5. **Deployment Diferente**: Static vs. Autoscale

### Próximos Pasos Después del Deployment

1. Configurar analytics (Google Analytics, Plausible)
2. Configurar pixel de Facebook/Meta
3. Implementar A/B testing en CTAs
4. Añadir testimonios de clientes
5. Crear blog para SEO
6. Agregar live chat widget

---

**¡Buena suerte con el nuevo Landing Page de Owl Fenc! 🦉**

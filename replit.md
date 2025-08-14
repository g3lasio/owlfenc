# Legal Document & Permit Management Platform

## Overview
An advanced AI-powered legal document and permit management platform with intelligent authentication strategies, focusing on robust user registration and secure access controls.

## Architecture

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

### Key Technologies
- Firebase real-time database
- OpenAI-powered document generation
- Enhanced OAuth and email/password authentication
- Dynamic form validation and error handling

## 🚨 CRITICAL SECURITY UPDATE - USER PERMISSIONS SYSTEM

### Recent Security Fix (2025-08-14)
**PROBLEMA CRÍTICO RESUELTO**: Usuarios nuevos ya no reciben acceso premium automático sin pagar.

### New Permission System

#### User Roles & Plans
1. **primo_chambeador** (Plan 1) - FREE PLAN (DEFAULT for new users)
   - 10 estimados básicos/mes (con marca de agua)
   - 3 estimados con IA/mes (con marca de agua)  
   - 3 contratos/mes (con marca de agua)
   - 5 Property Verification/mes
   - 5 Permit Advisor/mes
   - Sin acceso a Invoices, Payment Tracker, Owl Funding
   - Soporte: Solo FAQ y comunidad

2. **mero_patron** (Plan 2) - $49.99/mes
   - Estimados básicos ilimitados (sin marca de agua)
   - 50 estimados con IA/mes
   - Contratos ilimitados (sin marca de agua)
   - 50 Property Verification/mes
   - 50 Permit Advisor/mes
   - Acceso a Invoices y Payment Tracker
   - Soporte prioritario

3. **master_contractor** (Plan 3) - $99.99/mes
   - TODO ILIMITADO
   - Sin marcas de agua
   - Acceso completo a todas las funciones
   - Soporte VIP 24/7

4. **trial_master** (Plan 4) - Trial de 21 días
   - Acceso completo temporal
   - Solo activado manualmente por el usuario
   - Se degrada automáticamente a plan gratuito al expirar

### Authentication & Authorization Middleware

#### Files Added/Modified:
- `server/middleware/subscription-auth.ts` - Sistema de autorización por suscripción
- `server/middleware/usage-tracking.ts` - Seguimiento de límites de uso
- `server/routes/usage-limits.ts` - Endpoints para gestión de límites
- `server/services/firebaseSubscriptionService.ts` - Métodos para degradación automática

#### Key Middleware Functions:
- `requireSubscriptionLevel(PermissionLevel)` - Valida nivel de suscripción requerido
- `trackAndValidateUsage(feature, limitKey)` - Rastrea y valida límites de uso
- `requirePremiumFeature(feature)` - Valida acceso a funciones premium

#### Permission Levels:
```typescript
enum PermissionLevel {
  FREE = 'free',      // primo_chambeador
  BASIC = 'basic',    // mero_patron  
  PREMIUM = 'premium', // master_contractor
  TRIAL = 'trial'     // trial_master
}
```

### Security Improvements

#### 1. Secure Registration Flow
- **ANTES**: Nuevos usuarios → Trial Master automático (acceso premium gratis)
- **AHORA**: Nuevos usuarios → Plan gratuito por defecto
- Trial solo se activa manualmente via `/api/subscription/activate-trial`

#### 2. Automatic Degradation
- Suscripciones expiradas se degradan automáticamente a plan gratuito
- Validación en tiempo real del estado de suscripción
- Bloqueo inmediato de funciones premium al expirar el pago

#### 3. Usage Limits Enforcement
- Contadores de uso por función y por mes
- Validación antes de permitir acceso a funciones limitadas
- Mensajes claros cuando se alcanzan los límites

### API Endpoints Updated

#### Secure Endpoints:
```
POST /api/subscription/activate-trial - Activar trial manualmente (requiere auth)
GET /api/usage-limits/current - Ver límites y uso actual
POST /api/usage-limits/reset - Resetear contadores (solo admin)
```

#### Example Protected Route:
```typescript
app.post("/api/ai-estimate-advanced", 
  requireAuth,                                    // Verificar autenticación
  requireSubscriptionLevel(PermissionLevel.BASIC), // Requiere plan básico o superior
  trackAndValidateUsage('ai-estimates', 'estimatesAI'), // Validar límites de uso
  async (req, res) => { /* endpoint logic */ }
);
```

### Implementation Status

#### ✅ Completed:
- Sistema de middleware de autorización
- Seguimiento de límites de uso
- Degradación automática de suscripciones
- Nuevo flujo seguro de registro (plan gratuito por defecto)
- Validación en tiempo real de permisos

#### 🔄 Next Steps:
- Aplicar middlewares a todos los endpoints críticos
- Implementar UI para mostrar límites de uso al usuario
- Crear alertas automáticas cuando se acerquen a los límites
- Integrar contador de uso con base de datos para persistencia

### Testing & Validation

#### Para Probar:
1. Crear usuario nuevo → Debe recibir plan gratuito automáticamente
2. Intentar acceder a funciones premium → Debe ser bloqueado con mensaje de upgrade
3. Activar trial manualmente → Debe funcionar solo una vez por usuario
4. Expirar trial → Debe degradar automáticamente a plan gratuito

#### Logs a Monitorear:
- `🆓 [SUBSCRIPTION-USER] No subscription found, creating FREE PLAN`
- `⬇️ [FIREBASE-SUBSCRIPTION] Degradando usuario X a plan gratuito`
- `📊 [USAGE-TRACKER] Usuario X - feature: Y usos`

## User Preferences

### Communication Style
- Respuestas técnicas y detalladas cuando se requiera análisis
- Documentación clara de cambios de arquitectura
- Logging detallado para debugging

### Technical Preferences
- Seguir patrones de Express.js y middleware
- Usar TypeScript estricto
- Implementar validación robusta en todos los endpoints
- Priorizar seguridad sobre conveniencia

## Recent Changes

### 2025-08-14: Sistema de Permisos Completamente Renovado
- **CRÍTICO**: Corregido el fallo de seguridad donde usuarios nuevos recibían acceso premium automático
- Implementado sistema completo de autorización basado en suscripciones
- Creado seguimiento de límites de uso en tiempo real
- Agregado degradación automática cuando expiran las suscripciones
- Aplicado principio de "secure by default" - nuevos usuarios inician con plan gratuito

### Next Priority
Continuar aplicando los middlewares de autorización a todos los endpoints críticos del sistema para asegurar que ninguna función premium sea accesible sin la suscripción apropiada.
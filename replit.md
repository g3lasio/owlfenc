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

## 🔐 ENHANCED LOGIN PERSISTENCE SYSTEM - COMPLETED (2025-08-14)

### Sistema de Login Persistente de 30 Días ✅ COMPLETO

**PROBLEMA RESUELTO**: Usuarios tenían que iniciar sesión frecuentemente, causando fricción en la experiencia.

#### Funcionalidades Implementadas:

1. **Enhanced Persistence Service** (`client/src/lib/enhanced-persistence.ts`)
   - Persistencia automática de sesiones por 30 días
   - Device fingerprinting para detectar cambios de dispositivo
   - Validación automática de sesiones al cargar la app
   - Limpieza automática de sesiones al logout

2. **Device Fingerprinting** (`client/src/lib/device-fingerprint.ts`)
   - Identificación única del dispositivo basada en características del navegador
   - Detección de cambios que requieren nueva autenticación
   - Algoritmo robusto que resiste cambios menores

3. **Checkbox "Recordarme por 30 días"** en Login Form
   - Integrado con react-hook-form y shadcn/ui
   - Validación con Zod schema
   - Interfaz intuitiva con explicación clara

4. **AuthContext Mejorado** (`client/src/contexts/AuthContext.tsx`)
   - Función `login()` actualizada para aceptar parámetro `rememberMe`
   - Integración con enhanced persistence service
   - Limpieza automática en logout
   - Verificación de sesiones persistentes al inicializar

#### Flujo de Funcionamiento:

1. **Login con Recordarme**:
   - Usuario marca checkbox "Recordarme por 30 días"
   - Sistema genera device fingerprint único
   - Sesión se guarda con timestamp de expiración
   - Usuario permanece autenticado por 30 días

2. **Validación Automática**:
   - Al cargar la app, verifica sesión guardada
   - Compara device fingerprint actual vs guardado
   - Si coincide, restaura sesión automáticamente
   - Si no coincide, requiere nueva autenticación

3. **Logout Seguro**:
   - Limpia todas las sesiones persistentes
   - Revoca tokens de Firebase
   - Elimina datos de device fingerprinting

#### Logs de Monitoreo:
- `🔄 [PERSISTENCE] Sesión persistente válida encontrada`
- `⚠️ [PERSISTENCE] Sesión inválida: [razón]`
- `🗑️ [AUTH-CONTEXT] Sesión persistente limpiada`
- `🔐 [DEVICE-FINGERPRINT] Generando fingerprint único`

#### Seguridad:
- Solo funciona en el mismo dispositivo/navegador
- Cambios significativos en el dispositivo requieren nueva auth
- Expiración automática después de 30 días
- Limpieza completa al logout manual

## 🔐 WEBAUTHN BIOMETRIC AUTHENTICATION SYSTEM - COMPLETED (2025-08-14)

### Sistema de Autenticación Biométrica Completo ✅ IMPLEMENTADO

**FUNCIONALIDAD AÑADIDA**: Autenticación con Face ID, Touch ID y huella digital usando WebAuthn API.

#### Características Implementadas:

1. **Detección Inteligente de Dispositivos** (`client/src/lib/biometric-detection.ts`)
   - Detecta automáticamente capacidades biométricas del dispositivo
   - Soporte para Face ID, Touch ID, Windows Hello y huella digital Android
   - Identificación de navegador y tipo de dispositivo
   - Progressive enhancement - solo se muestra si hay soporte

2. **Servicio WebAuthn Completo** (`client/src/lib/webauthn-service.ts`)
   - Implementación completa de WebAuthn API
   - Registro de credenciales biométricas
   - Autenticación con verificación de usuario
   - Manejo seguro de challenges y attestations
   - Integración con CBOR para codificación de credenciales

3. **Componente Biométrico** (`client/src/components/auth/BiometricLoginButton.tsx`)
   - Botón inteligente que se adapta al tipo de dispositivo
   - Iconos específicos: Face ID/Touch ID para iOS, huella para Android, Windows Hello para PC
   - Estados de loading y error comprehensivos
   - Mensajes de error localizados y específicos

4. **Backend WebAuthn** (`server/routes/webauthn.ts`)
   - Endpoints para registro y autenticación
   - Validación de attestations y assertions
   - Integración con base de datos PostgreSQL
   - Manejo seguro de credenciales y contadores

5. **Base de Datos** (`shared/schema.ts`)
   - Tabla `webauthn_credentials` con campos optimizados
   - Índices para user_id y credential_id
   - Soporte para transports y metadatos de dispositivo
   - Tracking de último uso y contadores

#### Flujo de Funcionamiento:

1. **Detección Automática**:
   - Al cargar la página de login, detecta si el dispositivo soporta biometría
   - Muestra el botón apropiado solo si hay soporte disponible
   - Adapta el ícono y texto según el tipo de autenticador

2. **Autenticación**:
   - Usuario hace clic en el botón biométrico
   - Sistema solicita autenticación biométrica (Face ID, Touch ID, etc.)
   - Valida la credencial en el backend
   - Integra con el sistema de persistencia de 30 días existente

3. **Seguridad**:
   - Resistente a phishing (inherente a WebAuthn)
   - Combina "algo que tienes" (dispositivo) + "algo que eres" (biometría)
   - Sin contraseñas almacenadas o transmitidas
   - Integración con Firebase Authentication existente

#### Cobertura de Dispositivos:
- **iOS**: Face ID, Touch ID (Safari, Chrome, Edge)
- **Android**: Huella digital, Face Unlock (Chrome, Edge, Firefox)
- **Windows**: Windows Hello (Chrome, Edge, Firefox)
- **macOS**: Touch ID (Safari, Chrome, Edge)

#### Logs de Monitoreo:
- `🔐 [BIOMETRIC-DETECTION] Iniciando detección de capacidades`
- `✅ [BIOMETRIC-BUTTON] Autenticación biométrica disponible`
- `🎉 [LOGIN-BIOMETRIC] Login biométrico exitoso`
- `❌ [LOGIN-BIOMETRIC] Error en login biométrico`

#### Testing Status:
- ✅ Detección de Windows Hello en Chrome confirmada
- ✅ Integración con formulario de login funcional
- ✅ Backend WebAuthn rutas registradas exitosamente
- ✅ Base de datos configurada y operativa

### Next Priority
Realizar pruebas completas del flujo biométrico y continuar aplicando los middlewares de autorización a todos los endpoints críticos del sistema.
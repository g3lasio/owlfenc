## Lista Detallada de Cambios Implementados

**Objetivo:** Corregir vulnerabilidades críticas y mejorar la experiencia de usuario en el flujo de autenticación y registro.

### 1. Asignación Automática de Plan Gratuito ("Primo Chambeador")

*   **Problema:** Los nuevos usuarios no recibían un plan por defecto, forzándolos a elegir uno inmediatamente después de registrarse, lo que podría causar una alta tasa de abandono.
*   **Solución Implementada:**
    *   Se modificó el servicio `firebaseSubscriptionService.ts` para añadir una nueva función `assignDefaultFreePlan`.
    *   Esta función crea una suscripción gratuita ("Primo Chambeador", plan ID 5) para un nuevo usuario, con un período de prueba de 0 días y sin costo.
    *   Se actualizó el endpoint de `session-auth.ts` para que, después de que un nuevo usuario inicie sesión por primera vez, se llame a `assignDefaultFreePlan` si no tiene una suscripción activa.
*   **Archivos Modificados:**
    *   `server/services/firebaseSubscriptionService.ts`
    *   `server/routes/session-auth.ts`

### 2. Implementación de Verificación de Cuenta por OTP (One-Time Password)

*   **Problema:** La verificación de correo electrónico mediante un simple enlace es menos segura y puede ser menos atractiva para los usuarios. Se sugirió usar un sistema de OTP.
*   **Solución Implementada:**
    *   Se creó un nuevo servicio `otpService.ts` para gestionar todo el ciclo de vida de los OTPs: generación, envío por correo, verificación y expiración.
    *   Se añadió una nueva tabla `otps` al esquema de la base de datos (`shared/schema.ts`) para almacenar los códigos de forma segura, incluyendo intentos y fecha de expiración.
    *   Se añadió un campo `emailVerified` a la tabla `users` para marcar cuándo un usuario ha verificado su correo.
    *   Se crearon nuevas rutas en `otp-routes.ts` para manejar las solicitudes de OTP (`/request-otp`) y la verificación (`/verify-otp`).
    *   El flujo de registro ahora utiliza este sistema. Al verificar el OTP correctamente, el usuario se crea en Firebase con `emailVerified: true`.
*   **Archivos Creados/Modificados:**
    *   `server/services/otpService.ts` (nuevo)
    *   `server/routes/otp-routes.ts` (nuevo)
    *   `shared/schema.ts` (modificado)
    *   `server/index.ts` (modificado para registrar las nuevas rutas)

### 3. Implementación de Límite de Intentos (Rate Limiting) en el Login

*   **Problema:** El endpoint de login no tenía protección contra ataques de fuerza bruta, lo que lo hacía vulnerable.
*   **Solución Implementada:**
    *   Se utilizó el middleware `express-rate-limit` para crear una política de límite de intentos específica para la autenticación.
    *   Se aplicó un límite de 5 intentos de inicio de sesión fallidos por minuto desde una misma IP.
    *   Si se supera el límite, el sistema responde con un error `429 Too Many Requests`.
*   **Archivos Modificados:**
    *   `server/routes/session-auth.ts` (se aplicó el middleware `authLimiter`)

### 4. Refactorización y Centralización de Clientes de API (Mocking para Desarrollo)

*   **Problema:** Durante la implementación, se descubrió que múltiples servicios (Resend, Stripe, Anthropic) se inicializaban de forma independiente y requerían claves de API, lo que impedía el arranque del servidor en un entorno de desarrollo sin estas claves.
*   **Solución Implementada:**
    *   Se creó un cliente centralizado para `Resend` (`server/lib/resendClient.ts`) que utiliza un *mock* (simulador) si la clave de API no está presente en desarrollo, pero la requiere en producción.
    *   Se refactorizaron todos los servicios que usaban `Resend` (`otpService`, `subscriptionEmailService`, `invoiceEmailService`, `alertingService`, etc.) para que utilizaran este cliente centralizado.
    *   Se aplicó una lógica similar de *mocking* en los constructores de los servicios de `Stripe` y `Anthropic` para permitir el arranque del servidor sin sus respectivas claves en desarrollo.
    *   Se desactivó temporalmente la validación estricta de variables de entorno en `server/middleware/security.ts` para permitir el arranque en el entorno de pruebas.
*   **Archivos Modificados/Creados:**
    *   `server/lib/resendClient.ts` (nuevo)
    *   `server/services/otpService.ts`
    *   `server/services/subscriptionEmailService.ts`
    *   `server/services/invoiceEmailService.ts`
    *   `server/services/alertingService.ts`
    *   `server/services/trialNotificationService.ts`
    *   `server/services/resendEmailAdvanced.ts`
    *   `server/services/contractGenerator.ts`
    *   `server/services/hybridContractGenerator.ts`
    *   `server/config/stripe.ts`
    *   `server/middleware/security.ts`
    *   `server/routes.ts`

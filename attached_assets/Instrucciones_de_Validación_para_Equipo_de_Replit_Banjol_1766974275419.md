# Instrucciones de Validación para Equipo de Replit/Banjol

**Asunto:** Validación de Correcciones en el Módulo de Autenticación y Registro.

**Objetivo:** Verificar e integrar los cambios realizados para solucionar vulnerabilidades críticas y mejorar el flujo de registro de nuevos usuarios en la aplicación Owl Fenc.

## Resumen de Cambios

Se han implementado tres mejoras principales:

1.  **Asignación Automática de Plan Gratuito:** Los nuevos usuarios ahora reciben el plan "Primo Chambeador" por defecto al registrarse.
2.  **Verificación por OTP:** El registro se realiza mediante un código de un solo uso (OTP) enviado al correo, mejorando la seguridad y la experiencia de usuario.
3.  **Límite de Intentos en Login (Rate Limiting):** Se ha añadido protección contra ataques de fuerza bruta en el endpoint de inicio de sesión.

Además, se realizó una refactorización importante para centralizar la gestión de claves de API (Resend, Stripe, Anthropic), permitiendo que el servidor se inicie en entornos de desarrollo sin necesidad de claves reales, utilizando *mocks* (simuladores).

## Archivos Modificados y Creados

A continuación se listan los archivos que han sido modificados o creados. Se recomienda revisar los cambios en estos archivos para entender el alcance de la implementación.

*   **Nuevos Archivos:**
    *   `server/services/otpService.ts`
    *   `server/routes/otp-routes.ts`
    *   `server/lib/resendClient.ts`

*   **Archivos Modificados:**
    *   `server/services/firebaseSubscriptionService.ts`
    *   `server/routes/session-auth.ts`
    *   `shared/schema.ts`
    *   `server/index.ts`
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

## Instrucciones para Validación

Se solicita al equipo de validación que realice las siguientes acciones en el entorno de Replit:

### 1. Revisión de Código (Code Review)

*   Revisar los cambios en los archivos mencionados para asegurar que siguen las mejores prácticas y no introducen regresiones.
*   **Foco principal:**
    *   La lógica de asignación del plan gratuito en `session-auth.ts` y `firebaseSubscriptionService.ts`.
    *   El nuevo flujo de registro basado en OTP en `otpService.ts` y `otp-routes.ts`.
    *   La correcta aplicación del *rate limiting* en `session-auth.ts`.

### 2. Pruebas Funcionales Manuales

*   Ejecutar el script de pruebas manuales detallado en el documento `pruebas_manuales.md`.
*   Este script cubre los tres escenarios principales: registro de nuevo usuario, límite de intentos de login y prevención de registro con correo existente.
*   **Es crucial realizar estas pruebas en el entorno de Replit, ya que depende de las variables de entorno (secrets) para funcionar correctamente (especialmente para el envío de correos con OTP).**

### 3. Verificación del Entorno

*   Asegurarse de que el servidor se inicia correctamente en Replit sin errores relacionados con las variables de entorno.
*   Los cambios realizados para *mockear* los servicios en desarrollo no deberían afectar el comportamiento en producción, pero se recomienda verificar que los servicios de Resend, Stripe y Anthropic se inicialicen correctamente con las claves de producción.

## Resultado Esperado

*   Todos los pasos del script de pruebas manuales se completan exitosamente.
*   El código es aprobado y se puede hacer *merge* a la rama principal.
*   La aplicación es más segura y ofrece una mejor experiencia de registro a los nuevos usuarios.

Gracias por su colaboración.

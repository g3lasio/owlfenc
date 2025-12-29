# Script de Pruebas Manuales: Autenticación y Registro

**Objetivo:** Validar las correcciones y mejoras implementadas en el flujo de autenticación y registro de nuevos usuarios.

**Entorno:** Replit (producción o staging).

**Requisitos previos:**
- Acceso al entorno de Replit con las variables de entorno (secrets) configuradas.
- Un correo electrónico de prueba que no esté registrado en la plataforma.

## Prueba 1: Registro de Nuevo Usuario con OTP y Asignación de Plan Gratuito

**Objetivo:** Verificar que un nuevo usuario pueda registrarse usando el flujo de OTP, que se le asigne automáticamente el plan "Primo Chambeador" y que su correo quede verificado.

**Pasos:**

1.  **Navegar a la página de registro:**
    - Abre la aplicación en tu navegador.
    - Haz clic en "Registrarse" o navega a la página de registro.

2.  **Solicitar OTP:**
    - Ingresa un correo electrónico de prueba (nuevo, no registrado).
    - Haz clic en "Enviar código de verificación".
    - **Verificación:** Deberías ver un mensaje de éxito indicando que se ha enviado un código a tu correo.

3.  **Verificar Correo y Obtener OTP:**
    - Revisa la bandeja de entrada del correo de prueba.
    - **Verificación:** Deberías haber recibido un correo con un código de 6 dígitos.

4.  **Completar Registro con OTP:**
    - Vuelve a la página de registro.
    - Ingresa el código OTP recibido.
    - Completa los demás campos del formulario (nombre, contraseña).
    - Haz clic en "Crear cuenta".
    - **Verificación:** Deberías ser redirigido al dashboard o a la página de bienvenida, ya autenticado.

5.  **Verificar Asignación de Plan:**
    - Navega a la sección de "Suscripción" o "Mi Cuenta" en la aplicación.
    - **Verificación:** Deberías ver que tu plan actual es "Primo Chambeador" (o el plan gratuito configurado).

6.  **Verificar Estado de Verificación de Correo:**
    - (Si es posible en la UI) Revisa el estado de tu cuenta.
    - **Verificación (en base de datos):** En la tabla `users` de Firebase, el campo `emailVerified` para este nuevo usuario debe ser `true`.

## Prueba 2: Límite de Intentos de Login (Rate Limiting)

**Objetivo:** Asegurar que el sistema bloquee temporalmente los intentos de inicio de sesión después de varios intentos fallidos para prevenir ataques de fuerza bruta.

**Pasos:**

1.  **Navegar a la página de login:**
    - Cierra la sesión si estás autenticado.
    - Navega a la página de inicio de sesión.

2.  **Realizar Intentos de Login Fallidos:**
    - Ingresa un correo electrónico válido pero una contraseña incorrecta.
    - Repite el proceso de inicio de sesión fallido 6 veces consecutivas.

3.  **Verificar Bloqueo:**
    - Al 6º o 7º intento, deberías ver un mensaje de error diferente.
    - **Verificación:** El mensaje debe indicar "Demasiados intentos. Por favor, inténtalo de nuevo más tarde." o un error similar (HTTP 429 Too Many Requests).

4.  **Verificar Desbloqueo:**
    - Espera un minuto.
    - Intenta iniciar sesión de nuevo con las credenciales correctas.
    - **Verificación:** Deberías poder iniciar sesión exitosamente.

## Prueba 3: Intento de Registro con Correo Existente

**Objetivo:** Verificar que el sistema impida que un usuario se registre con un correo electrónico que ya existe.

**Pasos:**

1.  **Navegar a la página de registro:**
    - Cierra la sesión.
    - Ve a la página de registro.

2.  **Intentar Registrarse con Correo Existente:**
    - Ingresa el correo electrónico del usuario que creaste en la Prueba 1.
    - Haz clic en "Enviar código de verificación".

3.  **Verificar Mensaje de Error:**
    - **Verificación:** Deberías ver un mensaje de error claro que indique "Este correo ya está registrado. Por favor, inicia sesión."

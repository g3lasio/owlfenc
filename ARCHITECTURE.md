# Arquitectura de Owl Fenc (Mervin AI)

Este documento proporciona una visión general de la arquitectura técnica, la infraestructura de despliegue y los patrones de diseño clave de Owl Fenc (también conocido internamente como Mervin AI).

## 1. Visión General del Sistema

Owl Fenc es una plataforma impulsada por IA diseñada para contratistas, ofreciendo herramientas como "Lead Hunter" (búsqueda de materiales y prospectos), estimaciones de costos, contratos legales, facturación y un asesor de permisos (Permit Advisor).

*   **Frontend:** React (Vite), Wouter (routing), Tailwind CSS, shadcn/ui.
*   **Backend:** Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL (Neon).
*   **Infraestructura de Despliegue:** Railway (Contenedores persistentes).
*   **Base de Datos:** Neon Serverless Postgres.

## 2. Componentes Clave

### Base de Datos (Neon Serverless Postgres)
*   **Endpoint Pooled:** La aplicación se conecta a Neon utilizando PgBouncer a través del endpoint Pooled (`-pooler` en la URL). Esto es fundamental en Railway para gestionar el ciclo de vida de las conexiones y permitir que Neon suspenda el compute (Scale to Zero) cuando no hay actividad.
*   **Migraciones:** El esquema se define en `shared/schema.ts` y se gestiona mediante Drizzle Kit. Las migraciones manuales (como índices `CONCURRENTLY` para rendimiento) se almacenan en `server/migrations/` y se aplican cuidadosamente para no bloquear tablas en producción.
*   **Índices:** Se utilizan índices en columnas consultadas frecuentemente (ej. `user_id` en suscripciones y límites, `firebase_uid`) para evitar Full Table Scans.

### Backend (Node.js/Express)
*   **Estructura de Directorios:**
    *   `server/`: Contiene toda la lógica del backend.
    *   `server/routes.ts`: Definición de las rutas de la API.
    *   `server/services/`: Lógica de negocio e integraciones externas (Firebase, Stripe, OpenAI).
    *   `server/lib/`: Utilidades y wrappers (ej. `resilient-db-wrapper.ts`).
    *   `shared/`: Código compartido entre frontend y backend (esquema Drizzle, tipos, utilidades de validación).
*   **Workers y Tareas Programadas:** Los procesos en segundo plano (como la cola de completado de IA) se ejecutan mediante `setInterval`. Para optimizar costos en Neon, el intervalo mínimo para cualquier tarea es de **5 minutos**.

### Frontend (React/Vite)
*   **Estado y Fetching:** Utiliza `@tanstack/react-query` para el fetching de datos, caché y sincronización con el backend.
*   **Componentes UI:** Construido con componentes modulares de `shadcn/ui` y estilizado con Tailwind CSS, manteniendo una estética futurista consistente.

## 3. Integraciones Externas

*   **Autenticación y Seguridad:** Firebase Authentication.
*   **Pagos y Facturación:** Stripe. La lógica de negocio dicta que tras 3 pagos fallidos, la cuenta hace downgrade al plan gratuito, no se cancela.
*   **Inteligencia Artificial:** OpenAI (GPT-4) y potencialmente Claude para funcionalidades avanzadas (Lead Hunter, Permit Advisor).
*   **Almacenamiento:** Firebase Storage o AWS S3 (dependiendo de la configuración actual) para documentos generados (PDFs de contratos, facturas).

## 4. Patrones de Diseño Críticos

1.  **Idempotencia en el Arranque:** El servidor debe poder reiniciarse múltiples veces sin causar efectos secundarios. Las migraciones inline (ej. `leadprime_network_columns_v1`) están protegidas por tablas de estado (`_applied_migrations`).
2.  **Eficiencia de Compute (Scale to Zero):** La arquitectura asume que la base de datos de Neon entrará en suspensión tras 5 minutos de inactividad. El backend no debe realizar "pings" de keep-alive a `localhost` ni encuestas (polling) de alta frecuencia que impidan este ahorro de costos.
3.  **Sincronización de Datos:** Es crítico que los límites de uso (ej. 5 contratos en el plan gratuito) y el estado de la suscripción estén perfectamente sincronizados entre la base de datos, el backend y la UI del frontend.

## 5. Estrategia de Ramas y Despliegue (Capa 5)

*   `main`: Rama principal, desplegada automáticamente en producción (Railway).
*   `fix/*` o `feat/*`: Ramas de características o correcciones de errores, fusionadas a `main` a través de Pull Requests protegidos por CI/CD.
*   **Replit vs Railway:** Replit se utiliza exclusivamente como entorno de desarrollo, revisión y pruebas. El entorno de producción real y definitivo reside en Railway.

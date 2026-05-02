# Instrucciones para AI Assistants (Owl Fenc)

Este archivo contiene reglas críticas de arquitectura, infraestructura y negocio que **TODO** AI Assistant (Claude, ChatGPT, Cursor, Cursor AI, GitHub Copilot, etc.) debe leer y acatar antes de proponer o escribir código para Owl Fenc (Mervin AI).

## 1. Reglas de Infraestructura (Railway + Neon)

Owl Fenc se ejecuta en contenedores persistentes de **Railway** conectados a una base de datos Serverless PostgreSQL en **Neon**.

*   **PROHIBIDO EL "KEEP-ALIVE":** Railway NO hiberna contenedores. Está estrictamente prohibido añadir `setInterval`, cron jobs o requests HTTP a `localhost` o `/healthz` para "prevenir cold starts". Esto solo despierta la base de datos de Neon y genera costos innecesarios.
*   **CRON JOBS Y WORKERS:** Cualquier tarea en background (workers, aggregators, colas de completado) debe tener un intervalo **mínimo de 5 minutos** (`*/5 * * * *`). Intervalos menores impiden que Neon suspenda el compute ("Scale to Zero") y disparan la factura mensual.
*   **CONEXIONES A BASE DE DATOS (POOLED):** La aplicación debe usar **siempre** el endpoint Pooled de Neon (el que contiene `-pooler` en la URL). El uso del endpoint directo causará agotamiento de conexiones en Railway.
*   **MIGRACIONES DE ESQUEMA EN RUNTIME:** Está estrictamente prohibido ejecutar `ALTER TABLE`, `DROP TABLE` o `CREATE TABLE` en el código de la aplicación (ej. al iniciar el servidor) sin estar protegidos por un mecanismo que garantice que corran **una sola vez** (ej. verificando contra la tabla `_applied_migrations`).

## 2. Reglas de Arquitectura de Base de Datos

*   **ÍNDICES PARA QUERIES FRECUENTES:** Si escribes un query que se ejecutará frecuentemente (ej. validación de auth de Firebase, chequeo de suscripción, chequeo de límites de uso), **debes** verificar si existen índices para las columnas en el `WHERE`. Si no existen, debes proponer una migración para añadirlos usando `CREATE INDEX CONCURRENTLY`.
*   **FULL TABLE SCANS:** Los Full Table Scans son inaceptables en producción.
*   **SEPARACIÓN DE PROYECTOS:** Owl Fenc es un producto completamente separado de LeadPrime. No asumas que comparten base de datos, modelos de suscripción o lógica de negocio.
*   **MIGRACIONES DRIZZLE VS SQL:** Owl Fenc usa Drizzle ORM. Las migraciones deben generarse con `drizzle-kit generate` y aplicarse cuidadosamente. Para cambios de rendimiento en producción (como índices `CONCURRENTLY`), se prefieren scripts SQL directos o migraciones raw, ya que Drizzle no soporta bien `CONCURRENTLY` en transacciones DDL estándar.

## 3. Reglas de Negocio (Suscripciones y Límites)

*   **Lead Hunter (DeepSearch):** La funcionalidad de búsqueda de materiales se llama "Lead Hunter" en la UI. Está integrada en la función 'Estimate'.
*   **Límites del Plan Gratuito (Primo Chambeador):**
    *   5 Contratos Legales
    *   5 Verificaciones de Propiedad
    *   5 Consultas al Permit Advisor
    *   Límite global: 50 queries totales a través de todas las funciones medidas.
*   **Plan Master Contractor:** No incluye la función de "analytics".
*   **Lógica de Pagos Fallidos:** Tras 3 intentos fallidos de pago (Stripe), la cuenta del usuario debe hacer **downgrade al plan gratuito**, NO cancelarse.

## 4. Reglas de Desarrollo y Estilo

*   **Sincronización Frontend-Backend:** Cualquier dato crítico de usuario (límites, suscripción) debe estar perfectamente sincronizado entre el frontend y el backend.
*   **Estilo Visual:** El diseño debe mantener la estética futurista y moderna existente en Owl Fenc.
*   **Replit vs Railway:** Replit se usa **solo para revisión y pruebas**. El despliegue de producción vive en Railway a partir de la rama `main`.

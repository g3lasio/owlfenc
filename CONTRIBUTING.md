# Guía de Contribución a Owl Fenc

¡Bienvenido al repositorio de Owl Fenc (Mervin AI)! Este documento establece las reglas y estándares para todos los desarrolladores (humanos y AI) que contribuyan al proyecto. Nuestro objetivo principal es la estabilidad, el rendimiento y la optimización de costos en infraestructura Serverless (Railway + Neon).

## 1. Estándares de Código y Base de Datos

### Migraciones de Esquema (Drizzle ORM)
1. **Nunca modifiques el esquema en runtime:** Está estrictamente prohibido usar sentencias DDL (`ALTER TABLE`, `DROP TABLE`, `CREATE TABLE`) directamente en el código de la aplicación (ej. en `server/index.ts` o `server/db.ts`) a menos que estén protegidas por una tabla de control (ej. `_applied_migrations`) para garantizar que se ejecuten una sola vez.
2. **Usa Drizzle Kit:** Los cambios de esquema deben definirse en `shared/schema.ts` y generarse usando `drizzle-kit generate`.
3. **Índices sin bloqueo:** Cuando añadas índices de rendimiento a tablas en producción, es preferible crear un archivo SQL manual en `server/migrations/` usando `CREATE INDEX CONCURRENTLY` para evitar bloquear la tabla durante la creación.

### Tareas en Background (Cron Jobs y Workers)
1. **Frecuencia mínima:** El intervalo mínimo permitido para cualquier tarea programada (cron, `setInterval`, workers, colas de completado) es de **5 minutos**. Intervalos menores impiden que la base de datos de Neon se suspenda ("Scale to Zero"), generando costos exponenciales.
2. **Cero Keep-Alives:** Owl Fenc se ejecuta en Railway, donde los contenedores son persistentes. No añadas scripts de "self-ping" o "keep-alive" a `localhost` o `/healthz`. Esto era una práctica de Replit que ya no es necesaria y consume recursos de base de datos.

### Conexiones a Base de Datos
1. **Endpoint Pooled:** En el entorno de producción (Railway), la variable `DATABASE_URL` debe apuntar siempre al endpoint **Pooled** de Neon (el que contiene `-pooler`). Esto es crítico para evitar agotar las conexiones concurrentes de PostgreSQL.
2. **Liberación de conexiones:** Si usas el pool directamente, asegúrate siempre de llamar a `client.release()` en un bloque `finally`.

## 2. Flujo de Trabajo (Git y PRs)

1. **Ramas:** Crea una rama descriptiva para tu trabajo (ej. `feat/nueva-funcion`, `fix/bug-auth`, `chore/limpieza`).
2. **Commits:** Usa mensajes de commit convencionales (ej. `feat: añade integración con Stripe`, `fix(db): corrige índice faltante en users`).
3. **Pull Requests:**
    *   Todo código debe pasar por un Pull Request hacia `main`.
    *   Los PRs están protegidos por GitHub Actions (`guardrails.yml`). Si tu PR falla los checks de CI/CD (ej. por tener un cron job de 1 minuto o sentencias DDL fuera de migraciones), será bloqueado automáticamente.
    *   Asegúrate de que TypeScript compile sin errores (`npm run build` o `tsc`).

## 3. Entornos de Desarrollo

*   **Local/Replit:** Usa el entorno local o Replit solo para desarrollo y revisión.
*   **Producción (Railway):** La rama `main` se despliega automáticamente en Railway. Nunca hagas pruebas directas en la base de datos de producción.

Gracias por contribuir a mantener Owl Fenc rápido, estable y eficiente en costos.

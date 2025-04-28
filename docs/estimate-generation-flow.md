
# Flujo de Generación de Estimados
Este documento detalla el flujo completo del sistema de generación de estimados, tanto para el modo manual como para el asistido por IA (Mervin).

## 1. Arquitectura General

### 1.1 Servicios Principales
- `EstimatorService`: Maneja la lógica central de estimación
- `PromptGeneratorService`: Genera y procesa prompts para Mervin
- `DatabaseStorage`: Acceso a datos y persistencia
- `MaterialService`: Gestión de precios y materiales

### 1.2 Endpoints API
```
POST /api/estimates/calculate
POST /api/estimates/validate  
POST /api/estimates/html
POST /api/estimates/save
POST /api/estimates/email
```

## 2. Flujo de Datos

### 2.1 Obtención de Datos del Contratista
1. Verificar sesión activa del contratista
2. Cargar perfil desde `storage.getUser(userId)`
3. Datos requeridos:
   - ID del contratista
   - Nombre/Empresa
   - Dirección
   - Teléfono
   - Email
   - Licencia
   - Logo

### 2.2 Validación del Cliente
1. Buscar cliente existente o crear nuevo
2. Datos requeridos:
   - Nombre completo
   - Email
   - Teléfono
   - Dirección del proyecto
   - Ciudad
   - Estado
   - Código postal

### 2.3 Información del Proyecto
1. Tipo de proyecto (cerca, techo, etc.)
2. Subtipo (material específico)
3. Dimensiones según tipo:
   - Cerca: longitud y altura
   - Techo: área
   - Deck: área o longitud/ancho
4. Características adicionales:
   - Demolición
   - Acabados
   - Características especiales

## 3. Proceso de Estimación Manual

### 3.1 Cálculo de Materiales
1. Consultar `materialParameters.json` para reglas base
2. Calcular cantidades según tipo:
   ```typescript
   const materials = {
     posts: calculatePosts(length, height),
     concrete: calculateConcrete(posts),
     rails: calculateRails(length),
     pickets: calculatePickets(length),
     hardware: calculateHardware()
   };
   ```

### 3.2 Consulta de Precios
1. Cargar precios base de la DB
2. Aplicar factores de ajuste:
   - Estado/región
   - Altura
   - Características especiales
3. Calcular subtotales por categoría

### 3.3 Cálculo de Mano de Obra
1. Consultar tasas base por estado
2. Aplicar multiplicadores:
   - Complejidad del proyecto
   - Altura
   - Demolición
3. Calcular horas estimadas y costo total

## 4. Proceso con Mervin (IA)

### 4.1 Generación del Prompt
1. Obtener template base según tipo de proyecto
2. Incorporar datos específicos:
   - Dimensiones
   - Materiales
   - Requisitos especiales
3. Incluir contexto local:
   - Precios actuales
   - Regulaciones
   - Factores climáticos

### 4.2 Procesamiento IA
1. Enviar prompt a OpenAI
2. Procesar respuesta estructurada:
   ```json
   {
     "materials": [
       {"item": "string", "quantity": number, "cost": number}
     ],
     "labor": {
       "hours": number,
       "rate": number,
       "total": number
     },
     "additional": [...],
     "totals": {...}
   }
   ```

### 4.3 Validación y Ajuste
1. Verificar rangos razonables
2. Aplicar reglas de negocio
3. Ajustar según feedback histórico

## 5. Generación del Estimado Final

### 5.1 Estructura del Documento
1. Información del contratista
2. Datos del cliente
3. Detalles del proyecto
4. Desglose de materiales
5. Costos de mano de obra
6. Características adicionales
7. Totales y términos

### 5.2 Persistencia
1. Guardar en DB:
   ```typescript
   const projectData = {
     projectId: generateId(),
     clientId: client.id,
     contractorId: contractor.id,
     estimateDetails: {...},
     status: 'draft',
     createdAt: new Date()
   };
   ```

### 5.3 Acciones Post-Generación
1. Generar PDF
2. Enviar por email (opcional)
3. Actualizar historial
4. Notificar al contratista

## 6. Integración con Base de Datos

### 6.1 Tablas Principales
```sql
CREATE TABLE estimates (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR,
  contractor_id INTEGER,
  client_id INTEGER,
  estimate_data JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  category VARCHAR,
  name VARCHAR,
  current_price DECIMAL,
  unit VARCHAR
);

CREATE TABLE labor_rates (
  id SERIAL PRIMARY KEY,
  state VARCHAR,
  project_type VARCHAR,
  base_rate DECIMAL,
  updated_at TIMESTAMP
);
```

### 6.2 Consultas Principales
1. Precios de materiales actuales
2. Tasas de mano de obra por región
3. Historial de estimados similares
4. Factores de ajuste locales

## 7. Manejo de Errores

### 7.1 Validaciones
1. Datos de entrada completos
2. Rangos válidos para dimensiones
3. Disponibilidad de materiales
4. Permisos del usuario

### 7.2 Recuperación
1. Guardado automático de borradores
2. Registro de errores
3. Notificaciones al administrador
4. Reintentos automáticos

## 8. Métricas y Monitoreo

### 8.1 KPIs
1. Tiempo de generación
2. Tasa de conversión
3. Precisión vs. costos reales
4. Uso de cada modo (manual vs. IA)

### 8.2 Logs
1. Errores y excepciones
2. Tiempos de respuesta
3. Uso de recursos
4. Patrones de uso

## 9. Consideraciones de Seguridad

### 9.1 Autenticación
1. Verificar sesión activa
2. Validar permisos
3. Registrar accesos

### 9.2 Datos Sensibles
1. Encriptar información del cliente
2. Proteger precios y márgenes
3. Limitar acceso a estimados

## 10. Optimizaciones

### 10.1 Caché
1. Precios de materiales
2. Tasas regionales
3. Templates frecuentes

### 10.2 Rendimiento
1. Queries optimizadas
2. Procesamiento en background
3. Compresión de datos


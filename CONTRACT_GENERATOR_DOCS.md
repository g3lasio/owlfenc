# Documentación del Sistema de Generación de Contratos

## Descripción General

El Sistema de Generación de Contratos es un componente crítico de la plataforma que permite crear contratos profesionales a partir de datos de proyectos. Utiliza tecnologías avanzadas como procesamiento de lenguaje natural (OpenAI y Mistral) y técnicas de generación de documentos para producir contratos personalizados y PDFs.

## Arquitectura

El sistema está compuesto por los siguientes componentes:

1. **API de Generación de Contratos**: Procesa los datos del proyecto y genera el HTML del contrato.
2. **Motor de Plantillas**: Utiliza plantillas predefinidas como respaldo cuando los servicios de IA no están disponibles.
3. **Servicios de IA**: Integración con OpenAI y Mistral para generar contratos inteligentes contextualizados.
4. **Generador de PDF**: Convierte el HTML en documentos PDF profesionales.
5. **Procesador de PDF**: Extrae información de documentos PDF existentes.

### Diagrama de Flujo
```
Datos de Proyecto → API de Generación → Servicios de IA / Plantillas → HTML → Generador de PDF → PDF Final
```

## Endpoints de la API

### Generación de Contratos

```
POST /api/generate-contract
```

**Parámetros de Entrada:**
```json
{
  "projectDetails": {
    "clientName": "Nombre del Cliente",
    "address": "Dirección del Cliente",
    "fenceType": "Tipo de Cerca",
    "fenceLength": "Longitud en metros",
    "total": 10000,
    // Campos adicionales opcionales
    "company": "Nombre de la Empresa",
    "fenceHeight": "Altura en pies",
    "fenceMaterial": "Material de la cerca",
    "startDate": "Fecha de inicio",
    "completionDate": "Fecha de finalización",
    "gates": [
      { "type": "Tipo de puerta", "width": "3", "height": "6", "quantity": 1, "price": 2500 }
    ]
  },
  "model": "gpt-4o", // Opcional: especificar modelo de IA
  "systemPrompt": "Instrucciones específicas" // Opcional: personalizar prompt
}
```

**Respuesta:**
```json
{
  "html": "<!DOCTYPE html>..."
}
```

### Generación de PDF

```
POST /api/generate-pdf
```

**Parámetros de Entrada:**
```json
{
  "html": "<!DOCTYPE html>...",
  "filename": "contrato-123.pdf"
}
```

**Respuesta:**
- Archivo PDF como stream binario con Content-Type: application/pdf

### Procesamiento de PDF

```
POST /api/process-pdf
```

**Parámetros de Entrada:**
- FormData con campo 'pdf' conteniendo el archivo PDF

**Respuesta:**
```json
{
  "extractedData": {
    "clientName": "Nombre extraído",
    "fenceType": "Tipo extraído",
    // Otros campos extraídos
  }
}
```

## Buenas Prácticas

### Datos Mínimos Requeridos

Para generar un contrato válido, al menos estos campos son necesarios:

- `clientName`: Nombre del cliente
- `address`: Dirección del cliente o proyecto
- `fenceType`: Tipo de cerca a instalar
- `fenceLength`: Longitud de la cerca
- `total`: Precio total del proyecto

### Manejo de Errores

El sistema implementa validación y manejo de errores robusto:

1. **Validación de Datos**: Los datos de entrada son validados antes de procesarlos.
2. **Método de Respaldo**: Si los servicios de IA fallan, se utiliza un sistema de plantillas.
3. **Timeout**: Los servicios de IA tienen tiempos de espera configurables para evitar bloqueos.
4. **Errores Descriptivos**: Las respuestas de error incluyen mensajes descriptivos para facilitar la depuración.

## Ejemplos de Uso

### Ejemplo 1: Generación de Contrato Básico

```javascript
// Cliente
import { generateContract } from '@/lib/contractGenerator';

const projectData = {
  clientName: 'Juan Pérez',
  address: 'Calle Principal #123',
  fenceType: 'Privacidad',
  fenceLength: '50',
  total: 15000
};

const result = await generateContract(projectData);
// result.html contiene el HTML del contrato
```

### Ejemplo 2: Generación y Descarga de PDF

```javascript
// Cliente
import { generateContract } from '@/lib/contractGenerator';
import { downloadContractPDF } from '@/lib/pdf';

// Generar contrato
const projectData = {/* datos del proyecto */};
const result = await generateContract(projectData);

// Descargar como PDF
await downloadContractPDF(result.html, projectData.projectId);
```

### Ejemplo 3: Procesamiento de PDF Existente

```javascript
// Cliente
import { processPDFForContract } from '@/lib/openai';

const pdfFile = event.target.files[0]; // Desde input type="file"
const result = await processPDFForContract(pdfFile);

// result.datos_extraidos contiene la información extraída
// result.contrato_html contiene el HTML del contrato generado
```

## Pruebas y Diagnóstico

El sistema incluye un conjunto completo de scripts de prueba:

1. **health-check-contract-system.js**: Verifica rápidamente si todos los componentes están funcionando.
2. **test-contract-generator.js**: Prueba exhaustiva del flujo de generación de contratos.
3. **test-pdf-processing-for-contracts.js**: Prueba el procesamiento de PDFs.
4. **test-contract-upload-processing.js**: Prueba la funcionalidad de cargar contratos existentes.
5. **test-integration-data-contract.js**: Prueba la integración entre componentes.
6. **test-ai-services.js**: Prueba los servicios de IA (OpenAI y Mistral).
7. **test-pdf-validation.js**: Verifica la estructura y contenido de los PDFs generados.
8. **test-contract-error-handling.js**: Prueba el manejo de errores y casos límite.

Para ejecutar pruebas específicas, use:

```bash
node run-specific-tests.js contract pdf ai
```

Para ejecutar una verificación rápida del sistema:

```bash
node health-check-contract-system.js
```

## Solución de Problemas

### Problema: La generación de contrato falla con OpenAI

**Solución**: El sistema automáticamente usará el método de respaldo. Verifique:
1. La configuración de la API key de OpenAI
2. Los logs para mensajes de error específicos
3. Que los datos enviados sean válidos y completos

### Problema: El PDF generado está en blanco o corrupto

**Solución**:
1. Verifique que el HTML generado sea válido
2. Asegúrese de que el servicio Puppeteer esté funcionando correctamente
3. Verifique los logs para errores de tiempo de espera o memoria

### Problema: La extracción de datos de PDF no funciona correctamente

**Solución**:
1. Verifique que el PDF sea legible y tenga texto seleccionable (no sea una imagen)
2. Compruebe la calidad del PDF original
3. Revise los logs para entender qué parte del proceso está fallando

## Personalización

### Plantillas de Contrato

Las plantillas de contrato se encuentran en:
- Plantilla principal: `client/src/components/templates/contract-template.html`
- Plantillas de respaldo en la base de datos (tabla `templates`)

### Configuración de Servicios de IA

La configuración de servicios de IA se realiza a través de variables de entorno:
- `OPENAI_API_KEY`: API key para OpenAI
- `MISTRAL_API_KEY`: API key para Mistral AI
- `AI_TIMEOUT`: Tiempo de espera para servicios de IA (ms)

## Casos de Uso Avanzados

### Cláusulas Personalizadas

Para añadir cláusulas personalizadas al contrato:

```javascript
const projectData = {
  // Datos básicos del proyecto
  ...
  additionalClauses: [
    "El contratista se compromete a obtener todos los permisos municipales necesarios.",
    "El cliente proporcionará acceso a agua y electricidad durante la instalación."
  ]
};
```

### Contratos Multilingües

Para generar contratos en diferentes idiomas:

```javascript
const result = await generateContract(projectData, {
  language: 'spanish', // o 'english'
  systemPrompt: 'Genera un contrato legal en español usando terminología mexicana'
});
```

## Rendimiento y Escalabilidad

El sistema está diseñado para manejar volúmenes moderados de generación de contratos. Consideraciones:

- **Generación con IA**: Puede tomar 5-15 segundos por contrato
- **Generación de PDF**: Puede tomar 2-5 segundos por PDF
- **Procesamiento de PDF**: Puede tomar 5-20 segundos dependiendo de la complejidad

Para cargas de trabajo más intensivas, considere:
1. Implementar un sistema de colas
2. Utilizar cachés para plantillas comunes
3. Escalar horizontalmente el servicio de generación de PDF

## Historial de Versiones

- **1.0.0**: Versión inicial con generación básica de contratos
- **1.1.0**: Añadida integración con OpenAI
- **1.2.0**: Añadido procesamiento de PDF y extracción de datos
- **1.3.0**: Integración con Mistral AI como alternativa a OpenAI
- **1.4.0**: Añadidas pruebas exhaustivas y herramientas de diagnóstico

## Contacto y Soporte

Para reportar problemas o solicitar asistencia, contacte al equipo de desarrollo a través de:
- Email: soporte@suempresa.com
- Sistema de tickets interno
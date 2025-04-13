
# Mervin - Asistente Virtual para Estimados de Cercas 🤖

## Descripción
Mervin es un asistente virtual especializado en la generación de estimados para la instalación de cercas, diseñado específicamente para contratistas. Utilizando procesamiento de lenguaje natural y un sistema de reglas de negocio detallado, Mervin facilita la creación de estimados precisos y profesionales.

## Tecnologías Implementadas 🛠️

### Frontend
- React 18 con TypeScript
- Vite para build y desarrollo
- TailwindCSS para estilos
- Shadcn/ui para componentes de UI
- React Query para manejo de estado y fetching
- Wouter para routing

### Backend
- Node.js con Express
- TypeScript
- Firebase para base de datos y autenticación
- OpenAI API para procesamiento de lenguaje natural

### Características Principales Implementadas ✅
1. **Chat Interactivo**
   - Interfaz conversacional natural
   - Procesamiento de lenguaje natural con GPT-4
   - Manejo contextual de conversaciones

2. **Sistema de Estimados**
   - Cálculo preciso de materiales
   - Ajuste automático por región
   - Consideración de factores como altura y tipo de cerca

3. **Gestión de Datos**
   - Almacenamiento en Firebase
   - Sistema de memoria conversacional
   - Preferencias de contratista

4. **Generación de Documentos**
   - Templates HTML personalizables
   - Generación de PDFs
   - Estimados profesionales formateados

## Arquitectura del Sistema 🏗️

```
├── client/          # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes UI
│   │   ├── pages/      # Páginas principales
│   │   ├── data/       # Reglas y parámetros
│   │   └── lib/        # Utilidades y configuraciones
│
├── server/          # Backend Express
│   ├── services/    # Lógica de negocio
│   └── routes/      # Endpoints API
│
└── shared/          # Tipos y schemas compartidos
```

## Características en Desarrollo 🚧
1. **Sistema de Pagos**
   - Integración con pasarelas de pago
   - Gestión de depósitos
   - Facturación automática

2. **Panel de Administración**
   - Dashboard para contratistas
   - Análisis de datos y reportes
   - Gestión de múltiples proyectos

3. **Optimización de Estimados**
   - Machine learning para predicciones
   - Ajuste automático de precios
   - Análisis de tendencias

4. **Integración con Proveedores**
   - API para precios de materiales
   - Gestión de inventario
   - Pedidos automáticos

## Instrucciones de Desarrollo 💻

### Requisitos Previos
- Node.js 18+
- NPM o Yarn
- Cuenta en Firebase
- API Key de OpenAI

### Instalación
1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno
4. Iniciar desarrollo: `npm run dev`

## Estado Actual del Proyecto 📊
- **Versión**: 1.0.0-beta
- **Estado**: En desarrollo activo
- **Próxima Actualización**: Sistema de pagos y dashboard

## Contribución
El proyecto está en desarrollo activo y las contribuciones son bienvenidas. Por favor, revisa las issues abiertas para ver en qué puedes ayudar.

## Licencia
MIT License - ver archivo LICENSE para más detalles.

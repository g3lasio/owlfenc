# 🧪 Guía de Testing del Sistema de Permisos

## 📋 Resumen
Esta guía te muestra cómo probar el sistema de permisos desde diferentes perspectivas de usuario para validar que el "soft paywall" funcione correctamente.

## 🎯 Páginas de Testing Implementadas

### 1. 🎨 Página de Demo Completa
**URL:** `/permissions-demo`
- **Propósito:** Demostración completa del sistema de permisos
- **Características:** 
  - Panel de uso mensual en tiempo real
  - Botones inteligentes con upgrade prompts  
  - Ejemplos de PermissionGate con demo/bloqueo
  - Información de debug en desarrollo

### 2. 💰 Owl Funding con Permisos
**URL:** `/owl-funding` o `/owlfunding`  
- **Propósito:** Ejemplo real de implementación en funcionalidad existente
- **Características:**
  - Calculadora financiera premium
  - Herramientas de análisis ROI
  - Reportes financieros con acceso limitado
  - Panel de cambio de plan (solo desarrollo)

## 🔄 Cómo Cambiar de Plan para Testing

### Método 1: Panel de Development (Recomendado)
1. Ve a `/owl-funding` 
2. En la parte superior verás un panel naranja "Panel de Testing de Permisos"
3. Haz clic en cualquier plan para simular ser ese tipo de usuario
4. Los cambios son inmediatos y se reflejan en toda la aplicación
5. Usa "🔄 Volver a mi plan real" para resetear

### Método 2: Simulación Manual (Avanzado)
```javascript
// En la consola del navegador, ejecuta:
localStorage.setItem('dev_user_plan_simulation', JSON.stringify({
  currentPlan: 'mero-patron',
  planName: 'Mero Patrón', 
  simulatedAt: new Date().toISOString()
}));
location.reload();
```

### Método 3: Cambio de Plan Real (Producción)
1. Ve a `/subscription` 
2. Selecciona un plan diferente
3. Los cambios se reflejan inmediatamente
4. **Nota:** Este método carga tu cuenta real

## 📊 Planes de Prueba Disponibles

### 🆓 Prueba Gratis (21 días)
- **ID:** `free-trial`
- **Límites:** Acceso completo temporal
- **Testing:** Probar experiencia de nuevos usuarios

### ⚡ Primo Chambeador ($29/mes)
- **ID:** `primo-chambeador` 
- **Límites:** 
  - 10 estimados básicos/mes
  - 5 estimados IA/mes
  - 3 contratos/mes
- **Testing:** Plan básico con restricciones suaves

### ⭐ Mero Patrón ($79/mes) 
- **ID:** `mero-patron`
- **Límites:**
  - 50 estimados básicos/mes
  - 25 estimados IA/mes  
  - 15 contratos/mes
  - Acceso a herramientas financieras
- **Testing:** Plan intermedio más popular

### 👑 Emperador del Negocio ($149/mes)
- **ID:** `emperador-del-negocio`
- **Límites:** Sin límites (ilimitado)
- **Testing:** Experiencia premium completa

## 🎪 Escenarios de Testing Recomendados

### Escenario 1: Usuario Nuevo (Prueba Gratis)
1. Simula plan "Prueba Gratis"
2. Navega por las funcionalidades
3. **Validar:** Todo disponible sin restricciones
4. **Observar:** No debe haber upgrade prompts

### Escenario 2: Usuario Básico (Primo Chambeador)  
1. Simula plan "Primo Chambeador"
2. Intenta crear más de 5 estimados IA
3. **Validar:** Aparecen upgrade prompts
4. **Observar:** Funcionalidades premium deshabilitadas con demo

### Escenario 3: Usuario Premium (Emperador)
1. Simula plan "Emperador del Negocio"
2. Accede a todas las funcionalidades
3. **Validar:** Sin restricciones ni upgrade prompts
4. **Observar:** Badges "Premium" visibles

### Escenario 4: Límites Alcanzados
1. Simula cualquier plan pagado
2. Modifica manualmente el uso mensual:
```javascript
// En consola del navegador
const usage = JSON.parse(localStorage.getItem('user_usage') || '{}');
usage.aiEstimates = 25; // Simular límite alcanzado
localStorage.setItem('user_usage', JSON.stringify(usage));
location.reload();
```
3. **Validar:** Botones deshabilitados con upgrade prompts

## 🔍 Elementos a Validar por Plan

### ✅ Experiencia "Soft Paywall" Correcta
- [ ] Funcionalidades premium visibles pero deshabilitadas
- [ ] Upgrade prompts motivacionales (no agresivos)
- [ ] Demo content disponible en lugar de bloqueo total
- [ ] Contadores de uso claros y precisos
- [ ] Badges de "Premium" en funcionalidades avanzadas

### ❌ Problemas a Detectar
- [ ] Funcionalidades completamente ocultas (hard paywall)
- [ ] Upgrade prompts demasiado frecuentes o agresivos
- [ ] Contadores de uso incorrectos
- [ ] Funcionalidades premium accesibles sin restricciones
- [ ] Mensajes de error confusos

## 🛠️ Herramientas de Debug

### Información de Usuario Actual
```javascript
// Ver plan actual del usuario
console.log('Plan actual:', localStorage.getItem('dev_user_plan_simulation'));

// Ver uso mensual
console.log('Uso mensual:', localStorage.getItem('user_usage'));

// Ver permisos calculados
console.log('Permisos:', window.permissions); // Si está disponible
```

### Reset Completo de Testing
```javascript
// Limpiar todas las simulaciones
localStorage.removeItem('dev_user_plan_simulation');
localStorage.removeItem('user_usage');
location.reload();
```

## 📱 Testing en Mobile

### Responsive Testing
1. Abre DevTools (F12)
2. Cambia a vista mobile (Ctrl/Cmd + Shift + M)
3. Prueba diferentes tamaños de pantalla
4. **Validar:** Upgrade prompts se ven bien en mobile
5. **Observar:** Funcionalidades táctiles funcionan correctamente

## 🚀 Testing en Producción

### Precauciones
- **NUNCA** uses el panel de development en producción
- Usa cuentas de testing separadas
- Los cambios de plan reales afectan facturación
- Coordina con el equipo antes de cambiar planes de producción

### Cuentas de Testing Recomendadas
- Crea cuentas separadas para cada plan
- Usa emails como `test+plan@tudominio.com`
- Documenta las credenciales de testing

## 📈 Métricas a Monitorear

### Conversión de Upgrade
- Clicks en upgrade prompts
- Tiempo hasta upgrade después de límite alcanzado
- Funcionalidades que más generan upgrades

### Experiencia de Usuario  
- Tiempo en páginas con restrictions
- Bounce rate en upgrade prompts
- Satisfacción con demo content

## 🎯 Próximos Pasos de Testing

1. **Validar funcionalidad básica** ✅
2. **Probar todos los planes** 
3. **Validar mobile experience**
4. **Testing de performance**
5. **A/B testing de upgrade prompts**
6. **User feedback collection**

---

## 📞 Soporte de Testing
Si encuentras problemas durante el testing:
1. Toma screenshots de los problemas
2. Incluye información del navegador y plan simulado
3. Describe los pasos para reproducir
4. Verifica que no sea un problema de caché del navegador

¡Happy Testing! 🎉
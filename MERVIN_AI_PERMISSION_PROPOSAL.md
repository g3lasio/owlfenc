# 🤖 PROPUESTA: PERMISOS MERVIN AI POR PLANES DE USUARIO

## 📊 ANÁLISIS DE SITUACIÓN ACTUAL

**SELECTOR DE MODELOS ACTUAL:**
- ❌ **PROBLEMA:** Está conectado parcialmente - la UI funciona pero la lógica no respeta la selección
- ✅ **SOLUCIÓN:** Implementar control real donde "Legacy" = respuestas directas, "Agent mode" = sistema avanzado

---

## 🎯 PROPUESTA DE PERMISOS POR PLAN

### **🔓 FREE TRIAL**
**Mervin AI Limitado:**
- ✅ Solo modo "Legacy" (respuestas directas conversacionales)
- ✅ 10 preguntas por día máximo
- ✅ Consejos básicos de construcción y licencias
- ❌ Sin "Agent mode" (sistema avanzado)
- ❌ Sin generación de documentos
- ❌ Sin análisis DeepSearch

**Mensaje al usuario:** *"¡Hola primo! Estás en Free Trial. Tienes modo Legacy con 10 preguntas diarias. ¿Upgrade para desbloquear Agent mode?"*

---

### **🥉 PRIMO CHAMBEADOR**
**Mervin AI Básico:**
- ✅ Ambos modos: "Legacy" y "Agent mode"
- ✅ 50 preguntas por día con Mervin AI
- ✅ Generación básica de estimados (hasta 10/mes)
- ✅ Consejos de construcción avanzados
- ✅ Análisis de permisos básico
- ❌ Sin generación de contratos completos
- ❌ DeepSearch limitado (5 usos/mes)

**Mensaje al usuario:** *"¡Órale compadre! Tienes acceso a Agent mode. Puedes hacer 50 preguntas diarias y generar estimados básicos."*

---

### **🥈 MERO PATRÓN**
**Mervin AI Profesional:**
- ✅ Acceso completo a ambos modos
- ✅ 200 preguntas por día con Mervin AI
- ✅ Generación ilimitada de estimados y contratos
- ✅ DeepSearch completo (50 usos/mes)
- ✅ Análisis de permisos avanzado
- ✅ Memoria conversacional persistente
- ✅ Recomendaciones inteligentes de materiales

**Mensaje al usuario:** *"¡Perfecto, patrón! Acceso completo a Agent mode con todas las funciones profesionales."*

---

### **👑 MASTER CONTRACTOR**
**Mervin AI Empresarial:**
- ✅ **TODO ILIMITADO**
- ✅ Preguntas ilimitadas con Mervin AI
- ✅ DeepSearch ilimitado
- ✅ Análisis predictivo avanzado
- ✅ Integración con APIs externas
- ✅ **EXCLUSIVO:** Mervin AI puede ejecutar tareas autónomas
- ✅ **EXCLUSIVO:** Generación de reportes empresariales
- ✅ **EXCLUSIVO:** Multi-proyecto simultáneo

**Mensaje al usuario:** *"¡Eres el Master, compadre! Mervin AI modo empresarial con capacidades autónomas completas."*

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### **Control de Permisos en Código:**
```typescript
// Verificación de permisos por plan
const canUseAgentMode = plan !== 'free_trial';
const dailyLimit = getDailyLimit(plan); // free: 10, primo: 50, mero: 200, master: unlimited
const canUseDeepSearch = plan !== 'free_trial';
```

### **UI Adaptativa:**
- **Free Trial:** Solo botón "Legacy" visible
- **Otros planes:** Ambos botones con restricciones mostradas
- **Mensajes informativos:** Explicación clara de límites

### **Upgrade Prompts Inteligentes:**
- Cuando usuario en Free Trial intenta Agent mode → Mostrar upgrade
- Cuando se alcanzan límites diarios → Sugerencia de upgrade
- Integración con sistema de billing existente

---

## 💡 CARACTERÍSTICAS ESPECIALES POR PLAN

### **Free Trial - "Prueba el Poder":**
- Mervin saluda: *"¡Hola primo! Soy tu compadre constructor. En Free Trial tienes modo Legacy. ¿Te ayudo con algo básico?"*

### **Primo Chambeador - "Compadre de Confianza":**
- Mervin saluda: *"¡Órale, primo chambeador! Ahora tienes Agent mode desbloqueado. Podemos hacer magia juntos."*

### **Mero Patrón - "Socio Estratégico":**
- Mervin saluda: *"¡Qué tal, patrón! Con acceso completo puedo ayudarte con proyectos serios. ¿Qué construimos hoy?"*

### **Master Contractor - "CEO Partner":**
- Mervin saluda: *"¡Master Contractor detectado! Modo empresarial activado. Puedo manejar múltiples proyectos simultáneamente."*

---

## ✅ BENEFICIOS DE ESTA PROPUESTA

1. **Monetización Clara:** Cada plan ofrece valor real diferenciado
2. **Experiencia Progresiva:** Usuario siente el upgrade real
3. **Retención Mejorada:** Free users ven el valor del Agent mode
4. **Escalabilidad:** Sistema preparado para futuras funciones

---

## 🚀 IMPLEMENTACIÓN RECOMENDADA

**FASE 1 (Inmediata):**
- Arreglar selector de modelos para que funcione real
- Implementar límites básicos por plan

**FASE 2 (Próxima semana):**
- UI adaptativa completa
- Mensajes personalizados por plan
- Upgrade prompts integrados

**FASE 3 (Futuro):**
- Funciones exclusivas Master Contractor
- Analytics de uso por plan
- Optimización basada en métricas

---

**¿APRUEBAS ESTA PROPUESTA, COMPADRE?** 🤝
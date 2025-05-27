/**
 * Script de diagnóstico para Google Maps API
 * 
 * Este script verifica la configuración de Google Maps API y proporciona
 * información detallada sobre problemas de configuración.
 */

console.log("🔍 Diagnóstico de Google Maps API iniciado...");

// Información del entorno
console.log("📍 Información del entorno:");
console.log("- Dominio actual:", window.location.hostname);
console.log("- URL completa:", window.location.href);
console.log("- Protocolo:", window.location.protocol);

// Verificar API key
const apiKey = 'AIzaSyDKx7Wi1q1aH03e5Wjzrvpj3tjLa2RyMtk';
console.log("🔑 API Key configurada:", apiKey ? `${apiKey.substring(0, 15)}...` : "No encontrada");

// Función para probar la API directamente
async function testGoogleMapsAPI() {
  console.log("🧪 Probando Google Maps API directamente...");
  
  try {
    // Crear script para cargar Google Maps
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    // Función de callback
    window.initGoogleMaps = function() {
      console.log("✅ Google Maps JavaScript API cargada correctamente");
      
      // Verificar servicios disponibles
      if (window.google && window.google.maps) {
        console.log("✅ Objeto google.maps disponible");
        
        if (window.google.maps.places) {
          console.log("✅ Servicio Places disponible");
          
          // Probar AutocompleteService
          try {
            const service = new window.google.maps.places.AutocompleteService();
            console.log("✅ AutocompleteService inicializado correctamente");
            
            // Hacer una petición de prueba
            service.getPlacePredictions({
              input: 'test',
              types: ['address']
            }, (predictions, status) => {
              console.log("📊 Resultado de prueba de AutocompleteService:");
              console.log("- Status:", status);
              console.log("- Predictions:", predictions);
              
              if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                console.log("✅ AutocompleteService funcionando correctamente");
              } else {
                console.log("❌ AutocompleteService falló. Status:", status);
                diagnoseError(status);
              }
            });
            
          } catch (error) {
            console.error("❌ Error al inicializar AutocompleteService:", error);
          }
          
        } else {
          console.error("❌ Servicio Places no disponible");
        }
      } else {
        console.error("❌ Objeto google.maps no disponible");
      }
    };
    
    // Manejar errores de carga del script
    script.onerror = function(error) {
      console.error("❌ Error al cargar el script de Google Maps:", error);
      console.log("🔧 Posibles soluciones:");
      console.log("1. Verificar que la API key sea válida");
      console.log("2. Verificar restricciones de dominio en Google Cloud Console");
      console.log("3. Verificar que las APIs estén habilitadas: Maps JavaScript API, Places API");
    };
    
    document.head.appendChild(script);
    
  } catch (error) {
    console.error("❌ Error general al probar Google Maps API:", error);
  }
}

// Función para diagnosticar errores específicos
function diagnoseError(status) {
  console.log("🔍 Diagnóstico de error:");
  
  switch (status) {
    case 'REQUEST_DENIED':
      console.log("❌ REQUEST_DENIED - La API key es inválida o no tiene permisos");
      console.log("🔧 Soluciones:");
      console.log("1. Verificar que la API key sea correcta");
      console.log("2. Verificar restricciones de referrer/dominio");
      console.log("3. Verificar que Places API esté habilitada");
      break;
      
    case 'OVER_QUERY_LIMIT':
      console.log("❌ OVER_QUERY_LIMIT - Se excedió el límite de consultas");
      console.log("🔧 Soluciones:");
      console.log("1. Verificar el uso de la API en Google Cloud Console");
      console.log("2. Aumentar el límite o esperar hasta el reinicio del período");
      break;
      
    case 'INVALID_REQUEST':
      console.log("❌ INVALID_REQUEST - Parámetros de la petición inválidos");
      break;
      
    default:
      console.log("❌ Error desconocido:", status);
  }
}

// Verificar configuración de dominio
function checkDomainConfig() {
  console.log("🌐 Verificando configuración de dominio:");
  
  const domains = [
    window.location.hostname,
    `*.${window.location.hostname}`,
    'localhost',
    '*.replit.dev',
    '*.replit.com',
    '*.riker.replit.dev'
  ];
  
  console.log("📋 Dominios que deberían estar en las restricciones:");
  domains.forEach(domain => console.log(`  - ${domain}`));
  
  console.log("\n🔧 Para configurar dominios en Google Cloud Console:");
  console.log("1. Ve a Google Cloud Console");
  console.log("2. Navega a 'APIs & Services' > 'Credentials'");
  console.log("3. Edita tu API key");
  console.log("4. En 'Application restrictions', selecciona 'HTTP referrers'");
  console.log("5. Agrega estos dominios a la lista");
}

// Ejecutar diagnóstico
console.log("🚀 Iniciando diagnóstico completo...");
checkDomainConfig();
testGoogleMapsAPI();

// Verificar variables de entorno
console.log("🔧 Variables de entorno:");
console.log("- NODE_ENV:", process?.env?.NODE_ENV || "no disponible");
console.log("- Modo desarrollo:", window.location.hostname.includes('replit'));
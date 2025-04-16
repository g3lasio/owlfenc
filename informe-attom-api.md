# Informe Diagnóstico API ATTOM

## Resumen del problema
Se han realizado pruebas exhaustivas con la API key de ATTOM proporcionada y todos los intentos de acceso a los servicios de la API han devuelto errores de autorización (código 401 - Unauthorized).

## Detalles de las pruebas realizadas

### Información de la API key
- **Longitud de la API key**: 32 caracteres
- **Formato**: Alfanumérica sin guiones ni puntos
- **Primeros caracteres**: 195...
- **Últimos caracteres**: ...d93

### Pruebas de endpoints
Se han probado todos los siguientes endpoints de la API de ATTOM:
- `/property/basicprofile`
- `/property/expandedprofile`
- `/property/detailowner`
- `/property/detail`
- `/property/detailmortgage`
- `/property/detailmortgageowner`
- `/sale/snapshot`
- `/sale/detail`
- Más de 20 otros endpoints documentados

### Formatos de headers probados
Se ha intentado con diferentes variantes de headers para la autenticación:
- `{ 'apikey': API_KEY }`
- `{ 'APIKey': API_KEY }`
- `{ 'api_key': API_KEY }`
- `{ 'api-key': API_KEY }`
- `{ 'X-API-Key': API_KEY }`
- `{ 'Authorization': 'Bearer ' + API_KEY }`

### Formatos de dirección probados
Se han probado múltiples formatos de dirección para la búsqueda de propiedades:
- Con separación por comas (ej: "1234 Main St, Los Angeles, CA 90001")
- Sin separación por comas (ej: "1234 Main St Los Angeles CA 90001")
- Con diferentes abreviaturas (ej: "St" vs "Street" y "CA" vs "California")
- Con el parámetro `address1` solo conteniendo número y calle
- Con `address1` conteniendo la dirección completa

## Mensajes de error recibidos
Los mensajes de error recibidos consistentemente son:

```json
{
  "Response": {
    "status": {
      "version": "1.0.0",
      "code": "401",
      "msg": "Unauthorized",
      "total": "0",
      "page": "0",
      "pagesize": "0"
    }
  }
}
```

## Diagnóstico y posibles causas

Basándose en los resultados de las pruebas, se identifican las siguientes posibles causas del problema:

1. **API key inválida o expirada**: El error 401 (Unauthorized) indica consistentemente que la API key no es reconocida por el servicio.

2. **Falta de suscripción activa**: Es posible que la cuenta asociada a la API key no tenga una suscripción activa para los servicios solicitados.

3. **Restricciones de IP**: Algunos servicios API limitan el acceso a IPs específicas. Es posible que la API key esté configurada para funcionar solo desde determinadas direcciones IP.

4. **Formato de API key incorrecto**: Aunque se ha probado con múltiples formatos de header, es posible que la API requiera un formato específico no documentado o que haya cambiado recientemente.

5. **Cambios en la API**: ATTOM podría haber actualizado su API y la documentación disponible podría estar desactualizada.

## Recomendaciones para soporte técnico

Al contactar con soporte técnico de ATTOM, se recomienda proporcionar la siguiente información:

1. La API key utilizada (por razones de seguridad, no incluida en este informe)
2. La fecha y hora de las pruebas realizadas: 16 de abril de 2025
3. Los códigos de error recibidos (401 - Unauthorized)
4. Confirmar si la cuenta tiene permisos activos para acceder a datos de propiedades
5. Verificar si existen restricciones de IP para el uso de la API key
6. Solicitar un ejemplo funcional de cómo autenticar correctamente las solicitudes a la API

## Notas adicionales

- Todas las pruebas se realizaron utilizando HTTPS con el agente de keepAlive habilitado
- Se respetaron los tiempos de espera adecuados entre solicitudes para evitar limitaciones de tasa
- Se ha utilizado Axios como cliente HTTP para todas las pruebas
- Las pruebas fueron ejecutadas desde un entorno Replit
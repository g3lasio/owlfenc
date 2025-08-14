import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { networkErrorHandler } from "./network-error-handler";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  
  // Obtener token de Firebase si el usuario está autenticado
  if (auth.currentUser) {
    try {
      // Retry logic para obtener token con timeout
      const token = await retryWithTimeout(
        () => auth.currentUser!.getIdToken(false), // Force refresh = false por defecto
        3, // 3 intentos
        5000 // 5 segundos timeout
      );
      headers["Authorization"] = `Bearer ${token}`;
      console.log("🔐 [API-REQUEST] Token de autenticación incluido en request");
    } catch (error: any) {
      console.warn("⚠️ [API-REQUEST] Error obteniendo token de Firebase:", {
        code: error?.code || 'unknown',
        message: error?.message || 'Network error',
        type: error?.name || 'Error'
      });
      
      // Intentar con refresh forzado si el primer intento falla
      try {
        console.log("🔄 [API-REQUEST] Intentando refresh forzado del token...");
        const refreshedToken = await retryWithTimeout(
          () => auth.currentUser!.getIdToken(true), // Force refresh = true
          2, // 2 intentos para refresh
          10000 // 10 segundos timeout para refresh
        );
        headers["Authorization"] = `Bearer ${refreshedToken}`;
        console.log("✅ [API-REQUEST] Token refrescado exitosamente");
      } catch (refreshError: any) {
        console.error("❌ [API-REQUEST] Error crítico obteniendo token:", {
          originalError: error?.code || 'unknown',
          refreshError: refreshError?.code || 'unknown',
          action: 'continuing_without_auth'
        });
        // Continuar sin token en lugar de fallar completamente
      }
    }
  } else {
    console.warn("⚠️ [API-REQUEST] Usuario no autenticado - enviando request sin token");
  }
  
  return headers;
}

// Función helper para retry con timeout
async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  retries: number,
  timeoutMs: number
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), timeoutMs);
        })
      ]);
    } catch (error: any) {
      if (i === retries - 1) throw error;
      
      // Backoff exponencial
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      console.log(`🔄 [RETRY] Intento ${i + 1}/${retries} falló, reintentando en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Maximum retries exceeded');
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Obtener headers de autenticación con retry
  const authHeaders = await getAuthHeaders();
  
  // Combinar headers
  const headers = {
    ...authHeaders,
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  console.log(`🌐 [API-REQUEST] ${method} ${url} - Con autenticación: ${!!authHeaders.Authorization}`);

  try {
    // Implementar fetch con timeout
    const res = await Promise.race([
      fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // Reducido a 10 segundos
      })
    ]);

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    // Usar el manejador de errores antes de hacer log o lanzar
    const handledError = networkErrorHandler.handleQueryError(error, { queryKey: [url] });
    if (!handledError) {
      // Error fue silenciado, retornar respuesta mock
      return new Response('{"error": "Network error handled silently", "offline": true}', { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Solo log si el error no fue silenciado
    console.debug(`🔧 [API-REQUEST] Network error in ${method} ${url}:`, {
      message: error?.message || 'Unknown error',
      type: error?.name || 'Error'
    });
    
    throw handledError;
  }
}

// Métodos para facilitar el uso de las llamadas API
apiRequest.get = (url: string) => apiRequest("GET", url).then(res => res.json());
apiRequest.post = (url: string, data?: unknown) => apiRequest("POST", url, data).then(res => res.json());
apiRequest.patch = (url: string, data?: unknown) => apiRequest("PATCH", url, data).then(res => res.json());
apiRequest.delete = (url: string) => apiRequest("DELETE", url).then(res => res.json());

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Obtener headers de autenticación para queries también
    const authHeaders = await getAuthHeaders();
    
    console.log(`🔍 [QUERY] GET ${queryKey[0]} - Con autenticación: ${!!authHeaders.Authorization}`);

    try {
      // Implementar fetch con timeout para queries
      const res = await Promise.race([
        fetch(queryKey[0] as string, {
          headers: authHeaders,
          credentials: "include",
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 8000); // Reducido a 8 segundos para queries
        })
      ]);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn(`🔐 [QUERY] 401 Unauthorized en ${queryKey[0]} - retornando null`);
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      // Usar el manejador de errores para queries
      const handledError = networkErrorHandler.handleQueryError(error, { queryKey });
      if (!handledError) {
        // Error fue silenciado
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        // Retornar datos mock si no puede ser null
        return { error: "Network error handled silently", offline: true };
      }
      
      // Solo log si el error no fue silenciado
      console.debug(`🔧 [QUERY] Network error in GET ${queryKey[0]}:`, {
        message: error?.message || 'Unknown error',
        type: error?.name || 'Error'
      });
      
      // Si es un error de timeout o red y el comportamiento es returnNull, devolver null
      if (unauthorizedBehavior === "returnNull" && 
          (error?.message?.includes('timeout') || error?.message?.includes('fetch'))) {
        return null;
      }
      
      throw handledError;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error: any) => {
        // Solo reintentar en errores de red, no en errores 4xx o 5xx
        if (error?.message?.includes('timeout') || 
            error?.message?.includes('fetch') ||
            error?.message?.includes('network')) {
          return failureCount < 2; // Máximo 2 reintentos para errores de red
        }
        return false; // No reintentar otros errores
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Reintentar mutaciones solo en errores de red
        if (error?.message?.includes('timeout') || 
            error?.message?.includes('fetch') ||
            error?.message?.includes('network')) {
          return failureCount < 1; // Solo 1 reintento para mutaciones
        }
        return false;
      },
      retryDelay: 2000, // 2 segundos de delay para reintentos de mutaciones
    },
  },
});

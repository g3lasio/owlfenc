import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth, safeGetIdToken } from "@/lib/firebase";
import { unifiedErrorHandler } from "./unified-error-handler";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  
  // ✅ FIXED: Obtener token de Firebase si el usuario está autenticado
  if (auth.currentUser) {
    try {
      // PRIORITY: Intentar obtener token Firebase real
      const token = await safeGetIdToken(auth.currentUser, false);
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["x-firebase-uid"] = auth.currentUser.uid;
        if (window.location.search.includes('debug=auth')) {
          console.debug("🔧 [AUTH-DEBUG] Real Firebase token included");
        }
      } else {
        // FALLBACK 1: Intentar refresh forzado una vez
        try {
          const refreshedToken = await safeGetIdToken(auth.currentUser, true);
          
          if (refreshedToken) {
            headers["Authorization"] = `Bearer ${refreshedToken}`;
            headers["x-firebase-uid"] = auth.currentUser.uid;
            if (window.location.search.includes('debug=auth')) {
              console.debug("🔧 [AUTH-DEBUG] Refreshed Firebase token included");
            }
          } else {
            // FALLBACK 2: Usar bypass temporal para usuario específico
            if (auth.currentUser.uid === 'qztot1YEy3UWz605gIH2iwwWhW53') {
              headers["x-bypass-uid"] = auth.currentUser.uid;
              headers["x-firebase-uid"] = auth.currentUser.uid;
              console.log("🔧 [AUTH-BYPASS] Using temporary bypass for troubleshooting");
            } else {
              // FALLBACK 3: Headers solo con UID para otros usuarios
              headers["x-firebase-uid"] = auth.currentUser.uid;
              console.debug("🔧 [AUTH-FALLBACK] Using UID-only headers");
            }
          }
        } catch {
          // FINAL FALLBACK: Solo headers de UID
          headers["x-firebase-uid"] = auth.currentUser.uid;
          if (auth.currentUser.uid === 'qztot1YEy3UWz605gIH2iwwWhW53') {
            headers["x-bypass-uid"] = auth.currentUser.uid;
          }
        }
      }
    } catch {
      // EMERGENCY FALLBACK: Solo incluir UID si está disponible
      if (auth.currentUser?.uid) {
        headers["x-firebase-uid"] = auth.currentUser.uid;
        if (auth.currentUser.uid === 'qztot1YEy3UWz605gIH2iwwWhW53') {
          headers["x-bypass-uid"] = auth.currentUser.uid;
        }
      }
    }
  } else {
    if (window.location.search.includes('debug=auth')) {
      console.debug("🔧 [AUTH-DEBUG] No authenticated user");
    }
  }
  
  return headers;
}

// Función helper simplificada sin unhandled rejections
async function safeTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> {
  try {
    let timeoutId: NodeJS.Timeout | undefined;
    
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => resolve(null), timeoutMs);
    });

    const result = await Promise.race([
      promise.catch(() => null), // Convertir errores a null
      timeoutPromise
    ]);
    
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch {
    return null; // Silenciar cualquier error
  }
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

  // Solo log en modo debug para reducir spam de console
  if (window.location.search.includes('debug=api')) {
    console.debug(`🔧 [API-DEBUG] ${method} ${url.substring(0, 30)} - Auth: ${!!authHeaders.Authorization}`);
  }

  try {
    // Fetch simplificado con timeout silencioso
    const fetchPromise = fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Timeout EXTENDIDO para operaciones DeepSearch intensivas (Reality Validation puede tomar hasta 2 minutos)
    const timeoutMs = url.includes('deepsearch') || url.includes('labor-deepsearch') ? 120000 : 10000;
    const res = await safeTimeout(fetchPromise, timeoutMs);
    
    if (!res) {
      const errorMsg = url.includes('deepsearch') || url.includes('labor-deepsearch') 
        ? 'DeepSearch request timeout (2min) - Reality Validation took too long'
        : 'Request timeout or failed';
      throw new Error(errorMsg);
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    // Usar el manejador de errores unificado
    const handledError = unifiedErrorHandler.handleError(error, `API ${method} ${url}`);
    if (!handledError) {
      // Error fue silenciado, retornar respuesta mock
      return new Response('{"error": "Network error handled silently", "offline": true}', { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Solo log en modo debug explícito
    if (window.location.search.includes('debug=network')) {
      console.debug(`🔧 [NETWORK-DEBUG] ${method} ${url}:`, error?.message?.substring(0, 30) || 'error');
    }
    
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
    
    // Solo log en modo debug para reducir spam de console
    if (window.location.search.includes('debug=api')) {
      console.debug(`🔧 [QUERY-DEBUG] GET ${(queryKey[0] as string).substring(0, 30)} - Auth: ${!!authHeaders.Authorization}`);
    }

    try {
      // ✅ FIXED: Implementar fetch con timeout para queries con headers completos
      const res = await Promise.race([
        fetch(queryKey[0] as string, {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          },
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
      // Usar el manejador de errores unificado para queries
      const handledError = unifiedErrorHandler.handleError(error, `Query ${queryKey[0]}`);
      if (!handledError) {
        // Error fue silenciado
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        // Retornar datos mock si no puede ser null
        return { error: "Network error handled silently", offline: true };
      }
      
      // Solo log en modo debug explícito
      if (window.location.search.includes('debug=network')) {
        console.debug(`🔧 [QUERY-DEBUG] ${queryKey[0]}:`, error?.message?.substring(0, 30) || 'error');
      }
      
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

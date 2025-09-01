import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { circuitBreaker } from "./circuit-breaker";
import { unifiedAuthManager } from "./unified-auth-manager";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  
  // Usar unified auth manager para obtener token SIN retry automático
  const user = unifiedAuthManager.getCurrentUser();
  if (user) {
    const token = await unifiedAuthManager.getCurrentToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

// Sistema simplificado con circuit breaker - safeTimeout ya no es necesario

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Usar circuit breaker para el request completo
  const result = await circuitBreaker.executeRequest(
    async () => {
      const authHeaders = await getAuthHeaders();
      
      const headers = {
        ...authHeaders,
        ...(data ? { "Content-Type": "application/json" } : {}),
      };

      const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });

      await throwIfResNotOk(res);
      return res;
    },
    `${method} ${url}`,
    `api_${method}_${url}`,
    10000 // Cache por 10 segundos para evitar duplicados
  );

  if (result.success && result.data) {
    return result.data;
  }

  if (result.circuitOpen) {
    // Circuito abierto - retornar respuesta mock para continuar
    return new Response('{"error": "Conectividad temporalmente bloqueada", "offline": true}', { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  throw new Error(result.error || 'Request falló');
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
    const url = queryKey[0] as string;
    
    // Usar circuit breaker para queries también
    const result = await circuitBreaker.executeRequest(
      async () => {
        const authHeaders = await getAuthHeaders();
        
        const res = await fetch(url, {
          headers: authHeaders,
          credentials: "include",
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }

        await throwIfResNotOk(res);
        return await res.json();
      },
      `query ${url}`,
      `query_${url}`,
      30000 // Cache queries por 30 segundos
    );

    if (result.success) {
      return result.data;
    }

    if (result.circuitOpen) {
      // Si el circuito está abierto y se permite null, retornar null
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      // Sino retornar datos offline
      return { error: "Conectividad temporalmente bloqueada", offline: true };
    }

    // Si es error y se permite null, retornar null para errors de red
    if (unauthorizedBehavior === "returnNull" && 
        (result.error?.includes('timeout') || result.error?.includes('fetch'))) {
      return null;
    }
    
    throw new Error(result.error || 'Query falló');
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 segundos stale time para reducir requests
      retry: false, // Circuit breaker maneja retries - deshabilitar retry de TanStack
    },
    mutations: {
      retry: false, // Circuit breaker maneja retries - deshabilitar retry de TanStack
    },
  },
});

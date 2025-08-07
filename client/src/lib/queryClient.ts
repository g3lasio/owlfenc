import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

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
      const token = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
      console.log("🔐 [API-REQUEST] Token de autenticación incluido en request");
    } catch (error) {
      console.warn("⚠️ [API-REQUEST] Error obteniendo token de Firebase:", error);
    }
  } else {
    console.warn("⚠️ [API-REQUEST] Usuario no autenticado - enviando request sin token");
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Obtener headers de autenticación
  const authHeaders = await getAuthHeaders();
  
  // Combinar headers
  const headers = {
    ...authHeaders,
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  console.log(`🌐 [API-REQUEST] ${method} ${url} - Con autenticación: ${!!authHeaders.Authorization}`);

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
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

    const res = await fetch(queryKey[0] as string, {
      headers: authHeaders,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

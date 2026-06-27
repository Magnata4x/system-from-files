import axios, { type InternalAxiosRequestConfig } from "axios";
import { supabase } from "@/integrations/supabase/client";
import { Sentry } from "./sentry";
import { generateTraceId, getTraceId, setTraceId } from "./trace-context";

// InternalAxiosRequestConfig augmentado com nosso traceId para correlação.
type TracedConfig = InternalAxiosRequestConfig & { _traceId?: string; _retry?: boolean };


// Em produção, EXIGIR VITE_API_BASE_URL. Em dev, cair para localhost.
// Sem esse fail-fast, o app começaria a enviar o JWT do usuário para
// http://localhost:3001 no navegador final — risco real se houver qualquer
// processo escutando essa porta na máquina do cliente.
function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envUrl) return envUrl;
  if (import.meta.env.PROD) {
    console.error(
      "[apiClient] VITE_API_BASE_URL não definida em produção. " +
        "Bloqueando chamadas REST para evitar enviar o token a um host local.",
    );
    return "";
  }
  return "http://localhost:3001/api";
}

const BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  // withCredentials removido: a autenticação é Bearer JWT no header.
  // Cookies de sessão não são usados; manter `withCredentials: true` abriria
  // superfície de CSRF sem mitigação correspondente.
});

// Anexa o token JWT do Supabase + propaga um trace ID por requisição.
apiClient.interceptors.request.use(async (config) => {
  if (!BASE_URL) {
    return Promise.reject(new Error("API base URL não configurada"));
  }
  const traced = config as TracedConfig;
  const traceId = traced._traceId ?? generateTraceId();
  traced._traceId = traceId;
  config.headers["x-trace-id"] = traceId;
  // Propaga via contexto para que o interceptor de erro / WS possam ler
  // o trace_id sem depender de error.config.
  setTraceId(traceId);

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Renovação em 401 + captura estruturada de erros no Sentry.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = (error.config ?? {}) as TracedConfig;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && data.session) {
        original.headers!.Authorization = `Bearer ${data.session.access_token}`;
        return apiClient(original);
      }
    }
    const traceId = original._traceId ?? getTraceId();
    Sentry.withScope((scope) => {
      if (traceId) scope.setTag("trace_id", traceId);
      scope.setContext("request", {
        url: original.url,
        method: original.method,
        status: error.response?.status,
      });
      Sentry.captureException(error);
    });
    return Promise.reject(error);
  }
);


// Helper compatível com o uso anterior (api.get/post/...)
export const api = {
  get: <T = unknown>(path: string) => apiClient.get<T>(path).then((r) => r.data),
  post: <T = unknown>(path: string, body: unknown) => apiClient.post<T>(path, body).then((r) => r.data),
  patch: <T = unknown>(path: string, body: unknown) => apiClient.patch<T>(path, body).then((r) => r.data),
  put: <T = unknown>(path: string, body: unknown) => apiClient.put<T>(path, body).then((r) => r.data),
  delete: <T = unknown>(path: string) => apiClient.delete<T>(path).then((r) => r.data),
};

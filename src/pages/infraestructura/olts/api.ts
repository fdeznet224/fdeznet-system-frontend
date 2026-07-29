import type {
  OltClientSearchItem,
  OltConfigItem,
  OltDiagnosticoCliente,
  OltMonitoreoApi,
  OltMonitoreoCliente,
  OltOnuApiItem,
  OltOnusResponse,
} from "./types";

type ApiEnvelope<T> = {
  status?: string;
  data?: T;
  detail?: string;
  mensaje?: string;
  results?: T;
};

type JsonRecord = Record<string, unknown>;

const env = import.meta.env;

function cleanBase(value?: string | null): string | null {
  if (!value) return null;
  return String(value).replace(/\/+$/, "");
}

/**
 * Local:
 *   http://127.0.0.1:8000/api
 *
 * Producción:
 *   VITE_VSOL_API_BASE=https://tu-dominio.com/api
 */
const API_BASE =
  cleanBase(env.VITE_VSOL_API_BASE) ||
  cleanBase(env.VITE_API_URL_DIRECT) ||
  (env.PROD ? "/api" : "http://127.0.0.1:8000/api");

function buildUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `${API_BASE}/${clean}`;
}

function unwrap<T>(payload: ApiEnvelope<T> | T | null): T {
  if (payload && typeof payload === "object") {
    if ("data" in payload && (payload as ApiEnvelope<T>).data !== undefined) {
      return (payload as ApiEnvelope<T>).data as T;
    }
    if ("results" in payload && (payload as ApiEnvelope<T>).results !== undefined) {
      return (payload as ApiEnvelope<T>).results as T;
    }
  }
  return payload as T;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findTokenInObject(value: unknown, depth = 0): string | null {
  if (!value || depth > 3) return null;

  if (typeof value === "string") {
    if (value.split(".").length === 3 || value.startsWith("Bearer ")) return value;
    return null;
  }

  if (!isRecord(value)) return null;

  const tokenKeys = ["token", "access_token", "accessToken", "authToken", "jwt", "idToken"];

  for (const key of tokenKeys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate) return candidate;
  }

  for (const key of Object.keys(value)) {
    const found = findTokenInObject(value[key], depth + 1);
    if (found) return found;
  }

  return null;
}

function getAuthToken(): string | null {
  const directKeys = [
    "token",
    "access_token",
    "accessToken",
    "authToken",
    "jwt",
    "fdeznet_token",
    "session",
    "user",
    "auth",
  ];

  for (const key of directKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    if (raw.split(".").length === 3 || raw.startsWith("Bearer ")) return raw;

    try {
      const parsed = JSON.parse(raw);
      const found = findTokenInObject(parsed);
      if (found) return found;
    } catch {
      // no es JSON
    }
  }

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const found = findTokenInObject(parsed);
      if (found) return found;
    } catch {
      // no es JSON
    }
  }

  return null;
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getAuthToken();

  if (token) headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

  return headers;
}

async function apiGet<T>(path: string, options?: { requireAuth?: boolean }): Promise<T> {
  const token = getAuthToken();

  if (options?.requireAuth && !token) {
    throw new Error("No hay token de sesión en localStorage.");
  }

  const response = await fetch(buildUrl(path), {
    method: "GET",
    headers: authHeaders(),
  });

  let payload: ApiEnvelope<T> | T | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      (payload as ApiEnvelope<T> | null)?.detail ||
      (payload as ApiEnvelope<T> | null)?.mensaje ||
      `HTTP ${response.status}`;

    throw new Error(String(detail));
  }

  return unwrap<T>(payload);
}

export async function getOlts(): Promise<OltConfigItem[]> {
  const data = await apiGet<OltConfigItem[] | { olts?: OltConfigItem[] }>("olts/");
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.olts)) return data.olts;
  return [];
}

export async function getClientesForOltSearch(): Promise<OltClientSearchItem[]> {
  if (!getAuthToken()) return [];

  try {
    const data = await apiGet<OltClientSearchItem[] | {
      clientes?: OltClientSearchItem[];
      items?: OltClientSearchItem[];
      data?: OltClientSearchItem[];
    }>("clientes/", { requireAuth: true });
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.clientes)) return data.clientes;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
  } catch {
    return [];
  }

  return [];
}

export async function getDiagnosticoClienteOlt(clienteId: number): Promise<OltDiagnosticoCliente> {
  return apiGet<OltDiagnosticoCliente>(`olts/diagnostico-cliente-api/${clienteId}`);
}

export async function getOltMonitoreoApi(oltId: number): Promise<OltMonitoreoApi> {
  return apiGet<OltMonitoreoApi>(`olts/${oltId}/monitoreo-api`);
}

export async function getOltMonitoreoSnmp(oltId: number): Promise<OltMonitoreoApi> {
  const raw = await apiGet<unknown>(`olts/${oltId}/monitoreo-vivo`);
  const rawRecord = isRecord(raw) ? raw : {};
  const nestedPayload = rawRecord.data ?? rawRecord.results ?? raw;
  const payload = isRecord(nestedPayload) ? nestedPayload : {};

  const toRecordArray = (value: unknown): JsonRecord[] =>
    Array.isArray(value) ? value.filter(isRecord) : [];
  const firstText = (item: JsonRecord, keys: string[], fallback: string): string => {
    for (const key of keys) {
      const value = item[key];
      if (value !== null && value !== undefined && value !== "") return String(value);
    }
    return fallback;
  };
  const normalizeOnu = (item: JsonRecord, fallbackStatus: string): OltOnuApiItem => ({
    ...item,
    identificador: firstText(item, ["identificador", "serial", "sn"], ""),
    serial: firstText(item, ["serial", "identificador", "sn"], ""),
    onu_id: firstText(item, ["onu_id", "pon_onu", "pon", "puerto"], "N/A"),
    estado_fisico: firstText(item, ["estado_fisico", "status"], fallbackStatus),
    status: firstText(item, ["status", "estado_fisico"], fallbackStatus),
  });

  const clientesActivos: OltMonitoreoCliente[] = toRecordArray(payload.clientes_activos);
  const clientesCaidos: OltMonitoreoCliente[] = toRecordArray(payload.clientes_caidos);
  const onusDesconocidas: OltOnuApiItem[] = toRecordArray(payload.onus_desconocidas);

  const activosNormalizados = clientesActivos.map(item => normalizeOnu(item, "online"));
  const caidosNormalizados = clientesCaidos.map(item => ({
    ...normalizeOnu(item, "offline"),
    rx_power: firstText(item, ["rx_power"], "LOS"),
  }));
  const desconocidasNormalizadas = onusDesconocidas.map(item => normalizeOnu(item, "online"));

  return {
    ...(payload as OltMonitoreoApi),
    origen: "snmp",
    clientes_activos: clientesActivos,
    clientes_caidos: clientesCaidos,
    onus_desconocidas: onusDesconocidas,
    onus_api: [
      ...activosNormalizados,
      ...caidosNormalizados,
      ...desconocidasNormalizadas,
    ],
  };
}

export async function getOltOnusApi(oltId: number): Promise<OltOnusResponse> {
  return apiGet<OltOnusResponse>(`olts/${oltId}/onus-api`);
}

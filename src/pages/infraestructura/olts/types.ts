/** Contratos y normalizadores exclusivos del módulo OLT. */
export type OltPhysicalStatus = "online" | "offline" | string;

export interface OltConfigItem {
  id: number;
  nombre?: string;
  ip?: string;
  comunidad?: string;
  tecnologia?: string;
  modelo?: string;
  tipo_integracion?: string;
  api_enabled?: boolean;
  api_protocol?: string;
  api_port?: number;
  api_user?: string;
  api_verify_ssl?: boolean;
  is_active?: boolean;
}

export interface OltSavePayload {
  nombre: string;
  ip: string;
  comunidad: string;
  tecnologia: string;
  modelo: string | null;
  tipo_integracion: string;
  api_enabled: boolean;
  api_protocol: string;
  api_port: number;
  api_user: string | null;
  api_verify_ssl: boolean;
  api_password?: string;
}

export interface OltOnuApiItem {
  onu_id?: string;
  slot_id?: string;
  pon_id?: string;
  onuid?: string;
  identificador?: string;
  serial?: string;
  modelo?: string;
  profile?: string;
  mode?: string;
  state?: string;
  active_action_state?: string;
  admin_state?: string;
  omcc_state?: string;
  phase_state?: string;
  alive_time?: string;
  last_register_time?: string;
  last_deregister_time?: string;
  last_deregister_reason?: string;
  rx_power?: string;
  tx_power?: string;
  rx_state?: string;
  tx_state?: string;
  description?: string;
  estado_fisico?: OltPhysicalStatus;
  status?: OltPhysicalStatus;
  recomendacion?: string;
  [key: string]: unknown;
}

export interface OltClientSearchItem {
  id: number;
  nombre?: string;
  cedula?: string;
  telefono?: string;
  ip_asignada?: string;
  direccion?: string;
  estado?: string;
  olt_id?: number;
  onu_id?: number;
  user_pppoe?: string;
  correo?: string;
  mac_address?: string;
  [key: string]: unknown;
}

export interface OltMonitoreoCliente {
  id_cliente?: number;
  cliente_id?: number;
  id?: number;
  nombre?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  correo?: string;
  ip_asignada?: string;
  user_pppoe?: string;
  mac_address?: string;
  olt_id?: number;
  onu_id_inventario?: number;
  caja_nap_id?: number;
  puerto_nap?: number;
  identificador?: string;
  serial?: string;
  rx_power?: string;
  estado_fisico?: string;
  estado_fdeznet?: string;
  recomendacion?: string;
  [key: string]: unknown;
}

export interface OltMonitoreoApi {
  olt_nombre?: string;
  tecnologia?: string;
  origen?: string;
  resumen?: {
    activos?: number;
    caidos?: number;
    desconocidos?: number;
    [key: string]: unknown;
  };
  clientes_activos?: OltMonitoreoCliente[];
  clientes_caidos?: OltMonitoreoCliente[];
  onus_desconocidas?: OltOnuApiItem[];
  onus_api?: OltOnuApiItem[];
}

export interface OltOnusResponse {
  olt_id?: number;
  olt_nombre?: string;
  tecnologia?: string;
  origen?: string;
  total_onus?: number;
  onus?: OltOnuApiItem[];
}

export interface OltDiagnosticoCliente {
  cliente_id: number;
  nombre: string;
  identificador: string;
  onu_id?: string;
  modelo?: string;
  profile?: string;
  potencia?: string;
  rx_power?: string;
  tx_power?: string;
  estado_fisico?: OltPhysicalStatus;
  phase_state?: string;
  admin_state?: string;
  omcc_state?: string;
  alive_time?: string;
  last_register_time?: string;
  last_deregister_time?: string;
  last_deregister_reason?: string;
  tecnologia?: string;
  origen?: string;
  coincidencias_serial?: number;
  recomendacion?: string;
}

export function normalizeSerial(serial?: string | null): string {
  return (serial || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function parsePower(value?: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).replace("dBm", "").trim();
  if (!raw || raw.toUpperCase() === "N/A" || raw.toUpperCase().includes("LOS")) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getPowerLevel(rx?: string | number | null): "excellent" | "warning" | "critical" | "offline" {
  const n = parsePower(rx);
  if (n === null) return "offline";
  if (n <= -27) return "critical";
  if (n <= -24) return "warning";
  return "excellent";
}

export function getPowerLabel(rx?: string | number | null): string {
  const level = getPowerLevel(rx);
  if (level === "excellent") return "Excelente";
  if (level === "warning") return "Regular";
  if (level === "critical") return "Crítica";
  return "Sin señal";
}

export function getPonFromOnuId(onuId?: string): string {
  if (!onuId) return "N/A";
  const match = onuId.match(/GPON\d+\/(\d+)/i);
  return match?.[1] || "N/A";
}

export function isOnuOnline(onu?: Pick<OltOnuApiItem, "estado_fisico" | "status" | "phase_state" | "rx_power">): boolean {
  if (!onu) return false;
  const status = String(onu.estado_fisico || onu.status || "").toLowerCase();
  const phase = String(onu.phase_state || "").toLowerCase();
  return status === "online" || phase === "working" || parsePower(onu.rx_power) !== null;
}

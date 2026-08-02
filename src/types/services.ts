export type ServiceStatus =
  | 'pendiente_instalacion'
  | 'activo'
  | 'suspendido'
  | 'cancelado'
  | 'retirado'
  | 'eliminado'
  | string;

export interface ClientService {
  id: number;
  cliente_id: number;
  alias: string;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  router_id?: number | null;
  plan_id?: number | null;
  plantilla_id?: number | null;
  zona_id?: number | null;
  red_id?: number | null;
  olt_id?: number | null;
  caja_nap_id?: number | null;
  puerto_nap?: number | null;
  tecnico_id?: number | null;
  onu_id?: number | null;
  ip_asignada?: string | null;
  mac_address?: string | null;
  user_pppoe?: string | null;
  is_online: boolean;
  estado: ServiceStatus;
  tipo_facturacion: 'prepago' | 'postpago';
  ciclo_facturacion: 'calendario' | 'aniversario';
  fecha_instalacion?: string | null;
  fecha_activacion?: string | null;
  fecha_inicio_cobro?: string | null;
  proxima_facturacion?: string | null;
  meses_gratis: number;
  created_at: string;
  plan?: {
    id: number;
    nombre: string;
    precio: number | string;
    router_id?: number | null;
  } | null;
  router?: {
    id: number;
    nombre: string;
  } | null;
}

export function serviceDisplayName(service: ClientService) {
  return `${service.alias || `Servicio #${service.id}`} · ${service.direccion || 'Sin dirección'}`;
}

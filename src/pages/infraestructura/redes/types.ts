export interface RouterOption {
    id: number;
    nombre: string;
    ip_vpn: string;
}

export interface RedRecord {
    id: number;
    router_id: number;
    nombre: string;
    cidr: string;
    gateway: string | null;
    /** 'clientes' = IP de clientes; 'antenas' = pool de IP de administración de antenas. */
    tipo: 'clientes' | 'antenas';
    ip_inicio: string | null;
    ip_fin: string | null;
}

export type EstadoIp = 'libre' | 'cliente' | 'baja' | 'equipo' | 'mikrotik' | 'gateway';

export interface FilaIp {
    ip: string;
    estado: EstadoIp;
    en_rango: boolean;
    detalle?: string | null;
    cliente_id?: number | null;
    cliente_estado?: string | null;
    responde?: boolean | null;
    revisada_en?: string | null;
    visto_en_mikrotik?: string | null;
    repetida_con?: string[];
}

export interface MapaIps {
    red: Pick<RedRecord, 'id' | 'nombre' | 'cidr' | 'gateway' | 'tipo' | 'ip_inicio' | 'ip_fin'>;
    ips: FilaIp[];
    resumen: Record<EstadoIp | 'disponibles', number>;
    mikrotik_verificado: boolean;
    error: string | null;
}

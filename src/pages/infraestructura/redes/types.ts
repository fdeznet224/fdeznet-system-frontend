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
}

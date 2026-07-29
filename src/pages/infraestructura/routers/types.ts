export type RouterSecurity = 'pppoe' | 'dhcp';
export type RouterControl = 'colas_dinamicas' | 'colas_estaticas';

export interface RouterRecord {
    id: number;
    nombre: string;
    ip_vpn: string;
    user_api: string;
    port_api: number;
    tipo_seguridad: RouterSecurity;
    tipo_control: RouterControl;
    version_os: string;
    is_active: boolean;
    created_at: string;
}

export interface RouterFormData {
    nombre: string;
    ip_vpn: string;
    user_api: string;
    pass_api: string;
    port_api: number;
    tipo_seguridad: RouterSecurity;
    tipo_control: RouterControl;
    version_os: string;
}

export interface RouterActionResponse {
    status: string;
    message?: string;
}

export interface RouterPingResponse {
    status: 'online' | 'offline';
    mensaje?: string;
}

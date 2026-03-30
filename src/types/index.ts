// ==========================================
// 1. INFRAESTRUCTURA DE RED (Routers y Redes)
// ==========================================
export interface Router {
    id: number;
    nombre: string;
    ip_vpn: string;
    user_api: string;
    port_api: number;
    pass_api?: string; 
    
    tipo_seguridad: 'pppoe' | 'dhcp'; 
    tipo_control: 'colas_dinamicas' | 'colas_estaticas';
    version_os: string;
    
    is_active: boolean;
    created_at?: string;
}

export interface Red {
    id: number;
    nombre: string;
    cidr: string;      
    gateway?: string;
    router_id: number;
}

export interface Plan {
    id: number;
    nombre: string;
    precio: number;
    router_id: number;
    
    // Agregados para compatibilidad de tipos antiguos/nuevos
    subida_kbps?: number;
    bajada_kbps?: number;
    
    // NUEVOS CAMPOS: Requeridos para el CreatePlanModal
    velocidad_bajada: number;
    velocidad_subida: number;
    garantia_percent?: number | string;
    prioridad?: number | string;
    burst_bajada?: number;
    burst_subida?: number;
    burst_time?: number | string;
}

export interface Zona {
    id: number;
    nombre: string;
}

// ==========================================
// 2. CONFIGURACIÓN Y PLANTILLAS
// ==========================================
export interface Plantilla {
    id: number;
    nombre: string;
    dia_pago: number;
    dias_antes_facturar: number; 
    dias_gracia: number;         
    impuesto: number;
    aviso_factura: 'whatsapp' | 'sms' | 'email' | 'none';
    recordatorio_whatsapp: boolean;
}

export interface PlantillaMensaje {
    id: number;
    tipo: string;
    texto: string;
    activo: boolean;
}

// ==========================================
// 3. CLIENTES
// ==========================================
export interface Cliente {
    id: number;
    nombre: string;
    cedula?: string;
    telefono: string;
    correo?: string;
    direccion?: string;
    
    // Datos Técnicos
    ip_asignada: string;
    mac_address?: string;
    user_pppoe?: string;
    pass_pppoe?: string;
    estado: 'activo' | 'suspendido' | 'retirado';
    
    // NUEVOS CAMPOS: Geolocalización, Finanzas y NAP (Para Mapa y Detalles)
    latitud?: number | string;
    longitud?: number | string;
    saldo_a_favor?: number;
    created_at?: string;
    caja_nap_id?: number;
    puerto_nap?: number | string;
    
    // Relaciones (IDs)
    router_id: number;
    plan_id: number;
    zona_id?: number;
    red_id?: number;
    plantilla_id?: number;
    
    // Objetos Anidados
    router?: Router;
    zona?: Zona;
    plantilla?: Plantilla;
    plan?: Plan; 
    red?: Red;
    caja_nap?: { id: number; nombre: string }; // Objeto anidado de la NAP
}

// ==========================================
// 4. FINANZAS (FACTURAS Y PAGOS)
// ==========================================
export interface Factura {
    id: number;
    cliente_id: number;
    fecha_emision: string;
    fecha_vencimiento: string;
    mes_correspondiente: string;
    plan_snapshot?: string; 
    monto: number;          
    impuesto: number;
    total: number;          
    saldo_pendiente: number;
    estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada';
    detalles?: string;
    cliente: { 
        id: number;
        nombre: string;
        telefono?: string;
        ip_asignada?: string;
    };
}

export interface ResumenFinanzas {
    pagadas_cant: number;
    pagadas_total: number;
    pendientes_cant: number;
    pendientes_total: number;
    vencidas_cant: number;
    vencidas_total: number;
    anuladas_cant: number;
    anuladas_total: number;
}

// ==========================================
// 5. SISTEMA (USUARIOS Y NOTIFICACIONES)
// ==========================================
export interface Usuario {
    id: number;
    nombre_completo: string; 
    usuario: string;
    rol: 'admin' | 'cajero' | 'tecnico';
    activo: boolean;
    router_ids: number[]; 
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: Usuario; 
}

export interface NotificacionLog {
    id: number;
    tipo: string;
    mensaje: string;
    estado: 'enviado' | 'fallido';
    created_at: string;
    cliente?: {
        nombre: string;
    };
}
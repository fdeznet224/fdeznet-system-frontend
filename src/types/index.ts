// ==========================================
// 1. INFRAESTRUCTURA DE RED (Routers y Redes)
// ==========================================
export interface Router {
    id: number;
    nombre: string;
    ip_vpn: string;
    user_api: string;
    port_api: number;
    pass_api?: string; // Opcional en listados
    
    // Configuración técnica
    tipo_seguridad: 'pppoe' | 'dhcp'; 
    tipo_control: 'colas_dinamicas' | 'colas_estaticas';
    version_os: string;
    
    // Estado
    is_active: boolean;
    created_at?: string;
}

export interface Red {
    id: number;
    nombre: string;
    cidr: string;      // Antes era 'rango', el backend manda 'cidr'
    gateway?: string;
    router_id: number;
}

export interface Plan {
    id: number;
    nombre: string;
    precio: number;
    subida_kbps: number;
    bajada_kbps: number;
    router_id: number;
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
    
    // Reglas de Negocio
    dia_pago: number;
    dias_antes_facturar: number; // Mapeado del backend
    dias_gracia: number;         // Mapeado del backend
    impuesto: number;
    
    // Notificaciones
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
    
    // Relaciones (IDs)
    router_id: number;
    plan_id: number;
    zona_id?: number;
    red_id?: number;
    plantilla_id?: number;
    
    // Objetos Anidados (Para mostrar nombres en tablas)
    router?: Router;
    zona?: Zona;
    plantilla?: Plantilla;
    plan?: Plan; 
    red?: Red;
}

// ==========================================
// 4. FINANZAS (FACTURAS Y PAGOS)
// ==========================================
export interface Factura {
    id: number;
    cliente_id: number;
    
    // Fechas
    fecha_emision: string;
    fecha_vencimiento: string;
    mes_correspondiente: string;
    
    // Montos
    plan_snapshot?: string; // Nombre del plan al momento de facturar
    monto: number;          // Subtotal
    impuesto: number;
    total: number;          // Total a pagar
    saldo_pendiente: number;
    
    estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada';
    detalles?: string;
    
    // Relación anidada (Vital para Panel de Cobrador)
    cliente: { 
        id: number;
        nombre: string;
        telefono?: string;
        ip_asignada?: string;
    };
}

// Resumen que devuelve /finanzas/listado-completo
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
    nombre_completo: string; // Unificado con backend
    usuario: string;
    rol: 'admin' | 'cajero' | 'tecnico';
    activo: boolean;
    
    // Permisos
    router_ids: number[]; // Lista de IDs [1, 2]
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: Usuario; // Reutilizamos la interfaz Usuario
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
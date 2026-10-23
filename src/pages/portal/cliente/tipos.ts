/** Lo que devuelve el backend del portal (/api/portal/...). */

export interface Adeudo { concepto: string; monto: number; vence: string | null; vencido: boolean }

export interface Calendario {
    tipo: 'al_corriente' | 'por_vencer' | 'por_suspender' | 'promesa' | 'vencido';
    fecha: string | null;
    dias: number | null;
    vence?: string | null;
    corte?: string | null;
}

export interface Resumen {
    nombre: string;
    contrato: string;
    direccion: string | null;
    conectado: boolean;
    plan: { nombre: string; bajada_kbps: number; subida_kbps: number; precio: number } | null;
    saldo_a_favor: number;
    cuenta: { estado_servicio: string; explicacion: string; adeudos: Adeudo[]; promesa: { fecha: string } | null };
    pagos: { fecha: string; monto: number; metodo: string | null }[];
    datos_pago: string | null;
    tiene_onu: boolean;
    telefono: string | null;
    correo: string | null;
    calendario: Calendario;
}

export interface Factura {
    id: number;
    concepto: string;
    total: number;
    saldo: number;
    estado: string;
    emitida: string | null;
    vence: string | null;
    pagada: string | null;
}

export interface OpcionesPromesa { puede: boolean; motivo?: string; desde?: string; hasta?: string; monto?: number }

export interface Reporte { id: number; categoria: string | null; estado: string; creado: string | null; programado: string | null; terminado: string | null }

export type Pestana = 'inicio' | 'pagos' | 'consumo' | 'red' | 'ayuda' | 'perfil';

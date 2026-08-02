export interface RouterOption {
    id: number;
    nombre: string;
}

export interface PlanRecord {
    id: number;
    nombre: string;
    precio: number;
    velocidad_subida: number;
    velocidad_bajada: number;
    router_id: number;
    garantia_percent?: number;
    prioridad?: number;
    burst_subida?: number;
    burst_bajada?: number;
    burst_time?: number;
}

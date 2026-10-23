/** Tipos y cálculos de la pestaña Mi red (red de la casa del cliente). */

export interface EquipoRed {
    mac: string;
    nombre: string;
    ip: string;
    conectado: boolean;
    conexion: 'wifi' | 'cable' | null;
    red: string | null;
    bloqueado: boolean | null;
}

export interface RedWifi {
    indice: number;
    ssid: string;
    banda: string;
    activa: boolean;
    clave: string | null;
    conectados: number;
}

export interface EstadoRed {
    ip: string | null;
    onu: string | null;
    modelo: string | null;
    tr069: boolean;
    al_dia: boolean;
    ultimo_reporte: string | null;
    equipos: EquipoRed[];
    redes: RedWifi[];
    bloqueo_disponible: boolean;
    error_bloqueo: string | null;
}

/** Una red por nombre: el 2.4 y el 5 GHz con el mismo SSID comparten contraseña. */
export function redesPorNombre(redes: RedWifi[]) {
    const grupos = new Map<string, { ssid: string; bandas: string[]; conectados: number; activa: boolean }>();
    for (const red of redes) {
        const grupo = grupos.get(red.ssid) ?? { ssid: red.ssid, bandas: [], conectados: 0, activa: false };
        if (red.banda && !grupo.bandas.includes(red.banda)) grupo.bandas.push(red.banda);
        grupo.conectados += red.conectados;
        grupo.activa ||= red.activa;
        grupos.set(red.ssid, grupo);
    }
    return [...grupos.values()];
}

/** Lo que devuelve /api/red-inalambrica. */

export interface ClienteRadio {
    id: number;
    contrato: string | null;
    nombre: string;
    estado: string;
    ip_antena: string | null;
    responde: boolean | null;
    latencia_ms: number | null;
    senal: number | null;
}

export interface EquipoRed {
    id: number;
    nombre: string;
    tipo: string;
    tipo_nombre: string;
    marca: string;
    modelo: string | null;
    ip: string;
    router_id: number | null;
    padre_id: number | null;
    troncal: boolean;
    router_hijo_id: number | null;
    zona_id: number | null;
    ubicacion: string | null;
    latitud: number | null;
    longitud: number | null;
    usuario: string | null;
    tiene_clave: boolean;
    puerto_web: string;
    activo: boolean;
    responde: boolean | null;
    latencia_ms: number | null;
    perdida: number | null;
    revisado_en: string | null;
    senal: number | null;
    ruido: number | null;
    ccq: number | null;
    capacidad_tx: number | null;
    capacidad_rx: number | null;
    frecuencia: string | null;
    ancho_canal: string | null;
    ssid: string | null;
    modo: string | null;
    estaciones: number | null;
    firmware: string | null;
    uptime_s: number | null;
    airos_error: string | null;
    airos_leido_en: string | null;
    hijos: EquipoRed[];
    clientes: ClienteRadio[];
    /** El MikroTik de zona que cuelga de este enlace (red troncal). */
    router?: RouterArbol | null;
}

export interface ClienteFibra {
    id: number;
    contrato: string | null;
    nombre: string;
    estado: string;
    responde: boolean | null;
    potencia: number | null;
}

export interface OltArbol {
    id: number;
    nombre: string;
    ip: string;
    tecnologia: string;
    router_id: number | null;
    pons: { pon: number | null; clientes: ClienteFibra[] }[];
}

export interface RouterArbol {
    id: number | null;
    nombre: string;
    ip: string | null;
    en_linea: boolean | null;
    equipos: EquipoRed[];
    clientes_sin_ap: ClienteRadio[];
    olts?: OltArbol[];
}

export interface Arbol {
    troncal: EquipoRed[];
    routers: RouterArbol[];
    tipos: Record<string, string>;
    marcas: Record<string, string>;
}

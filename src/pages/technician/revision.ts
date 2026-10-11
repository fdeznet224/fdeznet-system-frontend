/**
 * Cómo leer lo que devuelve la revisión de una reparación. Mismos umbrales
 * que el servidor: abajo de -27 dBm falla, abajo de -25 está al límite.
 */

export interface Diagnostico {
    resultado?: string;
    sugerencia?: string | null;
    mikrotik?: {
        disponible?: boolean;
        pppoe_online?: boolean | null;
        uptime?: string | null;
        ping_estado?: string | null;
        perdida_paquetes_porcentaje?: number | string | null;
        trafico_bajada_bps?: number | null;
        trafico_subida_bps?: number | null;
    };
    olt: { disponible?: boolean; onu_online?: boolean | null; potencia_rx_dbm?: number | string | null };
}

export interface Lectura {
    rx: number;
    fecha?: string | null;
}

export interface Revision {
    categoria: string;
    potencia_antes?: Lectura | null;
    potencia_ultima?: Lectura | null;
    plan?: { nombre: string; bajada_kbps?: number | null; subida_kbps?: number | null } | null;
    nap?: { id: number; nombre: string; puerto?: number | null; capacidad?: number | null; coordenadas?: string | null; ubicacion?: string | null } | null;
    vecinos: { nombre: string; puerto?: number | null; potencia?: Lectura | null }[];
    onu?: { identificador: string; modelo?: string | null; marca?: string | null } | null;
    acceso_onu: { marca: string; url: string; cuentas: { usuario: string; clave: string }[] }[];
    extensores: { detalle: string; fecha?: string | null }[];
    identificacion?: { identificado_en?: string | null; etiquetado: boolean; contrato?: string | null };
    avance?: { identificados: number; total: number };
}

export type Tono = 'bien' | 'aviso' | 'mal' | 'neutro';

export const UMBRAL_FALLA = -27;
export const UMBRAL_LIMITE = -25;
export const UMBRAL_SATURADA = -8;

export const numero = (valor: unknown): number | null => {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = parseFloat(String(valor));
    return Number.isFinite(n) ? n : null;
};

export const tonoPotencia = (rx: number | null): Tono => {
    if (rx === null) return 'neutro';
    if (rx < UMBRAL_FALLA || rx > UMBRAL_SATURADA) return 'mal';
    if (rx < UMBRAL_LIMITE) return 'aviso';
    return 'bien';
};

/** Qué tan bien quedó la fibra y si mejoró contra la lectura de antes del reporte. */
export function veredictoPotencia(antes: number | null, ahora: number | null, onuEnLinea?: boolean | null): { tono: Tono; texto: string; cambio?: string } {
    if (onuEnLinea === false) {
        return { tono: 'mal', texto: 'La ONU no está en línea: sin luz en la fibra (LOS), sin corriente o la ONU dañada. Revisa el tramo entre la caja NAP y la casa.' };
    }
    if (ahora === null) {
        return { tono: 'neutro', texto: 'La OLT no dio lectura de potencia.' };
    }
    let cambio: string | undefined;
    if (antes !== null) {
        const diferencia = ahora - antes;
        cambio = Math.abs(diferencia) < 0.5
            ? 'Igual que antes del reporte'
            : diferencia > 0 ? `Mejoró ${diferencia.toFixed(1)} dB` : `Empeoró ${Math.abs(diferencia).toFixed(1)} dB`;
    }
    if (ahora > UMBRAL_SATURADA) {
        return { tono: 'mal', cambio, texto: 'La señal llega demasiado fuerte: pon un atenuador o revisa que no sea una lectura falsa.' };
    }
    if (ahora < UMBRAL_FALLA) {
        return { tono: 'mal', cambio, texto: `Sigue alta (${ahora.toFixed(2)} dBm). Limpia o cambia conectores, revisa dobleces, empalmes y la caja NAP. Debe quedar arriba de ${UMBRAL_LIMITE} dBm para evitar otra visita.` };
    }
    if (ahora < UMBRAL_LIMITE) {
        return { tono: 'aviso', cambio, texto: `Funciona, pero está al límite (${ahora.toFixed(2)} dBm). Si puedes, déjala arriba de ${UMBRAL_LIMITE} dBm para que no vuelva a fallar.` };
    }
    return { tono: 'bien', cambio, texto: `Quedó bien (${ahora.toFixed(2)} dBm).` };
}

export interface Paso {
    texto: string;
    ok: boolean | null;
}

/** Sin internet: de la fibra al PPPoE, dónde se corta. */
export function diagnosticoSinInternet(d: Diagnostico, suspendido: boolean): { pasos: Paso[]; conclusion: string; tono: Tono } {
    const rx = numero(d.olt.potencia_rx_dbm);
    const onu = d.olt.disponible ? d.olt.onu_online ?? null : null;
    const fibra = rx === null ? null : rx >= UMBRAL_FALLA && rx <= UMBRAL_SATURADA;
    const pppoe = d.mikrotik?.disponible ? Boolean(d.mikrotik.pppoe_online) : null;
    const pasos: Paso[] = [
        { texto: 'Servicio sin suspensión por pago', ok: !suspendido },
        { texto: 'ONU en línea en la OLT', ok: onu },
        { texto: rx === null ? 'Potencia de la fibra' : `Potencia de la fibra (${rx.toFixed(2)} dBm)`, ok: fibra },
        { texto: 'Sesión PPPoE en el MikroTik', ok: pppoe },
    ];
    if (suspendido) {
        return { pasos, tono: 'aviso', conclusion: 'Está suspendido por pago: no es falla de red. Que pase a pagar o que la oficina registre su pago o promesa.' };
    }
    if (onu === false) {
        return { pasos, tono: 'mal', conclusion: 'La ONU no está en línea: revisa que tenga corriente, el patchcord y la luz LOS. Si la fibra llega bien y sigue fuera, cambia la ONU.' };
    }
    if (fibra === false) {
        return { pasos, tono: 'mal', conclusion: 'Problema de fibra: la potencia está fuera de rango. Revisa conectores, dobleces, empalmes y la caja NAP.' };
    }
    if (pppoe === false) {
        return { pasos, tono: 'mal', conclusion: 'La fibra está bien pero no hay sesión PPPoE: revisa que la ONU tenga el usuario y la contraseña PPPoE de "Datos del cliente". Si están bien, reinicia la ONU; si sigue sin autenticar, la ONU está fallando: cámbiala.' };
    }
    if (pppoe) {
        return { pasos, tono: 'bien', conclusion: 'Hay internet hasta su equipo: el problema está en el WiFi o en sus dispositivos.' };
    }
    return { pasos, tono: 'neutro', conclusion: 'No se pudo consultar todo; revisa los pasos que salieron en gris.' };
}

/** Lentitud: ¿va al tope de su plan o hay pérdida de paquetes? */
export function diagnosticoLentitud(d: Diagnostico, planKbps: number | null | undefined): { uso: number | null; conclusion: string; tono: Tono } {
    const bajada = Number(d.mikrotik?.trafico_bajada_bps || 0);
    const planBps = planKbps ? planKbps * 1000 : null;
    const uso = planBps ? Math.min(100, Math.round((bajada / planBps) * 100)) : null;
    const perdida = numero(d.mikrotik?.perdida_paquetes_porcentaje) ?? 0;
    const rx = numero(d.olt.potencia_rx_dbm);
    if (!d.mikrotik?.pppoe_online) {
        return { uso, tono: 'mal', conclusion: 'No hay sesión PPPoE en este momento: revísalo como "Sin internet".' };
    }
    if (rx !== null && rx < UMBRAL_LIMITE) {
        return { uso, tono: 'aviso', conclusion: `La fibra está débil (${rx.toFixed(2)} dBm): puede causar cortes y lentitud. Revisa conectores.` };
    }
    if (perdida > 0) {
        return { uso, tono: 'mal', conclusion: `Se pierden paquetes (${perdida}%): revisa fibra, patchcord y la ONU.` };
    }
    if (uso !== null && uso >= 80) {
        return { uso, tono: 'aviso', conclusion: 'Está usando casi todo su plan: descargas, videos o muchos equipos. No es falla; puede subir de plan.' };
    }
    return { uso, tono: 'bien', conclusion: 'La línea no está saturada ni pierde paquetes: revisa el WiFi (distancia, paredes, canal) y cuántos equipos tiene conectados en la ONU.' };
}

export const ESTILO_TONO: Record<Tono, string> = {
    bien: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300',
    aviso: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
    mal: 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300',
    neutro: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const COLOR_TONO: Record<Tono, string> = {
    bien: 'text-emerald-600 dark:text-emerald-400',
    aviso: 'text-amber-600 dark:text-amber-400',
    mal: 'text-rose-600 dark:text-rose-400',
    neutro: 'text-slate-400',
};

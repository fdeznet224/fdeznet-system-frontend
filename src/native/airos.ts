/**
 * Hablar con una antena Ubiquiti (airOS 6 y 8) desde el celular del técnico.
 *
 * Solo funciona en la app de Android: el navegador bloquea las llamadas de
 * fdezpay.com a http://192.168.1.20 (CORS y contenido mixto); la app las hace
 * por lo nativo (CapacitorHttp). La sesión de airOS es una cookie que se
 * guarda aquí y se manda a mano, sin depender del gestor de cookies.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

interface HttpResponse {
    status: number;
    headers: Record<string, string>;
    data: string;
}

/** Componente nativo de la app (AntenaHttpPlugin.java): acepta el certificado
 * propio de airOS, solo para IPs de la red local, y no sigue redirecciones. */
const AntenaHttp = registerPlugin<{
    request(opciones: {
        url: string; method: string; headers?: Record<string, string>; timeoutMs?: number;
        campos?: Campo[]; formulario?: Record<string, string>;
    }): Promise<HttpResponse>;
    iniciarPitido(opciones: { url: string; cookie: string }): Promise<void>;
    detenerPitido(): Promise<void>;
}>('AntenaHttp');

export const IP_DE_FABRICA = '192.168.1.20';
export const USUARIO_DE_FABRICA = 'ubnt';
export const CLAVE_DE_FABRICA = 'ubnt';
const ESPERA_MS = 6000;

export function esAppNativa(): boolean {
    return Capacitor.isNativePlatform();
}

/** La arma el servidor (GET /ordenes/{id}/antena) con los datos del cliente. */
export interface PlantillaAntena {
    ip: string;
    mascara: string;
    gateway: string;
    vlan: number;
    lan_ip: string;
    nombre: string;
    usuario: string | null;
    usuario_empresa: boolean;
    pppoe_usuario: string;
    borrar: string[];
    claves: Record<string, string>;
}

export interface EstadoAntena {
    modelo?: string;
    firmware?: string;
    nombre?: string;
    modo?: string;
    ssid?: string;
    senal?: number | null;
    ruido?: number | null;
    ccq?: number | null;
    /** airMAX: calidad y capacidad (%), y velocidades de enlace (Mbps). */
    calidadAirmax?: number | null;
    capacidadAirmax?: number | null;
    txMbps?: number | null;
    rxMbps?: number | null;
    frecuencia?: string;
    distanciaM?: number | null;
    apMac?: string;
    enlazada: boolean;
}

export interface Sector {
    ssid: string;
    mac: string;
    senal: number;
    ruido: number | null;
    frecuencia: string;
    seguridad: string;
}

type Campo = { key: string; value: string; type: 'string' } | { key: string; value: string; type: 'base64File'; fileName: string; contentType: string };

export class Antena {
    readonly base: string;
    private cookie = '';
    private csrf = '';
    version: 6 | 8 | null = null;
    private credenciales: { usuario: string; clave: string } | null = null;

    constructor(ip = IP_DE_FABRICA, https = true) {
        this.base = `${https ? 'https' : 'http'}://${ip}`;
    }

    private guardarCookie(respuesta: HttpResponse) {
        const cabeceras = respuesta.headers || {};
        for (const [nombre, valor] of Object.entries(cabeceras)) {
            if (nombre.toLowerCase() !== 'set-cookie' || !valor) continue;
            // "AIROS_SESSIONID=abc; Path=/" (puede venir más de una, separadas por coma).
            const pares = String(valor).split(/,(?=\s*[A-Za-z0-9_]+=)/).map((c) => c.split(';')[0].trim()).filter(Boolean);
            const actuales = new Map(this.cookie.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c]));
            for (const par of pares) actuales.set(par.split('=')[0], par);
            this.cookie = [...actuales.values()].join('; ');
        }
        const csrf = Object.entries(cabeceras).find(([n]) => n.toLowerCase() === 'x-csrf-id');
        if (csrf) this.csrf = String(csrf[1]);
    }

    get cookieDeSesion(): string {
        return this.cookie;
    }

    private cabeceras(extra: Record<string, string> = {}): Record<string, string> {
        return {
            ...(this.cookie ? { Cookie: this.cookie } : {}),
            ...(this.csrf ? { 'X-CSRF-ID': this.csrf } : {}),
            ...extra,
        };
    }

    async pedir(ruta: string, opciones: { metodo?: string; campos?: Campo[]; formulario?: Record<string, string> } = {}): Promise<HttpResponse> {
        const { metodo = 'GET', campos, formulario } = opciones;
        const respuesta = await AntenaHttp.request({
            url: `${this.base}${ruta}`,
            method: metodo,
            timeoutMs: ESPERA_MS,
            headers: this.cabeceras(),
            ...(campos ? { campos } : formulario ? { formulario } : {}),
        });
        this.guardarCookie(respuesta);
        return respuesta;
    }

    private static json<T>(respuesta: HttpResponse): T | null {
        if (respuesta.status !== 200) return null;
        const texto = String(respuesta.data || '').trim();
        if (!texto.startsWith('{') && !texto.startsWith('[')) return null;
        try {
            return JSON.parse(texto) as T;
        } catch {
            return null;
        }
    }

    /** ¿Hay una antena de Ubiquiti en esa IP? (contesta su página de entrada). */
    async responde(): Promise<boolean> {
        try {
            const r = await this.pedir('/login.cgi');
            const texto = String(r.data || '');
            // HTTP de una antena que obliga a HTTPS contesta 302: se prueba la HTTPS.
            return r.status === 200 && /airos|ubnt|ubiquiti|login\.cgi|api\/auth/i.test(texto);
        } catch {
            return false;
        }
    }

    /**
     * Entra con usuario y clave. airOS 8: /api/auth. airOS 6: primero se pide
     * la sesión y luego el formulario (uri, username, password; probado con
     * una LiteBeam M5 v6.3.11 de fábrica).
     */
    async entrar(usuario = USUARIO_DE_FABRICA, clave = CLAVE_DE_FABRICA): Promise<void> {
        this.credenciales = { usuario, clave };
        this.cookie = '';
        this.csrf = '';
        const r8 = await this.pedir('/api/auth', { formulario: { username: usuario, password: clave } }).catch(() => null);
        if (r8 && r8.status === 200 && this.csrf) {
            this.version = 8;
            return;
        }
        this.version = 6;
        await this.pedir('/login.cgi');
        await this.pedir('/login.cgi', {
            metodo: 'POST',
            campos: [
                { key: 'uri', value: '/index.cgi', type: 'string' },
                { key: 'username', value: usuario, type: 'string' },
                { key: 'password', value: clave, type: 'string' },
            ],
        });
        const prueba = Antena.json<Record<string, unknown>>(await this.pedir('/status.cgi'));
        if (!prueba) throw new Error('Usuario o clave incorrectos');
    }

    async estado(): Promise<EstadoAntena> {
        type Valores = Record<string, string | number | undefined> & { polling?: Record<string, number> };
        const datos = Antena.json<{ host?: Valores; wireless?: Valores }>(await this.pedir('/status.cgi'));
        if (!datos) throw new Error('La antena no mostró su estado');
        const host: Valores = datos.host || {};
        const wifi: Valores = datos.wireless || {};
        const texto = (v: string | number | undefined) => (v === undefined ? undefined : String(v));
        const numero = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));
        return {
            modelo: texto(host.devmodel),
            firmware: texto(host.fwversion),
            nombre: texto(host.hostname),
            modo: texto(wifi.mode),
            ssid: texto(wifi.essid),
            senal: numero(wifi.signal),
            ruido: numero(wifi.noisef),
            ccq: numero(wifi.ccq),
            calidadAirmax: numero(wifi.polling?.quality),
            capacidadAirmax: numero(wifi.polling?.capacity),
            txMbps: numero(wifi.txrate),
            rxMbps: numero(wifi.rxrate),
            frecuencia: texto(wifi.frequency),
            distanciaM: numero(wifi.distance),
            apMac: texto(wifi.apmac),
            enlazada: Boolean(wifi.apmac) && wifi.apmac !== '00:00:00:00:00:00',
        };
    }

    /** Sectores que ve la antena, el más fuerte primero (airOS 6: survey.json.cgi). */
    async escanear(): Promise<Sector[]> {
        const lista = Antena.json<Array<Record<string, string>>>(await this.pedir('/survey.json.cgi')) || [];
        return lista
            .filter((s) => s.essid)
            .map((s) => ({
                ssid: s.essid,
                mac: s.mac,
                senal: Number(s.signal_level),
                ruido: s.noise_level ? Number(s.noise_level) : null,
                frecuencia: s.frequency,
                seguridad: s.encryption || 'none',
            }))
            .sort((a, b) => b.senal - a.senal);
    }

    /** Configuración actual (system.cfg) como texto. */
    async bajarConfiguracion(): Promise<string> {
        const r = await this.pedir('/cfg.cgi');
        const texto = String(r.data || '');
        if (r.status !== 200 || !texto.includes('netconf.')) throw new Error('La antena no entregó su configuración');
        return texto;
    }
    /**
     * Cambia la configuración: baja system.cfg, aplica los cambios (clave → valor;
     * null borra la línea), la sube por system.cgi (con el token de la página) y
     * la aplica con apply.cgi. airOS reinicia sus servicios (~20 s) sin
     * reiniciar el equipo; se espera a que vuelva y se entra otra vez.
     * Probado con LiteBeam M5 v6.3.11.
     */
    async aplicarCambios(cambios: Record<string, string | null>, opciones: { borrar?: string[]; esperar?: boolean } = {}): Promise<void> {
        if (this.version === 8) throw new Error('Configurar airOS 8 todavía no está disponible');
        const actual = await this.bajarConfiguracion();
        const nueva = editarConfiguracion(actual, cambios, opciones.borrar);
        const pagina = String((await this.pedir('/system.cgi')).data || '');
        const token = (pagina.match(/name="token" value="([^"]*)"/) || [])[1] || '';
        await this.pedir('/system.cgi', {
            metodo: 'POST',
            campos: [
                { key: 'token', value: token, type: 'string' },
                { key: 'cfgfile', value: aBase64(nueva), type: 'base64File', fileName: 'system.cfg', contentType: 'application/octet-stream' },
                { key: 'cfgupload', value: 'Upload', type: 'string' },
                { key: 'action', value: 'cfgupload', type: 'string' },
            ],
        });
        const cargada = await this.bajarConfiguracion();
        const falta = Object.entries(cambios).find(([clave, valor]) => valor !== null && !cargada.includes(`\n${clave}=${valor}\n`) && !cargada.startsWith(`${clave}=${valor}\n`));
        if (falta) throw new Error(`La antena no aceptó la configuración (${falta[0]})`);
        await this.pedir('/apply.cgi').catch(() => null);
        if (opciones.esperar !== false) await this.esperarRegreso();
    }

    /**
     * Configuración final del cliente (modo router, PPPoE, administración en la
     * VLAN, LAN para el Mercusys): la arma el servidor y aquí se cambia todo el
     * bloque de red conservando el sector y su clave. Después la antena cambia
     * de IP local (192.168.20.1), así que no se espera a que vuelva aquí.
     */
    async aplicarPlantilla(plantilla: PlantillaAntena): Promise<void> {
        await this.aplicarCambios(plantilla.claves, { borrar: plantilla.borrar, esperar: false });
    }

    /** Tras aplicar: espera a que deje de responder y vuelva (máx. ~2 min), y entra. */
    async esperarRegreso(maximoMs = 120000): Promise<void> {
        const inicio = Date.now();
        await esperar(5000);
        while (Date.now() - inicio < maximoMs) {
            if (await this.responde()) {
                if (this.credenciales) {
                    try {
                        await this.entrar(this.credenciales.usuario, this.credenciales.clave);
                        return;
                    } catch {
                        /* aún arrancando su web */
                    }
                } else {
                    return;
                }
            }
            await esperar(3000);
        }
        throw new Error('La antena no volvió después de aplicar la configuración');
    }

    /**
     * Enlaza la antena (estación WDS) al sector elegido, fijada a su MAC.
     * WPA/WPA2 personal va por wpa_supplicant, como en las antenas de clientes.
     */
    async conectarSector(sector: Sector, claveWifi?: string): Promise<void> {
        const abierto = !sector.seguridad || sector.seguridad === 'none';
        if (!abierto && (!claveWifi || claveWifi.length < 8)) throw new Error('Falta la clave WiFi del sector (mínimo 8 caracteres)');
        const cambios: Record<string, string | null> = {
            'radio.1.mode': 'Managed',
            'wireless.1.ssid': sector.ssid,
            'wireless.1.ap': sector.mac,
            'wireless.1.wds.status': 'enabled',
            'wireless.1.security.type': 'none',
        };
        if (abierto) {
            Object.assign(cambios, { 'wpasupplicant.status': 'disabled', 'wpasupplicant.device.1.status': 'disabled' });
        } else {
            Object.assign(cambios, {
                'wpasupplicant.status': 'enabled',
                'wpasupplicant.device.1.status': 'enabled',
                'wpasupplicant.device.1.devname': 'ath0',
                'wpasupplicant.device.1.driver': 'madwifi',
                'wpasupplicant.device.1.profile': 'WPA-PSK',
                'wpasupplicant.profile.1.name': 'WPA-PSK',
                'wpasupplicant.profile.1.network.1.ssid': sector.ssid,
                'wpasupplicant.profile.1.network.1.bssid': '',
                'wpasupplicant.profile.1.network.1.psk': claveWifi as string,
                'wpasupplicant.profile.1.network.1.key_mgmt.1.name': 'WPA-PSK',
                'wpasupplicant.profile.1.network.1.pairwise.1.name': 'CCMP',
                // "wpa" = WPA1 (proto WPA); "wpa2" = RSN.
                'wpasupplicant.profile.1.network.1.proto.1.name': sector.seguridad === 'wpa' ? 'WPA' : 'RSN',
                'wpasupplicant.profile.1.network.1.eap.1.status': 'disabled',
            });
        }
        await this.aplicarCambios(cambios);
    }
}

function esperar(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function aBase64(texto: string): string {
    const bytes = new TextEncoder().encode(texto);
    let binario = '';
    bytes.forEach((b) => { binario += String.fromCharCode(b); });
    return btoa(binario);
}

/** Cambia, agrega o borra (null) líneas "clave=valor" de un system.cfg, ordenado como airOS. */
export function editarConfiguracion(cfg: string, cambios: Record<string, string | null>, borrar: string[] = []): string {
    const lineas = new Map<string, string>();
    for (const linea of cfg.split(/\r?\n/)) {
        const i = linea.indexOf('=');
        if (i <= 0) continue;
        const clave = linea.slice(0, i);
        // Bloques que se reemplazan completos (ej. "netconf." o "netmode").
        if (borrar.some((p) => clave === p || clave.startsWith(p))) continue;
        lineas.set(clave, linea.slice(i + 1));
    }
    for (const [clave, valor] of Object.entries(cambios)) {
        if (valor === null) lineas.delete(clave);
        else lineas.set(clave, valor);
    }
    return [...lineas.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([c, v]) => `${c}=${v}`).join('\n') + '\n';
}

/** Pitido para alinear (nativo: sigue con el celular bloqueado). */
export async function iniciarPitido(antena: Antena): Promise<void> {
    await AntenaHttp.iniciarPitido({ url: `${antena.base}/status.cgi`, cookie: antena.cookieDeSesion });
}

export async function detenerPitido(): Promise<void> {
    await AntenaHttp.detenerPitido().catch(() => undefined);
}

/** Busca la antena en la IP de fábrica (HTTP y HTTPS). */
export async function buscarAntena(ip = IP_DE_FABRICA): Promise<Antena | null> {
    for (const https of [true, false]) {
        const antena = new Antena(ip, https);
        if (await antena.responde()) return antena;
    }
    return null;
}

/** Calidad de la señal para alinear (dBm de airOS). */
export function calidadSenal(dbm: number | null | undefined): { texto: string; tono: 'verde' | 'ambar' | 'rojo' } {
    if (dbm === null || dbm === undefined || Number.isNaN(dbm)) return { texto: 'Sin enlace', tono: 'rojo' };
    if (dbm >= -65) return { texto: 'Excelente', tono: 'verde' };
    if (dbm >= -72) return { texto: 'Buena', tono: 'verde' };
    if (dbm >= -78) return { texto: 'Regular: ajusta la antena', tono: 'ambar' };
    return { texto: 'Mala: mueve la antena', tono: 'rojo' };
}

export type NivelInstalacion = 'excelente' | 'optima' | 'regular' | 'mala';

/**
 * Veredicto en palabras para el técnico, con la señal, el CCQ y la capacidad
 * airMAX (si el sector no usa airMAX, la capacidad viene en 0 y no cuenta).
 * Gana el peor de los tres.
 */
export function veredictoInstalacion(e: Pick<EstadoAntena, 'enlazada' | 'senal' | 'ccq' | 'capacidadAirmax' | 'calidadAirmax'>): {
    nivel: NivelInstalacion; texto: string; consejo: string;
} {
    if (!e.enlazada || e.senal === null || e.senal === undefined) {
        return { nivel: 'mala', texto: 'Sin enlace', consejo: 'La antena no está conectada al sector.' };
    }
    const orden: NivelInstalacion[] = ['excelente', 'optima', 'regular', 'mala'];
    const porSenal: NivelInstalacion = e.senal >= -60 ? 'excelente' : e.senal >= -68 ? 'optima' : e.senal >= -75 ? 'regular' : 'mala';
    const ccq = e.ccq ?? null;
    const porCcq: NivelInstalacion = ccq === null || ccq === 0 ? 'excelente' : ccq >= 90 ? 'excelente' : ccq >= 80 ? 'optima' : ccq >= 60 ? 'regular' : 'mala';
    const usaAirmax = Boolean(e.capacidadAirmax || e.calidadAirmax);
    const cap = e.capacidadAirmax ?? 0;
    const porCapacidad: NivelInstalacion = !usaAirmax ? 'excelente' : cap >= 70 ? 'excelente' : cap >= 50 ? 'optima' : cap >= 30 ? 'regular' : 'mala';
    const nivel = [porSenal, porCcq, porCapacidad].reduce((peor, n) => (orden.indexOf(n) > orden.indexOf(peor) ? n : peor), 'excelente' as NivelInstalacion);
    const textos: Record<NivelInstalacion, [string, string]> = {
        excelente: ['Excelente', 'Lista para terminar.'],
        optima: ['Óptima', 'Buena instalación; puedes terminar.'],
        regular: ['Regular', 'Mueve la antena poco a poco hacia la torre hasta que suba la señal.'],
        mala: ['Mala', 'Apunta mejor a la torre o prueba otro sector.'],
    };
    return { nivel, texto: textos[nivel][0], consejo: textos[nivel][1] };
}

export interface ResultadoPrueba {
    muestras: number;
    senal: number;
    ccq: number | null;
    capacidad: number | null;
    phyBajada: number;
    phySubida: number;
    /** Mbps reales estimados que pasa el enlace (con lo que se pierde en el aire). */
    bajadaMbps: number;
    subidaMbps: number;
    nivel: NivelInstalacion;
    texto: string;
    consejo: string;
}

/**
 * Prueba de calidad del enlace: promedia varias lecturas y estima lo que pasa
 * de verdad. En airMAX 802.11n se aprovecha ~60 % de la velocidad del enlace
 * (PHY), y eso baja con el CCQ (paquetes que se repiten).
 */
export function evaluarEnlace(lecturas: EstadoAntena[], planMbps: number): ResultadoPrueba | null {
    const validas = lecturas.filter((l) => l.enlazada && l.senal !== null && l.senal !== undefined);
    if (validas.length === 0) return null;
    const promedio = (valores: Array<number | null | undefined>) => {
        const nums = valores.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v) && v > 0);
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    };
    const senal = Math.round(validas.reduce((a, l) => a + (l.senal as number), 0) / validas.length);
    const ccq = promedio(validas.map((l) => l.ccq));
    const capacidad = promedio(validas.map((l) => l.capacidadAirmax));
    const phyBajada = promedio(validas.map((l) => l.rxMbps)) ?? 0;
    const phySubida = promedio(validas.map((l) => l.txMbps)) ?? 0;
    const factor = 0.6 * ((ccq ?? 100) / 100);
    const bajadaMbps = Math.round(phyBajada * factor * 10) / 10;
    const subidaMbps = Math.round(phySubida * factor * 10) / 10;
    const peor = Math.min(bajadaMbps, subidaMbps);
    const nivel: NivelInstalacion = peor >= planMbps * 2 ? 'excelente' : peor >= planMbps * 1.3 ? 'optima' : peor >= planMbps ? 'regular' : 'mala';
    const textos: Record<NivelInstalacion, [string, string]> = {
        excelente: ['Excelente', `El enlace pasa de sobra el plan de ${planMbps} Mb.`],
        optima: ['Óptima', `El enlace aguanta el plan de ${planMbps} Mb con margen.`],
        regular: ['Regular', `Apenas alcanza el plan de ${planMbps} Mb: mejora la alineación.`],
        mala: ['Mala', `No alcanza el plan de ${planMbps} Mb: alinea mejor o cambia de sector.`],
    };
    return {
        muestras: validas.length, senal, ccq: ccq === null ? null : Math.round(ccq),
        capacidad: capacidad === null ? null : Math.round(capacidad), phyBajada: Math.round(phyBajada), phySubida: Math.round(phySubida),
        bajadaMbps, subidaMbps, nivel, texto: textos[nivel][0], consejo: textos[nivel][1],
    };
}


// --------------------------------------------------------------- sectores
// Clientes por sector (lo sabe el servidor por airOS de cada AP). Se guarda en
// el celular cuando hay internet para usarlo en la instalación sin internet.

export interface InfoSector {
    nombre: string;
    ssid: string;
    /** MHz, ej. 5745 */
    frecuencia: number | null;
    clientes: number | null;
}

const CLAVE_SECTORES = 'sectores-del-sistema';
export const SECTOR_CASI_LLENO = 18;
export const SECTOR_SATURADO = 25;

const mhz = (texto: string | number | null | undefined): number | null => {
    const n = parseFloat(String(texto ?? '').replace(',', '.'));
    if (Number.isNaN(n)) return null;
    return n < 100 ? Math.round(n * 1000) : Math.round(n); // "5.745" GHz o "5745 MHz"
};

type NodoArbol = { tipo?: string; nombre?: string; ssid?: string | null; frecuencia?: string | null; estaciones?: number | null };

/** Junta los AP del árbol de la red (/red-inalambrica/arbol) y los guarda. */
export function guardarSectoresDelSistema(arbol: unknown): InfoSector[] {
    const sectores: InfoSector[] = [];
    const vistos = new Set<string>();
    // Los AP cuelgan de hijos, router.equipos, etc.: se recorre todo el árbol.
    const visitar = (valor: unknown) => {
        if (Array.isArray(valor)) {
            valor.forEach(visitar);
            return;
        }
        if (!valor || typeof valor !== 'object') return;
        const nodo = valor as NodoArbol;
        if (nodo.tipo === 'ap' && nodo.ssid) {
            const clave = `${nodo.ssid}|${nodo.frecuencia}|${nodo.nombre}`;
            if (!vistos.has(clave)) {
                vistos.add(clave);
                sectores.push({ nombre: nodo.nombre || nodo.ssid, ssid: nodo.ssid, frecuencia: mhz(nodo.frecuencia), clientes: nodo.estaciones ?? null });
            }
        }
        Object.values(valor).forEach(visitar);
    };
    visitar(arbol);
    localStorage.setItem(CLAVE_SECTORES, JSON.stringify({ en: new Date().toISOString(), sectores }));
    return sectores;
}

export function sectoresGuardados(): InfoSector[] {
    try {
        return (JSON.parse(localStorage.getItem(CLAVE_SECTORES) || '{}').sectores as InfoSector[]) || [];
    } catch {
        return [];
    }
}

/** El AP del sistema que corresponde a un sector escaneado (mismo SSID y frecuencia ±10 MHz). */
export function infoDeSector(sector: Sector, conocidos: InfoSector[]): InfoSector | null {
    const f = mhz(sector.frecuencia);
    const mismos = conocidos.filter((c) => c.ssid === sector.ssid);
    return mismos.find((c) => f !== null && c.frecuencia !== null && Math.abs(c.frecuencia - f) <= 10) || (mismos.length === 1 ? mismos[0] : null);
}

/** Capacidad real estimada con una lectura: ~60 % de la velocidad del enlace, por el CCQ. */
export function capacidadEstimada(e: EstadoAntena): { bajada: number; subida: number } | null {
    if (!e.enlazada || !e.rxMbps || !e.txMbps) return null;
    const factor = 0.6 * ((e.ccq || 100) / 100);
    return { bajada: Math.round(e.rxMbps * factor), subida: Math.round(e.txMbps * factor) };
}

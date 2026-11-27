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
}>('AntenaHttp');

export const IP_DE_FABRICA = '192.168.1.20';
export const USUARIO_DE_FABRICA = 'ubnt';
export const CLAVE_DE_FABRICA = 'ubnt';
const ESPERA_MS = 6000;

export function esAppNativa(): boolean {
    return Capacitor.isNativePlatform();
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
    async aplicarCambios(cambios: Record<string, string | null>): Promise<void> {
        if (this.version === 8) throw new Error('Configurar airOS 8 todavía no está disponible');
        const actual = await this.bajarConfiguracion();
        const nueva = editarConfiguracion(actual, cambios);
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
        await this.esperarRegreso();
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
export function editarConfiguracion(cfg: string, cambios: Record<string, string | null>): string {
    const lineas = new Map<string, string>();
    for (const linea of cfg.split(/\r?\n/)) {
        const i = linea.indexOf('=');
        if (i > 0) lineas.set(linea.slice(0, i), linea.slice(i + 1));
    }
    for (const [clave, valor] of Object.entries(cambios)) {
        if (valor === null) lineas.delete(clave);
        else lineas.set(clave, valor);
    }
    return [...lineas.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([c, v]) => `${c}=${v}`).join('\n') + '\n';
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

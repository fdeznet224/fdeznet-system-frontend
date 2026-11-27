/**
 * Hablar con una antena Ubiquiti (airOS 6 y 8) desde el celular del técnico.
 *
 * Solo funciona en la app de Android: el navegador bloquea las llamadas de
 * fdezpay.com a http://192.168.1.20 (CORS y contenido mixto); la app las hace
 * por lo nativo (CapacitorHttp). La sesión de airOS es una cookie que se
 * guarda aquí y se manda a mano, sin depender del gestor de cookies.
 */
import { Capacitor, CapacitorHttp, type HttpResponse } from '@capacitor/core';

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

    constructor(ip = IP_DE_FABRICA, https = false) {
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
        const respuesta = await CapacitorHttp.request({
            url: `${this.base}${ruta}`,
            method: metodo,
            connectTimeout: ESPERA_MS,
            readTimeout: ESPERA_MS * 2,
            responseType: 'text',
            ...(campos
                ? { headers: this.cabeceras({ 'Content-Type': 'multipart/form-data' }), data: campos, dataType: 'formData' as const }
                : formulario
                    ? { headers: this.cabeceras({ 'Content-Type': 'application/x-www-form-urlencoded' }), data: formulario }
                    : { headers: this.cabeceras() }),
        });
        this.guardarCookie(respuesta);
        return respuesta;
    }

    private static json<T>(respuesta: HttpResponse): T | null {
        if (respuesta.status !== 200) return null;
        if (typeof respuesta.data === 'object') return respuesta.data as T;
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
            return r.status === 200 && /airos|ubnt|ubiquiti|login\.cgi|api\/auth/i.test(texto);
        } catch {
            return false;
        }
    }

    /**
     * Entra con usuario y clave. airOS 8: /api/auth. airOS 6: primero se pide
     * la sesión y luego el formulario; una antena de fábrica pide además el
     * país y aceptar la licencia (México = 484).
     */
    async entrar(usuario = USUARIO_DE_FABRICA, clave = CLAVE_DE_FABRICA): Promise<void> {
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
                // Primer arranque de fábrica: país y licencia (se ignoran si ya está configurada).
                { key: 'country_select', value: '484', type: 'string' },
                { key: 'country', value: '484', type: 'string' },
                { key: 'ui_language', value: 'es_ES', type: 'string' },
                { key: 'agreed', value: 'true', type: 'string' },
            ],
        });
        const prueba = Antena.json<Record<string, unknown>>(await this.pedir('/status.cgi'));
        if (!prueba) throw new Error('Usuario o clave incorrectos');
    }

    async estado(): Promise<EstadoAntena> {
        type Valores = Record<string, string | number | undefined>;
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
}

/** Busca la antena en la IP de fábrica (HTTP y HTTPS). */
export async function buscarAntena(ip = IP_DE_FABRICA): Promise<Antena | null> {
    for (const https of [false, true]) {
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

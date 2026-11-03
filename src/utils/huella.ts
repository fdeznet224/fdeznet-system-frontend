import client from '@/api/axios';

/**
 * Entrar con la huella o la cara del celular (llaves de acceso / WebAuthn).
 * El servidor manda las opciones en JSON con base64url; el navegador las pide
 * en binario. La huella nunca sale del celular.
 */

// Marca de que en este celular ya se activó: sobrevive al cerrar sesión.
const MARCA = 'huella-celular';
// Dijo «Ahora no» a activarla: no se le vuelve a preguntar en este celular.
export const NO_PREGUNTAR_HUELLA = 'huella-no-preguntar';

export interface SesionHuella {
    access_token: string;
    token_type: string;
    user: { id: number; usuario: string; rol: string };
}

const aBinario = (texto: string): ArrayBuffer => {
    const base64 = texto.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(texto.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return bytes.buffer;
};

const aTexto = (datos: ArrayBuffer | null | undefined): string | undefined => {
    if (!datos) return undefined;
    let binario = '';
    new Uint8Array(datos).forEach((b) => { binario += String.fromCharCode(b); });
    return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

interface Descriptor { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }

/** ¿Este celular o computadora tiene huella, cara o PIN de pantalla? */
export async function huellaPosible(): Promise<boolean> {
    try {
        return Boolean(window.PublicKeyCredential)
            && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

export function huellaActivadaAqui(): string | null {
    try { return localStorage.getItem(MARCA); } catch { return null; }
}

export function olvidarHuellaAqui() {
    try { localStorage.removeItem(MARCA); } catch { /* sin almacenamiento */ }
}

/** Cerrar sesión sin olvidar que este celular entra con huella. */
export function limpiarSesionLocal() {
    const guardar = [MARCA, NO_PREGUNTAR_HUELLA].map((clave) => [clave, localStorage.getItem(clave)] as const);
    localStorage.clear();
    for (const [clave, valor] of guardar) if (valor) localStorage.setItem(clave, valor);
}

function credencialJson(credencial: PublicKeyCredential) {
    const respuesta = credencial.response as AuthenticatorAttestationResponse & AuthenticatorAssertionResponse;
    return {
        id: credencial.id,
        rawId: aTexto(credencial.rawId),
        type: credencial.type,
        authenticatorAttachment: credencial.authenticatorAttachment ?? undefined,
        clientExtensionResults: credencial.getClientExtensionResults(),
        response: {
            clientDataJSON: aTexto(respuesta.clientDataJSON),
            attestationObject: aTexto(respuesta.attestationObject),
            transports: typeof respuesta.getTransports === 'function' ? respuesta.getTransports() : undefined,
            authenticatorData: aTexto(respuesta.authenticatorData),
            signature: aTexto(respuesta.signature),
            userHandle: aTexto(respuesta.userHandle),
        },
    };
}

/** Registra la huella de este celular para el usuario que ya entró con su contraseña. */
export async function activarHuella(usuario: string, nombre: string) {
    const { data } = await client.post<{ opciones: string; token: string }>('/auth/huella/registro/opciones');
    const opciones = JSON.parse(data.opciones);
    const credencial = await navigator.credentials.create({
        publicKey: {
            ...opciones,
            challenge: aBinario(opciones.challenge),
            user: { ...opciones.user, id: aBinario(opciones.user.id) },
            excludeCredentials: (opciones.excludeCredentials ?? []).map((c: Descriptor) => ({ ...c, id: aBinario(c.id) })),
        },
    }) as PublicKeyCredential | null;
    if (!credencial) throw new Error('No se registró la huella');
    await client.post('/auth/huella/registro', { token: data.token, credencial: credencialJson(credencial), nombre });
    localStorage.setItem(MARCA, usuario);
}

/** El celular ofrece la huella de este sistema y, si coincide, entra. */
export async function entrarConHuella(): Promise<SesionHuella> {
    const { data } = await client.post<{ opciones: string; token: string }>('/auth/huella/entrar/opciones');
    const opciones = JSON.parse(data.opciones);
    const credencial = await navigator.credentials.get({
        publicKey: {
            ...opciones,
            challenge: aBinario(opciones.challenge),
            allowCredentials: (opciones.allowCredentials ?? []).map((c: Descriptor) => ({ ...c, id: aBinario(c.id) })),
        },
    }) as PublicKeyCredential | null;
    if (!credencial) throw new Error('No se confirmó la huella');
    const respuesta = await client.post<SesionHuella>('/auth/huella/entrar', { token: data.token, credencial: credencialJson(credencial) });
    return respuesta.data;
}

/** El nombre que se le pone a la llave: «Android · Chrome», «iPhone · Safari»… */
export function nombreDeEsteCelular(): string {
    const agente = navigator.userAgent;
    const equipo = /iPhone/.test(agente) ? 'iPhone' : /iPad/.test(agente) ? 'iPad' : /Android/.test(agente) ? 'Android'
        : /Windows/.test(agente) ? 'Windows' : /Mac/.test(agente) ? 'Mac' : 'Este equipo';
    return `${equipo} · ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

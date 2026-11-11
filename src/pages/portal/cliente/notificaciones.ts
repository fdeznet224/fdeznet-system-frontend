import axios from 'axios';

import portalClient from '@/api/portal';

/**
 * Notificaciones del portal (Web Push). El navegador se suscribe con la llave
 * pública del ISP y el servidor manda ahí los mismos avisos que por WhatsApp.
 * En iPhone solo funcionan con el portal instalado en la pantalla de inicio.
 *
 * La suscripción del celular puede morir (Chrome borró datos, se quitó y volvió
 * a dar el permiso…): Google responde 410 y el servidor la borra, pero el
 * celular la sigue teniendo. Por eso al activar se manda una prueba y, si no
 * llega, se crea una nueva; y al abrir el portal se revisa que el servidor
 * todavía lo tenga.
 */
export type EstadoNotificaciones = 'no_disponible' | 'bloqueadas' | 'apagadas' | 'activas';

/** La prueba no llegó ni con una suscripción nueva; el mensaje es para el cliente. */
export class SinEntrega extends Error {}

export const mensajeDeError = (e: unknown, otro: string) => (e instanceof SinEntrega ? e.message : otro);

function llaveComoBytes(base64: string): Uint8Array<ArrayBuffer> {
    const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
    const crudo = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
    for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
    return bytes;
}

const soportadas = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Suscribe este celular y lo registra en el servidor; con `nueva`, tira la suscripción anterior. */
async function registrar(clavePublica: string, nueva: boolean): Promise<void> {
    const registro = await navigator.serviceWorker.ready;
    let suscripcion = await registro.pushManager.getSubscription();
    if (suscripcion && nueva) {
        await suscripcion.unsubscribe().catch(() => undefined);
        suscripcion = null;
    }
    suscripcion ??= await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveComoBytes(clavePublica) });
    await portalClient.post('/portal/notificaciones', suscripcion.toJSON());
}

/** true si la prueba llegó a Google; false si la suscripción estaba muerta (409). */
async function probar(): Promise<boolean> {
    try {
        await portalClient.post('/portal/notificaciones/prueba');
        return true;
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 409) return false;
        return true; // Demasiadas pruebas u otro error: la suscripción quedó guardada.
    }
}

export async function estadoNotificaciones(disponibleEnServidor: boolean, clavePublica: string | null): Promise<EstadoNotificaciones> {
    if (!disponibleEnServidor || !soportadas()) return 'no_disponible';
    if (Notification.permission === 'denied') return 'bloqueadas';
    const registro = await navigator.serviceWorker.ready;
    const suscripcion = await registro.pushManager.getSubscription();
    if (!suscripcion || Notification.permission !== 'granted') return 'apagadas';
    try {
        const { data } = await portalClient.post<{ estado: 'propio' | 'ninguno' | 'otro' }>(
            '/portal/notificaciones/verificar', { endpoint: suscripcion.endpoint });
        if (data.estado === 'otro') return 'apagadas'; // Este celular recibe los avisos de otro contrato.
        if (data.estado === 'ninguno' && clavePublica) await registrar(clavePublica, true);
    } catch {
        // Sin red o sin servidor: se queda como lo tiene el celular.
    }
    return 'activas';
}

export async function activarNotificaciones(clavePublica: string): Promise<EstadoNotificaciones> {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueadas' : 'apagadas';
    await registrar(clavePublica, false);
    if (await probar()) return 'activas';
    await registrar(clavePublica, true);
    if (await probar()) return 'activas';
    await desactivarNotificaciones();
    throw new SinEntrega('No pudimos enviar avisos a este celular. Revisa que Chrome tenga permiso de notificaciones e inténtalo de nuevo.');
}

export async function desactivarNotificaciones(): Promise<EstadoNotificaciones> {
    const registro = await navigator.serviceWorker.ready;
    const suscripcion = await registro.pushManager.getSubscription();
    if (suscripcion) {
        await portalClient.post('/portal/notificaciones/quitar', { endpoint: suscripcion.endpoint }).catch(() => undefined);
        await suscripcion.unsubscribe();
    }
    return 'apagadas';
}

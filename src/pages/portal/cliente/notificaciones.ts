import portalClient from '@/api/portal';

/**
 * Notificaciones del portal (Web Push). El navegador se suscribe con la llave
 * pública del ISP y el servidor manda ahí los mismos avisos que por WhatsApp.
 * En iPhone solo funcionan con el portal instalado en la pantalla de inicio.
 */
export type EstadoNotificaciones = 'no_disponible' | 'bloqueadas' | 'apagadas' | 'activas';

function llaveComoBytes(base64: string): Uint8Array<ArrayBuffer> {
    const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
    const crudo = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
    for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
    return bytes;
}

const soportadas = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function estadoNotificaciones(disponibleEnServidor: boolean): Promise<EstadoNotificaciones> {
    if (!disponibleEnServidor || !soportadas()) return 'no_disponible';
    if (Notification.permission === 'denied') return 'bloqueadas';
    const registro = await navigator.serviceWorker.ready;
    return (await registro.pushManager.getSubscription()) ? 'activas' : 'apagadas';
}

export async function activarNotificaciones(clavePublica: string): Promise<EstadoNotificaciones> {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueadas' : 'apagadas';
    const registro = await navigator.serviceWorker.ready;
    const suscripcion = (await registro.pushManager.getSubscription())
        ?? await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveComoBytes(clavePublica) });
    await portalClient.post('/portal/notificaciones', suscripcion.toJSON());
    return 'activas';
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

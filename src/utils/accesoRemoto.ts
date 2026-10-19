import { toast } from 'react-hot-toast';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';

interface AccesoEquipo { url: string; puerto: string; responde: boolean; probados: string[] }
interface AccesoAntena { url: string; router: string; expira: string }

/** La ventana se abre al momento del clic (si no, el navegador la bloquea) y
 *  se lleva a la dirección cuando el servidor la responde. */
function ventanaEnBlanco() {
    const ventana = window.open('about:blank', '_blank');
    if (ventana) ventana.opener = null;
    return ventana;
}

function llevar(ventana: Window | null, url: string) {
    if (ventana && !ventana.closed) ventana.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
}

/** ONU o router de radio por su IP: el servidor prueba el puerto de su marca
 *  (Huawei 80, ZTE 8090, radio 8080) y, si no contesta, los demás. */
export async function abrirEquipo(ip: string) {
    const host = ip.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const ventana = ventanaEnBlanco();
    try {
        const { data } = await client.get<AccesoEquipo>('/clientes/acceso-web', { params: { ip: host } });
        if (!data.responde) toast(`El equipo no contestó en ${data.probados.join(', ')}; se abre en el ${data.puerto}`, { icon: '⚠️' });
        llevar(ventana, data.url);
    } catch {
        llevar(ventana, `http://${host}`);
    }
}

/** Antena Ubiquiti en la VLAN del MikroTik: se abre por un puente temporal del router. */
export async function abrirAntena(clienteId: number) {
    const ventana = ventanaEnBlanco();
    try {
        const { data } = await client.post<{ data: AccesoAntena }>(`/clientes/${clienteId}/acceso-antena`);
        const hora = new Date(data.data.expira).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        toast.success(`Antena abierta por ${data.data.router} hasta las ${hora}`);
        llevar(ventana, data.data.url);
    } catch (error) {
        ventana?.close();
        toast.error(apiErrorMessage(error, 'No se pudo abrir la antena'));
    }
}

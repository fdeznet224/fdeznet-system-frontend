import { useEffect, useState } from 'react';

import client from '@/api/axios';

let pendiente: Promise<string> | null = null;

/** Puerto web del router de los clientes por radio (Configuración → Acceso a la ONU). */
export function usePuertoRouterRadio() {
    const [puerto, setPuerto] = useState('');
    useEffect(() => {
        let vigente = true;
        pendiente ??= client.get<{ radio?: { puerto?: string } }>('/configuracion/acceso-onu')
            .then(({ data }) => data.radio?.puerto ?? '')
            .catch(() => {
                pendiente = null;
                return '';
            });
        void pendiente.then((valor) => { if (vigente) setPuerto(valor); });
        return () => { vigente = false; };
    }, []);
    return puerto;
}

/** Abre la página del equipo del cliente; en radio, el Mercusys en su puerto. */
export function abrirIpHttp(ip: string, puerto?: string) {
    const host = ip.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    window.open(`http://${host}${puerto ? `:${puerto}` : ''}`, '_blank', 'noopener,noreferrer');
}

/** Cómo se conectan los clientes de un MikroTik: lo define el router
 *  (Gestión de Tráfico) y el formulario pide solo lo de ese modo.
 *  Igual que backend acceso_red.py. */
export type ModoAcceso = 'pppoe' | 'dhcp' | 'estatica';

export const NOMBRE_MODO: Record<ModoAcceso, string> = {
    pppoe: 'PPPoE',
    dhcp: 'DHCP',
    estatica: 'IP fija',
};

export function modoRouter(valor?: string | null): ModoAcceso {
    return valor === 'dhcp' || valor === 'estatica' ? valor : 'pppoe';
}

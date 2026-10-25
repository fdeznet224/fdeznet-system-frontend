import { useEffect, useState } from 'react';
import { ArrowDownTrayIcon, BellAlertIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import { useInstalacion } from './instalacion';
import { activarNotificaciones, estadoNotificaciones, type EstadoNotificaciones } from './notificaciones';
import { BOTON, BOTON_SUAVE, TARJETA } from './ui';

const VISTA = 'portal_bienvenida_vista';

function yaVista(): boolean {
    try { return sessionStorage.getItem(VISTA) === '1'; } catch { return false; }
}

/**
 * Al entrar al portal: instalar la app y aceptar las notificaciones, para que
 * los avisos de cobro le lleguen al celular. Sale cada vez que abre el portal
 * hasta que las active; no se puede forzar porque el navegador decide (en
 * iPhone solo hay notificaciones con la app instalada y, si las bloqueó, ya no
 * se le pueden volver a pedir).
 */
export default function BienvenidaApp({ color }: { color: string }) {
    const { disponible, iphone, instalar } = useInstalacion();
    const [estado, setEstado] = useState<EstadoNotificaciones | null>(null);
    const [clave, setClave] = useState<string | null>(null);
    const [cerrada, setCerrada] = useState(yaVista);
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => {
        if (cerrada) return;
        portalClient.get<{ disponible: boolean; clave_publica: string | null }>('/portal/notificaciones')
            .then(async ({ data }) => { setClave(data.clave_publica); setEstado(await estadoNotificaciones(data.disponible)); })
            .catch(() => setEstado('no_disponible'));
    }, [cerrada]);

    const pendienteAvisos = estado === 'apagadas' || estado === 'bloqueadas';
    if (cerrada || !estado || (!pendienteAvisos && !disponible)) return null;

    const cerrar = () => {
        try { sessionStorage.setItem(VISTA, '1'); } catch { /* sin almacenamiento: vuelve a salir al recargar */ }
        setCerrada(true);
    };

    const activar = async () => {
        setOcupado(true);
        try {
            const nuevo = await activarNotificaciones(clave!);
            setEstado(nuevo);
            if (nuevo === 'activas') {
                await portalClient.post('/portal/notificaciones/prueba').catch(() => undefined);
                toast.success('Listo, te avisaremos aquí.');
            }
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudieron activar'));
        } finally {
            setOcupado(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
            <div className={`${TARJETA} w-full max-w-sm space-y-5`} role="dialog" aria-modal="true" aria-labelledby="bienvenida-titulo">
                <div className="space-y-1.5 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${color}1a`, color }}>
                        <BellAlertIcon className="h-6 w-6" />
                    </span>
                    <h2 id="bienvenida-titulo" className="pt-2 text-lg font-semibold">Recibe tus avisos aquí</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Te avisamos de tus facturas, pagos y cortes de servicio con una notificación en tu celular.
                    </p>
                </div>

                {disponible && (
                    <div className="space-y-3">
                        <button type="button" onClick={() => void instalar()} disabled={iphone} className={`${BOTON_SUAVE} w-full`}>
                            <ArrowDownTrayIcon className="h-5 w-5" /> Instalar la app
                        </button>
                        {iphone && (
                            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                                En Safari toca <strong>Compartir</strong> (el cuadro con la flecha) y luego <strong>Agregar a inicio</strong>.
                                Abre la app desde tu pantalla de inicio para activar las notificaciones.
                            </p>
                        )}
                    </div>
                )}

                {estado === 'apagadas' && (
                    <button type="button" onClick={() => void activar()} disabled={ocupado || !clave} className={BOTON} style={{ background: color }}>
                        {ocupado ? 'Activando…' : 'Activar notificaciones'}
                    </button>
                )}
                {estado === 'bloqueadas' && (
                    <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                        Las notificaciones están bloqueadas. Toca el candado junto a la dirección (o los ajustes de la app) y permite las notificaciones.
                    </p>
                )}
                {estado === 'activas' && (
                    <p className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircleIcon className="h-5 w-5" /> Notificaciones activas
                    </p>
                )}

                <button type="button" onClick={cerrar} className="w-full py-1 text-center text-sm text-slate-500 dark:text-slate-400">
                    {estado === 'activas' ? 'Continuar' : 'Ahora no'}
                </button>
            </div>
        </div>
    );
}

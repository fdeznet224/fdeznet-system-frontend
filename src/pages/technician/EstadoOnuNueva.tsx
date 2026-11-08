import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, CheckCircleIcon, ClipboardDocumentIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import client from '../../api/axios';
import { apiErrorMessage } from '@/utils/apiError';

interface Configuracion {
    estado: 'pendiente' | 'aplicado' | 'vencido' | 'error' | 'manual' | 'guardado';
    red: string;
    clave: string;
    detalle: string | null;
    cambio_onu: boolean;
    aviso: boolean;
    creado_en: string;
    aplicado_en: string | null;
    usuario_pppoe?: string | null;
    clave_pppoe?: string | null;
}

const RECIENTE_MS = 3 * 60 * 60 * 1000;

function copiar(texto: string) {
    void navigator.clipboard?.writeText(texto).then(() => toast.success('Copiado')).catch(() => toast.error('No se pudo copiar'));
}

/** Si la ONU (nueva o de reemplazo) ya quedó con su WiFi y su PPPoE: se revisa cada 10 s mientras espera.
 *  Si no se pudo sola, da los datos para ponerlos a mano y deja reintentar. */
export default function EstadoOnuNueva({ clienteId, version = 0, soloCambio = false }: {
    clienteId: number;
    version?: number;
    /** En una reparación solo interesa la de un cambio de ONU (no la de su instalación). */
    soloCambio?: boolean;
}) {
    const [config, setConfig] = useState<Configuracion | null>(null);
    const [vuelta, setVuelta] = useState(0);
    const [reintentando, setReintentando] = useState(false);

    useEffect(() => {
        let vigente = true;
        let temporizador: number | undefined;
        const leer = async () => {
            try {
                const { data } = await client.get<Configuracion | null>(`/clientes/${clienteId}/onu-automatica`);
                if (!vigente) return;
                // Solo la de esta visita.
                const reciente = data && Date.now() - new Date(data.creado_en).getTime() <= RECIENTE_MS;
                setConfig(reciente && (!soloCambio || data.cambio_onu) ? data : null);
                if (data?.estado === 'pendiente') temporizador = window.setTimeout(() => void leer(), 10000);
            } catch {
                if (vigente) temporizador = window.setTimeout(() => void leer(), 20000);
            }
        };
        void leer();
        return () => { vigente = false; window.clearTimeout(temporizador); };
    }, [clienteId, version, vuelta, soloCambio]);

    if (!config || config.estado === 'guardado') return null;

    const reintentar = async () => {
        setReintentando(true);
        try {
            await client.post(`/clientes/${clienteId}/onu-automatica/reintentar`);
            toast.success('Se vuelve a intentar; espera 1 a 3 minutos');
            setVuelta((n) => n + 1);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo reintentar'));
        } finally {
            setReintentando(false);
        }
    };

    const listo = config.estado === 'aplicado';
    const espera = config.estado === 'pendiente';
    const aMano = !listo && !espera;
    const color = listo
        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
        : espera
            ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
    const nombre = config.cambio_onu ? 'ONU nueva' : 'ONU del cliente';
    const titulo = listo
        ? `${nombre} lista: ya tiene su WiFi y su PPPoE`
        : espera
            ? `Configurando la ${nombre.toLowerCase().replace('onu', 'ONU')}…`
            : config.estado === 'manual'
                ? 'Esta ZTE no está en el ACS: configúrala a mano'
                : `No se pudo configurar sola la ${nombre.toLowerCase().replace('onu', 'ONU')}`;
    const Icono = listo ? CheckCircleIcon : espera ? ArrowPathIcon : ExclamationTriangleIcon;
    const datos: [string, string | null | undefined][] = [
        ['Red WiFi', config.red],
        ['Contraseña WiFi', config.clave],
        ...(aMano ? [['Usuario PPPoE', config.usuario_pppoe], ['Contraseña PPPoE', config.clave_pppoe]] as [string, string | null | undefined][] : []),
    ];

    return (
        <div className={`space-y-2 rounded-xl p-3 ${color}`} data-testid="estado-onu-nueva">
            <div className="flex gap-3">
                <Icono className={`h-5 w-5 shrink-0 ${espera ? 'animate-spin' : ''}`} />
                <div className="min-w-0 space-y-0.5 text-sm">
                    <p className="font-bold">{titulo}</p>
                    {espera && <p className="text-xs">No la configures a mano: tarda de 1 a 3 minutos. Aquí verás cuando quede.</p>}
                    {aMano && <p className="text-xs">Ponle estos datos desde su página (192.168.1.1) o vuelve a intentar.</p>}
                    {config.detalle && !listo && <p className="text-xs opacity-80">{config.detalle}</p>}
                    {config.aviso && !aMano && (
                        <p className="text-xs opacity-80">
                            {listo ? 'Se le mandó al cliente por WhatsApp.' : 'Se le manda al cliente por WhatsApp en cuanto quede.'}
                        </p>
                    )}
                </div>
            </div>
            <div className="divide-y divide-black/5 rounded-lg bg-white/60 px-3 dark:divide-white/10 dark:bg-black/20">
                {datos.map(([etiqueta, valor]) => (
                    <div key={etiqueta} className="flex items-center justify-between gap-2 py-1.5">
                        <div className="min-w-0">
                            <p className="text-[11px] opacity-70">{etiqueta}</p>
                            <p className="break-all font-mono text-sm font-bold">{valor || '—'}</p>
                        </div>
                        {valor && (
                            <button type="button" aria-label={`Copiar ${etiqueta}`} onClick={() => copiar(valor)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10">
                                <ClipboardDocumentIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {(config.estado === 'error' || config.estado === 'vencido') && (
                <button type="button" disabled={reintentando} onClick={() => void reintentar()}
                    className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                    {reintentando ? 'Reintentando…' : 'Reintentar'}
                </button>
            )}
        </div>
    );
}

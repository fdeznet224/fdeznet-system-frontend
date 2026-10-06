import { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon, CheckCircleIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';

interface EstadoOnuData {
    disponible: boolean;
    error?: string;
    olt?: string;
    serial?: string;
    modelo?: string | null;
    online?: boolean;
    rx?: number | null;
    tx?: number | null;
    encendida?: string | null;
    ultima_caida?: string | null;
    causa_ultima_caida?: string | null;
    recomendacion?: string | null;
    puede_reiniciar?: boolean;
}

const fila = 'flex items-start justify-between gap-3 border-b border-slate-200 py-2 last:border-0 dark:border-slate-800/50';
const etiqueta = 'text-xs font-bold uppercase tracking-wider text-slate-500';
const valor = 'text-right text-sm font-black text-slate-900 dark:text-slate-200';

/** Estado de la ONU en la OLT: en línea, tiempo encendida y su última caída. */
export function EstadoOnu({ clienteId }: { clienteId: number }) {
    const [estado, setEstado] = useState<EstadoOnuData | null>(null);
    const [leyendo, setLeyendo] = useState(false);

    const leer = useCallback(async () => {
        setLeyendo(true);
        try {
            const { data } = await client.get<EstadoOnuData>(`/ftth/clientes/${clienteId}/estado-onu`);
            setEstado(data);
        } catch (error) {
            setEstado({ disponible: false, error: apiErrorMessage(error, 'No se pudo consultar la OLT') });
        } finally {
            setLeyendo(false);
        }
    }, [clienteId]);

    useEffect(() => {
        const primera = window.setTimeout(() => void leer(), 0);
        return () => window.clearTimeout(primera);
    }, [leer]);

    if (!estado) {
        return (
            <div className="flex flex-col items-center py-12 text-slate-500">
                <ArrowPathIcon className="mb-3 h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-500" />
                <p className="text-[10px] font-black uppercase tracking-widest">Consultando la OLT…</p>
            </div>
        );
    }
    if (!estado.disponible) {
        return (
            <div className="space-y-3 py-6 text-center">
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{estado.error}</p>
                <button type="button" onClick={() => void leer()} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black dark:bg-slate-800">Reintentar</button>
            </div>
        );
    }
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full border-4 ${estado.online ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'}`}>
                    {estado.online ? <CheckCircleIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-500" /> : <NoSymbolIcon className="h-7 w-7 text-rose-600 dark:text-rose-500" />}
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-xl font-black ${estado.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {estado.online ? 'ONU en línea' : 'ONU caída'}
                    </p>
                    <p className="truncate text-xs text-slate-500">{estado.olt}</p>
                </div>
                <button type="button" aria-label="Volver a consultar la ONU" onClick={() => void leer()} disabled={leyendo} className="rounded-lg p-2 text-slate-400 hover:text-slate-700 disabled:opacity-50 dark:hover:text-slate-200">
                    <ArrowPathIcon className={`h-5 w-5 ${leyendo ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
                <div className={fila}><span className={etiqueta}>Potencia</span><span className={`${valor} font-mono`}>{estado.rx != null ? `${estado.rx.toFixed(2)} dBm` : 'Sin señal'}</span></div>
                {estado.encendida && <div className={fila}><span className={etiqueta}>Encendida hace</span><span className={valor}>{estado.encendida}</span></div>}
                {(estado.ultima_caida || estado.causa_ultima_caida) && (
                    <div className={fila}>
                        <span className={etiqueta}>Última caída</span>
                        <span className={valor}>
                            {estado.ultima_caida}
                            {estado.causa_ultima_caida && <span className="block text-xs font-semibold text-slate-500">{estado.causa_ultima_caida}</span>}
                        </span>
                    </div>
                )}
                <div className={fila}><span className={etiqueta}>Equipo</span><span className={`${valor} font-mono text-xs`}>{estado.serial}{estado.modelo ? ` · ${estado.modelo}` : ''}</span></div>
            </div>
            {estado.recomendacion && <p className="text-xs text-slate-500">{estado.recomendacion}</p>}
        </div>
    );
}

/** Reinicio normal de la ONU (no borra su configuración). */
export function ReiniciarOnu({ clienteId, onListo }: { clienteId: number; onListo: () => void }) {
    const [reiniciando, setReiniciando] = useState(false);

    const reiniciar = async () => {
        setReiniciando(true);
        const aviso = toast.loading('Reiniciando la ONU…');
        try {
            await client.post(`/clientes/${clienteId}/reiniciar-onu`);
            toast.success('La ONU se está reiniciando; vuelve en 1 a 2 minutos', { id: aviso, duration: 6000 });
            onListo();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo reiniciar la ONU'), { id: aviso, duration: 8000 });
        } finally {
            setReiniciando(false);
        }
    };

    return (
        <div className="space-y-5 py-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
                <ArrowPathIcon className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">¿Reiniciar la ONU?</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                    Es un reinicio normal: no borra su configuración. El cliente se queda sin internet 1 a 2 minutos.
                </p>
            </div>
            <button
                type="button"
                disabled={reiniciando}
                onClick={() => void reiniciar()}
                className="w-full rounded-xl bg-amber-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-amber-500 active:scale-95 disabled:opacity-50"
            >
                {reiniciando ? 'Reiniciando…' : 'Reiniciar ONU'}
            </button>
        </div>
    );
}

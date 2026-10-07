import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckBadgeIcon, SignalIcon } from '@heroicons/react/24/outline';

import client from '../../api/axios';
import { apiErrorMessage } from '@/utils/apiError';

interface Diagnostico {
    resultado?: string;
    sugerencia?: string | null;
    olt: { disponible?: boolean; onu_online?: boolean | null; potencia_rx_dbm?: number | string | null };
}

/**
 * Cierre de una reparación: el técnico verifica la señal en vivo (queda
 * guardada como prueba de cómo quedó) y escribe qué encontró y qué hizo.
 */
export default function FinalizarReparacion({ ordenId, online, onTerminada }: {
    ordenId: number;
    online: boolean;
    onTerminada: () => void;
}) {
    const [solucion, setSolucion] = useState('');
    const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
    const [ocupado, setOcupado] = useState<'verificando' | 'terminando' | null>(null);

    const verificar = async () => {
        setOcupado('verificando');
        try {
            const { data } = await client.post<Diagnostico>(`/soporte/incidencias/${ordenId}/diagnosticar`);
            setDiagnostico(data);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo verificar la señal'));
        } finally {
            setOcupado(null);
        }
    };

    const terminar = async () => {
        if (solucion.trim().length < 5) {
            toast.error('Escribe qué encontraste y qué hiciste');
            return;
        }
        setOcupado('terminando');
        try {
            // Verificar la señal cambia la versión de la orden: se lee la actual.
            const { data: orden } = await client.get<{ version: number }>(`/soporte/incidencias/${ordenId}`);
            await client.post(`/soporte/incidencias/${ordenId}/resolver`, { solucion: solucion.trim(), version: orden.version });
            toast.success('Reparación terminada');
            onTerminada();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo terminar la reparación'), { duration: 8000 });
        } finally {
            setOcupado(null);
        }
    };

    if (!online) {
        return <p className="ml-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Para terminar la reparación necesitas conexión: se verifica la señal en la OLT.</p>;
    }

    const rx = diagnostico?.olt.potencia_rx_dbm;
    const rxNumero = rx != null && rx !== '' ? Number(rx) : null;
    return (
        <div className="ml-2 space-y-2">
            <button
                type="button"
                disabled={ocupado !== null}
                onClick={() => void verificar()}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-[10px] font-black uppercase tracking-widest text-blue-700 active:scale-95 disabled:opacity-50 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
            >
                <SignalIcon className="h-4 w-4" /> {ocupado === 'verificando' ? 'Consultando la OLT…' : diagnostico ? 'Volver a verificar señal' : 'Verificar señal'}
            </button>
            {diagnostico && (
                <div className={`rounded-xl p-3 text-xs font-bold ${rxNumero != null && rxNumero >= -27 && diagnostico.olt.onu_online !== false
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300'}`}
                >
                    {diagnostico.olt.onu_online === false ? 'ONU caída' : 'ONU en línea'}
                    {rxNumero != null && Number.isFinite(rxNumero) ? ` · ${rxNumero.toFixed(2)} dBm` : ' · sin lectura de potencia'}
                    {diagnostico.sugerencia && <span className="mt-1 block font-semibold opacity-80">{diagnostico.sugerencia}</span>}
                </div>
            )}
            <textarea
                aria-label="Qué encontraste y qué hiciste"
                rows={3}
                value={solucion}
                onChange={(event) => setSolucion(event.target.value)}
                placeholder="Qué encontraste y qué hiciste *"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <button
                type="button"
                disabled={ocupado !== null || !diagnostico}
                onClick={() => void terminar()}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white active:scale-95 disabled:opacity-50"
            >
                {ocupado === 'terminando' ? 'Guardando…' : 'Terminar reparación'} <CheckBadgeIcon className="h-5 w-5" />
            </button>
            {!diagnostico && <p className="text-center text-[10px] text-slate-400">Verifica la señal antes de terminar.</p>}
        </div>
    );
}

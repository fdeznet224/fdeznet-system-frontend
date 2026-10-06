import { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';

interface Lectura {
    disponible: boolean;
    onu_online: boolean | null;
    rx: number | null;
    tx: number | null;
    nivel: 'alta' | 'normal' | null;
    error?: string | null;
}

const CADA_SEGUNDOS = 30;

/**
 * Potencia óptica del cliente leída de la OLT en este momento. Se vuelve a
 * leer cada 30 segundos mientras está a la vista (sirve cuando el técnico
 * está moviendo la fibra).
 */
export default function PotenciaEnVivo({ clienteId }: { clienteId: number }) {
    const [lectura, setLectura] = useState<Lectura | null>(null);
    const [leyendo, setLeyendo] = useState(false);
    const [hora, setHora] = useState<string | null>(null);

    const leer = useCallback(async () => {
        setLeyendo(true);
        try {
            const { data } = await client.get<Lectura>(`/ftth/clientes/${clienteId}/potencia-actual`);
            setLectura(data);
            setHora(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } catch {
            setLectura({ disponible: false, onu_online: null, rx: null, tx: null, nivel: null, error: 'No se pudo consultar la OLT' });
        } finally {
            setLeyendo(false);
        }
    }, [clienteId]);

    useEffect(() => {
        const primera = window.setTimeout(() => void leer(), 0);
        const intervalo = window.setInterval(() => void leer(), CADA_SEGUNDOS * 1000);
        return () => { window.clearTimeout(primera); window.clearInterval(intervalo); };
    }, [leer]);

    const color = lectura?.rx == null
        ? 'text-slate-500'
        : lectura.nivel === 'alta' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';

    let detalle = 'Leyendo la OLT…';
    if (lectura) {
        if (!lectura.disponible) detalle = lectura.error || 'Sin lectura de la OLT';
        else if (lectura.rx == null) detalle = lectura.onu_online === false ? 'ONU sin señal (apagada o fibra cortada)' : 'La OLT no reportó potencia';
        else detalle = lectura.nivel === 'alta' ? 'Potencia alta: peor que -27 dBm' : 'Potencia normal';
    }

    return (
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/40">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold text-slate-400">Potencia óptica (en vivo)</p>
                <button
                    type="button"
                    aria-label="Volver a leer la potencia"
                    onClick={() => void leer()}
                    disabled={leyendo}
                    className="rounded-lg p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50 dark:hover:text-slate-200"
                >
                    <ArrowPathIcon className={`h-4 w-4 ${leyendo ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <p className={`mt-1 font-mono text-2xl font-black ${color}`}>
                {lectura?.rx != null ? `${lectura.rx.toFixed(2)} dBm` : '—'}
            </p>
            <p className="text-xs text-slate-500">
                {detalle}
                {lectura?.tx != null ? ` · TX ${lectura.tx.toFixed(2)} dBm` : ''}
                {hora ? ` · ${hora}` : ''}
            </p>
        </div>
    );
}

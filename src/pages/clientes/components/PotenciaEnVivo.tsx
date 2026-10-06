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

// Para no saturar la OLT: cada lectura descarga todas sus ONU.
const CADA_SEGUNDOS = 60;
const DURANTE_MINUTOS = 5;

/**
 * Potencia óptica del cliente leída de la OLT en este momento. Se vuelve a
 * leer cada minuto mientras la ventana está a la vista y se detiene a los 5
 * minutos; el botón la reanuda (sirve cuando el técnico mueve la fibra).
 */
export default function PotenciaEnVivo({ clienteId }: { clienteId: number }) {
    const [lectura, setLectura] = useState<Lectura | null>(null);
    const [leyendo, setLeyendo] = useState(false);
    const [hora, setHora] = useState<string | null>(null);
    // Hasta cuándo se sigue leyendo sola; el botón lo extiende otros 5 minutos.
    const [activoHasta, setActivoHasta] = useState(() => Date.now() + DURANTE_MINUTOS * 60_000);
    const [pausado, setPausado] = useState(false);

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
        return () => window.clearTimeout(primera);
    }, [leer]);

    useEffect(() => {
        if (pausado) return;
        const intervalo = window.setInterval(() => {
            if (Date.now() > activoHasta) {
                setPausado(true);
                return;
            }
            // Ventana en segundo plano: no se consulta la OLT.
            if (document.hidden) return;
            void leer();
        }, CADA_SEGUNDOS * 1000);
        return () => window.clearInterval(intervalo);
    }, [leer, pausado, activoHasta]);

    const reanudar = () => {
        setActivoHasta(Date.now() + DURANTE_MINUTOS * 60_000);
        setPausado(false);
        void leer();
    };

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
                    onClick={reanudar}
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
            {pausado && (
                <button type="button" onClick={reanudar} className="mt-2 text-xs font-black text-blue-600 dark:text-blue-400">
                    Lectura en pausa · tocar para seguir leyendo
                </button>
            )}
        </div>
    );
}

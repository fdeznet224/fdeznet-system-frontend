import { useEffect, useRef, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import ConsumoCliente from '@/pages/clientes/components/ConsumoCliente';
import { ETIQUETA, TARJETA } from './ui';

const CADA_MS = 3000;
const PUNTOS = 30;

function mbps(bps: number) {
    const valor = bps / 1_000_000;
    return valor >= 10 ? valor.toFixed(0) : valor.toFixed(1);
}

/** Lo que está usando ahora (de su sesión PPPoE) y el calendario de MB por día. */
export default function ConsumoPortal({ nombre, color }: { nombre: string; color: string }) {
    const [actual, setActual] = useState<{ bajada: number; subida: number } | null>(null);
    const [historial, setHistorial] = useState<number[]>([]);
    const [sinDatos, setSinDatos] = useState(false);
    const vivo = useRef(true);

    useEffect(() => {
        vivo.current = true;
        let temporizador = 0;
        const leer = async () => {
            if (document.visibilityState === 'visible') {
                try {
                    const { data } = await portalClient.get<{ bajada_bps: number; subida_bps: number; disponible: boolean }>('/portal/trafico');
                    if (!vivo.current) return;
                    setSinDatos(!data.disponible);
                    setActual({ bajada: data.bajada_bps, subida: data.subida_bps });
                    setHistorial((h) => [...h, data.bajada_bps].slice(-PUNTOS));
                } catch {
                    if (vivo.current) setSinDatos(true);
                }
            }
            if (vivo.current) temporizador = window.setTimeout(() => void leer(), CADA_MS);
        };
        void leer();
        return () => { vivo.current = false; window.clearTimeout(temporizador); };
    }, []);

    const maximo = Math.max(...historial, 1);

    return (
        <>
            <section className={TARJETA} data-testid="consumo-en-vivo">
                <div className="flex items-center justify-between">
                    <p className={ETIQUETA}>Usando ahora</p>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className={`h-2 w-2 rounded-full ${sinDatos ? 'bg-slate-400' : 'animate-pulse bg-emerald-500'}`} />
                        {sinDatos ? 'Sin lectura' : 'En vivo'}
                    </span>
                </div>
                <div className="mt-3 flex items-end gap-6">
                    <p className="flex items-baseline gap-1">
                        <ArrowDownIcon className="h-5 w-5 self-center text-slate-400" />
                        <span className="text-4xl font-semibold tracking-tight">{actual ? mbps(actual.bajada) : '–'}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">Mbps</span>
                    </p>
                    <p className="flex items-baseline gap-1 pb-1 text-slate-500 dark:text-slate-400">
                        <ArrowUpIcon className="h-4 w-4 self-center" />
                        <span className="text-xl font-semibold">{actual ? mbps(actual.subida) : '–'}</span>
                        <span className="text-xs">Mbps</span>
                    </p>
                </div>
                <div className="mt-4 flex h-16 items-end gap-[3px]" aria-hidden="true">
                    {Array.from({ length: PUNTOS }, (_, n) => {
                        const valor = historial[n - (PUNTOS - historial.length)];
                        return (
                            <span key={n} className="flex-1 rounded-t-sm bg-slate-100 dark:bg-slate-800"
                                style={valor !== undefined ? { height: `${Math.max(4, (valor / maximo) * 100)}%`, background: color, opacity: 0.35 + 0.65 * (n / PUNTOS) } : { height: '4%' }} />
                        );
                    })}
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Se actualiza cada 3 segundos con todo lo que se usa en tu casa.</p>
            </section>
            <ConsumoCliente clienteId={0} nombre={nombre} portal />
        </>
    );
}

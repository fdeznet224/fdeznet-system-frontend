import { useEffect, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircleIcon, RssIcon, SignalIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import client from '@/api/axios';
import type { BrandConfig, TipoRed } from '@/context/brand/brand';
import { useBrand } from '@/context/brand/useBrand';

const OPCIONES_RED: { valor: TipoRed; nombre: string; detalle: string; icono: ComponentType<{ className?: string }> }[] = [
    { valor: 'wisp', nombre: 'WISP · Radioenlaces', detalle: 'Clientes por antena. Se ocultan OLT, TR-069 y cajas NAP.', icono: RssIcon },
    { valor: 'fibra', nombre: 'ISP · Fibra óptica', detalle: 'Clientes con ONU: OLT, cajas NAP y TR-069.', icono: SignalIcon },
    { valor: 'hibrido', nombre: 'Híbrido', detalle: 'Fibra y antenas: se muestra todo.', icono: Squares2X2Icon },
];

/** Las tres opciones como tarjetas; guarda al tocar una. */
export function SelectorTipoRed({ alElegir }: { alElegir?: () => void }) {
    const { brand, refreshBrand } = useBrand();
    const [guardando, setGuardando] = useState<TipoRed | null>(null);
    const elegir = async (valor: TipoRed) => {
        setGuardando(valor);
        try {
            await client.put('/configuracion/tipo-red', { tipo_red: valor });
            await refreshBrand();
            toast.success('Listo, el menú se adaptó a tu red');
            alElegir?.();
        } catch {
            toast.error('No se pudo guardar el tipo de red');
        } finally {
            setGuardando(null);
        }
    };
    return (
        <div className="grid gap-2">
            {OPCIONES_RED.map(({ valor, nombre, detalle, icono: Icono }) => {
                const actual = brand.tipo_red === valor;
                return (
                    <button
                        key={valor}
                        type="button"
                        disabled={guardando !== null}
                        onClick={() => void elegir(valor)}
                        className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition disabled:opacity-60 ${actual ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}
                    >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                            <Icono className="h-6 w-6" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">{nombre}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{detalle}</span>
                        </span>
                        {(actual || guardando === valor) && <CheckCircleIcon className={`h-6 w-6 shrink-0 text-blue-600 ${guardando === valor ? 'animate-pulse' : ''}`} />}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * La primera vez que entra el administrador se le pregunta qué tipo de red
 * tiene. Se confirma contra el servidor para no preguntar con una marca vieja
 * guardada en el navegador.
 */
export default function PreguntaTipoRed() {
    const [mostrar, setMostrar] = useState(false);
    useEffect(() => {
        let activo = true;
        client.get<BrandConfig>('/public/marca')
            .then(({ data }) => { if (activo && !data.tipo_red) setMostrar(true); })
            .catch(() => undefined);
        return () => { activo = false; };
    }, []);
    if (!mostrar) return null;
    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Tipo de red" className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="w-full max-w-md rounded-t-[2rem] border border-slate-200 bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">¿Cómo llega el internet a tus clientes?</h2>
                <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">Así mostramos solo lo que usas. Puedes cambiarlo cuando quieras en Configuración → Marca blanca.</p>
                <SelectorTipoRed alElegir={() => setMostrar(false)} />
            </div>
        </div>,
        document.body,
    );
}

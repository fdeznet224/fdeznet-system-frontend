import { ArchiveBoxIcon, TruckIcon } from '@heroicons/react/24/outline';
import { useSearchParams } from 'react-router-dom';

import { readSessionRole } from '@/utils/roles';
import InventarioPanel from './InventarioPanel';
import RetirosPanel from './RetirosPanel';

type Pestana = 'equipos' | 'retiros';

/**
 * Inventario / Bodega: los equipos (solo admin) y los retiros por baja de
 * servicio (admin y supervisor) en una sola sección. Antes eran dos menús
 * que se pisaban.
 */
export default function Inventario() {
    const [params, setParams] = useSearchParams();
    const esAdmin = readSessionRole() === 'admin';
    const pestana: Pestana = !esAdmin || params.get('tab') === 'retiros' ? 'retiros' : 'equipos';
    const cambiar = (nueva: Pestana) => setParams(nueva === 'equipos' ? {} : { tab: nueva }, { replace: true });

    const pestanas: [Pestana, string, typeof ArchiveBoxIcon][] = [
        ...(esAdmin ? [['equipos', 'Equipos', ArchiveBoxIcon] as [Pestana, string, typeof ArchiveBoxIcon]] : []),
        ['retiros', 'Retiros', TruckIcon],
    ];

    return (
        <div className="mx-auto flex h-[calc(100dvh-80px)] max-w-7xl flex-col gap-4 p-4 md:h-[calc(100vh-100px)] md:p-6">
            <div className="flex flex-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white md:text-2xl">Inventario / Bodega</h1>
                {pestanas.length > 1 && (
                    <div role="tablist" aria-label="Secciones del inventario" className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-[#12141a] sm:w-72">
                        {pestanas.map(([valor, texto, Icono]) => (
                            <button
                                key={valor}
                                type="button"
                                role="tab"
                                aria-selected={pestana === valor}
                                onClick={() => cambiar(valor)}
                                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${pestana === valor
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                            >
                                <Icono className="h-4 w-4" /> {texto}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="min-h-0 flex-1">
                {pestana === 'equipos'
                    ? <InventarioPanel onVerRetiros={() => cambiar('retiros')} />
                    : <RetirosPanel />}
            </div>
        </div>
    );
}

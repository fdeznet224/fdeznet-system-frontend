import { ArchiveBoxIcon, TruckIcon } from '@heroicons/react/24/outline';
import { useSearchParams } from 'react-router-dom';

import { EncabezadoPagina } from '@/components/ui/Pagina';
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
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <EncabezadoPagina
                titulo="Inventario / Bodega"
                descripcion="ONU en bodega, con técnicos e instaladas; y los equipos por recoger de las bajas."
                acciones={pestanas.length > 1 ? (
                    <div role="tablist" aria-label="Secciones del inventario" className="grid w-full grid-cols-2 gap-0.5 rounded-[10px] bg-[#e4e4ea] p-0.5 dark:bg-slate-800 sm:w-72">
                        {pestanas.map(([valor, texto, Icono]) => (
                            <button
                                key={valor}
                                type="button"
                                role="tab"
                                aria-selected={pestana === valor}
                                onClick={() => cambiar(valor)}
                                className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${pestana === valor
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                            >
                                <Icono className="h-4 w-4" /> {texto}
                            </button>
                        ))}
                    </div>
                ) : undefined}
            />
            <div>
                {pestana === 'equipos'
                    ? <InventarioPanel onVerRetiros={() => cambiar('retiros')} />
                    : <RetirosPanel />}
            </div>
        </div>
    );
}

import { Navigate, useOutletContext } from 'react-router-dom';
import { ArrowRightStartOnRectangleIcon, MagnifyingGlassIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';

import { FilaLista, Lista } from '@/components/ui/Pagina';
import { Inicial } from './Layout';
import type { GrupoNav, ItemNav } from './navegacion';

export interface ContextoMas {
    grupos: GrupoNav[];
    barra: ItemNav[];
    usuario: string;
    nombreRol: string;
    empresa: string;
    darkMode: boolean;
    cambiarTema: () => void;
    cerrarSesion: () => void;
    abrirBuscador: () => void;
}

/** Más (celular): todas las secciones que no están en la barra de abajo, en listas agrupadas. */
export default function MasSecciones() {
    const contexto = useOutletContext<ContextoMas | undefined>();
    if (!contexto) return <Navigate to="/" replace />;
    const { grupos, barra, usuario, nombreRol, empresa, darkMode, cambiarTema, cerrarSesion, abrirBuscador } = contexto;
    const enBarra = new Set(barra.map((item) => item.ruta));
    const secciones = grupos
        .map((grupo) => ({ ...grupo, items: grupo.items.filter((item) => !enBarra.has(item.ruta)) }))
        .filter((grupo) => grupo.items.length > 0);

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
            <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">Más</h1>

            <button
                type="button"
                onClick={abrirBuscador}
                className="-mt-2 flex h-11 items-center gap-2 rounded-xl bg-[#e4e4ea] px-3 text-left text-[15px] text-[#5b6170] dark:bg-slate-800 dark:text-slate-400"
            >
                <MagnifyingGlassIcon className="h-5 w-5" />
                Buscar sección o cliente
            </button>

            <Lista>
                <div className="flex items-center gap-3 px-3.5 py-3">
                    <Inicial nombre={usuario} className="h-11 w-11 text-lg" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-white">{usuario}</span>
                        <span className="block truncate text-[13px] text-[#5b6170] dark:text-slate-400">{nombreRol} · {empresa}</span>
                    </span>
                </div>
            </Lista>

            {secciones.map((grupo) => (
                <Lista key={grupo.nombre} titulo={grupo.nombre}>
                    {grupo.items.map((item) => (
                        <FilaLista key={item.ruta} icono={item.icono} tono={item.tono} titulo={item.nombre} a={item.ruta} />
                    ))}
                </Lista>
            ))}

            <Lista>
                <FilaLista icono={darkMode ? SunIcon : MoonIcon} tono="neutro" titulo={darkMode ? 'Modo claro' : 'Modo oscuro'} onClick={cambiarTema} />
                <button type="button" onClick={cerrarSesion} className="flex min-h-[52px] w-full items-center gap-3 px-3.5 text-left text-[15px] font-semibold text-red-600 active:bg-slate-100 dark:text-red-400 dark:active:bg-slate-800">
                    <ArrowRightStartOnRectangleIcon className="h-[30px] w-[30px] p-1" />
                    Cerrar sesión
                </button>
            </Lista>
        </div>
    );
}

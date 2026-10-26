import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { useAbrirBuscador } from '@/components/layout/buscadorContexto';
import { BOTON_REDONDO, CUADRO_TONO, PILDORA, PUNTO_TONO, TARJETA, TEXTO_TONO, TITULO_SECCION, type Tono } from './estilo';

type Icono = ComponentType<{ className?: string }>;

/** Título grande de la pantalla (como en el iPhone) con su explicación corta y las
 *  acciones a la derecha; en celular las acciones bajan y la lupa queda junto al título. */
export function EncabezadoPagina({ titulo, descripcion, acciones, accionMovil, etiqueta, volver }: {
    titulo: ReactNode;
    descripcion?: ReactNode;
    acciones?: ReactNode;
    /** En celular, en lugar de `acciones`: un botón redondo junto a la lupa. */
    accionMovil?: ReactNode;
    etiqueta?: string;
    /** Enlace corto a la pantalla de arriba (p. ej. Configuración). */
    volver?: { a: string; texto: string };
}) {
    const abrirBuscador = useAbrirBuscador();
    return (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-3">
                <div className="min-w-0 flex-1">
                    {volver && (
                        <Link to={volver.a} className="mb-1 inline-flex min-h-8 items-center gap-0.5 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
                            <ChevronLeftIcon className="h-4 w-4" />{volver.texto}
                        </Link>
                    )}
                    {etiqueta && <p className="text-[13px] font-semibold text-[#5b6170] dark:text-slate-400">{etiqueta}</p>}
                    <h1 className="truncate text-[30px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{titulo}</h1>
                    {descripcion && <p className="mt-0.5 text-sm text-[#5b6170] dark:text-slate-400">{descripcion}</p>}
                </div>
                {accionMovil && <span className="mb-0.5 sm:hidden">{accionMovil}</span>}
                {abrirBuscador && (
                    <button type="button" aria-label="Buscar cliente" onClick={abrirBuscador} className={`mb-0.5 lg:hidden ${BOTON_REDONDO}`}>
                        <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
            {acciones && <div className={`${accionMovil ? 'hidden sm:flex' : 'flex'} flex-wrap items-center gap-2`}>{acciones}</div>}
        </div>
    );
}

/** Número clave. Si recibe onClick funciona como filtro (activo = seleccionado). */
export function Metrica({ etiqueta, valor, detalle, tono = 'neutro', icono: IconoMetrica, onClick, activo, children }: {
    etiqueta: string;
    valor: ReactNode;
    detalle?: ReactNode;
    tono?: Tono;
    icono?: Icono;
    onClick?: () => void;
    activo?: boolean;
    children?: ReactNode;
}) {
    const contenido = (
        <>
            <span className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{etiqueta}</span>
                {IconoMetrica && <IconoMetrica className={`h-4 w-4 shrink-0 ${TEXTO_TONO[tono]}`} />}
            </span>
            <span className={`mt-1.5 block text-2xl font-bold tabular-nums tracking-tight ${TEXTO_TONO[tono]}`}>{valor}</span>
            {detalle && <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{detalle}</span>}
            {children}
        </>
    );
    const base = `${TARJETA} block w-full p-4 text-left`;
    if (!onClick) return <div className={base}>{contenido}</div>;
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={activo}
            className={`${base} transition hover:border-slate-300 active:scale-[0.98] dark:hover:border-slate-700 ${activo ? 'ring-2 ring-blue-500/60 dark:ring-blue-400/60' : ''}`}
        >
            {contenido}
        </button>
    );
}

/** Bloque con título pequeño y, opcionalmente, una acción a la derecha. */
export function Seccion({ titulo, accion, children, className = '' }: {
    titulo?: ReactNode;
    accion?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={`${TARJETA} overflow-hidden ${className}`}>
            {(titulo || accion) && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{titulo}</h2>
                    {accion}
                </div>
            )}
            {children}
        </section>
    );
}

export function TituloGrupo({ children }: { children: ReactNode }) {
    return <p className={`${TITULO_SECCION} mb-2 mt-1`}>{children}</p>;
}

export function Pildora({ tono = 'neutro', children, punto = false }: { tono?: Tono; children: ReactNode; punto?: boolean }) {
    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${PILDORA[tono]}`}>
            {punto && <span className={`h-1.5 w-1.5 rounded-full ${PUNTO_TONO[tono]}`} />}
            {children}
        </span>
    );
}

export function Vacio({ icono: IconoVacio, titulo, detalle, accion }: { icono?: Icono; titulo: string; detalle?: ReactNode; accion?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            {IconoVacio && <IconoVacio className="h-8 w-8 text-slate-300 dark:text-slate-600" />}
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{titulo}</p>
            {detalle && <p className="max-w-sm text-xs text-slate-500">{detalle}</p>}
            {accion}
        </div>
    );
}

/** Cuadrito de color con el ícono en blanco. */
export function CuadroIcono({ icono: IconoCuadro, tono = 'azul', className = '' }: { icono: Icono; tono?: Tono; className?: string }) {
    return (
        <span className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-white ${CUADRO_TONO[tono]} ${className}`}>
            <IconoCuadro className="h-[18px] w-[18px]" />
        </span>
    );
}

/** Lista agrupada (como los Ajustes del iPhone): título gris afuera y renglones en una tarjeta. */
export function Lista({ titulo, accion, pie, children, className = '' }: {
    titulo?: ReactNode;
    accion?: ReactNode;
    pie?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={className}>
            {(titulo || accion) && (
                <div className="flex items-end justify-between gap-3 px-1 pb-1.5">
                    {titulo && <h2 className={TITULO_SECCION.replace('px-1 ', '')}>{titulo}</h2>}
                    {accion}
                </div>
            )}
            <div className={`${TARJETA} divide-y divide-[#ececf0] overflow-hidden dark:divide-slate-800`}>{children}</div>
            {pie && <p className="px-1 pt-1.5 text-xs text-[#5b6170] dark:text-slate-400">{pie}</p>}
        </section>
    );
}

/** Renglón de una Lista: cuadrito de color, texto, valor a la derecha y flecha si lleva a algún lado. */
export function FilaLista({ icono, tono, titulo, detalle, valor, tonoValor, a, onClick, children }: {
    icono?: Icono;
    tono?: Tono;
    titulo: ReactNode;
    detalle?: ReactNode;
    valor?: ReactNode;
    tonoValor?: Tono;
    a?: string;
    onClick?: () => void;
    children?: ReactNode;
}) {
    const contenido = (
        <>
            {icono && <CuadroIcono icono={icono} tono={tono} />}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-slate-900 dark:text-white">{titulo}</span>
                {detalle && <span className="block truncate text-[13px] text-[#5b6170] dark:text-slate-400">{detalle}</span>}
                {children}
            </span>
            {valor !== undefined && (
                <span className={`shrink-0 text-[15px] font-bold tabular-nums ${tonoValor ? TEXTO_TONO[tonoValor] : 'text-slate-900 dark:text-white'}`}>{valor}</span>
            )}
            {(a || onClick) && <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#a1a1aa]" aria-hidden="true" />}
        </>
    );
    const clase = 'flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2 text-left';
    if (a) return <Link to={a} className={`${clase} transition active:bg-slate-100 dark:active:bg-slate-800`}>{contenido}</Link>;
    if (onClick) return <button type="button" onClick={onClick} className={`${clase} transition active:bg-slate-100 dark:active:bg-slate-800`}>{contenido}</button>;
    return <div className={clase}>{contenido}</div>;
}

import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

import { PILDORA, PUNTO_TONO, TARJETA, TEXTO_TONO, TITULO_SECCION, type Tono } from './estilo';

type Icono = ComponentType<{ className?: string }>;

/** Título de la pantalla con su explicación corta y las acciones a la derecha
 *  (en celular las acciones bajan debajo del título). */
export function EncabezadoPagina({ titulo, descripcion, acciones, etiqueta, volver }: {
    titulo: ReactNode;
    descripcion?: ReactNode;
    acciones?: ReactNode;
    etiqueta?: string;
    /** Enlace corto a la pantalla de arriba (p. ej. Configuración). */
    volver?: { a: string; texto: string };
}) {
    return (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {volver && (
                    <Link to={volver.a} className="mb-1 inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400">
                        <ChevronLeftIcon className="h-3.5 w-3.5" />{volver.texto}
                    </Link>
                )}
                {etiqueta && <p className="mb-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">{etiqueta}</p>}
                <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{titulo}</h1>
                {descripcion && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{descripcion}</p>}
            </div>
            {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
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

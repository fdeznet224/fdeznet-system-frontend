import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AdjustmentsHorizontalIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

/** Piezas comunes de Facturas, Corte de cobranza y Estadísticas. */

export function PaginaFinanzas({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 pb-24 text-slate-700 md:p-6 dark:text-slate-200">
            {children}
        </div>
    );
}

export function Encabezado({ titulo, subtitulo, accion }: { titulo: string; subtitulo?: string; accion?: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl dark:text-white">{titulo}</h2>
                {subtitulo && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>}
            </div>
            {accion}
        </div>
    );
}

type Tono = 'emerald' | 'amber' | 'rose' | 'slate' | 'blue';

const PUNTO: Record<Tono, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    slate: 'bg-slate-400',
    blue: 'bg-blue-500',
};

export function Cifra({ etiqueta, valor, detalle, tono = 'slate', activo, onClick }: {
    etiqueta: string;
    valor: string;
    detalle?: string;
    tono?: Tono;
    activo?: boolean;
    onClick?: () => void;
}) {
    const Contenedor = onClick ? 'button' : 'div';
    return (
        <Contenedor
            {...(onClick ? { type: 'button' as const, onClick } : {})}
            className={`min-w-0 rounded-2xl border bg-white p-3 text-left transition md:p-4 dark:bg-slate-900 ${
                activo ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-slate-200 dark:border-slate-800'
            } ${onClick ? 'hover:border-slate-300 active:scale-[0.98] dark:hover:border-slate-700' : ''}`}
        >
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${PUNTO[tono]}`} />
                {etiqueta}
            </span>
            <span className="mt-1 block truncate text-lg font-semibold tabular-nums text-slate-900 md:text-xl dark:text-white">{valor}</span>
            {detalle && <span className="block text-xs text-slate-400">{detalle}</span>}
        </Contenedor>
    );
}

export function Buscador({ valor, onCambio, placeholder, etiqueta, filtrosAbiertos, filtrosActivos, onFiltros }: {
    valor: string;
    onCambio: (valor: string) => void;
    placeholder: string;
    etiqueta: string;
    filtrosAbiertos?: boolean;
    filtrosActivos?: number;
    onFiltros?: () => void;
}) {
    return (
        <div className="flex gap-2">
            <div className="relative flex-1">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={valor}
                    onChange={(evento) => onCambio(evento.target.value)}
                    placeholder={placeholder}
                    aria-label={etiqueta}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                {valor && (
                    <button type="button" onClick={() => onCambio('')} title="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
            {onFiltros && (
                <button
                    type="button"
                    onClick={onFiltros}
                    aria-expanded={filtrosAbiertos}
                    className={`relative flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition ${
                        filtrosAbiertos
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                >
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Filtros</span>
                    {!!filtrosActivos && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{filtrosActivos}</span>
                    )}
                </button>
            )}
        </div>
    );
}

export function PanelFiltros({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-4 md:p-4 dark:border-slate-800 dark:bg-slate-900">
            {children}
        </div>
    );
}

export function Campo({ etiqueta, children, ancho }: { etiqueta: string; children: ReactNode; ancho?: boolean }) {
    return (
        <label className={`flex min-w-0 flex-col gap-1 ${ancho ? 'col-span-2' : ''}`}>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{etiqueta}</span>
            {children}
        </label>
    );
}

export function Pestanas<T extends string>({ opciones, valor, onCambio }: {
    opciones: { valor: T; etiqueta: string }[];
    valor: T;
    onCambio: (valor: T) => void;
}) {
    return (
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
            {opciones.map((opcion) => (
                <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => onCambio(opcion.valor)}
                    aria-pressed={valor === opcion.valor}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                        valor === opcion.valor
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
                    }`}
                >
                    {opcion.etiqueta}
                </button>
            ))}
        </div>
    );
}

const ETIQUETA: Record<Tono, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
};

export function Etiqueta({ tono, children }: { tono: Tono; children: ReactNode }) {
    return <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${ETIQUETA[tono]}`}>{children}</span>;
}

export function Lista({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {children}
        </div>
    );
}

export function Vacio({ cargando, texto }: { cargando: boolean; texto: string }) {
    return (
        <div className="p-10 text-center text-sm text-slate-400">
            {cargando ? 'Cargando…' : texto}
        </div>
    );
}

export function BotonAccion({ children, tono = 'slate', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tono?: 'slate' | 'rose' | 'emerald' | 'amber' }) {
    const colores = {
        slate: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        rose: 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10',
        emerald: 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10',
        amber: 'text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10',
    }[tono];
    return (
        <button type="button" {...props} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition disabled:opacity-50 ${colores} ${props.className ?? ''}`}>
            {children}
        </button>
    );
}

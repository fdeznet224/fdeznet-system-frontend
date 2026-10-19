/**
 * Estilo común de FdezPay (admin, técnico y cobrador): superficies blancas con
 * borde fino, un solo color de acento (azul) y tipografía sin mayúsculas
 * forzadas. En oscuro, los mismos tonos azul noche de la app del técnico.
 */
export const TARJETA = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

export const TITULO_SECCION = 'px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400';

export const BOTON_PRIMARIO = 'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50';

export const BOTON_EXITO = 'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50';

export const BOTON_SECUNDARIO = 'flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800';

export const CAMPO = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export const ETIQUETA_CAMPO = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400';

/** Botón de acción del encabezado: compacto, se ve igual en celular y escritorio. */
export const BOTON_ACCION = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50';
export const BOTON_ACCION_PRIMARIO = `${BOTON_ACCION} bg-blue-600 text-white hover:bg-blue-500`;
export const BOTON_ACCION_SECUNDARIO = `${BOTON_ACCION} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`;

/** Botón cuadrado con solo ícono (siempre con aria-label). */
export const BOTON_ICONO = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white';

export type Tono = 'neutro' | 'azul' | 'verde' | 'rojo' | 'ambar' | 'violeta';

/** Píldora de estado: punto de color + texto, sin mayúsculas forzadas. */
export const PILDORA: Record<Tono, string> = {
    neutro: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    azul: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    verde: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    rojo: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    ambar: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    violeta: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
};

export const TEXTO_TONO: Record<Tono, string> = {
    neutro: 'text-slate-900 dark:text-white',
    azul: 'text-blue-600 dark:text-blue-400',
    verde: 'text-emerald-600 dark:text-emerald-400',
    rojo: 'text-rose-600 dark:text-rose-400',
    ambar: 'text-amber-600 dark:text-amber-400',
    violeta: 'text-violet-600 dark:text-violet-400',
};

export const PUNTO_TONO: Record<Tono, string> = {
    neutro: 'bg-slate-400',
    azul: 'bg-blue-500',
    verde: 'bg-emerald-500',
    rojo: 'bg-rose-500',
    ambar: 'bg-amber-500',
    violeta: 'bg-violet-500',
};

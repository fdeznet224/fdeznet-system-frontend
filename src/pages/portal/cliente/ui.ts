/** Estilo del portal del cliente: minimalista, un solo acento (el color de la marca), claro y oscuro. */

export const FONDO = 'min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b0f17] dark:text-slate-100';
export const TARJETA = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10';
export const ETIQUETA = 'text-xs font-medium text-slate-500 dark:text-slate-400';
export const TITULO = 'text-base font-semibold text-slate-900 dark:text-white';
export const CAMPO = 'w-full rounded-2xl border-0 bg-slate-100 px-4 py-3.5 text-base text-slate-900 outline-none ring-1 ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:ring-2 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800';
export const BOTON = 'flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40';
export const BOTON_SUAVE = 'flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98] disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
export const AVISO = 'rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200';
export const ERROR = 'rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200';

export function velocidad(kbps: number): { valor: string; unidad: string } {
    return kbps >= 1024 ? { valor: String(Math.round(kbps / 1024)), unidad: 'Mbps' } : { valor: String(kbps), unidad: 'Kbps' };
}

export function dinero(monto: number): string {
    return monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

/** Mismo evento que el resto del sistema: App.tsx pone la clase dark y lo recuerda. */
export function cambiarTema(): void {
    const oscuro = document.documentElement.classList.contains('dark');
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: oscuro ? 'light' : 'dark' }));
}

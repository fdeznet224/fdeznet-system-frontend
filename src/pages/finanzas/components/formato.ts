/** Formato y estilos comunes de Facturas, Corte de cobranza y Estadísticas. */

export const dinero = (valor: number | string | null | undefined) =>
    `$${Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function fechaLocal(fecha: Date = new Date()) {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export const claseControl =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

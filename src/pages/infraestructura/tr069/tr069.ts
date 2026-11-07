export type EquipoTr069 = {
    id: string;
    fabricante: string;
    modelo: string;
    serie: string;
    firmware: string | null;
    ip: string | null;
    ultimo_reporte: string | null;
    ultimo_arranque: string | null;
    cliente: { id: number; nombre: string } | null;
};

export function hace(fecha: string | null) {
    if (!fecha) return 'nunca';
    const minutos = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
    if (minutos < 1) return 'hace un momento';
    if (minutos < 60) return `hace ${minutos} min`;
    if (minutos < 60 * 24) return `hace ${Math.round(minutos / 60)} h`;
    return new Date(fecha).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

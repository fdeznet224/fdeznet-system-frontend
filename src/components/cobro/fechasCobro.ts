/** Fechas ISO (AAAA-MM-DD): se comparan como texto. */
export interface FechasCobro {
    activacion: string;
    gratis_hasta?: string | null;
    prorrateo?: { desde: string; hasta: string } | null;
    mensualidad_desde: string;
    mensualidad_hasta: string;
    primer_pago: { fecha: string };
    corte?: string | null;
}

export type Tipo = 'gratis' | 'prorrateo' | 'mensualidad' | null;

const MAX_MESES = 3;

export const iso = (anio: number, mes: number, dia: number) =>
    `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

const entre = (dia: string, desde?: string | null, hasta?: string | null) =>
    Boolean(desde && hasta && dia >= desde && dia <= hasta);

/** Qué se paga ese día; lo usan el calendario y la imagen que se manda al cliente. */
export const tipoDia = (fechas: FechasCobro, dia: string): Tipo => {
    if (entre(dia, fechas.prorrateo?.desde, fechas.prorrateo?.hasta)) return 'prorrateo';
    if (entre(dia, fechas.activacion, fechas.gratis_hasta)) return 'gratis';
    if (entre(dia, fechas.mensualidad_desde, fechas.mensualidad_hasta)) return 'mensualidad';
    return null;
};

/** Meses a mostrar: de la activación al primer pago (o al corte), máximo tres. */
export const mesesCalendario = (fechas: FechasCobro) => {
    const [anioInicio, mesInicio] = fechas.activacion.split('-').map(Number);
    const ultimo = fechas.corte && fechas.corte > fechas.primer_pago.fecha ? fechas.corte : fechas.primer_pago.fecha;
    const [anioFin, mesFin] = ultimo.split('-').map(Number);
    return Math.min((anioFin - anioInicio) * 12 + (mesFin - mesInicio) + 1, MAX_MESES);
};

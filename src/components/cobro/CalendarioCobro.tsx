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

type Tipo = 'gratis' | 'prorrateo' | 'mensualidad' | null;

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MAX_MESES = 3;

const FONDO: Record<Exclude<Tipo, null>, string> = {
    gratis: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    prorrateo: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300',
    mensualidad: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
};

const iso = (anio: number, mes: number, dia: number) =>
    `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

const entre = (dia: string, desde?: string | null, hasta?: string | null) =>
    Boolean(desde && hasta && dia >= desde && dia <= hasta);

/**
 * Calendario de los primeros meses del cliente: mes gratis, prorrateo,
 * primera mensualidad, día de pago y día de corte, para explicárselo de un
 * vistazo en el domicilio.
 */
export default function CalendarioCobro({ fechas }: { fechas: FechasCobro }) {
    const [anioInicio, mesInicio] = fechas.activacion.split('-').map(Number);
    const ultimo = fechas.corte && fechas.corte > fechas.primer_pago.fecha ? fechas.corte : fechas.primer_pago.fecha;
    const [anioFin, mesFin] = ultimo.split('-').map(Number);
    const totalMeses = Math.min((anioFin - anioInicio) * 12 + (mesFin - mesInicio) + 1, MAX_MESES);

    const tipoDe = (dia: string): Tipo => {
        if (entre(dia, fechas.prorrateo?.desde, fechas.prorrateo?.hasta)) return 'prorrateo';
        if (entre(dia, fechas.activacion, fechas.gratis_hasta)) return 'gratis';
        if (entre(dia, fechas.mensualidad_desde, fechas.mensualidad_hasta)) return 'mensualidad';
        return null;
    };

    const leyenda: [string, string][] = [
        ...(fechas.gratis_hasta ? [[FONDO.gratis, 'Mes gratis'] as [string, string]] : []),
        ...(fechas.prorrateo ? [[FONDO.prorrateo, 'Prorrateo'] as [string, string]] : []),
        [FONDO.mensualidad, '1.ª mensualidad'],
        ['bg-indigo-600 text-white', 'Día de pago'],
        ...(fechas.corte ? [['bg-rose-600 text-white', 'Corte si no paga'] as [string, string]] : []),
        ['ring-2 ring-slate-900 dark:ring-white', 'Hoy (activación)'],
    ];

    return (
        <div className="space-y-3">
            {Array.from({ length: totalMeses }, (_, i) => {
                const fecha = new Date(anioInicio, mesInicio - 1 + i, 1);
                const anio = fecha.getFullYear();
                const mes = fecha.getMonth();
                const diasMes = new Date(anio, mes + 1, 0).getDate();
                const huecos = (fecha.getDay() + 6) % 7; // lunes primero
                const mesLargo = fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
                const titulo = mesLargo.charAt(0).toUpperCase() + mesLargo.slice(1);
                return (
                    <div key={`${anio}-${mes}`}>
                        <p className="mb-1 text-xs font-black text-slate-700 dark:text-slate-200">{titulo}</p>
                        <div className="grid grid-cols-7 gap-0.5 text-center">
                            {DIAS_SEMANA.map((d, n) => (
                                <span key={n} className="text-[10px] font-bold text-slate-400">{d}</span>
                            ))}
                            {Array.from({ length: huecos }, (_, n) => <span key={`h${n}`} />)}
                            {Array.from({ length: diasMes }, (_, n) => {
                                const dia = iso(anio, mes, n + 1);
                                const tipo = tipoDe(dia);
                                const pago = dia === fechas.primer_pago.fecha;
                                const corte = dia === fechas.corte;
                                const clase = pago
                                    ? 'bg-indigo-600 text-white font-black'
                                    : corte
                                        ? 'bg-rose-600 text-white font-black'
                                        : tipo ? FONDO[tipo] : 'text-slate-500 dark:text-slate-400';
                                const hoy = dia === fechas.activacion;
                                return (
                                    <span
                                        key={dia}
                                        title={pago ? 'Día de pago' : corte ? 'Corte si no paga' : undefined}
                                        className={`flex h-8 items-center justify-center rounded-md text-xs font-bold ${clase} ${hoy ? 'ring-2 ring-slate-900 dark:ring-white' : ''}`}
                                    >
                                        {n + 1}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {leyenda.map(([clase, texto]) => (
                    <span key={texto} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <span className={`h-3 w-3 rounded ${clase}`} /> {texto}
                    </span>
                ))}
            </div>
        </div>
    );
}

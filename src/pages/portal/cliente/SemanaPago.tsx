import type { Calendario } from './tipos';
import { mensajeCalendario } from './calendario';
import { TARJETA } from './ui';

const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function iso(fecha: Date) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

const TONOS = {
    verde: { texto: 'text-emerald-700 dark:text-emerald-300', punto: 'bg-emerald-500' },
    ambar: { texto: 'text-amber-700 dark:text-amber-300', punto: 'bg-amber-500' },
    rojo: { texto: 'text-rose-700 dark:text-rose-300', punto: 'bg-rose-500' },
};

/** Una semana desde hoy con los días que importan marcados (vence, suspensión, promesa). */
export default function SemanaPago({ calendario, color }: { calendario: Calendario; color: string }) {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    const marcas: Record<string, string> = {};
    if (calendario.vence) marcas[calendario.vence] = 'Vence';
    if (calendario.corte) marcas[calendario.corte] = 'Corte';
    if (calendario.tipo === 'promesa' && calendario.fecha) marcas[calendario.fecha] = 'Promesa';
    if (calendario.tipo === 'al_corriente' && calendario.fecha) marcas[calendario.fecha] = 'Factura';
    const dias = Array.from({ length: 7 }, (_, n) => {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + n);
        return fecha;
    });
    const mensaje = mensajeCalendario(calendario);
    const tono = TONOS[mensaje.tono];

    return (
        <section className={TARJETA} data-testid="semana-pago">
            <p className={`flex items-center gap-2 text-sm font-semibold ${tono.texto}`}>
                <span className={`h-2 w-2 rounded-full ${tono.punto}`} />
                {mensaje.titulo}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{mensaje.detalle}</p>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                {dias.map((fecha, n) => {
                    const clave = iso(fecha);
                    const marca = marcas[clave];
                    const esHoy = n === 0;
                    const alerta = marca === 'Corte' || (marca === 'Vence' && calendario.tipo !== 'al_corriente');
                    return (
                        <div key={clave} className="flex flex-col items-center gap-1">
                            <span className="text-[11px] font-medium text-slate-400">{DIAS[fecha.getDay()]}</span>
                            <span
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                                    esHoy ? 'text-white' : marca ? (alerta ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300') : 'text-slate-600 dark:text-slate-300'
                                }`}
                                style={esHoy ? { background: color } : undefined}
                            >
                                {fecha.getDate()}
                            </span>
                            <span className={`h-3 text-[10px] font-medium ${alerta ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>{esHoy ? 'Hoy' : marca ?? ''}</span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

import { useState, useEffect, useMemo } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipProps } from 'recharts';
import { Cifra, Encabezado, Lista, PaginaFinanzas } from './components/FinanzasUI';
import { dinero } from './components/formato';

interface MonthlyIncome {
    mes: number;
    total: number;
    cobrado?: number;
}

interface ChartIncome {
    name: string;
    Facturado: number;
    Cobrado: number;
}

interface RouterCatalog {
    id: number;
    nombre: string;
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL - 2024 + 1 }, (_, i) => ANIO_ACTUAL - i);
const COLOR_FACTURADO = '#94a3b8';
const COLOR_COBRADO = '#3b82f6';

const selector = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';

function Detalle({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-1 font-semibold text-slate-900 dark:text-white">{label}</div>
            {payload.map((dato) => (
                <div key={dato.name} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full" style={{ background: dato.color }} />
                    {dato.name}: <span className="font-medium tabular-nums">{dinero(dato.value)}</span>
                </div>
            ))}
        </div>
    );
}

export default function Estadisticas() {
    const [data, setData] = useState<ChartIncome[]>([]);
    const [anio, setAnio] = useState(ANIO_ACTUAL);
    const [routers, setRouters] = useState<RouterCatalog[]>([]);
    const [routerId, setRouterId] = useState('');

    useEffect(() => {
        void client.get<RouterCatalog[]>('/network/routers/')
            .then((response) => setRouters(response.data))
            .catch(() => toast.error('No se pudieron cargar los routers'));
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await client.get<MonthlyIncome[]>('/finanzas/estadisticas', {
                    params: { anio, router_id: routerId || undefined },
                });
                setData(res.data.map((item) => ({
                    name: MESES[item.mes - 1] ?? `Mes ${item.mes}`,
                    Facturado: item.total,
                    Cobrado: item.cobrado ?? 0,
                })));
            } catch {
                toast.error('No se pudieron cargar las estadísticas');
            }
        };
        void fetchStats();
    }, [anio, routerId]);

    const totales = useMemo(() => data.reduce(
        (suma, mes) => ({ facturado: suma.facturado + mes.Facturado, cobrado: suma.cobrado + mes.Cobrado }),
        { facturado: 0, cobrado: 0 },
    ), [data]);
    const porcentaje = totales.facturado > 0 ? Math.round((totales.cobrado / totales.facturado) * 100) : null;

    return (
        <PaginaFinanzas>
            <Encabezado titulo="Resumen de Ingresos" subtitulo="Lo facturado contra lo cobrado, mes por mes" />

            <div className="flex gap-2">
                <select aria-label="Año" className={selector} value={anio} onChange={e => setAnio(Number(e.target.value))}>
                    {ANIOS.map((valor) => <option key={valor} value={valor}>{valor}</option>)}
                </select>
                <select aria-label="Router" className={`${selector} min-w-0 flex-1 sm:flex-none`} value={routerId} onChange={e => setRouterId(e.target.value)}>
                    <option value="">Todos los routers</option>
                    {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Cifra etiqueta={`Facturado ${anio}`} valor={dinero(totales.facturado)} detalle="Sin facturas anuladas" tono="slate" />
                <Cifra etiqueta={`Cobrado ${anio}`} valor={dinero(totales.cobrado)} detalle="Pagos registrados" tono="blue" />
                <div className="col-span-2 md:col-span-1">
                    <Cifra etiqueta="Cobrado de lo facturado" valor={porcentaje == null ? '—' : `${porcentaje}%`} tono="emerald" />
                </div>
            </div>

            <Lista>
                <div className="flex items-center gap-4 px-4 pt-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_FACTURADO }} /> Facturado</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_COBRADO }} /> Cobrado</span>
                </div>
                <div className="h-[280px] w-full p-2 md:h-[380px] md:p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value: number) => (value >= 1000 ? `$${Number((value / 1000).toFixed(1))}k` : `$${value}`)}
                            />
                            <Tooltip content={<Detalle />} cursor={{ fill: '#94a3b8', fillOpacity: 0.1 }} />
                            <Bar dataKey="Facturado" fill={COLOR_FACTURADO} radius={[4, 4, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="Cobrado" fill={COLOR_COBRADO} radius={[4, 4, 0, 0]} maxBarSize={22} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Lista>
        </PaginaFinanzas>
    );
}

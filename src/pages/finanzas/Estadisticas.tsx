import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthlyIncome {
    mes: number;
    total: number;
}

interface ChartIncome {
    name: string;
    Ingresos: number;
}

interface RouterCatalog {
    id: number;
    nombre: string;
}

export default function Estadisticas() {
    const [data, setData] = useState<ChartIncome[]>([]);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [routers, setRouters] = useState<RouterCatalog[]>([]);
    const [routerId, setRouterId] = useState('');

    useEffect(() => {
        void client.get<RouterCatalog[]>('/network/routers/')
            .then((response) => setRouters(response.data))
            .catch(() => toast.error('No se pudieron cargar los routers'));
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            const params = new URLSearchParams({ anio: anio.toString(), ...(routerId && { router_id: routerId }) });
            try {
                const res = await client.get<MonthlyIncome[]>(`/finanzas/estadisticas?${params}`);
                const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                const chartData = res.data.map((item) => ({
                    name: nombresMeses[item.mes - 1] ?? `Mes ${item.mes}`,
                    Ingresos: item.total
                }));
                setData(chartData);
            } catch {
                toast.error('No se pudieron cargar las estadísticas');
            }
        };
        fetchStats();
    }, [anio, routerId]);

    return (
        /* ✅ ADAPTADO: Fondo principal dinámico */
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">

            {/* HEADER MINIMALISTA */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-1 md:px-0 flex-none">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">
                        Resumen de Ingresos
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center shadow-sm transition-colors">
                        <select
                            className="bg-transparent text-slate-800 dark:text-slate-300 font-bold outline-none text-xs cursor-pointer appearance-none pr-1"
                            value={routerId}
                            onChange={e => setRouterId(e.target.value)}
                        >
                            <option value="" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Todos los Routers</option>
                            {routers.map(r => <option key={r.id} value={r.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">{r.nombre}</option>)}
                        </select>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center shadow-sm transition-colors">
                        <select
                            className="bg-transparent text-slate-800 dark:text-slate-300 font-bold outline-none text-xs cursor-pointer appearance-none"
                            value={anio}
                            onChange={e => setAnio(Number(e.target.value))}
                        >
                            <option value="2024" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">2024</option>
                            <option value="2025" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">2025</option>
                            <option value="2026" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">2026</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* CONTENEDOR DE GRÁFICA PREMIUM */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 md:p-6 rounded-2xl h-[300px] md:h-[400px] w-full shadow-sm dark:shadow-xl transition-colors">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 15, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            </linearGradient>
                        </defs>
                        
                        {/* ✅ ADAPTADO: Grid con color que resalta en ambos modos */}
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-[#1e293b]" vertical={false} />
                        
                        <XAxis 
                            dataKey="name" 
                            stroke="#64748b" 
                            tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis 
                            stroke="#64748b" 
                            tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} 
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `$${value}`}
                        />
                        
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'var(--color-bg-tooltip)', // Tip: Puedes usar CSS variables o forzar colores
                                borderColor: '#cbd5e1', 
                                borderRadius: '12px', 
                                fontSize: '12px', 
                                color: '#1e293b'
                            }} 
                            cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                        />
                        
                        <Bar 
                            dataKey="Ingresos" 
                            fill="url(#colorIngresos)"
                            radius={[6, 6, 0, 0]} 
                            maxBarSize={32}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

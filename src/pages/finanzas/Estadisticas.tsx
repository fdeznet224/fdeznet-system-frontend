import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Estadisticas() {
    const [data, setData] = useState<any[]>([]);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [routers, setRouters] = useState<any[]>([]);
    const [routerId, setRouterId] = useState('');

    useEffect(() => { client.get('/network/routers/').then(r => setRouters(r.data)); }, []);

    useEffect(() => {
        const fetchStats = async () => {
            const params = new URLSearchParams({ anio: anio.toString(), ...(routerId && { router_id: routerId }) });
            const res = await client.get(`/finanzas/estadisticas?${params}`);

            const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const chartData = res.data.map((item: any) => ({
                name: nombresMeses[item.mes - 1], Ingresos: item.total
            }));
            setData(chartData);
        };
        fetchStats();
    }, [anio, routerId]);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-200">

            {/* =========================================================
                HEADER MINIMALISTA CON SELECTORES COMPACTOS EN FILA
               ========================================================= */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-1 md:px-0 flex-none">
                <div>
                    {/* ✅ LIMPIO: Texto puro y balanceado */}
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                        Resumen de Ingresos
                    </h2>
                </div>

                {/* ✅ REDISEÑADO: Selectores en una sola línea, micro-compactos y estilizados */}
                <div className="flex items-center gap-2">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center">
                        <select
                            className="bg-transparent text-slate-300 font-bold outline-none text-xs cursor-pointer appearance-none pr-1"
                            value={routerId}
                            onChange={e => setRouterId(e.target.value)}
                        >
                            <option value="" className="bg-slate-950">Todos los Routers</option>
                            {routers.map(r => <option key={r.id} value={r.id} className="bg-slate-950">{r.nombre}</option>)}
                        </select>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center">
                        <select
                            className="bg-transparent text-slate-300 font-bold outline-none text-xs cursor-pointer appearance-none"
                            value={anio}
                            onChange={e => setAnio(Number(e.target.value))}
                        >
                            <option value="2024" className="bg-slate-950">2024</option>
                            <option value="2025" className="bg-slate-950">2025</option>
                            <option value="2026" className="bg-slate-950">2026</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* =========================================================
    CONTENEDOR DE GRÁFICA PREMIUM (DISEÑO FLUIDO CON DEGRADADO)
   ========================================================= */}
<div className="bg-slate-900 border border-slate-800/60 p-4 md:p-6 rounded-2xl h-[300px] md:h-[400px] w-full shadow-xl">
    <ResponsiveContainer width="100%" height="100%">
        {/* Cambiamos BarChart por AreaChart para un flujo continuo del dinero */}
        <BarChart data={data} margin={{ top: 15, right: 5, left: -20, bottom: 0 }}>
            {/* 🎨 Definimos el degradado de color para el fondo de la gráfica */}
            <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2c" vertical={false} />
            
            <XAxis 
                dataKey="name" 
                stroke="#475569" 
                tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} 
                axisLine={false}
                tickLine={false}
            />
            <YAxis 
                stroke="#475569" 
                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value}`} // Agrega el signo de pesos al eje
            />
            
            {/* Tooltip estilizado como tarjeta flotante moderna */}
            <Tooltip 
                contentStyle={{ 
                    backgroundColor: '#0b0f19', 
                    borderColor: '#1e293b', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                }} 
                itemStyle={{ color: '#3b82f6', fontWeight: 900 }}
                formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX')}`, 'Ingresos']}
            />
            
            {/* ⚡ LA BARRA ESTILIZADA: Si prefieres mantener barras, este diseño delgado y redondo es superior */}
            <Bar 
                dataKey="Ingresos" 
                fill="url(#colorIngresos)" // Usa el gradiente para un efecto traslúcido elegante
                stroke="#3b82f6" 
                strokeWidth={2}
                radius={[6, 6, 0, 0]} 
                maxBarSize={32} // Más delgadas para que respire el diseño y se vea estilizado
            />
        </BarChart>
    </ResponsiveContainer>
</div>

        </div>
    );
}
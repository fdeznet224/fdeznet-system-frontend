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
            // ENDPOINT ACTUALIZADO
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
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-bold text-white">Resumen de Ingresos</h2>
            <div className="flex gap-4 mb-8">
                <select className="input-dark" value={routerId} onChange={e => setRouterId(e.target.value)}>
                    <option value="">Todos los Routers</option>{routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
                <select className="input-dark" value={anio} onChange={e => setAnio(Number(e.target.value))}>
                    <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                </select>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-96 shadow-lg">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }} />
                        <Bar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
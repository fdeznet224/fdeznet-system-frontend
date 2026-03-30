import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Transacciones() {
    const [pagos, setPagos] = useState<any[]>([]);
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [routers, setRouters] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const getHoyLocal = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [filtros, setFiltros] = useState({
        fechaInicio: getHoyLocal(),
        fechaFin: getHoyLocal(),
        usuarioId: '', 
        routerId: ''
    });

    // Cargar usuarios y routers al inicio
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                // Ajusta las rutas si tu backend las tiene diferentes
                const [u, r] = await Promise.all([
                    client.get('/usuarios/'), 
                    client.get('/network/routers/') 
                ]);
                setUsuarios(u.data); 
                setRouters(r.data);
            } catch (e) { 
                console.error("Error metadatos", e);
            }
            // Cargamos pagos independientemente de si fallan los filtros
            fetchPagos();
        };
        loadMetadata();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPagos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                start_date: filtros.fechaInicio, 
                end_date: filtros.fechaFin,
                ...(filtros.usuarioId && { usuario_id: filtros.usuarioId }),
                ...(filtros.routerId && { router_id: filtros.routerId })
            }).toString();

            const res = await client.get(`/finanzas/pagos-reporte?${params}`);
            
            // --- AQUÍ ESTÁ LA CORRECCIÓN CLAVE ---
            // El backend devuelve { total_periodo: X, detalles: [...] }
            // Nosotros necesitamos el array que está dentro de 'detalles'
            setPagos(res.data.detalles || []);
            
            if ((res.data.detalles || []).length === 0) {
                toast("No hay movimientos en este rango", { icon: 'ℹ️' });
            }

        } catch (error) { 
            console.error(error);
            toast.error("Error al obtener reporte"); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleFilterChange = (e: any) => setFiltros({ ...filtros, [e.target.name]: e.target.value });

    // Calculamos el total en el frontend basado en la lista visible
    const totalMostrado = pagos.reduce((acc, curr) => acc + Number(curr.monto), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Transacciones y Caja</h2>
            </div>
            
            {/* FILTROS */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-5 gap-4 items-end shadow-lg">
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Inicio</label>
                    <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFilterChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Fin</label>
                    <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleFilterChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Operador</label>
                    <select name="usuarioId" value={filtros.usuarioId} onChange={handleFilterChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors">
                        <option value="">-- Todos --</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo || u.usuario}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Router</label>
                    <select name="routerId" value={filtros.routerId} onChange={handleFilterChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors">
                        <option value="">-- Todos --</option>
                        {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <button onClick={fetchPagos} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-[34px] rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <MagnifyingGlassIcon className="w-4 h-4" />} 
                        Buscar
                    </button>
                </div>
            </div>

            {/* TABLA */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-400">
                        <thead className="bg-slate-900 text-slate-200 uppercase font-bold">
                            <tr>
                                <th className="p-4">ID Pago</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Factura</th>
                                <th className="p-4 text-center">Método</th>
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Cajero</th>
                                <th className="p-4 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {pagos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-slate-500 italic">
                                        No hay datos para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                pagos.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-700/50 transition">
                                        <td className="p-4 font-mono text-slate-500">#{p.id}</td>
                                        <td className="p-4 font-bold text-white">{p.cliente_nombre}</td>
                                        <td className="p-4 font-mono text-indigo-300">#{p.factura_id}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${p.metodo === 'efectivo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                {p.metodo}
                                            </span>
                                        </td>
                                        <td className="p-4">{new Date(p.fecha).toLocaleString()}</td>
                                        <td className="p-4 text-slate-300">{p.usuario_nombre}</td>
                                        <td className="p-4 text-right font-bold text-emerald-400 text-sm">
                                            +${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {pagos.length > 0 && (
                            <tfoot className="bg-slate-900/80 border-t border-slate-700 font-bold text-white">
                                <tr>
                                    <td colSpan={6} className="p-4 text-right uppercase text-xs tracking-wider text-slate-400">Total en Pantalla:</td>
                                    <td className="p-4 text-right text-emerald-400 text-lg">
                                        ${totalMostrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
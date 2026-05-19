import { useState, useEffect } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import {
    PlusIcon,
    ArrowPathIcon,
    ServerIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    CpuChipIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import CreateRedModal from '../components/modals/CreateRedModal';
import type { Router } from '../types';

interface RedIP {
    id: number;
    router_id: number;
    nombre: string;
    cidr: string;
    gateway: string;
}

export default function RedesIP() {
    const [redes, setRedes] = useState<RedIP[]>([]);
    const [routers, setRouters] = useState<Router[]>([]);
    const [selectedRouter, setSelectedRouter] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, red?: RedIP }>({
        isOpen: false,
        red: undefined
    });

    const [testingId, setTestingId] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const resRouters = await client.get('/network/routers/');
            setRouters(resRouters.data);

            let url = '/network/redes/';
            if (selectedRouter !== 'all') {
                url = `/network/redes/router/${selectedRouter}`;
            }
            const resRedes = await client.get(url);
            setRedes(resRedes.data);

        } catch (error) {
            toast.error("Error al cargar topología de red");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckFreeIP = async (redId: number) => {
        setTestingId(redId);
        try {
            const { data } = await client.get(`/network/redes/${redId}/ips-libres`);
            if (data && data.length > 0) {
                toast.success(`Siguiente IP disponible: ${data[0]}`, {
                    icon: '📍',
                    duration: 5000
                });
            } else {
                toast.error("Esta red parece estar llena (0 IPs libres)");
            }
        } catch (error: any) {
            toast.error("Error calculando IPs libres");
        } finally {
            setTestingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta red? No podrás asignar nuevas IPs de este rango.")) return;
        try {
            await client.delete(`/network/redes/${id}`);
            toast.success("Red eliminada correctamente");
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Error al eliminar");
        }
    };

    useEffect(() => { fetchData(); }, [selectedRouter]);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-200 pb-12">

            {/* =========================================================
    HEADER RESPONSIVO Y FILTROS COMPACTOS INLINE (CORREGIDO)
   ========================================================= */}
            <div className="flex justify-between items-center px-1 md:px-0 flex-none gap-2 pb-2">
                <div>
                    {/* ✅ SOLUCIÓN: El (IPAM) ahora se oculta en móvil (hidden md:inline) para dar espacio al botón verde */}
                    <h2 className="text-sm sm:text-base md:text-2xl font-black text-white tracking-tight whitespace-nowrap">
                        Gestión de Redes <span className="hidden md:inline">(IPAM)</span>
                    </h2>
                    <p className="text-slate-400 mt-0.5 text-xs hidden sm:block">Segmentos de red y pools de IPs para clientes.</p>
                </div>

                {/* Contenedor inline micro-compacto */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

                    {/* Selector de Router Estilizado */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 flex items-center gap-1 shadow-sm">
                        <FunnelIcon className="w-3 h-3 text-slate-500 shrink-0 md:hidden" />
                        <CpuChipIcon className="w-4 h-4 text-slate-500 shrink-0 hidden md:block" />
                        <select
                            value={selectedRouter}
                            onChange={(e) => setSelectedRouter(e.target.value)}
                            className="bg-transparent text-slate-300 font-extrabold outline-none text-[10px] md:text-xs cursor-pointer appearance-none pr-0.5"
                        >
                            <option value="all" className="bg-slate-950">Todo</option>
                            {routers.map(r => <option key={r.id} value={r.id} className="bg-slate-950">{r.nombre}</option>)}
                        </select>
                    </div>

                    {/* ✅ SOLUCIÓN: Cambiamos a UserPlusIcon de forma estricta y se redujo un poco el padding en móvil (px-2 md:px-4) */}
                    <button
                        onClick={() => setModalConfig({ isOpen: true })}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1.5 md:px-4 md:py-2.5 rounded-xl font-black shadow-md active:scale-95 transition flex items-center justify-center gap-1 text-[10px] md:text-sm tracking-wide uppercase md:normal-case"
                    >
                        <PlusIcon className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        <span>Nueva Red</span>
                    </button>
                </div>
            </div>

            {/* =========================================================
                ZONA DE RENDERIZADO PRINCIPAL (TABLA VS CARDS DE RED)
               ========================================================= */}
            <div className="flex-1 bg-slate-800 md:border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">

                    {/* 🖥️ COMPONENTE: TABLA ESCRITORIO */}
                    <table className="w-full text-left border-collapse hidden md:table text-xs">
                        <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-widest border-b border-slate-700 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="px-6 py-4 font-bold">Nombre del Segmento</th>
                                <th className="px-6 py-4 font-bold">Rango CIDR</th>
                                <th className="px-6 py-4 font-bold">Gateway</th>
                                <th className="px-6 py-4 font-bold">Nodo Asignado</th>
                                <th className="px-6 py-4 text-center font-bold">IPs Disponibles</th>
                                <th className="px-6 py-4 text-right font-bold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <ArrowPathIcon className="w-6 h-6 animate-spin text-emerald-500" />
                                            <span className="text-slate-500 text-xs uppercase font-black tracking-wider">Escaneando topología...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : redes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-500 italic">No hay segmentos configurados.</td>
                                </tr>
                            ) : (
                                redes.map((red) => {
                                    const routerAsignado = routers.find(r => r.id === red.router_id);
                                    return (
                                        <tr key={red.id} className="hover:bg-slate-700/20 transition-colors group bg-transparent">
                                            <td className="px-6 py-4 font-bold text-white text-sm">{red.nombre}</td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 inline-block">
                                                    {red.cidr}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-300 font-mono text-xs bg-slate-900/50 px-2 py-0.5 rounded w-fit border border-slate-700 flex items-center gap-1.5">
                                                    <ServerIcon className="w-3.5 h-3.5 text-slate-500" />
                                                    {red.gateway || '---'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-300 text-xs">
                                                    <div className={`w-2 h-2 rounded-full ${routerAsignado ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                    {routerAsignado?.nombre || <span className="text-rose-400 italic">No encontrado</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleCheckFreeIP(red.id)}
                                                    disabled={testingId === red.id}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {testingId === red.id ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <MagnifyingGlassIcon className="w-3.5 h-3.5" />}
                                                    {testingId === red.id ? 'Calculando...' : 'Verificar'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setModalConfig({ isOpen: true, red })} className="p-1.5 bg-slate-700 hover:bg-blue-600 text-white rounded-lg transition-colors"><PencilSquareIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(red.id)} className="p-1.5 bg-slate-700 hover:bg-rose-600 text-white rounded-lg transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* 📱 COMPONENTE: CARDS DE SEGMENTOS MÓVILES (NATIVO RÁPIDO) */}
                    <div className="md:hidden flex flex-col gap-2.5 p-2 pb-24">
                        {loading ? (
                            <div className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></div>
                        ) : redes.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs italic">No hay segmentos asignados a este router.</div>
                        ) : (
                            redes.map((red) => {
                                const routerAsignado = routers.find(r => r.id === red.router_id);
                                return (
                                    <div key={red.id} className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex flex-col gap-2.5 shadow-md">

                                        {/* Fila Alta: Nombre y Máscara CIDR */}
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <h3 className="font-bold text-white text-sm leading-tight truncate max-w-[160px]">{red.nombre}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase">Nodo: {routerAsignado?.nombre || 'Desconocido'}</p>
                                            </div>
                                            <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 shrink-0">
                                                {red.cidr}
                                            </span>
                                        </div>

                                        {/* Fila Media: Gateway / Puerta de Enlace */}
                                        <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 text-[11px] flex justify-between items-center">
                                            <div>
                                                <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Gateway Local</span>
                                                <p className="text-slate-300 font-mono font-bold mt-0.5 flex items-center gap-1">
                                                    <ServerIcon className="w-3.5 h-3.5 text-slate-600" /> {red.gateway || '0.0.0.0'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Router State</span>
                                                <div className="flex items-center justify-end gap-1.5 mt-1">
                                                    <div className={`w-2 h-2 rounded-full ${routerAsignado ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                    <span className="text-[10px] font-bold text-slate-400">{routerAsignado ? 'Activo' : 'Vacio'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botones Operativos del Segmento */}
                                        <div className="flex items-center gap-2 border-t border-slate-800/60 pt-2 mt-0.5">
                                            <button
                                                onClick={() => handleCheckFreeIP(red.id)}
                                                disabled={testingId === red.id}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-blue-400 font-extrabold rounded-lg text-xs shadow-sm transition-all active:scale-[0.98]"
                                            >
                                                {testingId === red.id ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <MagnifyingGlassIcon className="w-3.5 h-3.5" />}
                                                <span>{testingId === red.id ? 'Calculando...' : 'Escanear IP Libre'}</span>
                                            </button>

                                            <button onClick={() => setModalConfig({ isOpen: true, red })} className="p-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg active:scale-90 transition-all shrink-0">
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(red.id)} className="p-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 rounded-lg active:scale-90 transition-all shrink-0">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>

                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>
            </div>

            {/* MODAL REUTILIZABLE */}
            <CreateRedModal
                isOpen={modalConfig.isOpen}
                redToEdit={modalConfig.red}
                onClose={() => setModalConfig({ isOpen: false, red: undefined })}
                onSuccess={fetchData}
                routers={routers}
            />
        </div>
    );
}
import { useState, useEffect } from 'react';
import client from '../../api/axios'; // Ajusta la ruta de tu axios según corresponda
import { toast } from 'react-hot-toast';
import {
    PlusIcon,
    ShieldCheckIcon,
    ArrowPathIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    KeyIcon,
    ServerStackIcon,
    BoltIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

interface VpnTunnel {
    id: number;
    nombre: string;
    ip_asignada: string;
    public_key: string;
    script_mikrotik: string;
    is_active: boolean;
}

export default function TunnelsVPN() {
    const [tunnels, setTunnels] = useState<VpnTunnel[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para la Burbuja del Script
    const [scriptVisibleId, setScriptVisibleId] = useState<number | null>(null);

    // Estados para Crear Nuevo Túnel
    const [isCreating, setIsCreating] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchTunnels = async () => {
        try {
            // Asegúrate de que esta ruta coincida con el backend que hicimos
            const res = await client.get('/vpn/tunnels/'); 
            setTunnels(res.data);
            setLoading(false);
        } catch (error) {
            toast.error("Error al cargar los túneles VPN");
            setLoading(false);
        }
    };

    const handleCreateTunnel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoNombre.trim()) return toast.error("El nombre es obligatorio");

        setIsCreating(true);
        const loadingToast = toast.loading("Generando llaves y registrando en Linux...");
        try {
            await client.post('/vpn/tunnels/', { nombre: nuevoNombre });
            toast.dismiss(loadingToast);
            toast.success("¡Túnel creado con éxito!");
            setNuevoNombre("");
            setShowCreateModal(false);
            fetchTunnels();
        } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.detail || "Error al crear el túnel");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("⚠️ ¿Estás seguro? Se liberará la IP y el MikroTik remoto perderá conexión.")) return;
        
        const toastId = toast.loading("Eliminando túnel...");
        try {
            await client.delete(`/vpn/tunnels/${id}`);
            toast.dismiss(toastId);
            toast.success("Túnel eliminado y IP liberada");
            fetchTunnels();
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("No se pudo eliminar el túnel");
        }
    };

    const toggleScript = (id: number) => {
        if (scriptVisibleId === id) {
            setScriptVisibleId(null);
        } else {
            setScriptVisibleId(id);
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        toast.success("¡Copiado al portapapeles!", { icon: '🚀' });
    };

    useEffect(() => {
        fetchTunnels();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-sans">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 pb-2">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        <ShieldCheckIcon className="w-8 h-8 text-emerald-500" />
                        Infraestructura VPN
                    </h2>
                    <div className="flex items-center gap-3 mt-2 bg-slate-800/80 w-fit px-3 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-md">
                        <span className="text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                            <ServerStackIcon className="w-3.5 h-3.5 text-emerald-400" /> Nodos Remotos WireGuard
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-emerald-500/40 transition-all active:scale-95 border border-emerald-400/30 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wide"
                >
                    <PlusIcon className="w-5 h-5" /> Nuevo Túnel
                </button>
            </div>

            {/* GRID DE TÚNELES */}
            {loading ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700/30 backdrop-blur-sm">
                    <ArrowPathIcon className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-sm text-emerald-400">Consultando Kernel de Linux...</span>
                </div>
            ) : tunnels.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700/30 border-dashed">
                    <ShieldCheckIcon className="w-16 h-16 text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-1">No hay túneles activos</h3>
                    <p className="text-slate-500 text-sm">Crea tu primer túnel para conectar un nodo remoto.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tunnels.map((tunnel) => (
                        <div 
                            key={tunnel.id} 
                            className={`relative bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 p-1 transition-all duration-300 shadow-xl group flex flex-col 
                            ${scriptVisibleId === tunnel.id ? 'z-[100] border-emerald-500/50 ring-1 ring-emerald-500/20' : 'z-10 overflow-hidden hover:border-emerald-500/30'}`}
                        >
                            
                            {/* STATUS BAR */}
                            <div className="bg-slate-900/40 p-4 rounded-t-2xl border-b border-slate-700/50 flex justify-between items-center h-14 relative z-10">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                      {tunnel.is_active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                      <span className={`relative inline-flex rounded-full h-3 w-3 ${tunnel.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    </span>
                                    <span className="text-xs font-bold text-slate-300">En línea</span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-black tracking-widest bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 uppercase">
                                    {new Date(tunnel.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="p-5 flex-1 relative z-10 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="overflow-hidden">
                                        <h3 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors truncate tracking-tight">
                                            {tunnel.nombre}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-emerald-400 font-mono text-lg font-bold tracking-tight">
                                                {tunnel.ip_asignada}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                        <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />
                                    </div>
                                </div>

                                <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50 flex items-center gap-3 mb-6 mt-auto">
                                    <KeyIcon className="w-5 h-5 text-slate-500 shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Public Key (Peer)</p>
                                        <p className="text-xs text-slate-300 font-mono truncate">{tunnel.public_key}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ACCIONES */}
                            <div className="flex gap-2 p-2 pt-0 relative z-10">
                                {/* CONTENEDOR VPN CON POPOVER HACIA ARRIBA */}
                                <div className="relative flex-1">
                                    <button
                                        onClick={() => toggleScript(tunnel.id)}
                                        className={`w-full py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-[10px] font-black border uppercase tracking-wider shadow-sm
                                        ${scriptVisibleId === tunnel.id
                                            ? 'bg-emerald-600 text-white border-emerald-400'
                                            : 'bg-slate-800/80 text-emerald-500 border-slate-700 hover:bg-emerald-600 hover:text-white'}`}
                                    >
                                        <BoltIcon className="w-4 h-4" /> VER SCRIPT MIKROTIK
                                    </button>

                                    {/* BURBUJA DE TERMINAL (FLOTA HACIA ARRIBA) */}
                                    {scriptVisibleId === tunnel.id && (
                                        <div className="absolute bottom-full mb-4 left-0 w-[280px] sm:w-[380px] z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <div className="bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden font-mono ring-1 ring-white/10">
                                                <div className="bg-slate-900 px-3 py-2 border-b border-slate-700 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    <span className="flex items-center gap-2">
                                                        <div className="flex gap-1">
                                                            <div className="w-2 h-2 rounded-full bg-rose-500/80"></div>
                                                            <div className="w-2 h-2 rounded-full bg-amber-500/80"></div>
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500/80"></div>
                                                        </div>
                                                        Script Autoconfig
                                                    </span>
                                                    <button 
                                                        onClick={() => copyToClipboard(tunnel.script_mikrotik)}
                                                        className="hover:text-white transition-colors p-1"
                                                    >
                                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="p-4 bg-black/40">
                                                    <pre className="text-[10px] text-emerald-400 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[180px] custom-scrollbar selection:bg-emerald-500/30">
                                                        {tunnel.script_mikrotik}
                                                    </pre>
                                                </div>
                                            </div>
                                            {/* Triangulito */}
                                            <div className="absolute -bottom-1 left-10 w-3 h-3 bg-slate-950 border-b border-r border-slate-700 rotate-45"></div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleDelete(tunnel.id)}
                                    className="p-3 bg-slate-800/80 hover:bg-rose-600 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-700 group/trash flex items-center justify-center"
                                    title="Eliminar Túnel"
                                >
                                    <TrashIcon className="w-5 h-5 group-hover/trash:animate-bounce" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL PARA CREAR TÚNEL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <ShieldCheckIcon className="w-6 h-6 text-emerald-500" /> Nuevo Túnel VPN
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateTunnel} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre de Referencia</label>
                                    <input 
                                        type="text" 
                                        value={nuevoNombre}
                                        onChange={(e) => setNuevoNombre(e.target.value)}
                                        placeholder="Ej: Torre Centro, Cliente Principal..."
                                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex gap-3 text-emerald-400">
                                    <ServerStackIcon className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p className="text-[11px] leading-relaxed">Al guardar, la VPS te asignará la siguiente IP disponible y registrará automáticamente la llave pública en Linux.</p>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all"
                                >
                                    {isCreating ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Generar Túnel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
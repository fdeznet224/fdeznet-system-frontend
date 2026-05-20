import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react'; 
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    PlusIcon, ShieldCheckIcon, ArrowPathIcon, TrashIcon, 
    DocumentDuplicateIcon, KeyIcon, ServerStackIcon, 
    BoltIcon, XMarkIcon, DevicePhoneMobileIcon, 
    QrCodeIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

interface VpnTunnel {
    id: number;
    nombre: string;
    ip_asignada: string;
    public_key: string;
    script_mikrotik: string;
    is_active: boolean;
    created_at: string;
}

export default function TunnelsVPN() {
    const [tunnels, setTunnels] = useState<VpnTunnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [scriptVisibleId, setScriptVisibleId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [tipoTunnel, setTipoTunnel] = useState<'mikrotik' | 'tecnico'>('mikrotik');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [qrModalData, setQrModalData] = useState<{script_text: string, nombre: string} | null>(null);

    const fetchTunnels = async () => {
        try {
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
        const loadingToast = toast.loading("Generando llaves...");
        
        try {
            if (tipoTunnel === 'mikrotik') {
                await client.post('/vpn/tunnels/', { nombre: nuevoNombre });
                toast.success("¡Túnel MikroTik creado!", { id: loadingToast });
            } else {
                const res = await client.post('/vpn/tecnicos/', { nombre: nuevoNombre });
                toast.success("¡Acceso para Técnico creado!", { id: loadingToast });
                setQrModalData({
                    script_text: res.data.archivo_conf,
                    nombre: res.data.nombre
                });
            }
            setNuevoNombre("");
            setShowCreateModal(false);
            fetchTunnels();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al crear", { id: loadingToast });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("⚠️ ¿Eliminar túnel?")) return;
        const toastId = toast.loading("Eliminando...");
        try {
            await client.delete(`/vpn/tunnels/${id}`);
            toast.success("Túnel eliminado", { id: toastId });
            fetchTunnels();
        } catch (error) {
            toast.error("Error al eliminar", { id: toastId });
        }
    };

    useEffect(() => { fetchTunnels(); }, []);

    return (
        /* ✅ ADAPTADO: Fondo dinámico */
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 transition-colors duration-300">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 transition-colors">
                        <ShieldCheckIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                        Infraestructura VPN
                    </h2>
                    <div className="flex items-center gap-3 mt-2 bg-white dark:bg-slate-800/80 w-fit px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors">
                        <span className="text-slate-500 dark:text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                            <ServerStackIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Nodos y Accesos Remotos
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest"
                >
                    <PlusIcon className="w-5 h-5" /> Nuevo Túnel
                </button>
            </div>

            {/* GRID DE TÚNELES */}
            {loading ? (
                <div className="py-32 text-center text-slate-500 font-black uppercase tracking-widest text-sm animate-pulse">Consultando Kernel...</div>
            ) : tunnels.length === 0 ? (
                <div className="py-32 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 font-bold">No hay túneles activos.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tunnels.map((tunnel) => {
                        const isMobile = tunnel.script_mikrotik.includes('[Interface]');
                        return (
                            <div key={tunnel.id} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl transition-all group flex flex-col hover:border-emerald-500/50">
                                {/* Barra Estado */}
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${tunnel.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Estado</span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-black tracking-widest bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 uppercase">
                                        {new Date(tunnel.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">{tunnel.nombre}</h3>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-mono text-lg font-black mt-1">{tunnel.ip_asignada}</p>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6 mt-auto">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Public Key (Peer)</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono truncate">{tunnel.public_key}</p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => isMobile ? setQrModalData({ script_text: tunnel.script_mikrotik, nombre: tunnel.nombre }) : setScriptVisibleId(scriptVisibleId === tunnel.id ? null : tunnel.id)}
                                        className="flex-1 py-3 rounded-xl text-[10px] font-black border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest"
                                    >
                                        {isMobile ? 'Ver Código QR' : 'Script MikroTik'}
                                    </button>
                                    <button onClick={() => handleDelete(tunnel.id)} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 text-slate-500 hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL CREAR */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <ShieldCheckIcon className="w-6 h-6 text-emerald-500" /> Nuevo Acceso VPN
                        </h3>
                        <form onSubmit={handleCreateTunnel} className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setTipoTunnel('mikrotik')} className={`p-4 rounded-xl border ${tipoTunnel === 'mikrotik' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <ServerStackIcon className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                                    <span className="text-[10px] font-black uppercase">Router</span>
                                </button>
                                <button type="button" onClick={() => setTipoTunnel('tecnico')} className={`p-4 rounded-xl border ${tipoTunnel === 'tecnico' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <DevicePhoneMobileIcon className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                                    <span className="text-[10px] font-black uppercase">Móvil</span>
                                </button>
                            </div>
                            <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del túnel..." className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500" required />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold">Cancelar</button>
                                <button type="submit" disabled={isCreating} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Generar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
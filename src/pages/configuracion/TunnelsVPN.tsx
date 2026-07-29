import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react'; 
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { 
    PlusIcon, ShieldCheckIcon, ArrowPathIcon, TrashIcon, 
    DocumentDuplicateIcon, KeyIcon, ServerStackIcon, 
    BoltIcon, XMarkIcon, DevicePhoneMobileIcon, 
    QrCodeIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface VpnTunnel {
    id: number;
    nombre: string;
    ip_asignada: string;
    public_key: string;
    script_mikrotik: string;
    is_active: boolean;
    created_at: string;
}

interface TechnicianVpnResponse {
    archivo_conf: string;
    nombre: string;
}

const getApiError = (error: unknown, fallback: string) => {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || fallback;
    }
    return fallback;
};

export default function TunnelsVPN() {
    const [tunnels, setTunnels] = useState<VpnTunnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [scriptVisibleId, setScriptVisibleId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [tipoTunnel, setTipoTunnel] = useState<'mikrotik' | 'tecnico'>('mikrotik');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [qrModalData, setQrModalData] = useState<{script_text: string, nombre: string} | null>(null);

    const fetchTunnels = useCallback(async () => {
        try {
            const res = await client.get<VpnTunnel[]>('/vpn/tunnels/');
            setTunnels(res.data);
        } catch {
            toast.error("Error al cargar los túneles VPN");
        } finally {
            setLoading(false);
        }
    }, []);

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
                const res = await client.post<TechnicianVpnResponse>('/vpn/tecnicos/', { nombre: nuevoNombre });
                toast.success("¡Acceso para Técnico creado!", { id: loadingToast });
                setQrModalData({
                    script_text: res.data.archivo_conf,
                    nombre: res.data.nombre
                });
            }
            setNuevoNombre("");
            setShowCreateModal(false);
            void fetchTunnels();
        } catch (error: unknown) {
            toast.error(getApiError(error, "Error al crear"), { id: loadingToast });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("⚠️ ¿Eliminar túnel permanentemente? Se perderá la conexión de este nodo.")) return;
        const toastId = toast.loading("Eliminando...");
        try {
            await client.delete(`/vpn/tunnels/${id}`);
            toast.success("Túnel eliminado", { id: toastId });
            void fetchTunnels();
        } catch {
            toast.error("Error al eliminar", { id: toastId });
        }
    };

    const copiarAlPortapapeles = (texto: string) => {
        navigator.clipboard.writeText(texto);
        toast.success("Copiado al portapapeles", {
            icon: '📋',
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
    };

    const descargarArchivoConf = () => {
        if(!qrModalData) return;
        const element = document.createElement("a");
        const file = new Blob([qrModalData.script_text], {type: 'text/plain'});
        const objectUrl = URL.createObjectURL(file);
        element.href = objectUrl;
        element.download = `${qrModalData.nombre.replace(/\s+/g, '_')}_vpn.conf`;
        document.body.appendChild(element); 
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(objectUrl);
    };

    useEffect(() => {
        const initialLoad = window.setTimeout(() => void fetchTunnels(), 0);
        return () => window.clearTimeout(initialLoad);
    }, [fetchTunnels]);

    return (
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
                <div className="py-32 text-center text-slate-500 font-black uppercase tracking-widest text-sm animate-pulse">Consultando Kernel WireGuard...</div>
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
                                        <div className={`w-3 h-3 rounded-full ${tunnel.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Estado</span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-black tracking-widest bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 uppercase">
                                        {new Date(tunnel.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">{tunnel.nombre}</h3>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-mono text-lg font-black mt-1 flex items-center gap-2">
                                        {tunnel.ip_asignada} {isMobile && <DevicePhoneMobileIcon className="w-5 h-5 text-blue-500"/>}
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6 mt-auto">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><KeyIcon className="w-3 h-3"/> Public Key (Peer)</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono truncate">{tunnel.public_key}</p>
                                </div>

                                {/* Script de configuración (Desplegable para MikroTik) */}
                                {scriptVisibleId === tunnel.id && !isMobile && (
                                    <div className="mb-4 bg-[#0d1117] rounded-2xl overflow-hidden border border-slate-800 shadow-inner animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center bg-[#161b22] px-4 py-2 border-b border-slate-800">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                <BoltIcon className="w-3.5 h-3.5 text-amber-400"/> Terminal MikroTik
                                            </span>
                                            <button onClick={() => copiarAlPortapapeles(tunnel.script_mikrotik)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-emerald-600 px-3 py-1 rounded text-[10px] font-black uppercase transition-colors flex items-center gap-1">
                                                <DocumentDuplicateIcon className="w-3.5 h-3.5" /> Copiar
                                            </button>
                                        </div>
                                        <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[200px] custom-scrollbar">
                                            {tunnel.script_mikrotik}
                                        </pre>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => isMobile ? setQrModalData({ script_text: tunnel.script_mikrotik, nombre: tunnel.nombre }) : setScriptVisibleId(scriptVisibleId === tunnel.id ? null : tunnel.id)}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all uppercase tracking-widest flex items-center justify-center gap-1.5 ${isMobile ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white' : 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white'}`}
                                    >
                                        {isMobile ? <><QrCodeIcon className="w-4 h-4"/> Ver Código QR</> : <><ServerStackIcon className="w-4 h-4"/> Script MikroTik</>}
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

            {/* MODAL CREAR TÚNEL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 animate-in zoom-in-95">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <ShieldCheckIcon className="w-6 h-6 text-emerald-500" /> Nuevo Acceso VPN
                        </h3>
                        <form onSubmit={handleCreateTunnel} className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setTipoTunnel('mikrotik')} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${tipoTunnel === 'mikrotik' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                    <ServerStackIcon className="w-6 h-6" />
                                    <span className="text-[10px] font-black uppercase">Nodo / Router</span>
                                </button>
                                <button type="button" onClick={() => setTipoTunnel('tecnico')} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${tipoTunnel === 'tecnico' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                    <DevicePhoneMobileIcon className="w-6 h-6" />
                                    <span className="text-[10px] font-black uppercase">App Móvil</span>
                                </button>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Identificador</label>
                                <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: Router-Principal o Tec-Juan..." className="w-full p-4 text-sm font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white transition-colors" required autoFocus />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isCreating} className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isCreating ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : 'Generar Llaves'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL QR PARA TÉCNICOS / MÓVILES */}
            {qrModalData && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
                        <div className="bg-blue-600 p-6 text-center relative">
                            <button onClick={() => setQrModalData(null)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 p-1.5 rounded-full backdrop-blur-md transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                            <DevicePhoneMobileIcon className="w-12 h-12 text-white mx-auto mb-2 opacity-90"/>
                            <h3 className="text-xl font-black text-white leading-tight">Acceso App WireGuard</h3>
                            <p className="text-blue-200 text-xs font-bold mt-1">Escanea desde la App Oficial</p>
                        </div>
                        
                        <div className="p-8 flex flex-col items-center">
                            <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100 ring-4 ring-slate-50 dark:ring-slate-800">
                                <QRCodeSVG 
                                    value={qrModalData.script_text} 
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#0f172a"
                                />
                            </div>
                            
                            <div className="mt-6 flex flex-col gap-3 w-full">
                                <button onClick={() => copiarAlPortapapeles(qrModalData.script_text)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                    <DocumentDuplicateIcon className="w-4 h-4"/> Copiar Texto Plano
                                </button>
                                <button onClick={descargarArchivoConf} className="w-full py-3 bg-slate-900 dark:bg-slate-50 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-md">
                                    <ArrowDownTrayIcon className="w-4 h-4"/> Descargar .conf
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

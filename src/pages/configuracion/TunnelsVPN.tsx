import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react'; // ✅ Importamos el generador de QR
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
}

export default function TunnelsVPN() {
    const [tunnels, setTunnels] = useState<VpnTunnel[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para la Burbuja del Script (Solo MikroTik)
    const [scriptVisibleId, setScriptVisibleId] = useState<number | null>(null);

    // Estados para Crear Nuevo Túnel
    const [isCreating, setIsCreating] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [tipoTunnel, setTipoTunnel] = useState<'mikrotik' | 'tecnico'>('mikrotik');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Estado unificado para el Modal del QR (Sirve para crear y para ver)
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
        const loadingToast = toast.loading("Generando llaves y registrando en Linux...");
        
        try {
            if (tipoTunnel === 'mikrotik') {
                await client.post('/vpn/tunnels/', { nombre: nuevoNombre });
                toast.success("¡Túnel MikroTik creado con éxito!", { id: loadingToast });
            } else {
                const res = await client.post('/vpn/tecnicos/', { nombre: nuevoNombre });
                toast.success("¡Acceso para Técnico creado!", { id: loadingToast });
                
                // ✅ Le pasamos el texto directamente al frontend para que dibuje el QR
                setQrModalData({
                    script_text: res.data.archivo_conf,
                    nombre: res.data.nombre
                });
            }
            
            setNuevoNombre("");
            setShowCreateModal(false);
            fetchTunnels();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al crear el túnel", { id: loadingToast });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("⚠️ ¿Estás seguro? Se liberará la IP y el nodo perderá conexión.")) return;
        
        const toastId = toast.loading("Eliminando túnel...");
        try {
            await client.delete(`/vpn/tunnels/${id}`);
            toast.success("Túnel eliminado y IP liberada", { id: toastId });
            fetchTunnels();
        } catch (error) {
            toast.error("No se pudo eliminar el túnel", { id: toastId });
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        toast.success("¡Copiado al portapapeles!", { icon: '🚀' });
    };

    const downloadConfFile = (confText: string, filename: string) => {
        const blob = new Blob([confText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.conf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
                            <ServerStackIcon className="w-3.5 h-3.5 text-emerald-400" /> Nodos y Accesos Remotos
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
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">Consultando Kernel de Linux...</span>
                </div>
            ) : tunnels.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700/30 border-dashed">
                    <ShieldCheckIcon className="w-16 h-16 text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-1">No hay túneles activos</h3>
                    <p className="text-slate-500 text-sm">Crea tu primer túnel para conectar un nodo o celular.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tunnels.map((tunnel) => {
                        const isMobile = tunnel.script_mikrotik.includes('[Interface]');

                        return (
                            <div 
                                key={tunnel.id} 
                                className={`relative bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 p-1 transition-all duration-300 shadow-xl group flex flex-col 
                                ${scriptVisibleId === tunnel.id ? 'z-[50] border-emerald-500/50 ring-1 ring-emerald-500/20' : 'z-10 overflow-hidden hover:border-emerald-500/30'}`}
                            >
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
                                            <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors truncate tracking-tight">
                                                {tunnel.nombre}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-emerald-400 font-mono text-lg font-bold tracking-tight">
                                                    {tunnel.ip_asignada}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${isMobile ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                            {isMobile ? <DevicePhoneMobileIcon className="w-6 h-6 text-blue-400" /> : <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />}
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

                                {/* BOTONES DE ACCIÓN */}
                                <div className="flex gap-2 p-2 pt-0 relative z-10">
                                    <div className="relative flex-1">
                                        <button
                                            onClick={() => {
                                                // ✅ Lógica mágica: Si es móvil abre el Modal QR, si es MikroTik abre la burbuja
                                                if (isMobile) {
                                                    setQrModalData({ script_text: tunnel.script_mikrotik, nombre: tunnel.nombre });
                                                } else {
                                                    setScriptVisibleId(scriptVisibleId === tunnel.id ? null : tunnel.id);
                                                }
                                            }}
                                            className={`w-full py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-[10px] font-black border uppercase tracking-wider shadow-sm
                                            ${scriptVisibleId === tunnel.id || (qrModalData && qrModalData.nombre === tunnel.nombre)
                                                ? 'bg-emerald-600 text-white border-emerald-400'
                                                : 'bg-slate-800/80 text-emerald-500 border-slate-700 hover:bg-emerald-600 hover:text-white'}`}
                                        >
                                            {isMobile ? <><QrCodeIcon className="w-4 h-4" /> VER CÓDIGO QR</> : <><BoltIcon className="w-4 h-4" /> VER SCRIPT MIKROTIK</>}
                                        </button>

                                        {/* Burbuja Solo para MikroTik */}
                                        {!isMobile && scriptVisibleId === tunnel.id && (
                                            <div className="absolute bottom-full mb-4 left-0 w-[280px] sm:w-[380px] z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                <div className="bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden font-mono ring-1 ring-white/10">
                                                    <div className="bg-slate-900 px-3 py-2 border-b border-slate-700 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                        <span>Script Autoconfig</span>
                                                        <button onClick={() => copyToClipboard(tunnel.script_mikrotik)} className="hover:text-white p-1" title="Copiar">
                                                            <DocumentDuplicateIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="p-4 bg-black/40">
                                                        <pre className="text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[180px] custom-scrollbar selection:bg-emerald-500/30 text-emerald-400">
                                                            {tunnel.script_mikrotik}
                                                        </pre>
                                                    </div>
                                                </div>
                                                <div className="absolute -bottom-1 left-10 w-3 h-3 bg-slate-950 border-b border-r border-slate-700 rotate-45"></div>
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={() => handleDelete(tunnel.id)} className="p-3 bg-slate-800/80 hover:bg-rose-600 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-700 flex items-center justify-center">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL PARA CREAR TÚNEL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <ShieldCheckIcon className="w-6 h-6 text-emerald-500" /> Nuevo Acceso VPN
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateTunnel} className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tipo de Dispositivo</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            type="button" 
                                            onClick={() => setTipoTunnel('mikrotik')}
                                            className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${tipoTunnel === 'mikrotik' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            <ServerStackIcon className="w-6 h-6" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Router MikroTik</span>
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setTipoTunnel('tecnico')}
                                            className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${tipoTunnel === 'tecnico' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            <DevicePhoneMobileIcon className="w-6 h-6" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Celular / PC</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre de Referencia</label>
                                    <input 
                                        type="text" 
                                        value={nuevoNombre}
                                        onChange={(e) => setNuevoNombre(e.target.value)}
                                        placeholder={tipoTunnel === 'mikrotik' ? "Ej: Torre Centro..." : "Ej: iPhone Fátima..."}
                                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isCreating} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all">
                                    {isCreating ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Generar Acceso'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DEL QR (Usado al crear y al visualizar un túnel móvil) */}
            {qrModalData && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                                <QrCodeIcon className="w-8 h-8 text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">Configuración VPN</h3>
                            <p className="text-sm text-slate-400 mb-6">Abre la app de WireGuard en el celular y escanea este código QR para conectar inmediatamente.</p>
                            
                            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-inner">
                                {/* ✅ AHORA REACT DIBUJA EL QR EN VIVO DESDE EL TEXTO DEL .CONF */}
                                <QRCodeSVG 
                                    value={qrModalData.script_text} 
                                    size={200}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>

                            <p className="text-xs text-slate-500 mt-6 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">{qrModalData.nombre}</p>
                        </div>
                        
                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
                            <button 
                                onClick={() => downloadConfFile(qrModalData.script_text, qrModalData.nombre)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" /> Descargar .conf
                            </button>
                            <button 
                                onClick={() => setQrModalData(null)}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
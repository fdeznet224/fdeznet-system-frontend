import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
    QrCodeIcon, 
    MagnifyingGlassIcon,
    PowerIcon, 
    MapPinIcon, 
    ChatBubbleLeftRightIcon,
    HomeIcon,
    ClipboardDocumentListIcon,
    ArchiveBoxArrowDownIcon, 
    CheckBadgeIcon
} from '@heroicons/react/24/outline';

import ChatModal from '../../components/ChatModal';

export default function TechDashboard() {
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState<'inicio' | 'agenda' | 'retiros'>('inicio');
    
    const [instalaciones, setInstalaciones] = useState<any[]>([]);
    const [retiros, setRetiros] = useState<any[]>([]); 
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    const [showChatModal, setShowChatModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState<any>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

    useEffect(() => {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            const u = JSON.parse(userJson);
            setUser(u);
            fetchAllData(u.id);
        } else {
            navigate('/login');
        }
    }, []);

    const fetchAllData = async (tecnicoId: number) => {
        setLoading(true);
        try {
            const res = await client.get(`/clientes/?tecnico_id=${tecnicoId}`);
            const pendientes = res.data.filter((c: any) => c.estado === 'pendiente_instalacion');
            setInstalaciones(pendientes);

            const porRecoger = res.data.filter((c: any) =>
                c.onu_asignada?.estado === 'POR_RECOGER'
            );
            setRetiros(porRecoger);
        } catch (error) {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmarRetiro = async (cliente: any) => {
        const t = toast.loading(`Liberando equipo de ${cliente.nombre}...`);
        try {
            await client.post(`/clientes/${cliente.id}/confirmar-retiro-onu`);
            toast.dismiss(t);
            toast.success("¡Equipo en Stock! Puerto y IP liberados.");
            fetchAllData(user.id); 
        } catch (error: any) {
            toast.dismiss(t);
            toast.error(error.response?.data?.detail || "Error al retirar");
        }
    };

    const fetchUnreadCounts = async () => {
        try {
            const res = await client.get('/whatsapp/no-leidos');
            setUnreadCounts(res.data);
        } catch (error) { }
    };

    useEffect(() => {
        fetchUnreadCounts();
        const intervalId = setInterval(fetchUnreadCounts, 5000);
        return () => clearInterval(intervalId);
    }, []);

    return (
        /* ✅ ADAPTADO: Fondo principal transiciona al tema elegido */
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] text-slate-900 dark:text-white font-sans flex flex-col overflow-hidden transition-colors duration-300">

            {/* HEADER ADAPTATIVO */}
            <div className="bg-white/90 dark:bg-[#1a1f2e] backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60 px-5 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm dark:shadow-lg transition-colors">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-base text-white shadow-lg border border-purple-500/20 shrink-0">
                        {user?.usuario?.charAt(0) || 'T'}
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">FdezNet Tech</p>
                        <h1 className="text-sm font-black text-slate-800 dark:text-white leading-tight transition-colors">{user?.usuario}</h1>
                    </div>
                </div>
                <button
                    onClick={() => { if (confirm("¿Cerrar sesión?")) { localStorage.clear(); navigate('/login'); } }}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-500 dark:hover:text-rose-500 rounded-full transition-all active:scale-95"
                >
                    <PowerIcon className="w-5 h-5" />
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 overflow-y-auto pb-28 px-4 pt-6">

                {/* PESTAÑA: INICIO (KPIs + Acceso a Búsqueda) */}
                {activeTab === 'inicio' && (
                    <div className="animate-in fade-in duration-500 flex flex-col gap-4">
                        
                        {/* ACCESO RÁPIDO A BÚSQUEDA / ESCÁNER ADAPTATIVO */}
                        <div 
                            onClick={() => navigate('/tech/buscar')}
                            className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 flex items-center justify-between shadow-sm dark:shadow-lg cursor-pointer active:scale-95 transition-all group hover:border-emerald-500/30 dark:hover:border-emerald-500/30"
                        >
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors">
                                <MagnifyingGlassIcon className="w-6 h-6" />
                                <span className="text-sm font-black tracking-tight">Buscar o escanear QR...</span>
                            </div>
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                                <QrCodeIcon className="w-6 h-6" />
                            </div>
                        </div>

                        {/* TARJETAS DE KPIs ADAPTATIVAS */}
                        <div className="grid grid-cols-1 gap-4">
                            <div onClick={() => setActiveTab('agenda')} className="bg-white dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:to-[#0f1219] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md dark:shadow-xl relative overflow-hidden active:scale-95 transition-all cursor-pointer group hover:border-purple-500/30 dark:hover:border-purple-500/30">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <span className="text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest transition-colors">Nuevas</span>
                                        <h2 className="text-5xl font-black text-slate-800 dark:text-white mt-1 transition-colors">{instalaciones.length}</h2>
                                        <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-wider transition-colors">Instalaciones pendientes</p>
                                    </div>
                                    <ClipboardDocumentListIcon className="w-14 h-14 text-purple-600 dark:text-purple-500 opacity-20 dark:opacity-30 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>

                            <div onClick={() => setActiveTab('retiros')} className="bg-white dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:to-[#0f1219] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md dark:shadow-xl relative overflow-hidden active:scale-95 transition-all cursor-pointer group hover:border-orange-500/30 dark:hover:border-orange-500/30">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <span className="text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest transition-colors">Equipos</span>
                                        <h2 className="text-5xl font-black text-slate-800 dark:text-white mt-1 transition-colors">{retiros.length}</h2>
                                        <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-wider transition-colors">Bajas por recoger</p>
                                    </div>
                                    <ArchiveBoxArrowDownIcon className="w-14 h-14 text-orange-600 dark:text-orange-500 opacity-20 dark:opacity-30 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PESTAÑA: AGENDA */}
                {activeTab === 'agenda' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 transition-colors">Agenda de Instalaciones</h3>
                        {instalaciones.length === 0 && <p className="text-center text-slate-500 dark:text-slate-600 text-sm py-10 font-bold">Sin instalaciones asignadas</p>}
                        {instalaciones.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm dark:shadow-lg space-y-4 relative transition-colors">
                                <div className="absolute left-0 top-4 bottom-4 w-1 bg-purple-500 rounded-r-full"></div>
                                <div className="pl-2">
                                    <h4 className="font-black text-slate-800 dark:text-white transition-colors">{item.nombre}</h4>
                                    <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1 flex items-center gap-1 font-medium"><MapPinIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{item.direccion}</span></p>
                                </div>
                                <div className="flex gap-2 pl-2">
                                    <button onClick={() => { setTargetCliente(item); setShowChatModal(true); }} className="flex-1 h-11 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-emerald-500/10 transition-colors active:scale-95"><ChatBubbleLeftRightIcon className="w-5 h-5" /></button>
                                    <button onClick={() => navigate(`/tech/instalar/${item.id}`)} className="flex-[3] h-11 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md">Instalar Servicio</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* PESTAÑA: RETIROS */}
                {activeTab === 'retiros' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-4">
                        <h3 className="text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-widest px-1 transition-colors">Retiro de Equipos</h3>
                        {retiros.length === 0 && <p className="text-center text-slate-500 dark:text-slate-600 text-sm py-10 font-bold">Sin retiros pendientes</p>}
                        {retiros.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm dark:shadow-lg space-y-4 relative transition-colors">
                                <div className="absolute left-0 top-4 bottom-4 w-1 bg-orange-500 rounded-r-full"></div>
                                <div className="pl-2">
                                    <h4 className="font-black text-slate-800 dark:text-white transition-colors">{item.nombre}</h4>
                                    <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1 flex items-center gap-1 font-medium"><MapPinIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{item.direccion}</span></p>
                                    <div className="mt-3 bg-slate-50 dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-orange-500/10 transition-colors">
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">SN a retirar:</p>
                                        <p className="text-sm font-mono text-orange-600 dark:text-orange-400 font-black tracking-widest transition-colors">{item.onu_asignada?.identificador || 'S/N'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 pl-2">
                                    <button onClick={() => { setTargetCliente(item); setShowChatModal(true); }} className="flex-1 h-12 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-emerald-500/10 transition-colors active:scale-95"><ChatBubbleLeftRightIcon className="w-5 h-5" /></button>
                                    <button
                                        onClick={() => { if (confirm(`¿Confirmas retiro de ${item.nombre}?`)) handleConfirmarRetiro(item); }}
                                        className="flex-[3] h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                                    >
                                        Confirmar Recojo <CheckBadgeIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* NAV INFERIOR ADAPTATIVO */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#161b28]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/80 px-4 py-2 pb-safe flex justify-between items-center z-40 transition-colors">
                <NavButton icon={HomeIcon} label="Inicio" active={activeTab === 'inicio'} onClick={() => setActiveTab('inicio')} />
                <NavButton icon={ClipboardDocumentListIcon} label="Agenda" active={activeTab === 'agenda'} onClick={() => setActiveTab('agenda')} />
                <NavButton icon={ArchiveBoxArrowDownIcon} label="Retiros" active={activeTab === 'retiros'} onClick={() => setActiveTab('retiros')} />
            </div>

            <ChatModal isOpen={showChatModal} onClose={() => setShowChatModal(false)} cliente={targetCliente} onMessagesRead={fetchUnreadCounts} />
        </div>
    );
}

const NavButton = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center p-2 transition-all ${active ? 'text-purple-600 dark:text-purple-500 scale-110' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}>
        <Icon className="w-6 h-6" />
        <span className="text-[8px] font-black uppercase tracking-widest mt-1">{label}</span>
    </button>
);
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    QrCodeIcon, MagnifyingGlassIcon, PlusIcon, 
    PowerIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    WrenchScrewdriverIcon, HomeIcon,
    ArrowPathIcon, PhoneIcon, ClipboardDocumentListIcon,
    MapIcon, ClockIcon, CheckBadgeIcon
} from '@heroicons/react/24/outline';

// 👇 IMPORTA TU NUEVO COMPONENTE 👇
import ChatModal from '../../components/ChatModal'; 

export default function TechDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'inicio' | 'buscar' | 'agenda'>('inicio');
    const [searchTerm, setSearchTerm] = useState('');
    const [instalaciones, setInstalaciones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // ESTADOS DEL MODAL Y NOTIFICACIONES
    const [showChatModal, setShowChatModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState<any>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

    useEffect(() => {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            const u = JSON.parse(userJson);
            setUser(u);
            fetchInstalaciones(u.id);
        } else {
            navigate('/login');
        }
    }, []);

    const fetchInstalaciones = async (tecnicoId: number) => {
        setLoading(true);
        try {
            const res = await client.get(`/clientes/?tecnico_id=${tecnicoId}`);
            const pendientes = res.data.filter((c: any) => c.estado === 'pendiente_instalacion');
            setInstalaciones(pendientes);
        } catch (error) { toast.error("Error al cargar agenda"); } 
        finally { setLoading(false); }
    };

    // POLLING PARA NOTIFICACIONES GLOBALES (Globitos Rojos)
    const fetchUnreadCounts = async () => {
        try {
            const res = await client.get('/whatsapp/no-leidos');
            setUnreadCounts(res.data);
        } catch (error) {}
    };

    useEffect(() => {
        fetchUnreadCounts(); 
        const intervalId = setInterval(fetchUnreadCounts, 5000); 
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="min-h-screen bg-[#0f1219] text-white font-sans flex flex-col overflow-hidden">
            
            {/* HEADER */}
            <div className="bg-[#1a1f2e] border-b border-slate-800/60 px-5 py-3 flex justify-between items-center sticky top-0 z-30 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-base shadow-lg border border-purple-500/20">
                        {user?.usuario?.charAt(0) || 'T'}
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Panel Técnico</p>
                        <h1 className="text-sm font-bold text-white leading-tight">{user?.usuario}</h1>
                    </div>
                </div>
                <button 
                    onClick={() => { if(confirm("¿Cerrar sesión?")) { localStorage.clear(); navigate('/login'); } }}
                    className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                >
                    <PowerIcon className="w-5 h-5" />
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 overflow-y-auto pb-28 px-4 pt-6">
                
                {/* PESTAÑA: INICIO */}
                {activeTab === 'inicio' && (
                    <div className="animate-in fade-in duration-500 space-y-6">
                        <div 
                            onClick={() => setActiveTab('agenda')}
                            className="bg-gradient-to-br from-[#1a1f2e] to-[#0f1219] border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer"
                        >
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <span className="text-purple-400 text-[10px] font-black uppercase tracking-widest">Pendientes</span>
                                    <h2 className="text-6xl font-black text-white mt-1 tracking-tighter">
                                        {instalaciones.length}
                                    </h2>
                                    <p className="text-slate-500 text-xs mt-1 font-medium italic">Instalaciones asignadas</p>
                                </div>
                                <div className="h-16 w-16 bg-purple-600/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                                    <ClipboardDocumentListIcon className="w-8 h-8 text-purple-500"/>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PESTAÑA: BUSCAR */}
                {activeTab === 'buscar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-[#1a1f2e] border border-slate-800 rounded-3xl p-6 space-y-6">
                            <input 
                                type="text" 
                                className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl py-3.5 px-4 text-white placeholder-slate-600 outline-none focus:border-purple-500 transition-all text-sm"
                                placeholder="Nombre, Folio o IP..."
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && navigate(`/tech/buscar?q=${searchTerm}`)}
                            />
                            <button 
                                onClick={() => navigate('/scanner')}
                                className="w-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 py-6 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all group"
                            >
                                <QrCodeIcon className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform"/>
                                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Escáner QR</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* PESTAÑA: AGENDA */}
                {activeTab === 'agenda' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Agenda de Hoy</h3>
                            <button onClick={() => fetchInstalaciones(user?.id)} className="p-1.5 bg-slate-800/50 rounded-lg text-slate-400">
                                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {instalaciones.map((item) => (
                                <div key={item.id} className="bg-[#1a1f2e] border border-slate-800/50 rounded-2xl p-4 shadow-lg flex flex-col gap-4 relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                    <div className="pl-2">
                                        <h4 onClick={() => navigate(`/tech/cliente/${item.id}`)} className="font-bold text-base text-white truncate">{item.nombre}</h4>
                                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mt-1">
                                            <MapPinIcon className="w-3.5 h-3.5 shrink-0"/>
                                            <span className="truncate">{item.direccion}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 border-t border-slate-800/50 pt-3 pl-2">
                                        <div className="relative col-span-1">
                                            <button 
                                                onClick={() => { setTargetCliente(item); setShowChatModal(true); }} 
                                                className="w-full h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 active:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                                            >
                                                <ChatBubbleLeftRightIcon className="w-5 h-5"/>
                                            </button>
                                            {/* Si hay mensajes sin leer, mostramos el globo */}
                                            {unreadCounts[item.id] > 0 && (
                                                <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg border-2 border-[#1a1f2e] animate-bounce">
                                                    {unreadCounts[item.id]}
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={() => navigate(`/tech/instalar/${item.id}`)} className="col-span-2 h-10 bg-purple-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                            Instalar <WrenchScrewdriverIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* NAV INFERIOR */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#161b28]/95 backdrop-blur-xl border-t border-slate-800/80 px-8 py-2 pb-safe flex justify-between items-center z-40">
                <button onClick={() => setActiveTab('inicio')} className={`flex flex-col items-center p-2 transition ${activeTab === 'inicio' ? 'text-purple-500' : 'text-slate-500 opacity-60'}`}>
                    <HomeIcon className="w-6 h-6" />
                    <span className="text-[9px] font-bold uppercase mt-1">Inicio</span>
                </button>
                <button onClick={() => setActiveTab('buscar')} className={`flex flex-col items-center p-2 transition ${activeTab === 'buscar' ? 'text-purple-500' : 'text-slate-500 opacity-60'}`}>
                    <MagnifyingGlassIcon className="w-6 h-6" />
                    <span className="text-[9px] font-bold uppercase mt-1">Buscar</span>
                </button>
                <button onClick={() => setActiveTab('agenda')} className={`flex flex-col items-center p-2 transition ${activeTab === 'agenda' ? 'text-purple-500' : 'text-slate-500 opacity-60'}`}>
                    <ClipboardDocumentListIcon className="w-6 h-6" />
                    <span className="text-[9px] font-bold uppercase mt-1">Agenda</span>
                </button>
            </div>

            {/* 👇 AQUÍ LLAMAMOS A TU NUEVO COMPONENTE REUTILIZABLE 👇 */}
            <ChatModal 
                isOpen={showChatModal} 
                onClose={() => setShowChatModal(false)} 
                cliente={targetCliente} 
                onMessagesRead={fetchUnreadCounts}
            />

        </div>
    );
}
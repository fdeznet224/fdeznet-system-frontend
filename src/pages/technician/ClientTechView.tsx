import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    ArrowLeftIcon, SignalIcon, GlobeAmericasIcon, 
    ServerIcon, XCircleIcon, CubeIcon, WrenchScrewdriverIcon, 
    ArrowPathIcon, CurrencyDollarIcon, CalendarDaysIcon,
    IdentificationIcon, KeyIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    CpuChipIcon, XMarkIcon, PaperAirplaneIcon
} from '@heroicons/react/24/outline';

interface TechData {
    id: number;
    nombre: string;
    cedula: string;
    telefono: string;
    direccion: string;
    estado: string;
    ip_asignada: string;
    is_online: boolean;
    mac_address: string;
    nap_nombre: string;
    puerto_nap: number | null;
    router_nombre: string; 
    plan_nombre: string;
    precio_plan: number;
    velocidad_bajada: number; 
    fecha_corte: string;
    total_deuda: number;
    facturas_pendientes: number;
    suggested_user: string;
    suggested_pass: string;
}

export default function ClientTechView() {
    const { cedula } = useParams(); 
    const navigate = useNavigate();
    const [data, setData] = useState<TechData | null>(null);
    const [loading, setLoading] = useState(true);

    // --- ESTADOS DEL CHAT ---
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Cargar datos del cliente
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await client.get(`/clientes/${cedula}/portal`);
                setData(res.data);
            } catch (error) {
                toast.error("Cliente no encontrado");
                navigate('/tech/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [cedula, navigate]);

    // 2. Lógica del Chat (Polling para simular tiempo real)
    const loadChat = async () => {
        if (!data?.id) return;
        try {
            const res = await client.get(`/whatsapp/chat/${data.id}`);
            setChatMessages(res.data);
        } catch (error) {
            console.error("Error cargando chat", error);
        }
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isChatOpen && data?.id) {
            loadChat(); // Cargar al abrir
            // Actualizar cada 3 segundos mientras esté abierto
            interval = setInterval(loadChat, 3000); 
        }
        return () => clearInterval(interval);
    }, [isChatOpen, data?.id]);

    // Auto-scroll hacia abajo cuando hay nuevos mensajes
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages, isChatOpen]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !data?.id) return;
        setIsSending(true);
        try {
            await client.post(`/whatsapp/chat/${data.id}/enviar`, { mensaje: newMessage });
            setNewMessage('');
            await loadChat(); // Recargar chat para ver el mensaje enviado
        } catch (error) {
            toast.error("Error al enviar mensaje");
        } finally {
            setIsSending(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0f1219] flex flex-col items-center justify-center font-sans">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando Datos...</p>
        </div>
    );

    if (!data) return null;

    const velocidadMb = data.velocidad_bajada / 1024;

    if (data.estado === 'pendiente_instalacion') {
        return (
            <div className="min-h-screen bg-[#0f1219] text-white p-6 flex flex-col justify-center font-sans">
                <div className="text-center">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mb-6 border border-orange-500/20 mx-auto">
                        <WrenchScrewdriverIcon className="w-10 h-10 text-orange-500"/>
                    </div>
                    <h1 className="text-2xl font-bold mb-2 text-white">{data.nombre}</h1>
                    <p className="text-slate-400 text-sm mb-8">Orden de instalación pendiente</p>
                    <button 
                        onClick={() => navigate(`/tech/instalar/${data.id}`)}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-bold text-white shadow-lg shadow-purple-900/40 active:scale-95 transition"
                    >
                        INICIAR INSTALACIÓN
                    </button>
                    <button onClick={() => navigate('/tech/dashboard')} className="w-full py-4 mt-3 text-slate-500 font-bold text-sm">
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1219] text-white pb-24 font-sans relative">
            
            {/* HEADER STICKY */}
            <div className="px-5 py-4 flex items-center gap-4 border-b border-slate-800 bg-[#0f1219]/90 backdrop-blur-md sticky top-0 z-20">
                <button onClick={() => navigate('/tech/dashboard')} className="p-2 -ml-2 text-slate-400 hover:text-white active:scale-90 transition">
                    <ArrowLeftIcon className="w-6 h-6"/>
                </button>
                <div className="flex-1 overflow-hidden">
                    <h2 className="font-bold text-sm truncate text-white uppercase tracking-wider">Detalle de Cliente</h2>
                    <p className="text-[10px] text-slate-500 truncate font-mono">ID: {data.id} • {data.cedula}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${data.is_online ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                    {data.is_online ? 'Online' : 'Offline'}
                </div>
            </div>

            <div className="p-5 space-y-6">
                {/* 1. STATUS DE CONEXIÓN */}
                <div className={`p-6 rounded-[2rem] border text-center relative overflow-hidden ${data.is_online ? 'bg-gradient-to-br from-[#1a1f2e] to-[#0f1219] border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-gradient-to-br from-[#1a1f2e] to-[#0f1219] border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.1)]'}`}>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${data.is_online ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {data.is_online ? <SignalIcon className="w-8 h-8"/> : <XCircleIcon className="w-8 h-8"/>}
                        </div>
                        <h1 className="text-2xl font-black text-white">{data.nombre}</h1>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <MapPinIcon className="w-3 h-3"/> {data.direccion || 'Sin dirección registrada'}
                        </p>
                    </div>
                </div>

                {/* 2. DATOS COMERCIALES */}
                <div className="bg-[#1a1f2e] border border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <CurrencyDollarIcon className="w-4 h-4"/> Estado de Cuenta
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-2xl border ${data.total_deuda > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                            <p className="text-[9px] font-bold uppercase opacity-70 mb-1">{data.total_deuda > 0 ? 'Deuda Total' : 'Al día'}</p>
                            <p className={`text-xl font-black ${data.total_deuda > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>${data.total_deuda}</p>
                            {data.facturas_pendientes > 0 && <span className="text-[9px] font-bold bg-black/20 px-1.5 rounded text-white">{data.facturas_pendientes} facturas</span>}
                        </div>
                        <div className="p-3 rounded-2xl bg-[#0f1219] border border-slate-700/50">
                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Plan Contratado</p>
                            <p className="text-sm font-bold text-white leading-tight">{velocidadMb} Megas</p>
                            <p className="text-[10px] text-purple-400 font-bold mt-1">${data.precio_plan}/mes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
                        <CalendarDaysIcon className="w-4 h-4 text-slate-500"/>
                        <p className="text-xs text-slate-400">Fecha de Corte: <span className="text-white font-bold">{data.fecha_corte}</span></p>
                    </div>
                </div>

                {/* 3. INFORMACIÓN TÉCNICA (RED) */}
                <div className="bg-[#1a1f2e] border border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ServerIcon className="w-4 h-4"/> Configuración de Red
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-[#0f1219] rounded-2xl border border-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><ServerIcon className="w-4 h-4"/></div>
                                <div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Nodo / Router</p>
                                    <p className="text-xs font-bold text-white">{data.router_nombre}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#0f1219] rounded-2xl border border-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><CubeIcon className="w-4 h-4"/></div>
                                <div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Caja NAP</p>
                                    <p className="text-xs font-bold text-white">{data.nap_nombre}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Puerto</p>
                                <span className="text-xs font-black text-white bg-slate-800 px-2 py-1 rounded">{data.puerto_nap || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[#0f1219] rounded-2xl border border-slate-800/50">
                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><GlobeAmericasIcon className="w-3 h-3"/> IP Asignada</p>
                                <p className="text-xs font-mono font-bold text-white">{data.ip_asignada}</p>
                            </div>
                            <div className="p-3 bg-[#0f1219] rounded-2xl border border-slate-800/50">
                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><CpuChipIcon className="w-3 h-3"/> MAC</p>
                                <p className="text-[10px] font-mono font-bold text-white break-all">{data.mac_address || 'Sin registro'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. CREDENCIALES PPPoE */}
                <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-3xl p-5 relative overflow-hidden">
                    <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-4 relative z-10">
                        <KeyIcon className="w-4 h-4"/> Credenciales PPPoE
                    </h3>
                    <div className="grid grid-cols-1 gap-3 relative z-10">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-xs text-slate-400">Usuario:</span>
                            <span className="text-sm font-mono font-bold text-white select-all">{data.suggested_user}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Contraseña:</span>
                            <span className="text-sm font-mono font-bold text-white select-all">{data.suggested_pass}</span>
                        </div>
                    </div>
                    <IdentificationIcon className="absolute -right-4 -bottom-4 w-24 h-24 text-purple-500/10 rotate-12"/>
                </div>

                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-4 bg-[#1a1f2e] hover:bg-slate-800 text-slate-300 rounded-2xl font-bold transition active:scale-95 border border-slate-700 shadow-lg flex items-center justify-center gap-2"
                >
                    <ArrowPathIcon className="w-5 h-5"/>
                    Actualizar Datos
                </button>
            </div>

            {/* BOTÓN FLOTANTE DEL CHAT (FAB) */}
            <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-90 transition-all z-40"
            >
                <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
            </button>

            {/* MODAL DEL CHAT (BOTTOM SHEET) */}
            {isChatOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
                    <div className="w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-[#0b0c10] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border-t sm:border border-slate-800 animate-in slide-in-from-bottom-full duration-300">
                        
                        {/* Cabecera del Chat */}
                        <div className="bg-[#1a1f2e] px-5 py-4 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-emerald-500"/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white truncate max-w-[200px]">{data.nombre}</h3>
                                    <p className="text-[10px] text-emerald-500 font-bold uppercase">{data.telefono}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-full text-slate-400 transition">
                                <XMarkIcon className="w-5 h-5"/>
                            </button>
                        </div>

                        {/* Área de Mensajes */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0b0c10]">
                            {chatMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-50">
                                    <ChatBubbleLeftRightIcon className="w-12 h-12 mb-3 text-slate-600"/>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Sin mensajes</p>
                                </div>
                            ) : (
                                chatMessages.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.direccion === 'salida' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-md ${
                                            msg.direccion === 'salida' 
                                                ? 'bg-emerald-600 text-white rounded-tr-sm' 
                                                : 'bg-[#1a1f2e] text-slate-200 border border-slate-800 rounded-tl-sm'
                                        }`}>
                                            <p>{msg.mensaje}</p>
                                            <p className={`text-[9px] mt-1 text-right font-bold ${msg.direccion === 'salida' ? 'text-emerald-200' : 'text-slate-500'}`}>
                                                {new Date(msg.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input de Texto */}
                        <div className="bg-[#1a1f2e] p-3 border-t border-slate-800 pb-safe">
                            <div className="flex items-center gap-2 bg-[#0b0c10] border border-slate-700 rounded-full p-1 pl-4 focus-within:border-emerald-500 transition-colors">
                                <input 
                                    type="text"
                                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-500"
                                    placeholder="Escribe un mensaje..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || isSending}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                        newMessage.trim() && !isSending ? 'bg-emerald-500 text-white active:scale-90' : 'bg-slate-800 text-slate-600'
                                    }`}
                                >
                                    {isSending ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5 -ml-0.5"/>}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
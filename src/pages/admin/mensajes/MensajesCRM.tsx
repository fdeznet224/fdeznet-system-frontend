import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import client from '@/api/axios'; 
import { toast } from 'react-hot-toast';
import {
    MagnifyingGlassIcon, PaperAirplaneIcon,
    MapPinIcon, UserCircleIcon,
    CurrencyDollarIcon, SignalIcon, PlayCircleIcon, PauseCircleIcon,
    ChatBubbleLeftRightIcon, XMarkIcon, ChevronLeftIcon,
    EllipsisVerticalIcon, DocumentIcon, MusicalNoteIcon, VideoCameraIcon
} from '@heroicons/react/24/outline';
import { useWhatsApp } from '@/context/whatsapp/context';

// --- SVGs DE WHATSAPP ---
const IconClock = () => <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" className="text-white/60"><path d="M8 0a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm0 14.5a6.5 6.5 0 1 1 6.5-6.5 6.5 6.5 0 0 1-6.5 6.5zM8.5 4h-1v4.2l3 1.8.5-.8-2.5-1.5z"/></svg>;
const IconSingleTick = () => <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor" className="text-white/60"><path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.72a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .011.524l3.12 2.993a.364.364 0 0 0 .534-.035l6.362-7.82a.363.363 0 0 0-.07-.504z"/></svg>;
const IconDoubleTick = ({ isRead }: { isRead: boolean }) => (
    <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor" className={isRead ? "text-[#53bdeb]" : "text-white/60"}>
        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .464-.028l6.362-7.82a.363.363 0 0 0-.07-.504zM10.453 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.109 9.88a.32.32 0 0 1-.484.032L1.435 7.72a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .011.524l3.12 2.993a.364.364 0 0 0 .534-.035l6.362-7.82a.363.363 0 0 0-.07-.504z"/>
    </svg>
);

// 🔥 COLORES ESTILO WHATSAPP BUSINESS PARA LAS ZONAS
const LABEL_COLORS = ['#53bdeb', '#ff7a7a', '#ffb02e', '#a881af', '#25d366', '#00e676'];

interface ClienteCRM {
    id: number;
    nombre: string;
    telefono: string | null;
    zona: string | null;
    servicio: {
        estado_servicio: string;
        plan_nombre: string;
        ip_asignada: string;
        router_nombre: string;
    };
    finanzas: {
        total_deuda: number;
    };
}

interface MensajeChat {
    id?: number;
    wa_id?: string;
    ack?: number;
    cliente_id?: number;
    direccion: string;
    mensaje: string;
    fecha?: string;
}

export default function MensajesCRM() {
    const { wsEvent, unreadCounts, clearUnread } = useWhatsApp();

    const [clientes, setClientes] = useState<ClienteCRM[]>([]);
    const [busqueda, setBusqueda] = useState('');
    
    // 🔥 ESTADO ÚNICO DE FILTRADO (todos, no_leidos, o el nombre de la zona)
    const [filtroActivo, setFiltroActivo] = useState<string>('todos'); 
    
    const [activeClienteId, setActiveClienteId] = useState<number | null>(null);
    const [showContactInfo, setShowContactInfo] = useState(false); 
    
    const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
    const [nuevoTexto, setNuevoTexto] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchDirectorio = useCallback(async () => {
        try {
            const resClientes = await client.get<ClienteCRM[]>('/clientes/listado-completo-unificado');
            setClientes(resClientes.data);
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => { void fetchDirectorio(); }, [fetchDirectorio]);

    useEffect(() => {
        if (!activeClienteId) {
            setShowContactInfo(false);
            return;
        }
        const fetchChat = async () => {
            try {
                clearUnread(activeClienteId);
                const res = await client.get<MensajeChat[]>(`/whatsapp/chat/${activeClienteId}`);
                setMensajes(res.data);
            } catch (error) {
                console.warn('No fue posible cargar la conversación', error);
            }
        };
        void fetchChat();
    }, [activeClienteId, clearUnread]);

    useEffect(() => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [mensajes]);

    useEffect(() => {
        if (!wsEvent) return;

        if (wsEvent.type === 'NEW_MESSAGE') {
            const msg = wsEvent.data;
            if (activeClienteId !== null && msg.cliente_id === activeClienteId && typeof msg.mensaje === 'string') {
                const incomingMessage: MensajeChat = {
                    id: msg.id,
                    wa_id: msg.wa_id,
                    ack: msg.ack,
                    cliente_id: msg.cliente_id,
                    direccion: msg.direccion || 'entrada',
                    mensaje: msg.mensaje,
                    fecha: msg.fecha
                };
                setMensajes(prev => {
                    if (msg.id !== undefined && prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, incomingMessage];
                });
                clearUnread(activeClienteId);
            }
        } 
        else if (wsEvent.type === 'MESSAGE_ACK') {
            const { wa_id, ack, cliente_id } = wsEvent.data;
            if (cliente_id === activeClienteId) {
                setMensajes(prev => prev.map(m => m.wa_id === wa_id ? { ...m, ack: ack } : m));
            }
        }
    }, [wsEvent, activeClienteId, clearUnread]);

    const handleEnviarMensaje = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!nuevoTexto.trim() || !activeClienteId) return;

        const texto = nuevoTexto;
        setNuevoTexto("");
        setSending(true);

        const msgTemp = { id: -Date.now(), direccion: 'salida', mensaje: texto, ack: 0, fecha: new Date().toISOString() };
        setMensajes(prev => [...prev, msgTemp]);

        try {
            await client.post(`/whatsapp/chat/${activeClienteId}/enviar`, { mensaje: texto });
            const res = await client.get<MensajeChat[]>(`/whatsapp/chat/${activeClienteId}`);
            setMensajes(res.data);
        } catch { toast.error("Error al enviar mensaje"); }
        finally { setSending(false); }
    };

    const handleToggleSuspension = async (cliente: ClienteCRM) => {
        const isSuspended = ['suspendido', 'cortado'].includes(cliente.servicio.estado_servicio.toLowerCase());
        const nuevoEstado = isSuspended ? 'activo' : 'suspendido';
        const load = toast.loading(isSuspended ? "Reactivando..." : "Suspendiendo...");
        try {
            await client.put(`/clientes/${cliente.id}/estado`, { nuevo_estado: nuevoEstado });
            toast.dismiss(load); toast.success(isSuspended ? "Reactivado" : "Suspendido");
            fetchDirectorio(); 
        } catch { toast.dismiss(load); toast.error("Error"); }
    };

    // 🔥 EXTRAER ZONAS DISPONIBLES
    const zonasDisponibles = useMemo(() => {
        const zonas = clientes.map(c => c.zona).filter((zona): zona is string => Boolean(zona));
        return Array.from(new Set(zonas)).sort();
    }, [clientes]);

    // 🔥 FILTRADO UNIFICADO (Zonas + No leídos + Todos)
    const contactosFiltrados = useMemo(() => {
        let lista = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (c.telefono ?? '').includes(busqueda));
        
        if (filtroActivo === 'no_leidos') {
            lista = lista.filter(c => (unreadCounts[c.id]?.count || 0) > 0);
        } else if (filtroActivo !== 'todos') {
            // Si no es "todos" ni "no_leidos", significa que seleccionaste el nombre de una Zona
            lista = lista.filter(c => c.zona === filtroActivo);
        }
        
        return lista.sort((a, b) => {
            const countA = unreadCounts[a.id]?.count || 0;
            const countB = unreadCounts[b.id]?.count || 0;
            if (countA > 0 && countB === 0) return -1;
            if (countB > 0 && countA === 0) return 1;
            return 0; 
        });
    }, [clientes, busqueda, unreadCounts, filtroActivo]);

    const activeClienteData = clientes.find(c => c.id === activeClienteId);
    const unreadTotal = Object.values(unreadCounts).reduce((acc, curr) => acc + curr.count, 0);

    return (
        <div className="fixed top-20 bottom-0 left-0 md:left-64 right-0 z-20 flex bg-[#0b141a] font-sans overflow-hidden">
            
            {/* COLUMNA 1: LISTA DE CHATS */}
            <div className={`w-full md:w-[380px] border-r border-slate-700/50 flex flex-col bg-[#111b21] transition-all ${activeClienteId ? 'hidden md:flex' : 'flex'}`}>
                
                <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold text-[#e9edef] flex items-center gap-2">
                        Mensajes
                    </h2>
                    <div className="flex gap-4 text-[#aebac1]">
                        <ChatBubbleLeftRightIcon className="w-6 h-6 cursor-pointer hover:text-white transition" />
                        <EllipsisVerticalIcon className="w-6 h-6 cursor-pointer hover:text-white transition" />
                    </div>
                </div>

                <div className="pt-2 pb-1 border-b border-slate-800 shrink-0 flex flex-col gap-3">
                    {/* Buscador */}
                    <div className="px-3">
                        <div className="bg-[#202c33] rounded-lg flex items-center px-3 py-1.5">
                            <MagnifyingGlassIcon className="w-5 h-5 text-[#8696a0] mr-3" />
                            <input 
                                type="text" placeholder="Buscar un chat..."
                                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] outline-none text-sm"
                            />
                        </div>
                    </div>
                    
                    {/* 🔥 ETIQUETAS DESLIZABLES (ZONAS Y FILTROS) 🔥 */}
                    <div className="flex gap-2 px-3 overflow-x-auto custom-scrollbar pb-2">
                        <button 
                            onClick={() => setFiltroActivo('todos')} 
                            className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition ${filtroActivo === 'todos' ? 'bg-[#0a332c] text-[#00a884]' : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]'}`}
                        >
                            Todos
                        </button>
                        <button 
                            onClick={() => setFiltroActivo('no_leidos')} 
                            className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition ${filtroActivo === 'no_leidos' ? 'bg-[#0a332c] text-[#00a884]' : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]'}`}
                        >
                            No leídos {unreadTotal > 0 && `(${unreadTotal})`}
                        </button>
                        
                        {/* Generamos las burbujas para las zonas con su color */}
                        {zonasDisponibles.map((zona, idx) => {
                            const color = LABEL_COLORS[idx % LABEL_COLORS.length];
                            const isActive = filtroActivo === zona;
                            return (
                                <button 
                                    key={zona}
                                    onClick={() => setFiltroActivo(zona)}
                                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition ${isActive ? 'bg-[#0a332c] text-[#00a884]' : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]'}`}
                                >
                                    {!isActive && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>}
                                    {zona}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#111b21]">
                    {contactosFiltrados.map(c => {
                        const unread = unreadCounts[c.id]?.count || 0;
                        const isActive = c.id === activeClienteId;
                        return (
                            <div 
                                key={c.id} 
                                onClick={() => setActiveClienteId(c.id)}
                                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                            >
                                <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                                    {c.nombre.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0 border-b border-slate-800/50 pb-3 pt-1">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className={`text-[15px] truncate ${unread > 0 ? 'text-[#e9edef] font-bold' : 'text-[#e9edef]'}`}>{c.nombre}</h3>
                                        {unread > 0 && <span className="text-xs text-[#00a884] font-medium">{new Date().toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</span>}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-[#8696a0] truncate">{c.telefono || 'Sin teléfono'}</p>
                                        {unread > 0 && (
                                            <div className="w-5 h-5 rounded-full bg-[#00a884] text-[#111b21] text-[11px] font-bold flex items-center justify-center shrink-0">
                                                {unread}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* AREA PRINCIPAL */}
            {activeClienteId && activeClienteData ? (
                <div className="flex-1 flex overflow-hidden relative bg-[#0b141a]">
                    
                    {/* COLUMNA 2: EL CHAT */}
                    <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
                        
                        <div 
                            onClick={() => setShowContactInfo(!showContactInfo)}
                            className="h-16 px-4 bg-[#202c33] flex items-center gap-3 shrink-0 cursor-pointer hover:bg-[#2a3942] transition select-none"
                        >
                            <button onClick={(e) => { e.stopPropagation(); setActiveClienteId(null); }} className="md:hidden text-[#aebac1] p-1"><ChevronLeftIcon className="w-6 h-6"/></button>
                            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                                {activeClienteData.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[#e9edef] text-base font-medium truncate">{activeClienteData.nombre}</h3>
                                <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide mt-0.5">
                                    <span className={activeClienteData.servicio.estado_servicio === 'activo' ? 'text-[#00a884]' : 'text-rose-500'}>
                                        {activeClienteData.servicio.estado_servicio === 'activo' ? '🟢 ACTIVO' : '🔴 CORTADO'}
                                    </span>
                                    <span className="text-[#8696a0]">•</span>
                                    <span className={activeClienteData.finanzas.total_deuda > 0 ? 'text-rose-400' : 'text-[#8696a0]'}>
                                        {activeClienteData.finanzas.total_deuda > 0 ? `DEUDA: $${activeClienteData.finanzas.total_deuda}` : 'AL DÍA'}
                                    </span>
                                    <span className="text-[#8696a0] hidden sm:inline">•</span>
                                    <span className="text-[#8696a0] hidden sm:inline">{activeClienteData.servicio.plan_nombre}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-1.5 custom-scrollbar bg-[#0b141a] bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center bg-blend-overlay relative">
                            {mensajes.map((msg, idx) => {
                                const isOut = msg.direccion === 'salida';
                                
                                const esUbicacion = msg.mensaje.includes('http://googleusercontent.com/maps.google.com/') || msg.mensaje.includes('📍 Ubicación');
                                const esImagen = msg.mensaje.startsWith('[IMAGE]');
                                const esAudio = msg.mensaje.startsWith('[AUDIO]');
                                const esVideo = msg.mensaje.startsWith('[VIDEO]'); 
                                const esDocumento = msg.mensaje.startsWith('[DOCUMENT=');

                                let contentUrl = '';
                                let docName = 'Documento';

                                if (esImagen) contentUrl = msg.mensaje.replace('[IMAGE]', '').trim();
                                else if (esAudio) contentUrl = msg.mensaje.replace('[AUDIO]', '').trim();
                                else if (esVideo) contentUrl = msg.mensaje.replace('[VIDEO]', '').trim();
                                else if (esDocumento) {
                                    const match = msg.mensaje.match(/\[DOCUMENT=(.*?)\](.*)/);
                                    if (match) {
                                        docName = match[1];
                                        contentUrl = match[2].trim();
                                    }
                                }
                                const urlMapa = esUbicacion ? msg.mensaje.match(/https?:\/\/[^\s]+/)?.[0] : null;

                                const prevMsg = mensajes[idx - 1];
                                const showTail = !prevMsg || prevMsg.direccion !== msg.direccion;

                                return (
                                    <div key={msg.id || idx} className={`flex ${isOut ? 'justify-end' : 'justify-start'} ${showTail ? 'mt-3' : 'mt-0.5'}`}>
                                        <div className={`relative max-w-[85%] md:max-w-[65%] px-3 pt-2 pb-2.5 text-[14.5px] shadow-sm flex flex-col ${
                                            isOut ? 'bg-[#005c4b] text-[#e9edef] rounded-lg' : 'bg-[#202c33] text-[#e9edef] rounded-lg'
                                        } ${showTail && isOut ? 'rounded-tr-none' : ''} ${showTail && !isOut ? 'rounded-tl-none' : ''}`}>
                                            
                                            {showTail && isOut && <div className="absolute top-0 -right-2 w-0 h-0 border-[6px] border-transparent border-t-[#005c4b] border-l-[#005c4b]"></div>}
                                            {showTail && !isOut && <div className="absolute top-0 -left-2 w-0 h-0 border-[6px] border-transparent border-t-[#202c33] border-r-[#202c33]"></div>}

                                            <div className="break-words whitespace-pre-wrap pr-16">
                                                {esUbicacion && urlMapa ? (
                                                    <div className="flex items-center gap-2 text-[#00a884] font-bold"><MapPinIcon className="w-4 h-4" /> Ubicación Compartida</div>
                                                ) : esImagen ? (
                                                    <img src={contentUrl} alt="Img" className="max-h-64 rounded-md object-cover cursor-pointer mb-2" onClick={() => window.open(contentUrl, '_blank')}/>
                                                ) : esVideo ? (
                                                    <div className="flex flex-col gap-1 mb-2">
                                                        <div className="flex items-center gap-1.5 text-white/50 text-[10px] uppercase font-bold">
                                                            <VideoCameraIcon className="w-3 h-3"/> Video Recibido
                                                        </div>
                                                        <video controls className="max-h-64 rounded-md object-cover w-full bg-black/20">
                                                            <source src={contentUrl} type="video/mp4" />
                                                        </video>
                                                    </div>
                                                ) : esAudio ? (
                                                    <div className="flex flex-col gap-1 min-w-[220px]">
                                                        <div className="flex items-center gap-1.5 text-white/50 text-[10px] uppercase font-bold">
                                                            <MusicalNoteIcon className="w-3 h-3"/> Mensaje de Voz
                                                        </div>
                                                        <audio controls className="w-full h-8 outline-none">
                                                            <source src={contentUrl} />
                                                        </audio>
                                                    </div>
                                                ) : esDocumento ? (
                                                    <a href={contentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-black/20 p-2 rounded-lg hover:bg-black/30 transition">
                                                        <div className="bg-rose-500/20 p-2 rounded-lg"><DocumentIcon className="w-6 h-6 text-rose-400"/></div>
                                                        <span className="text-sm truncate font-medium max-w-[150px]">{docName}</span>
                                                    </a>
                                                ) : (
                                                    <span>{msg.mensaje}</span>
                                                )}
                                            </div>
                                            
                                            <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                                <span className="text-[10px] text-white/60 leading-none">
                                                    {msg.fecha ? new Date(msg.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                </span>
                                                {isOut && (
                                                    <div className="flex items-center">
                                                        {msg.ack === 0 && <IconClock />}
                                                        {msg.ack === 1 && <IconSingleTick />}
                                                        {msg.ack === 2 && <IconDoubleTick isRead={false} />}
                                                        {msg.ack === 3 && <IconDoubleTick isRead={true} />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleEnviarMensaje} className="p-3 bg-[#202c33] flex items-end gap-3 shrink-0">
                            <div className="flex-1 bg-[#2a3942] rounded-xl flex items-center px-4 py-2 min-h-[44px]">
                                <input 
                                    type="text" value={nuevoTexto} onChange={e => setNuevoTexto(e.target.value)}
                                    placeholder="Escribe un mensaje"
                                    className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] outline-none text-[15px]"
                                />
                            </div>
                            <button type="submit" disabled={!nuevoTexto.trim() || sending} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 ${nuevoTexto.trim() ? 'bg-[#00a884] text-[#111b21]' : 'text-[#8696a0]'}`}>
                                <PaperAirplaneIcon className="w-6 h-6 -ml-0.5" />
                            </button>
                        </form>
                    </div>

                    {/* COLUMNA 3: INFORMACIÓN DEL CONTACTO */}
                    {showContactInfo && (
                        <div className="w-[320px] lg:w-[350px] bg-[#111b21] border-l border-slate-700/50 flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-200 absolute md:relative right-0 h-full z-20 shadow-2xl md:shadow-none">
                            <div className="h-16 px-4 bg-[#202c33] flex items-center gap-4 shrink-0 shadow-sm">
                                <button onClick={() => setShowContactInfo(false)} className="text-[#aebac1] hover:text-white p-1">
                                    <XMarkIcon className="w-6 h-6"/>
                                </button>
                                <h3 className="text-[#e9edef] text-base font-medium">Info. del cliente</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="p-6 flex flex-col items-center bg-[#111b21] mb-2 shadow-sm">
                                    <div className="w-40 h-40 bg-slate-600 rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-lg">
                                        <UserCircleIcon className="w-24 h-24" />
                                    </div>
                                    <h3 className="text-xl text-[#e9edef] text-center mb-1">{activeClienteData.nombre}</h3>
                                    <p className="text-[#8696a0] text-lg mb-2">{activeClienteData.telefono}</p>
                                </div>

                                <div className="bg-[#111b21] p-5 shadow-sm space-y-5">
                                    <div>
                                        <h4 className="text-sm text-[#8696a0] mb-3 flex items-center gap-2"><CurrencyDollarIcon className="w-5 h-5"/> Estado de Cuenta</h4>
                                        <div className="bg-[#202c33] rounded-xl p-4 border border-[#2a3942]">
                                            <p className="text-sm text-[#8696a0] mb-1">Deuda Total</p>
                                            <p className={`text-3xl font-light ${activeClienteData.finanzas.total_deuda > 0 ? 'text-rose-500' : 'text-[#00a884]'}`}>
                                                ${activeClienteData.finanzas.total_deuda.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm text-[#8696a0] mb-3 flex items-center gap-2"><SignalIcon className="w-5 h-5"/> Servicio Activo</h4>
                                        <div className="bg-[#202c33] rounded-xl p-4 space-y-3 border border-[#2a3942]">
                                            <div className="flex justify-between items-center"><span className="text-[#8696a0] text-sm">Plan</span><span className="text-[#e9edef]">{activeClienteData.servicio.plan_nombre}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-[#8696a0] text-sm">IP Asignada</span><span className="text-blue-400 font-mono text-sm">{activeClienteData.servicio.ip_asignada}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-[#8696a0] text-sm">Router</span><span className="text-[#e9edef] text-sm">{activeClienteData.servicio.router_nombre}</span></div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleToggleSuspension(activeClienteData)}
                                        className={`w-full py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors ${activeClienteData.servicio.estado_servicio === 'activo' ? 'text-[#f15c6d] hover:bg-[#202c33]' : 'text-[#00a884] hover:bg-[#202c33]'}`}
                                    >
                                        {activeClienteData.servicio.estado_servicio === 'activo' ? <><PauseCircleIcon className="w-6 h-6"/> Cortar Servicio</> : <><PlayCircleIcon className="w-6 h-6"/> Reactivar Servicio</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#222e35] border-l border-slate-700/50">
                    <div className="max-w-md text-center flex flex-col items-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" className="w-20 h-20 mb-8 opacity-50 grayscale" />
                        <h2 className="text-3xl font-light text-[#e9edef] mb-4">FdezNet Mensajes</h2>
                        <p className="text-[#8696a0] text-sm leading-relaxed">
                            Envía y recibe mensajes sin necesidad de mantener tu teléfono conectado.<br/>
                            Administra la red y las finanzas de tus clientes desde una sola pantalla.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

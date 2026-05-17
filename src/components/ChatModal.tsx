import { useState, useEffect, useRef } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import { 
    ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon,
    ArrowPathIcon, MapIcon, MapPinIcon, GlobeAltIcon,
    DocumentIcon, MusicalNoteIcon, VideoCameraIcon
} from '@heroicons/react/24/outline';
import { useWhatsApp } from '../context/WhatsAppContext'; // 🔥 IMPORTAMOS EL TUBO MAESTRO

// --- SVGs DE WHATSAPP ---
const IconClock = () => <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" className="text-white/60"><path d="M8 0a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm0 14.5a6.5 6.5 0 1 1 6.5-6.5 6.5 6.5 0 0 1-6.5 6.5zM8.5 4h-1v4.2l3 1.8.5-.8-2.5-1.5z"/></svg>;
const IconSingleTick = () => <svg viewBox="0 0 16 15" width="15" height="14" fill="currentColor" className="text-white/60"><path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.72a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .011.524l3.12 2.993a.364.364 0 0 0 .534-.035l6.362-7.82a.363.363 0 0 0-.07-.504z"/></svg>;
const IconDoubleTick = ({ isRead }: { isRead: boolean }) => (
    <svg viewBox="0 0 16 15" width="15" height="14" fill="currentColor" className={isRead ? "text-[#53bdeb]" : "text-white/60"}>
        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .464-.028l6.362-7.82a.363.363 0 0 0-.07-.504zM10.453 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.109 9.88a.32.32 0 0 1-.484.032L1.435 7.72a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .011.524l3.12 2.993a.364.364 0 0 0 .534-.035l6.362-7.82a.363.363 0 0 0-.07-.504z"/>
    </svg>
);

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    cliente: { id: number; nombre: string; telefono: string } | null;
    onMessagesRead?: () => void;
}

export default function ChatModal({ isOpen, onClose, cliente, onMessagesRead }: ChatModalProps) {
    const [mensaje, setMensaje] = useState("");
    const [sending, setSending] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 🚰 NOS CONECTAMOS AL TUBO MAESTRO
    const { wsEvent, clearUnread } = useWhatsApp();

    const loadChat = async () => {
        if (!cliente?.id) return;
        try {
            // Limpiamos los globitos rojos al abrir el modal
            clearUnread(cliente.id);

            const res = await client.get(`/whatsapp/chat/${cliente.id}`);
            setChatMessages(res.data);
            if (onMessagesRead) onMessagesRead();
        } catch (error) {
            console.error("Error cargando chat", error);
        }
    };

    // Carga inicial al abrir el modal
    useEffect(() => {
        if (isOpen && cliente?.id) {
            loadChat();
        }
    }, [isOpen, cliente?.id]);

    // 🔥 ESCUCHAR AL TUBO MAESTRO 🔥
    useEffect(() => {
        if (!isOpen || !cliente?.id || !wsEvent) return;

        if (wsEvent.type === 'NEW_MESSAGE') {
            const msg = wsEvent.data;
            // Si nos escribió el cliente que tenemos abierto en el modal
            if (msg.cliente_id === cliente.id) {
                setChatMessages(prev => {
                    // Escudo Anti-Duplicados
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                
                // Silenciosamente marcamos como leído en backend
                client.get(`/whatsapp/chat/${cliente.id}`).catch(()=>{});
                // Limpiamos el globito global
                clearUnread(cliente.id);
                
                if (onMessagesRead) onMessagesRead();
            }
        } 
        else if (wsEvent.type === 'MESSAGE_ACK') {
            const { wa_id, ack, cliente_id } = wsEvent.data;
            if (cliente_id === cliente.id) {
                setChatMessages(prev => prev.map(m => 
                    m.wa_id === wa_id ? { ...m, ack: ack } : m
                ));
            }
        }
    }, [wsEvent, isOpen, cliente?.id]);

    // Auto-Scroll
    useEffect(() => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, isOpen]);

    const handleEnviarMensaje = async () => {
        if (!mensaje.trim() || !cliente?.id) return;
        
        const textoEnviado = mensaje;
        setMensaje(""); 
        setSending(true);
        
        // UX Optimista instantáneo
        const mensajeTemporal = {
            id: -Date.now(),
            direccion: 'salida',
            mensaje: textoEnviado,
            ack: 0,
            fecha: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, mensajeTemporal]);

        try {
            await client.post(`/whatsapp/chat/${cliente.id}/enviar`, { mensaje: textoEnviado });
            const res = await client.get(`/whatsapp/chat/${cliente.id}`);
            setChatMessages(res.data);
        } catch (error) {
            toast.error("Error al enviar mensaje");
        } finally {
            setSending(false);
        }
    };

    const aplicarPlantilla = (texto: string) => {
        setMensaje(texto.replace("{nombre}", cliente?.nombre || "Cliente"));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
            <div className="bg-[#0b141a] w-full h-[85vh] sm:h-[650px] sm:max-w-md flex flex-col rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl border-t sm:border border-slate-700/50 animate-in slide-in-from-bottom-10 duration-300 overflow-hidden">
                
                {/* Cabecera */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-slate-800/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold">
                            {cliente?.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-medium text-base text-[#e9edef] truncate max-w-[200px]">{cliente?.nombre}</h3>
                            <p className="text-xs text-[#8696a0] font-mono">{cliente?.telefono}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#2a3942] rounded-full text-[#aebac1] transition">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>

                {/* Fila de Plantillas */}
                <div className="bg-[#202c33] border-b border-slate-800/50 p-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    <button onClick={() => aplicarPlantilla("Hola {nombre}, soy el técnico de FdezNet. Estoy en camino a tu domicilio.")} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2a3942] hover:bg-[#37474f] rounded-full text-[11px] font-medium text-[#e9edef] shrink-0 transition-colors">
                        <MapIcon className="w-3.5 h-3.5 text-[#00a884]"/> Voy en camino
                    </button>
                    <button onClick={() => aplicarPlantilla("Hola {nombre}, por favor envíame tu ubicación exacta por este medio.")} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2a3942] hover:bg-[#37474f] rounded-full text-[11px] font-medium text-[#e9edef] shrink-0 transition-colors">
                        <MapPinIcon className="w-3.5 h-3.5 text-rose-400"/> Pedir Ubicación
                    </button>
                </div>

                {/* Área de Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar bg-[#0b141a] bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center bg-blend-overlay">
                    {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2 text-[#8696a0]"/>
                            <p className="text-xs uppercase font-bold tracking-widest text-[#8696a0]">Historial vacío</p>
                        </div>
                    ) : (
                        chatMessages.map((msg, index) => {
                            const isOut = msg.direccion === 'salida';
                            
                            // Detectores
                            const esUbicacion = msg.mensaje.includes('http://googleusercontent.com/maps.google.com/') || msg.mensaje.includes('📍 Ubicación');
                            const esImagen = msg.mensaje.startsWith('[IMAGE]');
                            const esAudio = msg.mensaje.startsWith('[AUDIO]');
                            const esVideo = msg.mensaje.startsWith('[VIDEO]'); // 🔥 DETECTAMOS VIDEO
                            const esDocumento = msg.mensaje.startsWith('[DOCUMENT=');

                            // Limpieza de URLs
                            let contentUrl = '';
                            let docName = 'Documento adjunto';

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

                            // Lógica del "Rabito" del globo
                            const prevMsg = chatMessages[index - 1];
                            const showTail = !prevMsg || prevMsg.direccion !== msg.direccion;

                            return (
                                <div key={msg.id || index} className={`flex ${isOut ? 'justify-end' : 'justify-start'} ${showTail ? 'mt-3' : 'mt-0.5'}`}>
                                    <div className={`relative max-w-[85%] px-3 pt-2 pb-2.5 text-[14.5px] shadow-sm flex flex-col ${
                                        isOut ? 'bg-[#005c4b] text-[#e9edef] rounded-lg' : 'bg-[#202c33] text-[#e9edef] rounded-lg'
                                    } ${showTail && isOut ? 'rounded-tr-none' : ''} ${showTail && !isOut ? 'rounded-tl-none' : ''}`}>
                                        
                                        {/* Pico del globo */}
                                        {showTail && isOut && <div className="absolute top-0 -right-2 w-0 h-0 border-[6px] border-transparent border-t-[#005c4b] border-l-[#005c4b]"></div>}
                                        {showTail && !isOut && <div className="absolute top-0 -left-2 w-0 h-0 border-[6px] border-transparent border-t-[#202c33] border-r-[#202c33]"></div>}

                                        {/* RENDER MULTIMEDIA */}
                                        <div className="break-words whitespace-pre-wrap pr-12">
                                            {esUbicacion && urlMapa ? (
                                                <div className="flex flex-col gap-2 min-w-[200px] py-1">
                                                    <div className="flex items-center gap-2 text-[#00a884] font-bold text-[11px] uppercase tracking-tighter">
                                                        <MapPinIcon className="w-4 h-4"/> Ubicación
                                                    </div>
                                                    <a href={urlMapa} target="_blank" rel="noopener noreferrer" className="bg-black/20 p-2 rounded-xl text-[#53bdeb] flex items-center justify-center gap-2 transition-all font-bold text-xs">
                                                        <GlobeAltIcon className="w-4 h-4"/> VER MAPA
                                                    </a>
                                                </div>
                                            ) : esImagen ? (
                                                <img src={contentUrl} alt="WhatsApp Media" className="max-h-60 rounded-md object-cover cursor-pointer mb-1" onClick={() => window.open(contentUrl, '_blank')}/>
                                            ) : esVideo ? (
                                                <div className="flex flex-col gap-1 mb-2">
                                                    <div className="flex items-center gap-1.5 text-white/50 text-[10px] uppercase font-bold">
                                                        <VideoCameraIcon className="w-3 h-3"/> Video
                                                    </div>
                                                    <video controls className="max-h-60 rounded-md object-cover w-full bg-black/20">
                                                        <source src={contentUrl} type="video/mp4" />
                                                    </video>
                                                </div>
                                            ) : esAudio ? (
                                                <div className="flex flex-col gap-1 min-w-[200px]">
                                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold"><MusicalNoteIcon className="w-3 h-3"/> Mensaje de Voz</div>
                                                    <audio controls className="w-full h-8 outline-none">
                                                        <source src={contentUrl} />
                                                    </audio>
                                                </div>
                                            ) : esDocumento ? (
                                                <a href={contentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-black/20 p-2.5 rounded-lg hover:bg-black/30 transition">
                                                    <div className="bg-rose-500/20 p-2 rounded-lg"><DocumentIcon className="w-6 h-6 text-rose-400"/></div>
                                                    <span className="text-sm truncate font-medium max-w-[150px]">{docName}</span>
                                                </a>
                                            ) : (
                                                <span>{msg.mensaje}</span>
                                            )}
                                        </div>
                                        
                                        {/* Footer: Hora y Palomitas */}
                                        <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                            <span className="text-[10px] text-white/60 leading-none">
                                                {msg.fecha ? new Date(msg.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                            </span>
                                            {isOut && (
                                                <div className="flex items-center mt-0.5">
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
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input de Mensaje */}
                <form onSubmit={(e) => { e.preventDefault(); handleEnviarMensaje(); }} className="bg-[#202c33] p-3 flex items-end gap-2 shrink-0 border-t border-slate-800/50 pb-safe">
                    <div className="flex-1 bg-[#2a3942] rounded-xl flex items-center px-4 py-2 min-h-[44px]">
                        <input 
                            type="text"
                            className="w-full bg-transparent text-[15px] text-[#e9edef] placeholder-[#8696a0] outline-none"
                            placeholder="Escribe un mensaje"
                            value={mensaje}
                            onChange={(e) => setMensaje(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={!mensaje.trim() || sending}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            mensaje.trim() && !sending ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#2a3942] text-[#8696a0]'
                        }`}
                    >
                        {sending ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5 -ml-0.5"/>}
                    </button>
                </form>

            </div>
        </div>
    );
}
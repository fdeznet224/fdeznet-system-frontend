import { useState, useEffect, useRef } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import { 
    ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon,
    ArrowPathIcon, MapIcon, ClockIcon, CheckBadgeIcon, MapPinIcon,
    PhotoIcon, GlobeAltIcon
} from '@heroicons/react/24/outline';

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

    // Cargar historial de chat
    const loadChat = async () => {
        if (!cliente?.id) return;
        try {
            const res = await client.get(`/whatsapp/chat/${cliente.id}`);
            setChatMessages(res.data);
            if (onMessagesRead) onMessagesRead();
        } catch (error) {
            console.error("Error cargando chat", error);
        }
    };

    // Polling de mensajes cada 3 segundos
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isOpen && cliente?.id) {
            loadChat();
            interval = setInterval(loadChat, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOpen, cliente?.id]);

    // Auto-scroll al final del chat
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages, isOpen]);

    const handleEnviarMensaje = async () => {
        if (!mensaje.trim() || !cliente?.id) return;
        setSending(true);
        try {
            await client.post(`/whatsapp/chat/${cliente.id}/enviar`, { mensaje });
            setMensaje("");
            await loadChat();
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
            <div className="bg-[#0b0c10] w-full h-[85vh] sm:h-[600px] sm:max-w-md flex flex-col rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl border-t sm:border border-slate-800 animate-in slide-in-from-bottom-10 duration-300 overflow-hidden">
                
                {/* Cabecera */}
                <div className="bg-[#1a1f2e] px-5 py-4 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                            <ChatBubbleLeftRightIcon className="w-5 h-5 text-emerald-500"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-white truncate max-w-[200px]">{cliente?.nombre}</h3>
                            <p className="text-[10px] text-emerald-500 font-bold uppercase">{cliente?.telefono}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-full text-slate-400 transition">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                </div>

                {/* Fila de Plantillas */}
                <div className="bg-[#1a1f2e] border-b border-slate-800 p-2 overflow-x-auto flex gap-2 no-scrollbar">
                    <button onClick={() => aplicarPlantilla("Hola {nombre}, soy el técnico de FdezNet. Estoy en camino a tu domicilio.")} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b0c10] border border-slate-700 hover:border-emerald-500 rounded-lg text-[10px] font-bold text-slate-300 uppercase shrink-0 transition-all">
                        <MapIcon className="w-3.5 h-3.5 text-emerald-500"/> Voy en camino
                    </button>
                    {/* ... (Otras plantillas igual) */}
                    <button onClick={() => aplicarPlantilla("Hola {nombre}, por favor envíame tu ubicación exacta por este medio.")} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b0c10] border border-slate-700 hover:border-rose-500 rounded-lg text-[10px] font-bold text-slate-300 uppercase shrink-0 transition-all">
                        <MapPinIcon className="w-3.5 h-3.5 text-rose-500"/> Pedir Ubicación
                    </button>
                </div>

                {/* Área de Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2 text-slate-600"/>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Historial vacío</p>
                        </div>
                    ) : (
                        chatMessages.map((msg, index) => {
                            // 👇 DETECCIONES ACTUALIZADAS 👇
                            const esUbicacion = msg.mensaje.includes('http://googleusercontent.com/maps.google.com/') || msg.mensaje.includes('📍 Ubicación');
                            const esImagen = msg.mensaje.startsWith('[IMAGE]');
                            
                            // Extraer URL limpia de la imagen o mapa
                            const contentUrl = msg.mensaje.replace('[IMAGE]', '').trim();
                            const urlMapa = esUbicacion ? msg.mensaje.match(/https?:\/\/[^\s]+/)?.[0] : null;

                            return (
                                <div key={index} className={`flex ${msg.direccion === 'salida' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-lg ${
                                        msg.direccion === 'salida' 
                                            ? 'bg-emerald-600 text-white rounded-tr-sm' 
                                            : 'bg-[#1a1f2e] text-slate-200 border border-slate-800 rounded-tl-sm'
                                    }`}>
                                        
                                        {/* RENDER UBICACIÓN */}
                                        {esUbicacion && urlMapa ? (
                                            <div className="flex flex-col gap-2 min-w-[210px] py-1">
                                                <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-tighter">
                                                    <MapPinIcon className="w-4 h-4 animate-bounce"/> Ubicación Recibida
                                                </div>
                                                <a 
                                                    href={urlMapa} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="bg-[#0b0c10] hover:bg-black border border-slate-700 p-3 rounded-xl text-blue-400 flex items-center justify-center gap-2 transition-all font-bold text-xs"
                                                >
                                                    <GlobeAltIcon className="w-4 h-4"/>
                                                    VER EN GOOGLE MAPS
                                                </a>
                                            </div>
                                        ) 
                                        /* RENDER IMAGEN POR URL (FÍSICA) */
                                        : esImagen ? (
                                            <div className="flex flex-col gap-1.5">
                                                <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-black/20">
                                                    <img 
                                                        src={contentUrl} 
                                                        alt="WhatsApp Multimedia" 
                                                        className="max-h-64 w-full object-cover cursor-pointer transition-transform hover:scale-105"
                                                        onClick={() => window.open(contentUrl, '_blank')}
                                                        // Fallback por si la URL del localhost falla
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x300/1a1f2e/475569?text=Error+al+cargar+imagen';
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5 px-1 py-0.5">
                                                    <PhotoIcon className="w-3.5 h-3.5 text-slate-500"/>
                                                    <span className="text-[10px] font-bold text-slate-500 italic uppercase">Imagen Recibida</span>
                                                </div>
                                            </div>
                                        ) 
                                        /* RENDER TEXTO NORMAL */
                                        : (
                                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.mensaje}</p>
                                        )}
                                        
                                        {/* Footer de Burbuja */}
                                        <div className="flex items-center justify-end gap-1.5 mt-2 opacity-70">
                                            <span className="text-[9px] font-black uppercase">
                                                {new Date(msg.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            {msg.direccion === 'salida' && (
                                                <div className="flex items-center">
                                                    {msg.ack === 3 ? (
                                                        <CheckBadgeIcon className="w-3.5 h-3.5 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]"/>
                                                    ) : (
                                                        <CheckBadgeIcon className={`w-3.5 h-3.5 ${msg.ack >= 1 ? 'text-slate-400' : 'text-slate-600 animate-pulse'}`}/>
                                                    )}
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
                <div className="bg-[#1a1f2e] p-3 border-t border-slate-800 pb-safe">
                    <div className="flex items-center gap-2 bg-[#0b0c10] border border-slate-700 rounded-full p-1 pl-4 focus-within:border-emerald-500 transition-all shadow-inner">
                        <input 
                            type="text"
                            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-600"
                            placeholder="Responder a cliente..."
                            value={mensaje}
                            onChange={(e) => setMensaje(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEnviarMensaje()}
                        />
                        <button 
                            onClick={handleEnviarMensaje}
                            disabled={!mensaje.trim() || sending}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                mensaje.trim() && !sending 
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-90' 
                                    : 'bg-slate-800 text-slate-600'
                            }`}
                        >
                            {sending ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5 -ml-0.5"/>}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
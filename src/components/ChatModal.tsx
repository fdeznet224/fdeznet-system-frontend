import { useState, useEffect, useRef } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import { 
    ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon,
    ArrowPathIcon, MapIcon, MapPinIcon, GlobeAltIcon,
    DocumentIcon, MusicalNoteIcon, VideoCameraIcon
} from '@heroicons/react/24/outline';
import { useWhatsApp } from '../context/WhatsAppContext';

// --- SVGs DE WHATSAPP ADAPTATIVOS ---
const IconClock = () => <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" className="opacity-60"><path d="M8 0a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm0 14.5a6.5 6.5 0 1 1 6.5-6.5 6.5 6.5 0 0 1-6.5 6.5zM8.5 4h-1v4.2l3 1.8.5-.8-2.5-1.5z"/></svg>;
const IconSingleTick = () => <svg viewBox="0 0 16 15" width="15" height="14" fill="currentColor" className="opacity-60"><path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.72a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .011.524l3.12 2.993a.364.364 0 0 0 .534-.035l6.362-7.82a.363.363 0 0 0-.07-.504z"/></svg>;
const IconDoubleTick = ({ isRead }: { isRead: boolean }) => (
    <svg viewBox="0 0 16 15" width="15" height="14" fill="currentColor" className={isRead ? "text-blue-500" : "opacity-60"}>
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

    const { wsEvent, clearUnread } = useWhatsApp();

    const loadChat = async () => {
        if (!cliente?.id) return;
        try {
            clearUnread(cliente.id);
            const res = await client.get(`/whatsapp/chat/${cliente.id}`);
            setChatMessages(res.data);
            if (onMessagesRead) onMessagesRead();
        } catch (error) { console.error("Error cargando chat", error); }
    };

    useEffect(() => {
        if (isOpen && cliente?.id) loadChat();
    }, [isOpen, cliente?.id]);

    useEffect(() => {
        if (!isOpen || !cliente?.id || !wsEvent) return;
        if (wsEvent.type === 'NEW_MESSAGE' && wsEvent.data.cliente_id === cliente.id) {
            setChatMessages(prev => [...prev, wsEvent.data]);
            client.get(`/whatsapp/chat/${cliente.id}`).catch(()=>{});
            clearUnread(cliente.id);
            if (onMessagesRead) onMessagesRead();
        }
    }, [wsEvent]);

    const handleEnviarMensaje = async () => {
        if (!mensaje.trim() || !cliente?.id) return;
        setSending(true);
        try {
            await client.post(`/whatsapp/chat/${cliente.id}/enviar`, { mensaje: mensaje });
            setMensaje("");
            await loadChat();
        } catch (error) { toast.error("Error al enviar"); }
        finally { setSending(false); }
    };

    const aplicarPlantilla = (texto: string) => setMensaje(texto.replace("{nombre}", cliente?.nombre || "Cliente"));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm sm:p-4 transition-colors">
            {/* ✅ ADAPTADO: Fondo dinámico del modal */}
            <div className="w-full h-[85vh] sm:h-[650px] sm:max-w-md bg-white dark:bg-[#0b141a] flex flex-col rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 transition-colors">
                
                {/* Cabecera */}
                <div className="bg-slate-50 dark:bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-slate-700 dark:text-white font-black">
                            {cliente?.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-slate-900 dark:text-[#e9edef] truncate max-w-[200px]">{cliente?.nombre}</h3>
                            <p className="text-[10px] text-slate-500 dark:text-[#8696a0] font-mono font-bold">{cliente?.telefono}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-[#2a3942] rounded-full text-slate-500 dark:text-[#aebac1] transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>

                {/* Área de Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1.5 bg-slate-50 dark:bg-[#0b141a] transition-colors">
                    {chatMessages.map((msg, index) => {
                        const isOut = msg.direccion === 'salida';
                        const showTail = !chatMessages[index - 1] || chatMessages[index - 1].direccion !== msg.direccion;
                        
                        return (
                            <div key={msg.id || index} className={`flex ${isOut ? 'justify-end' : 'justify-start'} ${showTail ? 'mt-3' : 'mt-0.5'}`}>
                                <div className={`relative max-w-[85%] px-3 pt-2 pb-2.5 text-sm shadow-sm flex flex-col transition-colors ${
                                    isOut ? 'bg-emerald-600 dark:bg-[#005c4b] text-white rounded-lg' : 'bg-slate-200 dark:bg-[#202c33] text-slate-900 dark:text-[#e9edef] rounded-lg'
                                } ${showTail && isOut ? 'rounded-tr-none' : ''} ${showTail && !isOut ? 'rounded-tl-none' : ''}`}>
                                    
                                    <span className="break-words whitespace-pre-wrap pr-12">{msg.mensaje}</span>
                                    
                                    <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                        <span className="text-[9px] opacity-70 leading-none">
                                            {msg.fecha ? new Date(msg.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                        </span>
                                        {isOut && <div className="flex items-center"><IconDoubleTick isRead={msg.ack === 3} /></div>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={(e) => { e.preventDefault(); handleEnviarMensaje(); }} className="bg-white dark:bg-[#202c33] p-3 flex items-end gap-2 shrink-0 border-t border-slate-200 dark:border-slate-800 transition-colors">
                    <div className="flex-1 bg-slate-100 dark:bg-[#2a3942] rounded-xl flex items-center px-4 py-2 min-h-[44px]">
                        <input type="text" className="w-full bg-transparent text-[15px] text-slate-900 dark:text-[#e9edef] placeholder-slate-400 dark:placeholder-[#8696a0] outline-none" placeholder="Escribe un mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
                    </div>
                    <button type="submit" disabled={!mensaje.trim() || sending} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${mensaje.trim() && !sending ? 'bg-emerald-600 dark:bg-[#00a884] text-white' : 'bg-slate-200 dark:bg-[#2a3942] text-slate-500'}`}>
                        {sending ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5"/>}
                    </button>
                </form>
            </div>
        </div>
    );
}
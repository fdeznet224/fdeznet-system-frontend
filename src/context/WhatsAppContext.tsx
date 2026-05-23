import React, { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/axios';

// 1. Definimos la forma de los datos
interface WhatsAppContextType {
    wsEvent: any; 
    unreadCounts: Record<string, { count: number; antiguedad: string }>;
    fetchUnread: () => Promise<void>;
    clearUnread: (clienteId: number) => void;
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

export const WhatsAppProvider = ({ children }: { children: React.ReactNode }) => {
    const [wsEvent, setWsEvent] = useState<any>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, { count: number; antiguedad: string }>>({});

    const fetchUnread = async () => {
        try {
            const res = await client.get('/whatsapp/no-leidos');
            setUnreadCounts(res.data);
        } catch (e) {
            console.error("Error al obtener mensajes no leídos", e);
        }
    };

    const clearUnread = (clienteId: number) => {
        setUnreadCounts(prev => {
            const updated = { ...prev };
            if (updated[clienteId]) {
                updated[clienteId] = { count: 0, antiguedad: updated[clienteId].antiguedad };
            }
            return updated;
        });
    };

    // 🔥 EL MOTOR PRINCIPAL: LA TUBERÍA MAESTRA (PRODUCCIÓN) 🔥
    useEffect(() => {
        fetchUnread();

        let socket: WebSocket;
        let pingInterval: ReturnType<typeof setInterval>;
        let reconnectTimer: ReturnType<typeof setTimeout>;

        const connectWebSocket = () => {
            // ✅ SOLUCIÓN APLICADA: Dejamos que Nginx maneje los puertos
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const host = window.location.host; // Automáticamente usa fdezpay.com en prod, o localhost:5173 en dev
            
            // Construcción dinámica de la URL (Sin el :8000 forzado)
            const wsUrl = `${protocol}://${host}/whatsapp/ws/global_admin`;
            
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log("🟢 TUBERÍA MAESTRA CONECTADA A:", wsUrl);
                // Latido para mantener viva la conexión
                pingInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send("ping");
                    }
                }, 20000);
            };

            socket.onmessage = (event) => {
                const payload = JSON.parse(event.data);
                
                // 1. Guardamos el evento
                setWsEvent(payload); 

                // 2. Sumamos al contador si es un mensaje nuevo
                if (payload.type === 'NEW_MESSAGE' && payload.data.direccion === 'entrada') {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [payload.data.cliente_id]: {
                            count: (prev[payload.data.cliente_id]?.count || 0) + 1,
                            antiguedad: payload.data.fecha
                        }
                    }));
                }
            };

            socket.onclose = () => {
                console.log("🔴 Tubería Maestra Cerrada. Reconectando en 3 segundos...");
                clearInterval(pingInterval);
                reconnectTimer = setTimeout(connectWebSocket, 3000);
            };

            socket.onerror = (err) => {
                console.error("⚠️ Error en la Tubería Maestra", err);
                socket.close();
            };
        };

        connectWebSocket();

        return () => {
            clearInterval(pingInterval);
            clearTimeout(reconnectTimer);
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        };
    }, []);

    return (
        <WhatsAppContext.Provider value={{ wsEvent, unreadCounts, fetchUnread, clearUnread }}>
            {children}
        </WhatsAppContext.Provider>
    );
};

export const useWhatsApp = () => {
    const context = useContext(WhatsAppContext);
    if (!context) {
        throw new Error("useWhatsApp debe usarse dentro de un WhatsAppProvider");
    }
    return context;
};
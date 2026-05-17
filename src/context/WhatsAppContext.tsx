import React, { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/axios'; // Ajusta la ruta a tu archivo de Axios si es necesario

// 1. Definimos la forma de los datos que viajarán por la tubería
interface WhatsAppContextType {
    wsEvent: any; // El último evento que escupió el WebSocket (Mensaje nuevo, Palomitas, etc.)
    unreadCounts: Record<string, { count: number; antiguedad: string }>; // El contador de globitos rojos
    fetchUnread: () => Promise<void>; // Función para recargar los no leídos manualmente si hace falta
    clearUnread: (clienteId: number) => void; // Función para borrar el globito rojo cuando abrimos un chat
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

export const WhatsAppProvider = ({ children }: { children: React.ReactNode }) => {
    const [wsEvent, setWsEvent] = useState<any>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, { count: number; antiguedad: string }>>({});

    // Función para ir a la base de datos y saber cuántos mensajes pendientes hay al abrir el sistema
    const fetchUnread = async () => {
        try {
            const res = await client.get('/whatsapp/no-leidos');
            setUnreadCounts(res.data);
        } catch (e) {
            console.error("Error al obtener mensajes no leídos", e);
        }
    };

    // Función que limpia el globito rojo de un cliente específico (Se usa cuando abres su chat)
    const clearUnread = (clienteId: number) => {
        setUnreadCounts(prev => {
            const updated = { ...prev };
            if (updated[clienteId]) {
                updated[clienteId] = { count: 0, antiguedad: updated[clienteId].antiguedad };
            }
            return updated;
        });
    };

    // 🔥 EL MOTOR PRINCIPAL: LA TUBERÍA MAESTRA 🔥
    useEffect(() => {
        fetchUnread(); // Descargamos los pendientes al abrir la página

        let socket: WebSocket;
        let pingInterval: ReturnType<typeof setInterval>;
        let reconnectTimer: ReturnType<typeof setTimeout>;

        const connectWebSocket = () => {
            // Nos conectamos a FastAPI con un identificador global
            socket = new WebSocket('ws://127.0.0.1:8000/whatsapp/ws/global_admin');

            socket.onopen = () => {
                console.log("🟢 TUBERÍA MAESTRA CONECTADA");
                // Latido para que FastAPI no nos cierre la conexión por inactividad
                pingInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send("ping");
                    }
                }, 20000);
            };

            socket.onmessage = (event) => {
                const payload = JSON.parse(event.data);
                
                // 1. Guardamos el evento para que las demás pantallas (Layout, MensajesCRM) lo lean
                setWsEvent(payload); 

                // 2. Si es un mensaje entrante, le sumamos +1 al contador general automáticamente
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
                socket.close(); // Forzamos el cierre para que se active la reconexión automática
            };
        };

        connectWebSocket();

        // Limpieza total si cerramos la pestaña
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

// Hook personalizado para usar la tubería fácilmente en cualquier archivo
export const useWhatsApp = () => {
    const context = useContext(WhatsAppContext);
    if (!context) {
        throw new Error("useWhatsApp debe usarse dentro de un WhatsAppProvider");
    }
    return context;
};
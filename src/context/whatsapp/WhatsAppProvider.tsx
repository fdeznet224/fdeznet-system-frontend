import React, { useCallback, useEffect, useState } from 'react';
import client from '@/api/axios';
import {
    WhatsAppContext,
    type WhatsAppEvent,
} from './context';
import { SESSION_CHANGED_EVENT } from '@/offline/db';

interface RealtimeUser {
    id: number;
    rol: string;
}

function getRealtimeSession() {
    try {
        const token = localStorage.getItem('token');
        const rawUser = localStorage.getItem('user');
        const user = rawUser ? JSON.parse(rawUser) as RealtimeUser : null;
        return { token, user };
    } catch {
        return { token: null, user: null };
    }
}

export const WhatsAppProvider = ({ children }: { children: React.ReactNode }) => {
    const [wsEvent, setWsEvent] = useState<WhatsAppEvent | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, { count: number; antiguedad: string }>>({});
    const [sessionVersion, setSessionVersion] = useState(0);

    const fetchUnread = useCallback(async () => {
        const { token, user } = getRealtimeSession();
        if (
            !token
            || !user
            || !['admin', 'supervisor'].includes(user.rol)
        ) {
            setUnreadCounts({});
            return;
        }
        try {
            const res = await client.get<Record<string, { count: number; antiguedad: string }>>('/whatsapp/no-leidos');
            setUnreadCounts(res.data);
        } catch (e) {
            console.error("Error al obtener mensajes no leídos", e);
        }
    }, []);

    const clearUnread = useCallback((clienteId: number) => {
        setUnreadCounts(prev => {
            const updated = { ...prev };
            if (updated[clienteId]) {
                updated[clienteId] = { count: 0, antiguedad: updated[clienteId].antiguedad };
            }
            return updated;
        });
    }, []);

    useEffect(() => {
        const handleSessionChange = () => {
            setSessionVersion(current => current + 1);
        };
        window.addEventListener(SESSION_CHANGED_EVENT, handleSessionChange);
        return () => {
            window.removeEventListener(
                SESSION_CHANGED_EVENT,
                handleSessionChange,
            );
        };
    }, []);

    // 🔥 EL MOTOR PRINCIPAL: LA TUBERÍA MAESTRA (PRODUCCIÓN) 🔥
    useEffect(() => {
        const { token, user } = getRealtimeSession();
        if (
            !token
            || !user
            || !['admin', 'supervisor'].includes(user.rol)
        ) {
            return;
        }

        const initialLoad = window.setTimeout(() => void fetchUnread(), 0);

        let socket: WebSocket;
        let pingInterval: ReturnType<typeof setInterval>;
        let reconnectTimer: ReturnType<typeof setTimeout>;
        let disposed = false;

        const connectWebSocket = () => {
            if (disposed) return;
            // ✅ SOLUCIÓN APLICADA: Dejamos que Nginx maneje los puertos
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const base = import.meta.env.PROD
                ? `${protocol}://${window.location.host}/api`
                : 'ws://127.0.0.1:8000';
            
            const wsUrl = (
                `${base}/whatsapp/ws/${user.id}`
                + `?token=${encodeURIComponent(token)}`
            );
            
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
                const payload = JSON.parse(event.data) as WhatsAppEvent;
                
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
                clearInterval(pingInterval);
                if (!disposed) {
                    console.log("🔴 Tubería Maestra Cerrada. Reconectando en 3 segundos...");
                    reconnectTimer = setTimeout(connectWebSocket, 3000);
                }
            };

            socket.onerror = (err) => {
                console.error("⚠️ Error en la Tubería Maestra", err);
                socket.close();
            };
        };

        connectWebSocket();

        return () => {
            disposed = true;
            window.clearTimeout(initialLoad);
            clearInterval(pingInterval);
            clearTimeout(reconnectTimer);
            if (
                socket
                && (
                    socket.readyState === WebSocket.OPEN
                    || socket.readyState === WebSocket.CONNECTING
                )
            ) {
                socket.close();
            }
        };
    }, [fetchUnread, sessionVersion]);

    return (
        <WhatsAppContext.Provider value={{ wsEvent, unreadCounts, fetchUnread, clearUnread }}>
            {children}
        </WhatsAppContext.Provider>
    );
};

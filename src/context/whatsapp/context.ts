import { createContext, useContext } from 'react';

export interface WhatsAppEvent {
    type: string;
    data: {
        id?: number;
        wa_id?: string;
        ack?: number;
        cliente_id?: number;
        direccion?: string;
        mensaje?: string;
        fecha?: string;
        [key: string]: unknown;
    };
}

export interface WhatsAppContextType {
    wsEvent: WhatsAppEvent | null;
    unreadCounts: Record<string, { count: number; antiguedad: string }>;
    fetchUnread: () => Promise<void>;
    clearUnread: (clienteId: number) => void;
}

export const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

export const useWhatsApp = () => {
    const context = useContext(WhatsAppContext);
    if (!context) {
        throw new Error('useWhatsApp debe usarse dentro de un WhatsAppProvider');
    }
    return context;
};

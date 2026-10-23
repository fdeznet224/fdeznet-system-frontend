import { useEffect, useState } from 'react';

/**
 * "Instalar app" del portal. Chrome avisa una sola vez (beforeinstallprompt),
 * a veces antes de que cargue el portal: por eso se escucha desde main.tsx.
 * En iPhone no hay aviso; se explica cómo agregarlo a la pantalla de inicio.
 */
interface AvisoInstalacion extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let aviso: AvisoInstalacion | null = null;
const oyentes = new Set<() => void>();

export function escucharInstalacion(): void {
    window.addEventListener('beforeinstallprompt', (evento) => {
        evento.preventDefault();
        aviso = evento as AvisoInstalacion;
        oyentes.forEach((avisar) => avisar());
    });
    window.addEventListener('appinstalled', () => {
        aviso = null;
        oyentes.forEach((avisar) => avisar());
    });
}

const instalada = () => window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const esIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function useInstalacion() {
    const [, refrescar] = useState(0);
    useEffect(() => {
        const avisar = () => refrescar((n) => n + 1);
        oyentes.add(avisar);
        return () => { oyentes.delete(avisar); };
    }, []);
    return {
        disponible: !instalada() && (aviso !== null || esIphone()),
        iphone: !instalada() && aviso === null && esIphone(),
        instalar: async () => {
            if (!aviso) return false;
            await aviso.prompt();
            const { outcome } = await aviso.userChoice;
            if (outcome === 'accepted') aviso = null;
            return outcome === 'accepted';
        },
    };
}

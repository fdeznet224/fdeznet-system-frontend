import { useEffect, useState } from 'react';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import client from '../../api/axios';

interface Configuracion {
    estado: 'pendiente' | 'aplicado' | 'vencido' | 'error' | 'manual' | 'guardado';
    red: string;
    clave: string;
    detalle: string | null;
    cambio_onu: boolean;
    aviso: boolean;
    creado_en: string;
    aplicado_en: string | null;
}

const RECIENTE_MS = 3 * 60 * 60 * 1000;

/** Si la ONU de reemplazo ya quedó con su WiFi y su PPPoE: se revisa cada 10 s mientras espera. */
export default function EstadoOnuNueva({ ordenId, version }: { ordenId: number; version: number }) {
    const [config, setConfig] = useState<Configuracion | null>(null);

    useEffect(() => {
        let vigente = true;
        let temporizador: number | undefined;
        const leer = async () => {
            try {
                const { data } = await client.get<Configuracion | null>(`/ordenes/${ordenId}/configuracion-onu`);
                if (!vigente) return;
                // Solo la de un cambio reciente (de esta visita).
                setConfig(data && Date.now() - new Date(data.creado_en).getTime() <= RECIENTE_MS ? data : null);
                if (data?.estado === 'pendiente') temporizador = window.setTimeout(() => void leer(), 10000);
            } catch {
                if (vigente) temporizador = window.setTimeout(() => void leer(), 20000);
            }
        };
        void leer();
        return () => { vigente = false; window.clearTimeout(temporizador); };
    }, [ordenId, version]);

    if (!config || !config.cambio_onu || config.estado === 'guardado') return null;

    const listo = config.estado === 'aplicado';
    const espera = config.estado === 'pendiente';
    const color = listo
        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
        : espera
            ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
    const titulo = listo
        ? 'ONU nueva lista: ya tiene su WiFi y su PPPoE'
        : espera
            ? 'Configurando la ONU nueva…'
            : config.estado === 'manual'
                ? 'Esta ZTE no está en el ACS: pon el WiFi y el PPPoE a mano'
                : 'No se pudo configurar la ONU nueva: revísala';
    const Icono = listo ? CheckCircleIcon : espera ? ArrowPathIcon : ExclamationTriangleIcon;

    return (
        <div className={`flex gap-3 rounded-xl p-3 ${color}`} data-testid="estado-onu-nueva">
            <Icono className={`h-5 w-5 shrink-0 ${espera ? 'animate-spin' : ''}`} />
            <div className="min-w-0 space-y-0.5 text-sm">
                <p className="font-bold">{titulo}</p>
                <p>WiFi <b>{config.red}</b> · contraseña <b className="select-all">{config.clave}</b></p>
                {config.detalle && !listo && <p className="text-xs opacity-80">{config.detalle}</p>}
                {config.aviso && (
                    <p className="text-xs opacity-80">
                        {listo ? 'Se le mandó al cliente por WhatsApp.' : 'Se le manda al cliente por WhatsApp en cuanto quede.'}
                    </p>
                )}
            </div>
        </div>
    );
}

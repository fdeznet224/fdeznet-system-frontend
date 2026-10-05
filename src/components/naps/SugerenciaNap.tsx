import { useEffect, useState } from 'react';
import { CheckCircleIcon, MapPinIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';

export interface NapSugerida {
    id: number;
    nombre: string;
    ubicacion?: string | null;
    zona_nombre?: string | null;
    puertos_libres: number;
    capacidad?: number | null;
    distancia_m: number;
    posicion_estimada: boolean;
}

interface Props {
    latitud?: number | string | null;
    longitud?: number | string | null;
    zonaId?: number | string | null;
    oltId?: number | string | null;
    /** Solo sugerir cajas que el formulario permite elegir. */
    permitidas?: number[];
    elegidaId?: number | string | null;
    onElegir: (napId: number) => void;
}

// Una acometida de más de esto ya es sospechosa: se avisa, pero se deja elegir.
const DISTANCIA_LEJANA_M = 300;

function formatoDistancia(metros: number) {
    return metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${metros} m`;
}

/**
 * Sugiere las cajas NAP más cercanas al domicilio por GPS. Solo propone:
 * quien llena el formulario confirma con un toque o elige otra en la lista.
 */
export default function SugerenciaNap({ latitud, longitud, zonaId, oltId, permitidas, elegidaId, onElegir }: Props) {
    // Se guarda con la consulta que la produjo para saber si sigue vigente.
    const [respuesta, setRespuesta] = useState<{ clave: string; datos: NapSugerida[] | null } | null>(null);

    const lat = Number(latitud);
    const lng = Number(longitud);
    const hayGps = latitud !== '' && latitud != null && longitud !== '' && longitud != null
        && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    const clave = `${lat},${lng},${zonaId ?? ''},${oltId ?? ''}`;

    useEffect(() => {
        // Sin GPS se muestra el aviso de abajo; no hay nada que consultar.
        if (!hayGps) return;
        let vigente = true;
        const params = new URLSearchParams({ latitud: String(lat), longitud: String(lng), limite: '5' });
        if (zonaId) params.set('zona_id', String(zonaId));
        if (oltId) params.set('olt_id', String(oltId));
        client.get<NapSugerida[]>(`/infraestructura/naps/cercanas?${params.toString()}`)
            .then(({ data }) => { if (vigente) setRespuesta({ clave, datos: data }); })
            // Sin internet o sin permiso no estorbamos: queda la lista normal.
            .catch(() => { if (vigente) setRespuesta({ clave, datos: null }); });
        return () => { vigente = false; };
    }, [hayGps, lat, lng, zonaId, oltId, clave]);

    if (!hayGps) {
        return (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <MapPinIcon className="h-4 w-4" /> Captura la ubicación GPS para sugerir la caja NAP más cercana
            </p>
        );
    }
    const sugeridas = respuesta?.datos ?? null;
    if (respuesta?.clave !== clave && !sugeridas) {
        return <p className="text-[11px] font-semibold text-slate-400">Buscando cajas NAP cercanas...</p>;
    }
    if (!sugeridas) return null;

    const lista = (permitidas ? sugeridas.filter((n) => permitidas.includes(n.id)) : sugeridas).slice(0, 3);
    if (lista.length === 0) {
        return <p className="text-[11px] font-semibold text-slate-400">No hay cajas NAP con ubicación en esta zona para sugerir</p>;
    }

    return (
        <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Cajas NAP más cercanas</p>
            {lista.map((nap, i) => {
                const elegida = String(nap.id) === String(elegidaId ?? '');
                const llena = nap.puertos_libres <= 0;
                const lejos = nap.distancia_m > DISTANCIA_LEJANA_M;
                return (
                    <button
                        key={nap.id}
                        type="button"
                        disabled={llena}
                        onClick={() => onElegir(nap.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            elegida
                                ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10'
                                : 'border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500/40'
                        }`}
                    >
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-black text-slate-800 dark:text-slate-100">
                                {i === 0 && !llena && !elegida && <span className="mr-1 text-emerald-600 dark:text-emerald-400">Sugerida ·</span>}
                                {nap.nombre}
                            </span>
                            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                                <span className={lejos ? 'font-bold text-amber-600 dark:text-amber-400' : ''}>
                                    {nap.posicion_estimada ? '≈ ' : ''}{formatoDistancia(nap.distancia_m)}
                                </span>
                                {' · '}{llena ? 'sin puertos libres' : `${nap.puertos_libres} libre${nap.puertos_libres === 1 ? '' : 's'}`}
                                {nap.posicion_estimada ? ' · ubicación estimada por sus clientes' : nap.ubicacion ? ` · ${nap.ubicacion}` : ''}
                            </span>
                        </span>
                        {elegida
                            ? <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            : !llena && <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Usar</span>}
                    </button>
                );
            })}
        </div>
    );
}

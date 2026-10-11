import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MapPinIcon, SignalIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

import client from '../../api/axios';
import { apiErrorMessage } from '@/utils/apiError';
import { rutaEnMaps } from '@/utils/mapas';
import { COLOR_TONO, tonoPotencia } from './revision';
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, TARJETA } from './estilo';

interface ClienteRuta {
    cliente_id: number;
    nombre: string;
    contrato: string | null;
    direccion: string | null;
    rx: number;
    nivel: 'alta' | 'limite';
    fecha_lectura: string | null;
    nap: string | null;
    puerto_nap: number | null;
    latitud: number | null;
    longitud: number | null;
    distancia_m?: number | null;
    reporte: { id: number; estado: string; tecnico: string | null } | null;
}

const distanciaTexto = (m?: number | null) => (m == null ? 'Sin GPS' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

/**
 * Ruta de reparación: clientes con la potencia alta, del más cercano al
 * técnico. Si le sobra tiempo en la colonia, se lleva la revisión a su agenda.
 */
export default function RutaReparacion({ online, onAgendada }: { online: boolean; onAgendada: () => void }) {
    const navigate = useNavigate();
    const [ruta, setRuta] = useState<ClienteRuta[] | null>(null);
    const [cargando, setCargando] = useState(false);
    const [agendando, setAgendando] = useState<number | null>(null);

    const cargar = () => {
        const pedir = async (lat?: number, lng?: number) => {
            try {
                const consulta = lat != null && lng != null ? `?latitud=${lat}&longitud=${lng}` : '';
                const { data } = await client.get<ClienteRuta[]>(`/soporte/ruta-reparacion${consulta}`);
                setRuta(data);
                if (lat == null) toast('Sin tu ubicación: ordenados por la potencia más alta');
            } catch (error) {
                toast.error(apiErrorMessage(error, 'No se pudo armar la ruta'));
            } finally {
                setCargando(false);
            }
        };
        setCargando(true);
        if (!navigator.geolocation) {
            void pedir();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => void pedir(pos.coords.latitude, pos.coords.longitude),
            () => void pedir(),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    // Se levanta un reporte de potencia a su nombre: aparece en su agenda con la revisión completa.
    const irARevisar = async (c: ClienteRuta) => {
        setAgendando(c.cliente_id);
        try {
            const { data } = await client.post<{ id: number }>('/soporte/incidencias', {
                cliente_id: c.cliente_id,
                categoria: 'potencia_baja',
                descripcion: `Potencia alta detectada por monitoreo (${c.rx.toFixed(2)} dBm). Revisión preventiva en ruta.`,
                canal_reporte: 'monitoreo',
            });
            toast.success('Quedó en tu agenda');
            setRuta((actual) => actual && actual.map((item) => (
                item.cliente_id === c.cliente_id ? { ...item, reporte: { id: data.id, estado: 'asignada', tecnico: 'Tú' } } : item
            )));
            onAgendada();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo agendar la revisión'));
        } finally {
            setAgendando(null);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 px-1">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Ruta</h2>
                    <p className="text-xs text-slate-500">Clientes con la potencia alta, del más cercano a ti.</p>
                </div>
                <button type="button" disabled={cargando || !online} onClick={cargar} className={`${BOTON_PRIMARIO} w-auto shrink-0 px-3 text-xs`}>
                    <MapPinIcon className="h-4 w-4" /> {cargando ? 'Buscando…' : ruta ? 'Actualizar' : 'Usar mi ubicación'}
                </button>
            </div>
            {!online && <p className="px-1 text-xs font-semibold text-amber-600">Conéctate a internet para armar la ruta.</p>}
            {ruta && ruta.length === 0 && (
                <div className={`${TARJETA} flex flex-col items-center gap-2 py-12 text-center`}>
                    <SignalIcon className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-500">Nadie tiene la potencia alta.</p>
                </div>
            )}
            {(ruta || []).map((c) => {
                const enlace = rutaEnMaps({ latitud: c.latitud, longitud: c.longitud, direccion: c.direccion || '' });
                return (
                    <article key={c.cliente_id} className={`${TARJETA} space-y-3 p-4`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{c.nombre}</h3>
                                <p className="text-[11px] text-slate-500">
                                    {c.contrato ? `Contrato ${c.contrato}` : 'Sin contrato'}
                                    {c.nap ? ` · ${c.nap}${c.puerto_nap ? ` P${c.puerto_nap}` : ''}` : ''}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{c.direccion || 'Sin dirección'}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <span className={`block font-mono text-lg font-black ${COLOR_TONO[tonoPotencia(c.rx)]}`}>{c.rx.toFixed(2)}</span>
                                <span className="block text-[10px] font-semibold text-slate-400">{c.nivel === 'alta' ? 'alta' : 'al límite'} · {distanciaTexto(c.distancia_m)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {enlace ? (
                                <a href={enlace} target="_blank" rel="noreferrer" className={BOTON_SECUNDARIO}>
                                    <MapPinIcon className="h-4 w-4 text-blue-600" /> Cómo llegar
                                </a>
                            ) : (
                                <span className="flex h-10 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700">Sin ubicación</span>
                            )}
                            <button type="button" disabled={!c.contrato} onClick={() => c.contrato && navigate(`/tech/cliente/${encodeURIComponent(c.contrato)}`)} className={BOTON_SECUNDARIO}>
                                Ver ficha
                            </button>
                        </div>
                        {c.reporte ? (
                            <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Reporte #{c.reporte.id} abierto{c.reporte.tecnico ? ` · ${c.reporte.tecnico}` : ' · sin técnico'}
                            </p>
                        ) : (
                            <button type="button" disabled={agendando !== null} onClick={() => void irARevisar(c)} className={BOTON_PRIMARIO}>
                                <WrenchScrewdriverIcon className="h-4 w-4" /> {agendando === c.cliente_id ? 'Agendando…' : 'Ir a revisar'}
                            </button>
                        )}
                    </article>
                );
            })}
        </div>
    );
}

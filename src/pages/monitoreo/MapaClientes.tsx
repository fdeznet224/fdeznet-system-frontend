import { useState, useEffect, useRef, useCallback } from 'react';
import { Circle, MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useBrand } from '@/context/brand/useBrand';
import {
    ArrowPathIcon,
    SignalIcon
} from '@heroicons/react/24/outline';

interface MapClient {
    id: number;
    nombre: string;
    latitud: string | number | null;
    longitud: string | number | null;
    servicio: {
        estado_servicio: string;
        ip_asignada?: string | null;
        nap_info?: string | null;
    };
}

interface TechnicalStatus {
    estado_tecnico: string;
}

interface StatusResponse {
    detalle_clientes?: Record<string, TechnicalStatus>;
}

/** Señal de cada cliente contra su normal de la semana y grupos que bajaron juntos. */
interface CambioSenal { actual: number; normal: number; cambio_db: number; nivel: 'estable' | 'bajo' | 'bajo_fuerte' }
interface GrupoAtenuado {
    tipo: 'pon' | 'nap' | 'zona';
    nombre: string;
    ubicacion: [number, number] | null;
    medidos: number;
    bajaron: number;
    cambio_mediano_db: number;
    peor_db: number;
    cliente_ids: number[];
}
interface Atenuacion { clientes: Record<string, CambioSenal>; grupos: GrupoAtenuado[]; umbral_db: number }

const COLOR_SENAL: Record<CambioSenal['nivel'] | 'sin_dato', string> = {
    estable: 'bg-emerald-500',
    bajo: 'bg-amber-500',
    bajo_fuerte: 'bg-rose-600',
    sin_dato: 'bg-slate-500',
};

const iconoSenal = (nivel: CambioSenal['nivel'] | 'sin_dato', resaltado: boolean) => L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
        <div class="relative flex h-6 w-6">
            ${resaltado ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>' : ''}
            <div class="relative inline-flex rounded-full h-6 w-6 border-2 border-white ${COLOR_SENAL[nivel]} shadow-lg"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
});

const TIPO_GRUPO: Record<GrupoAtenuado['tipo'], string> = { pon: 'Troncal', nap: 'Caja NAP', zona: 'Zona' };

// --- ICONOS DINÁMICOS ---
const crearIcono = (estadoServicio: string, estadoTecnico: string) => {
    let colorClass = 'bg-slate-500';
    // Detectamos si es una falla (Activo pero sin ping)
    const esFalla = estadoTecnico === 'OFFLINE' && estadoServicio === 'activo';

    if (estadoServicio === 'activo') {
        colorClass = esFalla ? 'bg-rose-600' : 'bg-emerald-500';
    } else if (estadoServicio === 'suspendido') {
        colorClass = 'bg-amber-500';
    }

    return L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
            <div class="relative flex h-6 w-6">
                ${esFalla ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>` : ''}
                <div class="relative inline-flex rounded-full h-6 w-6 border-2 border-white ${colorClass} shadow-lg items-center justify-center">
                    <div class="w-1 h-1 bg-white rounded-full opacity-50"></div>
                </div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

export default function MapaClientes() {
    const { brand } = useBrand();
    const [clientesMap, setClientesMap] = useState<MapClient[]>([]);
    const [statusTecnico, setStatusTecnico] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [modo, setModo] = useState<'conexion' | 'senal'>('conexion');
    const [atenuacion, setAtenuacion] = useState<Atenuacion | null>(null);
    const [grupoActivo, setGrupoActivo] = useState<GrupoAtenuado | null>(null);
    const [panelSenal, setPanelSenal] = useState(true);
    const [mapa, setMapa] = useState<L.Map | null>(null);

    const refreshTimeoutRef = useRef<number | null>(null);

    const centroRespaldo: [number, number] = [16.75, -93.11];

    const coordenadaValida = (valor: string | number | null) => (
        valor !== null
        && valor !== undefined
        && String(valor).trim() !== ''
        && Number.isFinite(Number(valor))
    );

    const cargarCoordenadas = useCallback(async () => {
        try {
            const res = await client.get<MapClient[]>('/clientes/listado-completo-unificado');
            const conGPS = res.data.filter((cliente) => {
                const latitud = Number(cliente.latitud);
                const longitud = Number(cliente.longitud);
                return (
                    coordenadaValida(cliente.latitud)
                    && coordenadaValida(cliente.longitud)
                    && latitud >= -90
                    && latitud <= 90
                    && longitud >= -180
                    && longitud <= 180
                    && !(latitud === 0 && longitud === 0)
                );
            });
            setClientesMap(conGPS);
        } catch {
            toast.error("Error al cargar coordenadas");
        }
    }, []);

    const actualizarEstadosTecnicos = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const resStatus = await client.get<StatusResponse>('/dashboard/status-tabla-clientes');
            const mapaStatus: Record<string, string> = {};

            const detalles = resStatus.data.detalle_clientes || {};
            Object.entries(detalles).forEach(([id, item]) => {
                mapaStatus[id] = item.estado_tecnico;
            });

            setStatusTecnico(mapaStatus);
        } catch {
            console.error("Error en auto-refresco");
        } finally {
            if (refreshTimeoutRef.current !== null) window.clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = window.setTimeout(() => setIsRefreshing(false), 1000);
        }
    }, []);

    useEffect(() => {
        if (modo !== 'senal' || atenuacion) return;
        client.get<Atenuacion>('/ftth/atenuacion')
            .then(({ data }) => setAtenuacion(data))
            .catch(() => toast.error('No se pudo calcular la señal de los clientes'));
    }, [modo, atenuacion]);

    const irAGrupo = (grupo: GrupoAtenuado) => {
        setGrupoActivo(grupo);
        if (grupo.ubicacion && mapa) mapa.flyTo(grupo.ubicacion, 18);
    };

    useEffect(() => {
        const inicializarMapa = async () => {
            setLoading(true);
            await cargarCoordenadas();
            await actualizarEstadosTecnicos();
            setLoading(false);
        };
        const initialLoad = window.setTimeout(() => void inicializarMapa(), 0);
        const interval = window.setInterval(() => void actualizarEstadosTecnicos(), 30000);

        return () => {
            window.clearTimeout(initialLoad);
            window.clearInterval(interval);
            if (refreshTimeoutRef.current !== null) window.clearTimeout(refreshTimeoutRef.current);
        };
    }, [actualizarEstadosTecnicos, cargarCoordenadas]);

    if (loading) return (
        <div className="flex h-[calc(100vh-100px)] flex-col items-center justify-center bg-slate-900 text-slate-400">
            <ArrowPathIcon className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="animate-pulse">Sincronizando red {brand.empresa_nombre}...</p>
        </div>
    );

    return (
        <div className="relative w-full h-[calc(100vh-100px)] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0b0c10]">

            {/* INDICADOR DE REFRESCO AUTOMÁTICO */}
            <div className="absolute bottom-6 left-6 z-[400] flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-full border border-slate-700">
                <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`}></div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {isRefreshing ? 'Actualizando Estados...' : 'Monitoreo en Vivo (30s)'}
                </span>
            </div>

            {/* MODO: CONEXIÓN O SEÑAL */}
            <div className="absolute left-14 top-3 z-[400] flex rounded-full border border-slate-700 bg-slate-950/90 p-1 backdrop-blur-md">
                {([['conexion', 'Conexión'], ['senal', 'Señal']] as const).map(([valor, texto]) => (
                    <button
                        key={valor}
                        type="button"
                        aria-pressed={modo === valor}
                        onClick={() => { setModo(valor); setGrupoActivo(null); }}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${modo === valor ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}
                    >
                        {texto}
                    </button>
                ))}
            </div>

            {modo === 'conexion' ? (
                <div className="absolute right-3 top-16 z-[400] w-56 rounded-xl border border-slate-700 bg-slate-950/90 p-4 shadow-xl backdrop-blur-md sm:right-4 sm:top-4 sm:w-60">
                    <h3 className="text-white font-bold text-xs mb-3 flex items-center gap-2 uppercase tracking-tight">
                        <SignalIcon className="w-4 h-4 text-blue-400" /> Estado de Conexión
                    </h3>
                    <div className="space-y-2 text-[11px]">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> <span className="text-slate-300">Online (OK)</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></div> <span className="text-rose-400 font-bold">Offline (Posible Falla)</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> <span className="text-slate-300">Suspendido (Pago)</span></div>
                    </div>
                </div>
            ) : !panelSenal ? (
                <button
                    type="button"
                    onClick={() => setPanelSenal(true)}
                    className="absolute bottom-16 right-3 z-[400] rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md sm:bottom-auto sm:right-4 sm:top-4"
                >
                    Bajaron juntos ({atenuacion?.grupos.length ?? '…'})
                </button>
            ) : (
                <div className="absolute inset-x-3 bottom-16 z-[400] max-h-[45%] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/90 p-3 text-slate-200 shadow-xl backdrop-blur-md sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:max-h-[75%] sm:w-80">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white">Señal contra su normal</h3>
                        <button type="button" onClick={() => setPanelSenal(false)} className="shrink-0 rounded-md px-2 py-0.5 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-white">Ocultar</button>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">Cada cliente contra su propia señal de la última semana.</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Estable</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Bajó {atenuacion?.umbral_db ?? 1.5}–3 dB</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Bajó 3 dB o más</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Sin lecturas</span>
                    </div>
                    <h4 className="mt-3 border-t border-slate-800 pt-3 text-xs font-semibold text-white">Bajaron juntos</h4>
                    {!atenuacion ? (
                        <p className="mt-2 text-xs text-slate-400">Calculando…</p>
                    ) : atenuacion.grupos.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-400">Ninguna troncal, caja NAP o zona bajó a la vez. ✅</p>
                    ) : (
                        <ul className="mt-2 space-y-1.5">
                            {atenuacion.grupos.map((grupo) => (
                                <li key={`${grupo.tipo}-${grupo.nombre}`}>
                                    <button
                                        type="button"
                                        onClick={() => irAGrupo(grupo)}
                                        className={`w-full rounded-lg border p-2 text-left transition ${grupoActivo === grupo ? 'border-rose-500 bg-rose-500/10' : 'border-slate-800 hover:border-slate-600'}`}
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="truncate text-xs font-semibold text-white">{grupo.nombre}</span>
                                            <span className="shrink-0 font-mono text-xs font-bold text-rose-400">▼ {Math.abs(grupo.cambio_mediano_db).toFixed(1)} dB</span>
                                        </span>
                                        <span className="mt-0.5 block text-[11px] text-slate-400">
                                            {TIPO_GRUPO[grupo.tipo]} · bajaron {grupo.bajaron} de {grupo.medidos} · peor ▼ {Math.abs(grupo.peor_db).toFixed(1)} dB
                                            {!grupo.ubicacion && ' · sin ubicación'}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <MapContainer center={clientesMap.length > 0 ? [Number(clientesMap[0].latitud), Number(clientesMap[0].longitud)] : centroRespaldo} zoom={15} className="w-full h-full z-0" ref={setMapa}>
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                />

                {modo === 'senal' && atenuacion?.grupos.filter((grupo) => grupo.ubicacion).map((grupo) => (
                    <Circle
                        key={`${grupo.tipo}-${grupo.nombre}`}
                        center={grupo.ubicacion as [number, number]}
                        radius={grupo.tipo === 'zona' ? 250 : grupo.tipo === 'pon' ? 150 : 40}
                        pathOptions={{ color: '#e11d48', weight: grupoActivo === grupo ? 3 : 1, fillOpacity: grupoActivo === grupo ? 0.25 : 0.1 }}
                        eventHandlers={{ click: () => setGrupoActivo(grupo) }}
                    />
                ))}

                {clientesMap.map((cliente) => {
                    // 🔥 CORRECCIÓN: Buscar estadoReal usando el ID del cliente 🔥
                    const estadoReal = statusTecnico[String(cliente.id)] || 'OFFLINE';
                    const cambio = atenuacion?.clientes[String(cliente.id)];

                    return (
                        <Marker
                            key={cliente.id}
                            position={[Number(cliente.latitud), Number(cliente.longitud)]}
                            icon={modo === 'senal'
                                ? iconoSenal(cambio?.nivel ?? 'sin_dato', Boolean(grupoActivo?.cliente_ids.includes(cliente.id)))
                                : crearIcono(cliente.servicio.estado_servicio, estadoReal)}
                        >
                            <Popup>
                                <div className="p-1 min-w-[180px]">
                                    <h4 className="font-bold text-slate-800 border-b mb-2">{cliente.nombre}</h4>
                                    <div className="space-y-1 text-[11px]">
                                        <p><strong>IP:</strong> {cliente.servicio.ip_asignada}</p>
                                        <p><strong>NAP:</strong> {cliente.servicio.nap_info}</p>
                                        {modo === 'senal' && (cambio ? (
                                            <p><strong>Señal:</strong> {cambio.actual.toFixed(2)} dBm (normal {cambio.normal.toFixed(2)}) · {cambio.cambio_db > 0 ? '▲' : '▼'} {Math.abs(cambio.cambio_db).toFixed(1)} dB</p>
                                        ) : <p><strong>Señal:</strong> sin lecturas suficientes</p>)}
                                        <div className={`mt-2 p-1.5 rounded text-center font-black ${estadoReal === 'OFFLINE' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {estadoReal === 'OFFLINE' ? '⚠️ DISPOSITIVO OFFLINE' : '✅ DISPOSITIVO ONLINE'}
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}

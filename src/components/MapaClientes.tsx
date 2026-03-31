import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import {
    ArrowPathIcon,
    SignalIcon
} from '@heroicons/react/24/outline';

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
    const [clientesMap, setClientesMap] = useState<any[]>([]);
    const [statusTecnico, setStatusTecnico] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Referencia para evitar colisiones de intervalos
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const centroRespaldo: [number, number] = [16.75, -93.11];

    // 1. Carga inicial de coordenadas (Solo se hace una vez)
    useEffect(() => {
        const inicializarMapa = async () => {
            setLoading(true);
            await cargarCoordenadas();
            await actualizarEstadosTecnicos();
            setLoading(false);
        };
        inicializarMapa();

        // 2. Configurar el Refresco Automático cada 30 segundos
        intervalRef.current = setInterval(() => {
            actualizarEstadosTecnicos();
        }, 30000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const cargarCoordenadas = async () => {
        try {
            const res = await client.get('/clientes/listado-completo-unificado');
            const conGPS = res.data.filter((c: any) =>
                c.latitud && c.longitud && !isNaN(parseFloat(c.latitud))
            );
            setClientesMap(conGPS);
        } catch (error) {
            toast.error("Error al cargar coordenadas");
        }
    };

    const actualizarEstadosTecnicos = async () => {
        setIsRefreshing(true);
        try {
            const resStatus = await client.get('/dashboard/status-tabla-clientes');
            const mapaStatus: Record<string, string> = {};

            resStatus.data.detalle_clientes.forEach((item: any) => {
                mapaStatus[item.ip] = item.estado_tecnico;
            });

            setStatusTecnico(mapaStatus);
        } catch (error) {
            console.error("Error en auto-refresco");
        } finally {
            setTimeout(() => setIsRefreshing(false), 1000);
        }
    };

    if (loading) return (
        <div className="flex h-[calc(100vh-100px)] flex-col items-center justify-center bg-slate-900 text-slate-400">
            <ArrowPathIcon className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="animate-pulse">Sincronizando red FdezNet...</p>
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

            {/* PANEL DE LEYENDA */}
            <div className="absolute top-4 right-4 z-[400] bg-slate-950/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl w-60">
                <h3 className="text-white font-bold text-xs mb-3 flex items-center gap-2 uppercase tracking-tight">
                    <SignalIcon className="w-4 h-4 text-blue-400" /> Estado de Conexión
                </h3>
                <div className="space-y-2 text-[11px]">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> <span className="text-slate-300">Online (OK)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></div> <span className="text-rose-400 font-bold">Offline (Posible Falla)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> <span className="text-slate-300">Suspendido (Pago)</span></div>
                </div>
            </div>

            <MapContainer center={clientesMap.length > 0 ? [parseFloat(clientesMap[0].latitud), parseFloat(clientesMap[0].longitud)] : centroRespaldo} zoom={15} className="w-full h-full z-0">
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                />

                {clientesMap.map((cliente) => {
                    const estadoReal = statusTecnico[cliente.servicio.ip_asignada] || 'OFFLINE';
                    return (
                        <Marker
                            key={cliente.id}
                            position={[parseFloat(cliente.latitud), parseFloat(cliente.longitud)]}
                            icon={crearIcono(cliente.servicio.estado_servicio, estadoReal)}
                        >
                            <Popup>
                                <div className="p-1 min-w-[180px]">
                                    <h4 className="font-bold text-slate-800 border-b mb-2">{cliente.nombre}</h4>
                                    <div className="space-y-1 text-[11px]">
                                        <p><strong>IP:</strong> {cliente.servicio.ip_asignada}</p>
                                        <p><strong>NAP:</strong> {cliente.servicio.nap_info}</p>
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
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useSync } from '@/context/sync/context';
import { cachedRequest, getCachedValue, setCachedValue } from '../../offline/db';
import { 
    ArrowLeftIcon, QrCodeIcon, WifiIcon, 
    ServerIcon, LockClosedIcon, CheckCircleIcon,
    CubeIcon, ClipboardDocumentIcon, InformationCircleIcon,
    MapPinIcon, XCircleIcon, IdentificationIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';

interface ClientInstallation {
    id: number;
    nombre: string;
    cedula?: string;
    ip_asignada?: string;
    olt_id?: number;
    onu_id?: number;
    caja_nap_id?: number;
    puerto_nap?: number;
    plan_id?: number;
    router_id?: number;
    latitud?: number | string;
    longitud?: number | string;
    identificador_onu?: string;
    olt_nombre?: string;
    nap_nombre?: string;
    suggested_user?: string;
    suggested_pass?: string;
    plan_nombre: string;
}

interface OltOption {
    id: number;
    nombre: string;
}

interface OnuOption {
    id: number;
    identificador: string;
}

interface NapOption {
    id: number;
    nombre: string;
    capacidad?: number;
}

interface NapConnection {
    puerto_nap?: number | string | null;
}

interface InstallationFormData {
    olt_id: string;
    onu_id: string;
    caja_nap_id: string;
    puerto_nap: string;
    latitud: string;
    longitud: string;
}

function apiErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || fallback;
    }
    return fallback;
}

export default function TechInstallForm() {
    const { cedula } = useParams(); 
    const navigate = useNavigate();
    const { online } = useSync();
    const [cliente, setCliente] = useState<ClientInstallation | null>(null);
    
    const [olts, setOlts] = useState<OltOption[]>([]);
    const [onusDisponibles, setOnusDisponibles] = useState<OnuOption[]>([]);
    const [cajasNap, setCajasNap] = useState<NapOption[]>([]);
    
    const [puertosOcupados, setPuertosOcupados] = useState<number[]>([]);
    const [loadingPorts, setLoadingPorts] = useState(false);
    const [capacidadActual, setCapacidadActual] = useState(16); 

    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState<InstallationFormData>({
        olt_id: '', 
        onu_id: '',
        caja_nap_id: '',
        puerto_nap: '', 
        latitud: '',  
        longitud: ''
    });

    const cargarPuertos = useCallback(async (napId: number | string, listaNaps: NapOption[]) => {
        if (!napId) {
            setFormData(prev => ({ ...prev, caja_nap_id: '', puerto_nap: '' }));
            setPuertosOcupados([]);
            return;
        }

        setLoadingPorts(true);
        setFormData(prev => ({ ...prev, caja_nap_id: napId.toString(), puerto_nap: '' }));

        const cajaSeleccionada = listaNaps.find(nap => nap.id === Number(napId));
        if (cajaSeleccionada?.capacidad) {
            setCapacidadActual(cajaSeleccionada.capacidad);
        }

        try {
            const res = await cachedRequest<NapConnection[]>(`nap-${napId}-detalles`, async () => (
                await client.get<NapConnection[]>(`/infraestructura/naps/${napId}/detalles`)
            ).data);
            const ocupados = res.data
                .map(connection => Number(connection.puerto_nap))
                .filter(Number.isFinite);

            setPuertosOcupados(ocupados);
        } catch {
            toast.error("No se pudo cargar el estado de los puertos");
        } finally {
            setLoadingPorts(false);
        }
    }, []);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                // 1. Cargar datos de la orden
                const resCliente = await cachedRequest<ClientInstallation>(`instalacion-cliente-${cedula}`, async () => (
                    await client.get<ClientInstallation>(`/clientes/${cedula}/portal`)
                ).data);
                const c = resCliente.data;
                setCliente(c);

                // 2. Cargar catálogos solo si no vienen pre-asignados (Basado en IDs)
                if (!c.olt_id) {
                    const resOlts = await cachedRequest<OltOption[]>('catalogo-olts', async () => (
                        await client.get<OltOption[]>('/olts/opciones')
                    ).data);
                    setOlts(resOlts.data);
                }

                if (!c.onu_id) {
                    const resOnus = await cachedRequest<OnuOption[]>('catalogo-onus-disponibles', async () => (
                        await client.get<OnuOption[]>('/inventario/?estado=DISPONIBLE')
                    ).data);
                    setOnusDisponibles(resOnus.data);
                }

                if (!c.caja_nap_id || !c.puerto_nap) {
                    const resNaps = await cachedRequest<NapOption[]>('catalogo-cajas-nap', async () => (
                        await client.get<NapOption[]>('/infraestructura/naps')
                    ).data);
                    setCajasNap(resNaps.data);
                    
                    if (c.caja_nap_id && !c.puerto_nap) {
                        cargarPuertos(c.caja_nap_id, resNaps.data);
                    }
                }

                // 3. Autocompletar el state
                const draft = await getCachedValue<InstallationFormData>(`instalacion-borrador-${cedula}`);
                setFormData(prev => ({
                    ...prev,
                    olt_id: c.olt_id?.toString() || '',
                    onu_id: c.onu_id?.toString() || '',
                    caja_nap_id: c.caja_nap_id?.toString() || '',
                    puerto_nap: c.puerto_nap?.toString() || '',
                    latitud: c.latitud?.toString() || '',
                    longitud: c.longitud?.toString() || '',
                    ...(draft || {}),
                }));
                if (resCliente.fromCache) toast('Orden cargada desde el dispositivo');

            } catch {
                toast.error("Error al cargar la orden o infraestructura");
                navigate('/tech/dashboard');
            }
        };
        if (cedula) cargarDatos();
    }, [cargarPuertos, cedula, navigate]);

    const capturarUbicacion = () => {
        if (!navigator.geolocation) {
            toast.error("Tu celular no soporta GPS");
            return;
        }
        const loadGPS = toast.loading("Obteniendo coordenadas...");
        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                setFormData(prev => ({
                    ...prev,
                    latitud: posicion.coords.latitude.toString(),
                    longitud: posicion.coords.longitude.toString()
                }));
                toast.success("¡Ubicación guardada!", { id: loadGPS });
            },
            () => {
                toast.error("Error GPS. Activa la ubicación.", { id: loadGPS, duration: 4000 });
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleFinalizar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cliente) return;

        if (!online) {
            await setCachedValue(`instalacion-borrador-${cedula}`, formData);
            toast.success('Borrador guardado. La activación requiere conexión');
            return;
        }
        
        const finalOltId = cliente.olt_id || formData.olt_id;
        const finalOnuId = cliente.onu_id || formData.onu_id;
        const finalNapId = cliente.caja_nap_id || formData.caja_nap_id;
        const finalPuerto = cliente.puerto_nap || formData.puerto_nap;

        if (!finalOltId) return toast.error("Falta indicar la OLT");
        if (!finalOnuId) return toast.error("La ONU es obligatoria");
        if (finalNapId && !finalPuerto) return toast.error("Si seleccionas una Caja NAP, debes indicar el puerto");
        if (!formData.latitud || !formData.longitud) return toast.error("⚠️ Falta capturar la ubicación GPS");

        setLoading(true);
        const load = toast.loading("Aprovisionando en red...");

        try {
            await client.post(`/clientes/${cliente.id}/completar-instalacion`, {
                cedula: cliente.cedula,
                olt_id: Number(finalOltId), 
                onu_id: Number(finalOnuId), 
                caja_nap_id: finalNapId ? Number(finalNapId) : null,
                puerto_nap: finalPuerto ? Number(finalPuerto) : null,
                latitud: parseFloat(formData.latitud),   
                longitud: parseFloat(formData.longitud), 
                plan_id: cliente.plan_id,
                router_id: cliente.router_id,
                user_pppoe: cliente.suggested_user,
                pass_pppoe: cliente.suggested_pass,
                ip_asignada: cliente.ip_asignada === "Pendiente" ? null : cliente.ip_asignada
            });

            toast.success("¡INSTALACIÓN EXITOSA!", { id: load });
            await setCachedValue(`instalacion-borrador-${cedula}`, null);
            setTimeout(() => navigate('/tech/dashboard'), 1500);
        } catch (error: unknown) {
            toast.error(apiErrorMessage(error, "Error en activación"), { id: load });
        } finally {
            setLoading(false);
        }
    };

    if (!cliente) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest">Cargando orden...</div>;

    const labelStyle = "text-[11px] uppercase font-black text-slate-400 dark:text-slate-500 mb-2 block tracking-widest pl-1";
    const infoBoxStyle = "w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-center items-start shadow-sm";
    const readOnlyBoxStyle = "w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center text-slate-500 dark:text-slate-400 opacity-90 cursor-not-allowed";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-32 font-sans transition-colors duration-300">
            
            {/* Navbar Móvil */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all">
                    <ArrowLeftIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                </button>
                <div className="overflow-hidden">
                    <h2 className="font-black text-blue-600 dark:text-blue-500 text-[10px] uppercase tracking-widest leading-tight">Instalación</h2>
                    <p className="text-base font-black text-slate-800 dark:text-white truncate">{cliente.nombre}</p>
                </div>
            </div>

            <form onSubmit={handleFinalizar} className="p-4 space-y-5 max-w-lg mx-auto">
                
                {/* 1. DATOS ESTABLECIDOS */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 tracking-widest">
                        <InformationCircleIcon className="w-4 h-4"/> Detalles del Cliente
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className={infoBoxStyle}>
                            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1"><IdentificationIcon className="w-3 h-3"/> Cédula</span>
                            <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">{cliente.cedula}</span>
                        </div>
                        <div className={infoBoxStyle}>
                            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1"><WifiIcon className="w-3 h-3"/> Plan</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 mt-1 leading-tight">{cliente.plan_nombre}</span>
                        </div>
                    </div>
                </div>

                {/* 2. CREDENCIALES PPPoE */}
                <div className="bg-gradient-to-br from-blue-50 dark:from-blue-600/10 to-indigo-50 dark:to-purple-600/10 p-4 rounded-3xl border border-blue-200 dark:border-blue-500/20 shadow-sm">
                    <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
                        <LockClosedIcon className="w-4 h-4"/> Datos Mikrotik
                    </h3>
                    <div className="space-y-3">
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl flex justify-between items-center border border-white/50 dark:border-slate-800 shadow-sm">
                            <div>
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Usuario</span>
                                <code className="text-blue-600 dark:text-blue-400 font-bold font-mono text-sm">{cliente.suggested_user}</code>
                            </div>
                            <button type="button" onClick={() => {navigator.clipboard.writeText(cliente.suggested_user || ''); toast.success("Copiado")}} className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-500 active:scale-90 transition-all"><ClipboardDocumentIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl flex justify-between items-center border border-white/50 dark:border-slate-800 shadow-sm">
                            <div>
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contraseña</span>
                                <code className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm">{cliente.suggested_pass}</code>
                            </div>
                            <button type="button" onClick={() => {navigator.clipboard.writeText(cliente.suggested_pass || ''); toast.success("Copiado")}} className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-500 active:scale-90 transition-all"><ClipboardDocumentIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>

                {/* 3. REGISTRO TÉCNICO (Hardware) */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <h3 className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 tracking-widest">
                        <ServerIcon className="w-4 h-4"/> Hardware Físico
                    </h3>

                    {/* 🟢 OLT: Ahora depende 100% de olt_id */}
                    <div>
                        <label className={labelStyle}>OLT Principal</label>
                        {cliente.olt_id ? (
                            <div className={readOnlyBoxStyle}>
                                <span className="text-sm font-black text-slate-600 dark:text-slate-300">
                                    {cliente.olt_nombre}
                                </span>
                                <LockClosedIcon className="w-5 h-5 text-slate-400/50"/>
                            </div>
                        ) : (
                            <div className="relative">
                                <CpuChipIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none"/>
                                <select 
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-2xl p-4 pl-10 text-sm font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none transition-all shadow-inner"
                                    value={formData.olt_id}
                                    onChange={e => setFormData({...formData, olt_id: e.target.value})}
                                >
                                    <option value="" disabled>-- Elige OLT (Ej. VSOL 4 PON) --</option>
                                    {olts.map(olt => (
                                        <option key={olt.id} value={olt.id}>{olt.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* 🟢 ONU: Ahora depende 100% de onu_id */}
                    <div>
                        <label className={labelStyle}>ONU / Equipo Cliente</label>
                        {cliente.onu_id ? (
                            <div className={readOnlyBoxStyle}>
                                <span className="text-sm font-black font-mono text-slate-600 dark:text-slate-300">
                                    S/N: {cliente.identificador_onu}
                                </span>
                                <LockClosedIcon className="w-5 h-5 text-slate-400/50"/>
                            </div>
                        ) : (
                            <div className="relative">
                                <QrCodeIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none"/>
                                <select 
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-2xl p-4 pl-10 text-sm font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none transition-all shadow-inner"
                                    value={formData.onu_id}
                                    onChange={e => setFormData({...formData, onu_id: e.target.value})}
                                >
                                    <option value="" disabled>-- Toca para elegir equipo --</option>
                                    {onusDisponibles.map(onu => (
                                        <option key={onu.id} value={onu.id}>S/N: {onu.identificador}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    
                    {/* 🟢 CAJA NAP: Ahora depende 100% de caja_nap_id */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div>
                            <label className={labelStyle}>Caja NAP Conectada (Opcional)</label>
                            {cliente.caja_nap_id ? (
                                <div className={readOnlyBoxStyle}>
                                    <span className="text-sm font-black text-slate-600 dark:text-slate-300">
                                        {cliente.nap_nombre}
                                    </span>
                                    <LockClosedIcon className="w-5 h-5 text-slate-400/50"/>
                                </div>
                            ) : (
                                <div className="relative">
                                    <CubeIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none"/>
                                    <select 
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-2xl p-4 pl-10 text-sm font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none transition-all shadow-inner"
                                        value={formData.caja_nap_id}
                                        onChange={e => cargarPuertos(e.target.value, cajasNap)}
                                    >
                                        <option value="">-- Sin NAP asignada (Zona en registro) --</option>
                                        {cajasNap.map(nap => (
                                            <option key={nap.id} value={nap.id}>{nap.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* CUADRÍCULA DE PUERTOS */}
                        {(formData.caja_nap_id || cliente.caja_nap_id) && (
                            <div>
                                <label className={labelStyle}>Puerto Usado</label>
                                {cliente.puerto_nap ? (
                                    <div className={readOnlyBoxStyle}>
                                        <span className="text-sm font-black text-slate-600 dark:text-slate-300">
                                            Puerto #{cliente.puerto_nap}
                                        </span>
                                        <LockClosedIcon className="w-5 h-5 text-slate-400/50"/>
                                    </div>
                                ) : loadingPorts ? (
                                    <div className="text-center p-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Sincronizando...</div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        {Array.from({ length: capacidadActual }, (_, i) => i + 1).map(puerto => {
                                            const isOcupado = puertosOcupados.includes(puerto);
                                            const isSeleccionado = Number(formData.puerto_nap) === puerto;
                                            
                                            return (
                                                <button
                                                    key={puerto}
                                                    type="button"
                                                    disabled={isOcupado}
                                                    onClick={() => setFormData({...formData, puerto_nap: puerto.toString()})}
                                                    className={`
                                                        relative h-12 rounded-xl flex items-center justify-center font-black text-sm transition-all
                                                        ${isSeleccionado ? 'bg-emerald-500 text-white shadow-md scale-105 z-10' : ''}
                                                        ${isOcupado ? 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 opacity-50' : ''}
                                                        ${!isSeleccionado && !isOcupado ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-100 border border-slate-200 dark:border-slate-700 shadow-sm' : ''}
                                                    `}
                                                >
                                                    {isOcupado && <XCircleIcon className="absolute w-full h-full p-2 text-rose-500/20" />}
                                                    {puerto}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 🟢 GPS */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <label className={labelStyle}>Ubicación Instalación</label>
                        {!formData.latitud ? (
                            <button type="button" onClick={capturarUbicacion} className="w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-200 dark:border-blue-800 py-4 rounded-2xl font-black text-xs tracking-widest uppercase flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                                <MapPinIcon className="w-7 h-7" /> GUARDAR MI UBICACIÓN
                            </button>
                        ) : (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 p-3 rounded-2xl flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2.5 rounded-xl"><MapPinIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                                    <div>
                                        <p className="text-[9px] text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-widest">Coordenadas</p>
                                        <p className="text-xs text-slate-700 dark:text-slate-300 font-mono mt-0.5 font-bold">{formData.latitud.slice(0,8)}, {formData.longitud.slice(0,9)}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={capturarUbicacion} className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-2 rounded-lg font-black uppercase active:scale-90 transition-all">Cambiar</button>
                            </div>
                        )}
                    </div>

                </div>

                {/* BOTÓN FINALIZAR */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 dark:from-slate-950 dark:via-slate-950/90 to-transparent z-30 pb-6">
                    <button type="submit" disabled={loading} className="w-full max-w-lg mx-auto bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? 'ACTIVANDO...' : online ? 'FINALIZAR INSTALACIÓN' : 'GUARDAR BORRADOR'}
                        {!loading && <CheckCircleIcon className="w-6 h-6"/>}
                    </button>
                </div>
            </form>
        </div>
    );
}

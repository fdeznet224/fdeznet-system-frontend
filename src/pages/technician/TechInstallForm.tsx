import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useSync } from '@/context/sync/context';
import { cachedRequest, getCachedValue, setCachedValue } from '../../offline/db';
import { 
    ArrowLeftIcon, QrCodeIcon, WifiIcon, 
    ServerIcon, LockClosedIcon, CheckCircleIcon,
    CubeIcon, ClipboardDocumentIcon,
    MapPinIcon, IdentificationIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import { apiErrorMessage } from '@/utils/apiError';
import SugerenciaNap from '@/components/naps/SugerenciaNap';
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ETIQUETA_CAMPO, TARJETA, TITULO_SECCION } from './estilo';

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
    zona_id?: number;
    latitud?: number | string;
    longitud?: number | string;
    identificador_onu?: string;
    olt_nombre?: string;
    nap_nombre?: string;
    suggested_user?: string;
    suggested_pass?: string;
    tipo_seguridad?: 'pppoe' | 'dhcp';
    mac_address?: string;
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
    mac_address: string;
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
        longitud: '',
        mac_address: ''
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
                    const napParams = new URLSearchParams();
                    if (c.zona_id) napParams.set('zona_id', String(c.zona_id));
                    if (c.router_id) napParams.set('router_id', String(c.router_id));
                    if (c.olt_id) napParams.set('olt_id', String(c.olt_id));
                    const napUrl = `/infraestructura/naps?${napParams.toString()}`;
                    const napCacheKey = [
                        'catalogo-cajas-nap',
                        c.zona_id || 'todas',
                        c.router_id || 'todos',
                        c.olt_id || 'todas',
                    ].join('-');
                    const resNaps = await cachedRequest<NapOption[]>(napCacheKey, async () => (
                        await client.get<NapOption[]>(napUrl)
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
                    mac_address: c.mac_address || '',
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
        if (cliente.tipo_seguridad === 'dhcp' && !formData.mac_address.trim()) {
            return toast.error("Falta la MAC WAN/CPE vista por MikroTik");
        }

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
                mac_address: formData.mac_address.trim() || null,
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

    if (!cliente) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950">Cargando orden...</div>;

    const selectClase = `${CAMPO} min-h-11 appearance-none pl-10`;
    const bloqueado = 'flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300';
    const copiar = (texto?: string | null) => {
        void navigator.clipboard.writeText(texto || '');
        toast.success('Copiado');
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">

            <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl dark:border-slate-800 dark:bg-[#11151f]/95">
                <button type="button" aria-label="Volver" onClick={() => navigate(-1)} className="-ml-1 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500">Instalación</p>
                    <p className="truncate text-base font-bold text-slate-900 dark:text-white">{cliente.nombre}</p>
                </div>
            </div>

            <form onSubmit={handleFinalizar} className="mx-auto max-w-lg space-y-3 p-4">

                {/* CLIENTE */}
                <section className={`${TARJETA} grid grid-cols-2 gap-3 p-4`}>
                    <div>
                        <p className="flex items-center gap-1 text-xs text-slate-500"><IdentificationIcon className="h-3.5 w-3.5" /> Contrato</p>
                        <p className="mt-0.5 font-mono text-sm font-bold">{cliente.cedula}</p>
                    </div>
                    <div>
                        <p className="flex items-center gap-1 text-xs text-slate-500"><WifiIcon className="h-3.5 w-3.5" /> Plan</p>
                        <p className="mt-0.5 text-sm font-bold leading-tight">{cliente.plan_nombre}</p>
                    </div>
                </section>

                {/* ACCESO EN EL MIKROTIK */}
                <p className={`${TITULO_SECCION} flex items-center gap-1.5 pt-2`}><LockClosedIcon className="h-3.5 w-3.5" /> Datos MikroTik</p>
                <section className={`${TARJETA} p-4`}>
                    {cliente.tipo_seguridad === 'dhcp' ? (
                        <div>
                            <label className={ETIQUETA_CAMPO}>MAC WAN/CPE vista por MikroTik</label>
                            <input
                                value={formData.mac_address}
                                onChange={e => setFormData({...formData, mac_address: e.target.value})}
                                placeholder="AA:BB:CC:DD:EE:FF"
                                className={`${CAMPO} font-mono uppercase`}
                                required
                            />
                            <p className="mt-2 text-[11px] text-slate-500">Usa la MAC del lease DHCP, no el serial GPON de la ONU.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {([['Usuario', cliente.suggested_user], ['Contraseña', cliente.suggested_pass]] as const).map(([nombre, valor]) => (
                                <div key={nombre} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-500">{nombre}</p>
                                        <code className="block truncate font-mono text-sm font-bold text-slate-900 dark:text-white">{valor}</code>
                                    </div>
                                    <button type="button" aria-label={`Copiar ${nombre.toLowerCase()}`} onClick={() => copiar(valor)} className={`${BOTON_SECUNDARIO} w-10 px-0`}>
                                        <ClipboardDocumentIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* EQUIPO Y UBICACIÓN */}
                <p className={`${TITULO_SECCION} flex items-center gap-1.5 pt-2`}><ServerIcon className="h-3.5 w-3.5" /> Equipo y ubicación</p>
                <section className={`${TARJETA} space-y-4 p-4`}>
                    <div>
                        <label className={ETIQUETA_CAMPO}>OLT</label>
                        {cliente.olt_id ? (
                            <div className={bloqueado}><span>{cliente.olt_nombre}</span><LockClosedIcon className="h-4 w-4 text-slate-400" /></div>
                        ) : (
                            <div className="relative">
                                <CpuChipIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <select required className={selectClase} value={formData.olt_id} onChange={e => setFormData({...formData, olt_id: e.target.value})}>
                                    <option value="" disabled>Elige la OLT</option>
                                    {olts.map(olt => <option key={olt.id} value={olt.id}>{olt.nombre}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={ETIQUETA_CAMPO}>ONU del cliente</label>
                        {cliente.onu_id ? (
                            <div className={bloqueado}><span className="font-mono">S/N: {cliente.identificador_onu}</span><LockClosedIcon className="h-4 w-4 text-slate-400" /></div>
                        ) : (
                            <div className="relative">
                                <QrCodeIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <select required className={selectClase} value={formData.onu_id} onChange={e => setFormData({...formData, onu_id: e.target.value})}>
                                    <option value="" disabled>Elige el equipo</option>
                                    {onusDisponibles.map(onu => <option key={onu.id} value={onu.id}>S/N: {onu.identificador}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={ETIQUETA_CAMPO}>Ubicación de la instalación</label>
                        {!formData.latitud ? (
                            <button type="button" onClick={capturarUbicacion} className={`${BOTON_SECUNDARIO} h-11 w-full`}>
                                <MapPinIcon className="h-5 w-5 text-blue-600" /> Guardar mi ubicación
                            </button>
                        ) : (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                                <p className="flex items-center gap-2 font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                    <MapPinIcon className="h-4 w-4" /> {formData.latitud.slice(0,8)}, {formData.longitud.slice(0,9)}
                                </p>
                                <button type="button" onClick={capturarUbicacion} className="text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300">Cambiar</button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={ETIQUETA_CAMPO}>Caja NAP (opcional)</label>
                        {cliente.caja_nap_id ? (
                            <div className={bloqueado}><span>{cliente.nap_nombre}</span><LockClosedIcon className="h-4 w-4 text-slate-400" /></div>
                        ) : (
                            <div className="relative">
                                <CubeIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <select className={selectClase} value={formData.caja_nap_id} onChange={e => cargarPuertos(e.target.value, cajasNap)}>
                                    <option value="">Sin caja NAP asignada</option>
                                    {cajasNap.map(nap => <option key={nap.id} value={nap.id}>{nap.nombre}</option>)}
                                </select>
                            </div>
                        )}
                        {!cliente.caja_nap_id && (
                            <div className="mt-3">
                                <SugerenciaNap
                                    latitud={formData.latitud}
                                    longitud={formData.longitud}
                                    zonaId={cliente.zona_id}
                                    oltId={cliente.olt_id}
                                    permitidas={cajasNap.map(n => n.id)}
                                    elegidaId={formData.caja_nap_id}
                                    onElegir={(id) => cargarPuertos(id, cajasNap)}
                                />
                            </div>
                        )}
                    </div>

                    {(formData.caja_nap_id || cliente.caja_nap_id) && (
                        <div>
                            <label className={ETIQUETA_CAMPO}>Puerto usado</label>
                            {cliente.puerto_nap ? (
                                <div className={bloqueado}><span>Puerto #{cliente.puerto_nap}</span><LockClosedIcon className="h-4 w-4 text-slate-400" /></div>
                            ) : loadingPorts ? (
                                <p className="py-3 text-center text-xs text-slate-400">Cargando puertos...</p>
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    {Array.from({ length: capacidadActual }, (_, i) => i + 1).map(puerto => {
                                        const isOcupado = puertosOcupados.includes(puerto);
                                        const isSeleccionado = Number(formData.puerto_nap) === puerto;
                                        return (
                                            <button
                                                key={puerto}
                                                type="button"
                                                disabled={isOcupado}
                                                aria-pressed={isSeleccionado}
                                                onClick={() => setFormData({...formData, puerto_nap: puerto.toString()})}
                                                className={`relative flex h-11 items-center justify-center rounded-xl border text-sm font-bold transition ${isSeleccionado
                                                    ? 'border-blue-600 bg-blue-600 text-white'
                                                    : isOcupado
                                                        ? 'border-slate-200 bg-slate-100 text-slate-300 line-through dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'
                                                        : 'border-slate-200 bg-white text-slate-700 active:bg-slate-100 dark:border-slate-700 dark:bg-transparent dark:text-slate-300'}`}
                                            >
                                                {puerto}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-slate-800 dark:bg-[#11151f]/95">
                    <button type="submit" disabled={loading} className={`${BOTON_PRIMARIO} mx-auto h-12 max-w-lg`}>
                        {!loading && <CheckCircleIcon className="h-5 w-5" />}
                        {loading ? 'Activando...' : online ? 'Finalizar instalación' : 'Guardar borrador'}
                    </button>
                </div>
            </form>
        </div>
    );
}

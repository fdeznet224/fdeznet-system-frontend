import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    ArrowLeftIcon, QrCodeIcon, WifiIcon, 
    ServerIcon, LockClosedIcon, CheckCircleIcon,
    CubeIcon, ClipboardDocumentIcon, InformationCircleIcon,
    MapPinIcon, LinkIcon, XCircleIcon
} from '@heroicons/react/24/outline';

export default function TechInstallForm() {
    const { cedula } = useParams(); 
    const navigate = useNavigate();
    const [cliente, setCliente] = useState<any>(null);
    const [cajasNap, setCajasNap] = useState<any[]>([]); 
    
    // 👇 Estados para la cuadrícula de puertos
    const [puertosOcupados, setPuertosOcupados] = useState<number[]>([]);
    const [loadingPorts, setLoadingPorts] = useState(false);
    const [capacidadActual, setCapacidadActual] = useState(16); // Por defecto 16

    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        serial_number: '',
        mac_address: '',
        caja_nap_id: '',
        puerto_nap: '', // Ahora guardará el número del puerto clickeado
        latitud: '',  
        longitud: ''
    });

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const resCliente = await client.get(`/clientes/${cedula}/portal`);
                const c = resCliente.data;
                setCliente(c);

                const resNaps = await client.get('/infraestructura/naps');
                setCajasNap(resNaps.data);

                setFormData(prev => ({
                    ...prev,
                    serial_number: c.cedula || '',
                    caja_nap_id: c.caja_nap_id || '',
                    puerto_nap: c.puerto_nap || '',
                    latitud: c.latitud || '',
                    longitud: c.longitud || ''
                }));

                // Si ya venía con una NAP asignada, cargar sus puertos
                if (c.caja_nap_id) {
                    cargarPuertos(c.caja_nap_id, resNaps.data);
                }

            } catch (error) {
                toast.error("Error al cargar la orden o infraestructura");
                navigate('/tech/dashboard');
            }
        };
        if (cedula) cargarDatos();
    }, [cedula, navigate]);

    // 👇 Función para obtener el estado real de los puertos cuando cambian de NAP
    const cargarPuertos = async (napId: number | string, listaNaps = cajasNap) => {
        if (!napId) return;
        
        setLoadingPorts(true);
        // Reseteamos el puerto seleccionado si cambiamos de caja
        setFormData(prev => ({ ...prev, caja_nap_id: napId.toString(), puerto_nap: '' }));
        
        // Ajustamos la cuadrícula según la capacidad de la caja (ej. 8 o 16 puertos)
        const cajaSeleccionada = listaNaps.find(n => n.id === Number(napId));
        if (cajaSeleccionada && cajaSeleccionada.capacidad) {
            setCapacidadActual(cajaSeleccionada.capacidad);
        }

        try {
            const res = await client.get(`/infraestructura/naps/${napId}/detalles`);
            // Extraemos solo los números de puerto que ya están asignados a un cliente
            const ocupados = res.data
                .filter((c: any) => c.puerto_nap != null)
                .map((c: any) => c.puerto_nap);
            
            setPuertosOcupados(ocupados);
        } catch (error) {
            toast.error("No se pudo cargar el estado de los puertos");
        } finally {
            setLoadingPorts(false);
        }
    };

    const capturarUbicacion = () => {
        if (!navigator.geolocation) {
            toast.error("Tu dispositivo no soporta GPS");
            return;
        }
        const loadGPS = toast.loading("Obteniendo coordenadas exactas...");
        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                setFormData(prev => ({
                    ...prev,
                    latitud: posicion.coords.latitude.toString(),
                    longitud: posicion.coords.longitude.toString()
                }));
                toast.success("¡Ubicación guardada con precisión!", { id: loadGPS });
            },
            (error) => {
                toast.error("Error GPS. Activa la ubicación en tu celular.", { id: loadGPS, duration: 4000 });
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleFinalizar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.serial_number) return toast.error("El S/N es obligatorio para activar");
        if (!formData.puerto_nap || !formData.caja_nap_id) return toast.error("Debes indicar la Caja NAP y seleccionar un puerto");
        if (!formData.latitud || !formData.longitud) return toast.error("⚠️ Falta capturar la ubicación GPS del cliente");

        setLoading(true);
        const load = toast.loading("Aprovisionando en Mikrotik...");

        try {
            await client.post(`/clientes/${cliente.id}/completar-instalacion`, {
                cedula: formData.serial_number,
                mac_address: formData.mac_address,
                caja_nap_id: Number(formData.caja_nap_id),
                puerto_nap: Number(formData.puerto_nap),
                latitud: parseFloat(formData.latitud),   
                longitud: parseFloat(formData.longitud), 
                plan_id: cliente.plan_id,
                router_id: cliente.router_id,
                user_pppoe: cliente.suggested_user,
                pass_pppoe: cliente.suggested_pass,
                ip_asignada: cliente.ip_asignada === "Pendiente" ? null : cliente.ip_asignada
            });

            toast.success("¡INSTALACIÓN COMPLETADA EXITOSAMENTE!", { id: load });
            setTimeout(() => navigate('/tech/dashboard'), 1500);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error en activación", { id: load });
        } finally {
            setLoading(false);
        }
    };

    if (!cliente) return <div className="min-h-screen bg-[#0f1014] flex items-center justify-center text-slate-500">Cargando orden...</div>;

    const labelStyle = "text-[10px] uppercase font-bold text-slate-500 mb-2 block tracking-widest pl-1";
    const infoBoxStyle = "w-full bg-[#0b0c10]/50 border border-slate-800 rounded-xl p-4 flex justify-between items-center";

    return (
        <div className="min-h-screen bg-[#0f1014] text-white pb-32 font-sans">
            <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-800 bg-[#0f1014]/90 backdrop-blur-md sticky top-0 z-20">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-800"><ArrowLeftIcon className="w-6 h-6 text-slate-300"/></button>
                <div>
                    <h2 className="font-bold text-blue-500 text-[10px] uppercase tracking-widest">Ejecución de Orden</h2>
                    <p className="text-lg font-bold text-white truncate max-w-[200px]">{cliente.nombre}</p>
                </div>
            </div>

            <form onSubmit={handleFinalizar} className="p-6 space-y-6">
                
                {/* 1. SECCIÓN DE SOLO LECTURA */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 px-1">
                        <InformationCircleIcon className="w-4 h-4"/> Datos Establecidos
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelStyle}>Plan de Internet</label>
                            <div className={infoBoxStyle}>
                                <span className="text-sm font-bold text-slate-300">{cliente.plan_nombre}</span>
                                <WifiIcon className="w-4 h-4 text-slate-600"/>
                            </div>
                        </div>
                        <div>
                            <label className={labelStyle}>Nodo / Torre</label>
                            <div className={infoBoxStyle}>
                                <span className="text-sm font-bold text-slate-300">{cliente.router_nombre}</span>
                                <ServerIcon className="w-4 h-4 text-slate-600"/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CREDENCIALES PPPoE */}
                <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 p-5 rounded-3xl border border-blue-500/20 shadow-lg">
                    <h3 className="text-xs font-bold text-blue-400 uppercase mb-4 flex items-center gap-2 border-b border-blue-500/10 pb-2">
                        <LockClosedIcon className="w-4 h-4"/> Configuración Mikrotik
                    </h3>
                    <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Usuario PPPoE</label>
                            <div className="bg-black/40 p-3 rounded-xl flex justify-between items-center border border-white/5">
                                <code className="text-yellow-400 font-bold font-mono text-base">{cliente.suggested_user}</code>
                                <button type="button" onClick={() => {navigator.clipboard.writeText(cliente.suggested_user); toast.success("Usuario copiado")}} className="p-2 text-slate-400 hover:text-white transition"><ClipboardDocumentIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Contraseña</label>
                            <div className="bg-black/40 p-3 rounded-xl flex justify-between items-center border border-white/5">
                                <code className="text-emerald-400 font-bold font-mono text-base">{cliente.suggested_pass}</code>
                                <button type="button" onClick={() => {navigator.clipboard.writeText(cliente.suggested_pass); toast.success("Password copiada")}} className="p-2 text-slate-400 hover:text-white transition"><ClipboardDocumentIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. DATOS FÍSICOS (REGISTRO TÉCNICO) */}
                <div className="bg-[#1a1b23] p-5 rounded-3xl border border-slate-800 shadow-xl space-y-6">
                    <h3 className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-2 border-b border-slate-700/50 pb-2">
                        <QrCodeIcon className="w-4 h-4"/> Registro de Instalación
                    </h3>

                    {/* S/N */}
                    <div>
                        <label className={labelStyle}>Serial Number ONU</label>
                        <div className="flex gap-2">
                            <input required className="w-full bg-[#0b0c10] border border-slate-700 text-white rounded-xl p-4 font-mono uppercase text-emerald-400 font-bold focus:border-emerald-500 outline-none transition"
                                value={formData.serial_number} 
                                onChange={e => setFormData({...formData, serial_number: e.target.value.toUpperCase()})} 
                                placeholder="ESCANEAR SN..." 
                            />
                            <button type="button" onClick={() => navigate('/scanner')} className="bg-slate-800 px-5 rounded-xl text-white active:scale-95 transition"><QrCodeIcon className="w-7 h-7"/></button>
                        </div>
                    </div>
                    
                    {/* INFRAESTRUCTURA FIBRA */}
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className={labelStyle}>Conectar a Caja NAP</label>
                            <div className="relative">
                                <CubeIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 pointer-events-none"/>
                                <select 
                                    required
                                    className="w-full bg-[#0b0c10] border border-slate-700 text-white rounded-xl p-3.5 pl-10 text-sm focus:border-emerald-500 outline-none transition appearance-none"
                                    value={formData.caja_nap_id}
                                    onChange={e => cargarPuertos(e.target.value)}
                                >
                                    <option value="" disabled>-- Selecciona la NAP física --</option>
                                    {cajasNap.map(nap => (
                                        <option key={nap.id} value={nap.id}>
                                            {nap.nombre} ({nap.puertos_libres} libres)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 👇 CUADRÍCULA VISUAL DE PUERTOS 👇 */}
                        {formData.caja_nap_id && (
                            <div>
                                <label className={labelStyle}>Seleccionar Puerto Libre</label>
                                {loadingPorts ? (
                                    <div className="text-center p-4 text-slate-500 text-xs animate-pulse">Sincronizando puertos...</div>
                                ) : (
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-2">
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
                                                        ${isSeleccionado ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105 z-10' : ''}
                                                        ${isOcupado ? 'bg-[#0b0c10] border border-red-900/30 text-slate-600 opacity-50 cursor-not-allowed' : ''}
                                                        ${!isSeleccionado && !isOcupado ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 border border-slate-700' : ''}
                                                    `}
                                                >
                                                    {isOcupado && <XCircleIcon className="absolute w-full h-full p-2 text-red-500/20" />}
                                                    {puerto}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* GEOLOCALIZACIÓN GPS */}
                    <div className="pt-4 border-t border-slate-800/50">
                        <label className={labelStyle}>Ubicación Exacta (Mapa)</label>
                        {!formData.latitud ? (
                            <button type="button" onClick={capturarUbicacion} className="w-full bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-900/30 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition active:scale-95">
                                <MapPinIcon className="w-6 h-6 animate-bounce" /> OBTENER MI UBICACIÓN AHORA
                            </button>
                        ) : (
                            <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-xl flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-500/20 p-2 rounded-lg"><MapPinIcon className="w-5 h-5 text-emerald-400" /></div>
                                    <div>
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Coordenadas Guardadas</p>
                                        <p className="text-xs text-slate-300 font-mono mt-0.5">{formData.latitud.slice(0,8)}, {formData.longitud.slice(0,9)}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={capturarUbicacion} className="text-[10px] text-emerald-400 underline p-2 font-bold uppercase">Actualizar</button>
                            </div>
                        )}
                    </div>

                </div>

                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f1014] via-[#0f1014] to-transparent z-30">
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/40 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-3">
                        {loading ? 'SINCRONIZANDO...' : 'FINALIZAR Y ACTIVAR'}
                        {!loading && <CheckCircleIcon className="w-6 h-6"/>}
                    </button>
                </div>
            </form>
        </div>
    );
}
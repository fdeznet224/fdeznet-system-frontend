import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, CheckCircleIcon, QrCodeIcon, 
    ClipboardDocumentIcon, ArrowPathIcon,
    ServerIcon, MapPinIcon, UserIcon, PhoneIcon,
    CalendarIcon, ShieldCheckIcon, BellAlertIcon,
    BanknotesIcon, WifiIcon, ChevronDownIcon,
    KeyIcon, CubeIcon, RocketLaunchIcon, 
    UserGroupIcon, GlobeAmericasIcon, CpuChipIcon,
    ArchiveBoxIcon
} from '@heroicons/react/24/outline';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    routers: any[];
}

export default function CreateClientModal({ isOpen, onClose, onSuccess, routers }: Props) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [activarAhora, setActivarAhora] = useState(false); 
    const [createdClient, setCreatedClient] = useState<{ nombre: string, cedula: string, hardware_id: string, id: number, user_pppoe?: string, pass_pppoe?: string, estado?: string } | null>(null);

    const [zonas, setZonas] = useState<any[]>([]);
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]);
    const [redes, setRedes] = useState<any[]>([]);
    const [ipsLibres, setIpsLibres] = useState<string[]>([]);
    const [naps, setNaps] = useState<any[]>([]);
    const [tecnicos, setTecnicos] = useState<any[]>([]);
    const [puertosOcupados, setPuertosOcupados] = useState<number[]>([]); 
    const [olts, setOlts] = useState<any[]>([]);
    const [inventarioDisponible, setInventarioDisponible] = useState<any[]>([]);

    const [selectedPlantilla, setSelectedPlantilla] = useState<any>(null);
    const [selectedRouter, setSelectedRouter] = useState<any>(null);

    const [formData, setFormData] = useState({
        nombre: '', telefono: '', direccion: '', 
        olt_id: '', onu_id: '', zona_id: '', plantilla_id: '', router_id: '', plan_id: '', red_id: '', 
        ip_asignada: '', user_pppoe: '', pass_pppoe: '',
        caja_nap_id: '', puerto_nap: '', tecnico_id: '', 
        latitud: '', longitud: '' 
    });

    useEffect(() => {
        if(isOpen) {
            setStep(1); setActivarAhora(false); 
            setFormData({
                nombre: '', telefono: '', direccion: '', olt_id: '', onu_id: '', zona_id: '',
                plantilla_id: '', router_id: '', plan_id: '', red_id: '', ip_asignada: '', user_pppoe: '', pass_pppoe: '',
                caja_nap_id: '', puerto_nap: '', tecnico_id: '', latitud: '', longitud: '' 
            });
            setSelectedPlantilla(null); setIpsLibres([]); setNaps([]); setPuertosOcupados([]);
            cargarCatalogosIniciales();
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.nombre && step < 4) {
            const nombreSinAcentos = formData.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
            const nombreLimpio = nombreSinAcentos.replace(/[^a-zA-Z0-9 ]/g, "");
            const usuarioFinal = nombreLimpio.trim().replace(/\s+/g, '_');
            setFormData(prev => ({ ...prev, user_pppoe: usuarioFinal }));
        }
    }, [formData.nombre, step]);

    useEffect(() => {
        if (formData.zona_id) {
            client.get(`/infraestructura/naps?zona_id=${formData.zona_id}`).then(res => setNaps(res.data)).catch(() => {});
        } else setNaps([]);
    }, [formData.zona_id]);

    useEffect(() => {
        if (formData.caja_nap_id) {
            client.get(`/infraestructura/naps/${formData.caja_nap_id}/detalles`).then(res => setPuertosOcupados(res.data.map((c: any) => c.puerto_nap))).catch(() => setPuertosOcupados([]));
        } else setPuertosOcupados([]);
    }, [formData.caja_nap_id]);

    const cargarCatalogosIniciales = async () => {
        try {
            const [resZonas, resPlantillas, resUsers, resOlts, resInventario] = await Promise.all([
                client.get('/zonas/'), client.get('/configuracion/plantillas-facturacion'), client.get('/usuarios/'), client.get('/olts/'), client.get('/inventario/?estado=DISPONIBLE')
            ]);
            setZonas(resZonas.data); setPlantillas(resPlantillas.data); setOlts(resOlts.data); setInventarioDisponible(resInventario.data); 
            setTecnicos(resUsers.data.filter((u: any) => u.rol === 'tecnico'));
        } catch (error) { toast.error("Error cargando catálogos"); }
    };

    const handlePlantillaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value);
        setFormData({ ...formData, plantilla_id: e.target.value });
        setSelectedPlantilla(plantillas.find(p => p.id === id) || null);
    };

    const handleRouterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const rId = e.target.value;
        setFormData(prev => ({ ...prev, router_id: rId, red_id: '', ip_asignada: '', plan_id: '' }));
        const routerObj = routers.find(r => r.id.toString() === rId);
        setSelectedRouter(routerObj || null);

        if (rId) {
            try {
                const [resRedes, resPlanes] = await Promise.all([ client.get(`/network/redes/router/${rId}`), client.get(`/planes/router/${rId}`) ]);
                setRedes(resRedes.data); setPlanes(resPlanes.data);
                if (routerObj?.tipo_seguridad === 'pppoe') {
                     try { const resDef = await client.get('/configuracion/pppoe-default'); setFormData(prev => ({ ...prev, pass_pppoe: resDef.data.password || '123456' })); } 
                     catch (err) { setFormData(prev => ({ ...prev, pass_pppoe: '123456' })); }
                }
            } catch (error) { toast.error("Error cargando router"); }
        } else { setRedes([]); setPlanes([]); }
    };

    const handleRedChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const netId = e.target.value;
        setFormData({ ...formData, red_id: netId, ip_asignada: '' });
        setIpsLibres([]);

        if (netId) {
            const t = toast.loading("Obteniendo IPs libres...");
            try {
                const res = await client.get(`/network/redes/${netId}/ips-libres`);
                setIpsLibres(res.data); 
                if (res.data.length > 0) setFormData(prev => ({ ...prev, red_id: netId, ip_asignada: res.data[0] }));
                toast.dismiss(t);
            } catch (error) { toast.dismiss(t); toast.error("Error obteniendo IPs"); }
        }
    };

    const handleObtenerUbicacion = () => {
        if (!navigator.geolocation) return toast.error("GPS no soportado");
        toast.loading("Buscando señal GPS...", { id: 'gps' });
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(prev => ({ ...prev, latitud: pos.coords.latitude.toString(), longitud: pos.coords.longitude.toString() }));
                toast.success("¡Ubicación capturada!", { id: 'gps' });
            },
            () => toast.error("Error GPS. Revisa permisos.", { id: 'gps' }),
            { enableHighAccuracy: true }
        );
    };

    const handleSubmit = async () => {
        setLoading(true);
        const t = toast.loading(activarAhora ? "Guardando y Activando..." : "Creando Orden...");
        
        try {
            const onuAsignada = inventarioDisponible.find(o => o.id.toString() === formData.onu_id);
            const payload = {
                ...formData,
                router_id: Number(formData.router_id), plan_id: Number(formData.plan_id),
                olt_id: formData.olt_id ? Number(formData.olt_id) : null, onu_id: formData.onu_id ? Number(formData.onu_id) : null,
                zona_id: formData.zona_id ? Number(formData.zona_id) : null, plantilla_id: formData.plantilla_id ? Number(formData.plantilla_id) : null,
                red_id: formData.red_id ? Number(formData.red_id) : null, caja_nap_id: formData.caja_nap_id ? Number(formData.caja_nap_id) : null,
                puerto_nap: formData.puerto_nap ? Number(formData.puerto_nap) : null, tecnico_id: formData.tecnico_id ? Number(formData.tecnico_id) : null,
                latitud: formData.latitud ? parseFloat(formData.latitud) : null, longitud: formData.longitud ? parseFloat(formData.longitud) : null,
                nombre: formData.nombre.trim(), user_pppoe: formData.user_pppoe?.trim() || null, pass_pppoe: formData.pass_pppoe?.trim() || null,
                estado: 'pendiente_instalacion'
            };

            const res = await client.post('/clientes/', payload);
            if (activarAhora) {
                toast.loading("Configurando Mikrotik...", { id: t });
                await client.post(`/clientes/${res.data.id}/completar-instalacion`, {
                    cedula: res.data.cedula || res.data.id.toString(), olt_id: payload.olt_id, onu_id: payload.onu_id,
                    router_id: payload.router_id, plan_id: payload.plan_id, user_pppoe: payload.user_pppoe, 
                    pass_pppoe: payload.pass_pppoe, caja_nap_id: payload.caja_nap_id, puerto_nap: payload.puerto_nap
                });
                toast.success("¡Cliente ACTIVADO!", { id: t });
            } else { toast.success("Orden Generada", { id: t }); }
            
            setCreatedClient({
                nombre: res.data.nombre, cedula: res.data.cedula || res.data.id.toString(), 
                hardware_id: onuAsignada ? onuAsignada.identificador : 'SIN ASIGNAR', 
                id: res.data.id, user_pppoe: formData.user_pppoe, pass_pppoe: formData.pass_pppoe,
                estado: activarAhora ? 'Activo' : 'Pendiente'
            });
            setStep(4); onSuccess();

        } catch (error: any) {
            toast.dismiss(t);
            toast.error(typeof error.response?.data?.detail === 'string' ? error.response.data.detail : "Verifica campos obligatorios");
        } finally { setLoading(false); }
    };

    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copiado"); };

    const renderPuertoOptions = () => {
        if (!formData.caja_nap_id) return null;
        const caja = naps.find(n => n.id === Number(formData.caja_nap_id));
        const capacidad = caja?.capacidad || 16;
        const options = [];
        for (let i = 1; i <= capacidad; i++) {
            const isTaken = puertosOcupados.includes(i);
            options.push(
                <option key={i} value={i} disabled={isTaken} className={isTaken ? 'text-rose-400 bg-slate-100 dark:bg-slate-900' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                    Puerto {i} {isTaken ? '(Ocupado)' : '(Libre)'}
                </option>
            );
        }
        return options;
    };

    const oltSeleccionada = olts.find(o => o.id === Number(formData.olt_id));
    const equiposCompatibles = oltSeleccionada ? inventarioDisponible.filter(eq => eq.tecnologia === oltSeleccionada.tecnologia) : inventarioDisponible;

    // Clases adaptativas reutilizables
    const inputClass = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 pl-11 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-700 text-sm";
    const labelClass = "text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block mb-1.5 transition-colors";

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => {}}>
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/90 backdrop-blur-sm transition-opacity" />
                <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-2 sm:p-4">
                    <Dialog.Panel className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[98vh] sm:max-h-[95vh] transition-colors">
                        
                        {/* HEADER */}
                        {step < 4 && (
                            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 transition-colors shrink-0">
                                <div className="flex justify-between items-center mb-6 sm:mb-8">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                                            <span className="w-2 h-5 sm:h-6 bg-blue-600 rounded-full"></span>
                                            Nuevo Cliente
                                        </h3>
                                    </div>
                                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white"><XMarkIcon className="w-6 h-6"/></button>
                                </div>
                                <div className="flex items-center justify-between px-2 sm:px-16 relative">
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -z-10 transition-colors"></div>
                                    <StepIndicator num={1} curr={step} label="Personal" />
                                    <StepIndicator num={2} curr={step} label="Cobro" />
                                    <StepIndicator num={3} curr={step} label="Conexión" />
                                </div>
                            </div>
                        )}

                        {/* BODY */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 custom-scrollbar transition-colors">
                            
                            {/* PASO 1 */}
                            {step === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-right-8">
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Zona / Colonia</label>
                                        <div className="relative">
                                            <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none"/>
                                            <select className={`${inputClass} border-l-4 border-l-indigo-500 appearance-none`} value={formData.zona_id} onChange={e => setFormData({...formData, zona_id: e.target.value})}>
                                                <option value="">Seleccionar Zona...</option>
                                                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Nombre Completo</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none"/>
                                            <input autoFocus className={inputClass} placeholder="Ej: Juan Pérez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Teléfono (WhatsApp)</label>
                                        <div className="relative">
                                            <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none"/>
                                            <input className={inputClass} placeholder="52..." value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className={labelClass}>Nodo OLT (Fibra)</label>
                                        <div className="relative">
                                            <CpuChipIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none"/>
                                            <select className={`${inputClass} appearance-none`} value={formData.olt_id} onChange={e => setFormData({...formData, olt_id: e.target.value, onu_id: ''})}>
                                                <option value="">Seleccionar OLT...</option>
                                                {olts.map(o => <option key={o.id} value={o.id}>{o.nombre} ({o.tecnologia})</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase ml-1 mb-1.5 flex items-center justify-between transition-colors">
                                            <span>Asignar Equipo (Bodega)</span>
                                            {equiposCompatibles.length > 0 && formData.olt_id && (
                                                <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
                                                    {equiposCompatibles.length} disponibles
                                                </span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <ArchiveBoxIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 pointer-events-none"/>
                                            <select className={`w-full bg-emerald-50/50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3 sm:p-3.5 pl-11 text-emerald-700 dark:text-emerald-400 font-mono font-bold uppercase tracking-widest outline-none focus:border-emerald-500 appearance-none disabled:opacity-50 transition-colors text-sm`} value={formData.onu_id} disabled={!formData.olt_id} onChange={e => setFormData({...formData, onu_id: e.target.value})} >
                                                <option value="">{!formData.olt_id ? "Selecciona OLT primero" : (equiposCompatibles.length === 0 ? "No hay stock compatible" : "Selecciona una ONU...")}</option>
                                                {equiposCompatibles.map(eq => <option key={eq.id} value={eq.id}>{eq.identificador} - {eq.modelo}</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500"/>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Dirección Exacta</label>
                                        <textarea className={`${inputClass} h-20 resize-none pt-3`} placeholder="Calle, Número, Color de casa..." value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
                                    </div>

                                    <div className="md:col-span-2 space-y-3 mt-2 p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1 flex items-center gap-1 transition-colors">
                                            <GlobeAmericasIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/> Coordenadas GPS
                                        </label>
                                        <button type="button" onClick={handleObtenerUbicacion} className="w-full bg-emerald-50 dark:bg-emerald-600/10 hover:bg-emerald-100 dark:hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/50 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                            <MapPinIcon className="w-5 h-5"/> CAPTURAR GPS ACTUAL
                                        </button>
                                        <div className="flex gap-3">
                                            <input type="text" placeholder="Latitud" value={formData.latitud} onChange={(e) => setFormData({...formData, latitud: e.target.value})} className="w-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-mono text-center outline-none focus:border-blue-500 transition-colors" />
                                            <input type="text" placeholder="Longitud" value={formData.longitud} onChange={(e) => setFormData({...formData, longitud: e.target.value})} className="w-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-mono text-center outline-none focus:border-blue-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PASO 2 */}
                            {step === 2 && (
                                <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-right-8">
                                    <div>
                                        <label className="text-sm font-black text-slate-900 dark:text-white mb-2 block transition-colors">Perfil de Facturación</label>
                                        <div className="relative">
                                            <BanknotesIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-500 pointer-events-none"/>
                                            <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 pl-14 text-slate-900 dark:text-white font-black text-base sm:text-lg outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer" value={formData.plantilla_id} onChange={handlePlantillaChange}>
                                                <option value="">Seleccionar Perfil...</option>
                                                {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                        <InfoCard icon={CalendarIcon} label="Día Pago" value={selectedPlantilla ? `Día ${selectedPlantilla.dia_pago}` : '--'} color="text-indigo-600 dark:text-indigo-400" />
                                        <InfoCard icon={ShieldCheckIcon} label="Tolerancia" value={selectedPlantilla ? `${selectedPlantilla.dias_tolerancia} Días` : '--'} color="text-emerald-600 dark:text-emerald-400" />
                                        <InfoCard icon={BellAlertIcon} label="Aviso" value={selectedPlantilla ? `${selectedPlantilla.dias_antes_emision} días` : '--'} color="text-amber-600 dark:text-amber-400" />
                                        <InfoCard icon={PhoneIcon} label="Medio" value={selectedPlantilla?.recordatorio_whatsapp ? 'WhatsApp' : 'Email'} color="text-blue-600 dark:text-blue-400" />
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                                        <label className={labelClass}>Asignar Técnico Instalador</label>
                                        <div className="relative">
                                            <UserGroupIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none"/>
                                            <select className={`${inputClass} appearance-none font-bold`} value={formData.tecnico_id} onChange={e => setFormData({...formData, tecnico_id: e.target.value})}>
                                                <option value="">-- Sin asignar (Pool) --</option>
                                                {tecnicos.map(t => <option key={t.id} value={t.id}>Técnico: {t.nombre_completo || t.usuario}</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PASO 3 */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div>
                                            <label className={labelClass}>Nodo / Router</label>
                                            <div className="relative">
                                                <ServerIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none"/>
                                                <select className={`${inputClass} appearance-none`} value={formData.router_id} onChange={handleRouterChange}>
                                                    <option value="">Seleccionar Router...</option>
                                                    {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Plan de Internet</label>
                                            <div className="relative">
                                                <WifiIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none"/>
                                                <select className={`${inputClass} appearance-none`} value={formData.plan_id} onChange={e => setFormData({...formData, plan_id: e.target.value})}>
                                                    <option value="">Seleccionar Velocidad...</option>
                                                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 sm:p-5 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 space-y-4 transition-colors">
                                        <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                            <CubeIcon className="w-4 h-4" /> Conexión Física (FTTH)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>Caja NAP</label>
                                                <select className={`${inputClass} bg-white dark:bg-slate-950 border-indigo-200 dark:border-slate-700 appearance-none disabled:opacity-50`} value={formData.caja_nap_id} onChange={e => setFormData({...formData, caja_nap_id: e.target.value, puerto_nap: ''})} disabled={!formData.zona_id}>
                                                    <option value="">{formData.zona_id ? (naps.length ? "Seleccionar NAP..." : "Sin NAPs en zona") : "Elige Zona primero"}</option>
                                                    {naps.map(n => <option key={n.id} value={n.id}>{n.nombre} ({n.puertos_libres} libres)</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Puerto Asignado</label>
                                                <select className={`${inputClass} bg-white dark:bg-slate-950 border-indigo-200 dark:border-slate-700 appearance-none disabled:opacity-50 font-bold`} value={formData.puerto_nap} onChange={e => setFormData({...formData, puerto_nap: e.target.value})} disabled={!formData.caja_nap_id}>
                                                    <option value="">Seleccionar Puerto...</option>
                                                    {renderPuertoOptions()}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>Red (Segmento)</label>
                                                <select className={`${inputClass} bg-white dark:bg-slate-950 appearance-none`} value={formData.red_id} onChange={handleRedChange} disabled={!formData.router_id}>
                                                    <option value="">Elegir Segmento...</option>
                                                    {redes.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.cidr})</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-500 mb-1 ml-1 tracking-widest">IP Asignada</label>
                                                <div className="relative">
                                                    <GlobeAmericasIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 pointer-events-none"/>
                                                    <select className={`${inputClass} border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono font-bold appearance-none`} value={formData.ip_asignada} onChange={e => setFormData({...formData, ip_asignada: e.target.value})} disabled={ipsLibres.length === 0}>
                                                        {ipsLibres.length === 0 ? <option>Sugerida...</option> : null}
                                                        {ipsLibres.map(ip => <option key={ip} value={ip}>{ip}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedRouter?.tipo_seguridad === 'pppoe' && (
                                        <div className="p-4 sm:p-5 bg-blue-50 dark:bg-blue-600/5 rounded-2xl border border-blue-100 dark:border-blue-500/20 grid grid-cols-1 sm:grid-cols-2 gap-4 transition-colors">
                                            <div>
                                                <label className="block text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 mb-1 ml-1 tracking-widest">User PPPoE</label>
                                                <div className="relative">
                                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none"/>
                                                    <input className={`${inputClass} bg-white dark:bg-slate-950 font-mono`} value={formData.user_pppoe} onChange={e => setFormData({...formData, user_pppoe: e.target.value})} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 mb-1 ml-1 tracking-widest">Clave</label>
                                                <div className="relative">
                                                    <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none"/>
                                                    <input className={`${inputClass} bg-white dark:bg-slate-950 font-mono`} value={formData.pass_pppoe} onChange={e => setFormData({...formData, pass_pppoe: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Selector */}
                                    <div className="p-4 sm:p-6 bg-slate-100 dark:bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl border border-slate-200 dark:border-blue-500/30 mt-4 transition-colors">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2"><RocketLaunchIcon className="w-5 h-5 text-blue-600 dark:text-blue-400"/> Acción de Finalización</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div onClick={() => setActivarAhora(false)} className={`cursor-pointer p-4 rounded-xl border flex items-start gap-3 transition-all ${!activarAhora ? 'bg-white dark:bg-slate-800 border-blue-500 ring-2 ring-blue-500/50 shadow-md' : 'bg-transparent border-slate-300 dark:border-slate-800 opacity-60 hover:opacity-100'}`}>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${!activarAhora ? 'border-blue-600 dark:border-blue-500' : 'border-slate-400 dark:border-slate-500'}`}>
                                                    {!activarAhora && <div className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rounded-full"/>}
                                                </div>
                                                <div><span className="block text-sm font-black text-slate-900 dark:text-white">Solo Crear Orden</span><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Guarda datos. Activa después.</span></div>
                                            </div>
                                            <div onClick={() => setActivarAhora(true)} className={`cursor-pointer p-4 rounded-xl border flex items-start gap-3 transition-all ${activarAhora ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 ring-2 ring-emerald-500/50 shadow-md' : 'bg-transparent border-slate-300 dark:border-slate-800 opacity-60 hover:opacity-100'}`}>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${activarAhora ? 'border-emerald-600 dark:border-emerald-500' : 'border-slate-400 dark:border-slate-500'}`}>
                                                    {activarAhora && <div className="w-2.5 h-2.5 bg-emerald-600 dark:bg-emerald-500 rounded-full"/>}
                                                </div>
                                                <div><span className="block text-sm font-black text-slate-900 dark:text-white">Activar AHORA</span><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Configura Mikrotik ya mismo.</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PASO 4: RESULTADO */}
                            {step === 4 && createdClient && (
                                <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 py-6">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ring-1 transition-colors ${createdClient.estado === 'Activo' ? 'bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/30' : 'bg-blue-50 dark:bg-blue-500/10 ring-blue-200 dark:ring-blue-500/30'}`}>
                                        {createdClient.estado === 'Activo' ? <RocketLaunchIcon className="w-12 h-12 text-emerald-600 dark:text-emerald-500"/> : <CheckCircleIcon className="w-12 h-12 text-blue-600 dark:text-blue-500"/>}
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 transition-colors">{createdClient.estado === 'Activo' ? "¡Servicio Activo!" : "¡Orden Creada!"}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm transition-colors">{createdClient.estado === 'Activo' ? `El cliente ${createdClient.nombre} ya tiene servicio.` : `La orden para ${createdClient.nombre} está lista.`}</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 transition-colors">
                                            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-1">
                                                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg"><QrCodeIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400"/></div>
                                                <div className="text-left"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificador</p><p className="text-slate-900 dark:text-white font-black text-sm">Cédula del Cliente</p></div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg flex justify-center items-center"><span className="text-3xl sm:text-4xl text-emerald-600 dark:text-emerald-400 font-mono font-black tracking-widest select-all">{createdClient.cedula}</span></div>
                                            <p className="text-[10px] text-slate-500 font-bold text-center mt-1 uppercase tracking-widest">Hardware ID: <span className="font-black text-slate-700 dark:text-slate-300">{createdClient.hardware_id}</span></p>
                                            <button onClick={() => copyToClipboard(createdClient.cedula)} className="w-full mt-auto py-3 bg-emerald-100 dark:bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl font-black text-xs transition uppercase tracking-widest">COPIAR ID</button>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 transition-colors">
                                            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-1">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-600/20 rounded-lg"><KeyIcon className="w-6 h-6 text-blue-600 dark:text-blue-400"/></div>
                                                <div className="text-left"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acceso PPPoE</p><p className="text-slate-900 dark:text-white font-black text-sm">Credenciales Router</p></div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800"><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Usuario:</span><span className="text-sm font-mono text-slate-900 dark:text-white select-all font-black">{createdClient.user_pppoe || 'N/A'}</span></div>
                                                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800"><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Clave:</span><span className="text-sm font-mono text-slate-900 dark:text-white select-all font-black">{createdClient.pass_pppoe || 'N/A'}</span></div>
                                            </div>
                                            <button onClick={() => copyToClipboard(`PPPoE\nUser: ${createdClient.user_pppoe}\nPass: ${createdClient.pass_pppoe}`)} className="w-full mt-auto py-3 bg-blue-100 dark:bg-blue-600/10 text-blue-700 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl font-black text-xs transition uppercase tracking-widest">COPIAR DATOS</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 shrink-0 transition-colors">
                            {step < 4 ? (
                                <>
                                    <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()} className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl font-black text-sm uppercase tracking-widest transition-colors border border-slate-200 dark:border-slate-800">
                                        {step === 1 ? 'Cancelar' : 'Atrás'}
                                    </button>
                                    
                                    <button 
                                        onClick={step === 3 ? handleSubmit : () => setStep(s => s + 1)} 
                                        disabled={loading || (step===1 && !formData.nombre) || (step===2 && !formData.plantilla_id) || (step===3 && (!formData.router_id || !formData.ip_asignada))}
                                        className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest text-sm ${activarAhora && step === 3 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                                    >
                                        {loading && <ArrowPathIcon className="w-5 h-5 animate-spin"/>}
                                        {step === 3 ? (activarAhora ? 'INSTALAR Y ACTIVAR' : 'Siguiente') : 'Siguiente'}
                                    </button>
                                </>
                            ) : (
                                <button onClick={onClose} className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black uppercase tracking-widest text-sm transition-colors border border-slate-200 dark:border-slate-700">
                                    Cerrar Ventana
                                </button>
                            )}
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </Transition>
    );
}

const StepIndicator = ({ num, curr, label }: any) => (
    <div className={`flex flex-col items-center z-10 relative transition-colors ${curr >= num ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}`}>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-xs sm:text-sm mb-1 sm:mb-2 transition-all duration-300 border-2 ${curr >= num ? 'bg-white dark:bg-slate-900 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            {curr > num ? <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6"/> : num}
        </div>
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
);

const InfoCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="p-3 sm:p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl flex flex-col justify-center items-start gap-1 transition-colors">
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color} mb-1 opacity-80`}/>
        <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{label}</span>
        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate w-full transition-colors">{value}</span>
    </div>
);
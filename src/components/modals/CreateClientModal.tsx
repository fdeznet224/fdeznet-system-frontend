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
    ArchiveBoxIcon, ArrowRightIcon, ArrowLeftIcon
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
            setStep(1); 
            setActivarAhora(false);
            setCreatedClient(null);

            setFormData({
                nombre: '', telefono: '', direccion: '', olt_id: '', onu_id: '', zona_id: '',
                plantilla_id: '', router_id: '', plan_id: '', red_id: '', ip_asignada: '', user_pppoe: '', pass_pppoe: '',
                caja_nap_id: '', puerto_nap: '', tecnico_id: '', latitud: '', longitud: '' 
            });

            setSelectedPlantilla(null); 
            setSelectedRouter(null);
            setIpsLibres([]); 
            setNaps([]); 
            setPuertosOcupados([]);

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
                client.get('/zonas/'), 
                client.get('/configuracion/plantillas-facturacion'), 
                client.get('/usuarios/'), 
                client.get('/olts/'), 
                client.get('/inventario/?estado=DISPONIBLE')
            ]);

            setZonas(resZonas.data); 
            setPlantillas(resPlantillas.data); 
            setOlts(resOlts.data); 
            setInventarioDisponible(resInventario.data); 
            setTecnicos(resUsers.data.filter((u: any) => u.rol === 'tecnico'));
        } catch (error) { 
            toast.error("Error cargando catálogos"); 
        }
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
                const [resRedes, resPlanes] = await Promise.all([ 
                    client.get(`/network/redes/router/${rId}`), 
                    client.get(`/planes/router/${rId}`) 
                ]);

                setRedes(resRedes.data); 
                setPlanes(resPlanes.data);

                if (routerObj?.tipo_seguridad === 'pppoe') {
                    try { 
                        const resDef = await client.get('/configuracion/pppoe-default'); 
                        setFormData(prev => ({ ...prev, pass_pppoe: resDef.data.password || '123456' })); 
                    } catch (err) { 
                        setFormData(prev => ({ ...prev, pass_pppoe: '123456' })); 
                    }
                }
            } catch (error) { 
                toast.error("Error cargando router"); 
            }
        } else { 
            setRedes([]); 
            setPlanes([]); 
        }
    };

    const handleRedChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const netId = e.target.value;
        setFormData({ ...formData, red_id: netId, ip_asignada: '' });
        setIpsLibres([]);

        if (netId) {
            const t = toast.loading("Buscando IPs libres...");
            try {
                const res = await client.get(`/network/redes/${netId}/ips-libres`);
                setIpsLibres(res.data); 
                if (res.data.length > 0) setFormData(prev => ({ ...prev, red_id: netId, ip_asignada: res.data[0] }));
                toast.dismiss(t);
            } catch (error) { 
                toast.dismiss(t); 
                toast.error("Error obteniendo IPs"); 
            }
        }
    };

    const handleObtenerUbicacion = () => {
        if (!navigator.geolocation) return toast.error("GPS no soportado");
        toast.loading("Capturando GPS...", { id: 'gps' });
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(prev => ({ ...prev, latitud: pos.coords.latitude.toString(), longitud: pos.coords.longitude.toString() }));
                toast.success("¡Ubicación lista!", { id: 'gps' });
            },
            () => toast.error("Error GPS. Activa permisos.", { id: 'gps' }),
            { enableHighAccuracy: true }
        );
    };

    const handleSubmit = async () => {
        setLoading(true);
        const t = toast.loading(activarAhora ? "Configurando MikroTik..." : "Creando Orden...");
        
        try {
            const onuAsignada = inventarioDisponible.find(o => o.id.toString() === formData.onu_id);

            const payload = {
                ...formData,
                router_id: Number(formData.router_id), 
                plan_id: Number(formData.plan_id),
                olt_id: formData.olt_id ? Number(formData.olt_id) : null, 
                onu_id: formData.onu_id ? Number(formData.onu_id) : null,
                zona_id: formData.zona_id ? Number(formData.zona_id) : null, 
                plantilla_id: formData.plantilla_id ? Number(formData.plantilla_id) : null,
                red_id: formData.red_id ? Number(formData.red_id) : null, 
                caja_nap_id: formData.caja_nap_id ? Number(formData.caja_nap_id) : null,
                puerto_nap: formData.puerto_nap ? Number(formData.puerto_nap) : null, 
                tecnico_id: formData.tecnico_id ? Number(formData.tecnico_id) : null,
                latitud: formData.latitud ? parseFloat(formData.latitud) : null, 
                longitud: formData.longitud ? parseFloat(formData.longitud) : null,
                nombre: formData.nombre.trim(), 
                user_pppoe: formData.user_pppoe?.trim() || null, 
                pass_pppoe: formData.pass_pppoe?.trim() || null,
                estado: 'pendiente_instalacion'
            };

            const res = await client.post('/clientes/', payload);

            let datosCliente = res.data;

            if (activarAhora) {
                const resActivacion = await client.post(`/clientes/${res.data.id}/completar-instalacion`, {
                    cedula: res.data.cedula || res.data.id.toString(), 
                    olt_id: payload.olt_id, 
                    onu_id: payload.onu_id,
                    router_id: payload.router_id, 
                    plan_id: payload.plan_id, 
                    user_pppoe: payload.user_pppoe, 
                    pass_pppoe: payload.pass_pppoe, 
                    caja_nap_id: payload.caja_nap_id, 
                    puerto_nap: payload.puerto_nap
                });

                datosCliente = resActivacion.data?.cliente || resActivacion.data || res.data;

                toast.success("¡Cliente ACTIVADO!", { id: t });
            } else { 
                toast.success("Orden Generada", { id: t }); 
            }
            
            setCreatedClient({
                nombre: datosCliente.nombre || payload.nombre, 
                cedula: datosCliente.cedula || res.data.cedula || res.data.id.toString(), 
                hardware_id: onuAsignada ? onuAsignada.identificador : 'SIN ASIGNAR', 
                id: datosCliente.id || res.data.id, 
                user_pppoe: datosCliente.user_pppoe || payload.user_pppoe || undefined, 
                pass_pppoe: datosCliente.pass_pppoe || payload.pass_pppoe || undefined,
                estado: activarAhora ? 'Activo' : 'Pendiente'
            });

            setStep(4);

        } catch (error: any) {
            toast.dismiss(t);
            toast.error(typeof error.response?.data?.detail === 'string' ? error.response.data.detail : "Verifica campos obligatorios");
        } finally { 
            setLoading(false); 
        }
    };

    const copyToClipboard = (text: string) => { 
        navigator.clipboard.writeText(text); 
        toast.success("Copiado al portapapeles"); 
    };

    const renderPuertoOptions = () => {
        if (!formData.caja_nap_id) return null;
        const caja = naps.find(n => n.id === Number(formData.caja_nap_id));
        const capacidad = caja?.capacidad || 16;
        const options = [];

        for (let i = 1; i <= capacidad; i++) {
            const isTaken = puertosOcupados.includes(i);
            options.push(
                <option key={i} value={i} disabled={isTaken} className={isTaken ? 'text-rose-400 bg-slate-100 dark:bg-slate-900' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                    Puerto {i} {isTaken ? '(Ocupado)' : ''}
                </option>
            );
        }

        return options;
    };

    const oltSeleccionada = olts.find(o => o.id === Number(formData.olt_id));
    const equiposCompatibles = oltSeleccionada ? inventarioDisponible.filter(eq => eq.tecnologia === oltSeleccionada.tecnologia) : inventarioDisponible;

    const flatInputClass = "w-full bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-[13px] sm:text-sm rounded-2xl focus:ring-2 focus:ring-blue-500 block p-4 pl-12 outline-none transition-all duration-200 placeholder:text-slate-400 border border-transparent appearance-none";
    const disabledInputClass = "w-full bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-500 text-[13px] sm:text-sm rounded-2xl block p-4 pl-12 outline-none cursor-not-allowed border border-transparent appearance-none";
    const labelClass = "block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 pl-1 uppercase tracking-widest";

    const renderProgress = () => {
        const totalSteps = 3;
        const progress = Math.min((step / totalSteps) * 100, 100);
        return (
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-5">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
        );
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => {}}>
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md transition-opacity" />
                
                <div className="fixed inset-0 overflow-hidden flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <Dialog.Panel className="w-full h-[96dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-3xl bg-[#f8fafc] dark:bg-[#0a0c10] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300">
                        
                        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

                        {step < 4 && (
                            <div className="px-5 sm:px-8 pt-2 sm:pt-6 pb-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-[#f8fafc] dark:bg-[#0a0c10] z-10 shrink-0">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        Alta de Cliente
                                    </h3>
                                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full active:scale-95 transition-all"><XMarkIcon className="w-5 h-5"/></button>
                                </div>
                                {renderProgress()}
                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                    <span className={step === 1 ? "text-blue-600 dark:text-blue-400" : ""}>1. Datos</span>
                                    <span className={step === 2 ? "text-blue-600 dark:text-blue-400" : ""}>2. Cobro</span>
                                    <span className={step === 3 ? "text-blue-600 dark:text-blue-400" : ""}>3. Red</span>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar pb-32 sm:pb-32">
                            
                            {step === 1 && (
                                <div className="space-y-5 sm:space-y-6 animate-in slide-in-from-right-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className={labelClass}>Zona / Colonia</label>
                                            <div className="relative">
                                                <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none"/>
                                                <select className={flatInputClass} value={formData.zona_id} onChange={e => setFormData({...formData, zona_id: e.target.value})}>
                                                    <option value="">Seleccionar Zona...</option>
                                                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                                </select>
                                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className={labelClass}>Nombre Completo</label>
                                            <div className="relative">
                                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"/>
                                                <input autoFocus className={flatInputClass} placeholder="Ej: Juan Pérez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>WhatsApp / Celular</label>
                                            <div className="relative">
                                                <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"/>
                                                <input className={flatInputClass} placeholder="Ej: 961 123 4567" type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className={labelClass}>OLT Base (Opcional por ahora)</label>
                                            <div className="relative">
                                                <CpuChipIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none"/>
                                                <select className={flatInputClass} value={formData.olt_id} onChange={e => setFormData({...formData, olt_id: e.target.value, onu_id: ''})}>
                                                    <option value="">No asignar Aún...</option>
                                                    {olts.map(o => <option key={o.id} value={o.id}>{o.nombre} ({o.tecnologia})</option>)}
                                                </select>
                                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-[#12141a] p-4 sm:p-5 rounded-[1.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4">
                                        <div>
                                            <label className={labelClass}>Dirección Exacta</label>
                                            <textarea className={`${flatInputClass} pl-4 h-20 resize-none`} placeholder="Referencia, calle, número..." value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
                                        </div>
                                        
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><GlobeAmericasIcon className="w-4 h-4"/> Coordenadas de Instalación</label>
                                                <button type="button" onClick={handleObtenerUbicacion} className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform"><MapPinIcon className="w-4 h-4"/> Usar Mi GPS</button>
                                            </div>
                                            <div className="flex gap-3">
                                                <input type="text" placeholder="Latitud" value={formData.latitud} onChange={(e) => setFormData({...formData, latitud: e.target.value})} className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[13px] font-mono outline-none focus:border-blue-500" />
                                                <input type="text" placeholder="Longitud" value={formData.longitud} onChange={(e) => setFormData({...formData, longitud: e.target.value})} className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[13px] font-mono outline-none focus:border-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-right-4">
                                    <div className="bg-white dark:bg-[#12141a] p-4 sm:p-5 rounded-[1.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm">
                                        <label className={labelClass}>Ciclo de Facturación</label>
                                        <div className="relative mb-5">
                                            <BanknotesIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none"/>
                                            <select className={flatInputClass} value={formData.plantilla_id} onChange={handlePlantillaChange}>
                                                <option value="">Elegir Perfil de Cobro...</option>
                                                {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <InfoCard icon={CalendarIcon} label="Día Pago" value={selectedPlantilla ? `Día ${selectedPlantilla.dia_pago}` : '--'} color="text-indigo-500" />
                                            <InfoCard icon={ShieldCheckIcon} label="Tolerancia" value={selectedPlantilla ? `${selectedPlantilla.dias_tolerancia} Días` : '--'} color="text-emerald-500" />
                                            <InfoCard icon={BellAlertIcon} label="Avisos" value={selectedPlantilla ? `A los ${selectedPlantilla.dias_antes_emision} días` : '--'} color="text-amber-500" />
                                            <InfoCard icon={PhoneIcon} label="WhatsApp" value={selectedPlantilla?.recordatorio_whatsapp ? 'Activado' : 'Inactivo'} color="text-blue-500" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Designar Técnico de Instalación</label>
                                        <div className="relative">
                                            <UserGroupIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none"/>
                                            <select className={flatInputClass} value={formData.tecnico_id} onChange={e => setFormData({...formData, tecnico_id: e.target.value})}>
                                                <option value="">Dejar pendiente (Cualquiera)</option>
                                                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo || t.usuario}</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Router / Servidor</label>
                                            <div className="relative">
                                                <ServerIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"/>
                                                <select className={flatInputClass} value={formData.router_id} onChange={handleRouterChange}>
                                                    <option value="">Seleccionar Router...</option>
                                                    {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                                </select>
                                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Plan Contratado</label>
                                            <div className="relative">
                                                <WifiIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"/>
                                                <select className={flatInputClass} value={formData.plan_id} onChange={e => setFormData({...formData, plan_id: e.target.value})}>
                                                    <option value="">Seleccionar Velocidad...</option>
                                                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                </select>
                                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-[#12141a] p-4 sm:p-5 rounded-[1.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>Segmento Red</label>
                                                <select className={`${flatInputClass} pl-4`} value={formData.red_id} onChange={handleRedChange} disabled={!formData.router_id}>
                                                    <option value="">Elegir Segmento...</option>
                                                    {redes.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.cidr})</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>IP Sugerida</label>
                                                <div className="relative">
                                                    <GlobeAmericasIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 pointer-events-none"/>
                                                    <select className={`${formData.ip_asignada ? flatInputClass : disabledInputClass} text-emerald-600 dark:text-emerald-400 font-mono`} value={formData.ip_asignada} onChange={e => setFormData({...formData, ip_asignada: e.target.value})} disabled={ipsLibres.length === 0}>
                                                        {ipsLibres.length === 0 && <option>Esperando red...</option>}
                                                        {ipsLibres.map(ip => <option key={ip} value={ip}>{ip}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedRouter?.tipo_seguridad === 'pppoe' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <label className={labelClass}>User PPPoE</label>
                                                    <div className="relative">
                                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none"/>
                                                        <input className={`${flatInputClass} font-mono`} value={formData.user_pppoe} onChange={e => setFormData({...formData, user_pppoe: e.target.value})} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Password PPPoE</label>
                                                    <div className="relative">
                                                        <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none"/>
                                                        <input className={`${flatInputClass} font-mono`} value={formData.pass_pppoe} onChange={e => setFormData({...formData, pass_pppoe: e.target.value})} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 sm:p-5 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-800/30">
                                        <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                            <CubeIcon className="w-4 h-4" /> Asignación FTTH (Opcional)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>Caja NAP</label>
                                                <select className={`${formData.zona_id ? flatInputClass : disabledInputClass} bg-white dark:bg-slate-900 pl-4`} value={formData.caja_nap_id} onChange={e => setFormData({...formData, caja_nap_id: e.target.value, puerto_nap: ''})} disabled={!formData.zona_id}>
                                                    <option value="">{formData.zona_id ? (naps.length ? "Seleccionar NAP..." : "Sin NAPs en zona") : "Elige Zona al inicio"}</option>
                                                    {naps.map(n => <option key={n.id} value={n.id}>{n.nombre} ({n.puertos_libres} libres)</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Puerto</label>
                                                <select className={`${formData.caja_nap_id ? flatInputClass : disabledInputClass} bg-white dark:bg-slate-900 pl-4`} value={formData.puerto_nap} onChange={e => setFormData({...formData, puerto_nap: e.target.value})} disabled={!formData.caja_nap_id}>
                                                    <option value="">Seleccionar Puerto...</option>
                                                    {renderPuertoOptions()}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <label className={labelClass}>Decisión Final</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div onClick={() => setActivarAhora(false)} className={`cursor-pointer p-5 rounded-[1.5rem] border transition-all ${!activarAhora ? 'bg-white dark:bg-slate-900 border-blue-500 ring-4 ring-blue-500/10 shadow-sm' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`p-2 rounded-xl ${!activarAhora ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}><ArchiveBoxIcon className="w-5 h-5"/></div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!activarAhora ? 'border-blue-500' : 'border-slate-300 dark:border-slate-700'}`}>{!activarAhora && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"/>}</div>
                                                </div>
                                                <span className="block text-sm font-black text-slate-900 dark:text-white">Solo Orden</span>
                                                <span className="text-[10px] font-bold text-slate-500">Guardar datos e instalar después.</span>
                                            </div>
                                            
                                            <div onClick={() => setActivarAhora(true)} className={`cursor-pointer p-5 rounded-[1.5rem] border transition-all ${activarAhora ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-500 ring-4 ring-emerald-500/10 shadow-sm' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`p-2 rounded-xl ${activarAhora ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}><RocketLaunchIcon className="w-5 h-5"/></div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${activarAhora ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-700'}`}>{activarAhora && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"/>}</div>
                                                </div>
                                                <span className="block text-sm font-black text-slate-900 dark:text-white">Activar Ahora</span>
                                                <span className="text-[10px] font-bold text-slate-500">Manda IP/PPPoE al Mikrotik ya mismo.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 4 && createdClient && (
                                <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 py-6 sm:py-10">
                                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl ${createdClient.estado === 'Activo' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'}`}>
                                        {createdClient.estado === 'Activo' ? <RocketLaunchIcon className="w-12 h-12 text-white"/> : <CheckCircleIcon className="w-12 h-12 text-white"/>}
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">{createdClient.estado === 'Activo' ? "¡Cliente en Línea!" : "¡Orden Lista!"}</h2>
                                    <p className="text-sm text-slate-500 mb-8 max-w-sm">{createdClient.estado === 'Activo' ? `La conexión de ${createdClient.nombre} fue activada exitosamente.` : `La instalación de ${createdClient.nombre} está pendiente.`}</p>

                                    <div className="w-full max-w-md bg-white dark:bg-[#12141a] rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden text-left">
                                        <div className="p-6 border-b border-dashed border-slate-200 dark:border-slate-800">
                                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Cédula de Identidad</p>
                                            <div className="flex justify-between items-center">
                                                <p className="text-2xl font-black font-mono text-slate-800 dark:text-slate-200 select-all">{createdClient.cedula}</p>
                                                <button onClick={() => copyToClipboard(createdClient.cedula)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:text-blue-500"><ClipboardDocumentIcon className="w-5 h-5"/></button>
                                            </div>
                                        </div>

                                        {(createdClient.user_pppoe && createdClient.user_pppoe !== 'N/A') && (
                                            <div className="p-6 bg-slate-50 dark:bg-slate-900/30 space-y-4">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2"><KeyIcon className="w-4 h-4"/> Credenciales PPPoE</h4>
                                                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center group">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Usuario</p>
                                                        <p className="font-mono font-black text-sm text-slate-800 dark:text-slate-200 select-all">{createdClient.user_pppoe}</p>
                                                    </div>
                                                    <button onClick={() => copyToClipboard(createdClient.user_pppoe!)} className="p-2 text-slate-300 hover:text-blue-500"><ClipboardDocumentIcon className="w-4 h-4"/></button>
                                                </div>
                                                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center group">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Contraseña</p>
                                                        <p className="font-mono font-black text-sm text-slate-800 dark:text-slate-200 select-all">{createdClient.pass_pppoe}</p>
                                                    </div>
                                                    <button onClick={() => copyToClipboard(createdClient.pass_pppoe!)} className="p-2 text-slate-300 hover:text-blue-500"><ClipboardDocumentIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {step < 4 ? (
                            <div className="absolute bottom-0 left-0 w-full bg-white/80 dark:bg-[#0a0c10]/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 p-4 sm:px-8 sm:py-5 flex justify-between gap-3 shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
                                <button 
                                    onClick={() => step > 1 ? setStep(s => s - 1) : onClose()} 
                                    className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    {step === 1 ? 'Cancelar' : <><ArrowLeftIcon className="w-4 h-4"/> Atrás</>}
                                </button>
                                
                                <button 
                                    onClick={step === 3 ? handleSubmit : () => setStep(s => s + 1)} 
                                    disabled={loading || (step===1 && !formData.nombre) || (step===2 && !formData.plantilla_id) || (step===3 && (!formData.router_id || !formData.ip_asignada))}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-[11px] text-white ${activarAhora && step === 3 ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500'}`}
                                >
                                    {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : (step === 3 ? (activarAhora ? 'ACTIVAR AHORA' : 'FINALIZAR ORDEN') : <span className="flex items-center gap-2">Siguiente <ArrowRightIcon className="w-4 h-4"/></span>)}
                                </button>
                            </div>
                        ) : (
                            <div className="absolute bottom-0 left-0 w-full bg-white/80 dark:bg-[#0a0c10]/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 p-4 sm:p-6">
                                <button 
                                    onClick={() => {
                                        onSuccess();
                                        onClose();
                                    }} 
                                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[11px] active:scale-95 transition-transform"
                                >
                                    Cerrar y Volver a Lista
                                </button>
                            </div>
                        )}
                    </Dialog.Panel>
                </div>
            </Dialog>
        </Transition>
    );
}

const InfoCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-[1.25rem] flex flex-col justify-center items-start gap-1">
        <Icon className={`w-5 h-5 ${color} mb-1 opacity-80`}/>
        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{label}</span>
        <span className="text-[13px] font-black text-slate-800 dark:text-slate-200 truncate w-full">{value}</span>
    </div>
);
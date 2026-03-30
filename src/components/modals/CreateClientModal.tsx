import { Fragment, useState, useEffect } from 'react';
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
    UserGroupIcon, GlobeAmericasIcon
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
    
    // Switch Híbrido: True = Activar en Mikrotik ya. False = Solo crear orden pendiente.
    const [activarAhora, setActivarAhora] = useState(false); 
    
    const [createdClient, setCreatedClient] = useState<{ nombre: string, sn: string, id: number, user_pppoe?: string, pass_pppoe?: string, estado?: string } | null>(null);

    // --- CATÁLOGOS ---
    const [zonas, setZonas] = useState<any[]>([]);
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]);
    const [redes, setRedes] = useState<any[]>([]);
    const [ipsLibres, setIpsLibres] = useState<string[]>([]);
    const [naps, setNaps] = useState<any[]>([]);
    const [tecnicos, setTecnicos] = useState<any[]>([]);
    const [puertosOcupados, setPuertosOcupados] = useState<number[]>([]);

    const [selectedPlantilla, setSelectedPlantilla] = useState<any>(null);
    const [selectedRouter, setSelectedRouter] = useState<any>(null);

    // --- DATOS DEL FORMULARIO ---
    const [formData, setFormData] = useState({
        nombre: '', telefono: '', direccion: '', 
        cedula: '', // Serial Number (SN)
        zona_id: '',
        plantilla_id: '', router_id: '', plan_id: '', red_id: '', 
        ip_asignada: '', user_pppoe: '', pass_pppoe: '', mac_address: '',
        caja_nap_id: '', puerto_nap: '',
        tecnico_id: '', // Asignación de Técnico
        latitud: '', longitud: '' // Coordenadas GPS
    });

    useEffect(() => {
        if(isOpen) {
            setStep(1);
            setActivarAhora(false); // Por defecto solo crea la orden
            setFormData({
                nombre: '', telefono: '', direccion: '', cedula: '', zona_id: '',
                plantilla_id: '', router_id: '', plan_id: '', red_id: '', 
                ip_asignada: '', user_pppoe: '', pass_pppoe: '', mac_address: '',
                caja_nap_id: '', puerto_nap: '', tecnico_id: '',
                latitud: '', longitud: '' // Reiniciamos coordenadas
            });
            setSelectedPlantilla(null);
            setIpsLibres([]);
            setNaps([]);
            setPuertosOcupados([]);
            cargarCatalogosIniciales();
        }
    }, [isOpen]);

    // --- GENERACIÓN DE USUARIO PPPoE AUTOMÁTICO ---
    useEffect(() => {
        if (formData.nombre && step < 4) {
            const nombreSinAcentos = formData.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
            const nombreLimpio = nombreSinAcentos.replace(/[^a-zA-Z0-9 ]/g, "");
            const usuarioFinal = nombreLimpio.trim().replace(/\s+/g, '_');
            setFormData(prev => ({ ...prev, user_pppoe: usuarioFinal }));
        }
    }, [formData.nombre, step]);

    // Cargar NAPs cuando cambia la Zona
    useEffect(() => {
        if (formData.zona_id) {
            client.get(`/infraestructura/naps?zona_id=${formData.zona_id}`)
                .then(res => setNaps(res.data))
                .catch(err => console.error("Error cargando NAPs", err));
        } else {
            setNaps([]);
        }
    }, [formData.zona_id]);

    // Cargar Puertos Ocupados cuando cambia la NAP
    useEffect(() => {
        if (formData.caja_nap_id) {
            client.get(`/infraestructura/naps/${formData.caja_nap_id}/detalles`)
                .then(res => setPuertosOcupados(res.data.map((c: any) => c.puerto_nap)))
                .catch(() => setPuertosOcupados([]));
        } else {
            setPuertosOcupados([]);
        }
    }, [formData.caja_nap_id]);

    const cargarCatalogosIniciales = async () => {
        try {
            const [resZonas, resPlantillas, resUsers] = await Promise.all([
                client.get('/zonas/'),
                client.get('/configuracion/plantillas-facturacion'),
                client.get('/usuarios/')
            ]);
            setZonas(resZonas.data);
            setPlantillas(resPlantillas.data);
            const techs = resUsers.data.filter((u: any) => u.rol === 'tecnico');
            setTecnicos(techs);
        } catch (error) { console.error("Error cargando catálogos", error); }
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
                     } catch (err) { setFormData(prev => ({ ...prev, pass_pppoe: '123456' })); }
                }
            } catch (error) { toast.error("Error cargando datos del router"); }
        } else {
            setRedes([]); setPlanes([]);
        }
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

    // --- SOLO EL BOTÓN DE GPS ---
    const handleObtenerUbicacion = () => {
        if (!navigator.geolocation) return toast.error("Tu navegador no soporta GPS");
        toast.loading("Buscando señal GPS...", { id: 'gps' });
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(prev => ({ 
                    ...prev, 
                    latitud: pos.coords.latitude.toString(), 
                    longitud: pos.coords.longitude.toString() 
                }));
                toast.success("¡Ubicación capturada!", { id: 'gps' });
            },
            () => toast.error("Error al obtener GPS. Revisa los permisos.", { id: 'gps' }),
            { enableHighAccuracy: true }
        );
    };

    // --- LÓGICA PRINCIPAL: SUBMIT ---
    const handleSubmit = async () => {
        setLoading(true);
        const t = toast.loading(activarAhora ? "Guardando y Activando..." : "Creando Orden...");
        
        try {
            // 1. PRIMERO: CREAR ORDEN EN BD
            const payload = {
                ...formData,
                router_id: Number(formData.router_id),
                plan_id: Number(formData.plan_id),
                zona_id: formData.zona_id ? Number(formData.zona_id) : null,
                plantilla_id: formData.plantilla_id ? Number(formData.plantilla_id) : null,
                red_id: formData.red_id ? Number(formData.red_id) : null,
                caja_nap_id: formData.caja_nap_id ? Number(formData.caja_nap_id) : null,
                puerto_nap: formData.puerto_nap ? Number(formData.puerto_nap) : null,
                tecnico_id: formData.tecnico_id ? Number(formData.tecnico_id) : null,
                
                // Enviar latitud y longitud al backend
                latitud: formData.latitud ? parseFloat(formData.latitud) : null,
                longitud: formData.longitud ? parseFloat(formData.longitud) : null,
                
                nombre: formData.nombre.trim(),
                cedula: formData.cedula.trim(),
                user_pppoe: formData.user_pppoe?.trim() || null,
                pass_pppoe: formData.pass_pppoe?.trim() || null,
                estado: 'pendiente_instalacion'
            };

            const res = await client.post('/clientes/', payload);
            const newClientId = res.data.id;

            // 2. SEGUNDO: ACTIVAR EN MIKROTIK (Opcional)
            if (activarAhora) {
                toast.loading("Configurando Mikrotik...", { id: t });
                await client.post(`/clientes/${newClientId}/completar-instalacion`, {
                    cedula: formData.cedula, mac_address: formData.mac_address,
                    router_id: formData.router_id, plan_id: formData.plan_id,
                    user_pppoe: formData.user_pppoe, pass_pppoe: formData.pass_pppoe,
                    caja_nap_id: formData.caja_nap_id, puerto_nap: formData.puerto_nap
                });
                toast.success("¡Cliente Creado y ACTIVADO!", { id: t });
            } else {
                toast.success("Orden Generada Correctamente", { id: t });
            }
            
            setCreatedClient({
                nombre: res.data.nombre,
                sn: res.data.cedula || res.data.id.toString(),
                id: res.data.id,
                user_pppoe: formData.user_pppoe,
                pass_pppoe: formData.pass_pppoe,
                estado: activarAhora ? 'Activo' : 'Pendiente'
            });
            setStep(4);
            onSuccess();

        } catch (error: any) {
            toast.dismiss(t);
            let msg = "Error al crear cliente";
            if (error.response?.data?.detail) {
                 msg = typeof error.response.data.detail === 'string' ? error.response.data.detail : "Verifica los campos obligatorios";
            }
            toast.error(msg);
        } finally { setLoading(false); }
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
                <option key={i} value={i} disabled={isTaken} className={isTaken ? 'text-red-400 bg-slate-900' : 'text-emerald-400 font-bold'}>
                    Puerto {i} {isTaken ? '(Ocupado)' : '(Libre)'}
                </option>
            );
        }
        return options;
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => {}}>
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm transition-opacity" />
                <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-3xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
                        
                        {/* HEADER */}
                        {step < 4 && (
                            <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <span className="w-2 h-6 bg-blue-600 rounded-full shadow-[0_0_10px_#2563eb]"></span>
                                            Nuevo Cliente
                                        </h3>
                                        <p className="text-slate-400 text-xs ml-4 mt-1">Asistente de alta de servicio</p>
                                    </div>
                                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition"><XMarkIcon className="w-6 h-6 text-slate-500 hover:text-white"/></button>
                                </div>
                                <div className="flex items-center justify-between px-6 md:px-16 relative">
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -z-10"></div>
                                    <StepIndicator num={1} curr={step} label="Personal" />
                                    <StepIndicator num={2} curr={step} label="Facturación" />
                                    <StepIndicator num={3} curr={step} label="Conexión" />
                                </div>
                            </div>
                        )}

                        {/* BODY */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                            
                            {/* PASO 1: PERSONAL + ZONA + UBICACIÓN */}
                            {step === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-8">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Zona / Colonia</label>
                                        <div className="relative">
                                            <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none"/>
                                            <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-12 text-white outline-none focus:border-indigo-500 border-l-4 border-l-indigo-500 appearance-none cursor-pointer" 
                                                value={formData.zona_id} onChange={e => setFormData({...formData, zona_id: e.target.value})}>
                                                <option value="">Seleccionar Zona...</option>
                                                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"/>
                                        </div>
                                    </div>

                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Nombre Completo</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                                            <input autoFocus className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-12 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-700" 
                                                placeholder="Ej: Juan Pérez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Teléfono (WhatsApp)</label>
                                        <div className="relative">
                                            <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                                            <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-12 text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-700" 
                                                placeholder="52..." value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-emerald-500 uppercase ml-1 block">SN ONU (Cédula)</label>
                                        <div className="relative">
                                            <QrCodeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 pointer-events-none"/>
                                            <input className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl p-3.5 pl-12 text-emerald-400 font-mono font-bold uppercase tracking-widest outline-none focus:border-emerald-500 transition-all placeholder:text-emerald-500/30" 
                                                placeholder="ZTEG..." value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value.toUpperCase()})} />
                                        </div>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Dirección Exacta</label>
                                        <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 h-20 resize-none" 
                                            placeholder="Calle, Número, Color de casa..." value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
                                    </div>

                                    {/* 👇 MODIFICADO: SECCIÓN DE MAPA SOLO CON BOTÓN 👇 */}
                                    <div className="md:col-span-2 space-y-3 mt-2 p-5 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
                                            <GlobeAmericasIcon className="w-4 h-4 text-emerald-400"/> Ubicación en Mapa (Coordenadas)
                                        </label>
                                        
                                        <div className="flex mb-2">
                                            <button 
                                                type="button" 
                                                onClick={handleObtenerUbicacion}
                                                className="w-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <MapPinIcon className="w-5 h-5"/> CAPTURAR GPS ACTUAL
                                            </button>
                                        </div>

                                        <div className="flex gap-3">
                                            <input 
                                                type="text" 
                                                placeholder="Latitud (Ej: 16.75...)" 
                                                value={formData.latitud} 
                                                onChange={(e) => setFormData({...formData, latitud: e.target.value})}
                                                className="w-1/2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 font-mono outline-none focus:border-blue-500 transition-all text-center"
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="Longitud (Ej: -93.11...)" 
                                                value={formData.longitud} 
                                                onChange={(e) => setFormData({...formData, longitud: e.target.value})}
                                                className="w-1/2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 font-mono outline-none focus:border-blue-500 transition-all text-center"
                                            />
                                        </div>
                                    </div>
                                    {/* 👆 FIN SECCIÓN MAPA 👆 */}
                                </div>
                            )}

                            {/* PASO 2: FACTURACIÓN Y ASIGNACIÓN */}
                            {step === 2 && (
                                <div className="space-y-8 animate-in slide-in-from-right-8">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white mb-2 block">Perfil de Facturación</label>
                                        <div className="relative">
                                            <BanknotesIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-500 pointer-events-none"/>
                                            <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 pl-14 text-white font-bold text-lg outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer" 
                                                value={formData.plantilla_id} onChange={handlePlantillaChange}>
                                                <option value="">Seleccionar Perfil...</option>
                                                {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <InfoCard icon={CalendarIcon} label="Día de Pago" value={selectedPlantilla ? `Día ${selectedPlantilla.dia_pago}` : '--'} color="text-indigo-400" />
                                        <InfoCard icon={ShieldCheckIcon} label="Tolerancia" value={selectedPlantilla ? `${selectedPlantilla.dias_tolerancia} Días` : '--'} color="text-emerald-400" />
                                        <InfoCard icon={BellAlertIcon} label="Aviso" value={selectedPlantilla ? `${selectedPlantilla.dias_antes_emision} días antes` : '--'} color="text-amber-400" />
                                        <InfoCard icon={PhoneIcon} label="Medio" value={selectedPlantilla?.recordatorio_whatsapp ? 'WhatsApp' : 'Email'} color="text-blue-400" />
                                    </div>

                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">
                                            Asignar Técnico Instalador
                                        </label>
                                        <div className="relative">
                                            <UserGroupIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none"/>
                                            <select 
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 pl-12 text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                                                value={formData.tecnico_id}
                                                onChange={e => setFormData({...formData, tecnico_id: e.target.value})}
                                            >
                                                <option value="">-- Dejar sin asignar (Pool) --</option>
                                                {tecnicos.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        Técnico: {t.nombre_completo || t.usuario}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PASO 3: CONEXIÓN */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Nodo / Router</label>
                                            <div className="relative">
                                                <ServerIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-12 text-white outline-none focus:border-blue-500 appearance-none cursor-pointer" 
                                                    value={formData.router_id} onChange={handleRouterChange}>
                                                    <option value="">Seleccionar Router...</option>
                                                    {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Plan de Internet</label>
                                            <div className="relative">
                                                <WifiIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-12 text-white outline-none focus:border-blue-500 appearance-none cursor-pointer" 
                                                    value={formData.plan_id} onChange={e => setFormData({...formData, plan_id: e.target.value})}>
                                                    <option value="">Seleccionar Velocidad...</option>
                                                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-indigo-950/30 rounded-2xl border border-indigo-500/20 space-y-4">
                                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                            <CubeIcon className="w-4 h-4" /> Conexión Física (FTTH)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Caja NAP</label>
                                                <select 
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer disabled:opacity-50" 
                                                    value={formData.caja_nap_id} 
                                                    onChange={e => setFormData({...formData, caja_nap_id: e.target.value, puerto_nap: ''})}
                                                    disabled={!formData.zona_id}
                                                >
                                                    <option value="">{formData.zona_id ? (naps.length ? "Seleccionar NAP..." : "Sin NAPs en zona") : "Elige Zona primero"}</option>
                                                    {naps.map(n => <option key={n.id} value={n.id}>{n.nombre} ({n.puertos_libres} libres)</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Puerto Asignado</label>
                                                <select 
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer disabled:opacity-50 font-medium" 
                                                    value={formData.puerto_nap} 
                                                    onChange={e => setFormData({...formData, puerto_nap: e.target.value})}
                                                    disabled={!formData.caja_nap_id}
                                                >
                                                    <option value="">Seleccionar Puerto...</option>
                                                    {renderPuertoOptions()}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Red (Segmento)</label>
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-blue-500 appearance-none cursor-pointer" 
                                                    value={formData.red_id} onChange={handleRedChange} disabled={!formData.router_id}>
                                                    <option value="">Elegir Segmento...</option>
                                                    {redes.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.cidr})</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-emerald-500 uppercase ml-1 block">IP Asignada</label>
                                                <div className="relative">
                                                    <GlobeAmericasIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 pointer-events-none"/>
                                                    <select className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl p-3.5 pl-12 text-emerald-300 font-mono font-bold outline-none focus:border-emerald-500 appearance-none cursor-pointer" 
                                                        value={formData.ip_asignada} onChange={e => setFormData({...formData, ip_asignada: e.target.value})} disabled={ipsLibres.length === 0}>
                                                        {ipsLibres.length === 0 ? <option>Sugerida...</option> : null}
                                                        {ipsLibres.map(ip => <option key={ip} value={ip}>{ip}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedRouter?.tipo_seguridad === 'pppoe' && (
                                        <div className="p-5 bg-blue-600/5 rounded-2xl border border-blue-500/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-blue-400 uppercase ml-1 block">Usuario PPPoE (Auto)</label>
                                                <div className="relative">
                                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none"/>
                                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-12 text-white font-mono text-sm outline-none focus:border-blue-500 transition-colors" 
                                                        value={formData.user_pppoe} onChange={e => setFormData({...formData, user_pppoe: e.target.value})} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-blue-400 uppercase ml-1 block">Contraseña</label>
                                                <div className="relative">
                                                    <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none"/>
                                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-12 text-white font-mono text-sm outline-none focus:border-blue-500 transition-colors" 
                                                        value={formData.pass_pppoe} onChange={e => setFormData({...formData, pass_pppoe: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl border border-blue-500/30 mt-4">
                                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                            <RocketLaunchIcon className="w-5 h-5 text-blue-400"/>
                                            ¿Qué deseas hacer ahora?
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div onClick={() => setActivarAhora(false)} className={`cursor-pointer p-4 rounded-xl border flex items-start gap-3 transition-all ${!activarAhora ? 'bg-slate-800 border-slate-600 ring-2 ring-slate-500' : 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-100'}`}>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${!activarAhora ? 'border-white' : 'border-slate-500'}`}>
                                                    {!activarAhora && <div className="w-2.5 h-2.5 bg-white rounded-full"/>}
                                                </div>
                                                <div>
                                                    <span className="block text-sm font-bold text-white">Solo Crear Orden</span>
                                                    <span className="text-xs text-slate-400">Guarda datos. El técnico activa después.</span>
                                                </div>
                                            </div>
                                            <div onClick={() => setActivarAhora(true)} className={`cursor-pointer p-4 rounded-xl border flex items-start gap-3 transition-all ${activarAhora ? 'bg-emerald-900/20 border-emerald-500 ring-2 ring-emerald-500' : 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-100'}`}>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${activarAhora ? 'border-emerald-500' : 'border-slate-500'}`}>
                                                    {activarAhora && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"/>}
                                                </div>
                                                <div>
                                                    <span className="block text-sm font-bold text-white">Activar AHORA</span>
                                                    <span className="text-xs text-slate-400">Crea cliente Y configura Mikrotik ya mismo.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PASO 4 CON IDENTIFICADOR Y PPPOE */}
                            {step === 4 && createdClient && (
                                <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 py-6">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ring-1 shadow-[0_0_30px_rgba(16,185,129,0.2)] ${createdClient.estado === 'Activo' ? 'bg-emerald-500/10 ring-emerald-500/30' : 'bg-blue-500/10 ring-blue-500/30'}`}>
                                        {createdClient.estado === 'Activo' ? <RocketLaunchIcon className="w-12 h-12 text-emerald-500"/> : <CheckCircleIcon className="w-12 h-12 text-blue-500"/>}
                                    </div>
                                    <h2 className="text-3xl font-bold text-white mb-2">
                                        {createdClient.estado === 'Activo' ? "¡Servicio Activo!" : "¡Orden Creada!"}
                                    </h2>
                                    <p className="text-slate-400 mb-8 max-w-sm">
                                        {createdClient.estado === 'Activo' 
                                            ? `El cliente ${createdClient.nombre} ya tiene servicio en Mikrotik.` 
                                            : `La orden para ${createdClient.nombre} está lista para instalación.`}
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col gap-3 group hover:border-emerald-500/30 transition-colors">
                                            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-1">
                                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                                    <QrCodeIcon className="w-6 h-6 text-emerald-400"/>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Identificador del Cliente</p>
                                                    <p className="text-white font-bold text-sm">SN / Cédula</p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-900 p-3 rounded-lg flex justify-center items-center">
                                                <span className="text-xl text-emerald-400 font-mono font-black tracking-widest select-all">
                                                    {createdClient.sn}
                                                </span>
                                            </div>
                                            
                                            <p className="text-[10px] text-slate-500 italic text-center leading-tight px-2">
                                                Dile al cliente que este es su número de identificación para soporte o pagos.
                                            </p>

                                            <button 
                                                onClick={() => copyToClipboard(`Tu número de cliente en FdezNet es: ${createdClient.sn}`)} 
                                                className="w-full mt-auto py-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-xs transition flex items-center justify-center gap-2"
                                            >
                                                <ClipboardDocumentIcon className="w-4 h-4"/> COPIAR PARA WHATSAPP
                                            </button>
                                        </div>

                                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col gap-3 group hover:border-blue-500/30 transition-colors">
                                            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-1">
                                                <div className="p-2 bg-blue-600/20 rounded-lg">
                                                    <KeyIcon className="w-6 h-6 text-blue-400"/>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Acceso PPPoE</p>
                                                    <p className="text-white font-bold text-sm">Credenciales Router</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                                    <span className="text-xs text-slate-400 font-bold uppercase">Usuario:</span>
                                                    <span className="text-sm font-mono text-white select-all font-bold">{createdClient.user_pppoe || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                                    <span className="text-xs text-slate-400 font-bold uppercase">Clave:</span>
                                                    <span className="text-sm font-mono text-white select-all font-bold">{createdClient.pass_pppoe || 'N/A'}</span>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => copyToClipboard(`Datos de conexión PPPoE\nUsuario: ${createdClient.user_pppoe}\nContraseña: ${createdClient.pass_pppoe}`)} 
                                                className="w-full mt-auto py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-xs transition flex items-center justify-center gap-2"
                                            >
                                                <ClipboardDocumentIcon className="w-4 h-4"/> COPIAR DATOS TÉCNICOS
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* FOOTER */}
                        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center">
                            {step < 4 ? (
                                <>
                                    <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()} className="px-6 py-3 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl font-bold transition-all border border-slate-800 hover:border-slate-700">
                                        {step === 1 ? 'Cancelar' : 'Atrás'}
                                    </button>
                                    
                                    <button 
                                        onClick={step === 3 ? handleSubmit : () => setStep(s => s + 1)} 
                                        disabled={loading || (step===1 && !formData.nombre) || (step===2 && !formData.plantilla_id) || (step===3 && (!formData.router_id || !formData.ip_asignada))}
                                        className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${activarAhora && step === 3 ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
                                    >
                                        {loading && <ArrowPathIcon className="w-5 h-5 animate-spin"/>}
                                        {step === 3 ? (activarAhora ? 'INSTALAR Y ACTIVAR' : 'CREAR ORDEN') : 'Siguiente'}
                                    </button>
                                </>
                            ) : (
                                <button onClick={onClose} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition border border-slate-700">
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
    <div className={`flex flex-col items-center z-10 relative ${curr >= num ? 'text-blue-400' : 'text-slate-600'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-all duration-300 border-2 ${curr >= num ? 'bg-slate-900 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-slate-800'}`}>
            {curr > num ? <CheckCircleIcon className="w-6 h-6"/> : num}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </div>
);

const InfoCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-center items-start gap-1">
        <Icon className={`w-5 h-5 ${color} mb-1 opacity-80`}/>
        <span className="text-[10px] text-slate-500 font-bold uppercase">{label}</span>
        <span className="text-sm font-bold text-white truncate w-full">{value}</span>
    </div>
);
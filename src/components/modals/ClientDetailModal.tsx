import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, UserIcon, WifiIcon, ServerIcon, 
    CalendarDaysIcon, ClipboardDocumentIcon, 
    DocumentTextIcon, IdentificationIcon, 
    PencilSquareIcon, CheckCircleIcon, 
    BanknotesIcon, PlusIcon, CpuChipIcon, 
    QrCodeIcon, GlobeAmericasIcon, CubeIcon, MapPinIcon,
    SignalIcon, GlobeAltIcon, PhoneIcon, ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline';
import type { Cliente } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    cliente: any; 
    onEditSuccess?: () => void;
}

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

const inputClass = "w-full bg-white dark:bg-[#0b0c10] border border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-900";
const labelClass = "block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 tracking-wider";

export default function ClientDetailModal({ isOpen, onClose, cliente: clienteInicial, onEditSuccess }: Props) {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    const [addingSaldo, setAddingSaldo] = useState(false);
    const [montoSaldo, setMontoSaldo] = useState('');

    const [facturas, setFacturas] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    
    // CATALOGOS
    const [routers, setRouters] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]);
    const [zonas, setZonas] = useState<any[]>([]);
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [naps, setNaps] = useState<any[]>([]);
    const [olts, setOlts] = useState<any[]>([]); 
    
    const [puertosOcupados, setPuertosOcupados] = useState<number[]>([]);

    // ESTADOS PARA SWAP SEGURO
    const [isSwapOpen, setIsSwapOpen] = useState(false);
    const [swapData, setSwapData] = useState({ nuevo_inventario_id: '', estado_vieja_onu: 'CON_FALLA' });
    const [equiposDisponibles, setEquiposDisponibles] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        nombre: '', cedula: '', telefono: '', direccion: '',
        plantilla_id: 0, zona_id: 0, router_id: 0, plan_id: 0,
        ip_asignada: '', user_pppoe: '', pass_pppoe: '',
        olt_id: 0, caja_nap_id: 0, puerto_nap: 0, 
        latitud: '', longitud: '', identificador_onu: ''
    });

    useEffect(() => {
        if (isOpen && clienteInicial?.id) {
            cargarDatosCompletos(clienteInicial.id);
            setIsEditing(false);
            setAddingSaldo(false);
            setIsSwapOpen(false);
        }
    }, [isOpen, clienteInicial]);

    const cargarDatosCompletos = async (id: number) => {
        setLoadingData(true);
        try {
            const [resCliente, resFacturas] = await Promise.all([
                client.get(`/clientes/${id}`),
                client.get(`/finanzas/listado-completo?cliente_id=${id}`)
            ]);
            setCliente(resCliente.data);
            const itemsFacturas = resFacturas.data?.items || resFacturas.data || [];
            setFacturas(Array.isArray(itemsFacturas) ? itemsFacturas : []);
        } catch (error) {
            toast.error("Error cargando detalles");
        } finally {
            setLoadingData(false);
        }
    };

    const cargarCatalogos = async () => {
        try {
            const [resRouters, resPlanes, resZonas, resPlantillas, resNaps, resOlts, resInventario] = await Promise.all([
                client.get('network/routers/'), 
                client.get('planes/'), 
                client.get('zonas/'), 
                client.get('configuracion/plantillas-facturacion/'), 
                client.get('infraestructura/naps/'), 
                client.get('olts/'), 
                client.get('/inventario/?estado=DISPONIBLE') 
            ]);
            
            setRouters(Array.isArray(resRouters.data) ? resRouters.data : []); 
            setPlanes(Array.isArray(resPlanes.data) ? resPlanes.data : []);
            setZonas(Array.isArray(resZonas.data) ? resZonas.data : []); 
            setPlantillas(Array.isArray(resPlantillas.data) ? resPlantillas.data : []);
            setNaps(Array.isArray(resNaps.data) ? resNaps.data : []); 
            setOlts(Array.isArray(resOlts.data) ? resOlts.data : []);
            
            setEquiposDisponibles(Array.isArray(resInventario.data) ? resInventario.data : []);
            
        } catch (error) { toast.error("Error cargando listas de configuración"); }
    };

    const toggleEditMode = () => {
        if (!isEditing && cliente) {
            cargarCatalogos();
            setFormData({
                nombre: cliente.nombre || '', cedula: cliente.cedula || '', 
                telefono: cliente.telefono || '', direccion: cliente.direccion || '',
                plantilla_id: cliente.plantilla?.id || 0, zona_id: cliente.zona?.id || 0,
                router_id: cliente.router?.id || 0, plan_id: cliente.plan?.id || 0,
                ip_asignada: cliente.ip_asignada || '', user_pppoe: cliente.user_pppoe || '', pass_pppoe: cliente.pass_pppoe || '', 
                olt_id: cliente.olt?.id || 0, caja_nap_id: cliente.caja_nap?.id || 0, puerto_nap: cliente.puerto_nap || 0,
                latitud: cliente.latitud ? cliente.latitud.toString() : '', longitud: cliente.longitud ? cliente.longitud.toString() : '',
                identificador_onu: cliente.onu_asignada?.identificador || ''
            });
            setIsEditing(true);
        } else { 
            setIsEditing(false); 
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name.includes('_id') || name === 'puerto_nap' ? Number(value) : value }));
    };

    useEffect(() => {
        if (formData.caja_nap_id && isEditing) {
            client.get(`/infraestructura/naps/${formData.caja_nap_id}/detalles`)
                .then(res => setPuertosOcupados(res.data.map((c: any) => c.puerto_nap))).catch(() => setPuertosOcupados([]));
        } else { setPuertosOcupados([]); }
    }, [formData.caja_nap_id, isEditing]);

    const handleGuardar = async () => {
        if (!cliente) return;
        const load = toast.loading("Guardando...");
        try {
            const payload = { 
                ...formData, 
                mac_address: !cliente.onu_asignada ? formData.identificador_onu : undefined, 
                latitud: formData.latitud ? parseFloat(formData.latitud) : null, 
                longitud: formData.longitud ? parseFloat(formData.longitud) : null 
            };
            await client.put(`/clientes/${cliente.id}`, payload);
            toast.success("Información Actualizada", { id: load });
            cargarDatosCompletos(cliente.id);
            setIsEditing(false);
            if (onEditSuccess) onEditSuccess();
        } catch (error) { toast.error("Error al guardar cambios", { id: load }); }
    };

    // 🔥 NUEVA FUNCIÓN: REACTIVAR CLIENTE CANCELADO 🔥
    const handleReactivarCliente = async () => {
        if (!cliente || cliente.estado !== 'cancelado') return;
        if (!confirm("¿Estás seguro de reactivar este servicio en el MikroTik?")) return;
        
        const load = toast.loading("Reactivando servicio...");
        try {
            await client.post(`/clientes/${cliente.id}/reactivar`);
            toast.success("¡Servicio Reactivado y Conectado!", { id: load });
            cargarDatosCompletos(cliente.id);
            if (onEditSuccess) onEditSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al reactivar el servicio", { id: load });
        }
    };

    const handleAgregarSaldo = async () => {
        if (!cliente || !montoSaldo || Number(montoSaldo) <= 0) return;
        const load = toast.loading("Abonando...");
        try {
            const nuevoSaldo = (cliente.saldo_a_favor || 0) + Number(montoSaldo);
            await client.put(`/clientes/${cliente.id}`, { ...cliente, saldo_a_favor: nuevoSaldo });
            toast.success(`Abonado: $${montoSaldo}`, { id: load });
            setCliente({ ...cliente, saldo_a_favor: nuevoSaldo });
            setAddingSaldo(false); setMontoSaldo('');
            if (onEditSuccess) onEditSuccess();
        } catch (error) { toast.error("Error al abonar", { id: load }); }
    };

    const handleAbrirMapa = () => {
        if (cliente?.latitud && cliente?.longitud) {
            window.open(`http://maps.google.com/maps?q=$$${cliente.latitud},${cliente.longitud}`, '_blank');
        }
    };

    const handleCaptureGPS = () => {
        if (!navigator.geolocation) {
            toast.error("Tu navegador no soporta GPS");
            return;
        }

        const loadId = toast.loading("Obteniendo ubicación exacta...");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({
                    ...prev,
                    latitud: latitude.toString(),
                    longitud: longitude.toString()
                }));
                toast.success("¡Coordenadas capturadas!", { id: loadId });
            },
            (error) => {
                console.error("Error GPS:", error);
                toast.error("Error GPS. Revisa que tu navegador tenga permisos de ubicación.", { id: loadId, duration: 4000 });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const abrirModalSwap = () => {
        setIsSwapOpen(true);
        setSwapData({ nuevo_inventario_id: '', estado_vieja_onu: 'CON_FALLA' });
    };

    const handleProcesarSwap = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cliente || !swapData.nuevo_inventario_id) return;
        
        const load = toast.loading("Procesando asignación/cambio...");
        try {
            await client.post(`/clientes/${cliente.id}/cambiar-onu`, {
                nuevo_inventario_id: Number(swapData.nuevo_inventario_id),
                estado_vieja_onu: swapData.estado_vieja_onu
            });
            toast.success("¡ONU vinculada exitosamente!", { id: load });
            setIsSwapOpen(false);
            cargarDatosCompletos(cliente.id); 
            if (onEditSuccess) onEditSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al cambiar equipo", { id: load });
        }
    };

    const renderPuertoOptions = () => {
        if (!formData.caja_nap_id) return null;
        const caja = naps.find(n => n.id === Number(formData.caja_nap_id));
        const capacidad = caja?.capacidad || 16;
        const options = [];
        for (let i = 1; i <= capacidad; i++) {
            const isTaken = puertosOcupados.includes(i) && i !== cliente?.puerto_nap;
            options.push(<option key={i} value={i} disabled={isTaken} className={isTaken ? 'text-red-400 bg-slate-200 dark:bg-slate-900' : 'text-emerald-500 dark:text-emerald-400 font-bold'}>Puerto {i} {isTaken ? '(Ocupado)' : '(Libre)'}</option>);
        }
        return options;
    };

    const obtenerTecnologiaOLT = (olt: any) => {
        if (!olt) return null;
        if (olt.tecnologia) return olt.tecnologia.toUpperCase();
        if (olt.nombre?.toUpperCase().includes('EPON')) return 'EPON';
        if (olt.nombre?.toUpperCase().includes('GPON')) return 'GPON';
        return null;
    };

    const tecOltActual = obtenerTecnologiaOLT(olts.find(o => o.id === formData.olt_id));
    const equiposCompatibles = formData.olt_id 
        ? equiposDisponibles.filter(eq => tecOltActual ? eq.tecnologia?.toUpperCase() === tecOltActual : true)
        : [];
    
    if (!cliente) return null;
    const isPPPoE = cliente.router?.tipo_seguridad === 'pppoe' || formData.router_id !== 0; 

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/95 backdrop-blur-md transition-colors" aria-hidden="true" />
                <div className="fixed inset-0 overflow-y-auto flex items-start sm:items-center justify-center p-0 sm:p-4">
                    <Dialog.Panel className="w-full min-h-screen sm:min-h-0 sm:max-h-[95vh] sm:max-w-[1200px] bg-white dark:bg-[#12131a] sm:border border-slate-200 dark:border-slate-800 sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden transition-colors">
                        
                        {/* ================= HEADER ================= */}
                        <div className="bg-slate-50 dark:bg-[#16171d] p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors">
                            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 p-2 rounded-xl sm:hidden"><XMarkIcon className="w-5 h-5"/></button>
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex gap-4 items-center w-full">
                                    <div className="h-14 w-14 rounded-xl bg-blue-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                                        {cliente.nombre ? cliente.nombre.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="bg-white dark:bg-[#0b0c10] border border-blue-500 rounded-lg px-3 py-1.5 text-xl font-bold text-slate-900 dark:text-white w-full outline-none focus:ring-1 focus:ring-blue-500 transition-colors"/>
                                        ) : (
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate transition-colors">{cliente.nombre}</h3>
                                        )}
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-widest ${cliente.estado === 'activo' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>{cliente.estado}</span>
                                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><IdentificationIcon className="w-3 h-3"/> ID: {cliente.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden sm:flex gap-2">
                                    {isEditing ? (
                                        <><button onClick={toggleEditMode} className="bg-slate-100 dark:bg-[#1a1c23] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 px-5 py-2 rounded-lg text-sm font-bold transition">Cancelar</button><button onClick={handleGuardar} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"><CheckCircleIcon className="w-5 h-5"/> Guardar Datos</button></>
                                    ) : (
                                        <>
                                            {/* 🔥 BOTÓN DE REACTIVACIÓN CONDICIONAL 🔥 */}
                                            {cliente.estado === 'cancelado' && (
                                                <button onClick={handleReactivarCliente} className="text-emerald-600 dark:text-emerald-400 bg-emerald-600/10 hover:bg-emerald-600/20 px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"><ArrowPathRoundedSquareIcon className="w-5 h-5"/> Reactivar Servicio</button>
                                            )}
                                            <button onClick={toggleEditMode} className="text-blue-600 dark:text-blue-400 bg-blue-600/10 hover:bg-blue-600/20 px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"><PencilSquareIcon className="w-5 h-5"/> Editar Ficha</button>
                                        </>
                                    )}
                                    <button onClick={onClose} className="text-slate-500 bg-slate-100 dark:bg-[#1a1c23] border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:text-white p-2 rounded-lg transition"><XMarkIcon className="w-5 h-5"/></button>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <KpiHeader icon={QrCodeIcon} color="emerald" title="Cédula / Identificación" value={cliente.cedula || 'N/A'} />
                                <KpiHeader icon={CpuChipIcon} color="slate" title="ONU Asignada" value={cliente.onu_asignada?.identificador || 'Sin registrar'} />
                                <KpiHeader icon={ServerIcon} color="indigo" title="Nodo / Router" value={cliente.router?.nombre || 'S/A'} />
                                <KpiHeader icon={GlobeAmericasIcon} color="blue" title="IP Asignada" value={cliente.ip_asignada || '---'} mono />
                            </div>
                        </div>

                        {/* ================= CONTENIDO ================= */}
                        <Tab.Group as="div" className="flex flex-col flex-1 overflow-hidden">
                            <Tab.List className="flex gap-6 px-6 bg-slate-50 dark:bg-[#16171d] border-b border-slate-200 dark:border-slate-800 transition-colors">
                                <TabItem label="Vista General" icon={UserIcon} />
                                <TabItem label="Estado de Cuenta" icon={DocumentTextIcon} />
                            </Tab.List>

                            <Tab.Panels className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-[#0a0a0c] custom-scrollbar transition-colors">
                                <Tab.Panel className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20 sm:pb-0">
                                    
                                    <div className="lg:col-span-2 space-y-5">
                                        {/* INFO CONTACTO */}
                                        <SectionCard title="Información del Contacto" icon={UserIcon} iconColor="text-blue-500 dark:text-blue-400">
                                            {isEditing ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="col-span-2"><label className={labelClass}>Nombre Completo</label><input name="nombre" value={formData.nombre} onChange={handleInputChange} className={inputClass}/></div>
                                                    <div><label className={labelClass}>Teléfono</label><input name="telefono" value={formData.telefono} onChange={handleInputChange} className={inputClass}/></div>
                                                    <div><label className={labelClass}>Zona</label><select name="zona_id" value={formData.zona_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}</select></div>
                                                    <div className="col-span-2"><label className={labelClass}>Dirección Principal</label><textarea name="direccion" value={formData.direccion} onChange={(e: any)=>handleInputChange(e)} rows={2} className={`${inputClass} resize-none`}/></div>
                                                    
                                                    {/* GPS CAPTURE */}
                                                    <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className={labelClass + " !mb-0"}>Ubicación GPS</span>
                                                            <button 
                                                                type="button" 
                                                                onClick={handleCaptureGPS}
                                                                className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors active:scale-95"
                                                            >
                                                                <MapPinIcon className="w-4 h-4" /> Capturar Aquí
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div><label className="text-[9px] font-bold text-slate-400 block mb-1">Latitud</label><input name="latitud" value={formData.latitud} onChange={handleInputChange} className={inputClass}/></div>
                                                            <div><label className="text-[9px] font-bold text-slate-400 block mb-1">Longitud</label><input name="longitud" value={formData.longitud} onChange={handleInputChange} className={inputClass}/></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <DataBox icon={PhoneIcon} label="Teléfono" value={cliente.telefono} copy />
                                                        <DataBox icon={MapPinIcon} label="Zona" value={cliente.zona?.nombre} />
                                                    </div>
                                                    <DataBox icon={MapPinIcon} label="Dirección" value={cliente.direccion} />
                                                    <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0f1015] p-3 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                                                        <div><p className="text-[10px] uppercase font-bold text-slate-500 mb-1">GPS</p><p className="text-xs text-slate-700 dark:text-slate-300 font-mono transition-colors">{cliente.latitud && cliente.longitud ? `${cliente.latitud}, ${cliente.longitud}` : 'Sin ubicar'}</p></div>
                                                        {cliente.latitud && <button onClick={handleAbrirMapa} className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition">VER MAPA</button>}
                                                    </div>
                                                </div>
                                            )}
                                        </SectionCard>

                                        {/* INFRAESTRUCTURA (FTTH) */}
                                        <SectionCard title="Infraestructura de Fibra (FTTH)" icon={SignalIcon} iconColor="text-emerald-500">
                                            {isEditing ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    
                                                    {/* 1. Seleccionar OLT */}
                                                    <div className="col-span-2"><label className={labelClass}>OLT Conectada</label><select name="olt_id" value={formData.olt_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar OLT...</option>{olts.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></div>
                                                    <div><label className={labelClass}>Caja NAP</label><select name="caja_nap_id" value={formData.caja_nap_id} onChange={handleInputChange} className={inputClass}><option value={0}>Ninguna</option>{naps.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select></div>
                                                    <div><label className={labelClass}>Puerto Físico</label><select name="puerto_nap" value={formData.puerto_nap} onChange={handleInputChange} className={inputClass} disabled={!formData.caja_nap_id}><option value={0}>-</option>{renderPuertoOptions()}</select></div>

                                                    {/* 2. Seleccionar ONU */}
                                                    <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                                        <label className={labelClass}>Equipo ONU Asignado</label>
                                                        {cliente.onu_asignada ? (
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 dark:bg-[#0f1015] border border-slate-200 dark:border-slate-800 p-3 rounded-xl transition-colors">
                                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex-1 text-sm">
                                                                    {cliente.onu_asignada.identificador} <span className="text-slate-500 font-sans text-xs">({cliente.onu_asignada.modelo})</span>
                                                                </span>
                                                                <button type="button" onClick={abrirModalSwap} className="bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 px-4 py-2 rounded-lg text-xs font-black uppercase flex justify-center items-center gap-1.5 transition-colors w-full sm:w-auto">
                                                                    <ArrowPathRoundedSquareIcon className="w-4 h-4" /> Reemplazar ONU
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <select name="identificador_onu" value={formData.identificador_onu} onChange={handleInputChange} className={inputClass} disabled={!formData.olt_id}>
                                                                {!formData.olt_id ? (
                                                                    <option value="">Primero selecciona una OLT arriba...</option>
                                                                ) : (
                                                                    <>
                                                                        <option value="">Seleccionar equipo de bodega...</option>
                                                                        {equiposCompatibles.map(eq => (
                                                                            <option key={eq.id} value={eq.identificador}>{eq.identificador} - {eq.modelo} ({eq.tecnologia})</option>
                                                                        ))}
                                                                    </>
                                                                )}
                                                            </select>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <DataBox icon={ServerIcon} label="OLT Conectada" value={cliente.olt?.nombre} />
                                                    <div className="bg-slate-50 dark:bg-[#0f1015] p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group transition-colors">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="p-1.5 bg-slate-200 dark:bg-slate-800/50 rounded-md shrink-0"><CubeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400"/></div>
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Caja NAP</p>
                                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate transition-colors">{cliente.caja_nap?.nombre || 'No Asignada'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-sm font-black text-slate-800 dark:text-white bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 shrink-0 text-center min-w-[3rem] transition-colors">
                                                            {cliente.puerto_nap ? `P${cliente.puerto_nap}` : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </SectionCard>

                                        {/* CONFIGURACIÓN LÓGICA */}
                                        <SectionCard title="Configuración Lógica" icon={GlobeAltIcon} iconColor="text-indigo-500 dark:text-indigo-400">
                                            {isEditing ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div><label className={labelClass}>Router Central</label><select name="router_id" value={formData.router_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
                                                    <div><label className={labelClass}>Dirección IP</label><input name="ip_asignada" value={formData.ip_asignada} onChange={handleInputChange} className={`${inputClass} font-mono text-indigo-600 dark:text-indigo-400`}/></div>
                                                    {isPPPoE && (
                                                        <>
                                                            <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800"><p className="text-[10px] font-bold text-slate-500 uppercase">Credenciales PPPoE</p></div>
                                                            <div><label className={labelClass}>Usuario</label><input name="user_pppoe" value={formData.user_pppoe} onChange={handleInputChange} className={inputClass}/></div>
                                                            <div><label className={labelClass}>Contraseña</label><input name="pass_pppoe" value={formData.pass_pppoe} onChange={handleInputChange} className={inputClass}/></div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <DataBox icon={GlobeAmericasIcon} label="IP Asignada" value={cliente.ip_asignada} mono copy />
                                                        <DataBox icon={ServerIcon} label="Router Central" value={cliente.router?.nombre} />
                                                    </div>
                                                    {isPPPoE && <DataBox icon={IdentificationIcon} label="Usuario PPPoE" value={cliente.user_pppoe} mono copy />}
                                                </div>
                                            )}
                                        </SectionCard>
                                    </div>

                                    {/* --- COLUMNA DERECHA --- */}
                                    <div className="space-y-5">
                                        {/* SALDO A FAVOR */}
                                        <div className="bg-[#0e744d] rounded-2xl p-6 relative overflow-hidden shadow-lg border border-emerald-500/20">
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Saldo a Favor</p>
                                                    <button onClick={() => setAddingSaldo(!addingSaldo)} className="bg-black/20 hover:bg-black/30 p-1.5 rounded-lg transition"><PlusIcon className="w-4 h-4 text-white"/></button>
                                                </div>
                                                <p className="text-4xl font-black text-white">${(cliente.saldo_a_favor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                                
                                                {addingSaldo && (
                                                    <div className="mt-4 flex gap-2 animate-in fade-in">
                                                        <input type="number" placeholder="Monto" className="w-full bg-black/30 border border-transparent rounded-lg px-3 py-2 text-sm text-white font-bold outline-none focus:border-emerald-300/50" value={montoSaldo} onChange={e => setMontoSaldo(e.target.value)} />
                                                        <button onClick={handleAgregarSaldo} className="bg-white text-emerald-700 px-4 py-2 rounded-lg text-sm font-black hover:bg-emerald-50 transition">OK</button>
                                                    </div>
                                                )}
                                            </div>
                                            <BanknotesIcon className="absolute right-[-20px] bottom-[-20px] w-32 h-32 text-white/10 -rotate-12" />
                                        </div>

                                        {/* SERVICIO CONTRATADO */}
                                        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-md transition-colors">
                                            <div className="flex justify-between items-center mb-4"><span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Servicio Contratado</span><WifiIcon className="w-4 h-4 text-blue-500"/></div>
                                            {isEditing ? (
                                                <select name="plan_id" value={formData.plan_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
                                            ) : (
                                                <div>
                                                    <p className="text-xl font-black text-slate-900 dark:text-white transition-colors">{cliente.plan?.nombre || 'Sin Plan'}</p>
                                                    <p className="text-sm font-bold text-blue-500 dark:text-blue-400 mt-1">${cliente.plan?.precio || 0} <span className="text-slate-500 font-normal">/ mes</span></p>
                                                </div>
                                            )}
                                        </div>

                                        {/* CICLO DE FACTURACIÓN */}
                                        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-md transition-colors">
                                            <div className="flex justify-between items-center mb-4"><span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ciclo de Facturación</span><CalendarDaysIcon className="w-4 h-4 text-purple-500"/></div>
                                            {isEditing ? (
                                                <select name="plantilla_id" value={formData.plantilla_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
                                            ) : (
                                                <div className="flex items-end gap-2">
                                                    <p className="text-4xl font-black text-slate-900 dark:text-white transition-colors">{cliente.plantilla?.dia_pago || '?'}</p>
                                                    <p className="text-sm font-bold text-slate-500 mb-1">de cada mes</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Tab.Panel>

                                {/* HISTORIAL FINANCIERO */}
                                <Tab.Panel>
                                    <div className="bg-white dark:bg-[#16171d] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 transition-colors"><h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Estado de Cuenta</h4></div>
                                        {facturas.length === 0 ? (
                                            <div className="p-16 text-center text-slate-500 italic">No hay facturas emitidas.</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-slate-100 dark:bg-[#0f1014] text-slate-600 dark:text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-200 dark:border-slate-800 transition-colors">
                                                        <tr><th className="px-5 py-4">Folio</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4 text-right">Monto</th><th className="px-5 py-4 text-center">Estado</th></tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                                                        {facturas.map((f) => (
                                                            <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-400">#{f.id.toString().padStart(5,'0')}</td>
                                                                <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-bold">{new Date(f.fecha_emision).toLocaleDateString()}</td>
                                                                <td className="px-5 py-4 text-right text-slate-900 dark:text-white font-black">${f.total.toLocaleString('es-MX')}</td>
                                                                <td className="px-5 py-4 text-center"><span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${f.estado === 'pagada' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{f.estado}</span></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </Tab.Panel>
                            </Tab.Panels>
                        </Tab.Group>

                        {/* ACCIONES MÓVIL (Sticky bottom) */}
                        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#0f1014] border-t border-slate-200 dark:border-slate-800 z-50 flex gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_20px_rgba(0,0,0,0.5)] transition-colors">
                             {isEditing ? (
                                <><button onClick={toggleEditMode} className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold transition-colors">Cancelar</button><button onClick={handleGuardar} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Guardar Datos</button></>
                            ) : (
                                <button onClick={toggleEditMode} className="w-full text-blue-600 dark:text-blue-400 bg-blue-500/10 py-3 rounded-xl font-bold flex justify-center items-center gap-2 border border-blue-500/20"><PencilSquareIcon className="w-5 h-5"/> Editar</button>
                            )}
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>

            {/* 🔥 MODAL SECUNDARIO: SWAP DE ONU 🔥 */}
            <Transition appear show={isSwapOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsSwapOpen(false)}>
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                    <ArrowPathRoundedSquareIcon className="w-5 h-5 text-amber-500" /> Cambio de Equipo
                                </h3>
                                <button onClick={() => setIsSwapOpen(false)} className="text-slate-400"><XMarkIcon className="w-5 h-5"/></button>
                            </div>
                            
                            <form onSubmit={handleProcesarSwap} className="space-y-4">
                                
                                {cliente.onu_asignada && (
                                    <div>
                                        <label className={labelClass}>Estado del equipo retirado ({cliente.onu_asignada.identificador})</label>
                                        <select value={swapData.estado_vieja_onu} onChange={(e) => setSwapData(p => ({...p, estado_vieja_onu: e.target.value}))} className={inputClass}>
                                            <option value="CON_FALLA">❌ Averiado / Con Falla</option>
                                            <option value="DISPONIBLE">✅ Funcional (Regresa a Bodega)</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className={labelClass}>Nueva ONU a Instalar</label>
                                    {!formData.olt_id ? (
                                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold text-center">
                                            ⚠️ Cierra este cuadro y selecciona una OLT en el formulario primero.
                                        </div>
                                    ) : equiposCompatibles.length === 0 ? (
                                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold text-center">
                                            No hay equipos {tecOltActual || ''} compatibles en bodega.
                                        </div>
                                    ) : (
                                        <select required value={swapData.nuevo_inventario_id} onChange={(e) => setSwapData(p => ({...p, nuevo_inventario_id: e.target.value}))} className={inputClass}>
                                            <option value="">Selecciona de Bodega...</option>
                                            {equiposCompatibles.map(e => <option key={e.id} value={e.id}>{e.identificador} ({e.modelo})</option>)}
                                        </select>
                                    )}
                                </div>

                                <button type="submit" disabled={!swapData.nuevo_inventario_id} className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black py-3 rounded-xl mt-4 transition-colors">
                                    Confirmar Reemplazo
                                </button>
                            </form>
                        </Dialog.Panel>
                    </div>
                </Dialog>
            </Transition>
        </Transition>
    );
}

// ================= COMPONENTES DE UI =================

const KpiHeader = ({ icon: Icon, color, title, value, subtitle, mono }: any) => {
    const bgColors: any = { emerald: 'bg-emerald-500/10', slate: 'bg-slate-200 dark:bg-slate-800', indigo: 'bg-indigo-500/10', blue: 'bg-blue-500/10' };
    const iconColors: any = { emerald: 'text-emerald-500', slate: 'text-slate-500 dark:text-slate-400', indigo: 'text-indigo-500', blue: 'text-blue-500' };

    return (
        <div className="bg-white dark:bg-[#1a1c23] border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 transition-colors">
            <div className={`${bgColors[color]} p-2 rounded-lg shrink-0`}><Icon className={`w-4 h-4 ${iconColors[color]}`}/></div>
            <div className="overflow-hidden">
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">{title}</p>
                <p className={`text-sm font-bold text-slate-900 dark:text-white truncate transition-colors ${mono ? 'font-mono text-blue-600 dark:text-blue-400' : ''}`}>{value}</p>
                {subtitle && <p className="text-[9px] text-slate-400 mt-0.5 truncate uppercase">{subtitle}</p>}
            </div>
        </div>
    );
};

const SectionCard = ({ title, icon: Icon, iconColor, children }: any) => (
    <div className="bg-white dark:bg-[#16171d] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-[#1a1c23] transition-colors">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] transition-colors">{title}</h4>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const DataBox = ({ label, value, mono, copy, icon: Icon }: any) => (
    <div className="bg-slate-50 dark:bg-[#0f1015] p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between group transition-colors">
        <div className="flex items-center gap-3 overflow-hidden">
            {Icon && <div className="p-1.5 bg-slate-200 dark:bg-slate-800/50 rounded-md shrink-0 transition-colors"><Icon className="w-4 h-4 text-slate-500 dark:text-slate-400"/></div>}
            <div className="min-w-0">
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">{label}</p>
                <p className={`text-sm text-slate-700 dark:text-slate-200 truncate transition-colors ${mono ? 'font-mono text-blue-600 dark:text-blue-400' : 'font-bold'}`}>{value || '—'}</p>
            </div>
        </div>
        {copy && value && (
            <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado"); }} className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-white bg-slate-200 dark:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition shrink-0">
                <ClipboardDocumentIcon className="w-4 h-4"/>
            </button>
        )}
    </div>
);

const TabItem = ({ label, icon: Icon }: any) => (
    <Tab className={({ selected }) => classNames(
        'py-4 text-sm font-bold border-b-2 flex items-center gap-2 outline-none transition-all', 
        selected ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
    )}>
        <Icon className="w-5 h-5" /> {label}
    </Tab>
);
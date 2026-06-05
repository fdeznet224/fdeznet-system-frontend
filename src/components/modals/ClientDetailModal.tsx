import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
    XMarkIcon, UserIcon, ServerIcon,
    CalendarDaysIcon, ClipboardDocumentIcon,
    DocumentTextIcon, IdentificationIcon,
    PencilSquareIcon, PlusIcon, CpuChipIcon,
    GlobeAmericasIcon, CubeIcon, MapPinIcon,
    GlobeAltIcon, PhoneIcon, ArrowPathRoundedSquareIcon,
    WalletIcon, ArrowTopRightOnSquareIcon
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

const inputClass = "w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-3 outline-none transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/50";
const labelClass = "block text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 mb-1.5 tracking-widest pl-1 select-none";

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

    // CORRECCIÓN: Enlace oficial de Google Maps
    const handleAbrirMapa = () => {
        if (cliente?.latitud && cliente?.longitud) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${cliente.latitud},${cliente.longitud}`, '_blank');
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
                toast.error("Error GPS. Activa los permisos de ubicación.", { id: loadId });
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
            options.push(<option key={i} value={i} disabled={isTaken}>{isTaken ? `Puerto ${i} (Ocupado)` : `Puerto ${i} (Libre)`}</option>);
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

    const isPPPoE = cliente?.router?.tipo_seguridad === 'pppoe' || formData.router_id !== 0;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <Dialog.Panel className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[1150px] bg-slate-50 dark:bg-[#07080c] sm:border border-slate-200 dark:border-slate-800/80 sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden transition-colors duration-300">

                        {/* ================= MAIN HEADER ================= */}
                        <div className="bg-white dark:bg-[#0d0e12] px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/60 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    {loadingData ? (
                                        <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                                    ) : (
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 font-black text-white flex items-center justify-center text-lg shadow-md shadow-blue-500/20 shrink-0 select-none">
                                            {cliente?.nombre ? cliente.nombre.charAt(0).toUpperCase() : '?'}
                                        </div>
                                    )}
                                    <div className="overflow-hidden">
                                        {loadingData ? (
                                            <div className="space-y-2 py-1">
                                                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
                                                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
                                            </div>
                                        ) : isEditing ? (
                                            <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-black text-base text-slate-900 dark:text-white rounded-lg outline-none border border-blue-500 focus:ring-4 focus:ring-blue-500/10 w-full transition-all" />
                                        ) : (
                                            <div className="flex flex-col">
                                                <h3 className="font-black text-xl text-slate-900 dark:text-white truncate leading-none tracking-tight mb-1.5">{cliente?.nombre}</h3>
                                                <div className="flex items-center gap-2 select-none overflow-x-auto scrollbar-none">
                                                    {/* ETIQUETA DE ESTADO */}
                                                    <span className={classNames(
                                                        "text-[10px] px-2.5 py-0.5 rounded-md font-black uppercase tracking-widest border shrink-0",
                                                        cliente?.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                    )}>{cliente?.estado}</span>

                                                    {/* NUEVA ETIQUETA MINIMALISTA DE CÉDULA */}
                                                    {cliente?.cedula && (
                                                        <span className="flex items-center gap-1 text-[11px] font-black font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                                                            <IdentificationIcon className="w-3 h-3 text-blue-500" />
                                                            {cliente.cedula}
                                                        </span>
                                                    )}

                                                    {/* ID DE BASE DE DATOS */}
                                                    <span className="text-[11px] font-black font-mono text-slate-400 dark:text-slate-500 px-1 shrink-0">
                                                        ID: {cliente?.id}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Acciones Desktop */}
                                <div className="hidden sm:flex items-center gap-2">
                                    {isEditing ? (
                                        <>
                                            <button onClick={toggleEditMode} className="text-sm font-black text-slate-500 dark:text-slate-400 px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all">Cancelar</button>
                                            <button onClick={handleGuardar} className="text-sm font-black bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl shadow-md transition-all">Guardar</button>
                                        </>
                                    ) : (
                                        <>
                                            {cliente?.estado === 'cancelado' && (
                                                <button onClick={handleReactivarCliente} className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 font-black text-sm flex items-center gap-2 hover:bg-emerald-500/20 transition-all"><ArrowPathRoundedSquareIcon className="w-4 h-4" /> Reactivar</button>
                                            )}
                                            <button onClick={toggleEditMode} className="px-4 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 font-black text-sm flex items-center gap-2 hover:bg-blue-500/20 transition-all"><PencilSquareIcon className="w-4 h-4" /> Editar</button>
                                            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all"><XMarkIcon className="w-6 h-6" /></button>
                                        </>
                                    )}
                                </div>
                                {/* Cerrar Móvil */}
                                <button onClick={onClose} className="sm:hidden p-2 text-slate-400 bg-slate-100 dark:bg-slate-900 rounded-xl"><XMarkIcon className="w-5 h-5" /></button>
                            </div>

                            {/* ================= QUICK STATS (SIEMPRE VISIBLE) ================= */}
                            {!loadingData && !isEditing && cliente && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Plan Actual</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{cliente.plan?.nombre || 'Ninguno'}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group">
                                        <div className="overflow-hidden">
                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">IP Asignada</p>
                                            <p className="text-sm font-mono font-black text-blue-600 dark:text-blue-400 truncate">{cliente.ip_asignada || 'DHCP'}</p>
                                        </div>
                                        {cliente.ip_asignada && <button onClick={() => { navigator.clipboard.writeText(cliente.ip_asignada); toast.success("IP Copiada"); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white dark:bg-slate-950 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"><ClipboardDocumentIcon className="w-4 h-4" /></button>}
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group">
                                        <div className="overflow-hidden">
                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">ONU / Equipo</p>
                                            <p className="text-sm font-mono font-black text-slate-800 dark:text-slate-200 truncate">{cliente.onu_asignada?.identificador || 'Sin Equipo'}</p>
                                        </div>
                                        {cliente.onu_asignada && <button onClick={() => { navigator.clipboard.writeText(cliente.onu_asignada.identificador); toast.success("Serial Copiado"); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white dark:bg-slate-950 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"><ClipboardDocumentIcon className="w-4 h-4" /></button>}
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-500 tracking-widest mb-1">Saldo</p>
                                            <p className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-400">${(cliente.saldo_a_favor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <button onClick={() => setAddingSaldo(!addingSaldo)} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm"><PlusIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )}

                            {/* INGRESO DE SALDO RÁPIDO */}
                            {addingSaldo && !isEditing && (
                                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-2 animate-in fade-in slide-in-from-top-2">
                                    <input type="number" placeholder="Monto a abonar..." className="w-full bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm font-mono font-black outline-none focus:border-emerald-500" value={montoSaldo} onChange={e => setMontoSaldo(e.target.value)} />
                                    <button onClick={handleAgregarSaldo} className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 rounded-lg text-xs font-black uppercase shadow-md transition-all">Aplicar</button>
                                </div>
                            )}
                        </div>

                        {/* ================= SYSTEM BODY PANELS ================= */}
                        <Tab.Group as="div" className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-5 py-2 bg-slate-50 dark:bg-[#07080c] border-b border-slate-200/80 dark:border-slate-800/40 shrink-0">
                                <Tab.List className="flex space-x-2">
                                    <TabItem label="General FTTH" icon={UserIcon} />
                                    <TabItem label="Finanzas" icon={DocumentTextIcon} />
                                </Tab.List>
                            </div>

                            <Tab.Panels className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50 dark:bg-[#07080c] pb-24 sm:pb-5 space-y-4">
                                {loadingData ? (
                                    <div className="space-y-4"><div className="h-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" /><div className="h-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" /></div>
                                ) : (
                                    <Tab.Panel className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-200">

                                        {/* COLUMNA 1: Contacto y Geolocalización */}
                                        <div className="space-y-5">
                                            <NativeListGroup title="Información de Contacto">
                                                {isEditing ? (
                                                    <div className="p-4 space-y-4">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div><label className={labelClass}>Cédula / ID</label><input name="cedula" value={formData.cedula} onChange={handleInputChange} className={`${inputClass} font-mono`} /></div>
                                                            <div><label className={labelClass}>Teléfono</label><input name="telefono" value={formData.telefono} onChange={handleInputChange} className={inputClass} /></div>
                                                        </div>
                                                        <div><label className={labelClass}>Zona / Cobertura</label><select name="zona_id" value={formData.zona_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}</select></div>
                                                        <div><label className={labelClass}>Dirección</label><textarea name="direccion" value={formData.direccion} onChange={(e: any) => handleInputChange(e)} rows={2} className={`${inputClass} resize-none`} /></div>

                                                        {/* GPS Update */}
                                                        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                                            <div className="flex justify-between items-center mb-3"><span className="text-xs font-black uppercase text-slate-500">Ubicación (GPS)</span><button type="button" onClick={handleCaptureGPS} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Auto-Capturar</button></div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <input name="latitud" placeholder="Latitud" value={formData.latitud} onChange={handleInputChange} className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-black rounded-lg w-full outline-none" />
                                                                <input name="longitud" placeholder="Longitud" value={formData.longitud} onChange={handleInputChange} className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-black rounded-lg w-full outline-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <NativeCellRow icon={IdentificationIcon} color="bg-orange-500 text-white" label="Cédula" value={cliente?.cedula || 'Pendiente'} mono copy />
                                                        <NativeCellRow icon={PhoneIcon} color="bg-emerald-500 text-white" label="Teléfono" value={cliente?.telefono || '—'} copy />
                                                        <NativeCellRow icon={MapPinIcon} color="bg-blue-500 text-white" label="Zona" value={cliente?.zona?.nombre || '—'} />
                                                        <NativeCellRow icon={MapPinIcon} color="bg-slate-500 text-white" label="Dirección" value={cliente?.direccion || 'Domicilio Conocido'} />

                                                        <div className="p-4 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-sm"><MapPinIcon className="w-5 h-5" /></div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Coordenadas</p>
                                                                    <p className="text-sm font-mono font-black text-slate-700 dark:text-slate-300">{cliente?.latitud && cliente?.longitud ? `${cliente.latitud}, ${cliente.longitud}` : 'No registradas'}</p>
                                                                </div>
                                                            </div>
                                                            {cliente?.latitud && <button onClick={handleAbrirMapa} className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"><MapPinIcon className="w-4 h-4" /> Mapa</button>}
                                                        </div>
                                                    </>
                                                )}
                                            </NativeListGroup>
                                        </div>

                                        {/* COLUMNA 2: OLT, NAP y MikroTik */}
                                        <div className="space-y-5">
                                            <NativeListGroup title="Infraestructura de Fibra Óptica">
                                                {isEditing ? (
                                                    <div className="p-4 space-y-4">
                                                        <div><label className={labelClass}>OLT Central</label><select name="olt_id" value={formData.olt_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar OLT...</option>{olts.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div><label className={labelClass}>Caja NAP</label><select name="caja_nap_id" value={formData.caja_nap_id} onChange={handleInputChange} className={inputClass}><option value={0}>Ninguna</option>{naps.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select></div>
                                                            <div><label className={labelClass}>Puerto NAP</label><select name="puerto_nap" value={formData.puerto_nap} onChange={handleInputChange} className={inputClass} disabled={!formData.caja_nap_id}><option value={0}>Seleccionar...</option>{renderPuertoOptions()}</select></div>
                                                        </div>

                                                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                                            <label className={labelClass}>Equipo ONU</label>
                                                            {cliente?.onu_asignada ? (
                                                                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                                                    <span className="font-mono font-black text-sm">{cliente.onu_asignada.identificador}</span>
                                                                    <button type="button" onClick={abrirModalSwap} className="text-[10px] font-black bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-lg uppercase transition-colors hover:bg-amber-500/20">Cambiar ONU</button>
                                                                </div>
                                                            ) : (
                                                                <select name="identificador_onu" value={formData.identificador_onu} onChange={handleInputChange} className={inputClass} disabled={!formData.olt_id}>
                                                                    {!formData.olt_id ? <option value="">Selecciona OLT primero...</option> : <><option value="">Vincular desde inventario...</option>{equiposCompatibles.map(eq => <option key={eq.id} value={eq.identificador}>{eq.identificador}</option>)}</>}
                                                                </select>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <NativeCellRow icon={ServerIcon} color="bg-cyan-600 text-white" label="OLT" value={cliente?.olt?.nombre || '—'} />
                                                        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-xl bg-teal-500 text-white shadow-sm"><CubeIcon className="w-5 h-5" /></div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Caja NAP</p>
                                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{cliente?.caja_nap?.nombre || 'No Asignada'}</p>
                                                                </div>
                                                            </div>
                                                            {cliente?.puerto_nap && <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs font-black text-slate-800 dark:text-slate-200 shadow-sm">Pto. {cliente.puerto_nap}</div>}
                                                        </div>
                                                    </>
                                                )}
                                            </NativeListGroup>

                                            <NativeListGroup title="Lógica de Red (MikroTik)">
                                                {isEditing ? (
                                                    <div className="p-4 space-y-4">
                                                        <div><label className={labelClass}>Router Concentrador</label><select name="router_id" value={formData.router_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
                                                        {isPPPoE && (
                                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                                                <div><label className={labelClass}>User PPPoE</label><input name="user_pppoe" value={formData.user_pppoe} onChange={handleInputChange} className={inputClass} /></div>
                                                                <div><label className={labelClass}>Pass PPPoE</label><input name="pass_pppoe" value={formData.pass_pppoe} onChange={handleInputChange} className={inputClass} /></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <NativeCellRow icon={GlobeAltIcon} color="bg-indigo-600 text-white" label="Concentrador MikroTik" value={cliente?.router?.nombre || '—'} />
                                                        {isPPPoE && <NativeCellRow icon={IdentificationIcon} color="bg-violet-600 text-white" label="Perfil PPPoE" value={cliente?.user_pppoe || '—'} mono copy />}
                                                    </>
                                                )}
                                            </NativeListGroup>
                                        </div>
                                    </Tab.Panel>
                                )}

                                {/* PESTAÑA 2: HISTORIAL DE FACTURAS */}
                                <Tab.Panel className="animate-in fade-in duration-200">
                                    <NativeListGroup title="Historial Financiero">
                                        {facturas.length === 0 ? (
                                            <div className="p-12 text-center text-sm font-bold text-slate-400">Sin movimientos registrados.</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                                {facturas.map((f) => (
                                                    <div key={f.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className={classNames(
                                                                "p-2.5 rounded-xl font-black font-mono text-xs border shadow-sm",
                                                                f.estado === 'pagada' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                            )}>#{f.id.toString().padStart(4, '0')}</div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{f.detalles || `Mensualidad ${f.mes_correspondiente}`}</p>
                                                                <p className="text-xs text-slate-400 mt-0.5">{new Date(f.fecha_emision).toLocaleDateString('es-MX')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-base font-black font-mono text-slate-900 dark:text-white">${f.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                                            <span className={classNames(
                                                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mt-1 inline-block",
                                                                f.estado === 'pagada' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                                            )}>{f.estado}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </NativeListGroup>
                                </Tab.Panel>
                            </Tab.Panels>
                        </Tab.Group>

                        {/* ACCIONES MÓVILES FLOTANTES (Solo visibles en pantallas pequeñas) */}
                        {!loadingData && (
                            <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-[#0d0e12]/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/60 z-40 flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                                {isEditing ? (
                                    <>
                                        <button onClick={toggleEditMode} className="flex-1 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
                                        <button onClick={handleGuardar} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Guardar</button>
                                    </>
                                ) : (
                                    <>
                                        {cliente?.estado === 'cancelado' && (
                                            <button onClick={handleReactivarCliente} className="flex-1 bg-emerald-500 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                                                <ArrowPathRoundedSquareIcon className="w-5 h-5" /> Reactivar
                                            </button>
                                        )}
                                        <button onClick={toggleEditMode} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                                            <PencilSquareIcon className="w-5 h-5" /> Editar
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </Dialog.Panel>
                </div>
            </Dialog>

            {/* MODAL SWAP DE ONU SEGURA */}
            <Transition appear show={isSwapOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsSwapOpen(false)}>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-sm bg-white dark:bg-[#0d0e12] rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                    <ArrowPathRoundedSquareIcon className="w-5 h-5 text-amber-500" /> Cambio de ONU
                                </h3>
                                <button onClick={() => setIsSwapOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={handleProcesarSwap} className="space-y-4">
                                {cliente?.onu_asignada && (
                                    <div>
                                        <label className={labelClass}>Estado del equipo retirado</label>
                                        <select value={swapData.estado_vieja_onu} onChange={(e) => setSwapData(p => ({ ...p, estado_vieja_onu: e.target.value }))} className={inputClass}>
                                            <option value="CON_FALLA">❌ Averiado / Garantía</option>
                                            <option value="DISPONIBLE">✅ Funcional (A Bodega)</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className={labelClass}>Nueva ONU a Instalar</label>
                                    {!formData.olt_id ? (
                                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200 dark:border-amber-900/50 text-xs font-bold rounded-xl">Cierra este cuadro y guarda una OLT en la ficha primero.</div>
                                    ) : equiposCompatibles.length === 0 ? (
                                        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-200 dark:border-rose-900/50 text-xs font-bold rounded-xl">Sin stock para OLT {tecOltActual || ''}.</div>
                                    ) : (
                                        <select required value={swapData.nuevo_inventario_id} onChange={(e) => setSwapData(p => ({ ...p, nuevo_inventario_id: e.target.value }))} className={inputClass}>
                                            <option value="">Seleccionar del inventario...</option>
                                            {equiposCompatibles.map(e => <option key={e.id} value={e.id}>{e.identificador}</option>)}
                                        </select>
                                    )}
                                </div>
                                <button type="submit" disabled={!swapData.nuevo_inventario_id} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest mt-4 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">Confirmar Migración</button>
                            </form>
                        </Dialog.Panel>
                    </div>
                </Dialog>
            </Transition>
        </Transition>
    );
}

// ================= COMPONENTES DE INTERFAZ =================

const NativeListGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-2">
        <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">{title}</h4>
        <div className="bg-white dark:bg-[#0d0e12] border border-slate-200/80 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            {children}
        </div>
    </div>
);

const NativeCellRow = ({ label, value, mono, copy, icon: Icon, color }: any) => (
    <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 last:border-0 group hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={classNames("p-2 rounded-xl shrink-0 shadow-sm", color)}><Icon className="w-5 h-5" /></div>
            <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className={classNames("text-sm truncate", mono ? 'font-mono font-black text-blue-600 dark:text-blue-400' : 'font-bold text-slate-800 dark:text-slate-200')}>{value}</p>
            </div>
        </div>
        {copy && value && value !== '—' && (
            <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado"); }} className="p-2 text-slate-400 hover:text-blue-600 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
        )}
    </div>
);

const TabItem = ({ label, icon: Icon }: any) => (
    <Tab className={({ selected }) => classNames(
        'w-full py-2.5 text-xs font-black rounded-xl flex items-center justify-center gap-2 outline-none transition-all duration-200 uppercase tracking-wider',
        selected
            ? 'bg-white dark:bg-slate-800/60 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700/50'
            : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-900'
    )}>
        <Icon className="w-4 h-4 shrink-0" /> <span>{label}</span>
    </Tab>
);
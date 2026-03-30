import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, UserIcon, WifiIcon, ServerIcon, 
    CalendarDaysIcon, ClipboardDocumentIcon, 
    DocumentTextIcon, IdentificationIcon, 
    PencilSquareIcon, CheckCircleIcon, 
    BanknotesIcon, PlusIcon,
    QrCodeIcon, GlobeAmericasIcon, CubeIcon, MapPinIcon
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

const inputClass = "w-full bg-[#0b0c10] border border-slate-700 text-white text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent block p-3 outline-none transition-all";
const labelClass = "block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider";

export default function ClientDetailModal({ isOpen, onClose, cliente: clienteInicial, onEditSuccess }: Props) {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Estados para Saldo Manual
    const [addingSaldo, setAddingSaldo] = useState(false);
    const [montoSaldo, setMontoSaldo] = useState('');

    const [facturas, setFacturas] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    
    // Catálogos
    const [routers, setRouters] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]);
    const [zonas, setZonas] = useState<any[]>([]);
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [naps, setNaps] = useState<any[]>([]);

    // Formulario Edición
    const [formData, setFormData] = useState({
        nombre: '', cedula: '', telefono: '', direccion: '',
        plantilla_id: 0, zona_id: 0, router_id: 0, plan_id: 0,
        ip_asignada: '', user_pppoe: '', pass_pppoe: '', mac_address: '',
        caja_nap_id: 0, puerto_nap: 0,
        latitud: '', longitud: ''
    });

    useEffect(() => {
        if (isOpen && clienteInicial?.id) {
            cargarDatosCompletos(clienteInicial.id);
            setIsEditing(false);
            setAddingSaldo(false);
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
            setFacturas(resFacturas.data.items || []);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando detalles");
        } finally {
            setLoadingData(false);
        }
    };

    const cargarCatalogos = async () => {
        if (routers.length > 0) return;
        try {
            const [r, p, z, pl, n] = await Promise.all([
                client.get('/network/routers/'), 
                client.get('/planes/'),
                client.get('/zonas'), 
                client.get('/configuracion/plantillas-facturacion'),
                client.get('/infraestructura/naps')
            ]);
            setRouters(r.data); setPlanes(p.data); setZonas(z.data); setPlantillas(pl.data); setNaps(n.data);
        } catch (error) { toast.error("Error cargando listas"); }
    };

    const toggleEditMode = () => {
        if (!isEditing && cliente) {
            cargarCatalogos();
            setFormData({
                nombre: cliente.nombre || '', 
                cedula: cliente.cedula || '', 
                telefono: cliente.telefono || '', direccion: cliente.direccion || '',
                plantilla_id: cliente.plantilla?.id || 0, zona_id: cliente.zona?.id || 0,
                router_id: cliente.router?.id || 0, plan_id: cliente.plan?.id || 0,
                ip_asignada: cliente.ip_asignada || '', user_pppoe: cliente.user_pppoe || '',
                pass_pppoe: cliente.pass_pppoe || '', mac_address: cliente.mac_address || '',
                caja_nap_id: cliente.caja_nap?.id || 0, puerto_nap: cliente.puerto_nap || 0,
                latitud: cliente.latitud ? cliente.latitud.toString() : '', 
                longitud: cliente.longitud ? cliente.longitud.toString() : ''
            });
            setIsEditing(true);
        } else { setIsEditing(false); }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const finalValue = name === 'cedula' ? value.toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: name.includes('_id') || name === 'puerto_nap' ? Number(finalValue) : finalValue }));
    };

    const handleGuardar = async () => {
        if (!cliente) return;
        const load = toast.loading("Guardando cambios...");
        try {
            const payload = {
                ...formData,
                latitud: formData.latitud ? parseFloat(formData.latitud) : null,
                longitud: formData.longitud ? parseFloat(formData.longitud) : null
            };

            await client.put(`/clientes/${cliente.id}`, payload);
            toast.success("Cliente actualizado", { id: load });
            
            const res = await client.get(`/clientes/${cliente.id}`);
            setCliente(res.data);
            setIsEditing(false);
            if (onEditSuccess) onEditSuccess();
        } catch (error) { toast.error("Error al guardar", { id: load }); }
    };

    const handleAgregarSaldo = async () => {
        if (!cliente || !montoSaldo || Number(montoSaldo) <= 0) return;
        const load = toast.loading("Procesando abono...");
        try {
            const nuevoSaldo = (cliente.saldo_a_favor || 0) + Number(montoSaldo);
            await client.put(`/clientes/${cliente.id}`, { ...cliente, saldo_a_favor: nuevoSaldo });
            toast.success(`Abonado: $${montoSaldo}`, { id: load });
            setCliente({ ...cliente, saldo_a_favor: nuevoSaldo });
            setAddingSaldo(false);
            setMontoSaldo('');
            if (onEditSuccess) onEditSuccess();
        } catch (error) { toast.error("Error al agregar saldo", { id: load }); }
    };

    const handleAbrirMapa = () => {
        if (cliente?.latitud && cliente?.longitud) {
            window.open(`https://maps.google.com/?q=${cliente.latitud},${cliente.longitud}`, '_blank');
        } else {
            toast.error("El cliente no tiene coordenadas guardadas.");
        }
    };
    
    if (!cliente && loadingData) return null; 
    if (!cliente) return null;

    const isPPPoE = cliente.router?.tipo_seguridad === 'pppoe';
    const fechaInstalacion = new Date(cliente.created_at || Date.now()).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-black/95 backdrop-blur-sm" aria-hidden="true" />
                
                {/* 👇 MODIFICACIÓN CLAVE: Ajuste de padding para móviles 👇 */}
                <div className="fixed inset-0 overflow-y-auto overflow-x-hidden flex items-start sm:items-center justify-center p-0 sm:p-4">
                    
                    {/* 👇 MODIFICACIÓN CLAVE: min-h-screen en móvil para que ocupe todo el espacio 👇 */}
                    <Dialog.Panel className="w-full min-h-screen sm:min-h-0 sm:h-auto sm:max-h-[90vh] sm:max-w-5xl bg-[#12131a] sm:border border-slate-700 sm:rounded-3xl shadow-2xl flex flex-col relative font-sans">
                        
                        {/* HEADER RESPONSIVO */}
                        <div className="bg-[#0f1014] p-4 sm:p-6 border-b border-slate-800 relative z-10 sticky top-0">
                            
                            {/* Botón Cerrar (Esquina superior derecha en móvil) */}
                            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 bg-slate-800 p-2 rounded-xl hover:text-white hover:bg-slate-700 transition sm:hidden">
                                <XMarkIcon className="w-5 h-5"/>
                            </button>

                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex gap-3 sm:gap-4 items-center w-full">
                                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-lg shrink-0 ring-2 ring-slate-800">
                                        {cliente.nombre ? cliente.nombre.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="flex-1 overflow-hidden pr-8 sm:pr-0"> {/* Padding derecho para que no pise la "X" en móvil */}
                                        {isEditing ? (
                                            <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="bg-slate-900 border border-blue-500 rounded px-3 py-1.5 text-base sm:text-lg font-bold text-white w-full outline-none mb-1"/>
                                        ) : (
                                            <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight truncate">{cliente.nombre}</h3>
                                        )}
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider border ${cliente.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{cliente.estado}</span>
                                            <span className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1"><IdentificationIcon className="w-3.5 h-3.5"/> ID: {cliente.id}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Botones de Acción (Ocultos en móvil y movidos abajo, Visibles en Desktop) */}
                                <div className="hidden sm:flex gap-2 shrink-0">
                                    {isEditing ? (
                                        <>
                                            <button onClick={toggleEditMode} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-sm font-bold transition">Cancelar</button>
                                            <button onClick={handleGuardar} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/50 transition flex items-center gap-2"><CheckCircleIcon className="w-4 h-4"/> Guardar</button>
                                        </>
                                    ) : (
                                        <button onClick={toggleEditMode} className="text-blue-400 bg-blue-500/10 px-3 py-2 rounded-xl hover:bg-blue-500/20 transition flex items-center gap-2 text-sm font-bold"><PencilSquareIcon className="w-4 h-4"/> Editar</button>
                                    )}
                                    <button onClick={onClose} className="text-slate-400 bg-slate-800 p-2.5 rounded-xl hover:text-white hover:bg-slate-700 transition"><XMarkIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                            
                            {/* BARRA TÉCNICA RÁPIDA (Scroll Horizontal en Móvil) */}
                            <div className="mt-5 flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto custom-scrollbar pb-2 sm:pb-0 snap-x">
                                <div className="bg-[#1a1b23] border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-3 min-w-[140px] snap-start shrink-0">
                                    <div className="bg-emerald-500/10 p-1.5 rounded-lg"><QrCodeIcon className="w-5 h-5 text-emerald-500"/></div>
                                    <div className="overflow-hidden">
                                        <p className="text-[9px] uppercase font-bold text-slate-500">Cédula</p>
                                        <p className="text-xs sm:text-sm font-mono font-bold text-emerald-400 truncate">{isEditing ? 'EDITANDO' : cliente.cedula || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="bg-[#1a1b23] border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-3 min-w-[140px] snap-start shrink-0">
                                    <div className="bg-indigo-500/10 p-1.5 rounded-lg"><ServerIcon className="w-5 h-5 text-indigo-500"/></div>
                                    <div className="overflow-hidden">
                                        <p className="text-[9px] uppercase font-bold text-slate-500">Nodo</p>
                                        <p className="text-xs sm:text-sm font-bold text-white truncate">{isEditing ? 'EDITANDO' : cliente.router?.nombre || 'S/A'}</p>
                                    </div>
                                </div>
                                <div className="bg-[#1a1b23] border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-3 min-w-[140px] snap-start shrink-0">
                                    <div className="bg-blue-500/10 p-1.5 rounded-lg"><GlobeAmericasIcon className="w-5 h-5 text-blue-500"/></div>
                                    <div className="overflow-hidden">
                                        <p className="text-[9px] uppercase font-bold text-slate-500">IP Asignada</p>
                                        <p className="text-xs sm:text-sm font-mono font-bold text-white truncate">{isEditing ? 'EDITANDO' : cliente.ip_asignada || '---'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Tab.Group as="div" className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-none border-b border-slate-700 bg-[#16171d] px-4 sm:px-6">
                                <Tab.List className="flex gap-4 sm:gap-8">
                                    <TabItem label="General" icon={UserIcon} />
                                    <TabItem label="Historial" icon={DocumentTextIcon} /> {/* Texto más corto para móvil */}
                                </Tab.List>
                            </div>

                            <Tab.Panels className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#0f1014]">
                                <Tab.Panel className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 sm:pb-0">
                                    
                                    <div className="lg:col-span-2 space-y-6">
                                        
                                        {/* SECCIÓN: INFRAESTRUCTURA */}
                                        <section>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><WifiIcon className="w-4 h-4"/> Configuración de Red</h4>
                                            <div className="bg-[#1a1b23] rounded-2xl border border-slate-800 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                                {isEditing ? (
                                                    <>
                                                        <div className="col-span-1 sm:col-span-2"><label className={labelClass}>Router Mikrotik</label><select name="router_id" value={formData.router_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
                                                        <div><label className={labelClass}>IP Address</label><input name="ip_asignada" value={formData.ip_asignada} onChange={handleInputChange} className={inputClass}/></div>
                                                        <div><label className={labelClass}>MAC Address</label><input name="mac_address" value={formData.mac_address} onChange={handleInputChange} className={inputClass}/></div>
                                                        
                                                        {/* CAMPOS NAP */}
                                                        <div className="col-span-1 sm:col-span-2 border-t border-slate-700/50 pt-4 mt-2">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className={`${labelClass} text-orange-500`}>Caja NAP</label>
                                                                    <select name="caja_nap_id" value={formData.caja_nap_id} onChange={handleInputChange} className={inputClass}>
                                                                        <option value={0}>Sin Asignar</option>
                                                                        {naps.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className={`${labelClass} text-orange-500`}>Puerto</label>
                                                                    <input type="number" name="puerto_nap" value={formData.puerto_nap} onChange={handleInputChange} className={inputClass}/>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="col-span-1 sm:col-span-2 pt-2"><label className={`${labelClass} text-emerald-500`}>Cód. cliente (Cédula)</label><input name="cedula" value={formData.cedula} onChange={handleInputChange} className={`${inputClass} font-mono font-bold border-emerald-500/30 text-emerald-400 focus:border-emerald-500 uppercase`}/></div>
                                                        {isPPPoE && (
                                                            <><div><label className={labelClass}>Usuario PPPoE</label><input name="user_pppoe" value={formData.user_pppoe} onChange={handleInputChange} className={inputClass}/></div><div><label className={labelClass}>Password PPPoE</label><input name="pass_pppoe" value={formData.pass_pppoe} onChange={handleInputChange} className={inputClass}/></div></>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <InfoItem label="Dirección IP" value={cliente.ip_asignada} mono copy />
                                                        <InfoItem label="MAC Address" value={cliente.mac_address} mono />
                                                        
                                                        <div className="col-span-1 sm:col-span-2 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-orange-500/10 p-2 rounded-lg"><CubeIcon className="w-5 h-5 text-orange-500"/></div>
                                                                <div>
                                                                    <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-bold">Caja NAP</p>
                                                                    <p className="text-sm sm:text-base text-white font-bold">{cliente.caja_nap?.nombre || 'No asignada'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right px-3 sm:px-4 border-l border-slate-700">
                                                                <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-bold">Puerto</p>
                                                                <p className="text-lg sm:text-xl font-bold text-white">{cliente.puerto_nap || '-'}</p>
                                                            </div>
                                                        </div>
                                                        {isPPPoE && <div className="col-span-1 sm:col-span-2"><InfoItem label="Usuario PPPoE" value={cliente.user_pppoe} mono copy /></div>}
                                                    </>
                                                )}
                                            </div>
                                        </section>

                                        {/* SECCIÓN: DATOS PERSONALES Y GPS */}
                                        <section>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><IdentificationIcon className="w-4 h-4"/> Información Personal</h4>
                                            <div className="bg-[#1a1b23] rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
                                                {isEditing ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="col-span-1 sm:col-span-2"><label className={labelClass}>Nombre Completo</label><input name="nombre" value={formData.nombre} onChange={handleInputChange} className={inputClass}/></div>
                                                        <div><label className={labelClass}>Teléfono</label><input name="telefono" value={formData.telefono} onChange={handleInputChange} className={inputClass}/></div>
                                                        <div><label className={labelClass}>Zona</label><select name="zona_id" value={formData.zona_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}</select></div>
                                                        <div className="col-span-1 sm:col-span-2"><label className={labelClass}>Dirección</label><input name="direccion" value={formData.direccion} onChange={handleInputChange} className={inputClass}/></div>
                                                        
                                                        <div className="col-span-1 sm:col-span-2 border-t border-slate-700/50 pt-4 mt-2">
                                                            <label className={`${labelClass} text-blue-400 flex items-center gap-1`}><MapPinIcon className="w-3.5 h-3.5"/> Coordenadas GPS</label>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                                                <input type="text" name="latitud" placeholder="Latitud" value={formData.latitud} onChange={handleInputChange} className={`${inputClass} font-mono`}/>
                                                                <input type="text" name="longitud" placeholder="Longitud" value={formData.longitud} onChange={handleInputChange} className={`${inputClass} font-mono`}/>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-4"><InfoItem label="Teléfono" value={cliente.telefono} /><InfoItem label="Zona" value={cliente.zona?.nombre} /></div>
                                                        <InfoItem label="Dirección de Instalación" value={cliente.direccion} />
                                                        
                                                        <div className="col-span-1 sm:col-span-2 bg-slate-900/30 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-blue-500/50 transition">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg shrink-0 ${cliente.latitud ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                                                    <MapPinIcon className="w-5 h-5"/>
                                                                </div>
                                                                <div className="overflow-hidden">
                                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Ubicación GPS</p>
                                                                    <p className="text-xs text-slate-300 font-mono truncate">
                                                                        {cliente.latitud && cliente.longitud 
                                                                            ? `${cliente.latitud}, ${cliente.longitud}` 
                                                                            : 'Sin coordenadas registradas'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {cliente.latitud && cliente.longitud && (
                                                                <button onClick={handleAbrirMapa} className="w-full sm:w-auto bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                                                                    Abrir Mapa
                                                                </button>
                                                            )}
                                                        </div>

                                                        <p className="text-[10px] sm:text-xs text-slate-600 text-right">Registrado el: {fechaInstalacion}</p>
                                                    </>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    {/* COLUMNA DERECHA (Finanzas) */}
                                    <div className="space-y-4">
                                        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden group border border-emerald-500/20">
                                            <div className="relative z-10 text-white">
                                                <div className="flex justify-between items-start mb-2"><div className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/70">Saldo a Favor</div><button onClick={() => setAddingSaldo(!addingSaldo)} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition backdrop-blur-sm"><PlusIcon className="w-5 h-5 text-white" /></button></div>
                                                <div className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-sm">${(cliente.saldo_a_favor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                                                {addingSaldo && (
                                                    <div className="mt-4 bg-black/40 p-3 rounded-xl border border-white/10 backdrop-blur-md animate-in slide-in-from-top-2">
                                                        <p className="text-xs mb-2 font-bold">Agregar Saldo Manual</p>
                                                        <div className="flex gap-2"><input type="number" placeholder="0.00" className="w-full bg-black/20 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400 transition" value={montoSaldo} onChange={e => setMontoSaldo(e.target.value)} autoFocus /><button onClick={handleAgregarSaldo} className="bg-emerald-400 text-emerald-900 px-4 py-1.5 rounded-lg text-xs font-black hover:bg-white transition shadow-lg">OK</button></div>
                                                    </div>
                                                )}
                                            </div>
                                            <BanknotesIcon className="absolute right-[-20px] bottom-[-30px] w-32 sm:w-40 h-32 sm:h-40 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700 ease-out" />
                                        </div>

                                        <div className="bg-[#1a1b23] rounded-2xl border border-slate-800 p-4 sm:p-5 group hover:border-blue-500/30 transition">
                                            <div className="flex justify-between items-center mb-3"><span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">Plan Contratado</span><WifiIcon className="w-5 h-5 text-blue-500 group-hover:scale-110 transition"/></div>
                                            {isEditing ? (
                                                <select name="plan_id" value={formData.plan_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
                                            ) : (
                                                <div><div className="text-lg sm:text-xl font-bold text-white">{cliente.plan?.nombre || 'Sin Plan'}</div><div className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">${cliente.plan?.precio || 0} <span className="text-slate-600 text-[10px] sm:text-xs">/ mes</span></div></div>
                                            )}
                                        </div>

                                        <div className="bg-[#1a1b23] rounded-2xl border border-slate-800 p-4 sm:p-5 group hover:border-indigo-500/30 transition">
                                            <div className="flex justify-between items-center mb-3"><span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">Ciclo Facturación</span><CalendarDaysIcon className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition"/></div>
                                            {isEditing ? (
                                                <select name="plantilla_id" value={formData.plantilla_id} onChange={handleInputChange} className={inputClass}><option value={0}>Seleccionar...</option>{plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre} (Día {p.dia_pago})</option>)}</select>
                                            ) : (
                                                <div className="flex items-end gap-2"><div className="text-3xl sm:text-4xl font-black text-white leading-none">{cliente.plantilla?.dia_pago || 1}</div><div className="text-[10px] sm:text-xs text-slate-500 mb-1 font-bold">de cada mes</div></div>
                                            )}
                                        </div>
                                    </div>
                                </Tab.Panel>
                                
                                {/* PANEL 2: FACTURAS */}
                                <Tab.Panel>
                                     <div className="bg-[#1a1b23] rounded-2xl border border-slate-800 overflow-hidden mb-16 sm:mb-0">
                                        <div className="p-3 sm:p-4 border-b border-slate-800 bg-[#16171d]"><h4 className="font-bold text-slate-300 text-xs sm:text-sm">Historial de Pagos y Recibos</h4></div>
                                        {loadingData ? (
                                            <div className="p-12 text-center text-slate-500 animate-pulse">Cargando datos...</div>
                                        ) : facturas.length === 0 ? (
                                            <div className="p-12 text-center text-slate-500 italic">No hay movimientos.</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs sm:text-sm min-w-[400px]">
                                                    <thead className="bg-[#111] text-slate-500 uppercase text-[9px] sm:text-[10px] font-bold tracking-wider">
                                                        <tr><th className="px-4 sm:px-5 py-3">Folio</th><th className="px-4 sm:px-5 py-3">Emisión</th><th className="px-4 sm:px-5 py-3 text-right">Monto</th><th className="px-4 sm:px-5 py-3 text-center">Estado</th></tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800">
                                                        {facturas.map((f) => (
                                                            <tr key={f.id} className="hover:bg-slate-800/50 transition group">
                                                                <td className="px-4 sm:px-5 py-3 font-mono text-slate-400 group-hover:text-white">#{f.id.toString().padStart(5,'0')}</td>
                                                                <td className="px-4 sm:px-5 py-3 text-slate-300">{new Date(f.fecha_emision).toLocaleDateString()}</td>
                                                                <td className="px-4 sm:px-5 py-3 text-right text-white font-bold">${f.total}</td>
                                                                <td className="px-4 sm:px-5 py-3 text-center"><span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase border ${f.estado === 'pagada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : f.es_promesa_activa ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>{f.es_promesa_activa ? 'Promesa' : f.estado}</span></td>
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

                        {/* BOTONERA MÓVIL (Fija en la parte inferior) */}
                        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#0f1014] border-t border-slate-800 z-50 flex gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
                             {isEditing ? (
                                <>
                                    <button onClick={toggleEditMode} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-sm font-bold transition">Cancelar</button>
                                    <button onClick={handleGuardar} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/50 transition flex justify-center items-center gap-2"><CheckCircleIcon className="w-5 h-5"/> Guardar</button>
                                </>
                            ) : (
                                <button onClick={toggleEditMode} className="w-full text-blue-400 bg-blue-500/10 py-3 rounded-xl hover:bg-blue-500/20 transition flex justify-center items-center gap-2 text-sm font-bold"><PencilSquareIcon className="w-5 h-5"/> Editar Información</button>
                            )}
                        </div>

                    </Dialog.Panel>
                </div>
            </Dialog>
        </Transition>
    );
}

// Subcomponentes
const TabItem = ({ label, icon: Icon }: any) => (<Tab className={({ selected }) => classNames('py-3 sm:py-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition outline-none whitespace-nowrap', selected ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300')}><Icon className="w-4 h-4 sm:w-5 sm:h-5" /> {label}</Tab>);
const InfoItem = ({ label, value, mono = false, copy }: any) => (<div className="bg-slate-900/50 p-2.5 sm:p-3 rounded-xl border border-slate-700/50 group relative hover:border-slate-600 transition"><span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold mb-0.5 sm:mb-1 block tracking-wider">{label}</span><span className={`text-xs sm:text-sm block truncate text-slate-200 ${mono ? 'font-mono' : ''}`}>{value || 'N/A'}</span>{copy && value && (<button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado"); }} className="absolute top-2 right-2 p-1 text-slate-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition" title="Copiar"><ClipboardDocumentIcon className="w-4 h-4"/></button>)}</div>);
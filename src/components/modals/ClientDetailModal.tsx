import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
    XMarkIcon, ServerIcon,
    ClipboardDocumentIcon, DocumentTextIcon, IdentificationIcon,
    PencilSquareIcon, PlusIcon, MapPinIcon,
    GlobeAltIcon, PhoneIcon, ArrowPathRoundedSquareIcon,
    CheckCircleIcon, ExclamationCircleIcon, SignalIcon, WifiIcon
} from '@heroicons/react/24/outline';
import type { Cliente } from '../../types';
import '../../styles/client-detail-sheet.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    cliente: any;
    onEditSuccess?: () => void;
}

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

// Estilos Flat
const flatInputClass = "w-full bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-[13px] sm:text-sm rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 block p-4 outline-none transition-all duration-200 placeholder:text-slate-400 border border-transparent";
const disabledInputClass = "w-full bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-500 text-[13px] sm:text-sm rounded-2xl block p-4 outline-none cursor-not-allowed border border-transparent";
const labelClass = "block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 pl-1 select-none";

export default function ClientDetailModal({ isOpen, onClose, cliente: clienteInicial, onEditSuccess }: Props) {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [addingSaldo, setAddingSaldo] = useState(false);
    const [montoSaldo, setMontoSaldo] = useState('');
    const [facturas, setFacturas] = useState<any[]>([]);
    const [resumenComercial, setResumenComercial] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'resumen' | 'red' | 'facturas' | 'instalacion'>('resumen'); // FACTURACION_ISP_V2_CLIENT_DETAIL_TABS_FRONTEND // FACTURACION_ISP_V2_CLIENT_DETAIL_FRONTEND
    const [loadingData, setLoadingData] = useState(false);

    // CATALOGOS
    const [routers, setRouters] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]);
    const [zonas, setZonas] = useState<any[]>([]);
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [naps, setNaps] = useState<any[]>([]);
    const [olts, setOlts] = useState<any[]>([]);
    const [puertosOcupados, setPuertosOcupados] = useState<number[]>([]);

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
            setResumenComercial(null);
            setActiveTab('resumen');
            setIsSwapOpen(false);
        }
    }, [isOpen, clienteInicial]);

    const cargarDatosCompletos = async (id: number) => {
        setLoadingData(true);
        try {
            const [resCliente, resFacturas, resResumen] = await Promise.all([
                client.get(`/clientes/${id}`),
                client.get(`/finanzas/listado-completo?cliente_id=${id}`),
                client.get(`/clientes/${id}/resumen-comercial`).catch(() => ({ data: null }))
            ]);
            setCliente(resCliente.data);
            setResumenComercial(resResumen.data || null);
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
            // Evaluamos la zona inicial del cliente para pre-cargar las NAPs exactas
            const zonaActual = cliente?.zona_id || cliente?.zona?.id || 0;
            const reqNaps = zonaActual 
                ? client.get(`/infraestructura/naps?zona_id=${zonaActual}`) 
                : Promise.resolve({ data: [] });

            const [resRouters, resPlanes, resZonas, resPlantillas, resOlts, resInventario, resNaps] = await Promise.all([
                client.get('network/routers/'),
                client.get('planes/'),
                client.get('zonas/'),
                client.get('configuracion/plantillas-facturacion/'),
                client.get('olts/'),
                client.get('/inventario/?estado=DISPONIBLE'),
                reqNaps // <--- Se carga en paralelo con el resto
            ]);

            setRouters(Array.isArray(resRouters.data) ? resRouters.data : []);
            setPlanes(Array.isArray(resPlanes.data) ? resPlanes.data : []);
            setZonas(Array.isArray(resZonas.data) ? resZonas.data : []);
            setPlantillas(Array.isArray(resPlantillas.data) ? resPlantillas.data : []);
            setOlts(Array.isArray(resOlts.data) ? resOlts.data : []);
            setEquiposDisponibles(Array.isArray(resInventario.data) ? resInventario.data : []);
            setNaps(Array.isArray(resNaps.data) ? resNaps.data : []); // <--- Se asigna inmediatamente
        } catch (error) { 
            toast.error("Error cargando listas de configuración"); 
        }
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
        const parsedValue = name.includes('_id') || name === 'puerto_nap' ? Number(value) : value;

        setFormData(prev => {
            const updated = { ...prev, [name]: parsedValue };
            
            // Si cambian de Zona, borramos la Caja y el Puerto seleccionados
            if (name === 'zona_id') {
                updated.caja_nap_id = 0;
                updated.puerto_nap = 0;
            }
            if (name === 'caja_nap_id') {
                updated.puerto_nap = 0;
            }
            return updated;
        });

        // 🔥 Petición instantánea si cambian la Zona en el selector
        if (name === 'zona_id') {
            if (parsedValue) {
                client.get(`/infraestructura/naps?zona_id=${parsedValue}`)
                    .then(res => setNaps(Array.isArray(res.data) ? res.data : []))
                    .catch(() => setNaps([]));
            } else {
                setNaps([]);
            }
        }
    };

    // Consulta de puertos ocupados
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
        } catch (error) { toast.error("Error al guardar", { id: load }); }
    };

    const handleReactivarCliente = async () => {
        if (!cliente || cliente.estado !== 'cancelado') return;
        if (!confirm("¿Reactivar este servicio en MikroTik?")) return;
        const load = toast.loading("Procesando...");
        try {
            await client.post(`/clientes/${cliente.id}/reactivar`);
            toast.success("Servicio Reactivado", { id: load });
            cargarDatosCompletos(cliente.id);
            if (onEditSuccess) onEditSuccess();
        } catch (error: any) { toast.error("Error al reactivar", { id: load }); }
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

    const handleCaptureGPS = () => {
        if (!navigator.geolocation) return toast.error("GPS no soportado");
        const loadId = toast.loading("Obteniendo ubicación...");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(prev => ({ ...prev, latitud: pos.coords.latitude.toString(), longitud: pos.coords.longitude.toString() }));
                toast.success("Ubicación lista", { id: loadId });
            },
            () => toast.error("Error GPS", { id: loadId }),
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
        const load = toast.loading("Procesando...");
        try {
            await client.post(`/clientes/${cliente.id}/cambiar-onu`, {
                nuevo_inventario_id: Number(swapData.nuevo_inventario_id),
                estado_vieja_onu: swapData.estado_vieja_onu
            });
            toast.success("ONU vinculada", { id: load });
            setIsSwapOpen(false);
            setIsEditing(false); 
            cargarDatosCompletos(cliente.id);
            if (onEditSuccess) onEditSuccess();
        } catch (error: any) { toast.error("Error en cambio", { id: load }); }
    };

    const renderPuertoOptions = () => {
        if (!formData.caja_nap_id) return null;
        const caja = naps.find(n => n.id === Number(formData.caja_nap_id));
        const capacidad = caja?.capacidad || 16;
        const options = [];
        for (let i = 1; i <= capacidad; i++) {
            const isTaken = puertosOcupados.includes(i) && i !== cliente?.puerto_nap;
            options.push(<option key={i} value={i} disabled={isTaken}>{isTaken ? `Pto. ${i} (Ocupado)` : `Pto. ${i} (Libre)`}</option>);
        }
        return options;
    };

    const handleAbrirMapa = () => {
        if (cliente?.latitud && cliente?.longitud) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${cliente.latitud},${cliente.longitud}`, '_blank');
        }
    };

    const tecOltActual = olts.find(o => o.id === formData.olt_id)?.tecnologia?.toUpperCase() || null;
    const equiposCompatibles = formData.olt_id ? equiposDisponibles.filter(eq => tecOltActual ? eq.tecnologia?.toUpperCase() === tecOltActual : true) : [];
    const isPPPoE = cliente?.router?.tipo_seguridad === 'pppoe' || formData.router_id !== 0;

    const servicioActual = resumenComercial?.servicio_actual || null;
    const facturaActual = resumenComercial?.factura_actual || facturas.find((f) => ['pendiente', 'vencida'].includes(f.estado)) || facturas[0] || null;
    const resumenDeuda = resumenComercial?.resumen_deuda || null;

    const formatDate = (value?: any) => {
        if (!value) return 'N/A';
        try {
            const date = new Date(`${value}`.slice(0, 10) + 'T00:00:00');
            return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: '2-digit' });
        } catch {
            return value;
        }
    };

    const formatMoney = (value?: any) => {
        const numberValue = Number(value || 0);
        return numberValue.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    };

    const estadoVisual = (estado?: string) => {
        const normalizado = (estado || 'N/A').toLowerCase();
        if (normalizado === 'activo' || normalizado === 'pagada') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
        if (normalizado === 'suspendido' || normalizado === 'vencida') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
        if (normalizado === 'pendiente') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    };

    const tieneFacturaActual = Boolean(facturaActual?.id);

    const detalleTabs = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'red', label: 'Red' },
        { id: 'facturas', label: 'Facturas' },
    ] as const;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-slate-900/60 dark:bg-[#000]/70 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <Dialog.Panel className="client-detail-panel w-full h-[92dvh] sm:h-[88vh] sm:max-w-5xl bg-slate-100 dark:bg-[#07080a] sm:rounded-[2rem] rounded-t-[2rem] flex flex-col relative overflow-hidden shadow-2xl">
                        {/* ================= HEADER BOTTOM SHEET ================= */}
                        <div className="client-sheet-header">
                            <div className="client-sheet-handle sm:hidden" />

                            <div className="client-header-row">
                                <div className="flex gap-4 min-w-0 flex-1">
                                    {loadingData ? (
                                        <div className="client-avatar bg-slate-200 dark:bg-slate-800 animate-pulse" />
                                    ) : (
                                        <div className="client-avatar">
                                            {cliente?.nombre?.charAt(0).toUpperCase() || 'C'}
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        {loadingData ? (
                                            <>
                                                <div className="h-6 w-44 bg-slate-200 dark:bg-slate-800 rounded-xl mb-3 animate-pulse" />
                                                <div className="h-6 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                                            </>
                                        ) : isEditing ? (
                                            <input
                                                type="text"
                                                name="nombre"
                                                value={formData.nombre}
                                                onChange={handleInputChange}
                                                className="client-header-name-input"
                                            />
                                        ) : (
                                            <>
                                                <h2 className="client-header-title">{cliente?.nombre || 'Cliente'}</h2>

                                                <div className="client-tags">
                                                    <span className={classNames('client-tag', cliente?.estado === 'activo' ? 'client-tag--ok' : 'client-tag--danger')}>
                                                        Estado <b>{cliente?.estado === 'activo' ? 'Activo' : (cliente?.estado || 'N/A')}</b>
                                                    </span>

                                                    <span className="client-tag">Cédula <b>{cliente?.cedula || 'N/A'}</b></span>

                                                    <span className="client-tag">
                                                        Instalación <b>{formatDate(servicioActual?.fecha_inicio_cobro || cliente?.created_at)}</b>
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="client-header-actions">
                                    {!loadingData && !isEditing && cliente && (
                                        <button onClick={toggleEditMode} className="client-edit-button">
                                            <PencilSquareIcon className="w-4 h-4" />
                                            <span>Editar</span>
                                        </button>
                                    )}

                                    <button onClick={onClose} className="client-close-button">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>



                        {/* ================= SCROLL CONTENT ================= */}
                        <div className="client-scroll-body flex-1 overflow-y-auto p-4 sm:p-6 pb-8 space-y-5 scrollbar-hide">
{!loadingData && !isEditing && cliente && (
                                <div className="client-tabs-shell">
                                    <div className="client-tabs-row">
                                        {detalleTabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={classNames(
                                                    "client-tab-button",
                                                    activeTab === tab.id && "client-tab-button--active"
                                                )}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!loadingData && !isEditing && cliente && activeTab === 'resumen' && (
                                <SectionCard title="Resumen del cliente" icon={CheckCircleIcon}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <DetailTile label="Fecha instalación" value={formatDate(servicioActual?.fecha_inicio_cobro || cliente?.created_at)} highlight />
                                        <DetailTile label="Cédula" value={cliente?.cedula || 'N/A'} />
                                        <DetailTile label="Teléfono" value={cliente?.telefono || 'N/A'} />
                                        <DetailTile label="Zona" value={cliente?.zona?.nombre || 'N/A'} />
                                        <DetailTile label="Plan" value={servicioActual?.plan_nombre || cliente?.plan?.nombre || 'N/A'} />
                                        <DetailTile label="IP asignada" value={cliente?.ip_asignada || 'DHCP'} highlight />
                                        <DetailTile label="ONU serial" value={cliente?.onu_asignada?.identificador || 'Sin equipo'} />
                                        <DetailTile label="Dirección" value={cliente?.direccion || 'N/A'} />
                                    </div>
                                </SectionCard>
                            )}

                            {!loadingData && !isEditing && cliente && activeTab === 'facturas' && (
                                <SectionCard title="Resumen de facturación" icon={DocumentTextIcon}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <DetailTile label="Saldo pendiente" value={formatMoney(resumenDeuda?.saldo_pendiente_total || facturaActual?.saldo_pendiente)} danger={Number(resumenDeuda?.saldo_pendiente_total || facturaActual?.saldo_pendiente || 0) > 0} />
                                        <DetailTile label="Saldo a favor" value={formatMoney(cliente?.saldo_a_favor || 0)} />
                                        <DetailTile label="Estado factura" value={facturaActual?.estado || 'N/A'} danger={facturaActual?.estado === 'vencida'} />
                                        <DetailTile label="Próxima facturación" value={formatDate(servicioActual?.proxima_facturacion)} highlight />
                                        <DetailTile label="Fecha de corte" value={formatDate(resumenDeuda?.proximo_corte || facturaActual?.fecha_limite_corte)} danger={facturaActual?.estado === 'vencida'} />
                                        <DetailTile label="Periodo actual" value={tieneFacturaActual ? `${formatDate(facturaActual?.periodo_desde)} - ${formatDate(facturaActual?.periodo_hasta)}` : 'Sin factura actual'} />
                                    </div>
                                </SectionCard>
                            )}

                            {addingSaldo && !isEditing && (
                                <div className="p-4 bg-white dark:bg-[#0f1115] rounded-[1.5rem] shadow-sm flex gap-3">
                                    <input type="number" placeholder="Monto a abonar..." className="flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={montoSaldo} onChange={e => setMontoSaldo(e.target.value)} />
                                    <button onClick={handleAgregarSaldo} className="bg-emerald-500 text-white px-5 py-3 rounded-xl text-xs font-black shadow-md">Abonar</button>
                                </div>
                            )}

                            {(isEditing || activeTab === 'instalacion') && (
                                <Fragment>
                            {/* SECCIÓN 1: CONTACTO */}
                            <SectionCard title="Contacto y Ubicación" icon={IdentificationIcon}>
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelClass}>Cédula / ID (Solo Lectura)</label>
                                            <input value={formData.cedula} disabled className={disabledInputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Teléfono</label>
                                            <input name="telefono" value={formData.telefono} onChange={handleInputChange} className={flatInputClass} type="tel" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>Zona</label>
                                                <select name="zona_id" value={formData.zona_id} onChange={handleInputChange} className={flatInputClass}><option value={0}>Elegir...</option>{zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}</select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Plantilla</label>
                                                <select name="plantilla_id" value={formData.plantilla_id} onChange={handleInputChange} className={flatInputClass}><option value={0}>Elegir...</option>{plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Dirección</label>
                                            <textarea name="direccion" value={formData.direccion} onChange={(e: any) => handleInputChange(e)} rows={2} className={`${flatInputClass} resize-none`} />
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-black text-slate-500">Coordenadas</span>
                                                <button type="button" onClick={handleCaptureGPS} className="text-[10px] bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-bold">Usar Mi GPS</button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input name="latitud" placeholder="Lat" value={formData.latitud} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500" />
                                                <input name="longitud" placeholder="Lon" value={formData.longitud} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        <InfoRow label="Cédula" value={cliente?.cedula || 'N/A'} copy />
                                        <InfoRow label="Teléfono" value={cliente?.telefono || 'N/A'} copy />
                                        <InfoRow label="Zona" value={cliente?.zona?.nombre || 'N/A'} />
                                        <InfoRow label="Dirección" value={cliente?.direccion || 'N/A'} />
                                        {cliente?.latitud && (
                                            <div className="pt-4 mt-2">
                                                <button onClick={handleAbrirMapa} className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold flex justify-center items-center gap-2"><MapPinIcon className="w-5 h-5"/> Ver en Maps</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </SectionCard>

                                </Fragment>
                            )}

                            {(isEditing || activeTab === 'red') && (
                                <Fragment>
                            {/* SECCIÓN 2: RED */}
                            <SectionCard title="Infraestructura y Red" icon={SignalIcon}>
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div><label className={labelClass}>OLT Central</label><select name="olt_id" value={formData.olt_id} onChange={handleInputChange} className={flatInputClass}><option value={0}>Seleccionar OLT...</option>{olts.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>Caja NAP</label>
                                                <select name="caja_nap_id" value={formData.caja_nap_id} onChange={handleInputChange} className={formData.zona_id ? flatInputClass : disabledInputClass} disabled={!formData.zona_id}>
                                                    {!formData.zona_id ? (
                                                        <option value={0}>Elige Zona primero...</option>
                                                    ) : (
                                                        <>
                                                            <option value={0}>Ninguna</option>
                                                            {naps.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Puerto NAP</label>
                                                <select name="puerto_nap" value={formData.puerto_nap} onChange={handleInputChange} className={formData.caja_nap_id ? flatInputClass : disabledInputClass} disabled={!formData.caja_nap_id}>
                                                    <option value={0}>Seleccionar...</option>
                                                    {renderPuertoOptions()}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>Equipo ONU</label>
                                            {cliente?.onu_asignada ? (
                                                <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
                                                    <span className="font-mono text-sm font-bold">{cliente.onu_asignada.identificador}</span>
                                                    <button type="button" onClick={abrirModalSwap} className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1.5 rounded-lg font-bold">Cambiar</button>
                                                </div>
                                            ) : (
                                                <select name="identificador_onu" value={formData.identificador_onu} onChange={handleInputChange} className={formData.olt_id ? flatInputClass : disabledInputClass} disabled={!formData.olt_id}>
                                                    {!formData.olt_id ? <option value="">Selecciona OLT primero...</option> : <><option value="">Vincular desde inventario...</option>{equiposCompatibles.map(eq => <option key={eq.id} value={eq.identificador}>{eq.identificador}</option>)}</>}
                                                </select>
                                            )}
                                        </div>
                                        <hr className="border-slate-200 dark:border-slate-800 my-4"/>
                                        <div><label className={labelClass}>Router Concentrador</label><select name="router_id" value={formData.router_id} onChange={handleInputChange} className={flatInputClass}><option value={0}>Seleccionar...</option>{routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
                                        <div><label className={labelClass}>Plan Contratado</label><select name="plan_id" value={formData.plan_id} onChange={handleInputChange} className={flatInputClass}><option value={0}>Seleccionar...</option>{planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
                                        {isPPPoE && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className={labelClass}>User PPPoE</label><input name="user_pppoe" value={formData.user_pppoe} onChange={handleInputChange} className={flatInputClass} /></div>
                                                <div><label className={labelClass}>Pass PPPoE</label><input name="pass_pppoe" value={formData.pass_pppoe} onChange={handleInputChange} className={flatInputClass} /></div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl">
                                                <p className="text-[10px] font-bold text-slate-400 mb-1">OLT</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{cliente?.olt?.nombre || 'N/A'}</p>
                                            </div>
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl">
                                                <p className="text-[10px] font-bold text-slate-400 mb-1">Caja NAP</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{cliente?.caja_nap?.nombre || 'N/A'} {cliente?.puerto_nap ? `(Pto. ${cliente.puerto_nap})` : ''}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl">
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">Concentrador</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{cliente?.router?.nombre || 'N/A'}</p>
                                        </div>
                                        {isPPPoE && (
                                            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 mb-1">Perfil PPPoE</p>
                                                    <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">{cliente?.user_pppoe || 'N/A'}</p>
                                                </div>
                                                {cliente?.user_pppoe && <button onClick={() => { navigator.clipboard.writeText(cliente.user_pppoe); toast.success("Copiado"); }} className="p-2 text-slate-400"><ClipboardDocumentIcon className="w-5 h-5" /></button>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </SectionCard>


                                </Fragment>
                            )}

                            {/* SECCIÓN NUEVA: SERVICIO Y FACTURACIÓN ISP V2 */}
                            {!isEditing && activeTab === 'facturacion' && (
                                <SectionCard title="Servicio y Facturación" icon={DocumentTextIcon}>
                                    {servicioActual ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap gap-2">
                                                <StatusPill label="Cliente" value={cliente?.estado || 'N/A'} className={estadoVisual(cliente?.estado)} />
                                                <StatusPill label="Servicio" value={servicioActual.estado || 'N/A'} className={estadoVisual(servicioActual.estado)} />
                                                <StatusPill label="Tipo" value={servicioActual.tipo_facturacion || 'N/A'} className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
                                                <StatusPill label="Ciclo" value={servicioActual.ciclo_facturacion || 'N/A'} className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <DetailTile label="Plan" value={servicioActual.plan_nombre || cliente?.plan?.nombre || 'N/A'} />
                                                <DetailTile label="Plantilla" value={servicioActual.plantilla_nombre || cliente?.plantilla?.nombre || 'N/A'} />
                                                <DetailTile label="Instalación" value={formatDate(servicioActual.fecha_instalacion)} />
                                                <DetailTile label="Activación" value={formatDate(servicioActual.fecha_activacion)} />
                                                <DetailTile label="Fin periodo gratis" value={formatDate(servicioActual.fecha_fin_periodo_gratis)} />
                                                <DetailTile label="Inicio de cobro" value={formatDate(servicioActual.fecha_inicio_cobro)} />
                                                <DetailTile label="Próxima facturación" value={formatDate(servicioActual.proxima_facturacion)} highlight />
                                                <DetailTile label="Día de pago / corte" value={`Día ${servicioActual.dia_vencimiento || servicioActual.dia_pago || 'N/A'} + ${servicioActual.dias_tolerancia ?? servicioActual.plantilla_dias_tolerancia ?? 0} días`} />
                                                <DetailTile label="Meses gratis" value={`${servicioActual.meses_gratis ?? 0}`} />
                                                <DetailTile label="Prorrateo" value={servicioActual.politica_prorrateo || 'N/A'} />
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-center font-bold text-slate-400 py-4">Sin servicio comercial asociado.</p>
                                    )}
                                </SectionCard>
                            )}

                            {/* SECCIÓN NUEVA: FACTURA ACTUAL Y CORTE */}
                            {!isEditing && activeTab === 'facturacion' && (
                                <SectionCard title="Factura actual y corte" icon={ClipboardDocumentIcon}>
                                    {tieneFacturaActual ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap gap-2">
                                                <StatusPill label="Factura" value={facturaActual.estado || 'N/A'} className={estadoVisual(facturaActual.estado)} />
                                                {facturaActual.es_prorrateada ? (
                                                    <StatusPill label="Tipo" value="Prorrateada" className="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300" />
                                                ) : (
                                                    <StatusPill label="Tipo" value="Ciclo normal" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" />
                                                )}
                                                <StatusPill label="Modalidad" value={facturaActual.tipo_facturacion_snapshot || servicioActual?.tipo_facturacion || 'N/A'} className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <DetailTile label="Periodo" value={`${formatDate(facturaActual.periodo_desde)} - ${formatDate(facturaActual.periodo_hasta)}`} highlight />
                                                <DetailTile label="Días facturados" value={`${facturaActual.dias_facturados || 0} de ${facturaActual.dias_periodo || 0}`} />
                                                <DetailTile label="Total factura" value={formatMoney(facturaActual.total)} />
                                                <DetailTile label="Saldo pendiente" value={formatMoney(facturaActual.saldo_pendiente)} danger={Number(facturaActual.saldo_pendiente || 0) > 0} />
                                                <DetailTile label="Vencimiento" value={formatDate(facturaActual.fecha_vencimiento)} />
                                                <DetailTile label="Fecha de corte" value={formatDate(facturaActual.fecha_limite_corte)} danger={facturaActual.estado === 'vencida'} />
                                            </div>

                                            {Number(resumenDeuda?.saldo_pendiente_total || 0) > 0 && (
                                                <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 p-4">
                                                    <p className="text-[10px] uppercase font-black text-amber-600 dark:text-amber-300">Resumen de deuda</p>
                                                    <p className="text-sm font-black text-amber-700 dark:text-amber-200">
                                                        {resumenDeuda.facturas_abiertas || 0} factura(s) abierta(s) · {formatMoney(resumenDeuda.saldo_pendiente_total)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-center font-bold text-slate-400 py-4">Sin factura actual.</p>
                                    )}
                                </SectionCard>
                            )}

                            {/* SECCIÓN 3: FACTURAS */}
                            {!isEditing && activeTab === 'facturas' && (
                                <SectionCard title="Últimas Facturas" icon={DocumentTextIcon}>
                                    {facturas.length === 0 ? (
                                        <p className="text-sm text-center font-bold text-slate-400 py-4">Sin facturas generadas.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {facturas.slice(0,5).map((f) => (
                                                <div key={f.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
                                                    <div>
                                                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{f.detalles || `Mes ${f.mes_correspondiente}`}</p>
                                                        <p className="text-[11px] text-slate-400">{new Date(f.fecha_emision).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black">${f.total.toLocaleString()}</p>
                                                        <span className={classNames("text-[9px] font-black uppercase px-2 py-1 rounded-md mt-1 inline-block", f.estado === 'pagada' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400')}>{f.estado}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </SectionCard>
                            )}
                        </div>

                        {/* ================= ACCIONES DE EDICIÓN ================= */}
                        {!loadingData && isEditing && (
                            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-auto z-40 flex gap-2">
                                <div className="flex w-full gap-2 bg-slate-900/80 dark:bg-white/10 backdrop-blur-xl p-2 rounded-full shadow-2xl">
                                    <button onClick={toggleEditMode} className="flex-1 sm:w-32 bg-slate-700 dark:bg-slate-800 text-white py-3.5 rounded-full text-[11px] font-bold uppercase">
                                        Cancelar
                                    </button>
                                    <button onClick={handleGuardar} className="flex-1 sm:w-40 bg-blue-600 text-white py-3.5 rounded-full text-[11px] font-bold uppercase shadow-lg">
                                        Guardar Datos
                                    </button>
                                </div>
                            </div>
                        )}

</Dialog.Panel>
                </div>
            </Dialog>

            {/* MODAL SWAP DE ONU SEGURA */}
            <Transition appear show={isSwapOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsSwapOpen(false)}>
                    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-sm bg-white dark:bg-[#0f1115] rounded-[2rem] p-6 shadow-2xl">
                            <h3 className="font-black text-lg mb-4 text-slate-800 dark:text-white">Cambiar ONU</h3>
                            <form onSubmit={handleProcesarSwap} className="space-y-4">
                                {cliente?.onu_asignada && (
                                    <div>
                                        <label className={labelClass}>Estado del equipo actual</label>
                                        <select value={swapData.estado_vieja_onu} onChange={(e) => setSwapData(p => ({ ...p, estado_vieja_onu: e.target.value }))} className={flatInputClass}>
                                            <option value="CON_FALLA">Con Falla / Retirado</option>
                                            <option value="DISPONIBLE">Funcional (A Inventario)</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className={labelClass}>Nuevo Equipo</label>
                                    {equiposCompatibles.length === 0 ? (
                                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold">Sin equipos compatibles.</div>
                                    ) : (
                                        <select required value={swapData.nuevo_inventario_id} onChange={(e) => setSwapData(p => ({ ...p, nuevo_inventario_id: e.target.value }))} className={flatInputClass}>
                                            <option value="">Elegir del inventario...</option>
                                            {equiposCompatibles.map(e => <option key={e.id} value={e.id}>{e.identificador}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button type="button" onClick={() => setIsSwapOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-3 rounded-xl font-bold text-sm">Cancelar</button>
                                    <button type="submit" disabled={!swapData.nuevo_inventario_id} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">Aplicar</button>
                                </div>
                            </form>
                        </Dialog.Panel>
                    </div>
                </Dialog>
            </Transition>
        </Transition>
    );
}

// ================= SUBCOMPONENTES VISUALES =================


const DetailTile = ({ label, value, highlight, danger }: any) => (
    <div className={classNames(
        "bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border",
        highlight ? "border-blue-200 dark:border-blue-500/30" : "border-transparent",
        danger ? "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-900/10" : ""
    )}>
        <p className="text-[10px] uppercase font-black text-slate-400 mb-1">{label}</p>
        <p className={classNames(
            "text-sm font-black break-words",
            danger ? "text-rose-700 dark:text-rose-300" : "text-slate-800 dark:text-slate-200"
        )}>{value || 'N/A'}</p>
    </div>
);

const StatusPill = ({ label, value, className }: any) => (
    <span className={classNames("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase", className)}>
        <span className="opacity-70">{label}:</span> {value || 'N/A'}
    </span>
);

const StatCard = ({ icon: Icon, title, value, copy, color }: any) => (
    <div className="bg-white dark:bg-[#0f1115] p-4 rounded-[1.5rem] shadow-sm flex flex-col justify-between relative group">
        <span className={color}><Icon className="w-5 h-5" /></span>
        <div className="mt-2 pr-4">
            <p className="text-[10px] uppercase font-bold text-slate-400 truncate">{title}</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{value}</p>
        </div>
        {copy && value && value !== 'DHCP' && value !== 'Sin Equipo' && (
            <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado"); }} className="absolute right-3 top-3 p-1.5 text-slate-300 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
        )}
    </div>
);

const SectionCard = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white dark:bg-[#0f1115] p-5 sm:p-6 rounded-[2rem] shadow-sm">
        <h3 className="flex items-center gap-2 font-black text-sm text-slate-800 dark:text-slate-200 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <Icon className="w-5 h-5 text-slate-400" /> {title}
        </h3>
        {children}
    </div>
);

const InfoRow = ({ label, value, copy }: any) => (
    <div className="py-3 flex justify-between items-center group">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 text-right">{value}</span>
            {copy && value && value !== 'N/A' && (
                <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado"); }} className="p-1.5 text-slate-300 hover:text-blue-500 rounded-md active:bg-slate-100 dark:active:bg-slate-800">
                    <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    </div>
);

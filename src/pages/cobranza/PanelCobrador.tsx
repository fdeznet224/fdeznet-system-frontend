import {
    useState, useEffect, useCallback, Fragment,
    type ComponentType
} from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { useSync } from '@/context/sync/context';
import { cachedRequest, notifySessionChanged } from '../../offline/db';
import { submitOperation } from '../../offline/sync';
import { 
    BanknotesIcon, MagnifyingGlassIcon, ArrowRightOnRectangleIcon, 
    XMarkIcon, ArrowPathIcon, ShieldExclamationIcon, ClockIcon, 
    ChartPieIcon, HomeIcon, CreditCardIcon, CalendarDaysIcon, 
    CheckCircleIcon, IdentificationIcon
} from '@heroicons/react/24/outline';

type PaymentMethod = 'efectivo' | 'transferencia';

interface BillingClient {
    nombre: string;
    cedula?: string;
    ip_asignada?: string;
}

interface BillingInvoice {
    id: number;
    cliente: BillingClient;
    saldo_pendiente: number;
    fecha_vencimiento: string;
}

interface InvoiceListResponse {
    items?: BillingInvoice[];
}

interface PaymentHistoryItem {
    factura_id: number;
    metodo: PaymentMethod;
    monto: number;
    pendiente?: boolean;
}

interface PaymentReportResponse {
    detalles?: PaymentHistoryItem[];
}

interface CollectorUser {
    usuario?: string;
}

interface NavButtonProps {
    active: boolean;
    icon: ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    badge?: number;
}

export default function PanelCobrador() {
    const navigate = useNavigate();
    const { online } = useSync();
    const user = JSON.parse(localStorage.getItem('user') || '{}') as CollectorUser;
    
    const [activeTab, setActiveTab] = useState<'cobrar' | 'promesas' | 'historial' | 'cierre'>('cobrar');
    const [facturas, setFacturas] = useState<BillingInvoice[]>([]);
    const [historial, setHistorial] = useState<PaymentHistoryItem[]>([]);
    const [promesas, setPromesas] = useState<BillingInvoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('');
    
    const totalCobradoHoy = historial.reduce((acc, curr) => acc + Number(curr.monto), 0);
    const totalEfectivo = historial.filter(h => h.metodo === 'efectivo').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const totalTransferencia = historial.filter(h => h.metodo === 'transferencia').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const totalRetencionPromesas = promesas.reduce((acc, curr) => acc + Number(curr.saldo_pendiente), 0);

    // ESTADOS DEL MODAL
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFactura, setSelectedFactura] = useState<BillingInvoice | null>(null);
    const [modo, setModo] = useState<'pagar' | 'promesa'>('pagar'); // 👈 Nuevo estado para las tabs
    const [formCobro, setFormCobro] = useState<{ metodo: PaymentMethod; referencia: string; monto: number }>({ metodo: 'efectivo', referencia: '', monto: 0 });
    const [fechaPromesa, setFechaPromesa] = useState('');
    const [procesando, setProcesando] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000; 
            const localISOTime = new Date(now.getTime() - offset).toISOString().split('T')[0];

            const [resAdeudos, resHistorial, resPromesas] = await Promise.all([
                cachedRequest<InvoiceListResponse>('cobranza-adeudos', async () => (
                    await client.get<InvoiceListResponse>('/finanzas/listado-completo?estado=adeudos')
                ).data),
                cachedRequest<PaymentReportResponse>(`cobranza-historial-${localISOTime}`, async () => (
                    await client.get<PaymentReportResponse>(`/finanzas/pagos-reporte?start_date=${localISOTime}&end_date=${localISOTime}`)
                ).data),
                cachedRequest<InvoiceListResponse>('cobranza-promesas', async () => (
                    await client.get<InvoiceListResponse>('/finanzas/listado-completo?estado=promesa')
                ).data),
            ]);

            setFacturas(resAdeudos.data.items || []);
            setHistorial(resHistorial.data.detalles || []);
            setPromesas(resPromesas.data.items || []);
            if ([resAdeudos, resHistorial, resPromesas].some(item => item.fromCache)) {
                toast('Mostrando el último corte guardado');
            }
        } catch {
            toast.error("Error al refrescar datos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => void fetchData(), 0);
        return () => window.clearTimeout(initialLoad);
    }, [fetchData]);

    const handleLogout = () => {
        if(confirm("¿Cerrar sesión?")) {
            localStorage.clear();
            notifySessionChanged();
            navigate('/login');
        }
    };

    const handleOpenCobrar = (factura: BillingInvoice) => {
        setSelectedFactura(factura);
        setFormCobro({ metodo: 'efectivo', referencia: '', monto: factura.saldo_pendiente });
        setModo('pagar'); // Resetear a Pagar al abrir
        const date = new Date();
        date.setDate(date.getDate() + 3);
        setFechaPromesa(date.toISOString().split('T')[0]);
        setIsModalOpen(true);
    };

    const handleProcesarCobro = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFactura) return;
        setProcesando(true);
        const toastId = toast.loading("Procesando...");
        try {
            const result = await submitOperation(
                'pago_factura',
                {
                    factura_id: selectedFactura.id,
                    metodo_pago: formCobro.metodo,
                    monto_recibido: Number(formCobro.monto),
                    referencia: formCobro.referencia || `POS #${selectedFactura.id}`,
                },
                `Cobro factura #${selectedFactura.id}`,
            );
            toast.success(
                result.queued ? 'Cobro guardado para sincronizar' : 'Pago registrado exitosamente',
                { id: toastId },
            );
            setIsModalOpen(false);
            setFiltro('');
            if (result.queued) {
                setFacturas((current) => current.filter((item) => item.id !== selectedFactura.id));
                setHistorial((current) => [{
                    factura_id: selectedFactura.id,
                    metodo: formCobro.metodo,
                    monto: Number(formCobro.monto),
                    pendiente: true,
                }, ...current]);
            } else {
                void fetchData();
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al cobrar', { id: toastId });
        } finally {
            setProcesando(false);
        }
    };

    const handleProcesarPromesa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFactura) return;
        if (!online) {
            toast.error('Las promesas de pago requieren conexión');
            return;
        }
        setProcesando(true);
        const toastId = toast.loading("Guardando promesa...");
        try {
            await client.post('/finanzas/promesa-pago', {
                factura_id: selectedFactura.id,
                nueva_fecha: fechaPromesa
            });
            toast.success("Promesa guardada y servicio activo", { id: toastId });
            setIsModalOpen(false);
            setFiltro('');
            fetchData();
        } catch {
            toast.error("Error al guardar promesa", { id: toastId }); 
        } finally {
            setProcesando(false);
        }
    };


    const facturasFiltradas = filtro.length > 0 
        ? facturas.filter(f => f.cliente.nombre.toLowerCase().includes(filtro.toLowerCase()) || f.cliente.ip_asignada?.includes(filtro))
        : [];

    const saldoAFavor = formCobro.monto > selectedFactura?.saldo_pendiente ? formCobro.monto - selectedFactura.saldo_pendiente : 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] text-slate-800 dark:text-white font-sans flex flex-col transition-colors duration-300">
            
            {/* HEADER ADAPTATIVO */}
            <div className="bg-white dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm dark:shadow-xl transition-colors">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-lg text-white">
                        {user.usuario?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest transition-colors">Cobrador</p>
                        <h1 className="text-sm font-black text-slate-900 dark:text-white capitalize transition-colors">{user.usuario}</h1>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowRightOnRectangleIcon className="w-6 h-6" />
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-24">
                {loading && (
                    <div role="status" className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                        <ArrowPathIcon className="h-4 w-4 animate-spin" /> Actualizando cobranza...
                    </div>
                )}
                
                {/* === PESTAÑA: COBRAR === */}
                {activeTab === 'cobrar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-md relative overflow-hidden">
                            <span className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Recaudado Hoy</span>
                            <h2 className="text-4xl font-black text-white mt-1">${totalCobradoHoy.toLocaleString('es-MX')}</h2>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-widest">Buscar Cliente</label>
                            <div className="bg-white dark:bg-[#1a1f2e] rounded-xl flex items-center border border-slate-200 dark:border-slate-700 shadow-sm p-1 transition-colors">
                                <MagnifyingGlassIcon className="w-6 h-6 text-slate-400 ml-3" />
                                <input className="w-full bg-transparent p-3 text-slate-900 dark:text-white outline-none text-lg font-bold placeholder-slate-400" placeholder="Nombre o IP..." value={filtro} onChange={e => setFiltro(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {facturasFiltradas.map((f) => {
                                const isVencida = new Date(f.fecha_vencimiento) < new Date();
                                return (
                                    <div key={f.id} onClick={() => handleOpenCobrar(f)} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isVencida ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                        <div className="pl-2">
                                            <h3 className="font-black text-slate-900 dark:text-white text-base transition-colors">{f.cliente.nombre}</h3>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-[9px] font-black text-white bg-indigo-600 px-1.5 py-0.5 rounded uppercase">SN: {f.cliente.cedula}</span>
                                                <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">{f.cliente.ip_asignada}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${f.saldo_pendiente}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* === PESTAÑA: PROMESAS === */}
                {activeTab === 'promesas' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Promesas Activas</h2>
                        {promesas.length === 0 ? (
                            <div className="text-center py-10">
                                <ShieldExclamationIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2"/>
                                <p className="text-slate-500 font-bold">No hay promesas activas</p>
                            </div>
                        ) : (
                            promesas.map((f) => (
                                <div key={f.id} onClick={() => handleOpenCobrar(f)} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                    <div className="pl-2">
                                        <h3 className="font-black text-slate-900 dark:text-white text-base">{f.cliente.nombre}</h3>
                                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1 uppercase flex items-center gap-1">
                                            <CalendarDaysIcon className="w-3 h-3"/> Promesa: {f.fecha_vencimiento}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${f.saldo_pendiente}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* === PESTAÑA: HISTORIAL === */}
                {activeTab === 'historial' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Cobros de Hoy</h2>
                        {historial.length === 0 ? (
                            <div className="text-center py-10">
                                <ClockIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2"/>
                                <p className="text-slate-500 font-bold">Aún no hay cobros registrados hoy</p>
                            </div>
                        ) : (
                            historial.map((h, i) => (
                                <div key={i} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${h.metodo === 'efectivo' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                            {h.metodo === 'efectivo' ? <BanknotesIcon className="w-5 h-5"/> : <CreditCardIcon className="w-5 h-5"/>}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Factura #{h.factura_id}</h3>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">{h.metodo}</p>
                                            {h.pendiente && <p className="text-[9px] font-black uppercase text-blue-500">Pendiente de sincronizar</p>}
                                        </div>
                                    </div>
                                    <span className="font-black text-slate-900 dark:text-white">+${h.monto}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* === PESTAÑA: CORTE DE COBRANZA === */}
                {activeTab === 'cierre' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Resumen de cobranza</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Los cobros se liquidan por período y método de pago.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <BanknotesIcon className="w-4 h-4"/> Efectivo
                                </span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">${totalEfectivo}</h3>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <CreditCardIcon className="w-4 h-4"/> Transferencia
                                </span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">${totalTransferencia}</h3>
                            </div>
                        </div>
                        
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4">
                             <span className="text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                <ShieldExclamationIcon className="w-4 h-4"/> Por Promesas Activas
                            </span>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">${totalRetencionPromesas}</h3>
                        </div>
                    </div>
                )}
            </div>

            {/* NAV INFERIOR ADAPTATIVO */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#161b28] border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex justify-around items-center z-40 transition-colors">
                <NavButton active={activeTab === 'cobrar'} icon={HomeIcon} label="Cobrar" onClick={() => setActiveTab('cobrar')} />
                <NavButton active={activeTab === 'promesas'} icon={ShieldExclamationIcon} label="Promesas" onClick={() => setActiveTab('promesas')} badge={promesas.length} />
                <NavButton active={activeTab === 'historial'} icon={ClockIcon} label="Historial" onClick={() => setActiveTab('historial')} />
                <NavButton active={activeTab === 'cierre'} icon={ChartPieIcon} label="Cierre" onClick={() => setActiveTab('cierre')} />
            </div>

            {/* =========================================================================
                MODAL COBRO (DISEÑO POS - ADAPTATIVO CLARO/OSCURO) 
               ========================================================================= */}
            <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="translate-y-full opacity-0" enterTo="translate-y-0 opacity-100">
                                
                                <Dialog.Panel className="w-full sm:max-w-md bg-white dark:bg-[#0b0e14] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 transition-colors flex flex-col h-[85vh] sm:h-auto">
                                    
                                    {/* CABECERA Y TARJETA DEL CLIENTE */}
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg">
                                                {selectedFactura?.cliente.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                                    <IdentificationIcon className="w-3 h-3"/> {selectedFactura?.cliente.cedula || 'S/N'}
                                                </p>
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate leading-none">{selectedFactura?.cliente.nombre}</h3>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white">
                                            <XMarkIcon className="w-5 h-5"/>
                                        </button>
                                    </div>

                                    {/* CONCEPTO A PAGAR */}
                                    <div className="mb-6">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 px-1">Concepto a Pagar</label>
                                        <div className="w-full bg-slate-50 dark:bg-[#11131a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl p-4 font-bold shadow-sm dark:shadow-lg">
                                            #{selectedFactura?.id} - Vence: {selectedFactura?.fecha_vencimiento} - ${selectedFactura?.saldo_pendiente}
                                        </div>
                                    </div>

                                    {/* TABS DE ACCIÓN */}
                                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-[#11131a] border border-slate-200 dark:border-slate-800 rounded-xl mb-6 shadow-sm dark:shadow-lg">
                                        <button onClick={() => setModo('pagar')} className={`py-3 rounded-lg text-sm font-bold transition-all ${modo === 'pagar' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                                            Registrar Pago
                                        </button>
                                        <button onClick={() => setModo('promesa')} className={`py-3 rounded-lg text-sm font-bold transition-all ${modo === 'promesa' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                                            Crear Promesa
                                        </button>
                                    </div>

                                    {/* FORMULARIOS */}
                                    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                                        {modo === 'pagar' ? (
                                            <form onSubmit={handleProcesarCobro} className="flex flex-col flex-1 h-full">
                                                
                                                <div className="mb-6 bg-slate-50 dark:bg-[#11131a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-sm dark:shadow-lg">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-4">Monto Recibido</label>
                                                    <div className="relative inline-block w-full max-w-[200px]">
                                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-emerald-500">$</span>
                                                        <input 
                                                            type="number" step="0.01" required
                                                            className="bg-transparent text-5xl sm:text-6xl font-black text-slate-900 dark:text-white outline-none w-full text-center pl-8 placeholder-slate-300 dark:placeholder-slate-800 transition-all border-b-2 border-transparent focus:border-emerald-500 pb-1"
                                                            placeholder="0.00" value={formCobro.monto || ''} onChange={e => setFormCobro({...formCobro, monto: Number(e.target.value)})}
                                                        />
                                                    </div>
                                                    {saldoAFavor > 0 && (
                                                        <div className="mt-4 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 inline-block px-4 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 animate-in fade-in slide-in-from-bottom-2">
                                                            Genera Saldo a Favor: +${saldoAFavor.toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mb-6">
                                                    <button type="button" onClick={() => setFormCobro({...formCobro, metodo: 'efectivo'})} className={`p-4 rounded-xl border flex flex-col justify-center items-center gap-2 transition-all font-bold text-sm ${formCobro.metodo === 'efectivo' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm dark:shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-50 dark:bg-[#11131a] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                                        <BanknotesIcon className="w-6 h-6"/> Efectivo
                                                    </button>
                                                    <button type="button" onClick={() => setFormCobro({...formCobro, metodo: 'transferencia'})} className={`p-4 rounded-xl border flex flex-col justify-center items-center gap-2 transition-all font-bold text-sm ${formCobro.metodo === 'transferencia' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm dark:shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-50 dark:bg-[#11131a] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                                        <CreditCardIcon className="w-6 h-6"/> Transferencia
                                                    </button>
                                                </div>

                                                {formCobro.metodo === 'transferencia' && (
                                                    <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                                                        <input type="text" required placeholder="Referencia / Folio / Banco..." className="w-full bg-slate-50 dark:bg-[#11131a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm shadow-sm dark:shadow-lg" value={formCobro.referencia} onChange={e => setFormCobro({...formCobro, referencia: e.target.value})} />
                                                    </div>
                                                )}

                                                <div className="mt-auto pt-4">
                                                    <button type="submit" disabled={procesando} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 sm:py-5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 text-base sm:text-lg flex justify-center items-center gap-2">
                                                        {procesando ? <ArrowPathIcon className="w-6 h-6 animate-spin"/> : <><CheckCircleIcon className="w-6 h-6" /> CONFIRMAR COBRO</>}
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <form onSubmit={handleProcesarPromesa} className="flex flex-col flex-1 h-full">
                                                <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-5 rounded-2xl mb-6 text-center shadow-sm dark:shadow-lg">
                                                    <ShieldExclamationIcon className="w-12 h-12 text-orange-500 mx-auto mb-3"/>
                                                    <p className="text-orange-700 dark:text-orange-200 text-sm font-medium">Esta acción dará acceso temporal a internet al cliente. El sistema cortará el servicio automáticamente si no paga en la fecha límite acordada.</p>
                                                </div>
                                                
                                                <div className="mb-8">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 px-1">Fecha Límite de Pago</label>
                                                    <input 
                                                        type="date" required 
                                                        className="w-full bg-slate-50 dark:bg-[#11131a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-white font-bold text-center text-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm dark:shadow-lg" 
                                                        value={fechaPromesa} onChange={e => setFechaPromesa(e.target.value)} 
                                                    />
                                                </div>
                                                
                                                <div className="mt-auto pt-4">
                                                    <button type="submit" disabled={procesando} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 sm:py-5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 text-base sm:text-lg flex justify-center items-center gap-2">
                                                        {procesando ? <ArrowPathIcon className="w-6 h-6 animate-spin"/> : 'ACTIVAR SERVICIO (PROMESA)'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>

                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}

const NavButton = ({ active, icon: Icon, label, onClick, badge = 0 }: NavButtonProps) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition relative ${active ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 dark:text-slate-500'}`}>
        <Icon className={`w-6 h-6`}/>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        {badge > 0 && <span className="absolute top-1 right-2 bg-rose-600 text-white text-[8px] px-1 rounded-full">{badge}</span>}
    </button>
);

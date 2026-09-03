import {
    useState, useEffect, useCallback, useMemo, Fragment,
    type ComponentType
} from 'react';
import client from '../../api/axios';
import axios from 'axios';
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
    CheckCircleIcon, IdentificationIcon, ChevronDownIcon
} from '@heroicons/react/24/outline';

type PaymentMethod = 'efectivo' | 'transferencia';

interface BillingClient {
    id?: number;
    nombre: string;
    cedula?: string;
    ip_asignada?: string;
}

interface BillingInvoice {
    id: number;
    cliente: BillingClient;
    saldo_pendiente: number;
    estado?: string;
    fecha_vencimiento: string;
    concepto?: string | null;
    descripcion?: string | null;
    detalles?: string | null;
    mes_correspondiente?: string | null;
    fecha_maxima_promesa?: string;
    dias_con_servicio?: number | null;
    dias_sin_servicio?: number | null;
    ajuste_suspension?: number;
    cargos_adicionales_total?: number;
    servicio?: { estado?: string | null } | null;
}

interface ReactivationQuote {
    factura_id: number;
    concepto?: string | null;
    fecha_vencimiento: string;
    descripcion: string;
    dias_con_servicio: number;
    dias_sin_servicio: number;
    ajuste_suspension: number;
    cargos_adicionales: number;
    saldo_pendiente: number;
}

interface InvoiceListResponse {
    items?: BillingInvoice[];
}

interface CobroResultResponse {
    facturas_pendientes_cant?: number;
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

const MESES_ES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDateLong(value?: string | null) {
    if (!value) return 'Sin fecha';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return value;
    return `${day} de ${MESES_ES[month - 1]} de ${year}`;
}

function invoiceConcept(invoice?: BillingInvoice | null) {
    return invoice?.concepto
        || invoice?.detalles
        || invoice?.mes_correspondiente
        || `Factura #${invoice?.id || ''}`;
}

function invoiceIsOverdue(invoice: BillingInvoice) {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const today = new Date(now.getTime() - offset).toISOString().slice(0, 10);
    return invoice.estado === 'vencida'
        || invoice.fecha_vencimiento.slice(0, 10) < today;
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
    const [expandedClient, setExpandedClient] = useState<string | null>(null);
    
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

    const handleOpenCobrar = async (factura: BillingInvoice) => {
        let facturaActual = factura;
        if (factura.servicio?.estado === 'suspendido') {
            if (!online) {
                toast.error('La reactivación requiere conexión para calcular los días reales');
                return;
            }
            const toastId = toast.loading('Calculando días con servicio…');
            try {
                const { data } = await client.post<ReactivationQuote>(
                    `/finanzas/facturas/${factura.id}/cotizar-reactivacion`,
                );
                facturaActual = {
                    ...factura,
                    id: data.factura_id,
                    concepto: data.concepto,
                    fecha_vencimiento: data.fecha_vencimiento,
                    descripcion: data.descripcion,
                    saldo_pendiente: Number(data.saldo_pendiente),
                    dias_con_servicio: data.dias_con_servicio,
                    dias_sin_servicio: data.dias_sin_servicio,
                    ajuste_suspension: Number(data.ajuste_suspension),
                    cargos_adicionales_total: Number(data.cargos_adicionales),
                };
                toast.success('Factura recalculada', { id: toastId });
            } catch (error: unknown) {
                const detail = axios.isAxiosError<{ detail?: string }>(error)
                    ? error.response?.data?.detail
                    : undefined;
                toast.error(detail || 'No se pudo calcular la reactivación', { id: toastId });
                return;
            }
        }
        setSelectedFactura(facturaActual);
        setFormCobro({ metodo: 'efectivo', referencia: '', monto: facturaActual.saldo_pendiente });
        setModo('pagar'); // Resetear a Pagar al abrir
        const date = new Date();
        date.setDate(date.getDate() + 3);
        const fechaInicial = date.toISOString().split('T')[0];
        setFechaPromesa(
            factura.fecha_maxima_promesa && fechaInicial > factura.fecha_maxima_promesa
                ? factura.fecha_maxima_promesa
                : fechaInicial,
        );
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
                result.queued
                    ? 'Cobro guardado para sincronizar'
                    : 'Pago registrado exitosamente',
                { id: toastId },
            );
            setIsModalOpen(false);
            if (result.queued) {
                setFacturas((current) => current.filter((item) => item.id !== selectedFactura.id));
                setHistorial((current) => [{
                    factura_id: selectedFactura.id,
                    metodo: formCobro.metodo,
                    monto: Number(formCobro.monto),
                    pendiente: true,
                }, ...current]);
            } else {
                const respuesta = result.response as CobroResultResponse | undefined;
                if ((respuesta?.facturas_pendientes_cant || 0) > 0) {
                    toast(`${respuesta?.facturas_pendientes_cant} factura(s) pendiente(s) del mismo cliente`);
                }
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
        } catch (error: unknown) {
            const detail = axios.isAxiosError<{ detail?: string }>(error)
                ? error.response?.data?.detail
                : undefined;
            toast.error(
                detail || "Error al guardar promesa",
                { id: toastId },
            );
        } finally {
            setProcesando(false);
        }
    };


    const clientesFiltrados = useMemo(() => {
        const term = filtro.trim().toLowerCase();
        if (!term) return [];

        const groups = new Map<string, BillingInvoice[]>();
        facturas.forEach((invoice) => {
            const matches = invoice.cliente.nombre.toLowerCase().includes(term)
                || invoice.cliente.cedula?.toLowerCase().includes(term)
                || invoice.cliente.ip_asignada?.toLowerCase().includes(term);
            if (!matches) return;
            const key = invoice.cliente.id
                ? String(invoice.cliente.id)
                : [
                    invoice.cliente.cedula,
                    invoice.cliente.nombre,
                    invoice.cliente.ip_asignada,
                ].join('|');
            groups.set(key, [...(groups.get(key) || []), invoice]);
        });

        return [...groups.entries()].map(([key, invoices]) => ({
            key,
            cliente: invoices[0].cliente,
            facturas: invoices.sort((left, right) => {
                const overdueOrder = Number(invoiceIsOverdue(right))
                    - Number(invoiceIsOverdue(left));
                return overdueOrder
                    || left.fecha_vencimiento.localeCompare(right.fecha_vencimiento)
                    || left.id - right.id;
            }),
        })).sort((left, right) => (
            left.cliente.nombre.localeCompare(right.cliente.nombre, 'es')
        ));
    }, [facturas, filtro]);

    const saldoAFavor = formCobro.monto > selectedFactura?.saldo_pendiente ? formCobro.monto - selectedFactura.saldo_pendiente : 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] text-slate-800 dark:text-white font-sans flex flex-col transition-colors duration-300">
            
            {/* HEADER ADAPTATIVO */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-sm backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-[#1a1f2e]/90 dark:shadow-xl sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-600/20">
                        {user.usuario?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest transition-colors">Cobrador</p>
                        <h1 className="text-sm font-black text-slate-900 dark:text-white capitalize transition-colors">{user.usuario}</h1>
                    </div>
                </div>
                <button aria-label="Cerrar sesión" onClick={handleLogout} className="app-icon-button">
                    <ArrowRightOnRectangleIcon className="w-6 h-6" />
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-28">
                {loading && (
                    <div role="status" className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                        <ArrowPathIcon className="h-4 w-4 animate-spin" /> Actualizando cobranza...
                    </div>
                )}
                
                {/* === PESTAÑA: COBRAR === */}
                {activeTab === 'cobrar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 shadow-xl shadow-indigo-950/15">
                            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-xl" />
                            <div className="relative flex items-center justify-between">
                                <span className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Recaudado Hoy</span>
                                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${online ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>
                                    {online ? 'En línea' : 'Modo offline'}
                                </span>
                            </div>
                            <h2 className="text-4xl font-black text-white mt-1">${totalCobradoHoy.toLocaleString('es-MX')}</h2>
                            <p className="mt-2 text-xs font-semibold text-blue-100/80">{historial.length} movimientos registrados</p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-widest">Buscar Cliente</label>
                            <div className="bg-white dark:bg-[#1a1f2e] rounded-xl flex items-center border border-slate-200 dark:border-slate-700 shadow-sm p-1 transition-colors">
                                <MagnifyingGlassIcon className="w-6 h-6 text-slate-400 ml-3" />
                                <input className="w-full bg-transparent p-3 text-slate-900 dark:text-white outline-none text-lg font-bold placeholder-slate-400" placeholder="Nombre, cédula o IP..." value={filtro} onChange={e => { setFiltro(e.target.value); setExpandedClient(null); }} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {clientesFiltrados.map((group) => {
                                const isExpanded = expandedClient === group.key;
                                const overdueCount = group.facturas.filter(invoiceIsOverdue).length;
                                const totalDebt = group.facturas.reduce(
                                    (sum, invoice) => sum + Number(invoice.saldo_pendiente),
                                    0,
                                );
                                return (
                                    <div key={group.key} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-[#1a1f2e]">
                                        <div className={`absolute bottom-0 left-0 top-0 w-1 ${overdueCount > 0 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between gap-3 p-4 pl-6 text-left active:bg-slate-50 dark:active:bg-slate-800/40"
                                            onClick={() => setExpandedClient(isExpanded ? null : group.key)}
                                        >
                                            <div className="min-w-0">
                                                <h3 className="truncate text-base font-black text-slate-900 dark:text-white">{group.cliente.nombre}</h3>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">Cédula: {group.cliente.cedula || 'S/N'}</span>
                                                    {group.cliente.ip_asignada && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{group.cliente.ip_asignada}</span>}
                                                    {overdueCount > 0 && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{overdueCount} atrasada(s)</span>}
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <span className="block text-xl font-black text-emerald-600 dark:text-emerald-400">${totalDebt.toLocaleString('es-MX')}</span>
                                                <span className="text-[10px] font-bold text-slate-500">{group.facturas.length} factura(s)</span>
                                                <ChevronDownIcon className={`ml-auto mt-1 h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="space-y-2 border-t border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#11151f]">
                                                {group.facturas.map((invoice, index) => {
                                                    const overdue = invoiceIsOverdue(invoice);
                                                    return (
                                                        <button
                                                            key={invoice.id}
                                                            type="button"
                                                            onClick={() => void handleOpenCobrar(invoice)}
                                                            className={`w-full rounded-xl border p-3 text-left transition active:scale-[0.99] ${overdue ? 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10' : 'border-indigo-200 bg-white dark:border-indigo-500/20 dark:bg-indigo-500/10'}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${overdue ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>{overdue ? 'Atrasada' : 'Actual'}</span>
                                                                        {overdue && index === 0 && <span className="text-[9px] font-black uppercase text-rose-700 dark:text-rose-300">Cobrar primero</span>}
                                                                    </div>
                                                                    <p className="mt-1 text-xs font-black text-slate-800 dark:text-white">{invoiceConcept(invoice)}</p>
                                                                    {invoice.descripcion && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{invoice.descripcion}</p>}
                                                                    <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">Factura #{invoice.id} · Vence el {formatDateLong(invoice.fecha_vencimiento)}</p>
                                                                </div>
                                                                <span className={`shrink-0 text-lg font-black ${overdue ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-400'}`}>${invoice.saldo_pendiente}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {filtro.trim() && clientesFiltrados.length === 0 && !loading && (
                                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700">No encontramos clientes por nombre, cédula o IP.</div>
                            )}
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
                                <div key={f.id} onClick={() => void handleOpenCobrar(f)} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                    <div className="pl-2">
                                        <h3 className="font-black text-slate-900 dark:text-white text-base">{f.cliente.nombre}</h3>
                                        <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">{invoiceConcept(f)}</p>
                                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1 uppercase flex items-center gap-1">
                                            <CalendarDaysIcon className="w-3 h-3"/> Promesa: {formatDateLong(f.fecha_vencimiento)}
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
            <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/92 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-15px_35px_-28px_rgba(15,23,42,.55)] backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-[#161b28]/92">
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
                                            <p>{invoiceConcept(selectedFactura)}</p>
                                            {selectedFactura?.descripcion && <p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">{selectedFactura.descripcion}</p>}
                                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Factura #{selectedFactura?.id} · Vence el {formatDateLong(selectedFactura?.fecha_vencimiento)}</p>
                                            <p className="mt-1 text-lg text-emerald-600 dark:text-emerald-400">Total a cobrar: ${selectedFactura?.saldo_pendiente}</p>
                                        </div>
                                        {selectedFactura?.dias_con_servicio != null && (
                                            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[10px] font-bold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                                                <span>Con servicio: {selectedFactura.dias_con_servicio} días</span>
                                                <span>Sin servicio: {selectedFactura.dias_sin_servicio ?? 0} días</span>
                                                <span>Ajuste: -${selectedFactura.ajuste_suspension ?? 0}</span>
                                                <span>Extras: ${selectedFactura.cargos_adicionales_total ?? 0}</span>
                                            </div>
                                        )}
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
                                                        max={selectedFactura?.fecha_maxima_promesa}
                                                        className="w-full bg-slate-50 dark:bg-[#11131a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-white font-bold text-center text-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm dark:shadow-lg" 
                                                        value={fechaPromesa} onChange={e => setFechaPromesa(e.target.value)} 
                                                    />
                                                    <p className="mt-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        Fecha máxima: {selectedFactura?.fecha_maxima_promesa || 'calculando...'}
                                                    </p>
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
    <button onClick={onClick} className={`relative flex min-h-12 w-20 flex-col items-center justify-center gap-1 rounded-2xl p-2 transition active:scale-95 ${active ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
        <Icon className={`w-6 h-6`}/>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        {badge > 0 && <span className="absolute top-1 right-2 bg-rose-600 text-white text-[8px] px-1 rounded-full">{badge}</span>}
    </button>
);

import {
    useState, useEffect, useCallback, useMemo, Fragment,
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
    BanknotesIcon, MagnifyingGlassIcon, PowerIcon,
    XMarkIcon, ArrowPathIcon, ClockIcon, HomeIcon, CreditCardIcon,
    CalendarDaysIcon, CheckCircleIcon, ChevronRightIcon, SignalSlashIcon,
} from '@heroicons/react/24/outline';
import { apiErrorMessage } from '@/utils/apiError';
import { useBrand } from '@/context/brand/useBrand';
import { BOTON_EXITO, CAMPO, ETIQUETA_CAMPO, TARJETA, TITULO_SECCION } from '../technician/estilo';

type PaymentMethod = 'efectivo' | 'transferencia';

interface BillingClient {
    id?: number;
    nombre: string;
    cedula?: string;
    ip_asignada?: string;
}

interface BillingConcept {
    id: number;
    tipo: string;
    concepto: string;
    descripcion?: string | null;
    monto_original: number;
    saldo_pendiente: number;
    estado: string;
    afecta_corte: boolean;
    fecha_cargo: string;
    numero_cuota?: number | null;
    total_cuotas?: number | null;
}

interface BillingInvoice {
    id: number;
    cliente: BillingClient;
    saldo_pendiente: number;
    estado?: string;
    fecha_vencimiento: string;
    periodo_desde?: string | null;
    periodo_hasta?: string | null;
    concepto?: string | null;
    descripcion?: string | null;
    detalles?: string | null;
    mes_correspondiente?: string | null;
    fecha_maxima_promesa?: string;
    dias_con_servicio?: number | null;
    dias_sin_servicio?: number | null;
    ajuste_suspension?: number;
    cargos_adicionales_total?: number;
    monto_servicio_original?: number | null;
    afecta_corte?: boolean;
    tipo_factura?: string;
    es_prorrateada?: boolean;
    plan_snapshot?: string | null;
    conceptos?: BillingConcept[];
    servicio?: { id?: number; alias?: string | null; direccion?: string | null; estado?: string | null } | null;
}


interface EstadoCuenta {
    total: number | string;
    incluye: string[];
    detalle: { texto: string; monto?: number | string; actual: boolean }[];
    facturas: { id: number; saldo_pendiente: number | string }[];
    suspendido: boolean;
    factura_promesa_id: number | null;
}

interface InvoiceListResponse {
    items?: BillingInvoice[];
}

interface PaymentHistoryItem {
    factura_id: number;
    metodo: PaymentMethod;
    monto: number;
    cliente_nombre?: string | null;
    fecha?: string | null;
    referencia?: string | null;
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

const pesos = (monto: number | string) => Number(monto).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

function hoyISO() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function horaCorta(value?: string | null) {
    if (!value) return '';
    const fecha = new Date(value);
    return Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}

function invoiceConcept(invoice?: BillingInvoice | null) {
    if (!invoice) return 'Factura';
    if (invoice.afecta_corte === false) return invoice.concepto || 'Cargo adicional';
    return invoice.es_prorrateada || invoice.tipo_factura === 'prorrateo'
        ? 'Factura prorrateada de internet'
        : 'Factura de internet';
}

function invoiceIsCurrent(invoice: BillingInvoice) {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const today = new Date(now.getTime() - offset).toISOString().slice(0, 10);
    return Boolean(
        invoice.periodo_desde?.slice(0, 10) <= today
        && invoice.periodo_hasta?.slice(0, 10) >= today
    );
}

function invoiceIsOverdue(invoice: BillingInvoice) {
    if (invoice.afecta_corte !== false && invoice.servicio?.estado === 'suspendido') return true;
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const today = new Date(now.getTime() - offset).toISOString().slice(0, 10);
    return !invoiceIsCurrent(invoice) && (
        invoice.estado === 'vencida'
        || invoice.fecha_vencimiento.slice(0, 10) < today
    );
}

export default function PanelCobrador() {
    const navigate = useNavigate();
    const { online } = useSync();
    const { brand } = useBrand();
    const user = JSON.parse(localStorage.getItem('user') || '{}') as CollectorUser;

    const [activeTab, setActiveTab] = useState<'cobrar' | 'promesas' | 'hoy'>('cobrar');
    const [facturas, setFacturas] = useState<BillingInvoice[]>([]);
    const [historial, setHistorial] = useState<PaymentHistoryItem[]>([]);
    const [promesas, setPromesas] = useState<BillingInvoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('');
    const [cobroTotal, setCobroTotal] = useState<{ total: number; detalle: { texto: string; monto?: number | string; actual: boolean }[] } | null>(null);
    
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
            void client.post('/auth/logout').finally(() => {
                localStorage.clear();
                notifySessionChanged();
                navigate('/login');
            });
        }
    };

    // Un solo cobro por cliente: mensualidad, prorrateo, extras y reconexión.
    const openClientCharge = async (invoices: BillingInvoice[]) => {
        const ordered = [...invoices]
            .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento) || a.id - b.id);
        if (!ordered[0]) return;
        const clienteId = ordered[0].cliente.id;
        let principal = ordered[0];
        let total = ordered.reduce((sum, invoice) => sum + Number(invoice.saldo_pendiente), 0);
        let detalle: EstadoCuenta['detalle'] = ordered.map((invoice) => ({ texto: invoiceConcept(invoice), monto: invoice.saldo_pendiente, actual: false }));

        if (online && clienteId) {
            const toastId = toast.loading('Calculando total…');
            try {
                const { data } = await client.post<EstadoCuenta>(`/finanzas/clientes/${clienteId}/estado-cuenta`);
                total = Number(data.total);
                detalle = data.detalle;
                principal = ordered.find((item) => item.id === data.factura_promesa_id) || principal;
                toast.dismiss(toastId);
                if (total <= 0) {
                    toast.success('El cliente no tiene saldo pendiente');
                    void fetchData();
                    return;
                }
            } catch (error: unknown) {
                const detail = apiErrorMessage(error, '');
                toast.error(detail || 'No se pudo calcular el total', { id: toastId });
                return;
            }
        } else if (ordered.some((invoice) => invoice.servicio?.estado === 'suspendido')) {
            toast.error('La reactivación requiere conexión para calcular los días reales');
            return;
        }

        setSelectedFactura(principal);
        setCobroTotal({ total: Number(total.toFixed(2)), detalle });
        setFormCobro({ metodo: 'efectivo', referencia: '', monto: Number(total.toFixed(2)) });
        setModo('pagar');
        const date = new Date();
        date.setDate(date.getDate() + 3);
        const initialDate = date.toISOString().split('T')[0];
        setFechaPromesa(
            principal.fecha_maxima_promesa && initialDate > principal.fecha_maxima_promesa
                ? principal.fecha_maxima_promesa
                : initialDate,
        );
        setIsModalOpen(true);
    };

    const handleProcesarCobro = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFactura) return;
        const cliente = selectedFactura.cliente;
        setProcesando(true);
        const toastId = toast.loading("Procesando...");
        try {
            const result = await submitOperation(
                'pago_cliente',
                {
                    cliente_id: cliente.id,
                    metodo_pago: formCobro.metodo,
                    monto_recibido: Number(formCobro.monto),
                    referencia: formCobro.referencia || null,
                },
                `Cobro ${cliente.nombre}`,
            );
            toast.success(
                result.queued
                    ? 'Cobro guardado para sincronizar'
                    : 'Pago registrado exitosamente',
                { id: toastId },
            );
            setIsModalOpen(false);
            if (result.queued) {
                setFacturas((current) => current.filter((item) => item.cliente.id !== cliente.id));
                setHistorial((current) => [{
                    factura_id: selectedFactura.id,
                    metodo: formCobro.metodo,
                    monto: Number(formCobro.monto),
                    cliente_nombre: cliente.nombre,
                    fecha: new Date().toISOString(),
                    pendiente: true,
                }, ...current]);
            } else {
                const respuesta = result.response as { reactivado?: boolean } | undefined;
                if (respuesta?.reactivado) toast.success('Servicio reactivado 🚀');
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
            const detail = apiErrorMessage(error, '');
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

    const totalACobrar = cobroTotal?.total || 0;
    const saldoAFavor = formCobro.monto > totalACobrar
        ? formCobro.monto - totalACobrar
        : 0;
    const suspendido = selectedFactura?.servicio?.estado === 'suspendido';

    const hoy = hoyISO();
    const promesasOrdenadas = [...promesas].sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
    const promesasHoy = promesas.filter((p) => p.fecha_vencimiento.slice(0, 10) <= hoy);
    const fechaHoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const fechaHoyTexto = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

    const resumenDia = (
        <div className={`${TARJETA} p-4`}>
            <div className="flex items-center justify-between">
                <span className={TITULO_SECCION.replace('px-1 ', '')}>Cobrado hoy</span>
                {!online && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        <SignalSlashIcon className="h-3.5 w-3.5" /> Sin internet
                    </span>
                )}
            </div>
            <p className="mt-1 text-4xl font-black tracking-tight text-slate-900 dark:text-white">{pesos(totalCobradoHoy)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                <div>
                    <p className="flex items-center gap-1 text-xs text-slate-500"><BanknotesIcon className="h-4 w-4" /> Efectivo</p>
                    <p className="font-bold text-slate-900 dark:text-white">{pesos(totalEfectivo)}</p>
                </div>
                <div>
                    <p className="flex items-center gap-1 text-xs text-slate-500"><CreditCardIcon className="h-4 w-4" /> Transferencia</p>
                    <p className="font-bold text-slate-900 dark:text-white">{pesos(totalTransferencia)}</p>
                </div>
            </div>
        </div>
    );

    const vacio = (Icono: ComponentType<{ className?: string }>, texto: string) => (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Icono className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-500">{texto}</p>
        </div>
    );

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-white">

            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl dark:border-slate-800/60 dark:bg-[#1a1f2e]/90 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black uppercase text-white dark:bg-white dark:text-slate-900">
                        {user.usuario?.charAt(0) || 'C'}
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{brand.empresa_nombre} Cobranza</p>
                        <h1 className="text-sm font-black leading-tight text-slate-800 dark:text-white">{user.usuario}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button aria-label="Actualizar" onClick={() => void fetchData()} className="app-icon-button">
                        <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button aria-label="Cerrar sesión" onClick={handleLogout} className="app-icon-button hover:text-rose-500 dark:hover:text-rose-500">
                        <PowerIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6">

                {activeTab === 'cobrar' && (
                    <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                        <div className="px-1">
                            <p className="text-xs font-medium text-slate-400">{fechaHoyTexto}</p>
                            <h2 className="text-xl font-black tracking-tight">Hola, {user.usuario}</h2>
                        </div>

                        {resumenDia}

                        {promesasHoy.length > 0 && (
                            <button type="button" onClick={() => setActiveTab('promesas')} className={`${TARJETA} flex items-center gap-3 p-4 text-left transition active:scale-[0.98]`}>
                                <span className="h-10 w-1 shrink-0 rounded-full bg-amber-500" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold">{promesasHoy.length === 1 ? '1 promesa vence hoy' : `${promesasHoy.length} promesas vencen hoy`}</span>
                                    <span className="block text-xs text-slate-500">Si no pagan, se les corta el servicio</span>
                                </span>
                                <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                            </button>
                        )}

                        <label className={`${TARJETA} flex items-center gap-2 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15`}>
                            <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-slate-400" />
                            <input
                                aria-label="Buscar cliente"
                                className="h-12 w-full bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                                placeholder="Nombre, contrato o IP"
                                value={filtro}
                                onChange={e => setFiltro(e.target.value)}
                            />
                            {filtro && (
                                <button type="button" aria-label="Limpiar búsqueda" onClick={() => setFiltro('')} className="rounded-full p-1 text-slate-400 hover:text-slate-600">
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            )}
                        </label>

                        {!filtro.trim() && (
                            <p className="px-1 text-center text-xs text-slate-400">Busca al cliente para cobrarle o darle una promesa de pago.</p>
                        )}

                        {clientesFiltrados.map((group) => {
                            const atrasado = group.facturas.some(invoiceIsOverdue);
                            const totalDebt = group.facturas.reduce((sum, invoice) => sum + Number(invoice.saldo_pendiente), 0);
                            return (
                                <button
                                    key={group.key}
                                    type="button"
                                    onClick={() => void openClientCharge(group.facturas)}
                                    className={`${TARJETA} flex items-center gap-3 p-4 text-left transition active:scale-[0.98]`}
                                >
                                    <span className={`h-10 w-1 shrink-0 rounded-full ${atrasado ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-bold">{group.cliente.nombre}</span>
                                        <span className="block truncate text-xs text-slate-500">
                                            {[group.cliente.cedula && `Contrato ${group.cliente.cedula}`, group.cliente.ip_asignada].filter(Boolean).join(' · ')}
                                        </span>
                                        {atrasado && <span className="mt-0.5 block text-xs font-semibold text-rose-600 dark:text-rose-400">Con atraso</span>}
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className="block text-lg font-black">{pesos(totalDebt)}</span>
                                        <span className="block text-[11px] text-slate-500">{group.facturas.length === 1 ? '1 recibo' : `${group.facturas.length} recibos`}</span>
                                    </span>
                                </button>
                            );
                        })}
                        {filtro.trim() && clientesFiltrados.length === 0 && !loading && (
                            vacio(MagnifyingGlassIcon, 'Nadie con adeudo coincide con la búsqueda')
                        )}
                    </div>
                )}

                {activeTab === 'promesas' && (
                    <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                        <div className="flex items-baseline justify-between px-1">
                            <h2 className="text-xl font-black tracking-tight">Promesas</h2>
                            {promesas.length > 0 && <span className="text-sm text-slate-500">Por cobrar {pesos(totalRetencionPromesas)}</span>}
                        </div>
                        {promesasOrdenadas.length === 0 && vacio(CalendarDaysIcon, 'No hay promesas activas')}
                        {promesasOrdenadas.map((f) => {
                            const vence = f.fecha_vencimiento.slice(0, 10);
                            const urgente = vence <= hoy;
                            return (
                                <button key={f.id} type="button" onClick={() => void openClientCharge([f])} className={`${TARJETA} flex items-center gap-3 p-4 text-left transition active:scale-[0.98]`}>
                                    <span className={`h-10 w-1 shrink-0 rounded-full ${urgente ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-bold">{f.cliente.nombre}</span>
                                        <span className={`block text-xs ${urgente ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}>
                                            {vence < hoy ? 'Venció' : vence === hoy ? 'Vence hoy' : 'Paga el'} {formatDateLong(f.fecha_vencimiento)}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-lg font-black">{pesos(f.saldo_pendiente)}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'hoy' && (
                    <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                        <h2 className="px-1 text-xl font-black tracking-tight">Cobros de hoy</h2>
                        {resumenDia}
                        {historial.length === 0 && vacio(ClockIcon, 'Aún no hay cobros hoy')}
                        {historial.length > 0 && (
                            <div className={`${TARJETA} divide-y divide-slate-100 dark:divide-slate-800`}>
                                {historial.map((h, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                                        {h.metodo === 'efectivo'
                                            ? <BanknotesIcon className="h-5 w-5 shrink-0 text-emerald-600" />
                                            : <CreditCardIcon className="h-5 w-5 shrink-0 text-blue-600" />}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">{h.cliente_nombre || `Recibo #${h.factura_id}`}</p>
                                            <p className="truncate text-xs text-slate-500">
                                                {[horaCorta(h.fecha), h.metodo === 'efectivo' ? 'Efectivo' : 'Transferencia', h.referencia].filter(Boolean).join(' · ')}
                                            </p>
                                            {h.pendiente && <p className="text-xs font-semibold text-amber-600">Se enviará al tener internet</p>}
                                        </div>
                                        <span className="shrink-0 font-bold tabular-nums">{pesos(h.monto)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <nav aria-label="Secciones" className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#11151f]/95">
                <div className="mx-auto grid max-w-3xl grid-cols-3">
                    <NavButton icon={HomeIcon} label="Cobrar" active={activeTab === 'cobrar'} onClick={() => setActiveTab('cobrar')} />
                    <NavButton icon={CalendarDaysIcon} label="Promesas" badge={promesasHoy.length} active={activeTab === 'promesas'} onClick={() => setActiveTab('promesas')} />
                    <NavButton icon={ClockIcon} label="Hoy" active={activeTab === 'hoy'} onClick={() => setActiveTab('hoy')} />
                </div>
            </nav>

            <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
                    <div className="fixed inset-0 overflow-hidden">
                        <div className="flex h-full items-end justify-center sm:items-center sm:p-4">
                            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="translate-y-full opacity-0" enterTo="translate-y-0 opacity-100">
                                <Dialog.Panel className="flex max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-50 dark:bg-slate-950 sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl">

                                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="min-w-0">
                                            <Dialog.Title className="break-words text-base font-black leading-tight">{selectedFactura?.cliente.nombre}</Dialog.Title>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                Contrato {selectedFactura?.cliente.cedula || 'S/N'} ·{' '}
                                                <span className={suspendido ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold text-emerald-600 dark:text-emerald-400'}>
                                                    {suspendido ? 'Suspendido' : 'Activo'}
                                                </span>
                                            </p>
                                        </div>
                                        <button aria-label="Cerrar" onClick={() => setIsModalOpen(false)} className="app-icon-button shrink-0">
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                                        <div className={`${TARJETA} p-4`}>
                                            <p className={ETIQUETA_CAMPO}>Se está cobrando</p>
                                            <ul className="space-y-1.5">
                                                {(cobroTotal?.detalle || []).map((item, index) => (
                                                    <li key={index} className="flex items-start justify-between gap-3 text-sm">
                                                        <span className="min-w-0 flex-1 break-words text-slate-700 dark:text-slate-200">
                                                            {item.texto}
                                                            {item.actual && <span className="ml-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">· mes actual</span>}
                                                        </span>
                                                        {item.monto != null && <span className="shrink-0 font-semibold tabular-nums">{pesos(item.monto)}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                                                <span className="text-sm font-semibold text-slate-500">Total</span>
                                                <span className="text-2xl font-black">{pesos(totalACobrar)}</span>
                                            </div>
                                        </div>

                                        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
                                            {(['pagar', 'promesa'] as const).map((opcion) => (
                                                <button
                                                    key={opcion}
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={modo === opcion}
                                                    onClick={() => setModo(opcion)}
                                                    className={`h-10 rounded-lg text-sm font-bold transition ${modo === opcion ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500'}`}
                                                >
                                                    {opcion === 'pagar' ? 'Cobrar' : 'Promesa de pago'}
                                                </button>
                                            ))}
                                        </div>

                                        {modo === 'pagar' ? (
                                            <form id="form-cobro" onSubmit={handleProcesarCobro} className="space-y-4">
                                                <label className={`${TARJETA} block p-4`}>
                                                    <span className={ETIQUETA_CAMPO}>Recibe</span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="text-3xl font-bold text-slate-400">$</span>
                                                        <input
                                                            type="number" step="0.01" min="0.01" required inputMode="decimal"
                                                            aria-label="Monto recibido"
                                                            className="w-full bg-transparent text-4xl font-black tabular-nums outline-none"
                                                            style={{ fontSize: '2.25rem', lineHeight: 1.1 }}
                                                            placeholder="0.00" value={formCobro.monto || ''} onChange={e => setFormCobro({ ...formCobro, monto: Number(e.target.value) })}
                                                        />
                                                    </span>
                                                    {formCobro.monto > 0 && formCobro.monto < totalACobrar && (
                                                        <span className="mt-1 block text-xs font-semibold text-amber-700 dark:text-amber-400">Abono: quedan {pesos(totalACobrar - formCobro.monto)} pendientes</span>
                                                    )}
                                                    {saldoAFavor > 0 && (
                                                        <span className="mt-1 block text-xs font-semibold text-emerald-600 dark:text-emerald-400">Queda saldo a favor de {pesos(saldoAFavor)}</span>
                                                    )}
                                                </label>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {([['efectivo', 'Efectivo', BanknotesIcon], ['transferencia', 'Transferencia', CreditCardIcon]] as const).map(([valor, texto, Icono]) => (
                                                        <button
                                                            key={valor}
                                                            type="button"
                                                            aria-pressed={formCobro.metodo === valor}
                                                            onClick={() => setFormCobro({ ...formCobro, metodo: valor })}
                                                            className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${formCobro.metodo === valor ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-transparent dark:text-slate-300'}`}
                                                        >
                                                            <Icono className="h-5 w-5" /> {texto}
                                                        </button>
                                                    ))}
                                                </div>

                                                {formCobro.metodo === 'transferencia' && (
                                                    <label className="block">
                                                        <span className={ETIQUETA_CAMPO}>Referencia o banco</span>
                                                        <input type="text" required className={`${CAMPO} h-11`} value={formCobro.referencia} onChange={e => setFormCobro({ ...formCobro, referencia: e.target.value })} />
                                                    </label>
                                                )}
                                            </form>
                                        ) : (
                                            <form id="form-promesa" onSubmit={handleProcesarPromesa} className="space-y-4">
                                                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                                                    El cliente queda con internet hasta la fecha que elijas. Si no paga ese día, el sistema le corta solo.
                                                </p>
                                                <label className="block">
                                                    <span className={ETIQUETA_CAMPO}>Pagará a más tardar el</span>
                                                    <input
                                                        type="date" required
                                                        max={selectedFactura?.fecha_maxima_promesa}
                                                        className={`${CAMPO} h-12 text-base font-semibold`}
                                                        value={fechaPromesa} onChange={e => setFechaPromesa(e.target.value)}
                                                    />
                                                    {selectedFactura?.fecha_maxima_promesa && (
                                                        <span className="mt-1 block text-xs text-slate-500">Lo más que se puede: {formatDateLong(selectedFactura.fecha_maxima_promesa)}</span>
                                                    )}
                                                </label>
                                            </form>
                                        )}
                                    </div>

                                    <div className="border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900">
                                        {modo === 'pagar' ? (
                                            <button type="submit" form="form-cobro" disabled={procesando} className={`${BOTON_EXITO} h-12 text-base`}>
                                                {procesando ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <><CheckCircleIcon className="h-5 w-5" /> Cobrar {pesos(formCobro.monto || 0)}</>}
                                            </button>
                                        ) : (
                                            <button type="submit" form="form-promesa" disabled={procesando} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-base font-bold text-white transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50">
                                                {procesando ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <><CalendarDaysIcon className="h-5 w-5" /> Guardar promesa</>}
                                            </button>
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

const NavButton = ({ icon: Icon, label, active, badge = 0, onClick }: NavButtonProps) => (
    <button
        type="button"
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        onClick={onClick}
        className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 transition active:scale-95 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
    >
        {active && <span className="absolute top-0 h-0.5 w-10 rounded-b-full bg-blue-600 dark:bg-blue-400" />}
        <span className="relative">
            <Icon className="h-6 w-6" />
            {badge > 0 && (
                <span className="absolute -right-2.5 -top-1.5 min-w-[1.1rem] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white">{badge > 99 ? '99+' : badge}</span>
            )}
        </span>
        <span className="text-[11px] font-semibold">{label}</span>
    </button>
);

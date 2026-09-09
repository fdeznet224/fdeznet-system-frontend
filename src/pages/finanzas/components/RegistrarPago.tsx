import { useState, useEffect, useRef, Fragment } from 'react';
import axios from 'axios';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { Transition } from '@headlessui/react';
import { 
    MagnifyingGlassIcon, XMarkIcon, UserIcon, BanknotesIcon, ArrowPathIcon,
    ShieldExclamationIcon, CreditCardIcon, CalendarDaysIcon,
    CheckCircleIcon, ChevronLeftIcon, IdentificationIcon, MapPinIcon
} from '@heroicons/react/24/outline';

interface Props {
    onCancel: () => void; 
    onSuccess: () => void;
}

interface ClienteBusqueda {
    id: number;
    nombre: string;
    cedula?: string | null;
    ip_asignada?: string | null;
    estado: string;
    zona?: { nombre?: string | null } | null;
}

interface FacturaPendiente {
    id: number;
    estado?: string;
    fecha_vencimiento: string;
    periodo_desde?: string | null;
    periodo_hasta?: string | null;
    saldo_pendiente: number | string;
    concepto?: string | null;
    descripcion?: string | null;
    detalles?: string | null;
    mes_correspondiente?: string | null;
    dias_con_servicio?: number | null;
    dias_sin_servicio?: number | null;
    ajuste_suspension?: number | string;
    cargos_adicionales_total?: number | string;
    tipo_factura?: string;
    es_prorrateada?: boolean;
    servicio?: {
        id?: number;
        estado?: string | null;
        alias?: string | null;
        direccion?: string | null;
    } | null;
    cotizada_reactivacion?: boolean;
}

interface ReactivationQuote {
    factura_id: number;
    concepto?: string | null;
    fecha_vencimiento: string;
    descripcion: string;
    dias_con_servicio: number;
    dias_sin_servicio: number;
    ajuste_suspension: number | string;
    cargos_adicionales: number | string;
    saldo_pendiente: number | string;
}

interface ListadoDeudaResponse {
    items: FacturaPendiente[];
}

interface CobroResponse {
    reactivado?: boolean;
    facturas_pendientes_cant?: number;
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

function invoiceMonth(invoice?: FacturaPendiente | null) {
    const value = invoice?.mes_correspondiente;
    if (!value) return formatDateLong(invoice?.fecha_vencimiento);
    const match = value.match(/^(\d{4})-(\d{1,2})$/);
    if (match) return `${MESES_ES[Number(match[2]) - 1]} de ${match[1]}`;
    const englishMonths = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    return value.replace(/january|february|march|april|may|june|july|august|september|october|november|december/i, (month) => MESES_ES[englishMonths.indexOf(month.toLowerCase())]);
}

function invoiceIsOverdue(invoice: FacturaPendiente) {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const today = new Date(now.getTime() - offset).toISOString().slice(0, 10);
    return invoice.estado === 'vencida'
        || invoice.fecha_vencimiento.slice(0, 10) < today;
}

function getErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || fallback;
    }
    return fallback;
}

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

// Estilos base reutilizables
const inputClass = "w-full bg-white dark:bg-[#12141a] border border-slate-200 dark:border-slate-800/80 rounded-[1.25rem] p-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all";
const labelClass = "block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 ml-1";

export default function RegistrarPago({ onCancel, onSuccess }: Props) {
    // --- ESTADOS DE BÚSQUEDA ---
    const [busqueda, setBusqueda] = useState('');
    const [loadingBusqueda, setLoadingBusqueda] = useState(false);
    const [resultadosBusqueda, setResultadosBusqueda] = useState<ClienteBusqueda[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    // --- ESTADOS DE SELECCIÓN ---
    const [selectedCliente, setSelectedCliente] = useState<ClienteBusqueda | null>(null);
    const [facturasPendientes, setFacturasPendientes] = useState<FacturaPendiente[]>([]);
    const [selectedFactura, setSelectedFactura] = useState<FacturaPendiente | null>(null);
    const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<number[]>([]);
    const [montosPorFactura, setMontosPorFactura] = useState<Record<number, string>>({});
    const [loadingDeuda, setLoadingDeuda] = useState(false);
    
    // --- ESTADOS DEL FORMULARIO ---
    const [modo, setModo] = useState<'pagar' | 'promesa'>('pagar');
    const [metodo, setMetodo] = useState('efectivo');
    const [referencia, setReferencia] = useState('');
    const [fechaPromesa, setFechaPromesa] = useState('');
    const [procesando, setProcesando] = useState(false);
    const idempotencyKey = useRef<string | null>(null);

    const searchRef = useRef<HTMLDivElement>(null);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // La factura activa se conserva para el flujo individual de prórroga.
    useEffect(() => {
        if (selectedFactura) {
            const d = new Date(); d.setDate(d.getDate() + 3);
            setFechaPromesa(d.toISOString().split('T')[0]);
        }
    }, [selectedFactura]);

    useEffect(() => {
        if (
            !selectedFactura
            || selectedFactura.servicio?.estado !== 'suspendido'
            || selectedFactura.cotizada_reactivacion
        ) return;
        let active = true;
        setLoadingDeuda(true);
        void client.post<ReactivationQuote>(
            `/finanzas/facturas/${selectedFactura.id}/cotizar-reactivacion`,
        ).then(({ data }) => {
            if (!active) return;
            const actualizada: FacturaPendiente = {
                ...selectedFactura,
                id: data.factura_id,
                concepto: data.concepto,
                fecha_vencimiento: data.fecha_vencimiento,
                descripcion: data.descripcion,
                saldo_pendiente: data.saldo_pendiente,
                dias_con_servicio: data.dias_con_servicio,
                dias_sin_servicio: data.dias_sin_servicio,
                ajuste_suspension: data.ajuste_suspension,
                cargos_adicionales_total: data.cargos_adicionales,
                cotizada_reactivacion: true,
            };
            setSelectedFactura(actualizada);
            setFacturasPendientes((items) => [
                actualizada,
                ...items.filter((item) => (
                    item.id !== selectedFactura.id
                    && item.id !== actualizada.id
                )),
            ]);
            setMontosPorFactura((actual) => ({
                ...actual,
                [actualizada.id]: String(data.saldo_pendiente),
            }));
        }).catch((error: unknown) => {
            if (active) toast.error(getErrorMessage(error, 'No se pudo calcular la reactivación'));
        }).finally(() => {
            if (active) setLoadingDeuda(false);
        });
        return () => { active = false; };
    }, [selectedFactura]);

    // BUSCADOR PREDICTIVO
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (busqueda.trim().length >= 3 && !selectedCliente) {
                realizarBusqueda(busqueda);
            } else {
                setResultadosBusqueda([]);
                setShowDropdown(false);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [busqueda, selectedCliente]);

    const realizarBusqueda = async (term: string) => {
        setLoadingBusqueda(true);
        try {
            const res = await client.get<ClienteBusqueda[]>('/clientes/', { params: { search: term } });
            const filtrados = res.data.filter((c) =>
                c.nombre.toLowerCase().includes(term.toLowerCase()) || 
                (c.ip_asignada && c.ip_asignada.includes(term)) ||
                (c.cedula && c.cedula.toLowerCase().includes(term.toLowerCase()))
            );
            setResultadosBusqueda(filtrados);
            setShowDropdown(true);
        } catch {
            console.error("Error en búsqueda predictiva"); 
        } finally { 
            setLoadingBusqueda(false); 
        }
    };

    // SELECCIONAR CLIENTE
    const seleccionarCliente = async (cliente: ClienteBusqueda) => {
        setBusqueda('');
        setShowDropdown(false);
        setResultadosBusqueda([]);
        setSelectedCliente(cliente);
        setLoadingDeuda(true);
        setSelectedFactura(null);
        setFacturasSeleccionadas([]);
        setMontosPorFactura({});

        try {
            const res = await client.get<ListadoDeudaResponse>('/finanzas/listado-completo', {
                params: { estado: 'adeudos', cliente_id: cliente.id }
            });
            const orderedInvoices = [...res.data.items].sort((left, right) => {
                const overdueOrder = Number(invoiceIsOverdue(right))
                    - Number(invoiceIsOverdue(left));
                return overdueOrder
                    || left.fecha_vencimiento.localeCompare(right.fecha_vencimiento)
                    || left.id - right.id;
            });
            const invoices = await Promise.all(orderedInvoices.map(async (factura) => {
                if (factura.servicio?.estado !== 'suspendido') return factura;
                const { data } = await client.post<ReactivationQuote>(
                    `/finanzas/facturas/${factura.id}/cotizar-reactivacion`,
                );
                return {
                    ...factura,
                    id: data.factura_id,
                    concepto: data.concepto,
                    fecha_vencimiento: data.fecha_vencimiento,
                    descripcion: data.descripcion,
                    saldo_pendiente: data.saldo_pendiente,
                    dias_con_servicio: data.dias_con_servicio,
                    dias_sin_servicio: data.dias_sin_servicio,
                    ajuste_suspension: data.ajuste_suspension,
                    cargos_adicionales_total: data.cargos_adicionales,
                    cotizada_reactivacion: true,
                } satisfies FacturaPendiente;
            }));
            setFacturasPendientes(invoices);
            setFacturasSeleccionadas(invoices.map((factura) => factura.id));
            setMontosPorFactura(Object.fromEntries(
                invoices.map((factura) => [factura.id, String(factura.saldo_pendiente)]),
            ));
            if (invoices.length > 0) setSelectedFactura(invoices[0]);
        } catch {
            toast.error("Error cargando deuda del cliente"); 
        } finally { 
            setLoadingDeuda(false); 
        }
    };

    const deseleccionarCliente = () => {
        setSelectedCliente(null);
        setFacturasPendientes([]);
        setSelectedFactura(null);
        setFacturasSeleccionadas([]);
        setMontosPorFactura({});
        setBusqueda('');
    };

    const seleccionarComprobante = (value: string) => {
        if (value === 'all') {
            setFacturasSeleccionadas(facturasPendientes.map((factura) => factura.id));
            setSelectedFactura(facturasPendientes[0] || null);
            setModo('pagar');
            return;
        }
        const factura = facturasPendientes.find((item) => item.id === Number(value));
        if (!factura) return;
        setFacturasSeleccionadas([factura.id]);
        setSelectedFactura(factura);
        setMontosPorFactura((actual) => ({
            ...actual,
            [factura.id]: actual[factura.id] || String(factura.saldo_pendiente),
        }));
        setModo('pagar');
    };

    // COBRAR
    const handleCobrar = async (e: React.FormEvent) => {
        e.preventDefault();
        const seleccionadas = facturasPendientes.filter((factura) => facturasSeleccionadas.includes(factura.id));
        if (seleccionadas.length === 0) {
            toast.error('Selecciona al menos una factura');
            return;
        }
        const pagos = seleccionadas.map((factura) => ({
            factura,
            monto: Number(montosPorFactura[factura.id]),
        }));
        const invalido = pagos.find(({ monto }) => (
            !Number.isFinite(monto) || monto <= 0
        ));
        if (invalido) {
            toast.error(`Revisa el importe de la factura #${invalido.factura.id}`);
            return;
        }
        const parcialConFacturaPosterior = pagos.find(({ factura, monto }, index) => (
            monto < Number(factura.saldo_pendiente)
            && factura.servicio?.id != null
            && pagos.slice(index + 1).some(({ factura: posterior }) => (
                posterior.servicio?.id === factura.servicio?.id
            ))
        ));
        if (parcialConFacturaPosterior) {
            toast.error(
                `Para pagar otro periodo del servicio, primero liquida la factura #${parcialConFacturaPosterior.factura.id}`,
            );
            return;
        }
        setProcesando(true);
        const t = toast.loading(`Procesando ${pagos.length} cobro(s)...`);
        let procesados = 0;
        try {
            idempotencyKey.current ??= crypto.randomUUID();
            let reactivados = 0;
            for (const { factura, monto } of pagos) {
                const res = await client.post<CobroResponse>('/finanzas/cobrar', {
                    factura_id: factura.id,
                    metodo_pago: metodo,
                    monto_recibido: monto,
                    referencia: referencia || `Cobro agrupado #${idempotencyKey.current}`,
                    clave_idempotencia: `${idempotencyKey.current}:${factura.id}`,
                });
                procesados += 1;
                if (res.data.reactivado) reactivados += 1;
            }
            toast.dismiss(t);
            toast.success(pagos.length === 1 ? 'Pago registrado exitosamente' : `${pagos.length} pagos registrados`);
            if (reactivados > 0) toast.success(`${reactivados} servicio(s) reactivado(s) 🚀`);
            idempotencyKey.current = null;
            if (selectedCliente) {
                await seleccionarCliente(selectedCliente);
                setReferencia('');
            }
            onSuccess();
        } catch (error: unknown) {
            toast.dismiss(t); 
            toast.error(procesados > 0
                ? `Se registraron ${procesados} pago(s); actualizamos los saldos antes de continuar`
                : getErrorMessage(error, "Error al procesar el pago"));
            if (selectedCliente) await seleccionarCliente(selectedCliente);
        } finally { 
            setProcesando(false); 
        }
    };

    // PROMESA
    const handlePromesa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFactura || !selectedCliente) return;
        setProcesando(true);
        const t = toast.loading("Registrando promesa...");
        try {
            await client.post(`/clientes/${selectedCliente.id}/promesa-pago`, { 
                fecha_promesa: fechaPromesa 
            });
            toast.dismiss(t); 
            toast.success("Promesa creada y servicio reactivado ✅");
            onSuccess();
        } catch (error: unknown) {
            toast.dismiss(t); 
            toast.error(
                getErrorMessage(error, "Error al crear promesa"),
            );
        } finally { 
            setProcesando(false); 
        }
    };

    const totalCobro = facturasPendientes
        .filter((factura) => facturasSeleccionadas.includes(factura.id))
        .reduce((total, factura) => total + (Number(montosPorFactura[factura.id]) || 0), 0);

    return (
        <div className="flex flex-col h-[100dvh] sm:h-[85vh] bg-[#f8fafc] dark:bg-[#0a0c10] font-sans overflow-hidden sm:rounded-[2rem] relative transition-colors duration-300">
            
            {/* ================= HEADER ================= */}
            <div className="flex-none px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-[#0a0c10]/80 backdrop-blur-xl z-20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {selectedCliente ? (
                        <button onClick={deseleccionarCliente} className="p-2 -ml-2 text-slate-400 hover:text-slate-800 dark:hover:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-95">
                            <ChevronLeftIcon className="w-6 h-6"/>
                        </button>
                    ) : (
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-[14px]">
                            <BanknotesIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    )}
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                        {selectedCliente ? 'Registrar Cobro' : 'Registrar Pago'}
                    </h2>
                </div>
                <button onClick={onCancel} className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-900 rounded-full transition-all active:scale-95">
                    <XMarkIcon className="w-5 h-5"/>
                </button>
            </div>

            {/* ================= CONTENIDO ================= */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col items-center">
                
                {!selectedCliente ? (
                    // VISTA 1: BUSCADOR
                    <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-xl mx-auto mt-[-5vh]">
                        <div className="w-full text-center mb-8">
                            <div className="mx-auto w-24 h-24 bg-white dark:bg-[#12141a] rounded-[2rem] flex items-center justify-center mb-6 shadow-xl border border-slate-100 dark:border-slate-800">
                                <BanknotesIcon className="w-12 h-12 text-emerald-500" />
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white mb-2">¿A quién cobramos?</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Busca por nombre, número de contrato o IP del cliente</p>
                        </div>

                        <div className="w-full relative" ref={searchRef}>
                            <div className="relative group">
                                <MagnifyingGlassIcon className={`w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${busqueda ? 'text-emerald-500' : 'text-slate-400'}`} />
                                <input 
                                    autoFocus 
                                    type="text" 
                                    placeholder="Nombre, número de contrato de 4 dígitos o IP..."
                                    className="w-full bg-white dark:bg-[#12141a] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] pl-14 pr-12 py-4 text-base sm:text-lg text-slate-900 dark:text-white font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                                    value={busqueda} 
                                    onChange={e => setBusqueda(e.target.value)}
                                />
                                {busqueda && (
                                    <button onClick={() => setBusqueda('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition-colors">
                                        <XMarkIcon className="w-4 h-4"/>
                                    </button>
                                )}
                            </div>

                            {/* Dropdown de Resultados */}
                            <Transition
                                show={showDropdown}
                                as={Fragment}
                                enter="transition ease-out duration-200"
                                enterFrom="opacity-0 translate-y-1"
                                enterTo="opacity-100 translate-y-0"
                                leave="transition ease-in duration-150"
                                leaveFrom="opacity-100 translate-y-0"
                                leaveTo="opacity-0 translate-y-1"
                            >
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#12141a] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] shadow-2xl overflow-hidden z-50">
                                    {loadingBusqueda ? (
                                        <div className="p-6 text-center text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-2">
                                            <ArrowPathIcon className="w-5 h-5 animate-spin"/> Buscando...
                                        </div>
                                    ) : resultadosBusqueda.length > 0 ? (
                                        <ul className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                                            {resultadosBusqueda.map(c => (
                                                <li key={c.id}>
                                                    <button onClick={() => seleccionarCliente(c)} className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors flex items-center justify-between group">
                                                        <div className="flex items-center gap-4 overflow-hidden">
                                                            <div className="w-12 h-12 rounded-[14px] bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 transition-colors">
                                                                <UserIcon className="w-6 h-6" />
                                                            </div>
                                                            <div className="overflow-hidden pr-2">
                                                                <p className="font-black text-slate-800 dark:text-white text-sm sm:text-base truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{c.nombre}</p>
                                                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-slate-500">
                                                                    {c.cedula && <span className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase">Contrato: {c.cedula}</span>}
                                                                    <span className="bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-500/20 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><MapPinIcon className="w-3 h-3"/> {c.zona?.nombre || 'General'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className={classNames(
                                                            "shrink-0 text-[9px] uppercase font-black px-2 py-1 rounded-md border tracking-widest",
                                                            c.estado === 'activo' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                                                        )}>
                                                            {c.estado}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="p-8 text-center text-slate-500 font-bold">No encontramos coincidencias.</div>
                                    )}
                                </div>
                            </Transition>
                        </div>
                    </div>
                ) : (
                    // VISTA 2: FORMULARIO DE COBRO FINTECH
                    <div className="flex-1 flex flex-col p-4 sm:p-6 w-full max-w-xl mx-auto pb-32">
                        
                        {/* Tarjeta del Cliente Seleccionado */}
                        <div className="bg-white dark:bg-[#12141a] border border-slate-200 dark:border-slate-800/80 rounded-[1.5rem] p-4 mb-5 flex items-center justify-between shadow-sm transition-colors">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="h-12 w-12 rounded-[14px] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-xl font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                                    {selectedCliente.nombre.charAt(0)}
                                </div>
                                <div className="overflow-hidden pr-2">
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-0.5 flex items-center gap-1">
                                        <IdentificationIcon className="w-3 h-3"/> {selectedCliente.cedula || 'SIN NÚMERO DE CONTRATO'}
                                    </p>
                                    <h3 className="break-words font-black text-slate-800 dark:text-white text-base sm:text-lg leading-tight">{selectedCliente.nombre}</h3>
                                </div>
                            </div>
                            <span className={classNames(
                                "shrink-0 text-[10px] uppercase font-black px-2 py-1 rounded-md border tracking-widest",
                                selectedCliente.estado === 'activo' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                            )}>
                                {selectedCliente.estado}
                            </span>
                        </div>

                        {loadingDeuda ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 space-y-4 my-10">
                                <ArrowPathIcon className="w-10 h-10 animate-spin"/>
                                <p className="font-black text-sm tracking-widest uppercase">Calculando deuda...</p>
                            </div>
                        ) : (
                            <>
                                {/* Selector directo de comprobante */}
                                {facturasPendientes.length > 0 ? (
                                    <div className="mb-5">
                                        <label className={labelClass}>Comprobante a pagar</label>
                                        <select
                                            value={facturasSeleccionadas.length > 1 ? 'all' : String(facturasSeleccionadas[0] || '')}
                                            onChange={(event) => seleccionarComprobante(event.target.value)}
                                            className={`${inputClass} appearance-auto`}
                                        >
                                            {facturasPendientes.length > 1 && <option value="all">Todas las facturas — ${facturasPendientes.reduce((total, factura) => total + Number(factura.saldo_pendiente), 0).toFixed(2)}</option>}
                                            {facturasPendientes.map((factura) => (
                                                <option key={factura.id} value={factura.id}>
                                                    {invoiceMonth(factura)} — ${Number(factura.saldo_pendiente).toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                            Debe {facturasPendientes.length} factura{facturasPendientes.length === 1 ? '' : 's'} · ${facturasPendientes.reduce((total, factura) => total + Number(factura.saldo_pendiente), 0).toFixed(2)}
                                        </div>
                                        {selectedFactura && (
                                            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] dark:border-slate-800 dark:bg-slate-900/60">
                                                <div><span className="block font-black uppercase tracking-wider text-slate-400">Folio</span><span className="font-bold text-slate-700 dark:text-slate-200">#{selectedFactura.id}</span></div>
                                                <div><span className="block font-black uppercase tracking-wider text-slate-400">Mes</span><span className="font-bold capitalize text-slate-700 dark:text-slate-200">{invoiceMonth(selectedFactura)}</span></div>
                                                <div className="col-span-2"><span className="block font-black uppercase tracking-wider text-slate-400">Periodo cobrado</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedFactura.periodo_desde && selectedFactura.periodo_hasta ? `${formatDateLong(selectedFactura.periodo_desde)} al ${formatDateLong(selectedFactura.periodo_hasta)}` : formatDateLong(selectedFactura.fecha_vencimiento)}</span></div>
                                                <div><span className="block font-black uppercase tracking-wider text-slate-400">Vencimiento</span><span className="font-bold text-slate-700 dark:text-slate-200">{formatDateLong(selectedFactura.fecha_vencimiento)}</span></div>
                                                <div><span className="block font-black uppercase tracking-wider text-slate-400">Días con servicio</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedFactura.dias_con_servicio ?? 0} días</span></div>
                                                <div><span className="block font-black uppercase tracking-wider text-slate-400">Días sin servicio</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedFactura.dias_sin_servicio ?? 0} días</span></div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-white dark:bg-[#12141a] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-10 mb-6 shadow-sm">
                                        <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-emerald-500"/>
                                        <p className="text-xl font-black text-slate-800 dark:text-white mb-2">¡Todo al día!</p>
                                        <p className="text-sm font-medium text-center">Este cliente no tiene recibos pendientes de pago.</p>
                                    </div>
                                )}

                                {/* Formulario de Acción */}
                                {selectedFactura && (
                                    <div className="flex-1 flex flex-col">
                                        {/* Tabs Pagar/Promesa tipo iOS */}
                                        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-[1rem] mb-6 border border-slate-200 dark:border-slate-800">
                                            <button onClick={() => setModo('pagar')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modo === 'pagar' ? 'bg-white dark:bg-[#12141a] text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-800/80' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                                Registrar Pago
                                            </button>
                                            <button onClick={() => setModo('promesa')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modo === 'promesa' ? 'bg-white dark:bg-[#12141a] text-amber-600 dark:text-amber-500 shadow-sm border border-slate-200 dark:border-slate-800/80' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                                Dar Prórroga
                                            </button>
                                        </div>

                                        {modo === 'pagar' ? (
                                            <form onSubmit={handleCobrar} className="flex flex-col flex-1">
                                                <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-[#12141a]">
                                                    <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">Monto recibido</label>
                                                    <div className="relative mx-auto w-full max-w-[260px]">
                                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-emerald-500">$</span>
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            required
                                                            readOnly={facturasSeleccionadas.length > 1}
                                                            value={facturasSeleccionadas.length > 1 ? totalCobro : (selectedFactura ? montosPorFactura[selectedFactura.id] || '' : '')}
                                                            onChange={(event) => selectedFactura && setMontosPorFactura((actual) => ({ ...actual, [selectedFactura.id]: event.target.value }))}
                                                            className="w-full border-b-2 border-transparent bg-transparent pb-1 pl-10 text-center text-6xl font-black text-slate-900 outline-none transition-all focus:border-emerald-500 dark:text-white sm:text-7xl"
                                                        />
                                                    </div>
                                                    <p className="mt-3 text-[11px] font-semibold text-slate-500">
                                                        {facturasSeleccionadas.length > 1
                                                            ? `${facturasSeleccionadas.length} facturas incluidas en el cobro`
                                                            : 'Puedes editar el monto para registrar un abono o una cantidad mayor.'}
                                                    </p>
                                                </div>

                                                <label className={labelClass}>Forma de Pago</label>
                                                <div className="grid grid-cols-2 gap-3 mb-6">
                                                    <button type="button" onClick={() => setMetodo('efectivo')} className={`p-4 rounded-[1.25rem] border flex flex-col justify-center items-center gap-2 transition-all font-black text-sm uppercase tracking-wide ${metodo === 'efectivo' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-500/10 shadow-sm' : 'bg-white dark:bg-[#12141a] border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                                                        <BanknotesIcon className="w-6 h-6"/> Efectivo
                                                    </button>
                                                    <button type="button" onClick={() => setMetodo('transferencia')} className={`p-4 rounded-[1.25rem] border flex flex-col justify-center items-center gap-2 transition-all font-black text-sm uppercase tracking-wide ${metodo === 'transferencia' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 ring-4 ring-blue-500/10 shadow-sm' : 'bg-white dark:bg-[#12141a] border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                                                        <CreditCardIcon className="w-6 h-6"/> Transferencia
                                                    </button>
                                                </div>

                                                {metodo === 'transferencia' && (
                                                    <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                                                        <label className={labelClass}>Referencia / Folio</label>
                                                        <input type="text" placeholder="Ej. Ref 901823" className={inputClass} value={referencia} onChange={e => setReferencia(e.target.value)} />
                                                    </div>
                                                )}

                                                <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 sm:static bg-white/90 dark:bg-[#0a0c10]/90 sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none border-t border-slate-200 dark:border-slate-800 sm:border-0 z-10">
                                                    <button type="submit" disabled={procesando || totalCobro <= 0} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-[1.25rem] shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50 text-sm uppercase tracking-widest flex justify-center items-center gap-2">
                                                        {procesando ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <><CheckCircleIcon className="w-5 h-5" /> Cobrar ${totalCobro.toFixed(2)}</>}
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <form onSubmit={handlePromesa} className="flex flex-col flex-1">
                                                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-5 rounded-[1.5rem] mb-6 text-center shadow-sm">
                                                    <ShieldExclamationIcon className="w-10 h-10 text-amber-500 mx-auto mb-2"/>
                                                    <p className="text-amber-700 dark:text-amber-400 text-xs font-bold leading-relaxed">
                                                        El servicio se reactivará temporalmente. Se cortará automáticamente si no se registra el pago en la fecha indicada.
                                                    </p>
                                                </div>
                                                
                                                <div className="mb-8">
                                                    <label className={labelClass}>Fecha Límite Acordada</label>
                                                    <div className="relative">
                                                        <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 pointer-events-none"/>
                                                        <input 
                                                            type="date" required 
                                                            className={`${inputClass} pl-12 text-center text-base`} 
                                                            value={fechaPromesa} onChange={e => setFechaPromesa(e.target.value)} 
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 sm:static bg-white/90 dark:bg-[#0a0c10]/90 sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none border-t border-slate-200 dark:border-slate-800 sm:border-0 z-10">
                                                    <button type="submit" disabled={procesando || !fechaPromesa} className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-4 rounded-[1.25rem] shadow-lg shadow-amber-500/30 active:scale-95 transition-all disabled:opacity-50 text-sm uppercase tracking-widest flex justify-center items-center gap-2">
                                                        {procesando ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : 'Aplicar Prórroga'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

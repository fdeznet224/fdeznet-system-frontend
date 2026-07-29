import { useState, useEffect, useRef, Fragment } from 'react';
import axios from 'axios';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { Transition } from '@headlessui/react';
import { 
    MagnifyingGlassIcon, XMarkIcon, UserIcon, BanknotesIcon, ArrowPathIcon,
    ShieldExclamationIcon, CreditCardIcon, CalendarDaysIcon,
    CheckCircleIcon, ChevronLeftIcon, IdentificationIcon, MapPinIcon,
    DocumentTextIcon
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
    fecha_vencimiento: string;
    saldo_pendiente: number | string;
}

interface ListadoDeudaResponse {
    items: FacturaPendiente[];
}

interface CobroResponse {
    reactivado?: boolean;
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
    const [loadingDeuda, setLoadingDeuda] = useState(false);
    
    // --- ESTADOS DEL FORMULARIO ---
    const [modo, setModo] = useState<'pagar' | 'promesa'>('pagar');
    const [metodo, setMetodo] = useState('efectivo');
    const [referencia, setReferencia] = useState('');
    const [montoPagar, setMontoPagar] = useState<string>(''); 
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

    // Pre-llenar datos al seleccionar factura
    useEffect(() => {
        if (selectedFactura) {
            setMontoPagar(String(selectedFactura.saldo_pendiente));
            setModo('pagar');
            const d = new Date(); d.setDate(d.getDate() + 3);
            setFechaPromesa(d.toISOString().split('T')[0]);
        }
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

        try {
            const res = await client.get<ListadoDeudaResponse>('/finanzas/listado-completo', {
                params: { estado: 'adeudos', cliente_id: cliente.id }
            });
            setFacturasPendientes(res.data.items);
            if (res.data.items.length > 0) setSelectedFactura(res.data.items[0]);
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
        setBusqueda('');
    };

    // COBRAR
    const handleCobrar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFactura) return;
        setProcesando(true);
        const t = toast.loading("Procesando pago...");
        try {
            idempotencyKey.current ??= crypto.randomUUID();
            const res = await client.post<CobroResponse>('/finanzas/cobrar', {
                factura_id: selectedFactura.id, 
                metodo_pago: metodo, 
                monto_recibido: Number(montoPagar), 
                referencia: referencia || `POS #${selectedFactura.id}`,
                clave_idempotencia: idempotencyKey.current,
            });
            toast.dismiss(t); toast.success("Pago registrado exitosamente");
            if (res.data.reactivado) toast.success("Servicio Reactivado 🚀");
            onSuccess();
            idempotencyKey.current = null;
        } catch (error: unknown) {
            toast.dismiss(t); 
            toast.error(getErrorMessage(error, "Error al procesar el pago"));
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
            toast.error(getErrorMessage(error, "Error al crear promesa"));
        } finally { 
            setProcesando(false); 
        }
    };

    const deuda = Number(selectedFactura?.saldo_pendiente) || 0;
    const ingreso = Number(montoPagar) || 0;
    const saldoAFavor = ingreso > deuda ? ingreso - deuda : 0;

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
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Busca por nombre, cédula o IP del cliente</p>
                        </div>

                        <div className="w-full relative" ref={searchRef}>
                            <div className="relative group">
                                <MagnifyingGlassIcon className={`w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${busqueda ? 'text-emerald-500' : 'text-slate-400'}`} />
                                <input 
                                    autoFocus 
                                    type="text" 
                                    placeholder="Ej. Juan Perez..."
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
                                                                    {c.cedula && <span className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase">ID: {c.cedula}</span>}
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
                                        <IdentificationIcon className="w-3 h-3"/> {selectedCliente.cedula || 'SIN CÉDULA'}
                                    </p>
                                    <h3 className="font-black text-slate-800 dark:text-white text-base sm:text-lg truncate leading-tight">{selectedCliente.nombre}</h3>
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
                                {/* Selector de Factura a Pagar */}
                                {facturasPendientes.length > 0 ? (
                                    <div className="mb-5">
                                        <label className={labelClass}>Concepto a Pagar</label>
                                        <div className="relative">
                                            <DocumentTextIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none"/>
                                            <select 
                                                className={`${inputClass} pl-12 cursor-pointer appearance-none`}
                                                value={selectedFactura?.id || ''}
                                                onChange={(e) => {
                                                    const f = facturasPendientes.find(fact => fact.id.toString() === e.target.value);
                                                    setSelectedFactura(f || null);
                                                }}
                                            >
                                                {facturasPendientes.map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        #{f.id} — Vence: {f.fecha_vencimiento} — ${f.saldo_pendiente}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
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
                                                {/* Input de Monto Estilo Fintech */}
                                                <div className="mb-6 bg-white dark:bg-[#12141a] border border-slate-200 dark:border-slate-800/80 rounded-[1.5rem] p-8 text-center shadow-sm">
                                                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-4">Monto Entregado</label>
                                                    <div className="relative inline-block w-full max-w-[240px]">
                                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl sm:text-5xl font-black text-emerald-500 pointer-events-none">$</span>
                                                        <input 
                                                            type="number" step="0.01" required
                                                            className="bg-transparent text-5xl sm:text-6xl font-black text-slate-800 dark:text-white outline-none w-full text-center pl-10 placeholder-slate-300 dark:placeholder-slate-800 transition-all border-b-2 border-transparent focus:border-emerald-500 pb-1 appearance-none"
                                                            placeholder="0.00" value={montoPagar} onChange={e => setMontoPagar(e.target.value)}
                                                        />
                                                    </div>
                                                    {saldoAFavor > 0 && (
                                                        <div className="mt-5 text-emerald-600 dark:text-emerald-400 text-xs font-black bg-emerald-50 dark:bg-emerald-500/10 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20 animate-in fade-in slide-in-from-bottom-2 uppercase tracking-wide">
                                                            Abono a favor: +${saldoAFavor.toFixed(2)}
                                                        </div>
                                                    )}
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
                                                    <button type="submit" disabled={procesando || !montoPagar} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-[1.25rem] shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50 text-sm uppercase tracking-widest flex justify-center items-center gap-2">
                                                        {procesando ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <><CheckCircleIcon className="w-5 h-5" /> Confirmar Cobro</>}
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

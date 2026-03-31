import { useState, useEffect, useRef } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    MagnifyingGlassIcon, XMarkIcon, UserIcon, BanknotesIcon, ArrowPathIcon,
    ShieldExclamationIcon, CreditCardIcon,
    CheckCircleIcon, ChevronLeftIcon, IdentificationIcon,MapPinIcon
} from '@heroicons/react/24/outline';

interface Props {
    onCancel: () => void; 
    onSuccess: () => void;
}

export default function RegistrarPago({ onCancel, onSuccess }: Props) {
    // --- ESTADOS DE BÚSQUEDA ---
    const [busqueda, setBusqueda] = useState('');
    const [loadingBusqueda, setLoadingBusqueda] = useState(false);
    const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    // --- ESTADOS DE SELECCIÓN ---
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [facturasPendientes, setFacturasPendientes] = useState<any[]>([]);
    const [selectedFactura, setSelectedFactura] = useState<any>(null);
    const [loadingDeuda, setLoadingDeuda] = useState(false);
    
    // --- ESTADOS DEL FORMULARIO ---
    const [modo, setModo] = useState<'pagar' | 'promesa'>('pagar');
    const [metodo, setMetodo] = useState('efectivo');
    const [referencia, setReferencia] = useState('');
    const [montoPagar, setMontoPagar] = useState<string>(''); 
    const [fechaPromesa, setFechaPromesa] = useState('');
    const [procesando, setProcesando] = useState(false);

    // Referencia para cerrar el dropdown si se hace clic fuera
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

    // Efecto: Pre-llenar datos al seleccionar factura
    useEffect(() => {
        if (selectedFactura) {
            setMontoPagar(String(selectedFactura.saldo_pendiente));
            setModo('pagar');
            const d = new Date(); d.setDate(d.getDate() + 3);
            setFechaPromesa(d.toISOString().split('T')[0]);
        }
    }, [selectedFactura]);

    // 1. BUSCADOR PREDICTIVO (Se dispara al escribir)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (busqueda.trim().length >= 3 && !selectedCliente) {
                realizarBusqueda(busqueda);
            } else {
                setResultadosBusqueda([]);
                setShowDropdown(false);
            }
        }, 500); // Debounce de 500ms para no saturar el servidor

        return () => clearTimeout(timeoutId);
    }, [busqueda, selectedCliente]);

    const realizarBusqueda = async (term: string) => {
        setLoadingBusqueda(true);
        try {
            const res = await client.get(`/clientes/?search=${term}`);
            // Filtramos también por IP o Cédula por si el backend no lo hace todo
            const filtrados = res.data.filter((c:any) => 
                c.nombre.toLowerCase().includes(term.toLowerCase()) || 
                (c.ip_asignada && c.ip_asignada.includes(term)) ||
                (c.cedula && c.cedula.toLowerCase().includes(term.toLowerCase()))
            );
            setResultadosBusqueda(filtrados);
            setShowDropdown(true);
        } catch (error) { 
            console.error("Error en búsqueda predictiva"); 
        } finally { 
            setLoadingBusqueda(false); 
        }
    };

    // 2. SELECCIONAR CLIENTE
    const seleccionarCliente = async (cliente: any) => {
        setBusqueda('');
        setShowDropdown(false);
        setResultadosBusqueda([]);
        setSelectedCliente(cliente);
        setLoadingDeuda(true);
        setSelectedFactura(null);

        try {
            const res = await client.get(`/finanzas/listado-completo?estado=pendiente`);
            const pendientes = res.data.items.filter((f: any) => f.cliente.id === cliente.id);
            
            setFacturasPendientes(pendientes);
            if (pendientes.length > 0) setSelectedFactura(pendientes[0]);
        } catch (error) { 
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

    // 3. COBRAR
    const handleCobrar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFactura) return;
        setProcesando(true);
        const t = toast.loading("Procesando pago...");
        try {
            const res = await client.post('/finanzas/cobrar', {
                factura_id: selectedFactura.id, 
                metodo_pago: metodo, 
                monto_recibido: Number(montoPagar), 
                referencia: referencia || `POS #${selectedFactura.id}`
            });
            toast.dismiss(t); toast.success("Pago registrado exitosamente");
            if (res.data.reactivado) toast.success("Servicio Reactivado en Router 🚀");
            onSuccess();
        } catch (error: any) { 
            toast.dismiss(t); 
            toast.error(error.response?.data?.detail || "Error al procesar el pago"); 
        } finally { 
            setProcesando(false); 
        }
    };

    // 4. PROMESA
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
        } catch (error: any) { 
            toast.dismiss(t); 
            toast.error(error.response?.data?.detail || "Error al crear promesa"); 
        } finally { 
            setProcesando(false); 
        }
    };

    // Cálculo visual
    const deuda = selectedFactura?.saldo_pendiente || 0;
    const ingreso = Number(montoPagar) || 0;
    const saldoAFavor = ingreso > deuda ? ingreso - deuda : 0;

    return (
        <div className="flex flex-col h-[100dvh] md:h-[85vh] bg-slate-950 text-white font-sans overflow-hidden md:rounded-3xl border border-slate-800 shadow-2xl">
            
            {/* ================================================================
                HEADER (Compartido en Móvil y Desktop)
               ================================================================ */}
            <div className="flex-none p-4 md:p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                    {selectedCliente ? (
                        <button onClick={deseleccionarCliente} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition active:scale-95">
                            <ChevronLeftIcon className="w-6 h-6"/>
                        </button>
                    ) : (
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <BanknotesIcon className="w-6 h-6 text-emerald-400" />
                        </div>
                    )}
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                        {selectedCliente ? 'Terminal POS' : 'Registrar Cobro'}
                    </h2>
                </div>
                <button onClick={onCancel} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition">
                    <XMarkIcon className="w-6 h-6"/>
                </button>
            </div>

            {/* ================================================================
                ZONA PRINCIPAL (Buscador o Formulario)
               ================================================================ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
                
                {!selectedCliente ? (
                    // VISTA 1: BUSCADOR CENTRAL
                    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 w-full max-w-2xl mx-auto mt-[-10vh]">
                        <div className="w-full text-center mb-8">
                            <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-emerald-500/5">
                                <BanknotesIcon className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">¿A quién vamos a cobrar?</h3>
                            <p className="text-slate-500">Busca por nombre o código de cliente (Cédula)</p>
                        </div>

                        {/* Buscador Predictivo */}
                        <div className="w-full relative" ref={searchRef}>
                            <div className="relative group">
                                <MagnifyingGlassIcon className={`w-6 h-6 absolute left-4 top-4 transition-colors ${busqueda ? 'text-emerald-500' : 'text-slate-500'}`} />
                                <input 
                                    autoFocus 
                                    type="text" 
                                    placeholder="Ej. Juan Perez o JP24..."
                                    className="w-full bg-[#11131a] border-2 border-slate-800 rounded-2xl pl-12 pr-12 py-4 text-lg text-white font-medium focus:border-emerald-500 focus:bg-[#151821] focus:shadow-[0_0_20px_rgba(16,185,129,0.1)] outline-none transition-all placeholder:text-slate-600"
                                    value={busqueda} 
                                    onChange={e => setBusqueda(e.target.value)}
                                />
                                {busqueda && (
                                    <button onClick={() => setBusqueda('')} className="absolute right-4 top-4 text-slate-500 hover:text-white p-1 rounded-full bg-slate-800/50">
                                        <XMarkIcon className="w-4 h-4"/>
                                    </button>
                                )}
                            </div>

                            {/* Dropdown de Resultados */}
                            {showDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d27] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                    {loadingBusqueda ? (
                                        <div className="p-6 text-center text-emerald-500 flex items-center justify-center gap-2">
                                            <ArrowPathIcon className="w-5 h-5 animate-spin"/> Buscando...
                                        </div>
                                    ) : resultadosBusqueda.length > 0 ? (
                                        <ul className="max-h-[300px] overflow-y-auto custom-scrollbar py-2">
                                            {resultadosBusqueda.map(c => (
                                                <li key={c.id}>
                                                    <button onClick={() => seleccionarCliente(c)} className="w-full text-left px-5 py-3 hover:bg-slate-800/80 transition flex items-center justify-between group border-b border-slate-800/50 last:border-0">
                                                        <div className="flex items-center gap-4 overflow-hidden">
                                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 shrink-0">
                                                                <UserIcon className="w-5 h-5" />
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="font-bold text-white text-base truncate group-hover:text-emerald-400 transition">{c.nombre}</p>
                                                                
                                                                {/* 👇 AQUÍ AGREGAMOS LA ZONA AL DISEÑO 👇 */}
                                                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-mono mt-1 text-slate-500">
                                                                    <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">#{c.id}</span>
                                                                    
                                                                    {c.cedula && (
                                                                        <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">
                                                                            SN: {c.cedula}
                                                                        </span>
                                                                    )}
                                                                    
                                                                    {/* Etiqueta de Zona */}
                                                                    <span className="bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-400 flex items-center gap-1">
                                                                        <MapPinIcon className="w-3 h-3"/> 
                                                                        {c.zona?.nombre || 'Sin Zona'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className={`shrink-0 ml-4 text-[9px] uppercase font-bold px-2 py-1 rounded-md border ${c.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                            {c.estado}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="p-6 text-center text-slate-500">No se encontraron clientes que coincidan.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // VISTA 2: FORMULARIO DE COBRO
                    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-10 w-full max-w-lg mx-auto pb-10">
                        
                        {/* Tarjeta del Cliente Seleccionado */}
                        <div className="bg-[#11131a] border border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg">
                                    {selectedCliente.nombre.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                        <IdentificationIcon className="w-3 h-3"/> {selectedCliente.cedula || 'S/N'}
                                    </p>
                                    <h3 className="font-bold text-white text-base sm:text-lg truncate leading-none">{selectedCliente.nombre}</h3>
                                </div>
                            </div>
                            <span className={`shrink-0 text-[10px] uppercase font-bold px-2 py-1 rounded-md border ${selectedCliente.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {selectedCliente.estado}
                            </span>
                        </div>

                        {loadingDeuda ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-emerald-500 space-y-4">
                                <ArrowPathIcon className="w-10 h-10 animate-spin"/>
                                <p className="font-bold text-sm">Consultando estado de cuenta...</p>
                            </div>
                        ) : (
                            <>
                                {/* Selector de Factura a Pagar */}
                                {facturasPendientes.length > 0 ? (
                                    <div className="mb-6">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 px-1">Concepto a Pagar</label>
                                        <select 
                                            className="w-full bg-[#11131a] border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none p-4 appearance-none font-medium shadow-lg"
                                            value={selectedFactura?.id || ''}
                                            onChange={(e) => {
                                                const f = facturasPendientes.find(fact => fact.id.toString() === e.target.value);
                                                setSelectedFactura(f || null);
                                            }}
                                        >
                                            {facturasPendientes.map(f => (
                                                <option key={f.id} value={f.id}>
                                                    #{f.id} - Vence: {f.fecha_vencimiento} - ${f.saldo_pendiente}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[#11131a] border-2 border-dashed border-slate-800 rounded-2xl p-8 mb-6">
                                        <CheckCircleIcon className="w-16 h-16 mx-auto mb-3 text-emerald-500/30"/>
                                        <p className="text-lg font-bold text-white mb-1">¡Todo al día!</p>
                                        <p className="text-sm text-center">Este cliente no tiene deudas pendientes en el sistema.</p>
                                    </div>
                                )}

                                {/* Formulario de Acción (Solo si hay factura) */}
                                {selectedFactura && (
                                    <div className="flex-1 flex flex-col">
                                        {/* Tabs Pagar/Promesa */}
                                        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#11131a] border border-slate-800 rounded-xl mb-6 shadow-lg">
                                            <button onClick={() => setModo('pagar')} className={`py-3 rounded-lg text-sm font-bold transition-all ${modo === 'pagar' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                                                Registrar Pago
                                            </button>
                                            <button onClick={() => setModo('promesa')} className={`py-3 rounded-lg text-sm font-bold transition-all ${modo === 'promesa' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                                                Crear Promesa
                                            </button>
                                        </div>

                                        {modo === 'pagar' ? (
                                            <form onSubmit={handleCobrar} className="flex flex-col flex-1">
                                                <div className="mb-6 bg-[#11131a] border border-slate-800 rounded-2xl p-6 text-center shadow-lg">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-4">Monto Recibido</label>
                                                    <div className="relative inline-block w-full max-w-[200px]">
                                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-emerald-500">$</span>
                                                        <input 
                                                            type="number" step="0.01" required
                                                            className="bg-transparent text-5xl sm:text-6xl font-black text-white outline-none w-full text-center pl-8 placeholder-slate-800 transition-all border-b-2 border-transparent focus:border-emerald-500 pb-1"
                                                            placeholder="0.00" value={montoPagar} onChange={e => setMontoPagar(e.target.value)}
                                                        />
                                                    </div>
                                                    {saldoAFavor > 0 && (
                                                        <div className="mt-4 text-emerald-400 text-xs font-bold bg-emerald-500/10 inline-block px-4 py-1.5 rounded-lg border border-emerald-500/20 animate-in fade-in slide-in-from-bottom-2">
                                                            Genera Saldo a Favor: +${saldoAFavor.toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mb-6">
                                                    <button type="button" onClick={() => setMetodo('efectivo')} className={`p-4 rounded-xl border flex flex-col justify-center items-center gap-2 transition-all font-bold text-sm ${metodo === 'efectivo' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-[#11131a] border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                                                        <BanknotesIcon className="w-6 h-6"/> Efectivo
                                                    </button>
                                                    <button type="button" onClick={() => setMetodo('transferencia')} className={`p-4 rounded-xl border flex flex-col justify-center items-center gap-2 transition-all font-bold text-sm ${metodo === 'transferencia' ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-[#11131a] border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                                                        <CreditCardIcon className="w-6 h-6"/> Transferencia
                                                    </button>
                                                </div>

                                                {metodo === 'transferencia' && (
                                                    <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                                                        <input type="text" placeholder="Referencia / Folio / Banco..." className="w-full bg-[#11131a] border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm shadow-lg" value={referencia} onChange={e => setReferencia(e.target.value)} />
                                                    </div>
                                                )}

                                                <div className="mt-auto pt-4">
                                                    <button type="submit" disabled={procesando} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 sm:py-5 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all disabled:opacity-50 text-base sm:text-lg flex justify-center items-center gap-2">
                                                        {procesando ? <ArrowPathIcon className="w-6 h-6 animate-spin"/> : <><CheckCircleIcon className="w-6 h-6" /> CONFIRMAR COBRO</>}
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <form onSubmit={handlePromesa} className="flex flex-col flex-1">
                                                <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl mb-6 text-center shadow-lg">
                                                    <ShieldExclamationIcon className="w-12 h-12 text-amber-500 mx-auto mb-3"/>
                                                    <p className="text-amber-200 text-sm font-medium">Esta acción dará acceso temporal a internet al cliente. El sistema cortará el servicio automáticamente si no paga en la fecha límite acordada.</p>
                                                </div>
                                                
                                                <div className="mb-8">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 px-1">Fecha Límite de Pago</label>
                                                    <input 
                                                        type="date" required 
                                                        className="w-full bg-[#11131a] border border-slate-800 rounded-xl p-4 text-white font-bold text-center text-lg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-lg" 
                                                        value={fechaPromesa} onChange={e => setFechaPromesa(e.target.value)} 
                                                    />
                                                </div>
                                                
                                                <div className="mt-auto pt-4">
                                                    <button type="submit" disabled={procesando} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 sm:py-5 rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.3)] active:scale-95 transition-all disabled:opacity-50 text-base sm:text-lg flex justify-center items-center gap-2">
                                                        {procesando ? <ArrowPathIcon className="w-6 h-6 animate-spin"/> : 'ACTIVAR SERVICIO (PROMESA)'}
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
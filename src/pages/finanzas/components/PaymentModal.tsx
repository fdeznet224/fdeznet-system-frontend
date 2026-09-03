import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import client from '../../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, BanknotesIcon, CreditCardIcon, 
    CheckCircleIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';

export interface PaymentInvoice {
    id: number;
    total: number | string;
    saldo_pendiente?: number | string;
    dias_con_servicio?: number | null;
    dias_sin_servicio?: number | null;
    ajuste_suspension?: number | string;
    cargos_adicionales_total?: number | string;
    descripcion?: string | null;
    plan_snapshot?: string | null;
    cliente?: {
        nombre?: string | null;
    } | null;
    servicio?: {
        estado?: string | null;
    } | null;
}

interface ReactivationQuote {
    descripcion: string;
    dias_con_servicio: number;
    dias_sin_servicio: number;
    ajuste_suspension: number | string;
    mensualidad_ajustada: number | string;
    cargos_adicionales: number | string;
    total: number | string;
    saldo_pendiente: number | string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    factura: PaymentInvoice | null;
    onSuccess: () => void;
}

function getErrorMessage(error: unknown) {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || "Error en la transacción";
    }
    return "Error en la transacción";
}

export default function PaymentModal({ isOpen, onClose, factura, onSuccess }: Props) {
    const [metodo, setMetodo] = useState('efectivo');
    const [referencia, setReferencia] = useState('');
    const [loading, setLoading] = useState(false);
    const [quote, setQuote] = useState<ReactivationQuote | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const idempotencyKey = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen || !factura || factura.servicio?.estado !== 'suspendido') {
            setQuote(null);
            return;
        }
        let active = true;
        setQuoteLoading(true);
        void client.post<ReactivationQuote>(`/finanzas/facturas/${factura.id}/cotizar-reactivacion`)
            .then(({ data }) => {
                if (active) setQuote(data);
            })
            .catch((error: unknown) => {
                if (active) toast.error(getErrorMessage(error));
            })
            .finally(() => {
                if (active) setQuoteLoading(false);
            });
        return () => { active = false; };
    }, [factura, isOpen]);

    const handleCobrar = async () => {
        setLoading(true);
        const toastId = toast.loading("Sincronizando con el servidor...");
        
        try {
            idempotencyKey.current ??= crypto.randomUUID();
            const res = await client.post('/finanzas/cobrar', {
                factura_id: factura.id,
                metodo_pago: metodo,
                monto_recibido: Number(quote?.saldo_pendiente ?? factura.saldo_pendiente ?? factura.total),
                referencia: referencia || `Pago Folio #${factura.id}`,
                clave_idempotencia: idempotencyKey.current,
            });
            
            toast.dismiss(toastId);
            toast.success("¡Cobro registrado!");

            if (res.data.reactivado) {
                toast("📡 INTERNET RECONECTADO", {
                    icon: '🚀',
                    duration: 6000,
                    style: { 
                        background: '#059669', 
                        color: '#fff', 
                        fontWeight: 'bold',
                        border: '1px solid #10B981'
                    },
                });
            }

            onSuccess();
            onClose();
            idempotencyKey.current = null;
            
        } catch (error: unknown) {
            toast.dismiss(toastId);
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !factura) return null;

    return (
        /* ✅ ADAPTADO: Backdrop y contenedor adaptativos */
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all">
            <div className="bg-white dark:bg-[#0f172a] rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 transition-colors">
                
                {/* Header */}
                <div className="p-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg transition-colors">
                            <BanknotesIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-black text-lg transition-colors">Confirmar Cobro</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Visualización del Monto */}
                    <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
                        <p className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest mb-1">Total a recibir</p>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white transition-colors">
                            {quoteLoading ? 'Calculando…' : `$${quote?.saldo_pendiente ?? factura.saldo_pendiente ?? factura.total}`}
                        </h2>
                        <div className="mt-3 flex flex-col items-center">
                            <p className="text-sm font-black text-slate-700 dark:text-slate-300 truncate max-w-[250px]">{factura.cliente?.nombre}</p>
                            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-black mt-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 rounded border border-blue-200 dark:border-blue-500/20 transition-colors">
                                {factura.plan_snapshot}
                            </span>
                        </div>
                    </div>

                    {quote && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs dark:border-blue-500/20 dark:bg-blue-500/10">
                            <p className="mb-3 text-blue-800 dark:text-blue-200">{quote.descripcion}</p>
                            <div className="grid grid-cols-2 gap-2">
                                <Breakdown label="Días con servicio" value={quote.dias_con_servicio} />
                                <Breakdown label="Días sin servicio" value={quote.dias_sin_servicio} />
                                <Breakdown label="Servicio ajustado" value={`$${quote.mensualidad_ajustada}`} />
                                <Breakdown label="Ajuste por corte" value={`-$${quote.ajuste_suspension}`} />
                                {Number(quote.cargos_adicionales) > 0 && (
                                    <Breakdown label="Cargos adicionales" value={`$${quote.cargos_adicionales}`} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Selector de Método */}
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setMetodo('efectivo')}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${metodo === 'efectivo' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                        >
                            <BanknotesIcon className="w-7 h-7" /> <span className="text-xs font-black uppercase tracking-widest">Efectivo</span>
                        </button>
                        <button 
                            onClick={() => setMetodo('transferencia')}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${metodo === 'transferencia' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                        >
                            <CreditCardIcon className="w-7 h-7" /> <span className="text-xs font-black uppercase tracking-widest">Transf.</span>
                        </button>
                    </div>

                    {/* Input de Referencia */}
                    {metodo !== 'efectivo' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1 mb-1 block tracking-widest">Referencia / Folio</label>
                            <input 
                                type="text" 
                                placeholder="Ej: BANAMEX 4502..."
                                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white text-sm focus:border-blue-500 outline-none transition-all"
                                value={referencia}
                                onChange={e => setReferencia(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Botón Principal */}
                    <button 
                        onClick={handleCobrar}
                        disabled={loading || quoteLoading}
                        className={`w-full py-4 rounded-2xl font-black text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-3
                            ${loading ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'}
                        `}
                    >
                        {loading ? (
                            <ArrowPathIcon className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <CheckCircleIcon className="w-6 h-6" />
                                <span className="uppercase tracking-widest">Registrar Cobro</span>
                            </>
                        )}
                    </button>
                    
                    <div className="h-4 sm:hidden"></div>
                </div>
            </div>
        </div>
    );
}

function Breakdown({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
            <p className="font-black text-slate-900 dark:text-white">{value}</p>
        </div>
    );
}

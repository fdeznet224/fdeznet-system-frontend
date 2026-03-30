import { useState } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, BanknotesIcon, CreditCardIcon, 
    CheckCircleIcon, ArrowPathIcon, ReceiptPercentIcon 
} from '@heroicons/react/24/outline';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    factura: any;
    onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, factura, onSuccess }: Props) {
    const [metodo, setMetodo] = useState('efectivo');
    const [referencia, setReferencia] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCobrar = async () => {
        setLoading(true);
        const toastId = toast.loading("Sincronizando con el servidor...");
        
        try {
            const res = await client.post('/finanzas/cobrar', {
                factura_id: factura.id,
                metodo_pago: metodo,
                monto_recibido: Number(factura.total),
                referencia: referencia || `Pago Folio #${factura.id}`
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
            
        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(error.response?.data?.detail || "Error en la transacción");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !factura) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm transition-all">
            {/* El div principal ahora se pega abajo en móviles como un "Bottom Sheet" */}
            <div className="bg-[#0f172a] rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-700 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                
                {/* Header con diseño más limpio */}
                <div className="p-5 flex justify-between items-center border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <BanknotesIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h3 className="text-white font-bold text-lg">Confirmar Cobro</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Visualización del Monto (GIGANTE) */}
                    <div className="text-center py-4 bg-slate-800/30 rounded-2xl border border-slate-800">
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Total a recibir</p>
                        <h2 className="text-4xl font-black text-white">${factura.total}</h2>
                        <div className="mt-3 flex flex-col items-center">
                            <p className="text-sm font-bold text-slate-300 truncate max-w-[250px]">{factura.cliente?.nombre}</p>
                            <span className="text-[9px] text-blue-400 font-mono mt-1 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                                {factura.plan_snapshot}
                            </span>
                        </div>
                    </div>

                    {/* Selector de Método con mejor feedback visual */}
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setMetodo('efectivo')}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${metodo === 'efectivo' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                        >
                            <BanknotesIcon className="w-7 h-7" /> <span className="text-xs font-black uppercase">Efectivo</span>
                        </button>
                        <button 
                            onClick={() => setMetodo('transferencia')}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${metodo === 'transferencia' ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                        >
                            <CreditCardIcon className="w-7 h-7" /> <span className="text-xs font-black uppercase">Transf.</span>
                        </button>
                    </div>

                    {/* Input de Referencia mejorado */}
                    {metodo !== 'efectivo' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Referencia / Folio</label>
                            <input 
                                type="text" 
                                placeholder="Ej: BANAMEX 4502..."
                                className="w-full bg-black/40 border border-slate-700 rounded-xl p-3.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                value={referencia}
                                onChange={e => setReferencia(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Botón de Acción Principal */}
                    <button 
                        onClick={handleCobrar}
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3
                            ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'}
                        `}
                    >
                        {loading ? (
                            <ArrowPathIcon className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <CheckCircleIcon className="w-6 h-6" />
                                <span>REGISTRAR COBRO</span>
                            </>
                        )}
                    </button>
                    
                    {/* Espacio extra para iPhone (Home Indicator) en móvil */}
                    <div className="h-4 sm:hidden"></div>
                </div>
            </div>
        </div>
    );
}
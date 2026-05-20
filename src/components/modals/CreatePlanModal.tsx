import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, SignalIcon, RocketLaunchIcon, PencilSquareIcon,
    BanknotesIcon, AdjustmentsHorizontalIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';
import type { Router, Plan } from '../../types';

interface Props {
    isOpen: boolean;
    plan?: Plan;
    onClose: () => void;
    onSuccess: () => void;
    routers: Router[];
}

export default function PlanModal({ isOpen, plan, onClose, onSuccess, routers }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '', precio: '', bajada_mb: '', subida_mb: '', router_id: '',
        garantia_percent: '100', prioridad: '8', 
        burst_bajada_mb: '0', burst_subida_mb: '0', burst_time: '0'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsMounted(true), 10);
            if (plan) {
                setFormData({
                    nombre: plan.nombre,
                    precio: plan.precio.toString(),
                    bajada_mb: (plan.velocidad_bajada / 1024).toString(),
                    subida_mb: (plan.velocidad_subida / 1024).toString(),
                    router_id: plan.router_id.toString(),
                    garantia_percent: plan.garantia_percent?.toString() || '100',
                    prioridad: plan.prioridad?.toString() || '8',
                    burst_bajada_mb: plan.burst_bajada ? (plan.burst_bajada / 1024).toString() : '0',
                    burst_subida_mb: plan.burst_subida ? (plan.burst_subida / 1024).toString() : '0',
                    burst_time: plan.burst_time?.toString() || '0'
                });
            } else {
                setFormData({ 
                    nombre: '', precio: '', bajada_mb: '', subida_mb: '', router_id: '',
                    garantia_percent: '100', prioridad: '8', 
                    burst_bajada_mb: '0', burst_subida_mb: '0', burst_time: '0'
                });
            }
        } else {
            setIsMounted(false);
        }
    }, [plan, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const payload = {
            nombre: formData.nombre,
            precio: parseFloat(formData.precio || '0'),
            bajada_kbps: Math.round(parseFloat(formData.bajada_mb || '0') * 1024),
            subida_kbps: Math.round(parseFloat(formData.subida_mb || '0') * 1024),
            router_id: parseInt(formData.router_id),
            garantia_percent: parseInt(formData.garantia_percent),
            prioridad: parseInt(formData.prioridad),
            burst_bajada: Math.round(parseFloat(formData.burst_bajada_mb || '0') * 1024),
            burst_subida: Math.round(parseFloat(formData.burst_subida_mb || '0') * 1024),
            burst_time: parseInt(formData.burst_time)
        };

        try {
            const loadingToast = toast.loading("Sincronizando con MikroTik...");
            if (plan) await client.put(`/planes/${plan.id}`, payload);
            else await client.post('/planes/', payload);
            toast.success(plan ? "Actualizado" : "Sincronizado", { id: loadingToast });
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error en la operación");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        /* ✅ ADAPTADO: Backdrop y contenedor adaptativos */
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-colors">
            <div 
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`} 
                onClick={onClose} 
            />

            <div className={`relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl transition-all duration-300 transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 sm:translate-y-4'} rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95vh] border border-slate-200 dark:border-slate-800`}>
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0b0e14] rounded-t-3xl sm:rounded-t-3xl transition-colors">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            {plan ? <PencilSquareIcon className="w-5 h-5 text-orange-500"/> : <SignalIcon className="w-5 h-5 text-blue-500"/>}
                            {plan ? 'Editar Perfil' : 'Nuevo Perfil QoS'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nombre del Perfil</label>
                            <input type="text" className="w-full bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 transition-colors" 
                                placeholder="Ej: Fibra 50MB Residencial" required value={formData.nombre} 
                                onChange={e => setFormData({...formData, nombre: e.target.value})}/>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Precio (MXN)</label>
                            <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-emerald-600 dark:text-emerald-400 font-black text-lg outline-none focus:border-emerald-500 transition-colors" 
                                placeholder="0.00" required value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})}/>
                        </div>

                        {!plan && (
                            <div>
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Router Destino</label>
                                <select className="w-full bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 transition-colors"
                                    value={formData.router_id} onChange={(e) => setFormData({...formData, router_id: e.target.value})} required>
                                    <option value="">Seleccionar...</option>
                                    {routers.map(r => <option key={r.id} value={r.id}>{r.nombre.toUpperCase()}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                        <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AdjustmentsHorizontalIcon className="w-4 h-4"/> Parámetros de Red
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Bajada (MB)" value={formData.bajada_mb} onChange={(v: string) => setFormData({...formData, bajada_mb: v})} />
                            <InputGroup label="Subida (MB)" value={formData.subida_mb} onChange={(v: string) => setFormData({...formData, subida_mb: v})} />
                        </div>
                    </div>

                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-500/20 transition-colors">
                        <div className="text-[10px] text-orange-600 dark:text-orange-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <RocketLaunchIcon className="w-4 h-4"/> Ráfagas (Burst)
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <InputSimple label="B. Bajada" val={formData.burst_bajada_mb} set={(v: string) => setFormData({...formData, burst_bajada_mb: v})} />
                            <InputSimple label="B. Subida" val={formData.burst_subida_mb} set={(v: string) => setFormData({...formData, burst_subida_mb: v})} />
                            <InputSimple label="Tiempo" val={formData.burst_time} set={(v: string) => setFormData({...formData, burst_time: v})} />
                        </div>
                    </div>

                    <button type="submit" className={`w-full py-4 rounded-2xl text-white font-black shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest text-sm ${plan ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}>
                        {isSubmitting ? 'Sincronizando...' : (plan ? 'Actualizar MikroTik' : 'Crear Perfil')}
                    </button>
                </form>
            </div>
        </div>
    );
}

const InputGroup = ({ label, value, onChange }: any) => (
    <div>
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{label}</label>
        <input type="number" step="any" className="w-full bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-black text-lg outline-none focus:border-blue-500 transition-colors" 
            required value={value} onChange={e => onChange(e.target.value)}/>
    </div>
);

const InputSimple = ({ label, val, set }: any) => (
    <div>
        <label className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase font-black">{label}</label>
        <input type="number" className="w-full bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white text-center font-black text-sm outline-none transition-colors" 
            value={val} onChange={e => set(e.target.value)}/>
    </div>
);
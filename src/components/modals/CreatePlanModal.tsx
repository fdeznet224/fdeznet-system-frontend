import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { XMarkIcon, SignalIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
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
            const loadingToast = toast.loading(plan ? "Actualizando..." : "Sincronizando...");
            if (plan) await client.put(`/planes/${plan.id}`, payload);
            else await client.post('/planes/', payload);
            toast.success(plan ? "Actualizado" : "Sincronizado", { id: loadingToast });
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error en la operación");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            {/* Overlay */}
            <div 
                className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`} 
                onClick={onClose} 
            />

            {/* Modal / Bottom Sheet */}
            <div 
                className={`relative w-full max-w-2xl bg-slate-800 shadow-2xl transition-all duration-300 ease-out transform 
                ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 md:translate-y-4 md:scale-95'}
                rounded-t-[2.5rem] md:rounded-2xl flex flex-col max-h-[95vh] md:max-h-[90vh]`}
            >
                {/* Tirador para Móvil */}
                <div className="md:hidden w-full flex justify-center py-4">
                    <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-6 pt-2 md:pt-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/30 rounded-t-[2.5rem] md:rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${plan ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                            <SignalIcon className={`w-6 h-6 ${plan ? 'text-orange-500' : 'text-blue-500'}`}/> 
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
                                {plan ? 'Editar Perfil' : 'Nuevo Perfil'}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">MikroTik QoS Engine</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>

                {/* Formulario con Scroll */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-10">
                    
                    {/* SECCIÓN 1: DATOS BÁSICOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="col-span-1 md:col-span-2 text-slate-300 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-[-10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Información Comercial
                        </div>
                        
                        <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] text-slate-500 mb-1.5 block uppercase font-black tracking-wider">Nombre del Perfil</label>
                            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white focus:border-blue-500 outline-none transition-all font-bold" 
                                placeholder="Ej: Fibra 50MB Residencial" required
                                value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}/>
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-500 mb-1.5 block uppercase font-black tracking-wider">Precio Mensual (MXN)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black">$</span>
                                <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 pl-8 text-emerald-400 font-black text-xl outline-none" 
                                    placeholder="0.00" required value={formData.precio} 
                                    onChange={e => setFormData({...formData, precio: e.target.value})}/>
                            </div>
                        </div>

                        {!plan && (
                            <div>
                                <label className="text-[10px] text-slate-500 mb-1.5 block uppercase font-black tracking-wider">Router Destino</label>
                                <select 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white focus:border-blue-500 outline-none font-bold appearance-none cursor-pointer"
                                    value={formData.router_id}
                                    onChange={(e) => setFormData({...formData, router_id: e.target.value})}
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {routers.map(r => (
                                        <option key={r.id} value={r.id}>{r.nombre.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-700/50 my-4" />

                    {/* SECCIÓN 2: VELOCIDAD Y QOS */}
                    <div className="space-y-5">
                        <div className="text-slate-300 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Parámetros de Red
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 grid grid-cols-2 gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                                <div className="col-span-2 text-[10px] text-blue-400 font-black uppercase tracking-tighter text-center mb-1">Max Limit (MB)</div>
                                <div>
                                    <label className="text-[9px] text-slate-500 block uppercase font-bold mb-1">Bajada</label>
                                    <input type="number" step="any" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-center font-black text-lg"
                                        required value={formData.bajada_mb} onChange={e => setFormData({...formData, bajada_mb: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[9px] text-slate-500 block uppercase font-bold mb-1">Subida</label>
                                    <input type="number" step="any" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-center font-black text-lg"
                                        required value={formData.subida_mb} onChange={e => setFormData({...formData, subida_mb: e.target.value})}/>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 mb-1.5 block uppercase font-black">Garantía %</label>
                                <div className="relative">
                                    <input type="number" min="1" max="100" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white text-center font-bold outline-none" 
                                        value={formData.garantia_percent} onChange={e => setFormData({...formData, garantia_percent: e.target.value})}/>
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 mb-1.5 block uppercase font-black">Prioridad</label>
                                <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white text-center font-bold outline-none cursor-pointer"
                                    value={formData.prioridad} onChange={e => setFormData({...formData, prioridad: e.target.value})}>
                                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n===1 && '(Alta)'} {n===8 && '(Baja)'}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Burst Section */}
                        <div className="p-4 bg-orange-500/5 rounded-2xl border border-dashed border-orange-500/20">
                            <div className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-4 text-center">Ráfagas Temporales (Burst Mode)</div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] text-slate-500 block uppercase font-bold mb-1">Bajada MB</label>
                                    <input type="number" step="any" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-center font-mono text-sm font-bold"
                                        value={formData.burst_bajada_mb} onChange={e => setFormData({...formData, burst_bajada_mb: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[9px] text-slate-500 block uppercase font-bold mb-1">Subida MB</label>
                                    <input type="number" step="any" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-center font-mono text-sm font-bold"
                                        value={formData.burst_subida_mb} onChange={e => setFormData({...formData, burst_subida_mb: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[9px] text-slate-500 block uppercase font-bold mb-1">Tiempo (S)</label>
                                    <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-center font-mono text-sm font-bold"
                                        value={formData.burst_time} onChange={e => setFormData({...formData, burst_time: e.target.value})}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className={`w-full py-4 rounded-2xl text-white font-black shadow-xl transition-all active:scale-[0.98] uppercase text-sm tracking-widest mt-4 ${plan ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}>
                        {plan ? 'Actualizar MikroTik' : 'Crear y Sincronizar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
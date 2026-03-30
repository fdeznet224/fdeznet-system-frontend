import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { XMarkIcon, SignalIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import type { Router, Plan } from '../../types';

interface Props {
    isOpen: boolean;
    plan?: Plan; // Si viene, estamos editando
    onClose: () => void;
    onSuccess: () => void;
    routers: Router[];
}

export default function PlanModal({ isOpen, plan, onClose, onSuccess, routers }: Props) {
    const [formData, setFormData] = useState({
        nombre: '',
        precio: '',
        bajada_mb: '',
        subida_mb: '',
        router_id: '',
        // --- NUEVOS CAMPOS ---
        garantia_percent: '100',
        prioridad: '8',
        burst_bajada_mb: '0',
        burst_subida_mb: '0',
        burst_time: '0'
    });

    // Cargar datos si es edición
    useEffect(() => {
        if (plan) {
            setFormData({
                nombre: plan.nombre,
                precio: plan.precio.toString(),
                bajada_mb: (plan.velocidad_bajada / 1024).toString(), // Backend manda velocidad_bajada (Kbps)
                subida_mb: (plan.velocidad_subida / 1024).toString(), // Backend manda velocidad_subida (Kbps)
                router_id: plan.router_id.toString(),
                
                // Mapeo de nuevos campos (si existen en el objeto plan, sino defaults)
                garantia_percent: plan.garantia_percent?.toString() || '100',
                prioridad: plan.prioridad?.toString() || '8',
                burst_bajada_mb: plan.burst_bajada ? (plan.burst_bajada / 1024).toString() : '0',
                burst_subida_mb: plan.burst_subida ? (plan.burst_subida / 1024).toString() : '0',
                burst_time: plan.burst_time?.toString() || '0'
            });
        } else {
            // Reset completo para crear nuevo
            setFormData({ 
                nombre: '', precio: '', bajada_mb: '', subida_mb: '', router_id: '',
                garantia_percent: '100', prioridad: '8', 
                burst_bajada_mb: '0', burst_subida_mb: '0', burst_time: '0'
            });
        }
    }, [plan, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Convertimos MB a Kbps para el backend
        const payload = {
            nombre: formData.nombre,
            precio: parseFloat(formData.precio || '0'),
            bajada_kbps: Math.round(parseFloat(formData.bajada_mb || '0') * 1024),
            subida_kbps: Math.round(parseFloat(formData.subida_mb || '0') * 1024),
            router_id: parseInt(formData.router_id),
            
            // Nuevos Campos
            garantia_percent: parseInt(formData.garantia_percent),
            prioridad: parseInt(formData.prioridad),
            burst_bajada: Math.round(parseFloat(formData.burst_bajada_mb || '0') * 1024),
            burst_subida: Math.round(parseFloat(formData.burst_subida_mb || '0') * 1024),
            burst_time: parseInt(formData.burst_time)
        };

        try {
            const loadingToast = toast.loading(plan ? "Actualizando..." : "Sincronizando...");
            
            if (plan) {
                await client.put(`/planes/${plan.id}`, payload);
                toast.success("Plan actualizado con éxito", { id: loadingToast });
            } else {
                await client.post('/planes/', payload);
                toast.success("Plan creado y sincronizado", { id: loadingToast });
            }
            
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error en la operación");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl my-auto">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center text-white bg-slate-900/50 rounded-t-2xl">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <SignalIcon className={`w-6 h-6 ${plan ? 'text-orange-500' : 'text-blue-500'}`}/> 
                        {plan ? 'Editar Perfil Mikrotik' : 'Nuevo Perfil Mikrotik'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6"/></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* SECCIÓN 1: DATOS BÁSICOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] text-slate-500 mb-1 block uppercase font-black tracking-tighter">Nombre del Plan (Perfil)</label>
                            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                                placeholder="Ej: Fibra 50MB Residencial" required
                                value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}/>
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-500 mb-1 block uppercase font-black">Costo Mensual (MXN)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-7 text-emerald-400 font-bold text-lg outline-none" 
                                    placeholder="0.00" required value={formData.precio} 
                                    onChange={e => setFormData({...formData, precio: e.target.value})}/>
                            </div>
                        </div>

                        {!plan && (
                            <div>
                                <label className="text-[10px] text-slate-500 mb-1 block uppercase font-black">Router Destino</label>
                                <select 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                    value={formData.router_id}
                                    onChange={e => setFormData({...formData, router_id: e.target.value})}
                                    required
                                >
                                    <option value="">Seleccionar equipo...</option>
                                    {routers.map(r => (
                                        <option key={r.id} value={r.id}>{r.nombre} ({r.ip_vpn})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-700 my-4"></div>

                    {/* SECCIÓN 2: VELOCIDAD Y QOS */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-slate-300">
                            <AdjustmentsHorizontalIcon className="w-5 h-5" />
                            <h4 className="text-sm font-bold uppercase tracking-wider">Configuración Técnica</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Velocidad Normal */}
                            <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                                <div className="col-span-2 text-xs text-blue-400 font-bold uppercase text-center mb-1">Velocidad Máxima (Max Limit)</div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block uppercase">Bajada (MB)</label>
                                    <input type="number" step="any" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-center font-mono"
                                        required value={formData.bajada_mb} onChange={e => setFormData({...formData, bajada_mb: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block uppercase">Subida (MB)</label>
                                    <input type="number" step="any" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-center font-mono"
                                        required value={formData.subida_mb} onChange={e => setFormData({...formData, subida_mb: e.target.value})}/>
                                </div>
                            </div>

                            {/* QoS: Garantía y Prioridad */}
                            <div>
                                <label className="text-[10px] text-slate-500 mb-1 block uppercase font-black">Garantía (Limit-At)</label>
                                <div className="relative">
                                    <input type="number" min="1" max="100" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-center outline-none focus:border-purple-500" 
                                        value={formData.garantia_percent} onChange={e => setFormData({...formData, garantia_percent: e.target.value})}/>
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 mb-1 block uppercase font-black">Prioridad</label>
                                <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-center outline-none focus:border-purple-500"
                                    value={formData.prioridad} onChange={e => setFormData({...formData, prioridad: e.target.value})}>
                                    <option value="1">1 - Alta (Gamer)</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                    <option value="6">6</option>
                                    <option value="7">7</option>
                                    <option value="8">8 - Normal</option>
                                </select>
                            </div>
                        </div>

                        {/* Ráfagas (Burst) - Opcional */}
                        <div className="mt-4 p-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                            <div className="text-xs text-orange-400 font-bold uppercase mb-3 text-center">Ráfagas Temporales (Burst) - (0 = Desactivado)</div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 block uppercase">Burst Bajada (MB)</label>
                                    <input type="number" step="any" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-center font-mono text-sm"
                                        value={formData.burst_bajada_mb} onChange={e => setFormData({...formData, burst_bajada_mb: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block uppercase">Burst Subida (MB)</label>
                                    <input type="number" step="any" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-center font-mono text-sm"
                                        value={formData.burst_subida_mb} onChange={e => setFormData({...formData, burst_subida_mb: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block uppercase">Duración (Seg)</label>
                                    <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-center font-mono text-sm"
                                        placeholder="ej: 16"
                                        value={formData.burst_time} onChange={e => setFormData({...formData, burst_time: e.target.value})}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest mt-2 ${plan ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                        {plan ? 'Actualizar Perfil en Router' : 'Crear y Sincronizar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
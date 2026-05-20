import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, ServerIcon, GlobeAltIcon, 
    SignalIcon, PencilSquareIcon 
} from '@heroicons/react/24/outline';
import type { Router } from '../../types';

interface RedIP {
    id: number;
    router_id: number;
    nombre: string;
    cidr: string;
    gateway: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    routers: Router[];
    redToEdit?: RedIP;
}

export default function CreateRedModal({ isOpen, onClose, onSuccess, routers, redToEdit }: Props) {
    const [formData, setFormData] = useState({
        nombre: '', cidr: '', gateway: '', router_id: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (redToEdit) {
                setFormData({
                    nombre: redToEdit.nombre,
                    cidr: redToEdit.cidr,
                    gateway: redToEdit.gateway,
                    router_id: redToEdit.router_id.toString()
                });
            } else {
                setFormData({ nombre: '', cidr: '', gateway: '', router_id: '' });
            }
        }
    }, [isOpen, redToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        
        setIsSubmitting(true);
        const loadingToast = toast.loading(redToEdit ? "Actualizando red..." : "Registrando red...");

        try {
            const payload = { ...formData, router_id: Number(formData.router_id) };
            if (redToEdit) {
                await client.put(`/network/redes/${redToEdit.id}`, payload);
                toast.success("Red actualizada", { id: loadingToast });
            } else {
                await client.post('/network/redes/', payload);
                toast.success("Red registrada", { id: loadingToast });
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.detail || "Error al procesar");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        /* ✅ ADAPTADO: Backdrop adaptativo */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-colors">
            {/* ✅ ADAPTADO: Contenedor adaptativo */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden transition-colors duration-300">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 transition-colors">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                            {redToEdit ? <PencilSquareIcon className="w-6 h-6 text-blue-600 dark:text-blue-500" /> : <GlobeAltIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />}
                            {redToEdit ? 'Editar Red IP' : 'Nueva Red IP'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* Router Select */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                            <ServerIcon className="w-3.5 h-3.5" /> Router Asignado
                        </label>
                        <select 
                            className="w-full bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                            required
                            value={formData.router_id}
                            onChange={e => setFormData({...formData, router_id: e.target.value})}
                        >
                            <option value="">Selecciona un Router...</option>
                            {routers.map(r => <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900">{r.nombre} ({r.ip_vpn})</option>)}
                        </select>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre Identificador</label>
                        <input type="text" 
                            className="w-full bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-colors" 
                            placeholder="Ej: Pool Clientes Norte" required
                            value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                        />
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 gap-5 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-colors">
                        <div className="col-span-2 flex items-center gap-2 mb-1">
                            <SignalIcon className={`w-4 h-4 ${redToEdit ? 'text-blue-500' : 'text-emerald-500'}`} />
                            <span className={`text-[10px] font-black uppercase ${redToEdit ? 'text-blue-500' : 'text-emerald-500'}`}>Configuración de Red</span>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 block">Segmento (CIDR)</label>
                            <input type="text" 
                                className="w-full bg-white dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono text-sm focus:border-emerald-500 outline-none transition-colors" 
                                placeholder="10.0.0.0/24" required
                                value={formData.cidr} onChange={e => setFormData({...formData, cidr: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 block">Gateway</label>
                            <input type="text" 
                                className="w-full bg-white dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono text-sm focus:border-emerald-500 outline-none transition-colors" 
                                placeholder="10.0.0.1" required
                                value={formData.gateway} onChange={e => setFormData({...formData, gateway: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-slate-800 transition-colors">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-500 hover:text-slate-900 dark:hover:text-white font-black text-sm transition-colors">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className={`flex-1 font-black py-3 rounded-xl transition-all active:scale-95 text-sm ${redToEdit ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                            {isSubmitting ? 'Procesando...' : (redToEdit ? 'Guardar Cambios' : 'Crear Red')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
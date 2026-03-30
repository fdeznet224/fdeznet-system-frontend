import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { XMarkIcon, GlobeAltIcon, ServerIcon, SignalIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import type { Router } from '../../types';

// Definimos la interfaz aquí o la importas si la tienes global
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
    redToEdit?: RedIP; // 👈 NUEVA PROP OPCIONAL
}

export default function CreateRedModal({ isOpen, onClose, onSuccess, routers, redToEdit }: Props) {
    const [formData, setFormData] = useState({
        nombre: '',
        cidr: '',    
        gateway: '', 
        router_id: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // EFECTO: Rellenar formulario si es Edición, o limpiar si es Nuevo
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
        // Texto dinámico para el loading
        const loadingToast = toast.loading(redToEdit ? "Actualizando red..." : "Calculando y registrando red...");

        try {
            const payload = {
                ...formData,
                router_id: Number(formData.router_id)
            };

            if (redToEdit) {
                // === MODO EDICIÓN (PUT) ===
                await client.put(`/network/redes/${redToEdit.id}`, payload);
                toast.success("Red actualizada correctamente");
            } else {
                // === MODO CREACIÓN (POST) ===
                await client.post('/network/redes/', payload);
                toast.success("Red registrada correctamente");
            }
            
            toast.dismiss(loadingToast);
            onSuccess();
            onClose();
            
        } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.detail || "Error al procesar la solicitud");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl overflow-hidden transform transition-all">
                
                {/* Header Dinámico */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            {redToEdit ? (
                                <><PencilSquareIcon className="w-6 h-6 text-blue-500" /> Editar Red IP</>
                            ) : (
                                <><GlobeAltIcon className="w-6 h-6 text-emerald-500" /> Nueva Red IP</>
                            )}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {redToEdit ? 'Modifica los parámetros del segmento' : 'Define un rango CIDR para asignación automática'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded-full transition">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* Selección de Router */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-2">
                            <ServerIcon className="w-3.5 h-3.5" /> Router Asignado
                        </label>
                        <div className="relative">
                            <select 
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-emerald-500 appearance-none transition"
                                required
                                value={formData.router_id}
                                onChange={e => setFormData({...formData, router_id: e.target.value})}
                            >
                                <option value="">Selecciona un Router...</option>
                                {routers.map(r => (
                                    <option key={r.id} value={r.id}>{r.nombre} ({r.ip_vpn})</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Nombre de la Red */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Nombre Identificador</label>
                        <input type="text" 
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white placeholder:text-slate-600 focus:border-emerald-500 outline-none transition" 
                            placeholder="Ej: Pool Clientes Norte" required
                            value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                        />
                    </div>

                    {/* Grid CIDR y Gateway */}
                    <div className="grid grid-cols-2 gap-5 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="col-span-2 flex items-center gap-2 mb-1">
                            <SignalIcon className={`w-4 h-4 ${redToEdit ? 'text-blue-400' : 'text-emerald-400'}`} />
                            <span className={`text-xs font-bold uppercase ${redToEdit ? 'text-blue-400' : 'text-emerald-400'}`}>Configuración de Red</span>
                        </div>
                        
                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Segmento (CIDR)</label>
                            <input type="text" 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white font-mono text-sm focus:border-emerald-500 outline-none transition" 
                                placeholder="192.168.10.0/24" required
                                value={formData.cidr} onChange={e => setFormData({...formData, cidr: e.target.value})}
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Ej: 10.0.0.0/24</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Gateway (Puerta)</label>
                            <input type="text" 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white font-mono text-sm focus:border-emerald-500 outline-none transition" 
                                placeholder="192.168.10.1" required
                                value={formData.gateway} onChange={e => setFormData({...formData, gateway: e.target.value})}
                            />
                            <p className="text-[10px] text-slate-500 mt-1">IP del Router</p>
                        </div>
                    </div>

                    {/* Footer con Botón Dinámico */}
                    <div className="pt-4 flex gap-3 border-t border-slate-800">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`
                                flex-1 font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 text-sm
                                ${redToEdit 
                                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 text-white' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 text-white'}
                                ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
                            `}
                        >
                            {isSubmitting ? 'Guardando...' : (redToEdit ? 'Guardar Cambios' : 'Crear Red')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
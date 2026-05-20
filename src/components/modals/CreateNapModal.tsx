import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, CubeIcon, MapPinIcon, MapIcon, 
    PencilSquareIcon 
} from '@heroicons/react/24/outline';

interface Zona { id: number; nombre: string; }

interface NapToEdit {
    id: number;
    nombre: string;
    ubicacion: string;
    capacidad: number;
    zona_id: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    routers: any[];
    zonas: Zona[];
    napToEdit?: NapToEdit;
}

export default function CreateNapModal({ isOpen, onClose, onSuccess, zonas, napToEdit }: Props) {
    const [formData, setFormData] = useState({
        nombre: '', ubicacion: '', capacidad: '16', zona_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (napToEdit) {
                setFormData({
                    nombre: napToEdit.nombre,
                    ubicacion: napToEdit.ubicacion,
                    capacidad: napToEdit.capacidad.toString(),
                    zona_id: napToEdit.zona_id.toString()
                });
            } else {
                setFormData({ nombre: '', ubicacion: '', capacidad: '16', zona_id: '' });
            }
        }
    }, [isOpen, napToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const loadingToast = toast.loading(napToEdit ? "Actualizando..." : "Creando NAP...");

        try {
            const payload = {
                ...formData,
                capacidad: Number(formData.capacidad),
                zona_id: Number(formData.zona_id)
            };

            if (napToEdit) {
                await client.put(`/infraestructura/naps/${napToEdit.id}`, payload);
                toast.success("Caja NAP actualizada", { id: loadingToast });
            } else {
                await client.post('/infraestructura/naps', payload);
                toast.success("Caja NAP creada", { id: loadingToast });
            }
            
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.detail || "Error al guardar");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        /* ✅ ADAPTADO: Backdrop y contenedor adaptativos */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-colors duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 transition-colors">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                        {napToEdit ? <PencilSquareIcon className="w-6 h-6 text-blue-600 dark:text-blue-500" /> : <CubeIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />}
                        {napToEdit ? 'Editar Caja NAP' : 'Nueva Caja NAP'}
                    </h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Zona */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                            <MapIcon className="w-3 h-3"/> Zona / Colonia
                        </label>
                        <select 
                            className="w-full bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                            required
                            value={formData.zona_id}
                            onChange={e => setFormData({...formData, zona_id: e.target.value})}
                        >
                            <option value="">Selecciona Zona...</option>
                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                        </select>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 block">Identificador de Caja</label>
                        <input type="text" className="w-full bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors" 
                            placeholder="Ej: NAP-05-VicenteG" required
                            value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                        />
                    </div>

                    {/* Ubicación */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                            <MapPinIcon className="w-3 h-3"/> Referencia Física
                        </label>
                        <input type="text" className="w-full bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors" 
                            placeholder="Ej: Poste #45, Esq. con Tienda" required
                            value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})}
                        />
                    </div>

                    {/* Capacidad */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 block">Puertos Totales (Splitter)</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['8', '16'].map((cap) => (
                                <button key={cap} type="button" 
                                    onClick={() => setFormData({...formData, capacidad: cap})}
                                    className={`p-3 rounded-xl border-2 font-black text-sm transition-all ${
                                        formData.capacidad === cap 
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                                        : 'bg-slate-50 dark:bg-[#0b0c10] border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-500'
                                    }`}
                                >
                                    {cap} Puertos
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className={`w-full font-black py-4 rounded-xl transition-all active:scale-95 shadow-md uppercase tracking-widest text-sm ${
                            napToEdit 
                            ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                    >
                        {isSubmitting ? 'Guardando...' : (napToEdit ? 'Guardar Cambios' : 'Registrar NAP')}
                    </button>
                </form>
            </div>
        </div>
    );
}
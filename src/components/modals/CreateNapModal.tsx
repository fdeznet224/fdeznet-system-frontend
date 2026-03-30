import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, CubeIcon, MapPinIcon, MapIcon, 
    PencilSquareIcon 
} from '@heroicons/react/24/outline';

interface Zona { id: number; nombre: string; }

// Interfaz para la edición
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
    zonas: Zona[];
    napToEdit?: NapToEdit; // 👈 Nueva prop para editar
}

export default function CreateNapModal({ isOpen, onClose, onSuccess, zonas, napToEdit }: Props) {
    const [formData, setFormData] = useState({
        nombre: '',
        ubicacion: '',
        capacidad: '16',
        zona_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Efecto para detectar si es Edición o Creación
    useEffect(() => {
        if (isOpen) {
            if (napToEdit) {
                // Modo Edición: Rellenar datos
                setFormData({
                    nombre: napToEdit.nombre,
                    ubicacion: napToEdit.ubicacion,
                    capacidad: napToEdit.capacidad.toString(),
                    zona_id: napToEdit.zona_id.toString()
                });
            } else {
                // Modo Creación: Limpiar
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
                // PUT (Editar)
                await client.put(`/infraestructura/naps/${napToEdit.id}`, payload);
                toast.success("Caja NAP actualizada");
            } else {
                // POST (Crear)
                await client.post('/infraestructura/naps', payload);
                toast.success("Caja NAP creada");
            }
            
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al guardar");
        } finally {
            toast.dismiss(loadingToast);
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
                
                {/* Header Dinámico */}
                <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {napToEdit ? (
                            <><PencilSquareIcon className="w-6 h-6 text-blue-500" /> Editar Caja NAP</>
                        ) : (
                            <><CubeIcon className="w-6 h-6 text-emerald-500" /> Nueva Caja NAP</>
                        )}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition">
                        <XMarkIcon className="w-6 h-6 text-slate-400 hover:text-white"/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Zona */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <MapIcon className="w-3 h-3"/> Zona / Colonia
                        </label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-emerald-500 transition"
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Identificador de Caja</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-emerald-500 placeholder:text-slate-700 transition" 
                            placeholder="Ej: NAP-05-VicenteG" required
                            value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                        />
                    </div>

                    {/* Ubicación */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <MapPinIcon className="w-3 h-3"/> Referencia Física
                        </label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-emerald-500 placeholder:text-slate-700 transition" 
                            placeholder="Ej: Poste #45, Esq. con Tienda" required
                            value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})}
                        />
                    </div>

                    {/* Capacidad */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Puertos Totales (Splitter)</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" 
                                onClick={() => setFormData({...formData, capacidad: '8'})}
                                className={`p-3 rounded-xl border font-bold text-sm transition ${formData.capacidad === '8' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                            >
                                8 Puertos
                            </button>
                            <button type="button" 
                                onClick={() => setFormData({...formData, capacidad: '16'})}
                                className={`p-3 rounded-xl border font-bold text-sm transition ${formData.capacidad === '16' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                            >
                                16 Puertos
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className={`w-full font-bold py-3.5 rounded-xl transition shadow-lg active:scale-95 flex items-center justify-center gap-2
                                ${napToEdit 
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'}
                            `}
                        >
                            {isSubmitting ? 'Guardando...' : (napToEdit ? 'Guardar Cambios' : 'Registrar NAP')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
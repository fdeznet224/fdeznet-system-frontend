import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    MapPinIcon, PlusIcon, ArrowLeftIcon, 
    PencilSquareIcon, TrashIcon, XMarkIcon 
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function Zonas() {
    const navigate = useNavigate();
    const [zonas, setZonas] = useState<any[]>([]);
    
    // Estados del formulario
    const [nombre, setNombre] = useState('');
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [procesando, setProcesando] = useState(false);

    const fetchZonas = async () => {
        try {
            const res = await client.get('/zonas/');
            setZonas(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar las zonas");
        }
    };

    useEffect(() => { fetchZonas(); }, []);

    // ================= FUNCIONES DE GUARDAR / EDITAR / ELIMINAR =================

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return toast.error("El nombre es requerido");
        
        setProcesando(true);
        const load = toast.loading(editandoId ? "Actualizando zona..." : "Creando zona...");
        
        try {
            if (editandoId) {
                // Petición PUT para Editar
                await client.put(`/zonas/${editandoId}`, { nombre });
                toast.success("Zona actualizada correctamente", { id: load });
            } else {
                // Petición POST para Crear
                await client.post('/zonas/', { nombre });
                toast.success("Zona creada correctamente", { id: load });
            }
            
            // Limpiar formulario y recargar
            setNombre('');
            setEditandoId(null);
            fetchZonas();
        } catch (error: any) { 
            toast.error(error.response?.data?.detail || "Error al procesar la solicitud", { id: load }); 
        } finally {
            setProcesando(false);
        }
    };

    const iniciarEdicion = (zona: any) => {
        setNombre(zona.nombre);
        setEditandoId(zona.id);
    };

    const cancelarEdicion = () => {
        setNombre('');
        setEditandoId(null);
    };

    const handleEliminar = async (id: number, nombreZona: string) => {
        if (!confirm(`¿Estás seguro de eliminar la zona "${nombreZona}"?\n\nEsta acción fallará si hay clientes asignados a ella.`)) return;
        
        const load = toast.loading("Eliminando zona...");
        try {
            await client.delete(`/zonas/${id}`);
            toast.success("Zona eliminada con éxito", { id: load });
            fetchZonas();
        } catch (error: any) {
            // El backend lanza error 400 si hay clientes asignados
            toast.error(error.response?.data?.detail || "No se puede eliminar la zona", { id: load });
        }
    };

    // ============================================================================

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 p-4 transition-colors duration-300">
            
            {/* Header con Botón Volver */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => navigate('/admin/configuracion')} 
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white transition-colors">Gestión de Zonas</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Organiza tu cobertura por sectores geográficos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* COLUMNA 1: Formulario */}
                <div className="md:col-span-1 h-fit relative">
                    <div className={`p-6 rounded-[1.5rem] border shadow-sm transition-all duration-300 ${editandoId ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/20' : 'bg-white dark:bg-[#12141a] border-slate-200 dark:border-slate-800/80'}`}>
                        
                        <div className="flex justify-between items-start mb-5">
                            <h3 className={`text-lg font-black flex items-center gap-2 ${editandoId ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>
                                {editandoId ? <PencilSquareIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5 text-blue-600 dark:text-blue-500"/>}
                                {editandoId ? 'Editar Zona' : 'Nueva Zona'}
                            </h3>
                            
                            {editandoId && (
                                <button onClick={cancelarEdicion} className="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleGuardar} className="space-y-5">
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black ml-1 uppercase tracking-wider">Nombre de la Zona</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Zona Norte" 
                                    required 
                                    className={`w-full bg-white dark:bg-slate-950 border rounded-xl p-3.5 text-slate-900 dark:text-white text-sm outline-none transition-all focus:ring-2 shadow-sm ${editandoId ? 'border-indigo-300 dark:border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'}`}
                                    value={nombre} 
                                    onChange={e => setNombre(e.target.value)} 
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={procesando || !nombre.trim()}
                                className={`w-full font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 ${editandoId ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
                            >
                                {procesando ? 'Guardando...' : (editandoId ? 'Actualizar Cambios' : 'Crear Zona')}
                            </button>
                        </form>
                    </div>
                </div>

                {/* COLUMNA 2: Lista de Zonas */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-max">
                    {zonas.map(z => (
                        <div key={z.id} className={`p-4 rounded-[1.25rem] border flex justify-between items-center group transition-all duration-300 shadow-sm ${editandoId === z.id ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white dark:bg-[#12141a] border-slate-200 dark:border-slate-800/80 hover:border-blue-300 dark:hover:border-blue-700'}`}>
                            
                            {/* Info de la zona */}
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${editandoId === z.id ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20'}`}>
                                    <MapPinIcon className="w-5 h-5" />
                                </div>
                                <div className="overflow-hidden pr-2">
                                    <p className="font-black text-slate-800 dark:text-white text-base truncate transition-colors">{z.nombre}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {z.id}</p>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex items-center gap-1.5 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => iniciarEdicion(z)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors active:scale-90"
                                    title="Editar Zona"
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleEliminar(z.id, z.nombre)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors active:scale-90"
                                    title="Eliminar Zona"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>

                        </div>
                    ))}
                    
                    {zonas.length === 0 && (
                        <div className="col-span-1 sm:col-span-2 text-center p-12 bg-white dark:bg-[#12141a] border border-dashed border-slate-300 dark:border-slate-800 rounded-[1.5rem]">
                            <MapPinIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">No hay zonas registradas aún.</p>
                            <p className="text-[11px] text-slate-400 mt-1">Usa el formulario para crear tu primera zona de cobertura.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
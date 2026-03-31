import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { MapPinIcon, PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function Zonas() {
    const navigate = useNavigate();
    const [zonas, setZonas] = useState<any[]>([]);
    const [nombre, setNombre] = useState('');

    const fetchZonas = async () => {
        try {
            const res = await client.get('/zonas/');
            setZonas(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => { fetchZonas(); }, []);

    const handleCrear = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await client.post('/zonas/', { nombre });
            toast.success("Zona creada correctamente");
            setNombre('');
            fetchZonas();
        } catch { toast.error("Error al crear zona"); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header con Botón Volver */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/admin/configuracion')} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-white">Gestión de Zonas</h2>
                    <p className="text-slate-400 text-sm">Organiza tu cobertura por sectores geográficos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Formulario Crear */}
                <div className="md:col-span-1 bg-slate-800 p-6 rounded-2xl border border-slate-700 h-fit shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <PlusIcon className="w-5 h-5 text-blue-500"/> Nueva Zona
                    </h3>
                    <form onSubmit={handleCrear} className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 font-bold ml-1">Nombre</label>
                            <input type="text" placeholder="Ej: Zona Norte" required 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none" 
                                value={nombre} onChange={e => setNombre(e.target.value)} />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-500/20">
                            Guardar Zona
                        </button>
                    </form>
                </div>

                {/* Lista de Zonas */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {zonas.map(z => (
                        <div key={z.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-blue-500/50 transition shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                    <MapPinIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-lg">{z.nombre}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {zonas.length === 0 && (
                        <div className="col-span-2 text-center p-10 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                            No hay zonas registradas aún.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
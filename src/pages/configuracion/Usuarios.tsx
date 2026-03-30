import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    ArrowLeftIcon, 
    ShieldCheckIcon, 
    PencilSquareIcon, 
    XMarkIcon,
    ServerStackIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function Usuarios() {
    const navigate = useNavigate();
    
    // --- ESTADOS DE DATOS ---
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [listaRouters, setListaRouters] = useState<any[]>([]);
    
    const [editingId, setEditingId] = useState<number | null>(null);

    // Estado inicial del formulario (Sin puntos de venta)
    const initialForm = { 
        nombre_completo: '', 
        usuario: '', 
        password: '', 
        rol: 'cajero', 
        activo: true,
        router_ids: [] as number[] 
    };

    const [form, setForm] = useState(initialForm);

    // --- CARGA DE DATOS ---
    const fetchData = async () => {
        try {
            // Solo cargamos Usuarios y Routers
            const [resUsers, resRouters] = await Promise.all([
                client.get('/usuarios/'),
                client.get('/network/routers/')
            ]);

            setUsuarios(resUsers.data);
            setListaRouters(resRouters.data);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando datos del sistema");
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- LÓGICA DEL FORMULARIO ---

    const handleEdit = (user: any) => {
        setEditingId(user.id);
        setForm({
            nombre_completo: user.nombre_completo,
            usuario: user.usuario,
            password: '', 
            rol: user.rol,
            activo: user.activo,
            router_ids: user.router_ids || [] 
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm(initialForm);
    };

    const toggleRouter = (routerId: number) => {
        const currentIds = [...form.router_ids];
        if (currentIds.includes(routerId)) {
            setForm({ ...form, router_ids: currentIds.filter(id => id !== routerId) });
        } else {
            setForm({ ...form, router_ids: [...currentIds, routerId] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await client.put(`/usuarios/${editingId}`, form);
                toast.success("Usuario actualizado");
            } else {
                await client.post('/usuarios/', form);
                toast.success("Usuario creado");
            }
            handleCancelEdit();
            fetchData(); 
        } catch (error: any) { 
            console.error(error);
            toast.error(error.response?.data?.detail || "Error al guardar usuario"); 
        }
    };

    const handleDelete = async (id: number) => {
        if(!confirm("¿Eliminar usuario?")) return;
        try {
            await client.delete(`/usuarios/${id}`);
            toast.success("Eliminado");
            fetchData();
        } catch { toast.error("Error al eliminar"); }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/admin/configuracion')} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-white">Gestión de Usuarios</h2>
                    <p className="text-slate-400 text-sm">Administra accesos y asignación de routers.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- COLUMNA 1: FORMULARIO --- */}
                <div className={`p-6 rounded-2xl border h-fit shadow-lg transition-colors ${editingId ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-800 border-slate-700'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <ShieldCheckIcon className={`w-5 h-5 ${editingId ? 'text-indigo-400' : 'text-slate-400'}`}/> 
                            {editingId ? 'Editando Usuario' : 'Nuevo Usuario'}
                        </h3>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-xs flex items-center gap-1 bg-slate-700 text-white px-2 py-1 rounded hover:bg-slate-600">
                                <XMarkIcon className="w-3 h-3"/> Cancelar
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 font-bold">Nombre Completo</label>
                                <input type="text" required className="input-dark w-full mt-1" 
                                    value={form.nombre_completo} onChange={e => setForm({...form, nombre_completo: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold">Usuario (Login)</label>
                                <input type="text" required className="input-dark w-full mt-1" 
                                    value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold">
                                    {editingId ? 'Contraseña (Dejar vacío para mantener)' : 'Contraseña'}
                                </label>
                                <input type="password" required={!editingId} className="input-dark w-full mt-1" 
                                    value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold">Rol</label>
                                <select className="input-dark w-full mt-1" 
                                    value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                                    <option value="cajero">Cajero</option>
                                    <option value="tecnico">Técnico</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                        </div>

                        <hr className="border-slate-700/50 my-2"/>

                        {/* SELECCIÓN DE ROUTERS (IMPORTANTE PARA TU FLUJO) */}
                        <div>
                            <label className="text-xs text-slate-400 font-bold flex items-center gap-1 mb-2">
                                <ServerStackIcon className="w-3 h-3" /> Routers Asignados (Permisos)
                            </label>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                                {listaRouters.length === 0 && <p className="text-xs text-slate-500">No hay routers registrados</p>}
                                
                                {listaRouters.map(router => (
                                    <label key={router.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-800/50 p-1 rounded">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                            checked={form.router_ids.includes(router.id)}
                                            onChange={() => toggleRouter(router.id)}
                                        />
                                        <span className="text-sm text-slate-300 truncate">{router.nombre}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">* El usuario solo podrá ver y cobrar clientes de estos routers.</p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm font-medium text-slate-400">¿Usuario Activo?</span>
                            <button 
                                type="button"
                                onClick={() => setForm({...form, activo: !form.activo})}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.activo ? 'bg-emerald-500' : 'bg-slate-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <button className={`w-full font-bold py-3 rounded-xl mt-2 shadow-lg transition ${editingId ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-blue-600 hover:bg-blue-500'} text-white`}>
                            {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                        </button>
                    </form>
                </div>

                {/* --- COLUMNA 2 Y 3: LISTA DE USUARIOS --- */}
                <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg h-fit">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900 text-slate-200 font-bold uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-4">Usuario</th>
                                <th className="p-4">Rol</th>
                                <th className="p-4">Permisos (Routers)</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {usuarios.map(u => (
                                <tr key={u.id} className="hover:bg-slate-700/50 transition">
                                    <td className="p-4">
                                        <div className="font-bold text-white">{u.nombre_completo}</div>
                                        <div className="text-xs">@{u.usuario}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                            u.rol === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 
                                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        }`}>
                                            {u.rol}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {u.router_ids && u.router_ids.length > 0 ? (
                                                u.router_ids.map((rid: number) => {
                                                    const rName = listaRouters.find(r => r.id === rid)?.nombre;
                                                    return rName ? (
                                                        <span key={rid} className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] text-white">
                                                            {rName}
                                                        </span>
                                                    ) : null;
                                                })
                                            ) : (
                                                <span className="text-slate-600 text-xs italic">
                                                    {u.rol === 'admin' ? 'Todos (Acceso Total)' : 'Ninguno asignado'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(u)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition">
                                            <PencilSquareIcon className="w-5 h-5"/>
                                        </button>
                                        <button onClick={() => handleDelete(u.id)} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition">
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    ArrowLeftIcon, 
    ShieldCheckIcon, 
    PencilSquareIcon, 
    XMarkIcon,
    ServerStackIcon,
    TrashIcon,
    UserCircleIcon,
    KeyIcon,
    IdentificationIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function Usuarios() {
    const navigate = useNavigate();
    
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [listaRouters, setListaRouters] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);

    const initialForm = { 
        nombre_completo: '', 
        usuario: '', 
        password: '', 
        rol: 'cajero', 
        activo: true,
        router_ids: [] as number[] 
    };

    const [form, setForm] = useState(initialForm);

    const fetchData = async () => {
        try {
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
        /* ✅ ADAPTADO: Fondo principal dinámico */
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10 p-4 md:p-0 transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/admin/configuracion')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white transition-colors">Gestión de Usuarios</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Administra accesos y asignación de routers del personal.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- COLUMNA 1: FORMULARIO ADAPTATIVO --- */}
                <div className={`p-6 rounded-2xl border h-fit shadow-sm dark:shadow-xl transition-all duration-300 ${editingId ? 'bg-indigo-50 dark:bg-[#151a2d] border-indigo-500/50' : 'bg-white dark:bg-[#11131a] border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-900 dark:text-white font-black flex items-center gap-2 text-lg transition-colors">
                            <ShieldCheckIcon className={`w-6 h-6 ${editingId ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}/> 
                            {editingId ? 'Editando Usuario' : 'Nuevo Usuario'}
                        </h3>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-xs flex items-center gap-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition">
                                <XMarkIcon className="w-4 h-4"/> Cancelar
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-4">
                            
                            {/* Input Nombre */}
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider ml-1">Nombre Completo</label>
                                <div className="relative mt-1.5">
                                    <UserCircleIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <input 
                                        type="text" required 
                                        placeholder="Ej. Juan Pérez"
                                        className="w-full bg-slate-50 dark:bg-[#0b0d14] border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-slate-800 dark:text-white text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                                        value={form.nombre_completo} onChange={e => setForm({...form, nombre_completo: e.target.value})} 
                                    />
                                </div>
                            </div>

                            {/* Input Usuario */}
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider ml-1">Usuario (Login)</label>
                                <div className="relative mt-1.5">
                                    <IdentificationIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <input 
                                        type="text" required 
                                        placeholder="Ej. jperez"
                                        className="w-full bg-slate-50 dark:bg-[#0b0d14] border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-slate-800 dark:text-white text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                                        value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value})} 
                                    />
                                </div>
                            </div>

                            {/* Input Password */}
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider ml-1">
                                    {editingId ? 'Nueva Contraseña' : 'Contraseña'}
                                </label>
                                <div className="relative mt-1.5">
                                    <KeyIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <input 
                                        type="password" required={!editingId} 
                                        placeholder={editingId ? "Dejar vacío para mantener actual" : "Mínimo 6 caracteres"}
                                        className="w-full bg-slate-50 dark:bg-[#0b0d14] border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-slate-800 dark:text-white text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                                        value={form.password} onChange={e => setForm({...form, password: e.target.value})} 
                                    />
                                </div>
                            </div>

                            {/* Select Rol */}
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider ml-1">Rol del Sistema</label>
                                <select 
                                    className="w-full mt-1.5 bg-slate-50 dark:bg-[#0b0d14] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-slate-800 dark:text-white text-sm focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                    value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}
                                >
                                    <option value="cajero" className="bg-white dark:bg-slate-900">Cobrador / Cajero</option>
                                    <option value="tecnico" className="bg-white dark:bg-slate-900">Técnico Instalador</option>
                                    <option value="admin" className="bg-white dark:bg-slate-900">Administrador General</option>
                                </select>
                            </div>
                        </div>

                        <hr className="border-slate-200 dark:border-slate-800 my-4"/>

                        {/* SELECCIÓN DE ROUTERS */}
                        <div>
                            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5 mb-3 ml-1">
                                <ServerStackIcon className="w-4 h-4 text-blue-500" /> Routers Permitidos
                            </label>
                            <div className="bg-slate-50 dark:bg-[#0b0d14] p-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto space-y-2.5 custom-scrollbar transition-colors">
                                {listaRouters.length === 0 && <p className="text-sm text-slate-500 text-center py-2">No hay routers registrados</p>}
                                
                                {listaRouters.map(router => (
                                    <label key={router.id} className="flex items-center space-x-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 p-2 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#11131a] text-blue-600 focus:ring-blue-500"
                                            checked={form.router_ids.includes(router.id)}
                                            onChange={() => toggleRouter(router.id)}
                                        />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate transition-colors">{router.nombre}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Switch de Usuario Activo */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0b0d14] rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                            <div>
                                <span className="text-sm font-black text-slate-900 dark:text-white block transition-colors">Estado de Cuenta</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">El usuario puede iniciar sesión</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setForm({...form, activo: !form.activo})}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${form.activo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${form.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <button className={`w-full font-black py-4 rounded-xl mt-4 shadow-md transition-all flex justify-center items-center gap-2 ${editingId ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-blue-600 hover:bg-blue-500'} text-white`}>
                            {editingId ? <PencilSquareIcon className="w-5 h-5"/> : <ShieldCheckIcon className="w-5 h-5"/>}
                            {editingId ? 'Guardar Cambios' : 'Registrar Nuevo Usuario'}
                        </button>
                    </form>
                </div>

                {/* --- COLUMNA 2 Y 3: LISTA DE USUARIOS --- */}
                <div className="lg:col-span-2 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-xl transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-400">
                            <thead className="bg-slate-100 dark:bg-[#0b0d14] text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800 transition-colors">
                                <tr>
                                    <th className="p-5">Usuario / Login</th>
                                    <th className="p-5 text-center">Rol</th>
                                    <th className="p-5">Permisos (Routers)</th>
                                    <th className="p-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {usuarios.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="p-5">
                                            <div className="font-black text-slate-900 dark:text-white text-base mb-0.5 transition-colors">{u.nombre_completo}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <IdentificationIcon className="w-3.5 h-3.5"/> @{u.usuario}
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                                                u.rol === 'admin' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' : 
                                                u.rol === 'tecnico' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                                                'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                            }`}>
                                                {u.rol}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {u.router_ids && u.router_ids.length > 0 ? (
                                                    u.router_ids.map((rid: number) => {
                                                        const rName = listaRouters.find(r => r.id === rid)?.nombre;
                                                        return rName ? (
                                                            <span key={rid} className="px-2 py-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors">
                                                                {rName}
                                                            </span>
                                                        ) : null;
                                                    })
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-500 text-[11px] italic bg-slate-100 dark:bg-[#0b0d14] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 transition-colors">
                                                        {u.rol === 'admin' ? 'Acceso Total' : 'Sin router'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(u)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition border border-transparent hover:border-blue-200 dark:hover:border-blue-500/20">
                                                    <PencilSquareIcon className="w-5 h-5"/>
                                                </button>
                                                <button onClick={() => handleDelete(u.id)} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20">
                                                    <TrashIcon className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
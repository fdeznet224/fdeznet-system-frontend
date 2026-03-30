import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, 
    ServerIcon, 
    GlobeAltIcon, 
    ShieldCheckIcon,
    AdjustmentsHorizontalIcon,
    ArrowPathIcon,
    LockClosedIcon
} from '@heroicons/react/24/outline';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    routerToEdit?: any; 
}

export default function CreateRouterModal({ isOpen, onClose, onSuccess, routerToEdit }: Props) {
    // 1. EL ESTADO INICIAL AHORA TIENE LOS VALORES FIJOS
    const initialState = {
        nombre: '',
        ip_vpn: '',
        user_api: 'admin',
        pass_api: '',
        port_api: 8728, 
        tipo_seguridad: 'pppoe',         // 👈 FIJO
        tipo_control: 'colas_dinamicas', // 👈 FIJO
        version_os: 'v7'
    };

    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- EFECTO DE CARGA ---
    useEffect(() => {
        if (isOpen) {
            if (routerToEdit) {
                setFormData({
                    nombre: routerToEdit.nombre || '',
                    ip_vpn: routerToEdit.ip_vpn || '',
                    user_api: routerToEdit.user_api || 'admin',
                    pass_api: '', 
                    port_api: routerToEdit.port_api || 8728,
                    // Forzamos a que siempre mantenga el estándar FdezNet, incluso al editar
                    tipo_seguridad: 'pppoe', 
                    tipo_control: 'colas_dinamicas',
                    version_os: routerToEdit.version_os || 'v7'
                });
            } else {
                setFormData(initialState);
            }
        }
    }, [isOpen, routerToEdit]);

    // --- ENVÍO DE DATOS ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const loadingToast = toast.loading(routerToEdit ? "Actualizando configuración..." : "Vinculando nuevo nodo...");

        try {
            const payload: any = {
                ...formData,
                port_api: Number(formData.port_api)
            };

            if (routerToEdit && !formData.pass_api) {
                delete payload.pass_api;
            }

            if (routerToEdit) {
                await client.put(`/network/routers/${routerToEdit.id}`, payload);
                toast.success("Nodo actualizado correctamente", { id: loadingToast });
            } else {
                await client.post('/network/routers/', payload);
                toast.success("¡Nodo vinculado con éxito!", { id: loadingToast });
            }
            
            onSuccess();
            onClose();

        } catch (error: any) {
            const detail = error.response?.data?.detail;
            let errorMsg = "Error en la conexión con el servidor";

            if (typeof detail === 'string') {
                errorMsg = detail;
            } else if (Array.isArray(detail)) {
                errorMsg = `Dato inválido en: ${detail[0]?.loc[1] || 'campo'} (${detail[0]?.msg})`;
            }

            toast.error(errorMsg, { id: loadingToast, duration: 6000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-700/50 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* HEADER */}
                <div className="flex-none p-6 border-b border-slate-800/50 flex justify-between items-start bg-slate-800/30">
                    <div className="flex gap-4 items-center">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <ServerIcon className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">
                                {routerToEdit ? 'Editar Nodo MikroTik' : 'Vincular Nuevo Nodo'}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                {routerToEdit ? `Modificando parámetros de conexión para ${routerToEdit.nombre}` : 'Configuración de acceso API REST'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 hover:bg-slate-800/50 rounded-xl transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* FORMULARIO */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Grupo: Conexión */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                <GlobeAltIcon className="w-4 h-4" /> Red y Acceso
                            </h4>
                            <div className="space-y-5 bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50 shadow-inner">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nombre del Nodo</label>
                                    <input type="text" className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all shadow-sm" placeholder="Ej: Torre Principal" required 
                                        value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Dirección IP (VPN/Local)</label>
                                    <input type="text" className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all shadow-sm" placeholder="10.x.x.x" required 
                                        value={formData.ip_vpn} onChange={e => setFormData({...formData, ip_vpn: e.target.value})}/>
                                </div>
                            </div>
                        </div>

                        {/* Grupo: Credenciales */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheckIcon className="w-4 h-4" /> Seguridad API
                            </h4>
                            <div className="space-y-5 bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50 shadow-inner">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Usuario</label>
                                        <input type="text" className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all shadow-sm" required 
                                            value={formData.user_api} onChange={e => setFormData({...formData, user_api: e.target.value})}/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Puerto</label>
                                        <input type="number" className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all shadow-sm text-center" required 
                                            value={formData.port_api} onChange={e => setFormData({...formData, port_api: Number(e.target.value)})}/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                        <span>Contraseña</span>
                                        {routerToEdit && <span className="text-slate-600 normal-case tracking-normal">(Dejar vacío para no cambiar)</span>}
                                    </label>
                                    <input type="password" title="password" className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all shadow-sm" placeholder="••••••••" required={!routerToEdit}
                                        value={formData.pass_api} onChange={e => setFormData({...formData, pass_api: e.target.value})}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grupo: Configuración Avanzada FdezNet (BLOQUEADA) */}
                    <div className="pt-2">
                        <div className="flex items-center gap-3 mb-4">
                            <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                <AdjustmentsHorizontalIcon className="w-4 h-4" /> Gestión de Tráfico
                            </h4>
                            <span className="bg-purple-500/10 text-purple-400 text-[9px] px-2 py-0.5 rounded border border-purple-500/20 font-bold uppercase flex items-center gap-1">
                                <LockClosedIcon className="w-2.5 h-2.5" /> FdezNet Standard
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50 shadow-inner">
                            {/* Bloqueado: PPPoE */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Modo de Autenticación</label>
                                <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between cursor-not-allowed opacity-80">
                                    <span className="text-slate-300 font-bold text-sm">PPP Secrets</span>
                                    <LockClosedIcon className="w-4 h-4 text-slate-600" />
                                </div>
                            </div>
                            
                            {/* Bloqueado: Colas Dinámicas */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Control de Ancho de Banda</label>
                                <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between cursor-not-allowed opacity-80">
                                    <span className="text-slate-300 font-bold text-sm">Colas Simples Dinámicas</span>
                                    <LockClosedIcon className="w-4 h-4 text-slate-600" />
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 ml-1">
                            * Por políticas de la red, los nuevos nodos se auto-configuran estrictamente para operar mediante <strong>PPPoE</strong>. El límite de velocidad lo aplica el MikroTik automáticamente al conectar el cliente.
                        </p>
                    </div>

                    {/* FOOTER ACCIONES */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-8 pb-2">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-3.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting} className={`px-8 py-3.5 rounded-xl text-sm font-black tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 ${isSubmitting ? 'bg-blue-600/50 text-blue-200 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 border border-blue-500/30'}`}>
                            {isSubmitting ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : null}
                            {isSubmitting ? 'PROCESANDO...' : (routerToEdit ? 'GUARDAR CAMBIOS' : 'VINCULAR NODO')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
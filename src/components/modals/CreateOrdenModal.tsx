import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, UserIcon, MapPinIcon, 
    WrenchScrewdriverIcon, ClipboardDocumentListIcon,
    PhoneIcon, MapIcon
} from '@heroicons/react/24/outline';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateOrdenModal({ isOpen, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    
    // Catálogos
    const [tecnicos, setTecnicos] = useState<any[]>([]);
    const [zonas, setZonas] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        direccion: '',
        zona_id: '',
        tecnico_id: '',
        // Valores por defecto para orden pendiente
        estado: 'pendiente_instalacion', 
    });

    // Cargar Técnicos y Zonas al abrir
    useEffect(() => {
        if (isOpen) {
            const cargarDatos = async () => {
                try {
                    const [resUsers, resZonas] = await Promise.all([
                        client.get('/usuarios'),
                        client.get('/zonas')
                    ]);
                    
                    // Filtramos solo los usuarios con rol 'tecnico'
                    const listaTecnicos = resUsers.data.filter((u: any) => u.rol === 'tecnico');
                    setTecnicos(listaTecnicos);
                    setZonas(resZonas.data);
                    
                    // Reset form
                    setFormData({
                        nombre: '', telefono: '', direccion: '', 
                        zona_id: '', tecnico_id: '', 
                        estado: 'pendiente_instalacion'
                    });

                } catch (error) {
                    toast.error("Error cargando catálogos");
                }
            };
            cargarDatos();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const loadToast = toast.loading("Generando Orden...");

        try {
            // Preparamos el payload con datos "dummy" para que pase la validación del backend
            // (El backend espera router_id, plan_id, etc, pero aceptará nulls o defaults)
            const payload = {
                ...formData,
                zona_id: Number(formData.zona_id),
                tecnico_id: Number(formData.tecnico_id),
                
                // Relleno técnico (se definirá en la instalación real)
                router_id: null,
                plan_id: null,
                plantilla_id: 1, // Default
                ip_asignada: '0.0.0.0', // IP Placeholder
                user_pppoe: `pend_${Date.now()}`, // Temporal
                pass_pppoe: 'temp123'
            };

            await client.post('/clientes/', payload);
            
            toast.success("Orden Creada y Asignada", { id: loadToast });
            
            // Opcional: Abrir WhatsApp para notificar al técnico
            const tecnico = tecnicos.find(t => t.id == formData.tecnico_id);
            if (tecnico && tecnico.telefono) {
                notificarTecnico(tecnico.telefono, formData);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error al crear la orden", { id: loadToast });
        } finally {
            setLoading(false);
        }
    };

    const notificarTecnico = (tel: string, data: any) => {
        const zonaNombre = zonas.find(z => z.id == data.zona_id)?.nombre;
        const msg = `🛠️ *NUEVA ORDEN ASIGNADA*
        
👤 Cliente: ${data.nombre}
📍 Zona: ${zonaNombre}
🏠 Dirección: ${data.direccion}
📞 Contacto: ${data.telefono}

_Por favor gestionar en la App._`;
        
        // Abrimos en una pestaña nueva sin bloquear el flujo
        setTimeout(() => {
            window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
        }, 1000);
    };

    const inputClass = "w-full bg-[#0b0c10] border border-slate-700 text-white text-sm rounded-lg p-3 outline-none focus:border-blue-500 transition focus:ring-1 focus:ring-blue-500";
    const labelClass = "block text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1";

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-[#1e1f29] border border-slate-700 p-6 text-left align-middle shadow-xl transition-all">
                        
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <ClipboardDocumentListIcon className="w-6 h-6 text-blue-500"/>
                                    Nueva Orden de Servicio
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Registra un prospecto para instalación.</p>
                            </div>
                            <button onClick={onClose} className="text-slate-500 hover:text-white"><XMarkIcon className="w-6 h-6"/></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* Datos Personales */}
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Nombre del Cliente</label>
                                    <div className="relative">
                                        <input required className={`${inputClass} pl-10`} placeholder="Ej: Juan Pérez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                                        <UserIcon className="w-5 h-5 text-slate-500 absolute left-3 top-3"/>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Teléfono / WhatsApp</label>
                                        <div className="relative">
                                            <input required className={`${inputClass} pl-10`} placeholder="55..." value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                                            <PhoneIcon className="w-5 h-5 text-slate-500 absolute left-3 top-3"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Zona / Colonia</label>
                                        <div className="relative">
                                            <select required className={`${inputClass} pl-10 appearance-none`} value={formData.zona_id} onChange={e => setFormData({...formData, zona_id: e.target.value})}>
                                                <option value="">Seleccionar...</option>
                                                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                            </select>
                                            <MapIcon className="w-5 h-5 text-slate-500 absolute left-3 top-3"/>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Dirección Exacta</label>
                                    <div className="relative">
                                        <textarea required rows={2} className={`${inputClass} pl-10 pt-3`} placeholder="Calle, Número, Referencias..." value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
                                        <MapPinIcon className="w-5 h-5 text-slate-500 absolute left-3 top-3.5"/>
                                    </div>
                                </div>
                            </div>

                            {/* Asignación */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mt-4">
                                <label className="text-orange-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                                    <WrenchScrewdriverIcon className="w-4 h-4"/> Asignar Técnico Responsable
                                </label>
                                <select 
                                    required 
                                    className="w-full bg-[#0b0c10] border border-orange-500/30 text-white rounded-lg p-3 outline-none focus:border-orange-500 transition"
                                    value={formData.tecnico_id} 
                                    onChange={e => setFormData({...formData, tecnico_id: e.target.value})}
                                >
                                    <option value="">-- Seleccionar Técnico Disponible --</option>
                                    {tecnicos.map(t => (
                                        <option key={t.id} value={t.id}>👷 {t.usuario} ({t.nombre_completo})</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-500 mt-2">
                                    * El técnico recibirá la orden en su App inmediatamente.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-400 hover:text-white transition font-bold text-sm">Cancelar</button>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/30 active:scale-95 transition flex justify-center gap-2"
                                >
                                    {loading ? 'Procesando...' : 'Crear Orden'}
                                </button>
                            </div>

                        </form>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </Transition>
    );
}
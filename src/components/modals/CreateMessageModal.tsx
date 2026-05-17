import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { XMarkIcon, ChatBubbleBottomCenterTextIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function CreateMessageModal({ isOpen, onClose, onSuccess, initialData }: Props) {
    const [formData, setFormData] = useState({
        tipo: 'bienvenida',
        texto: '',
        activo: true
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tipos de mensajes sincronizados con el Backend (NotificationService)
    const tiposMensaje = [
        { id: 'bienvenida', label: '👋 Bienvenida (Instalación)' },
        { id: 'nueva_factura', label: '📄 Nueva Factura Generada' },
        { id: 'pago_recibido', label: '✅ Confirmación de Pago (PDF)' },
        { id: 'aviso_corte', label: '🚫 Corte por Adeudo (Auto)' },
        { id: 'corte_servicio', label: '🛠️ Suspensión Administrativa' },
        { id: 'reconexion', label: '🚀 Reconexión de Servicio' },
        { id: 'promesa_pago', label: '🤝 Promesa de Pago' },
    ];

    // Variables organizadas por categorías
    const variablesDisponibles = [
        { name: 'nombre', label: 'Cliente' },
        { name: 'cedula', label: 'ID Cédula' },
        { name: 'plan', label: 'Plan' },
        { name: 'precio', label: 'Precio' },
        { name: 'dia_corte', label: 'Día Pago' },
        { name: 'direccion', label: 'Dirección' },
        { name: 'onu_serial', label: 'S/N ONU' },
        { name: 'nodo', label: 'Nodo/Router' },
        { name: 'usuario_pppoe', label: 'User PPPoE' },
        { name: 'pass_pppoe', label: 'Pass PPPoE' },
        { name: 'empresa', label: 'Empresa' },
    ];

    useEffect(() => {
        if (initialData) {
            setFormData({
                tipo: initialData.tipo,
                texto: initialData.texto,
                activo: initialData.activo
            });
        } else {
            setFormData({
                tipo: 'bienvenida',
                texto: '¡Hola {nombre}! Bienvenido a {empresa}. Tu código de cliente es {cedula}.',
                activo: true
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const loadingToast = toast.loading("Guardando plantilla...");

        try {
            const endpoint = '/configuracion/plantillas'; 
            if (initialData) {
                await client.put(`${endpoint}/${initialData.id}`, formData);
                toast.success("Plantilla actualizada");
            } else {
                await client.post(`${endpoint}`, formData);
                toast.success("Plantilla creada");
            }
            toast.dismiss(loadingToast);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error("Error al guardar la plantilla");
        } finally {
            setIsSubmitting(false);
        }
    };

    const insertVar = (varName: string) => {
        setFormData(prev => ({ ...prev, texto: prev.texto + `{${varName}}` }));
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 text-left align-middle shadow-2xl transition-all">
                            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                                <Dialog.Title className="text-lg font-bold text-white flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-emerald-400" />
                                    {initialData ? 'Configurar Plantilla' : 'Nueva Plantilla Automática'}
                                </Dialog.Title>
                                <button onClick={onClose} className="text-slate-400 hover:text-white transition"><XMarkIcon className="w-6 h-6" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Evento del Sistema</label>
                                    <select 
                                        value={formData.tipo}
                                        onChange={e => setFormData({...formData, tipo: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                                        disabled={!!initialData}
                                    >
                                        {tiposMensaje.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex flex-col gap-3 mb-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Contenido del Mensaje</label>
                                        <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950 rounded-xl border border-slate-800">
                                            {variablesDisponibles.map(v => (
                                                <button 
                                                    key={v.name} 
                                                    type="button" 
                                                    onClick={() => insertVar(v.name)}
                                                    className="text-[10px] bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white px-2 py-1 rounded-md border border-slate-700 transition-colors font-medium"
                                                >
                                                    +{v.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea 
                                        rows={7}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans text-sm leading-relaxed placeholder:text-slate-700" 
                                        placeholder="Escribe el mensaje aquí..." 
                                        required
                                        value={formData.texto} 
                                        onChange={e => setFormData({...formData, texto: e.target.value})}
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                    <input 
                                        type="checkbox" 
                                        id="activo"
                                        className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700"
                                        checked={formData.activo}
                                        onChange={e => setFormData({...formData, activo: e.target.checked})}
                                    />
                                    <label htmlFor="activo" className="text-sm text-slate-300 cursor-pointer select-none font-medium">
                                        Habilitar envío automático para este evento
                                    </label>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button type="button" onClick={onClose} className="flex-1 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition font-bold text-sm">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 text-sm uppercase tracking-wider">
                                        {isSubmitting ? 'Guardando...' : 'Guardar Plantilla'}
                                    </button>
                                </div>
                            </form>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
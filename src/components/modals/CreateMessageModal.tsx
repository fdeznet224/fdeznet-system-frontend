import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { XMarkIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function CreateMessageModal({ isOpen, onClose, onSuccess, initialData }: Props) {
    const [formData, setFormData] = useState({
        tipo: 'recordatorio_pago',
        texto: '',
        activo: true
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tipos de mensajes disponibles en el sistema
    const tiposMensaje = [
        { id: 'recordatorio_pago', label: 'Recordatorio de Pago' },
        { id: 'aviso_corte', label: 'Aviso de Corte' },
        { id: 'pago_exitoso', label: 'Confirmación de Pago' },
        { id: 'bienvenida', label: 'Bienvenida al Cliente' },
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
                tipo: 'recordatorio_pago',
                texto: 'Hola {nombre}, te recordamos que tu servicio vence el {fecha_vencimiento}. Monto: ${monto}.',
                activo: true
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const loadingToast = toast.loading("Guardando mensaje...");

        try {
            // endpoint exclusivo para mensajes (definido en configuracion.py)
            const endpoint = '/configuracion/plantillas'; 

            if (initialData) {
                await client.put(`${endpoint}/${initialData.id}`, formData);
                toast.success("Mensaje actualizado");
            } else {
                await client.post(`${endpoint}`, formData); // Nota: Sin barra al final a veces ayuda
                toast.success("Mensaje creado");
            }
            toast.dismiss(loadingToast);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.dismiss(loadingToast);
            console.error(error);
            toast.error("Error al guardar mensaje");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper para insertar variables
    const insertVar = (varName: string) => {
        setFormData(prev => ({ ...prev, texto: prev.texto + ` {${varName}}` }));
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl transition-all p-6">
                            
                            <div className="flex justify-between items-center mb-6">
                                <Dialog.Title as="h3" className="text-xl font-bold text-white flex items-center gap-2">
                                    <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-emerald-500" /> 
                                    {initialData ? 'Editar Mensaje' : 'Nuevo Mensaje'}
                                </Dialog.Title>
                                <button onClick={onClose} className="text-slate-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                
                                {/* TIPO DE MENSAJE */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tipo de Evento</label>
                                    <select 
                                        value={formData.tipo}
                                        onChange={e => setFormData({...formData, tipo: e.target.value})}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
                                        disabled={!!initialData} // No cambiar tipo si ya existe para evitar duplicados
                                    >
                                        {tiposMensaje.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-1">Cuándo se enviará este mensaje automáticamente.</p>
                                </div>

                                {/* CONTENIDO DEL MENSAJE */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase block">Contenido del WhatsApp</label>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold">Variables:</span>
                                            <button type="button" onClick={() => insertVar('nombre')} className="text-[10px] bg-slate-700 px-2 rounded text-slate-300 hover:text-white border border-slate-600">Nombre</button>
                                            <button type="button" onClick={() => insertVar('monto')} className="text-[10px] bg-slate-700 px-2 rounded text-slate-300 hover:text-white border border-slate-600">Monto</button>
                                            <button type="button" onClick={() => insertVar('fecha_vencimiento')} className="text-[10px] bg-slate-700 px-2 rounded text-slate-300 hover:text-white border border-slate-600">Fecha</button>
                                        </div>
                                    </div>
                                    <textarea 
                                        rows={6}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white focus:border-emerald-500 outline-none font-sans text-sm leading-relaxed" 
                                        placeholder="Escribe tu mensaje aquí..." 
                                        required
                                        value={formData.texto} 
                                        onChange={e => setFormData({...formData, texto: e.target.value})}
                                    />
                                </div>

                                {/* ACTIVO */}
                                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                    <input 
                                        type="checkbox" 
                                        id="activo"
                                        className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-700 border-slate-500"
                                        checked={formData.activo}
                                        onChange={e => setFormData({...formData, activo: e.target.checked})}
                                    />
                                    <label htmlFor="activo" className="text-sm text-slate-300 cursor-pointer select-none">
                                        Mensaje habilitado (El sistema lo enviará)
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={onClose} className="flex-1 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition font-medium text-sm">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 text-sm">
                                        {isSubmitting ? 'Guardando...' : 'Guardar Mensaje'}
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
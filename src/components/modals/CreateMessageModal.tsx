import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { XMarkIcon, SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

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

    const tiposMensaje = [
        { id: 'bienvenida', label: '👋 Bienvenida (Instalación)' },
        { id: 'nueva_factura', label: '📄 Nueva Factura Generada' },
        { id: 'pago_recibido', label: '✅ Confirmación de Pago (PDF)' },
        { id: 'abono_recibido', label: '💸 Abono Parcial Recibido' },
        { id: 'aviso_corte', label: '🚫 Corte por Adeudo (Auto)' },
        { id: 'corte_servicio', label: '🛠️ Suspensión Administrativa' },
        { id: 'reconexion', label: '🚀 Reconexión de Servicio' },
        { id: 'promesa_pago', label: '🤝 Promesa de Pago' },
    ];

    // 🔥 DICCIONARIO CATEGORIZADO CON DESCRIPCIONES (UX Premium)
    const categoriasVariables = [
        {
            titulo: "👤 Cliente y Sistema",
            variables: [
                { name: 'empresa', label: 'Empresa', desc: 'Nombre de tu ISP (FdezNet)' },
                { name: 'nombre', label: 'Cliente', desc: 'Nombre completo del cliente' },
                { name: 'cedula', label: 'Cédula/ID', desc: 'Número de contrato o identificación' },
                { name: 'telefono', label: 'Teléfono', desc: 'Número celular del cliente' },
                { name: 'zona', label: 'Zona', desc: 'Sector o cobertura (Ej: Centro)' },
                { name: 'direccion', label: 'Dirección', desc: 'Domicilio registrado' },
                { name: 'estado_cliente', label: 'Estado Cta.', desc: 'Activo, Suspendido, Cancelado' },
            ]
        },
        {
            titulo: "🗓️ Fechas y Ciclos",
            variables: [
                { name: 'mes_actual', label: 'Mes en texto', desc: 'Ejemplo: Junio, Julio, Agosto' },
                { name: 'dia_corte', label: 'Día Facturación', desc: 'Día exacto en que se genera su cobro' },
                { name: 'dia_final', label: 'Límite de Pago', desc: 'Día exacto en que se le cortará el internet' },
                { name: 'fecha_actual', label: 'Fecha de Hoy', desc: 'Fecha exacta del envío del mensaje' },
            ]
        },
        {
            titulo: "💵 Finanzas y Pagos",
            variables: [
                { name: 'plan', label: 'Nombre Plan', desc: 'Ejemplo: Plan Familiar FTTH' },
                { name: 'precio', label: 'Mensualidad', desc: 'Costo total del plan (Ej: $350.00)' },
                { name: 'saldo_favor', label: 'Saldo a Favor', desc: 'Dinero extra en el monedero' },
                { name: 'monto_pagado', label: 'Monto Recibido', desc: 'Dinero entregado en caja (Para recibos)' },
                { name: 'referencia', label: 'Restante/Ref', desc: 'Folio o saldo pendiente tras un abono' },
                { name: 'monto_promesa', label: 'Deuda Promesa', desc: 'Saldo total a liquidar en la prórroga' },
                { name: 'fecha_limite_promesa', label: 'Venc. Promesa', desc: 'Fecha acordada para pagar la prórroga' },
            ]
        },
        {
            titulo: "📡 Infraestructura (Red)",
            variables: [
                { name: 'velocidad', label: 'Megas', desc: 'Velocidad comercial (Ej: 50 Megas)' },
                { name: 'ip', label: 'Dirección IP', desc: 'IP asignada en el router' },
                { name: 'nodo', label: 'Router/Nodo', desc: 'Router administrador principal' },
                { name: 'onu_serial', label: 'Serial ONU', desc: 'MAC o S/N del equipo en su casa' },
                { name: 'usuario_pppoe', label: 'User PPPoE', desc: 'Usuario de conexión' },
                { name: 'pass_pppoe', label: 'Pass PPPoE', desc: 'Contraseña de conexión' },
            ]
        }
    ];

    useEffect(() => {
        if (initialData) {
            setFormData({ tipo: initialData.tipo, texto: initialData.texto, activo: initialData.activo });
        } else {
            setFormData({ tipo: 'bienvenida', texto: '¡Hola {nombre}! Bienvenido a {empresa}. Tu ID es {cedula}.', activo: true });
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
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-md transition-colors" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-white dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-800 text-left align-middle shadow-2xl transition-colors flex flex-col md:flex-row h-[90vh] md:h-auto md:max-h-[85vh]">
                                
                                {/* COLUMNA IZQUIERDA: FORMULARIO */}
                                <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar">
                                    <div className="bg-slate-50 dark:bg-[#111218] px-6 py-5 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex justify-between items-center">
                                        <Dialog.Title className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                            <SparklesIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                                            {initialData ? 'Configurar Plantilla' : 'Nueva Plantilla'}
                                        </Dialog.Title>
                                        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 flex flex-col">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Evento del Sistema</label>
                                            <select 
                                                value={formData.tipo}
                                                onChange={e => setFormData({...formData, tipo: e.target.value})}
                                                className="w-full bg-slate-50 dark:bg-[#161822] border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold cursor-pointer"
                                                disabled={!!initialData}
                                            >
                                                {tiposMensaje.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block flex items-center justify-between">
                                                Cuerpo del Mensaje (WhatsApp)
                                                <span className="text-emerald-600 dark:text-emerald-500 font-bold normal-case text-xs flex items-center gap-1"><InformationCircleIcon className="w-4 h-4"/> Selecciona variables a la derecha 👉</span>
                                            </label>
                                            
                                            <textarea 
                                                className="w-full flex-1 min-h-[250px] bg-slate-50 dark:bg-[#161822] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm leading-relaxed resize-none shadow-inner" 
                                                placeholder="Hola {nombre}, tu saldo es..." 
                                                required
                                                value={formData.texto} 
                                                onChange={e => setFormData({...formData, texto: e.target.value})}
                                            />
                                        </div>

                                        <label className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer"
                                                checked={formData.activo}
                                                onChange={e => setFormData({...formData, activo: e.target.checked})}
                                            />
                                            <span className="text-sm text-slate-800 dark:text-slate-200 select-none font-black group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                                Habilitar envío automático para este evento
                                            </span>
                                        </label>

                                        <div className="pt-2 flex gap-3">
                                            <button type="button" onClick={onClose} className="hidden md:block flex-1 px-4 py-3.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl font-black text-sm transition-colors">Cancelar</button>
                                            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 text-sm uppercase tracking-wider transition-all">
                                                {isSubmitting ? 'Guardando...' : 'Guardar Plantilla'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* COLUMNA DERECHA: VARIABLES (PANEL DE AYUDA UX) */}
                                <div className="w-full md:w-[380px] bg-slate-50 dark:bg-[#111218] flex flex-col h-full overflow-hidden">
                                    <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-[#111218] z-10 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-black text-slate-800 dark:text-white leading-tight">Diccionario Inteligente</h3>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mt-0.5">Haz clic para inyectar al texto</p>
                                        </div>
                                        <button onClick={onClose} className="hidden md:block text-slate-400 hover:text-slate-900 dark:hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                                    </div>
                                    
                                    <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 flex-1 pb-10">
                                        {categoriasVariables.map((cat, idx) => (
                                            <div key={idx} className="space-y-2.5">
                                                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">{cat.titulo}</h4>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {cat.variables.map(v => (
                                                        <button 
                                                            key={v.name} 
                                                            type="button" 
                                                            onClick={() => insertVar(v.name)}
                                                            className="flex flex-col text-left bg-white dark:bg-[#161822] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-300 dark:hover:border-emerald-500/30 p-2.5 rounded-xl transition-all group"
                                                            title={v.desc}
                                                        >
                                                            <div className="flex justify-between items-center w-full">
                                                                <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-wide">+{v.label}</span>
                                                                <span className="text-[9px] text-slate-400 group-hover:text-emerald-500">{`{${v.name}}`}</span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 font-medium">{v.desc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
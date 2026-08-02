import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { XMarkIcon, SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: MessageTemplate | null;
}

export interface MessageTemplate {
    id: number;
    tipo: string;
    texto: string;
    activo: boolean;
}

export default function CreateMessageModal({ isOpen, onClose, onSuccess, initialData }: Props) {
    const [formData, setFormData] = useState({
        tipo: 'bienvenida',
        texto: '',
        activo: true
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 🔥 AQUÍ SE AGREGÓ EL RECORDATORIO AMIGABLE 🔥
    const tiposMensaje = [
        { id: 'bienvenida', label: '👋 Bienvenida (Instalación)' },
        { id: 'nueva_factura', label: '📄 Nueva Factura Generada' },
        { id: 'recordatorio_pago', label: '🔔 Recordatorio Amigable (Previo)' }, // 👈 NUEVO EVENTO
        { id: 'pago_recibido', label: '✅ Confirmación de Pago (PDF)' },
        { id: 'abono_recibido', label: '💸 Abono Parcial Recibido' },
        { id: 'aviso_corte', label: '🚫 Corte por Adeudo (Auto)' },
        { id: 'corte_servicio', label: '🛠️ Suspensión Administrativa' },
        { id: 'reconexion', label: '🚀 Reconexión de Servicio' },
        { id: 'promesa_pago', label: '🤝 Promesa de Pago' },
    ];

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
        } catch {
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
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-colors" />
                </Transition.Child>

                {/* Se ajusta a items-end en celular (bottom sheet) e items-center en PC */}
                <div className="fixed inset-0 overflow-hidden flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95">
                        
                        {/* 🔥 PANEL PRINCIPAL: Altura estricta para forzar el scroll independiente 🔥 */}
                        <Dialog.Panel className="w-full max-w-5xl bg-white dark:bg-[#0b0c10] border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl transition-colors flex flex-col md:flex-row h-[95dvh] sm:h-[90vh] md:h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden">
                            
                            {/* COLUMNA IZQUIERDA: FORMULARIO */}
                            <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 relative z-10">
                                
                                {/* Header del Formulario */}
                                <div className="bg-slate-50 dark:bg-[#111218] px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                                    <Dialog.Title className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <SparklesIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                                        {initialData ? 'Configurar Plantilla' : 'Nueva Plantilla'}
                                    </Dialog.Title>
                                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
                                </div>

                                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                                    
                                    {/* Zona que hace scroll (Inputs) */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Evento del Sistema</label>
                                            <select 
                                                value={formData.tipo}
                                                onChange={e => setFormData({...formData, tipo: e.target.value})}
                                                className="w-full bg-slate-50 dark:bg-[#161822] border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold cursor-pointer transition-all"
                                                disabled={!!initialData}
                                            >
                                                {tiposMensaje.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex flex-col h-full min-h-[200px]">
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                                                Cuerpo del Mensaje (WhatsApp)
                                                <span className="hidden sm:flex text-emerald-600 dark:text-emerald-500 font-bold normal-case text-xs items-center gap-1"><InformationCircleIcon className="w-4 h-4"/> Variables a la derecha 👉</span>
                                            </label>
                                            
                                            <textarea 
                                                className="w-full flex-1 bg-slate-50 dark:bg-[#161822] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm leading-relaxed resize-none shadow-inner transition-all" 
                                                placeholder="Escribe el cuerpo del mensaje..." 
                                                required
                                                value={formData.texto} 
                                                onChange={e => setFormData({...formData, texto: e.target.value})}
                                            />
                                        </div>

                                        <label className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 cursor-pointer group transition-all">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer"
                                                checked={formData.activo}
                                                onChange={e => setFormData({...formData, activo: e.target.checked})}
                                            />
                                            <span className="text-sm text-slate-800 dark:text-slate-200 select-none font-black group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                                Habilitar envío automático
                                            </span>
                                        </label>
                                    </div>

                                    {/* Botones Fijos Abajo */}
                                    <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0c10] flex gap-3 shrink-0">
                                        <button type="button" onClick={onClose} className="hidden md:block flex-1 px-4 py-3.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl font-black text-sm transition-colors">Cancelar</button>
                                        <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 text-sm uppercase tracking-wider transition-all">
                                            {isSubmitting ? 'Guardando...' : 'Guardar Plantilla'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* COLUMNA DERECHA: VARIABLES (Deslizable independiente) */}
                            {/* En celular mide 45vh de alto, en PC toma la altura completa */}
                            <div className="w-full h-[45vh] md:h-full md:w-[380px] lg:w-[420px] bg-slate-50 dark:bg-[#111218] flex flex-col shrink-0 z-0">
                                
                                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111218] flex justify-between items-center shrink-0">
                                    <div>
                                        <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white leading-tight">Diccionario Inteligente</h3>
                                        <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-black mt-0.5">Toca el botón para inyectar</p>
                                    </div>
                                    <button onClick={onClose} className="hidden md:block text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                                </div>
                                
                                <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-6 flex-1 pb-10">
                                    {categoriasVariables.map((cat, idx) => (
                                        <div key={idx} className="space-y-2.5">
                                            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{cat.titulo}</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {cat.variables.map(v => (
                                                    <button 
                                                        key={v.name} 
                                                        type="button" 
                                                        onClick={() => insertVar(v.name)}
                                                        className="flex flex-col text-left bg-white dark:bg-[#161822] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-300 dark:hover:border-emerald-500/30 p-2.5 sm:p-3 rounded-xl transition-all group active:scale-95 shadow-sm"
                                                        title={v.desc}
                                                    >
                                                        <div className="flex justify-between items-center w-full">
                                                            <span className="text-[10px] sm:text-[11px] font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-wide">+{v.label}</span>
                                                            <span className="text-[9px] text-slate-400 group-hover:text-emerald-500">{`{${v.name}}`}</span>
                                                        </div>
                                                        <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{v.desc}</span>
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
            </Dialog>
        </Transition>
    );
}

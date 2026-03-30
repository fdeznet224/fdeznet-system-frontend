import { useState, useEffect, Fragment } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { 
    XMarkIcon, DocumentTextIcon, CalendarDaysIcon, 
    ClockIcon, ShieldCheckIcon, CheckCircleIcon 
} from '@heroicons/react/24/outline';

// Interfaz flexible
interface FormState {
    nombre: string;
    dias_antes_emision: number | string; // Represents "Days Before Payment"
    dia_pago: number | string;
    dias_tolerancia: number | string;
    impuesto: number | string;
    recordatorio_whatsapp: boolean;
    aviso_factura: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function CreateTemplateModal({ isOpen, onClose, onSuccess, initialData }: Props) {
    // Estado inicial
    const [formData, setFormData] = useState<FormState>({
        nombre: '',
        dias_antes_emision: 5, // Default: 5 days before payment
        dia_pago: 15,          // Default: Payment on the 15th
        dias_tolerancia: 5,    
        impuesto: 0,
        recordatorio_whatsapp: true,
        aviso_factura: 'whatsapp'
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                nombre: initialData.nombre,
                dias_antes_emision: initialData.dias_antes_emision, // Load directly from backend
                dia_pago: initialData.dia_pago,
                dias_tolerancia: initialData.dias_tolerancia,
                impuesto: initialData.impuesto,
                recordatorio_whatsapp: initialData.recordatorio_whatsapp,
                aviso_factura: initialData.aviso_factura || 'whatsapp'
            });
        } else {
            setFormData({
                nombre: '', 
                dias_antes_emision: 5, 
                dia_pago: 15, 
                dias_tolerancia: 5, 
                impuesto: 0, 
                recordatorio_whatsapp: true, 
                aviso_factura: 'whatsapp'
            });
        }
    }, [initialData, isOpen]);

    const handleNumberChange = (field: keyof FormState, value: string) => {
        if (value === '') {
            setFormData({ ...formData, [field]: '' });
        } else {
            setFormData({ ...formData, [field]: parseInt(value) });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const loadingToast = toast.loading("Guardando...");

        try {
            // Send numbers directly. Backend handles subtraction logic.
            const payload = {
                ...formData,
                dias_antes_emision: Number(formData.dias_antes_emision || 0),
                dia_pago: Number(formData.dia_pago || 0),
                dias_tolerancia: Number(formData.dias_tolerancia || 0),
                impuesto: Number(formData.impuesto || 0)
            };

            const endpoint = '/configuracion/plantillas-facturacion'; 

            if (initialData?.id) {
                await client.put(`${endpoint}/${initialData.id}`, payload);
                toast.success("Ciclo actualizado");
            } else {
                await client.post(`${endpoint}`, payload);
                toast.success("Ciclo creado");
            }
            toast.dismiss(loadingToast);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.dismiss(loadingToast);
            const msg = error.response?.data?.detail || "Error al guardar";
            toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    // === VISUAL CALCULATIONS FOR SIMULATION ===
    const val = (v: number | string) => Number(v || 0);
    
    // 1. Calculate Generation Date (Simulated)
    // Logic: Payment Day - Days Before
    const calcFechaGeneracion = () => {
        const pago = val(formData.dia_pago);
        const antes = val(formData.dias_antes_emision);
        
        let fecha = pago - antes;
        
        // If result is 0 or negative (e.g., Payment on 1st - 5 days = -4)
        // It means previous month (30 - 4 = Day 26)
        if (fecha <= 0) {
            fecha = 30 + fecha; 
        }
        return fecha;
    };

    // 2. Calculate Cutoff Date
    const calcFechaCorte = () => {
        let dia = val(formData.dia_pago) + val(formData.dias_tolerancia);
        if (dia > 30) dia = dia - 30; 
        return dia;
    };

    // Determine if generation falls in previous month
    const esMesAnterior = val(formData.dia_pago) - val(formData.dias_antes_emision) <= 0;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="bg-[#0f1219] rounded-2xl border border-slate-800 w-full max-w-5xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
                                
                                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>

                                {/* === FORM (LEFT) === */}
                                <div className="flex-1 p-8 md:p-10">
                                    <div className="mb-8">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-pink-600/20 rounded-lg border border-pink-500/30">
                                                <DocumentTextIcon className="w-6 h-6 text-pink-500" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white">Nuevo Ciclo de Facturación</h3>
                                        </div>
                                        <p className="text-slate-400 text-sm">Configura los días de anticipación y corte.</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nombre del Ciclo</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-[#1a1f2e] border border-slate-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition placeholder:text-slate-600 font-medium" 
                                                placeholder="Ej: Pagos día 1 - Generar 5 días antes" 
                                                required 
                                                value={formData.nombre} 
                                                onChange={e => setFormData({...formData, nombre: e.target.value})}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            
                                            {/* FIELD 1: ANTICIPATION DAYS */}
                                            <div className="bg-[#1a1f2e] p-4 rounded-xl border border-slate-700 group focus-within:border-pink-500 transition relative">
                                                <label className="text-[10px] font-bold text-pink-500 uppercase flex items-center gap-2 mb-2">
                                                    <ClockIcon className="w-3 h-3"/> Días de Anticipación
                                                </label>
                                                <div className="flex items-baseline justify-between">
                                                    <input 
                                                        type="number" min="0" max="30"
                                                        className="w-20 bg-transparent border-b border-slate-600 text-3xl font-bold text-white focus:outline-none focus:border-pink-500 py-1 text-center"
                                                        value={formData.dias_antes_emision}
                                                        onChange={e => handleNumberChange('dias_antes_emision', e.target.value)}
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Días Antes</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-2">Generar factura antes del pago</p>
                                            </div>

                                            {/* FIELD 2: PAYMENT DAY */}
                                            <div className="bg-[#1a1f2e] p-4 rounded-xl border border-slate-700 group focus-within:border-indigo-500 transition relative">
                                                <label className="text-[10px] font-bold text-indigo-400 uppercase flex items-center gap-2 mb-2">
                                                    <CalendarDaysIcon className="w-3 h-3"/> Día de Pago
                                                </label>
                                                <div className="flex items-baseline justify-between">
                                                    <input 
                                                        type="number" min="1" max="31"
                                                        className="w-20 bg-transparent border-b border-slate-600 text-3xl font-bold text-white focus:outline-none focus:border-indigo-500 py-1 text-center"
                                                        value={formData.dia_pago}
                                                        onChange={e => handleNumberChange('dia_pago', e.target.value)}
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Del Mes</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-2">Fecha límite de pago</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="bg-[#1a1f2e] p-3 rounded-xl border border-slate-700 flex items-center justify-between px-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Días de Gracia</label>
                                                    <input 
                                                        type="number" min="0" 
                                                        className="bg-transparent text-xl font-bold text-white w-16 focus:outline-none mt-1" 
                                                        value={formData.dias_tolerancia} 
                                                        onChange={e => handleNumberChange('dias_tolerancia', e.target.value)}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">DÍAS</span>
                                            </div>

                                            <div className="bg-[#1a1f2e] p-3 rounded-xl border border-slate-700 flex items-center justify-between px-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Impuesto (IVA)</label>
                                                    <input 
                                                        type="number" min="0" 
                                                        className="bg-transparent text-xl font-bold text-white w-16 focus:outline-none mt-1" 
                                                        value={formData.impuesto} 
                                                        onChange={e => handleNumberChange('impuesto', e.target.value)}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">%</span>
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-4 p-4 bg-[#1a1f2e] rounded-xl border border-slate-700/50 cursor-pointer hover:bg-[#202636] transition group">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center border transition ${formData.recordatorio_whatsapp ? 'bg-pink-600 border-pink-500' : 'border-slate-600 bg-transparent'}`}>
                                                {formData.recordatorio_whatsapp && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={formData.recordatorio_whatsapp} 
                                                onChange={e => setFormData({...formData, recordatorio_whatsapp: e.target.checked})}
                                            />
                                            <div className="flex-1">
                                                <span className="block text-sm font-bold text-white group-hover:text-pink-400 transition">Notificaciones WhatsApp</span>
                                                <span className="text-xs text-slate-500">Enviar recordatorios automáticos.</span>
                                            </div>
                                        </label>

                                        <div className="pt-4 flex gap-4">
                                            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 hover:text-white font-bold text-sm transition">Cancelar</button>
                                            <button type="submit" disabled={isSubmitting} className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-pink-600/20 transition-all active:scale-95 text-sm">
                                                {isSubmitting ? 'Guardando...' : 'Guardar Ciclo'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* === SIMULATION (RIGHT) === */}
                                <div className="hidden md:flex w-[350px] bg-[#0b0e14] border-l border-slate-800 p-8 flex-col justify-center relative">
                                    <div className="absolute top-20 right-0 opacity-[0.03] pointer-events-none">
                                        <ShieldCheckIcon className="w-64 h-64 text-pink-500" />
                                    </div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-10 border-b border-slate-800 pb-4">Simulación Mensual</h4>
                                    
                                    <div className="relative pl-8 space-y-12">
                                        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-slate-800"></div>

                                        {/* Step 1: Calculated Generation */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-6 h-6 rounded-full border-4 border-[#0b0e14] bg-pink-600 shadow-[0_0_10px_rgba(219,39,119,0.4)] z-10"></div>
                                            <div>
                                                <span className="text-[9px] font-bold text-white bg-pink-600 px-1.5 py-0.5 rounded uppercase mb-1 inline-block">
                                                    {esMesAnterior ? 'Mes Anterior' : 'Generación'}
                                                </span>
                                                <p className="text-3xl font-bold text-white">Día {calcFechaGeneracion()}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {val(formData.dias_antes_emision)} días antes del pago.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 2: Payment */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-6 h-6 rounded-full border-4 border-[#0b0e14] bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)] z-10"></div>
                                            <div>
                                                <span className="text-[9px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded uppercase mb-1 inline-block">
                                                    {esMesAnterior ? 'Mes Actual' : 'Vencimiento'}
                                                </span>
                                                <p className="text-3xl font-bold text-white">Día {val(formData.dia_pago)}</p>
                                                <p className="text-xs text-slate-500 mt-1">Fecha límite.</p>
                                            </div>
                                        </div>

                                        {/* Step 3: Cutoff */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-6 h-6 rounded-full border-4 border-[#0b0e14] bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.4)] z-10"></div>
                                            <div>
                                                <span className="text-[9px] font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded uppercase mb-1 inline-block">Corte</span>
                                                <p className="text-3xl font-bold text-white">Día {calcFechaCorte()}</p>
                                                <p className="text-xs text-slate-500 mt-1">Suspensión automática.</p>
                                            </div>
                                        </div>
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
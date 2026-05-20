import { useState, useEffect, Fragment } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { 
    XMarkIcon, DocumentTextIcon, CalendarDaysIcon, 
    ClockIcon, ShieldCheckIcon, CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface FormState {
    nombre: string;
    dias_antes_emision: number | string;
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
    const [formData, setFormData] = useState<FormState>({
        nombre: '', dias_antes_emision: 5, dia_pago: 15, dias_tolerancia: 5, impuesto: 0, recordatorio_whatsapp: true, aviso_factura: 'whatsapp'
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                nombre: initialData.nombre,
                dias_antes_emision: initialData.dias_antes_emision,
                dia_pago: initialData.dia_pago,
                dias_tolerancia: initialData.dias_tolerancia,
                impuesto: initialData.impuesto,
                recordatorio_whatsapp: initialData.recordatorio_whatsapp,
                aviso_factura: initialData.aviso_factura || 'whatsapp'
            });
        } else {
            setFormData({ nombre: '', dias_antes_emision: 5, dia_pago: 15, dias_tolerancia: 5, impuesto: 0, recordatorio_whatsapp: true, aviso_factura: 'whatsapp' });
        }
    }, [initialData, isOpen]);

    const handleNumberChange = (field: keyof FormState, value: string) => {
        setFormData({ ...formData, [field]: value === '' ? '' : parseInt(value) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const loadingToast = toast.loading("Guardando...");
        try {
            const payload = {
                ...formData,
                dias_antes_emision: Number(formData.dias_antes_emision || 0),
                dia_pago: Number(formData.dia_pago || 0),
                dias_tolerancia: Number(formData.dias_tolerancia || 0),
                impuesto: Number(formData.impuesto || 0)
            };
            if (initialData?.id) {
                await client.put(`/configuracion/plantillas-facturacion/${initialData.id}`, payload);
                toast.success("Ciclo actualizado");
            } else {
                await client.post('/configuracion/plantillas-facturacion', payload);
                toast.success("Ciclo creado");
            }
            toast.dismiss(loadingToast);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.detail || "Error al guardar");
        } finally {
            setIsSubmitting(false);
        }
    };

    const val = (v: number | string) => Number(v || 0);
    const calcFechaGeneracion = () => {
        let dia = val(formData.dia_pago) - val(formData.dias_antes_emision);
        return dia <= 0 ? 30 + dia : dia;
    };
    const calcFechaCorte = () => {
        let dia = val(formData.dia_pago) + val(formData.dias_tolerancia);
        return dia > 30 ? dia - 30 : dia;
    };

    return (
        /* ✅ ADAPTADO: Backdrop y contenedor adaptativos */
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="bg-white dark:bg-[#0f1219] w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden transition-colors">
                                
                                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white z-10 transition-colors">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>

                                {/* FORM */}
                                <div className="flex-1 p-8 md:p-10">
                                    <div className="mb-8">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-pink-100 dark:bg-pink-600/20 rounded-lg border border-pink-200 dark:border-pink-500/30 transition-colors">
                                                <DocumentTextIcon className="w-6 h-6 text-pink-600 dark:text-pink-500" />
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white transition-colors">Nuevo Ciclo</h3>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nombre del Ciclo</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-sm focus:border-pink-500 outline-none transition-all placeholder:text-slate-400" 
                                                placeholder="Ej: Pagos día 15..." 
                                                required 
                                                value={formData.nombre} 
                                                onChange={e => setFormData({...formData, nombre: e.target.value})}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <InputNumber label="Anticipación" sub="DÍAS ANTES" value={formData.dias_antes_emision} onChange={(v: string) => handleNumberChange('dias_antes_emision', v)} color="pink" />
                                            <InputNumber label="Día de Pago" sub="DEL MES" value={formData.dia_pago} onChange={(v: string) => handleNumberChange('dia_pago', v)} color="indigo" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="bg-slate-50 dark:bg-[#1a1f2e] p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 transition-colors">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase block">Gracia</label>
                                                    <input type="number" className="bg-transparent text-lg font-black text-slate-900 dark:text-white w-16 focus:outline-none mt-1" value={formData.dias_tolerancia} onChange={e => handleNumberChange('dias_tolerancia', e.target.value)}/>
                                                </div>
                                                <span className="text-xs font-black text-slate-400">DÍAS</span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-[#1a1f2e] p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 transition-colors">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase block">IVA %</label>
                                                    <input type="number" className="bg-transparent text-lg font-black text-slate-900 dark:text-white w-16 focus:outline-none mt-1" value={formData.impuesto} onChange={e => handleNumberChange('impuesto', e.target.value)}/>
                                                </div>
                                                <span className="text-xs font-black text-slate-400">%</span>
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors">
                                            <input type="checkbox" className="w-5 h-5 rounded text-pink-600 focus:ring-pink-500" checked={formData.recordatorio_whatsapp} onChange={e => setFormData({...formData, recordatorio_whatsapp: e.target.checked})} />
                                            <span className="text-sm font-black text-slate-900 dark:text-white transition-colors">Notificaciones WhatsApp</span>
                                        </label>

                                        <button type="submit" disabled={isSubmitting} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black py-4 rounded-xl shadow-md transition-all active:scale-95">
                                            {isSubmitting ? 'Guardando...' : 'Guardar Ciclo'}
                                        </button>
                                    </form>
                                </div>

                                {/* SIMULATION */}
                                <div className="hidden md:flex w-[350px] bg-slate-50 dark:bg-[#0b0e14] border-l border-slate-200 dark:border-slate-800 p-8 flex-col justify-center relative transition-colors">
                                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-10 border-b border-slate-200 dark:border-slate-800 pb-4 transition-colors">Simulación Mensual</h4>
                                    
                                    <div className="relative pl-8 space-y-12">
                                        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-slate-200 dark:bg-slate-800 transition-colors"></div>
                                        <Step label="Generación" day={calcFechaGeneracion()} color="pink" />
                                        <Step label="Pago" day={val(formData.dia_pago)} color="indigo" />
                                        <Step label="Corte" day={calcFechaCorte()} color="rose" />
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

const InputNumber = ({ label, sub, value, onChange, color }: any) => (
    <div className="bg-slate-50 dark:bg-[#1a1f2e] p-4 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
        <label className={`text-[10px] font-black uppercase flex items-center gap-2 mb-2 ${color === 'pink' ? 'text-pink-600 dark:text-pink-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
            {label}
        </label>
        <div className="flex items-baseline justify-between">
            <input type="number" className="w-16 bg-transparent text-2xl font-black text-slate-900 dark:text-white outline-none" value={value} onChange={e => onChange(e.target.value)} />
            <span className="text-[10px] font-black text-slate-500 uppercase">{sub}</span>
        </div>
    </div>
);

const Step = ({ label, day, color }: any) => (
    <div className="relative">
        <div className={`absolute -left-[30px] top-0 w-6 h-6 rounded-full border-4 border-slate-50 dark:border-[#0b0e14] bg-${color}-500 transition-colors`}></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors">{label}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white transition-colors">Día {day}</p>
    </div>
);
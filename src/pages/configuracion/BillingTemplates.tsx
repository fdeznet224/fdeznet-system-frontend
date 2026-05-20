import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    PlusIcon, 
    DocumentTextIcon, 
    CalendarDaysIcon, 
    PencilSquareIcon, 
    TrashIcon, 
    ChatBubbleLeftRightIcon,
    ArrowLeftIcon,
    PaperAirplaneIcon,
    ShieldCheckIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import CreateTemplateModal from '../../components/modals/CreateTemplateModal';

export interface Plantilla {
    id: number;
    nombre: string;
    dias_antes_emision: number;
    dia_pago: number;
    dias_tolerancia: number;
    impuesto: number;
    recordatorio_whatsapp: boolean;
    aviso_factura?: string;
}

export default function BillingTemplates() {
    const navigate = useNavigate();
    const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Plantilla | null>(null);

    const fetchData = async () => {
        try {
            const res = await client.get('/configuracion/plantillas-facturacion');
            setPlantillas(res.data);
            setLoading(false);
        } catch (error) {
            toast.error("Error al cargar ciclos");
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Estás seguro? Esto afectará a los clientes asignados.")) return;
        try {
            await client.delete(`/configuracion/plantillas-facturacion/${id}`);
            toast.success("Ciclo eliminado");
            fetchData();
        } catch (error) {
            toast.error("No se pudo eliminar");
        }
    };

    const handleEdit = (item: Plantilla) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const getDiaGeneracion = (diaPago: number, diasAntes: number) => {
        let dia = diaPago - diasAntes;
        if (dia <= 0) dia = 30 + dia;
        return dia;
    };

    const getDiaCorte = (diaPago: number, tolerancia: number) => {
        let dia = diaPago + tolerancia;
        if(dia > 30) dia = dia - 30; 
        return dia;
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 p-4 transition-colors duration-300">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/admin/configuracion')} 
                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 transition-colors">
                            <DocumentTextIcon className="w-8 h-8 text-pink-600 dark:text-pink-500" /> 
                            Plantillas de Cobro
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Define ciclos de facturación.</p>
                    </div>
                </div>
                <button 
                    onClick={handleCreate}
                    className="bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 active:scale-95 font-black text-sm uppercase tracking-widest"
                >
                    <PlusIcon className="w-5 h-5" /> Nuevo Ciclo
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Cargando...</div>
                ) : plantillas.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/50 transition-colors">
                        <p className="text-slate-500 dark:text-slate-400 font-bold">No hay plantillas configuradas.</p>
                    </div>
                ) : (
                    plantillas.map((p) => {
                        const fechaGeneracion = getDiaGeneracion(p.dia_pago, p.dias_antes_emision);
                        const fechaCorte = getDiaCorte(p.dia_pago, p.dias_tolerancia);

                        return (
                            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-xl transition-all flex flex-col hover:border-pink-500/50">
                                
                                <div className="p-5 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-start bg-slate-50 dark:bg-slate-950/30 transition-colors">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white transition-colors">{p.nombre}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition-colors">
                                                IVA: {p.impuesto}%
                                            </span>
                                            {p.recordatorio_whatsapp && (
                                                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 transition-colors">
                                                    <ChatBubbleLeftRightIcon className="w-3 h-3" /> WhatsApp
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-pink-600 dark:text-pink-500 transition-colors">
                                        <CalendarDaysIcon className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="p-6 flex-1 bg-slate-50 dark:bg-[#0f172a] transition-colors">
                                    <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700/50 space-y-8 ml-2 transition-colors">
                                        
                                        <div className="relative">
                                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-pink-500 border-2 border-white dark:border-[#0f172a] shadow-sm"></div>
                                            <p className="text-[10px] text-pink-600 dark:text-pink-400 uppercase font-black tracking-widest mb-0.5">Generación</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white transition-colors">Día {fechaGeneracion}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">{p.dias_antes_emision} días de anticipación</p>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white dark:border-[#0f172a] shadow-sm"></div>
                                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-black tracking-widest mb-0.5">Pago</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white transition-colors">Día {p.dia_pago}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Vencimiento</p>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-[#0f1219] shadow-sm"></div>
                                            <p className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-black tracking-widest mb-0.5">Corte</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white transition-colors">Día {fechaCorte}</p>
                                            <p className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-800/50 inline-block px-1.5 py-0.5 rounded mt-1 font-bold transition-colors">
                                                +{p.dias_tolerancia} días gracia
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3 transition-colors">
                                    <button 
                                        onClick={() => handleEdit(p)}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" /> Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(p.id)}
                                        className="px-3 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-500 rounded-lg transition border border-rose-100 dark:border-rose-500/20 flex items-center justify-center"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <CreateTemplateModal 
                isOpen={isModalOpen} 
                onClose={handleClose} 
                onSuccess={fetchData}
                initialData={editingItem}
            />
        </div>
    );
}
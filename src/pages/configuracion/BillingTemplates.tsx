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

// 1. Interfaz
export interface Plantilla {
    id: number;
    nombre: string;
    dias_antes_emision: number; // Viene del backend (Ej: 5)
    dia_pago: number;           // Ej: 15
    dias_tolerancia: number;    // Ej: 5
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
            console.error(error);
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

    // === CÁLCULOS VISUALES (Igual que en el Modal) ===
    
    // Calcula la FECHA real de generación para mostrarla (Pago - Anticipación)
    const getDiaGeneracion = (diaPago: number, diasAntes: number) => {
        let dia = diaPago - diasAntes;
        if (dia <= 0) dia = 30 + dia; // Ajuste mes anterior
        return dia;
    };

    // Calcula la FECHA real de corte (Pago + Tolerancia)
    const getDiaCorte = (diaPago: number, tolerancia: number) => {
        let dia = diaPago + tolerancia;
        if(dia > 30) dia = dia - 30; 
        return dia;
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/admin/configuracion')} 
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <DocumentTextIcon className="w-8 h-8 text-pink-500" /> 
                            Plantillas de Cobro
                        </h2>
                        <p className="text-slate-400 mt-1 text-sm">Define ciclos de facturación.</p>
                    </div>
                </div>
                <button 
                    onClick={handleCreate}
                    className="bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-pink-600/20 font-bold transition flex items-center gap-2 active:scale-95"
                >
                    <PlusIcon className="w-5 h-5" /> Nuevo Ciclo
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-500 animate-pulse">Cargando...</div>
                ) : plantillas.map((p) => {
                    
                    // CALCULAMOS LAS FECHAS PARA MOSTRARLAS
                    const fechaGeneracion = getDiaGeneracion(p.dia_pago, p.dias_antes_emision);
                    const fechaCorte = getDiaCorte(p.dia_pago, p.dias_tolerancia);

                    return (
                        <div key={p.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl hover:border-pink-500/30 transition-all flex flex-col group">
                            
                            {/* Card Header */}
                            <div className="p-5 border-b border-slate-800/50 flex justify-between items-start bg-slate-950/30">
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">{p.nombre}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                            IVA: {p.impuesto}%
                                        </span>
                                        {p.recordatorio_whatsapp && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                <ChatBubbleLeftRightIcon className="w-3 h-3" /> WhatsApp
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-800 rounded-lg text-pink-500">
                                    <CalendarDaysIcon className="w-6 h-6" />
                                </div>
                            </div>

                            {/* Card Body (Línea de Tiempo) */}
                            <div className="p-6 flex-1 bg-[#0f172a]">
                                <div className="relative pl-6 border-l-2 border-slate-700/50 space-y-8 ml-2">
                                    
                                    {/* 1. Generación */}
                                    <div className="relative">
                                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-pink-500 border-2 border-slate-900 shadow-lg shadow-pink-500/40"></div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <PaperAirplaneIcon className="w-3 h-3 text-pink-400"/>
                                            <p className="text-[10px] text-pink-400 uppercase font-bold tracking-wider">Generación</p>
                                        </div>
                                        {/* Mostramos la FECHA calculada */}
                                        <p className="text-lg font-bold text-white">Día {fechaGeneracion}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3"/> {p.dias_antes_emision} días de anticipación
                                        </p>
                                    </div>

                                    {/* 2. Pago */}
                                    <div className="relative">
                                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-900 shadow-lg shadow-indigo-500/40"></div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <CalendarDaysIcon className="w-3 h-3 text-indigo-400"/>
                                            <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">Pago</p>
                                        </div>
                                        <p className="text-lg font-bold text-white">Día {p.dia_pago}</p>
                                        <p className="text-xs text-slate-500">Vencimiento</p>
                                    </div>

                                    {/* 3. Corte */}
                                    <div className="relative">
                                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-900 shadow-lg shadow-rose-500/40"></div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <ShieldCheckIcon className="w-3 h-3 text-rose-400"/>
                                            <p className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">Corte</p>
                                        </div>
                                        <p className="text-lg font-bold text-white">Día {fechaCorte}</p>
                                        <p className="text-xs text-slate-500 bg-slate-800/50 inline-block px-1.5 py-0.5 rounded mt-1">
                                            +{p.dias_tolerancia} días gracia
                                        </p>
                                    </div>

                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
                                <button 
                                    onClick={() => handleEdit(p)}
                                    className="flex-1 bg-transparent hover:bg-slate-800 text-slate-300 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600"
                                >
                                    <PencilSquareIcon className="w-4 h-4" /> Editar
                                </button>
                                <button 
                                    onClick={() => handleDelete(p.id)}
                                    className="px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition border border-rose-500/20 hover:border-rose-500/30 flex items-center justify-center"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
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
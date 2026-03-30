import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { 
    ChatBubbleLeftRightIcon, PlusIcon, PencilSquareIcon, 
    CheckCircleIcon, XCircleIcon, ArrowLeftIcon, LightBulbIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import CreateMessageModal from '../../components/modals/CreateMessageModal';

export default function Plantillas() {
    const navigate = useNavigate();
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para el modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await client.get('/configuracion/plantillas');
            setPlantillas(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (plantilla: any) => {
        setSelectedTemplate(plantilla);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedTemplate(null);
        setIsModalOpen(true);
    };

    // Mapeo de nombres técnicos a nombres bonitos
    const titulos: Record<string, string> = {
        'bienvenida': '👋 Mensaje de Bienvenida',
        'aviso_pago': '⏰ Recordatorio de Pago', // Coincide con backend
        'recordatorio_pago': '⏰ Recordatorio de Pago', // Compatibilidad
        'aviso_corte': '🚫 Aviso de Corte',
        'pago_exitoso': '✅ Confirmación de Pago',
        'aviso_factura': '📄 Nueva Factura Generada'
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/configuracion')} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <ChatBubbleLeftRightIcon className="w-8 h-8 text-emerald-500"/>
                            Plantillas de WhatsApp
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Configura los mensajes automáticos que enviará el Bot.
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-900/20 active:scale-95"
                >
                    <PlusIcon className="w-5 h-5"/> Crear Plantilla
                </button>
            </div>

            {/* Grid de Plantillas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-3 text-center py-12 text-slate-500 animate-pulse">Cargando plantillas...</div>
                ) : plantillas.length === 0 ? (
                    <div className="col-span-3 text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
                        <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto text-slate-600 mb-4 opacity-50"/>
                        <p className="text-slate-400 text-lg font-medium">No hay mensajes configurados.</p>
                        <button onClick={handleCreate} className="text-emerald-400 font-bold hover:text-emerald-300 transition mt-2">
                            + Crear Plantilla Ahora
                        </button>
                    </div>
                ) : (
                    plantillas.map((p) => (
                        <div key={p.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group shadow-lg flex flex-col hover:-translate-y-1">
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-white capitalize truncate pr-2">
                                            {titulos[p.tipo] || p.tipo.replace('_', ' ')}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {p.activo ? (
                                                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/> Activo
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">
                                                    <XCircleIcon className="w-3 h-3"/> Inactivo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleEdit(p)} className="p-2 bg-slate-700/50 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-xl transition shadow-sm border border-slate-700">
                                        <PencilSquareIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                                
                                {/* Vista previa del mensaje (Estilo WhatsApp Mejorado) */}
                                <div className="bg-[#0b141a] p-4 rounded-xl border border-slate-700/50 relative mt-2 flex-1 shadow-inner group-hover:border-slate-600/50 transition-colors">
                                    {/* Triángulo de burbuja */}
                                    <div className="absolute -top-1.5 left-4 w-3 h-3 bg-[#0b141a] border-t border-l border-slate-700/50 transform rotate-45"></div>
                                    
                                    <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap font-sans opacity-90">
                                        {/* 👇 LÓGICA DE RESALTADO: Detecta {variables} y las pinta de verde */}
                                        {p.texto.split(/({.*?})/).map((part: string, index: number) => 
                                            part.startsWith('{') && part.endsWith('}') ? 
                                            <span key={index} className="text-emerald-400 font-bold bg-emerald-500/10 rounded px-0.5">{part}</span> : 
                                            part
                                        )}
                                    </p>
                                    <div className="flex justify-end items-center gap-1 mt-2 opacity-50">
                                        <span className="text-[10px] text-slate-400">12:00 PM</span>
                                        <CheckCircleIcon className="w-3 h-3 text-blue-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Banner Informativo de Variables (Footer) */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 flex flex-col md:flex-row items-center gap-6 shadow-xl">
                <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                    <LightBulbIcon className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">Variables Dinámicas Disponibles</h3>
                    <p className="text-sm text-slate-400 mb-4 max-w-3xl">
                        Usa estos códigos en tus mensajes. El sistema los reemplazará automáticamente con la información real de cada cliente al momento de enviar.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {['{nombre}', '{plan}', '{precio}', '{dia_corte}', '{ip}', '{direccion}', '{empresa}', '{fecha_actual}'].map(tag => (
                            <span key={tag} className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-emerald-400 font-medium select-all hover:border-emerald-500/50 transition cursor-help" title="Clic para copiar">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <CreateMessageModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchData}
                initialData={selectedTemplate}
            />
        </div>
    );
}
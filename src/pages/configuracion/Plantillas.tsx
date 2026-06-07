import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    ChatBubbleLeftRightIcon, PlusIcon, PencilSquareIcon, 
     XCircleIcon, ArrowLeftIcon, SparklesIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import CreateMessageModal from '../../components/modals/CreateMessageModal';

export default function Plantillas() {
    const navigate = useNavigate();
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
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

    useEffect(() => { fetchData(); }, []);

    const handleEdit = (plantilla: any) => {
        setSelectedTemplate(plantilla);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedTemplate(null);
        setIsModalOpen(true);
    };

    // 🔥 AQUÍ SE AGREGÓ EL RECORDATORIO AMIGABLE 🔥
    const titulos: Record<string, string> = {
        'bienvenida': '👋 Mensaje de Bienvenida',
        'nueva_factura': '📄 Nueva Factura Generada',
        'recordatorio_pago': '🔔 Recordatorio Amigable (Previo)', // 👈 NUEVO EVENTO
        'pago_recibido': '✅ Pago Recibido (Adjunta PDF)',
        'abono_recibido': '💸 Abono Parcial Recibido',
        'aviso_corte': '🚫 Corte por Falta de Pago',
        'corte_servicio': '🛠️ Suspensión Administrativa',
        'reconexion': '🚀 Reconexión de Servicio',
        'promesa_pago': '🤝 Promesa de Pago Registrada'
    };

    // Colección visual para el pie de página
    const diccionario = [
        { tag: '{nombre}', desc: 'Nombre del cliente' }, { tag: '{cedula}', desc: 'Contrato/ID' },
        { tag: '{plan}', desc: 'Paquete de Fibra' }, { tag: '{velocidad}', desc: 'Ej: 50 Megas' },
        { tag: '{precio}', desc: 'Mensualidad' }, { tag: '{dia_corte}', desc: 'Día de Factura' },
        { tag: '{dia_final}', desc: 'Día de Corte Real' }, { tag: '{mes_actual}', desc: 'Mes escrito' },
        { tag: '{zona}', desc: 'Sector o Colonia' }, { tag: '{monto_pagado}', desc: 'Cobro en Caja' },
        { tag: '{saldo_favor}', desc: 'Dinero Sobrante' }, { tag: '{monto_promesa}', desc: 'Deuda a pagar' },
        { tag: '{fecha_limite_promesa}', desc: 'Día límite de la prórroga' }, { tag: '{referencia}', desc: 'Folio o Detalle' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10 p-4 md:p-6 max-w-7xl mx-auto transition-colors duration-300">
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={() => navigate('/admin/configuracion')} className="p-2 bg-slate-100 dark:bg-[#161822] rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 transition-colors truncate">
                            <ChatBubbleLeftRightIcon className="w-6 h-6 md:w-8 md:h-8 text-emerald-600 dark:text-emerald-500 shrink-0"/>
                            Plantillas de WhatsApp
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1 truncate">Configura los mensajes automáticos y variables del Bot.</p>
                    </div>
                </div>
                <button onClick={handleCreate} className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black transition-all shadow-md active:scale-95 uppercase tracking-widest text-xs shrink-0">
                    <PlusIcon className="w-5 h-5"/> Crear Plantilla
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-12 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Cargando plantillas...</div>
                ) : plantillas.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-16 bg-white dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed transition-colors">
                        <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4 opacity-50"/>
                        <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">No hay mensajes configurados.</p>
                        <button onClick={handleCreate} className="text-emerald-600 dark:text-emerald-400 font-black hover:text-emerald-700 transition mt-2 uppercase tracking-widest text-xs">
                            + Crear Plantilla Ahora
                        </button>
                    </div>
                ) : (
                    plantillas.map((p) => (
                        <div key={p.id} className="bg-white dark:bg-[#0b0c10] rounded-3xl border border-slate-200 dark:border-slate-800/80 overflow-hidden group hover:border-emerald-500/40 transition-all duration-300 shadow-sm flex flex-col">
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white capitalize truncate pr-2 transition-colors">
                                            {titulos[p.tipo] || p.tipo.replace('_', ' ')}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {p.activo ? (
                                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"/> Activo
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                    <XCircleIcon className="w-3 h-3"/> Inactivo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleEdit(p)} className="p-2 bg-slate-50 dark:bg-[#161822] hover:bg-emerald-600 text-slate-400 hover:text-white rounded-xl transition shadow-sm border border-slate-200 dark:border-slate-800/80 active:scale-90">
                                        <PencilSquareIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                                
                                <div className="bg-slate-50 dark:bg-[#161822] p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 relative mt-2 flex-1 shadow-inner transition-colors">
                                    <div className="absolute -top-1.5 left-5 w-3 h-3 bg-slate-50 dark:bg-[#161822] border-t border-l border-slate-200/60 dark:border-slate-800/60 transform rotate-45 transition-colors"></div>
                                    
                                    <p className="text-[13px] text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium transition-colors break-words">
                                        {p.texto.split(/({.*?})/).map((part: string, index: number) => 
                                            part.startsWith('{') && part.endsWith('}') ? 
                                            <span key={index} className="text-emerald-700 dark:text-emerald-400 font-black bg-emerald-100 dark:bg-emerald-500/10 rounded px-1 text-xs py-0.5 mx-0.5 transition-colors">{part}</span> : 
                                            part
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Banner Informativo Consolidado */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0b0c10] dark:to-[#111218] rounded-3xl p-6 md:p-8 flex flex-col items-center text-center shadow-xl border border-slate-700 dark:border-slate-800/80 transition-colors mt-10">
                <div className="p-3 bg-emerald-500/20 rounded-2xl mb-4 border border-emerald-500/30">
                    <SparklesIcon className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Diccionario Inteligente de Variables</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-2xl leading-relaxed">
                    Estas etiquetas inyectan información real en el momento del envío. 
                    Al crear o editar una plantilla podrás ver el listado detallado de su función.
                </p>
                
                <div className="flex flex-wrap gap-2.5 justify-center max-w-4xl">
                    {diccionario.map(v => (
                        <div key={v.tag} className="px-3 py-1.5 bg-slate-800/50 dark:bg-slate-900/50 border border-slate-700 dark:border-slate-800 rounded-xl flex items-center gap-2 group cursor-help transition-colors hover:border-emerald-500/50" title={v.desc}>
                            <span className="text-[11px] font-mono font-black text-emerald-400 group-hover:text-emerald-300 transition-colors">{v.tag}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{v.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            <CreateMessageModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchData}
                initialData={selectedTemplate}
            />
        </div>
    );
}
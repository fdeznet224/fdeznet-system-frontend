import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    Cog6ToothIcon, BellAlertIcon, ScissorsIcon, 
    CheckCircleIcon, ArrowLeftIcon, ClockIcon, 
    CalendarDaysIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface ConfigSistema {
    id: number;
    activar_corte_automatico: boolean;
    activar_notificaciones: boolean;
    aviso_pantalla_corte: boolean;
    dia_generacion_factura: number; 
    generar_facturas_automaticamente: boolean;
    hora_ejecucion_corte: string;
    hora_generacion_facturas: string; // 👈 NUEVO
    hora_recordatorios: string;       // 👈 NUEVO
    recordatorio_1_dias: number;
    recordatorio_2_dias: number;
    recordatorio_3_dias: number;
    telefonos_alerta: string;
}

export default function Sistema() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [config, setConfig] = useState<ConfigSistema>({
        id: 0,
        activar_corte_automatico: true,
        activar_notificaciones: true,
        aviso_pantalla_corte: false,
        dia_generacion_factura: 1, 
        generar_facturas_automaticamente: true,
        hora_ejecucion_corte: "03:00",
        hora_generacion_facturas: "06:00", // 👈 VALOR POR DEFECTO
        hora_recordatorios: "09:00",       // 👈 VALOR POR DEFECTO
        recordatorio_1_dias: 5,
        recordatorio_2_dias: 1,
        recordatorio_3_dias: 0,
        telefonos_alerta: ""
    });

    useEffect(() => { cargarConfig(); }, []);

    const cargarConfig = async () => {
        setLoading(true);
        try {
            const res = await client.get('/configuracion/sistema');
            if (res.data) setConfig(res.data);
        } catch (error) { 
            toast.error("Error cargando configuración"); 
        } finally {
            setLoading(false);
        }
    };

    const guardarCambios = async () => {
        setSaving(true);
        try {
            await client.put('/configuracion/sistema', config);
            toast.success("¡Configuración guardada!");
        } catch (error) { 
            toast.error("Error al guardar cambios"); 
        } finally { 
            setSaving(false); 
        }
    };

    const handleChange = (campo: keyof ConfigSistema, valor: any) => {
        setConfig(prev => ({ ...prev, [campo]: valor }));
    };

    if (loading) return <div className="flex justify-center h-96 items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32 p-4 transition-colors duration-300">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6 transition-colors">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                        <Cog6ToothIcon className="w-6 sm:w-6 h-6 text-purple-600 dark:text-purple-500" />
                        Sistema & Cronjobs
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Configuración global del servidor.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                
                {/* COLUMNA IZQUIERDA */}
                <div className="space-y-6">
                    {/* TARJETA CORTES */}
                    <div className="bg-white dark:bg-[#0f1219] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
                            <ScissorsIcon className="w-40 h-40 -rotate-12 text-rose-500"/>
                        </div>
                        <h2 className="text-lg font-black mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                            <ScissorsIcon className="w-5 h-5 text-rose-500"/> Suspensión de Servicio
                        </h2>
                        <div className="space-y-5 relative z-10">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#151b2b] rounded-xl border border-slate-200 dark:border-slate-800">
                                <div>
                                    <label className="font-black block text-slate-900 dark:text-white text-sm">Activar Corte Automático</label>
                                    <p className="text-xs text-slate-500 mt-1">Suspender clientes con facturas vencidas.</p>
                                </div>
                                <Toggle checked={config.activar_corte_automatico} onChange={(v: any) => handleChange('activar_corte_automatico', v)} color="rose" />
                            </div>
                            
                            <div className={`p-4 bg-slate-50 dark:bg-[#151b2b] rounded-xl border border-slate-200 dark:border-slate-800 transition-all ${!config.activar_corte_automatico ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="font-black block text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                                    <ClockIcon className="w-4 h-4 text-slate-500"/> Hora de Ejecución (Cronjob)
                                </label>
                                <input type="time" className="w-full bg-slate-100 dark:bg-[#0b0e14] border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white font-black outline-none focus:border-rose-500 transition text-center tracking-widest"
                                    value={config.hora_ejecucion_corte || ''} onChange={e => handleChange('hora_ejecucion_corte', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* TARJETA FACTURACIÓN */}
                    <div className="bg-white dark:bg-[#0f1219] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
                         <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                            <CalendarDaysIcon className="w-5 h-5 text-purple-600 dark:text-purple-500"/>
                            Automatización de Facturas
                        </h2>
                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#151b2b] rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="pr-4">
                                    <label className="font-black block text-slate-900 dark:text-white text-sm">Motor de Facturación</label>
                                    <p className="text-xs text-slate-500 mt-1">Generar recibos automáticamente.</p>
                                </div>
                                <Toggle checked={config.generar_facturas_automaticamente} onChange={(v: any) => handleChange('generar_facturas_automaticamente', v)} color="purple" />
                            </div>

                            {/* 🔥 NUEVO: HORA DE FACTURAS 🔥 */}
                            <div className={`p-4 bg-slate-50 dark:bg-[#151b2b] rounded-xl border border-slate-200 dark:border-slate-800 transition-all ${!config.generar_facturas_automaticamente ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="font-black block text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                                    <ClockIcon className="w-4 h-4 text-slate-500"/> Hora de Generación (Cronjob)
                                </label>
                                <input type="time" className="w-full bg-slate-100 dark:bg-[#0b0e14] border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white font-black outline-none focus:border-purple-500 transition text-center tracking-widest"
                                    value={config.hora_generacion_facturas || ''} onChange={e => handleChange('hora_generacion_facturas', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="bg-white dark:bg-[#0f1219] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl relative overflow-hidden flex flex-col h-full transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
                        <BellAlertIcon className="w-64 h-64 -rotate-12 text-emerald-500"/>
                    </div>
                    
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h2 className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                            <BellAlertIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500"/> Notificaciones
                        </h2>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#151b2b] px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
                            <span className={`text-[10px] font-black uppercase hidden sm:block ${config.activar_notificaciones ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                {config.activar_notificaciones ? 'Activo' : 'Off'}
                            </span>
                            <Toggle checked={config.activar_notificaciones} onChange={(v: any) => handleChange('activar_notificaciones', v)} color="emerald" />
                        </div>
                    </div>

                    <div className={`space-y-4 relative z-10 transition-all ${!config.activar_notificaciones ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="p-4 bg-emerald-50 dark:bg-[#0a271d] border border-emerald-200 dark:border-emerald-900/50 rounded-xl mb-4 flex items-start gap-3 transition-colors">
                            <ShieldCheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5"/>
                            <p className="text-xs text-slate-600 dark:text-emerald-200/80 leading-relaxed font-medium">El bot enviará los recordatorios y facturas a los clientes automáticamente.</p>
                        </div>

                        {/* 🔥 NUEVO: HORA DE MENSAJES 🔥 */}
                        <div className="p-4 bg-slate-50 dark:bg-[#151b2b] rounded-xl border border-slate-200 dark:border-slate-800 transition-colors mb-6">
                            <label className="font-black block text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-slate-500"/> Hora de Envío de Mensajes
                            </label>
                            <input type="time" className="w-full bg-slate-100 dark:bg-[#0b0e14] border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white font-black outline-none focus:border-emerald-500 transition text-center tracking-widest"
                                value={config.hora_recordatorios || ''} onChange={e => handleChange('hora_recordatorios', e.target.value)} />
                        </div>

                        <CardInputRight label="1er Aviso (Preventivo)" sub="DÍAS ANTES (Oculto en masivo)" value={config.recordatorio_1_dias} onChange={(v: any) => handleChange('recordatorio_1_dias', Number(v))} textColor="text-blue-600 dark:text-blue-400" />
                        <CardInputRight label="2do Aviso (Urgente)" sub="DÍAS ANTES" value={config.recordatorio_2_dias} onChange={(v: any) => handleChange('recordatorio_2_dias', Number(v))} textColor="text-amber-600 dark:text-amber-400" />
                        <CardInputRight label="3er Aviso (Corte)" sub="0 = DESACTIVADO" value={config.recordatorio_3_dias} onChange={(v: any) => handleChange('recordatorio_3_dias', Number(v))} textColor="text-rose-600 dark:text-rose-400" />
                        
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Números WhatsApp para Alertas FdezNet</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 dark:bg-[#0b0e14] border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white font-mono text-sm outline-none focus:border-emerald-500 transition-colors"
                                placeholder="5219611234567,521..."
                                value={config.telefonos_alerta || ''} 
                                onChange={e => handleChange('telefonos_alerta', e.target.value)} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Flotante */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none p-4">
                <div className="pointer-events-auto bg-white/90 dark:bg-[#0f1219]/90 backdrop-blur-md p-2 pl-4 sm:pl-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl flex gap-4 sm:gap-6 items-center transition-colors">
                    <span className="text-[10px] sm:text-xs font-black text-slate-500 hidden sm:block uppercase">Cambios pendientes</span>
                    <button onClick={guardarCambios} disabled={saving} className="bg-purple-600 hover:bg-purple-500 text-white font-black py-3 px-6 sm:px-8 rounded-xl shadow-md active:scale-95 transition flex items-center gap-2 text-xs sm:text-sm uppercase tracking-widest w-full sm:w-auto justify-center">
                        {saving ? 'Guardando...' : <><CheckCircleIcon className="w-5 h-5"/> Guardar</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

const Toggle = ({ checked, onChange, color = 'emerald' }: any) => {
    const colors: any = { emerald: 'bg-emerald-500', rose: 'bg-rose-500', purple: 'bg-purple-600', slate: 'bg-slate-400' };
    return (
        <div onClick={() => onChange(!checked)} className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${checked ? colors[color] : 'bg-slate-300 dark:bg-slate-700'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    );
};

const CardInputRight = ({ label, sub, value, onChange, textColor }: any) => (
    <div className="bg-slate-50 dark:bg-[#151b2b] p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between transition-colors">
        <div className="pr-2">
            <label className={`text-xs sm:text-sm font-black block ${textColor || 'text-slate-900 dark:text-white'}`}>{label}</label>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black leading-tight">{sub}</p>
        </div>
        <div className="relative flex items-center shrink-0">
            <input type="number" className="w-14 sm:w-16 bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 text-slate-900 dark:text-white font-mono text-center text-base sm:text-lg font-black outline-none focus:border-purple-500 transition-colors" value={value || 0} onChange={e => onChange(e.target.value)} />
        </div>
    </div>
);
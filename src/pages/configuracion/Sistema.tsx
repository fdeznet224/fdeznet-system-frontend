import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    Cog6ToothIcon, BellAlertIcon, ScissorsIcon, 
    CheckCircleIcon,
    ArrowLeftIcon, ClockIcon, CalendarDaysIcon, ShieldCheckIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

interface ConfigSistema {
    id: number;
    activar_corte_automatico: boolean;
    activar_notificaciones: boolean;
    aviso_pantalla_corte: boolean;
    dia_generacion_factura: number; // Lo mantenemos oculto
    generar_facturas_automaticamente: boolean;
    hora_ejecucion_corte: string;
    recordatorio_1_dias: number;
    recordatorio_2_dias: number;
    recordatorio_3_dias: number;
}

export default function Sistema() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Estado inicial
    const [config, setConfig] = useState<ConfigSistema>({
        id: 0,
        activar_corte_automatico: true,
        activar_notificaciones: true,
        aviso_pantalla_corte: false,
        dia_generacion_factura: 1, 
        generar_facturas_automaticamente: true,
        hora_ejecucion_corte: "03:00",
        recordatorio_1_dias: 3,
        recordatorio_2_dias: 1,
        recordatorio_3_dias: 0
    });

    useEffect(() => {
        cargarConfig();
    }, []);

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
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Cog6ToothIcon className="w-6 h-6 text-purple-500" />
                        Sistema & Cronjobs
                    </h1>
                    <p className="text-slate-400 text-sm">Configuración global del servidor.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* === COLUMNA IZQUIERDA: CORTES === */}
                <div className="space-y-6">
                    
                    {/* Tarjeta: Suspensión */}
                    <div className="bg-[#0f1219] rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                            <ScissorsIcon className="w-40 h-40 -rotate-12 text-rose-500"/>
                        </div>
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
                            <ScissorsIcon className="w-5 h-5 text-rose-500"/>
                            Suspensión de Servicio
                        </h2>
                        <div className="space-y-5 relative z-10">
                            {/* Corte Automático */}
                            <div className="flex items-center justify-between p-4 bg-[#151b2b] rounded-xl border border-slate-800">
                                <div>
                                    <label className="font-bold block text-white text-sm">Activar Corte Automático</label>
                                    <p className="text-xs text-slate-500 mt-1">Suspender clientes con facturas vencidas.</p>
                                </div>
                                <Toggle checked={config.activar_corte_automatico} onChange={(v) => handleChange('activar_corte_automatico', v)} color="rose" />
                            </div>
                            {/* Hora Cronjob */}
                            <div className="p-4 bg-[#151b2b] rounded-xl border border-slate-800">
                                <label className="font-bold block text-white text-sm mb-3 flex items-center gap-2">
                                    <ClockIcon className="w-4 h-4 text-slate-400"/> Hora de Ejecución (Cronjob)
                                </label>
                                <div className="relative">
                                    <input type="time" className="w-full bg-[#0b0e14] border border-slate-700 rounded-lg p-3 text-white text-xl font-bold outline-none focus:border-rose-500 transition text-center tracking-widest"
                                        value={config.hora_ejecucion_corte} onChange={e => handleChange('hora_ejecucion_corte', e.target.value)} />
                                </div>
                            </div>
                            {/* Aviso Navegador */}
                            <div className="flex items-center justify-between p-4 bg-[#151b2b] rounded-xl border border-slate-800">
                                <div>
                                    <label className="font-bold block text-white text-sm">Aviso de Corte en Navegador</label>
                                    <span className="text-xs text-slate-500">Requiere Web Proxy en MikroTik</span>
                                </div>
                                <Toggle checked={config.aviso_pantalla_corte} onChange={(v) => handleChange('aviso_pantalla_corte', v)} color="slate" />
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta: Automatización Facturas (LIMPIA) */}
                    <div className="bg-[#0f1219] rounded-2xl p-6 border border-slate-800 shadow-xl">
                         <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                            <CalendarDaysIcon className="w-5 h-5 text-purple-500"/>
                            Automatización de Facturas
                        </h2>
                        
                        <div className="space-y-4">
                            {/* Switch Principal */}
                            <div className="flex items-center justify-between p-4 bg-[#151b2b] rounded-xl border border-slate-800">
                                <div>
                                    <label className="font-bold block text-white text-sm">Motor de Facturación</label>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Generar recibos automáticamente respetando la plantilla de cada cliente.
                                    </p>
                                </div>
                                <Toggle checked={config.generar_facturas_automaticamente} onChange={(v) => handleChange('generar_facturas_automaticamente', v)} color="purple" />
                            </div>

                            {/* Nota Informativa (Sin Inputs confusos) */}
                            {config.generar_facturas_automaticamente && (
                                <div className="flex gap-3 p-3 bg-purple-900/10 border border-purple-500/20 rounded-lg">
                                    <BoltIcon className="w-5 h-5 text-purple-500 shrink-0" />
                                    <p className="text-xs text-purple-200/80 leading-relaxed">
                                        El sistema revisará <strong>diariamente</strong> qué clientes cumplen con su ciclo de facturación y generará sus recibos.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* === COLUMNA DERECHA: NOTIFICACIONES === */}
                <div className="bg-[#0f1219] rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col h-full">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                        <BellAlertIcon className="w-64 h-64 -rotate-12 text-emerald-500"/>
                    </div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                            <BellAlertIcon className="w-5 h-5 text-emerald-500"/> Notificaciones
                        </h2>
                        <div className="flex items-center gap-2 bg-[#151b2b] px-3 py-1.5 rounded-full border border-slate-800">
                            <span className={`text-[10px] font-bold uppercase ${config.activar_notificaciones ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {config.activar_notificaciones ? 'Activo' : 'Off'}
                            </span>
                            <Toggle checked={config.activar_notificaciones} onChange={(v) => handleChange('activar_notificaciones', v)} color="emerald" />
                        </div>
                    </div>

                    <div className={`space-y-4 relative z-10 transition-all duration-300 ${!config.activar_notificaciones ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="p-4 bg-[#0a271d] border border-emerald-900/50 rounded-xl mb-6 flex items-start gap-3">
                            <ShieldCheckIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"/>
                            <p className="text-xs text-emerald-200/80 leading-relaxed">El bot enviará recordatorios automáticamente.</p>
                        </div>
                        <CardInputRight label="1er Aviso (Preventivo)" sub="DÍAS ANTES DEL CORTE" value={config.recordatorio_1_dias} onChange={(v: any) => handleChange('recordatorio_1_dias', Number(v))} textColor="text-blue-400" />
                        <CardInputRight label="2do Aviso (Urgente)" sub="DÍAS ANTES DEL CORTE" value={config.recordatorio_2_dias} onChange={(v: any) => handleChange('recordatorio_2_dias', Number(v))} textColor="text-amber-400" />
                        <CardInputRight label="3er Aviso (Día de Corte)" sub="0 = EL MISMO DÍA DEL CORTE" value={config.recordatorio_3_dias} onChange={(v: any) => handleChange('recordatorio_3_dias', Number(v))} textColor="text-rose-400" />
                    </div>
                </div>
            </div>

            {/* Footer Flotante */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
                <div className="pointer-events-auto bg-[#0f1219]/90 backdrop-blur-md p-2 pl-6 rounded-2xl border border-slate-700 shadow-2xl flex gap-6 items-center">
                    <span className="text-xs text-slate-400 hidden sm:block">¿Terminaste de editar?</span>
                    <button onClick={guardarCambios} disabled={saving} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-purple-600/20 active:scale-95 transition flex items-center gap-2 text-sm">
                        {saving ? 'Guardando...' : <><CheckCircleIcon className="w-5 h-5"/> Guardar Cambios</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Subcomponentes
const Toggle = ({ checked, onChange, color = 'emerald' }: any) => {
    const colors: any = { emerald: 'bg-emerald-500', rose: 'bg-rose-500', purple: 'bg-purple-600', slate: 'bg-slate-600' };
    return (
        <div onClick={() => onChange(!checked)} className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? colors[color] : 'bg-slate-700'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    );
};

const CardInputRight = ({ label, sub, value, onChange, textColor }: any) => (
    <div className="bg-[#151b2b] p-4 rounded-xl border border-slate-800 flex items-center justify-between group focus-within:border-slate-600 transition">
        <div>
            <label className={`text-sm font-bold block ${textColor || 'text-white'}`}>{label}</label>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide font-bold">{sub}</p>
        </div>
        <div className="relative flex items-center">
            <input type="number" className="w-16 bg-[#0b0e14] border border-slate-700 rounded-lg py-2 px-3 text-white font-mono text-center text-lg font-bold outline-none focus:border-purple-500 transition" value={value} onChange={e => onChange(e.target.value)} />
            <span className="text-[9px] text-slate-500 font-bold absolute -right-5 rotate-90 w-8 text-center pointer-events-none">DÍAS</span>
        </div>
    </div>
);
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    DevicePhoneMobileIcon, ArrowPathIcon, CheckBadgeIcon, TrashIcon, 
    ShieldCheckIcon, BoltIcon, ClockIcon, PlayCircleIcon, PowerIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

export default function WhatsappConfig() {
    const [status, setStatus] = useState<any>({ connected: false, qr: null, active: false });
    const [loading, setLoading] = useState(true);
    const [reloading, setReloading] = useState(false);
    const [intervaloGlobal, setIntervaloGlobal] = useState(60);
    const [guardandoConfig, setGuardandoConfig] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const resConfig = await client.get('/whatsapp/configuracion');
                setIntervaloGlobal(resConfig.data.intervalo_default);
                await checkStatus();
            } catch (e) { console.error(e); }
        };
        init();

        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        try {
            const res = await client.get('/whatsapp/status');
            if (JSON.stringify(res.data) !== JSON.stringify(status)) {
                setStatus(res.data);
            }
        } catch (error) { 
            setStatus({ connected: false, qr: null, active: false });
        } 
        finally { setLoading(false); }
    };

    const handleIniciarMotor = async () => {
        setReloading(true);
        const loadToast = toast.loading("Encendiendo motor de enlace...");
        try {
            await client.post('/whatsapp/init');
            toast.success("Motor activo. Esperando WhatsApp...", { id: loadToast });
            setTimeout(checkStatus, 2000);
        } catch (error) {
            toast.error("No se pudo encender el motor", { id: loadToast });
        } finally {
            setReloading(false);
        }
    };

    const handleLogout = async () => {
        if(!confirm("¿Estás seguro de desvincular la sesión y apagar el motor?")) return;
        setReloading(true);
        const loadToast = toast.loading("Cerrando sesión...");
        try {
            await client.post('/whatsapp/logout');
            setStatus({ connected: false, qr: null, active: false });
            toast.success("Servicio desactivado exitosamente", { id: loadToast });
        } catch (error) { 
            toast.error("Error al desactivar el servicio", { id: loadToast });
        } finally {
            setReloading(false);
        }
    };

    const guardarVelocidad = async (segundos: number) => {
        setGuardandoConfig(true);
        setIntervaloGlobal(segundos);
        try {
            await client.post('/whatsapp/configuracion', { intervalo_segundos: segundos });
            toast.success(`Velocidad actualizada: ${segundos}s`);
        } catch (error) { toast.error("Error al guardar la configuración"); } 
        finally { setGuardandoConfig(false); }
    };

    const styleMap: any = {
        indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400' }
    };

    return (
        <div className="max-w-6xl mx-auto p-2 sm:p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28">
            
            <div className="bg-white dark:bg-[#0f1219] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[500px] transition-colors w-full">
                
                {/* --- COLUMNA IZQUIERDA: GESTIÓN DE CONEXIÓN --- */}
                <div className="flex-1 p-4 sm:p-8 lg:p-10 flex flex-col relative transition-colors w-full">
                    
                    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                        <div className={`p-2.5 sm:p-3 rounded-2xl shadow-sm shrink-0 ${status.connected ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            <DevicePhoneMobileIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Motor WhatsApp</h2>
                            <p className="text-[10px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-widest">{status.active ? 'Servicio en Ejecución' : 'Servicio en Reposo'}</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center w-full">
                        {!status.active ? (
                            <div className="flex flex-col items-center justify-center text-center w-full max-w-sm mx-auto animate-in fade-in zoom-in duration-500 px-2">
                                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner border border-slate-200 dark:border-slate-700 relative">
                                    <PowerIcon className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500" />
                                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 w-3 h-3 sm:w-4 sm:h-4 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)] border-2 border-white dark:border-slate-800"></div>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 sm:mb-3">Motor Desactivado</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed px-2">
                                    El enlace con WhatsApp está apagado. Enciende el servicio para sincronizar tu cuenta.
                                </p>
                                <button onClick={handleIniciarMotor} disabled={reloading} className="w-full sm:w-auto px-6 py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black flex justify-center items-center gap-2 sm:gap-3 transition-all active:scale-95 shadow-lg shadow-indigo-600/30 disabled:opacity-50 text-sm sm:text-base">
                                    {reloading ? <ArrowPathIcon className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <PlayCircleIcon className="w-6 h-6 sm:w-7 sm:h-7" />}
                                    ENCENDER SERVICIO
                                </button>
                            </div>
                        ) : status.connected ? (
                            <div className="w-full max-w-sm mx-auto animate-in fade-in zoom-in duration-500">
                                {/* Se redujo el padding de p-8 a p-5 en móvil */}
                                <div className="bg-slate-50 dark:bg-[#151b2b] border border-slate-200 dark:border-emerald-500/30 rounded-3xl p-5 sm:p-8 text-center shadow-lg relative overflow-hidden w-full">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-emerald-500/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-slate-200 dark:border-emerald-500/20 shadow-sm">
                                        <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span></span>
                                        <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">En Línea</span>
                                    </div>
                                    
                                    <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto bg-emerald-500 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] border-4 border-white dark:border-[#151b2b]">
                                        <CheckBadgeIcon className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                                    </div>
                                    
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1 sm:mb-2">Sesión Enlazada</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-6 sm:mb-10 px-2">Tu número está listo para operar.</p>
                                    
                                    {/* Botón adaptativo: texto más pequeño y padding ajustado en celular */}
                                    <button onClick={handleLogout} disabled={reloading} className="w-full py-3 sm:py-4 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all rounded-xl sm:rounded-2xl border border-rose-200 dark:border-rose-500/20 active:scale-95 px-2">
                                        {reloading ? <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"/> : <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
                                        DESVINCULAR Y APAGAR
                                    </button>
                                </div>
                            </div>
                        ) : status.qr ? (
                            <div className="flex flex-col items-center w-full animate-in fade-in duration-500">
                                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 sm:mb-6 text-center px-4">Escanea este código con tu WhatsApp:</p>
                                <div className="bg-white p-3 sm:p-6 rounded-3xl sm:rounded-[2rem] shadow-xl border-[4px] sm:border-[8px] border-slate-100 dark:border-slate-800">
                                    <QRCode value={status.qr} size={220} level="M" className="w-[200px] h-[200px] sm:w-[260px] sm:h-[260px]" />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-6 sm:p-10 flex flex-col items-center">
                                <ArrowPathIcon className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-500 animate-spin mb-4 sm:mb-6" />
                                <p className="text-sm sm:text-base text-slate-500 font-bold animate-pulse">Generando código QR...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- COLUMNA DERECHA: CONFIGURACIÓN --- */}
                <div className="w-full lg:w-96 xl:w-[450px] bg-slate-50 dark:bg-[#151b2b] p-4 sm:p-8 lg:p-10 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col transition-colors">
                    
                    <div className="mb-6 sm:mb-8">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" /> Ritmo de Envío
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 sm:mt-2 font-medium leading-relaxed">
                            Ajusta la velocidad del carril automático para evitar bloqueos por SPAM.
                        </p>
                    </div>

                    <div className="space-y-3 sm:space-y-4 flex-1">
                        {[
                            { time: 180, label: "Modo Seguro", sub: "3 MINUTOS", icon: ShieldCheckIcon, color: "indigo", desc: "Recomendado para campañas masivas." },
                            { time: 60, label: "Modo Normal", sub: "1 MINUTO", icon: ClockIcon, color: "emerald", desc: "Balance ideal y seguro." },
                            { time: 20, label: "Modo Rápido", sub: "30 SEGUNDOS", icon: BoltIcon, color: "amber", desc: "Solo envíos urgentes a listas pequeñas." }
                        ].map((item) => {
                            const isSelected = intervaloGlobal === item.time;
                            const activeStyles = styleMap[item.color];

                            return (
                                <button 
                                    key={item.time} 
                                    onClick={() => guardarVelocidad(item.time)} 
                                    disabled={guardandoConfig}
                                    className={`w-full p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden group active:scale-[0.98]
                                        ${isSelected 
                                            ? `${activeStyles.bg} ${activeStyles.border} shadow-md` 
                                            : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3 sm:gap-4 items-start">
                                            <div className={`p-2 rounded-xl shrink-0 ${isSelected ? `bg-white dark:bg-[#0f1219] shadow-sm` : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? activeStyles.text : 'text-slate-400'}`} />
                                            </div>
                                            <div>
                                                <h4 className={`font-black text-sm transition-colors ${isSelected ? activeStyles.text : 'text-slate-900 dark:text-white'}`}>
                                                    {item.label}
                                                </h4>
                                                <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 mb-1 sm:mb-1.5">{item.sub} / Mensaje</p>
                                                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight pr-2">{item.desc}</p>
                                            </div>
                                        </div>
                                        {isSelected && <CheckCircleSolid className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-0.5 sm:mt-1 ${activeStyles.text}`} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
                
            </div>
        </div>
    );
}
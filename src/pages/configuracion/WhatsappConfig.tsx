import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    DevicePhoneMobileIcon, ArrowPathIcon, CheckBadgeIcon, TrashIcon, 
    ShieldCheckIcon, BoltIcon, ClockIcon, ExclamationTriangleIcon,
    PlayCircleIcon, PowerIcon
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
            toast.success("Motor activo. Esperando respuesta de WhatsApp...", { id: loadToast });
            setTimeout(checkStatus, 2000);
        } catch (error) {
            toast.error("No se pudo encender el motor", { id: loadToast });
        } finally {
            setReloading(false);
        }
    };

    const handleLogout = async () => {
        if(!confirm("¿Desvincular sesión y apagar motor?")) return;
        setReloading(true);
        const loadToast = toast.loading("Cerrando sesión...");
        try {
            await client.post('/whatsapp/logout');
            setStatus({ connected: false, qr: null, active: false });
            toast.success("Servicio desactivado", { id: loadToast });
        } catch (error) { 
            toast.error("Error al desactivar", { id: loadToast });
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
        } catch (error) { toast.error("Error guardando"); } 
        finally { setGuardandoConfig(false); }
    };

    return (
        /* ✅ ADAPTADO: Fondo base dinámico */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-2xl overflow-hidden flex flex-col md:flex-row h-full min-h-[600px] transition-colors">
            
            {/* COLUMNA IZQUIERDA: GESTIÓN DE CONEXIÓN */}
            <div className="flex-1 p-8 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 transition-colors">
                
                <div className="flex items-center gap-3 mb-8">
                    <div className={`p-2 rounded-lg ${status.connected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                        <DevicePhoneMobileIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-lg transition-colors">Servicio de Mensajería</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{status.active ? 'Motor en ejecución' : 'Motor en reposo'}</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    {!status.active ? (
                        <div className="flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-md border border-slate-200 dark:border-slate-700/50 relative">
                                <PowerIcon className="w-12 h-12 text-slate-400" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-4 border-slate-50 dark:border-slate-900"></div>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">WhatsApp Desactivado</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 max-w-xs leading-relaxed">
                                El motor no está consumiendo recursos. Actívalo para sincronizar tu cuenta.
                            </p>
                            <button onClick={handleIniciarMotor} disabled={reloading} className="group px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                                {reloading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <PlayCircleIcon className="w-7 h-7" />}
                                ENCENDER SERVICIO
                            </button>
                        </div>
                    ) : status.connected ? (
                        <div className="animate-in fade-in zoom-in duration-500 relative">
                            <div className="relative bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-emerald-500/30 rounded-2xl p-8 text-center shadow-lg dark:shadow-emerald-900/10">
                                <div className="absolute top-4 right-4 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                    <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Online</span>
                                </div>
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center mb-4 shadow-xl">
                                    <CheckBadgeIcon className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight transition-colors">Sesión Enlazada</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium">FdezNet está conectado</p>
                                
                                <button onClick={handleLogout} disabled={reloading} className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-black text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 transition-all rounded-xl border border-rose-200 dark:border-rose-500/20">
                                    {reloading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <TrashIcon className="w-4 h-4" />}
                                    DESACTIVAR Y APAGAR
                                </button>
                            </div>
                        </div>
                    ) : status.qr ? (
                        <div className="flex flex-col items-center animate-in fade-in duration-500">
                            <div className="bg-white p-5 rounded-[2rem] shadow-xl border-[6px] border-slate-100 dark:border-slate-800 mb-8">
                                <QRCode value={status.qr} size={240} level="M" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-10"><ArrowPathIcon className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-6" /></div>
                    )}
                </div>
            </div>

            {/* COLUMNA DERECHA: CONFIGURACIÓN */}
            <div className="w-full md:w-[400px] bg-slate-50 dark:bg-[#0b0f1a] p-8 border-l border-slate-200 dark:border-slate-800 flex flex-col transition-colors">
                <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2 transition-colors">
                        <ClockIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-500" /> Ritmo de Envío
                    </h3>
                </div>

                <div className="space-y-4 flex-1">
                    {[
                        { time: 180, label: "Modo Seguro", sub: "3 MINUTOS", icon: ShieldCheckIcon, color: "indigo" },
                        { time: 60, label: "Modo Normal", sub: "1 MINUTO", icon: ClockIcon, color: "emerald" },
                        { time: 20, label: "Modo Rápido", sub: "20 SEGUNDOS", icon: BoltIcon, color: "amber" }
                    ].map((item) => (
                        <button key={item.time} onClick={() => guardarVelocidad(item.time)} className={`w-full p-5 rounded-2xl border text-left transition-all group ${intervaloGlobal === item.time ? `bg-${item.color}-50 dark:bg-${item.color}-600/10 border-${item.color}-500 shadow-md` : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex gap-4 items-center">
                                    <item.icon className={`w-7 h-7 ${intervaloGlobal === item.time ? `text-${item.color}-500` : 'text-slate-400'}`} />
                                    <div><h4 className="font-black text-sm text-slate-900 dark:text-white transition-colors">{item.label}</h4><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{item.sub} / MENSAJE</p></div>
                                </div>
                                {intervaloGlobal === item.time && <CheckCircleSolid className={`w-6 h-6 text-${item.color}-500`} />}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
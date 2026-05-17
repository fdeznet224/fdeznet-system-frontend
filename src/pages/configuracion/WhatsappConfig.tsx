import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    DevicePhoneMobileIcon, ArrowPathIcon, CheckBadgeIcon, TrashIcon, 
    ShieldCheckIcon, BoltIcon, ClockIcon, ExclamationTriangleIcon,
     EllipsisVerticalIcon, Cog6ToothIcon, PlayCircleIcon, PowerIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

export default function WhatsappConfig() {
    // Estado Conexión (Añadimos 'active' para saber si el motor está encendido)
    const [status, setStatus] = useState<any>({ connected: false, qr: null, active: false });
    const [loading, setLoading] = useState(true);
    const [reloading, setReloading] = useState(false);

    const [intervaloGlobal, setIntervaloGlobal] = useState(60);
    const [guardandoConfig, setGuardandoConfig] = useState(false);

    // Cargar datos iniciales
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
            // Actualizamos el estado completo incluyendo la bandera 'active'
            if (JSON.stringify(res.data) !== JSON.stringify(status)) {
                setStatus(res.data);
            }
        } catch (error) { 
            setStatus({ connected: false, qr: null, active: false });
        } 
        finally { setLoading(false); }
    };

    // 🔥 ARRANCAR EL MOTOR (Bajo demanda)
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
        if(!confirm("¿Desvincular sesión y apagar motor? (Ahorrará recursos del sistema)")) return;
        setReloading(true);
        const loadToast = toast.loading("Cerrando sesión y liberando memoria...");
        try {
            await client.post('/whatsapp/logout');
            setStatus({ connected: false, qr: null, active: false });
            toast.success("Servicio desactivado correctamente", { id: loadToast });
        } catch (error) { 
            toast.error("Error al desactivar servicio", { id: loadToast });
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-full min-h-[600px]">
            
            {/* COLUMNA IZQUIERDA: GESTIÓN DE CONEXIÓN */}
            <div className="flex-1 p-8 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
                
                <div className="flex items-center gap-3 mb-8">
                    <div className={`p-2 rounded-lg ${status.connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        <DevicePhoneMobileIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Servicio de Mensajería</h3>
                        <p className="text-xs text-slate-400">{status.active ? 'Motor en ejecución' : 'Motor en reposo'}</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    
                    {!status.active ? (
                        /* 🔥 ESTADO 1: MOTOR APAGADO (Boton de encendido principal) 🔥 */
                        <div className="flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-slate-700/50 relative">
                                <PowerIcon className="w-12 h-12 text-slate-500" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-4 border-slate-900"></div>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">WhatsApp Desactivado</h2>
                            <p className="text-slate-400 text-sm mb-10 max-w-xs leading-relaxed">
                                El motor no está consumiendo recursos. Actívalo para sincronizar tu cuenta y empezar a enviar mensajes.
                            </p>
                            
                            <button 
                                onClick={handleIniciarMotor}
                                disabled={reloading}
                                className="group px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                            >
                                {reloading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <PlayCircleIcon className="w-7 h-7" />}
                                ENCENDER SERVICIO
                            </button>
                        </div>

                    ) : status.connected ? (
                        /* ESTADO 2: CONECTADO */
                        <div className="animate-in fade-in zoom-in duration-500 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none"></div>
                            <div className="relative bg-slate-800/50 border border-emerald-500/30 backdrop-blur-sm rounded-2xl p-8 text-center shadow-lg shadow-emerald-900/10">
                                <div className="absolute top-4 right-4 flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Online</span>
                                </div>
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20">
                                    <CheckBadgeIcon className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Sesión Enlazada</h2>
                                <p className="text-slate-400 text-sm mb-8">FdezNet está conectado correctamente</p>
                                
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 text-left">
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Estado</p>
                                        <p className="text-xs text-emerald-400 font-bold">Activo</p>
                                    </div>
                                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 text-left">
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Sesión</p>
                                        <p className="text-xs text-white font-mono uppercase">E2E Secure</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleLogout} 
                                    disabled={reloading} 
                                    className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-black text-rose-400 hover:text-white hover:bg-rose-600 transition-all rounded-xl border border-rose-500/20 hover:border-rose-600"
                                >
                                    {reloading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <TrashIcon className="w-4 h-4" />}
                                    DESACTIVAR Y APAGAR
                                </button>
                            </div>
                        </div>

                    ) : status.qr ? (
                        /* ESTADO 3: MOSTRANDO QR */
                        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white p-5 rounded-[2rem] shadow-2xl shadow-white/5 border-[6px] border-slate-200 mb-8">
                                <QRCode value={status.qr} size={240} level="M" />
                            </div>
                            <div className="w-full max-w-xs space-y-4">
                                <h4 className="text-white font-bold text-center mb-2">Escanea para vincular:</h4>
                                <div className="flex items-start gap-4 text-sm text-slate-300 bg-slate-800/30 p-3 rounded-xl border border-slate-700/30">
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-black shrink-0">1</div>
                                    <p>Abre WhatsApp en tu teléfono y ve a <span className="text-white font-bold italic">Dispositivos Vinculados</span>.</p>
                                </div>
                                <button onClick={handleIniciarMotor} className="w-full mt-4 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest font-black">¿Problemas? Reiniciar motor</button>
                            </div>
                        </div>

                    ) : (
                        /* ESTADO 4: CARGANDO / INICIANDO */
                        <div className="text-center p-10">
                            <ArrowPathIcon className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-6 opacity-50" />
                            <p className="text-white font-black text-xl tracking-tight">Iniciando Motor...</p>
                            <p className="text-slate-500 text-sm mt-2 font-medium">Levantando instancia de Chrome segura</p>
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMNA DERECHA: CONFIGURACIÓN */}
            <div className="w-full md:w-[400px] bg-[#0b0f1a] p-8 border-l border-slate-800 flex flex-col">
                <div className="mb-8">
                    <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                        <ClockIcon className="w-6 h-6 text-indigo-500" />
                        Ritmo de Envío
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                        Controla la velocidad de los envíos masivos para proteger tu número de bloqueos.
                    </p>
                </div>

                <div className="space-y-4 flex-1">
                    <button onClick={() => guardarVelocidad(180)} className={`w-full p-5 rounded-2xl border text-left transition-all group ${intervaloGlobal === 180 ? 'bg-indigo-600/10 border-indigo-500 shadow-lg' : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-4">
                                <ShieldCheckIcon className={`w-7 h-7 ${intervaloGlobal === 180 ? 'text-indigo-400' : 'text-slate-600'}`} />
                                <div><h4 className="font-bold text-sm text-white">Modo Seguro</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">3 MINUTOS / MENSAJE</p></div>
                            </div>
                            {intervaloGlobal === 180 && <CheckCircleSolid className="w-6 h-6 text-indigo-500" />}
                        </div>
                    </button>

                    <button onClick={() => guardarVelocidad(60)} className={`w-full p-5 rounded-2xl border text-left transition-all group ${intervaloGlobal === 60 ? 'bg-emerald-600/10 border-emerald-500 shadow-lg' : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-4">
                                <ClockIcon className={`w-7 h-7 ${intervaloGlobal === 60 ? 'text-emerald-400' : 'text-slate-600'}`} />
                                <div><h4 className="font-bold text-sm text-white">Modo Normal</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">1 MINUTO / MENSAJE</p></div>
                            </div>
                            {intervaloGlobal === 60 && <CheckCircleSolid className="w-6 h-6 text-emerald-500" />}
                        </div>
                    </button>

                    <button onClick={() => guardarVelocidad(20)} className={`w-full p-5 rounded-2xl border text-left transition-all group ${intervaloGlobal === 20 ? 'bg-amber-600/10 border-amber-500 shadow-lg' : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-4">
                                <BoltIcon className={`w-7 h-7 ${intervaloGlobal === 20 ? 'text-amber-400' : 'text-slate-600'}`} />
                                <div><h4 className="font-bold text-sm text-white">Modo Rápido</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">20 SEGUNDOS / MENSAJE</p></div>
                            </div>
                            {intervaloGlobal === 20 && <CheckCircleSolid className="w-6 h-6 text-amber-500" />}
                        </div>
                    </button>
                </div>

                <div className="mt-8 p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex gap-4">
                    <ExclamationTriangleIcon className="w-6 h-6 text-indigo-400 shrink-0" />
                    <p className="text-[10px] text-slate-400 leading-relaxed font-bold italic">
                        RECOMENDACIÓN: Usa el Modo Seguro si envías más de 50 mensajes a clientes que no tienen tu número guardado.
                    </p>
                </div>
            </div>
        </div>
    );
}
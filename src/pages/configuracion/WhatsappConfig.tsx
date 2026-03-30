import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    DevicePhoneMobileIcon, ArrowPathIcon, CheckBadgeIcon, TrashIcon, 
    ShieldCheckIcon, BoltIcon, ClockIcon, ExclamationTriangleIcon,
    QrCodeIcon, EllipsisVerticalIcon, Cog6ToothIcon
} from '@heroicons/react/24/outline';
// Usamos iconos sólidos para algunos elementos de UI
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

export default function WhatsappConfig() {
    // Estado Conexión
    const [status, setStatus] = useState<any>({ connected: false, qr: null });
    const [loading, setLoading] = useState(true);
    const [reloading, setReloading] = useState(false);

    // Estado Configuración Global
    const [intervaloGlobal, setIntervaloGlobal] = useState(60);
    const [guardandoConfig, setGuardandoConfig] = useState(false);

    // Cargar datos
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
            if (res.data.qr !== status.qr || res.data.connected !== status.connected) {
                setStatus(res.data);
            }
        } catch (error) { } 
        finally { setLoading(false); }
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

    const handleLogout = async () => {
        if(!confirm("¿Desvincular sesión de WhatsApp?")) return;
        setReloading(true);
        try {
            await client.post('/whatsapp/logout');
            setStatus({ connected: false, qr: null });
            setTimeout(() => { setReloading(false); checkStatus(); }, 2000);
        } catch (error) { setReloading(false); }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-full min-h-[600px]">
            
            {/* ============================================================
                COLUMNA IZQUIERDA: GESTIÓN DE CONEXIÓN
               ============================================================ */}
            <div className="flex-1 p-8 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
                
                {/* Cabecera Izquierda */}
                <div className="flex items-center gap-3 mb-8">
                    <div className={`p-2 rounded-lg ${status.connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        <DevicePhoneMobileIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Dispositivo Móvil</h3>
                        <p className="text-xs text-slate-400">Gateway de mensajería</p>
                    </div>
                </div>

                {/* --- CONTENIDO DINÁMICO --- */}
                <div className="flex-1 flex flex-col justify-center">
                    
                    {loading ? (
                        <div className="text-center">
                            <ArrowPathIcon className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">Sincronizando estado...</p>
                        </div>

                    ) : status.connected ? (
                        /* =========================================
                           ESTADO: CONECTADO (DISEÑO PROFESIONAL) 
                           ========================================= */
                        <div className="animate-in fade-in zoom-in duration-500 relative">
                            {/* Efecto de fondo (Glow) */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none"></div>

                            <div className="relative bg-slate-800/50 border border-emerald-500/30 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg shadow-emerald-900/10">
                                
                                {/* Indicador de Estado Pulsante */}
                                <div className="absolute top-4 right-4 flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Online</span>
                                </div>

                                {/* Icono Central */}
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20">
                                    <CheckBadgeIcon className="w-10 h-10 text-white" />
                                </div>

                                <h2 className="text-2xl font-bold text-white mb-1">Sesión Activa</h2>
                                <p className="text-slate-400 text-sm mb-6">FdezNet está enlazado a tu WhatsApp</p>

                                {/* Detalles Técnicos Simulados */}
                                <div className="grid grid-cols-2 gap-2 mb-6">
                                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Protocolo</p>
                                        <p className="text-xs text-white font-mono">MD-Baileys</p>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Encriptación</p>
                                        <p className="text-xs text-white font-mono">E2E TLS</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleLogout} 
                                    disabled={reloading} 
                                    className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-rose-400 hover:text-white hover:bg-rose-600 transition-all rounded-lg border border-rose-500/30 hover:border-rose-600"
                                >
                                    {reloading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <TrashIcon className="w-4 h-4" />}
                                    Cerrar Sesión Remota
                                </button>
                            </div>
                        </div>

                    ) : status.qr ? (
                        /* =========================================
                           ESTADO: DESCONECTADO (QR + INSTRUCCIONES) 
                           ========================================= */
                        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* QR Code */}
                            <div className="bg-white p-4 rounded-2xl shadow-2xl shadow-white/5 border-4 border-slate-200 mb-6">
                                <QRCode value={status.qr} size={220} level="M" />
                            </div>

                            {/* Instrucciones Paso a Paso */}
                            <div className="w-full max-w-xs space-y-4">
                                <h4 className="text-white font-bold text-center mb-2">Pasos para vincular:</h4>
                                
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-lg shadow-indigo-500/30">1</div>
                                    <p>Abre WhatsApp en tu celular.</p>
                                </div>
                                
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-lg shadow-indigo-500/30">2</div>
                                    <p>Ve a <strong className="text-white">Menú</strong> <EllipsisVerticalIcon className="w-4 h-4 inline mx-1" /> o <strong className="text-white">Config</strong> <Cog6ToothIcon className="w-4 h-4 inline mx-1" />.</p>
                                </div>

                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-lg shadow-indigo-500/30">3</div>
                                    <p>Selecciona <strong className="text-white">Dispositivos vinculados</strong> y escanea el código.</p>
                                </div>
                            </div>
                        </div>

                    ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-white font-bold">Iniciando Motor...</p>
                            <p className="text-xs text-slate-500">Generando llaves de seguridad</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================================
                COLUMNA DERECHA: CONFIGURACIÓN (Sin cambios funcionales)
               ============================================================ */}
            <div className="w-full md:w-[400px] bg-slate-900 p-8 border-l border-slate-800 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-blue-500" />
                    Ritmo de Envío
                </h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    Configura el tiempo de espera entre cada mensaje masivo para imitar el comportamiento humano.
                </p>

                <div className="space-y-4 flex-1">
                    {/* Tarjeta 180s */}
                    <button 
                        onClick={() => guardarVelocidad(180)}
                        className={`w-full p-4 rounded-xl border text-left transition-all relative group ${
                            intervaloGlobal === 180 
                            ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10' 
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                                <ShieldCheckIcon className={`w-6 h-6 ${intervaloGlobal === 180 ? 'text-blue-500' : 'text-slate-500'}`} />
                                <div>
                                    <h4 className={`font-bold text-sm ${intervaloGlobal === 180 ? 'text-blue-400' : 'text-white'}`}>Modo Seguro (3 min)</h4>
                                    <p className="text-xs text-slate-500 mt-1">Anti-bloqueo recomendado</p>
                                </div>
                            </div>
                            {intervaloGlobal === 180 && <CheckCircleSolid className="w-5 h-5 text-blue-500" />}
                        </div>
                    </button>

                    {/* Tarjeta 60s */}
                    <button 
                        onClick={() => guardarVelocidad(60)}
                        className={`w-full p-4 rounded-xl border text-left transition-all relative ${
                            intervaloGlobal === 60 
                            ? 'bg-emerald-600/10 border-emerald-500 shadow-lg shadow-emerald-500/10' 
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                                <ClockIcon className={`w-6 h-6 ${intervaloGlobal === 60 ? 'text-emerald-500' : 'text-slate-500'}`} />
                                <div>
                                    <h4 className={`font-bold text-sm ${intervaloGlobal === 60 ? 'text-emerald-400' : 'text-white'}`}>Modo Normal (1 min)</h4>
                                    <p className="text-xs text-slate-500 mt-1">Balance ideal</p>
                                </div>
                            </div>
                            {intervaloGlobal === 60 && <CheckCircleSolid className="w-5 h-5 text-emerald-500" />}
                        </div>
                    </button>

                    {/* Tarjeta 20s */}
                    <button 
                        onClick={() => guardarVelocidad(20)}
                        className={`w-full p-4 rounded-xl border text-left transition-all relative ${
                            intervaloGlobal === 20 
                            ? 'bg-amber-600/10 border-amber-500 shadow-lg shadow-amber-500/10' 
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                                <BoltIcon className={`w-6 h-6 ${intervaloGlobal === 20 ? 'text-amber-500' : 'text-slate-500'}`} />
                                <div>
                                    <h4 className={`font-bold text-sm ${intervaloGlobal === 20 ? 'text-amber-400' : 'text-white'}`}>Modo Rápido (20 seg)</h4>
                                    <p className="text-xs text-slate-500 mt-1">Solo chips antiguos</p>
                                </div>
                            </div>
                            {intervaloGlobal === 20 && <CheckCircleSolid className="w-5 h-5 text-amber-500" />}
                        </div>
                    </button>
                </div>

                <div className="mt-8 p-4 bg-slate-950/50 rounded-lg border border-slate-800 flex gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-slate-600 shrink-0" />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        <strong className="text-slate-400">Nota:</strong> Mantén el servidor encendido. Si se apaga durante un envío masivo, la cola se pausará hasta que se reinicie.
                    </p>
                </div>
            </div>
        </div>
    );
}
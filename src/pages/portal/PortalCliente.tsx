import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../../api/axios';
import { 
    WifiIcon, SignalIcon, 
    CurrencyDollarIcon, CheckCircleIcon, XCircleIcon,
    ServerIcon, MapPinIcon, CpuChipIcon, IdentificationIcon,
    ArrowPathIcon, PhoneIcon, ChatBubbleLeftRightIcon,
    BoltIcon, NoSymbolIcon, BanknotesIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';

export default function PortalCliente() {
    // 1. Obtenemos la Cédula
    const { cedula } = useParams(); 
    
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, [cedula]);

    const cargarDatos = async () => {
        if (!cedula) return;
        setLoading(true);
        setError(false);
        try {
            const res = await client.get(`/clientes/${cedula}/portal`);
            setData(res.data);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
            <ArrowPathIcon className="w-12 h-12 animate-spin text-indigo-500" />
            <div className="text-center">
                <p className="font-bold text-lg animate-pulse">Diagnosticando Servicio...</p>
                <p className="text-xs text-slate-500">Ping al Nodo & Consultando Saldos</p>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6">
            <XCircleIcon className="w-20 h-20 text-rose-500 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Cédula No Encontrada</h1>
            <p className="text-slate-400">No hay información para: <span className="font-mono text-white">{cedula}</span>.</p>
            <button onClick={cargarDatos} className="mt-8 px-6 py-2 bg-slate-800 rounded-full text-sm font-bold hover:bg-slate-700 transition">Reintentar</button>
        </div>
    );

    // Lógica de Datos
    const administrativoActivo = data.estado === 'activo';
    const tecnicoOnline = data.is_online; 
    const formatSpeed = (kbps: number) => kbps >= 1024 ? `${Math.round(kbps/1024)} Mb` : `${kbps} Kb`;

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-200 p-4 pb-12 flex flex-col items-center">
            
            {/* ==========================================
                1. CABECERA (ESTADO ADMINISTRATIVO)
               ========================================== */}
            <div className={`w-full max-w-md rounded-t-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden transition-colors duration-500 ${administrativoActivo ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                {/* Fondo decorativo */}
                <WifiIcon className="absolute -right-4 -top-4 w-32 h-32 text-white/10 rotate-12" />
                
                <div className="bg-white/20 p-4 rounded-full mb-3 backdrop-blur-sm shadow-inner">
                    {administrativoActivo ? <CheckCircleIcon className="w-12 h-12 text-white" /> : <XCircleIcon className="w-12 h-12 text-white" />}
                </div>
                
                <h1 className="text-3xl font-black text-white tracking-tight uppercase text-center leading-none">
                    {administrativoActivo ? 'SERVICIO ACTIVO' : 'SUSPENDIDO'}
                </h1>
                
                <div className="flex gap-2 mt-4">
                     <span className="text-[10px] font-bold bg-black/20 text-white/90 px-3 py-1 rounded-full border border-white/10">
                        ID: {data.id}
                    </span>
                    <span className="text-[10px] font-bold bg-white/20 text-white px-3 py-1 rounded-full font-mono border border-white/10">
                        {cedula}
                    </span>
                </div>
            </div>

            {/* ==========================================
                2. INFORMACIÓN PRINCIPAL
               ========================================== */}
            <div className="w-full max-w-md bg-slate-900 border-x border-b border-slate-800 rounded-b-3xl p-6 shadow-2xl mb-6 relative z-10">
                <div className="text-center mb-4 border-b border-slate-800 pb-4">
                    <h2 className="text-xl font-bold text-white">{data.nombre}</h2>
                    <div className="flex justify-center items-start gap-2 mt-2 text-slate-400 text-sm">
                        <MapPinIcon className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                        <span className="max-w-[250px] leading-snug">{data.direccion}</span>
                    </div>
                </div>

                {/* BOTONES DE CONTACTO (Sustituye al reporte de pago) */}
                {data.telefono ? (
                    <div className="grid grid-cols-2 gap-3">
                        <a href={`tel:${data.telefono}`} className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-white py-3 rounded-xl transition font-bold text-xs border border-slate-800 active:scale-95 group">
                            <PhoneIcon className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" /> Llamar
                        </a>
                        <a href={`https://wa.me/${data.telefono}`} target="_blank" className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-white py-3 rounded-xl transition font-bold text-xs border border-slate-800 active:scale-95 group">
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" /> WhatsApp
                        </a>
                    </div>
                ) : (
                    <div className="bg-slate-950/50 p-2 rounded text-center text-xs text-slate-500 italic">
                        Sin teléfono registrado para contacto
                    </div>
                )}
            </div>

            {/* ==========================================
                3. PANEL TÉCNICO (Con Ping y Velocidades)
               ========================================== */}
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 shadow-lg">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                        <BuildingStorefrontIcon className="w-4 h-4 text-slate-500"/>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ficha Técnica</h3>
                    </div>
                    {/* Botón Refresh Ping */}
                    <button onClick={cargarDatos} className="text-indigo-400 hover:text-white transition flex items-center gap-1 text-[10px] font-bold bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 active:scale-95">
                        <ArrowPathIcon className="w-3 h-3" /> PING
                    </button>
                </div>
                
                <div className="space-y-4">
                    {/* Fila Especial: Estatus Físico (Ping) */}
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-xs text-slate-400 flex items-center gap-2 font-medium">
                            <ServerIcon className="w-4 h-4 text-slate-500"/> Conexión Física
                        </span>
                        <div className={`flex items-center gap-2 px-2 py-0.5 rounded ${tecnicoOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {tecnicoOnline ? <BoltIcon className="w-3 h-3 animate-pulse"/> : <NoSymbolIcon className="w-3 h-3"/>}
                            <span className="text-[10px] font-bold uppercase">{tecnicoOnline ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>
                    </div>

                    <RowTecnico icon={IdentificationIcon} label="IP Asignada" value={data.ip_asignada} color="text-cyan-400" bold copy />
                    <RowTecnico icon={CpuChipIcon} label="MAC Address" value={data.mac_address} color="text-fuchsia-400" monospace />
                    <RowTecnico icon={ServerIcon} label="Nodo / OLT" value={data.router_nombre} color="text-indigo-400" />
                    
                    {/* GRID DE VELOCIDADES (NUEVO) */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                            <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                                <SignalIcon className="w-3 h-3 text-emerald-500"/> Bajada (Plan)
                            </p>
                            <p className="text-white font-bold font-mono text-sm">{formatSpeed(data.velocidad_bajada)}</p>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                            <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                                <SignalIcon className="w-3 h-3 text-indigo-500 rotate-180"/> Subida (Plan)
                            </p>
                            <p className="text-white font-bold font-mono text-sm">{formatSpeed(data.velocidad_subida)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==========================================
                4. PANEL FINANCIERO (Informativo)
               ========================================== */}
            <div className={`w-full max-w-md border rounded-2xl p-5 shadow-lg relative overflow-hidden ${administrativoActivo ? 'bg-slate-900 border-slate-800' : 'bg-rose-950/20 border-rose-500/30'}`}>
                
                {/* Decoración */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>

                <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <CurrencyDollarIcon className="w-4 h-4"/> Estado de Cuenta
                    </h3>
                    {data.precio_plan > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                            <BanknotesIcon className="w-3 h-3"/> ${data.precio_plan}/mes
                        </span>
                    )}
                </div>
                
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <span className="text-xs text-slate-400 block mb-1">Total a Pagar</span>
                        <span className={`text-3xl font-black tracking-tight ${data.total_deuda > 0 ? 'text-white' : 'text-emerald-500'}`}>
                            ${data.total_deuda}
                        </span>
                    </div>

                    {data.total_deuda > 0 ? (
                        <div className="text-right">
                             <span className="text-[10px] text-rose-300 bg-rose-500/20 px-2 py-1 rounded border border-rose-500/30 font-bold block mb-1">
                                {data.facturas_pendientes} Recibo(s) Pendiente(s)
                            </span>
                            <span className="text-xs text-slate-400">
                                Corte: <span className="text-white font-bold">{data.fecha_corte || 'Vencido'}</span>
                            </span>
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            ¡Al día!
                        </span>
                    )}
                </div>

                {!administrativoActivo && (
                    <div className="mt-4 flex gap-2 items-start bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                        <ExclamationTriangleIcon className="w-5 h-5 text-rose-500 shrink-0" />
                        <p className="text-xs text-rose-200 leading-relaxed">
                            <span className="font-bold block text-rose-400 mb-0.5">Servicio Suspendido</span>
                            El acceso a internet está bloqueado administrativamente. Se requiere el pago total para la reactivación automática.
                        </p>
                    </div>
                )}
            </div>

            <p className="mt-8 text-[10px] text-slate-600 text-center font-medium uppercase tracking-widest">
                FdezNet Telecomunicaciones • Uso Técnico Exclusivo
            </p>
        </div>
    );
}

// Componente auxiliar para filas limpias
const RowTecnico = ({ icon: Icon, label, value, color, bold, monospace, copy }: any) => {
    const handleCopy = () => {
        if(copy && value) {
            navigator.clipboard.writeText(value);
        }
    };

    return (
        <div className="flex justify-between items-center group cursor-default" onClick={handleCopy}>
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-md bg-slate-900 border border-slate-800 group-hover:border-slate-700 transition`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span className="text-slate-400 text-xs font-medium">{label}</span>
            </div>
            <span className={`text-slate-200 text-sm ${bold ? 'font-bold' : ''} ${monospace ? 'font-mono tracking-wide' : ''} ${copy ? 'cursor-pointer hover:text-white hover:underline decoration-dashed decoration-slate-600 underline-offset-4' : ''}`}>
                {value}
            </span>
        </div>
    );
};
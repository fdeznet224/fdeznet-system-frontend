import { useCallback, useEffect, useState } from 'react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { useParams } from 'react-router-dom';
import client from '@/api/axios';
import { 
    WifiIcon, SignalIcon, 
    CurrencyDollarIcon, CheckCircleIcon, XCircleIcon,
    ServerIcon, MapPinIcon, CpuChipIcon, IdentificationIcon,
    ArrowPathIcon, PhoneIcon, ChatBubbleLeftRightIcon,
    BoltIcon, NoSymbolIcon, BanknotesIcon
} from '@heroicons/react/24/solid';

import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';

type MoneyValue = number | string;
type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface ClientPortalData {
    id: number;
    nombre: string;
    cedula: string | null;
    telefono: string | null;
    direccion: string | null;
    ip_asignada: string | null;
    mac_address: string | null;
    identificador_onu: string | null;
    olt_id: number | null;
    onu_id: number | null;
    caja_nap_id: number | null;
    plan_id: number | null;
    router_id: number | null;
    router_nombre: string;
    estado: string;
    is_online: boolean;
    olt_nombre: string | null;
    nap_nombre: string | null;
    puerto_nap: number | null;
    plan_nombre: string;
    velocidad_bajada: number;
    velocidad_subida: number;
    precio_plan: MoneyValue;
    total_deuda: MoneyValue;
    facturas_pendientes: number;
    fecha_corte: string | null;
    saldo_a_favor: MoneyValue;
}

interface TechnicalRowProps {
    icon: HeroIcon;
    label: string;
    value: ReactNode;
    color: string;
    bold?: boolean;
    monospace?: boolean;
}

export default function PortalCliente() {
    const { cedula } = useParams(); 
    
    const [data, setData] = useState<ClientPortalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const cargarDatos = useCallback(async () => {
        if (!cedula) {
            setError(true);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(false);
        try {
            const res = await client.get<ClientPortalData>(`/clientes/${cedula}/portal`);
            setData(res.data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [cedula]);

    useEffect(() => {
        const fetchTimer = window.setTimeout(() => void cargarDatos(), 0);
        return () => window.clearTimeout(fetchTimer);
    }, [cargarDatos]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-white gap-4 transition-colors">
            <ArrowPathIcon className="w-12 h-12 animate-spin text-indigo-600 dark:text-indigo-500" />
            <div className="text-center">
                <p className="font-black text-lg animate-pulse uppercase tracking-widest">Diagnosticando...</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ping al Nodo & Consultando Saldos</p>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-center p-6 transition-colors">
            <XCircleIcon className="w-20 h-20 text-rose-500 mb-4" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Cédula No Encontrada</h1>
            <p className="text-slate-500 dark:text-slate-400">No hay información para: <span className="font-mono text-slate-900 dark:text-white font-bold">{cedula}</span>.</p>
            <button onClick={() => void cargarDatos()} className="mt-8 px-6 py-2 bg-slate-200 dark:bg-slate-800 rounded-full text-sm font-black uppercase hover:bg-slate-300 dark:hover:bg-slate-700 transition">Reintentar</button>
        </div>
    );

    const administrativoActivo = data.estado === 'activo';
    const tecnicoOnline = data.is_online; 
    const precioPlan = Number(data.precio_plan);
    const totalDeuda = Number(data.total_deuda);
    const formatSpeed = (kbps: number) => kbps >= 1024 ? `${Math.round(kbps/1024)} Mb` : `${kbps} Kb`;

    return (
        /* ✅ ADAPTADO: Fondo principal dinámico */
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-700 dark:text-slate-200 p-4 pb-12 flex flex-col items-center transition-colors duration-300">
            
            {/* 1. CABECERA */}
            <div className={`w-full max-w-md rounded-t-3xl p-8 flex flex-col items-center justify-center shadow-lg dark:shadow-2xl relative overflow-hidden transition-colors ${administrativoActivo ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                <WifiIcon className="absolute -right-4 -top-4 w-32 h-32 text-white/10 rotate-12" />
                
                <div className="bg-white/20 p-4 rounded-full mb-3 shadow-inner">
                    {administrativoActivo ? <CheckCircleIcon className="w-12 h-12 text-white" /> : <XCircleIcon className="w-12 h-12 text-white" />}
                </div>
                
                <h1 className="text-3xl font-black text-white tracking-tight uppercase text-center leading-none">
                    {administrativoActivo ? 'SERVICIO ACTIVO' : 'SUSPENDIDO'}
                </h1>
                
                <div className="flex gap-2 mt-4">
                     <span className="text-[10px] font-black bg-black/10 text-white px-3 py-1 rounded-full uppercase border border-white/20">ID: {data.id}</span>
                     <span className="text-[10px] font-black bg-white/20 text-white px-3 py-1 rounded-full font-mono border border-white/10">{cedula}</span>
                </div>
            </div>

            {/* 2. INFORMACIÓN PRINCIPAL */}
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-3xl p-6 shadow-sm dark:shadow-2xl mb-6 relative z-10 transition-colors">
                <div className="text-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white transition-colors">{data.nombre}</h2>
                    <div className="flex justify-center items-start gap-2 mt-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                        <MapPinIcon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="max-w-[250px] leading-snug">{data.direccion}</span>
                    </div>
                </div>

                {data.telefono ? (
                    <div className="grid grid-cols-2 gap-3">
                        <a href={`tel:${data.telefono}`} className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-white py-3 rounded-xl transition font-black text-xs border border-slate-200 dark:border-slate-800 active:scale-95 uppercase tracking-wider">
                            <PhoneIcon className="w-4 h-4 text-indigo-500" /> Llamar
                        </a>
                        <a href={`https://wa.me/${data.telefono}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-white py-3 rounded-xl transition font-black text-xs border border-slate-200 dark:border-slate-800 active:scale-95 uppercase tracking-wider">
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-500" /> WhatsApp
                        </a>
                    </div>
                ) : (
                    <div className="bg-slate-100 dark:bg-slate-950/50 p-2 rounded text-center text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Sin teléfono</div>
                )}
            </div>

            {/* 3. PANEL TÉCNICO */}
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-sm dark:shadow-xl transition-colors">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <BuildingStorefrontIcon className="w-4 h-4"/>
                        <h3 className="text-[10px] font-black uppercase tracking-widest">Ficha Técnica</h3>
                    </div>
                    <button onClick={() => void cargarDatos()} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition flex items-center gap-1 text-[9px] font-black bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-500/20 active:scale-95 uppercase tracking-widest">
                        <ArrowPathIcon className="w-3 h-3" /> PING
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 font-black uppercase tracking-widest">
                            <ServerIcon className="w-4 h-4"/> Conexión Física
                        </span>
                        <div className={`flex items-center gap-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${tecnicoOnline ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                            {tecnicoOnline ? <BoltIcon className="w-3 h-3 animate-pulse"/> : <NoSymbolIcon className="w-3 h-3"/>}
                            {tecnicoOnline ? 'ONLINE' : 'OFFLINE'}
                        </div>
                    </div>

                    <RowTecnico icon={IdentificationIcon} label="IP Asignada" value={data.ip_asignada} color="text-cyan-600 dark:text-cyan-400" bold />
                    <RowTecnico icon={CpuChipIcon} label="MAC Address" value={data.mac_address} color="text-fuchsia-600 dark:text-fuchsia-400" monospace />
                    <RowTecnico icon={ServerIcon} label="Nodo / OLT" value={data.router_nombre} color="text-indigo-600 dark:text-indigo-400" />
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800 transition-colors">
                            <p className="text-[9px] text-slate-400 mb-1 flex items-center gap-1 uppercase font-black tracking-widest"><SignalIcon className="w-3 h-3 text-emerald-500"/> Bajada</p>
                            <p className="text-slate-800 dark:text-white font-black font-mono text-sm">{formatSpeed(data.velocidad_bajada)}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800 transition-colors">
                            <p className="text-[9px] text-slate-400 mb-1 flex items-center gap-1 uppercase font-black tracking-widest"><SignalIcon className="w-3 h-3 text-indigo-500 rotate-180"/> Subida</p>
                            <p className="text-slate-800 dark:text-white font-black font-mono text-sm">{formatSpeed(data.velocidad_subida)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. PANEL FINANCIERO */}
            <div className={`w-full max-w-md border rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden transition-colors ${administrativoActivo ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30'}`}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-slate-200 dark:from-white/5 to-transparent rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>

                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-white/5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CurrencyDollarIcon className="w-4 h-4"/> Estado de Cuenta
                    </h3>
                    {precioPlan > 0 && (
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            <BanknotesIcon className="w-3 h-3"/> ${precioPlan}/mes
                        </span>
                    )}
                </div>
                
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total a Pagar</span>
                        <span className={`text-3xl font-black tracking-tight ${totalDeuda > 0 ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-500'}`}>
                            ${totalDeuda}
                        </span>
                    </div>

                    {totalDeuda > 0 ? (
                        <div className="text-right">
                             <span className="text-[9px] font-black text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/20 px-2 py-1 rounded border border-rose-200 dark:border-rose-500/30 uppercase tracking-widest block mb-1">
                                {data.facturas_pendientes} Vencido
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                Corte: <span className="text-slate-800 dark:text-white font-black">{data.fecha_corte || 'Vencido'}</span>
                            </span>
                        </div>
                    ) : (
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-widest">
                            ¡Al día!
                        </span>
                    )}
                </div>
            </div>

            <p className="mt-8 text-[10px] text-slate-500 dark:text-slate-600 text-center font-black uppercase tracking-widest">
                FdezNet Telecomunicaciones • Uso Técnico Exclusivo
            </p>
        </div>
    );
}

const RowTecnico = ({ icon: Icon, label, value, color, bold, monospace }: TechnicalRowProps) => (
    <div className="flex justify-between items-center transition-colors">
        <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800`}>
                <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <span className={`text-slate-800 dark:text-slate-200 text-xs ${bold ? 'font-black' : ''} ${monospace ? 'font-mono' : ''}`}>
            {value ?? '---'}
        </span>
    </div>
);

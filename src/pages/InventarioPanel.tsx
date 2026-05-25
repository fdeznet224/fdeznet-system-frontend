import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode'; // 🔥 NUEVA LIBRERÍA
import {
    ArchiveBoxIcon, UserPlusIcon, QrCodeIcon,
    TrashIcon, ArrowPathIcon, CheckBadgeIcon,
    WrenchScrewdriverIcon, ArrowDownTrayIcon,
    CameraIcon, XMarkIcon, MapPinIcon, UserIcon,
    TruckIcon
} from '@heroicons/react/24/outline';

// ==========================================
// 🔥 NUEVO COMPONENTE: ESCÁNER "FRANCOTIRADOR LÁSER"
// ==========================================
const ScannerArtilleria = ({ onScan, onCancel }: { onScan: (texto: string) => void, onCancel: () => void }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "lector-codigo",
            { 
                fps: 15, 
                qrbox: { width: 300, height: 60 }, // La "rendija" delgada
                formatsToSupport: [ 0, 3, 4, 8 ], // Soporte para QR y Barras (CODE_128)
                rememberLastUsedCamera: true, 
                supportedScanTypes: [0] // Solo cámara
            },
            false
        );

        scanner.render(
            (textoEscaneado) => {
                scanner.clear();
                onScan(textoEscaneado);
            },
            (error) => { /* Errores ignorados */ }
        );

        return () => {
            scanner.clear().catch(e => console.error("Error al desmontar escáner", e));
        };
    }, [onScan]);

    return (
        <div className="relative w-full bg-slate-900 rounded-xl overflow-hidden shadow-inner pt-2 pb-4">
            {/* ESTILOS PARA LA LÍNEA ROJA Y LA INTERFAZ */}
            <style>{`
                #lector-codigo { width: 100%; border: none !important; padding: 0 !important; }
                #lector-codigo img { display: none; }
                #lector-codigo a { display: none !important; }
                #lector-codigo span { color: white; font-size: 12px; margin-bottom: 5px; display: block;}
                #lector-codigo button { background-color: #ea580c; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 900; margin-top: 10px; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;}
                #lector-codigo select { background-color: #1e293b; color: white; padding: 10px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 10px; width: 90%; font-size: 12px; font-weight: bold; outline: none; }
                #qr-shaded-region > div { border-color: #ef4444 !important; border-width: 3px !important; border-radius: 8px; }
                
                .laser-francotirador {
                    position: absolute;
                    top: 50%;
                    left: 15%;
                    width: 70%;
                    height: 2px;
                    background-color: #ef4444;
                    box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444;
                    z-index: 50;
                    pointer-events: none;
                    animation: parpadeo 2s infinite;
                }
                
                @keyframes parpadeo {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
            `}</style>

            {/* BOTÓN PARA CANCELAR Y CERRAR LA CÁMARA */}
            <button onClick={onCancel} className="absolute top-2 right-2 bg-rose-600/90 text-white px-3 py-1.5 rounded-lg text-[10px] font-black shadow-md z-[100] uppercase tracking-wider hover:bg-rose-500 transition-colors">
                X Cancelar
            </button>

            <div id="lector-codigo" className="w-full text-center"></div>
            <div className="laser-francotirador"></div>
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function InventarioPanel() {
    const [equipos, setEquipos] = useState<any[]>([]);
    const [tecnicos, setTecnicos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<string>('todos');

    const [showModal, setShowModal] = useState(false);
    const [nuevoId, setNuevoId] = useState('');
    const [tecnologia, setTecnologia] = useState('GPON');
    const [modelo, setModelo] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    const fetchInventario = async () => {
        setLoading(true);
        try {
            const res = await client.get('/inventario/');
            setEquipos(res.data);
        } catch (error) {
            toast.error("Error al cargar inventario");
        } finally {
            setLoading(false);
        }
    };

    const fetchTecnicos = async () => {
        try {
            const res = await client.get('/usuarios/');
            setTecnicos(res.data.filter((u: any) => u.rol === 'tecnico'));
        } catch (error) {
            console.error("Error cargando técnicos", error);
        }
    };

    useEffect(() => {
        fetchInventario();
        fetchTecnicos();
    }, []);

    const handleAsignarTecnico = async (clienteId: number, tecnicoId: string) => {
        if (!tecnicoId) return;
        const load = toast.loading("Asignando técnico para retiro...");
        try {
            await client.post(`/clientes/${clienteId}/asignar-retiro/${tecnicoId}`);
            toast.success("Técnico asignado correctamente", { id: load });
            fetchInventario();
        } catch (error) {
            toast.error("Error al asignar técnico", { id: load });
        }
    };

    const handleConfirmarRecoleccion = async (eq: any) => {
        if (!confirm(`¿Confirmas que has recuperado el equipo de ${eq.cliente_nombre}?`)) return;
        const load = toast.loading("Ingresando a stock...");
        try {
            await client.post(`/clientes/${eq.cliente_id}/confirmar-retiro-onu`);
            toast.success("Equipo de vuelta en bodega", { id: load });
            fetchInventario();
        } catch (error) {
            toast.error("Error al procesar", { id: load });
        }
    };

    const handleSuccessfulScan = (codigoEscaneado: string) => {
        const val = codigoEscaneado.toUpperCase();
        setNuevoId(val);

        // 🤖 Autodetección inteligente
        if (val.startsWith('HWTC')) {
            setTecnologia('GPON');
            setModelo('Huawei EG8141A5'); 
        } else if (val.startsWith('ZTEG')) {
            setTecnologia('GPON');
            setModelo('ZTE F670L');
        } else if (val.startsWith('ALCL') || val.startsWith('NOK')) {
            setTecnologia('GPON');
            setModelo('Nokia G-2425G-A');
        } else if (val.includes(':')) {
            setTecnologia('EPON');
            setModelo('V-SOL V2801');
        } else {
            setTecnologia('GPON');
        }

        toast.success("¡Código capturado!");
        setIsScanning(false);
    };

    const handleRegistrar = async (e: React.FormEvent) => {
        e.preventDefault();
        const load = toast.loading("Registrando...");
        try {
            await client.post('/inventario/', { identificador: nuevoId, tecnologia, modelo });
            toast.success("Agregado", { id: load });
            setNuevoId(''); setShowModal(false); fetchInventario();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error", { id: load });
        }
    };

    const handleEliminar = async (id: number) => {
        if (!confirm("¿Eliminar permanente?")) return;
        try {
            await client.delete(`/inventario/${id}`);
            toast.success("Eliminado"); fetchInventario();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error");
        }
    };

    const stats = useMemo(() => {
        const disponibles = equipos.filter(e => e.estado === 'DISPONIBLE').length;
        const instalados = equipos.filter(e => e.estado === 'INSTALADO').length;
        const porRecoger = equipos.filter(e => e.estado === 'POR_RECOGER').length;
        return { total: equipos.length, disponibles, instalados, porRecoger };
    }, [equipos]);

    const equiposFiltrados = useMemo(() => {
        return equipos.filter(e => filtro === 'todos' || e.estado === filtro);
    }, [equipos, filtro]);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-700 dark:text-slate-200 h-[calc(100dvh-80px)] md:h-[calc(100vh-100px)] overflow-hidden transition-colors duration-300">

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 md:p-5 flex justify-between items-center shadow-sm dark:shadow-xl gap-4 flex-none shrink-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight">Bodega e Inventario</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-0.5 hidden sm:block">Logística y Control de Equipos</p>
                </div>

                <button
                    onClick={() => { setShowModal(true); setIsScanning(false); setModelo(''); setNuevoId(''); }}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-2.5 py-2 md:px-4 md:py-2.5 rounded-xl font-extrabold shadow-md active:scale-95 transition flex items-center justify-center gap-1 text-[10px] md:text-sm tracking-wide uppercase md:normal-case shrink-0"
                >
                    <UserPlusIcon className="w-4 h-4 md:w-5 md:h-5" /> <span>Ingresar Equipo</span>
                </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:pb-0 scrollbar-none flex-none shrink-0">
                <KpiCard title="Total" value={stats.total} icon={ArchiveBoxIcon} color="text-blue-600 dark:text-blue-400" bg="bg-blue-500/10" onClick={() => setFiltro('todos')} active={filtro === 'todos'} />
                <KpiCard title="En Bodega" value={stats.disponibles} icon={CheckBadgeIcon} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" onClick={() => setFiltro('DISPONIBLE')} active={filtro === 'DISPONIBLE'} />
                <KpiCard title="Instalados" value={stats.instalados} icon={WrenchScrewdriverIcon} color="text-purple-600 dark:text-purple-400" bg="bg-purple-500/10" onClick={() => setFiltro('INSTALADO')} active={filtro === 'INSTALADO'} />
                <KpiCard title="Por Recoger" value={stats.porRecoger} icon={ArrowDownTrayIcon} color="text-rose-600 dark:text-rose-400" bg="bg-rose-500/10" onClick={() => setFiltro('POR_RECOGER')} active={filtro === 'POR_RECOGER'} />
            </div>

            <div className="flex-1 min-h-0 bg-transparent md:bg-white md:dark:bg-slate-900/90 md:rounded-2xl md:border md:border-slate-200 md:dark:border-slate-800 md:shadow-md md:dark:shadow-xl overflow-hidden flex flex-col transition-colors duration-200 relative">
                <div className="overflow-y-auto flex-1 custom-scrollbar pb-10">
                    <table className="w-full text-left border-collapse hidden md:table text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Equipo</th>
                                <th className="px-6 py-4">Estado / Ubicación</th>
                                <th className="px-6 py-4">Logística (Técnico)</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {loading && equipos.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center"><ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-orange-500" /></td></tr>
                            ) : equiposFiltrados.map((eq) => (
                                <tr key={eq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors bg-transparent text-slate-800 dark:text-slate-200">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <QrCodeIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                            <div>
                                                <span className="font-mono font-black text-slate-900 dark:text-white block text-sm">{eq.identificador}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">{eq.tecnologia} — {eq.modelo}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <EstadoBadge estado={eq.estado} />
                                        {eq.cliente_nombre && (
                                            <div className="mt-2 space-y-1">
                                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase italic">
                                                    <MapPinIcon className="w-2.5 h-2.5" /> {eq.cliente_zona || 'Sin Zona'}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-800 dark:text-white font-bold">
                                                    <UserIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {eq.cliente_nombre}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {eq.estado === 'POR_RECOGER' ? (
                                            <div className="space-y-1.5 max-w-[200px]">
                                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1"><TruckIcon className="w-3 h-3" /> Asignar a:</p>
                                                <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 flex items-center">
                                                    <select
                                                        value={eq.tecnico_id || ""}
                                                        onChange={(e) => handleAsignarTecnico(eq.cliente_id, e.target.value)}
                                                        className="w-full bg-transparent text-xs text-slate-800 dark:text-white font-bold outline-none cursor-pointer appearance-none"
                                                    >
                                                        <option value="" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white">-- Sin asignar --</option>
                                                        {tecnicos.map(t => (
                                                            <option key={t.id} value={t.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white">{t.nombre_completo || t.usuario}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ) : eq.estado === 'INSTALADO' ? (
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold italic">En uso activo</p>
                                        ) : (
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-500/60 font-bold italic">Listo para salir</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {eq.estado === 'DISPONIBLE' && (
                                                <button onClick={() => handleEliminar(eq.id)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                            )}
                                            {eq.estado === 'POR_RECOGER' && (
                                                <button onClick={() => handleConfirmarRecoleccion(eq)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black hover:bg-emerald-500 transition-all uppercase shadow-sm"><CheckBadgeIcon className="w-4 h-4" /> Recibido</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="md:hidden flex flex-col gap-3 px-1 pb-10 mt-2">
                        {loading && equipos.length === 0 ? (
                            <div className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-orange-500" /></div>
                        ) : equiposFiltrados.map((eq) => (
                            <div key={eq.id} className="bg-white dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-sm relative overflow-hidden transition-colors">

                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-start gap-2 overflow-hidden">
                                        <QrCodeIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                                        <div className="overflow-hidden">
                                            <span className="font-mono font-black text-slate-900 dark:text-white text-base block leading-tight">{eq.identificador}</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black block mt-0.5 truncate">{eq.tecnologia} — {eq.modelo}</span>
                                        </div>
                                    </div>
                                    <EstadoBadge estado={eq.estado} />
                                </div>

                                {eq.cliente_nombre && (
                                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40 text-[11px] space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5 text-slate-800 dark:text-white font-bold truncate text-xs">
                                                <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{eq.cliente_nombre}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {eq.estado === 'POR_RECOGER' ? (
                                    <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1">
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
                                            <TruckIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                            <select
                                                value={eq.tecnico_id || ""}
                                                onChange={(e) => handleAsignarTecnico(eq.cliente_id, e.target.value)}
                                                className="w-full bg-transparent text-slate-800 dark:text-slate-300 font-bold outline-none text-xs cursor-pointer appearance-none"
                                            >
                                                <option value="" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white">Asignar técnico...</option>
                                                {tecnicos.map(t => (
                                                    <option key={t.id} value={t.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white">{t.nombre_completo || t.usuario}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => handleConfirmarRecoleccion(eq)}
                                            className="w-full flex items-center justify-center gap-1.5 py-3 bg-emerald-600 text-white font-black rounded-xl text-xs tracking-wide shadow-sm active:scale-[0.98] transition-all"
                                        >
                                            <CheckBadgeIcon className="w-5 h-5" /> <span>CONFIRMAR RETORNO</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/50 pt-2.5 mt-1">
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold italic">
                                            {eq.estado === 'INSTALADO' ? '📡 Operando en campo' : '📦 En bodega'}
                                        </p>
                                        {eq.estado === 'DISPONIBLE' && (
                                            <button onClick={() => handleEliminar(eq.id)} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 rounded-lg active:scale-90 transition-all">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            {/* MODAL DE INGRESO CON ESCÁNER LÁSER */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-slate-800 dark:text-white font-black text-base flex items-center gap-1.5">
                                <ArchiveBoxIcon className="w-5 h-5 text-orange-500" /> Nuevo Equipo
                            </h3>
                            <button onClick={() => { setShowModal(false); setIsScanning(false); }} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-full bg-slate-100 dark:bg-slate-800"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-5 space-y-4">
                            {/* AQUÍ INYECTAMOS EL NUEVO COMPONENTE */}
                            {isScanning ? (
                                <ScannerArtilleria 
                                    onScan={handleSuccessfulScan} 
                                    onCancel={() => setIsScanning(false)} 
                                />
                            ) : (
                                <button onClick={() => setIsScanning(true)} className="w-full py-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex flex-col items-center gap-1.5 transition-all group cursor-pointer">
                                    <CameraIcon className="w-7 h-7 text-slate-400 group-hover:text-orange-500 transition-colors" />
                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">Escanear Código de Barras</span>
                                </button>
                            )}

                            <form onSubmit={handleRegistrar} className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Identificador (MAC o S/N)</label>
                                    <input type="text" placeholder="Ej. HWTCB991C1AE" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white font-mono uppercase font-black text-sm outline-none focus:border-orange-500 transition-colors shadow-inner" value={nuevoId} onChange={(e) => setNuevoId(e.target.value.toUpperCase())} required />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Tecnología</label>
                                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center">
                                            <select className="w-full bg-transparent text-xs text-slate-800 dark:text-white font-black outline-none cursor-pointer" value={tecnologia} onChange={e => setTecnologia(e.target.value)}>
                                                <option value="GPON">GPON</option>
                                                <option value="EPON">EPON</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Marca / Modelo</label>
                                        <input
                                            list="modelos-onu"
                                            placeholder="Selecciona o escribe..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-orange-500 transition-colors shadow-inner"
                                            value={modelo}
                                            onChange={e => setModelo(e.target.value)}
                                            required
                                        />
                                        <datalist id="modelos-onu">
                                            <option value="ZTE F670L" />
                                            <option value="ZTE F660" />
                                            <option value="Huawei EG8141A5" />
                                            <option value="Huawei HG8145V5V3" />
                                            <option value="Nokia G-2425G-A" />
                                            <option value="Nokia G-140W-C" />
                                            <option value="V-SOL V2801" />
                                        </datalist>
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase text-xs tracking-widest mt-2">Guardar Equipo</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const KpiCard = ({ title, value, icon: Icon, color, bg, onClick, active }: any) => (
    <div onClick={onClick} className={`p-4 rounded-xl border cursor-pointer transition-all shrink-0 min-w-[125px] md:min-w-0 flex-1 ${active ? `border-orange-500/50 bg-white dark:bg-slate-800 shadow-md ring-1 ring-orange-500/10` : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm'}`}>
        <div className="flex justify-between items-start mb-1">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{title}</p>
            <div className={`p-1 rounded-lg ${bg}`}><Icon className={`w-3.5 h-3.5 ${color}`} /></div>
        </div>
        <p className="text-2xl font-black text-slate-800 dark:text-white">{value}</p>
    </div>
);

const EstadoBadge = ({ estado }: { estado: string }) => {
    switch (estado) {
        case 'DISPONIBLE': return <span className="px-1.5 py-0.5 rounded border text-[8px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 tracking-wider">BODEGA</span>;
        case 'INSTALADO': return <span className="px-1.5 py-0.5 rounded border text-[8px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 tracking-wider">INSTALADO</span>;
        case 'POR_RECOGER': return <span className="px-1.5 py-0.5 rounded border text-[8px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse tracking-wider">POR RECOGER</span>;
        default: return <span className="px-1.5 py-0.5 rounded border text-[8px] font-extrabold bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20 tracking-wider">{estado}</span>;
    }
};
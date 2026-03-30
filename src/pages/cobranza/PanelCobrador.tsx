import { useState, useEffect, Fragment } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { 
    BanknotesIcon, 
    MagnifyingGlassIcon, 
    ArrowRightOnRectangleIcon, 
    XMarkIcon,
    ArrowPathIcon,
    WifiIcon,
    ShieldExclamationIcon,
    ClockIcon,
    ChartPieIcon,
    HomeIcon,
    IdentificationIcon,
    CreditCardIcon
} from '@heroicons/react/24/outline';

export default function PanelCobrador() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // --- NAVEGACIÓN (TABS) ---
    const [activeTab, setActiveTab] = useState<'cobrar' | 'promesas' | 'historial' | 'cierre'>('cobrar');

    // --- ESTADOS ---
    const [facturas, setFacturas] = useState<any[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);
    const [promesas, setPromesas] = useState<any[]>([]); // 👈 Estado para promesas
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('');
    
    // --- MÉTRICAS ---
    const totalCobradoHoy = historial.reduce((acc, curr) => acc + curr.monto, 0);
    const totalEfectivo = historial.filter(h => h.metodo === 'efectivo').reduce((acc, curr) => acc + curr.monto, 0);
    const totalTransferencia = historial.filter(h => h.metodo === 'transferencia').reduce((acc, curr) => acc + curr.monto, 0);
    const totalRetencionPromesas = promesas.reduce((acc, curr) => acc + curr.saldo_pendiente, 0); // 👈 Dinero en retención

    // --- MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFactura, setSelectedFactura] = useState<any>(null);
    const [formCobro, setFormCobro] = useState({ metodo: 'efectivo', referencia: '', monto: 0 });
    const [fechaPromesa, setFechaPromesa] = useState('');

    // --- CARGA DE DATOS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // ✅ CORRECCIÓN: Obtener fecha local YYYY-MM-DD
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000; 
            const localISOTime = new Date(now.getTime() - offset).toISOString().split('T')[0];
            
            console.log("Consultando fecha local:", localISOTime); // Para que verifiques en consola

            const [resPendientes, resHistorial, resPromesas] = await Promise.all([
                client.get('/finanzas/listado-completo?estado=pendiente'),
                // Usamos la fecha local calculada arriba
                client.get(`/finanzas/pagos-reporte?start_date=${localISOTime}&end_date=${localISOTime}`),
                client.get('/finanzas/listado-completo?estado=promesa')
            ]);

            setFacturas(resPendientes.data.items);
            setHistorial(resHistorial.data.detalles || []);
            setPromesas(resPromesas.data.items || []);
        } catch (error) {
            toast.error("Error al refrescar datos");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleLogout = () => {
        if(confirm("¿Cerrar sesión?")) {
            localStorage.clear();
            navigate('/login');
        }
    };

    const handleOpenCobrar = (factura: any) => {
        setSelectedFactura(factura);
        setFormCobro({ metodo: 'efectivo', referencia: '', monto: factura.saldo_pendiente });
        const date = new Date();
        date.setDate(date.getDate() + 3);
        setFechaPromesa(date.toISOString().split('T')[0]);
        setIsModalOpen(true);
    };

    const handleProcesarCobro = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading("Procesando...");
        try {
            await client.post('/finanzas/cobrar', {
                factura_id: selectedFactura.id,
                metodo_pago: formCobro.metodo,
                monto_recibido: Number(formCobro.monto),
                referencia: formCobro.referencia
            });
            toast.success("Pago registrado correctamente", { id: toastId });
            setIsModalOpen(false);
            setFiltro('');
            fetchData();
        } catch (error) { toast.error("Error al cobrar", { id: toastId }); }
    };

    const handleProcesarPromesa = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Ajustado al endpoint correcto del sistema
            await client.post(`/clientes/${selectedFactura.cliente.id}/promesa-pago`, {
                fecha_promesa: fechaPromesa
            });
            toast.success("Promesa guardada exitosamente");
            setIsModalOpen(false);
            setFiltro('');
            fetchData();
        } catch (error) { toast.error("Error al guardar promesa"); }
    };

    const facturasFiltradas = filtro.length > 0 
        ? facturas.filter(f => 
            f.cliente.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
            f.cliente.ip_asignada?.includes(filtro) ||
            (f.cliente.cedula && f.cliente.cedula.toLowerCase().includes(filtro.toLowerCase()))
          )
        : [];

    return (
        <div className="min-h-screen bg-[#0f1219] text-white pb-24 font-sans flex flex-col">
            
            {/* 1. HEADER */}
            <div className="bg-[#1a1f2e] border-b border-slate-800 px-5 py-3 flex justify-between items-center sticky top-0 z-30 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-lg">
                        {user.usuario?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cobrador</p>
                        <h1 className="text-sm font-bold text-white capitalize">{user.usuario}</h1>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-white transition">
                    <ArrowRightOnRectangleIcon className="w-6 h-6" />
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                
                {/* === PANTALLA 1: COBRAR === */}
                {activeTab === 'cobrar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="text-blue-200 text-xs font-bold uppercase">Recaudado Hoy</span>
                                <h2 className="text-4xl font-black text-white mt-1">${totalCobradoHoy.toLocaleString('es-MX')}</h2>
                            </div>
                            <BanknotesIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-400 uppercase ml-1">Buscar Cliente</label>
                            <div className="bg-[#1a1f2e] rounded-xl flex items-center border border-slate-700 shadow-lg p-1">
                                <MagnifyingGlassIcon className="w-6 h-6 text-slate-500 ml-3" />
                                <input 
                                    type="text" 
                                    className="w-full bg-transparent p-3 text-white placeholder-slate-600 outline-none text-lg"
                                    placeholder="Nombre, IP o Código..."
                                    value={filtro}
                                    onChange={e => setFiltro(e.target.value)}
                                />
                                {filtro && <button onClick={() => setFiltro('')} className="p-2 text-slate-500"><XMarkIcon className="w-6 h-6" /></button>}
                            </div>
                        </div>

                        <div className="space-y-3 pb-20">
                            {facturasFiltradas.map((f) => {
                                const isVencida = new Date(f.fecha_vencimiento) < new Date();
                                return (
                                    <div key={f.id} onClick={() => handleOpenCobrar(f)} className="bg-[#1a1f2e] border border-slate-800 rounded-xl p-4 flex justify-between items-center relative overflow-hidden">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isVencida ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                        <div className="pl-2">
                                            <h3 className="font-bold text-white text-base">{f.cliente.nombre}</h3>
                                            <div className="flex gap-2 mt-2">
                                                {f.cliente.cedula && <span className="text-[9px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded border border-indigo-400">SN: {f.cliente.cedula}</span>}
                                                <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono">{f.cliente.ip_asignada}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-emerald-400">${f.saldo_pendiente}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* === PANTALLA 2: PROMESAS (NUEVA) === */}
                {activeTab === 'promesas' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="text-amber-100 text-xs font-bold uppercase tracking-widest">Dinero en Retención</span>
                                <h2 className="text-4xl font-black text-white mt-1">${totalRetencionPromesas.toLocaleString('es-MX')}</h2>
                                <p className="text-amber-200 text-[10px] mt-2 font-bold uppercase">{promesas.length} Acuerdos de palabra</p>
                            </div>
                            <ShieldExclamationIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
                        </div>

                        <div className="space-y-3 pb-20">
                            {promesas.length === 0 ? (
                                <div className="text-center py-20 opacity-30 italic">No hay promesas vigentes</div>
                            ) : (
                                promesas.map((p) => (
                                    <div key={p.id} onClick={() => handleOpenCobrar(p)} className="bg-[#1a1f2e] border border-amber-500/30 rounded-xl p-4 flex justify-between items-center active:scale-95 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-amber-500/10 p-2 rounded-lg"><ClockIcon className="w-5 h-5 text-amber-500"/></div>
                                            <div>
                                                <p className="font-bold text-white text-sm">{p.cliente.nombre}</p>
                                                <p className="text-[10px] text-amber-400 font-bold uppercase">Corte: {new Date(p.fecha_promesa_pago).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <p className="font-black text-white text-lg">${p.saldo_pendiente}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* === PANTALLA 3: HISTORIAL === */}
                {activeTab === 'historial' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClockIcon className="w-6 h-6 text-blue-500"/>Movimientos de Hoy</h2>
                        <div className="space-y-3 pb-20">
                            {historial.map((item, idx) => (
                                <div key={idx} className="bg-[#1a1f2e] border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${item.metodo === 'efectivo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                            {item.metodo === 'efectivo' ? <BanknotesIcon className="w-5 h-5"/> : <CreditCardIcon className="w-5 h-5"/>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{item.cliente_nombre}</p>
                                            <p className="text-xs text-slate-500">{new Date(item.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {item.metodo}</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-white text-lg">+${item.monto}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === PANTALLA 4: CIERRE === */}
                {activeTab === 'cierre' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><ChartPieIcon className="w-6 h-6 text-purple-500"/>Resumen de Caja</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#1a1f2e] p-5 rounded-2xl border border-emerald-500/20 text-center">
                                <BanknotesIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2"/><p className="text-slate-400 text-[10px] font-bold uppercase">Efectivo</p><p className="text-2xl font-black text-white">${totalEfectivo}</p>
                            </div>
                            <div className="bg-[#1a1f2e] p-5 rounded-2xl border border-blue-500/20 text-center">
                                <CreditCardIcon className="w-8 h-8 text-blue-500 mx-auto mb-2"/><p className="text-slate-400 text-[10px] font-bold uppercase">Transferencia</p><p className="text-2xl font-black text-white">${totalTransferencia}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
                            <p className="text-slate-400 text-sm mb-1">Total General Recaudado</p>
                            <p className="text-5xl font-black text-white tracking-tight">${totalCobradoHoy}</p>
                        </div>
                        <button onClick={fetchData} className="w-full bg-slate-800 py-4 rounded-xl flex items-center justify-center gap-2"><ArrowPathIcon className="w-5 h-5"/> Actualizar Datos</button>
                    </div>
                )}
            </div>

            {/* BARRA DE NAVEGACIÓN INFERIOR (Actualizada) */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#161b28] border-t border-slate-800 px-2 py-2 pb-safe flex justify-around items-center z-40">
                <NavButton active={activeTab === 'cobrar'} icon={HomeIcon} label="Cobrar" onClick={() => setActiveTab('cobrar')} />
                <NavButton active={activeTab === 'promesas'} icon={ShieldExclamationIcon} label="Promesas" onClick={() => setActiveTab('promesas')} badge={promesas.length} />
                <NavButton active={activeTab === 'historial'} icon={ClockIcon} label="Historial" onClick={() => setActiveTab('historial')} />
                <NavButton active={activeTab === 'cierre'} icon={ChartPieIcon} label="Cierre" onClick={() => setActiveTab('cierre')} />
            </div>

            {/* MODAL DE COBRO (Bottom Sheet) */}
            <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-0">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="translate-y-full opacity-0" enterTo="translate-y-0 opacity-100" leave="ease-in duration-200" leaveFrom="translate-y-0 opacity-100" leaveTo="translate-y-full opacity-0">
                                <Dialog.Panel className="w-full sm:max-w-md bg-[#1e293b] rounded-t-3xl border-t border-slate-700 shadow-2xl relative pb-safe">
                                    <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mt-3 mb-1"></div>
                                    <Tab.Group>
                                        <div className="border-b border-slate-700 px-6 pt-4">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <Dialog.Title className="text-xl font-bold text-white">{selectedFactura?.cliente.nombre}</Dialog.Title>
                                                    <p className="text-sm text-slate-400">Deuda: <span className="text-rose-400 font-bold">${selectedFactura?.saldo_pendiente}</span></p>
                                                </div>
                                                <button onClick={() => setIsModalOpen(false)} className="bg-slate-800 p-2 rounded-full text-slate-400"><XMarkIcon className="w-5 h-5"/></button>
                                            </div>
                                            <Tab.List className="flex space-x-1 rounded-xl bg-slate-800/50 p-1 mb-4">
                                                <Tab className={({ selected }) => `w-full rounded-lg py-2.5 text-sm font-bold transition ${selected ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Cobrar</Tab>
                                                <Tab className={({ selected }) => `w-full rounded-lg py-2.5 text-sm font-bold transition ${selected ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Promesa</Tab>
                                            </Tab.List>
                                        </div>
                                        <Tab.Panels className="p-6">
                                            <Tab.Panel>
                                                <form onSubmit={handleProcesarCobro} className="space-y-6">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-400 uppercase">Monto Recibido</label>
                                                        <div className="relative mt-2">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                                            <input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded-2xl py-4 pl-8 pr-4 text-white text-3xl font-black focus:border-blue-500 outline-none" value={formCobro.monto} onChange={e => setFormCobro({...formCobro, monto: Number(e.target.value)})} onFocus={(e) => e.target.select()}/>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <MethodButton active={formCobro.metodo === 'efectivo'} onClick={() => setFormCobro({...formCobro, metodo: 'efectivo'})} icon={BanknotesIcon} label="Efectivo" />
                                                        <MethodButton active={formCobro.metodo === 'transferencia'} onClick={() => setFormCobro({...formCobro, metodo: 'transferencia'})} icon={CreditCardIcon} label="Transf." />
                                                    </div>
                                                    <button type="submit" className="w-full bg-blue-600 py-4 rounded-xl text-lg font-bold shadow-lg shadow-blue-900/30 active:scale-95 transition">CONFIRMAR PAGO</button>
                                                </form>
                                            </Tab.Panel>
                                            <Tab.Panel>
                                                <form onSubmit={handleProcesarPromesa} className="space-y-6">
                                                    <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex gap-4"><ShieldExclamationIcon className="w-10 h-10 text-amber-500 shrink-0"/><p className="text-xs text-amber-200">Extender el servicio temporalmente hasta la nueva fecha.</p></div>
                                                    <div><label className="text-xs font-bold text-slate-400 uppercase">Nueva Fecha Límite</label><input type="date" className="w-full mt-2 bg-[#0f172a] border border-slate-600 rounded-xl py-4 px-4 text-white font-bold outline-none" value={fechaPromesa} onChange={e => setFechaPromesa(e.target.value)}/></div>
                                                    <button type="submit" className="w-full bg-amber-600 py-4 rounded-xl text-lg font-bold shadow-lg shadow-amber-900/30 active:scale-95 transition">GUARDAR PROMESA</button>
                                                </form>
                                            </Tab.Panel>
                                        </Tab.Panels>
                                    </Tab.Group>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}

// --- SUBCOMPONENTES AUXILIARES ---
const NavButton = ({ active, icon: Icon, label, onClick, badge }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition relative ${active ? 'text-blue-500' : 'text-slate-500'}`}>
        <Icon className={`w-6 h-6 ${active ? 'fill-blue-500/20' : ''}`}/>
        <span className="text-[10px] font-bold">{label}</span>
        {badge > 0 && <span className="absolute top-1 right-2 bg-rose-600 text-white text-[8px] px-1 rounded-full">{badge}</span>}
    </button>
);

const MethodButton = ({ active, onClick, icon: Icon, label }: any) => (
    <div onClick={onClick} className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center justify-center transition ${active ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-[#0f172a] border-slate-700 text-slate-500'}`}>
        <Icon className="w-8 h-8 mb-2"/><span className="font-bold text-sm">{label}</span>
    </div>
);
import { useState, useEffect, Fragment } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { 
    BanknotesIcon, MagnifyingGlassIcon, ArrowRightOnRectangleIcon, 
    XMarkIcon, ArrowPathIcon, ShieldExclamationIcon, ClockIcon, 
    ChartPieIcon, HomeIcon, CreditCardIcon
} from '@heroicons/react/24/outline';

export default function PanelCobrador() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const [activeTab, setActiveTab] = useState<'cobrar' | 'promesas' | 'historial' | 'cierre'>('cobrar');
    const [facturas, setFacturas] = useState<any[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);
    const [promesas, setPromesas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('');
    
    const totalCobradoHoy = historial.reduce((acc, curr) => acc + curr.monto, 0);
    const totalEfectivo = historial.filter(h => h.metodo === 'efectivo').reduce((acc, curr) => acc + curr.monto, 0);
    const totalTransferencia = historial.filter(h => h.metodo === 'transferencia').reduce((acc, curr) => acc + curr.monto, 0);
    const totalRetencionPromesas = promesas.reduce((acc, curr) => acc + curr.saldo_pendiente, 0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFactura, setSelectedFactura] = useState<any>(null);
    const [formCobro, setFormCobro] = useState({ metodo: 'efectivo', referencia: '', monto: 0 });
    const [fechaPromesa, setFechaPromesa] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000; 
            const localISOTime = new Date(now.getTime() - offset).toISOString().split('T')[0];

            const [resAdeudos, resHistorial, resPromesas] = await Promise.all([
                client.get('/finanzas/listado-completo?estado=adeudos'),
                client.get(`/finanzas/pagos-reporte?start_date=${localISOTime}&end_date=${localISOTime}`),
                client.get('/finanzas/listado-completo?estado=promesa')
            ]);

            setFacturas(resAdeudos.data.items);
            setHistorial(resHistorial.data.detalles || []);
            setPromesas(resPromesas.data.items || []);
        } catch (error) {
            toast.error("Error al refrescar datos");
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
            toast.success("Pago registrado", { id: toastId });
            setIsModalOpen(false);
            setFiltro('');
            fetchData();
        } catch (error) { toast.error("Error al cobrar", { id: toastId }); }
    };

    const handleProcesarPromesa = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading("Guardando promesa...");
        try {
            await client.post('/finanzas/promesa-pago', {
                factura_id: selectedFactura.id,
                nueva_fecha: fechaPromesa
            });
            toast.success("Promesa guardada", { id: toastId });
            setIsModalOpen(false);
            setFiltro('');
            fetchData();
        } catch (error) { toast.error("Error al guardar promesa", { id: toastId }); }
    };

    const facturasFiltradas = filtro.length > 0 
        ? facturas.filter(f => f.cliente.nombre.toLowerCase().includes(filtro.toLowerCase()) || f.cliente.ip_asignada?.includes(filtro))
        : [];

    return (
        /* ✅ ADAPTADO: Fondo base dinámico */
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] text-slate-800 dark:text-white font-sans flex flex-col transition-colors duration-300">
            
            {/* HEADER ADAPTATIVO */}
            <div className="bg-white dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm dark:shadow-xl transition-colors">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-lg text-white">
                        {user.usuario?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest transition-colors">Cobrador</p>
                        <h1 className="text-sm font-black text-slate-900 dark:text-white capitalize transition-colors">{user.usuario}</h1>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowRightOnRectangleIcon className="w-6 h-6" />
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                
                {/* === TABS === */}
                {activeTab === 'cobrar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-md relative overflow-hidden">
                            <span className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Recaudado Hoy</span>
                            <h2 className="text-4xl font-black text-white mt-1">${totalCobradoHoy.toLocaleString('es-MX')}</h2>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-widest">Buscar Cliente</label>
                            <div className="bg-white dark:bg-[#1a1f2e] rounded-xl flex items-center border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-lg p-1 transition-colors">
                                <MagnifyingGlassIcon className="w-6 h-6 text-slate-400 ml-3" />
                                <input className="w-full bg-transparent p-3 text-slate-900 dark:text-white outline-none text-lg font-bold placeholder-slate-400" placeholder="Nombre o IP..." value={filtro} onChange={e => setFiltro(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-3 pb-20">
                            {facturasFiltradas.map((f) => {
                                const isVencida = new Date(f.fecha_vencimiento) < new Date();
                                return (
                                    <div key={f.id} onClick={() => handleOpenCobrar(f)} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center relative overflow-hidden active:scale-[0.98] transition-all">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isVencida ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                        <div className="pl-2">
                                            <h3 className="font-black text-slate-900 dark:text-white text-base transition-colors">{f.cliente.nombre}</h3>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-[9px] font-black text-white bg-indigo-600 px-1.5 py-0.5 rounded uppercase">SN: {f.cliente.cedula}</span>
                                                <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">{f.cliente.ip_asignada}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${f.saldo_pendiente}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* NAV INFERIOR ADAPTATIVO */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#161b28] border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex justify-around items-center z-40 transition-colors">
                <NavButton active={activeTab === 'cobrar'} icon={HomeIcon} label="Cobrar" onClick={() => setActiveTab('cobrar')} />
                <NavButton active={activeTab === 'promesas'} icon={ShieldExclamationIcon} label="Promesas" onClick={() => setActiveTab('promesas')} badge={promesas.length} />
                <NavButton active={activeTab === 'historial'} icon={ClockIcon} label="Historial" onClick={() => setActiveTab('historial')} />
                <NavButton active={activeTab === 'cierre'} icon={ChartPieIcon} label="Cierre" onClick={() => setActiveTab('cierre')} />
            </div>

            {/* MODAL COBRO (Adaptado) */}
            <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-0">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="translate-y-full opacity-0" enterTo="translate-y-0 opacity-100">
                                <Dialog.Panel className="w-full sm:max-w-md bg-white dark:bg-[#1e293b] rounded-t-3xl border-t border-slate-200 dark:border-slate-700 shadow-2xl p-6 transition-colors">
                                    <div className="flex justify-between items-center mb-6">
                                        <Dialog.Title className="text-xl font-black text-slate-900 dark:text-white">{selectedFactura?.cliente.nombre}</Dialog.Title>
                                        <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500"><XMarkIcon className="w-5 h-5"/></button>
                                    </div>
                                    {/* (El resto de la lógica de tabs se mantiene igual, solo asegura que los fondos de botones sean bg-slate-50 dark:bg-[#0f172a] y textos contrasten) */}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}

const NavButton = ({ active, icon: Icon, label, onClick, badge }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition relative ${active ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 dark:text-slate-500'}`}>
        <Icon className={`w-6 h-6`}/>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        {badge > 0 && <span className="absolute top-1 right-2 bg-rose-600 text-white text-[8px] px-1 rounded-full">{badge}</span>}
    </button>
);
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { 
    CloudArrowUpIcon, ServerIcon, CurrencyDollarIcon, 
    MapPinIcon, ChartBarIcon, ShieldCheckIcon, CheckCircleIcon,
    RocketLaunchIcon
} from '@heroicons/react/24/outline';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-200 font-sans selection:bg-indigo-500/30">
            
            {/* ================= NAVBAR ================= */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0c10]/80 backdrop-blur-xl border-b border-slate-800/80">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">
                            F
                        </div>
                        <span className="text-xl font-black text-white tracking-tight">FdezNet</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
                        <a href="#caracteristicas" className="hover:text-white transition-colors">Características</a>
                        <a href="#precios" className="hover:text-white transition-colors">Precios</a>
                        <Link to="/docs" className="hover:text-white transition-colors">Documentación</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-bold text-slate-300 hover:text-white transition-colors hidden sm:block">Iniciar Sesión</Link>
                        <Link to="/registro" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-black tracking-wide shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                            Contratar Ahora
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ================= HERO SECTION ================= */}
            <section className="relative pt-40 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Luces de fondo (Glow) */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-8">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Software WISP / ISP en la Nube
                    </div>
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-tight tracking-tight mb-8">
                        Administra tu red de internet <br className="hidden sm:block"/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                            sin complicaciones.
                        </span>
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-medium">
                        Facturación automatizada, cortes en MikroTik, gestión de ONUs y monitoreo OLT en una plataforma ultra rápida. <strong>Nosotros nos encargamos del servidor (VPS), tú dedícate a crecer.</strong>
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href="#precios" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-base font-black tracking-wide shadow-[0_0_40px_rgba(79,70,229,0.3)] active:scale-95 transition-all">
                            Ver Planes
                        </a>
                        <Link to="/docs" className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl text-base font-black tracking-wide border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                            Ver Documentación
                        </Link>
                    </div>
                </div>

                {/* Dashboard Mockup/Preview */}
                <div className="mt-20 max-w-6xl mx-auto relative z-10">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl p-2 sm:p-4">
                        <div className="bg-[#0a0c10] rounded-[1.5rem] border border-slate-800/50 aspect-video md:aspect-[21/9] flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-slate-900 to-black"></div>
                            <ChartBarIcon className="w-20 h-20 text-slate-800" />
                            <p className="absolute bottom-10 text-slate-600 font-black uppercase tracking-widest text-sm">Preview del Panel de Control</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= FEATURES ================= */}
            <section id="caracteristicas" className="py-24 px-6 bg-[#0d0f14] border-y border-slate-800/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Todo lo que tu WISP necesita</h2>
                        <p className="text-slate-400 font-medium max-w-2xl mx-auto">Reemplaza el Excel y los sistemas anticuados por una plataforma integral alojada en servidores de alto rendimiento.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard 
                            icon={ServerIcon} color="text-indigo-500" bg="bg-indigo-500/10" border="border-indigo-500/20"
                            title="Sincronización MikroTik" 
                            desc="Cortes automáticos, promesas de pago y control de ancho de banda directo a tus routers."
                        />
                        <FeatureCard 
                            icon={CurrencyDollarIcon} color="text-emerald-500" bg="bg-emerald-500/10" border="border-emerald-500/20"
                            title="Punto de Venta (POS)" 
                            desc="Cobra rápido con nuestra interfaz fluida. Genera saldos a favor, tickets y alertas de pago."
                        />
                        <FeatureCard 
                            icon={CloudArrowUpIcon} color="text-cyan-500" bg="bg-cyan-500/10" border="border-cyan-500/20"
                            title="Radar OLT en Vivo" 
                            desc="Monitorea potencias ópticas, ONUs caídas y equipos no registrados sin entrar a la consola."
                        />
                        <FeatureCard 
                            icon={MapPinIcon} color="text-rose-500" bg="bg-rose-500/10" border="border-rose-500/20"
                            title="Logística y NAPs" 
                            desc="Geolocaliza a tus clientes. Controla puertos libres y ocupados de tus cajas NAP en tiempo real."
                        />
                        <FeatureCard 
                            icon={ShieldCheckIcon} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20"
                            title="Inventario de Hardware" 
                            desc="Sigue el rastro de cada ONU. Desde que entra a bodega hasta que se instala o reporta falla."
                        />
                        <FeatureCard 
                            icon={RocketLaunchIcon} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20"
                            title="Alojamiento VPS Incluido" 
                            desc="No te preocupes por servidores. Tu licencia incluye alojamiento privado, seguro y administrado por nosotros."
                        />
                    </div>
                </div>
            </section>

            {/* ================= PRICING ================= */}
            <section id="precios" className="py-24 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full mb-6">
                            <span className="text-emerald-400 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5"/> Tarifa Única sin cobros ocultos
                            </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Un solo plan. Todo ilimitado.</h2>
                        <p className="text-slate-400 font-medium max-w-2xl mx-auto">
                            A diferencia de otros, no te cobramos por cantidad de clientes ni por routers extra. 
                            Obtén acceso total al sistema y nosotros nos encargamos del servidor.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <PricingCard 
                            name="Mensual" price="650" period="mes"
                            clients="Ilimitados"
                            features={[
                                'Clientes Ilimitados', 
                                'Routers MikroTik Ilimitados', 
                                'Alojamiento VPS Dedicado', 
                                'Mantenimiento y Respaldo',
                                'Soporte Técnico'
                            ]}
                        />
                        <PricingCard 
                            name="Semestral" price="3,250" period="6 meses"
                            clients="Ilimitados"
                            recommended badgeText="Ahorras $650 MXN"
                            features={[
                                'Todas las funciones incluidas',
                                'Clientes Ilimitados',
                                'Alojamiento VPS Dedicado',
                                'Actualizaciones sin costo',
                                '¡1 mes totalmente gratis!'
                            ]}
                        />
                        <PricingCard 
                            name="Anual" price="6,500" period="año"
                            clients="Ilimitados"
                            badgeText="Ahorras $1,300 MXN"
                            features={[
                                'Todas las funciones incluidas',
                                'Clientes Ilimitados',
                                'Alojamiento VPS Dedicado',
                                'Actualizaciones sin costo',
                                '¡2 meses totalmente gratis!'
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* ================= FOOTER ================= */}
            <footer className="bg-[#050608] border-t border-slate-800/80 pt-16 pb-8 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black">F</div>
                            <span className="text-xl font-black text-white">FdezNet</span>
                        </div>
                        <p className="text-slate-400 text-sm max-w-xs">El software de gestión ISP de tarifa única. Creado en México para el mundo.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-4">Producto</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><a href="#caracteristicas" className="hover:text-indigo-400 transition-colors">Características</a></li>
                            <li><a href="#precios" className="hover:text-indigo-400 transition-colors">Precios y Planes</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-4">Soporte</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><Link to="/docs" className="hover:text-indigo-400 transition-colors">Documentación</Link></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Contacto Ventas</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto text-center text-slate-600 text-xs font-medium pt-8 border-t border-slate-800/80">
                    © {new Date().getFullYear()} FdezNet. Todos los derechos reservados.
                </div>
            </footer>
        </div>
    );
}

const FeatureCard = ({ icon: Icon, color, bg, border, title, desc }: any) => (
    <div className="bg-[#12141a] p-6 rounded-[1.5rem] border border-slate-800/80 hover:border-slate-700 transition-colors group">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${bg} ${border} border group-hover:scale-110 transition-transform`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <h3 className="text-lg font-black text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
);

const PricingCard = ({ name, price, period, clients, features, recommended, badgeText }: any) => (
    <div className={`relative bg-[#12141a] p-8 rounded-[2rem] border transition-transform ${recommended ? 'border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.15)] transform md:-translate-y-4' : 'border-slate-800/80'}`}>
        
        {badgeText && (
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${recommended ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                {badgeText}
            </div>
        )}
        
        <h3 className="text-xl font-black text-slate-300 mb-2 uppercase tracking-widest text-[11px]">{name}</h3>
        <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl md:text-5xl font-black text-white">${price}</span>
            <span className="text-slate-400 text-sm font-bold">MXN / {period}</span>
        </div>
        <p className="text-indigo-400 text-sm font-black mb-8 pb-8 border-b border-slate-800">Clientes {clients}</p>
        
        <ul className="space-y-4 mb-8">
            {features.map((f: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                    <CheckCircleIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                    {f}
                </li>
            ))}
        </ul>

        <button className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${recommended ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'}`}>
            Contratar Plan
        </button>
    </div>
);
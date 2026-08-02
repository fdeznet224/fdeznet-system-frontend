/** Documentación pública del producto; actualmente no está enlazada en App. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    BookOpenIcon, ServerIcon, UsersIcon, 
    CurrencyDollarIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    ArrowLeftIcon, PhotoIcon
} from '@heroicons/react/24/outline';

function ImagePlaceholder({ label }: { label: string }) {
    return (
        <div className="w-full aspect-video bg-[#12141a] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 my-8 shadow-inner group transition-colors hover:border-indigo-500/50">
            <PhotoIcon className="w-12 h-12 mb-3 text-slate-600 group-hover:text-indigo-500 transition-colors" />
            <p className="font-bold text-sm tracking-wide">{label}</p>
            <p className="text-[10px] uppercase tracking-widest mt-1 opacity-50">(Reemplazar por etiqueta &lt;img&gt;)</p>
        </div>
    );
}

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('intro');

    // Menú de navegación lateral
    const menuItems = [
        { id: 'intro', name: 'Introducción', icon: BookOpenIcon },
        { id: 'mikrotik', name: 'Conectar MikroTik', icon: ServerIcon },
        { id: 'clientes', name: 'Gestión de Clientes', icon: UsersIcon },
        { id: 'finanzas', name: 'Cobros y Cortes', icon: CurrencyDollarIcon },
        { id: 'infra', name: 'Radar OLT y NAPs', icon: MapPinIcon },
        { id: 'whatsapp', name: 'Alertas WhatsApp', icon: ChatBubbleLeftRightIcon },
    ];

    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-300 font-sans selection:bg-indigo-500/30 flex flex-col">
            
            {/* ================= NAVBAR ================= */}
            <nav className="flex-none h-20 border-b border-slate-800/80 bg-[#0a0c10]/80 backdrop-blur-xl z-50 sticky top-0 px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-lg">F</div>
                        <span className="text-lg font-black text-white tracking-tight">Docs</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/login" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-black tracking-wide shadow-lg transition-all active:scale-95">
                        Ir al Sistema
                    </Link>
                </div>
            </nav>

            {/* ================= LAYOUT PRINCIPAL ================= */}
            <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row items-start relative">
                
                {/* BARRA LATERAL (Sidebar) */}
                <aside className="w-full md:w-64 flex-none md:sticky md:top-24 md:h-[calc(100vh-6rem)] overflow-y-auto py-6 md:pr-6 border-b md:border-b-0 md:border-r border-slate-800/80 custom-scrollbar px-4 md:px-0">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-3">Contenido</h3>
                    <ul className="space-y-1">
                        {menuItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => setActiveSection(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                        activeSection === item.id 
                                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                                    }`}
                                >
                                    <item.icon className="w-5 h-5 shrink-0" />
                                    {item.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* CONTENIDO (Main Content) */}
                <main className="flex-1 py-8 px-6 md:px-12 max-w-4xl animate-in fade-in duration-300">
                    
                    {activeSection === 'intro' && (
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white mb-4">Bienvenido a FdezNet</h1>
                            <p className="text-lg text-slate-400 mb-8 leading-relaxed">FdezNet es el sistema de gestión WISP/ISP más moderno. Aquí aprenderás cómo configurar tu red, cobrar a tus clientes y monitorear tu infraestructura de fibra óptica en minutos.</p>
                            
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 mb-8">
                                <h4 className="text-indigo-400 font-black mb-2 flex items-center gap-2">🚀 Antes de empezar</h4>
                                <p className="text-sm">Asegúrate de tener a la mano las credenciales de tu router MikroTik (IP pública o VPN, usuario y contraseña de API) para poder sincronizar el sistema.</p>
                            </div>

                            <ImagePlaceholder label="Screenshot: Dashboard Principal del Sistema" />
                        </div>
                    )}

                    {activeSection === 'mikrotik' && (
                        <div>
                            <h1 className="text-3xl font-black text-white mb-4">Conectar tu MikroTik</h1>
                            <p className="mb-6 text-slate-400">El corazón de FdezNet. Al conectar tu MikroTik, el sistema podrá realizar cortes automáticos, cambiar perfiles de velocidad y leer los consumos en tiempo real.</p>
                            
                            <h3 className="text-xl font-bold text-white mb-3 mt-8">1. Crear Nodos / Routers</h3>
                            <p className="mb-4 text-slate-400">Ve a <strong>Infraestructura &gt; Nodos / Routers</strong> y haz clic en "Agregar Router". Llena los datos de conexión API.</p>
                            
                            <ImagePlaceholder label="Screenshot: Formulario de Agregar MikroTik" />

                            <h3 className="text-xl font-bold text-white mb-3 mt-8">2. Reglas de Corte (Address Lists)</h3>
                            <p className="mb-4 text-slate-400">El sistema crea automáticamente listas de direcciones (Address Lists) llamadas <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 text-xs">Morosos_FdezNet</code>. Debes crear una regla en tu Firewall (Filter) para bloquear el tráfico a los clientes en esta lista.</p>
                        </div>
                    )}

                    {activeSection === 'clientes' && (
                        <div>
                            <h1 className="text-3xl font-black text-white mb-4">Gestión de Clientes</h1>
                            <p className="mb-6 text-slate-400">Aprende a registrar y administrar tus abonados, asignarles IPs, Cajas NAP y asociarlos a tu MikroTik.</p>
                            
                            <ImagePlaceholder label="Screenshot: Directorio de Clientes (Tabla)" />

                            <ul className="space-y-6 text-slate-400 list-decimal pl-5 marker:text-indigo-500 marker:font-black">
                                <li>
                                    <strong className="text-white">Registro de datos básicos:</strong> Nombre, teléfono, y fecha de facturación.
                                </li>
                                <li>
                                    <strong className="text-white">Servicio Técnico:</strong> Asigna la IP, el Plan de Velocidad y el Router MikroTik al que pertenece.
                                </li>
                                <li>
                                    <strong className="text-white">Ubicación y Logística:</strong> Selecciona a qué Caja NAP está conectado y en qué puerto para llevar un control exacto de tus hilos de fibra.
                                </li>
                            </ul>
                        </div>
                    )}

                    {activeSection === 'finanzas' && (
                        <div>
                            <h1 className="text-3xl font-black text-white mb-4">Cobros y Cortes</h1>
                            <p className="mb-6 text-slate-400">FdezNet cuenta con un Punto de Venta (POS) optimizado para que tus cobradores operen rápido, incluso desde el celular.</p>
                            
                            <ImagePlaceholder label="Screenshot: Terminal de Cobro POS" />

                            <div className="grid sm:grid-cols-2 gap-4 mt-8">
                                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                    <h4 className="text-emerald-400 font-black mb-2">Saldos a Favor</h4>
                                    <p className="text-sm">Si el cliente paga más de lo que debe, el sistema guarda el sobrante automáticamente para el próximo mes.</p>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                    <h4 className="text-amber-400 font-black mb-2">Promesas de Pago</h4>
                                    <p className="text-sm">¿Un cliente no puede pagar hoy? Dale una prórroga. El sistema le dará internet temporal y lo cortará si no cumple en la fecha acordada.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'infra' && (
                        <div>
                            <h1 className="text-3xl font-black text-white mb-4">Radar OLT y NAPs</h1>
                            <p className="mb-6 text-slate-400">Deja de usar hojas de cálculo para tus puertos de fibra. FdezNet es tu mapa digital.</p>
                            
                            <h3 className="text-xl font-bold text-white mb-3 mt-8">Radar Óptico</h3>
                            <p className="mb-4 text-slate-400">Sincroniza tu OLT (Ej. ZTE, Huawei, V-SOL) vía SNMP para ver las potencias de las ONUs (RX) en tiempo real. Detecta intrusos y atenuaciones al instante.</p>
                            <ImagePlaceholder label="Screenshot: Pantalla del Radar OLT" />

                            <h3 className="text-xl font-bold text-white mb-3 mt-8">Cajas NAP</h3>
                            <p className="mb-4 text-slate-400">Asigna coordenadas GPS a tus cajas de empalme. Ve visualmente cuántos puertos te quedan libres antes de enviar a un técnico a instalar.</p>
                        </div>
                    )}

                    {activeSection === 'whatsapp' && (
                        <div>
                            <h1 className="text-3xl font-black text-white mb-4">Alertas por WhatsApp</h1>
                            <p className="mb-6 text-slate-400">FdezNet integra su propio motor de WhatsApp Web. No necesitas pagar mensualidades extras a Twilio ni APIs oficiales de Meta.</p>
                            
                            <ImagePlaceholder label="Screenshot: Pantalla de Escaneo QR WhatsApp" />

                            <h3 className="text-xl font-bold text-white mb-3 mt-8">¿Cómo funciona?</h3>
                            <p className="mb-4 text-slate-400">Solo entra a <strong>Configuración &gt; Conexión WhatsApp</strong> y escanea el código QR con el celular de tu empresa (igual que si abrieras WhatsApp Web).</p>
                            
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mt-6">
                                <h4 className="text-white font-black mb-3">Eventos que disparan mensajes:</h4>
                                <ul className="space-y-2 text-sm text-slate-400">
                                    <li>✅ Pago recibido (Ticket digital).</li>
                                    <li>⚠️ Recordatorio de pago (1 a 3 días antes de vencer).</li>
                                    <li>❌ Aviso de suspensión por falta de pago.</li>
                                    <li>📝 Bienvenida a nuevos clientes.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

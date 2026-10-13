import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, BanknotesIcon, PrinterIcon } from '@heroicons/react/24/outline';
import PaymentModal, { type PaymentInvoice } from './components/PaymentModal';
import { apiErrorMessage } from '@/utils/apiError';
import {
    BotonAccion, Buscador, Campo, Cifra, Encabezado, Etiqueta, Lista, PaginaFinanzas, PanelFiltros, Vacio,
} from './components/FinanzasUI';
import { claseControl, dinero, fechaLocal } from './components/formato';

interface Factura extends PaymentInvoice {
    servicio_id?: number | null;
    fecha_vencimiento: string;
    fecha_promesa_pago?: string | null;
    es_promesa_activa?: boolean;
    estado: string;
    plan_snapshot?: string | null;
    motivo_anulacion?: string | null;
    fecha_anulacion?: string | null;
    cliente?: {
        nombre?: string | null;
        cedula?: string | null;
        ip_asignada?: string | null;
    } | null;
    servicio?: {
        id: number;
        alias: string;
        direccion?: string | null;
        estado: string;
    } | null;
}

interface ResumenFacturas {
    pagadas_cant: number;
    pagadas_total: number;
    pendientes_cant: number;
    pendientes_total: number;
    vencidas_cant: number;
    vencidas_total: number;
    anuladas_cant: number;
    anuladas_total: number;
}

interface RouterOption {
    id: number;
    nombre: string;
}

interface FacturasResponse {
    items: Factura[];
    resumen: ResumenFacturas;
}

interface FacturaFilters {
    inicio: string;
    fin: string;
    tipoFecha: string;
    routerId: string;
    estado: string;
}

function getInitialFilters(): FacturaFilters {
    const date = new Date();
    return {
        inicio: fechaLocal(new Date(date.getFullYear(), date.getMonth(), 1)),
        fin: fechaLocal(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
        tipoFecha: 'vencimiento',
        routerId: '',
        estado: 'cualquiera'
    };
}

const INITIAL_FILTERS = getInitialFilters();

export default function Facturas() {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [resumen, setResumen] = useState<ResumenFacturas | null>(null);
    const [routers, setRouters] = useState<RouterOption[]>([]);
    const [loading, setLoading] = useState(false);

    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
    const [filtros, setFiltros] = useState<FacturaFilters>({ ...INITIAL_FILTERS });
    // Nombre, contrato o folio: busca en todas las fechas.
    const [busqueda, setBusqueda] = useState('');
    const busquedaActiva = busqueda.trim();

    const fetchFacturas = useCallback(async (activeFilters: FacturaFilters, texto = '') => {
        setLoading(true);
        try {
            const res = await client.get<FacturasResponse>('/finanzas/listado-completo', {
                params: {
                    start_date: activeFilters.inicio,
                    end_date: activeFilters.fin,
                    tipo_fecha: activeFilters.tipoFecha,
                    estado: activeFilters.estado,
                    router_id: activeFilters.routerId || undefined,
                    busqueda: texto || undefined,
                }
            });
            setFacturas(res.data.items);
            setResumen(res.data.resumen);
        } catch {
            toast.error("Error cargando facturas");
        } finally {
            setLoading(false);
        }
    }, []);

    const [descargandoId, setDescargandoId] = useState<number | null>(null);
    const [emitiendo, setEmitiendo] = useState(false);

    const descargarPdf = async (factura: Factura) => {
        setDescargandoId(factura.id);
        try {
            const res = await client.get<Blob>(`/finanzas/facturas/${factura.id}/pdf`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const enlace = document.createElement('a');
            enlace.href = url;
            enlace.download = `factura-${factura.id.toString().padStart(6, '0')}.pdf`;
            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch {
            toast.error('No se pudo generar el PDF');
        } finally {
            setDescargandoId(null);
        }
    };

    // Lo mismo que hace el proceso automático diario: solo emite las facturas
    // que ya tocan y no existen; nunca adelanta meses.
    const emisionMasiva = async () => {
        const ok = window.confirm(
            'Emisión masiva\n\nGenera ahora las facturas que ya tocan y que todavía no se emitieron ' +
            '(lo mismo que hace el proceso automático cada día). No adelanta meses ni duplica facturas.\n\n¿Continuar?'
        );
        if (!ok) return;
        setEmitiendo(true);
        const toastId = toast.loading('Emitiendo facturas…');
        try {
            const res = await client.post<{ detalles?: Record<string, number> }>('/finanzas/generar-masivo');
            const d = res.data.detalles || {};
            const generadas = d.facturas_generadas ?? 0;
            toast.success(
                generadas > 0
                    ? `${generadas} factura${generadas === 1 ? '' : 's'} emitida${generadas === 1 ? '' : 's'}`
                    : 'No había facturas pendientes de emitir: ya estaban al día',
                { id: toastId, duration: 6000 },
            );
            await fetchFacturas(filtros, busquedaActiva);
        } catch (error: unknown) {
            const detail = apiErrorMessage(error, '');
            toast.error(detail || 'No se pudo hacer la emisión masiva', { id: toastId });
        } finally {
            setEmitiendo(false);
        }
    };

    const handleAnular = async (factura: Factura) => {
        const motivo = window.prompt('Motivo de la anulación (mínimo 5 caracteres):');
        if (!motivo) return;
        if (motivo.trim().length < 5) {
            toast.error('El motivo debe tener al menos 5 caracteres');
            return;
        }
        const nuevaFecha = window.prompt(
            'Nueva fecha de facturación (AAAA-MM-DD). Déjala vacía si no se regenerará:',
            '',
        );
        if (nuevaFecha && !/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) {
            toast.error('La fecha debe tener formato AAAA-MM-DD');
            return;
        }
        const toastId = toast.loading('Anulando factura…');
        try {
            await client.post(`/finanzas/facturas/${factura.id}/anular`, {
                motivo: motivo.trim(),
                nueva_fecha_facturacion: nuevaFecha || null,
            });
            toast.success('Factura anulada correctamente', { id: toastId });
            await fetchFacturas(filtros, busquedaActiva);
        } catch (error: unknown) {
            const detail = apiErrorMessage(error, '');
            toast.error(detail || 'No fue posible anular la factura', { id: toastId });
        }
    };

    useEffect(() => {
        void client.get<RouterOption[]>('/network/routers/')
            .then(response => setRouters(response.data))
            .catch(() => toast.error("Error cargando routers"));
    }, []);

    // Los filtros se aplican solos; la búsqueda (desde 2 letras) espera a que
    // se deje de escribir y busca en todas las fechas.
    const [busquedaAplicada, setBusquedaAplicada] = useState('');
    const aplicadaRef = useRef<string | null>(null);
    useEffect(() => {
        if (busquedaActiva && busquedaActiva.length < 2) return;
        const timer = window.setTimeout(() => {
            aplicadaRef.current = busquedaActiva;
            setBusquedaAplicada(busquedaActiva);
            void fetchFacturas(filtros, busquedaActiva);
        }, busquedaActiva === (aplicadaRef.current ?? busquedaActiva) ? 0 : 400);
        return () => window.clearTimeout(timer);
    }, [busquedaActiva, fetchFacturas, filtros]);

    const filtrarEstado = (estado: string) =>
        setFiltros((actual) => ({ ...actual, estado: actual.estado === estado ? 'cualquiera' : estado }));
    const filtrosActivos = [
        filtros.routerId,
        filtros.estado !== 'cualquiera',
        filtros.tipoFecha !== INITIAL_FILTERS.tipoFecha,
        filtros.inicio !== INITIAL_FILTERS.inicio || filtros.fin !== INITIAL_FILTERS.fin,
    ].filter(Boolean).length;

    return (
        <PaginaFinanzas>
            <Encabezado
                titulo="Facturas"
                subtitulo="Cobra, anula o descarga las facturas de tus clientes"
                accion={
                    <button
                        type="button"
                        onClick={() => void emisionMasiva()}
                        disabled={emitiendo}
                        title="Emite ahora las facturas que ya tocan y no se han emitido"
                        className="h-10 shrink-0 rounded-xl bg-slate-900 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95 disabled:opacity-60 dark:bg-white dark:text-slate-900"
                    >
                        {emitiendo ? 'Emitiendo…' : 'Emisión masiva'}
                    </button>
                }
            />

            <Buscador
                valor={busqueda}
                onCambio={setBusqueda}
                placeholder="Nombre, contrato o folio"
                etiqueta="Buscar factura por nombre, contrato o folio"
                filtrosAbiertos={mostrarFiltros}
                filtrosActivos={filtrosActivos}
                onFiltros={() => setMostrarFiltros((abierto) => !abierto)}
            />

            {mostrarFiltros && (
                <PanelFiltros>
                    <Campo etiqueta="Fecha de">
                        <select className={claseControl} value={filtros.tipoFecha} onChange={e => setFiltros({ ...filtros, tipoFecha: e.target.value })}>
                            <option value="vencimiento">Vencimiento</option>
                            <option value="emision">Emisión</option>
                            <option value="pago">Pago</option>
                        </select>
                    </Campo>
                    <Campo etiqueta="Estado">
                        <select className={claseControl} value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
                            <option value="cualquiera">Todos</option>
                            <option value="pagada">Pagadas</option>
                            <option value="pendiente">Pendientes</option>
                            <option value="vencida">Vencidas</option>
                            <option value="promesa">Con promesa</option>
                            <option value="anulada">Anuladas</option>
                        </select>
                    </Campo>
                    <Campo etiqueta="Desde">
                        <input type="date" className={claseControl} value={filtros.inicio} onChange={e => setFiltros({ ...filtros, inicio: e.target.value })} />
                    </Campo>
                    <Campo etiqueta="Hasta">
                        <input type="date" className={claseControl} value={filtros.fin} onChange={e => setFiltros({ ...filtros, fin: e.target.value })} />
                    </Campo>
                    <Campo etiqueta="Router" ancho>
                        <select className={claseControl} value={filtros.routerId} onChange={e => setFiltros({ ...filtros, routerId: e.target.value })}>
                            <option value="">Todos</option>
                            {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                    </Campo>
                    <div className="col-span-2 flex items-end justify-end">
                        <BotonAccion onClick={() => setFiltros({ ...INITIAL_FILTERS })}>Quitar filtros</BotonAccion>
                    </div>
                </PanelFiltros>
            )}

            {resumen && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Cifra etiqueta="Pagado" valor={dinero(resumen.pagadas_total)} detalle={cuantas(resumen.pagadas_cant)} tono="emerald" activo={filtros.estado === 'pagada'} onClick={() => filtrarEstado('pagada')} />
                    <Cifra etiqueta="Pendiente" valor={dinero(resumen.pendientes_total)} detalle={cuantas(resumen.pendientes_cant)} tono="amber" activo={filtros.estado === 'pendiente'} onClick={() => filtrarEstado('pendiente')} />
                    <Cifra etiqueta="Vencido" valor={dinero(resumen.vencidas_total)} detalle={cuantas(resumen.vencidas_cant)} tono="rose" activo={filtros.estado === 'vencida'} onClick={() => filtrarEstado('vencida')} />
                    <Cifra etiqueta="Anulado" valor={dinero(resumen.anuladas_total)} detalle={cuantas(resumen.anuladas_cant)} tono="slate" activo={filtros.estado === 'anulada'} onClick={() => filtrarEstado('anulada')} />
                </div>
            )}

            {busquedaAplicada && (
                <p className="-mt-1 px-1 text-xs text-slate-500 dark:text-slate-400">
                    Buscando «{busquedaAplicada}» en todas las fechas · {facturas.length} factura{facturas.length === 1 ? '' : 's'}
                </p>
            )}

            <Lista>
                {facturas.length === 0 ? (
                    <Vacio cargando={loading} texto="No se encontraron facturas." />
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {facturas.map(f => {
                            const estado = estadoFactura(f);
                            const acciones = (
                                <>
                                    {!['pagada', 'anulada', 'sin_cargo'].includes(f.estado) && (
                                        <BotonAccion tono="emerald" onClick={() => { setSelectedFactura(f); setShowPaymentModal(true); }}>
                                            <BanknotesIcon className="h-4 w-4" /> Cobrar
                                        </BotonAccion>
                                    )}
                                    {!['anulada', 'sin_cargo'].includes(f.estado) && (
                                        <BotonAccion tono="rose" onClick={() => void handleAnular(f)}>Anular</BotonAccion>
                                    )}
                                    <BotonAccion onClick={() => void descargarPdf(f)} disabled={descargandoId === f.id} title="Descargar PDF" aria-label={`Descargar PDF de la factura ${f.id}`}>
                                        {descargandoId === f.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PrinterIcon className="h-4 w-4" />} PDF
                                    </BotonAccion>
                                </>
                            );
                            return (
                                <li key={f.id} className="flex flex-col gap-2 p-3.5 hover:bg-slate-50 md:flex-row md:items-center md:gap-4 md:px-4 dark:hover:bg-slate-800/40">
                                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-medium leading-tight text-slate-900 dark:text-white">{f.cliente?.nombre}</div>
                                            <div className="mt-0.5 text-xs text-slate-500">
                                                {[f.cliente?.cedula && `Contrato ${f.cliente.cedula}`, `Folio #${f.id.toString().padStart(6, '0')}`, f.plan_snapshot].filter(Boolean).join(' · ')}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right md:hidden">
                                            <div className="font-semibold tabular-nums text-slate-900 dark:text-white">{dinero(f.total)}</div>
                                            <Etiqueta tono={estado.tono}>{estado.texto}</Etiqueta>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 md:w-56 md:flex-col md:items-start md:gap-0.5">
                                        <span>Vence {fechaCorta(f.fecha_vencimiento)}</span>
                                        {f.es_promesa_activa && f.fecha_promesa_pago && <span className="text-amber-600 dark:text-amber-400">Promesa hasta {fechaCorta(f.fecha_promesa_pago)}</span>}
                                        {(f.dias_con_servicio != null || Number(f.cargos_adicionales_total || 0) > 0) && (
                                            <span>
                                                {f.dias_con_servicio ?? 0} días con servicio · {f.dias_sin_servicio ?? 0} sin
                                                {Number(f.cargos_adicionales_total || 0) > 0 && ` · extras ${dinero(f.cargos_adicionales_total)}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="hidden w-28 text-right md:block">
                                        <div className="font-semibold tabular-nums text-slate-900 dark:text-white">{dinero(f.total)}</div>
                                        <Etiqueta tono={estado.tono}>{estado.texto}</Etiqueta>
                                    </div>
                                    <div className="-mx-1 flex justify-end gap-1 md:w-56">{acciones}</div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Lista>

            {selectedFactura && (
                <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} factura={selectedFactura} onSuccess={() => void fetchFacturas(filtros, busquedaActiva)} />
            )}
        </PaginaFinanzas>
    );
}

const cuantas = (cantidad: number) => `${cantidad} factura${cantidad === 1 ? '' : 's'}`;

const fechaCorta = (fecha: string) => {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

function estadoFactura(f: Factura): { texto: string; tono: 'emerald' | 'amber' | 'rose' | 'slate' } {
    if (f.estado === 'pagada') return { texto: 'Pagada', tono: 'emerald' };
    if (f.estado === 'anulada') return { texto: 'Anulada', tono: 'slate' };
    if (f.estado === 'sin_cargo') return { texto: 'Sin cargo', tono: 'slate' };
    if (f.estado === 'vencida' || new Date(f.fecha_vencimiento) < new Date()) return { texto: 'Vencida', tono: 'rose' };
    return { texto: 'Pendiente', tono: 'amber' };
}

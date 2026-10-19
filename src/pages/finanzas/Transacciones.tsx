import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiErrorMessage } from '@/utils/apiError';
import {
    BotonAccion, Buscador, Campo, Cifra, Encabezado, Etiqueta, Lista, PaginaFinanzas, PanelFiltros, Pestanas, Vacio,
} from './components/FinanzasUI';
import { claseControl, dinero, fechaLocal } from './components/formato';

interface PaymentReportItem {
    id: number;
    cliente_id: number;
    cliente_nombre: string;
    cliente_cedula: string;
    factura_id: number;
    metodo: string;
    referencia?: string | null;
    fecha: string;
    usuario_nombre: string;
    monto: number | string;
    zona_nombre?: string;
    router_nombre?: string;
}

interface UserCatalog {
    id: number;
    nombre_completo?: string | null;
    usuario: string;
}

interface RouterCatalog {
    id: number;
    nombre: string;
}
interface ZoneCatalog { id: number; nombre: string; }

interface PaymentReportResponse {
    detalles?: PaymentReportItem[];
}

interface CorrectionInvoice {
    id: number;
    cliente_id: number;
    saldo_pendiente: number | string;
    estado: string;
    fecha_vencimiento: string;
    cliente?: { nombre?: string | null } | null;
}

interface InvoiceSearchResponse {
    items?: CorrectionInvoice[];
}

interface TransactionFilters {
    fechaInicio: string;
    fechaFin: string;
    usuarioId: string;
    routerId: string;
    zonaId: string;
}

const NOMBRE_METODO: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    autovalidado: 'Captura (bot)',
    tarjeta: 'Tarjeta',
    deposito: 'Depósito',
};

const haceDias = (dias: number) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fechaLocal(fecha);
};

const PERIODOS: { valor: string; etiqueta: string; rango: () => [string, string] | null }[] = [
    { valor: 'hoy', etiqueta: 'Hoy', rango: () => [fechaLocal(), fechaLocal()] },
    { valor: 'ayer', etiqueta: 'Ayer', rango: () => [haceDias(1), haceDias(1)] },
    { valor: 'semana', etiqueta: '7 días', rango: () => [haceDias(6), fechaLocal()] },
    {
        valor: 'mes', etiqueta: 'Este mes', rango: () => {
            const hoy = new Date();
            return [fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fechaLocal()];
        },
    },
    { valor: 'otro', etiqueta: 'Otras fechas', rango: () => null },
];

const periodoDe = (filtros: TransactionFilters) => PERIODOS.find((periodo) => {
    const rango = periodo.rango();
    return rango && rango[0] === filtros.fechaInicio && rango[1] === filtros.fechaFin;
})?.valor ?? 'otro';

const fechaHora = (fecha: string) => new Date(fecha).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

const detallePago = (pago: PaymentReportItem) => [
    pago.cliente_cedula && `Contrato ${pago.cliente_cedula}`,
    `Pago #${pago.id}`,
    `Factura #${pago.factura_id}`,
    pago.referencia && `Ref. ${pago.referencia}`,
].filter(Boolean).join(' · ');

export default function Transacciones() {
    const [pagos, setPagos] = useState<PaymentReportItem[]>([]);
    const [usuarios, setUsuarios] = useState<UserCatalog[]>([]);
    const [routers, setRouters] = useState<RouterCatalog[]>([]);
    const [zonas, setZonas] = useState<ZoneCatalog[]>([]);
    const [loading, setLoading] = useState(false);
    const [paymentToCorrect, setPaymentToCorrect] = useState<PaymentReportItem | null>(null);
    const [contractSearch, setContractSearch] = useState('');
    const [correctionInvoices, setCorrectionInvoices] = useState<CorrectionInvoice[]>([]);
    const [destinationInvoiceId, setDestinationInvoiceId] = useState('');
    const [correctionReason, setCorrectionReason] = useState('');
    const [correcting, setCorrecting] = useState(false);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    const [filtros, setFiltros] = useState<TransactionFilters>({
        fechaInicio: fechaLocal(),
        fechaFin: fechaLocal(),
        usuarioId: '',
        routerId: '',
        zonaId: ''
    });
    // Nombre, contrato, folio o referencia: busca en todas las fechas.
    const [busqueda, setBusqueda] = useState('');
    const [busquedaAplicada, setBusquedaAplicada] = useState('');
    const aplicadaRef = useRef('');

    const fetchPagos = useCallback(async (activos: TransactionFilters, texto: string) => {
        setLoading(true);
        try {
            const params = texto
                ? { busqueda: texto }
                : { start_date: activos.fechaInicio, end_date: activos.fechaFin };
            const res = await client.get<PaymentReportResponse>('/finanzas/pagos-reporte', {
                params: {
                    ...params,
                    usuario_id: activos.usuarioId || undefined,
                    router_id: activos.routerId || undefined,
                    zona_id: activos.zonaId || undefined,
                },
            });
            setPagos(res.data.detalles ?? []);
        } catch (error) {
            console.error(error);
            toast.error("Error al obtener reporte");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.all([
            client.get<UserCatalog[]>('/usuarios/'),
            client.get<RouterCatalog[]>('/network/routers/'),
            client.get<ZoneCatalog[]>('/zonas/')
        ]).then(([u, r, z]) => {
            setUsuarios(u.data);
            setRouters(r.data);
            setZonas(z.data);
        }).catch((e) => console.error("Error metadatos", e));
    }, []);

    // Los filtros se aplican solos; la búsqueda espera a que se deje de escribir.
    useEffect(() => {
        const texto = busqueda.trim();
        if (texto && texto.length < 2) return;
        const timer = window.setTimeout(() => {
            aplicadaRef.current = texto;
            setBusquedaAplicada(texto);
            void fetchPagos(filtros, texto);
        }, texto === aplicadaRef.current ? 0 : 400);
        return () => window.clearTimeout(timer);
    }, [busqueda, filtros, fetchPagos]);

    const recargar = () => fetchPagos(filtros, busquedaAplicada);

    const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFiltros((current) => ({ ...current, [event.target.name]: event.target.value }));
    };

    const totalMostrado = useMemo(() => {
        return pagos.reduce((acc, curr) => acc + Number(curr.monto), 0);
    }, [pagos]);
    const totalPorMetodo = useMemo(() => pagos.reduce<Record<string, number>>((totales, pago) => {
        totales[pago.metodo] = (totales[pago.metodo] || 0) + Number(pago.monto);
        return totales;
    }, {}), [pagos]);

    const searchCorrectionDestination = async () => {
        if (contractSearch.trim().length < 2) {
            toast.error('Escribe el número de contrato');
            return;
        }
        try {
            const response = await client.get<InvoiceSearchResponse>('/finanzas/listado-completo', {
                params: { busqueda: contractSearch.trim(), estado: 'adeudos' },
            });
            const invoices = (response.data.items || []).filter(
                invoice => invoice.cliente_id !== paymentToCorrect?.cliente_id,
            );
            setCorrectionInvoices(invoices);
            setDestinationInvoiceId(invoices.length === 1 ? String(invoices[0].id) : '');
            if (invoices.length === 0) toast('No se encontraron adeudos de otro cliente', { icon: 'ℹ️' });
        } catch {
            toast.error('No fue posible buscar el contrato');
        }
    };

    const correctPayment = async () => {
        if (!paymentToCorrect || !destinationInvoiceId) {
            toast.error('Selecciona la factura correcta');
            return;
        }
        if (correctionReason.trim().length < 5) {
            toast.error('El motivo debe tener al menos 5 caracteres');
            return;
        }
        if (!window.confirm(
            `Se anulará el pago #${paymentToCorrect.id} de ${paymentToCorrect.cliente_nombre} y se aplicará a la factura #${destinationInvoiceId}. ¿Continuar?`,
        )) return;

        setCorrecting(true);
        const toastId = toast.loading('Corrigiendo cobro…');
        try {
            const response = await client.post<{ requiere_revision_servicio_origen?: boolean }>(`/finanzas/pagos/${paymentToCorrect.id}/corregir`, {
                factura_destino_id: Number(destinationInvoiceId),
                motivo: correctionReason.trim(),
            });
            toast.success('Cobro corregido y auditado correctamente', { id: toastId });
            if (response.data.requiere_revision_servicio_origen) {
                toast('Revisa el estado del servicio del cliente original', { icon: '⚠️' });
            }
            setPaymentToCorrect(null);
            setContractSearch('');
            setCorrectionInvoices([]);
            setDestinationInvoiceId('');
            setCorrectionReason('');
            await recargar();
        } catch (error: unknown) {
            const detail = apiErrorMessage(error, '');
            toast.error(detail || 'No fue posible corregir el cobro', { id: toastId });
        } finally {
            setCorrecting(false);
        }
    };

    const annulPayment = async (payment: PaymentReportItem) => {
        const reason = window.prompt(
            'Motivo de la anulación (mínimo 5 caracteres):',
            'Pago registrado al cliente equivocado',
        );
        if (!reason) return;
        if (reason.trim().length < 5) {
            toast.error('El motivo debe tener al menos 5 caracteres');
            return;
        }
        if (!window.confirm(
            `Se quitará el pago #${payment.id} de ${payment.cliente_nombre}. El dinero NO se aplicará a otro cliente. ¿Continuar?`,
        )) return;

        const toastId = toast.loading('Anulando pago…');
        try {
            await client.post(`/finanzas/pagos/${payment.id}/anular`, {
                motivo: reason.trim(),
            });
            toast.success('Pago anulado; el adeudo del cliente fue restaurado', { id: toastId });
            toast('El pago del cliente correcto no fue modificado', { icon: 'ℹ️' });
            await recargar();
        } catch (error: unknown) {
            const detail = apiErrorMessage(error, '');
            toast.error(detail || 'No fue posible anular el pago', { id: toastId });
        }
    };

    const periodoActual = periodoDe(filtros);
    const filtrosActivos = [filtros.usuarioId, filtros.zonaId, filtros.routerId].filter(Boolean).length;

    return (
        <PaginaFinanzas>
            <Encabezado titulo="Corte de Cobranza" subtitulo="Pagos registrados por día, cajero y zona" />

            <Buscador
                valor={busqueda}
                onCambio={setBusqueda}
                placeholder="Nombre, contrato, folio o referencia"
                etiqueta="Buscar pago por nombre, contrato, folio o referencia"
                filtrosAbiertos={mostrarFiltros}
                filtrosActivos={filtrosActivos}
                onFiltros={() => setMostrarFiltros((abierto) => !abierto)}
            />

            {!busquedaAplicada && (
                <Pestanas
                    opciones={PERIODOS.map(({ valor, etiqueta }) => ({ valor, etiqueta }))}
                    valor={periodoActual}
                    onCambio={(periodo) => {
                        const rango = PERIODOS.find((p) => p.valor === periodo)?.rango();
                        if (rango) setFiltros((actual) => ({ ...actual, fechaInicio: rango[0], fechaFin: rango[1] }));
                        else setMostrarFiltros(true);
                    }}
                />
            )}

            {mostrarFiltros && (
                <PanelFiltros>
                    <Campo etiqueta="Desde">
                        <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFilterChange} className={claseControl} />
                    </Campo>
                    <Campo etiqueta="Hasta">
                        <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleFilterChange} className={claseControl} />
                    </Campo>
                    <Campo etiqueta="Cajero">
                        <select name="usuarioId" value={filtros.usuarioId} onChange={handleFilterChange} className={claseControl}>
                            <option value="">Todos</option>
                            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo || u.usuario}</option>)}
                        </select>
                    </Campo>
                    <Campo etiqueta="Zona">
                        <select name="zonaId" value={filtros.zonaId} onChange={handleFilterChange} className={claseControl}>
                            <option value="">Todas</option>
                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                        </select>
                    </Campo>
                    <Campo etiqueta="Router">
                        <select name="routerId" value={filtros.routerId} onChange={handleFilterChange} className={claseControl}>
                            <option value="">Todos</option>
                            {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                    </Campo>
                </PanelFiltros>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Cifra etiqueta="Total cobrado" valor={dinero(totalMostrado)} detalle={`${pagos.length} pago${pagos.length === 1 ? '' : 's'}`} tono="emerald" />
                {Object.entries(totalPorMetodo).map(([metodo, total]) => (
                    <Cifra key={metodo} etiqueta={NOMBRE_METODO[metodo] ?? metodo} valor={dinero(total)} tono={metodo === 'efectivo' ? 'emerald' : 'blue'} />
                ))}
            </div>

            {busquedaAplicada && (
                <p className="-mt-1 px-1 text-xs text-slate-500 dark:text-slate-400">
                    Buscando «{busquedaAplicada}» en todas las fechas · {pagos.length} pago{pagos.length === 1 ? '' : 's'}
                </p>
            )}

            <Lista>
                {pagos.length === 0 ? (
                    <Vacio cargando={loading} texto={busquedaAplicada ? 'No se encontraron pagos.' : 'No hay pagos en este periodo.'} />
                ) : (
                    <>
                        <table className="hidden w-full text-left text-sm md:table">
                            <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Cliente</th>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium">Método</th>
                                    <th className="px-4 py-3 font-medium">Cajero</th>
                                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {pagos.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900 dark:text-white">{p.cliente_nombre}</div>
                                            <div className="text-xs text-slate-500">{detallePago(p)}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{fechaHora(p.fecha)}</td>
                                        <td className="px-4 py-3"><Etiqueta tono={p.metodo === 'efectivo' ? 'emerald' : 'blue'}>{NOMBRE_METODO[p.metodo] ?? p.metodo}</Etiqueta></td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.usuario_nombre}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{dinero(p.monto)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <BotonAccion tono="amber" onClick={() => setPaymentToCorrect(p)}>Corregir</BotonAccion>
                                                <BotonAccion tono="rose" onClick={() => void annulPayment(p)}>Anular</BotonAccion>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <ul className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
                            {pagos.map((p) => (
                                <li key={p.id} className="flex flex-col gap-1.5 p-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-medium leading-tight text-slate-900 dark:text-white">{p.cliente_nombre}</div>
                                            <div className="mt-0.5 text-xs text-slate-500">{detallePago(p)}</div>
                                        </div>
                                        <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white">{dinero(p.monto)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <Etiqueta tono={p.metodo === 'efectivo' ? 'emerald' : 'blue'}>{NOMBRE_METODO[p.metodo] ?? p.metodo}</Etiqueta>
                                            <span className="truncate">{fechaHora(p.fecha)} · {p.usuario_nombre}</span>
                                        </span>
                                        <span className="flex shrink-0 gap-1">
                                            <BotonAccion tono="amber" onClick={() => setPaymentToCorrect(p)}>Corregir</BotonAccion>
                                            <BotonAccion tono="rose" onClick={() => void annulPayment(p)}>Anular</BotonAccion>
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </Lista>

            {paymentToCorrect && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
                            <div className="flex gap-3">
                                <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 shrink-0" />
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white">Corregir cobro #{paymentToCorrect.id}</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Origen: {paymentToCorrect.cliente_cedula} · {paymentToCorrect.cliente_nombre} · ${Number(paymentToCorrect.monto).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setPaymentToCorrect(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-500">Contrato correcto</label>
                                <div className="flex gap-2 mt-1">
                                    <input value={contractSearch} onChange={event => setContractSearch(event.target.value)} placeholder="Ej. 329B" className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
                                    <button type="button" onClick={searchCorrectionDestination} className="px-4 rounded-lg bg-blue-600 text-white text-xs font-black">Buscar</button>
                                </div>
                            </div>
                            {correctionInvoices.length > 0 && (
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-500">Factura destino</label>
                                    <select value={destinationInvoiceId} onChange={event => setDestinationInvoiceId(event.target.value)} className="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm">
                                        <option value="">Selecciona una factura</option>
                                        {correctionInvoices.map(invoice => (
                                            <option key={invoice.id} value={invoice.id}>
                                                #{invoice.id} · {invoice.cliente?.nombre || 'Cliente'} · saldo ${Number(invoice.saldo_pendiente).toFixed(2)} · vence {invoice.fecha_vencimiento}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-500">Motivo obligatorio</label>
                                <textarea value={correctionReason} onChange={event => setCorrectionReason(event.target.value)} rows={3} placeholder="Ej. La cobradora seleccionó a un cliente con nombre similar" className="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm resize-none outline-none focus:border-blue-500" />
                            </div>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
                                El movimiento original no se borra: quedará anulado y enlazado al nuevo pago para conservar quién cobró y quién hizo la corrección.
                            </p>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                            <button type="button" onClick={() => setPaymentToCorrect(null)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-black">Cancelar</button>
                            <button type="button" disabled={correcting || !destinationInvoiceId || correctionReason.trim().length < 5} onClick={correctPayment} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black disabled:opacity-50">
                                {correcting ? 'Corrigiendo…' : 'Confirmar corrección'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PaginaFinanzas>
    );
}

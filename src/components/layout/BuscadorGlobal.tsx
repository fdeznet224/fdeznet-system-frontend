import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { ArrowRightIcon, MagnifyingGlassIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import type { AppRole } from '@/utils/roles';
import { itemsDelRol, sinAcentos, type ItemNav } from './navegacion';

export interface ClienteEncontrado {
    id: number;
    nombre: string;
    telefono: string;
    estado: string;
    total_deuda: number;
    cedula?: string | null;
}

interface ClienteApi extends Omit<ClienteEncontrado, 'telefono'> {
    telefono?: string | null;
}

type Resultado = { tipo: 'cliente'; cliente: ClienteEncontrado } | { tipo: 'seccion'; item: ItemNav };

/** Busca clientes (por nombre, contrato o teléfono) y secciones del sistema. */
export default function BuscadorGlobal({ abierto, rol, onCerrar, onCliente, onSeccion }: {
    abierto: boolean;
    rol: AppRole;
    onCerrar: () => void;
    onCliente: (cliente: ClienteEncontrado) => void;
    onSeccion: (item: ItemNav) => void;
}) {
    const [texto, setTexto] = useState('');
    const [clientes, setClientes] = useState<ClienteEncontrado[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [marcado, setMarcado] = useState(0);
    const lista = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!abierto) {
            setTexto('');
            setClientes([]);
        }
    }, [abierto]);

    useEffect(() => {
        const consulta = texto.trim();
        if (consulta.length < 3) {
            setClientes([]);
            return;
        }
        let vigente = true;
        const espera = window.setTimeout(async () => {
            setBuscando(true);
            try {
                const { data } = await client.get<ClienteApi[]>('/clientes/buscar', { params: { query: consulta } });
                if (vigente) setClientes(data.map((c) => ({ ...c, telefono: c.telefono || '' })));
            } catch {
                if (vigente) setClientes([]);
            } finally {
                if (vigente) setBuscando(false);
            }
        }, 300);
        return () => { vigente = false; window.clearTimeout(espera); };
    }, [texto]);

    const secciones = useMemo(() => {
        const consulta = sinAcentos(texto.trim());
        const todas = itemsDelRol(rol);
        if (!consulta) return todas.slice(0, 6);
        return todas.filter((item) => sinAcentos(`${item.nombre} ${item.palabras || ''}`).includes(consulta)).slice(0, 5);
    }, [texto, rol]);

    const resultados: Resultado[] = useMemo(() => [
        ...clientes.map((cliente) => ({ tipo: 'cliente' as const, cliente })),
        ...secciones.map((item) => ({ tipo: 'seccion' as const, item })),
    ], [clientes, secciones]);

    useEffect(() => { setMarcado(0); }, [resultados.length]);

    const elegir = (resultado: Resultado | undefined) => {
        if (!resultado) return;
        if (resultado.tipo === 'cliente') onCliente(resultado.cliente);
        else onSeccion(resultado.item);
        onCerrar();
    };

    const teclas = (evento: React.KeyboardEvent) => {
        if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            evento.preventDefault();
            const paso = evento.key === 'ArrowDown' ? 1 : -1;
            setMarcado((actual) => {
                const siguiente = (actual + paso + resultados.length) % Math.max(resultados.length, 1);
                lista.current?.querySelector(`[data-indice="${siguiente}"]`)?.scrollIntoView({ block: 'nearest' });
                return siguiente;
            });
        } else if (evento.key === 'Enter') {
            evento.preventDefault();
            elegir(resultados[marcado]);
        }
    };

    const consultaCorta = texto.trim().length > 0 && texto.trim().length < 3;

    return (
        <Dialog open={abierto} onClose={onCerrar} aria-label="Buscador" className="fixed inset-0 z-[90]">
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-start justify-center sm:p-4 sm:pt-[12vh]">
                <DialogPanel className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-slate-800">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] dark:border-slate-800 sm:pt-3">
                        <MagnifyingGlassIcon className={`h-5 w-5 shrink-0 ${buscando ? 'animate-pulse text-blue-500' : 'text-slate-400'}`} />
                        <input
                            autoFocus
                            type="text"
                            role="searchbox"
                            enterKeyHint="search"
                            aria-label="Buscar cliente o sección"
                            placeholder="Buscar cliente o sección..."
                            value={texto}
                            onChange={(evento) => setTexto(evento.target.value)}
                            onKeyDown={teclas}
                            className="h-10 min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                        />
                        <button type="button" onClick={onCerrar} aria-label="Cerrar buscador" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div ref={lista} className="flex-1 overflow-y-auto p-2">
                        {clientes.length > 0 && <p className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-400">Clientes</p>}
                        {resultados.map((resultado, indice) => {
                            const activo = indice === marcado;
                            const clase = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${activo ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`;
                            if (resultado.tipo === 'cliente') {
                                const c = resultado.cliente;
                                return (
                                    <button key={`c${c.id}`} type="button" data-indice={indice} onMouseEnter={() => setMarcado(indice)} onClick={() => elegir(resultado)} className={clase}>
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            {c.nombre.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{c.nombre}</span>
                                            <span className="block truncate text-xs text-slate-500">{[c.cedula, c.telefono].filter(Boolean).join(' · ') || `Cliente #${c.id}`}</span>
                                        </span>
                                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${c.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>{c.estado}</span>
                                            {c.total_deuda > 0 && <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Debe ${c.total_deuda}</span>}
                                        </span>
                                    </button>
                                );
                            }
                            const { item } = resultado;
                            const primeraSeccion = indice === clientes.length;
                            return (
                                <div key={item.ruta}>
                                    {primeraSeccion && <p className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-400">{texto.trim() ? 'Secciones' : 'Ir a'}</p>}
                                    <button type="button" data-indice={indice} onMouseEnter={() => setMarcado(indice)} onClick={() => elegir(resultado)} className={clase}>
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300">
                                            <item.icono className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.nombre}</span>
                                        <ArrowRightIcon className={`h-4 w-4 shrink-0 ${activo ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`} />
                                    </button>
                                </div>
                            );
                        })}
                        {consultaCorta && <p className="px-3 py-3 text-xs text-slate-500">Escribe al menos 3 letras para buscar clientes.</p>}
                        {!buscando && texto.trim().length >= 3 && resultados.length === 0 && (
                            <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500">Sin coincidencias</p>
                        )}
                    </div>
                    <div className="hidden items-center gap-4 border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-slate-800 sm:flex">
                        <span><kbd className="font-sans font-semibold">↑ ↓</kbd> moverse</span>
                        <span><kbd className="font-sans font-semibold">Enter</kbd> abrir</span>
                        <span><kbd className="font-sans font-semibold">Esc</kbd> cerrar</span>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

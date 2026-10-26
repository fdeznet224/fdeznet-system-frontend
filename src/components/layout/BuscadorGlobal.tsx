import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { CuadroIcono, Lista } from '@/components/ui/Pagina';
import type { AppRole } from '@/utils/roles';
import { gruposDelRol, itemsDelRol, sinAcentos, type ItemNav } from './navegacion';

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

    // Sin texto se ven todas las secciones agrupadas, como en Más; al escribir, solo las que coinciden.
    const grupos = useMemo(() => {
        const consulta = sinAcentos(texto.trim());
        if (!consulta) return gruposDelRol(rol);
        const items = itemsDelRol(rol).filter((item) => sinAcentos(`${item.nombre} ${item.palabras || ''}`).includes(consulta)).slice(0, 8);
        return items.length ? [{ nombre: 'Secciones', items }] : [];
    }, [texto, rol]);

    const resultados: Resultado[] = useMemo(() => [
        ...clientes.map((cliente) => ({ tipo: 'cliente' as const, cliente })),
        ...grupos.flatMap((grupo) => grupo.items.map((item) => ({ tipo: 'seccion' as const, item }))),
    ], [clientes, grupos]);

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

    const fila = (indice: number) => `flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2 text-left transition active:bg-slate-100 dark:active:bg-slate-800 ${indice === marcado ? 'sm:bg-blue-50 sm:dark:bg-blue-500/10' : ''}`;
    let indiceSeccion = clientes.length;

    return (
        <Dialog open={abierto} onClose={onCerrar} aria-label="Buscador" className="fixed inset-0 z-[90]">
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-start justify-center sm:p-4 sm:pt-[10vh]">
                <DialogPanel className="flex h-[100dvh] w-full flex-col overflow-hidden bg-fondo shadow-2xl dark:bg-slate-950 sm:h-auto sm:max-h-[76vh] sm:max-w-xl sm:rounded-3xl">
                    <div className="flex items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-4">
                        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#e4e4ea] px-3 focus-within:ring-2 focus-within:ring-blue-500/40 dark:bg-slate-800">
                            <MagnifyingGlassIcon className={`h-5 w-5 shrink-0 ${buscando ? 'animate-pulse text-blue-500' : 'text-[#8e8e93]'}`} />
                            <input
                                autoFocus
                                type="text"
                                role="searchbox"
                                enterKeyHint="search"
                                aria-label="Buscar cliente o sección"
                                placeholder="Cliente o sección"
                                value={texto}
                                onChange={(evento) => setTexto(evento.target.value)}
                                onKeyDown={teclas}
                                className="h-full min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-[#8e8e93] dark:text-white"
                            />
                        </label>
                        <button type="button" onClick={onCerrar} aria-label="Cerrar buscador" className="shrink-0 text-[16px] font-semibold text-blue-600 dark:text-blue-400">
                            Cancelar
                        </button>
                    </div>

                    <div ref={lista} className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1">
                        {clientes.length > 0 && (
                            <Lista titulo="Clientes">
                                {clientes.map((c, indice) => (
                                    <button key={`c${c.id}`} type="button" data-indice={indice} onMouseEnter={() => setMarcado(indice)} onClick={() => elegir(resultados[indice])} className={fila(indice)}>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-bold uppercase text-white">{c.nombre.charAt(0) || '?'}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-white">{c.nombre}</span>
                                            <span className="block truncate text-[13px] text-[#5b6170] dark:text-slate-400">{[c.cedula, c.telefono].filter(Boolean).join(' · ') || `Cliente #${c.id}`}</span>
                                        </span>
                                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${c.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>{c.estado}</span>
                                            {c.total_deuda > 0 && <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Debe ${c.total_deuda}</span>}
                                        </span>
                                        <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#a1a1aa]" aria-hidden="true" />
                                    </button>
                                ))}
                            </Lista>
                        )}

                        {grupos.map((grupo) => (
                            <Lista key={grupo.nombre} titulo={grupo.nombre}>
                                {grupo.items.map((item) => {
                                    const indice = indiceSeccion++;
                                    return (
                                        <button key={item.ruta} type="button" data-indice={indice} onMouseEnter={() => setMarcado(indice)} onClick={() => elegir(resultados[indice])} className={fila(indice)}>
                                            <CuadroIcono icono={item.icono} tono={item.tono} />
                                            <span className="min-w-0 flex-1 truncate text-[15px] text-slate-900 dark:text-white">{item.nombre}</span>
                                            <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#a1a1aa]" aria-hidden="true" />
                                        </button>
                                    );
                                })}
                            </Lista>
                        ))}

                        {consultaCorta && <p className="px-1 text-[13px] text-[#5b6170] dark:text-slate-400">Escribe al menos 3 letras para buscar clientes.</p>}
                        {!buscando && texto.trim().length >= 3 && resultados.length === 0 && (
                            <p className="py-10 text-center text-[15px] font-semibold text-[#5b6170] dark:text-slate-400">Sin coincidencias</p>
                        )}
                    </div>
                    <div className="hidden items-center gap-4 px-5 pb-3 text-xs text-[#8e8e93] sm:flex">
                        <span><kbd className="font-sans font-semibold">↑ ↓</kbd> moverse</span>
                        <span><kbd className="font-sans font-semibold">Enter</kbd> abrir</span>
                        <span><kbd className="font-sans font-semibold">Esc</kbd> cerrar</span>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

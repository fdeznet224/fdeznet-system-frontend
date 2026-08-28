import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import {
    ArrowTopRightOnSquareIcon,
    ClipboardDocumentIcon,
    GlobeAltIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

interface Props {
    ip: string | null;
    clientName?: string;
    onClose: () => void;
}

function remoteUrl(ip: string) {
    const value = ip.trim();
    return /^https?:\/\//i.test(value) ? value : `http://${value}`;
}

export default function IpAccessModal({ ip, clientName, onClose }: Props) {
    const url = ip ? remoteUrl(ip) : '';

    const copyIp = async () => {
        if (!ip) return;
        await navigator.clipboard.writeText(ip);
        toast.success('IP copiada');
    };

    return (
        <Transition appear show={Boolean(ip)} as={Fragment}>
            <Dialog as="div" className="relative z-[80]" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-5">
                    <Dialog.Panel className="flex h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-950 sm:h-[88dvh] sm:rounded-3xl">
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:px-6">
                            <div className="min-w-0">
                                <Dialog.Title className="flex items-center gap-2 truncate font-black text-slate-900 dark:text-white">
                                    <GlobeAltIcon className="h-5 w-5 shrink-0 text-blue-500" />
                                    Acceso remoto ONU
                                </Dialog.Title>
                                <p className="truncate text-xs font-bold text-slate-500">
                                    {clientName ? `${clientName} · ` : ''}{ip}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <button type="button" onClick={() => void copyIp()} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300" title="Copiar IP">
                                    <ClipboardDocumentIcon className="h-5 w-5" />
                                </button>
                                <a href={url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300" title="Abrir en otra pestaña">
                                    <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                                </a>
                                <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300" title="Cerrar">
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="relative min-h-0 flex-1 bg-slate-100 dark:bg-slate-900">
                            <iframe
                                key={url}
                                src={url}
                                title={`Administración remota ${ip || ''}`}
                                className="h-full w-full border-0 bg-white"
                                allow="clipboard-read; clipboard-write"
                            />
                            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/80 px-4 py-2 text-center text-[10px] font-bold text-white shadow-lg">
                                Si la ONU bloquea el visor o usa HTTP desde una app HTTPS, utiliza “abrir en otra pestaña”.
                            </p>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </Transition>
    );
}

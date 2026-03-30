// src/components/ui/RouterPingButton.tsx
import { useState } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { SignalIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

export default function RouterPingButton({ routerId }: { routerId: number }) {
    const [status, setStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');

    const checkPing = async () => {
        setStatus('checking');
        try {
            const { data } = await client.get(`/network/routers/${routerId}/ping`);
            if (data.status === 'online') {
                setStatus('online');
                toast.success(data.mensaje || "Router Online");
            } else {
                setStatus('offline');
                toast.error(data.mensaje || "Router Inalcanzable");
            }
        } catch (error) {
            setStatus('offline');
            toast.error("Error de conexión");
        }
    };

    return (
        <button 
            onClick={(e) => { e.stopPropagation(); checkPing(); }}
            disabled={status === 'checking'}
            className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border
                ${status === 'idle' ? 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700 hover:text-white' : ''}
                ${status === 'checking' ? 'bg-blue-900/30 text-blue-400 border-blue-500/30' : ''}
                ${status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                ${status === 'offline' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
            `}
        >
            {status === 'checking' ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <SignalIcon className="w-3 h-3" />}
            {status === 'idle' && "Ping"}
            {status === 'checking' && "..."}
            {status === 'online' && "Online"}
            {status === 'offline' && "Offline"}
        </button>
    );
}
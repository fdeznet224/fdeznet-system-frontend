

import WhatsappConfig from '../configuracion/WhatsappConfig'; 
import { EncabezadoPagina } from '@/components/ui/Pagina';

export default function WhatsappPage() {

    return (
        <div className="flex h-full flex-col">
            <EncabezadoPagina volver={{ a: '/admin/configuracion', texto: 'Configuración' }} titulo="Conexión WhatsApp" descripcion="Escanea el código QR para activar el bot." />

            {/* Contenedor del Escáner */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[600px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl p-4 transition-colors"> 
                    <WhatsappConfig />
                </div>
            </div>
        </div>
    );
}
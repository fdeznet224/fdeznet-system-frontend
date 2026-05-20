import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import CreateClientModal from '../../components/modals/CreateClientModal'; 

export default function TechRegister() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(true);

    const handleClose = () => {
        setIsOpen(false);
        navigate('/tech/dashboard');
    };

    return (
        /* ✅ ADAPTADO: Fondo responsivo al tema */
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 font-sans">
            
            {/* Efecto de carga visual elegante y adaptativo */}
            <div className="relative">
                <div className="absolute -inset-4 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-white dark:bg-slate-900 p-6 rounded-full border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-none transition-colors">
                    <PlusIcon className="w-10 h-10 text-blue-600 dark:text-blue-500"/>
                </div>
            </div>
            
            <h2 className="mt-6 text-slate-800 dark:text-white font-black text-lg tracking-tight transition-colors">
                Preparando Formulario
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium transition-colors">
                Cargando catálogos de red...
            </p>

            {/* Modal de Registro */}
            <CreateClientModal 
                isOpen={isOpen}
                onClose={handleClose}
                onSuccess={() => {
                    toast.success("¡Orden creada correctamente!");
                    navigate('/tech/dashboard');
                }}
                routers={[]} 
            />
        </div>
    );
}
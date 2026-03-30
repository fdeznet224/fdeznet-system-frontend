import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast'; // 👈 ¡FALTABA ESTA IMPORTACIÓN!
import CreateClientModal from '../../components/modals/CreateClientModal'; 

export default function TechRegister() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(true);

    const handleClose = () => {
        setIsOpen(false);
        navigate('/tech/dashboard');
    };

    return (
        <div className="min-h-screen bg-[#0f1014] flex flex-col items-center justify-center p-6 text-center">
            {/* Efecto de carga visual elegante */}
            <div className="relative">
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-[#1a1b23] p-6 rounded-full border border-slate-800">
                    <PlusIcon className="w-10 h-10 text-blue-500"/>
                </div>
            </div>
            <h2 className="mt-6 text-white font-bold text-lg tracking-tight">Preparando Formulario</h2>
            <p className="text-slate-500 text-sm mt-1">Cargando catálogos de red...</p>

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
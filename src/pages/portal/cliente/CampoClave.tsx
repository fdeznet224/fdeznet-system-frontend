import { useState, type InputHTMLAttributes } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

import { CAMPO } from './ui';

/** Campo de contraseña con el ojo para ver lo que se escribió (en el celular es fácil equivocarse). */
export default function CampoClave({ className = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
    const [ver, setVer] = useState(false);
    return (
        <div className="relative">
            <input {...props} type={ver ? 'text' : 'password'} className={`${CAMPO} pr-12 ${className}`} />
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400">
                {ver ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
        </div>
    );
}

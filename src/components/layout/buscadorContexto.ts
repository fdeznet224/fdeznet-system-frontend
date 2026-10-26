import { createContext, useContext } from 'react';

/** Abre el buscador global; lo da el Layout del admin (fuera de él no hay buscador). */
export const AbrirBuscador = createContext<(() => void) | null>(null);

export const useAbrirBuscador = () => useContext(AbrirBuscador);

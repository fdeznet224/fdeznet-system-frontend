import { createContext, useContext } from 'react';

export const ColorModeContext = createContext({ toggleColorMode: () => undefined });

export const useColorMode = () => useContext(ColorModeContext);

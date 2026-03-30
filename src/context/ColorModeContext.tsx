// Ubicación: frontend/src/context/ColorModeContext.tsx
import React, { createContext, useState, useMemo, useEffect, useContext } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { getDesignTokens } from '../theme'; // Importaremos esto en el siguiente paso

// Definimos el contexto
export const ColorModeContext = createContext({ toggleColorMode: () => {} });

export const useColorMode = () => useContext(ColorModeContext);

export const ColorModeProvider = ({ children }: { children: React.ReactNode }) => {
  // Leemos del localStorage o usamos 'dark' por defecto (más premium)
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as 'light' | 'dark') || 'dark';
  });

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode); // Guardar preferencia
          return newMode;
        });
      },
    }),
    [],
  );

  // Creamos el tema basado en el modo actual
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};
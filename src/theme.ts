// Ubicación: frontend/src/theme.ts
import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material'; // Solo importamos esto como TYPE
import '@fontsource/plus-jakarta-sans';

export const getDesignTokens = (mode: PaletteMode) => ({
  typography: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    h5: { fontWeight: 800, letterSpacing: '-0.5px' },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none' as const, fontWeight: 700 },
  },
  shape: { borderRadius: 16 },
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // --- PALETA LIGHT (Premium Corporate) ---
          primary: { main: '#4f46e5' }, // Indigo
          background: { default: '#f8fafc', paper: '#ffffff' },
          text: { primary: '#0f172a', secondary: '#64748b' },
          action: { active: '#64748b' }
        }
      : {
          // --- PALETA DARK (Cyber Tech) ---
          primary: { main: '#818cf8' }, // Indigo más brillante
          background: { default: '#0f172a', paper: '#1e293b' }, // Slate 900 y 800
          text: { primary: '#f8fafc', secondary: '#94a3b8' },
          divider: 'rgba(255,255,255,0.08)',
        }),
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'none',
          borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          color: mode === 'dark' ? '#fff' : '#0f172a',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          background: mode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
          border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`,
          boxShadow: mode === 'light' 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
          backgroundImage: 'none',
        }
      }
    }
  },
});
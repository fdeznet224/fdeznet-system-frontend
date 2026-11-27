import type { CapacitorConfig } from '@capacitor/cli';

// App del técnico para Android (APK directo). Carga el sistema publicado, así
// cada versión del sistema llega sin reinstalar; lo nativo es lo que el
// navegador no permite: hablar con la antena (http://192.168.1.20) por
// CapacitorHttp sin bloqueos de CORS ni de contenido mixto.
const config: CapacitorConfig = {
  appId: 'com.fdezpay.tecnico',
  appName: 'FdezNet Técnico',
  webDir: 'dist',
  // CAP_URL=http://localhost:4173/ arma la app de pruebas (scripts/celular.sh):
  // carga la versión de la computadora por el cable USB en lugar del VPS.
  server: {
    url: process.env.CAP_URL || 'https://fdezpay.com/',
    allowNavigation: ['fdezpay.com', 'localhost'],
    cleartext: Boolean(process.env.CAP_URL),
  },
  plugins: {
    // Solo las llamadas a la antena van por lo nativo (se piden a mano);
    // la API sigue por el navegador con sus cookies.
    CapacitorHttp: { enabled: false },
  },
};

export default config;

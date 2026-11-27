import type { CapacitorConfig } from '@capacitor/cli';

// App del técnico para Android (APK directo). Carga el sistema publicado, así
// cada versión del sistema llega sin reinstalar; lo nativo es lo que el
// navegador no permite: hablar con la antena (http://192.168.1.20) por
// CapacitorHttp sin bloqueos de CORS ni de contenido mixto.
const config: CapacitorConfig = {
  appId: 'com.fdezpay.tecnico',
  appName: 'FdezPay Técnico',
  webDir: 'dist',
  server: {
    url: 'https://fdezpay.com/',
    allowNavigation: ['fdezpay.com'],
  },
  plugins: {
    // Solo las llamadas a la antena van por lo nativo (se piden a mano);
    // la API sigue por el navegador con sus cookies.
    CapacitorHttp: { enabled: false },
  },
};

export default config;

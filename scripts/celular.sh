#!/bin/bash
# Probar en el celular sin publicar: compila, instala la app de pruebas (carga
# la versión de esta computadora por el cable USB) y sirve el sistema con la
# API real. Uso: scripts/celular.sh [apk]   ("apk" reinstala la app; sin él
# solo recompila la web: en el celular basta con cerrar y abrir la app).
# Al terminar las pruebas: scripts/celular.sh produccion  (reinstala la normal).
set -e
cd "$(dirname "$0")/.."
ADB=${ADB:-$HOME/Android/Sdk/platform-tools/adb}
export JAVA_HOME=${JAVA_HOME_ANDROID:-/opt/android-studio/jbr} ANDROID_HOME=${ANDROID_HOME:-$HOME/Android/Sdk}

instalar() {
  npx cap sync android >/dev/null
  (cd android && ./gradlew assembleDebug -q)
  "$ADB" install -r android/app/build/outputs/apk/debug/app-debug.apk
}

if [ "$1" = "produccion" ]; then
  npm run build >/dev/null && instalar && echo "App normal (fdezpay.com) instalada."
  exit 0
fi

npm run build >/dev/null
if [ "$1" = "apk" ]; then
  CAP_URL=http://localhost:4173/ instalar
fi
"$ADB" reverse tcp:4173 tcp:4173
pkill -f "vite preview" 2>/dev/null || true
echo "Sirviendo en el celular (localhost:4173 por USB) con la API de fdezpay.com"
CELULAR=1 exec npx vite preview

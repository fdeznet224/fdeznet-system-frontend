/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 👈 ¡ESTA ES LA LÍNEA MÁGICA! Activa el control por clase para el sol/luna
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
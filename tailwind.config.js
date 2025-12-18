/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#aa468e',
          50: '#f5eef3',
          100: '#e9d6e4',
          200: '#d5b0ca',
          300: '#be85ab',
          400: '#aa468e',
          500: '#9a2d7a',
          600: '#8a2167',
          700: '#721c55',
          800: '#5f1a48',
          900: '#501a3e',
        },
      },
    },
  },
  plugins: [],
}


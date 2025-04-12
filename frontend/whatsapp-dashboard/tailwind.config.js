/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'whatsapp-green': '#25D366',
        'whatsapp-dark-green': '#075E54',
        'whatsapp-teal': '#128C7E',
        'whatsapp-light-green': '#DCF8C6',
      }
    },
  },
  plugins: [],
} 
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gan-navy': '#1a1a2e',
        'gan-gold': '#f4d03f',
        'gan-slate': '#1e293b',
      },
    },
  },
  plugins: [],
}

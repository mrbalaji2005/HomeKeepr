/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        green: { 500: '#1D9E75', 600: '#178a63', 50: '#E1F5EE' },
      }
    },
  },
  plugins: [],
}

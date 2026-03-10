/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff', 100: '#dce6ff', 200: '#bdd0ff',
          300: '#91afff', 400: '#6087ff', 500: '#3a62fa',
          600: '#2246ef', 700: '#1a35d6', 800: '#1c2fad',
          900: '#1c2d88', 950: '#141c54',
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  // Add this line to enable dark mode
  darkMode: 'class', 
  
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // You can add custom theme colors and fonts here later
    },
  },
  plugins: [],
}
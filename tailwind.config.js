/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
            "primary": "#004b4c",
            "accent": "#00d1d2",
            "mint": "#39e3bd",
            "beige-bg": "#f8f3e9",
            "background-light": "#f8f3e9",
            "background-dark": "#0f2323",
            "brand-pink": "#e96197",
        },
        fontFamily: {
            "display": ["Manrope"]
        },
        borderRadius: { "DEFAULT": "0.5rem", "lg": "1rem", "xl": "1.5rem", "full": "9999px" },
    },
  },
  plugins: [],
}

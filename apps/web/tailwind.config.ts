/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "sans-serif"]
      },
      boxShadow: {
        soft: "0 10px 30px -15px rgba(15, 23, 42, 0.18)"
      },
      backgroundImage: {
        mesh: "radial-gradient(at 20% 20%, rgba(14, 165, 233, 0.15), transparent 45%), radial-gradient(at 80% 0%, rgba(16, 185, 129, 0.18), transparent 35%), radial-gradient(at 80% 80%, rgba(251, 191, 36, 0.15), transparent 40%)"
      }
    }
  },
  plugins: []
};

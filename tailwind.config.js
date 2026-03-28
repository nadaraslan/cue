/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#172033",
        mist: "#f4efe6",
        coral: "#ef6c4d",
        pine: "#2d6a5c",
        gold: "#d7a441",
      },
      boxShadow: {
        glow: "0 24px 70px rgba(23, 32, 51, 0.14)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.95" },
          "50%": { transform: "scale(1.03)", opacity: "1" },
        },
      },
      animation: {
        rise: "rise 500ms ease-out forwards",
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

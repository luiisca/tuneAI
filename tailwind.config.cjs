const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in-up": {
          "0%": {
            opacity: 1,
            transform: "translateY(0%)",
          },
          "100%": {
            opacity: 0,
            transform: "translateY(-100%)",
          },
        },
        "fade-in-down": {
          "0%": {
            opacity: 0.75,
            transform: "translateY(-100%)",
          },
          "100%": {
            opacity: 1,
            transform: "translateY(0%)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.15s cubic-bezier(.21,1.02,.73,1)",
        "fade-in-down": "fade-in-down 0.35s cubic-bezier(.21,1.02,.73,1)",
      },
      colors: {
        accent: "#1db954",
        accentBright: "#1ed760",
      },
      boxShadow: {
        cover:
          "drop-shadow(0 0 1px rgba(0,0,0,.3)) drop-shadow(0 0 10px rgba(0,0,0,.3))",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwind-scrollbar")({ nocompatible: true }),
  ],
};

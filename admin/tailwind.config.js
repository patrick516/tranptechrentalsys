
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],

  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },

      colors: {
        // TranpTech Brand Colours
        brand: {
          blue: "#005098",
          green: "#289030",
          navy: "#101D29",
          white: "#FFFFFF",
        },

        // Application Theme
        background: "#FFFFFF",
        foreground: "#101D29",

        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#101D29",
        },

        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#101D29",
        },

        primary: {
          DEFAULT: "#005098",
          foreground: "#FFFFFF",
        },

        secondary: {
          DEFAULT: "#F1F5F9",
          foreground: "#101D29",
        },

        muted: {
          DEFAULT: "#F8FAFC",
          foreground: "#64748B",
        },

        accent: {
          DEFAULT: "#F1F5F9",
          foreground: "#101D29",
        },

        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },

        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#005098",

        chart: {
          "1": "#005098",
          "2": "#289030",
          "3": "#101D29",
          "4": "#005098",
          "5": "#289030",
        },
      },
    },
  },

  plugins: [require("tailwindcss-animate")],
};

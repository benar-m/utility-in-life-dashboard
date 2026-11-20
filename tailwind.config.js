/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Dashboard palette, matched to the landing page: light shades are the
        // Enroll-section turquoise (#40DDD2), dark shades the footer navy
        // (#0F1F5C). Amber stays reserved for money-related actions.
        brand: {
          50: "#E9FBF9",
          100: "#CDF5F1",
          200: "#9FEDE6",
          300: "#40DDD2", // turquoise accent
          400: "#2BBFB5",
          500: "#0F1F5C", // primary: footer navy
          600: "#1A2E7A",
          700: "#14286E",
          800: "#0B1747",
          900: "#070F30",
        },
        // Shuleni Online poster palette, used by the public landing page.
        shuleni: {
          navy: "#18308F",
          ink: "#0F1F5C",
          turquoise: "#40DDD2",
          aqua: "#D8F8F5",
          teal: "#12999E",
          orange: "#F7941D",
          red: "#E8423F",
          yellow: "#F7E52B",
        },
        amber: {
          50: "#FDF6E9",
          100: "#FBEBCB",
          400: "#EFB85E",
          500: "#E8A33D",
          600: "#C9862A",
        },
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "step-progress": {
          from: { width: "0%" },
          to: { width: "100%" },
        },
      },
      animation: {
        "fade-up": "fade-up 400ms ease-out both",
        "step-progress": "step-progress linear both",
      },
      fontFamily: {
        display: ["Montserrat", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

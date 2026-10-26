/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette for Utility in Life Empowerment.
        // Deep teal reads as "education / growth", amber is reserved
        // for money-related actions (payments, invoices, earnings).
        brand: {
          50: "#EEF6F4",
          100: "#D6EBE5",
          200: "#ACD6CC",
          300: "#7EBEB0",
          400: "#4A9C8B",
          500: "#0F6B5C", // primary
          600: "#0C5A4D",
          700: "#0B4F44",
          800: "#083A33",
          900: "#052722",
        },
        amber: {
          50: "#FDF6E9",
          100: "#FBEBCB",
          400: "#EFB85E",
          500: "#E8A33D",
          600: "#C9862A",
        },
      },
      fontFamily: {
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

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        apple: {
          gray: {
            50: "#f5f5f7",
            100: "#e8e8ed",
            200: "#d2d2d7",
            300: "#86868b",
            400: "#1d1d1f"
          }
        }
      },
      borderRadius: {
        'apple': '20px',
        'apple-sm': '12px'
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      }
    },
  },
  plugins: [],
};

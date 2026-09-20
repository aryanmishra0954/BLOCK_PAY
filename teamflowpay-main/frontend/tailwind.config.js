/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: [
          '"Space Grotesk"',
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        sans: [
          '"Plus Jakarta Sans"',
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          '"IBM Plex Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        background: "#0a0b0d",
        surface: "#101216",
        card: "#15181e",
        border: "#20242c",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#2c2416",
          2: "#6b5e4a",
          3: "#a0907a",
          4: "#c9b99e",
        },
        paper: {
          DEFAULT: "#faf6ee",
          2: "#f4ede0",
          3: "#ede3d3",
        },
        rule: {
          DEFAULT: "#e2d5c0",
          strong: "#d0bfa6",
        },
        tab: "#8b2e2e",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans: ["Helvetica Neue", "Arial", "sans-serif"],
        mono: ["Courier New", "Courier", "monospace"],
      },
    },
  },
  plugins: [],
}
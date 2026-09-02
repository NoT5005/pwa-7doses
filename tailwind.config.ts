import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#eef8f5",
          100: "#d6eee5",
          200: "#b0dfd0",
          300: "#7ec7b4",
          400: "#4ea995",
          500: "#2d7f6e", // Sage Green / Teal
          600: "#236558",
          700: "#1e5248",
          800: "#1b423b",
          900: "#193732",
          DEFAULT: "#2d7f6e",
        },
        gold: {
          50: "#fbf8ec",
          100: "#f6eece",
          200: "#ecda9d",
          300: "#e0c166",
          400: "#d5a939",
          500: "#c28e24", // Lotus Gold
          600: "#a7711c",
          700: "#85531a",
          800: "#6f431b",
          900: "#5c371a",
          DEFAULT: "#c28e24",
        },
        pill: {
          1: "#50B3E6", // Step 1: Sky Blue
          2: "#9F72D8", // Step 2: Purple / Violet
          3: "#F472B6", // Step 3: Pink
          4: "#FBBF24", // Step 4: Warm Amber / Gold
          5: "#2DD4BF", // Step 5: Teal
          6: "#84CC16", // Step 6: Olive Green / Lime
          7: "#FB923C", // Step 7: Warm Orange
        }
      },
      fontFamily: {
        sans: ["var(--font-sarabun)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 30px -5px rgba(45, 127, 110, 0.12)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
};
export default config;

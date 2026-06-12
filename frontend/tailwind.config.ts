import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: '#E8F5F5',
          100: '#B8E6E6',
          200: '#7FCCCC',
          300: '#4DB8B8',
          400: '#26A3A3',
          500: '#1A7A7A',
          600: '#0D4F4F',
          700: '#083838',
          800: '#052525',
          900: '#021212',
        },
        teal: {
          50: '#E8F5F5',
          100: '#B8E6E6',
          200: '#7FCCCC',
          300: '#4DB8B8',
          400: '#26A3A3',
          500: '#1A7A7A',
          600: '#0D4F4F',
          700: '#083838',
        },
        copper: {
          50: '#FDF5EE',
          100: '#F9E3CC',
          200: '#F2C79A',
          300: '#E8A86A',
          400: '#D4833D',
          500: '#B8652A',
          600: '#9A4D1E',
          700: '#7A3A15',
        },
        aqua: {
          50: '#F0F8F8',
          100: '#D8F0F0',
          200: '#B8E6E6',
          300: '#8CD9D9',
          400: '#5CCCCC',
          500: '#3DB8B8',
        },
      },
    },
  },
  plugins: [],
};
export default config;
import type { Config } from "tailwindcss";

const config: Config = {
  content:[
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}" // Included for shared UI components later
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1E3A8A",
        secondary: "#F59E0B",
        accent: "#10B981",
        neutralDark: "#111827",
        neutralLight: "#F9FAFB",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
    },
  },
  plugins:[],
};
export default config;
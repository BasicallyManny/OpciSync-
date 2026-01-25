import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  build:{
    rollupOptions:{
      input:{
        popup:"./index.html",
        content:"./src/content/content.ts",
        background:"./src/background/background.ts"
      },
      output:{
        entryFileNames:"[name].js",
      }
    }
  }
});

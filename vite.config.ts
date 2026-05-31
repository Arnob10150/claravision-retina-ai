import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Raise the chunk-size warning threshold (the bundle is intentionally large)
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Split heavy vendor libs into separate chunks so bundler
        // can process each chunk with less peak memory
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui':       ['framer-motion', 'lucide-react'],
          'vendor-charts':   ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-misc':     ['zustand', 'date-fns', 'sonner', 'zod'],
        },
      },
    },
  },
})

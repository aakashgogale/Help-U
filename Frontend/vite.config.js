import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Dev only: images may be cached by the browser for an hour (code stays no-store),
// so pages don't re-download every icon and photo on each navigation.
// Image URLs that change are versioned (?v=) or content-hashed in builds.
const IMAGE_REQUEST = /\.(png|jpe?g|webp|avif|gif|svg|ico)(\?|$)/i;
const devImageCache = () => ({
  name: 'dev-image-cache',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {

      if (IMAGE_REQUEST.test(req.url || '') && !(req.url || '').includes('?import')) {
        const setHeader = res.setHeader.bind(res);
        setHeader('Cache-Control', 'public, max-age=3600');
        // Keep this value when the global no-store headers are applied later
        res.setHeader = (name, value) => (/^(cache-control|pragma|expires)$/i.test(name) ? res : setHeader(name, value));
      }
      next();
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    // Ensure only one React instance
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  plugins: [
    react(),
    tailwindcss(),
    devImageCache(),
  ],
  server: {
    port: 3000, // Frontend server port
    strictPort: false,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: http: https: http://localhost:* http://127.0.0.1:* http://localhost:5000 http://127.0.0.1:5000; font-src 'self' data: https:; connect-src 'self' https: ws: wss: http://localhost:* http://127.0.0.1:* http://localhost:5000 http://127.0.0.1:5000; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';",
      // Force no caching in development
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  build: {
    minify: 'terser',
    terserOptions: { 
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // SAFE STRATEGY: Bundle all dependencies into one vendor file
          // This fixes the "Cannot set properties of undefined (setting 'Activity')" error
          // by ensuring all libraries share the same execution context.
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase limit since the vendor chunk will be larger
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    cssCodeSplit: true,
    target: 'es2020',
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      // Heavy libraries used across the app: pre-bundling them up front avoids Vite
      // discovering them mid-session and re-optimising (which reloads the page).
      'axios',
      'framer-motion',
      'react-hot-toast',
      'socket.io-client',
      'react-icons/fi',
      'react-icons/fa',
      'react-icons/md',
      'react-icons/hi',
      'react-icons/ai',
      'gsap',
    ],
  },
});
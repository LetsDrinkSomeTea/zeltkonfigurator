import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Eigenständige Vorschau ohne OpenCloud-Server: die Ansichten laufen gegen einen
// Speicher im Arbeitsspeicher mit Beispieldaten. Start: pnpm preview
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // liefert die Icons des Design-Systems unter /icons/ aus
  publicDir: fileURLToPath(
    new URL('../../node_modules/@opencloud-eu/design-system/dist', import.meta.url)
  ),
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: [
      // createStore braucht die OpenCloud-Laufzeit; die Vorschau stellt den Store selbst bereit.
      {
        find: /^.*\/storage\/createStore$/,
        replacement: fileURLToPath(new URL('./createStoreStub.ts', import.meta.url))
      },
      {
        find: /^.*\/storage\/createDocument$/,
        replacement: fileURLToPath(new URL('./createDocumentStub.ts', import.meta.url))
      }
    ]
  },
  server: { port: 9230, host: '127.0.0.1' }
})
